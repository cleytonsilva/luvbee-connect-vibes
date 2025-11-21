import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database } from 'lucide-react';
import { testDatabaseSchema } from '@/lib/test-schema';

export function SchemaTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runSchemaTest = async () => {
    setIsTesting(true);
    setResults([]);
    
    // Capturar logs do console
    const originalLog = console.log;
    const originalError = console.error;
    const logs: string[] = [];
    
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    console.error = (...args) => {
      logs.push(`❌ ${args.join(' ')}`);
      originalError(...args);
    };
    
    try {
      await testDatabaseSchema();
      setResults(logs);
    } catch (error) {
      setResults([`💥 Test failed: ${error.message}`]);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      setIsTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Database Schema Test
          <Badge variant="outline" className={isTesting ? "animate-pulse" : ""}>
            {isTesting ? "Testing..." : "Ready"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runSchemaTest} 
            disabled={isTesting}
            className="flex-1"
          >
            {isTesting ? "Testing Schema..." : "Test Database Schema"}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results:</h3>
            <div className="max-h-96 overflow-y-auto bg-gray-50 p-4 rounded font-mono text-sm">
              {results.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}