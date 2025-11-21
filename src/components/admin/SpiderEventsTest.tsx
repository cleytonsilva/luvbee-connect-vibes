import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { testSpiderEventsFunction, checkEnvironmentVariables, checkDatabasePermissions } from '@/lib/spider-events-test';
import { debugDiscoverySystem, logDebugInfo, type DebugInfo } from '@/lib/debug-discovery';
import { testDiscoveryQuery } from '@/lib/test-discovery-query';
import { supabase } from '@/integrations/supabase';
import { toast } from 'sonner';
import { Database, Wifi, Settings, Terminal } from 'lucide-react';

export function SpiderEventsTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[SpiderEventsTest] ${message}`);
  };

  const runTests = async () => {
    setIsTesting(true);
    setLogs([]);
    setTestResults({});

    try {
      addLog('🚀 Iniciando testes do sistema de eventos...');

      // Test 1: Environment Variables
      addLog('🔍 Testando variáveis de ambiente...');
      const envCheck = checkEnvironmentVariables();
      setTestResults(prev => ({ ...prev, envCheck }));

      if (!envCheck) {
        addLog('⚠️ Variáveis de ambiente faltando');
        toast.error('Variáveis de ambiente incompletas');
      }

      // Test 2: Database Permissions
      addLog('🔍 Testando permissões do banco de dados...');
      const dbTest = await checkDatabasePermissions();
      setTestResults(prev => ({ ...prev, dbTest }));

      if (!dbTest.success) {
        addLog(`❌ Erro no banco: ${dbTest.error}`);
        toast.error('Erro de permissão no banco de dados');
      } else {
        addLog('✅ Permissões do banco OK');
      }

      // Test 3: Edge Function
      addLog('🔍 Testando Edge Function spider-events...');
      const functionTest = await testSpiderEventsFunction();
      setTestResults(prev => ({ ...prev, functionTest }));

      if (!functionTest.success) {
        addLog(`❌ Erro na função: ${functionTest.error}`);
        
        if (functionTest.error === 'FUNCTION_NOT_FOUND') {
          toast.error('Edge Function spider-events não encontrada. É necessário implantá-la.');
        } else if (functionTest.error === 'PERMISSION_DENIED') {
          toast.error('Erro de permissão na Edge Function');
        } else {
          toast.error('Erro na Edge Function');
        }
      } else {
        addLog(`✅ Edge Function funcionando! ${functionTest.data?.count || 0} eventos processados`);
        toast.success('Edge Function spider-events funcionando!');
      }

      // Test 4: Check existing events in database
      addLog('🔍 Verificando eventos existentes no banco...');
      const { data: existingEvents, error: eventsError } = await supabase
        .from('locations')
        .select('id, name, event_start_date, city, state, source_id')
        .eq('type', 'event')
        .limit(10);

      if (eventsError) {
        addLog(`❌ Erro ao buscar eventos: ${eventsError.message}`);
      } else {
        addLog(`✅ Encontrados ${existingEvents?.length || 0} eventos no banco`);
        setTestResults(prev => ({ ...prev, existingEvents: existingEvents || [] }));
      }

      // Test 5: Manual trigger of spider-events
      addLog('🕷️ Testando disparo manual do spider...');
      const manualTrigger = await supabase.functions.invoke('spider-events', {
        body: { 
          lat: -23.5505, 
          lng: -46.6333, 
          city: 'sao-paulo', 
          state: 'sp' 
        }
      });

      if (manualTrigger.error) {
        addLog(`❌ Erro no disparo manual: ${manualTrigger.error.message}`);
      } else {
        addLog(`✅ Disparo manual OK: ${manualTrigger.data?.message || 'Sucesso'}`);
        setTestResults(prev => ({ ...prev, manualTrigger: manualTrigger.data }));
      }

      addLog('✅ Testes concluídos!');
      toast.success('Testes concluídos!');

    } catch (error) {
      addLog(`💥 Erro crítico nos testes: ${error.message}`);
      console.error('Test error:', error);
      toast.error('Erro nos testes');
    } finally {
      setIsTesting(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const runDebugTest = async () => {
    setIsTesting(true);
    setLogs([]);
    
    try {
      addLog('🔍 Iniciando debug completo do sistema...');
      const debug = await debugDiscoverySystem();
      setDebugInfo(debug);
      logDebugInfo(debug);
      
      if (debug.databaseTest.success && debug.edgeFunctionTest.success) {
        toast.success('✅ Sistema funcionando corretamente!');
      } else {
        toast.error('❌ Problemas encontrados no sistema');
      }
      
    } catch (error) {
      addLog(`💥 Erro no debug: ${error.message}`);
      toast.error('Erro ao executar debug');
    } finally {
      setIsTesting(false);
    }
  };

  const testDiscoveryQuery = async () => {
    setIsTesting(true);
    setLogs([]);
    
    try {
      addLog('🧪 Testing DiscoveryService database query...');
      const result = await testDiscoveryQuery();
      
      if (result.success) {
        addLog(`✅ Discovery query successful! Found ${result.data?.length || 0} locations`);
        if (result.data && result.data.length > 0) {
          addLog(`📍 Sample: ${result.data[0].name} (${result.data[0].type})`);
        }
        toast.success('Discovery query working!');
      } else {
        addLog(`❌ Discovery query failed: ${result.error?.message || 'Unknown error'}`);
        addLog(`🔍 Error code: ${result.error?.code || 'No code'}`);
        toast.error('Discovery query failed');
      }
      
    } catch (error) {
      addLog(`💥 Discovery test error: ${error.message}`);
      toast.error('Error testing discovery query');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🕷️ Teste do Sistema de Eventos
          <Badge variant="outline" className={isTesting ? "animate-pulse" : ""}>
            {isTesting ? "Testando..." : "Pronto"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runTests} 
            disabled={isTesting}
            className="flex-1"
          >
            {isTesting ? "Testando..." : "Executar Testes"}
          </Button>
          
          <Button 
            onClick={runDebugTest} 
            disabled={isTesting}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Debug System
          </Button>
          
          <Button 
            onClick={testDiscoveryQuery} 
            disabled={isTesting}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            Test DB Query
          </Button>
          
          <Button 
            onClick={clearLogs} 
            variant="outline"
            disabled={isTesting}
          >
            Limpar Logs
          </Button>
        </div>

        {/* Debug Information */}
        {debugInfo && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Debug System Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-1">Supabase Config</h4>
                <div className="space-y-1">
                  <div className={`flex justify-between ${debugInfo.supabaseConfig.isConfigured ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Configured:</span>
                    <span>{debugInfo.supabaseConfig.isConfigured ? '✅' : '❌'}</span>
                  </div>
                  <div className={`flex justify-between ${debugInfo.supabaseConfig.hasAnonKey ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Has Anon Key:</span>
                    <span>{debugInfo.supabaseConfig.hasAnonKey ? '✅' : '❌'}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>URL:</span>
                    <span className="text-xs">{debugInfo.supabaseConfig.url}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">System Tests</h4>
                <div className="space-y-1">
                  <div className={`flex justify-between ${debugInfo.databaseTest.success ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Database:</span>
                    <span>{debugInfo.databaseTest.success ? '✅' : '❌'}</span>
                  </div>
                  {debugInfo.databaseTest.rowCount !== undefined && (
                    <div className="flex justify-between text-gray-600">
                      <span>Rows Found:</span>
                      <span>{debugInfo.databaseTest.rowCount}</span>
                    </div>
                  )}
                  <div className={`flex justify-between ${debugInfo.edgeFunctionTest.success ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Edge Function:</span>
                    <span>{debugInfo.edgeFunctionTest.success ? '✅' : '❌'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {debugInfo.databaseTest.error && (
              <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                <strong>Database Error:</strong> {debugInfo.databaseTest.error}
              </div>
            )}
            
            {debugInfo.edgeFunctionTest.error && (
              <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                <strong>Edge Function Error:</strong> {debugInfo.edgeFunctionTest.error}
              </div>
            )}
          </Card>
        )}
        {Object.keys(testResults).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Variáveis de Ambiente</h3>
              <Badge variant={testResults.envCheck ? "default" : "destructive"}>
                {testResults.envCheck ? "✅ OK" : "❌ Falhou"}
              </Badge>
            </Card>
            
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Banco de Dados</h3>
              <Badge variant={testResults.dbTest?.success ? "default" : "destructive"}>
                {testResults.dbTest?.success ? "✅ OK" : "❌ Falhou"}
              </Badge>
            </Card>
            
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Edge Function</h3>
              <Badge variant={testResults.functionTest?.success ? "default" : "destructive"}>
                {testResults.functionTest?.success ? "✅ OK" : "❌ Falhou"}
              </Badge>
              {testResults.functionTest?.data && (
                <p className="text-sm text-gray-600 mt-1">
                  {testResults.functionTest.data.count} eventos
                </p>
              )}
            </Card>
            
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Eventos no Banco</h3>
              <Badge variant={testResults.existingEvents?.length > 0 ? "default" : "outline"}>
                {testResults.existingEvents?.length || 0} encontrados
              </Badge>
            </Card>
          </div>
        )}

        {/* Event List */}
        {testResults.existingEvents && testResults.existingEvents.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Eventos Encontrados</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {testResults.existingEvents.map((event: any, index: number) => (
                <div key={event.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{event.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {event.city}, {event.state}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {event.source_id?.split('_')[0] || 'unknown'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Logs de Teste</h3>
            <div className="space-y-1 max-h-60 overflow-y-auto bg-gray-50 p-3 rounded font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="text-gray-700">
                  {log}
                </div>
              ))}
            </div>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}