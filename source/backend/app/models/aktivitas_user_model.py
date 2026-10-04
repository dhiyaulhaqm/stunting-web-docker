from app.extensions import db
from datetime import datetime


class AktivitasUser(db.Model):
    __tablename__ = "aktivitas_user"

    id_aktivitas = db.Column(db.Integer, primary_key=True)
    id_user = db.Column(
        db.Integer,
        db.ForeignKey("users.id_user", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    aktivitas = db.Column(db.String(80), nullable=False)
    modul = db.Column(db.String(80), nullable=False)
    deskripsi = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id_aktivitas": self.id_aktivitas,
            "id_user": self.id_user,
            "aktivitas": self.aktivitas,
            "modul": self.modul,
            "deskripsi": self.deskripsi,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
