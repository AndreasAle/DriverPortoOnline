# TravelGo Driver

Demo ride-hailing untuk portofolio: pencarian lokasi (Photon/maps.co), rute alternatif (OSRM), simulasi order & speed monitor, ekspor struk.

## Jalankan
Cukup buka `index.html` (disarankan via HTTPS/localhost agar GPS berfungsi).

## Teknologi
- Leaflet, OSRM public router
- Geocoding: Photon (fallback maps.co)
- html2pdf.js

## Struktur
- `index.html` – markup & import CDN
- `styles.css` – styling
- `app.js` – logika app (routing, geocoding, OSRM, GPS, modal)

## Lisensi
MIT
