import json
import logging
from typing import Dict, Any
from groq import Groq
try:
    from backend.config import settings
    from backend.schemas import TravelPreferences, TravelSuggestionsResponse
except ModuleNotFoundError:
    from config import settings
    from schemas import TravelPreferences, TravelSuggestionsResponse

logger = logging.getLogger("uvicorn")

class GroqService:
    @staticmethod
    def generate_suggestions(prefs: TravelPreferences) -> Dict[str, Any]:
        """Generates travel suggestions based on preferences using Groq Llama-3.3-70b-versatile or a local fallback."""
        if not settings.groq_api_key:
            logger.warning("GROQ_API_KEY is not set. Using local mockup suggestions.")
            return GroqService._get_mock_suggestions(prefs)

        try:
            client = Groq(api_key=settings.groq_api_key)
            
            system_prompt = (
                "You are an expert travel planner. You must generate personalized travel suggestions "
                "based on the user's travel preferences. You MUST return a JSON object with a key 'suggestions' "
                "containing a list of exactly 3 travel suggestions. Follow this structure strictly:\n"
                "{\n"
                "  \"suggestions\": [\n"
                "    {\n"
                "      \"placeName\": \"string\",\n"
                "      \"country\": \"string\",\n"
                "      \"description\": \"string\",\n"
                "      \"estimatedCost\": \"string (numeric value representing currency of estimate e.g. 50000 or 1500)\",\n"
                "      \"bestSeason\": \"string\",\n"
                "      \"attractions\": [\"string\", \"string\"],\n"
                "      \"activities\": [\"string\", \"string\"],\n"
                "      \"travelTips\": [\"string\", \"string\"],\n"
                "      \"travelPlan\": [\n"
                "        {\n"
                "          \"day\": 1,\n"
                "          \"title\": \"string\",\n"
                "          \"tasks\": [\"string\", \"string\"]\n"
                "        }\n"
                "      ],\n"
                "      \"checklist\": [\n"
                "        {\n"
                "          \"item\": \"string\",\n"
                "          \"completed\": false\n"
                "        }\n"
                "      ]\n"
                "    }\n"
                "  ]\n"
                "}\n"
                f"For the travelPlan itinerary, generate exactly {prefs.tripDuration} days of itinerary. "
                "Each checklist item must have 'completed' set to false."
            )

            user_prompt = (
                f"Preferences:\n"
                f"- Budget Limit: {prefs.budget}\n"
                f"- Destination Country: {prefs.preferredCountry}\n"
                f"- Climate: {prefs.climatePreference}\n"
                f"- Travel Style: {prefs.travelType}\n"
                f"- Duration: {prefs.tripDuration} days\n"
                f"- Number of Travelers: {prefs.numberOfTravelers}\n"
                f"- Accommodation Standard: {prefs.accommodationPreference}\n"
                f"- Favorite Activities: {', '.join(prefs.preferredActivities)}\n\n"
                "Suggest 3 appropriate places matching these inputs."
            )

            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )

            content = response.choices[0].message.content
            logger.info("Groq API suggested content loaded successfully.")
            
            # Parse & Validate
            parsed_json = json.loads(content)
            
            # Enforce validation
            validated_data = TravelSuggestionsResponse.model_validate(parsed_json)
            return validated_data.model_dump()

        except Exception as e:
            logger.error(f"Error calling Groq API or validating suggestions: {e}")
            logger.info("Falling back to local simulation generator.")
            return GroqService._get_mock_suggestions(prefs)

    @staticmethod
    def _get_mock_suggestions(prefs: TravelPreferences) -> Dict[str, Any]:
        """Provides mock travel recommendations that perfectly match the schema and user criteria."""
        duration = prefs.tripDuration
        country = prefs.preferredCountry or "Global"
        
        # Build 3 suggestions dynamically based on user parameters
        if "beach" in prefs.climatePreference.lower() or "beaches" in prefs.preferredActivities:
            place_suggestions = [
                {
                    "placeName": "Bali (Nusa Dua & Ubud)",
                    "country": "Indonesia",
                    "description": f"A tropical paradise perfect for your {prefs.travelType} getaway. Enjoy beautiful beaches, rich culture, and lush greenery.",
                    "estimatedCost": str(1200 * prefs.numberOfTravelers),
                    "bestSeason": "April to October",
                    "attractions": ["Ubud Monkey Forest", "Uluwatu Temple", "Tegalalang Rice Terrace"],
                    "activities": ["Surfing", "Yoga", "Snorkeling", "Cultural dance watching"],
                    "travelTips": ["Carry sunscreen", "Rent a scooter for local transit", "Respect local temple dress codes"]
                },
                {
                    "placeName": "Maldives (Maafushi & Male)",
                    "country": "Maldives",
                    "description": f"An ocean lover's dream, ideal for a {prefs.travelType} tour with crystal clear waters and private reef lagoons.",
                    "estimatedCost": str(2500 * prefs.numberOfTravelers),
                    "bestSeason": "November to April",
                    "attractions": ["Banana Reef", "Bikini Beach", "Maafushi Island"],
                    "activities": ["Scuba Diving", "Island Hopping", "Sunset Cruise"],
                    "travelTips": ["Bring cash for local islands", "Pack light summer clothes", "Respect local customs"]
                },
                {
                    "placeName": "Goa (Calangute & Palolem)",
                    "country": "India",
                    "description": f"A vibrant coastal destination featuring scenic beaches, rich Portuguese history, and a relaxed hippie vibe.",
                    "estimatedCost": str(400 * prefs.numberOfTravelers),
                    "bestSeason": "November to February",
                    "attractions": ["Fort Aguada", "Basilica of Bom Jesus", "Palolem Beach"],
                    "activities": ["Water sports", "Beach shack dining", "Historical exploration"],
                    "travelTips": ["Try local vindaloo curry", "Rent a two-wheeler", "Check taxi fares beforehand"]
                }
            ]
        elif "cold" in prefs.climatePreference.lower() or "mountain" in prefs.climatePreference.lower() or "trekking" in prefs.preferredActivities:
            place_suggestions = [
                {
                    "placeName": "Switzerland (Zermatt & Interlaken)",
                    "country": "Switzerland",
                    "description": f"A magnificent alpine region offering spectacular views of the Matterhorn, perfect for {prefs.travelType} enthusiasts.",
                    "estimatedCost": str(3500 * prefs.numberOfTravelers),
                    "bestSeason": "June to September (hiking) or December to March (skiing)",
                    "attractions": ["Matterhorn", "Jungfraujoch", "Lake Brienz"],
                    "activities": ["Hiking", "Skiing", "Cable car rides", "Swiss chocolate tasting"],
                    "travelTips": ["Get the Swiss Travel Pass", "Tap water is drinkable and pure", "Pack multiple layers of warm clothing"]
                },
                {
                    "placeName": "Manali & Solang Valley",
                    "country": "India",
                    "description": f"A breathtaking mountain getaway popular for adventure sports, scenic valleys, and snow-capped peaks.",
                    "estimatedCost": str(350 * prefs.numberOfTravelers),
                    "bestSeason": "October to June",
                    "attractions": ["Hadimba Temple", "Solang Valley", "Rohtang Pass"],
                    "activities": ["Paragliding", "River rafting", "Solang trekking", "Local shopping"],
                    "travelTips": ["Pre-book Rohtang permits", "Pack heavy woolens for winters", "Try local apple wine"]
                },
                {
                    "placeName": "Banff National Park",
                    "country": "Canada",
                    "description": f"A nature-rich Rocky Mountain experience with turquoise lakes and dramatic mountain views, perfect for {prefs.travelType}.",
                    "estimatedCost": str(2200 * prefs.numberOfTravelers),
                    "bestSeason": "June to August",
                    "attractions": ["Lake Louise", "Moraine Lake", "Banff Gondola"],
                    "activities": ["Canoeing", "Wildlife viewing", "Hot springs soaking"],
                    "travelTips": ["Purchase a Parks Canada Pass", "Keep distance from bears/elk", "Book parking early"]
                }
            ]
        else:
            # Default rich suggestions
            place_suggestions = [
                {
                    "placeName": "Paris (City of Light)",
                    "country": "France",
                    "description": f"An iconic destination famous for art, fashion, gastronomy, and architectural landmarks. Ideal for {prefs.travelType}.",
                    "estimatedCost": str(2000 * prefs.numberOfTravelers),
                    "bestSeason": "April to June or September to November",
                    "attractions": ["Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral"],
                    "activities": ["Museum tours", "Seine River Cruise", "Pastry tasting"],
                    "travelTips": ["Book tickets online to avoid lines", "Learn a few basic French phrases", "Watch out for pickpockets"]
                },
                {
                    "placeName": "Tokyo (Shibuya & Shinjuku)",
                    "country": "Japan",
                    "description": f"A dazzling metropolis blending ultramodern skyscrapers with historic Shinto shrines. Fits your {prefs.travelType} style.",
                    "estimatedCost": str(2400 * prefs.numberOfTravelers),
                    "bestSeason": "March to May (Cherry blossom) or October to November",
                    "attractions": ["Senso-ji Temple", "Shibuya Crossing", "Tokyo Skytree"],
                    "activities": ["Sushi tasting", "Shopping in Akihabara", "Walking in Shinjuku Gyoen"],
                    "travelTips": ["Get a Suica/Pasmo card", "Carry cash", "Rent a pocket Wi-Fi"]
                },
                {
                    "placeName": "Dubai (Downtown & Marina)",
                    "country": "United Arab Emirates",
                    "description": f"A futuristic luxury oasis featuring record-breaking skyscrapers, massive shopping malls, and desert safari experiences.",
                    "estimatedCost": str(1800 * prefs.numberOfTravelers),
                    "bestSeason": "November to March",
                    "attractions": ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah"],
                    "activities": ["Desert dune bashing", "Luxury shopping", "Fountain show viewing"],
                    "travelTips": ["Respect local dress codes", "Use the metro to avoid traffic", "Stay hydrated"]
                }
            ]

        # Structure complete JSON output matching Pydantic requirements
        suggestions = []
        for p in place_suggestions:
            # Generate day-wise travel plan dynamically
            travel_plan = []
            for d in range(1, duration + 1):
                if d == 1:
                    title = "Arrival and Settling In"
                    tasks = ["Arrive at destination", "Check-in to lodging", "Unpack and rest", "Short stroll around the neighborhood"]
                elif d == duration:
                    title = "Departure & Packing"
                    tasks = ["Souvenir shopping in local markets", "Check out of lodging", "Head to airport/station", "Departure back home"]
                else:
                    # Generic task generator based on activities
                    title = f"Exploring Attractions & {prefs.travelType} Fun"
                    tasks = [
                        f"Visit {p['attractions'][(d - 2) % len(p['attractions'])]}",
                        f"Try {p['activities'][(d - 2) % len(p['activities'])]}",
                        "Lunch at a highly rated local diner",
                        "Evening walks and local photography"
                    ]
                travel_plan.append({
                    "day": d,
                    "title": title,
                    "tasks": tasks
                })

            # Generate default checklist
            checklist = [
                {"item": "Valid ID / Passport", "completed": False},
                {"item": "Hotel reservation printout", "completed": False},
                {"item": "Local currency / International card", "completed": False},
                {"item": f"Appropriate clothing for {prefs.climatePreference} climate", "completed": False},
                {"item": "Phone charger & power bank", "completed": False},
                {"item": "First aid kit & prescription medications", "completed": False}
            ]

            suggestions.append({
                "placeName": p["placeName"],
                "country": p["country"] or country,
                "description": p["description"],
                "estimatedCost": p["estimatedCost"],
                "bestSeason": p["bestSeason"],
                "attractions": p["attractions"],
                "activities": p["activities"],
                "travelTips": p["travelTips"],
                "travelPlan": travel_plan,
                "checklist": checklist
            })

        return {"suggestions": suggestions}
