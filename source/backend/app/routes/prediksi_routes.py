from datetime import datetime

from flask import Blueprint, request, jsonify
from sqlalchemy import Numeric, cast, func, or_
from app.extensions import db
from app.models.prediksi_model import Prediksi
from app.models.pengukuran_model import Pengukuran
from app.models.anak_model import Anak
from app.services.prediction_service import predict_growth_status
from app.utils.activity import log_activity
from app.utils.zscore import calculate_height_for_age_zscore


prediksi_bp = Blueprint("prediksi", __name__)


def parse_positive_int(value, default, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default

    if parsed < 1:
        return default

    return min(parsed, maximum) if maximum else parsed


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


def apply_riwayat_filters(query, include_status=True, include_month=True):
    id_anak = request.args.get("id_anak")
    id_user = request.args.get("id_user")
    id_upload = request.args.get("id_upload")
    keyword = (request.args.get("q") or "").strip()
    bulan = request.args.get("bulan")
    kelurahan_desa = (request.args.get("kelurahan_desa") or "").strip()
    status_gizi = (request.args.get("status_gizi") or "").strip()

    if id_anak:
        query = query.filter(Pengukuran.id_anak == id_anak)

    if id_user:
        query = query.filter(Anak.id_user == id_user)

    if id_upload:
        query = query.filter(Pengukuran.id_upload == id_upload)

    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(
            or_(
                Anak.nama.like(like_keyword),
                Anak.nik.like(like_keyword),
                Anak.alamat.like(like_keyword),
                Anak.kelurahan_desa.like(like_keyword),
            )
        )

    if kelurahan_desa:
        query = query.filter(Anak.kelurahan_desa == kelurahan_desa)

    if include_status and status_gizi:
        query = query.filter(Prediksi.status_gizi == status_gizi)

    month_range = parse_month_range(bulan) if include_month else None
    if month_range:
        start, end = month_range
        query = query.filter(
            Pengukuran.tanggal_pengukuran >= start,
            Pengukuran.tanggal_pengukuran < end,
        )

    return query


def prediksi_time_value(prediksi):
    if prediksi.pengukuran and prediksi.pengukuran.tanggal_pengukuran:
        return prediksi.pengukuran.tanggal_pengukuran.isoformat()

    return prediksi.created_at.isoformat() if prediksi.created_at else ""


def prediksi_sort_value(prediksi, sort_by):
    pengukuran = prediksi.pengukuran
    anak = pengukuran.anak if pengukuran else None

    if sort_by == "nama":
        return anak.nama if anak else ""
    if sort_by == "kelurahan_desa":
        return anak.kelurahan_desa if anak else ""
    if sort_by == "jenis_kelamin":
        return anak.jenis_kelamin if anak else ""
    if sort_by == "umur_bulan":
        return pengukuran.umur_bulan if pengukuran else None
    if sort_by == "berat_badan":
        return pengukuran.berat_badan if pengukuran else None
    if sort_by == "tinggi_badan":
        return pengukuran.tinggi_badan if pengukuran else None
    if sort_by == "z_score_tbu":
        detail = prediksi.detail or {}
        indikator = detail.get("indikator_z_score") or {}
        return indikator.get("z_score")
    if sort_by == "status_gizi":
        return prediksi.status_gizi or ""

    return prediksi_time_value(prediksi)


def latest_per_child(prediksi_list):
    latest_by_anak = {}

    for prediksi in prediksi_list:
        pengukuran = prediksi.pengukuran
        if not pengukuran:
            continue

        key = pengukuran.id_anak
        current = latest_by_anak.get(key)

        if (
            not current
            or prediksi_time_value(prediksi) > prediksi_time_value(current)
            or (
                prediksi_time_value(prediksi) == prediksi_time_value(current)
                and prediksi.id_prediksi > current.id_prediksi
            )
        ):
            latest_by_anak[key] = prediksi

    return list(latest_by_anak.values())


def history_per_child(prediksi_list, limit):
    history_by_anak = {}

    for prediksi in prediksi_list:
        pengukuran = prediksi.pengukuran
        if not pengukuran:
            continue

        history_by_anak.setdefault(pengukuran.id_anak, []).append(prediksi)

    limited_history = []
    for child_history in history_by_anak.values():
        sorted_history = sorted(
            child_history,
            key=lambda item: (prediksi_time_value(item), item.id_prediksi),
        )
        limited_history.extend(sorted_history[-limit:])

    return limited_history


def sort_prediksi_list(prediksi_list):
    sort_by = request.args.get("sort_by") or "tanggal_pengukuran"
    sort_dir = request.args.get("sort_dir") or "desc"

    def sort_key(prediksi):
        value = prediksi_sort_value(prediksi, sort_by)
        is_empty = value is None or value == ""

        return (
            is_empty,
            value if isinstance(value, (int, float)) else str(value).lower(),
            prediksi.id_prediksi,
        )

    return sorted(prediksi_list, key=sort_key, reverse=sort_dir == "desc")


def apply_riwayat_sort(query):
    sort_by = request.args.get("sort_by") or "tanggal_pengukuran"
    sort_dir = request.args.get("sort_dir") or "desc"
    z_score_column = cast(
        func.json_unquote(
            func.json_extract(Prediksi.detail, "$.indikator_z_score.z_score")
        ),
        Numeric(10, 4),
    )
    sort_columns = {
        "nama": Anak.nama,
        "kelurahan_desa": Anak.kelurahan_desa,
        "jenis_kelamin": Anak.jenis_kelamin,
        "umur_bulan": Pengukuran.umur_bulan,
        "berat_badan": Pengukuran.berat_badan,
        "tinggi_badan": Pengukuran.tinggi_badan,
        "z_score_tbu": z_score_column,
        "status_gizi": Prediksi.status_gizi,
        "tanggal_pengukuran": Pengukuran.tanggal_pengukuran,
        "created_at": Prediksi.created_at,
    }
    column = sort_columns.get(sort_by, Pengukuran.tanggal_pengukuran)
    order_column = column.asc() if sort_dir == "asc" else column.desc()

    return query.order_by(order_column, Prediksi.id_prediksi.desc())


def prediksi_detail(prediksi):
    data = prediksi.to_dict()
    pengukuran = prediksi.pengukuran

    if pengukuran:
        data["pengukuran"] = pengukuran.to_dict()
        if pengukuran.anak:
            data["anak"] = pengukuran.anak.to_dict()

        z_score_detail = calculate_height_for_age_zscore(
            pengukuran.umur_bulan,
            pengukuran.tinggi_badan,
            pengukuran.anak.jenis_kelamin if pengukuran.anak else None,
        )

        if z_score_detail:
            data["detail"] = {
                **(data.get("detail") or {}),
                "indikator_z_score": z_score_detail,
            }

    return data


@prediksi_bp.route("/", methods=["GET"])
def get_all_prediksi():
    data_prediksi = Prediksi.query.order_by(Prediksi.id_prediksi.desc()).all()

    return jsonify({
        "status": "success",
        "message": "Data prediksi berhasil diambil",
        "data": [prediksi.to_dict() for prediksi in data_prediksi]
    }), 200


@prediksi_bp.route("/<int:id_prediksi>", methods=["GET"])
def get_prediksi_by_id(id_prediksi):
    prediksi = Prediksi.query.get(id_prediksi)

    if not prediksi:
        return jsonify({
            "status": "error",
            "message": "Data prediksi tidak ditemukan"
        }), 404

    return jsonify({
        "status": "success",
        "message": "Data prediksi berhasil ditemukan",
        "data": prediksi.to_dict()
    }), 200


@prediksi_bp.route("/", methods=["POST"])
def create_prediksi():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body tidak boleh kosong"
        }), 400

    required_fields = ["id_pengukuran"]

    for field in required_fields:
        if field not in data or data[field] == "":
            return jsonify({
                "status": "error",
                "message": f"Field {field} wajib diisi"
            }), 400

    pengukuran = Pengukuran.query.get(data["id_pengukuran"])

    if not pengukuran:
        return jsonify({
            "status": "error",
            "message": "Data pengukuran tidak ditemukan"
        }), 404

    existing_prediksi = Prediksi.query.filter_by(
        id_pengukuran=data["id_pengukuran"]
    ).first()

    if existing_prediksi:
        return jsonify({
            "status": "error",
            "message": "Data pengukuran ini sudah memiliki hasil prediksi"
        }), 400

    status_gizi = data.get("status_gizi")
    hasil_prediksi = None

    if not status_gizi:
        hasil_prediksi = predict_growth_status(
            pengukuran.umur_bulan,
            pengukuran.berat_badan,
            pengukuran.tinggi_badan,
            pengukuran.anak.jenis_kelamin if pengukuran.anak else None,
        )
        status_gizi = hasil_prediksi["status_gizi"]

    prediksi = Prediksi(
        id_pengukuran=data["id_pengukuran"],
        status_gizi=status_gizi,
        detail=hasil_prediksi.get("detail") if hasil_prediksi else data.get("detail"),
    )

    db.session.add(prediksi)
    log_activity(
        pengukuran.anak.id_user if pengukuran.anak else None,
        "prediksi_status_gizi",
        "prediksi",
        f"Prediksi pengukuran {pengukuran.id_pengukuran}: {status_gizi}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data prediksi berhasil ditambahkan",
        "data": {
            **prediksi.to_dict(),
            "hasil_prediksi": hasil_prediksi
        }
    }), 201


@prediksi_bp.route("/hitung", methods=["POST"])
def hitung_prediksi():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body tidak boleh kosong"
        }), 400

    required_fields = ["umur_bulan", "berat_badan", "tinggi_badan"]
    for field in required_fields:
        if field not in data or data[field] == "":
            return jsonify({
                "status": "error",
                "message": f"Field {field} wajib diisi"
            }), 400

    try:
        hasil_prediksi = predict_growth_status(
            int(data["umur_bulan"]),
            float(data["berat_badan"]),
            float(data["tinggi_badan"]),
            data.get("jenis_kelamin"),
        )
    except (TypeError, ValueError):
        return jsonify({
            "status": "error",
            "message": "Umur, berat badan, dan tinggi badan harus berupa angka"
        }), 400

    return jsonify({
        "status": "success",
        "message": "Prediksi status gizi berhasil dihitung",
        "data": hasil_prediksi
    }), 200


@prediksi_bp.route("/riwayat", methods=["GET"])
def get_riwayat_prediksi():
    latest_only = request.args.get("latest_per_child") == "true"
    history_limit_arg = request.args.get("history_limit_per_child")
    history_limit = parse_positive_int(history_limit_arg, 0, maximum=24)
    history_until_month = request.args.get("history_until_month")
    status_gizi = (request.args.get("status_gizi") or "").strip()
    query = Prediksi.query.join(Pengukuran).join(Anak)
    page_arg = request.args.get("page")
    per_page_arg = request.args.get("per_page")

    if history_limit:
        filtered_query = apply_riwayat_filters(
            query,
            include_status=False,
            include_month=False,
        )
        month_range = parse_month_range(history_until_month)

        if month_range:
            _start, end = month_range
            filtered_query = filtered_query.filter(
                Pengukuran.tanggal_pengukuran < end,
            )

        data_prediksi = history_per_child(filtered_query.all(), history_limit)
        data_prediksi = sorted(
            data_prediksi,
            key=lambda item: (item.pengukuran.id_anak, prediksi_time_value(item), item.id_prediksi),
        )

        return jsonify({
            "status": "success",
            "message": "Riwayat prediksi berhasil diambil",
            "data": [prediksi_detail(prediksi) for prediksi in data_prediksi]
        }), 200

    if latest_only:
        filtered_query = apply_riwayat_filters(query, include_status=False)
        data_prediksi = latest_per_child(filtered_query.all())

        if status_gizi:
            data_prediksi = [
                item for item in data_prediksi if item.status_gizi == status_gizi
            ]

        data_prediksi = sort_prediksi_list(data_prediksi)

        if page_arg or per_page_arg:
            page = parse_positive_int(page_arg, 1)
            per_page = parse_positive_int(per_page_arg, 25, maximum=100)
            total = len(data_prediksi)
            start = (page - 1) * per_page
            end = start + per_page

            return jsonify({
                "status": "success",
                "message": "Riwayat prediksi berhasil diambil",
                "data": [
                    prediksi_detail(prediksi)
                    for prediksi in data_prediksi[start:end]
                ],
                "meta": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": (total + per_page - 1) // per_page,
                },
            }), 200

        return jsonify({
            "status": "success",
            "message": "Riwayat prediksi berhasil diambil",
            "data": [prediksi_detail(prediksi) for prediksi in data_prediksi]
        }), 200

    query = apply_riwayat_sort(apply_riwayat_filters(query))

    if page_arg or per_page_arg:
        page = parse_positive_int(page_arg, 1)
        per_page = parse_positive_int(per_page_arg, 25, maximum=100)
        total = query.count()
        data_prediksi = query.offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({
            "status": "success",
            "message": "Riwayat prediksi berhasil diambil",
            "data": [prediksi_detail(prediksi) for prediksi in data_prediksi],
            "meta": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": (total + per_page - 1) // per_page,
            },
        }), 200

    data_prediksi = query.all()

    return jsonify({
        "status": "success",
        "message": "Riwayat prediksi berhasil diambil",
        "data": [prediksi_detail(prediksi) for prediksi in data_prediksi]
    }), 200


@prediksi_bp.route("/riwayat/filter-options", methods=["GET"])
def get_riwayat_filter_options():
    query = Prediksi.query.join(Pengukuran).join(Anak)
    id_user = request.args.get("id_user")
    id_upload = request.args.get("id_upload")

    if id_user:
        query = query.filter(Anak.id_user == id_user)

    if id_upload:
        query = query.filter(Pengukuran.id_upload == id_upload)

    rows = query.with_entities(
        Pengukuran.tanggal_pengukuran,
        Anak.kelurahan_desa,
        Prediksi.status_gizi,
    ).all()
    bulan_options = sorted(
        {
            tanggal.isoformat()[:7]
            for tanggal, _kelurahan, _status in rows
            if tanggal
        },
        reverse=True,
    )
    kelurahan_options = sorted(
        {
            kelurahan.strip()
            for _tanggal, kelurahan, _status in rows
            if kelurahan and kelurahan.strip()
        }
    )
    status_options = sorted(
        {
            status.strip()
            for _tanggal, _kelurahan, status in rows
            if status and status.strip()
        }
    )

    return jsonify({
        "status": "success",
        "data": {
            "bulan": bulan_options,
            "kelurahan_desa": kelurahan_options,
            "status_gizi": status_options,
        },
    }), 200


@prediksi_bp.route("/<int:id_prediksi>", methods=["PUT"])
def update_prediksi(id_prediksi):
    prediksi = Prediksi.query.get(id_prediksi)

    if not prediksi:
        return jsonify({
            "status": "error",
            "message": "Data prediksi tidak ditemukan"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body tidak boleh kosong"
        }), 400

    if "id_pengukuran" in data:
        pengukuran = Pengukuran.query.get(data["id_pengukuran"])

        if not pengukuran:
            return jsonify({
                "status": "error",
                "message": "Data pengukuran tidak ditemukan"
            }), 404

        existing_prediksi = Prediksi.query.filter(
            Prediksi.id_pengukuran == data["id_pengukuran"],
            Prediksi.id_prediksi != id_prediksi
        ).first()

        if existing_prediksi:
            return jsonify({
                "status": "error",
                "message": "Data pengukuran ini sudah digunakan pada prediksi lain"
            }), 400

        prediksi.id_pengukuran = data["id_pengukuran"]

    if "status_gizi" in data:
        if data["status_gizi"] == "":
            return jsonify({
                "status": "error",
                "message": "Status gizi tidak boleh kosong"
            }), 400

        prediksi.status_gizi = data["status_gizi"]

    log_activity(
        prediksi.pengukuran.anak.id_user if prediksi.pengukuran and prediksi.pengukuran.anak else None,
        "update_prediksi",
        "prediksi",
        f"Update prediksi {prediksi.id_prediksi}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data prediksi berhasil diperbarui",
        "data": prediksi.to_dict()
    }), 200


@prediksi_bp.route("/<int:id_prediksi>", methods=["DELETE"])
def delete_prediksi(id_prediksi):
    prediksi = Prediksi.query.get(id_prediksi)

    if not prediksi:
        return jsonify({
            "status": "error",
            "message": "Data prediksi tidak ditemukan"
        }), 404

    id_user = prediksi.pengukuran.anak.id_user if prediksi.pengukuran and prediksi.pengukuran.anak else None
    db.session.delete(prediksi)
    log_activity(
        id_user,
        "hapus_prediksi",
        "prediksi",
        f"Hapus prediksi {id_prediksi}",
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Data prediksi berhasil dihapus"
    }), 200
