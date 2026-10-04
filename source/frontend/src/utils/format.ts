export const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const formatDate = (value?: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value));
};

export const formatCodeLabel = (value?: string | null) => {
  if (!value) return "-";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const formatActivityLabel = (value?: string | null) => {
  const labels: Record<string, string> = {
    buat_user: "Buat User",
    update_user: "Update User",
    hapus_user: "Hapus User",
    hapus_user_dengan_data: "Hapus User Dengan Data",
    buat_data_anak: "Buat Data Anak",
    update_data_anak: "Update Data Anak",
    hapus_data_anak: "Hapus Data Anak",
    input_data_balita: "Input Data Balita",
    buat_pengukuran: "Buat Pengukuran",
    update_pengukuran: "Update Pengukuran",
    hapus_pengukuran: "Hapus Pengukuran",
    prediksi_status_gizi: "Prediksi Status Gizi",
    update_prediksi: "Update Prediksi",
    hapus_prediksi: "Hapus Prediksi",
    buat_upload_massal: "Buat Upload Massal",
    input_data_massal: "Input Data Massal",
    update_upload_massal: "Update Upload Massal",
    hapus_upload_massal: "Hapus Upload Massal",
    buat_laporan: "Buat Laporan",
    update_laporan: "Update Laporan",
    hapus_laporan: "Hapus Laporan",
    unduh_laporan_batch: "Unduh Laporan Batch",
    unduh_laporan_klasifikasi: "Unduh Laporan Klasifikasi",
  };

  return value ? labels[value] ?? formatCodeLabel(value) : "-";
};
