# 💸 DuitTrack – Smart Daily Expense Reminder

DuitTrack adalah website **frontend-only** untuk membantu pengguna mencatat pengeluaran harian secara cepat, praktis, dan modern. Cocok digunakan untuk memantau uang keluar setiap hari seperti makan, bensin, kopi, jajan, transportasi, dan kebutuhan lainnya.

Website ini berjalan langsung di browser tanpa backend dan tanpa database. Semua data disimpan secara lokal menggunakan **LocalStorage**.

---

## ✨ Features

* 📊 Dashboard ringkasan keuangan harian
* 💰 Total pengeluaran hari ini, minggu ini, dan bulan ini
* ➕ Tambah transaksi pengeluaran
* 🗂️ Kategori pengeluaran custom
* 📝 Catatan tambahan setiap transaksi
* 📅 Pilih tanggal transaksi
* 📚 Riwayat pengeluaran
* ✏️ Edit & hapus data
* 🔍 Search dan filter transaksi
* 📈 Grafik pengeluaran (Chart.js)
* 🎯 Kelola saldo (set ulang & top up)
* 🎁 Wishlist banyak item: klik untuk detail, Hapus, atau Tercapai (saldo otomatis berkurang)
* 💵 Catat pemasukan (gaji, uang saku, freelance, dll) — saldo otomatis bertambah
* 🔁 Transaksi berulang (mingguan / bulanan / tahunan): diingatkan atau dicatat otomatis
* 📈 Grafik pemasukan vs pengeluaran 6 bulan
* 💾 Backup & Restore data (JSON) + undo restore + pengingat backup
* 📲 PWA: bisa dipasang di HP/PC dan jalan offline
* 🌙 Dark mode / ☀️ Light mode
* 📱 Responsive mobile & desktop
* 💾 Data tersimpan otomatis di browser

---

## 🛠️ Built With

* HTML5
* CSS3
* JavaScript (Vanilla JS)
* LocalStorage API
* Chart.js

---

## 📁 Project Structure

```text
duittrack/
│── index.html
│── style.css
│── script.js
│── manifest.json     (PWA)
│── sw.js             (service worker / offline)
│── icons/            (ikon aplikasi)
│── README.md
```

---

## 🚀 Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/username/duittrack.git
```

### 2. Open Project

Masuk ke folder project lalu buka file:

```text
index.html
```

Atau jalankan menggunakan Live Server di VS Code.

> **Catatan PWA:** fitur pasang aplikasi & offline hanya aktif kalau dibuka lewat `https://` atau `localhost`
> (mis. GitHub Pages, Netlify, Live Server). Kalau membuka `index.html` langsung dari folder (`file://`),
> aplikasi tetap jalan normal tapi tidak bisa dipasang. Setiap mengubah file app, naikkan `VERSION` di `sw.js`
> supaya cache di perangkat pengguna diperbarui.

---

## 💡 How It Works

1. Tambahkan pengeluaran harian.
2. Pilih kategori dan nominal.
3. Data otomatis tersimpan di browser.
4. Lihat total pengeluaran dan statistik.
5. Kelola keuangan lebih disiplin.

---

## 📷 Preview Modules

* Dashboard
* Add Expense Form
* Expense History
* Analytics Chart
* Budget Reminder
* Settings

---

## 🎯 Use Cases

* Mahasiswa
* Freelancer
* Karyawan
* Anak kost
* Pelaku UMKM
* Siapa pun yang ingin mengatur pengeluaran harian

---

## 🔒 Privacy

Semua data tersimpan **lokal di perangkat pengguna** dan tidak dikirim ke server mana pun.

---

## 🧠 Future Improvements

* Multi wallet support
* Notification reminder

---

## 🤝 Contributing

Pull request dan ide pengembangan sangat terbuka.

1. Fork repository
2. Create new branch
3. Commit changes
4. Open pull request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

Development by **ABD. Rohman Ubaidillah, S.Kom**

---

## ⭐ Support

Jika project ini bermanfaat, beri ⭐ di GitHub repository.
