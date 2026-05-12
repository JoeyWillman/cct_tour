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
let activeMarkerEl = null;

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

menuHomeBtn.addEventListener('click', () => {
  closeMenu();
  hidePanel();
  setTimeout(() => {
    app.classList.add('hidden');
    splash.classList.remove('hidden', 'fade-out');
  }, 150);
});

function buildMenuStopList() {
  const categories = [
    { key: 'ecology',   label: 'Ecology' },
    { key: 'history',   label: 'History' },
    { key: 'future',    label: 'Clear Creek Present & Future' },
    { key: 'hydrology', label: 'Hydrology' }
  ];

  categories.forEach(cat => {
    const stops = TOUR_STOPS.filter(s => s.category === cat.key);
    if (!stops.length) return;

    const catInfo = CATEGORIES[cat.key];

    // Category heading
    const heading = document.createElement('li');
    heading.className = 'menu-category-heading';
    heading.innerHTML = `
      <span class="menu-cat-dot" style="background:${catInfo.color}"></span>
      ${cat.label}
    `;
    menuList.appendChild(heading);

    stops.forEach(stop => {
      const li = document.createElement('li');
      li.innerHTML = `
        <button class="menu-item" data-stop-id="${stop.id}">
          <div class="menu-item-badge" style="background:${catInfo.color}">
            <span class="menu-item-icon">${catInfo.icon}</span>
          </div>
          <span class="menu-item-label">${stop.title}</span>
        </button>
      `;
      li.querySelector('button').addEventListener('click', () => {
        closeMenu();
        hidePanel();
        map.setView([stop.lat, stop.lng], 16, { animate: true, duration: 0.6 });
        setTimeout(() => {
          const markerEls = document.querySelectorAll('.marker-inner');
          markerEls.forEach(el => {
            if (el.dataset.stopId === String(stop.id)) {
              if (activeMarkerEl) activeMarkerEl.classList.remove('active');
              activeMarkerEl = el;
              activeMarkerEl.classList.add('active');
            }
          });
          openPanel(stop);
        }, 400);
      });
      menuList.appendChild(li);
    });
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

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    minZoom: 0,
    maxZoom: 19
  }).addTo(map);

  // Trail GeoJSON
  fetch('assets/trail.json')
    .then(res => res.json())
    .then(data => {
      L.geoJSON(data, {
        style: { color: '#ffffff', weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }
      }).addTo(map);
      L.geoJSON(data, {
        style: { color: '#006596', weight: 3, opacity: 1, lineCap: 'round', lineJoin: 'round' }
      }).addTo(map);
    })
    .catch(err => console.warn('Trail GeoJSON failed to load:', err));

  // Add legend
  addLegend();

  // Add markers
  TOUR_STOPS.forEach(stop => addStopMarker(stop));

  map.on('click', hidePanel);
  buildMenuStopList();
}

// ---------- Legend ----------
function addLegend() {
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'map-legend');
    div.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${cat.color}">${cat.icon}</span>
        <span class="legend-label">${cat.label}</span>
      </div>
    `).join('');
    return div;
  };
  legend.addTo(map);
}

// ---------- Custom Marker ----------
function addStopMarker(stop) {
  const cat = CATEGORIES[stop.category] || CATEGORIES.ecology;

  const icon = L.divIcon({
    className: 'stop-marker',
    html: `<div class="marker-inner" data-stop-id="${stop.id}" data-category="${stop.category}" style="background:${cat.color}; border-color:rgba(255,255,255,0.9)">${cat.icon}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22]
  });

  const marker = L.marker([stop.lat, stop.lng], { icon })
    .addTo(map)
    .on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (activeMarkerEl) activeMarkerEl.classList.remove('active');
      activeMarkerEl = e.target.getElement().querySelector('.marker-inner');
      if (activeMarkerEl) activeMarkerEl.classList.add('active');
      openPanel(stop);
      map.panTo([stop.lat, stop.lng], { animate: true, duration: 0.5 });
    });

  return marker;
}

// ---------- Stop Panel ----------
const slideshow     = document.getElementById('panel-slideshow');
const slideshowImg  = document.getElementById('slideshow-img');
const slideshowVid  = document.getElementById('slideshow-video');
const slideCaption  = document.getElementById('slide-caption');
const slideCounter  = document.getElementById('slide-counter');
const slidePrev     = document.getElementById('slide-prev');
const slideNext     = document.getElementById('slide-next');

let currentMedia = [];   // array of { type: 'photo'|'video', src, caption, embedUrl }
let currentSlide = 0;

// Convert a YouTube or Vimeo URL to an embed URL
function getEmbedUrl(url) {
  if (!url) return null;

  // YouTube: various formats
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;

  // Vimeo
  const vimMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimMatch) return `https://player.vimeo.com/video/${vimMatch[1]}`;

  return null;
}

// Build media array from a stop's photos field
// Each item can be:
//   { src: 'assets/photo.jpg', caption: '...' }          — photo
//   { video: 'https://youtu.be/...', caption: '...' }    — video
function buildMediaList(stop) {
  const raw = Array.isArray(stop.photos) ? stop.photos : [];
  return raw.map(item => {
    if (item.video) {
      const embedUrl = getEmbedUrl(item.video);
      return embedUrl
        ? { type: 'video', embedUrl, caption: item.caption || '' }
        : null;
    }
    if (item.src) {
      return { type: 'photo', src: item.src, caption: item.caption || '' };
    }
    return null;
  }).filter(Boolean);
}

function showSlide(index) {
  if (!currentMedia.length) return;
  currentSlide = (index + currentMedia.length) % currentMedia.length;
  const item = currentMedia[currentSlide];

  // Fade out
  slideshowImg.style.opacity = '0';
  slideshowVid.style.opacity = '0';

  setTimeout(() => {
    if (item.type === 'video') {
      slideshowImg.classList.add('hidden');
      slideshowVid.classList.remove('hidden');
      slideshowVid.src = item.embedUrl;
      slideshowVid.style.opacity = '1';
    } else {
      // Stop any playing video
      slideshowVid.src = '';
      slideshowVid.classList.add('hidden');
      slideshowImg.classList.remove('hidden');
      slideshowImg.src = item.src;
      slideshowImg.alt = item.caption || '';
      slideshowImg.style.opacity = '1';
    }

    // Caption
    slideCaption.textContent = item.caption || '';
    slideCaption.style.display = item.caption ? 'block' : 'none';

    // Counter + arrows
    if (currentMedia.length > 1) {
      // Show type indicator in counter
      const typeIcon = item.type === 'video' ? '▶ ' : '📷 ';
      slideCounter.textContent = `${typeIcon}${currentSlide + 1} / ${currentMedia.length}`;
      slideCounter.style.display = 'block';
      slidePrev.style.display = 'flex';
      slideNext.style.display = 'flex';
    } else {
      slideCounter.style.display = 'none';
      slidePrev.style.display = 'none';
      slideNext.style.display = 'none';
    }
  }, 150);
}

slidePrev.addEventListener('click', () => showSlide(currentSlide - 1));
slideNext.addEventListener('click', () => showSlide(currentSlide + 1));

function openPanel(stop) {
  const cat = CATEGORIES[stop.category] || CATEGORIES.ecology;

  // Badge
  panelBadge.innerHTML = cat.icon;
  panelBadge.style.background = cat.color;

  // Title
  panelTitle.textContent = stop.title;

  // Category chip
  let catChip = document.getElementById('panel-category');
  if (!catChip) {
    catChip = document.createElement('div');
    catChip.id = 'panel-category';
    panelTitle.after(catChip);
  }
  catChip.className = 'panel-category-chip';
  catChip.style.background = cat.color + '18';
  catChip.style.color = cat.color;
  catChip.style.borderColor = cat.color + '44';
  catChip.innerHTML = `<span class="chip-icon">${cat.icon}</span> ${cat.label}`;

  // Media slideshow
  currentMedia = buildMediaList(stop);
  currentSlide = 0;

  if (currentMedia.length > 0) {
    // Reset both elements
    slideshowImg.style.opacity = '0';
    slideshowVid.src = '';
    slideshowVid.classList.add('hidden');
    slideshowImg.classList.remove('hidden');
    slideshow.classList.remove('hidden');
    showSlide(0);
  } else {
    // No media — stop any video and hide
    slideshowVid.src = '';
    slideshow.classList.add('hidden');
  }

  // Body
  panelBody.innerHTML = stop.body;

  // Inject eBird button on the Birds of Clear Creek stop
  maybeInjectBirdsButton(stop);

  // Tip
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
  // Stop any playing video
  slideshowVid.src = '';
  if (activeMarkerEl) {
    activeMarkerEl.classList.remove('active');
    activeMarkerEl = null;
  }
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
      if (locationMarker) map.removeLayer(locationMarker);
      if (locationCircle) map.removeLayer(locationCircle);

      locationCircle = L.circle([latitude, longitude], {
        radius: accuracy,
        color: '#3b82f6',
        fillColor: '#93c5fd',
        fillOpacity: 0.2,
        weight: 1
      }).addTo(map);

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

// ============================================================
//  BIRDS PANEL — eBird API
//  Hotspot: L733601 (Clear Creek Trail, Silverdale WA)
// ============================================================

const EBIRD_HOTSPOT  = 'L733601';
const EBIRD_API_KEY  = 'tjd5dj8076eb';
const EBIRD_BASE     = 'https://api.ebird.org/v2';

const birdsPanel   = document.getElementById('birds-panel');
const birdsContent = document.getElementById('birds-content');
const birdsClose   = document.getElementById('birds-close');
const menuBirdsBtn = document.getElementById('menu-birds-btn');
const birdsTabs    = document.querySelectorAll('.birds-tab');

let activeTab      = 'recent';
let birdsCache     = {};   // cache per tab so we don't re-fetch

// Open/close
function openBirdsPanel(tab = 'recent') {
  closeMenu();
  hidePanel();
  birdsPanel.classList.remove('hidden');
  requestAnimationFrame(() => birdsPanel.classList.add('open'));
  switchBirdsTab(tab);
}

function closeBirdsPanel() {
  birdsPanel.classList.remove('open');
  setTimeout(() => birdsPanel.classList.add('hidden'), 300);
}

birdsClose.addEventListener('click', closeBirdsPanel);
menuBirdsBtn.addEventListener('click', () => openBirdsPanel('recent'));

// Tab switching
birdsTabs.forEach(tab => {
  tab.addEventListener('click', () => switchBirdsTab(tab.dataset.tab));
});

function switchBirdsTab(tab) {
  activeTab = tab;
  birdsTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  if (birdsCache[tab]) {
    renderBirdsTab(tab, birdsCache[tab]);
  } else {
    fetchBirdsTab(tab);
  }
}

// Fetch from eBird
async function fetchBirdsTab(tab) {
  showBirdsLoading();
  try {
    let data;
    const headers = { 'X-eBirdApiToken': EBIRD_API_KEY };

    if (tab === 'recent') {
      const res = await fetch(
        `${EBIRD_BASE}/data/obs/${EBIRD_HOTSPOT}/recent?maxResults=100&back=30`,
        { headers }
      );
      data = await res.json();

    } else if (tab === 'rarities') {
      const res = await fetch(
        `${EBIRD_BASE}/data/obs/${EBIRD_HOTSPOT}/recent/notable?maxResults=50&back=30&detail=full`,
        { headers }
      );
      data = await res.json();

    } else if (tab === 'species') {
      // Use the hotspot info endpoint which returns species with names
      const res = await fetch(
        `${EBIRD_BASE}/product/spplist/${EBIRD_HOTSPOT}`,
        { headers }
      );
      const codes = await res.json();

      // Fetch just the species we need via checklist taxonomy filtered to these codes
      // Batch into comma-separated codes (max 10 at a time for the species endpoint)
      const speciesRes = await fetch(
        `${EBIRD_BASE}/ref/taxonomy/ebird?fmt=json&locale=en&species=${codes.join(',')}`,
        { headers }
      );
      data = await speciesRes.json();
    }

    birdsCache[tab] = data;
    renderBirdsTab(tab, data);
  } catch (err) {
    showBirdsError();
    console.warn('eBird fetch error:', err);
  }
}

function showBirdsLoading() {
  birdsContent.innerHTML = `
    <div class="birds-loading">
      <div class="birds-spinner"></div>
      <span>Loading sightings…</span>
    </div>`;
}

function showBirdsError() {
  birdsContent.innerHTML = `
    <div class="birds-empty">
      <span>⚠️ Unable to load sightings.<br>Check your connection and try again.</span>
    </div>`;
}

// Render tab content
function renderBirdsTab(tab, data) {
  if (!data || data.length === 0) {
    birdsContent.innerHTML = `<div class="birds-empty">No sightings found for this period.</div>`;
    return;
  }

  if (tab === 'recent' || tab === 'rarities') {
    renderObsList(data, tab === 'rarities');
  } else if (tab === 'species') {
    renderSpeciesList(data);
  }
}

function renderObsList(obs, isRarity) {
  // Group by date
  const byDate = {};
  obs.forEach(o => {
    const date = o.obsDt ? o.obsDt.split(' ')[0] : 'Unknown';
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(o);
  });

  const html = Object.entries(byDate).map(([date, sightings]) => {
    const label = formatDate(date);
    const rows = sightings.map(s => `
      <div class="birds-row">
        <div class="birds-name">
          <span class="birds-common">${s.comName}</span>
          <span class="birds-sci">${s.sciName}</span>
        </div>
        <div class="birds-count">${s.howMany || '—'}</div>
      </div>
    `).join('');
    return `
      <div class="birds-date-group">
        <div class="birds-date-header">${label}</div>
        ${rows}
      </div>
    `;
  }).join('');

  birdsContent.innerHTML = `
    <div class="birds-meta">${obs.length} species · last 30 days${isRarity ? ' · notable sightings only' : ''}</div>
    ${html}
  `;
}

function renderSpeciesList(species) {
  // Group by family
  const byFamily = {};
  species.forEach(s => {
    const fam = s.familyComName || 'Other';
    if (!byFamily[fam]) byFamily[fam] = [];
    byFamily[fam].push(s);
  });

  const html = Object.entries(byFamily).map(([family, spp]) => {
    const rows = spp.map(s => `
      <div class="birds-row">
        <div class="birds-name">
          <span class="birds-common">${s.comName}</span>
          <span class="birds-sci">${s.sciName}</span>
        </div>
      </div>
    `).join('');
    return `
      <div class="birds-date-group">
        <div class="birds-date-header">${family}</div>
        ${rows}
      </div>
    `;
  }).join('');

  birdsContent.innerHTML = `
    <div class="birds-meta">${species.length} species ever recorded at this hotspot</div>
    ${html}
  `;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Inject "View Bird Sightings" button when the Birds of Clear Creek stop opens
// Called after openPanel renders the body
function maybeInjectBirdsButton(stop) {
  if (stop.id !== 'birds') return;
  const btn = document.createElement('button');
  btn.className = 'birds-launch-btn';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>
    View Recent Bird Sightings
  `;
  btn.addEventListener('click', () => {
    hidePanel();
    openBirdsPanel('recent');
  });
  panelBody.appendChild(btn);
}