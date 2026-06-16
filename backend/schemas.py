from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any
from datetime import datetime

# --- Authentication Schemas ---

class UserRegister(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    uid: str
    fullName: str
    email: str

class UserResponse(BaseModel):
    uid: str
    fullName: str
    email: str
    createdAt: datetime

class UserProfileResponse(BaseModel):
    uid: str
    fullName: str
    email: str
    createdAt: datetime
    savedCount: int
    completedChecklistCount: int

# --- Trending Destinations ---

class TrendingDestination(BaseModel):
    id: str
    placeName: str
    country: str
    description: str
    rating: float
    estimatedCost: str
    bestSeason: str
    imageUrl: str

# --- AI Suggestion & Itinerary Schemas ---

class ItineraryDay(BaseModel):
    day: int
    title: str
    tasks: List[str]

class ChecklistItem(BaseModel):
    item: str
    completed: bool = False

class TravelSuggestion(BaseModel):
    placeName: str
    country: str
    description: str
    estimatedCost: str
    bestSeason: str
    attractions: List[str]
    activities: List[str]
    travelTips: List[str]
    travelPlan: List[ItineraryDay]
    checklist: List[ChecklistItem]

class TravelSuggestionsResponse(BaseModel):
    suggestions: List[TravelSuggestion]

class TravelPreferences(BaseModel):
    budget: str
    preferredCountry: str
    climatePreference: str
    travelType: str  # Adventure, Luxury, Family, Solo, Honeymoon, Business
    tripDuration: int = Field(..., ge=1, le=30)
    numberOfTravelers: int = Field(..., ge=1)
    accommodationPreference: str  # Budget, Standard, Luxury
    preferredActivities: List[str]

# --- Saved Places & Updates ---

class UpdateChecklistRequest(BaseModel):
    destinationId: str
    item: str
    completed: bool
