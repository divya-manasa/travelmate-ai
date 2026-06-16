import logging
from fastapi import FastAPI, Depends, Security, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any
try:
    from backend.config import settings
    from backend.schemas import (
        UserRegister, UserLogin, LoginResponse, UserResponse, UserProfileResponse,
        TrendingDestination, TravelPreferences, TravelSuggestionsResponse,
        TravelSuggestion, UpdateChecklistRequest
    )
    from backend.services.firebase_service import FirebaseService
    from backend.services.groq_service import GroqService
except ModuleNotFoundError:
    from config import settings
    from schemas import (
        UserRegister, UserLogin, LoginResponse, UserResponse, UserProfileResponse,
        TrendingDestination, TravelPreferences, TravelSuggestionsResponse,
        TravelSuggestion, UpdateChecklistRequest
    )
    from services.firebase_service import FirebaseService
    from services.groq_service import GroqService

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

app = FastAPI(
    title="AI Travel Planner API",
    description="Backend services for personalized travel recommendations and itinerary management.",
    version="1.0.0"
)

# Enable CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development, allow any origin. In production, restrict to your frontend domain.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """FastAPI dependency to secure routes and extract user identity from the Authorization Bearer header."""
    token = credentials.credentials
    user_claims = FirebaseService.verify_token(token)
    return user_claims

@app.get("/", tags=["System"])
def root():
    return {
        "status": "online",
        "message": "AI Travel Planner API is running.",
        "firebase_initialized": FirebaseService.is_initialized()
    }

# --- Authentication and User Profile ---

@app.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, tags=["Auth"])
async def register(payload: UserRegister):
    logger.info(f"Registering new user: {payload.email}")
    return await FirebaseService.create_user(
        email=payload.email,
        password=payload.password,
        full_name=payload.fullName
    )

@app.post("/login", response_model=LoginResponse, tags=["Auth"])
async def login(payload: UserLogin):
    logger.info(f"Attempting login for: {payload.email}")
    return await FirebaseService.login_user(
        email=payload.email,
        password=payload.password
    )

@app.get("/profile", response_model=UserProfileResponse, tags=["User"])
async def get_profile(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    email = current_user.get("email", "")
    name = current_user.get("name", "Traveler")
    logger.info(f"Fetching profile stats for user: {uid}")
    return await FirebaseService.get_user_profile_stats(uid=uid, email=email, name=name)

# --- Dashboard ---

@app.get("/trending-destinations", response_model=List[TrendingDestination], tags=["Dashboard"])
def get_trending_destinations():
    logger.info("Fetching trending destinations list")
    # Return 8 predefined stunning destinations with custom visual configurations
    return [
        TrendingDestination(
            id="bali",
            placeName="Bali",
            country="Indonesia",
            description="Exotic beaches, majestic volcanic mountains, and a rich, spiritual culture.",
            rating=4.8,
            estimatedCost="$1,200",
            bestSeason="April to October",
            imageUrl="https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=600"
        ),
        TrendingDestination(
            id="paris",
            placeName="Paris",
            country="France",
            description="The global center of art, fashion, gastronomy, and architectural landmarks.",
            rating=4.7,
            estimatedCost="$2,000",
            bestSeason="April to June",
            imageUrl="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600"
        ),
        TrendingDestination(
            id="switzerland",
            placeName="Switzerland",
            country="Switzerland",
            description="Splendid alpine peak lakes, beautiful towns, and world-class ski trails.",
            rating=4.9,
            estimatedCost="$3,500",
            bestSeason="June to September",
            imageUrl="https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=600"
        ),
        TrendingDestination(
            id="dubai",
            placeName="Dubai",
            country="UAE",
            description="Known for luxury shopping, ultra-modern architecture, and a lively nightlife scene.",
            rating=4.6,
            estimatedCost="$1,800",
            bestSeason="November to March",
            imageUrl="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=600"
        ),
        TrendingDestination(
            id="tokyo",
            placeName="Tokyo",
            country="Japan",
            description="Neon skyscrapers alongside historic shrines in a city combining history and tech.",
            rating=4.8,
            estimatedCost="$2,400",
            bestSeason="October to November",
            imageUrl="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=600"
        ),
        TrendingDestination(
            id="goa",
            placeName="Goa",
            country="India",
            description="Sandy beaches, rich Portuguese colonial history, and exciting water sports.",
            rating=4.5,
            estimatedCost="$400",
            bestSeason="November to February",
            imageUrl="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=600"
        ),
        TrendingDestination(
            id="manali",
            placeName="Manali",
            country="India",
            description="Breathtaking mountain views and valley adventures in the heart of Himachal Pradesh.",
            rating=4.6,
            estimatedCost="$350",
            bestSeason="October to June",
            imageUrl="https://images.unsplash.com/photo-1605649487212-47bdab064df7?q=80&w=600"
        ),
        TrendingDestination(
            id="maldives",
            placeName="Maldives",
            country="Maldives",
            description="Lush tropical islands, crystal clear water, and luxurious private water villas.",
            rating=4.9,
            estimatedCost="$2,500",
            bestSeason="November to April",
            imageUrl="https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=600"
        )
    ]

# --- Suggestions ---

@app.post("/generate-suggestions", response_model=TravelSuggestionsResponse, tags=["Suggestions"])
def generate_suggestions(prefs: TravelPreferences, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    logger.info(f"User {uid} requesting AI travel suggestions for country {prefs.preferredCountry}")
    
    # Process through Groq Service
    return GroqService.generate_suggestions(prefs)

# --- Saved Places Management ---

@app.post("/save-destination", status_code=status.HTTP_201_CREATED, tags=["Saved Places"])
async def save_destination(payload: TravelSuggestion, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    logger.info(f"User {uid} saving destination: {payload.placeName}")
    dest_id = await FirebaseService.save_destination(uid=uid, dest=payload)
    return {"status": "success", "message": "Destination saved successfully", "id": dest_id}

@app.get("/saved-destinations", response_model=List[Dict[str, Any]], tags=["Saved Places"])
async def get_saved_destinations(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    logger.info(f"User {uid} fetching saved destinations")
    return await FirebaseService.get_saved_destinations(uid=uid)

@app.put("/update-checklist", tags=["Saved Places"])
async def update_checklist(payload: UpdateChecklistRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    logger.info(f"User {uid} updating checklist item for {payload.destinationId}: {payload.item} -> {payload.completed}")
    await FirebaseService.update_checklist_item(
        uid=uid,
        destination_id=payload.destinationId,
        item_text=payload.item,
        completed=payload.completed
    )
    return {"status": "success", "message": "Checklist updated successfully"}

@app.delete("/remove-destination", tags=["Saved Places"])
async def remove_destination(destination_id: str, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    logger.info(f"User {uid} removing destination: {destination_id}")
    await FirebaseService.remove_destination(uid=uid, destination_id=destination_id)
    return {"status": "success", "message": "Destination removed successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
