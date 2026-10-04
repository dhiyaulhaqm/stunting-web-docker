from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.pengukuran_model import Pengukuran
from app.models.anak_model import Anak
from app.models.upload_massal_model import UploadMassal
from app.models.prediksi_model import Prediksi
from app.services.prediction_service import predict_growth_status
from app.utils.activity import log_activity
from datetime import datetime

pengukuran_bp = Blueprint("pengukuran", __name__)


def parse_date(date_string):
    try:
        return datetime.strptime(date_string, "%Y-%m-%d").date()
    except ValueError:
        return None


@pengukuran_bp.route("/", methods=["GET"])
def get_pengukuran():
    id_anak = request.args.get("id_anak")

    query = Pengukuran.query

    if id_anak:
        query = query.filter_by(id_anak=id_anak)

    data_pengukuran = query.order_by(Pengukuran.created_at.desc()).all()

    return jsonify({
        "status": "success",
        "data": [item.to_dict() for item in data_pengukuran]
    }), 200


@pengukuran_bp.route("/<int:id_pengukuran>", methods=["GET"])
def get_pengukuran_by_id(id_pengukuran):
    pengukuran = Pengukuran.query.get(id_pengukuran)

    if not pengukuran:
        return jsonify({
            "status": "error",
            "message": "Data pengukuran tidak ditemukan"
        }), 404

    return jsonify({
        "status": "success",
        "data": pengukuran.to_dict()
    }), 200


@pengukuran_bp.route("/", methods=["POST"])
def create_pengukuran():
    data = request.get_json()

    required_fields = ["id_anak", "umur_bulan", "berat_badan", "tinggi_badan"]
    for field in required_fields:
        if field not in data or data[field] == "":
            return jsonify({
                "status": "error",
                "message": f"Field {field} wajib diisi"
            }), 400

    anak = Anak.query.get(data["id_anak"])
    if not anak:
        return jsonify({
            "status": "error",
            "message": "Data anak tidak ditemukan"
        }), 404

    id_upload = data.get("id_upload")

    if id_upload:
        upload = UploadMassal.query.get(id_upload)
        if not upload:
            return jsonify({
                "status": "error",
                "message": "Data upload massal tidak ditemukan"
            }), 404

    tanggal_pengukuran = datetime.now().date()
    if data.get("tanggal_pengukuran"):
        tanggal_pengukuran = parse_date(data["tanggal_pengukuran"])
        if not tanggal_pengukuran:
            return jsonify({
                "status": "error",
                "message": "Format tanggal_pengukuran harus YYYY-MM-DD"
            }), 400

    pengukuran = Pengukuran(
        id_anak=data["id_anak"],
        id_upload=id_upload,
        umur_bulan=data["umur_bulan"],
        berat_badan=data["berat_badan"],
        tinggi_badan=data["tinggi_badan"],
        tanggal_pengukuran=tanggal_pengukuran
    )

    db.session.add(pengukuran)
    db.session.flush()

    hasil_prediksi = predict_growth_status(
        pengukuran.umur_bulan,
        pengukuran.berat_badan,
        pengukuran.tinggi_badan,
        anak.jenis_kelamin,
    )
    prediksi = Prediksi(
        id_pengukuran=pengukuran.id_pengukuran,
        status_gizi=hasil_prediksi["status_gizi"],
        detail=hasil_prediksi.get("detail"),
    )
    db.session.add(prediksi)
    log_activity(
        anak.id_user,
        "buat_pengukuran",
        "pengukuran",
        f"Buat pengukuran {pengukuran.id_pengukuran} dengan hasil {prediksi.status_gizi}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data pengukuran berhasil ditambahkan",
        "data": {
            "pengukuran": pengukuran.to_dict(),
            "prediksi": prediksi.to_dict(),
            "hasil_prediksi": hasil_prediksi,
        }
    }), 201


@pengukuran_bp.route("/<int:id_pengukuran>", methods=["PUT"])
def update_pengukuran(id_pengukuran):
    pengukuran = Pengukuran.query.get(id_pengukuran)

    if not pengukuran:
        return jsonify({
            "status": "error",
            "message": "Data pengukuran tidak ditemukan"
        }), 404

    data = request.get_json()

    if "id_anak" in data:
        anak = Anak.query.get(data["id_anak"])
        if not anak:
            return jsonify({
                "status": "error",
                "message": "Data anak tidak ditemukan"
            }), 404
        pengukuran.id_anak = data["id_anak"]

    if "id_upload" in data:
        if data["id_upload"] is not None:
            upload = UploadMassal.query.get(data["id_upload"])
            if not upload:
                return jsonify({
                    "status": "error",
                    "message": "Data upload massal tidak ditemukan"
                }), 404
        pengukuran.id_upload = data["id_upload"]

    if "umur_bulan" in data:
        pengukuran.umur_bulan = data["umur_bulan"]

    if "berat_badan" in data:
        pengukuran.berat_badan = data["berat_badan"]

    if "tinggi_badan" in data:
        pengukuran.tinggi_badan = data["tinggi_badan"]

    if "tanggal_pengukuran" in data:
        tanggal_pengukuran = parse_date(data["tanggal_pengukuran"])
        if not tanggal_pengukuran:
            return jsonify({
                "status": "error",
                "message": "Format tanggal_pengukuran harus YYYY-MM-DD"
            }), 400
        pengukuran.tanggal_pengukuran = tanggal_pengukuran

    if pengukuran.prediksi:
        hasil_prediksi = predict_growth_status(
            pengukuran.umur_bulan,
            pengukuran.berat_badan,
            pengukuran.tinggi_badan,
            pengukuran.anak.jenis_kelamin if pengukuran.anak else None,
        )
        pengukuran.prediksi.status_gizi = hasil_prediksi["status_gizi"]
        pengukuran.prediksi.detail = hasil_prediksi.get("detail")

    log_activity(
        pengukuran.anak.id_user if pengukuran.anak else None,
        "update_pengukuran",
        "pengukuran",
        f"Update pengukuran {pengukuran.id_pengukuran}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data pengukuran berhasil diperbarui",
        "data": pengukuran.to_dict()
    }), 200


@pengukuran_bp.route("/<int:id_pengukuran>", methods=["DELETE"])
def delete_pengukuran(id_pengukuran):
    pengukuran = Pengukuran.query.get(id_pengukuran)

    if not pengukuran:
        return jsonify({
            "status": "error",
            "message": "Data pengukuran tidak ditemukan"
        }), 404

    id_user = pengukuran.anak.id_user if pengukuran.anak else None
    db.session.delete(pengukuran)
    log_activity(
        id_user,
        "hapus_pengukuran",
        "pengukuran",
        f"Hapus pengukuran {id_pengukuran}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data pengukuran berhasil dihapus"
    }), 200
