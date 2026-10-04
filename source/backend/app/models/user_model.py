from app.extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = "users"

    id_user = db.Column(db.Integer, primary_key=True)
    nama = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(30), nullable=False, default="petugas_kesehatan")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    anak = db.relationship("Anak", backref="user", lazy=True, cascade="all, delete-orphan")
    upload_massal = db.relationship("UploadMassal", backref="user", lazy=True, cascade="all, delete-orphan")
    laporan = db.relationship("Laporan", backref="user", lazy=True, cascade="all, delete-orphan")
    aktivitas = db.relationship(
        "AktivitasUser",
        backref="user",
        lazy=True,
        passive_deletes=True,
    )

    def set_password(self, raw_password):
        self.password = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password, raw_password)

    def to_dict(self):
        return {
            "id_user": self.id_user,
            "nama": self.nama,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
