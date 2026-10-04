from app.extensions import db
from datetime import datetime


class Prediksi(db.Model):
    __tablename__ = "prediksi"
    __table_args__ = (
        db.Index("idx_prediksi_created_at", "created_at"),
        db.Index("idx_prediksi_status_gizi", "status_gizi"),
    )

    id_prediksi = db.Column(db.Integer, primary_key=True)

    id_pengukuran = db.Column(
        db.Integer,
        db.ForeignKey("pengukuran.id_pengukuran"),
        nullable=False,
        unique=True
    )

    status_gizi = db.Column(db.String(50), nullable=False)
    detail = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id_prediksi": self.id_prediksi,
            "id_pengukuran": self.id_pengukuran,
            "status_gizi": self.status_gizi,
            "detail": self.detail,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
