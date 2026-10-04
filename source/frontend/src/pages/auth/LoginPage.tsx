import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import landingHero from "../../assets/landing-hero.png";
import AppLogoMark from "../../components/brand/AppLogoMark";
import {
  getErrorMessage,
  loginUser,
  roleLabels,
  type UserRole,
} from "../../services/dashboardService";
import { saveCurrentUser } from "../../utils/authSession";

const dashboardRoutes: Record<UserRole, string> = {
  admin: "/admin",
  petugas: "/petugas",
  petugas_kesehatan: "/petugas",
  orang_tua: "/orang-tua",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Email dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);
      const response = await loginUser({
        email: email.trim(),
        password,
      });
      const user = response.data.data;
      saveCurrentUser(user);

      navigate(dashboardRoutes[user.role], {
        state: {
          message: `Login sebagai ${roleLabels[user.role] ?? user.role}.`,
        },
      });
    } catch (error) {
      setMessage(getErrorMessage(error, "Login belum bisa diproses. Coba lagi."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5faf7] text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="relative hidden overflow-hidden rounded-lg border border-teal-900/10 bg-teal-900 text-white shadow-xl shadow-teal-900/10 lg:block">
          <img
            className="absolute inset-0 h-full w-full object-cover object-[82%_center]"
            src={landingHero}
            alt="Petugas kesehatan mengukur tinggi badan balita"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-teal-950/92 via-teal-900/70 to-teal-900/10" />

          <div className="relative flex h-full min-h-[calc(100vh-2.5rem)] flex-col justify-between p-8">
            <Link to="/" className="inline-flex w-fit items-center gap-3">
              <AppLogoMark className="h-10 w-10 bg-white text-teal-700" />
              <div>
                <p className="text-sm font-black">Banting</p>
                <p className="text-xs font-medium text-teal-50">
                  Bantul Cegah Stunting
                </p>
              </div>
            </Link>

            <div className="max-w-lg">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-100">
                Portal Aplikasi
              </p>
              <h1 className="mt-4 text-5xl font-black tracking-normal">
                Masuk ke aplikasi Banting.
              </h1>
              <p className="mt-5 text-base leading-8 text-teal-50">
                Gunakan akun yang sudah terdaftar untuk melanjutkan pemantauan
                dan pengelolaan data balita.
              </p>
            </div>

            <div className="max-w-lg rounded-lg border border-white/20 bg-white/10 p-5 text-sm leading-6 text-teal-50 backdrop-blur">
              Pastikan email dan password yang dimasukkan sesuai dengan akun
              yang sudah dibuat di sistem.
            </div>
          </div>
        </section>

        <section className="flex items-stretch justify-center lg:min-h-[calc(100vh-2.5rem)]">
          <div className="flex w-full max-w-xl flex-col justify-center py-6 lg:max-w-none lg:py-0">
            <Link to="/" className="mb-8 inline-flex items-center gap-3 lg:hidden">
              <AppLogoMark className="h-10 w-10 bg-teal-700 text-white" />
              <div>
                <p className="text-sm font-black text-slate-950">Banting</p>
                <p className="text-xs font-medium text-slate-500">
                  Bantul Cegah Stunting
                </p>
              </div>
            </Link>

            <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8 lg:min-h-[calc(100vh-2.5rem)] lg:px-12">
              <div className="mb-7">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-teal-700">
                  Login
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950">
                  Selamat datang kembali.
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Masukkan email dan password untuk melanjutkan ke dashboard.
                </p>
              </div>

              {typeof location.state === "object" &&
                location.state !== null &&
                "message" in location.state &&
                typeof location.state.message === "string" && (
                  <div className="mb-5 rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-800 ring-1 ring-teal-100">
                    {location.state.message}
                  </div>
                )}

            <form className="grid gap-5" onSubmit={handleSubmit}>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">Email</span>
                <input
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@email.com"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Password
                </span>
                <input
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan password"
                  required
                />
              </label>

              {message && (
                <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 ring-1 ring-amber-100">
                  {message}
                </p>
              )}

              <button
                className="rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-teal-900/10 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? "Memeriksa akun..." : "Masuk ke Dashboard"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Orang tua belum punya akun?{" "}
              <Link className="font-black text-teal-700 hover:text-teal-800" to="/register">
                Daftar di sini
              </Link>
            </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
