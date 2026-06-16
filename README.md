# RoamAI: Full-Stack AI Travel Suggestion & Planner Application

RoamAI is a complete, production-ready full-stack web application designed to help travelers plan their next adventure using the power of AI (Groq Llama 3.3 70B Versatile), Firebase Firestore for checklist synchronization, and Firebase Authentication.

---

## Project Structure

```text
Travel suggestion/
├── backend/
│   ├── main.py                     # FastAPI entry point
│   ├── config.py                   # App config (Pydantic settings)
│   ├── schemas.py                  # Pydantic schemas & validations
│   ├── services/
│   │   ├── firebase_service.py     # Auth verification and Firestore CRUD
│   │   └── groq_service.py         # AI Prompt engine & suggestions logic
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Sample environment variables
│   └── firebase-service-account.json # (Ignored/Your service key here)
└── frontend/
    ├── index.html                  # Core router page
    ├── login.html                  # Authenticated login form
    ├── register.html               # Registration page
    ├── dashboard.html              # Trending places and user summary stats
    ├── suggestions.html            # AI suggestion generator forms & results
    ├── profile.html                # Saved places and interactive checklist tracking
    ├── css/
    │   ├── style.css               # Global tokens, resets, layouts
    │   ├── auth.css                # Auth forms styling
    │   ├── dashboard.css           # Trending grid styling
    │   ├── suggestions.css         # Timeline itinerary layout
    │   └── profile.css             # Accordion & checklist grids
    └── js/
        ├── firebase-config.js      # Global API URL configuration
        ├── utils.js                # Toasts, modals, button loading helpers
        ├── api.js                  # Centralized HTTP request client
        ├── auth.js                 # Session token guard and form validations
        ├── dashboard.js            # User stats loader and quick save templates
        ├── suggestions.js          # Forms compiler and suggestions renderer
        └── profile.js              # Live progress updates and Firestore checklist syncing
```

---

## 🛠️ Step 1: Firebase & Groq Configurations

To run the application with live database persistence and genuine AI planning, you will need to prepare three keys. 

> [!TIP]
> **Developer Sandbox Mode:** If you do not have these keys configured yet, you can still start and test the application completely! The backend automatically falls back to a sandbox simulation mode with rich local suggestions, dummy tokens, and local profiles.

### 1. Firebase Service Account JSON Credentials (Firestore)
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new Firebase project and navigate to **Project Settings** > **Service accounts**.
3. Click **Generate new private key** to download a JSON file.
4. Rename this file to `firebase-service-account.json` and save it directly in the `backend/` directory.
5. In the Firebase Database menu, click **Create Database** under **Firestore Database** in **Test Mode** (or update security rules to allow read/writes).

### 2. Firebase Web API Key (Email/Password Login verification)
1. In **Project Settings** > **General**, look for the **Web API Key**.
2. If it is missing, enable **Authentication** under the Build menu, toggle **Email/Password** sign-in, and save. The Web API Key will then appear under settings.

### 3. Groq API Key (AI Suggestion Engine)
1. Navigate to the [Groq Console](https://console.groq.com/).
2. Generate an API key under **API Keys**.

---

## 🚀 Step 2: Backend Setup & Execution

1. Open PowerShell or Terminal and navigate to the `backend/` directory:
   ```powershell
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```powershell
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```powershell
   pip install -r requirements.txt
   ```

4. Set up your environment variables:
   * Copy the `.env.example` template:
     ```powershell
     cp .env.example .env
     ```
   * Open `.env` in a text editor and fill in your keys:
     ```env
     GROQ_API_KEY=gsk_your_actual_key
     FIREBASE_WEB_API_KEY=AIzaSy_your_web_key
     FIREBASE_CREDENTIALS_PATH=firebase-service-account.json
     ```

5. Start the FastAPI development server:
   ```powershell
   python main.py
   # Or using uvicorn
   uvicorn main:app --reload
   ```
   The API will be running at `http://127.0.0.1:8000`.

---

## 🌐 Step 3: Frontend Setup & Execution

Since the frontend is built entirely using vanilla HTML/CSS/JS, you can serve it using any simple static HTTP server.

1. Open a new terminal window and navigate to the `frontend/` directory:
   ```powershell
   cd frontend
   ```

2. Spin up a local static server using Python:
   ```powershell
   python -m http.server 5000
   ```

3. Open your browser and navigate to:
   ```text
   http://127.0.0.1:5000
   ```

---

## 📊 Features Walkthrough

1. **Register & Login:** Create a profile. The backend secures details in Firestore.
2. **Dashboard Overview:** View your customized profile stats card and click **Save Place** on trending places (Bali, Switzerland, etc.) to immediately populate your profile check-ins.
3. **AI Planning:** Enter preferences (budget, climate, country, number of days). Click **Generate suggestions** to request `llama-3.3-70b-versatile` to formulate tailored itineraries and checklist lists.
4. **Interactive Modals:** Open day-by-day vertical timelines and packing guides in modal views on cards.
5. **Dynamic Checklist Management:** Toggle checklist cards on/off under "My Trips" profile view. Completion bars and percentage badges animate locally with instant database synchronization.
