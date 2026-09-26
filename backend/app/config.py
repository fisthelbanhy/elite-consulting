from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_prefix="LF_", extra="ignore")

    environnement: str = "dev"
    database_url: str = f"sqlite:///{(BASE_DIR / 'data' / 'lafrangine.sqlite3').as_posix()}"
    media_dir: Path = BASE_DIR / "media"
    media_url: str = "/media"

    # Durée de vie d'une session (jours) et d'un lien de réinitialisation (minutes)
    session_jours: int = 30
    reset_minutes: int = 60

    # Téléversements (le legacy limitait à ~4 Mo)
    upload_max_octets: int = 4 * 1024 * 1024
    photo_largeur_max: int = 1200

    # Limitation des tentatives de connexion
    login_max_echecs: int = 5
    login_fenetre_minutes: int = 15

    # E-mails sortants (SMTP) — si smtp_host est vide, les e-mails sont journalisés (dev)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "La Frangine <contact@lafrangine.com>"

    # URL publique du site (liens dans les e-mails)
    site_url: str = "http://localhost:5173"

    @property
    def est_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()
