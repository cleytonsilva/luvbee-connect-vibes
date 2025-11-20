import { supabase } from "@/integrations/supabase";

export async function testDatabaseSchema() {
  console.log('🧪 Testing database schema...');
  
  try {
    // Test 1: Minimal query with core columns
    console.log('1. Testing core columns...');
    const { data: minimalTest, error: minimalError } = await supabase
      .from('locations')
      .select('id, name, type, lat, lng')
      .limit(1);
    
    if (minimalError) {
      console.error('❌ Core columns error:', minimalError);
    } else {
      console.log('✅ Core columns OK:', minimalTest?.length || 0, 'rows');
    }

    // Test 2: Event-related columns
    console.log('2. Testing event columns...');
    const { data: eventTest, error: eventError } = await supabase
      .from('locations')
      .select('event_start_date, event_end_date, ticket_url')
      .limit(1);
    
    if (eventError) {
      console.error('❌ Event columns error:', eventError);
    } else {
      console.log('✅ Event columns OK:', eventTest?.length || 0, 'rows');
    }

    // Test 3: All columns from discovery service
    console.log('3. Testing discovery service columns...');
    const { data: discoveryTest, error: discoveryError } = await supabase
      .from('locations')
      .select(`
        id, name, address, image_url, type, lat, lng, 
        event_start_date, event_end_date, ticket_url, description,
        rating, price_level, google_place_data, opening_hours,
        source_id, metadata, city, state, peak_hours, created_at, updated_at
      `)
      .limit(1);
    
    if (discoveryError) {
      console.error('❌ Discovery columns error:', discoveryError);
      console.error('Error details:', {
        code: discoveryError.code,
        message: discoveryError.message,
        hint: discoveryError.hint
      });
    } else {
      console.log('✅ Discovery columns OK:', discoveryTest?.length || 0, 'rows');
      console.log('Sample data:', discoveryTest?.[0]);
    }

    // Test 4: Check what columns actually exist
    console.log('4. Testing individual problematic columns...');
    const columnsToTest = [
      'photos',
      'google_places_data', 
      'peak_hours_calculated',
      'is_verified',
      'is_curated'
    ];

    for (const column of columnsToTest) {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select(column)
          .limit(1);
        
        if (error) {
          console.error(`❌ Column '${column}' error:`, error.message);
        } else {
          console.log(`✅ Column '${column}' exists`);
        }
      } catch (testError: any) {
        console.error(`❌ Column '${column}' test failed:`, testError.message);
      }
    }

    console.log('🎯 Schema test completed!');

  } catch (overallError: any) {
    console.error('💥 Overall schema test failed:', overallError.message);
  }
}