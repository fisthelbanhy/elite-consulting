"""Règles de diffusion des publicités (legacy : incl-publicite.php, incl-affichpub.php)."""

import html
import re
from datetime import date, datetime

from sqlalchemy import Select, func, select
from sqlalchemy.orm import selectinload

from app.enums import Etat, TypeFichierPub
from app.models import Publicite
from app.services import fichiers

# Type déclaré → genre de fichier accepté au téléversement (services/fichiers)
GENRE_ATTENDU = {TypeFichierPub.IMAGE: fichiers.IMAGE, TypeFichierPub.SON: fichiers.AUDIO, TypeFichierPub.VIDEO: fichiers.VIDEO}
FORMATS = {fichiers.IMAGE: "une image JPG, PNG ou WebP", fichiers.AUDIO: "un son MP3", fichiers.VIDEO: "une vidéo MP4"}
# Genre réel du fichier → libellé court utilisé par le frontend
GENRE_PUBLIC = {fichiers.IMAGE: "image", fichiers.AUDIO: "son", fichiers.VIDEO: "video"}

# Robots d'indexation et aperçus de liens : ils ne comptent pas comme des vues
_ROBOTS = re.compile(r"bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|lighthouse", re.I)


def en_diffusion(pub: Publicite, jour: date | None = None) -> bool:
    """Active (état 2) et dans sa fenêtre de dates."""
    jour = jour or date.today()
    return (
        pub.etat == Etat.AUTORISE
        and pub.date_debut is not None
        and pub.date_fin is not None
        and pub.date_debut <= jour <= pub.date_fin
    )


def requete_diffusion(limite: int, exclure: int | None = None) -> Select:
    """Au plus `limite` publicités actives de la période, en ordre aléatoire (F-TRV-04)."""
    jour = date.today()
    req = (
        select(Publicite)
        .options(selectinload(Publicite.entreprise))
        .where(Publicite.etat == Etat.AUTORISE, Publicite.date_debut <= jour, Publicite.date_fin >= jour)
    )
    if exclure:
        req = req.where(Publicite.id != exclure)
    return req.order_by(func.random()).limit(limite)


def genre_reel(chemin: str | None) -> str | None:
    """Genre du fichier réellement enregistré (correctif F-TRV-47 : la vignette suit le vrai type)."""
    if not chemin:
        return None
    return GENRE_PUBLIC.get(fichiers.genre_fichier(chemin))


def texte_brut(texte: str | None) -> str:
    """Texte affichable : le legacy stockait du HTML saisi à la main (barre d'édition) ; on garde les
    sauts de ligne et on retire balises et entités (le frontend échappe ensuite tout le texte)."""
    t = re.sub(r"<br\s*/?>", "\n", texte or "", flags=re.I)
    t = re.sub(r"</p\s*>", "\n\n", t, flags=re.I)
    t = re.sub(r"<[^>]*>", "", t)
    t = html.unescape(t).replace("\r\n", "\n")
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def est_robot(agent: str | None) -> bool:
    return bool(agent and _ROBOTS.search(agent))


def compter_vue(pub: Publicite) -> None:
    """Chaque affichage de la publicité compte une vue (F-TRV-46)."""
    pub.nombre_vues = (pub.nombre_vues or 0) + 1
    pub.date_derniere_vue = datetime.now()
