import type { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  details?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  intent?: "danger" | "info";
  variant?: "default" | "parent" | "officer";
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  loading = false,
  intent = "danger",
  variant = "default",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  const isParent = variant === "parent";
  const isOfficer = variant === "officer";
  const panelClass = isParent
    ? "max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-[#f0d4b4] bg-[#fffefa] p-5 shadow-2xl"
    : isOfficer
      ? "max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-[#f0d4b4] bg-white p-5 shadow-2xl"
      : "max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-red-100 bg-white p-5 shadow-2xl";
  const titleClass = isParent
    ? "text-lg font-bold text-[#13251f]"
    : isOfficer
      ? "text-lg font-bold text-[#102636]"
      : "text-lg font-bold text-slate-950";
  const bodyClass = isParent
    ? "mt-2 text-sm leading-6 text-[#5e716a]"
    : isOfficer
      ? "mt-2 text-sm leading-6 text-[#5a6d78]"
      : "mt-2 text-sm leading-6 text-slate-600";
  const detailClass =
    intent === "info"
      ? isParent
        ? "mt-4 rounded-lg border border-[#cfe5db] bg-[#eef9f2] px-4 py-3 text-sm text-[#0f766e]"
        : "mt-4 rounded-lg border border-[#cbe2ef] bg-[#eef7fb] px-4 py-3 text-sm text-[#0369a1]"
      : isParent
        ? "mt-4 rounded-lg border border-[#f0d4b4] bg-[#fff7ed] px-4 py-3 text-sm text-[#8a4d16]"
        : isOfficer
          ? "mt-4 rounded-lg border border-[#f0d4b4] bg-[#fff7ed] px-4 py-3 text-sm text-[#8a4d16]"
          : "mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800";
  const cancelClass = isParent
    ? "rounded-lg border border-[#d6e4dc] bg-white px-4 py-2 text-sm font-semibold text-[#45635a] transition hover:border-[#0f766e] hover:text-[#0f766e]"
    : isOfficer
      ? "rounded-lg border border-[#d7e5ee] bg-white px-4 py-2 text-sm font-semibold text-[#4d6471] transition hover:border-[#0369a1] hover:text-[#0369a1]"
      : "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
  const confirmClass =
    intent === "info"
      ? isParent
        ? "rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-60"
        : "rounded-lg bg-[#0369a1] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#075985] disabled:cursor-not-allowed disabled:opacity-60"
      : "rounded-lg bg-[#b42318] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#912018] disabled:cursor-not-allowed disabled:opacity-60";
  const iconClass =
    intent === "info"
      ? isParent
        ? "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eef9f2] text-lg font-black text-[#0f766e]"
        : "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eef7fb] text-lg font-black text-[#0369a1]"
      : "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff4f2] text-lg font-black text-[#b42318]";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 px-4 py-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div className={panelClass}>
        <div className="flex gap-3">
          <div className={iconClass}>
            {intent === "info" ? "i" : "!"}
          </div>
          <div>
            <h2 id="confirm-dialog-title" className={titleClass}>
              {title}
            </h2>
            <p id="confirm-dialog-description" className={bodyClass}>
              {description}
            </p>
          </div>
        </div>

        {details && <div className={`${detailClass} break-words`}>{details}</div>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className={cancelClass}
            type="button"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={confirmClass}
            type="button"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Menghapus..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
