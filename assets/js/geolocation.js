/**
 * MallMaze Geolocation & Distance Calculation Service
 * Mobile-first, privacy-compliant location discovery using browser Geolocation API.
 * 
 * Rules:
 * 1. Only requested upon explicit user action (e.g. "Use My Location").
 * 2. No background tracking or continuous watchPosition.
 * 3. Exact coordinates stored only in temporary client-side session state.
 * 4. Haversine distance formula with approximate human-friendly labels.
 * 5. Clean manual location selection fallback.
 */
(function () {
  if (window.MM_GEO) return;

  const STORAGE_KEY = 'mm_user_location';

  // Major Indian retail cities and shopping districts with realistic physical coordinates.
  // Extra locality names keep manual search useful even before exact area coordinates are added.
  const CITIES_DATA = {
    'Hyderabad': {
      lat: 17.3850,
      lng: 78.4867,
      state: 'Telangana',
      areas: [
        { name: 'Gachibowli', lat: 17.4401, lng: 78.3489 },
        { name: 'Madhapur', lat: 17.4483, lng: 78.3915 },
        { name: 'Hitec City', lat: 17.4435, lng: 78.3772 },
        { name: 'Banjara Hills', lat: 17.4156, lng: 78.4350 },
        { name: 'Jubilee Hills', lat: 17.4319, lng: 78.4073 },
        { name: 'Kukatpally', lat: 17.4938, lng: 78.3995 },
        { name: 'Secunderabad', lat: 17.4399, lng: 78.4983 },
        { name: 'Begumpet', lat: 17.4447, lng: 78.4664 },
        'Kondapur',
        'Miyapur',
        'Ameerpet',
        'Somajiguda',
        'Abids',
        'Koti',
        'Mehdipatnam',
        'Tolichowki',
        'Manikonda',
        'Nallagandla',
        'Uppal',
        'LB Nagar'
      ]
    },
    'Bangalore': {
      lat: 12.9716,
      lng: 77.5946,
      state: 'Karnataka',
      areas: [
        { name: 'Whitefield', lat: 12.9698, lng: 77.7500 },
        { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
        { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
        { name: 'HSR Layout', lat: 12.9121, lng: 77.6446 },
        { name: 'Jayanagar', lat: 12.9308, lng: 77.5838 },
        { name: 'MG Road', lat: 12.9756, lng: 77.6066 },
        { name: 'Electronic City', lat: 12.8452, lng: 77.6602 },
        'Marathahalli',
        'Bellandur',
        'JP Nagar',
        'Malleshwaram',
        'Rajajinagar',
        'Hebbal',
        'Yelahanka',
        'Banashankari',
        'Basavanagudi',
        'Sarjapur Road',
        'BTM Layout',
        'Kalyan Nagar',
        'Brigade Road'
      ]
    },
    'Mumbai': {
      lat: 19.0760,
      lng: 72.8777,
      state: 'Maharashtra',
      areas: [
        { name: 'Bandra West', lat: 19.0596, lng: 72.8295 },
        { name: 'Andheri West', lat: 19.1363, lng: 72.8277 },
        { name: 'Lower Parel', lat: 18.9986, lng: 72.8311 },
        { name: 'Juhu', lat: 19.1075, lng: 72.8263 },
        { name: 'Powai', lat: 19.1176, lng: 72.9060 },
        { name: 'Colaba', lat: 18.9067, lng: 72.8147 },
        { name: 'Borivali', lat: 19.2307, lng: 72.8567 },
        'Andheri East',
        'Goregaon',
        'Malad',
        'Kandivali',
        'Chembur',
        'Dadar',
        'Worli',
        'Kurla',
        'Ghatkopar',
        'Vile Parle',
        'Santacruz',
        'Thane',
        'Navi Mumbai'
      ]
    },
    'New Delhi': {
      lat: 28.6139,
      lng: 77.2090,
      state: 'Delhi',
      areas: [
        { name: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
        { name: 'Saket', lat: 28.5245, lng: 77.2066 },
        { name: 'Vasant Kunj', lat: 28.5298, lng: 77.1537 },
        { name: 'Nehru Place', lat: 28.5494, lng: 77.2528 },
        { name: 'South Extension', lat: 28.5729, lng: 77.2215 },
        { name: 'Dwarka', lat: 28.5921, lng: 77.0460 },
        'Karol Bagh',
        'Lajpat Nagar',
        'Hauz Khas',
        'Greater Kailash',
        'Rajouri Garden',
        'Rohini',
        'Janakpuri',
        'Chandni Chowk',
        'Pitampura',
        'Green Park',
        'Defence Colony',
        'Mayur Vihar',
        'Laxmi Nagar',
        'Noida Sector 18'
      ]
    },
    'Chennai': {
      lat: 13.0827,
      lng: 80.2707,
      state: 'Tamil Nadu',
      areas: [
        { name: 'Anna Nagar', lat: 13.0850, lng: 80.2101 },
        { name: 'T. Nagar', lat: 13.0418, lng: 80.2341 },
        { name: 'Adyar', lat: 13.0012, lng: 80.2565 },
        { name: 'Velachery', lat: 12.9815, lng: 80.2180 },
        { name: 'Nungambakkam', lat: 13.0569, lng: 80.2425 },
        'Tambaram',
        'Porur',
        'Guindy',
        'Mylapore',
        'OMR',
        'Sholinganallur',
        'Pallavaram',
        'Chromepet',
        'Besant Nagar',
        'Kilpauk',
        'Egmore',
        'Ashok Nagar',
        'Perungudi',
        'Kodambakkam',
        'Vadapalani'
      ]
    },
    'Pune': {
      lat: 18.5204,
      lng: 73.8567,
      state: 'Maharashtra',
      areas: [
        'Koregaon Park',
        'Viman Nagar',
        'Baner',
        'Wakad',
        'Hinjewadi',
        'Kothrud',
        'Hadapsar',
        'Aundh',
        'Shivaji Nagar',
        'Camp',
        'Magarpatta',
        'Kharadi',
        'Deccan',
        'Pimple Saudagar',
        'Bavdhan',
        'Yerawada'
      ]
    },
    'Kolkata': {
      lat: 22.5726,
      lng: 88.3639,
      state: 'West Bengal',
      areas: [
        'Park Street',
        'Salt Lake',
        'New Town',
        'Ballygunge',
        'Gariahat',
        'Esplanade',
        'Alipore',
        'Behala',
        'Dum Dum',
        'Howrah',
        'Jadavpur',
        'Tollygunge',
        'Rajarhat',
        'Lake Town',
        'Camac Street',
        'Bhowanipore'
      ]
    }
  };

  const CITY_ALIASES = {
    Delhi: 'New Delhi',
    'New Delhi': 'New Delhi',
    Bengaluru: 'Bangalore'
  };

  function areaNameOf(area) {
    return typeof area === 'string' ? area : area?.name || '';
  }

  function cleanAreaName(areaName) {
    return String(areaName || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeCityName(city) {
    const raw = String(city || '').trim();
    if (!raw) return 'Hyderabad';
    if (CITY_ALIASES[raw]) return CITY_ALIASES[raw];
    const exact = Object.keys(CITIES_DATA).find((name) => name.toLowerCase() === raw.toLowerCase());
    return exact || 'Hyderabad';
  }

  function getStoredAppCity() {
    try {
      const raw = localStorage.getItem('mm_location');
      const parsed = raw ? JSON.parse(raw) : '';
      return typeof parsed === 'string' ? parsed : '';
    } catch (e) {
      return '';
    }
  }

  function persistAppCity(city) {
    try {
      localStorage.setItem('mm_location', JSON.stringify(normalizeCityName(city)));
    } catch (e) {}
  }

  /**
   * Calculate distance between two coordinates using the Haversine formula (km)
   */
  function haversineDistance(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const nLat1 = Number(lat1);
    const nLon1 = Number(lon1);
    const nLat2 = Number(lat2);
    const nLon2 = Number(lon2);
    if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

    const R = 6371; // Earth radius in km
    const dLat = (nLat2 - nLat1) * (Math.PI / 180);
    const dLon = (nLon2 - nLon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(nLat1 * (Math.PI / 180)) *
      Math.cos(nLat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Format numeric distance into human-friendly approximate string
   */
  function formatDistance(distKm) {
    if (distKm == null || isNaN(distKm)) return 'Distance unavailable';
    if (distKm < 0.1) return 'Within 100m';
    if (distKm < 1) return Math.round(distKm * 1000) + 'm away';
    if (distKm <= 10) return distKm.toFixed(1) + ' km away';
    return Math.round(distKm) + ' km away';
  }

  /**
   * Reverse lookup nearest city from coordinates
   */
  function findClosestCity(lat, lng) {
    let closestCity = 'Hyderabad';
    let minDistance = Infinity;

    for (const [cityName, data] of Object.entries(CITIES_DATA)) {
      const dist = haversineDistance(lat, lng, data.lat, data.lng);
      if (dist !== null && dist < minDistance) {
        minDistance = dist;
        closestCity = cityName;
      }
    }
    return { city: closestCity, distKm: minDistance };
  }

  const MM_GEO = {
    CITIES_DATA: CITIES_DATA,

    /**
     * Get active temporary location from client session
     */
    getSavedLocation: function () {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    /**
     * Save temporary user location
     */
    saveLocation: function (locData) {
      try {
        const payload = JSON.stringify(locData);
        sessionStorage.setItem(STORAGE_KEY, payload);
        localStorage.setItem(STORAGE_KEY, payload);
        if (locData?.city) persistAppCity(locData.city);
        window.dispatchEvent(new CustomEvent('mm:location-changed', { detail: locData }));
      } catch (e) {}
    },

    /**
     * Clear saved location
     */
    clearLocation: function () {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('mm_location');
        window.dispatchEvent(new CustomEvent('mm:location-changed', { detail: null }));
      } catch (e) {}
    },

    /**
     * Explicit User Action: Request device location via navigator.geolocation
     */
    getCurrentPosition: function () {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          return reject(new Error('Geolocation is not supported by your browser. Please choose an area manually.'));
        }

        const options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        };

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const closest = findClosestCity(lat, lng);

            const locData = {
              type: 'device',
              latitude: lat,
              longitude: lng,
              accuracy: pos.coords.accuracy || null,
              city: closest.city,
              label: closest.city + ' (Detected)',
              updatedAt: new Date().toISOString()
            };

            MM_GEO.saveLocation(locData);
            resolve(locData);
          },
          (err) => {
            let userMsg = 'Could not detect your location. Please choose manually.';
            if (err.code === 1) {
              userMsg = 'Location permission was denied. You can choose your city or area manually.';
            } else if (err.code === 2) {
              userMsg = 'Location services are unavailable on this device. Please choose manually.';
            } else if (err.code === 3) {
              userMsg = 'Location detection timed out. Please try again or choose manually.';
            }
            reject(new Error(userMsg));
          },
          options
        );
      });
    },

    /**
     * Set location manually (City + Area)
     */
    setManualLocation: function (city, areaName) {
      const normalizedCity = normalizeCityName(city);
      const cityData = CITIES_DATA[normalizedCity] || CITIES_DATA['Hyderabad'];
      const requestedArea = cleanAreaName(areaName);
      let lat = cityData.lat;
      let lng = cityData.lng;
      let selectedArea = requestedArea;

      if (requestedArea && Array.isArray(cityData.areas)) {
        const hit = cityData.areas.find((a) => areaNameOf(a).toLowerCase() === requestedArea.toLowerCase());
        if (hit && typeof hit === 'object' && hit.lat != null) {
          selectedArea = hit.name;
          lat = hit.lat;
          lng = hit.lng;
        } else if (hit) {
          selectedArea = areaNameOf(hit);
        }
      }

      const locData = {
        type: 'manual',
        city: normalizedCity,
        area: selectedArea || '',
        state: cityData.state || 'Telangana',
        latitude: lat,
        longitude: lng,
        label: selectedArea ? (selectedArea + ', ' + normalizedCity) : normalizedCity,
        updatedAt: new Date().toISOString()
      };
      MM_GEO.saveLocation(locData);
      return locData;
    },

    /**
     * Calculate approximate distance from user location to a store
     */
    calculateStoreDistance: function (store) {
      if (!store) return null;
      const userLoc = this.getSavedLocation();
      if (!userLoc || userLoc.latitude == null || userLoc.longitude == null) return null;

      const storeLat = store.latitude != null ? store.latitude : (store.location && store.location.lat);
      const storeLng = store.longitude != null ? store.longitude : (store.location && store.location.lng);
      if (storeLat == null || storeLng == null) return null;

      return haversineDistance(userLoc.latitude, userLoc.longitude, storeLat, storeLng);
    },

    /**
     * Format store distance label
     */
    getStoreDistanceLabel: function (store) {
      const dist = this.calculateStoreDistance(store);
      return formatDistance(dist);
    },

    /**
     * Safe external Google Maps directions link
     */
    getDirectionsUrl: function (store) {
      if (!store) return '#';
      const lat = store.latitude;
      const lng = store.longitude;
      if (lat != null && lng != null) {
        return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(lat + ',' + lng);
      }
      const addr = (store.address_line || store.address || '') + ' ' + (store.area || '') + ' ' + (store.city || '');
      return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(addr.trim() || store.name || 'MallMaze Store');
    },

    /**
     * Interactive Location Selector Modal
     */
    openLocationModal: function () {
      let modal = document.getElementById('mm-location-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mm-location-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm';
        document.body.appendChild(modal);
      }

      const activeLoc = this.getSavedLocation();
      const currentCity = normalizeCityName(activeLoc?.city || getStoredAppCity() || 'Hyderabad');
      const cityData = CITIES_DATA[currentCity] || CITIES_DATA['Hyderabad'];
      const selectedArea = cleanAreaName(activeLoc?.area || '');
      const renderAreaButton = (area, isSelected) => {
        const aName = areaNameOf(area);
        return `<button type="button" class="mm-loc-area-chip rounded-lg px-2.5 py-1 text-xs font-semibold border ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}" data-area="${escapeHtml(aName)}">${escapeHtml(aName)}</button>`;
      };
      const cityOptionsMarkup = Object.keys(CITIES_DATA)
        .map((c) => `<option value="${escapeHtml(c)}" ${c === currentCity ? 'selected' : ''}>${escapeHtml(c)}</option>`)
        .join('');
      const areaButtonsMarkup = (cityData.areas || [])
        .slice(0, 24)
        .map((a) => renderAreaButton(a, selectedArea && selectedArea.toLowerCase() === areaNameOf(a).toLowerCase()))
        .join('');

      modal.innerHTML = `
        <div class="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-border">
          <div class="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <svg class="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <h3 class="text-lg font-bold">Find Stores Near You</h3>
              </div>
              <button id="mm-loc-close-btn" class="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Close">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
              </button>
            </div>
            <p class="mt-1 text-xs text-slate-300">Choose your area or use your device location to discover local stores & products nearby.</p>
          </div>

          <div class="p-5 space-y-4">
            <!-- Current Location Badge -->
            <div class="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
              <div>
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Selected Location</p>
                <p class="text-sm font-bold text-slate-900">${activeLoc ? escapeHtml(activeLoc.label) : 'No location selected (Showing all stores)'}</p>
              </div>
              ${activeLoc ? `<button id="mm-loc-clear-btn" class="text-xs font-bold text-rose-600 hover:underline">Clear</button>` : ''}
            </div>

            <!-- Device Location Button -->
            <button id="mm-loc-detect-btn" class="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 px-4 py-3 text-slate-950 font-bold transition shadow-sm">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
              <span>Use My Device Location</span>
            </button>
            <p id="mm-loc-status-msg" class="text-center text-xs text-slate-500"></p>

            <div class="relative flex items-center justify-center">
              <div class="w-full border-t border-slate-200"></div>
              <span class="absolute bg-white px-3 text-xs font-semibold text-slate-400 uppercase">Or Choose Manually</span>
            </div>

            <!-- City Selector -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1" for="mm-loc-city-select">Select City</label>
              <select id="mm-loc-city-select" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-medium focus:border-amber-500 focus:outline-none">
                ${cityOptionsMarkup}
              </select>
            </div>

            <!-- Area Search -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5" for="mm-loc-area-search">Search Retail Area / Locality</label>
              <div class="flex gap-2">
                <input id="mm-loc-area-search" type="search" value="${escapeHtml(selectedArea)}" placeholder="Search or type any area in ${escapeHtml(currentCity)}" class="min-w-0 flex-1 rounded-xl border border-slate-300 p-2.5 text-sm font-medium focus:border-amber-500 focus:outline-none" autocomplete="off" />
                <button id="mm-loc-area-use-btn" type="button" class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Use</button>
              </div>
              <p id="mm-loc-area-help" class="mt-1 text-[11px] font-medium text-slate-500">Pick a suggestion or type any locality in this city.</p>
              <div id="mm-loc-areas-container" class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                ${areaButtonsMarkup}
              </div>
            </div>
          </div>

          <div class="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-2">
            <button id="mm-loc-cancel-btn" class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-white">Close</button>
          </div>
        </div>
      `;

      modal.classList.remove('hidden');

      // Wire events
      const close = () => { modal.classList.add('hidden'); };
      const reloadAfterSave = () => {
        window.setTimeout(() => window.location.reload(), 350);
      };
      modal.querySelector('#mm-loc-close-btn')?.addEventListener('click', close);
      modal.querySelector('#mm-loc-cancel-btn')?.addEventListener('click', close);
      modal.onclick = (e) => { if (e.target === modal) close(); };

      const clearBtn = modal.querySelector('#mm-loc-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          MM_GEO.clearLocation();
          close();
          reloadAfterSave();
        });
      }

      const detectBtn = modal.querySelector('#mm-loc-detect-btn');
      const statusMsg = modal.querySelector('#mm-loc-status-msg');
      if (detectBtn) {
        detectBtn.addEventListener('click', async () => {
          detectBtn.disabled = true;
          detectBtn.classList.add('opacity-75');
          if (statusMsg) {
            statusMsg.textContent = 'Requesting location permission...';
            statusMsg.className = 'text-center text-xs text-amber-600 font-semibold';
          }
          try {
            const loc = await MM_GEO.getCurrentPosition();
            if (statusMsg) {
              statusMsg.textContent = 'Location detected: ' + loc.label;
              statusMsg.className = 'text-center text-xs text-emerald-600 font-bold';
            }
            setTimeout(() => {
              close();
              window.location.reload();
            }, 600);
          } catch (err) {
            if (statusMsg) {
              statusMsg.textContent = err.message;
              statusMsg.className = 'text-center text-xs text-rose-600 font-semibold';
            }
          } finally {
            detectBtn.disabled = false;
            detectBtn.classList.remove('opacity-75');
          }
        });
      }

      const citySelect = modal.querySelector('#mm-loc-city-select');
      const areasContainer = modal.querySelector('#mm-loc-areas-container');
      const areaSearch = modal.querySelector('#mm-loc-area-search');
      const useAreaBtn = modal.querySelector('#mm-loc-area-use-btn');
      const areaHelp = modal.querySelector('#mm-loc-area-help');
      if (citySelect && areasContainer && areaSearch) {
        const saveManualSelection = (areaName) => {
          const city = normalizeCityName(citySelect.value);
          const cleanedArea = cleanAreaName(areaName);
          const loc = MM_GEO.setManualLocation(city, cleanedArea);
          if (statusMsg) {
            statusMsg.textContent = 'Location set: ' + loc.label;
            statusMsg.className = 'text-center text-xs text-emerald-600 font-bold';
          }
          close();
          reloadAfterSave();
        };

        const renderAreaChoices = () => {
          const city = normalizeCityName(citySelect.value);
          const cData = CITIES_DATA[city] || CITIES_DATA['Hyderabad'];
          const query = cleanAreaName(areaSearch.value);
          const q = query.toLowerCase();
          const allAreas = cData.areas || [];
          const matches = q
            ? allAreas.filter((a) => areaNameOf(a).toLowerCase().includes(q))
            : allAreas.slice(0, 24);
          const exactMatch = q && allAreas.some((a) => areaNameOf(a).toLowerCase() === q);
          const buttons = matches.slice(0, 30).map((a) => {
            const isSel = selectedArea && selectedArea.toLowerCase() === areaNameOf(a).toLowerCase();
            return renderAreaButton(a, isSel);
          });

          if (query && !exactMatch) {
            buttons.unshift(renderAreaButton(query, false));
          }

          areasContainer.innerHTML = buttons.length
            ? buttons.join('')
            : '<p class="text-xs font-medium text-slate-500">Type your locality and press Use.</p>';
          areaSearch.placeholder = 'Search or type any area in ' + city;
          if (areaHelp) {
            areaHelp.textContent = query
              ? 'Showing matches. Press Use to save typed text as your locality.'
              : 'Pick a suggestion or type any locality in this city.';
          }
        };

        citySelect.addEventListener('change', () => {
          areaSearch.value = '';
          renderAreaChoices();
        });

        areaSearch.addEventListener('input', renderAreaChoices);
        areaSearch.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveManualSelection(areaSearch.value);
          }
        });

        useAreaBtn?.addEventListener('click', () => {
          saveManualSelection(areaSearch.value);
        });

        areasContainer.addEventListener('click', (e) => {
          const chip = e.target.closest('.mm-loc-area-chip');
          if (!chip) return;
          const area = chip.getAttribute('data-area');
          saveManualSelection(area);
        });

        renderAreaChoices();
      }
    }
  };

  window.MM_GEO = MM_GEO;
})();
