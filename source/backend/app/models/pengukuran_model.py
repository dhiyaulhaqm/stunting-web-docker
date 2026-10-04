from app.extensions import db
from datetime import datetime


class Pengukuran(db.Model):
    __tablename__ = "pengukuran"
    __table_args__ = (
        db.Index("idx_pengukuran_id_anak", "id_anak"),
        db.Index("idx_pengukuran_id_upload", "id_upload"),
        db.Index("idx_pengukuran_tanggal", "tanggal_pengukuran"),
        db.Index("idx_pengukuran_created_at", "created_at"),
    )

    id_pengukuran = db.Column(db.Integer, primary_key=True)

    id_anak = db.Column(db.Integer, db.ForeignKey("anak.id_anak"), nullable=False)
    id_upload = db.Column(db.Integer, db.ForeignKey("upload_massal.id_upload"), nullable=True)

    umur_bulan = db.Column(db.Integer, nullable=False)
    berat_badan = db.Column(db.Float, nullable=False)
    tinggi_badan = db.Column(db.Float, nullable=False)

    tanggal_pengukuran = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    prediksi = db.relationship("Prediksi", backref="pengukuran", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id_pengukuran": self.id_pengukuran,
            "id_anak": self.id_anak,
            "id_upload": self.id_upload,
            "umur_bulan": self.umur_bulan,
            "berat_badan": self.berat_badan,
            "tinggi_badan": self.tinggi_badan,
            "tanggal_pengukuran": self.tanggal_pengukuran.isoformat() if self.tanggal_pengukuran else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
