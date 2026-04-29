// ============================================================
//  CLEAR CREEK TRAIL TOUR — App Logic
// ============================================================

// ---------- Elements ----------
const splash      = document.getElementById('splash');
const app         = document.getElementById('app');
const startBtn    = document.getElementById('start-btn');
const backBtn     = document.getElementById('back-to-splash');
const locateBtn   = document.getElementById('locate-btn');
const stopPanel   = document.getElementById('stop-panel');
const closePanel  = document.getElementById('close-panel');
const panelBadge  = document.getElementById('panel-badge');
const panelTitle  = document.getElementById('panel-title');
const panelBody   = document.getElementById('panel-body');
const panelTip    = document.getElementById('panel-tip');
const toast       = document.getElementById('location-toast');

// ---------- State ----------
let map = null;
let locationMarker = null;
let locationCircle = null;

// ---------- Splash → App ----------
startBtn.addEventListener('click', () => {
  splash.classList.add('fade-out');
  setTimeout(() => {
    splash.classList.add('hidden');
    app.classList.remove('hidden');
    if (!map) initMap();
  }, 500);
});

backBtn.addEventListener('click', () => {
  app.classList.add('hidden');
  splash.classList.remove('hidden', 'fade-out');
  hidePanel();
});

// ---------- Map Initialization ----------
function initMap() {
  map = L.map('map', {
    center: MAP_CONFIG.center,
    zoom: MAP_CONFIG.zoom,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    zoomControl: true
  });

  // Basemap: Stadia Stamen Terrain — topographic, nature-forward, no API key needed
  // Matches GPC's topo aesthetic and works well for trail maps
  L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://stamen.com">Stamen Design</a> &copy; <a href="https://stadiamaps.com">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    minZoom: 0,
    maxZoom: 18
  }).addTo(map);

  // Load trail GeoJSON — drawn below stop markers so markers sit on top
  fetch('assets/trail.json')
    .then(res => res.json())
    .then(data => {
      // Outer stroke — dark outline for contrast against basemap
      L.geoJSON(data, {
        style: {
          color: '#004a6e',
          weight: 7,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }
      }).addTo(map);

      // Inner line — GPC Bay Blue on top
      L.geoJSON(data, {
        style: {
          color: '#006596',
          weight: 4,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        }
      }).addTo(map);
    })
    .catch(err => console.warn('Trail GeoJSON failed to load:', err));

  // Add all tour stop markers
  TOUR_STOPS.forEach(stop => addStopMarker(stop));

  // Close panel when clicking the map background
  map.on('click', hidePanel);
}

// ---------- Custom Marker ----------
function addStopMarker(stop) {
  // Build a custom numbered div icon
  const icon = L.divIcon({
    className: 'stop-marker',
    html: `<div class="marker-inner">${stop.id}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22]
  });

  const marker = L.marker([stop.lat, stop.lng], { icon })
    .addTo(map)
    .on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      openPanel(stop);
      // Pan map so marker isn't hidden behind the panel
      map.panTo([stop.lat, stop.lng], { animate: true, duration: 0.5 });
    });

  return marker;
}

// ---------- Stop Panel ----------
function openPanel(stop) {
  panelBadge.textContent = stop.id;
  panelTitle.textContent = stop.title;

  // Photo — inserted from img field if present
  if (stop.img) {
    panelBody.innerHTML = `
      <img
        src="${stop.img}"
        alt="${stop.title}"
        class="panel-photo"
        onerror="this.style.display='none'"
      />
      ${stop.body}
    `;
  } else {
    panelBody.innerHTML = stop.body;
  }

  // Tip callout — only shown when tip text exists
  if (stop.tip) {
    panelTip.innerHTML = `<strong>Look & Listen</strong> ${stop.tip}`;
    panelTip.style.display = 'block';
  } else {
    panelTip.style.display = 'none';
  }

  stopPanel.classList.remove('hidden');
  requestAnimationFrame(() => stopPanel.classList.add('open'));
}

function hidePanel() {
  stopPanel.classList.remove('open');
  setTimeout(() => stopPanel.classList.add('hidden'), 300);
}

closePanel.addEventListener('click', hidePanel);

// ---------- Geolocation ----------
locateBtn.addEventListener('click', locateUser);

function locateUser() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.');
    return;
  }

  showToast('Finding your location…');
  locateBtn.classList.add('locating');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;

      // Remove old location markers
      if (locationMarker) map.removeLayer(locationMarker);
      if (locationCircle) map.removeLayer(locationCircle);

      // Accuracy circle
      locationCircle = L.circle([latitude, longitude], {
        radius: accuracy,
        color: '#3b82f6',
        fillColor: '#93c5fd',
        fillOpacity: 0.2,
        weight: 1
      }).addTo(map);

      // Location dot
      const locationIcon = L.divIcon({
        className: 'location-dot',
        html: '<div class="location-dot-inner"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      locationMarker = L.marker([latitude, longitude], { icon: locationIcon }).addTo(map);

      map.setView([latitude, longitude], 16, { animate: true, duration: 0.8 });
      showToast('📍 You are here');
      locateBtn.classList.remove('locating');
    },
    (error) => {
      locateBtn.classList.remove('locating');
      const messages = {
        1: 'Location access denied. Check your browser settings.',
        2: 'Location unavailable. Try again.',
        3: 'Location request timed out. Try again.'
      };
      showToast(messages[error.code] || 'Unable to get location.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

// ---------- Toast ----------
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 3000);
}