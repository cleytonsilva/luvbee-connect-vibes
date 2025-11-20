import { supabase } from "@/integrations/supabase";

export async function testDiscoveryQuery() {
  console.log('🧪 Testing DiscoveryService query...');
  
  try {
    // Test the exact query from DiscoveryService
    const lat = -23.5505;
    const lng = -46.6333;
    const radius = 5000; // 5km
    
    // Convert radius from meters to degrees (approximate)
    const latDelta = radius / 111000; // 1 degree lat ≈ 111km
    const lngDelta = radius / (111000 * Math.cos(lat * (Math.PI / 180)));
    
    console.log(`Testing with lat: ${lat}, lng: ${lng}, radius: ${radius}m`);
    console.log(`Bounding box: lat±${latDelta}, lng±${lngDelta}`);
    
    const { data, error } = await supabase
      .from('locations')
      .select(`
        id, name, address, image_url, type, lat, lng, 
        event_start_date, event_end_date, ticket_url, description,
        rating, price_level, google_place_data, opening_hours,
        source_id, metadata, city, state, created_at, updated_at
      `)
      .gte('lat', lat - latDelta)
      .lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('❌ Discovery query failed:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details
      });
      return { success: false, error };
    } else {
      console.log('✅ Discovery query successful!');
      console.log(`Found ${data?.length || 0} locations`);
      if (data && data.length > 0) {
        console.log('Sample location:', data[0]);
      }
      return { success: true, data };
    }
    
  } catch (testError: any) {
    console.error('💥 Discovery query test failed:', testError.message);
    return { success: false, error: testError };
  }
}