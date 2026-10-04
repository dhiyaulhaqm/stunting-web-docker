from functools import lru_cache
from pathlib import Path
import math
import re
import zipfile
import xml.etree.ElementTree as ET

from app.utils.gizi import normalize_gender


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
WHO_LHFA_FILES = {
    "laki-laki": DATA_DIR / "who_lhfa_boys_zscore.xlsx",
    "perempuan": DATA_DIR / "who_lhfa_girls_zscore.xlsx",
}
XML_NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
}


def _column_name(cell_ref):
    match = re.match(r"([A-Z]+)", cell_ref or "")
    return match.group(1) if match else ""


def _cell_value(cell, shared_strings):
    value = cell.find("main:v", XML_NS)
    if value is None:
        return None

    raw_value = value.text
    if cell.attrib.get("t") == "s" and raw_value is not None:
        return shared_strings[int(raw_value)]

    return raw_value


def _read_shared_strings(archive):
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []

    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    strings = []

    for item in root.findall("main:si", XML_NS):
        text_parts = [
            text.text or ""
            for text in item.iter(
                "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"
            )
        ]
        strings.append("".join(text_parts))

    return strings


@lru_cache(maxsize=2)
def _load_lhfa_rows(gender):
    file_path = WHO_LHFA_FILES[gender]

    with zipfile.ZipFile(file_path) as archive:
        shared_strings = _read_shared_strings(archive)
        root = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        rows = root.findall("main:sheetData/main:row", XML_NS)
        headers = {}
        data_rows = {}

        for cell in rows[0].findall("main:c", XML_NS):
            value = _cell_value(cell, shared_strings)
            if value:
                headers[_column_name(cell.attrib.get("r"))] = value

        for row in rows[1:]:
            item = {}
            for cell in row.findall("main:c", XML_NS):
                header = headers.get(_column_name(cell.attrib.get("r")))
                value = _cell_value(cell, shared_strings)

                if header and value is not None:
                    item[header] = float(value)

            if "Day" in item:
                data_rows[int(item["Day"])] = item

    return data_rows


def _z_score_lms(measurement, l_value, median, s_value):
    if l_value == 0:
        return math.log(measurement / median) / s_value

    return (((measurement / median) ** l_value) - 1) / (l_value * s_value)


def _height_zscore_category(z_score):
    if z_score < -3:
        return "Sangat pendek"

    if z_score < -2:
        return "Pendek"

    return "Normal"


def calculate_height_for_age_zscore(umur_bulan, tinggi_badan, jenis_kelamin=None):
    gender = normalize_gender(jenis_kelamin) or "laki-laki"

    if gender not in WHO_LHFA_FILES:
        gender = "laki-laki"

    try:
        age_months = int(umur_bulan)
        height = float(tinggi_badan)
    except (TypeError, ValueError):
        return None

    if age_months < 0 or age_months > 60 or height <= 0:
        return None

    file_path = WHO_LHFA_FILES[gender]
    if not file_path.exists():
        return None

    rows = _load_lhfa_rows(gender)
    age_days = round(age_months * 30.4375)
    reference = rows.get(age_days)

    if not reference:
        nearest_day = min(rows.keys(), key=lambda day: abs(day - age_days))
        reference = rows[nearest_day]
        age_days = nearest_day

    z_score = _z_score_lms(height, reference["L"], reference["M"], reference["S"])

    return {
        "indikator": "TB/U",
        "z_score": round(z_score, 2),
        "kategori": _height_zscore_category(z_score),
        "umur_hari_rujukan": age_days,
        "median_cm": round(reference["M"], 2),
        "sd2neg_cm": round(reference["SD2neg"], 2),
        "sd3neg_cm": round(reference["SD3neg"], 2),
        "sumber": "WHO Child Growth Standards - Length/height-for-age",
    }
