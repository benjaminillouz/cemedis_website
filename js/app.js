// CEMEDIS - Main Application JavaScript

// ===== API Configuration =====
const API_URL = 'https://n8n.cemedis.app/webhook/f30c3dc7-e9d6-42b4-961c-9155eadc9799';

// ===== Global State =====
let centers = [];
let filteredCenters = [];
let map = null;
let markers = [];
let mapReady = false;
let centersLoaded = false;

// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileMenu();
  initScrollAnimations();

  // Load centers if needed
  if (document.getElementById('centers-grid') || document.getElementById('map')) {
    loadCenters();
  }

  // Initialize map if present
  if (document.getElementById('map')) {
    initMap();
  }

  // Initialize search if present
  if (document.getElementById('hero-search')) {
    initSearch();
  }
});

// ===== Header Scroll Effect =====
function initHeader() {
  const header = document.querySelector('.header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll);
  handleScroll(); // Check initial state
}

// ===== Mobile Menu =====
function initMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileNav = document.querySelector('.mobile-nav');

  if (!menuBtn || !mobileNav) return;

  menuBtn.addEventListener('click', () => {
    menuBtn.classList.toggle('active');
    mobileNav.classList.toggle('active');
    document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
  });

  // Close menu when clicking a link
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuBtn.classList.remove('active');
      mobileNav.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

// ===== Scroll Animations =====
function initScrollAnimations() {
  const elements = document.querySelectorAll('.scroll-animate');

  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

// ===== Load Centers from API =====
async function loadCenters() {
  console.log('Loading centers from API...');
  try {
    showLoading();

    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Centers loaded:', data.length, 'centers');

    centers = data;
    filteredCenters = [...centers];
    centersLoaded = true;

    renderCenters();
    console.log('Centers rendered');

    // Only update map if Google Maps is ready
    if (mapReady) {
      updateMap();
    }
    updateStats();

  } catch (error) {
    console.error('Error loading centers:', error);
    console.error('Error details:', error.message);
    showError('Impossible de charger les centres. Veuillez réessayer.');
  }
}

// ===== Render Centers =====
function renderCenters(centersToRender = filteredCenters) {
  const grid = document.getElementById('centers-grid');
  if (!grid) return;

  if (centersToRender.length === 0) {
    grid.innerHTML = `
      <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <svg width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin: 0 auto 1rem; color: var(--cemedis-gray-400);">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"/>
        </svg>
        <h3 style="margin-bottom: 0.5rem;">Aucun centre trouvé</h3>
        <p style="color: var(--cemedis-gray-500);">Essayez de modifier vos critères de recherche.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = centersToRender.map(center => createCenterCard(center)).join('');
}

// ===== Create Center Card =====
function createCenterCard(center) {
  const rating = parseFloat(center['Note Google']) || 0;
  const reviewCount = center['Nombre d\'avis Google'] || 0;
  const stars = getStarsHTML(rating);
  const phone = center['Tel_app'] || '';
  const doctolib = center['Page Doctolib'] || center['Module RDV Doctolib'] || '';
  const logo = center['Logo_public_URL'] || '';
  const googleReview = center['Google Review'] || '';

  return `
    <div class="center-card scroll-animate visible">
      <div class="center-header">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
          ${logo ? `<img src="${escapeHTML(logo)}" alt="${escapeHTML(center['Nom'] || 'Centre')}" style="width: 50px; height: 50px; object-fit: contain; border-radius: var(--radius); background: white;">` : ''}
          <h3 class="center-name" style="margin: 0;">${escapeHTML(center['Nom'] || 'Centre CEMEDIS')}</h3>
        </div>
        ${rating > 0 ? `
          <div class="center-rating">
            <span class="center-stars">${stars}</span>
            <span class="center-rating-text">${rating.toFixed(1)} (${reviewCount} avis)</span>
            ${googleReview ? `<a href="${escapeHTML(googleReview)}" target="_blank" rel="noopener" style="margin-left: 0.5rem; font-size: 0.8rem; color: var(--cemedis-primary);">Voir sur Google</a>` : ''}
          </div>
        ` : ''}
      </div>
      <div class="center-body">
        <div class="center-info">
          <div class="center-info-item">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
            </svg>
            <span>${escapeHTML(center['Adresse'] || '')}</span>
          </div>
          ${phone ? `
            <div class="center-info-item">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
              </svg>
              <a href="tel:${phone.replace(/\s/g, '')}">${formatPhone(phone)}</a>
            </div>
          ` : ''}
        </div>
        <div class="center-actions">
          ${doctolib ? `
            <a href="${doctolib}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
              </svg>
              Prendre RDV
            </a>
          ` : ''}
          ${phone ? `
            <a href="tel:${phone.replace(/\s/g, '')}" class="btn btn-secondary btn-sm">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
              </svg>
              Appeler
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ===== Initialize Map (Google Maps) =====
let mapInitAttempts = 0;
const MAX_MAP_INIT_ATTEMPTS = 50; // 5 seconds max

function initMap() {
  // Prevent double initialization
  if (mapReady) {
    console.log('Map already initialized');
    return;
  }

  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.log('No map container found on this page');
    return;
  }

  // Wait for Google Maps to be available
  if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    mapInitAttempts++;
    if (mapInitAttempts < MAX_MAP_INIT_ATTEMPTS) {
      console.log('Waiting for Google Maps API... attempt', mapInitAttempts);
      setTimeout(initMap, 100);
    } else {
      console.error('Google Maps API failed to load after 5 seconds');
      mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;padding:2rem;text-align:center;">Carte indisponible<br><small>Erreur de chargement Google Maps</small></div>';
    }
    return;
  }

  console.log('Google Maps API is available, creating map...');

  try {
    // Create the map
    map = new google.maps.Map(mapContainer, {
      center: { lat: 48.8566, lng: 2.3522 },
      zoom: 11,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    mapReady = true;
    console.log('Google Maps initialized successfully');

    // If centers are already loaded, update map
    if (centersLoaded && filteredCenters.length > 0) {
      console.log('Centers already loaded, updating map markers...');
      updateMap();
    }
  } catch (error) {
    console.error('Error initializing Google Maps:', error);
    mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;padding:2rem;text-align:center;">Erreur lors du chargement de la carte<br><small>' + error.message + '</small></div>';
  }
}

// Global function for Google Maps callback (backup)
window.initGoogleMap = function() {
  console.log('Google Maps API loaded via callback');
  if (!mapReady) {
    initMap();
  }
};

// ===== Update Map Markers (Google Maps) =====
function updateMap() {
  if (!map || typeof google === 'undefined') return;

  // Clear existing markers
  markers.forEach(marker => marker.setMap(null));
  markers = [];

  const bounds = new google.maps.LatLngBounds();
  const infoWindow = new google.maps.InfoWindow();

  // Add new markers
  filteredCenters.forEach(center => {
    const lat = parseFloat(center['LAT']);
    const lng = parseFloat(center['LONG']);

    if (isNaN(lat) || isNaN(lng)) return;

    const position = { lat, lng };

    const marker = new google.maps.Marker({
      position: position,
      map: map,
      title: center['Nom'] || 'Centre CEMEDIS',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#004B63',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

    const phone = center['Tel_app'] || '';
    const doctolib = center['Page Doctolib'] || '';

    const contentString = `
      <div style="min-width: 200px; padding: 0.5rem;">
        <h4 style="margin: 0 0 0.5rem 0; color: #004B63; font-size: 1rem;">${escapeHTML(center['Nom'] || 'Centre CEMEDIS')}</h4>
        <p style="margin: 0 0 0.75rem 0; color: #666; font-size: 0.875rem;">${escapeHTML(center['Adresse'] || '')}</p>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${doctolib ? `<a href="${doctolib}" target="_blank" style="display: inline-block; padding: 0.5rem 0.75rem; background: #004B63; color: white; text-decoration: none; border-radius: 6px; font-size: 0.75rem;">Prendre RDV</a>` : ''}
          ${phone ? `<a href="tel:${phone.replace(/\s/g, '')}" style="display: inline-block; padding: 0.5rem 0.75rem; background: #f5f5f5; color: #004B63; text-decoration: none; border-radius: 6px; font-size: 0.75rem; border: 1px solid #004B63;">Appeler</a>` : ''}
        </div>
      </div>
    `;

    marker.addListener('click', () => {
      infoWindow.setContent(contentString);
      infoWindow.open(map, marker);
    });

    markers.push(marker);
    bounds.extend(position);
  });

  // Fit map to markers
  if (markers.length > 0) {
    map.fitBounds(bounds);
    // Add some padding
    const listener = google.maps.event.addListener(map, 'idle', function() {
      if (map.getZoom() > 15) map.setZoom(15);
      google.maps.event.removeListener(listener);
    });
  }
}

// ===== Search Functionality =====
function initSearch() {
  const searchInput = document.getElementById('hero-search');
  const searchBtn = document.getElementById('search-btn');

  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
        // Navigate to etablissements page if on homepage
        if (!document.getElementById('centers-grid')) {
          window.location.href = `etablissements.html?search=${encodeURIComponent(searchInput.value)}`;
        }
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      if (!document.getElementById('centers-grid') && searchInput) {
        window.location.href = `etablissements.html?search=${encodeURIComponent(searchInput.value)}`;
      } else {
        handleSearch();
      }
    });
  }

  // Check URL params for search
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('search');
  if (searchQuery && searchInput) {
    searchInput.value = searchQuery;
    handleSearch();
  }
}

function handleSearch() {
  const searchInput = document.getElementById('hero-search') || document.getElementById('search-input');
  if (!searchInput) return;

  const query = searchInput.value.toLowerCase().trim();

  if (!query) {
    filteredCenters = [...centers];
  } else {
    filteredCenters = centers.filter(center => {
      const name = (center['Nom'] || '').toLowerCase();
      const address = (center['Adresse'] || '').toLowerCase();
      const city = (center['Ville'] || '').toLowerCase();

      return name.includes(query) || address.includes(query) || city.includes(query);
    });
  }

  renderCenters();
  updateMap();
}

// ===== Update Stats =====
function updateStats() {
  const totalCenters = document.getElementById('stat-centers');
  if (totalCenters) {
    animateNumber(totalCenters, centers.length);
  }
}

// ===== Utility Functions =====
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatPhone(phone) {
  if (!phone) return '';
  // Format French phone number
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
}

function getStarsHTML(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let html = '';

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      html += '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    } else if (i === fullStars && hasHalfStar) {
      html += '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77V2z"/></svg>';
    } else {
      html += '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
  }

  return html;
}

function animateNumber(element, target, duration = 2000) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * easeOut);

    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showLoading() {
  const grid = document.getElementById('centers-grid');
  if (!grid) return;

  grid.innerHTML = Array(6).fill(`
    <div class="center-card">
      <div class="center-header">
        <div class="skeleton" style="height: 24px; width: 70%; margin-bottom: 0.5rem;"></div>
        <div class="skeleton" style="height: 16px; width: 40%;"></div>
      </div>
      <div class="center-body">
        <div class="skeleton" style="height: 16px; width: 100%; margin-bottom: 0.5rem;"></div>
        <div class="skeleton" style="height: 16px; width: 60%; margin-bottom: 1rem;"></div>
        <div style="display: flex; gap: 0.5rem;">
          <div class="skeleton" style="height: 40px; flex: 1;"></div>
          <div class="skeleton" style="height: 40px; flex: 1;"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function showError(message) {
  const grid = document.getElementById('centers-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
      <svg width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin: 0 auto 1rem; color: var(--cemedis-urgent);">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
      </svg>
      <h3 style="margin-bottom: 0.5rem; color: var(--cemedis-urgent);">Erreur de chargement</h3>
      <p style="color: var(--cemedis-gray-500); margin-bottom: 1rem;">${message}</p>
      <button onclick="loadCenters()" class="btn btn-primary">Réessayer</button>
    </div>
  `;
}

// ===== Geolocation =====
function findNearestCenter() {
  if (!navigator.geolocation) {
    alert('La géolocalisation n\'est pas supportée par votre navigateur.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      // Calculate distances and sort
      const centersWithDistance = centers.map(center => {
        const lat = parseFloat(center['LAT']);
        const lng = parseFloat(center['LONG']);

        if (isNaN(lat) || isNaN(lng)) {
          return { ...center, distance: Infinity };
        }

        const distance = getDistance(userLat, userLng, lat, lng);
        return { ...center, distance };
      });

      centersWithDistance.sort((a, b) => a.distance - b.distance);
      filteredCenters = centersWithDistance;

      renderCenters();
      updateMap();

      // Center map on user location (Google Maps)
      if (map && typeof google !== 'undefined') {
        map.setCenter({ lat: userLat, lng: userLng });
        map.setZoom(13);
      }
    },
    (error) => {
      console.error('Geolocation error:', error);
      alert('Impossible d\'obtenir votre position. Veuillez autoriser la géolocalisation.');
    }
  );
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ===== Export functions for global access =====
window.loadCenters = loadCenters;
window.handleSearch = handleSearch;
window.findNearestCenter = findNearestCenter;
