import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")

    DB_USERNAME = os.getenv("DB_USERNAME", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "db_stunting")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USERNAME}:{DB_PASSWORD}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SEED_ADMIN_NAME = os.getenv("SEED_ADMIN_NAME", "Admin")
    SEED_ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "")
    SEED_ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "")
