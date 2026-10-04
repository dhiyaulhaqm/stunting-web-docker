import DashboardLayout from "../../components/layout/DashboardLayout";
import QuickPrediksiForm from "../../components/prediksi/QuickPrediksiForm";
import Alert from "../../components/ui/Alert";
import UserContextCard from "../../components/ui/UserContextCard";
import { useRoleUser } from "../../hooks/useRoleUser";

const petugasNavItems = [
  { label: "Dashboard", to: "/petugas" },
  { label: "Cek Satuan", to: "/petugas/input-satuan" },
  { label: "Cek Massal", to: "/petugas/input-massal" },
];

export default function PetugasInputSatuanPage() {
  const { currentUser, error: userError } = useRoleUser("petugas_kesehatan");

  return (
    <DashboardLayout
      variant="officer"
      eyebrow="Cek Satuan"
      title="Cek cepat data anak."
      subtitle="Gunakan halaman ini untuk menghitung prediksi awal tanpa menyimpan data ke database."
      navItems={petugasNavItems}
    >
      <div className="grid gap-5">
        {userError && <Alert variant="officer">{userError}</Alert>}
        <UserContextCard
          variant="officer"
          user={currentUser}
          emptyMessage="Belum ada user dengan role petugas kesehatan. Buat user tersebut dari halaman Admin."
        />
        <QuickPrediksiForm variant="officer" />
      </div>
    </DashboardLayout>
  );
}
