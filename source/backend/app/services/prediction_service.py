import json
import logging
from pathlib import Path

import joblib
import pandas as pd

from app.utils.gizi import predict_status_gizi
from app.utils.zscore import calculate_height_for_age_zscore


ML_DIR = Path(__file__).resolve().parents[1] / "ml"
METADATA_PATH = ML_DIR / "stunting_decision_tree_metadata.json"
DEFAULT_MODEL_FILE = "stunting_decision_tree_pipeline.joblib"
DEFAULT_MODEL_FEATURES = ["Usia_Bulan", "Berat", "Tinggi", "Jenis Kelamin"]
PREDICTION_ENGINE = "ml_pipeline_v2"
FALLBACK_ENGINE = "rule_based_v1"
FALLBACK_REVIEW_MESSAGE = (
    "Model ML tidak tersedia saat prediksi diproses. "
    "Hasil dihitung dengan aturan cadangan dan perlu ditinjau petugas."
)

logger = logging.getLogger(__name__)

_model = None
_model_path = None
_metadata = None


def _load_metadata():
    global _metadata

    if _metadata is None:
        try:
            with METADATA_PATH.open(encoding="utf-8") as file:
                _metadata = json.load(file)
        except (OSError, ValueError):
            _metadata = {}

    return _metadata


def _resolve_model_path():
    metadata = _load_metadata()
    artifact = metadata.get("artifact") or DEFAULT_MODEL_FILE

    return ML_DIR / artifact


def _load_model():
    global _model, _model_path

    if _model is None:
        _model_path = _resolve_model_path()
        _model = joblib.load(_model_path)

    return _model


def _normalize_gender_for_model(jenis_kelamin):
    normalized = str(jenis_kelamin or "").strip().lower()
    normalized = normalized.replace("?", "-").replace(" - ", "-").replace(" ", "-")

    if normalized in {"p", "pr", "perempuan", "wanita", "female", "girl"}:
        return "Perempuan"

    return "Laki-laki"


def _normalize_model_status(raw_status):
    normalized = str(raw_status or "").strip().lower()

    if normalized in {"tidak stunting", "normal", "non stunting", "non-stunting"}:
        return "Normal"

    if normalized in {"stunting", "pendek", "sangat pendek"}:
        return "Stunting"

    return str(raw_status)


def _normalize_feature_key(feature_name):
    return str(feature_name).strip().lower().replace(" ", "_").replace("-", "_")


def _get_model_features(model):
    feature_names = getattr(model, "feature_names_in_", None)

    if feature_names is not None:
        return [str(feature) for feature in feature_names]

    metadata_features = _load_metadata().get("features")

    if metadata_features:
        return [str(feature) for feature in metadata_features]

    return DEFAULT_MODEL_FEATURES


def _get_model_classes(model):
    classes = getattr(model, "classes_", None)

    if classes is None and hasattr(model, "named_steps"):
        final_estimator = model.steps[-1][1]
        classes = getattr(final_estimator, "classes_", None)

    if classes is None:
        classes = _load_metadata().get("classes", [])

    return [str(item) for item in classes]


def _get_feature_value(feature_name, age, weight, height, gender):
    key = _normalize_feature_key(feature_name)

    if key in {"usia", "usia_bulan", "umur", "umur_bulan", "age", "age_months"}:
        return age

    if key in {"berat", "berat_badan", "weight"}:
        return weight

    if key in {"tinggi", "tinggi_badan", "height"}:
        return height

    if key in {"jenis_kelamin", "gender", "sex"}:
        return gender

    raise ValueError(f"Fitur model belum didukung: {feature_name}")


def _build_input_frame(model, age, weight, height, jenis_kelamin):
    gender = _normalize_gender_for_model(jenis_kelamin)
    features = _get_model_features(model)
    row = {
        feature: _get_feature_value(feature, age, weight, height, gender)
        for feature in features
    }

    return pd.DataFrame([row], columns=features)


def _predict_with_rule(umur_bulan, berat_badan, tinggi_badan, jenis_kelamin=None, reason=None):
    result = predict_status_gizi(
        int(umur_bulan),
        float(berat_badan),
        float(tinggi_badan),
        jenis_kelamin,
    )

    result["detail"] = {
        **result.get("detail", {}),
        "engine": FALLBACK_ENGINE,
        "prediction_source": "rule_based_fallback",
        "is_fallback": True,
        "requires_review": True,
        "review_message": FALLBACK_REVIEW_MESSAGE,
    }
    _append_z_score_detail(result, umur_bulan, tinggi_badan, jenis_kelamin)

    return result


def _append_z_score_detail(result, umur_bulan, tinggi_badan, jenis_kelamin=None):
    z_score_detail = calculate_height_for_age_zscore(
        umur_bulan,
        tinggi_badan,
        jenis_kelamin,
    )

    if z_score_detail:
        result["detail"] = {
            **result.get("detail", {}),
            "indikator_z_score": z_score_detail,
        }

    return result


def predict_growth_status(umur_bulan, berat_badan, tinggi_badan, jenis_kelamin=None):
    """
    Predict child growth status through a single backend service boundary.

    Routes call this function instead of reaching into a model directly. The
    current implementation uses the exported machine-learning pipeline and falls
    back to the previous rule-based logic if the model cannot be loaded.
    """
    try:
        age = int(umur_bulan)
        weight = float(berat_badan)
        height = float(tinggi_badan)
    except (TypeError, ValueError):
        raise

    try:
        model = _load_model()
        input_frame = _build_input_frame(model, age, weight, height, jenis_kelamin)

        raw_status = str(model.predict(input_frame)[0])
        status = _normalize_model_status(raw_status)
        probabilities = {}

        if hasattr(model, "predict_proba"):
            classes = _get_model_classes(model)
            values = model.predict_proba(input_frame)[0]
            probabilities = {
                _normalize_model_status(label): round(float(value), 4)
                for label, value in zip(classes, values)
            }

        metadata = _load_metadata()

        result = {
            "status_gizi": status,
            "detail": {
                "engine": PREDICTION_ENGINE,
                "prediction_source": "machine_learning",
                "is_fallback": False,
                "requires_review": False,
                "model_file": (_model_path or _resolve_model_path()).name,
                "model_type": metadata.get("model_type"),
                "raw_status": raw_status,
                "probabilitas": probabilities,
                "fitur_model": input_frame.iloc[0].to_dict(),
            },
        }
        return _append_z_score_detail(result, age, height, jenis_kelamin)
    except Exception as error:
        logger.exception(
            "ML prediction failed; using rule-based fallback. "
            "age=%s weight=%s height=%s gender=%s",
            age,
            weight,
            height,
            jenis_kelamin,
        )
        return _predict_with_rule(
            age,
            weight,
            height,
            jenis_kelamin,
            reason=str(error),
        )


def predict_growth_status_from_payload(data):
    return predict_growth_status(
        data["umur_bulan"],
        data["berat_badan"],
        data["tinggi_badan"],
        data.get("jenis_kelamin"),
    )
