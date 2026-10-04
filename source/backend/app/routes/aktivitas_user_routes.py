from datetime import datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import or_
from app.extensions import db
from app.models.aktivitas_user_model import AktivitasUser
from app.utils.activity import log_activity


aktivitas_user_bp = Blueprint("aktivitas_user", __name__)


def parse_positive_int(value, default, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default

    if parsed < 1:
        return default

    return min(parsed, maximum) if maximum else parsed


def parse_date(value):
    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


@aktivitas_user_bp.route("/", methods=["GET"])
def get_aktivitas_user():
    id_user = request.args.get("id_user")
    modul = request.args.get("modul")
    keyword = (request.args.get("q") or "").strip()
    tanggal = parse_date(request.args.get("tanggal"))
    page_arg = request.args.get("page")
    per_page_arg = request.args.get("per_page")

    query = AktivitasUser.query

    if id_user:
        query = query.filter_by(id_user=id_user)

    if modul:
        query = query.filter_by(modul=modul)

    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(
            or_(
                AktivitasUser.aktivitas.like(like_keyword),
                AktivitasUser.modul.like(like_keyword),
                AktivitasUser.deskripsi.like(like_keyword),
            )
        )

    if tanggal:
        query = query.filter(db.func.date(AktivitasUser.created_at) == tanggal)

    query = query.order_by(AktivitasUser.created_at.desc(), AktivitasUser.id_aktivitas.desc())

    if page_arg or per_page_arg:
        page = parse_positive_int(page_arg, 1)
        per_page = parse_positive_int(per_page_arg, 20, maximum=100)
        total = query.count()
        aktivitas = query.offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({
            "status": "success",
            "message": "Data aktivitas user berhasil diambil",
            "data": [item.to_dict() for item in aktivitas],
            "meta": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": (total + per_page - 1) // per_page,
            },
        }), 200

    aktivitas = query.all()

    return jsonify({
        "status": "success",
        "message": "Data aktivitas user berhasil diambil",
        "data": [item.to_dict() for item in aktivitas]
    }), 200


@aktivitas_user_bp.route("/", methods=["POST"])
def create_aktivitas_user():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body tidak boleh kosong"
        }), 400

    required_fields = ["aktivitas", "modul"]
    for field in required_fields:
        if field not in data or data[field] == "":
            return jsonify({
                "status": "error",
                "message": f"Field {field} wajib diisi"
            }), 400

    log_activity(
        data.get("id_user"),
        data["aktivitas"],
        data["modul"],
        data.get("deskripsi"),
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Aktivitas user berhasil dicatat"
    }), 201
