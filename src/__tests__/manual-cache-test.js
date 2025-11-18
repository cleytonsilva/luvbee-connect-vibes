// Manual test script to verify Supabase cache integration
// Run with: node src/__tests__/manual-cache-test.js

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function testCacheIntegration() {
  console.log('🧪 Testing Supabase Cache Integration...\n');

  // Get environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  console.log('📡 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test 1: Check if bucket "div" exists
    console.log('1️⃣ Testing bucket "div"...');
    const { data: bucketData, error: bucketError } = await supabase
      .storage
      .from('div')
      .list('', { limit: 1 });

    if (bucketError) {
      console.log('   ❌ Bucket error:', bucketError.message);
    } else {
      console.log('   ✅ Bucket "div" is accessible');
      console.log('   📊 Files in bucket:', bucketData?.length || 0);
    }

    // Test 2: Check if cached_place_photos table exists
    console.log('\n2️⃣ Testing cached_place_photos table...');
    const { data: tableData, error: tableError } = await supabase
      .from('cached_place_photos')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('   ❌ Table error:', tableError.message);
    } else {
      console.log('   ✅ Table cached_place_photos is accessible');
      console.log('   📊 Rows in table:', tableData?.length || 0);
    }

    // Test 3: Test Edge Function availability
    console.log('\n3️⃣ Testing Edge Function cache-place-photo...');
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/cache-place-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          placeId: 'test-place-123',
          photoReference: 'test-photo-ref-456',
          maxWidth: 400
        })
      });

      if (response.ok) {
        console.log('   ✅ Edge Function is accessible');
        const result = await response.json();
        console.log('   📤 Response:', JSON.stringify(result, null, 2));
      } else {
        console.log('   ⚠️  Edge Function returned:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('   ⚠️  Edge Function test failed:', error.message);
    }

    // Test 4: Test the get_cached_photo_url function
    console.log('\n4️⃣ Testing get_cached_photo_url function...');
    const { data: functionData, error: functionError } = await supabase
      .rpc('get_cached_photo_url', { place_id_param: 'test-place-123' });

    if (functionError) {
      console.log('   ⚠️  Function error:', functionError.message);
    } else {
      console.log('   ✅ Function get_cached_photo_url exists');
      console.log('   🔍 Result:', functionData);
    }

    console.log('\n✅ Cache integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testCacheIntegration().catch(console.error);