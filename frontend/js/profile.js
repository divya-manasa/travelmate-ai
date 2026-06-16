/**
 * Profile page logic and checklist sync
 */

let savedPlacesList = [];

document.addEventListener('DOMContentLoaded', () => {
    // Only run on profile.html
    if (document.getElementById('profileGrid')) {
        loadUserProfileSidebar();
        loadSavedPlaces();
    }
});

// Load user details into the sidebar
async function loadUserProfileSidebar() {
    const avatar = document.getElementById('profileAvatar');
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const joinDateEl = document.getElementById('profileJoinDate');
    
    try {
        const profile = await ApiClient.getProfile();
        
        // Initial letter for Avatar badge
        if (avatar && profile.fullName) {
            avatar.textContent = profile.fullName.charAt(0).toUpperCase();
        }
        
        if (nameEl) nameEl.textContent = profile.fullName;
        if (emailEl) emailEl.textContent = profile.email;
        if (joinDateEl) joinDateEl.textContent = formatDate(profile.createdAt);
        
    } catch (error) {
        console.error("Error loading profile sidebar details", error);
        showToast('Error', 'Failed to load profile parameters.', 'error');
    }
}

// Fetch and load user's liked places in accordion view
async function loadSavedPlaces() {
    const container = document.getElementById('savedPlacesContainer');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 40px 0;">
            <span class="loader" style="border-top-color: var(--primary); width: 30px; height: 30px;"></span>
            <p style="margin-top: 10px; color: var(--text-secondary);">Loading saved places...</p>
        </div>
    `;

    try {
        const rawList = await ApiClient.getSavedDestinations();
        // Normalize: ensure each item has an `id` field (Firestore may return it at top level or nested)
        savedPlacesList = (rawList || []).map(item => ({
            ...item,
            id: item.id || item.destinationId || `dest-${Math.random().toString(36).substr(2,9)}`
        }));
        container.innerHTML = '';

        if (savedPlacesList.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px 20px; background-color: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <div style="font-size: 3rem; margin-bottom: 15px;">🎒</div>
                    <h3>No Saved Destinations Yet</h3>
                    <p style="color: var(--text-secondary); margin: 10px 0 20px;">Your travel checklist progress starts here. Generate suggestions and click save!</p>
                    <a href="suggestions.html" class="btn btn-primary">Start Planning Now</a>
                </div>
            `;
            return;
        }

        savedPlacesList.forEach((place, index) => {
            const card = document.createElement('div');
            card.className = 'saved-dest-card';
            card.id = `destCard-${place.id}`;

            // Defensive defaults for potentially missing array fields
            const checklist = Array.isArray(place.checklist) ? place.checklist : [];
            const attractions = Array.isArray(place.attractions) ? place.attractions : [];
            const activities = Array.isArray(place.activities) ? place.activities : [];
            const travelPlan = Array.isArray(place.travelPlan) ? place.travelPlan : [];
            const estimatedCost = place.estimatedCost || 'N/A';

            // Calculate current checklist statistics
            const chkStats = calculateChecklistProgress(checklist);
            
            card.innerHTML = `
                <div class="saved-dest-header" id="header-${place.id}" onclick="toggleAccordion('${place.id}')">
                    <div class="saved-dest-title-group">
                        <h3 class="saved-dest-title">${place.placeName || 'Unknown Destination'}</h3>
                        <div class="saved-dest-subtitle">📍 ${place.country || ''} • Best Season: ${place.bestSeason || 'N/A'}</div>
                    </div>
                    <div class="saved-dest-meta-group">
                        <div class="progress-container">
                            <div class="progress-header">
                                <span>Checklist</span>
                                <span class="progress-pct" id="pctText-${place.id}">${chkStats.percentage}%</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" id="barFill-${place.id}" style="width: ${chkStats.percentage}%;"></div>
                            </div>
                        </div>
                        <div class="toggle-icon">▼</div>
                    </div>
                </div>
                
                <div class="saved-dest-body" id="body-${place.id}">
                    <div class="saved-dest-sections">
                        <div class="info-section">
                            <h4>Destination Details</h4>
                            <p class="dest-desc-text">${place.description || ''}</p>
                            
                            <ul class="dest-bullet-list">
                                <li>
                                    <span style="font-weight: 600; min-width: 90px; display:inline-block;">Budget Limit:</span>
                                    <span>${estimatedCost}</span>
                                </li>
                                <li>
                                    <span style="font-weight: 600; min-width: 90px; display:inline-block;">Attractions:</span>
                                    <span>${attractions.join(', ')}</span>
                                </li>
                                <li>
                                    <span style="font-weight: 600; min-width: 90px; display:inline-block;">Activities:</span>
                                    <span>${activities.join(', ')}</span>
                                </li>
                            </ul>
                            
                            ${travelPlan.length > 0 ? `
                            <h4 style="margin-top: 20px;">Itinerary Details</h4>
                            <div class="timeline" style="margin-top: 15px;">
                                ${travelPlan.map(p => `
                                    <div class="timeline-item">
                                        <div class="timeline-marker"></div>
                                        <div class="timeline-content" style="padding: 10px 14px;">
                                            <div class="timeline-day" style="font-size: 0.75rem;">Day ${p.day || ''}</div>
                                            <div class="timeline-title" style="font-size: 0.9rem; margin-bottom: 4px;">${p.title || ''}</div>
                                            <ul class="timeline-tasks" style="font-size: 0.8rem; gap: 4px;">
                                                ${(Array.isArray(p.tasks) ? p.tasks : []).map(t => `<li>${t}</li>`).join('')}
                                            </ul>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>` : ''}
                        </div>
                        
                        <div class="checklist-section">
                            <h4>Interactive Checklist</h4>
                            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px;">Toggle items to update progress instantly.</p>
                            
                            <ul class="interactive-checklist" id="chkList-${place.id}">
                                ${checklist.map((chk, chkIdx) => `
                                    <li class="checklist-row ${chk.completed ? 'completed' : ''}" 
                                        onclick="toggleChecklistItem('${place.id}', ${chkIdx}, '${(chk.item || '').replace(/'/g, "\\'")}')">
                                        <input type="checkbox" class="checklist-checkbox" 
                                            ${chk.completed ? 'checked' : ''} 
                                            onclick="event.stopPropagation()">
                                        <span class="checklist-text">${chk.item || ''}</span>
                                    </li>
                                `).join('')}
                            </ul>
                            
                            <div class="dest-controls">
                                <button class="btn btn-secondary btn-text" onclick="deleteSavedPlace('${place.id}', '${(place.placeName || '').replace(/'/g, "\\'")}')" style="color: var(--danger);">
                                    🗑️ Remove Place
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading saved places", error);
        container.innerHTML = `<p style="color: var(--danger); text-align: center;">Failed to load saved travel checklists.</p>`;
    }
}

// Manage accordion clicks
function toggleAccordion(id) {
    const header = document.getElementById(`header-${id}`);
    const body = document.getElementById(`body-${id}`);
    
    if (!header || !body) return;

    const isActive = header.classList.contains('active');
    
    // Toggle active state
    if (isActive) {
        header.classList.remove('active');
        body.classList.remove('show');
    } else {
        header.classList.add('active');
        body.classList.add('show');
    }
}

// Calculate percentages and statistics
function calculateChecklistProgress(checklist) {
    if (!checklist || checklist.length === 0) return { total: 0, completed: 0, percentage: 0 };
    const total = checklist.length;
    const completed = checklist.filter(c => c.completed).length;
    const percentage = Math.round((completed / total) * 100);
    return { total, completed, percentage };
}

// Handle checkbox click and live Firebase sync
async function toggleChecklistItem(placeId, itemIdx, itemText) {
    const place = savedPlacesList.find(p => p.id === placeId);
    if (!place) return;

    // Defensive: ensure checklist is an array before indexing
    if (!Array.isArray(place.checklist)) place.checklist = [];
    const item = place.checklist[itemIdx];
    if (!item) return;

    // Local Toggle
    const newStatus = !item.completed;
    item.completed = newStatus;

    // Instantly animate local elements for zero-latency UI response
    const rows = document.querySelectorAll(`#chkList-${placeId} .checklist-row`);
    const row = rows[itemIdx];
    if (row) {
        const checkbox = row.querySelector('.checklist-checkbox');
        if (newStatus) {
            row.classList.add('completed');
            if (checkbox) checkbox.checked = true;
        } else {
            row.classList.remove('completed');
            if (checkbox) checkbox.checked = false;
        }
    }

    // Recalculate progress bars locally
    const stats = calculateChecklistProgress(place.checklist);
    const pctText = document.getElementById(`pctText-${placeId}`);
    const barFill = document.getElementById(`barFill-${placeId}`);
    
    if (pctText) pctText.textContent = `${stats.percentage}%`;
    if (barFill) barFill.style.width = `${stats.percentage}%`;

    // Sync user summary sidebar counters
    loadUserProfileSidebar();

    // Send payload to backend
    try {
        await ApiClient.updateChecklist(placeId, itemText, newStatus);
    } catch (error) {
        console.error("Failed to sync checklist updates to Firestore", error);
        showToast('Sync Failed', 'Could not save checklist state. Reverting...', 'error');
        
        // Revert local state on failure
        item.completed = !newStatus;
        if (row) {
            const checkbox = row.querySelector('.checklist-checkbox');
            if (!newStatus) {
                row.classList.add('completed');
                if (checkbox) checkbox.checked = true;
            } else {
                row.classList.remove('completed');
                if (checkbox) checkbox.checked = false;
            }
        }
        const revertedStats = calculateChecklistProgress(place.checklist);
        if (pctText) pctText.textContent = `${revertedStats.percentage}%`;
        if (barFill) barFill.style.width = `${revertedStats.percentage}%`;
        loadUserProfileSidebar();
    }
}

// Remove place from saved list
async function deleteSavedPlace(placeId, placeName) {
    if (!confirm(`Are you sure you want to remove ${placeName} from your saved destinations?`)) {
        return;
    }

    try {
        await ApiClient.removeDestination(placeId);
        showToast('Deleted', `${placeName} has been removed.`, 'success');
        
        // Remove item from local array and list node with a quick fade animation
        savedPlacesList = savedPlacesList.filter(p => p.id !== placeId);
        const card = document.getElementById(`destCard-${placeId}`);
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            card.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                card.remove();
                if (savedPlacesList.length === 0) {
                    loadSavedPlaces(); // Re-render default empty screen
                }
            }, 300);
        }
        
        // Update user stats
        loadUserProfileSidebar();
    } catch (error) {
        showToast('Deletion Failed', error.message, 'error');
    }
}

// Export for window access
window.toggleAccordion = toggleAccordion;
window.toggleChecklistItem = toggleChecklistItem;
window.deleteSavedPlace = deleteSavedPlace;
