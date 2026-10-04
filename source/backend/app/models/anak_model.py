from app.extensions import db
from datetime import datetime


class Anak(db.Model):
    __tablename__ = "anak"
    __table_args__ = (
        db.UniqueConstraint("id_user", "nik", name="uq_anak_id_user_nik"),
        db.Index("idx_anak_id_user", "id_user"),
        db.Index("idx_anak_nik", "nik"),
        db.Index("idx_anak_kelurahan_desa", "kelurahan_desa"),
    )

    id_anak = db.Column(db.Integer, primary_key=True)
    id_user = db.Column(db.Integer, db.ForeignKey("users.id_user"), nullable=False)

    nik = db.Column(db.String(32), nullable=True)
    nama = db.Column(db.String(100), nullable=False)
    tanggal_lahir = db.Column(db.Date, nullable=False)
    jenis_kelamin = db.Column(db.String(20), nullable=False)
    alamat = db.Column(db.String(255), nullable=True)
    kelurahan_desa = db.Column(db.String(100), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    pengukuran = db.relationship("Pengukuran", backref="anak", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id_anak": self.id_anak,
            "id_user": self.id_user,
            "nik": self.nik,
            "nama": self.nama,
            "tanggal_lahir": self.tanggal_lahir.isoformat() if self.tanggal_lahir else None,
            "jenis_kelamin": self.jenis_kelamin,
            "alamat": self.alamat,
            "kelurahan_desa": self.kelurahan_desa,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
