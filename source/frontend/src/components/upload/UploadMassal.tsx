import { type ChangeEvent, type FormEvent, useState } from "react";
import {
  getErrorMessage,
  uploadMassal,
  type UploadResult,
} from "../../services/dashboardService";
import Panel from "../ui/Panel";
import StatCard from "../ui/StatCard";

type UploadPreview = {
  columns: string[];
  rows: string[][];
  totalRows: number;
  missingColumns: string[];
  message?: string;
};

const requiredColumns = [
  "nik",
  "nama",
  "tanggal_lahir",
  "jenis_kelamin",
  "umur_bulan",
  "berat_badan",
  "tinggi_badan",
];
const maxUploadRows = 2000;

const parseCsvLine = (line: string) => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const buildCsvPreview = (content: string): UploadPreview => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const columns = lines[0] ? parseCsvLine(lines[0]) : [];
  const rows = lines.slice(1, 6).map(parseCsvLine);
  const normalizedColumns = new Set(columns.map((column) => column.trim()));
  const missingColumns = requiredColumns.filter(
    (column) => !normalizedColumns.has(column)
  );

  return {
    columns,
    rows,
    totalRows: Math.max(lines.length - 1, 0),
    missingColumns,
  };
};

type UploadMassalProps = {
  idUser?: number;
  variant?: "default" | "officer";
  onSuccess: (idUpload?: number) => void;
};

export default function UploadMassal({
  idUser,
  variant = "default",
  onSuccess,
}: UploadMassalProps) {
  const isOfficer = variant === "officer";
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputClass = isOfficer
    ? "rounded-lg border border-dashed border-[#bfd3df] bg-[#f3f8fb] px-3 py-3 text-sm text-[#354d5a]"
    : "rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm";
  const buttonClass = isOfficer
    ? "rounded-lg bg-[#0369a1] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#075985] disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60";
  const loadingPanelClass = isOfficer
    ? "mt-4 overflow-hidden rounded-lg border border-[#cbe2ef] bg-[#eef7fb] p-4"
    : "mt-4 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50 p-4";
  const loadingTextClass = isOfficer ? "text-[#314b5a]" : "text-slate-700";
  const loadingAccentClass = isOfficer ? "text-[#0369a1]" : "text-emerald-700";
  const progressTrackClass = isOfficer
    ? "mt-4 h-2 overflow-hidden rounded-full bg-white"
    : "mt-4 h-2 overflow-hidden rounded-full bg-white";
  const progressBarClass = isOfficer
    ? "upload-progress-bar h-full w-1/2 rounded-full bg-[#0369a1]"
    : "upload-progress-bar h-full w-1/2 rounded-full bg-emerald-600";
  const canUpload =
    Boolean(file) &&
    !(
      preview &&
      !preview.message &&
      (preview.missingColumns.length > 0 || preview.totalRows > maxUploadRows)
    );
  const previewPanelClass = isOfficer
    ? "mt-4 min-w-0 max-w-full overflow-hidden rounded-lg border border-[#d7e5ee] bg-white p-4"
    : "mt-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-4";
  const previewHeadingClass = isOfficer
    ? "text-sm font-bold text-[#102636]"
    : "text-sm font-bold text-slate-950";
  const previewTextClass = isOfficer
    ? "text-sm text-[#5a6d78]"
    : "text-sm text-slate-600";

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    setFile(nextFile);
    setResult(null);
    setPreview(null);
    setStatus("");

    if (!nextFile) return;

    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setPreview({
        columns: [],
        rows: [],
        totalRows: 0,
        missingColumns: [],
        message:
          "Preview baris tersedia untuk CSV. File XLSX tetap akan divalidasi saat upload.",
      });
      return;
    }

    try {
      const content = await nextFile.text();
      setPreview(buildCsvPreview(content));
    } catch (error) {
      console.error(error);
      setStatus("Preview file gagal dibaca. File tetap bisa dicoba untuk diupload.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!idUser) {
      setStatus("User petugas belum tersedia. Buat user petugas kesehatan di halaman Admin.");
      return;
    }

    if (!file) {
      setStatus("Pilih file CSV atau XLSX terlebih dahulu.");
      return;
    }

    if (!canUpload) {
      setStatus("Lengkapi kolom wajib pada file sebelum upload.");
      return;
    }

    try {
      setSubmitting(true);
      setResult(null);
      setStatus("");
      const response = await uploadMassal(idUser, file);
      setResult(response.data.data);
      setStatus("Upload massal selesai diproses.");
      onSuccess(response.data.data.upload.id_upload);
    } catch (error) {
      setStatus(getErrorMessage(error, "Upload massal gagal diproses."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel
      variant={variant}
      title="Input Data Massal"
      description="Kolom wajib: nik, nama, tanggal_lahir, jenis_kelamin, umur_bulan, berat_badan, tinggi_badan. Maksimal 2.000 baris per file."
    >
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <input
          className={fileInputClass}
          type="file"
          accept=".csv,.xlsx"
          disabled={submitting}
          onChange={handleFileChange}
        />
        <button
          className={buttonClass}
          type="submit"
          disabled={submitting || !canUpload}
        >
          {submitting ? "Memproses Upload..." : "Upload CSV/XLSX"}
        </button>
      </form>

      {preview && file && (
        <div className={previewPanelClass}>
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className={previewHeadingClass}>Preview File</p>
              <p className={`mt-1 break-all ${previewTextClass}`}>
                {file.name} - {preview.totalRows || "-"} baris data
              </p>
            </div>
            <span
              className={
                preview.missingColumns.length > 0
                  ? "w-fit shrink-0 rounded-full bg-[#fff4f2] px-3 py-1 text-xs font-bold text-[#a23a2a]"
                  : "w-fit shrink-0 rounded-full bg-[#eef7fb] px-3 py-1 text-xs font-bold text-[#0369a1]"
              }
            >
              {preview.message
                ? "Metadata"
                : preview.missingColumns.length > 0
                  ? "Kolom belum lengkap"
                  : "Siap diupload"}
            </span>
          </div>

          {preview.message ? (
            <p className={`mt-3 ${previewTextClass}`}>{preview.message}</p>
          ) : (
            <>
              {preview.missingColumns.length > 0 && (
                <p className="mt-3 rounded-lg bg-[#fff4f2] px-3 py-2 text-sm text-[#a23a2a]">
                  Kolom wajib belum ada: {preview.missingColumns.join(", ")}
                </p>
              )}
              {preview.totalRows > maxUploadRows && (
                <p className="mt-3 rounded-lg bg-[#fff4f2] px-3 py-2 text-sm text-[#a23a2a]">
                  Jumlah baris melebihi batas {maxUploadRows}. Pisahkan file
                  menjadi beberapa batch agar proses tetap stabil.
                </p>
              )}
              <div className="mt-4 min-w-0 max-w-full overflow-x-auto">
                <table className="min-w-[720px] w-full border-collapse text-left text-sm">
                  <thead
                    className={
                      isOfficer
                        ? "border-b border-[#d7e5ee] text-xs uppercase tracking-wide text-[#5a6d78]"
                        : "border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"
                    }
                  >
                    <tr>
                      {preview.columns.map((column) => (
                        <th key={column} className="px-3 py-2 whitespace-normal break-words">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    className={
                      isOfficer
                        ? "divide-y divide-[#e4edf3] text-[#354d5a]"
                        : "divide-y divide-slate-100 text-slate-700"
                    }
                  >
                    {preview.rows.map((row, rowIndex) => (
                      <tr key={`preview-${rowIndex}`}>
                        {preview.columns.map((column, columnIndex) => (
                          <td
                            key={`${column}-${columnIndex}`}
                            className="px-3 py-2 whitespace-normal break-words"
                          >
                            {row[columnIndex] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {submitting && (
        <div className={loadingPanelClass} role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            <span
              className={
                isOfficer
                  ? "mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#bfd3df] border-t-[#0369a1]"
                  : "mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700"
              }
            />
            <div className="min-w-0">
              <p className={`text-sm font-bold ${loadingAccentClass}`}>
                Sedang memproses upload massal
              </p>
              <p className={`mt-1 text-sm leading-6 ${loadingTextClass}`}>
                File sedang divalidasi, disimpan, dan diprediksi. Mohon tunggu sampai proses selesai.
              </p>
              {file && (
                <p className={`mt-1 truncate text-xs font-semibold ${loadingTextClass}`}>
                  {file.name}
                </p>
              )}
            </div>
          </div>
          <div className={progressTrackClass}>
            <div className={progressBarClass} />
          </div>
        </div>
      )}

      {status && (
        <p className={isOfficer ? "mt-3 text-sm text-[#5a6d78]" : "mt-3 text-sm text-slate-600"}>
          {status}
        </p>
      )}
      {result && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            variant={variant}
            label="Total Baris"
            value={result.upload.total_row}
          />
          <StatCard
            variant={variant}
            label="Diproses"
            value={result.upload.processed_row}
          />
          <StatCard variant={variant} label="Valid" value={result.upload.valid_row} />
          <StatCard variant={variant} label="Error" value={result.upload.error_row} />
        </div>
      )}
      {result?.upload.status && (
        <p className={isOfficer ? "mt-3 text-sm text-[#5a6d78]" : "mt-3 text-sm text-slate-600"}>
          Status upload: {result.upload.status}
          {result.upload.catatan ? ` - ${result.upload.catatan}` : ""}
        </p>
      )}
      {result && result.errors.length > 0 && (
        <div
          className={
            isOfficer
              ? "mt-4 grid gap-2 rounded-lg bg-[#fff4f2] p-3 text-sm text-[#a23a2a]"
              : "mt-4 grid gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"
          }
        >
          {result.errors.map((item) => (
            <p key={item.row}>
              Baris {item.row}: {item.errors.join(", ")}
            </p>
          ))}
        </div>
      )}
    </Panel>
  );
}
