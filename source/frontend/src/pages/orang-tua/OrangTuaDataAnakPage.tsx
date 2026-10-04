import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Alert from "../../components/ui/Alert";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Panel from "../../components/ui/Panel";
import UserContextCard from "../../components/ui/UserContextCard";
import { useRoleUser } from "../../hooks/useRoleUser";
import {
  createAnak,
  deleteAnak,
  getAnak,
  getErrorMessage,
  updateAnak,
  type Anak,
  type AnakPayload,
} from "../../services/dashboardService";
import { formatDate } from "../../utils/format";

const orangTuaNavItems = [
  { label: "Dashboard", to: "/orang-tua" },
  { label: "Data Anak", to: "/orang-tua/data-anak" },
];

const initialForm = {
  nama: "",
  tanggal_lahir: "",
  jenis_kelamin: "laki-laki",
  alamat: "",
};

const fieldLabelClass = "text-sm font-semibold text-[#344f47]";
const fieldInputClass =
  "rounded-lg border border-[#c9ddd3] bg-white px-3 py-2 outline-none focus:border-[#0f766e] focus:ring-4 focus:ring-[#dff5eb]";
const secondaryButtonClass =
  "rounded-lg border border-[#d6e4dc] bg-white px-4 py-2 text-sm font-semibold text-[#45635a] transition hover:border-[#0f766e] hover:text-[#0f766e]";
const tableHeaderClass =
  "border-b border-[#d8eadf] text-xs uppercase tracking-wide text-[#60766e]";
const tableBodyClass = "divide-y divide-[#e4f0e9] text-sm text-[#3a5149]";

export default function OrangTuaDataAnakPage() {
  const { currentUser, error: userError } = useRoleUser("orang_tua");
  const [anakList, setAnakList] = useState<Anak[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingAnakId, setDeletingAnakId] = useState<number | null>(null);
  const [pendingDeleteAnak, setPendingDeleteAnak] = useState<Anak | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const currentUserId = currentUser?.id_user;

  const loadAnak = useCallback(async () => {
    if (!currentUserId) {
      setAnakList([]);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await getAnak(currentUserId);
      setAnakList(response.data.data);
    } catch (caught) {
      setError(getErrorMessage(caught, "Gagal memuat data anak."));
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadAnak();
  }, [loadAnak]);

  const resetForm = () => {
    setForm(initialForm);
    setEditId(null);
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUserId) {
      setStatus("User orang tua belum tersedia. Buat user terlebih dahulu di halaman Admin.");
      return;
    }

    const payload: AnakPayload = {
      id_user: currentUserId,
      nama: form.nama.trim(),
      tanggal_lahir: form.tanggal_lahir,
      jenis_kelamin: form.jenis_kelamin as "laki-laki" | "perempuan",
      alamat: form.alamat.trim(),
    };

    try {
      setSubmitting(true);
      setStatus("");
      setError("");

      if (editId) {
        await updateAnak(editId, payload);
        setStatus("Data anak berhasil diperbarui.");
      } else {
        await createAnak(payload);
        setStatus("Data anak berhasil ditambahkan.");
      }

      resetForm();
      await loadAnak();
    } catch (caught) {
      setStatus(getErrorMessage(caught, "Gagal menyimpan data anak."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (anak: Anak) => {
    setEditId(anak.id_anak);
    setForm({
      nama: anak.nama,
      tanggal_lahir: anak.tanggal_lahir,
      jenis_kelamin: anak.jenis_kelamin || "laki-laki",
      alamat: anak.alamat ?? "",
    });
    setStatus("");
  };

  const confirmDeleteAnak = async () => {
    if (!pendingDeleteAnak) return;
    try {
      setDeletingAnakId(pendingDeleteAnak.id_anak);
      setError("");
      setStatus("");
      await deleteAnak(pendingDeleteAnak.id_anak);
      setStatus("Data anak berhasil dihapus.");
      if (editId === pendingDeleteAnak.id_anak) {
        resetForm();
      }
      setPendingDeleteAnak(null);
      await loadAnak();
    } catch (caught) {
      setStatus(getErrorMessage(caught, "Gagal menghapus data anak."));
    } finally {
      setDeletingAnakId(null);
    }
  };

  return (
    <DashboardLayout
      variant="parent"
      eyebrow="Data Anak"
      title="Kelola identitas anak."
      subtitle="Tambah data anak, ubah identitas, dan lihat daftar anak yang terhubung dengan akun orang tua."
      navItems={orangTuaNavItems}
    >
      <div className="grid gap-5">
        {(userError || error) && <Alert variant="parent">{userError || error}</Alert>}
        <UserContextCard
          variant="parent"
          user={currentUser}
          emptyMessage="Belum ada user dengan role orang tua. Buat user tersebut dari halaman Admin."
        />


        <Panel
          variant="parent"
          title="Daftar Data Anak Anda"
          description="Hanya menampilkan identitas anak."
        >
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse text-left">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="px-3 py-3">Nama</th>
                  <th className="px-3 py-3">Tanggal Lahir</th>
                  <th className="px-3 py-3">Jenis Kelamin</th>
                  <th className="px-3 py-3">Alamat</th>
                  <th className="px-3 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className={tableBodyClass}>
                {loading ? (
                  <tr>
                    <td className="px-3 py-4" colSpan={5}>
                      Memuat data anak...
                    </td>
                  </tr>
                ) : anakList.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4" colSpan={5}>
                      Belum ada data anak.
                    </td>
                  </tr>
                ) : (
                  anakList.map((anak) => (
                    <tr key={anak.id_anak}>
                      <td className="px-3 py-4 font-semibold text-[#13251f]">
                        {anak.nama}
                      </td>
                      <td className="px-3 py-4">{formatDate(anak.tanggal_lahir)}</td>
                      <td className="px-3 py-4">{anak.jenis_kelamin}</td>
                      <td className="px-3 py-4">{anak.alamat || "-"}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-[#d6e4dc] bg-white px-3 py-1.5 text-xs font-bold text-[#45635a] transition hover:border-[#0f766e] hover:text-[#0f766e]"
                            type="button"
                            onClick={() => handleEdit(anak)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-[#f3c5bc] bg-[#fff4f2] px-3 py-1.5 text-xs font-bold text-[#a23a2a] transition hover:bg-[#ffe8e3]"
                            type="button"
                            disabled={deletingAnakId === anak.id_anak}
                            onClick={() => setPendingDeleteAnak(anak)}
                          >
                            {deletingAnakId === anak.id_anak ? "Menghapus..." : "Hapus"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>


        <Panel
          variant="parent"
          title={editId ? "Edit Data Anak" : "Input Data Anak"}
          description="Data ini dipakai sebagai identitas balita saat input pengukuran."
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className={fieldLabelClass}>Nama Balita</span>
              <input
                className={fieldInputClass}
                name="nama"
                value={form.nama}
                onChange={handleChange}
                required
              />
            </label>

            <label className="grid gap-2">
              <span className={fieldLabelClass}>Tanggal Lahir</span>
              <input
                className={fieldInputClass}
                type="date"
                name="tanggal_lahir"
                value={form.tanggal_lahir}
                onChange={handleChange}
                required
              />
            </label>

            <label className="grid gap-2">
              <span className={fieldLabelClass}>Jenis Kelamin</span>
              <select
                className={fieldInputClass}
                name="jenis_kelamin"
                value={form.jenis_kelamin}
                onChange={handleChange}
              >
                <option value="laki-laki">Laki-laki</option>
                <option value="perempuan">Perempuan</option>
              </select>
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className={fieldLabelClass}>Alamat</span>
              <textarea
                className={`min-h-24 ${fieldInputClass}`}
                name="alamat"
                value={form.alamat}
                onChange={handleChange}
                required
              />
            </label>

            <div className="flex flex-wrap items-end gap-3">
              <button
                className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Menyimpan..." : editId ? "Update Data Anak" : "Simpan Data Anak"}
              </button>
              {editId && (
                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={resetForm}
                >
                  Batal
                </button>
              )}
              {status && <p className="text-sm text-[#60766e]">{status}</p>}
            </div>
          </form>
        </Panel>
        <ConfirmDialog
          open={Boolean(pendingDeleteAnak)}
          variant="parent"
          title="Hapus data anak?"
          description="Identitas anak, riwayat pengukuran, dan hasil prediksi yang terhubung akan ikut terhapus."
          details={
            <>
              <strong>{pendingDeleteAnak?.nama ?? "Data anak"}</strong>
              <br />
              Tanggal lahir:{" "}
              {pendingDeleteAnak?.tanggal_lahir
                ? formatDate(pendingDeleteAnak.tanggal_lahir)
                : "-"}
            </>
          }
          loading={deletingAnakId === pendingDeleteAnak?.id_anak}
          confirmLabel="Hapus Data Anak"
          onCancel={() => setPendingDeleteAnak(null)}
          onConfirm={confirmDeleteAnak}
        />
      </div>
    </DashboardLayout>
  );
}
