import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Alert from "../../components/ui/Alert";
import Panel from "../../components/ui/Panel";
import UserPage from "../users/UserPage";
import {
  getAktivitasUsers,
  getErrorMessage,
  type AktivitasUser,
} from "../../services/dashboardService";
import {
  formatActivityLabel,
  formatCodeLabel,
  formatDateTime,
} from "../../utils/format";

const adminNavItems = [
  { label: "Dashboard", to: "/admin" },
  { label: "Log Aktivitas", to: "/admin/aktivitas" },
];

export default function AdminDashboard() {
  const [activities, setActivities] = useState<AktivitasUser[]>([]);
  const [error, setError] = useState("");

  const fetchActivities = useCallback(async () => {
    try {
      setError("");
      const response = await getAktivitasUsers({ page: 1, perPage: 8 });
      setActivities(response.data.data);
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal memuat aktivitas user."));
    }
  }, []);

  useEffect(() => {
    void fetchActivities();
  }, [fetchActivities]);

  return (
    <DashboardLayout
      variant="officer"
      eyebrow="Dashboard Admin"
      title="Kelola user dan pantau aktivitas sistem."
      subtitle="Admin mengatur akun untuk petugas kesehatan dan orang tua, lalu memantau aktivitas penggunaan aplikasi."
      navItems={adminNavItems}
    >
      <div className="grid gap-5">
        {error && <Alert variant="officer">{error}</Alert>}
        <UserPage variant="officer" onChanged={() => void fetchActivities()} />
        <Panel
          variant="officer"
          title="Aktivitas Terbaru"
          description=""
          action={
            <Link
              className="rounded-lg border border-[#bfd3df] bg-white px-4 py-2 text-sm font-bold text-[#0369a1] transition hover:bg-[#f3f8fb]"
              to="/admin/aktivitas"
            >
              Lihat Semua
            </Link>
          }
        >
          <div className="grid gap-3">
            {activities.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#bfd3df] bg-[#f3f8fb] px-4 py-5 text-sm text-[#5a6d78]">
                Belum ada aktivitas.
              </p>
            ) : (
              activities.map((item) => (
                <div
                  className="grid gap-3 rounded-lg border border-[#d7e5ee] bg-[#f3f8fb] px-4 py-3 sm:grid-cols-[140px_minmax(0,1fr)_180px] sm:items-center"
                  key={item.id_aktivitas}
                >
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0369a1] ring-1 ring-[#cbe2ef]">
                    {formatCodeLabel(item.modul)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#102636]">
                      {formatActivityLabel(item.aktivitas)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#5a6d78]">
                      {item.deskripsi ?? "Tidak ada deskripsi."}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#5a6d78] sm:text-right">
                    {formatDateTime(item.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </DashboardLayout>
  );
}
