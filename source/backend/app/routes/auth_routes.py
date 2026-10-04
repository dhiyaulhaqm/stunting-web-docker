from flask import Blueprint, jsonify, request
from sqlalchemy import func

from app.extensions import db
from app.models.user_model import User

auth_bp = Blueprint("auth", __name__)


def is_supported_password_hash(password):
    return password.startswith(("scrypt:", "pbkdf2:", "argon2:"))


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify({
            "status": "error",
            "message": "Email dan password wajib diisi"
        }), 400

    user = User.query.filter(func.lower(User.email) == email).first()

    password_valid = False

    if user and user.password:
        if is_supported_password_hash(user.password):
            password_valid = user.check_password(password)
        elif user.password == password:
            user.set_password(password)
            db.session.commit()
            password_valid = True

    if not password_valid:
        return jsonify({
            "status": "error",
            "message": "Email atau password salah"
        }), 401

    return jsonify({
        "status": "success",
        "message": "Login berhasil",
        "data": user.to_dict()
    }), 200
