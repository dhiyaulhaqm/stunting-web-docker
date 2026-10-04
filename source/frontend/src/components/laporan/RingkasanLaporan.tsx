import { useState } from "react";
import {
  createAktivitasUser,
  getRiwayatPrediksi,
  type LaporanRingkasan,
  type Prediksi,
} from "../../services/dashboardService";
import ConfirmDialog from "../ui/ConfirmDialog";
import Panel from "../ui/Panel";

type RingkasanLaporanProps = {
  data: LaporanRingkasan;
  idUser?: number;
  actorUserId?: number;
  riwayat?: Prediksi[];
  reportMonth?: string;
  variant?: "default" | "officer";
};

type TargetStatus = {
  label: string;
  value: number;
  percentage: number;
  colorClass: string;
  barClass: string;
};

type ReportValue = string | number | null | undefined;

type ExcelSection = {
  title: string;
  rows: ReportValue[][];
};

const percent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const formatPercent = (value: number) => `${value}%`;

const measurementTime = (item: Prediksi) =>
  item.pengukuran?.tanggal_pengukuran ??
  item.pengukuran?.created_at ??
  item.created_at;

const measurementMonth = (item: Prediksi) => measurementTime(item)?.slice(0, 7);

const formatReportMonth = (value?: string) => {
  if (!value) return "Belum ada data";

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}-01T00:00:00`));
};

const formatReportDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const sanitizeFileName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const escapeHtml = (value: ReportValue) => {
  const text = value === null || value === undefined ? "" : String(value);

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const sectionToTable = (section: ExcelSection) => `
  <h2>${escapeHtml(section.title)}</h2>
  <table>
    ${section.rows
      .map(
        (row) => `
          <tr>
            ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
          </tr>
        `
      )
      .join("")}
  </table>
`;

const downloadExcelFile = (fileName: string, sections: ExcelSection[]) => {
  const excelContent = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { font-size: 18px; }
          h2 { margin-top: 24px; font-size: 14px; }
          table { border-collapse: collapse; margin-bottom: 16px; }
          td { border: 1px solid #999; padding: 6px 10px; mso-number-format:"\\@"; }
          tr:first-child td { font-weight: bold; background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>Laporan Klasifikasi Normal dan Stunting</h1>
        ${sections.map(sectionToTable).join("")}
      </body>
    </html>
  `;
  const blob = new Blob([excelContent], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const isNormalStatus = (status?: string | null) =>
  status?.toLowerCase().trim() === "normal";

const isStuntingStatus = (status?: string | null) =>
  status?.toLowerCase().trim() === "stunting";

const isTargetStatus = (status?: string | null) =>
  isNormalStatus(status) || isStuntingStatus(status);

const getPredictionTimeValue = (item: Prediksi) => {
  const time = measurementTime(item);
  return time ? Date.parse(time) || 0 : 0;
};

const getAnakKey = (item: Prediksi) => {
  if (item.anak?.id_anak) return `anak-${item.anak.id_anak}`;
  if (item.anak?.nik) return `nik-${item.anak.nik}`;
  if (item.anak?.nama) return `nama-${item.anak.nama.toLowerCase().trim()}`;

  return `prediksi-${item.id_prediksi}`;
};

const getLatestReportMonth = (riwayat: Prediksi[]) =>
  riwayat
    .map(measurementMonth)
    .filter((month): month is string => Boolean(month))
    .sort()
    .at(-1);

const getMonthlyUniqueTargets = (riwayat: Prediksi[], selectedMonth?: string) => {
  const reportMonth = selectedMonth || getLatestReportMonth(riwayat);
  const uniqueByAnak = new Map<string, Prediksi>();

  if (!reportMonth) {
    return {
      reportMonth,
      checkedAnak: [],
      targetAnak: [],
      normalCount: 0,
      stuntingCount: 0,
    };
  }

  riwayat
    .filter((item) => measurementMonth(item) === reportMonth)
    .forEach((item) => {
      const key = getAnakKey(item);
      const current = uniqueByAnak.get(key);

      if (
        !current ||
        getPredictionTimeValue(item) > getPredictionTimeValue(current) ||
        (getPredictionTimeValue(item) === getPredictionTimeValue(current) &&
          item.id_prediksi > current.id_prediksi)
      ) {
        uniqueByAnak.set(key, item);
      }
    });

  const checkedAnak = Array.from(uniqueByAnak.values());
  const targetAnak = checkedAnak.filter((item) => isTargetStatus(item.status_gizi));

  return {
    reportMonth,
    checkedAnak,
    targetAnak,
    normalCount: targetAnak.filter((item) => isNormalStatus(item.status_gizi))
      .length,
    stuntingCount: targetAnak.filter((item) => isStuntingStatus(item.status_gizi))
      .length,
  };
};

const getLatestCheckedAnak = (riwayat: Prediksi[], selectedMonth?: string) =>
  getMonthlyUniqueTargets(riwayat, selectedMonth).checkedAnak;

const getWilayahComparison = (riwayat: Prediksi[] = []) => {
  const wilayahMap = new Map<
    string,
    { wilayah: string; normal: number; stunting: number; total: number }
  >();

  riwayat.forEach((item) => {
    const wilayah =
      item.anak?.kelurahan_desa?.trim() ||
      item.anak?.alamat?.trim() ||
      "Wilayah belum diisi";
    const current = wilayahMap.get(wilayah) ?? {
      wilayah,
      normal: 0,
      stunting: 0,
      total: 0,
    };

    if (isNormalStatus(item.status_gizi)) {
      current.normal += 1;
    }

    if (isStuntingStatus(item.status_gizi)) {
      current.stunting += 1;
    }

    current.total += 1;
    wilayahMap.set(wilayah, current);
  });

  return Array.from(wilayahMap.values()).sort((left, right) => {
    if (right.stunting !== left.stunting) return right.stunting - left.stunting;
    if (right.total !== left.total) return right.total - left.total;

    return left.wilayah.localeCompare(right.wilayah, "id-ID");
  });
};

export default function RingkasanLaporan({
  data,
  idUser,
  actorUserId = idUser,
  riwayat = [],
  reportMonth,
  variant = "default",
}: RingkasanLaporanProps) {
  const isOfficer = variant === "officer";
  const [priorityListOpen, setPriorityListOpen] = useState(false);
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);
  const localMonthlySummary = getMonthlyUniqueTargets(riwayat, reportMonth);
  const serverHasMonthlySummary = Boolean(data.bulan_laporan);
  const reportMonthValue = data.bulan_laporan ?? localMonthlySummary.reportMonth;
  const checkedAnakCount =
    data.anak_dicek_bulan ?? localMonthlySummary.checkedAnak.length;
  const totalTarget =
    data.target_terklasifikasi_bulan ?? localMonthlySummary.targetAnak.length;
  const totalBelumTarget =
    data.belum_target_bulan ??
    Math.max(localMonthlySummary.checkedAnak.length - totalTarget, 0);
  const normalCount = data.normal_bulan ?? localMonthlySummary.normalCount;
  const stuntingCount = data.stunting_bulan ?? localMonthlySummary.stuntingCount;
  const normalPercentage = percent(normalCount, totalTarget);
  const stuntingPercentage = percent(stuntingCount, totalTarget);
  const wilayahComparison =
    data.wilayah_perbandingan ?? getWilayahComparison(localMonthlySummary.targetAnak);
  const stuntingAnak =
    data.prioritas_stunting ??
    localMonthlySummary.targetAnak.filter((item) =>
      isStuntingStatus(item.status_gizi)
    );
  const statusDominan =
    data.status_dominan_bulan ??
    (stuntingCount > normalCount
      ? "Stunting"
      : normalCount > 0
        ? "Normal"
        : "-");
  const fallbackReviewCount = data.fallback_review_count ?? 0;
  const targetStatus: TargetStatus[] = [
    {
      label: "Normal",
      value: normalCount,
      percentage: normalPercentage,
      colorClass: "text-emerald-700",
      barClass: "bg-emerald-500",
    },
    {
      label: "Stunting",
      value: stuntingCount,
      percentage: stuntingPercentage,
      colorClass: "text-rose-700",
      barClass: "bg-rose-500",
    },
  ];
  const downloadButtonClass = isOfficer
    ? "inline-flex rounded-lg border border-[#cbe2ef] bg-[#eef7fb] px-4 py-2 text-sm font-bold text-[#0369a1] transition hover:bg-white"
    : "inline-flex rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100";
  const summaryPanelClass = isOfficer
    ? "rounded-lg border border-[#d7e5ee] bg-[#f3f8fb] p-5"
    : "rounded-2xl border border-slate-200 bg-slate-50 p-5";
  const neutralPanelClass = isOfficer
    ? "rounded-lg border border-[#d7e5ee] bg-white p-5"
    : "rounded-2xl border border-slate-200 bg-white p-5";
  const labelClass = isOfficer
    ? "text-sm font-semibold text-[#5a6d78]"
    : "text-sm font-semibold text-slate-500";
  const valueClass = isOfficer
    ? "mt-2 text-3xl font-bold text-[#102636]"
    : "mt-2 text-3xl font-bold text-slate-950";
  const headingClass = isOfficer
    ? "text-sm font-bold text-[#102636]"
    : "text-sm font-bold text-slate-950";
  const bodyClass = isOfficer
    ? "text-sm leading-6 text-[#5a6d78]"
    : "text-sm leading-6 text-slate-600";
  const handleDownloadLaporan = async () => {
    const reportMonthLabel = formatReportMonth(reportMonthValue);
    const fileMonth = sanitizeFileName(reportMonthValue || "tanpa-bulan");
    let detailSource = localMonthlySummary.checkedAnak;

    if (serverHasMonthlySummary && reportMonthValue) {
      const response = await getRiwayatPrediksi({
        ...(idUser ? { idUser } : {}),
        bulan: reportMonthValue,
      });
      detailSource = getLatestCheckedAnak(response.data.data, reportMonthValue);
    }

    const detailRows = detailSource.map((item) => {
      const wilayah =
        item.anak?.kelurahan_desa?.trim() ||
        item.anak?.alamat?.trim() ||
        "Wilayah belum diisi";

      return [
        reportMonthLabel,
        item.anak?.nama,
        item.anak?.nik,
        item.anak?.jenis_kelamin,
        wilayah,
        item.pengukuran?.umur_bulan,
        item.pengukuran?.berat_badan,
        item.pengukuran?.tinggi_badan,
        item.detail?.indikator_z_score?.z_score,
        item.detail?.indikator_z_score?.kategori,
        item.status_gizi,
        formatReportDate(measurementTime(item)),
      ];
    });
    const sections: ExcelSection[] = [
      {
        title: "Ringkasan",
        rows: [
          ["Item", "Nilai", "Persentase"],
          ["Bulan Laporan", reportMonthLabel, ""],
          ["Total Anak Terdata", data.total_anak, ""],
          ["Total Anak Bulan Ini", checkedAnakCount, ""],
          ["Baris Detail Anak Terbaru", detailSource.length, ""],
          ["Target Terklasifikasi", totalTarget, ""],
          ["Normal", normalCount, formatPercent(normalPercentage)],
          ["Stunting", stuntingCount, formatPercent(stuntingPercentage)],
          ["Perlu Review Fallback", fallbackReviewCount, ""],
        ],
      },
      {
        title: "Perbandingan Wilayah",
        rows: [
          ["Wilayah", "Normal", "Stunting", "Total", "Persentase Stunting"],
          ...wilayahComparison.map((item) => [
            item.wilayah,
            item.normal,
            item.stunting,
            item.total,
            formatPercent(percent(item.stunting, item.total)),
          ]),
        ],
      },
      {
        title: "Detail Anak Terbaru Bulan",
        rows: [
          [
            "Bulan Laporan",
            "Nama Anak",
            "NIK",
            "Jenis Kelamin",
            "Wilayah",
            "Umur Bulan",
            "Berat Badan",
            "Tinggi Badan",
            "Z-Score TB/U",
            "Kategori TB/U",
            "Status Gizi",
            "Tanggal Pengukuran",
          ],
          ...detailRows,
        ],
      },
    ];

    try {
      await createAktivitasUser({
        id_user: actorUserId,
        aktivitas: "unduh_laporan_klasifikasi",
        modul: "laporan",
        deskripsi: `Unduh laporan klasifikasi ${reportMonthLabel}`,
      });
    } catch (error) {
      console.error(error);
    }

    downloadExcelFile(`laporan-klasifikasi-${fileMonth}.xls`, sections);
  };

  return (
    <Panel
      variant={variant}
      title="Laporan Klasifikasi & Prioritas"
      description="Fokus laporan pada dua target klasifikasi utama: normal dan stunting."
      action={
        <button
          className={downloadButtonClass}
          type="button"
          onClick={() => setDownloadConfirmOpen(true)}
        >
          Unduh Excel
        </button>
      }
    >
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className={`${summaryPanelClass} min-w-0`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className={labelClass}>Total Anak</p>
              <p className={valueClass}>
                {data.total_anak}
              </p>
            </div>
            <div>
              <p className={labelClass}>
                Target Terklasifikasi
              </p>
              <p className={valueClass}>
                {totalTarget}
              </p>
              <p
                className={
                  isOfficer
                    ? "mt-1 text-xs font-semibold text-[#6f8794]"
                    : "mt-1 text-xs font-semibold text-slate-500"
                }
              >
                {formatReportMonth(reportMonthValue)}
              </p>
            </div>
            <div>
              <p className={labelClass}>
                Status Dominan
              </p>
              <p className={isOfficer ? "mt-2 break-words text-3xl font-bold text-[#102636]" : "mt-2 break-words text-3xl font-bold text-slate-950"}>
                {statusDominan}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {targetStatus.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-sm font-bold ${item.colorClass}`}>
                      {item.label}
                    </p>
                    <p className={isOfficer ? "text-xs text-[#6f8794]" : "text-xs text-slate-500"}>
                      {item.value} anak dari {totalTarget || 0} target
                    </p>
                  </div>
                  <p className={isOfficer ? "text-lg font-bold text-[#102636]" : "text-lg font-bold text-slate-950"}>
                    {formatPercent(item.percentage)}
                  </p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${item.barClass}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="relative min-w-0 rounded-2xl border border-rose-100 bg-rose-50">
            <button
              className="w-full rounded-2xl p-5 text-left outline-none transition hover:bg-rose-100/40 focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              disabled={stuntingAnak.length === 0}
              onClick={() => setPriorityListOpen((current) => !current)}
              aria-expanded={priorityListOpen}
              aria-label="Tampilkan daftar anak prioritas stunting"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-rose-700">
                    Prioritas Tindak Lanjut
                  </p>
                  <p className="mt-3 text-4xl font-bold text-rose-950">
                    {stuntingCount}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-rose-700">
                  {stuntingAnak.length} anak
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-rose-800">
                Anak masuk target stunting dan perlu menjadi prioritas validasi
                serta pemantauan lanjutan.
              </p>
            </button>

            {priorityListOpen && stuntingAnak.length > 0 && (
              <div className="absolute left-4 right-4 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-lg border border-rose-100 bg-white p-2 shadow-xl">
                {stuntingAnak.map((item) => (
                  <div
                    key={item.id_prediksi}
                    className="rounded-lg px-3 py-2 hover:bg-rose-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">
                          {item.anak?.nama ?? "Nama belum diisi"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-600">
                          {item.anak?.kelurahan_desa ||
                            item.anak?.alamat ||
                            "Wilayah belum diisi"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                        Stunting
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                      <span>Umur: {item.pengukuran?.umur_bulan ?? "-"} bulan</span>
                      <span>BB: {item.pengukuran?.berat_badan ?? "-"} kg</span>
                      <span>TB: {item.pengukuran?.tinggi_badan ?? "-"} cm</span>
                    </div>
                    {item.detail?.indikator_z_score && (
                      <p className="mt-2 text-xs font-semibold text-rose-700">
                        Z-Score TB/U: {item.detail.indikator_z_score.z_score} (
                        {item.detail.indikator_z_score.kategori})
                      </p>
                    )}
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Pengukuran: {formatReportDate(measurementTime(item))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${neutralPanelClass} min-w-0`}>
            <p className={headingClass}>
              Catatan Data Saat Ini
            </p>
            <div className={`mt-3 grid gap-2 ${bodyClass}`}>
              <p>
                {normalCount} anak masuk target normal dan {stuntingCount} anak
                masuk target stunting pada {formatReportMonth(reportMonthValue)}.
              </p>
              {totalBelumTarget > 0 && (
                <p>
                  {totalBelumTarget} anak di bulan laporan belum masuk dua
                  target utama dan dapat disesuaikan saat data klasifikasi final
                  sudah siap.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <div className={`${neutralPanelClass} min-w-0`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={headingClass}>
                Grafik Perbandingan Wilayah
              </p>
              <p className={isOfficer ? "mt-1 text-xs leading-5 text-[#6f8794]" : "mt-1 text-xs leading-5 text-slate-500"}>
                Komposisi normal dan stunting antar wilayah pada bulan laporan.
              </p>
            </div>
            <span className={isOfficer ? "shrink-0 rounded-full bg-[#f3f8fb] px-3 py-1 text-xs font-bold text-[#0369a1]" : "shrink-0 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700"}>
              {wilayahComparison.length} wilayah
            </span>
          </div>
          {wilayahComparison.length > 0 ? (
            <div className="mt-5 grid gap-4">
              <div className={isOfficer ? "flex flex-wrap gap-3 text-xs font-bold text-[#6f8794]" : "flex flex-wrap gap-3 text-xs font-bold text-slate-500"}>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Normal
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Stunting
                </span>
              </div>
              <div className="grid max-h-80 gap-4 overflow-y-auto pr-1">
              {wilayahComparison.map((item, index) => (
                <div
                  key={item.wilayah}
                  className="grid gap-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className={isOfficer ? "min-w-0 truncate text-sm font-bold text-[#102636]" : "min-w-0 truncate text-sm font-bold text-slate-950"}>
                      {index + 1}. {item.wilayah}
                    </p>
                    <span className={isOfficer ? "shrink-0 text-sm font-bold text-[#314b5a]" : "shrink-0 text-sm font-bold text-slate-700"}>
                      {item.total} anak
                    </span>
                  </div>
                  <div className="grid gap-1">
                    <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                      {item.normal > 0 && (
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${percent(item.normal, item.total)}%`,
                          }}
                        />
                      )}
                      {item.stunting > 0 && (
                        <div
                          className="h-full bg-rose-500"
                          style={{
                            width: `${percent(item.stunting, item.total)}%`,
                          }}
                        />
                      )}
                    </div>
                    <div className={isOfficer ? "flex items-center justify-between gap-3 text-xs font-semibold text-[#6f8794]" : "flex items-center justify-between gap-3 text-xs font-semibold text-slate-500"}>
                      <span>
                        Normal {item.normal} ({formatPercent(percent(item.normal, item.total))})
                      </span>
                      <span className="text-rose-700">
                        Stunting {item.stunting} ({formatPercent(percent(item.stunting, item.total))})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <p className={isOfficer ? "mt-4 rounded-lg bg-[#f3f8fb] px-4 py-3 text-sm leading-6 text-[#5a6d78]" : "mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500"}>
              Belum ada data wilayah untuk bulan laporan ini.
            </p>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={downloadConfirmOpen}
        intent="info"
        variant={variant}
        title="Unduh laporan Excel?"
        description="Laporan klasifikasi akan dibuat dari data yang sedang tampil pada bulan laporan ini."
        details={
          <>
            <strong>{formatReportMonth(reportMonthValue)}</strong>
            <br />
            Target: {totalTarget} anak | Normal: {normalCount} | Stunting:{" "}
            {stuntingCount}
          </>
        }
        confirmLabel="Unduh Excel"
        onCancel={() => setDownloadConfirmOpen(false)}
        onConfirm={() => {
          void handleDownloadLaporan();
          setDownloadConfirmOpen(false);
        }}
      />
    </Panel>
  );
}
