"""Téléversement sécurisé des fichiers (ADR-0005) : type vérifié par signature, taille
limitée, images ré-encodées et redimensionnées (métadonnées EXIF supprimées)."""

import io
import secrets
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, ImageOps

from app.config import get_settings
from app.erreurs import erreur

settings = get_settings()

IMAGE = "image"
PDF = "pdf"
AUDIO = "audio"
VIDEO = "video"

_SIGNATURES = {
    AUDIO: [b"ID3", b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"],  # mp3
}


def _detecter(entete: bytes) -> str | None:
    if entete.startswith(b"%PDF"):
        return PDF
    if entete[4:8] == b"ftyp":
        return VIDEO
    if any(entete.startswith(s) for s in _SIGNATURES[AUDIO]):
        return AUDIO
    if (
        entete[:3] == b"\xff\xd8\xff"
        or entete[:8] == b"\x89PNG\r\n\x1a\n"
        or entete[8:12] == b"WEBP"
        or entete[:6] in (b"GIF87a", b"GIF89a")
    ):
        return IMAGE
    return None


async def enregistrer(fichier: UploadFile, dossier: str, types: set[str], champ: str = "fichier") -> str:
    """Enregistre le fichier sous `media/<dossier>/` et retourne son chemin relatif."""
    contenu = await fichier.read()
    if not contenu:
        raise erreur("Le fichier est vide.", **{champ: "Le fichier est vide."})
    if len(contenu) > settings.upload_max_octets:
        mo = settings.upload_max_octets // (1024 * 1024)
        raise erreur(f"Fichier trop volumineux (maximum {mo} Mo).", **{champ: f"Maximum {mo} Mo."})
    genre = _detecter(contenu[:16])
    if genre not in types:
        attendus = ", ".join(sorted(types))
        raise erreur("Type de fichier non accepté.", **{champ: f"Formats acceptés : {attendus}."})

    cible = settings.media_dir / dossier
    cible.mkdir(parents=True, exist_ok=True)
    nom = secrets.token_hex(8)

    if genre == IMAGE:
        try:
            img = Image.open(io.BytesIO(contenu))
            img = ImageOps.exif_transpose(img)
            img.thumbnail((settings.photo_largeur_max, settings.photo_largeur_max))
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            chemin = cible / f"{nom}.jpg"
            img.save(chemin, "JPEG", quality=82, optimize=True, progressive=True)
        except Exception as exc:
            raise erreur("Image illisible.", **{champ: "Image illisible ou corrompue."}) from exc
    else:
        ext = {PDF: "pdf", AUDIO: "mp3", VIDEO: "mp4"}[genre]
        chemin = cible / f"{nom}.{ext}"
        chemin.write_bytes(contenu)

    return f"{dossier}/{chemin.name}"


def supprimer(chemin_relatif: str | None) -> None:
    if not chemin_relatif:
        return
    p = (settings.media_dir / chemin_relatif).resolve()
    if settings.media_dir.resolve() in p.parents and p.exists():
        p.unlink()


def url(chemin_relatif: str | None) -> str | None:
    return f"{settings.media_url}/{chemin_relatif}" if chemin_relatif else None


def genre_fichier(chemin_relatif: str) -> str:
    ext = Path(chemin_relatif).suffix.lower()
    return {".jpg": IMAGE, ".pdf": PDF, ".mp3": AUDIO, ".mp4": VIDEO}.get(ext, IMAGE)
