# ✨ New Feature: Interactive Moodboard with Filters

## Overview
The Moodboard page has been completely redesigned to be interactive and data-driven. It now connects to the backend API to fetch real destinations based on user-selected filters.

## Features
- **Dynamic Filtering:** Filter destinations by:
  - **Trip Type:** Adventure, Relaxation, Cultural, etc.
  - **Region:** Europe, Asia, Africa, etc.
  - **Activity:** Hiking, Beaches, Food, etc.
- **Visual Cards:** Beautiful destination cards with images, descriptions, and tags.
- **Direct Planning:** "Plan This Trip" button on each card takes you directly to the trip creation page with the destination pre-filled.
- **Responsive Design:** Works perfectly on mobile and desktop.
- **Backend Integration:** Fetches data from `/api/destinations/`.

## How to Use
1. Go to the **Mood Board** page from the navigation menu.
2. Click on filters to refine your search (e.g., select "Adventure" and "Asia").
3. The grid automatically updates to show matching destinations.
4. Click "Plan This Trip" on any card to start planning your journey to that location.

## Technical Details
- **Backend Model:** `Destination` model stores trip data.
- **API Endpoint:** `GET /api/destinations/?trip_type=...&region=...&activity=...`
- **Frontend:** React component with `fetch` API and state management.
- **Database:** Pre-populated with 10 diverse destinations (Kyoto, Santorini, Bali, etc.).

## Testing
1. Navigate to `/moodboard`.
2. Click "Asia" filter -> Should show Kyoto, Bali.
3. Click "Adventure" filter -> Should show Machu Picchu, Cape Town, etc.
4. Click "Plan This Trip" -> Should redirect to `/create-trip?destination=...`.

## Future Enhancements
- User favorites/likes for destinations.
- More detailed destination pages.
- AI-generated destination suggestions based on mood.
