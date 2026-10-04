from flask import Blueprint, jsonify, request
from app.services.prediction_service import predict_growth_status
from app.utils.gizi import validate_balita_payload


validasi_bp = Blueprint("validasi", __name__)


@validasi_bp.route("/balita", methods=["POST"])
def validasi_balita():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body tidak boleh kosong"
        }), 400

    hasil_validasi = validate_balita_payload(data)

    response = {
        "status": "success" if hasil_validasi["is_valid"] else "error",
        "message": "Data balita valid" if hasil_validasi["is_valid"] else "Data balita belum valid",
        "data": {
            "is_valid": hasil_validasi["is_valid"],
            "errors": hasil_validasi["errors"],
        }
    }

    if hasil_validasi["is_valid"]:
        cleaned = hasil_validasi["data"]
        response["data"]["prediksi"] = predict_growth_status(
            cleaned["umur_bulan"],
            cleaned["berat_badan"],
            cleaned["tinggi_badan"],
            cleaned["jenis_kelamin"],
        )

    return jsonify(response), 200 if hasil_validasi["is_valid"] else 400
