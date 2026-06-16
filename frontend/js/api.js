/**
 * API client to interact with the FastAPI backend
 */

class ApiClient {
    static getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    static async request(endpoint, options = {}) {
        const url = `${window.API_BASE_URL}${endpoint}`;
        
        // Merge headers
        options.headers = {
            ...ApiClient.getHeaders(),
            ...(options.headers || {})
        };

        try {
            const response = await fetch(url, options);
            
            // Check session timeout / invalid token
            if (response.status === 401) {
                const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html');
                if (!isAuthPage) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'login.html';
                    return;
                }
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'An unexpected error occurred.');
            }
            
            return data;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
    }

    // --- Authentication ---
    static async register(fullName, email, password) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify({ fullName, email, password })
        });
    }

    static async login(email, password) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    static async getProfile() {
        return this.request('/profile', {
            method: 'GET'
        });
    }

    // --- Dashboard ---
    static async getTrendingDestinations() {
        return this.request('/trending-destinations', {
            method: 'GET'
        });
    }

    // --- Suggestions ---
    static async generateSuggestions(preferences) {
        return this.request('/generate-suggestions', {
            method: 'POST',
            body: JSON.stringify(preferences)
        });
    }

    // --- Saved Destinations ---
    static async saveDestination(destination) {
        return this.request('/save-destination', {
            method: 'POST',
            body: JSON.stringify(destination)
        });
    }

    static async getSavedDestinations() {
        return this.request('/saved-destinations', {
            method: 'GET'
        });
    }

    static async updateChecklist(destinationId, item, completed) {
        return this.request('/update-checklist', {
            method: 'PUT',
            body: JSON.stringify({ destinationId, item, completed })
        });
    }

    static async removeDestination(destinationId) {
        return this.request(`/remove-destination?destination_id=${destinationId}`, {
            method: 'DELETE'
        });
    }
}

// Export API client globally
window.ApiClient = ApiClient;
