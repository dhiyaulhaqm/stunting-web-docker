type StatCardProps = {
  label: string;
  value: number | string;
  variant?: "default" | "parent" | "officer";
};

export default function StatCard({
  label,
  value,
  variant = "default",
}: StatCardProps) {
  const isParent = variant === "parent";
  const isOfficer = variant === "officer";

  return (
    <div
      className={
        isParent
          ? "min-w-0 rounded-lg border border-[#d8eadf] bg-[#fffefa] p-5 shadow-[0_12px_28px_rgba(35,92,72,0.07)]"
          : isOfficer
            ? "min-w-0 rounded-lg border border-[#d7e5ee] bg-white p-5 shadow-[0_12px_28px_rgba(31,78,101,0.07)]"
          : "min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      <p
        className={
          isParent
            ? "text-sm font-semibold text-[#60766e]"
            : isOfficer
              ? "text-sm font-semibold text-[#5a6d78]"
            : "text-sm font-semibold text-slate-500"
        }
      >
        {label}
      </p>
      <p
        className={
          isParent
            ? "mt-3 break-words text-3xl font-bold text-[#14352c]"
            : isOfficer
              ? "mt-3 break-words text-3xl font-bold text-[#102636]"
            : "mt-3 break-words text-3xl font-bold text-slate-950"
        }
      >
        {value}
      </p>
    </div>
  );
}
