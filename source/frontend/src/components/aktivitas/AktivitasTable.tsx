import type { ReactNode } from "react";
import { type AktivitasUser } from "../../services/dashboardService";
import {
  formatActivityLabel,
  formatCodeLabel,
  formatDateTime,
} from "../../utils/format";
import Panel from "../ui/Panel";

type AktivitasTableProps = {
  data: AktivitasUser[];
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  showUserId?: boolean;
  userNamesById?: Record<number, string>;
  variant?: "default" | "officer";
};

export default function AktivitasTable({
  data,
  title = "Monitoring Aktivitas User",
  description = "Jejak aktivitas dari input data, upload, prediksi, laporan, dan user.",
  action,
  compact = false,
  showUserId = false,
  userNamesById = {},
  variant = "default",
}: AktivitasTableProps) {
  const isOfficer = variant === "officer";
  const columnCount = compact ? 3 : showUserId ? 5 : 4;
  const getUserLabel = (idUser?: number | null) => {
    if (!idUser) return "-";

    return userNamesById[idUser] ?? `User #${idUser}`;
  };

  return (
    <Panel
      variant={variant}
      title={title}
      description={description}
      action={action}
    >
      <div className="min-w-0 max-w-full overflow-x-auto">
        <table className={`${compact ? "min-w-[560px]" : "min-w-[760px]"} w-full border-collapse text-left`}>
          <thead>
            <tr
              className={
                isOfficer
                  ? "border-b border-[#d7e5ee] text-xs uppercase tracking-wide text-[#5a6d78]"
                  : "border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"
              }
            >
              {showUserId && !compact && <th className="px-3 py-3">User</th>}
              <th className="px-3 py-3">Modul</th>
              <th className="px-3 py-3">Aktivitas</th>
              {!compact && <th className="px-3 py-3">Deskripsi</th>}
              <th className="px-3 py-3">Waktu</th>
            </tr>
          </thead>
          <tbody
            className={
              isOfficer
                ? "divide-y divide-[#e4edf3] text-sm text-[#354d5a]"
                : "divide-y divide-slate-100 text-sm text-slate-700"
            }
          >
            {data.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={columnCount}>
                  Belum ada aktivitas.
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id_aktivitas}>
                  {showUserId && !compact && (
                    <td className={isOfficer ? "px-3 py-4 font-medium text-[#102636]" : "px-3 py-4 font-medium text-slate-900"}>
                      {getUserLabel(item.id_user)}
                    </td>
                  )}
                  <td className="px-3 py-4">
                    <span
                      className={
                        isOfficer
                          ? "inline-flex rounded-full bg-[#eef7fb] px-3 py-1 text-xs font-bold text-[#0369a1]"
                          : "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                      }
                    >
                      {formatCodeLabel(item.modul)}
                    </span>
                  </td>
                  <td className={isOfficer ? "px-3 py-4 font-medium text-[#102636]" : "px-3 py-4 font-medium text-slate-900"}>
                    {formatActivityLabel(item.aktivitas)}
                  </td>
                  {!compact && <td className="px-3 py-4">{item.deskripsi ?? "-"}</td>}
                  <td className="px-3 py-4">{formatDateTime(item.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
