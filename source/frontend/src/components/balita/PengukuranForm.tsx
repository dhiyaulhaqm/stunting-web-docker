import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createPengukuran,
  getErrorMessage,
  type Anak,
  type PengukuranPayload,
} from "../../services/dashboardService";
import Panel from "../ui/Panel";

const initialPengukuranForm = {
  id_anak: "",
  umur_bulan: "",
  berat_badan: "",
  tinggi_badan: "",
};

type PengukuranField = keyof typeof initialPengukuranForm;
type PengukuranFieldErrors = Partial<Record<PengukuranField, string>>;

type PengukuranFormProps = {
  anakList: Anak[];
  selectedAnakId: string;
  loadingAnak?: boolean;
  variant?: "default" | "parent";
  onAnakSelect: (idAnak: string) => void;
  onSuccess: (idAnak?: string) => void;
};

const calculateAgeMonths = (tanggalLahir?: string | null) => {
  if (!tanggalLahir) return null;

  const birthDate = new Date(`${tanggalLahir}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let months =
    (today.getFullYear() - birthDate.getFullYear()) * 12 +
    today.getMonth() -
    birthDate.getMonth();

  if (today.getDate() < birthDate.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
};

export default function PengukuranForm({
  anakList,
  selectedAnakId,
  loadingAnak = false,
  variant = "default",
  onAnakSelect,
  onSuccess,
}: PengukuranFormProps) {
  const isParent = variant === "parent";
  const [pengukuranForm, setPengukuranForm] = useState(initialPengukuranForm);
  const [fieldErrors, setFieldErrors] = useState<PengukuranFieldErrors>({});
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const actionLinkClass = isParent
    ? "rounded-lg border border-[#d6e4dc] bg-white px-4 py-2 text-sm font-semibold text-[#0f766e] transition hover:border-[#0f766e] hover:bg-[#f2fbf6]"
    : "rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950";
  const emptyClass = isParent
    ? "rounded-lg border border-dashed border-[#c9ddd3] bg-[#f7fbf6] p-4 text-sm text-[#5e716a]"
    : "rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600";
  const labelClass = isParent
    ? "text-sm font-semibold text-[#344f47]"
    : "text-sm font-semibold text-slate-700";
  const inputClass = isParent
    ? "h-12 w-full rounded-lg border border-[#c9ddd3] bg-white px-3 py-2 outline-none focus:border-[#0f766e] focus:ring-4 focus:ring-[#dff5eb] disabled:cursor-not-allowed disabled:bg-[#edf5f1]"
    : "h-14 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100";
  const helperClass = isParent ? "text-xs text-[#6c8078]" : "text-xs text-slate-500";
  const submitClass = isParent
    ? "h-12 w-full rounded-lg bg-[#0f766e] px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    : "h-14 w-full rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";
  const statusClass = isParent ? "text-sm text-[#60766e]" : "text-sm text-slate-600";
  const errorInputClass = isParent
    ? "border-red-500 focus:border-red-600 focus:ring-red-100"
    : "border-red-500 focus:border-red-600 focus:ring-red-100";
  const errorTextClass = "text-xs font-semibold text-red-600";

  const selectedAnak = useMemo(
    () => anakList.find((anak) => String(anak.id_anak) === pengukuranForm.id_anak),
    [anakList, pengukuranForm.id_anak]
  );
  const suggestedUmurBulan = calculateAgeMonths(selectedAnak?.tanggal_lahir);

  useEffect(() => {
    const nextId = selectedAnakId || (anakList[0] ? String(anakList[0].id_anak) : "");

    setPengukuranForm((current) => {
      if (!nextId) {
        return current.id_anak ? { ...current, id_anak: "", umur_bulan: "" } : current;
      }

      if (current.id_anak === nextId) {
        return current;
      }

      const nextAnak = anakList.find((anak) => String(anak.id_anak) === nextId);
      const nextSuggestedAge = calculateAgeMonths(nextAnak?.tanggal_lahir);

      return {
        ...current,
        id_anak: nextId,
        umur_bulan: nextSuggestedAge === null ? "" : String(nextSuggestedAge),
      };
    });
  }, [anakList, selectedAnakId]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    if (name in initialPengukuranForm) {
      setFieldErrors((current) => ({
        ...current,
        [name]: undefined,
      }));
    }

    if (name === "id_anak") {
      const nextAnak = anakList.find((anak) => String(anak.id_anak) === value);
      const nextSuggestedAge = calculateAgeMonths(nextAnak?.tanggal_lahir);

      setPengukuranForm((current) => ({
        ...current,
        id_anak: value,
        umur_bulan: nextSuggestedAge === null ? "" : String(nextSuggestedAge),
      }));
      onAnakSelect(value);
      return;
    }

    setPengukuranForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const validateForm = (): PengukuranFieldErrors => {
    const errors: PengukuranFieldErrors = {};
    const umurBulan = Number(pengukuranForm.umur_bulan);
    const beratBadan = Number(pengukuranForm.berat_badan);
    const tinggiBadan = Number(pengukuranForm.tinggi_badan);

    if (!pengukuranForm.id_anak) {
      errors.id_anak = "Pilih balita terlebih dahulu.";
    }

    if (!pengukuranForm.umur_bulan.trim()) {
      errors.umur_bulan = "Umur bulan wajib diisi.";
    } else if (!Number.isInteger(umurBulan) || umurBulan < 0 || umurBulan > 60) {
      errors.umur_bulan = "Masukkan umur antara 0 sampai 60 bulan.";
    }

    if (!pengukuranForm.berat_badan.trim()) {
      errors.berat_badan = "Berat badan wajib diisi.";
    } else if (!Number.isFinite(beratBadan) || beratBadan <= 0 || beratBadan > 40) {
      errors.berat_badan = "Masukkan berat lebih dari 0 hingga 40 kg.";
    }

    if (!pengukuranForm.tinggi_badan.trim()) {
      errors.tinggi_badan = "Tinggi badan wajib diisi.";
    } else if (!Number.isFinite(tinggiBadan) || tinggiBadan <= 0 || tinggiBadan > 130) {
      errors.tinggi_badan = "Masukkan tinggi lebih dari 0 hingga 130 cm.";
    }

    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus("");
      return;
    }

    const payload: PengukuranPayload = {
      id_anak: Number(pengukuranForm.id_anak),
      umur_bulan: Number(pengukuranForm.umur_bulan),
      berat_badan: Number(pengukuranForm.berat_badan),
      tinggi_badan: Number(pengukuranForm.tinggi_badan),
    };

    try {
      setSubmitting(true);
      setStatus("");
      setFieldErrors({});
      await createPengukuran(payload);
      setPengukuranForm((current) => ({
        ...initialPengukuranForm,
        id_anak: current.id_anak,
        umur_bulan: suggestedUmurBulan === null ? "" : String(suggestedUmurBulan),
      }));
      setStatus("Data pengukuran berhasil disimpan dan diprediksi.");
      onSuccess(pengukuranForm.id_anak);
    } catch (error) {
      setStatus(getErrorMessage(error, "Gagal menyimpan data pengukuran."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel
      variant={variant}
      title="Input Data Pengukuran"
      description="Umur bulan diisi sebagai saran dari tanggal lahir. Jika tidak sesuai, ubah nilainya sebelum submit."
      action={
        <Link
          className={actionLinkClass}
          to="/orang-tua/data-anak"
        >
          Kelola Data Anak
        </Link>
      }
    >
      {anakList.length === 0 && !loadingAnak ? (
        <div className={emptyClass}>
          Belum ada data anak. Tambahkan identitas anak terlebih dahulu di halaman Data Anak.
        </div>
      ) : (
        <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
          <label className="grid min-w-0 gap-2">
            <span className={labelClass}>Balita</span>
            <select
              className={`${inputClass} ${fieldErrors.id_anak ? errorInputClass : ""}`}
              name="id_anak"
              value={pengukuranForm.id_anak}
              onChange={handleChange}
              disabled={loadingAnak || anakList.length === 0}
              required
              aria-invalid={Boolean(fieldErrors.id_anak)}
              aria-describedby={fieldErrors.id_anak ? "id-anak-error" : undefined}
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
            {fieldErrors.id_anak && (
              <span id="id-anak-error" className={errorTextClass}>
                {fieldErrors.id_anak}
              </span>
            )}
          </label>

          <div className="grid items-start gap-4 lg:grid-cols-3">
            <label className="grid min-w-0 gap-2">
              <span className={labelClass}>Umur Bulan</span>
              <input
                className={`${inputClass} ${fieldErrors.umur_bulan ? errorInputClass : ""}`}
                type="number"
                min="0"
                max="60"
                name="umur_bulan"
                value={pengukuranForm.umur_bulan}
                onChange={handleChange}
                required
                aria-invalid={Boolean(fieldErrors.umur_bulan)}
                aria-describedby={fieldErrors.umur_bulan ? "umur-bulan-error" : undefined}
              />
              {fieldErrors.umur_bulan && (
                <span id="umur-bulan-error" className={errorTextClass}>
                  {fieldErrors.umur_bulan}
                </span>
              )}
              {suggestedUmurBulan !== null && (
                <span className={helperClass}>
                  Saran dari tanggal lahir: {suggestedUmurBulan} bulan.
                </span>
              )}
            </label>

            <label className="grid min-w-0 gap-2">
              <span className={labelClass}>Berat Badan (kg)</span>
              <input
                className={`${inputClass} ${fieldErrors.berat_badan ? errorInputClass : ""}`}
                type="number"
                min="0"
                step="0.1"
                name="berat_badan"
                value={pengukuranForm.berat_badan}
                onChange={handleChange}
                required
                aria-invalid={Boolean(fieldErrors.berat_badan)}
                aria-describedby={fieldErrors.berat_badan ? "berat-badan-error" : undefined}
              />
              {fieldErrors.berat_badan && (
                <span id="berat-badan-error" className={errorTextClass}>
                  {fieldErrors.berat_badan}
                </span>
              )}
            </label>

            <label className="grid min-w-0 gap-2">
              <span className={labelClass}>Tinggi Badan (cm)</span>
              <input
                className={`${inputClass} ${fieldErrors.tinggi_badan ? errorInputClass : ""}`}
                type="number"
                min="0"
                step="0.1"
                name="tinggi_badan"
                value={pengukuranForm.tinggi_badan}
                onChange={handleChange}
                required
                aria-invalid={Boolean(fieldErrors.tinggi_badan)}
                aria-describedby={fieldErrors.tinggi_badan ? "tinggi-badan-error" : undefined}
              />
              {fieldErrors.tinggi_badan && (
                <span id="tinggi-badan-error" className={errorTextClass}>
                  {fieldErrors.tinggi_badan}
                </span>
              )}
            </label>
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <button
              className={submitClass}
              type="submit"
              disabled={submitting || loadingAnak || anakList.length === 0}
            >
              {submitting ? "Menyimpan..." : "Simpan & Prediksi"}
            </button>
            {status && <p className={statusClass}>{status}</p>}
          </div>
        </form>
      )}
    </Panel>
  );
}
