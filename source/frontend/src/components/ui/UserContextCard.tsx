import { roleLabels, type User } from "../../services/dashboardService";

type UserContextCardProps = {
  user: User | null;
  emptyMessage: string;
  variant?: "default" | "parent" | "officer";
};

export default function UserContextCard({
  user,
  emptyMessage,
  variant = "default",
}: UserContextCardProps) {
  const isParent = variant === "parent";
  const isOfficer = variant === "officer";

  if (!user) {
    return (
      <div
        className={
          isParent
            ? "min-w-0 break-words rounded-lg border border-dashed border-[#c9ddd3] bg-[#fffefa] p-5 text-sm text-[#5e716a]"
            : isOfficer
              ? "min-w-0 break-words rounded-lg border border-dashed border-[#bdd5e3] bg-white p-5 text-sm text-[#5a6d78]"
            : "min-w-0 break-words rounded-2xl border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-600"
        }
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={
        isParent
          ? "min-w-0 rounded-lg border border-[#cfe5db] bg-[#eef9f2] p-5 shadow-[0_12px_28px_rgba(35,92,72,0.06)]"
          : isOfficer
            ? "min-w-0 rounded-lg border border-[#cbe2ef] bg-[#eef7fb] p-5 shadow-[0_12px_28px_rgba(31,78,101,0.06)]"
          : "min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50 p-5"
      }
    >
      <p
        className={
          isParent
            ? "text-xs font-bold uppercase tracking-[0.14em] text-[#0f766e]"
            : isOfficer
              ? "text-xs font-bold uppercase tracking-[0.14em] text-[#0369a1]"
            : "text-xs font-bold uppercase tracking-[0.14em] text-emerald-700"
        }
      >
        Profil Aktif
      </p>
      <p
        className={
          isParent
            ? "mt-2 break-words text-xl font-bold text-[#13251f]"
            : isOfficer
              ? "mt-2 break-words text-xl font-bold text-[#102636]"
            : "mt-2 break-words text-xl font-bold text-slate-950"
        }
      >
        {user.nama}
      </p>
      <p
        className={
          isParent
            ? "break-words text-sm text-[#60766e]"
            : isOfficer
              ? "break-words text-sm text-[#5a6d78]"
              : "break-words text-sm text-slate-600"
        }
      >
        {user.email}
      </p>
      <p
        className={
          isParent
            ? "mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0f766e]"
            : isOfficer
              ? "mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0369a1]"
            : "mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700"
        }
      >
        {roleLabels[user.role] ?? user.role}
      </p>
    </div>
  );
}
