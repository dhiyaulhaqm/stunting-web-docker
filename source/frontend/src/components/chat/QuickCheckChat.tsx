import { type FormEvent, useMemo, useState } from "react";
import {
  getErrorMessage,
  hitungPrediksiCepat,
  type QuickPrediksiPayload,
  type QuickPrediksiResult,
} from "../../services/dashboardService";

type ParsedInput = Partial<QuickPrediksiPayload>;

const exampleText = "Anak laki-laki saya berumur 36 bulan, tinggi 90 cm, berat 13 kg";
const quickCheckNote =
  "Prediksi awal berbasis AI, untuk lebih lanjut bisa tanyakan pada petugas kesehatan di posyandu dan puskesmas terdekat";

const parseDecimal = (value: string) => Number(value.replace(",", "."));

const parseGender = (value: string): "laki-laki" | "perempuan" | undefined => {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("perempuan") ||
    normalized.includes("wanita") ||
    normalized.includes("female")
  ) {
    return "perempuan";
  }

  if (
    normalized.includes("laki") ||
    normalized.includes("pria") ||
    normalized.includes("male")
  ) {
    return "laki-laki";
  }

  return undefined;
};

const parseQuickInput = (value: string): ParsedInput => {
  const normalized = value.toLowerCase();
  const yearMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(tahun|thn|th)\b/);
  const monthMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(bulan|bln)\b/);
  const heightMatch =
    normalized.match(/(?:tinggi|tb|panjang)\s*(?:badan)?\s*(\d+(?:[.,]\d+)?)\s*cm/) ??
    normalized.match(/(\d+(?:[.,]\d+)?)\s*cm\b/);
  const weightMatch =
    normalized.match(/(?:berat|bb)\s*(?:badan)?\s*(\d+(?:[.,]\d+)?)\s*kg/) ??
    normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);

  const result: ParsedInput = {};

  if (yearMatch) {
    result.umur_bulan = Math.round(parseDecimal(yearMatch[1]) * 12);
  } else if (monthMatch) {
    result.umur_bulan = Math.round(parseDecimal(monthMatch[1]));
  }

  if (heightMatch) {
    result.tinggi_badan = parseDecimal(heightMatch[1]);
  }

  if (weightMatch) {
    result.berat_badan = parseDecimal(weightMatch[1]);
  }

  const gender = parseGender(value);
  if (gender) {
    result.jenis_kelamin = gender;
  }

  return result;
};

const validateParsedInput = (data: ParsedInput) => {
  const errors: string[] = [];

  if (
    typeof data.umur_bulan !== "number" ||
    data.umur_bulan < 0 ||
    data.umur_bulan > 60
  ) {
    errors.push("umur anak 0-60 bulan atau 0-5 tahun");
  }

  if (
    typeof data.tinggi_badan !== "number" ||
    data.tinggi_badan <= 0 ||
    data.tinggi_badan > 130
  ) {
    errors.push("tinggi badan dalam cm");
  }

  if (
    typeof data.berat_badan !== "number" ||
    data.berat_badan <= 0 ||
    data.berat_badan > 40
  ) {
    errors.push("berat badan dalam kg");
  }

  return errors;
};

export default function QuickCheckChat() {
  const [input, setInput] = useState(exampleText);
  const [parsedData, setParsedData] = useState<ParsedInput>(() =>
    parseQuickInput(exampleText)
  );
  const [result, setResult] = useState<QuickPrediksiResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const previewItems = useMemo(
    () => [
      parsedData.umur_bulan ? `${parsedData.umur_bulan} bulan` : "Umur belum terbaca",
      parsedData.tinggi_badan ? `${parsedData.tinggi_badan} cm` : "Tinggi belum terbaca",
      parsedData.berat_badan ? `${parsedData.berat_badan} kg` : "Berat belum terbaca",
      parsedData.jenis_kelamin ?? "Jenis kelamin opsional",
    ],
    [parsedData]
  );
  const probabilityItems = result?.detail?.probabilitas
    ? Object.entries(result.detail.probabilitas)
    : [];
  const zScoreIndicator = result?.detail?.indikator_z_score;
  const resultCards: Array<{
    label: string;
    value: string | number;
    description?: string;
  }> = [];

  if (zScoreIndicator) {
    resultCards.push({
      label: "Z-Score TB/U",
      value: zScoreIndicator.z_score,
      description: zScoreIndicator.kategori,
    });
  }

  if (typeof result?.detail?.rasio_tinggi === "number") {
    resultCards.push({
      label: "Rasio tinggi",
      value: result.detail.rasio_tinggi,
    });
  }

  if (typeof result?.detail?.rasio_berat === "number") {
    resultCards.push({
      label: "Rasio berat",
      value: result.detail.rasio_berat,
    });
  }

  probabilityItems.forEach(([label, value]) => {
    resultCards.push({
      label: `Probabilitas ${label}`,
      value: `${Math.round(value * 100)}%`,
    });
  });

  const handleInputChange = (value: string) => {
    setInput(value);
    setParsedData(parseQuickInput(value));
    setResult(null);
    setMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = parseQuickInput(input);
    const errors = validateParsedInput(parsed);
    setParsedData(parsed);
    setResult(null);

    if (errors.length > 0) {
      setMessage(`Mohon tulis ${errors.join(", ")}. Contoh: "${exampleText}".`);
      return;
    }

    const payload: QuickPrediksiPayload = {
      umur_bulan: parsed.umur_bulan as number,
      tinggi_badan: parsed.tinggi_badan as number,
      berat_badan: parsed.berat_badan as number,
      jenis_kelamin: parsed.jenis_kelamin,
    };

    try {
      setLoading(true);
      setMessage("");
      const response = await hitungPrediksiCepat(payload);
      setResult(response.data.data);
    } catch (error) {
      setMessage(
        getErrorMessage(error, "Maaf, cek cepat belum bisa diproses. Coba lagi sebentar.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl">
      <h2 className="mb-6 text-center text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
        Mari Cek Risiko Stunting Anak Anda!
      </h2>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
          <span className="font-bold text-emerald-950">Halo.</span> Tulis 1
          kalimat berisi umur, tinggi, dan berat anak. Contoh: "{exampleText}".
        </div>

        <form className="mt-4" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-xl font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:px-5 sm:py-5 sm:text-2xl"
            value={input}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder={exampleText}
          />

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="w-fit rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? "Mengecek..." : "Kirim"}
            </button>

            <div className="flex flex-wrap gap-2">
              {previewItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </form>

        {message && (
          <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
            {message}
          </p>
        )}

        {result && (
          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Hasil Skrining Awal
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {result.status_gizi}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {quickCheckNote}
            </p>
            {resultCards.length > 0 && (
              <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {resultCards.map((card) => (
                  <div
                    key={card.label}
                    className="flex min-h-28 flex-col justify-between rounded-lg border border-emerald-100 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs font-bold text-slate-500">
                      {card.label}
                    </p>
                    <div>
                      <p className="mt-2 text-xl font-black text-slate-950">
                        {card.value}
                      </p>
                      {card.description && (
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {card.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-slate-600">
        Catatan: hasil bersifat skrining awal dan tidak menggantikan diagnosis
        tenaga kesehatan.
      </p>
    </section>
  );
}
