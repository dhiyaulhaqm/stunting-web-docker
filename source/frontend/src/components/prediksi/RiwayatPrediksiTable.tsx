import { Fragment, type ReactNode, useState } from "react";
import {
  type PaginationMeta,
  type Prediksi,
  type RiwayatFilterOptions,
} from "../../services/dashboardService";
import { formatDate, formatDateTime } from "../../utils/format";
import Panel from "../ui/Panel";

type RiwayatPrediksiTableProps = {
  data: Prediksi[];
  graphData?: Prediksi[];
  graphHistoryLimit?: number;
  actionPrefix?: ReactNode;
  variant?: "default" | "parent" | "officer";
  deletingPrediksiId?: number | null;
  enableFilters?: boolean;
  bulanFilter?: string;
  onDelete?: (item: Prediksi) => void;
  onBulanFilterChange?: (bulan: string) => void;
  showNik?: boolean;
  showLocation?: boolean;
  showRowNumber?: boolean;
  serverMode?: boolean;
  pagination?: PaginationMeta;
  filterValues?: {
    q: string;
    bulan: string;
    kelurahanDesa: string;
    statusGizi: string;
  };
  filterOptions?: RiwayatFilterOptions;
  onServerFilterChange?: (values: {
    q: string;
    bulan: string;
    kelurahanDesa: string;
    statusGizi: string;
  }) => void;
  sortValues?: {
    sortBy: SortKey;
    sortDir: SortDirection;
  };
  onServerSortChange?: (values: {
    sortBy: SortKey;
    sortDir: SortDirection;
  }) => void;
  onPageChange?: (page: number) => void;
  note?: string;
  emptyMessage?: string;
};

type ChartPoint = {
  label: string;
  x: number;
  y: number;
};

export type SortKey =
  | "nama"
  | "alamat"
  | "kelurahan_desa"
  | "jenis_kelamin"
  | "umur_bulan"
  | "berat_badan"
  | "tinggi_badan"
  | "z_score_tbu"
  | "status_gizi"
  | "tanggal_pengukuran";

export type SortDirection = "asc" | "desc";

const measurementTime = (item: Prediksi) =>
  item.pengukuran?.tanggal_pengukuran ??
  item.pengukuran?.created_at ??
  item.created_at;

const formatMeasurementTime = (item: Prediksi) => {
  const value = measurementTime(item);

  if (!value) return "-";

  return value.includes("T") ? formatDateTime(value) : formatDate(value);
};

const measurementMonth = (item: Prediksi) => measurementTime(item)?.slice(0, 7);

const formatMonth = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}-01T00:00:00`));

const getChartPoints = (
  data: Prediksi[],
  field: "berat_badan" | "tinggi_badan"
): ChartPoint[] =>
  data
    .filter((item) => item.pengukuran)
    .slice()
    .sort((left, right) => {
      const leftTime = measurementTime(left) ?? "";
      const rightTime = measurementTime(right) ?? "";
      return leftTime.localeCompare(rightTime);
    })
    .map((item) => ({
      label: `${item.pengukuran?.umur_bulan ?? 0} bln`,
      x: item.pengukuran?.umur_bulan ?? 0,
      y: item.pengukuran?.[field] ?? 0,
    }));

const sortByMeasurementProgress = (left: Prediksi, right: Prediksi) => {
  const leftTime = measurementTime(left) ?? "";
  const rightTime = measurementTime(right) ?? "";
  const timeCompare = leftTime.localeCompare(rightTime);

  if (timeCompare !== 0) {
    return timeCompare;
  }

  return left.id_prediksi - right.id_prediksi;
};

const getSortValue = (item: Prediksi, key: SortKey) => {
  if (key === "nama") return item.anak?.nama ?? "";
  if (key === "alamat") return item.anak?.alamat ?? "";
  if (key === "kelurahan_desa") return item.anak?.kelurahan_desa ?? "";
  if (key === "jenis_kelamin") return item.anak?.jenis_kelamin ?? "";
  if (key === "umur_bulan") return item.pengukuran?.umur_bulan ?? null;
  if (key === "berat_badan") return item.pengukuran?.berat_badan ?? null;
  if (key === "tinggi_badan") return item.pengukuran?.tinggi_badan ?? null;
  if (key === "z_score_tbu") return item.detail?.indikator_z_score?.z_score ?? null;
  if (key === "status_gizi") return item.status_gizi ?? "";

  const time = measurementTime(item);
  return time ? Date.parse(time) : null;
};

const isEmptySortValue = (value: string | number | null) =>
  value === null || value === "";

const compareSortValues = (
  left: Prediksi,
  right: Prediksi,
  key: SortKey,
  direction: SortDirection
) => {
  const leftValue = getSortValue(left, key);
  const rightValue = getSortValue(right, key);
  const leftEmpty = isEmptySortValue(leftValue);
  const rightEmpty = isEmptySortValue(rightValue);

  if (leftEmpty && rightEmpty) return left.id_prediksi - right.id_prediksi;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;

  const result =
    typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), "id-ID", {
          sensitivity: "base",
          numeric: true,
        });

  if (result === 0) {
    return left.id_prediksi - right.id_prediksi;
  }

  return direction === "asc" ? result : -result;
};

const formatZScore = (item: Prediksi) => {
  const zScore = item.detail?.indikator_z_score;

  if (!zScore) return "-";

  return zScore.z_score > 0 ? `+${zScore.z_score}` : String(zScore.z_score);
};

const getReviewMessage = (item: Prediksi) =>
  item.detail?.requires_review
    ? item.detail.review_message ??
      "Hasil prediksi perlu ditinjau petugas kesehatan."
    : "";

function MiniLineChart({
  title,
  unit,
  valueSuffix,
  color,
  points,
  variant = "default",
}: {
  title: string;
  unit: string;
  valueSuffix: string;
  color: string;
  points: ChartPoint[];
  variant?: "default" | "parent" | "officer";
}) {
  const isParent = variant === "parent";
  const isOfficer = variant === "officer";
  const width = 560;
  const height = 260;
  const padding = { top: 24, right: 24, bottom: 62, left: 58 };
  const drawableWidth = width - padding.left - padding.right;
  const drawableHeight = height - padding.top - padding.bottom;
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const xMinRaw = Math.min(...xValues);
  const xMaxRaw = Math.max(...xValues);
  const hasSingleX = xMinRaw === xMaxRaw;
  const xMin = hasSingleX ? Math.max(0, xMinRaw - 1) : xMinRaw;
  const xMax = hasSingleX ? xMaxRaw + 1 : xMaxRaw;
  const yMinRaw = Math.min(...yValues, 0);
  const yMaxRaw = Math.max(...yValues, 1);
  const yPadding = Math.max((yMaxRaw - yMinRaw) * 0.12, 1);
  const yMin = Math.max(0, yMinRaw - yPadding);
  const yMax = yMaxRaw + yPadding;
  const yTickCount = 5;
  const xTickCount = Math.min(6, Math.max(2, xMax - xMin + 1));
  const yTicks = Array.from({ length: yTickCount }, (_, index) => {
    const ratio = index / (yTickCount - 1);
    return yMax - (yMax - yMin) * ratio;
  });
  const xTicks = Array.from({ length: xTickCount }, (_, index) => {
    if (xTickCount === 1) return xMin;

    return xMin + ((xMax - xMin) / (xTickCount - 1)) * index;
  });

  const getX = (value: number, index: number) => {
    if (xMax === xMin) {
      return points.length === 1
        ? padding.left + drawableWidth / 2
        : padding.left + (drawableWidth / (points.length - 1)) * index;
    }

    return padding.left + ((value - xMin) / (xMax - xMin)) * drawableWidth;
  };

  const getY = (value: number) =>
    padding.top + drawableHeight - ((value - yMin) / (yMax - yMin)) * drawableHeight;

  const pathPoints = points
    .map((point, index) => `${getX(point.x, index)},${getY(point.y)}`)
    .join(" ");

  return (
    <div
      className={
        isParent
          ? "min-w-0 rounded-lg border border-[#d8eadf] bg-[#fffefa] p-4"
          : isOfficer
            ? "min-w-0 rounded-lg border border-[#d7e5ee] bg-white p-4"
          : "min-w-0 rounded-xl border border-slate-200 p-4"
      }
    >
      <div className="mb-3 flex flex-col items-start gap-1 text-left">
        <h3
          className={
            isParent
              ? "text-sm font-bold text-[#13251f]"
              : isOfficer
                ? "text-sm font-bold text-[#102636]"
              : "text-sm font-bold text-slate-900"
          }
        >
          {title}
        </h3>
        <span
          className={
            isParent
              ? "text-xs font-semibold text-[#60766e]"
              : isOfficer
                ? "text-xs font-semibold text-[#5a6d78]"
              : "text-xs font-semibold text-slate-500"
          }
        >
          {unit}
        </span>
      </div>
      {points.length === 0 ? (
        <div
          className={
            isParent
              ? "grid h-[260px] place-items-center rounded-lg bg-[#f4faf6] text-sm text-[#60766e]"
              : isOfficer
                ? "grid h-[260px] place-items-center rounded-lg bg-[#f3f8fb] text-sm text-[#5a6d78]"
              : "grid h-[260px] place-items-center rounded-lg bg-slate-50 text-sm text-slate-500"
          }
        >
          Belum ada data pengukuran.
        </div>
      ) : (
        <svg
          className="h-[260px] w-full"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          aria-label={title}
        >
          <rect
            x={padding.left}
            y={padding.top}
            width={drawableWidth}
            height={drawableHeight}
            fill={isParent ? "#f4faf6" : isOfficer ? "#f3f8fb" : "#f8fafc"}
            rx="10"
          />
          {yTicks.map((tick) => {
            const y = getY(tick);

            return (
              <g key={`y-${tick.toFixed(2)}`}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px]"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}
          {xTicks.map((tick, index) => {
            const x = getX(tick, index);

            return (
              <g key={`x-${tick.toFixed(2)}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={padding.top}
                  y2={height - padding.bottom}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 22}
                  textAnchor="middle"
                  className="fill-slate-500 text-[11px]"
                >
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}
          <line
            x1={padding.left}
            x2={padding.left}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={height - padding.bottom}
            y2={height - padding.bottom}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          {points.length > 1 && (
            <polyline
              fill="none"
              points={pathPoints}
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          )}
          {points.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              <title>
                Umur {point.x} bulan, {point.y} {valueSuffix}
              </title>
              <circle
                cx={getX(point.x, index)}
                cy={getY(point.y)}
                fill="#ffffff"
                r="5"
                stroke={color}
                strokeWidth="3"
              />
            </g>
          ))}
          <text
            x={padding.left + drawableWidth / 2}
            y={height - 14}
            textAnchor="middle"
            className="fill-slate-600 text-[12px] font-semibold"
          >
            Umur (bulan)
          </text>
          <text
            x="16"
            y={padding.top + drawableHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${padding.top + drawableHeight / 2})`}
            className="fill-slate-600 text-[12px] font-semibold"
          >
            {valueSuffix}
          </text>
        </svg>
      )}
    </div>
  );
}

export default function RiwayatPrediksiTable({
  data,
  graphData,
  graphHistoryLimit,
  actionPrefix,
  variant = "default",
  deletingPrediksiId = null,
  enableFilters = false,
  bulanFilter: controlledBulanFilter,
  onDelete,
  onBulanFilterChange,
  showNik = true,
  showLocation = false,
  showRowNumber = false,
  serverMode = false,
  pagination,
  filterValues,
  filterOptions,
  onServerFilterChange,
  sortValues,
  onServerSortChange,
  onPageChange,
  note,
  emptyMessage = "Belum ada riwayat prediksi.",
}: RiwayatPrediksiTableProps) {
  const isParent = variant === "parent";
  const isOfficer = variant === "officer";
  const [openPrediksiId, setOpenPrediksiId] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [internalBulanFilter, setInternalBulanFilter] = useState("");
  const [kelurahanFilter, setKelurahanFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("tanggal_pengukuran");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const activeSortKey = serverMode ? sortValues?.sortBy ?? sortKey : sortKey;
  const activeSortDirection = serverMode
    ? sortValues?.sortDir ?? sortDirection
    : sortDirection;
  const bulanFilter = controlledBulanFilter ?? internalBulanFilter;
  const chartSource = graphData ?? data;
  const normalizedSearch = searchKeyword.trim().toLowerCase();
  const kelurahanOptions = Array.from(
    new Set(
      data
        .map((item) => item.anak?.kelurahan_desa?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort();
  const bulanOptions = Array.from(
    new Set(
      data
        .map((item) => measurementMonth(item))
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => right.localeCompare(left));
  const activeFilterValues = filterValues ?? {
    q: searchKeyword,
    bulan: bulanFilter,
    kelurahanDesa: kelurahanFilter,
    statusGizi: "",
  };
  const visibleBulanOptions = filterOptions?.bulan ?? bulanOptions;
  const visibleKelurahanOptions =
    filterOptions?.kelurahan_desa ?? kelurahanOptions;
  const visibleStatusOptions = filterOptions?.status_gizi ?? [];
  const updateServerFilters = (
    nextValues: Partial<typeof activeFilterValues>
  ) => {
    onServerFilterChange?.({
      ...activeFilterValues,
      ...nextValues,
    });
  };
  const filteredData = serverMode ? data : data.filter((item) => {
    const searchableText = [
      item.anak?.nama,
      item.anak?.nik,
      item.anak?.alamat,
      item.anak?.kelurahan_desa,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch =
      !normalizedSearch || searchableText.includes(normalizedSearch);
    const matchesBulan = !bulanFilter || measurementMonth(item) === bulanFilter;
    const matchesKelurahan =
      !kelurahanFilter || item.anak?.kelurahan_desa === kelurahanFilter;

    return matchesSearch && matchesBulan && matchesKelurahan;
  });
  const compactedData = serverMode ? filteredData : bulanFilter
    ? Array.from(
        filteredData
          .slice()
          .sort((left, right) => {
            const rightTime = measurementTime(right) ?? "";
            const leftTime = measurementTime(left) ?? "";
            const timeCompare = rightTime.localeCompare(leftTime);

            if (timeCompare !== 0) return timeCompare;

            return right.id_prediksi - left.id_prediksi;
          })
          .reduce((itemsByAnak, item) => {
            const key = item.anak?.id_anak ?? item.id_prediksi;

            if (!itemsByAnak.has(key)) {
              itemsByAnak.set(key, item);
            }

            return itemsByAnak;
          }, new Map<number, Prediksi>())
          .values()
      )
    : filteredData;
  const sortedData = serverMode
    ? compactedData
    : compactedData
        .slice()
        .sort((left, right) =>
          compareSortValues(left, right, activeSortKey, activeSortDirection)
        );
  const rowNumberStart = pagination
    ? (pagination.page - 1) * pagination.per_page
    : 0;
  const locationColumnCount = showLocation ? 2 : 0;
  const actionColumnCount = onDelete ? 1 : 0;
  const rowNumberColumnCount = showRowNumber ? 1 : 0;
  const tableColumnCount =
    7 + locationColumnCount + actionColumnCount + rowNumberColumnCount;
  const filterGridClass = visibleStatusOptions.length > 0
    ? "md:grid-cols-4"
    : "md:grid-cols-3";
  const filterBoxClass = isParent
    ? `mb-5 grid min-w-0 gap-3 rounded-lg border border-[#d8eadf] bg-[#f4faf6] p-4 ${filterGridClass}`
    : isOfficer
      ? `mb-5 grid min-w-0 gap-3 rounded-lg border border-[#d7e5ee] bg-[#f3f8fb] p-4 ${filterGridClass}`
    : `mb-5 grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 ${filterGridClass}`;
  const filterLabelClass = isParent
    ? "text-xs font-bold uppercase tracking-wide text-[#60766e]"
    : isOfficer
      ? "text-xs font-bold uppercase tracking-wide text-[#5a6d78]"
    : "text-xs font-bold uppercase tracking-wide text-slate-500";
  const filterInputClass = isParent
    ? "rounded-lg border border-[#c9ddd3] bg-white px-3 py-2 text-sm outline-none focus:border-[#0f766e] focus:ring-4 focus:ring-[#dff5eb]"
    : isOfficer
      ? "rounded-lg border border-[#bfd3df] bg-white px-3 py-2 text-sm outline-none focus:border-[#0369a1] focus:ring-4 focus:ring-[#dff1fb]"
    : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";
  const tableHeadClass = isParent
    ? "border-b border-[#d8eadf] text-xs uppercase tracking-wide text-[#60766e]"
    : isOfficer
      ? "border-b border-[#d7e5ee] text-xs uppercase tracking-wide text-[#5a6d78]"
    : "border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500";
  const tableBodyClass = isParent
    ? "divide-y divide-[#e4f0e9] text-sm text-[#3a5149]"
    : isOfficer
      ? "divide-y divide-[#e4edf3] text-sm text-[#354d5a]"
    : "divide-y divide-slate-100 text-sm text-slate-700";
  const childNameButtonClass = isParent
    ? "text-left font-bold text-[#13251f] underline-offset-4 hover:text-[#0f766e] hover:underline disabled:cursor-default disabled:text-[#13251f] disabled:no-underline"
    : isOfficer
      ? "text-left font-bold text-[#102636] underline-offset-4 hover:text-[#0369a1] hover:underline disabled:cursor-default disabled:text-[#102636] disabled:no-underline"
    : "text-left font-bold text-slate-950 underline-offset-4 hover:text-emerald-700 hover:underline disabled:cursor-default disabled:text-slate-950 disabled:no-underline";
  const statusPillClass = isParent
    ? "rounded-full bg-[#eef9f2] px-3 py-1 text-xs font-bold text-[#0f766e]"
    : isOfficer
      ? "rounded-full bg-[#eef7fb] px-3 py-1 text-xs font-bold text-[#0369a1]"
    : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700";
  const expandedRowClass = isParent
    ? "bg-[#f4faf6]"
    : isOfficer
      ? "bg-[#f3f8fb]"
      : "bg-slate-50/70";
  const expandedPanelClass = isParent
    ? "min-w-0 max-w-full rounded-lg border border-[#d8eadf] bg-white p-4 shadow-sm"
    : isOfficer
      ? "min-w-0 max-w-full rounded-lg border border-[#d7e5ee] bg-white p-4 shadow-sm"
    : "min-w-0 max-w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
  const deleteButtonClass = isParent
    ? "rounded-lg border border-[#f3c5bc] bg-[#fff4f2] px-3 py-1.5 text-xs font-bold text-[#a23a2a] transition hover:bg-[#ffe8e3] disabled:cursor-not-allowed disabled:opacity-60"
    : isOfficer
      ? "rounded-lg border border-[#f3c5bc] bg-[#fff4f2] px-3 py-1.5 text-xs font-bold text-[#a23a2a] transition hover:bg-[#ffe8e3] disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60";

  const handleSort = (nextKey: SortKey) => {
    if (serverMode) {
      const nextDirection =
        activeSortKey === nextKey
          ? activeSortDirection === "asc"
            ? "desc"
            : "asc"
          : nextKey === "tanggal_pengukuran"
            ? "desc"
            : "asc";

      onServerSortChange?.({
        sortBy: nextKey,
        sortDir: nextDirection,
      });
      return;
    }

    if (activeSortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "tanggal_pengukuran" ? "desc" : "asc");
  };

  const handleBulanFilterChange = (nextBulan: string) => {
    if (onBulanFilterChange) {
      onBulanFilterChange(nextBulan);
      return;
    }

    setInternalBulanFilter(nextBulan);
  };

  const renderSortHeader = (label: string, key: SortKey) => {
    const isActive = activeSortKey === key;

    return (
      <button
        className={
          isParent
            ? "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-left text-xs font-bold uppercase tracking-wide text-[#60766e] transition hover:bg-[#eef9f2] hover:text-[#13251f]"
            : isOfficer
              ? "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-left text-xs font-bold uppercase tracking-wide text-[#5a6d78] transition hover:bg-[#eef7fb] hover:text-[#102636]"
            : "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-left text-xs font-bold uppercase tracking-wide text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        }
        type="button"
        onClick={() => handleSort(key)}
      >
        <span>{label}</span>
        <span
          className={
            isActive
              ? isParent
                ? "text-[#0f766e]"
                : isOfficer
                  ? "text-[#0369a1]"
                : "text-emerald-700"
              : isParent
                ? "text-[#adc7bb]"
                : isOfficer
                  ? "text-[#a8bfcc]"
                : "text-slate-300"
          }
        >
          {isActive ? (activeSortDirection === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    );
  };

  const handleTogglePrediksi = (idPrediksi: number, idAnak?: number) => {
    if (!idAnak) return;

    setOpenPrediksiId(openPrediksiId === idPrediksi ? null : idPrediksi);
  };

  const getChildHistoryUntil = (currentItem: Prediksi) => {
    const idAnak = currentItem.anak?.id_anak;

    if (!idAnak) return [];

    const childHistory = chartSource
      .filter((item) => item.anak?.id_anak === idAnak)
      .slice()
      .sort(sortByMeasurementProgress);
    const currentIndex = childHistory.findIndex(
      (item) => item.id_prediksi === currentItem.id_prediksi
    );

    const historyUntilCurrent =
      currentIndex >= 0 ? childHistory.slice(0, currentIndex + 1) : [];

    return graphHistoryLimit
      ? historyUntilCurrent.slice(-graphHistoryLimit)
      : historyUntilCurrent;
  };

  return (
    <Panel
      variant={variant}
      title="Riwayat Prediksi"
      description="Klik nama balita untuk melihat grafik perkembangan."
      action={actionPrefix}
    >
      {enableFilters && (
        <div className={filterBoxClass}>
          <label className="grid gap-2">
            <span className={filterLabelClass}>Cari Data</span>
            <input
              className={filterInputClass}
              placeholder="Nama, NIK, alamat"
              value={serverMode ? activeFilterValues.q : searchKeyword}
              onChange={(event) => {
                if (serverMode) {
                  updateServerFilters({ q: event.target.value });
                  return;
                }

                setSearchKeyword(event.target.value);
              }}
            />
          </label>

          <label className="grid gap-2">
            <span className={filterLabelClass}>Bulan Pengukuran</span>
            <select
              className={filterInputClass}
              value={serverMode ? activeFilterValues.bulan : bulanFilter}
              onChange={(event) => {
                if (serverMode) {
                  updateServerFilters({ bulan: event.target.value });
                  return;
                }

                handleBulanFilterChange(event.target.value);
              }}
            >
              <option value="">Semua bulan</option>
              {visibleBulanOptions.map((bulan) => (
                <option key={bulan} value={bulan}>
                  {formatMonth(bulan)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className={filterLabelClass}>Kelurahan/Desa</span>
            <select
              className={filterInputClass}
              value={
                serverMode ? activeFilterValues.kelurahanDesa : kelurahanFilter
              }
              onChange={(event) => {
                if (serverMode) {
                  updateServerFilters({ kelurahanDesa: event.target.value });
                  return;
                }

                setKelurahanFilter(event.target.value);
              }}
            >
              <option value="">Semua wilayah</option>
              {visibleKelurahanOptions.map((kelurahan) => (
                <option key={kelurahan} value={kelurahan}>
                  {kelurahan}
                </option>
              ))}
            </select>
          </label>
          {visibleStatusOptions.length > 0 && (
            <label className="grid gap-2">
              <span className={filterLabelClass}>Status</span>
              <select
                className={filterInputClass}
                value={activeFilterValues.statusGizi}
                onChange={(event) => {
                  if (serverMode) {
                    updateServerFilters({ statusGizi: event.target.value });
                    return;
                  }
                }}
              >
                <option value="">Semua status</option>
                {visibleStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {note && (
        <p
          className={
            isOfficer
              ? "mb-4 rounded-lg border border-[#d7e5ee] bg-[#f3f8fb] px-4 py-3 text-sm font-semibold text-[#5a6d78]"
              : "mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600"
          }
        >
          {note}
        </p>
      )}
      <div className="min-w-0 max-w-full overflow-x-auto">
        <table
          className={`${showLocation ? "min-w-[1160px]" : "min-w-[840px]"} w-full border-collapse text-left`}
        >
          <thead>
            <tr className={tableHeadClass}>
              {showRowNumber && <th className="px-3 py-3">No</th>}
              <th className="px-3 py-3">{renderSortHeader("Balita", "nama")}</th>
              {showLocation && (
                <>
                  <th className="px-3 py-3">
                    {renderSortHeader("Jenis Kelamin", "jenis_kelamin")}
                  </th>
                  <th className="px-3 py-3">
                    {renderSortHeader("Kelurahan/Desa", "kelurahan_desa")}
                  </th>
                </>
              )}
              <th className="px-3 py-3">{renderSortHeader("Umur", "umur_bulan")}</th>
              <th className="px-3 py-3">{renderSortHeader("BB", "berat_badan")}</th>
              <th className="px-3 py-3">{renderSortHeader("TB", "tinggi_badan")}</th>
              <th className="px-3 py-3">
                {renderSortHeader("Z-Score TB/U", "z_score_tbu")}
              </th>
              <th className="px-3 py-3">
                {renderSortHeader("Status", "status_gizi")}
              </th>
              <th className="px-3 py-3">
                {renderSortHeader("Tanggal Pengukuran", "tanggal_pengukuran")}
              </th>
              {onDelete && <th className="px-3 py-3">Aksi</th>}
            </tr>
          </thead>
          <tbody className={tableBodyClass}>
            {sortedData.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={tableColumnCount}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((item, rowIndex) => {
                const idAnak = item.anak?.id_anak;
                const isOpen = openPrediksiId === item.id_prediksi;
                const childHistory = getChildHistoryUntil(item);
                const beratPoints = getChartPoints(childHistory, "berat_badan");
                const tinggiPoints = getChartPoints(childHistory, "tinggi_badan");

                return (
                  <Fragment key={item.id_prediksi}>
                    <tr>
                      {showRowNumber && (
                        <td className="px-3 py-4 font-semibold">
                          {rowNumberStart + rowIndex + 1}
                        </td>
                      )}
                      <td
                        className={
                          isParent
                            ? "px-3 py-4 font-semibold text-[#13251f]"
                            : isOfficer
                              ? "px-3 py-4 font-semibold text-[#102636]"
                            : "px-3 py-4 font-semibold text-slate-950"
                        }
                      >
                        <button
                          className={childNameButtonClass}
                          type="button"
                          disabled={!idAnak}
                          onClick={() => handleTogglePrediksi(item.id_prediksi, idAnak)}
                        >
                          {item.anak?.nama ?? "-"}
                        </button>
                        {showNik && item.anak?.nik && (
                          <span
                            className={
                              isParent
                                ? "mt-1 block text-xs font-medium text-[#6c8078]"
                                : isOfficer
                                  ? "mt-1 block text-xs font-medium text-[#687e8a]"
                                : "mt-1 block text-xs font-medium text-slate-500"
                            }
                          >
                            NIK {item.anak.nik}
                          </span>
                        )}
                      </td>
                      {showLocation && (
                        <>
                          <td className="px-3 py-4">
                            {item.anak?.jenis_kelamin || "-"}
                          </td>
                          <td className="px-3 py-4">
                            {item.anak?.kelurahan_desa || "-"}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-4">{item.pengukuran?.umur_bulan ?? "-"} bulan</td>
                      <td className="px-3 py-4">{item.pengukuran?.berat_badan ?? "-"} kg</td>
                      <td className="px-3 py-4">{item.pengukuran?.tinggi_badan ?? "-"} cm</td>
                      <td className="px-3 py-4">
                        <span className={statusPillClass}>
                          {formatZScore(item)}
                        </span>
                        {item.detail?.indikator_z_score?.kategori && (
                          <span
                            className={
                              isParent
                                ? "mt-1 block text-xs font-medium text-[#6c8078]"
                                : isOfficer
                                  ? "mt-1 block text-xs font-medium text-[#687e8a]"
                                  : "mt-1 block text-xs font-medium text-slate-500"
                            }
                          >
                            {item.detail.indikator_z_score.kategori}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <span className={statusPillClass}>{item.status_gizi}</span>
                        {isOfficer && getReviewMessage(item) && (
                          <span
                            className="mt-2 block w-fit rounded-full bg-[#fff4f2] px-3 py-1 text-xs font-bold text-[#a23a2a]"
                            title={getReviewMessage(item)}
                          >
                            Perlu ditinjau petugas
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4">{formatMeasurementTime(item)}</td>
                      {onDelete && (
                        <td className="px-3 py-4">
                          <button
                            className={deleteButtonClass}
                            type="button"
                            disabled={deletingPrediksiId === item.id_prediksi}
                            onClick={() => onDelete(item)}
                          >
                            {deletingPrediksiId === item.id_prediksi
                              ? "Menghapus..."
                              : "Hapus"}
                          </button>
                        </td>
                      )}
                    </tr>
                    {isOpen && (
                      <tr className={expandedRowClass}>
                        <td className="px-3 py-4" colSpan={tableColumnCount}>
                          <div className={expandedPanelClass}>
                            <div className="mb-4 flex flex-col gap-1">
                              <p
                                className={
                                  isParent
                                    ? "text-sm font-bold text-[#13251f]"
                                    : isOfficer
                                      ? "text-sm font-bold text-[#102636]"
                                    : "text-sm font-bold text-slate-950"
                                }
                              >
                                Grafik perkembangan {item.anak?.nama ?? "balita"}
                              </p>
                              <p
                                className={
                                  isParent
                                    ? "text-xs text-[#6c8078]"
                                    : isOfficer
                                      ? "text-xs text-[#687e8a]"
                                    : "text-xs text-slate-500"
                                }
                              >
                                {graphHistoryLimit
                                  ? `Berdasarkan ${graphHistoryLimit} pengecekan terakhir anak ini sampai baris yang dipilih.`
                                  : "Berdasarkan pengukuran anak ini sampai baris yang dipilih."}
                              </p>
                              {isOfficer && getReviewMessage(item) && (
                                <p className="mt-2 rounded-lg border border-[#f4c7b8] bg-[#fff4f2] px-3 py-2 text-sm font-semibold leading-6 text-[#a23a2a]">
                                  {getReviewMessage(item)}
                                </p>
                              )}
                              {showLocation && (
                                <div
                                  className={
                                    isParent
                                      ? "mt-2 grid gap-2 rounded-lg bg-[#f4faf6] p-3 text-xs text-[#60766e] sm:grid-cols-3"
                                      : isOfficer
                                        ? "mt-2 grid gap-2 rounded-lg bg-[#f3f8fb] p-3 text-xs text-[#5a6d78] sm:grid-cols-3"
                                      : "mt-2 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-3"
                                  }
                                >
                                  <p>
                                    <span
                                      className={
                                        isParent
                                          ? "font-bold text-[#344f47]"
                                          : isOfficer
                                            ? "font-bold text-[#314b5a]"
                                          : "font-bold text-slate-700"
                                      }
                                    >
                                      Jenis Kelamin:
                                    </span>{" "}
                                    {item.anak?.jenis_kelamin || "-"}
                                  </p>
                                  <p>
                                    <span
                                      className={
                                        isParent
                                          ? "font-bold text-[#344f47]"
                                          : isOfficer
                                            ? "font-bold text-[#314b5a]"
                                          : "font-bold text-slate-700"
                                      }
                                    >
                                      Kelurahan/Desa:
                                    </span>{" "}
                                    {item.anak?.kelurahan_desa || "-"}
                                  </p>
                                  <p>
                                    <span
                                      className={
                                        isParent
                                          ? "font-bold text-[#344f47]"
                                          : isOfficer
                                            ? "font-bold text-[#314b5a]"
                                          : "font-bold text-slate-700"
                                      }
                                    >
                                      Alamat:
                                    </span>{" "}
                                    {item.anak?.alamat || "-"}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                              <MiniLineChart
                                title="Perkembangan Berat Badan"
                                unit="kg per umur bulan"
                                valueSuffix="kg"
                                color="#047857"
                                points={beratPoints}
                                variant={variant}
                              />
                              <MiniLineChart
                                title="Perkembangan Tinggi Badan"
                                unit="cm per umur bulan"
                                valueSuffix="cm"
                                color={isParent ? "#0ea5a4" : isOfficer ? "#0369a1" : "#2563eb"}
                                points={tinggiPoints}
                                variant={variant}
                              />
                            </div>
                            <div
                              className={
                                isParent
                                  ? "mt-4 min-w-0 max-w-full overflow-x-auto rounded-lg border border-[#d8eadf]"
                                  : isOfficer
                                    ? "mt-4 min-w-0 max-w-full overflow-x-auto rounded-lg border border-[#d7e5ee]"
                                  : "mt-4 min-w-0 max-w-full overflow-x-auto rounded-xl border border-slate-200"
                              }
                            >
                              <table className="min-w-[640px] w-full text-left text-sm">
                                <thead
                                  className={
                                    isParent
                                      ? "bg-[#f4faf6] text-xs uppercase tracking-wide text-[#60766e]"
                                      : isOfficer
                                        ? "bg-[#f3f8fb] text-xs uppercase tracking-wide text-[#5a6d78]"
                                      : "bg-slate-50 text-xs uppercase tracking-wide text-slate-500"
                                  }
                                >
                                  <tr>
                                    <th className="px-3 py-3">Pengecekan</th>
                                    <th className="px-3 py-3">Tanggal</th>
                                    <th className="px-3 py-3">Umur</th>
                                    <th className="px-3 py-3">BB</th>
                                    <th className="px-3 py-3">TB</th>
                                    <th className="px-3 py-3">Z-Score TB/U</th>
                                    <th className="px-3 py-3">Status</th>
                                  </tr>
                                </thead>
                                <tbody
                                  className={
                                    isParent
                                      ? "divide-y divide-[#e4f0e9] text-[#3a5149]"
                                      : isOfficer
                                        ? "divide-y divide-[#e4edf3] text-[#354d5a]"
                                      : "divide-y divide-slate-100 text-slate-700"
                                  }
                                >
                                  {childHistory.map((historyItem, index) => (
                                    <tr key={historyItem.id_prediksi}>
                                      <td
                                        className={
                                          isParent
                                            ? "px-3 py-3 font-semibold text-[#13251f]"
                                            : isOfficer
                                              ? "px-3 py-3 font-semibold text-[#102636]"
                                            : "px-3 py-3 font-semibold text-slate-950"
                                        }
                                      >
                                        Ke-{index + 1}
                                      </td>
                                      <td className="px-3 py-3">
                                        {formatMeasurementTime(historyItem)}
                                      </td>
                                      <td className="px-3 py-3">
                                        {historyItem.pengukuran?.umur_bulan ?? "-"} bulan
                                      </td>
                                      <td className="px-3 py-3">
                                        {historyItem.pengukuran?.berat_badan ?? "-"} kg
                                      </td>
                                      <td className="px-3 py-3">
                                        {historyItem.pengukuran?.tinggi_badan ?? "-"} cm
                                      </td>
                                      <td className="px-3 py-3">
                                        {formatZScore(historyItem)}
                                      </td>
                                      <td className="px-3 py-3">
                                        <span className={statusPillClass}>
                                          {historyItem.status_gizi}
                                        </span>
                                        {isOfficer && getReviewMessage(historyItem) && (
                                          <span
                                            className="mt-2 block w-fit rounded-full bg-[#fff4f2] px-3 py-1 text-xs font-bold text-[#a23a2a]"
                                            title={getReviewMessage(historyItem)}
                                          >
                                            Perlu ditinjau
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.total_pages > 1 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={
              isOfficer
                ? "text-sm font-semibold text-[#5a6d78]"
                : isParent
                  ? "text-sm font-semibold text-[#60766e]"
                : "text-sm font-semibold text-slate-600"
            }
          >
            Menampilkan {rowNumberStart + 1}-
            {Math.min(rowNumberStart + sortedData.length, pagination.total)} dari{" "}
            {pagination.total} data
          </p>
          <div className="flex items-center gap-2">
            <button
              className={
                isOfficer
                  ? "rounded-lg border border-[#bfd3df] bg-white px-3 py-2 text-sm font-bold text-[#0369a1] disabled:cursor-not-allowed disabled:opacity-50"
                  : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              }
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              Sebelumnya
            </button>
            <span
              className={
                isOfficer
                  ? "text-sm font-bold text-[#314b5a]"
                  : "text-sm font-bold text-slate-700"
              }
            >
              {pagination.page}/{pagination.total_pages}
            </span>
            <button
              className={
                isOfficer
                  ? "rounded-lg border border-[#bfd3df] bg-white px-3 py-2 text-sm font-bold text-[#0369a1] disabled:cursor-not-allowed disabled:opacity-50"
                  : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              }
              type="button"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}
