/**
 * Suggestions page logic
 */

let currentSuggestions = []; // Stores the current set of suggestions from the backend

document.addEventListener('DOMContentLoaded', () => {
    // Only run if we are on suggestions.html
    const form = document.getElementById('preferencesForm');
    if (form) {
        // Check for country prefill from dashboard
        const prefillCountry = localStorage.getItem('prefillCountry');
        if (prefillCountry) {
            document.getElementById('preferredCountry').value = prefillCountry;
            localStorage.removeItem('prefillCountry'); // Clear after use
        }

        form.addEventListener('submit', handlePreferencesSubmit);
    }
});

// Gather input and request suggestions
async function handlePreferencesSubmit(e) {
    e.preventDefault();

    const budget = document.getElementById('budget').value.trim();
    const preferredCountry = document.getElementById('preferredCountry').value.trim();
    const climatePreference = document.getElementById('climatePreference').value;
    const travelType = document.getElementById('travelType').value;
    const tripDuration = parseInt(document.getElementById('tripDuration').value, 10);
    const numberOfTravelers = parseInt(document.getElementById('numberOfTravelers').value, 10);
    const accommodationPreference = document.getElementById('accommodationPreference').value;
    
    // Validate duration and travelers
    if (isNaN(tripDuration) || tripDuration < 1 || tripDuration > 30) {
        showToast('Validation Error', 'Duration must be between 1 and 30 days.', 'error');
        return;
    }
    if (isNaN(numberOfTravelers) || numberOfTravelers < 1) {
        showToast('Validation Error', 'Number of travelers must be at least 1.', 'error');
        return;
    }

    // Collect checked activities
    const activityCheckboxes = document.querySelectorAll('input[name="activities"]:checked');
    const preferredActivities = Array.from(activityCheckboxes).map(cb => cb.value);

    if (preferredActivities.length === 0) {
        showToast('Validation Error', 'Please select at least one activity.', 'error');
        return;
    }

    const payload = {
        budget,
        preferredCountry,
        climatePreference,
        travelType,
        tripDuration,
        numberOfTravelers,
        accommodationPreference,
        preferredActivities
    };

    toggleLoadingState(true);

    try {
        const result = await ApiClient.generateSuggestions(payload);
        currentSuggestions = result.suggestions;
        renderSuggestions(currentSuggestions);
        showToast('Suggestions Generated', 'AI has successfully custom planned 3 destinations!', 'success');
    } catch (error) {
        console.error("Error generating travel suggestions", error);
        showToast('Error', error.message || 'Failed to generate suggestions. Please try again.', 'error');
    } finally {
        toggleLoadingState(false);
    }
}

// Control the loading overlays
function toggleLoadingState(isLoading) {
    const loader = document.getElementById('loadingPanel');
    const formCard = document.getElementById('preferenceFormCard');
    const results = document.getElementById('resultsSection');

    if (isLoading) {
        loader.style.display = 'flex';
        formCard.style.display = 'none';
        results.style.display = 'none';
        
        // Auto scroll to top of viewport
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        loader.style.display = 'none';
        formCard.style.display = 'block';
    }
}

// Render the AI recommendations list
function renderSuggestions(suggestions) {
    const resultsSection = document.getElementById('resultsSection');
    const grid = document.getElementById('suggestionsGrid');
    
    if (!resultsSection || !grid) return;
    
    grid.innerHTML = '';
    resultsSection.style.display = 'block';

    if (!suggestions || suggestions.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No suggestions found matching your preferences. Try adjusting filters.</p>`;
        return;
    }

    suggestions.forEach((dest, index) => {
        const card = document.createElement('div');
        card.className = 'suggestion-card';
        card.innerHTML = `
            <div class="suggestion-badge">AI Recommendation #${index + 1}</div>
            <h3 class="suggestion-title">${dest.placeName}</h3>
            <div class="suggestion-country">📍 ${dest.country}</div>
            <p class="suggestion-desc">${dest.description}</p>
            
            <ul class="suggestion-details">
                <li>
                    <span class="detail-label">Best Season:</span>
                    <span class="detail-value">${dest.bestSeason}</span>
                </li>
                <li>
                    <span class="detail-label">Est. Budget:</span>
                    <span class="detail-value">$${dest.estimatedCost}</span>
                </li>
                <li>
                    <span class="detail-label">Attractions:</span>
                    <span class="detail-value tag-list">
                        ${dest.attractions.map(a => `<span class="pill-tag">${a}</span>`).join('')}
                    </span>
                </li>
                <li>
                    <span class="detail-label">Activities:</span>
                    <span class="detail-value tag-list">
                        ${dest.activities.map(act => `<span class="pill-tag">${act}</span>`).join('')}
                    </span>
                </li>
            </ul>

            <div class="suggestion-actions">
                <button class="btn btn-outline" onclick="viewItinerary(${index})">🗓️ View Itinerary</button>
                <button class="btn btn-secondary" onclick="viewChecklist(${index})">📝 View Checklist</button>
                <button class="btn btn-primary" id="saveBtn-${index}" onclick="saveAISuggestion(${index})">❤️ Save to Profile</button>
            </div>
        `;
        grid.appendChild(card);
    });

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// View day-wise plan modal
function viewItinerary(index) {
    const dest = currentSuggestions[index];
    if (!dest) return;

    let planHtml = `<div class="timeline">`;
    dest.travelPlan.forEach(p => {
        planHtml += `
            <div class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-day">Day ${p.day}</div>
                    <div class="timeline-title">${p.title}</div>
                    <ul class="timeline-tasks">
                        ${p.tasks.map(t => `<li>${t}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    });
    planHtml += `</div>`;

    openModal(`Itinerary: ${dest.placeName}`, planHtml);
}

// View checklist modal
function viewChecklist(index) {
    const dest = currentSuggestions[index];
    if (!dest) return;

    let chkHtml = `<ul class="modal-checklist">`;
    dest.checklist.forEach(c => {
        chkHtml += `
            <li class="modal-checklist-item">
                <span>📋</span> ${c.item}
            </li>
        `;
    });
    chkHtml += `</ul>`;

    openModal(`Travel Checklist: ${dest.placeName}`, chkHtml);
}

// Save suggestion to Firestore
async function saveAISuggestion(index) {
    const dest = currentSuggestions[index];
    if (!dest) return;

    const btn = document.getElementById(`saveBtn-${index}`);
    setButtonLoading(btn, true, 'Saving...');

    try {
        await ApiClient.saveDestination(dest);
        showToast('Saved!', `${dest.placeName} saved to your profile successfully!`, 'success');
        btn.textContent = '❤️ Saved to Profile';
        btn.disabled = true;
        btn.style.opacity = '0.7';
    } catch (error) {
        showToast('Failed to Save', error.message, 'error');
        setButtonLoading(btn, false, '❤️ Save to Profile');
    }
}

// Export functions for global HTML access
window.viewItinerary = viewItinerary;
window.viewChecklist = viewChecklist;
window.saveAISuggestion = saveAISuggestion;
