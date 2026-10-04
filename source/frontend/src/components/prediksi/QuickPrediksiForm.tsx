import { type ChangeEvent, type FormEvent, useState } from "react";
import {
  getErrorMessage,
  hitungPrediksiCepat,
  type QuickPrediksiPayload,
  type QuickPrediksiResult,
} from "../../services/dashboardService";
import Panel from "../ui/Panel";

const initialForm = {
  umur_bulan: "",
  berat_badan: "",
  tinggi_badan: "",
  jenis_kelamin: "laki-laki",
};

type QuickPrediksiFormProps = {
  variant?: "default" | "officer";
};

export default function QuickPrediksiForm({
  variant = "default",
}: QuickPrediksiFormProps) {
  const isOfficer = variant === "officer";
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<QuickPrediksiResult | null>(null);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const zScoreIndicator = result?.detail?.indikator_z_score;
  const reviewMessage = result?.detail?.requires_review
    ? result.detail.review_message ??
      "Hasil prediksi perlu ditinjau petugas kesehatan."
    : "";
  const labelClass = isOfficer
    ? "text-sm font-semibold text-[#314b5a]"
    : "text-sm font-semibold text-slate-700";
  const inputClass = isOfficer
    ? "rounded-lg border border-[#bfd3df] bg-white px-3 py-2 outline-none focus:border-[#0369a1] focus:ring-4 focus:ring-[#dff1fb]"
    : "rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";
  const buttonClass = isOfficer
    ? "rounded-lg bg-[#0369a1] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#075985] disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60";
  const resultCardClass = isOfficer
    ? "mt-5 rounded-lg border border-[#cbe2ef] bg-[#eef7fb] p-4"
    : "mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4";

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setResult(null);
    setStatus("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: QuickPrediksiPayload = {
      umur_bulan: Number(form.umur_bulan),
      berat_badan: Number(form.berat_badan),
      tinggi_badan: Number(form.tinggi_badan),
      jenis_kelamin: form.jenis_kelamin as "laki-laki" | "perempuan",
    };

    try {
      setSubmitting(true);
      setStatus("");
      const response = await hitungPrediksiCepat(payload);
      setResult(response.data.data);
    } catch (error) {
      setStatus(getErrorMessage(error, "Cek cepat gagal diproses."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel
      variant={variant}
      title="Cek Cepat Data Anak"
      description="Form ini hanya menghitung prediksi awal dan tidak menyimpan data ke database."
    >
      <div
        className={
          isOfficer
            ? "mb-4 rounded-lg border border-[#cbe2ef] bg-[#eef7fb] px-4 py-3 text-sm text-[#0369a1]"
            : "mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        }
      >
        Cek cepat hanya menghitung prediksi sementara. Data anak dan pengukuran tidak
        tersimpan ke database.
      </div>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-2">
          <span className={labelClass}>Umur Bulan</span>
          <input
            className={inputClass}
            type="number"
            min="0"
            max="60"
            name="umur_bulan"
            value={form.umur_bulan}
            onChange={handleChange}
            required
          />
        </label>

        <label className="grid gap-2">
          <span className={labelClass}>Jenis Kelamin</span>
          <select
            className={inputClass}
            name="jenis_kelamin"
            value={form.jenis_kelamin}
            onChange={handleChange}
          >
            <option value="laki-laki">Laki-laki</option>
            <option value="perempuan">Perempuan</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className={labelClass}>Berat Badan (kg)</span>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.1"
            name="berat_badan"
            value={form.berat_badan}
            onChange={handleChange}
            required
          />
        </label>

        <label className="grid gap-2">
          <span className={labelClass}>Tinggi Badan (cm)</span>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.1"
            name="tinggi_badan"
            value={form.tinggi_badan}
            onChange={handleChange}
            required
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button
            className={buttonClass}
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Mengecek..." : "Cek Prediksi"}
          </button>
          {status && (
            <p className={isOfficer ? "text-sm text-[#5a6d78]" : "text-sm text-slate-600"}>
              {status}
            </p>
          )}
        </div>
      </form>

      {result && (
        <div className={resultCardClass}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="shrink-0 sm:w-56">
              <p
                className={
                  isOfficer
                    ? "text-xs font-bold uppercase tracking-[0.14em] text-[#0369a1]"
                    : "text-xs font-bold uppercase tracking-[0.14em] text-emerald-700"
                }
              >
                Hasil Skrining Awal
              </p>
              <p className={isOfficer ? "mt-2 text-2xl font-black text-[#102636]" : "mt-2 text-2xl font-black text-slate-950"}>
                {result.status_gizi}
              </p>
              {isOfficer && reviewMessage && (
                <p className="mt-3 rounded-lg border border-[#f4c7b8] bg-[#fff4f2] px-3 py-2 text-sm font-semibold leading-6 text-[#a23a2a]">
                  {reviewMessage}
                </p>
              )}
            </div>
            {result.detail && (
              <div className="flex min-w-0 flex-1 flex-wrap gap-3">
              {zScoreIndicator && (
                <div className={isOfficer ? "min-w-44 flex-1 rounded-lg bg-white p-4" : "min-w-44 flex-1 rounded-xl bg-white p-4"}>
                  <p className={isOfficer ? "text-xs font-bold text-[#5a6d78]" : "text-xs font-bold text-slate-500"}>Z-Score TB/U</p>
                  <p className={isOfficer ? "mt-1 text-xl font-black text-[#102636]" : "mt-1 text-xl font-black text-slate-950"}>
                    {zScoreIndicator.z_score}
                  </p>
                  <p className={isOfficer ? "mt-1 text-xs font-semibold text-[#5a6d78]" : "mt-1 text-xs font-semibold text-slate-500"}>
                    {zScoreIndicator.kategori}
                  </p>
                </div>
              )}
              {typeof result.detail.rasio_tinggi === "number" && (
                <div className={isOfficer ? "min-w-44 flex-1 rounded-lg bg-white p-4" : "min-w-44 flex-1 rounded-xl bg-white p-4"}>
                  <p className={isOfficer ? "text-xs font-bold text-[#5a6d78]" : "text-xs font-bold text-slate-500"}>Rasio Tinggi</p>
                  <p className={isOfficer ? "mt-1 text-xl font-black text-[#102636]" : "mt-1 text-xl font-black text-slate-950"}>
                    {result.detail.rasio_tinggi}
                  </p>
                </div>
              )}
              {typeof result.detail.rasio_berat === "number" && (
                <div className={isOfficer ? "min-w-44 flex-1 rounded-lg bg-white p-4" : "min-w-44 flex-1 rounded-xl bg-white p-4"}>
                  <p className={isOfficer ? "text-xs font-bold text-[#5a6d78]" : "text-xs font-bold text-slate-500"}>Rasio Berat</p>
                  <p className={isOfficer ? "mt-1 text-xl font-black text-[#102636]" : "mt-1 text-xl font-black text-slate-950"}>
                    {result.detail.rasio_berat}
                  </p>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
