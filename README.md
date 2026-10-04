# Deploy Stunting dengan Docker dan Portainer

Folder ini adalah **salinan deployment terpisah**. Folder aplikasi asli berikut tidak diubah:

- `../be-stunting`
- `../fe-stunting`

Stack menjalankan tiga container dalam jaringan Docker internal:

```text
Browser -> frontend (Nginx, host port 8080) -> /api -> backend (Flask/Gunicorn) -> mysql
```

Hanya frontend yang membuka port host. Backend dan MySQL tidak dipublikasikan ke internet. Frontend salinan memakai URL API relatif `/api`; file frontend asli tetap menggunakan URL development `127.0.0.1:5000`.

## Isi folder

```text
docker-portainer/
├── compose.yml               # Stack untuk Portainer / Docker Compose
├── .env.example              # Template environment variable
├── backend/Dockerfile        # Flask + Gunicorn
├── frontend/Dockerfile       # Build React/Vite + Nginx
├── frontend/nginx.conf       # SPA fallback dan proxy /api
└── source/
    ├── backend/              # Salinan source backend
    └── frontend/             # Salinan source frontend untuk production
```

## Deploy stack baru di Portainer

1. Salin seluruh folder `docker-portainer` ke VPS atau push folder ini ke repository Git privat.
2. Di Portainer buka **Stacks** > **Add stack**.
3. Pilih metode **Upload** atau **Repository**.
   - Upload: unggah folder ini dan gunakan `compose.yml`.
   - Repository: pilih repository lalu set path Compose ke `docker-portainer/compose.yml`.
4. Beri nama stack, misalnya `stunting`.
5. Salin nilai dari `.env.example` ke **Environment variables** di Portainer.
6. Ganti seluruh nilai contoh, terutama `SECRET_KEY`, `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, dan `SEED_ADMIN_PASSWORD`.
7. Klik **Deploy the stack**.
8. Tunggu status `stunting-mysql` menjadi `healthy`, lalu pastikan `stunting-backend` dan `stunting-frontend` berstatus `running`.
9. Buka aplikasi pada `http://IP_VPS:8080` atau port yang diset melalui `APP_PORT`.

Untuk menghasilkan secret/password kuat di VPS Linux:

```bash
openssl rand -base64 48
```

Jangan commit file `.env` atau password ke Git.

## Environment variables wajib

| Variable | Keterangan |
|---|---|
| `APP_PORT` | Port web publik, default `8080`. |
| `SECRET_KEY` | Secret Flask panjang dan acak. |
| `DB_NAME` | Nama database MySQL, default `db_stunting`. |
| `DB_USERNAME` | User aplikasi MySQL, default `stunting_user`. |
| `DB_PASSWORD` | Password user aplikasi MySQL. |
| `MYSQL_ROOT_PASSWORD` | Password root MySQL, harus berbeda dari `DB_PASSWORD`. |
| `SEED_ADMIN_NAME` | Nama admin pertama. |
| `SEED_ADMIN_EMAIL` | Email admin pertama. |
| `SEED_ADMIN_PASSWORD` | Password admin pertama. |

Admin awal hanya dibuat bila database belum memiliki user dengan role `admin`.

## Menggunakan domain dan HTTPS

Stack ini membuka web pada `APP_PORT`, bukan 80/443. Pilihan aman:

- gunakan reverse proxy Portainer/Nginx Proxy Manager/Traefik yang meneruskan domain HTTPS ke `stunting-frontend:80` atau `IP_VPS:APP_PORT`;
- atau gunakan reverse proxy aaPanel menuju `http://127.0.0.1:8080` jika aaPanel tetap mengelola domain dan sertifikat.

Jangan membuka port MySQL `3306` ke internet. Jika memakai aaPanel pada VPS yang sama, jangan biarkan dua reverse proxy berebut port `80` atau `443`.

## Memindahkan database lama dari aaPanel

### 1. Export dari aaPanel/phpMyAdmin

Export database lama `db_stunting` dalam format SQL. Simpan file SQL di komputer lokal; jangan letakkan di repository.

### 2. Deploy stack baru sekali

Deploy stack agar volume `stunting_mysql_data` dan container `stunting-mysql` dibuat. Setelah MySQL `healthy`, stop container `stunting-backend` dari Portainer agar aplikasi tidak melakukan perubahan schema selama import.

### 3. Copy dan import SQL di VPS

Contoh bila file backup bernama `db_stunting.sql` berada di VPS:

```bash
docker cp db_stunting.sql stunting-mysql:/tmp/db_stunting.sql
docker exec -i stunting-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < /tmp/db_stunting.sql'
```

Lalu start kembali `stunting-backend` dan `stunting-frontend`. Saat backend berjalan, migrasi schema aplikasi akan memastikan indeks dan foreign key aktivitas tersedia.

> Jika backup SQL berisi `CREATE DATABASE` atau `USE` database lain, edit dump tersebut terlebih dahulu atau import tanpa nama database di command MySQL sesuai isi dump.

## Backup database Docker

Jalankan dari VPS dan simpan hasilnya di lokasi backup aman di luar container:

```bash
mkdir -p mysql-backups
docker exec stunting-mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > mysql-backups/db_stunting_$(date +%F_%H%M%S).sql
```

Uji pemulihan backup secara berkala. Named volume Docker bukan pengganti backup.

## Update source deployment

Source aplikasi untuk container berada di folder `source/`, sehingga perubahan pada aplikasi asli tidak otomatis masuk ke stack ini. Untuk memperbarui deployment:

1. Salin perubahan yang diinginkan dari aplikasi asli ke folder `docker-portainer/source/backend` atau `docker-portainer/source/frontend`.
2. Untuk frontend, pertahankan `source/frontend/src/api/axiosInstance.tsx` dengan `baseURL: "/api"`.
3. Di Portainer pilih **Update the stack** lalu aktifkan opsi **Re-pull image and redeploy** bila tersedia, atau rebuild stack.

## Pemeriksaan masalah umum

| Gejala | Pemeriksaan |
|---|---|
| Halaman tidak terbuka | Pastikan firewall VPS mengizinkan `APP_PORT`; cek log `stunting-frontend`. |
| API gagal/500 | Cek log `stunting-backend`, lalu status health `stunting-mysql`. |
| Backend tidak bisa konek database | Pastikan `DB_PASSWORD` sama dengan `MYSQL_PASSWORD` dan volume MySQL masih sesuai environment awal. |
| Password MySQL diubah setelah volume dibuat | Mengubah variable saja tidak mengubah akun pada volume yang sudah ada. Gunakan password lama atau ubah password melalui MySQL. |
| Data hilang setelah redeploy | Pastikan jangan menghapus volume `stunting_mysql_data`; lakukan backup SQL sebelum tindakan volume. |

## Catatan produksi

- Gunakan password unik dan kuat.
- Batasi akses Portainer, gunakan HTTPS, dan aktifkan backup VPS.
- Backend dibatasi satu Gunicorn worker karena aplikasi menjalankan pemeriksaan/migrasi schema saat startup. Jangan menaikkan worker atau replica sebelum proses migrasi schema dipisah menjadi command khusus.
- Stack ini tidak mengubah desain autentikasi aplikasi saat ini. Peningkatan keamanan API/audit (`actor` terverifikasi) tetap perlu dilakukan terpisah.
