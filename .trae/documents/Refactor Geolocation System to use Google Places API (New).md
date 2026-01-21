I will fix the "random places" issue by implementing the New Google Places API (v1) in the backend and creating the specialized `LocationCard` component.

### 1. Backend: Refactor Edge Function (`fetch-places-google`)
I will rewrite `supabase/functions/fetch-places-google/index.ts` to use the **Google Places API (New)** as requested.
- **Endpoint**: Switch to `https://places.googleapis.com/v1/places:searchNearby`.
- **Field Masking**: Request only necessary fields: `id`, `displayName`, `formattedAddress`, `priceLevel`, `rating`, `userRatingCount`, `photos`, `editorialSummary`, `types`.
- **Curatorship**:
    - **Filter**: Use `includedTypes` with: `['night_club', 'bar', 'restaurant', 'cafe', 'park', 'art_gallery']`.
    - **Quality**: Implement a manual filter for `rating >= 4.0` (since the API doesn't support it directly in the request body for `searchNearby`).
- **Data Mapping**:
    - Map `editorialSummary.text` to the location `description` (falling back to `formattedAddress`).
    - Handle the new Photo Resource Name format (`places/PLACE_ID/photos/PHOTO_ID`).

### 2. Frontend: Create `LocationCard` Component
I will create `src/components/location/LocationCard.tsx` with the specified **Neo-Brutalist** design.
- **Visuals**: Full-screen background image with a bottom-up black gradient.
- **Content**:
    - Display `displayName` (H1, Bold).
    - Badges for Rating (⭐), Price (💰), and Type (🏷️).
    - **Pitch**: Display the `editorialSummary` as the primary description.
- **Actions**: "Ver no Mapa" and "Vamos!" (Match) buttons.
- **Image Handling**: Construct the image URL using the new API format: `https://places.googleapis.com/v1/{name}/media?maxHeightPx=800&maxWidthPx=800&key=API_KEY`.

### 3. Frontend: Update Type Definitions
I will ensure `src/types/location.types.ts` (or the component props) supports the `editorial_summary` field, likely by mapping it to the existing `description` field or adding it to the `google_places_data` JSONB structure.

### 4. Integration
I will verify that the `LocationCard` uses the correct data structure returned by the new Edge Function.
