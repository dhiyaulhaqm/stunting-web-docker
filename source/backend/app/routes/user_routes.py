from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from app.extensions import db
from app.models.aktivitas_user_model import AktivitasUser
from app.models.anak_model import Anak
from app.models.laporan_model import Laporan
from app.models.pengukuran_model import Pengukuran
from app.models.prediksi_model import Prediksi
from app.models.upload_massal_model import UploadMassal
from app.models.user_model import User
from app.utils.activity import log_activity
from app.utils.roles import normalize_role, role_options

user_bp = Blueprint("users", __name__)
MAX_ADMIN_USERS = 1
MAX_PETUGAS_USERS = 2


def role_count(role, exclude_user_id=None):
    if role == "petugas_kesehatan":
        query = User.query.filter(User.role.in_(["petugas", "petugas_kesehatan"]))
    else:
        query = User.query.filter_by(role=role)

    if exclude_user_id:
        query = query.filter(User.id_user != exclude_user_id)

    return query.count()


def validate_role_capacity(role, exclude_user_id=None):
    if role == "admin" and role_count("admin", exclude_user_id) >= MAX_ADMIN_USERS:
        return "Admin hanya boleh 1 akun"

    if (
        role == "petugas_kesehatan"
        and role_count("petugas_kesehatan", exclude_user_id) >= MAX_PETUGAS_USERS
    ):
        return "Petugas kesehatan maksimal 2 akun"

    return None


@user_bp.route("/roles", methods=["GET"])
def get_roles():
    return jsonify({
        "status": "success",
        "data": role_options()
    }), 200


@user_bp.route("/", methods=["GET"])
def get_users():
    users = User.query.order_by(User.created_at.desc()).all()

    return jsonify({
        "status": "success",
        "data": [user.to_dict() for user in users]
    }), 200


@user_bp.route("/<int:id_user>", methods=["GET"])
def get_user_by_id(id_user):
    user = User.query.get(id_user)

    if not user:
        return jsonify({
            "status": "error",
            "message": "User tidak ditemukan"
        }), 404

    return jsonify({
        "status": "success",
        "data": user.to_dict()
    }), 200


@user_bp.route("/", methods=["POST"])
def create_user():
    data = request.get_json(silent=True) or {}

    required_fields = ["nama", "email", "role", "password"]
    for field in required_fields:
        if field not in data or str(data[field]).strip() == "":
            return jsonify({
                "status": "error",
                "message": f"Field {field} wajib diisi"
            }), 400

    existing_user = User.query.filter_by(email=data["email"]).first()
    if existing_user:
        return jsonify({
            "status": "error",
            "message": "Email sudah digunakan"
        }), 400

    role = normalize_role(data["role"])
    if not role:
        return jsonify({
            "status": "error",
            "message": "Role harus admin, petugas_kesehatan, atau orang_tua"
        }), 400

    capacity_error = validate_role_capacity(role)
    if capacity_error:
        return jsonify({
            "status": "error",
            "message": capacity_error
        }), 400

    user = User(
        nama=data["nama"],
        email=data["email"],
        role=role,
        password=""
    )

    user.set_password(data["password"])

    db.session.add(user)
    db.session.flush()
    log_activity(
        user.id_user,
        "buat_user",
        "user",
        f"Buat user {user.nama}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "User berhasil ditambahkan",
        "data": user.to_dict()
    }), 201


@user_bp.route("/<int:id_user>", methods=["PUT"])
def update_user(id_user):
    user = User.query.get(id_user)

    if not user:
        return jsonify({
            "status": "error",
            "message": "User tidak ditemukan"
        }), 404

    data = request.get_json()

    if "nama" in data:
        user.nama = data["nama"]

    if "email" in data:
        existing_user = User.query.filter(
            User.email == data["email"],
            User.id_user != id_user
        ).first()

        if existing_user:
            return jsonify({
                "status": "error",
                "message": "Email sudah digunakan user lain"
            }), 400

        user.email = data["email"]

    if "role" in data:
        role = normalize_role(data["role"])
        if not role:
            return jsonify({
                "status": "error",
                "message": "Role harus admin, petugas_kesehatan, atau orang_tua"
            }), 400

        if (
            user.role == "admin"
            and role != "admin"
            and role_count("admin", exclude_user_id=user.id_user) == 0
        ):
            return jsonify({
                "status": "error",
                "message": "Admin tunggal tidak bisa diubah menjadi role lain"
            }), 400

        if role != user.role:
            capacity_error = validate_role_capacity(role, exclude_user_id=user.id_user)
            if capacity_error:
                return jsonify({
                    "status": "error",
                    "message": capacity_error
                }), 400

        user.role = role

    if "password" in data and data["password"] != "":
        user.set_password(data["password"])

    log_activity(
        user.id_user,
        "update_user",
        "user",
        f"Update user {user.nama}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "User berhasil diperbarui",
        "data": user.to_dict()
    }), 200


@user_bp.route("/<int:id_user>", methods=["DELETE"])
def delete_user(id_user):
    actor_id = request.args.get("actor_id", type=int)
    user = User.query.get(id_user)

    if not user:
        return jsonify({
            "status": "error",
            "message": "User tidak ditemukan"
        }), 404

    if actor_id and actor_id == id_user:
        return jsonify({
            "status": "error",
            "message": "Admin tidak bisa menghapus akun yang sedang digunakan"
        }), 400

    if user.role == "admin" and User.query.filter_by(role="admin").count() <= 1:
        return jsonify({
            "status": "error",
            "message": "Admin terakhir tidak bisa dihapus agar akses admin tetap tersedia"
        }), 400

    user_name = user.nama
    anak_ids = [
        id_anak
        for (id_anak,) in Anak.query.with_entities(Anak.id_anak)
        .filter_by(id_user=id_user)
        .all()
    ]
    upload_ids = [
        id_upload
        for (id_upload,) in UploadMassal.query.with_entities(UploadMassal.id_upload)
        .filter_by(id_user=id_user)
        .all()
    ]
    pengukuran_filters = []

    if anak_ids:
        pengukuran_filters.append(Pengukuran.id_anak.in_(anak_ids))

    if upload_ids:
        pengukuran_filters.append(Pengukuran.id_upload.in_(upload_ids))

    pengukuran_ids = []
    if pengukuran_filters:
        pengukuran_ids = [
            id_pengukuran
            for (id_pengukuran,) in Pengukuran.query.with_entities(
                Pengukuran.id_pengukuran
            )
            .filter(or_(*pengukuran_filters))
            .all()
        ]

    deleted_counts = {
        "prediksi": 0,
        "pengukuran": 0,
        "anak": len(anak_ids),
        "upload_massal": len(upload_ids),
        "laporan": Laporan.query.filter_by(id_user=id_user).count(),
        "aktivitas_user": AktivitasUser.query.filter_by(id_user=id_user).count(),
    }

    if pengukuran_ids:
        deleted_counts["prediksi"] = Prediksi.query.filter(
            Prediksi.id_pengukuran.in_(pengukuran_ids)
        ).delete(synchronize_session=False)
        deleted_counts["pengukuran"] = Pengukuran.query.filter(
            Pengukuran.id_pengukuran.in_(pengukuran_ids)
        ).delete(synchronize_session=False)

    if anak_ids:
        Anak.query.filter(Anak.id_anak.in_(anak_ids)).delete(
            synchronize_session=False
        )

    if upload_ids:
        UploadMassal.query.filter(UploadMassal.id_upload.in_(upload_ids)).delete(
            synchronize_session=False
        )

    Laporan.query.filter_by(id_user=id_user).delete(synchronize_session=False)
    # Pertahankan audit log; foreign key ON DELETE SET NULL akan menghapus
    # referensi user tanpa menghapus riwayat aktivitas.
    db.session.delete(user)

    actor_exists = (
        actor_id
        and actor_id != id_user
        and User.query.get(actor_id) is not None
    )
    log_activity(
        actor_id if actor_exists else None,
        "hapus_user_dengan_data",
        "user",
        (
            f"Hapus user {user_name} beserta data terkait: "
            f"{deleted_counts['anak']} anak, "
            f"{deleted_counts['pengukuran']} pengukuran, "
            f"{deleted_counts['prediksi']} prediksi, "
            f"{deleted_counts['upload_massal']} upload, "
            f"{deleted_counts['laporan']} laporan"
        ),
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "User dan data terkait berhasil dihapus",
        "data": deleted_counts
    }), 200
