from flask import Flask
from app.config import Config
from app.extensions import db, cors
from sqlalchemy import inspect, text


def ensure_schema_updates():
    inspector = inspect(db.engine)

    def ensure_index(table_name, index_name, create_sql):
        indexes = inspector.get_indexes(table_name)
        if not any(index.get("name") == index_name for index in indexes):
            db.session.execute(text(create_sql))
            db.session.commit()

    if "anak" in inspector.get_table_names():
        anak_columns = {column["name"] for column in inspector.get_columns("anak")}

        if "nik" not in anak_columns:
            db.session.execute(text("ALTER TABLE anak ADD COLUMN nik VARCHAR(32) NULL"))
            db.session.commit()

        if "alamat" not in anak_columns:
            db.session.execute(text("ALTER TABLE anak ADD COLUMN alamat VARCHAR(255) NULL"))
            db.session.commit()

        if "kelurahan_desa" not in anak_columns:
            db.session.execute(
                text("ALTER TABLE anak ADD COLUMN kelurahan_desa VARCHAR(100) NULL")
            )
            db.session.commit()

        inspector = inspect(db.engine)
        indexes = inspector.get_indexes("anak")
        unique_constraints = inspector.get_unique_constraints("anak")
        dialect = db.engine.dialect.name

        for index in indexes:
            if index.get("unique") and index.get("column_names") == ["nik"]:
                index_name = index["name"]
                if dialect == "mysql":
                    db.session.execute(text(f"DROP INDEX `{index_name}` ON anak"))
                else:
                    db.session.execute(text(f"DROP INDEX {index_name}"))
                db.session.commit()

        has_user_nik_unique = any(
            constraint.get("column_names") == ["id_user", "nik"]
            for constraint in unique_constraints
        ) or any(
            index.get("unique") and index.get("column_names") == ["id_user", "nik"]
            for index in indexes
        )

        if not has_user_nik_unique:
            db.session.execute(
                text("CREATE UNIQUE INDEX uq_anak_id_user_nik ON anak (id_user, nik)")
            )
            db.session.commit()

        inspector = inspect(db.engine)
        ensure_index("anak", "idx_anak_id_user", "CREATE INDEX idx_anak_id_user ON anak (id_user)")
        ensure_index("anak", "idx_anak_nik", "CREATE INDEX idx_anak_nik ON anak (nik)")
        ensure_index(
            "anak",
            "idx_anak_kelurahan_desa",
            "CREATE INDEX idx_anak_kelurahan_desa ON anak (kelurahan_desa)",
        )

    if "prediksi" in inspector.get_table_names():
        prediksi_columns = {
            column["name"] for column in inspector.get_columns("prediksi")
        }

        if "detail" not in prediksi_columns:
            db.session.execute(text("ALTER TABLE prediksi ADD COLUMN detail JSON NULL"))
            db.session.commit()

        inspector = inspect(db.engine)
        ensure_index(
            "prediksi",
            "idx_prediksi_created_at",
            "CREATE INDEX idx_prediksi_created_at ON prediksi (created_at)",
        )
        ensure_index(
            "prediksi",
            "idx_prediksi_status_gizi",
            "CREATE INDEX idx_prediksi_status_gizi ON prediksi (status_gizi)",
        )

    if "pengukuran" in inspector.get_table_names():
        inspector = inspect(db.engine)
        ensure_index(
            "pengukuran",
            "idx_pengukuran_id_anak",
            "CREATE INDEX idx_pengukuran_id_anak ON pengukuran (id_anak)",
        )
        ensure_index(
            "pengukuran",
            "idx_pengukuran_id_upload",
            "CREATE INDEX idx_pengukuran_id_upload ON pengukuran (id_upload)",
        )
        ensure_index(
            "pengukuran",
            "idx_pengukuran_tanggal",
            "CREATE INDEX idx_pengukuran_tanggal ON pengukuran (tanggal_pengukuran)",
        )
        ensure_index(
            "pengukuran",
            "idx_pengukuran_created_at",
            "CREATE INDEX idx_pengukuran_created_at ON pengukuran (created_at)",
        )

    if "upload_massal" in inspector.get_table_names():
        upload_columns = {
            column["name"] for column in inspector.get_columns("upload_massal")
        }

        upload_column_definitions = {
            "processed_row": "ALTER TABLE upload_massal ADD COLUMN processed_row INT DEFAULT 0",
            "status": "ALTER TABLE upload_massal ADD COLUMN status VARCHAR(30) DEFAULT 'selesai'",
            "catatan": "ALTER TABLE upload_massal ADD COLUMN catatan TEXT NULL",
            "completed_at": "ALTER TABLE upload_massal ADD COLUMN completed_at DATETIME NULL",
        }

        for column_name, alter_sql in upload_column_definitions.items():
            if column_name not in upload_columns:
                db.session.execute(text(alter_sql))
                db.session.commit()

        inspector = inspect(db.engine)
        ensure_index(
            "upload_massal",
            "idx_upload_massal_id_user",
            "CREATE INDEX idx_upload_massal_id_user ON upload_massal (id_user)",
        )
        ensure_index(
            "upload_massal",
            "idx_upload_massal_created_at",
            "CREATE INDEX idx_upload_massal_created_at ON upload_massal (created_at)",
        )
        ensure_index(
            "upload_massal",
            "idx_upload_massal_status",
            "CREATE INDEX idx_upload_massal_status ON upload_massal (status)",
        )


def ensure_aktivitas_user_foreign_key():
    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()

    if "aktivitas_user" not in table_names or "users" not in table_names:
        return

    # Preserve existing audit records even when their deleted user no longer
    # exists, so they comply with the new nullable foreign key.
    db.session.execute(text("""
        UPDATE aktivitas_user AS aktivitas
        LEFT JOIN users AS user ON user.id_user = aktivitas.id_user
        SET aktivitas.id_user = NULL
        WHERE aktivitas.id_user IS NOT NULL
          AND user.id_user IS NULL
    """))
    db.session.commit()

    inspector = inspect(db.engine)
    activity_indexes = inspector.get_indexes("aktivitas_user")
    if not any(index.get("name") == "idx_aktivitas_user_id_user" for index in activity_indexes):
        db.session.execute(
            text("CREATE INDEX idx_aktivitas_user_id_user ON aktivitas_user (id_user)")
        )
        db.session.commit()

    inspector = inspect(db.engine)
    foreign_keys = inspector.get_foreign_keys("aktivitas_user")
    has_user_foreign_key = any(
        foreign_key.get("constrained_columns") == ["id_user"]
        and foreign_key.get("referred_table") == "users"
        and foreign_key.get("referred_columns") == ["id_user"]
        for foreign_key in foreign_keys
    )

    if not has_user_foreign_key:
        db.session.execute(text("""
            ALTER TABLE aktivitas_user
            ADD CONSTRAINT fk_aktivitas_user_users
            FOREIGN KEY (id_user)
            REFERENCES users(id_user)
            ON DELETE SET NULL
            ON UPDATE CASCADE
        """))
        db.session.commit()


def seed_admin_user(app):
    from app.models.user_model import User

    if User.query.filter_by(role="admin").first():
        return

    email = app.config.get("SEED_ADMIN_EMAIL")
    password = app.config.get("SEED_ADMIN_PASSWORD")

    if not email or not password:
        app.logger.warning(
            "Admin seed skipped: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required."
        )
        return

    admin = User(
        nama=app.config.get("SEED_ADMIN_NAME") or "Admin",
        email=email,
        role="admin",
        password="",
    )
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()
    app.logger.info("Admin seed created for %s", email)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    cors.init_app(app)

    from app.routes.user_routes import user_bp
    from app.routes.anak_routes import anak_bp
    from app.routes.pengukuran_routes import pengukuran_bp
    from app.routes.prediksi_routes import prediksi_bp
    from app.routes.upload_massal_routes import upload_massal_bp
    from app.routes.laporan_routes import laporan_bp
    from app.routes.validasi_routes import validasi_bp
    from app.routes.balita_routes import balita_bp
    from app.routes.aktivitas_user_routes import aktivitas_user_bp
    from app.routes.auth_routes import auth_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(anak_bp, url_prefix="/api/anak")
    app.register_blueprint(balita_bp, url_prefix="/api/balita")
    app.register_blueprint(pengukuran_bp, url_prefix="/api/pengukuran")
    app.register_blueprint(prediksi_bp, url_prefix="/api/prediksi")
    app.register_blueprint(upload_massal_bp, url_prefix="/api/upload-massal")
    app.register_blueprint(laporan_bp, url_prefix="/api/laporan")
    app.register_blueprint(validasi_bp, url_prefix="/api/validasi")
    app.register_blueprint(aktivitas_user_bp, url_prefix="/api/aktivitas-users")

    from app.models import User, Anak, UploadMassal, Pengukuran, Prediksi, Laporan, AktivitasUser

    with app.app_context():
        db.create_all()
        ensure_schema_updates()
        ensure_aktivitas_user_foreign_key()
        seed_admin_user(app)

    return app
