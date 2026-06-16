// Backend API Configuration
// Since all Firebase Auth and Firestore CRUD operations are brokered securely via our FastAPI backend,
// this config points the frontend to the FastAPI server.

const API_BASE_URL = "https://preformed-vintage-handgrip.ngrok-free.dev";

// Export configuration globally for other script files
window.API_BASE_URL = API_BASE_URL;
