from app.extensions import db
from app.models.aktivitas_user_model import AktivitasUser


def log_activity(id_user, aktivitas, modul, deskripsi=None):
    activity = AktivitasUser(
        id_user=id_user,
        aktivitas=aktivitas,
        modul=modul,
        deskripsi=deskripsi,
    )

    db.session.add(activity)
