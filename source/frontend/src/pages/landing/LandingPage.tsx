import { Link } from "react-router-dom";
import landingHero from "../../assets/landing-hero.png";
import bantulLogo from "../../assets/logo-bantul.png";
import AppLogoMark from "../../components/brand/AppLogoMark";
import QuickCheckChat from "../../components/chat/QuickCheckChat";
import type { UserRole } from "../../services/dashboardService";
import { getCurrentUser } from "../../utils/authSession";

const monitoringNotes = [
  {
    title: "Catat umur dengan tepat",
    description:
      "Gunakan usia dalam bulan agar hasil pemantauan pertumbuhan lebih mudah dibandingkan dari waktu ke waktu.",
  },
  {
    title: "Ukur tinggi dan berat berkala",
    description:
      "Perubahan tinggi dan berat yang konsisten sering lebih bermakna daripada satu angka pengukuran saja.",
  },
  {
    title: "Perhatikan pola makan dan sakit berulang",
    description:
      "Nafsu makan turun, diare berulang, atau berat sulit naik perlu menjadi catatan saat konsultasi.",
  },
  {
    title: "Tindaklanjuti dengan tenaga kesehatan",
    description:
      "Skrining awal membantu mengenali risiko, tetapi keputusan akhir tetap perlu pemeriksaan langsung.",
  },
];

const heroHighlights = [
  "Cek awal risiko",
  "Catat pertumbuhan",
  "Tindak lanjut lebih cepat",
];

const socialLinks = [
  { name: "Facebook", icon: "facebook" , link: "https://www.facebook.com/pusksewon2" },
  { name: "Instagram", icon: "instagram", link: "https://www.instagram.com/pusksewon2/" },
  { name: "YouTube", icon: "youtube" , link: "https://www.youtube.com/@pusksewon2" },
] as const;

const dashboardRoutes: Record<UserRole, string> = {
  admin: "/admin",
  petugas: "/petugas",
  petugas_kesehatan: "/petugas",
  orang_tua: "/orang-tua",
};

function DashboardIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4.75 5.75h5.5v5.5h-5.5zM13.75 5.75h5.5v5.5h-5.5zM4.75 14.75h5.5v3.5h-5.5zM13.75 14.75h5.5v3.5h-5.5z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SocialIcon({ icon }: { icon: (typeof socialLinks)[number]["icon"] }) {
  if (icon === "facebook") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M14.25 8.35V6.78c0-.72.48-.9.82-.9h2.08V2.17L14.28 2.15c-3.2 0-3.92 2.38-3.92 3.9v2.3H7.85v3.82h2.51V22h3.89v-9.83h2.62l.35-3.82z"
        />
      </svg>
    );
  }

  if (icon === "instagram") {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
      >
        <rect
          width="16"
          height="16"
          x="4"
          y="4"
          rx="4.5"
          stroke="currentColor"
          strokeWidth="2.4"
        />
        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="16.9" cy="7.1" r="1.25" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M21.57 7.15a3 3 0 0 0-2.11-2.12C17.6 4.53 12 4.53 12 4.53s-5.6 0-7.46.5a3 3 0 0 0-2.11 2.12A31 31 0 0 0 1.93 12c0 1.62.16 3.24.5 4.85a3 3 0 0 0 2.11 2.12c1.86.5 7.46.5 7.46.5s5.6 0 7.46-.5a3 3 0 0 0 2.11-2.12c.34-1.61.5-3.23.5-4.85s-.16-3.24-.5-4.85ZM10 15.45v-6.9L15.75 12z"
      />
    </svg>
  );
}

export default function LandingPage() {
  const currentUser = getCurrentUser();
  const dashboardPath = currentUser ? dashboardRoutes[currentUser.role] : "/login";

  return (
    <main className="min-h-screen bg-[#f5faf7] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <AppLogoMark className="h-10 w-10 bg-teal-700 text-white" />
            <div>
              <p className="text-sm font-black text-slate-950">Banting</p>
              <p className="text-xs font-medium text-slate-500">
                Bantul Cegah Stunting
              </p>
            </div>
          </Link>

          {currentUser ? (
            <>
              <nav className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm md:flex">
                <Link
                  className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-black text-white hover:bg-teal-800"
                  to={dashboardPath}
                >
                  <DashboardIcon />
                  Dashboard
                </Link>
              </nav>

              <div className="flex items-center gap-2 md:hidden">
                <Link
                  aria-label="Kembali ke dashboard"
                  className="grid h-10 w-10 place-items-center rounded-md bg-teal-700 text-white shadow-sm"
                  title="Dashboard"
                  to={dashboardPath}
                >
                  <DashboardIcon />
                </Link>
              </div>
            </>
          ) : (
            <>
              <nav className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm md:flex">
                <Link
                  className="rounded-md px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  to="/register"
                >
                  Register
                </Link>
                <Link
                  className="rounded-md bg-teal-700 px-4 py-2 text-sm font-black text-white hover:bg-teal-800"
                  to="/login"
                >
                  Login
                </Link>
              </nav>

              <div className="flex items-center gap-2 md:hidden">
                <Link
                  className="rounded-md px-3 py-2 text-sm font-bold text-teal-700"
                  to="/register"
                >
                  Register
                </Link>
                <Link
                  className="rounded-md bg-teal-700 px-3 py-2 text-sm font-black text-white"
                  to="/login"
                >
                  Login
                </Link>
              </div>
            </>
          )}
        </div>
      </header>

      <section className="relative isolate min-h-[calc(100svh-9rem)] overflow-hidden border-b border-teal-900/10">
        <img
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          src={landingHero}
          alt="Petugas kesehatan mengukur tinggi badan balita bersama orang tua"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white via-white/88 to-white/5" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-[#f5faf7] to-transparent" />

        <div className="mx-auto flex min-h-[calc(100svh-9rem)] w-full max-w-7xl items-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex w-fit rounded-md border border-teal-200 bg-white/85 px-3 py-2 text-sm font-black text-teal-800 shadow-sm">
              Platform pemantauan balita
            </p>
            <h1 className="text-5xl font-black tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
              Banting
            </h1>
            <p className="mt-4 max-w-xl text-xl font-bold leading-8 text-teal-900 sm:text-2xl">
              Bantul Cegah Stunting.
            </p>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-700 sm:text-lg">
              Satu tempat untuk cek cepat risiko stunting, pencatatan data
              balita, validasi pengukuran, dan laporan awal bagi petugas kesehatan serta
              orang tua.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3">
              {heroHighlights.map((item) => (
                <span
                  key={item}
                  className="border-l-2 border-teal-600 bg-white/55 px-3 py-2 text-sm font-black text-slate-800 backdrop-blur-sm"
                >
                  {item}
                </span>
              ))}
            </div>

            <a
              href="#cek-cepat"
              className="mt-8 inline-flex items-center gap-3 text-sm font-black text-teal-800 hover:text-teal-950"
            >
              <span className="h-px w-10 bg-teal-700" />
              Lanjut ke cek cepat
            </a>
          </div>
        </div>
      </section>

      <section
        id="cek-cepat"
        className="mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-7xl scroll-mt-20 items-center px-4 py-8 sm:px-6 lg:px-8"
      >
        <QuickCheckChat />
      </section>

      <section id="panduan" className="bg-white py-14">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-teal-700">
                Panduan Pemantauan
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">
                Pertumbuhan balita perlu dilihat sebagai pola, bukan satu angka.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Gunakan hasil cek cepat sebagai tanda awal untuk lebih rutin
                mencatat pengukuran dan berkonsultasi ketika ada perubahan yang
                mengkhawatirkan.
              </p>

              <div className="mt-6 rounded-lg border border-[#ffd7c6] bg-[#fff7f2] p-5 text-sm leading-6 text-[#8b3d27]">
                Hasil skrining di aplikasi ini bukan diagnosis. Jika anak tampak
                lemas, berat badan sulit naik, atau hasil pengukuran berulang
                menunjukkan risiko, segera hubungi petugas kesehatan.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {monitoringNotes.map((note) => (
                <div
                  key={note.title}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-base font-black text-slate-950">
                    {note.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {note.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      <footer className="border-t border-teal-900/10 bg-[#eef8f2] text-slate-700">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1fr_1.15fr] lg:px-8 lg:py-12">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-teal-100 bg-white p-1.5 shadow-sm">
                <img
                  className="h-full w-full object-contain"
                  src={bantulLogo}
                  alt="Logo Kabupaten Bantul"
                />
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-teal-800">
                  Pemerintah Kabupaten Bantul
                </p>
                <p className="text-sm font-semibold text-slate-500">
                  Bantul Cegah Stunting
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-1 text-base leading-7 text-slate-600">
              {/* <p>&copy; 2026 Pemkab Bantul.</p>
              <p>All rights reserved.</p> */}
            </div>

            <div className="mt-6 flex items-center gap-3 text-teal-800">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.link}
                  target="_blank"
                  aria-label={social.name}
                  className="grid h-9 w-9 place-items-center rounded-md border border-teal-200 bg-white shadow-sm"
                  title={social.name}
                >
                  <SocialIcon icon={social.icon} />
                </a>
              ))}
            </div>
          </div>

          <div className="md:justify-self-end lg:justify-self-start">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-teal-800">
              Alamat
            </h2>
            <div className="mt-4 max-w-md space-y-5 text-base font-medium leading-7 text-slate-600">
              <address className="not-italic">
                <p className="font-black text-slate-900">PUSKESMAS SEWON II</p>
                <p>
                  JL. Parangtritis, Km. 6, Sewon, Tarudan, Bangunharjo, Kec.
                  Bantul, Kabupaten Bantul, Daerah Istimewa Yogyakarta 55188
                </p>
              </address>

              <div>
               <a href="https://pusk-sewon2.bantulkab.go.id/" className="text-teal-600 hover:text-teal-800" target="_blank" rel="noopener noreferrer">
                  pusk.sewon2@bantulkab.go.id
                </a>
                <p>(0274) xxxxxx</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
