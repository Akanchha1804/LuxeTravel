from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import connection
from django.db.models import Q
from .models import Trip, ChatRoom, UserActivity, Booking, Destination
from .serializers import (
    TripSerializer, ChatRoomSerializer, MessageSerializer, UserSerializer,
    UserActivitySerializer, BookingSerializer, DestinationSerializer,
    normalize_budget,
)
from . import ai, amadeus
from django.conf import settings
from django.utils import timezone
import json
import logging

logger = logging.getLogger(__name__)


class AIAnonThrottle(AnonRateThrottle):
    scope = 'ai'


class AIUserThrottle(UserRateThrottle):
    scope = 'ai'



def _preferences_text(value):
    if isinstance(value, (list, tuple)):
        return ", ".join(str(item) for item in value)
    return value or ""


class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """A user can only ever see and edit their own trips."""
        user = self.request.user
        if not user or not user.is_authenticated:
            return Trip.objects.none()
        if user.is_staff:
            return Trip.objects.all()
        return Trip.objects.filter(user=user)

    def perform_create(self, serializer):
        """Automatically assign the logged-in user when creating a trip"""
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """Keep ownership intact when editing a trip."""
        serializer.save(user=self.request.user)

    def _get_user_context(self, session_id):
        """Fetch user's past activity to provide context for AI"""
        if not session_id:
            return ""
        
        # Get last 5 activities from this session
        past_activities = UserActivity.objects.filter(session_id=session_id).order_by('-created_at')[:5]
        
        if not past_activities.exists():
            return ""
        
        context_parts = ["User's Recent Travel Interests:"]
        for activity in past_activities:
            context_parts.append(f"- Searched for {activity.destination_searched}")
            if activity.preferences:
                context_parts.append(f"  Preferences: {activity.preferences}")
            if activity.budget_range:
                context_parts.append(f"  Budget: {activity.budget_range}")
        
        return "\n".join(context_parts)

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[AllowAny],
        throttle_classes=[AIAnonThrottle],
    )
    def preview(self, request):
        """Generate an itinerary without saving a trip (used by the results page)."""
        destination = (request.data.get('destination') or '').strip()
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')

        if not destination or not start_date or not end_date:
            return Response(
                {'error': 'destination, start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from datetime import date
            start = date.fromisoformat(str(start_date))
            end = date.fromisoformat(str(end_date))
        except ValueError:
            return Response({'error': 'Dates must be in YYYY-MM-DD format'}, status=400)

        if end < start:
            return Response({'error': 'end_date must be on or after start_date'}, status=400)

        days_count = (end - start).days + 1
        budget = normalize_budget(request.data.get('budget'))
        preferences = _preferences_text(request.data.get('preferences'))
        travelers = request.data.get('travelers') or 1

        prompt = f"""
        Generate a realistic {days_count}-day travel itinerary for {destination}.
        Travelers: {travelers}. Total budget: {budget} INR (~{round(float(budget) / max(days_count, 1))} INR per day).
        Preferences: {preferences or 'general sightseeing'}.

        REQUIREMENTS:
        1. Use REAL, SPECIFIC restaurant and landmark names.
        2. 3-5 activities per day with practical timing.
        3. Keep the plan achievable for the budget and dates.

        Return ONLY a valid JSON object with this exact structure:
        {{
            "days": [
                {{
                    "day": 1,
                    "title": "Theme of the day",
                    "activities": ["9:00 AM - Visit ...", "1:00 PM - Lunch at ...", "7:00 PM - Dinner at ..."]
                }}
            ],
            "packing_list": ["Item 1", "Item 2"],
            "mood_board_keywords": ["Keyword 1", "Keyword 2"],
            "local_transportation": ["Metro", "Taxi", "Tip"]
        }}
        """

        try:
            itinerary = ai.generate_json(
                prompt,
                system_prompt=(
                    "You are an expert travel planner. Return only valid JSON, "
                    "no markdown and no commentary."
                ),
            )
        except ai.AIUnavailable:
            return Response(
                {
                    'error': 'AI itinerary generation is not configured.',
                    'code': 'ai_unavailable',
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except ai.AIResponseError:
            return Response(
                {'error': 'The AI provider returned an unusable response.', 'code': 'ai_error'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not isinstance(itinerary, dict) or not isinstance(itinerary.get('days'), list):
            return Response(
                {'error': 'AI returned an unexpected itinerary shape.', 'code': 'ai_error'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({'itinerary': itinerary, 'source': ai.provider_name()})


    @action(detail=True, methods=['post'], throttle_classes=[AIUserThrottle, AIAnonThrottle])
    def generate_itinerary(self, request, pk=None):
        trip = self.get_object()

        if not ai.ai_available():
            logger.info("No AI provider configured; using built-in itinerary for %s", trip.destination)
            # Fallback mock itinerary
            # Destination-specific detailed itineraries (7+ days each)
            destination_itineraries = {
                'Paris': [
                    ("Iconic Paris", ["Visit the Eiffel Tower (book tickets in advance)", "Walk along the Champs-Élysées", "Lunch at a traditional Parisian bistro", "Explore the Arc de Triomphe", "Evening Seine River cruise"]),
                    ("Art and Culture", ["Morning at the Louvre Museum (see Mona Lisa)", "Stroll through Tuileries Garden", "Visit Notre-Dame Cathedral (exterior)", "Explore the Latin Quarter", "Dinner in Le Marais district"]),
                    ("Montmartre & Versailles", ["Visit Sacré-Cœur Basilica in Montmartre", "Explore artist square Place du Tertre", "Afternoon trip to Palace of Versailles", "Tour the Hall of Mirrors", "Return for dinner near Opera Garnier"]),
                    ("Museums & Gardens", ["Visit Musée d'Orsay for Impressionist art", "Walk through Luxembourg Gardens", "Explore Rodin Museum and sculpture garden", "Visit Sainte-Chapelle stained glass", "Evening at Moulin Rouge cabaret show"]),
                    ("Modern Paris", ["Explore La Défense business district", "Visit Centre Pompidou modern art", "Lunch in Canal Saint-Martin area", "Shopping at Galeries Lafayette", "Sunset from Montparnasse Tower"]),
                    ("Hidden Gems", ["Morning at Père Lachaise Cemetery", "Explore Le Marais vintage shops", "Visit Musée Picasso", "Afternoon at Jardin des Plantes", "Dinner cruise on the Seine"]),
                    ("Day Trips", ["Day trip to Giverny (Monet's Gardens)", "Visit Château de Fontainebleau", "Wine tasting in Champagne region", "Return to Paris for farewell dinner", "Evening walk along the Seine"])
                ],
                'Tokyo': [
                    ("Modern Tokyo", ["Visit Senso-ji Temple in Asakusa", "Explore Akihabara electronics district", "Lunch at a conveyor belt sushi restaurant", "See Shibuya Crossing and Hachiko statue", "Evening in Shinjuku's neon streets"]),
                    ("Traditional Culture", ["Morning at Meiji Shrine", "Walk through Harajuku's Takeshita Street", "Visit teamLab Borderless digital art museum", "Explore Odaiba waterfront", "Dinner at an izakaya in Roppongi"]),
                    ("Mount Fuji Day Trip", ["Early morning trip to Mount Fuji (5th Station)", "Visit Lake Kawaguchi for views", "Lunch with Mt. Fuji view", "Explore Oshino Hakkai village", "Return to Tokyo evening"]),
                    ("Imperial & Gardens", ["Visit Imperial Palace East Gardens", "Explore Ginza shopping district", "Lunch at Tsukiji Outer Market", "Visit Tokyo Tower", "Evening in Roppongi Hills"]),
                    ("Anime & Pop Culture", ["Explore Nakano Broadway mall", "Visit Ghibli Museum (book ahead)", "Lunch in themed café", "Akihabara maid café experience", "Evening karaoke in Shibuya"]),
                    ("Traditional Tokyo", ["Morning at Tsukiji Fish Market", "Visit Ueno Park and museums", "Explore Yanaka old town", "Traditional tea ceremony", "Dinner in Asakusa"]),
                    ("Shopping & Farewell", ["Morning at Shibuya 109", "Visit Yoyogi Park", "Shopping in Omotesando", "Visit Tokyo Skytree", "Farewell dinner at teppanyaki restaurant"])
                ],
                'New York': [
                    ("Manhattan Highlights", ["Visit Statue of Liberty and Ellis Island", "Walk through Battery Park", "Explore Wall Street and Charging Bull", "Visit 9/11 Memorial and Museum", "Evening in Times Square"]),
                    ("Museums & Central Park", ["Morning at Metropolitan Museum of Art", "Walk through Central Park", "Visit Strawberry Fields (John Lennon Memorial)", "Explore Museum of Natural History", "Dinner in Upper West Side"]),
                    ("Brooklyn & Views", ["Walk across Brooklyn Bridge", "Explore DUMBO neighborhood", "Visit Brooklyn Heights Promenade", "Lunch at Smorgasburg food market", "Evening at Top of the Rock"]),
                    ("Midtown Manhattan", ["Visit Rockefeller Center", "Explore Fifth Avenue shopping", "Visit New York Public Library", "See Grand Central Terminal", "Broadway show in evening"]),
                    ("Downtown & SoHo", ["Explore SoHo art galleries", "Visit Little Italy and Chinatown", "Lunch at Chelsea Market", "Walk the High Line park", "Evening in Greenwich Village"]),
                    ("Upper East Side", ["Visit Guggenheim Museum", "Explore Museum Mile", "Lunch at Central Park Boathouse", "Visit Frick Collection", "Dinner on Upper East Side"]),
                    ("Farewell NYC", ["Morning at One World Observatory", "Visit Chelsea galleries", "Shopping in Meatpacking District", "Visit MoMA", "Farewell dinner in Tribeca"])
                ],
                'Dubai': [
                    ("Modern Marvels", ["Visit Burj Khalifa (book At The Top tickets)", "Explore Dubai Mall and aquarium", "Watch Dubai Fountain show", "Visit Dubai Frame", "Evening at Dubai Marina"]),
                    ("Culture & Souks", ["Morning at Jumeirah Mosque", "Explore Gold and Spice Souks", "Visit Dubai Museum in Al Fahidi Fort", "Abra boat ride across Dubai Creek", "Dinner at Madinat Jumeirah"]),
                    ("Desert Adventure", ["Morning desert safari with dune bashing", "Camel riding and sandboarding", "Traditional Bedouin camp lunch", "Quad biking in desert", "Evening BBQ dinner with entertainment"]),
                    ("Beach & Atlantis", ["Morning at Jumeirah Beach", "Visit Atlantis The Palm", "Aquaventure Waterpark", "Lunch at Palm Jumeirah", "Evening at La Mer beach"]),
                    ("Modern Dubai", ["Visit Museum of the Future", "Explore Dubai Design District", "Lunch at City Walk", "Visit Miracle Garden", "Evening at Global Village"]),
                    ("Abu Dhabi Day Trip", ["Day trip to Abu Dhabi", "Visit Sheikh Zayed Grand Mosque", "Explore Louvre Abu Dhabi", "Drive along Corniche", "Return to Dubai evening"]),
                    ("Shopping & Farewell", ["Morning at Mall of the Emirates", "Visit Ski Dubai", "Lunch at Kite Beach", "Sunset at Burj Al Arab", "Farewell dinner at Burj Khalifa"])
                ],
                'Bali': [
                    ("Ubud Culture", ["Visit Tegallalang Rice Terraces", "Explore Ubud Monkey Forest", "Lunch overlooking rice paddies", "Visit Ubud Royal Palace", "Traditional Balinese dance performance"]),
                    ("Temples & Waterfalls", ["Sunrise at Tanah Lot Temple", "Visit Tegenungan Waterfall", "Explore Tirta Empul water temple", "Coffee plantation tour", "Sunset at Uluwatu Temple with Kecak dance"]),
                    ("Beach Day Seminyak", ["Morning at Seminyak Beach", "Surfing lesson or beach yoga", "Lunch at beach club", "Shopping in Seminyak boutiques", "Sunset cocktails at beach bar"]),
                    ("Nature & Adventure", ["Early morning Mount Batur sunrise trek", "Breakfast with volcano view", "Visit hot springs", "Afternoon at Bali Swing", "Dinner in Ubud"]),
                    ("East Bali Exploration", ["Visit Tirta Gangga water palace", "Explore Lempuyang Temple (Gates of Heaven)", "Lunch with Agung volcano view", "Visit Taman Ujung water palace", "Return via scenic route"]),
                    ("Spa & Wellness", ["Morning yoga session", "Traditional Balinese massage", "Healthy lunch at organic café", "Visit Campuhan Ridge Walk", "Meditation and sunset viewing"]),
                    ("Beach & Farewell", ["Morning at Nusa Dua beach", "Snorkeling or water sports", "Lunch at Jimbaran Bay", "Last-minute shopping", "Farewell seafood dinner on beach"])
                ],
                'Hong Kong': [
                    ("Victoria Peak & Central", ["Take the Peak Tram to Victoria Peak", "Walk the Peak Circle Walk", "Star Ferry across Victoria Harbour", "Explore Central's skyscrapers", "Dinner in Lan Kwai Fong"]),
                    ("Lantau Island", ["Cable car to Ngong Ping 360", "Visit the Tian Tan Buddha (Big Buddha)", "Explore Po Lin Monastery", "Visit Tai O fishing village", "Sunset at Cheung Sha Beach"]),
                    ("Markets & Mong Kok", ["Visit the Ladies Market", "Explore the Goldfish Market", "Street food tour in Mong Kok", "Visit the Flower Market", "Dinner at a local Dai Pai Dong"]),
                    ("Culture & History", ["Visit Man Mo Temple", "Explore Tai Kwun Centre for Heritage and Arts", "Ride the Central-Mid-Levels Escalator", "Visit Hong Kong Museum of History", "Evening Symphony of Lights show"]),
                    ("Theme Park Day", ["Day trip to Hong Kong Disneyland OR Ocean Park", "Enjoy rides and attractions", "Watch parades and shows", "Dinner in the park", "Fireworks display"]),
                    ("Islands & Beaches", ["Ferry to Lamma Island", "Seafood lunch at Sok Kwu Wan", "Hiking trail to Yung Shue Wan", "Relax at Hung Shing Yeh Beach", "Return ferry to Central"]),
                    ("Shopping & Farewell", ["Shopping at Harbour City or Times Square", "High tea at The Peninsula", "Visit Sky100 Observation Deck", "Last dim sum meal", "Farewell drinks at Ozone Bar"])
                ],
                'Singapore': [
                    ("Marina Bay & Gardens", ["Visit Gardens by the Bay (Cloud Forest & Flower Dome)", "Walk the OCBC Skyway", "Explore Marina Bay Sands", "Watch Spectra Light & Water Show", "Dinner at Satay by the Bay"]),
                    ("Sentosa Island", ["Cable car to Sentosa", "Visit Universal Studios Singapore", "Relax at Siloso Beach", "Visit S.E.A. Aquarium", "Wings of Time night show"]),
                    ("Culture & Heritage", ["Explore Chinatown and Buddha Tooth Relic Temple", "Lunch at Maxwell Food Centre (Chicken Rice)", "Visit Little India and Sri Veeramakaliamman Temple", "Explore Kampong Glam and Sultan Mosque", "Dinner in Haji Lane"]),
                    ("Nature & Wildlife", ["Morning at Singapore Botanic Gardens (UNESCO)", "Visit the National Orchid Garden", "River Safari or Singapore Zoo", "Night Safari experience", "Dinner at the Zoo"]),
                    ("Shopping & City", ["Shopping on Orchard Road", "Visit National Museum of Singapore", "Explore Fort Canning Park", "Clarke Quay boat quay", "Evening river cruise"]),
                    ("Peranakan Culture", ["Visit Katong and Joo Chiat neighborhoods", "Try Peranakan cuisine (Laksa)", "Explore colorful shophouses", "Visit East Coast Park", "Seafood dinner at East Coast Lagoon"]),
                    ("Jewel & Farewell", ["Visit Jewel Changi Airport", "See the Rain Vortex waterfall", "Shopping and dining at Jewel", "Canopy Park attractions", "Farewell meal"])
                ],
                'Sydney': [
                    ("Iconic Sydney", ["Visit Sydney Opera House (tour or show)", "Walk across Sydney Harbour Bridge", "Explore The Rocks historic area", "Ferry to Manly Beach", "Dinner at Circular Quay"]),
                    ("Bondi & Coastal Walk", ["Morning at Bondi Beach", "Do the Bondi to Coogee Coastal Walk", "Lunch at Coogee Pavilion", "Swim in an ocean pool", "Evening in Surry Hills"]),
                    ("City & Culture", ["Visit Royal Botanic Garden", "Explore Art Gallery of New South Wales", "Shopping at Queen Victoria Building", "Visit Sydney Tower Eye", "Dinner in Darling Harbour"]),
                    ("Wildlife & Nature", ["Ferry to Taronga Zoo", "Picnic with harbour views", "Visit Sea Life Sydney Aquarium", "Explore Barangaroo Reserve", "Sunset cruise on the harbour"]),
                    ("Blue Mountains Day Trip", ["Day trip to Blue Mountains", "See the Three Sisters rock formation", "Ride Scenic World cable car", "Bushwalking in Wentworth Falls", "Return to Sydney evening"]),
                    ("History & Markets", ["Visit Australian Museum", "Explore Paddy's Markets", "Lunch in Chinatown", "Visit Hyde Park Barracks", "Evening in Newtown"]),
                    ("Relaxation & Farewell", ["Morning at Watsons Bay", "Fish and chips at Doyles", "Ferry back to city", "Last minute shopping", "Farewell dinner at Sydney Harbour"])
                ],
                'London': [
                    ("Royal London", ["Visit Buckingham Palace (Changing of Guard)", "Walk through St. James's Park", "Explore Westminster Abbey", "See Big Ben and Houses of Parliament", "Evening walk along South Bank"]),
                    ("Museums & Markets", ["Morning at British Museum", "Explore Covent Garden market", "Visit National Gallery in Trafalgar Square", "Walk through Leicester Square", "West End theatre show"]),
                    ("Tower & East London", ["Visit Tower of London and Crown Jewels", "Walk across Tower Bridge", "Explore Borough Market for lunch", "Visit Tate Modern art gallery", "Evening in Shoreditch"]),
                    ("Kensington & Hyde Park", ["Visit Kensington Palace", "Explore Hyde Park and Serpentine", "Lunch in Notting Hill", "Visit Victoria and Albert Museum", "Shopping on King's Road"]),
                    ("Camden & North London", ["Explore Camden Market", "Visit Regent's Park and Zoo", "Lunch in Primrose Hill", "Tour Abbey Road Studios area", "Evening in King's Cross"]),
                    ("Greenwich Day Trip", ["Visit Royal Observatory Greenwich", "Explore Greenwich Market", "See Cutty Sark ship", "Lunch with Thames view", "Return via Thames River cruise"]),
                    ("Shopping & Farewell", ["Morning at Harrods", "Explore Oxford Street shopping", "Visit Sky Garden for views", "Ride the London Eye", "Farewell dinner in Covent Garden"])
                ],
                'Kerala': [
                    ("Arrival in Kochi", ["Arrive at Cochin Airport", "Check into Fort Kochi hotel", "Lunch at Kashi Art Café", "Explore Chinese Fishing Nets", "Dinner at Oceanos Restaurant", "Kathakali dance show"]),
                    ("Munnar Tea Gardens", ["Drive to Munnar", "Lunch at Saravana Bhavan", "Visit Tata Tea Museum", "Tea plantation tour", "Dinner at Rapsy Restaurant"]),
                    ("Thekkady Wildlife", ["Drive to Thekkady", "Periyar National Park boat safari", "Spice plantation tour", "Elephant experience", "Dinner at Grandma's Café"]),
                    ("Alleppey Backwaters", ["Drive to Alleppey", "Check into houseboat", "Backwater cruise", "Village visit", "Traditional Kerala Sadhya dinner"]),
                    ("Varkala Beach", ["Drive to Varkala", "Lunch at Clafouti Restaurant", "Beach relaxation", "Temple visit", "Dinner at Darjeeling Café"]),
                    ("Ayurvedic Wellness", ["Sunrise photography", "Ayurvedic spa treatment", "Beach yoga", "Organic lunch", "Sunset meditation"]),
                    ("Departure", ["Last shopping", "Trivandrum sightseeing", "Departure"])
                ],
                'Goa': [
                    ("North Goa Beaches", ["Visit Baga Beach", "Water sports at Calangute", "Lunch at Brittos", "Sunset at Anjuna Beach", "Dinner at Thalassa"]),
                    ("Old Goa Heritage", ["Basilica of Bom Jesus", "Se Cathedral", "Lunch at Fisherman's Wharf", "Fontainhas Latin Quarter walk", "Dinner cruise on Mandovi River"]),
                    ("South Goa Relaxation", ["Palolem Beach", "Silent Noise Disco (if Saturday)", "Lunch at Dropadi", "Butterfly Beach boat ride", "Dinner at Martin's Corner"]),
                    ("Spice Plantation", ["Visit Sahakari Spice Farm", "Traditional Goan lunch", "Elephant wash", "Dudhsagar Waterfalls trip", "Return to hotel"]),
                    ("Adventure & Forts", ["Aguada Fort", "Chapora Fort (Dil Chahta Hai point)", "Lunch at Vinayak Family Restaurant", "Paragliding at Arambol", "Dinner at Gunpowder"]),
                    ("Wellness & Markets", ["Morning Yoga", "Anjuna Flea Market (Wednesday) or Mapusa Market", "Lunch at Artjuna", "Sunset cruise", "Dinner at La Plage"]),
                    ("Departure", ["Last dip in the sea", "Souvenir shopping", "Airport transfer"])
                ],
                'Jaipur': [
                    ("Pink City Heritage", ["Hawa Mahal photo stop", "City Palace tour", "Jantar Mantar observatory", "Lunch at LMB", "Shopping in Johari Bazaar"]),
                    ("Forts & Glory", ["Amber Fort elephant ride", "Jaigarh Fort", "Lunch at 1135 AD", "Nahargarh Fort sunset", "Dinner at Chokhi Dhani village resort"]),
                    ("Royal Culture", ["Albert Hall Museum", "Birla Mandir", "Lunch at Tapri Central", "Patrika Gate photography", "Dinner at Handi"]),
                    ("Departure", ["Breakfast at hotel", "Last minute shopping", "Departure"])
                ],
                'Mumbai': [
                    ("Colaba & History", ["Gateway of India", "Taj Mahal Palace photo", "Colaba Causeway shopping", "Lunch at Leopold Cafe", "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya"]),
                    ("Marine Drive & Culture", ["Marine Drive walk", "Chowpatty Beach", "Lunch at Pizza by the Bay", "Haji Ali Dargah", "Dinner at Bademiya"]),
                    ("Bandra & Bollywood", ["Bandra Bandstand", "Mount Mary Church", "Lunch at Candies", "Street art tour", "Dinner at Bastian"]),
                    ("Departure", ["Juhu Beach morning", "Airport transfer"])
                ],
                'Delhi': [
                    ("Old Delhi Charm", ["Red Fort", "Jama Masjid", "Rickshaw ride in Chandni Chowk", "Lunch at Karim's", "Raj Ghat"]),
                    ("New Delhi Grandeur", ["India Gate", "Rashtrapati Bhavan drive-by", "Humayun's Tomb", "Lunch at Andhra Bhavan", "Qutub Minar"]),
                    ("Spiritual & Modern", ["Lotus Temple", "Akshardham Temple", "Lunch at Fabcafe", "Hauz Khas Village", "Dinner at Social"]),
                    ("Departure", ["Khan Market shopping", "Airport transfer"])
                ]
            }
            
            destination_name = trip.destination
            day_templates = destination_itineraries.get(destination_name, [
                ("Arrival Day", [f"Arrive in {trip.destination} and check into hotel", "Explore neighborhood around accommodation", "Visit welcome center for maps and info", "Dinner at recommended local restaurant", "Rest and prepare for adventures"]),
                ("Main Attractions", ["Visit the city's most famous landmark", "Explore the historic old town", "Lunch at traditional restaurant", "Visit main museum or cultural site", "Evening stroll through city center"]),
                ("Cultural Immersion", ["Morning at local market", "Join a walking food tour", "Visit art gallery or museum", "Explore local neighborhoods", "Dinner at authentic local spot"]),
                ("Day Trip", ["Day trip to nearby attraction", "Explore surrounding countryside", "Lunch at scenic location", "Visit historical site", "Return to city for dinner"]),
                ("Shopping & Leisure", ["Morning at main shopping district", "Visit local artisan shops", "Lunch at trendy café", "Relax at city park or garden", "Evening at popular entertainment area"]),
                ("Hidden Gems", ["Explore off-the-beaten-path locations", "Visit local favorite spots", "Lunch at neighborhood restaurant", "Discover street art or murals", "Evening at local bar or venue"]),
                ("Farewell Day", ["Last-minute sightseeing", "Shopping for souvenirs", "Visit favorite spot one more time", "Pack and prepare for departure", "Farewell dinner at special restaurant"])
            ])
            
            days_count = (trip.end_date - trip.start_date).days + 1
            mock_days = []
            
            # Generate days with variations to avoid exact repetition
            for i in range(days_count):
                template_index = i % len(day_templates)
                day_template = day_templates[template_index]
                
                # Add variation suffix for repeated cycles
                cycle_number = i // len(day_templates)
                title_suffix = f" (Extended)" if cycle_number > 0 else ""
                
                # Extract keyword for image from title
                title = day_template[0]
                image_keyword = title.split()[0].lower()  # First word of title
                
                mock_days.append({
                    "day": i + 1,
                    "title": day_template[0] + title_suffix,
                    "activities": day_template[1],
                    "image_keyword": image_keyword  # Add keyword for photo matching
                })
            
            # Destination-specific packing suggestions
            packing_suggestions = {
                'Paris': [
                    "Stylish walking shoes or loafers",
                    "Light cardigan or blazer",
                    "Jeans and dress pants",
                    "Button-down shirts or blouses",
                    "Scarf (essential Parisian accessory)",
                    "Umbrella (for unexpected rain)",
                    "Camera with extra battery",
                    "Power adapter (Type C/E plugs)",
                    "Crossbody bag or small backpack",
                    "Sunglasses and sunscreen"
                ],
                'Tokyo': [
                    "Comfortable sneakers for walking",
                    "Light layers (T-shirts, long sleeves)",
                    "Jeans or casual pants",
                    "Light rain jacket",
                    "Portable WiFi device or SIM card",
                    "Cash wallet (many places cash-only)",
                    "Face masks (common courtesy)",
                    "Compact umbrella",
                    "Power adapter (Type A/B plugs)",
                    "Small day backpack"
                ],
                'New York': [
                    "Comfortable walking sneakers",
                    "Layered clothing (weather changes quickly)",
                    "Jeans and casual pants",
                    "Light jacket or hoodie",
                    "Crossbody bag (keep hands free)",
                    "Reusable water bottle",
                    "Portable phone charger",
                    "Sunglasses and baseball cap",
                    "Metro card holder",
                    "Comfortable socks"
                ],
                'Dubai': [
                    "Lightweight breathable clothing",
                    "Modest attire for religious sites",
                    "Sandals and comfortable walking shoes",
                    "Sunglasses and wide-brim hat",
                    "High SPF sunscreen",
                    "Light scarf or shawl",
                    "Swimwear for hotel pools",
                    "Power adapter (Type G plugs)",
                    "Reusable water bottle",
                    "Light cardigan for air-conditioned malls"
                ],
                'Bali': [
                    "Flip-flops and water shoes",
                    "Light cotton t-shirts and tank tops",
                    "Shorts and light pants",
                    "Swimwear and beach cover-up",
                    "Sarong (for temple visits)",
                    "Mosquito repellent",
                    "Waterproof phone case",
                    "High SPF sunscreen",
                    "Light rain jacket",
                    "Small daypack for excursions"
                ],
                'Hong Kong': [
                    "Octopus card (for transport)",
                    "Comfortable walking shoes (lots of hills)",
                    "Light jacket (AC is strong indoors)",
                    "Umbrella (sudden showers)",
                    "Power adapter (Type G)",
                    "Casual smart clothing",
                    "Hand sanitizer/wipes",
                    "Reusable water bottle",
                    "Portable charger",
                    "Camera for skyline shots"
                ],
                'Singapore': [
                    "Light, breathable clothing (very humid)",
                    "Comfortable sandals or sneakers",
                    "Umbrella or poncho",
                    "Sunscreen and sunglasses",
                    "Insect repellent (for zoo/safari)",
                    "Water bottle (tap water is safe)",
                    "Power adapter (Type G)",
                    "Light cardigan for malls",
                    "Swimwear",
                    "EZ-Link card holder"
                ],
                'Sydney': [
                    "Sunscreen (very strong sun)",
                    "Swimwear and beach towel",
                    "Comfortable walking shoes",
                    "Sunglasses and hat",
                    "Light layers (weather changes)",
                    "Power adapter (Type I)",
                    "Opal card holder",
                    "Flip flops (thongs)",
                    "Casual beachwear",
                    "Camera"
                ],
                'London': [
                    "Waterproof jacket or trench coat",
                    "Comfortable walking shoes (waterproof)",
                    "Layered clothing (sweaters, cardigans)",
                    "Jeans and casual trousers",
                    "Compact umbrella",
                    "Scarf and light gloves",
                    "Power adapter (Type G plugs)",
                    "Oyster card holder",
                    "Crossbody bag",
                    "Warm socks"
                ]
            }
            
            destination_name = trip.destination
            packing_list = packing_suggestions.get(destination_name, [
                "Comfortable walking shoes",
                "T-shirts and casual tops",
                "Pants and shorts",
                "Light jacket",
                "Camera or smartphone",
                "Power bank and chargers",
                "Travel documents",
                "Sunscreen and sunglasses",
                "Reusable water bottle",
                "Basic first-aid kit"
            ])
            
            mock_itinerary = {
                "days": mock_days,
                "packing_list": packing_list,
                "mood_board_keywords": [
                    f"{trip.destination} landmarks",
                    "local cuisine",
                    "street scenes",
                    "cultural sites",
                    "sunset views"
                ]
            }
            trip.itinerary = json.dumps(mock_itinerary)
            trip.save()
            return Response({'status': 'itinerary generated', 'itinerary': trip.itinerary})

        try:
            days_count = (trip.end_date - trip.start_date).days + 1
            
            # Get user context for personalization
            user_context = self._get_user_context(trip.session_id)
            context_section = f"\n\nPERSONALIZATION CONTEXT:\n{user_context}\n" if user_context else ""
            
            prompt = f"""
            Generate a detailed {days_count}-day trip itinerary for {trip.destination} with a budget of {trip.budget}.
            {context_section}
            REQUIREMENTS:
            1. Use REAL, SPECIFIC restaurant names (e.g., "Lunch at Joe's Pizza", not "Lunch at a local spot").
            2. Use REAL, SPECIFIC landmark names.
            3. Include a "local_transportation" section describing the best way to get around (e.g., "Metro, Uber, Tuk-tuk").
            4. If user context is provided, tailor recommendations based on their past preferences and interests.
            
            Return ONLY a valid JSON object with this EXACT structure:
            {{
                "days": [
                    {{
                        "day": 1,
                        "title": "Theme of the day",
                        "activities": [
                            "9:00 AM - Visit [Specific Landmark]",
                            "12:00 PM - Lunch at [Specific Restaurant]",
                            "2:00 PM - Activity at [Specific Place]",
                            "7:00 PM - Dinner at [Specific Restaurant]"
                        ]
                    }}
                ],
                "packing_list": ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"],
                "mood_board_keywords": ["Keyword 1", "Keyword 2", "Keyword 3"],
                "local_transportation": ["Option 1 (e.g. Metro)", "Option 2 (e.g. Taxi)", "Tip for getting around"]
            }}
            """

            itinerary = ai.generate_json(
                prompt,
                system_prompt=(
                    "You are a helpful travel assistant that generates structured "
                    "JSON itineraries. Return only valid JSON."
                ),
            )
            content = json.dumps(itinerary)
            trip.itinerary = content
            trip.save(update_fields=["itinerary", "updated_at"])
            return Response(
                {
                    'status': 'itinerary generated',
                    'itinerary': content,
                    'source': ai.provider_name(),
                }
            )

        except Exception as exc:
            logger.exception("AI itinerary generation failed for trip %s", trip.pk)
            # Graceful fallback so the product still works without AI.
            mock_itinerary = {
                "days": [
                    {
                        "day": 1,
                        "title": "Arrival and Exploration",
                        "activities": [
                            f"Arrive in {trip.destination}",
                            "Check into your hotel",
                            "Evening walk in the historic centre",
                            "Dinner at a highly rated local restaurant",
                        ],
                    }
                ],
                "packing_list": ["Comfortable shoes", "Camera", "Charger"],
                "mood_board_keywords": [f"{trip.destination}", "travel", "adventure"],
                "error": str(exc),
            }
            trip.itinerary = json.dumps(mock_itinerary)
            trip.save(update_fields=["itinerary", "updated_at"])
            return Response(
                {
                    'status': 'itinerary generated (fallback)',
                    'itinerary': trip.itinerary,
                    'source': 'fallback',
                }
            )

    @action(
        detail=True,
        methods=['post'],
        throttle_classes=[AIAnonThrottle],
    )
    def refine_itinerary(self, request, pk=None):
        trip = self.get_object()
        user_instruction = (request.data.get('instruction') or '').strip()

        if not user_instruction:
            return Response({'error': 'Instruction is required'}, status=status.HTTP_400_BAD_REQUEST)

        if not ai.ai_available():
            return Response({
                'status': 'refinement_unavailable',
                'message': (
                    'AI refinement is not configured on this deployment. '
                    'Set OPENAI_API_KEY or GEMINI_API_KEY to enable it.'
                ),
                'itinerary': trip.itinerary,
            }, status=status.HTTP_200_OK)

        try:
            days_count = (trip.end_date - trip.start_date).days + 1
            prompt = f"""
            Refine the following {days_count}-day trip itinerary for {trip.destination}
            based on this user instruction: "{user_instruction}".

            Current Itinerary JSON:
            {trip.itinerary}

            REQUIREMENTS:
            1. Keep the JSON structure EXACTLY the same.
            2. Modify activities/restaurants based on the instruction.
            3. Return ONLY valid JSON.
            """

            itinerary = ai.generate_json(
                prompt,
                system_prompt=(
                    "You edit structured JSON itineraries. Return only valid JSON."
                ),
            )
            content = json.dumps(itinerary)
            trip.itinerary = content
            trip.save(update_fields=["itinerary", "updated_at"])
            return Response({'status': 'itinerary refined', 'itinerary': content})

        except Exception as exc:
            logger.exception("Itinerary refinement failed for trip %s", trip.pk)
            return Response(
                {'error': 'Could not refine the itinerary right now.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_trips(self, request):
        """
        GET /api/trips/my_trips/
        Returns only the trips that belong to the logged-in user.
        """
        user = request.user
        trips = Trip.objects.filter(user=user).order_by('-created_at')
        serializer = self.get_serializer(trips, many=True)
        return Response(serializer.data)

class ChatRoomViewSet(viewsets.ModelViewSet):
    queryset = ChatRoom.objects.all()
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return ChatRoom.objects.filter(Q(is_private=False) | Q(created_by=user))
        return ChatRoom.objects.filter(is_private=False)

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user if self.request.user.is_authenticated else None
        )

    def destroy(self, request, *args, **kwargs):
        room = self.get_object()
        if room.created_by_id and room.created_by_id != request.user.id and not request.user.is_staff:
            return Response(
                {'error': 'Only the room creator can delete this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    def _authorized_room(self, request, pk):
        room = ChatRoom.objects.filter(pk=pk).first()
        if not room:
            return None
        if not room.is_private:
            return room
        supplied_code = (
            request.headers.get('X-Room-Code')
            or request.query_params.get('code')
            or request.data.get('room_code')
        )
        if request.user.is_authenticated and room.created_by_id == request.user.id:
            return room
        if supplied_code and supplied_code.upper() == room.room_code.upper():
            return room
        return None

    @action(detail=False, methods=['post'])
    def join_private(self, request):
        code = (request.data.get('room_code') or '').strip().upper()
        if not code:
            return Response({'error': 'A room code is required.'}, status=400)
        try:
            room = ChatRoom.objects.get(room_code=code, is_private=True)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Invalid room code'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatRoomSerializer(room).data)

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        room = self._authorized_room(request, pk)
        if not room:
            return Response(
                {'error': 'Room not found or you do not have access.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == 'GET':
            messages = room.messages.all()[:200]
            return Response(MessageSerializer(messages, many=True).data)

        payload = request.data.copy()
        if request.user.is_authenticated:
            payload['sender'] = request.user.username
        serializer = MessageSerializer(data=payload)
        if serializer.is_valid():
            message = serializer.save(room=room)
            return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserActivityViewSet(viewsets.ModelViewSet):
    """Track user search activities for AI personalization"""
    queryset = UserActivity.objects.all()
    serializer_class = UserActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Logging is allowed anonymously; reading the log is admin-only.
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdminUser()]

    def get_queryset(self):
        if self.request.user.is_staff:
            return UserActivity.objects.all()
        return UserActivity.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Log user activity"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class BookingViewSet(viewsets.ModelViewSet):
    """Handle bookings for flights, hotels, buses, trains"""
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return only bookings for the logged-in user"""
        return Booking.objects.filter(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """
        POST /api/bookings/
        Expected payload:
        {
            "trip": <trip_id>,
            "provider": "flight" | "hotel" | "bus" | "train",
            "payload": { ... provider-specific data ... }
        }
        """
        user = request.user
        trip_id = request.data.get('trip')
        provider = request.data.get('provider')
        payload = request.data.get('payload', {})
        
        # Validate trip exists and belongs to the current user
        try:
            trip = Trip.objects.get(id=trip_id, user=user)
        except Trip.DoesNotExist:
            return Response(
                {'error': 'Trip not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Choose external API endpoint based on provider
        provider_urls = {
            'flight': 'https://api.example.com/flight/book',
            'hotel': 'https://api.example.com/hotel/book',
            'bus': 'https://api.example.com/bus/book',
            'train': 'https://api.example.com/train/book',
        }
        
        external_url = provider_urls.get(provider)
        if not external_url:
            return Response(
                {'error': 'Unsupported provider. Choose: flight, hotel, bus, or train'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # For demo purposes, create a mock successful booking
        # In production, you would call the actual external API:
        # try:
        #     external_resp = requests.post(
        #         external_url,
        #         json=payload,
        #         timeout=15,
        #         headers={'Content-Type': 'application/json'}
        #     )
        #     external_resp.raise_for_status()
        #     external_data = external_resp.json()
        # except requests.RequestException as exc:
        #     return Response(
        #         {'error': f'Booking provider error: {str(exc)}'},
        #         status=status.HTTP_502_BAD_GATEWAY
        #     )
        
        # Mock response for demo (no real ticketing provider is connected yet)
        import uuid
        external_data = {
            'booking_id': f'{provider.upper()}-{uuid.uuid4().hex[:8].upper()}',
            'status': 'pending',
            'provider': provider,
            'demo': True,
            'details': payload
        }
        
        # Create booking record
        booking = Booking.objects.create(
            user=user,
            trip=trip,
            provider=provider,
            reference_id=external_data.get('booking_id'),
            status=external_data.get('status', 'confirmed'),
            raw_response=external_data
        )
        
        serializer = self.get_serializer(booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class DestinationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for moodboard destinations with filtering
    """
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    permission_classes = [AllowAny]  # Allow public access to moodboard
    
    def get_queryset(self):
        queryset = Destination.objects.all()
        
        # Filter by trip type
        trip_type = self.request.query_params.get('trip_type', None)
        if trip_type:
            queryset = queryset.filter(trip_types__icontains=trip_type)
            
        # Filter by region
        region = self.request.query_params.get('region', None)
        if region:
            queryset = queryset.filter(region__iexact=region)
            
        # Filter by activity
        activity = self.request.query_params.get('activity', None)
        if activity:
            queryset = queryset.filter(activities__icontains=activity)
            
        return queryset.order_by('name')


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'username': user.username, 'user': serializer.data})
    first_error = next(iter(serializer.errors.values()), ['Invalid signup details'])
    if isinstance(first_error, list) and first_error:
        first_error = first_error[0]
    return Response(
        {'error': str(first_error), 'details': serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = (request.data.get('username') or '').strip()
    password = request.data.get('password') or ''
    user = authenticate(username=username, password=password)
    if not user and username:
        # Allow login with email address as well as username.
        match = User.objects.filter(email__iexact=username).first()
        if match:
            user = authenticate(username=match.username, password=password)
    if not user:
        return Response({'error': 'Invalid username or password.'}, status=status.HTTP_400_BAD_REQUEST)
    token, created = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'username': user.username, 'email': user.email})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    return Response({'id': user.id, 'username': user.username, 'email': user.email})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response({'status': 'logged out'})


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    database_status = 'ok'
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except Exception:
        logger.exception('Database health check failed')
        database_status = 'error'

    payload = {
        'status': 'ok' if database_status == 'ok' else 'degraded',
        'version': settings.APP_VERSION,
        'database': database_status,
        'ai_provider': ai.provider_name(),
        'travel_api': 'configured' if amadeus.configured() else 'not_configured',
        'time': timezone.now().isoformat(),
    }
    response = Response(payload, status=200 if database_status == 'ok' else 503)
    response['Cache-Control'] = 'no-store'
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def travel_flights(request):
    if not amadeus.configured():
        return Response({'error': 'Travel API is not configured.', 'code': 'not_configured'}, status=503)

    origin = request.query_params.get('origin')
    destination = request.query_params.get('destination')
    departure_date = request.query_params.get('departure_date')
    if not origin or not destination or not departure_date:
        return Response(
            {'error': 'origin, destination and departure_date are required'},
            status=400,
        )

    try:
        data = amadeus.search_flights(
            origin,
            destination,
            departure_date,
            request.query_params.get('return_date'),
            request.query_params.get('adults', 1),
        )
    except amadeus.AmadeusError:
        return Response({'error': 'Flight search is temporarily unavailable.'}, status=502)
    except Exception:
        logger.exception('Unexpected flight search failure')
        return Response({'error': 'Flight search is temporarily unavailable.'}, status=502)

    return Response({'results': data, 'source': 'amadeus'})


@api_view(['GET'])
@permission_classes([AllowAny])
def travel_hotels(request):
    if not amadeus.configured():
        return Response({'error': 'Travel API is not configured.', 'code': 'not_configured'}, status=503)

    destination = request.query_params.get('destination')
    check_in = request.query_params.get('check_in')
    check_out = request.query_params.get('check_out')
    if not destination or not check_in or not check_out:
        return Response(
            {'error': 'destination, check_in and check_out are required'},
            status=400,
        )

    try:
        data = amadeus.search_hotels(
            destination,
            check_in,
            check_out,
            request.query_params.get('adults', 1),
        )
    except amadeus.AmadeusError:
        return Response({'error': 'Hotel search is temporarily unavailable.'}, status=502)
    except Exception:
        logger.exception('Unexpected hotel search failure')
        return Response({'error': 'Hotel search is temporarily unavailable.'}, status=502)

    return Response({'results': data, 'source': 'amadeus'})


# Phase 4: Social & Collaboration Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def make_trip_public(request, trip_id):
    """Make a trip public and generate shareable link"""
    try:
        trip = Trip.objects.get(id=trip_id, user=request.user)
        trip.is_public = True
        trip.save()  # This will auto-generate share_code if not exists
        
        return Response({
            'success': True,
            'share_code': trip.share_code,
            'share_url': f"/shared/{trip.share_code}"
        })
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=404)


@api_view(['GET'])
@permission_classes([AllowAny])
def view_shared_trip(request, share_code):
    """View a public trip by share code"""
    try:
        trip = Trip.objects.get(share_code=share_code, is_public=True)
        serializer = TripSerializer(trip)
        return Response(serializer.data)
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found or not public'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def fork_trip(request, share_code):
    """Fork (clone) a public trip"""
    try:
        original_trip = Trip.objects.get(share_code=share_code, is_public=True)
        
        # Create a new trip as a fork
        forked_trip = Trip.objects.create(
            user=request.user,
            destination=original_trip.destination,
            start_date=original_trip.start_date,
            end_date=original_trip.end_date,
            budget=original_trip.budget,
            preferences=original_trip.preferences,
            itinerary=original_trip.itinerary,
            forked_from=original_trip
        )
        
        # Increment fork count on original
        original_trip.fork_count += 1
        original_trip.save()
        
        serializer = TripSerializer(forked_trip)
        return Response({
            'success': True,
            'trip': serializer.data,
            'message': f'Successfully forked trip to {original_trip.destination}'
        })
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found or not public'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_trip_chatroom(request, trip_id):
    """Create a private chatroom for a trip"""
    try:
        trip = Trip.objects.get(id=trip_id, user=request.user)
        
        # Check if chatroom already exists
        if trip.chat_room:
            serializer = ChatRoomSerializer(trip.chat_room)
            return Response({
                'success': True,
                'chatroom': serializer.data,
                'message': 'Chatroom already exists'
            })
        
        # Create new private chatroom
        chatroom = ChatRoom.objects.create(
            name=f"{trip.destination} Trip Chat",
            description=f"Private chat for {trip.destination} trip ({trip.start_date} - {trip.end_date})",
            is_private=True,
            created_by=request.user,
        )
        
        trip.chat_room = chatroom
        trip.save()
        
        serializer = ChatRoomSerializer(chatroom)
        return Response({
            'success': True,
            'chatroom': serializer.data,
            'message': 'Chatroom created successfully'
        })
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=404)
