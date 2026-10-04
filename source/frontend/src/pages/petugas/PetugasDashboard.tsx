import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import RingkasanLaporan from "../../components/laporan/RingkasanLaporan";
import RiwayatPrediksiTable, {
  type SortDirection,
  type SortKey,
} from "../../components/prediksi/RiwayatPrediksiTable";
import Alert from "../../components/ui/Alert";
import Panel from "../../components/ui/Panel";
import StatCard from "../../components/ui/StatCard";
import UserContextCard from "../../components/ui/UserContextCard";
import { useRoleUser } from "../../hooks/useRoleUser";
import {
  getErrorMessage,
  getLaporanRingkasan,
  getRiwayatPrediksi,
  getRiwayatFilterOptions,
  type LaporanRingkasan,
  type PaginationMeta,
  type Prediksi,
  type RiwayatFilterOptions,
} from "../../services/dashboardService";

const graphHistoryLimit = 12;

const emptyRingkasan: LaporanRingkasan = {
  total_anak: 0,
  total_prediksi: 0,
  total_anak_normal: 0,
  total_anak_stunting: 0,
  total_risiko_stunting: 0,
  total_gizi_kurang: 0,
  total_gizi_lebih: 0,
};

const measurementTime = (item: Prediksi) =>
  item.pengukuran?.tanggal_pengukuran ??
  item.pengukuran?.created_at ??
  item.created_at;

const measurementMonth = (item: Prediksi) => measurementTime(item)?.slice(0, 7);

const getAnakKey = (item: Prediksi) => {
  if (item.anak?.id_anak) return `anak-${item.anak.id_anak}`;
  if (item.anak?.nik) return `nik-${item.anak.nik}`;
  if (item.anak?.nama) return `nama-${item.anak.nama.toLowerCase().trim()}`;

  return `prediksi-${item.id_prediksi}`;
};

const getLatestMonth = (riwayat: Prediksi[]) =>
  riwayat
    .map(measurementMonth)
    .filter((month): month is string => Boolean(month))
    .sort()
    .at(-1);

const countCheckedAnakInMonth = (riwayat: Prediksi[], selectedMonth: string) => {
  if (!selectedMonth) return 0;

  return new Set(
    riwayat
      .filter((item) => measurementMonth(item) === selectedMonth)
      .map(getAnakKey)
  ).size;
};

export default function PetugasDashboard() {
  const { currentUser, error: userError } = useRoleUser("petugas_kesehatan");
  const [ringkasan, setRingkasan] = useState<LaporanRingkasan>(emptyRingkasan);
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
  const currentUserId = currentUser?.id_user;
  const reportMonth = tableFilters.bulan || ringkasan.bulan_laporan || getLatestMonth(riwayat) || "";
  const checkedAnakBulanLaporan =
    ringkasan.anak_dicek_bulan ?? countCheckedAnakInMonth(riwayat, reportMonth);

  const refreshData = useCallback(async () => {
    if (!currentUserId) {
      setRingkasan(emptyRingkasan);
      setRiwayat([]);
      setRiwayatGrafik([]);
      setRiwayatMeta(undefined);
      return;
    }

    try {
      setError("");
      const ringkasanResponse = await getLaporanRingkasan(
        currentUserId,
        tableFilters.bulan
      );
      const activeBulan =
        tableFilters.bulan || ringkasanResponse.data.data.bulan_laporan || "";
      const [riwayatResponse, grafikResponse, optionResponse] = await Promise.all([
        getRiwayatPrediksi({
          idUser: currentUserId,
          page: tablePage,
          perPage: 60,
          q: tableFilters.q,
          bulan: activeBulan,
          kelurahanDesa: tableFilters.kelurahanDesa,
          statusGizi: tableFilters.statusGizi,
          sortBy: tableSort.sortBy,
          sortDir: tableSort.sortDir,
          latestPerChild: true,
        }),
        getRiwayatPrediksi({
          idUser: currentUserId,
          q: tableFilters.q,
          kelurahanDesa: tableFilters.kelurahanDesa,
          historyLimitPerChild: graphHistoryLimit,
          historyUntilMonth: activeBulan,
        }),
        getRiwayatFilterOptions(currentUserId),
      ]);
      setRingkasan(ringkasanResponse.data.data);
      setRiwayat(riwayatResponse.data.data);
      setRiwayatGrafik(grafikResponse.data.data);
      setRiwayatMeta(riwayatResponse.data.meta);
      setFilterOptions(optionResponse.data.data);
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal memuat dashboard petugas."));
    }
  }, [currentUserId, tableFilters, tablePage, tableSort]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  return (
    <DashboardLayout
      variant="officer"
      eyebrow="Dashboard Petugas Kesehatan"
      title="Validasi, prediksi, dan laporan klasifikasi."
      subtitle="Petugas kesehatan memilih menu cek satuan atau cek massal, lalu melihat ringkasan hasil klasifikasi."
      navItems={[
        { label: "Dashboard", to: "/petugas" },
        { label: "Cek Satuan", to: "/petugas/input-satuan" },
        { label: "Cek Massal", to: "/petugas/input-massal" },
      ]}
    >
      <div className="grid gap-5">
        {(userError || error) && <Alert variant="officer">{userError || error}</Alert>}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <UserContextCard
            variant="officer"
            user={currentUser}
            emptyMessage="Belum ada user dengan role petugas kesehatan. Buat user tersebut dari halaman Admin."
          />
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              variant="officer"
              label="Total Anak Terdata"
              value={ringkasan.total_anak}
            />
            <StatCard
              variant="officer"
              label="Total Anak Bulan Ini"
              value={checkedAnakBulanLaporan}
            />
            <StatCard
              variant="officer"
              label="Anak Normal Terbaru"
              value={ringkasan.total_anak_normal}
            />
            <StatCard
              variant="officer"
              label="Anak Stunting Terbaru"
              value={ringkasan.total_anak_stunting}
            />
          </div>
        </div>

        <Panel
          variant="officer"
          title="Menu Input Data"
          description="Pilih cara input data sesuai kebutuhan pemeriksaan."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              to="/petugas/input-satuan"
              className="rounded-lg border border-[#d7e5ee] bg-[#f3f8fb] p-5 transition hover:border-[#8bc4df] hover:bg-white"
            >
              <p className="text-sm font-bold text-[#0369a1]">Input Satuan</p>
              <h3 className="mt-2 text-xl font-bold text-[#102636]">
                Cek cepat data anak
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#5a6d78]">
                Gunakan untuk menghitung prediksi awal tanpa menyimpan data.
              </p>
            </Link>
            <Link
              to="/petugas/input-massal"
              className="rounded-lg border border-[#d7e5ee] bg-[#f3f8fb] p-5 transition hover:border-[#8bc4df] hover:bg-white"
            >
              <p className="text-sm font-bold text-[#0369a1]">Input Massal</p>
              <h3 className="mt-2 text-xl font-bold text-[#102636]">
                Upload CSV atau XLSX
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#5a6d78]">
                Gunakan untuk memproses banyak data pengukuran sekaligus.
              </p>
            </Link>
          </div>
        </Panel>

        <RingkasanLaporan
          data={ringkasan}
          idUser={currentUserId}
          actorUserId={currentUser?.id_user}
          riwayat={riwayat}
          reportMonth={reportMonth}
          variant="officer"
        />
        
        <RiwayatPrediksiTable
          variant="officer"
          data={riwayat}
          graphData={riwayatGrafik}
          graphHistoryLimit={graphHistoryLimit}
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
          note="Menampilkan data terbaru tiap anak pada bulan laporan. Klik nama balita untuk melihat riwayat 12 pengecekan terakhir yang berlanjut lintas bulan."
          emptyMessage="Belum ada riwayat pemeriksaan. Gunakan input massal untuk memproses data balita."
        />
      </div>
    </DashboardLayout>
  );
}
