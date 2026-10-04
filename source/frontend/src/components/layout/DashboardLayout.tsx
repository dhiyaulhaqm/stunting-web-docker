import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { clearCurrentUser } from "../../utils/authSession";

type DashboardLayoutProps = {
  title: string;
  subtitle: string;
  eyebrow: string;
  variant?: "default" | "parent" | "officer";
  navItems?: Array<{
    label: string;
    to: string;
  }>;
  children: ReactNode;
};

export default function DashboardLayout({
  title,
  subtitle,
  eyebrow,
  variant = "default",
  navItems = [],
  children,
}: DashboardLayoutProps) {
  const isParent = variant === "parent";
  const isOfficer = variant === "officer";
  const mainClass = isParent
    ? "parent-theme mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 pb-8 pt-2 text-[#22352f] sm:px-6 lg:px-8"
    : isOfficer
      ? "mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-4 text-[#1f3340] sm:px-6 lg:px-8"
    : "mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 text-slate-800 sm:px-6 lg:px-8";
  const headerClass = isParent
    ? "rounded-lg border border-[#d8eadf] bg-[#fffefa] px-4 py-3 shadow-[0_12px_30px_rgba(35,92,72,0.08)]"
    : isOfficer
      ? "rounded-lg border border-[#d7e5ee] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(31,78,101,0.08)]"
    : "rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm backdrop-blur";
  const eyebrowClass = isParent
    ? "text-xs font-bold uppercase tracking-[0.14em] text-[#0f766e]"
    : isOfficer
      ? "text-xs font-bold uppercase tracking-[0.14em] text-[#0369a1]"
    : "text-xs font-bold uppercase tracking-[0.18em] text-emerald-700";
  const titleClass = isParent
    ? "mt-1 max-w-3xl text-xl font-bold text-[#13251f] sm:text-2xl"
    : isOfficer
      ? "mt-1 max-w-3xl text-2xl font-bold text-[#102636] sm:text-3xl"
    : "mt-2 text-3xl font-bold tracking-tight text-slate-950";
  const subtitleClass = isParent
    ? "mt-1 max-w-2xl text-sm leading-6 text-[#52645d]"
    : isOfficer
      ? "mt-2 max-w-2xl text-sm leading-6 text-[#5a6d78]"
    : "mt-2 max-w-2xl text-sm leading-6 text-slate-600";
  const headerContentClass = isParent
    ? "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
    : isOfficer
      ? "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
    : "flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between";
  const navContainerClass = isParent
    ? "flex w-full flex-wrap gap-1 rounded-lg border border-[#d8eadf] bg-[#f4faf6] p-1 sm:w-auto lg:mt-1"
    : isOfficer
      ? "flex w-full flex-wrap gap-1 rounded-lg border border-[#d7e5ee] bg-[#f3f8fb] p-1 sm:w-auto lg:mt-1"
    : "flex flex-wrap gap-2";
  const navClass = isParent
    ? "flex-1 rounded-md px-3 py-2 text-center text-sm font-semibold text-[#45635a] transition hover:bg-white hover:text-[#0f766e] sm:flex-none"
    : isOfficer
      ? "flex-1 rounded-md px-3 py-2 text-center text-sm font-semibold text-[#4d6471] transition hover:bg-white hover:text-[#0369a1] sm:flex-none"
    : "rounded-xl bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950";
  const logoutClass = isParent
    ? "flex-1 rounded-md bg-[#0f766e] px-3 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:bg-[#115e59] sm:flex-none"
    : isOfficer
      ? "flex-1 rounded-md bg-[#0369a1] px-3 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:bg-[#075985] sm:flex-none"
    : "rounded-xl bg-emerald-700 px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800";

  return (
    <main className={mainClass}>
      <header className={headerClass}>
        <div className={headerContentClass}>
          <div>
            <p className={eyebrowClass}>{eyebrow}</p>
            <h1 className={titleClass}>{title}</h1>
            <p className={subtitleClass}>{subtitle}</p>
          </div>

          <nav className={navContainerClass}>
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={navClass}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/"
              className={navClass}
            >
              Beranda
            </Link>
            <Link
              to="/login"
              className={logoutClass}
              onClick={clearCurrentUser}
            >
              Keluar
            </Link>
          </nav>
        </div>
      </header>

      {children}
    </main>
  );
}
