import { type FormEvent, useCallback, useEffect, useState } from "react";
import AktivitasTable from "../../components/aktivitas/AktivitasTable";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Alert from "../../components/ui/Alert";
import Panel from "../../components/ui/Panel";
import {
  getAktivitasUsers,
  getErrorMessage,
  getUsers,
  type AktivitasUser,
  type PaginationMeta,
  type User,
} from "../../services/dashboardService";

const adminNavItems = [
  { label: "Dashboard", to: "/admin" },
  { label: "Log Aktivitas", to: "/admin/aktivitas" },
];

const modulOptions = [
  { value: "", label: "Semua Modul" },
  { value: "user", label: "User" },
  { value: "anak", label: "Anak" },
  { value: "balita", label: "Balita" },
  { value: "pengukuran", label: "Pengukuran" },
  { value: "prediksi", label: "Prediksi" },
  { value: "upload_massal", label: "Upload Massal" },
  { value: "laporan", label: "Laporan" },
];

type ActivityFilters = {
  q: string;
  modul: string;
  tanggal: string;
};

const emptyFilters: ActivityFilters = {
  q: "",
  modul: "",
  tanggal: "",
};

export default function AdminActivityLogPage() {
  const [activities, setActivities] = useState<AktivitasUser[]>([]);
  const [userNamesById, setUserNamesById] = useState<Record<number, string>>({});
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [filters, setFilters] = useState<ActivityFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<ActivityFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getAktivitasUsers({
        page,
        perPage: 20,
        q: appliedFilters.q,
        modul: appliedFilters.modul,
        tanggal: appliedFilters.tanggal,
      });
      setActivities(response.data.data);
      setMeta(response.data.meta);
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal memuat log aktivitas."));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    void fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getUsers();
        setUserNamesById(
          response.data.data.reduce<Record<number, string>>(
            (names, user: User) => ({
              ...names,
              [user.id_user]: user.nama,
            }),
            {}
          )
        );
      } catch (caught) {
        setError(getErrorMessage(caught, "Gagal memuat nama user."));
      }
    };

    void fetchUsers();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const rowNumberStart = meta ? (meta.page - 1) * meta.per_page : 0;

  return (
    <DashboardLayout
      variant="officer"
      eyebrow="Log Aktivitas"
      title="Telusuri riwayat aktivitas sistem."
      subtitle="Admin dapat mencari aktivitas penting berdasarkan modul, tanggal, atau kata kunci tanpa membebani dashboard utama."
      navItems={adminNavItems}
    >
      <div className="grid gap-5">
        {error && <Alert variant="officer">{error}</Alert>}
        <Panel
          variant="officer"
          title="Filter Log"
          description="Gunakan filter saat perlu audit data tertentu."
        >
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px_auto]" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#5a6d78]">
                Kata Kunci
              </span>
              <input
                className="rounded-lg border border-[#bfd3df] bg-white px-3 py-2 text-sm outline-none focus:border-[#0369a1] focus:ring-4 focus:ring-[#dff1fb]"
                value={filters.q}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    q: event.target.value,
                  }))
                }
                placeholder="Cari aktivitas atau deskripsi"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#5a6d78]">
                Modul
              </span>
              <select
                className="rounded-lg border border-[#bfd3df] bg-white px-3 py-2 text-sm outline-none focus:border-[#0369a1] focus:ring-4 focus:ring-[#dff1fb]"
                value={filters.modul}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    modul: event.target.value,
                  }))
                }
              >
                {modulOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#5a6d78]">
                Tanggal
              </span>
              <input
                className="rounded-lg border border-[#bfd3df] bg-white px-3 py-2 text-sm outline-none focus:border-[#0369a1] focus:ring-4 focus:ring-[#dff1fb]"
                type="date"
                value={filters.tanggal}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    tanggal: event.target.value,
                  }))
                }
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                className="rounded-lg bg-[#0369a1] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#075985]"
                type="submit"
              >
                Terapkan
              </button>
              <button
                className="rounded-lg border border-[#bfd3df] bg-white px-4 py-2 text-sm font-bold text-[#4d6471] transition hover:border-[#0369a1] hover:text-[#0369a1]"
                type="button"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </form>
        </Panel>

        <AktivitasTable
          data={activities}
          userNamesById={userNamesById}
          title="Daftar Log Aktivitas"
          variant="officer"
          description={
            loading
              ? "Memuat data aktivitas..."
              : "Menampilkan aktivitas sistem sesuai filter yang dipilih."
          }
          showUserId
        />

        {meta && (
          <div className="flex flex-col gap-3 rounded-lg border border-[#d7e5ee] bg-white p-4 shadow-[0_12px_28px_rgba(31,78,101,0.07)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#5a6d78]">
              Menampilkan {meta.total === 0 ? 0 : rowNumberStart + 1}-
              {Math.min(rowNumberStart + activities.length, meta.total)} dari{" "}
              {meta.total} data
            </p>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-[#bfd3df] bg-white px-3 py-2 text-sm font-bold text-[#0369a1] disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={meta.page <= 1}
                onClick={() => setPage(meta.page - 1)}
              >
                Sebelumnya
              </button>
              <span className="text-sm font-bold text-[#314b5a]">
                {meta.page}/{Math.max(meta.total_pages, 1)}
              </span>
              <button
                className="rounded-lg border border-[#bfd3df] bg-white px-3 py-2 text-sm font-bold text-[#0369a1] disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={meta.page >= meta.total_pages}
                onClick={() => setPage(meta.page + 1)}
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
