"""Authentification, inscription, profil, mot de passe (legacy : incl-connex.php,
incl-membre.php, incl-formulairemembre.php, pmotpasoublie.php)."""

import re
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, Header, Request, UploadFile
from sqlalchemy import delete, func, or_, select

from app.config import get_settings
from app.deps import Db, MembreReq
from app.enums import CategorieMembre, Etat, Sexe, TypeMembre
from app.erreurs import ErreurMetier, erreur
from app.models.core import Parametre, Ville
from app.models.membres import Membre, ReinitialisationMotDePasse, Session, TentativeConnexion, VisiteMembre
from app.schemas import membres as s
from app.schemas.commun import Ok
from app.security import hacher_mot_de_passe, hash_jeton, nouveau_jeton, verifier_mot_de_passe
from app.services import emails, fichiers
from app.services.references import nouveau_code_membre
from app.services.validation import normaliser_telephone

router = APIRouter(prefix="/auth", tags=["Authentification"])
settings = get_settings()


def ip_client(request: Request, x_client_ip: str | None = None) -> str:
    return (x_client_ip or (request.client.host if request.client else "") or "")[:64]


def _ouvrir_session(db: Db, membre: Membre, ip: str, agent: str) -> s.Session:
    jeton, jeton_hash = nouveau_jeton()
    expire = datetime.now() + timedelta(days=settings.session_jours)
    db.add(Session(membre_id=membre.id, jeton_hash=jeton_hash, date_expiration=expire, adresse_ip=ip, agent=agent[:255]))
    db.add(VisiteMembre(membre_id=membre.id, adresse_ip=ip))
    membre.derniere_connexion = datetime.now()
    db.commit()
    return s.Session(jeton=jeton, expire=expire, membre=s.MembreMoi.model_validate(membre))


def _trop_de_tentatives(db: Db, cles: list[str]) -> bool:
    depuis = datetime.now() - timedelta(minutes=settings.login_fenetre_minutes)
    for cle in cles:
        n = db.scalar(
            select(func.count()).select_from(TentativeConnexion).where(
                TentativeConnexion.cle == cle, TentativeConnexion.date_heure >= depuis
            )
        )
        if (n or 0) >= settings.login_max_echecs:
            return True
    return False


@router.post("/login", response_model=s.Session)
def connexion(
    donnees: s.Connexion,
    request: Request,
    db: Db,
    x_client_ip: Annotated[str | None, Header()] = None,
    user_agent: Annotated[str | None, Header()] = None,
):
    ip = ip_client(request, x_client_ip)
    ident = donnees.identifiant.strip()
    cles = [f"id:{ident.lower()}"[:120], f"ip:{ip}"]
    if _trop_de_tentatives(db, cles):
        raise ErreurMetier(
            f"Trop de tentatives. Réessayez dans {settings.login_fenetre_minutes} minutes.", 429
        )

    tel = normaliser_telephone(ident)
    membre = db.scalar(
        select(Membre).where(
            or_(
                func.lower(Membre.identifiant) == ident.lower(),
                func.lower(Membre.email) == ident.lower(),
                (Membre.telephone == tel) if tel.isdigit() and len(tel) == 9 else False,
            )
        )
    )
    # Seul l'état « Supprimé » bloque la connexion (règle legacy)
    if membre is None or membre.etat == Etat.SUPPRIME or not verifier_mot_de_passe(
        donnees.mot_de_passe, membre.mot_de_passe_hash if membre else None
    ):
        for cle in cles:
            db.add(TentativeConnexion(cle=cle))
        db.commit()
        raise erreur("Identifiant ou mot de passe incorrect.", mot_de_passe="Identifiant ou mot de passe incorrect.")

    db.execute(delete(TentativeConnexion).where(TentativeConnexion.cle == cles[0]))
    return _ouvrir_session(db, membre, ip, user_agent or "")


@router.post("/logout", response_model=Ok)
def deconnexion(db: Db, authorization: Annotated[str | None, Header()] = None):
    if authorization and authorization.lower().startswith("bearer "):
        db.execute(delete(Session).where(Session.jeton_hash == hash_jeton(authorization[7:].strip())))
        db.commit()
    return Ok(message="Vous êtes déconnecté.")


@router.get("/me", response_model=s.MembreMoi)
def moi(membre: MembreReq):
    return membre


def _verifier_unicite(db: Db, donnees: s._ChampsProfil, identifiant: str | None, exclure_id: int | None = None):
    def existe(cond) -> bool:
        q = select(Membre.id).where(cond, Membre.etat != Etat.SUPPRIME)
        if exclure_id:
            q = q.where(Membre.id != exclure_id)
        return db.scalar(q.limit(1)) is not None

    champs: dict[str, str] = {}
    if identifiant and existe(func.lower(Membre.identifiant) == identifiant.lower()):
        champs["identifiant"] = "Cet identifiant est déjà utilisé."
    if existe(func.lower(Membre.pseudonyme) == donnees.pseudonyme.strip().lower()):
        champs["pseudonyme"] = "Ce pseudonyme est déjà utilisé."
    if existe(Membre.telephone == donnees.telephone):
        champs["telephone"] = "Un compte existe déjà avec ce numéro. Utilisez « Mot de passe oublié »."
    if donnees.email and existe(func.lower(Membre.email) == donnees.email.lower()):
        champs["email"] = "Un compte existe déjà avec cet e-mail."
    if champs:
        raise erreur("Ce membre semble déjà inscrit.", **champs)


def _generer_pseudonyme(db: Db, nom: str, categorie: int) -> str:
    """Pseudonyme public déduit du nom (inscription minimale, ADR-0008) : « Grace M. »
    pour une personne, sigle pour une entreprise ; unicité assurée par un suffixe."""
    mots = [m for m in re.split(r"[\s\-]+", nom.strip()) if m]
    if categorie == CategorieMembre.MORALE:
        base = "".join(m[0] for m in mots if m[0].isalnum()).upper()
        if len(base) < 3:
            base = re.sub(r"\W", "", nom).upper()[:6]
    else:
        base = mots[-1].capitalize() + (f" {mots[0][0].upper()}." if len(mots) > 1 else "") if mots else "Membre"
        if len(base) < 6:
            base = f"{base} {'x' * (6 - len(base))}".strip()
    candidat, n = base, 1
    while db.scalar(select(Membre.id).where(func.lower(Membre.pseudonyme) == candidat.lower()).limit(1)):
        n += 1
        candidat = f"{base}{n}"
    return candidat


def _appliquer_profil(db: Db, membre: Membre, donnees: s._ChampsProfil, categorie: int) -> None:
    if db.get(Ville, donnees.ville_id) is None:
        raise erreur("Ville inconnue.", ville_id="Veuillez choisir une ville.")
    if not donnees.pseudonyme.strip():
        donnees.pseudonyme = membre.pseudonyme or _generer_pseudonyme(db, donnees.nom, categorie)
    minimum = 6 if categorie == CategorieMembre.PHYSIQUE else 3
    if len(donnees.pseudonyme.strip()) < minimum:
        quoi = "Le pseudonyme" if categorie == CategorieMembre.PHYSIQUE else "Le sigle"
        raise erreur("Pseudonyme trop court.", pseudonyme=f"{quoi} doit contenir au moins {minimum} caractères.")

    membre.nom = donnees.nom.strip()
    membre.pseudonyme = donnees.pseudonyme.strip()
    membre.telephone = donnees.telephone
    membre.email = donnees.email
    membre.ville_id = donnees.ville_id
    membre.adresse = donnees.adresse.strip()
    if categorie == CategorieMembre.PHYSIQUE:
        membre.sexe = donnees.sexe if donnees.sexe in (Sexe.FEMININ, Sexe.MASCULIN) else Sexe.INDEFINI
        membre.situation_matrimoniale = donnees.situation_matrimoniale
        membre.nombre_enfants = donnees.nombre_enfants
        membre.employeur = donnees.employeur.strip()
        membre.numero_piece_identite = donnees.numero_piece_identite.strip()
        membre.type_partenaire = None
        membre.domaine_activite_id = None
    else:
        # Personne morale : sexe « Indéfini », pas d'enfants (règle legacy)
        membre.sexe = Sexe.INDEFINI
        membre.situation_matrimoniale = None
        membre.nombre_enfants = 0
        membre.forme_juridique = donnees.forme_juridique
        membre.type_partenaire = donnees.type_partenaire
        membre.domaine_activite_id = donnees.domaine_activite_id
        membre.numero_piece_identite = donnees.numero_piece_identite.strip()


@router.post("/inscription", response_model=s.Session, status_code=201)
def inscription(
    donnees: s.Inscription,
    request: Request,
    db: Db,
    x_client_ip: Annotated[str | None, Header()] = None,
    user_agent: Annotated[str | None, Header()] = None,
):
    # Anti-robot : champ piège rempli ou formulaire soumis en moins de 3 secondes
    if donnees.site_web or 0 < donnees.duree_saisie_ms < 3000:
        raise erreur("Inscription refusée. Si vous êtes un humain, réessayez calmement.")

    identifiant = donnees.identifiant.strip() or donnees.telephone
    if not donnees.pseudonyme.strip():
        donnees.pseudonyme = _generer_pseudonyme(db, donnees.nom, donnees.categorie)
    _verifier_unicite(db, donnees, identifiant)
    membre = Membre(
        categorie=donnees.categorie,
        type_compte=TypeMembre.MEMBRE,  # jamais gestionnaire à l'inscription publique
        identifiant=identifiant,
        mot_de_passe_hash=hacher_mot_de_passe(donnees.mot_de_passe),
        etat=Etat.NON_TRAITE,  # n'empêche pas la connexion (règle legacy)
    )
    _appliquer_profil(db, membre, donnees, donnees.categorie)
    membre.code_membre = nouveau_code_membre(db)
    db.add(membre)
    db.flush()
    return _ouvrir_session(db, membre, ip_client(request, x_client_ip), user_agent or "")


@router.put("/profil", response_model=s.MembreMoi)
def maj_profil(donnees: s.MiseAJourProfil, membre: MembreReq, db: Db):
    _verifier_unicite(db, donnees, None, exclure_id=membre.id)
    _appliquer_profil(db, membre, donnees, membre.categorie)
    db.commit()
    return membre


@router.post("/profil/photo", response_model=s.MembreMoi)
async def maj_photo(membre: MembreReq, db: Db, photo: UploadFile = File(...)):
    ancien = membre.photo
    membre.photo = await fichiers.enregistrer(photo, "membres", {fichiers.IMAGE}, champ="photo")
    db.commit()
    fichiers.supprimer(ancien)
    return membre


@router.post("/mot-de-passe", response_model=Ok)
def changer_mot_de_passe(donnees: s.ChangementMotDePasse, membre: MembreReq, db: Db):
    if not verifier_mot_de_passe(donnees.actuel, membre.mot_de_passe_hash):
        raise erreur("Mot de passe actuel incorrect.", actuel="Mot de passe actuel incorrect.")
    if donnees.nouveau.lower() == membre.identifiant.lower():
        raise erreur("Mot de passe refusé.", nouveau="Le mot de passe doit être différent de l'identifiant.")
    membre.mot_de_passe_hash = hacher_mot_de_passe(donnees.nouveau)
    db.commit()
    return Ok(message="Votre mot de passe a été modifié.")


@router.post("/mot-de-passe-oublie", response_model=Ok)
def mot_de_passe_oublie(donnees: s.MotDePasseOublie, db: Db, taches: BackgroundTasks):
    """Vérification croisée legacy (catégorie + nom + pseudo + téléphone). Le mot de passe
    n'est JAMAIS affiché : lien par e-mail, ou demande transmise aux gestionnaires (ADR-0005)."""
    tel = normaliser_telephone(donnees.telephone)
    membre = db.scalar(
        select(Membre).where(
            Membre.categorie == donnees.categorie,
            func.lower(Membre.nom) == donnees.nom.strip().lower(),
            func.lower(Membre.pseudonyme) == donnees.pseudonyme.strip().lower(),
            Membre.telephone == tel,
            Membre.etat != Etat.SUPPRIME,
        )
    )
    reponse = Ok(
        message="Si ces informations correspondent à un compte, vous allez être recontacté : "
        "par e-mail si une adresse est enregistrée, sinon par la frangine au numéro indiqué."
    )
    if membre is None:
        return reponse

    if membre.email:
        jeton, jeton_hash = nouveau_jeton()
        db.add(
            ReinitialisationMotDePasse(
                membre_id=membre.id,
                jeton_hash=jeton_hash,
                canal="email",
                date_expiration=datetime.now() + timedelta(minutes=settings.reset_minutes),
            )
        )
        db.commit()
        lien = f"{settings.site_url}/reinitialiser/{jeton}"
        nom_site = (db.get(Parametre, 1) or Parametre(nom_site="La Frangine")).nom_site
        taches.add_task(
            emails.envoyer,
            membre.email,
            f"{nom_site} — réinitialisation de votre mot de passe",
            f"Bonjour {membre.pseudonyme},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien "
            f"(valable {settings.reset_minutes} minutes) :\n{lien}\n\n"
            "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\nLa frangine",
        )
    else:
        db.add(ReinitialisationMotDePasse(membre_id=membre.id, canal="gestionnaire"))
        db.commit()
    return reponse


@router.post("/reinitialiser", response_model=Ok)
def reinitialiser(donnees: s.Reinitialisation, db: Db):
    demande = db.scalar(
        select(ReinitialisationMotDePasse).where(ReinitialisationMotDePasse.jeton_hash == hash_jeton(donnees.jeton))
    )
    if (
        demande is None
        or demande.date_utilisation is not None
        or (demande.date_expiration and demande.date_expiration < datetime.now())
    ):
        raise erreur("Ce lien n'est plus valide. Refaites une demande.")
    membre = demande.membre
    if donnees.nouveau.lower() == membre.identifiant.lower():
        raise erreur("Mot de passe refusé.", nouveau="Le mot de passe doit être différent de l'identifiant.")
    membre.mot_de_passe_hash = hacher_mot_de_passe(donnees.nouveau)
    demande.date_utilisation = datetime.now()
    db.execute(delete(Session).where(Session.membre_id == membre.id))  # déconnecte partout
    db.commit()
    return Ok(message="Mot de passe modifié. Vous pouvez vous connecter.")
