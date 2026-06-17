import os
import httpx
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, auth, firestore
from fastapi import HTTPException, status
try:
    from backend.config import settings
    from backend.schemas import TravelSuggestion
except ModuleNotFoundError:
    from config import settings
    from schemas import TravelSuggestion

# Initialize Firebase Admin
db = None
firebase_initialized = False

# Local in-memory mock database fallbacks
MOCK_USERS = {}
MOCK_SAVED_DESTINATIONS = {}

try:
    cred_path = settings.firebase_credentials_path
    abs_cred_path = os.path.abspath(cred_path)
    cwd = os.getcwd()
    
    print(f"[Firebase Debug] Current Working Directory (CWD): {cwd}")
    print(f"[Firebase Debug] Configured credentials path: {cred_path}")
    print(f"[Firebase Debug] Absolute credentials path: {abs_cred_path}")
    print(f"[Firebase Debug] File exists: {os.path.exists(cred_path)}")

    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        firebase_initialized = True
        print("Firebase Admin SDK initialized successfully.")
    else:
        # Fallback to absolute path search as safety check
        alt_path = os.path.join(cwd, "backend", cred_path) if "backend" not in cwd else os.path.join(cwd, cred_path)
        if os.path.exists(alt_path):
            print(f"[Firebase Debug] Found credentials at alternative path: {alt_path}")
            cred = credentials.Certificate(alt_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            firebase_initialized = True
            print("Firebase Admin SDK initialized successfully via alternative path.")
        else:
            print(f"WARNING: Firebase credentials file not found at {cred_path} (searched absolute: {abs_cred_path} and alternative: {alt_path}).")
            print("Backend will start in mock/limited mode. Please provide the service account key to enable Firebase features.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    print("Backend will start in mock/limited mode.")

class FirebaseService:
    @staticmethod
    def is_initialized() -> bool:
        return firebase_initialized and db is not None

    @staticmethod
    def verify_token(token: str) -> dict:
        """Verifies the Firebase ID token and returns the decoded token claims."""
        if not FirebaseService.is_initialized():
            # Dev Fallback / Mock Token checks
            if token.startswith("mock-token-"):
                uid = token.replace("mock-token-", "")
                user_data = MOCK_USERS.get(uid, {"fullName": "Mock User", "email": f"{uid}@example.com"})
                return {"uid": uid, "email": user_data.get("email"), "name": user_data.get("fullName")}
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed: session invalid. Please log in again."
            )
        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired authentication token: {str(e)}"
            )

    @staticmethod
    async def create_user(email: str, password: str, full_name: str) -> dict:
        """Registers a user in Firebase Auth and creates their profile in Firestore."""
        if not FirebaseService.is_initialized():
            # Save User details in-memory
            mock_uid = f"mock-uid-{email.split('@')[0]}"
            user_data = {
                "uid": mock_uid,
                "fullName": full_name,
                "email": email,
                "createdAt": datetime.utcnow()
            }
            MOCK_USERS[mock_uid] = user_data
            return user_data

        try:
            # Create user in Firebase Auth
            user_record = auth.create_user(
                email=email,
                password=password,
                display_name=full_name
            )
            
            # Store in Firestore
            user_data = {
                "uid": user_record.uid,
                "fullName": full_name,
                "email": email,
                "createdAt": firestore.SERVER_TIMESTAMP
            }
            db.collection("users").document(user_record.uid).set(user_data)
            
            # Retrieve for returned schema
            user_doc = db.collection("users").document(user_record.uid).get()
            doc_data = user_doc.to_dict()
            if not doc_data:
                doc_data = user_data
            
            # Adjust timestamp for Pydantic parsing
            if "createdAt" in doc_data and not isinstance(doc_data["createdAt"], datetime):
                doc_data["createdAt"] = doc_data["createdAt"].to_datetime()
            else:
                doc_data["createdAt"] = datetime.utcnow()
                
            return doc_data
        except Exception as e:
            print("FIREBASE REGISTER ERROR:", repr(e))
            import traceback
            traceback.print_exc()
            
            raise HTTPException(
                status_code=400,
                detail=f"Registration failed: {str(e)}"
            )

    @staticmethod
    async def login_user(email: str, password: str) -> dict:
        """Logs in a user using Firebase Auth REST API and returns access credentials."""
        if not FirebaseService.is_initialized():
            # Verify in-memory user
            mock_uid = f"mock-uid-{email.split('@')[0]}"
            user_data = MOCK_USERS.get(mock_uid)
            full_name = user_data["fullName"] if user_data else "Mock User"
            
            if not user_data:
                # Setup default user profile in-memory
                user_data = {
                    "uid": mock_uid,
                    "fullName": full_name,
                    "email": email,
                    "createdAt": datetime.utcnow()
                }
                MOCK_USERS[mock_uid] = user_data

            return {
                "token": f"mock-token-{mock_uid}",
                "uid": mock_uid,
                "fullName": full_name,
                "email": email
            }

        if not settings.firebase_web_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Firebase Web API Key is missing. Set FIREBASE_WEB_API_KEY in backend/.env"
            )

        # Query the Firebase Authentication REST API
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={settings.firebase_web_api_key}"
        payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                error_detail = "Invalid email or password"
                try:
                    res_json = response.json()
                    error_detail = res_json.get("error", {}).get("message", error_detail)
                except Exception:
                    pass
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Authentication failed: {error_detail}"
                )
            
            result = response.json()
            id_token = result.get("idToken")
            uid = result.get("localId")
            
            # Get user info from Firestore
            user_doc = db.collection("users").document(uid).get()
            user_data = user_doc.to_dict()
            full_name = user_data.get("fullName", result.get("displayName", "Traveler")) if user_data else result.get("displayName", "Traveler")
            
            return {
                "token": id_token,
                "uid": uid,
                "fullName": full_name,
                "email": email
            }

    @staticmethod
    async def get_user_profile_stats(uid: str, email: str, name: str) -> dict:
        """Fetches the user details and aggregates stats like saved count and completed tasks."""
        if not FirebaseService.is_initialized():
            saved_list = MOCK_SAVED_DESTINATIONS.get(uid, [])
            saved_count = len(saved_list)
            completed_count = 0
            for d in saved_list:
                completed_count += sum(1 for item in d.get("checklist", []) if item.get("completed", False))

            user_data = MOCK_USERS.get(uid, {
                "uid": uid,
                "fullName": name,
                "email": email,
                "createdAt": datetime.utcnow()
            })

            return {
                "uid": uid,
                "fullName": user_data.get("fullName", name),
                "email": user_data.get("email", email),
                "createdAt": user_data.get("createdAt", datetime.utcnow()),
                "savedCount": saved_count,
                "completedChecklistCount": completed_count
            }

        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            # Create user doc if missing
            user_data = {
                "uid": uid,
                "fullName": name,
                "email": email,
                "createdAt": firestore.SERVER_TIMESTAMP
            }
            db.collection("users").document(uid).set(user_data)
            user_doc = db.collection("users").document(uid).get()

        data = user_doc.to_dict()
        created_at = data.get("createdAt")
        if created_at and not isinstance(created_at, datetime):
            created_at = created_at.to_datetime()
        else:
            created_at = datetime.utcnow()

        # Fetch saved destinations to aggregate stats
        saved_ref = db.collection("users").document(uid).collection("savedDestinations")
        docs = saved_ref.stream()
        
        saved_count = 0
        completed_checklist_count = 0
        
        for doc in docs:
            saved_count += 1
            doc_data = doc.to_dict()
            checklist = doc_data.get("checklist", [])
            for item in checklist:
                if item.get("completed", False):
                    completed_checklist_count += 1

        return {
            "uid": uid,
            "fullName": data.get("fullName", name),
            "email": data.get("email", email),
            "createdAt": created_at,
            "savedCount": saved_count,
            "completedChecklistCount": completed_checklist_count
        }

    @staticmethod
    async def save_destination(uid: str, dest: TravelSuggestion) -> str:
        """Saves a travel suggestion to the user's savedDestinations collection."""
        # Clean place and country for unique ID keying
        clean_place = dest.placeName.strip().lower().replace(" ", "_")
        clean_country = dest.country.strip().lower().replace(" ", "_")
        destination_id = f"{clean_place}_{clean_country}"

        if not FirebaseService.is_initialized():
            if uid not in MOCK_SAVED_DESTINATIONS:
                MOCK_SAVED_DESTINATIONS[uid] = []
            
            # Check for duplicate
            for saved in MOCK_SAVED_DESTINATIONS[uid]:
                if saved.get("id") == destination_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This destination is already saved in your profile."
                    )
            
            dest_data = dest.model_dump()
            dest_data["id"] = destination_id
            dest_data["likedAt"] = datetime.utcnow()
            MOCK_SAVED_DESTINATIONS[uid].append(dest_data)
            return destination_id

        saved_ref = db.collection("users").document(uid).collection("savedDestinations").document(destination_id)
        
        # Check if already saved
        if saved_ref.get().exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This destination is already saved in your profile."
            )

        data = dest.model_dump()
        data["likedAt"] = firestore.SERVER_TIMESTAMP
        saved_ref.set(data)
        return destination_id

    @staticmethod
    async def get_saved_destinations(uid: str) -> list:
        """Retrieves all saved destinations for a user."""
        if not FirebaseService.is_initialized():
            # Return in-memory suggestions sorted by likedAt descending
            saved = MOCK_SAVED_DESTINATIONS.get(uid, [])
            return sorted(saved, key=lambda x: x.get("likedAt", datetime.utcnow()), reverse=True)

        saved_ref = db.collection("users").document(uid).collection("savedDestinations")
        # Order by likedAt descending
        docs = saved_ref.order_by("likedAt", direction=firestore.Query.DESCENDING).stream()
        
        destinations = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            # Adjust timestamp
            if "likedAt" in data and not isinstance(data["likedAt"], datetime) and data["likedAt"] is not None:
                data["likedAt"] = data["likedAt"].to_datetime()
            destinations.append(data)
            
        return destinations

    @staticmethod
    async def update_checklist_item(uid: str, destination_id: str, item_text: str, completed: bool) -> bool:
        """Updates the status of a specific checklist item for a saved destination."""
        if not FirebaseService.is_initialized():
            saved = MOCK_SAVED_DESTINATIONS.get(uid, [])
            for dest in saved:
                if dest.get("id") == destination_id:
                    checklist = dest.get("checklist", [])
                    updated = False
                    for chk in checklist:
                        if chk.get("item") == item_text:
                            chk["completed"] = completed
                            updated = True
                            break
                    if not updated:
                        checklist.append({"item": item_text, "completed": completed})
                    return True
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved destination not found."
            )

        dest_ref = db.collection("users").document(uid).collection("savedDestinations").document(destination_id)
        dest_doc = dest_ref.get()
        
        if not dest_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved destination not found."
            )

        data = dest_doc.to_dict()
        checklist = data.get("checklist", [])
        
        updated = False
        for chk in checklist:
            if chk.get("item") == item_text:
                chk["completed"] = completed
                updated = True
                break

        if not updated:
            # Add it if it wasn't present for some reason
            checklist.append({"item": item_text, "completed": completed})

        dest_ref.update({"checklist": checklist})
        return True

    @staticmethod
    async def remove_destination(uid: str, destination_id: str) -> bool:
        """Deletes a saved destination from the user's subcollection."""
        if not FirebaseService.is_initialized():
            if uid in MOCK_SAVED_DESTINATIONS:
                initial_count = len(MOCK_SAVED_DESTINATIONS[uid])
                MOCK_SAVED_DESTINATIONS[uid] = [d for d in MOCK_SAVED_DESTINATIONS[uid] if d.get("id") != destination_id]
                if len(MOCK_SAVED_DESTINATIONS[uid]) < initial_count:
                    return True
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved destination not found."
            )

        dest_ref = db.collection("users").document(uid).collection("savedDestinations").document(destination_id)
        if not dest_ref.get().exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved destination not found."
            )

        dest_ref.delete()
        return True
