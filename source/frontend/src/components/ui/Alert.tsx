import type { ReactNode } from "react";

export default function Alert({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "parent" | "officer";
}) {
  const isParent = variant === "parent";
  const isOfficer = variant === "officer";

  return (
    <div
      className={
        isParent
          ? "rounded-lg border border-[#f0d4b4] bg-[#fff7ed] px-4 py-3 text-sm text-[#8a4d16]"
          : isOfficer
            ? "rounded-lg border border-[#f0d4b4] bg-[#fff7ed] px-4 py-3 text-sm text-[#8a4d16]"
          : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      }
    >
      {children}
    </div>
  );
}
