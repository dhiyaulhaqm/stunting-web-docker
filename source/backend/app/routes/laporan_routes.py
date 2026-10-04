from datetime import datetime

from flask import Blueprint, request, jsonify, make_response
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import aliased, joinedload
from app.extensions import db
from app.models.laporan_model import Laporan
from app.models.user_model import User
from app.models.anak_model import Anak
from app.models.pengukuran_model import Pengukuran
from app.models.prediksi_model import Prediksi
from app.utils.activity import log_activity
import csv
from io import StringIO


laporan_bp = Blueprint("laporan", __name__)


def base_prediksi_query(id_user=None):
    query = Prediksi.query.join(Pengukuran).join(Anak)

    if id_user:
        query = query.filter(Anak.id_user == id_user)

    return query


def apply_latest_per_anak(query, use_measurement_date=False, month_range=None):
    other_prediksi = aliased(Prediksi)
    other_pengukuran = aliased(Pengukuran)

    if use_measurement_date:
        later_filters = [
            other_pengukuran.id_anak == Pengukuran.id_anak,
            or_(
                other_pengukuran.tanggal_pengukuran > Pengukuran.tanggal_pengukuran,
                and_(
                    other_pengukuran.tanggal_pengukuran == Pengukuran.tanggal_pengukuran,
                    other_prediksi.id_prediksi > Prediksi.id_prediksi,
                ),
            ),
        ]

        if month_range:
            start, end = month_range
            later_filters.extend([
                other_pengukuran.tanggal_pengukuran >= start,
                other_pengukuran.tanggal_pengukuran < end,
            ])
    else:
        later_filters = [
            other_pengukuran.id_anak == Pengukuran.id_anak,
            or_(
                other_prediksi.created_at > Prediksi.created_at,
                and_(
                    other_prediksi.created_at == Prediksi.created_at,
                    other_prediksi.id_prediksi > Prediksi.id_prediksi,
                ),
            ),
        ]

    later_exists = (
        db.session.query(other_prediksi.id_prediksi)
        .join(
            other_pengukuran,
            other_prediksi.id_pengukuran == other_pengukuran.id_pengukuran,
        )
        .filter(*later_filters)
        .exists()
    )

    return query.filter(~later_exists)


def build_laporan_ringkasan(id_user=None):
    total_prediksi = base_prediksi_query(id_user).count()
    latest_query = apply_latest_per_anak(base_prediksi_query(id_user))
    status_counts = dict(
        latest_query.with_entities(
            Prediksi.status_gizi,
            func.count(Prediksi.id_prediksi),
        )
        .group_by(Prediksi.status_gizi)
        .all()
    )

    return {
        "total_anak": sum(status_counts.values()),
        "total_prediksi": total_prediksi,
        "total_anak_normal": status_counts.get("Normal", 0),
        "total_anak_stunting": status_counts.get("Stunting", 0),
        "total_risiko_stunting": status_counts.get("Risiko Stunting", 0),
        "total_gizi_kurang": status_counts.get("Gizi Kurang", 0),
        "total_gizi_lebih": status_counts.get("Gizi Lebih", 0),
    }


def parse_month_range(value):
    if not value:
        return None

    try:
        start = datetime.strptime(value, "%Y-%m").date()
    except ValueError:
        return None

    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)

    return start, end


def measurement_date(prediksi):
    if prediksi.pengukuran and prediksi.pengukuran.tanggal_pengukuran:
        return prediksi.pengukuran.tanggal_pengukuran

    return prediksi.created_at.date() if prediksi.created_at else None


def is_normal_status(status):
    return str(status or "").strip().lower() == "normal"


def is_stunting_status(status):
    return str(status or "").strip().lower() == "stunting"


def is_target_status(status):
    return is_normal_status(status) or is_stunting_status(status)


def prediksi_report_detail(prediksi):
    pengukuran = prediksi.pengukuran
    anak = pengukuran.anak if pengukuran else None
    detail = prediksi.detail or {}

    return {
        "id_prediksi": prediksi.id_prediksi,
        "status_gizi": prediksi.status_gizi,
        "created_at": prediksi.created_at.isoformat() if prediksi.created_at else None,
        "detail": detail,
        "anak": anak.to_dict() if anak else None,
        "pengukuran": pengukuran.to_dict() if pengukuran else None,
    }


def build_monthly_laporan(id_user=None, bulan=None):
    query = base_prediksi_query(id_user)

    month_range = parse_month_range(bulan)

    if not month_range:
        latest_month_row = query.with_entities(Pengukuran.tanggal_pengukuran).filter(
            Pengukuran.tanggal_pengukuran.isnot(None)
        ).order_by(Pengukuran.tanggal_pengukuran.desc()).first()

        if latest_month_row and latest_month_row[0]:
            bulan = latest_month_row[0].isoformat()[:7]
            month_range = parse_month_range(bulan)

    if month_range:
        start, end = month_range
        query = query.filter(
            Pengukuran.tanggal_pengukuran >= start,
            Pengukuran.tanggal_pengukuran < end,
        )

    latest_query = apply_latest_per_anak(
        query,
        use_measurement_date=True,
        month_range=month_range,
    )
    checked_anak = (
        latest_query
        .options(joinedload(Prediksi.pengukuran).joinedload(Pengukuran.anak))
        .order_by(Pengukuran.tanggal_pengukuran.desc(), Prediksi.id_prediksi.desc())
        .all()
    )
    target_anak = [item for item in checked_anak if is_target_status(item.status_gizi)]
    normal_count = sum(1 for item in target_anak if is_normal_status(item.status_gizi))
    stunting_count = sum(1 for item in target_anak if is_stunting_status(item.status_gizi))
    fallback_review_count = sum(
        1 for item in checked_anak if (item.detail or {}).get("requires_review")
    )
    wilayah_map = {}

    for item in target_anak:
        anak = item.pengukuran.anak if item.pengukuran else None
        wilayah = (
            (anak.kelurahan_desa.strip() if anak and anak.kelurahan_desa else "")
            or (anak.alamat.strip() if anak and anak.alamat else "")
            or "Wilayah belum diisi"
        )
        current = wilayah_map.get(wilayah) or {
            "wilayah": wilayah,
            "normal": 0,
            "stunting": 0,
            "total": 0,
        }

        if is_normal_status(item.status_gizi):
            current["normal"] += 1
        if is_stunting_status(item.status_gizi):
            current["stunting"] += 1

        current["total"] += 1
        wilayah_map[wilayah] = current

    wilayah_comparison = sorted(
        wilayah_map.values(),
        key=lambda item: (-item["stunting"], -item["total"], item["wilayah"]),
    )
    priority_anak = [
        prediksi_report_detail(item)
        for item in target_anak
        if is_stunting_status(item.status_gizi)
    ][:100]

    return {
        "bulan_laporan": bulan,
        "anak_dicek_bulan": len(checked_anak),
        "target_terklasifikasi_bulan": len(target_anak),
        "normal_bulan": normal_count,
        "stunting_bulan": stunting_count,
        "belum_target_bulan": max(len(checked_anak) - len(target_anak), 0),
        "status_dominan_bulan": (
            "Stunting"
            if stunting_count > normal_count
            else "Normal"
            if normal_count > 0
            else "-"
        ),
        "fallback_review_count": fallback_review_count,
        "wilayah_perbandingan": wilayah_comparison,
        "prioritas_stunting": priority_anak,
    }


def build_laporan_rows(id_user=None):
    query = Prediksi.query.join(Pengukuran).join(Anak)

    if id_user:
        query = query.filter(Anak.id_user == id_user)

    prediksi_list = query.order_by(Prediksi.created_at.desc()).all()
    rows = []

    for prediksi in prediksi_list:
        pengukuran = prediksi.pengukuran
        anak = pengukuran.anak if pengukuran else None

        rows.append({
            "id_prediksi": prediksi.id_prediksi,
            "nama": anak.nama if anak else None,
            "jenis_kelamin": anak.jenis_kelamin if anak else None,
            "umur_bulan": pengukuran.umur_bulan if pengukuran else None,
            "berat_badan": pengukuran.berat_badan if pengukuran else None,
            "tinggi_badan": pengukuran.tinggi_badan if pengukuran else None,
            "status_gizi": prediksi.status_gizi,
            "tanggal_pengukuran": pengukuran.tanggal_pengukuran.isoformat() if pengukuran and pengukuran.tanggal_pengukuran else None,
            "created_at": prediksi.created_at.isoformat() if prediksi.created_at else None,
        })

    return rows


@laporan_bp.route("/", methods=["GET"])
def get_all_laporan():
    id_user = request.args.get("id_user")

    query = Laporan.query

    if id_user:
        query = query.filter_by(id_user=id_user)

    data_laporan = query.order_by(Laporan.id_laporan.desc()).all()

    return jsonify({
        "status": "success",
        "message": "Data laporan berhasil diambil",
        "data": [laporan.to_dict() for laporan in data_laporan]
    }), 200


@laporan_bp.route("/<int:id_laporan>", methods=["GET"])
def get_laporan_by_id(id_laporan):
    laporan = Laporan.query.get(id_laporan)

    if not laporan:
        return jsonify({
            "status": "error",
            "message": "Data laporan tidak ditemukan"
        }), 404

    return jsonify({
        "status": "success",
        "message": "Data laporan berhasil ditemukan",
        "data": laporan.to_dict()
    }), 200


@laporan_bp.route("/ringkasan", methods=["GET"])
def get_ringkasan_laporan():
    id_user = request.args.get("id_user")
    bulan = request.args.get("bulan")
    ringkasan = build_laporan_ringkasan(id_user)
    ringkasan.update(build_monthly_laporan(id_user, bulan))

    return jsonify({
        "status": "success",
        "message": "Ringkasan laporan klasifikasi berhasil diambil",
        "data": ringkasan
    }), 200


@laporan_bp.route("/download", methods=["GET"])
def download_laporan():
    id_user = request.args.get("id_user")
    rows = build_laporan_rows(id_user)

    output = StringIO()
    fieldnames = [
        "id_prediksi",
        "nama",
        "jenis_kelamin",
        "umur_bulan",
        "berat_badan",
        "tinggi_badan",
        "status_gizi",
        "tanggal_pengukuran",
        "created_at",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=laporan_klasifikasi.csv"
    response.headers["Content-Type"] = "text/csv"

    return response


@laporan_bp.route("/", methods=["POST"])
def create_laporan():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body tidak boleh kosong"
        }), 400

    required_fields = [
        "id_user",
        "total_anak",
        "total_anak_normal",
        "total_anak_stunting"
    ]

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

    laporan = Laporan(
        id_user=data["id_user"],
        total_anak=data["total_anak"],
        total_anak_normal=data["total_anak_normal"],
        total_anak_stunting=data["total_anak_stunting"]
    )

    db.session.add(laporan)
    log_activity(
        data["id_user"],
        "buat_laporan",
        "laporan",
        "Buat laporan klasifikasi manual",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data laporan berhasil ditambahkan",
        "data": laporan.to_dict()
    }), 201


@laporan_bp.route("/<int:id_laporan>", methods=["PUT"])
def update_laporan(id_laporan):
    laporan = Laporan.query.get(id_laporan)

    if not laporan:
        return jsonify({
            "status": "error",
            "message": "Data laporan tidak ditemukan"
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

        laporan.id_user = data["id_user"]

    if "total_anak" in data:
        laporan.total_anak = data["total_anak"]

    if "total_anak_normal" in data:
        laporan.total_anak_normal = data["total_anak_normal"]

    if "total_anak_stunting" in data:
        laporan.total_anak_stunting = data["total_anak_stunting"]

    log_activity(
        laporan.id_user,
        "update_laporan",
        "laporan",
        f"Update laporan {laporan.id_laporan}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data laporan berhasil diperbarui",
        "data": laporan.to_dict()
    }), 200


@laporan_bp.route("/<int:id_laporan>", methods=["DELETE"])
def delete_laporan(id_laporan):
    laporan = Laporan.query.get(id_laporan)

    if not laporan:
        return jsonify({
            "status": "error",
            "message": "Data laporan tidak ditemukan"
        }), 404

    id_user = laporan.id_user
    db.session.delete(laporan)
    log_activity(
        id_user,
        "hapus_laporan",
        "laporan",
        f"Hapus laporan {id_laporan}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data laporan berhasil dihapus"
    }), 200
