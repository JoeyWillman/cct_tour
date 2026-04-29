// ============================================================
//  CLEAR CREEK TRAIL TOUR — App Logic
// ============================================================

// ---------- Elements ----------
const splash      = document.getElementById('splash');
const app         = document.getElementById('app');
const startBtn    = document.getElementById('start-btn');
const menuBtn     = document.getElementById('menu-btn');
const menuDrawer  = document.getElementById('menu-drawer');
const menuOverlay = document.getElementById('menu-overlay');
const menuClose   = document.getElementById('menu-close');
const menuHomeBtn = document.getElementById('menu-home-btn');
const menuList    = document.getElementById('menu-list');
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

// ---------- Menu Drawer ----------
function openMenu() {
  menuDrawer.classList.remove('hidden');
  menuOverlay.classList.remove('hidden');
  requestAnimationFrame(() => menuDrawer.classList.add('open'));
}

function closeMenu() {
  menuDrawer.classList.remove('open');
  menuOverlay.classList.add('hidden');
  setTimeout(() => menuDrawer.classList.add('hidden'), 300);
}

menuBtn.addEventListener('click', openMenu);
menuClose.addEventListener('click', closeMenu);
menuOverlay.addEventListener('click', closeMenu);

// Home — go back to splash
menuHomeBtn.addEventListener('click', () => {
  closeMenu();
  hidePanel();
  setTimeout(() => {
    app.classList.add('hidden');
    splash.classList.remove('hidden', 'fade-out');
  }, 150);
});

// Build stop list in menu after stops are available
function buildMenuStopList() {
  TOUR_STOPS.forEach(stop => {
    const li = document.createElement('li');
    li.innerHTML = `
      <button class="menu-item" data-stop-id="${stop.id}">
        <div class="menu-item-badge"><span>${stop.id}</span></div>
        <span class="menu-item-label">${stop.title}</span>
      </button>
    `;
    li.querySelector('button').addEventListener('click', () => {
      closeMenu();
      hidePanel();
      // Fly to marker then open panel
      map.setView([stop.lat, stop.lng], 16, { animate: true, duration: 0.6 });
      setTimeout(() => openPanel(stop), 400);
    });
    menuList.appendChild(li);
  });
}

// ---------- Map Initialization ----------
function initMap() {
  map = L.map('map', {
    center: MAP_CONFIG.center,
    zoom: MAP_CONFIG.zoom,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    zoomControl: true
  });

  // Basemap: CartoDB Voyager — clean, modern, free, no API key
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    minZoom: 0,
    maxZoom: 19
  }).addTo(map);

  // Load trail GeoJSON — drawn below stop markers so markers sit on top
  fetch('assets/trail.json')
    .then(res => res.json())
    .then(data => {
      // Outer stroke — white halo for clean separation from basemap
      L.geoJSON(data, {
        style: {
          color: '#ffffff',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }
      }).addTo(map);

      // Inner line — GPC Bay Blue
      L.geoJSON(data, {
        style: {
          color: '#006596',
          weight: 3,
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

  // Build the menu stop list now that map is ready
  buildMenuStopList();
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