from app.extensions import db
from datetime import datetime


class Laporan(db.Model):
    __tablename__ = "laporan"

    id_laporan = db.Column(db.Integer, primary_key=True)
    id_user = db.Column(db.Integer, db.ForeignKey("users.id_user"), nullable=False)

    total_anak = db.Column(db.Integer, default=0)
    total_anak_normal = db.Column(db.Integer, default=0)
    total_anak_stunting = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id_laporan": self.id_laporan,
            "id_user": self.id_user,
            "total_anak": self.total_anak,
            "total_anak_normal": self.total_anak_normal,
            "total_anak_stunting": self.total_anak_stunting,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }