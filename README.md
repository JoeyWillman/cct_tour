# Clear Creek Trail — Digital Walking Tour

A self-contained, offline-capable walking tour app built with Leaflet.js.
No build tools, no npm, no API keys required. Open `index.html` in a browser and go.

---

## Project Structure

```
clear-creek-trail-tour/
├── index.html          # Main shell — splash + app layout
├── css/
│   └── style.css       # All styles (design tokens at the top)
├── js/
│   └── app.js          # Map init, markers, geolocation, panel logic
├── data/
│   └── stops.js        # ← EDIT THIS to add/change tour stops
└── assets/             # Place images here for use in stop panels
```

---

## Adding or Editing Tour Stops

All content lives in `data/stops.js`. Each stop is an object in the `TOUR_STOPS` array:

```js
{
  id: 6,                        // Unique number — appears on the map marker
  title: "Hospital Hill Spur",  // Displayed in the panel header
  lat: 47.6555,                 // Decimal latitude  (right-click in Google Maps → copy)
  lng: -122.6915,               // Decimal longitude
  tags: ["Ecology", "Views"],   // Short label chips; use whatever makes sense
  body: `
    <p>Your interpretive text goes here. HTML is supported.</p>
    <p>Add <strong>bold</strong> or <em>italic</em> for emphasis.</p>
  `,
  tip: "Optional callout — great for birding tips or safety notes."
}
```

Reorder stops in the array to change their numbering on the map.

---

## Getting Coordinates

1. Open Google Maps in a browser
2. Navigate to the spot on the trail
3. Right-click → the coordinates appear at the top of the context menu
4. Click them to copy `lat, lng` to your clipboard

---

## Adding Images to Stop Panels

1. Drop your image (jpg/webp recommended) into `assets/`
2. In the stop's `body` field, add an `<img>` tag:

```html
body: `
  <img src="assets/north-wetlands-boardwalk.jpg" alt="Boardwalk through wetlands"
       style="width:100%; border-radius:8px; margin-bottom:12px;" />
  <p>Your text here...</p>
`
```

---

## Changing the Map Style

The default tile layer uses OpenStreetMap (no key needed). For a more
nature-focused look, swap the tile URL in `js/app.js`:

```js
// Stadia Outdoors (free tier available — get key at stadia.com)
L.tileLayer('https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png?api_key=YOUR_KEY', {
  attribution: '...'
}).addTo(map);
```

Other good options: Thunderforest Landscape, Mapbox Outdoors, USGS Topo.

---

## Deploying to GitHub Pages

1. Push the folder to a GitHub repo (e.g. `kas-clear-creek-tour`)
2. Settings → Pages → Source: `main` branch, `/root`
3. Your tour will be live at `https://yourusername.github.io/kas-clear-creek-tour/`

No build step needed — it's all static files.

---

## Offline / PWA (optional future upgrade)

Add a `manifest.json` and `service-worker.js` to make the tour installable 
and usable without cell service on trail. Good next step once content is finalized.

---

## Credits

Trail content sourced from:
- [Great Peninsula Conservancy](https://greatpeninsula.org)
- [Clear Creek Trail website](https://clearcreektrail.org)
- [Washington Trails Association](https://wta.org)
- Wikipedia: Clear Creek Trail (Washington)

Map tiles © OpenStreetMap contributors.
