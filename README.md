
> Kode dipisah menjadi 3 file agar mudah dikembangkan.  
> Jika kamu menyalin dari satu file HTML versi lama, pastikan sudah dipecah sesuai struktur di atas.

---

## ▶️ Menjalankan di Lokal

1. **Download / clone** repo ini.
2. Buka **`index.html`** di browser.  
   - Agar fitur **GPS** berfungsi, jalankan via **HTTPS** atau **localhost** (contoh: VS Code **Live Server**).


**Tip**: jika peta tidak center atau tile kosong, refresh sekali; OSRM/Photon kadang lambat.

---

## 🚀 Deploy ke GitHub Pages

1. **Settings → Pages → Build and deployment**
2. **Source**: *Deploy from a branch*
3. **Branch**: `main` / **root**
4. Save → tunggu build.  
   Akses di: `https://<username>.github.io/<repo-name>/`

---

## 🧭 Cara Pakai (Alur)

1. **Get Started** → **Continue with Motor**
2. Masukkan tujuan atau klik peta. Kotak suggestion akan muncul saat mengetik.
3. Klik **RUTE** → pilih rute di list (label *Best* = paling cepat).
4. **Start Delivery** → pop-up **Mencari driver (5 detik)** → **Driver ditemukan** → **Lanjutkan**
5. Pop-up **Konfirmasi biaya** → **Mulai**
6. Selama jalan: banner kecepatan akan tampil (ideal / terlalu kencang).
7. **Finish** → lihat ringkasan → Simpan/Download struk.

---

## ⚠️ Troubleshooting

- **Photon 400/429 / “Failed to load resource”**  
  Layanan publik Photon kadang rate-limit. Aplikasi otomatis fallback ke **maps.co**.  
  Coba lagi setelah beberapa detik, atau gunakan koneksi berbeda/VPN.
- **GPS tidak jalan**  
  Pastikan via **HTTPS** atau **localhost** dan sudah memberi izin lokasi.
- **Rute tidak muncul**  
  Server **OSRM** publik bisa overload. *Retry* dalam beberapa detik.
- **Bahasa hasil geocode**  
  Photon sudah di-`lang=id`, namun data OSM bisa campur Inggris/Indonesia.

---

## 🗺️ Sumber & Kredit

- Map tiles © [OpenStreetMap](https://www.openstreetmap.org/)
- [Leaflet](https://leafletjs.com/)
- Routing: [OSRM demo server](https://router.project-osrm.org/)
- Geocoding: [Photon (Komoot)](https://photon.komoot.io/) & [maps.co](https://geocode.maps.co/)
- PDF: [html2pdf.js](https://github.com/eKoopmans/html2pdf.js)

---

## 📌 Roadmap (opsional)

- [ ] Reverse geocoding untuk menampilkan nama lokasi saat klik peta  
- [ ] Simpan riwayat perjalanan lengkap & export CSV  
- [ ] Mode **Car/Bus/Train** (saat ini hanya **Motor**)  
- [ ] Dark mode peta

---

## 📜 Lisensi

**MIT License** – bebas digunakan untuk portofolio & eksperimen.  
© 2025 Andreas Alessandro


<img width="477" height="762" alt="HomeScreen" src="https://github.com/user-attachments/assets/2f536d4d-1d56-47cf-a250-ba5a514721dc" />
<img width="477" height="914" alt="HomeScreenAlert" src="https://github.com/user-attachments/assets/090de175-e753-4b64-ac62-a9d303d12b43" />
![DEliveryScreen1](https://github.com/user-attachments/assets/7e09a5d1-196c-4eba-94ca-a9481f95e9ba)
![DEliveryScreen2](https://github.com/user-attachments/assets/abb8d6b4-b778-45a3-99b3-a9c3d958b0e7)
![DEliveryScreen3](https://github.com/user-attachments/assets/a476f999-c5a6-4951-b756-f035858cb2d1)
![DEliveryScreen4](https://github.com/user-attachments/assets/648eb303-e242-4417-810a-02f8dafb29f2)
![DEliveryScreen5](https://github.com/user-attachments/assets/67e9c597-686d-412b-8c07-fa224d52b878)
![DEliveryScreen6](https://github.com/user-attachments/assets/fc6c76c8-f3ca-47d6-a182-c863984131f5)



