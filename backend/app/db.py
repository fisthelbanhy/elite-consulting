from collections.abc import Iterator
from datetime import datetime

from sqlalchemy import DateTime, MetaData, create_engine, event, func
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.config import get_settings

settings = get_settings()

if settings.est_sqlite:
    db_path = settings.database_url.removeprefix("sqlite:///")
    from pathlib import Path

    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.est_sqlite else {},
    pool_pre_ping=True,
)

if settings.est_sqlite:

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

# Conventions de nommage des contraintes : indispensable pour des migrations Alembic stables
NAMING = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)


class Horodatage:
    """Date de création renseignée automatiquement."""

    date_creation: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), default=datetime.now)


class Consultable:
    """Compteur de consultations (motif `nbvisiteX`/`datevisiteX` répété dans tout le legacy)."""

    nombre_visites: Mapped[int] = mapped_column(default=0)
    date_derniere_visite: Mapped[datetime | None] = mapped_column(DateTime)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
