/**
 * Dashboard page logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only run if we are on dashboard.html
    if (document.getElementById('dashboardContainer')) {
        loadUserProfileSummary();
        loadTrendingPlaces();
    }
});

// Fetch and load user summary details
async function loadUserProfileSummary() {
    const summaryCard = document.getElementById('userSummaryCard');
    if (!summaryCard) return;

    try {
        const profile = await ApiClient.getProfile();
        
        const joinDate = formatDate(profile.createdAt);
        
        summaryCard.innerHTML = `
            <div class="user-info">
                <h2>Welcome, ${profile.fullName}!</h2>
                <p>📧 ${profile.email}</p>
                <div class="user-meta-info">Member since: ${joinDate}</div>
            </div>
            <div class="user-stats">
                <div class="stat-item" onclick="window.location.href='profile.html'" style="cursor: pointer;">
                    <div class="stat-value">${profile.savedCount}</div>
                    <div class="stat-label">Saved Destinations</div>
                </div>
                <div class="stat-item" onclick="window.location.href='profile.html'" style="cursor: pointer;">
                    <div class="stat-value">${profile.completedChecklistCount}</div>
                    <div class="stat-label">Completed Tasks</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error loading user profile statistics", error);
        showToast('Error', 'Failed to load user profile details.', 'error');
    }
}

// Fetch and load trending destinations
async function loadTrendingPlaces() {
    const grid = document.getElementById('trendingGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px 0;">
            <span class="loader" style="border-top-color: var(--primary); width: 30px; height: 30px;"></span>
            <p style="margin-top: 10px; color: var(--text-secondary);">Loading trending places...</p>
        </div>
    `;

    try {
        const places = await ApiClient.getTrendingDestinations();
        grid.innerHTML = '';

        places.forEach(place => {
            const card = document.createElement('div');
            card.className = 'dest-card';
            card.innerHTML = `
                <div class="dest-img-wrapper">
                    <img src="${place.imageUrl}" alt="${place.placeName}" class="dest-img" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600'">
                    <div class="dest-rating"><span>★</span> ${place.rating}</div>
                </div>
                <div class="dest-content">
                    <h3 class="dest-title">${place.placeName}</h3>
                    <div class="dest-location">📍 ${place.country}</div>
                    <p class="dest-desc">${place.description}</p>
                    <div class="dest-meta">
                        <span class="dest-budget">Budget: ${place.estimatedCost}</span>
                        <span class="dest-season">${place.bestSeason}</span>
                    </div>
                    <div class="dest-actions">
                        <button class="btn btn-primary" onclick="quickSaveDestination('${place.id}', '${place.placeName}', '${place.country}', '${place.estimatedCost}')">Save Place</button>
                        <button class="btn btn-secondary" onclick="navigateToSuggestions('${place.country}')">Plan Trip</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading trending places", error);
        grid.innerHTML = `<p style="grid-column: 1/-1; color: var(--danger); text-align: center;">Failed to load trending places.</p>`;
    }
}

// Redirect to suggestions page prefilled with the country
function navigateToSuggestions(country) {
    localStorage.setItem('prefillCountry', country);
    window.location.href = 'suggestions.html';
}

// Predefined travel suggestion templates for quick save from dashboard
const TRENDING_TEMPLATES = {
    bali: {
        placeName: "Bali (Ubud & Seminyak)",
        country: "Indonesia",
        description: "Exotic beaches, majestic volcanic mountains, and a rich, spiritual culture.",
        estimatedCost: "1200",
        bestSeason: "April to October",
        attractions: ["Uluwatu Temple", "Tegalalang Rice Terraces", "Sacred Monkey Forest Sanctuary"],
        activities: ["Cultural Temple Tour", "Surfing at Padang Padang", "Rice Terrace Trekking"],
        travelTips: ["Rent a scooter for easy travel", "Always dress modestly when visiting temples", "Drink bottled water only"],
        travelPlan: [
            { day: 1, title: "Arrival & Seminyak Beach Sunset", tasks: ["Arrive at airport and transfer to hotel", "Relax and walk around Seminyak beach", "Enjoy a sunset dinner at beach club"] },
            { day: 2, title: "Cultural Heart of Ubud", tasks: ["Visit the Sacred Monkey Forest Sanctuary", "Stroll through the Tegalalang Rice Terraces", "Explore the Ubud Palace and traditional market"] },
            { day: 3, title: "Ocean Temple & Departure", tasks: ["Visit the iconic Uluwatu Temple", "Enjoy a traditional Kecak fire dance performance", "Purchase local souvenirs and head to airport"] }
        ],
        checklist: [
            { item: "Valid Passport (at least 6 months)", completed: false },
            { item: "Indonesian Rupiah cash", completed: false },
            { item: "Temple sash / appropriate clothing", completed: false },
            { item: "Mosquito repellent", completed: false }
        ]
    },
    paris: {
        placeName: "Paris (City of Light)",
        country: "France",
        description: "The global center of art, fashion, gastronomy, and architectural landmarks.",
        estimatedCost: "2000",
        bestSeason: "April to June",
        attractions: ["Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral"],
        activities: ["Seine River Evening Cruise", "Croissant baking class", "Louvre Museum tour"],
        travelTips: ["Pre-book all museum tickets online", "Learn simple greetings like 'Bonjour'", "Keep a close eye on your belongings in crowded areas"],
        travelPlan: [
            { day: 1, title: "Arrival & Eiffel Tower Views", tasks: ["Check-in to hotel in central Paris", "Walk through Champ de Mars to the Eiffel Tower", "Enjoy coffee at a traditional Parisian cafe"] },
            { day: 2, title: "Art and River Cruise", tasks: ["Take a guided tour of the Louvre Museum", "Walk down the Champs-Élysées to the Arc de Triomphe", "Take a sunset boat cruise along the Seine River"] },
            { day: 3, title: "Montmartre Walks & Departure", tasks: ["Explore the cobblestone streets of Montmartre", "Visit the Sacré-Cœur Basilica", "Head to the airport for departure"] }
        ],
        checklist: [
            { item: "Schengen Visa / Passport", completed: false },
            { item: "Louvre skip-the-line ticket", completed: false },
            { item: "Comfortable walking shoes", completed: false },
            { item: "Universal plug adapter", completed: false }
        ]
    },
    switzerland: {
        placeName: "Interlaken Alpine Escape",
        country: "Switzerland",
        description: "Splendid alpine peak lakes, beautiful towns, and world-class ski trails.",
        estimatedCost: "3500",
        bestSeason: "June to September",
        attractions: ["Jungfraujoch (Top of Europe)", "Lake Brienz", "Harder Kulm Viewpoint"],
        activities: ["Alpine Train Journey", "Lake cruise on Brienz", "Hiking in Lauterbrunnen Valley"],
        travelTips: ["Purchase the Swiss Travel Pass for transport savings", "Tap water is completely clean and drinkable", "Always check the alpine weather forecast"],
        travelPlan: [
            { day: 1, title: "Arrival in Interlaken", tasks: ["Arrive by train and check-in to accommodation", "Take the funicular up to Harder Kulm viewpoint", "Enjoy traditional Swiss fondue dinner"] },
            { day: 2, title: "Jungfraujoch Excursion", tasks: ["Board the cogwheel train to Jungfraujoch", "Explore the Ice Palace and Sphinx Observatory", "Take pictures in the snow plateau"] },
            { day: 3, title: "Lauterbrunnen Waterfalls", tasks: ["Take a day trip to Lauterbrunnen Valley", "See Staubbach Falls and Trümmelbach Falls", "Check out and depart"] }
        ],
        checklist: [
            { item: "Swiss Travel Pass", completed: false },
            { item: "Heavy jacket & sunglasses", completed: false },
            { item: "Hiking boots", completed: false },
            { item: "Reusable water bottle", completed: false }
        ]
    },
    dubai: {
        placeName: "Dubai Modern Oasis",
        country: "UAE",
        description: "Known for luxury shopping, ultra-modern architecture, and a lively nightlife scene.",
        estimatedCost: "1800",
        bestSeason: "November to March",
        attractions: ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah"],
        activities: ["Desert Dune Bashing", "Burj Khalifa Observation Deck tour", "Fountain light show"],
        travelTips: ["Dress respectfully in public malls", "Metro is cheaper and faster than taxis during rush hour", "Stay hydrated at all times"],
        travelPlan: [
            { day: 1, title: "Arrival & Downtown Exploration", tasks: ["Transfer to hotel in Downtown Dubai", "Visit Dubai Mall and see the giant aquarium", "Watch the Dubai Fountain show from a waterfront table"] },
            { day: 2, title: "Burj Khalifa & Desert Safari", tasks: ["Go up the Burj Khalifa observation deck", "Join a 4x4 desert safari tour in the afternoon", "Enjoy dune bashing, camel riding, and BBQ dinner"] },
            { day: 3, title: "Palm Jumeirah & Departure", tasks: ["Visit Palm Jumeirah and the Atlantis boardwalk", "Do some last-minute shopping in the souks", "Transfer to Dubai International Airport"] }
        ],
        checklist: [
            { item: "Valid tourist visa / Passport", completed: false },
            { item: "Lightweight cotton clothes", completed: false },
            { item: "Burj Khalifa entry voucher", completed: false },
            { item: "Sunscreen and sunglasses", completed: false }
        ]
    },
    tokyo: {
        placeName: "Tokyo Lights & Shrines",
        country: "Japan",
        description: "Neon skyscrapers alongside historic shrines in a city combining history and tech.",
        estimatedCost: "2400",
        bestSeason: "October to November",
        attractions: ["Senso-ji Temple", "Shibuya Crossing", "Meiji Jingu Shrine"],
        activities: ["Sushi tasting", "Shopping in Akihabara tech town", "Walking in Shinjuku Gyoen"],
        travelTips: ["Get a Suica/Pasmo card for easy train transit", "Keep garbage in your bag; public bins are rare", "Always carry cash; some small restaurants don't take card"],
        travelPlan: [
            { day: 1, title: "Arrival & Shibuya Crossing", tasks: ["Arrive at Narita/Haneda airport and take train", "Check-in to Shibuya hotel", "Walk the famous Shibuya Crossing and find dinner"] },
            { day: 2, title: "Asakusa Shrines & Akihabara Neon", tasks: ["Visit Tokyo's oldest temple, Senso-ji in Asakusa", "Browse the anime and tech stores of Akihabara", "Enjoy hot ramen in a local alleyway restaurant"] },
            { day: 3, title: "Meiji Shrine & Departure", tasks: ["Walk through the quiet forest paths of Meiji Shrine", "Explore fashion in Harajuku", "Check-out and transfer to airport"] }
        ],
        checklist: [
            { item: "Suica or Pasmo digital card", completed: false },
            { item: "Japan entry QR codes (Visit Japan Web)", completed: false },
            { item: "Cash (Yen)", completed: false },
            { item: "Pocket Wi-Fi rental coupon", completed: false }
        ]
    },
    goa: {
        placeName: "Goa Sunny Beaches",
        country: "India",
        description: "Sandy beaches, rich Portuguese colonial history, and exciting water sports.",
        estimatedCost: "400",
        bestSeason: "November to February",
        attractions: ["Palolem Beach", "Basilica of Bom Jesus", "Fort Aguada"],
        activities: ["Water sports at Baga", "Historical church walking tour", "Beach shack seafood dining"],
        travelTips: ["Rent a two-wheeler for local sightseeing", "Try local seafood specialties like Fish Recheado", "Pre-negotiate taxi rates"],
        travelPlan: [
            { day: 1, title: "Arrival & North Goa Beaches", tasks: ["Check-in to beachside resort in North Goa", "Relax on Calangute Beach", "Enjoy dinner with live music at a beach shack"] },
            { day: 2, title: "Colonial History & Forts", tasks: ["Visit the historic Fort Aguada", "Take a walking tour of the Old Goa Churches", "Explore the colorful Latin Quarter, Fontainhas"] },
            { day: 3, title: "South Goa Scenic Views & Departure", tasks: ["Drive down to the serene Palolem Beach in South Goa", "Dolphin spotting boat cruise", "Head to airport/railway station"] }
        ],
        checklist: [
            { item: "Sunscreen lotion", completed: false },
            { item: "Driving license (for two-wheeler)", completed: false },
            { item: "Swimwear and flip flops", completed: false },
            { item: "Cash for local shacks", completed: false }
        ]
    },
    manali: {
        placeName: "Manali Valley Getaway",
        country: "India",
        description: "Breathtaking mountain views and valley adventures in the heart of Himachal Pradesh.",
        estimatedCost: "350",
        bestSeason: "October to June",
        attractions: ["Hadimba Temple", "Solang Valley", "Rohtang Pass"],
        activities: ["Paragliding in Solang", "River Rafting in Beas", "Trekking to Jogini Falls"],
        travelTips: ["Pre-book Rohtang permits to avoid missing out", "Carry warm layers even in summer evenings", "Try local siddu with ghee"],
        travelPlan: [
            { day: 1, title: "Arrival & Mall Road Strolls", tasks: ["Check-in to mountain lodge in Manali", "Visit the unique wooden Hadimba Temple", "Walk around Mall Road and sample local snacks"] },
            { day: 2, title: "Solang Valley Adventures", tasks: ["Travel to Solang Valley for paragliding and zorbing", "Hike up to the scenic Jogini Waterfalls", "Enjoy riverside tea next to the Beas River"] },
            { day: 3, title: "Rohtang Pass & Departure", tasks: ["Take an early excursion to Rohtang Pass for snow", "Enjoy local mountain views", "Board overnight bus or transfer to airport"] }
        ],
        checklist: [
            { item: "Rohtang Pass permit printout", completed: false },
            { item: "Thermal innerwear & jackets", completed: false },
            { item: "Motion sickness pills (for mountain curves)", completed: false },
            { item: "Warm gloves and caps", completed: false }
        ]
    },
    maldives: {
        placeName: "Maldives Coral Sanctuary",
        country: "Maldives",
        description: "Lush tropical islands, crystal clear water, and luxurious private water villas.",
        estimatedCost: "2500",
        bestSeason: "November to April",
        attractions: ["Bikini Beach Maafushi", "Banana Reef", "Male City Fish Market"],
        activities: ["Snorkeling with manta rays", "Sandbank sunset picnic", "Night reef fishing"],
        travelTips: ["Pack lightweight summer wear", "Respect conservative dress codes in local inhabitant islands", "Buy a local SIM card at the airport"],
        travelPlan: [
            { day: 1, title: "Arrival & Speedboat Transfer", tasks: ["Arrive at Male airport and take speedboat", "Check-in to resort / island guest house", "Watch the marine life from the deck"] },
            { day: 2, title: "Snorkeling & Manta Rays", tasks: ["Take a guided boat tour to Banana Reef", "Swim alongside sea turtles and manta rays", "Enjoy a private sunset BBQ dinner on the beach"] },
            { day: 3, title: "Sandbank Picnic & Departure", tasks: ["Visit a sandbank lagoon for swimming", "Walk around Male local fish markets", "Take airport transfer"] }
        ],
        checklist: [
            { item: "Maldives IMUGA health declaration", completed: false },
            { item: "Sunscreen (coral-safe)", completed: false },
            { item: "Snorkeling mask", completed: false },
            { item: "Light summer cotton clothing", completed: false }
        ]
    }
};

// Handle saving a trending place directly
async function quickSaveDestination(id, placeName, country, cost) {
    const template = TRENDING_TEMPLATES[id];
    if (!template) {
        showToast('Error', 'Quick save template not found.', 'error');
        return;
    }

    try {
        await ApiClient.saveDestination(template);
        showToast('Saved!', `${placeName} has been saved to your profile.`, 'success');
        // Update the dashboard summary card stat immediately
        loadUserProfileSummary();
    } catch (error) {
        showToast('Saving Failed', error.message, 'error');
    }
}

// Export functions for global HTML access
window.quickSaveDestination = quickSaveDestination;
window.navigateToSuggestions = navigateToSuggestions;
