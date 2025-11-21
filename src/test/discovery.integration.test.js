// Test script to verify DiscoveryService integration
const { DiscoveryService } = require('../services/discovery.service.ts');

async function testDiscoveryService() {
  console.log('🧪 Testing DiscoveryService with new columns...');
  
  try {
    // Test with São Paulo coordinates
    const lat = -23.5505;
    const lng = -46.6333;
    const radius = 5000; // 5km
    
    console.log(`📍 Testing with coordinates: ${lat}, ${lng}`);
    
    const feed = await DiscoveryService.getFeed(lat, lng, radius);
    
    console.log(`✅ Successfully fetched ${feed.length} locations`);
    
    if (feed.length > 0) {
      const firstLocation = feed[0];
      console.log('📋 First location details:');
      console.log(`   - ID: ${firstLocation.id}`);
      console.log(`   - Name: ${firstLocation.name}`);
      console.log(`   - Type: ${firstLocation.type}`);
      console.log(`   - Is Active: ${firstLocation.is_active}`);
      console.log(`   - Opening Hours: ${firstLocation.opening_hours || 'Not specified'}`);
      console.log(`   - Has Image: ${!!firstLocation.image_url}`);
    }
    
    console.log('🎉 DiscoveryService integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ DiscoveryService test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testDiscoveryService();