import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import RiwayatPrediksiTable, {
  type SortDirection,
  type SortKey,
} from "../../components/prediksi/RiwayatPrediksiTable";
import Alert from "../../components/ui/Alert";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import UserContextCard from "../../components/ui/UserContextCard";
import UploadMassal from "../../components/upload/UploadMassal";
import { useRoleUser } from "../../hooks/useRoleUser";
import {
  createAktivitasUser,
  deleteUploadMassal,
  getUploadMassal,
  getErrorMessage,
  getRiwayatPrediksi,
  getRiwayatFilterOptions,
  type PaginationMeta,
  type Prediksi,
  type RiwayatFilterOptions,
  type UploadMassal as UploadMassalData,
} from "../../services/dashboardService";
import { formatDateTime } from "../../utils/format";

const petugasNavItems = [
  { label: "Dashboard", to: "/petugas" },
  { label: "Cek Satuan", to: "/petugas/input-satuan" },
  { label: "Cek Massal", to: "/petugas/input-massal" },
];

type ReportValue = string | number | null | undefined;

type WilayahSummary = {
  wilayah: string;
  normal: number;
  stunting: number;
  total: number;
};

const isNormalStatus = (status?: string | null) =>
  status?.toLowerCase().trim() === "normal";

const isStuntingStatus = (status?: string | null) =>
  status?.toLowerCase().trim() === "stunting";

const percent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const formatPercent = (value: number) => `${value}%`;

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

const downloadExcelFile = (
  fileName: string,
  sections: Array<{ title: string; rows: ReportValue[][] }>
) => {
  const tables = sections
    .map(
      (section) => `
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
      `
    )
    .join("");
  const content = `
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
        <h1>Laporan Batch Upload Massal</h1>
        ${tables}
      </body>
    </html>
  `;
  const blob = new Blob([content], {
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

const measurementDate = (item: Prediksi) =>
  item.pengukuran?.tanggal_pengukuran ??
  item.pengukuran?.created_at ??
  item.created_at;

const getWilayah = (item: Prediksi) =>
  item.anak?.kelurahan_desa?.trim() ||
  item.anak?.alamat?.trim() ||
  "Wilayah belum diisi";

const getReviewStatus = (item: Prediksi) =>
  item.detail?.requires_review ? "Perlu ditinjau petugas" : "Tidak";

const getReviewMessage = (item: Prediksi) =>
  item.detail?.requires_review
    ? item.detail.review_message ??
      "Hasil prediksi perlu ditinjau petugas kesehatan."
    : "-";

const getWilayahSummary = (data: Prediksi[]) => {
  const summaryMap = new Map<string, WilayahSummary>();

  data.forEach((item) => {
    const wilayah = getWilayah(item);
    const current = summaryMap.get(wilayah) ?? {
      wilayah,
      normal: 0,
      stunting: 0,
      total: 0,
    };

    if (isNormalStatus(item.status_gizi)) current.normal += 1;
    if (isStuntingStatus(item.status_gizi)) current.stunting += 1;

    current.total += 1;
    summaryMap.set(wilayah, current);
  });

  return Array.from(summaryMap.values()).sort((left, right) => {
    if (right.stunting !== left.stunting) return right.stunting - left.stunting;
    if (right.total !== left.total) return right.total - left.total;

    return left.wilayah.localeCompare(right.wilayah, "id-ID");
  });
};

export default function PetugasInputMassalPage() {
  const { currentUser, error: userError } = useRoleUser("petugas_kesehatan");
  const [uploads, setUploads] = useState<UploadMassalData[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [riwayat, setRiwayat] = useState<Prediksi[]>([]);
  const [riwayatGrafik, setRiwayatGrafik] = useState<Prediksi[]>([]);
  const [riwayatMeta, setRiwayatMeta] = useState<PaginationMeta | undefined>();
  const [filterOptions, setFilterOptions] = useState<RiwayatFilterOptions>({
    bulan: [],
    kelurahan_desa: [],
    status_gizi: [],
  });
  const [tablePage, setTablePage] = useState(1);
  const [tableFilters, setTableFilters] = useState({
    q: "",
    bulan: "",
    kelurahanDesa: "",
    statusGizi: "",
  });
  const [tableSort, setTableSort] = useState<{
    sortBy: SortKey;
    sortDir: SortDirection;
  }>({
    sortBy: "tanggal_pengukuran",
    sortDir: "desc",
  });
  const [error, setError] = useState("");
  const [deletingUpload, setDeletingUpload] = useState(false);
  const [pendingDeleteUpload, setPendingDeleteUpload] =
    useState<UploadMassalData | null>(null);
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);
  const currentUserId = currentUser?.id_user;
  const selectedUploadForAction = uploads.find(
    (upload) => String(upload.id_upload) === selectedUploadId
  );
  const uploadBatchNumbers = new Map(
    uploads
      .slice()
      .sort((left, right) => {
        const leftTime = left.created_at ?? "";
        const rightTime = right.created_at ?? "";
        const timeCompare = leftTime.localeCompare(rightTime);

        if (timeCompare !== 0) return timeCompare;

        return left.id_upload - right.id_upload;
      })
      .map((upload, index) => [upload.id_upload, index + 1])
  );
  const selectedUploadNumber = selectedUploadForAction
    ? uploadBatchNumbers.get(selectedUploadForAction.id_upload)
    : undefined;

  const refreshUploads = useCallback(async (preferredUploadId?: number) => {
    if (!currentUserId) {
      setUploads([]);
      setSelectedUploadId("");
      return;
    }

    try {
      setError("");
      const response = await getUploadMassal(currentUserId);
      const data = response.data.data;
      setUploads(data);
      setSelectedUploadId((current) => {
        const preferred = preferredUploadId ? String(preferredUploadId) : "";

        if (
          preferred &&
          data.some((upload) => String(upload.id_upload) === preferred)
        ) {
          return preferred;
        }

        if (current && data.some((upload) => String(upload.id_upload) === current)) {
          return current;
        }

        return data[0] ? String(data[0].id_upload) : "";
      });
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal memuat daftar upload massal."));
    }
  }, [currentUserId]);

  const refreshData = useCallback(async (idUpload = selectedUploadId) => {
    if (!currentUserId) {
      setRiwayat([]);
      setRiwayatGrafik([]);
      setRiwayatMeta(undefined);
      return;
    }

    try {
      setError("");
      const [tableResponse, optionResponse] = await Promise.all([
        getRiwayatPrediksi(
          {
            idUser: currentUserId,
            idUpload: idUpload ? Number(idUpload) : undefined,
            page: tablePage,
            perPage: 60,
            q: tableFilters.q,
            bulan: tableFilters.bulan,
            kelurahanDesa: tableFilters.kelurahanDesa,
            statusGizi: tableFilters.statusGizi,
            sortBy: tableSort.sortBy,
            sortDir: tableSort.sortDir,
          }
        ),
        getRiwayatFilterOptions(
          currentUserId,
          idUpload ? Number(idUpload) : undefined
        ),
      ]);
      const graphResponse = idUpload
        ? await getRiwayatPrediksi({
            idUser: currentUserId,
            idUpload: Number(idUpload),
          })
        : tableResponse;

      setRiwayat(tableResponse.data.data);
      setRiwayatMeta(tableResponse.data.meta);
      setRiwayatGrafik(graphResponse.data.data);
      setFilterOptions(optionResponse.data.data);
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal memuat riwayat prediksi."));
    }
  }, [currentUserId, selectedUploadId, tableFilters, tablePage, tableSort]);

  const refreshPage = async (idUpload?: number) => {
    await refreshUploads(idUpload);
    await refreshData(idUpload ? String(idUpload) : selectedUploadId);
  };

  const handleDeleteSelectedUpload = async () => {
    if (!selectedUploadId) {
      setError("Pilih batch upload yang ingin dihapus terlebih dahulu.");
      return;
    }

    const selectedUpload = uploads.find(
      (upload) => String(upload.id_upload) === selectedUploadId
    );

    if (!selectedUpload) {
      setError("Batch upload yang dipilih tidak ditemukan.");
      return;
    }

    setPendingDeleteUpload(selectedUpload);
  };

  const confirmDeleteSelectedUpload = async () => {
    if (!pendingDeleteUpload) return;

    try {
      setDeletingUpload(true);
      setError("");
      await deleteUploadMassal(pendingDeleteUpload.id_upload, currentUserId);
      setSelectedUploadId("");
      setPendingDeleteUpload(null);
      await refreshUploads();
      await refreshData("");
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal menghapus batch upload."));
    } finally {
      setDeletingUpload(false);
    }
  };

  const handleDownloadSelectedBatch = async () => {
    const selectedUpload = uploads.find(
      (upload) => String(upload.id_upload) === selectedUploadId
    );

    if (!selectedUpload) {
      setError("Pilih batch upload yang ingin diunduh terlebih dahulu.");
      return;
    }

    if (!currentUserId) {
      setError("User petugas belum tersedia.");
      return;
    }

    const exportResponse = await getRiwayatPrediksi({
      idUser: currentUserId,
      idUpload: Number(selectedUploadId),
      bulan: tableFilters.bulan,
      kelurahanDesa: tableFilters.kelurahanDesa,
      statusGizi: tableFilters.statusGizi,
      q: tableFilters.q,
      sortBy: tableSort.sortBy,
      sortDir: tableSort.sortDir,
    });
    const exportData = exportResponse.data.data;
    const normalCount = exportData.filter((item) =>
      isNormalStatus(item.status_gizi)
    ).length;
    const stuntingCount = exportData.filter((item) =>
      isStuntingStatus(item.status_gizi)
    ).length;
    const targetCount = normalCount + stuntingCount;
    const wilayahSummary = getWilayahSummary(exportData);
    const uploadDate = selectedUpload.created_at
      ? formatDateTime(selectedUpload.created_at)
      : "-";
    const detailRows = exportData.map((item, index) => {
      const wilayah = getWilayah(item);

      return [
        index + 1,
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
        getReviewStatus(item),
        getReviewMessage(item),
        measurementDate(item) ? formatDateTime(measurementDate(item)) : "-",
      ];
    });
    const fileName = sanitizeFileName(
      `laporan-batch-${selectedUpload.id_upload}-${selectedUpload.nama_file}`
    );

    try {
      await createAktivitasUser({
        id_user: currentUserId,
        aktivitas: "unduh_laporan_batch",
        modul: "upload_massal",
        deskripsi: `Unduh laporan batch ${selectedUpload.id_upload} - ${selectedUpload.nama_file}`,
      });
    } catch (error) {
      console.error(error);
    }

    downloadExcelFile(`${fileName || `laporan-batch-${selectedUpload.id_upload}`}.xls`, [
      {
        title: "Ringkasan Batch",
        rows: [
          ["Item", "Nilai", "Persentase"],
          ["Batch", `Batch ${selectedUploadNumber || "-"}`, ""],
          ["Nama File", selectedUpload.nama_file, ""],
          ["Tanggal Upload", uploadDate, ""],
          ["Total Baris Upload", selectedUpload.total_row, ""],
          ["Baris Valid", selectedUpload.valid_row, ""],
          ["Baris Error", selectedUpload.error_row, ""],
          ["Data Prediksi Batch", exportData.length, ""],
          ["Target Terklasifikasi", targetCount, ""],
          ["Normal", normalCount, formatPercent(percent(normalCount, targetCount))],
          ["Stunting", stuntingCount, formatPercent(percent(stuntingCount, targetCount))],
        ],
      },
      {
        title: "Perbandingan Wilayah Batch",
        rows: [
          ["Wilayah", "Normal", "Stunting", "Total", "Persentase Stunting"],
          ...wilayahSummary.map((item) => [
            item.wilayah,
            item.normal,
            item.stunting,
            item.total,
            formatPercent(percent(item.stunting, item.total)),
          ]),
        ],
      },
      {
        title: "Detail Anak Batch",
        rows: [
          [
            "No",
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
            "Status Review",
            "Catatan Review",
            "Tanggal Pengukuran",
          ],
          ...detailRows,
        ],
      },
    ]);
  };

  useEffect(() => {
    void refreshUploads();
  }, [refreshUploads]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  return (
    <DashboardLayout
      variant="officer"
      eyebrow="Cek Massal"
      title="Upload data balita secara massal."
      subtitle="Gunakan halaman ini untuk memproses banyak data pengukuran dari file CSV atau XLSX."
      navItems={petugasNavItems}
    >
      <div className="grid gap-5">
        {(userError || error) && <Alert variant="officer">{userError || error}</Alert>}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <UserContextCard
            variant="officer"
            user={currentUser}
            emptyMessage="Belum ada user dengan role petugas kesehatan. Buat user tersebut dari halaman Admin."
          />
          <div className="min-w-0">
            <UploadMassal
              variant="officer"
              idUser={currentUser?.id_user}
              onSuccess={refreshPage}
            />
          </div>
        </div>
        <RiwayatPrediksiTable
          variant="officer"
          data={riwayat}
          graphData={riwayatGrafik}
          enableFilters
          serverMode
          pagination={riwayatMeta}
          filterValues={tableFilters}
          filterOptions={filterOptions}
          onServerFilterChange={(nextFilters) => {
            setTablePage(1);
            setTableFilters(nextFilters);
          }}
          sortValues={tableSort}
          onServerSortChange={(nextSort) => {
            setTablePage(1);
            setTableSort(nextSort);
          }}
          onPageChange={setTablePage}
          showLocation
          showRowNumber
          emptyMessage={
            selectedUploadId
              ? "Belum ada data prediksi pada batch upload ini."
              : "Belum ada riwayat prediksi. Upload file CSV atau XLSX terlebih dahulu."
          }
          actionPrefix={
            <div className="grid w-full min-w-0 gap-3 xl:grid-cols-[minmax(360px,1fr)_auto_auto] xl:items-end">
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-[#5a6d78]">
                  Batch Upload
                </span>
                <select
                  className="h-11 w-full min-w-0 truncate rounded-lg border border-[#bfd3df] bg-white px-3 text-sm outline-none focus:border-[#0369a1] focus:ring-4 focus:ring-[#dff1fb]"
                  value={selectedUploadId}
                  onChange={(event) => {
                    setTablePage(1);
                    setSelectedUploadId(event.target.value);
                  }}
                >
                  <option value="">Semua upload</option>
                  {uploads.map((upload) => (
                    <option key={upload.id_upload} value={upload.id_upload}>
                      Batch {uploadBatchNumbers.get(upload.id_upload) ?? "-"} -{" "}
                      {upload.nama_file} -{" "}
                      {formatDateTime(upload.created_at)} -{" "}
                      {upload.status ?? "selesai"}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="h-11 whitespace-nowrap rounded-lg border border-[#cbe2ef] bg-[#eef7fb] px-5 text-sm font-bold text-[#0369a1] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={!selectedUploadId || riwayat.length === 0}
                onClick={() => {
                  if (!selectedUploadForAction) {
                    setError("Pilih batch upload yang ingin diunduh terlebih dahulu.");
                    return;
                  }

                  setDownloadConfirmOpen(true);
                }}
              >
                Unduh Excel Batch
              </button>
              <button
                className="h-11 whitespace-nowrap rounded-lg border border-[#f3c5bc] bg-[#fff4f2] px-5 text-sm font-bold text-[#a23a2a] transition hover:bg-[#ffe8e3] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={!selectedUploadId || deletingUpload}
                onClick={handleDeleteSelectedUpload}
              >
                {deletingUpload ? "Menghapus..." : "Hapus Batch"}
              </button>
            </div>
          }
        />
        <ConfirmDialog
          open={Boolean(pendingDeleteUpload)}
          variant="officer"
          title="Hapus batch upload?"
          description="Semua data pengukuran dan hasil prediksi dari batch ini akan ikut terhapus."
          details={
            <>
              <strong>{pendingDeleteUpload?.nama_file ?? "Batch upload"}</strong>
              <br />
              Total baris: {pendingDeleteUpload?.total_row ?? "-"} | Valid:{" "}
              {pendingDeleteUpload?.valid_row ?? "-"} | Error:{" "}
              {pendingDeleteUpload?.error_row ?? "-"}
            </>
          }
          loading={deletingUpload}
          confirmLabel="Hapus Batch"
          onCancel={() => setPendingDeleteUpload(null)}
          onConfirm={confirmDeleteSelectedUpload}
        />
        <ConfirmDialog
          open={downloadConfirmOpen}
          intent="info"
          variant="officer"
          title="Unduh laporan batch?"
          description="File Excel akan dibuat dari data batch upload yang sedang dipilih."
          details={
            <>
              <strong>{selectedUploadForAction?.nama_file ?? "Batch upload"}</strong>
              <br />
              Data prediksi: {riwayatMeta?.total ?? riwayat.length} | Total baris:{" "}
              {selectedUploadForAction?.total_row ?? "-"} | Valid:{" "}
              {selectedUploadForAction?.valid_row ?? "-"}
            </>
          }
          confirmLabel="Unduh Excel"
          onCancel={() => setDownloadConfirmOpen(false)}
          onConfirm={() => {
            void handleDownloadSelectedBatch();
            setDownloadConfirmOpen(false);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
