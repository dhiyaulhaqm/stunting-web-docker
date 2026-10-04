import type { ReactNode } from "react";

type PanelProps = {
  title: string;
  description?: string;
  variant?: "default" | "parent" | "officer";
  action?: ReactNode;
  children: ReactNode;
};

export default function Panel({
  title,
  description,
  variant = "default",
  action,
  children,
}: PanelProps) {
  const isParent = variant === "parent";
  const isOfficer = variant === "officer";

  return (
    <section
      className={
        isParent
          ? "min-w-0 max-w-full rounded-lg border border-[#d8eadf] bg-[#fffefa] p-5 shadow-[0_12px_28px_rgba(35,92,72,0.07)]"
          : isOfficer
            ? "min-w-0 max-w-full rounded-lg border border-[#d7e5ee] bg-white p-5 shadow-[0_12px_28px_rgba(31,78,101,0.07)]"
          : "min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            className={
              isParent
                ? "text-lg font-bold text-[#13251f]"
                : isOfficer
                  ? "text-lg font-bold text-[#102636]"
                : "text-lg font-bold text-slate-950"
            }
          >
            {title}
          </h2>
          {description && (
            <p
              className={
                isParent
                  ? "mt-1 text-sm leading-6 text-[#5e716a]"
                  : isOfficer
                    ? "mt-1 text-sm leading-6 text-[#5a6d78]"
                  : "mt-1 text-sm leading-6 text-slate-500"
              }
            >
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
