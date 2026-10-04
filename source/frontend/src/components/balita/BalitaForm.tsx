import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  createAnak,
  createPengukuran,
  getAnak,
  getErrorMessage,
  type Anak,
  type AnakPayload,
  type PengukuranPayload,
} from "../../services/dashboardService";
import Panel from "../ui/Panel";

const initialAnakForm = {
  nama: "",
  tanggal_lahir: "",
  jenis_kelamin: "laki-laki",
};

const initialPengukuranForm = {
  id_anak: "",
  umur_bulan: "",
  berat_badan: "",
  tinggi_badan: "",
};

type BalitaFormProps = {
  idUser?: number;
  title?: string;
  selectedAnakId?: string;
  onAnakSelect?: (idAnak: string) => void;
  onSuccess: (idAnak?: string) => void;
};

export default function BalitaForm({
  idUser,
  title = "Input Data Balita",
  selectedAnakId,
  onAnakSelect,
  onSuccess,
}: BalitaFormProps) {
  const [anakList, setAnakList] = useState<Anak[]>([]);
  const [anakForm, setAnakForm] = useState(initialAnakForm);
  const [pengukuranForm, setPengukuranForm] = useState(initialPengukuranForm);
  const [anakStatus, setAnakStatus] = useState("");
  const [pengukuranStatus, setPengukuranStatus] = useState("");
  const [loadingAnak, setLoadingAnak] = useState(false);
  const [submittingAnak, setSubmittingAnak] = useState(false);
  const [submittingPengukuran, setSubmittingPengukuran] = useState(false);

  const loadAnak = useCallback(async (selectedId?: string) => {
    if (!idUser) {
      setAnakList([]);
      setPengukuranForm(initialPengukuranForm);
      return;
    }

    try {
      setLoadingAnak(true);
      const response = await getAnak(idUser);
      const data = response.data.data;
      setAnakList(data);
      setPengukuranForm((current) => ({
        ...current,
        id_anak:
          selectedId ||
          selectedAnakId ||
          current.id_anak ||
          (data[0] ? String(data[0].id_anak) : ""),
      }));
    } catch (error) {
      setAnakStatus(getErrorMessage(error, "Gagal memuat data anak."));
    } finally {
      setLoadingAnak(false);
    }
  }, [idUser, selectedAnakId]);

  useEffect(() => {
    void loadAnak();
  }, [loadAnak]);

  useEffect(() => {
    if (!selectedAnakId) return;

    setPengukuranForm((current) => ({
      ...current,
      id_anak: selectedAnakId,
    }));
  }, [selectedAnakId]);

  const handleAnakChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setAnakForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handlePengukuranChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setPengukuranForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (name === "id_anak") {
      onAnakSelect?.(value);
    }
  };

  const handleAnakSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!idUser) {
      setAnakStatus("User untuk role ini belum tersedia. Buat user terlebih dahulu di halaman Admin.");
      return;
    }

    const payload: AnakPayload = {
      id_user: idUser,
      nama: anakForm.nama,
      tanggal_lahir: anakForm.tanggal_lahir,
      jenis_kelamin: anakForm.jenis_kelamin as "laki-laki" | "perempuan",
    };

    try {
      setSubmittingAnak(true);
      const response = await createAnak(payload);
      const createdId = String(response.data.data.id_anak);
      setAnakForm(initialAnakForm);
      setAnakStatus("Data anak berhasil disimpan.");
      await loadAnak(createdId);
      onAnakSelect?.(createdId);
      onSuccess(createdId);
    } catch (error) {
      setAnakStatus(getErrorMessage(error, "Gagal menyimpan data anak."));
    } finally {
      setSubmittingAnak(false);
    }
  };

  const handlePengukuranSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pengukuranForm.id_anak) {
      setPengukuranStatus("Pilih atau tambahkan data anak terlebih dahulu.");
      return;
    }

    const payload: PengukuranPayload = {
      id_anak: Number(pengukuranForm.id_anak),
      umur_bulan: Number(pengukuranForm.umur_bulan),
      berat_badan: Number(pengukuranForm.berat_badan),
      tinggi_badan: Number(pengukuranForm.tinggi_badan),
    };

    try {
      setSubmittingPengukuran(true);
      await createPengukuran(payload);
      setPengukuranForm((current) => ({
        ...initialPengukuranForm,
        id_anak: current.id_anak,
      }));
      setPengukuranStatus("Data pengukuran berhasil disimpan dan diprediksi.");
      onSuccess(pengukuranForm.id_anak);
    } catch (error) {
      setPengukuranStatus(getErrorMessage(error, "Gagal menyimpan data pengukuran."));
    } finally {
      setSubmittingPengukuran(false);
    }
  };

  return (
    <div className="grid gap-4">
      <Panel title={title} description="Simpan identitas anak satu kali.">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAnakSubmit}>
          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Nama Balita</span>
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              name="nama"
              value={anakForm.nama}
              onChange={handleAnakChange}
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Tanggal Lahir</span>
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              type="date"
              name="tanggal_lahir"
              value={anakForm.tanggal_lahir}
              onChange={handleAnakChange}
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Jenis Kelamin</span>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              name="jenis_kelamin"
              value={anakForm.jenis_kelamin}
              onChange={handleAnakChange}
            >
              <option value="laki-laki">Laki-laki</option>
              <option value="perempuan">Perempuan</option>
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={submittingAnak}
            >
              {submittingAnak ? "Menyimpan..." : "Simpan Data Anak"}
            </button>
            {anakStatus && <p className="text-sm text-slate-600">{anakStatus}</p>}
          </div>
        </form>
      </Panel>

      <Panel
        title="Input Data Pengukuran"
        description="Tanggal pengukuran otomatis memakai tanggal saat submit."
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handlePengukuranSubmit}>
          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Balita</span>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              name="id_anak"
              value={pengukuranForm.id_anak}
              onChange={handlePengukuranChange}
              disabled={loadingAnak || anakList.length === 0}
              required
            >
              <option value="">
                {loadingAnak ? "Memuat data anak..." : "Pilih balita"}
              </option>
              {anakList.map((anak) => (
                <option key={anak.id_anak} value={anak.id_anak}>
                  {anak.nama}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Umur Bulan</span>
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              type="number"
              min="0"
              max="60"
              name="umur_bulan"
              value={pengukuranForm.umur_bulan}
              onChange={handlePengukuranChange}
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Berat Badan (kg)</span>
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              type="number"
              min="0"
              step="0.1"
              name="berat_badan"
              value={pengukuranForm.berat_badan}
              onChange={handlePengukuranChange}
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Tinggi Badan (cm)</span>
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              type="number"
              min="0"
              step="0.1"
              name="tinggi_badan"
              value={pengukuranForm.tinggi_badan}
              onChange={handlePengukuranChange}
              required
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={submittingPengukuran || loadingAnak || anakList.length === 0}
            >
              {submittingPengukuran ? "Menyimpan..." : "Simpan & Prediksi"}
            </button>
            {pengukuranStatus && (
              <p className="text-sm text-slate-600">{pengukuranStatus}</p>
            )}
          </div>
        </form>
      </Panel>
    </div>
  );
}
