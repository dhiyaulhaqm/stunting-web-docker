import API, { type PagePreloaderRequestConfig } from "../api/axiosInstance";

export type ApiListResponse<T> = {
  status: string;
  message?: string;
  data: T[];
  meta?: PaginationMeta;
};

export type ApiDataResponse<T> = {
  status: string;
  message?: string;
  data: T;
};

export type PaginationMeta = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type UserRole = "admin" | "petugas" | "petugas_kesehatan" | "orang_tua";

export type User = {
  id_user: number;
  nama: string;
  email: string;
  role: UserRole;
  created_at?: string | null;
};

export type RegisterOrangTuaPayload = {
  nama: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AnakPayload = {
  id_user: number;
  nik?: string;
  nama: string;
  tanggal_lahir: string;
  jenis_kelamin: "laki-laki" | "perempuan";
  alamat?: string;
  kelurahan_desa?: string;
};

export type BalitaPayload = {
  id_user: number;
  nama: string;
  tanggal_lahir: string;
  jenis_kelamin: "laki-laki" | "perempuan";
  umur_bulan: number;
  berat_badan: number;
  tinggi_badan: number;
  tanggal_pengukuran?: string;
};

export type PengukuranPayload = {
  id_anak: number;
  umur_bulan: number;
  berat_badan: number;
  tinggi_badan: number;
};

export type Anak = {
  id_anak: number;
  id_user: number;
  nik?: string | null;
  nama: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  alamat?: string | null;
  kelurahan_desa?: string | null;
  created_at?: string | null;
};

export type Pengukuran = {
  id_pengukuran: number;
  id_anak: number;
  id_upload?: number | null;
  umur_bulan: number;
  berat_badan: number;
  tinggi_badan: number;
  tanggal_pengukuran?: string | null;
  created_at?: string | null;
};

export type Prediksi = {
  id_prediksi: number;
  id_pengukuran: number;
  status_gizi: string;
  created_at?: string | null;
  detail?: PrediksiDetail;
  anak?: Anak;
  pengukuran?: Pengukuran;
};

export type LaporanRingkasan = {
  total_anak: number;
  total_prediksi: number;
  total_anak_normal: number;
  total_anak_stunting: number;
  total_risiko_stunting: number;
  total_gizi_kurang: number;
  total_gizi_lebih: number;
  bulan_laporan?: string;
  anak_dicek_bulan?: number;
  target_terklasifikasi_bulan?: number;
  normal_bulan?: number;
  stunting_bulan?: number;
  belum_target_bulan?: number;
  status_dominan_bulan?: string;
  fallback_review_count?: number;
  wilayah_perbandingan?: Array<{
    wilayah: string;
    normal: number;
    stunting: number;
    total: number;
  }>;
  prioritas_stunting?: Prediksi[];
};

export type AktivitasUser = {
  id_aktivitas: number;
  id_user?: number | null;
  aktivitas: string;
  modul: string;
  deskripsi?: string | null;
  created_at?: string | null;
};

export type AktivitasUserPayload = {
  id_user?: number;
  aktivitas: string;
  modul: string;
  deskripsi?: string;
};

export type AktivitasUserParams = {
  idUser?: number;
  modul?: string;
  q?: string;
  tanggal?: string;
  page?: number;
  perPage?: number;
};

export type UploadResult = {
  upload: {
    id_upload: number;
    nama_file: string;
    total_row: number;
    processed_row: number;
    valid_row: number;
    error_row: number;
    status?: string;
    catatan?: string | null;
    completed_at?: string | null;
  };
  errors: Array<{
    row: number;
    errors: string[];
  }>;
};

export type UploadMassal = {
  id_upload: number;
  id_user: number;
  nama_file: string;
  total_row: number;
  processed_row: number;
  valid_row: number;
  error_row: number;
  status?: string;
  catatan?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
};

export type RiwayatPrediksiParams = {
  idUser?: number;
  idAnak?: number;
  idUpload?: number;
  page?: number;
  perPage?: number;
  q?: string;
  bulan?: string;
  kelurahanDesa?: string;
  statusGizi?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  latestPerChild?: boolean;
  historyLimitPerChild?: number;
  historyUntilMonth?: string;
};

export type RiwayatFilterOptions = {
  bulan: string[];
  kelurahan_desa: string[];
  status_gizi: string[];
};

export type QuickPrediksiPayload = {
  umur_bulan: number;
  berat_badan: number;
  tinggi_badan: number;
  jenis_kelamin?: "laki-laki" | "perempuan";
};

export type ZScoreIndicator = {
  indikator: string;
  z_score: number;
  kategori: string;
  umur_hari_rujukan?: number;
  median_cm?: number;
  sd2neg_cm?: number;
  sd3neg_cm?: number;
  sumber?: string;
};

export type PrediksiDetail = {
  rasio_tinggi?: number;
  rasio_berat?: number;
  tinggi_rujukan_sederhana?: number;
  berat_rujukan_sederhana?: number;
  engine?: string;
  prediction_source?: "machine_learning" | "rule_based_fallback";
  is_fallback?: boolean;
  requires_review?: boolean;
  review_message?: string;
  model_file?: string;
  raw_status?: string;
  probabilitas?: Record<string, number>;
  fitur_model?: Record<string, string | number>;
  indikator_z_score?: ZScoreIndicator;
};

export type QuickPrediksiResult = {
  status_gizi: string;
  detail?: PrediksiDetail;
  catatan?: string;
};

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  petugas: "Petugas Kesehatan",
  petugas_kesehatan: "Petugas Kesehatan",
  orang_tua: "Orang Tua",
};

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

export const getUsers = () => API.get<ApiListResponse<User>>("/users/");

export const loginUser = (data: LoginPayload) =>
  API.post<ApiDataResponse<User>>("/auth/login", data);

export const registerOrangTua = (data: RegisterOrangTuaPayload) =>
  API.post<ApiDataResponse<User>>("/users/", {
    ...data,
    role: "orang_tua",
  });

export const createBalita = (data: BalitaPayload) =>
  API.post("/balita/", data);

export const getAnak = (idUser?: number) =>
  API.get<ApiListResponse<Anak>>("/anak/", {
    params: idUser ? { id_user: idUser } : undefined,
  });

export const createAnak = (data: AnakPayload) =>
  API.post<ApiDataResponse<Anak>>("/anak/", data);

export const updateAnak = (idAnak: number, data: AnakPayload) =>
  API.put<ApiDataResponse<Anak>>(`/anak/${idAnak}`, data);

export const deleteAnak = (idAnak: number) =>
  API.delete(`/anak/${idAnak}`);

export const createPengukuran = (data: PengukuranPayload) =>
  API.post("/pengukuran/", data);

export const deletePengukuran = (idPengukuran: number) =>
  API.delete(`/pengukuran/${idPengukuran}`);

export const getRiwayatPrediksi = (
  idUserOrParams?: number | RiwayatPrediksiParams,
  idAnak?: number,
  idUpload?: number
) => {
  const params =
    typeof idUserOrParams === "object"
      ? idUserOrParams
      : {
          idUser: idUserOrParams,
          idAnak,
          idUpload,
        };

  return (
  API.get<ApiListResponse<Prediksi>>("/prediksi/riwayat", {
    params: {
      ...(params.idUser ? { id_user: params.idUser } : {}),
      ...(params.idAnak ? { id_anak: params.idAnak } : {}),
      ...(params.idUpload ? { id_upload: params.idUpload } : {}),
      ...(params.page ? { page: params.page } : {}),
      ...(params.perPage ? { per_page: params.perPage } : {}),
      ...(params.q ? { q: params.q } : {}),
      ...(params.bulan ? { bulan: params.bulan } : {}),
      ...(params.kelurahanDesa
        ? { kelurahan_desa: params.kelurahanDesa }
        : {}),
      ...(params.statusGizi ? { status_gizi: params.statusGizi } : {}),
      ...(params.sortBy ? { sort_by: params.sortBy } : {}),
      ...(params.sortDir ? { sort_dir: params.sortDir } : {}),
      ...(params.latestPerChild ? { latest_per_child: "true" } : {}),
      ...(params.historyLimitPerChild
        ? { history_limit_per_child: params.historyLimitPerChild }
        : {}),
      ...(params.historyUntilMonth
        ? { history_until_month: params.historyUntilMonth }
        : {}),
    },
  })
  );
};

export const getRiwayatFilterOptions = (idUser?: number, idUpload?: number) =>
  API.get<ApiDataResponse<RiwayatFilterOptions>>(
    "/prediksi/riwayat/filter-options",
    {
      params: {
        ...(idUser ? { id_user: idUser } : {}),
        ...(idUpload ? { id_upload: idUpload } : {}),
      },
    }
  );

export const getLaporanRingkasan = (idUser?: number, bulan?: string) =>
  API.get<ApiDataResponse<LaporanRingkasan>>("/laporan/ringkasan", {
    params: {
      ...(idUser ? { id_user: idUser } : {}),
      ...(bulan ? { bulan } : {}),
    },
  });

export const getAktivitasUsers = (idUserOrParams?: number | AktivitasUserParams) => {
  const params =
    typeof idUserOrParams === "object"
      ? idUserOrParams
      : {
          idUser: idUserOrParams,
        };

  return API.get<ApiListResponse<AktivitasUser>>("/aktivitas-users/", {
    params: {
      ...(params.idUser ? { id_user: params.idUser } : {}),
      ...(params.modul ? { modul: params.modul } : {}),
      ...(params.q ? { q: params.q } : {}),
      ...(params.tanggal ? { tanggal: params.tanggal } : {}),
      ...(params.page ? { page: params.page } : {}),
      ...(params.perPage ? { per_page: params.perPage } : {}),
    },
  });
};

export const createAktivitasUser = (data: AktivitasUserPayload) =>
  API.post("/aktivitas-users/", data);

export const uploadMassal = (idUser: number, file: File) => {
  const formData = new FormData();
  formData.append("id_user", String(idUser));
  formData.append("file", file);

  return API.post<ApiDataResponse<UploadResult>>("/upload-massal/csv", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    skipPagePreloader: true,
  } as PagePreloaderRequestConfig);
};

export const getUploadMassal = (idUser?: number) =>
  API.get<ApiListResponse<UploadMassal>>("/upload-massal/", {
    params: idUser ? { id_user: idUser } : undefined,
  });

export const deleteUploadMassal = (idUpload: number, actorUserId?: number) =>
  API.delete(`/upload-massal/${idUpload}`, {
    params: actorUserId ? { actor_id: actorUserId } : undefined,
  });

export const hitungPrediksiCepat = (data: QuickPrediksiPayload) =>
  API.post<ApiDataResponse<QuickPrediksiResult>>("/prediksi/hitung", data);

export const downloadLaporanUrl = (idUser?: number) => {
  const baseUrl = API.defaults.baseURL ?? "";
  return idUser
    ? `${baseUrl}/laporan/download?id_user=${idUser}`
    : `${baseUrl}/laporan/download`;
};
