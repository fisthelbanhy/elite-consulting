import hashlib
import hmac
import secrets

from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.config import get_settings

# Paramètres Argon2 par défaut (lents par conception) ; allégés uniquement pour les tests automatisés
_hasher = PasswordHash(
    (Argon2Hasher(time_cost=1, memory_cost=8, parallelism=1) if get_settings().environnement == "test" else Argon2Hasher(),)
)


def hacher_mot_de_passe(mot_de_passe: str) -> str:
    return _hasher.hash(mot_de_passe)


def verifier_mot_de_passe(mot_de_passe: str, hash_: str | None) -> bool:
    if not hash_:
        # Coût constant pour ne pas révéler l'existence d'un compte
        _hasher.hash(mot_de_passe)
        return False
    try:
        return _hasher.verify(mot_de_passe, hash_)
    except Exception:
        return False


def nouveau_jeton() -> tuple[str, str]:
    """Retourne (jeton en clair, SHA-256 du jeton). Seul le hash est stocké."""
    jeton = secrets.token_urlsafe(32)
    return jeton, hash_jeton(jeton)


def hash_jeton(jeton: str) -> str:
    return hashlib.sha256(jeton.encode()).hexdigest()


def comparer(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())
