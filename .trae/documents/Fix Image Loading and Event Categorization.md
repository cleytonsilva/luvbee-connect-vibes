I will address the reported issues by modifying the `DiscoveryService` for better event filtering and updating the `LocationCard` to correctly fetch images using the Google Places API.

### 1. Fix Event Categorization ("Agito" vs "Cultura")
**Problem**: Currently, all events (`is_event: true`) are included in the feed regardless of the selected tab (Agito/Party vs Cultura/Culture). This causes cultural events to appear in the "Agito" tab and vice-versa.
**Solution**: 
- Modify `src/services/discovery.service.ts` to apply category filtering to events as well.
- Remove the blanket `if (item.is_event) return true;` check.
- Ensure events are filtered by checking their title, description, and tags against the keywords defined for 'party' and 'culture'.

### 2. Fix Images Not Appearing
**Problem**: The `LocationCard` is currently trying to use a Supabase Edge Function (`cache-place-photo`) to proxy images, which is failing (`net::ERR_ABORTED`). The user requested using the direct Google Places API media endpoint.
**Solution**:
- Modify `src/components/location/LocationCard.tsx` to use the direct Google Places API URL for images, as requested.
- Import `GooglePlacesService` in `LocationCard.tsx`.
- Update the `getImageUrl` function to use `GooglePlacesService.getPhotoUrl()` when a Google photo reference is available. This matches the user's provided example (`places.googleapis.com/.../media`).

### 3. Google Places API Implementation
**Status**: The `GooglePlacesService` already implements the logic to generate the correct URL for the new Google Places API (`places.googleapis.com/v1/.../media`). By switching `LocationCard` to use this service method, we fulfill the user's request to "use the api places do google".

### Execution Steps
1.  **Edit `src/services/discovery.service.ts`**:
    *   Locate the `getFeed` method.
    *   Remove the early return for `item.is_event`.
    *   Ensure the keyword/type matching logic applies to events.
2.  **Edit `src/components/location/LocationCard.tsx`**:
    *   Import `GooglePlacesService`.
    *   Refactor `getImageUrl` to prioritize `GooglePlacesService.getPhotoUrl` for Google photos instead of the manual Edge Function URL construction.
