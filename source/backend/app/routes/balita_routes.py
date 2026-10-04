from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models.anak_model import Anak
from app.models.pengukuran_model import Pengukuran
from app.models.prediksi_model import Prediksi
from app.models.user_model import User
from app.services.prediction_service import predict_growth_status
from app.utils.activity import log_activity
from app.utils.gizi import validate_balita_payload


balita_bp = Blueprint("balita", __name__)


@balita_bp.route("/", methods=["POST"])
def input_data_balita():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body tidak boleh kosong"
        }), 400

    if "id_user" not in data or data["id_user"] == "":
        return jsonify({
            "status": "error",
            "message": "Field id_user wajib diisi"
        }), 400

    user = User.query.get(data["id_user"])
    if not user:
        return jsonify({
            "status": "error",
            "message": "User tidak ditemukan"
        }), 404

    hasil_validasi = validate_balita_payload(data)
    if not hasil_validasi["is_valid"]:
        return jsonify({
            "status": "error",
            "message": "Data balita belum valid",
            "errors": hasil_validasi["errors"]
        }), 400

    cleaned = hasil_validasi["data"]
    hasil_prediksi = predict_growth_status(
        cleaned["umur_bulan"],
        cleaned["berat_badan"],
        cleaned["tinggi_badan"],
        cleaned["jenis_kelamin"],
    )

    anak = Anak(
        id_user=data["id_user"],
        nama=cleaned["nama"],
        tanggal_lahir=cleaned["tanggal_lahir"],
        jenis_kelamin=cleaned["jenis_kelamin"],
    )
    db.session.add(anak)
    db.session.flush()

    pengukuran = Pengukuran(
        id_anak=anak.id_anak,
        umur_bulan=cleaned["umur_bulan"],
        berat_badan=cleaned["berat_badan"],
        tinggi_badan=cleaned["tinggi_badan"],
        tanggal_pengukuran=cleaned["tanggal_pengukuran"],
    )
    db.session.add(pengukuran)
    db.session.flush()

    prediksi = Prediksi(
        id_pengukuran=pengukuran.id_pengukuran,
        status_gizi=hasil_prediksi["status_gizi"],
        detail=hasil_prediksi.get("detail"),
    )
    db.session.add(prediksi)
    log_activity(
        data["id_user"],
        "input_data_balita",
        "balita",
        f"Input data balita {anak.nama} dengan hasil {prediksi.status_gizi}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data balita, pengukuran, dan prediksi berhasil disimpan",
        "data": {
            "anak": anak.to_dict(),
            "pengukuran": pengukuran.to_dict(),
            "prediksi": prediksi.to_dict(),
            "hasil_prediksi": hasil_prediksi,
        }
    }), 201
