import { useCallback, useEffect, useState } from "react";
import PengukuranForm from "../../components/balita/PengukuranForm";
import DashboardLayout from "../../components/layout/DashboardLayout";
import RiwayatPrediksiTable from "../../components/prediksi/RiwayatPrediksiTable";
import Alert from "../../components/ui/Alert";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import StatCard from "../../components/ui/StatCard";
import UserContextCard from "../../components/ui/UserContextCard";
import { useRoleUser } from "../../hooks/useRoleUser";
import {
  getAnak,
  getErrorMessage,
  getRiwayatPrediksi,
  deletePengukuran,
  type Anak,
  type Prediksi,
} from "../../services/dashboardService";

const orangTuaNavItems = [
  { label: "Dashboard", to: "/orang-tua" },
  { label: "Data Anak", to: "/orang-tua/data-anak" },
];

export default function OrangTuaDashboard() {
  const { currentUser, error: userError } = useRoleUser("orang_tua");
  const [anakList, setAnakList] = useState<Anak[]>([]);
  const [selectedAnakId, setSelectedAnakId] = useState("");
  const [riwayat, setRiwayat] = useState<Prediksi[]>([]);
  const [loadingAnak, setLoadingAnak] = useState(false);
  const [deletingPrediksiId, setDeletingPrediksiId] = useState<number | null>(null);
  const [pendingDeleteRiwayat, setPendingDeleteRiwayat] =
    useState<Prediksi | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const currentUserId = currentUser?.id_user;
  const latest = riwayat[0];
  const selectedAnak = anakList.find(
    (anak) => String(anak.id_anak) === selectedAnakId
  );

  const refreshAnak = useCallback(async (preferredAnakId?: string) => {
    if (!currentUserId) {
      setAnakList([]);
      setSelectedAnakId("");
      return;
    }

    try {
      setLoadingAnak(true);
      setError("");
      setStatus("");
      const response = await getAnak(currentUserId);
      const data = response.data.data;
      setAnakList(data);
      setSelectedAnakId((current) => {
        if (
          preferredAnakId &&
          data.some((anak) => String(anak.id_anak) === preferredAnakId)
        ) {
          return preferredAnakId;
        }

        if (current && data.some((anak) => String(anak.id_anak) === current)) {
          return current;
        }

        return data[0] ? String(data[0].id_anak) : "";
      });
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal memuat data anak."));
    } finally {
      setLoadingAnak(false);
    }
  }, [currentUserId]);

  const refreshData = useCallback(async (idAnak = selectedAnakId) => {
    if (!currentUserId || !idAnak) {
      setRiwayat([]);
      return;
    }

    try {
      setError("");
      const response = await getRiwayatPrediksi(
        currentUserId,
        Number(idAnak)
      );
      setRiwayat(response.data.data);
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal memuat dashboard orang tua."));
    }
  }, [currentUserId, selectedAnakId]);

  useEffect(() => {
    void refreshAnak();
  }, [refreshAnak]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const refreshDashboard = async (idAnak?: string) => {
    try {
      setError("");
      setStatus("");
      await refreshAnak(idAnak);
      await refreshData(idAnak || selectedAnakId);
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal memuat dashboard orang tua."));
    }
  };

  const requestDeleteRiwayat = (item: Prediksi) => {
    const idPengukuran = item.pengukuran?.id_pengukuran ?? item.id_pengukuran;

    if (!idPengukuran) {
      setError("Data pengukuran untuk riwayat ini tidak ditemukan.");
      return;
    }

    setPendingDeleteRiwayat(item);
  };

  const confirmDeleteRiwayat = async () => {
    if (!pendingDeleteRiwayat) return;

    const idPengukuran =
      pendingDeleteRiwayat.pengukuran?.id_pengukuran ??
      pendingDeleteRiwayat.id_pengukuran;

    try {
      setDeletingPrediksiId(pendingDeleteRiwayat.id_prediksi);
      setError("");
      setStatus("");
      await deletePengukuran(idPengukuran);
      setStatus("Riwayat pengukuran berhasil dihapus. Silakan input ulang jika diperlukan.");
      setPendingDeleteRiwayat(null);
      await refreshData(selectedAnakId);
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal menghapus riwayat pengukuran."));
    } finally {
      setDeletingPrediksiId(null);
    }
  };

  return (
    <DashboardLayout
      variant="parent"
      eyebrow="Dashboard Orang Tua"
      title="Pantau data balita dan riwayat prediksi anak."
      subtitle="Orang tua menginput pengukuran dan melihat riwayat prediksi untuk memantau perkembangan anak."
      navItems={orangTuaNavItems}
    >
      <div className="grid gap-5">
        {(userError || error) && <Alert variant="parent">{userError || error}</Alert>}
        {status && (
          <div className="rounded-lg border border-[#cfe5db] bg-[#eef9f2] px-4 py-3 text-sm text-[#0f766e]">
            {status}
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <UserContextCard
            variant="parent"
            user={currentUser}
            emptyMessage="Belum ada user dengan role orang tua. Buat user tersebut dari halaman Admin."
          />
          <div className="grid min-w-0 gap-4 sm:grid-cols-3">
            <StatCard
              variant="parent"
              label="Riwayat Prediksi"
              value={riwayat.length}
            />
            <StatCard
              variant="parent"
              label="Status Terakhir"
              value={latest?.status_gizi ?? "-"}
            />
            <StatCard
              variant="parent"
              label="Balita Dipilih"
              value={selectedAnak?.nama ?? "-"}
            />
          </div>
        </div>
        <PengukuranForm
          variant="parent"
          anakList={anakList}
          selectedAnakId={selectedAnakId}
          loadingAnak={loadingAnak}
          onAnakSelect={setSelectedAnakId}
          onSuccess={refreshDashboard}
        />
        <RiwayatPrediksiTable
          variant="parent"
          data={riwayat}
          deletingPrediksiId={deletingPrediksiId}
          showNik={false}
          emptyMessage="Belum ada pengukuran untuk balita ini. Isi data pengukuran terlebih dahulu."
          onDelete={requestDeleteRiwayat}
        />
        <ConfirmDialog
          open={Boolean(pendingDeleteRiwayat)}
          variant="parent"
          title="Hapus riwayat pengukuran?"
          description="Data pengukuran dan hasil prediksi ini akan dihapus. Orang tua perlu input ulang jika data sebelumnya salah."
          details={
            <>
              <strong>{pendingDeleteRiwayat?.anak?.nama ?? selectedAnak?.nama ?? "Balita"}</strong>
              <br />
              Status: {pendingDeleteRiwayat?.status_gizi ?? "-"}
            </>
          }
          loading={deletingPrediksiId === pendingDeleteRiwayat?.id_prediksi}
          confirmLabel="Hapus Riwayat"
          onCancel={() => setPendingDeleteRiwayat(null)}
          onConfirm={confirmDeleteRiwayat}
        />
      </div>
    </DashboardLayout>
  );
}
