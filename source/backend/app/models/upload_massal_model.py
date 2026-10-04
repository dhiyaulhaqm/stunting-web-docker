from app.extensions import db
from datetime import datetime


class UploadMassal(db.Model):
    __tablename__ = "upload_massal"
    __table_args__ = (
        db.Index("idx_upload_massal_id_user", "id_user"),
        db.Index("idx_upload_massal_created_at", "created_at"),
        db.Index("idx_upload_massal_status", "status"),
    )

    id_upload = db.Column(db.Integer, primary_key=True)
    id_user = db.Column(db.Integer, db.ForeignKey("users.id_user"), nullable=False)

    nama_file = db.Column(db.String(255), nullable=False)
    total_row = db.Column(db.Integer, default=0)
    processed_row = db.Column(db.Integer, default=0)
    valid_row = db.Column(db.Integer, default=0)
    error_row = db.Column(db.Integer, default=0)
    status = db.Column(db.String(30), default="selesai")
    catatan = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    pengukuran = db.relationship("Pengukuran", backref="upload_massal", lazy=True)

    def to_dict(self):
        return {
            "id_upload": self.id_upload,
            "id_user": self.id_user,
            "nama_file": self.nama_file,
            "total_row": self.total_row,
            "processed_row": self.processed_row,
            "valid_row": self.valid_row,
            "error_row": self.error_row,
            "status": self.status,
            "catatan": self.catatan,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
