from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.anak_model import Anak
from app.models.user_model import User
from app.utils.activity import log_activity
from datetime import datetime

anak_bp = Blueprint("anak", __name__)


def parse_date(date_string):
    try:
        return datetime.strptime(date_string, "%Y-%m-%d").date()
    except ValueError:
        return None


def normalize_nik(value):
    if value is None:
        return None

    normalized = str(value).strip()
    return normalized or None


def normalize_optional_text(value):
    if value is None:
        return None

    normalized = str(value).strip()
    return normalized or None


@anak_bp.route("/", methods=["GET"])
def get_anak():
    id_user = request.args.get("id_user")

    query = Anak.query

    if id_user:
        query = query.filter_by(id_user=id_user)

    data_anak = query.order_by(Anak.created_at.desc()).all()

    return jsonify({
        "status": "success",
        "data": [anak.to_dict() for anak in data_anak]
    }), 200


@anak_bp.route("/<int:id_anak>", methods=["GET"])
def get_anak_by_id(id_anak):
    anak = Anak.query.get(id_anak)

    if not anak:
        return jsonify({
            "status": "error",
            "message": "Data anak tidak ditemukan"
        }), 404

    return jsonify({
        "status": "success",
        "data": anak.to_dict()
    }), 200


@anak_bp.route("/", methods=["POST"])
def create_anak():
    data = request.get_json()

    required_fields = ["id_user", "nama", "tanggal_lahir", "jenis_kelamin"]
    for field in required_fields:
        if field not in data or data[field] == "":
            return jsonify({
                "status": "error",
                "message": f"Field {field} wajib diisi"
            }), 400

    user = User.query.get(data["id_user"])
    if not user:
        return jsonify({
            "status": "error",
            "message": "User tidak ditemukan"
        }), 404

    tanggal_lahir = parse_date(data["tanggal_lahir"])
    if not tanggal_lahir:
        return jsonify({
            "status": "error",
            "message": "Format tanggal_lahir harus YYYY-MM-DD"
        }), 400

    nik = normalize_nik(data.get("nik"))
    if nik and Anak.query.filter_by(id_user=data["id_user"], nik=nik).first():
        return jsonify({
            "status": "error",
            "message": "NIK anak sudah terdaftar untuk user ini"
        }), 400

    anak = Anak(
        id_user=data["id_user"],
        nik=nik,
        nama=data["nama"],
        tanggal_lahir=tanggal_lahir,
        jenis_kelamin=data["jenis_kelamin"],
        alamat=normalize_optional_text(data.get("alamat")),
        kelurahan_desa=normalize_optional_text(data.get("kelurahan_desa"))
    )

    db.session.add(anak)
    log_activity(
        data["id_user"],
        "buat_data_anak",
        "anak",
        f"Buat data anak {anak.nama}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data anak berhasil ditambahkan",
        "data": anak.to_dict()
    }), 201


@anak_bp.route("/<int:id_anak>", methods=["PUT"])
def update_anak(id_anak):
    anak = Anak.query.get(id_anak)

    if not anak:
        return jsonify({
            "status": "error",
            "message": "Data anak tidak ditemukan"
        }), 404

    data = request.get_json()

    target_id_user = data.get("id_user", anak.id_user)
    target_nik = normalize_nik(data.get("nik")) if "nik" in data else anak.nik

    if "id_user" in data:
        user = User.query.get(target_id_user)
        if not user:
            return jsonify({
                "status": "error",
                "message": "User tidak ditemukan"
            }), 404

    if "nama" in data:
        anak.nama = data["nama"]

    if "id_user" in data or "nik" in data:
        existing_anak = Anak.query.filter(
            Anak.id_user == target_id_user,
            Anak.nik == target_nik,
            Anak.id_anak != id_anak
        ).first() if target_nik else None

        if existing_anak:
            return jsonify({
                "status": "error",
                "message": "NIK anak sudah terdaftar untuk user ini"
            }), 400

        anak.id_user = target_id_user
        anak.nik = target_nik

    if "tanggal_lahir" in data:
        tanggal_lahir = parse_date(data["tanggal_lahir"])
        if not tanggal_lahir:
            return jsonify({
                "status": "error",
                "message": "Format tanggal_lahir harus YYYY-MM-DD"
            }), 400
        anak.tanggal_lahir = tanggal_lahir

    if "jenis_kelamin" in data:
        anak.jenis_kelamin = data["jenis_kelamin"]

    if "alamat" in data:
        anak.alamat = normalize_optional_text(data.get("alamat"))

    if "kelurahan_desa" in data:
        anak.kelurahan_desa = normalize_optional_text(data.get("kelurahan_desa"))

    log_activity(
        anak.id_user,
        "update_data_anak",
        "anak",
        f"Update data anak {anak.nama}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data anak berhasil diperbarui",
        "data": anak.to_dict()
    }), 200


@anak_bp.route("/<int:id_anak>", methods=["DELETE"])
def delete_anak(id_anak):
    anak = Anak.query.get(id_anak)

    if not anak:
        return jsonify({
            "status": "error",
            "message": "Data anak tidak ditemukan"
        }), 404

    id_user = anak.id_user
    nama = anak.nama
    db.session.delete(anak)
    log_activity(
        id_user,
        "hapus_data_anak",
        "anak",
        f"Hapus data anak {nama}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data anak berhasil dihapus"
    }), 200
