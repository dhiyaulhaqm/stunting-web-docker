from datetime import datetime


JENIS_KELAMIN_VALID = {"laki-laki", "perempuan"}


def parse_date(date_string):
    if not date_string:
        return None

    if hasattr(date_string, "date"):
        return date_string.date()

    try:
        return datetime.strptime(str(date_string), "%Y-%m-%d").date()
    except ValueError:
        return None


def to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_gender(value):
    if value is None:
        return None

    normalized = str(value).strip().lower()

    if normalized in {"l", "lk", "laki", "laki laki", "laki-laki", "male"}:
        return "laki-laki"

    if normalized in {"p", "pr", "perempuan", "female"}:
        return "perempuan"

    return normalized


def validate_balita_payload(data, require_identity=True):
    errors = []

    nama = str(data.get("nama", "")).strip()
    tanggal_lahir = parse_date(data.get("tanggal_lahir"))
    jenis_kelamin = normalize_gender(data.get("jenis_kelamin"))
    umur_bulan = to_int(data.get("umur_bulan"))
    berat_badan = to_float(data.get("berat_badan"))
    tinggi_badan = to_float(data.get("tinggi_badan"))
    tanggal_pengukuran = parse_date(data.get("tanggal_pengukuran")) if data.get("tanggal_pengukuran") else None

    if require_identity and not nama:
        errors.append("Nama balita wajib diisi")

    if require_identity and not tanggal_lahir:
        errors.append("Format tanggal_lahir harus YYYY-MM-DD")

    if require_identity and jenis_kelamin not in JENIS_KELAMIN_VALID:
        errors.append("Jenis kelamin harus laki-laki atau perempuan")

    if umur_bulan is None or umur_bulan < 0 or umur_bulan > 60:
        errors.append("Umur bulan harus angka 0 sampai 60")

    if berat_badan is None or berat_badan <= 0 or berat_badan > 40:
        errors.append("Berat badan harus angka lebih dari 0 dan maksimal 40 kg")

    if tinggi_badan is None or tinggi_badan <= 0 or tinggi_badan > 130:
        errors.append("Tinggi badan harus angka lebih dari 0 dan maksimal 130 cm")

    if data.get("tanggal_pengukuran") and not tanggal_pengukuran:
        errors.append("Format tanggal_pengukuran harus YYYY-MM-DD")

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "data": {
            "nama": nama,
            "tanggal_lahir": tanggal_lahir,
            "jenis_kelamin": jenis_kelamin,
            "umur_bulan": umur_bulan,
            "berat_badan": berat_badan,
            "tinggi_badan": tinggi_badan,
            "tanggal_pengukuran": tanggal_pengukuran,
        },
    }


def _expected_height(umur_bulan, jenis_kelamin):
    if umur_bulan <= 24:
        expected = 49.0 + (1.6 * umur_bulan)
    else:
        expected = 87.0 + (0.7 * (umur_bulan - 24))

    if jenis_kelamin == "perempuan":
        expected -= 1.0

    return expected


def _expected_weight(umur_bulan, jenis_kelamin):
    if umur_bulan <= 24:
        expected = 3.3 + (0.45 * umur_bulan)
    else:
        expected = 12.5 + (0.22 * (umur_bulan - 24))

    if jenis_kelamin == "perempuan":
        expected -= 0.4

    return expected


def predict_status_gizi(umur_bulan, berat_badan, tinggi_badan, jenis_kelamin=None):
    gender = normalize_gender(jenis_kelamin) or "laki-laki"
    expected_height = _expected_height(umur_bulan, gender)
    expected_weight = _expected_weight(umur_bulan, gender)

    height_ratio = tinggi_badan / expected_height
    weight_ratio = berat_badan / expected_weight

    if height_ratio < 0.90:
        status = "Stunting"
    elif height_ratio < 0.95:
        status = "Risiko Stunting"
    elif weight_ratio < 0.80:
        status = "Gizi Kurang"
    elif weight_ratio > 1.25:
        status = "Gizi Lebih"
    else:
        status = "Normal"

    return {
        "status_gizi": status,
        "detail": {
            "rasio_tinggi": round(height_ratio, 3),
            "rasio_berat": round(weight_ratio, 3),
            "tinggi_rujukan_sederhana": round(expected_height, 2),
            "berat_rujukan_sederhana": round(expected_weight, 2),
        },
    }
