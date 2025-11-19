import { supabase } from "@/integrations/supabase";

export interface DebugInfo {
  supabaseConfig: {
    url: string;
    hasAnonKey: boolean;
    isConfigured: boolean;
  };
  databaseTest: {
    success: boolean;
    error?: string;
    rowCount?: number;
  };
  edgeFunctionTest: {
    success: boolean;
    error?: string;
    response?: any;
  };
  environment: {
    nodeEnv: string;
    appEnv: string;
    hasRequiredVars: boolean;
  };
}

export async function debugDiscoverySystem(): Promise<DebugInfo> {
  const debugInfo: DebugInfo = {
    supabaseConfig: {
      url: '',
      hasAnonKey: false,
      isConfigured: false
    },
    databaseTest: {
      success: false
    },
    edgeFunctionTest: {
      success: false
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      appEnv: import.meta.env.VITE_APP_ENV || 'development',
      hasRequiredVars: false
    }
  };

  try {
    // Test 1: Check Supabase configuration
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    debugInfo.supabaseConfig = {
      url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ Not configured',
      hasAnonKey: !!supabaseAnonKey,
      isConfigured: !!(supabaseUrl && supabaseAnonKey && 
        supabaseUrl !== 'https://placeholder.supabase.co' &&
        supabaseAnonKey !== 'placeholder-key')
    };

    debugInfo.environment.hasRequiredVars = !!(supabaseUrl && supabaseAnonKey);

    // Test 2: Direct database query
    try {
      console.log('🧪 Testing direct database query...');
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, type, lat, lng, event_start_date, city, state')
        .limit(1);

      if (error) {
        debugInfo.databaseTest = {
          success: false,
          error: `Database query failed: ${error.message} (${error.code})`
        };
        console.error('❌ Database test failed:', error);
      } else {
        debugInfo.databaseTest = {
          success: true,
          rowCount: data?.length || 0
        };
        console.log('✅ Database test successful, found', data?.length, 'rows');
      }
    } catch (dbError: any) {
      debugInfo.databaseTest = {
        success: false,
        error: `Database exception: ${dbError.message}`
      };
      console.error('❌ Database test exception:', dbError);
    }

    // Test 3: Edge function call
    try {
      console.log('🧪 Testing spider-events edge function...');
      const { data, error } = await supabase.functions.invoke('spider-events', {
        body: { 
          lat: -23.5505, 
          lng: -46.6333, 
          city: 'sao-paulo', 
          state: 'sp' 
        }
      });

      if (error) {
        debugInfo.edgeFunctionTest = {
          success: false,
          error: `Edge function failed: ${error.message}`
        };
        console.error('❌ Edge function test failed:', error);
      } else {
        debugInfo.edgeFunctionTest = {
          success: true,
          response: data
        };
        console.log('✅ Edge function test successful:', data);
      }
    } catch (edgeError: any) {
      debugInfo.edgeFunctionTest = {
        success: false,
        error: `Edge function exception: ${edgeError.message}`
      };
      console.error('❌ Edge function test exception:', edgeError);
    }

    // Test 4: Check HTTP headers being sent
    try {
      console.log('🧪 Testing HTTP headers...');
      // This will help us see what headers are being sent
      const testResponse = await fetch(`${supabaseUrl}/rest/v1/locations?limit=1`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Direct HTTP test response status:', testResponse.status);
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('📡 Direct HTTP test error:', errorText);
      }
    } catch (httpError: any) {
      console.error('📡 HTTP test error:', httpError.message);
    }

  } catch (overallError: any) {
    console.error('❌ Overall debug test failed:', overallError);
    debugInfo.databaseTest.error = `Overall error: ${overallError.message}`;
    debugInfo.edgeFunctionTest.error = `Overall error: ${overallError.message}`;
  }

  return debugInfo;
}

export function logDebugInfo(info: DebugInfo) {
  console.log('🔍 Discovery System Debug Report:');
  console.log('=====================================');
  console.log('📊 Supabase Config:', info.supabaseConfig);
  console.log('🌍 Environment:', info.environment);
  console.log('💾 Database Test:', info.databaseTest);
  console.log('⚡ Edge Function Test:', info.edgeFunctionTest);
  console.log('=====================================');
}