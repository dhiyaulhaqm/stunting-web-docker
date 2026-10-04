from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.upload_massal_model import UploadMassal
from app.models.user_model import User
from app.models.anak_model import Anak
from app.models.pengukuran_model import Pengukuran
from app.models.prediksi_model import Prediksi
from app.services.prediction_service import predict_growth_status
from app.utils.activity import log_activity
from app.utils.gizi import validate_balita_payload
import pandas as pd
from datetime import datetime


upload_massal_bp = Blueprint("upload_massal", __name__)
MAX_UPLOAD_ROWS = 2000


def clean_cell(value):
    if pd.isna(value):
        return None
    return value


def normalize_nik(value):
    if value is None:
        return None

    normalized = str(value).strip()

    if normalized.endswith(".0"):
        normalized = normalized[:-2]

    return normalized or None


def row_to_payload(row):
    return {
        "nik": normalize_nik(clean_cell(row.get("nik"))),
        "nama": clean_cell(row.get("nama")),
        "tanggal_lahir": clean_cell(row.get("tanggal_lahir")),
        "jenis_kelamin": clean_cell(row.get("jenis_kelamin")),
        "alamat": clean_cell(row.get("alamat")),
        "kelurahan_desa": clean_cell(row.get("kelurahan_desa")),
        "umur_bulan": clean_cell(row.get("umur_bulan")),
        "berat_badan": clean_cell(row.get("berat_badan")),
        "tinggi_badan": clean_cell(row.get("tinggi_badan")),
        "tanggal_pengukuran": clean_cell(row.get("tanggal_pengukuran")),
    }


def measurement_month_label(date_value):
    return date_value.strftime("%Y-%m")


@upload_massal_bp.route("/", methods=["GET"])
def get_all_upload_massal():
    id_user = request.args.get("id_user")

    query = UploadMassal.query

    if id_user:
        query = query.filter_by(id_user=id_user)

    data_upload = query.order_by(UploadMassal.id_upload.desc()).all()

    return jsonify({
        "status": "success",
        "message": "Data upload massal berhasil diambil",
        "data": [upload.to_dict() for upload in data_upload]
    }), 200


@upload_massal_bp.route("/<int:id_upload>", methods=["GET"])
def get_upload_massal_by_id(id_upload):
    upload = UploadMassal.query.get(id_upload)

    if not upload:
        return jsonify({
            "status": "error",
            "message": "Data upload massal tidak ditemukan"
        }), 404

    return jsonify({
        "status": "success",
        "message": "Data upload massal berhasil ditemukan",
        "data": upload.to_dict()
    }), 200


@upload_massal_bp.route("/", methods=["POST"])
def create_upload_massal():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body tidak boleh kosong"
        }), 400

    required_fields = ["id_user", "nama_file"]

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

    upload = UploadMassal(
        id_user=data["id_user"],
        nama_file=data["nama_file"],
        total_row=data.get("total_row", 0),
        processed_row=data.get("processed_row", 0),
        valid_row=data.get("valid_row", 0),
        error_row=data.get("error_row", 0),
        status=data.get("status", "selesai"),
        catatan=data.get("catatan"),
        completed_at=datetime.now(),
    )

    db.session.add(upload)
    log_activity(
        data["id_user"],
        "buat_upload_massal",
        "upload_massal",
        f"Buat metadata upload {upload.nama_file}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data upload massal berhasil ditambahkan",
        "data": upload.to_dict()
    }), 201


@upload_massal_bp.route("/csv", methods=["POST"])
def upload_csv_massal():
    id_user = request.form.get("id_user")
    file = request.files.get("file")

    if not id_user:
        return jsonify({
            "status": "error",
            "message": "Field id_user wajib diisi"
        }), 400

    user = User.query.get(id_user)
    if not user:
        return jsonify({
            "status": "error",
            "message": "User tidak ditemukan"
        }), 404

    if not file:
        return jsonify({
            "status": "error",
            "message": "File CSV/XLSX wajib diunggah"
        }), 400

    filename = file.filename or "upload_massal"

    try:
        if filename.lower().endswith(".xlsx"):
            dataframe = pd.read_excel(file, dtype={"nik": str})
        else:
            dataframe = pd.read_csv(file, dtype={"nik": str})
    except Exception as error:
        return jsonify({
            "status": "error",
            "message": "File gagal dibaca",
            "detail": str(error)
        }), 400

    required_columns = {
        "nik",
        "nama",
        "tanggal_lahir",
        "jenis_kelamin",
        "umur_bulan",
        "berat_badan",
        "tinggi_badan",
    }
    missing_columns = sorted(required_columns - set(dataframe.columns))

    if missing_columns:
        return jsonify({
            "status": "error",
            "message": "Kolom wajib belum lengkap",
            "missing_columns": missing_columns
        }), 400

    if len(dataframe) > MAX_UPLOAD_ROWS:
        return jsonify({
            "status": "error",
            "message": (
                f"Jumlah baris melebihi batas {MAX_UPLOAD_ROWS}. "
                "Pisahkan file menjadi beberapa batch agar proses tetap stabil."
            ),
            "max_rows": MAX_UPLOAD_ROWS,
            "total_rows": len(dataframe),
        }), 400

    upload = UploadMassal(
        id_user=id_user,
        nama_file=filename,
        total_row=len(dataframe),
        processed_row=0,
        valid_row=0,
        error_row=0,
        status="diproses",
        catatan="File sedang diproses.",
    )
    db.session.add(upload)
    db.session.commit()

    errors = []
    valid_count = 0
    seen_measurements = {}

    try:
        for index, row in dataframe.iterrows():
            row_number = index + 2
            payload = row_to_payload(row)
            upload.processed_row = index + 1

            if not payload["nik"]:
                errors.append({
                    "row": row_number,
                    "errors": ["NIK anak wajib diisi"],
                })
                continue

            hasil_validasi = validate_balita_payload(payload)

            if not hasil_validasi["is_valid"]:
                errors.append({
                    "row": row_number,
                    "errors": hasil_validasi["errors"],
                })
                continue

            cleaned = hasil_validasi["data"]
            tanggal_pengukuran = cleaned["tanggal_pengukuran"] or datetime.now().date()
            month_label = measurement_month_label(tanggal_pengukuran)
            duplicate_key = (payload["nik"], month_label)
            existing_row_number = seen_measurements.get(duplicate_key)

            if existing_row_number:
                errors.append({
                    "row": row_number,
                    "errors": [
                        (
                            f"Duplikat pengukuran untuk NIK {payload['nik']} "
                            f"pada bulan {month_label}. Data sudah ada di baris {existing_row_number}."
                        )
                    ],
                })
                continue

            anak = Anak.query.filter_by(id_user=id_user, nik=payload["nik"]).first()
            hasil_prediksi = predict_growth_status(
                cleaned["umur_bulan"],
                cleaned["berat_badan"],
                cleaned["tinggi_badan"],
                cleaned["jenis_kelamin"],
            )

            is_new_anak = anak is None

            if is_new_anak:
                anak = Anak(
                    id_user=id_user,
                    nik=payload["nik"],
                    nama=cleaned["nama"],
                    tanggal_lahir=cleaned["tanggal_lahir"],
                    jenis_kelamin=cleaned["jenis_kelamin"],
                    alamat=payload.get("alamat"),
                    kelurahan_desa=payload.get("kelurahan_desa"),
                )
                db.session.add(anak)
                db.session.flush()
            else:
                anak.nama = cleaned["nama"]
                anak.tanggal_lahir = cleaned["tanggal_lahir"]
                anak.jenis_kelamin = cleaned["jenis_kelamin"]
                anak.alamat = payload.get("alamat") or anak.alamat
                anak.kelurahan_desa = payload.get("kelurahan_desa") or anak.kelurahan_desa

            pengukuran = Pengukuran(
                id_anak=anak.id_anak,
                id_upload=upload.id_upload,
                umur_bulan=cleaned["umur_bulan"],
                berat_badan=cleaned["berat_badan"],
                tinggi_badan=cleaned["tinggi_badan"],
                tanggal_pengukuran=tanggal_pengukuran,
            )
            db.session.add(pengukuran)
            db.session.flush()

            prediksi = Prediksi(
                id_pengukuran=pengukuran.id_pengukuran,
                status_gizi=hasil_prediksi["status_gizi"],
                detail=hasil_prediksi.get("detail"),
            )
            db.session.add(prediksi)
            db.session.flush()

            valid_count += 1
            seen_measurements[duplicate_key] = row_number

        upload.valid_row = valid_count
        upload.error_row = len(errors)
        upload.status = "selesai"
        upload.catatan = "Upload massal selesai diproses."
        upload.completed_at = datetime.now()
        log_activity(
            id_user,
            "input_data_massal",
            "upload_massal",
            f"Upload {filename}: {upload.valid_row} valid, {upload.error_row} error",
        )
        db.session.commit()
    except Exception as error:
        db.session.rollback()
        failed_upload = UploadMassal.query.get(upload.id_upload)
        if failed_upload:
            failed_upload.status = "gagal"
            failed_upload.catatan = f"Upload gagal diproses: {error}"
            failed_upload.completed_at = datetime.now()
            db.session.commit()

        return jsonify({
            "status": "error",
            "message": "Upload massal gagal diproses.",
            "detail": str(error),
            "data": {
                "upload": failed_upload.to_dict() if failed_upload else upload.to_dict(),
            },
        }), 500

    return jsonify({
        "status": "success",
        "message": "Upload massal selesai diproses",
        "data": {
            "upload": upload.to_dict(),
            "created_count": valid_count,
            "errors": errors,
        }
    }), 201


@upload_massal_bp.route("/<int:id_upload>", methods=["PUT"])
def update_upload_massal(id_upload):
    upload = UploadMassal.query.get(id_upload)

    if not upload:
        return jsonify({
            "status": "error",
            "message": "Data upload massal tidak ditemukan"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body tidak boleh kosong"
        }), 400

    if "id_user" in data:
        user = User.query.get(data["id_user"])

        if not user:
            return jsonify({
                "status": "error",
                "message": "User tidak ditemukan"
            }), 404

        upload.id_user = data["id_user"]

    if "nama_file" in data:
        upload.nama_file = data["nama_file"]

    if "total_row" in data:
        upload.total_row = data["total_row"]

    if "processed_row" in data:
        upload.processed_row = data["processed_row"]

    if "valid_row" in data:
        upload.valid_row = data["valid_row"]

    if "error_row" in data:
        upload.error_row = data["error_row"]

    if "status" in data:
        upload.status = data["status"]

    if "catatan" in data:
        upload.catatan = data["catatan"]

    if "completed_at" in data:
        upload.completed_at = datetime.now() if data["completed_at"] else None

    log_activity(
        upload.id_user,
        "update_upload_massal",
        "upload_massal",
        f"Update upload {upload.id_upload}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data upload massal berhasil diperbarui",
        "data": upload.to_dict()
    }), 200


@upload_massal_bp.route("/<int:id_upload>", methods=["DELETE"])
def delete_upload_massal(id_upload):
    upload = UploadMassal.query.get(id_upload)

    if not upload:
        return jsonify({
            "status": "error",
            "message": "Data upload massal tidak ditemukan"
        }), 404

    pengukuran_list = Pengukuran.query.filter_by(id_upload=id_upload).all()

    for pengukuran in pengukuran_list:
        db.session.delete(pengukuran)

    actor_id = request.args.get("actor_id", type=int)
    id_user = actor_id or upload.id_user
    db.session.delete(upload)
    log_activity(
        id_user,
        "hapus_upload_massal",
        "upload_massal",
        f"Hapus upload {id_upload}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data upload massal berhasil dihapus"
    }), 200
