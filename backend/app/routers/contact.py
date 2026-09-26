"""Formulaire de contact (legacy : pcontact.php, incl-envoimail.php).
Inventaire : E-TRV-08, F-TRV-35 à F-TRV-42 ; arbitrage ADR-0007 T7.

- Visiteurs et membres écrivent ; un membre voit ses messages sans pouvoir les modifier.
- Seuls les gestionnaires voient tous les messages, y répondent et changent leur état.
- La réponse est **enregistrée puis** envoyée par e-mail (le legacy envoyait l'e-mail même si
  l'enregistrement échouait).
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import Db, Gestionnaire, MembreOpt, MembreReq, Page
from app.enums import Etat
from app.erreurs import erreur, introuvable
from app.models import Contact, Membre, Parametre
from app.schemas import contact as s
from app.schemas.commun import Liste, Ok, Option
from app.services import emails
from app.services import messages as messagerie
from app.services.fiches import paginer, recherche

router = APIRouter(prefix="/contact", tags=["Contact"])

# Limitation de débit (ADR-0005) : messages par expéditeur sur 24 heures
LIMITE_VISITEUR = 5
LIMITE_MEMBRE = 10
DUREE_MINIMALE_MS = 3000


def _verifier_robot(donnees: s.ContactEntree) -> None:
    if donnees.site_web or 0 < donnees.duree_saisie_ms < DUREE_MINIMALE_MS:
        raise erreur("Message refusé. Si vous êtes un humain, patientez quelques secondes et réessayez.")


@router.post("", response_model=Ok, status_code=201)
def envoyer(donnees: s.ContactEntree, db: Db, membre: MembreOpt):
    """Visiteur : nom, e-mail, objet, texte (+ téléphone facultatif). Membre : nom et e-mail repris
    de son profil, non modifiables (F-TRV-36)."""
    _verifier_robot(donnees)
    objet = " ".join(donnees.objet.split())
    texte = donnees.texte.strip()
    champs: dict[str, str] = {}
    if membre is not None:
        nom = membre.nom
        # Un membre sans e-mail peut en indiquer un ; sinon il lira la réponse dans son espace.
        email = (membre.email or "").strip() or donnees.email
        telephone = donnees.telephone or membre.telephone
    else:
        nom = " ".join(donnees.nom.split())
        email = donnees.email
        telephone = donnees.telephone
        if len(nom) < 5:
            champs["nom"] = "Veuillez indiquer vos nom et prénom (5 caractères minimum)."
        if not email:
            champs["email"] = "Veuillez indiquer votre adresse e-mail : c'est à cette adresse que nous répondrons."
    if len(objet) < 5:
        champs["objet"] = "L'objet du message doit contenir au moins 5 caractères."
    if len(texte) < 10:
        champs["texte"] = "Votre message doit contenir au moins 10 caractères."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)

    # Anti-doublon legacy : même objet et même texte (F-TRV-37)
    if db.scalar(select(Contact.id).where(Contact.objet == objet, Contact.texte == texte).limit(1)):
        raise erreur("Ce message est déjà enregistré.")

    depuis = datetime.now() - timedelta(days=1)
    recents = select(func.count()).select_from(Contact).where(Contact.date_envoi >= depuis)
    if membre is not None:
        trop = (db.scalar(recents.where(Contact.membre_id == membre.id)) or 0) >= LIMITE_MEMBRE
    else:
        trop = (db.scalar(recents.where(func.lower(Contact.email) == email.lower())) or 0) >= LIMITE_VISITEUR
    if trop:
        raise erreur(
            "Vous nous avez déjà écrit plusieurs fois aujourd'hui : nous vous répondons au plus vite. "
            "Pour une urgence, écrivez-nous sur WhatsApp."
        )

    contact = Contact(
        membre_id=membre.id if membre else None, nom=nom[:120], email=email[:120], telephone=telephone,
        objet=objet, texte=texte, date_envoi=datetime.now(),
        # Écart assumé : le legacy créait à l'état 2 ; « Non traité » sert de file d'attente.
        etat=Etat.NON_TRAITE,
    )
    db.add(contact)
    db.commit()
    return Ok(message="Votre message est bien envoyé. Votre frangine vous répond au plus vite.", id=contact.id)


@router.get("", response_model=Liste[s.ContactOut])
def lister(
    db: Db,
    membre: MembreReq,
    page: Page,
    q: str | None = None,
    membre_id: int | None = None,
    etat: int | None = None,
):
    """Gestionnaire : tous les messages, filtres membre / texte / état (F-TRV-38).
    Autre connecté (Master compris, ADR-0007 T7) : ses propres messages seulement (F-TRV-39)."""
    req = select(Contact).options(selectinload(Contact.membre))
    if membre.est_gestionnaire:
        if membre_id:
            req = req.where(Contact.membre_id == membre_id)
        req = req.where(Contact.etat == etat) if etat else req.where(Contact.etat != Etat.SUPPRIME)
    else:
        req = req.where(Contact.membre_id == membre.id)
    if (cond := recherche(q, Contact.objet, Contact.texte, Contact.nom, Contact.email)) is not None:
        req = req.where(cond)
    items, total = paginer(db, req.order_by(Contact.date_envoi.desc(), Contact.id.desc()), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


@router.get("/compteurs", response_model=s.CompteursContact)
def compteurs(db: Db, membre: Gestionnaire):
    n = db.scalar(select(func.count()).select_from(Contact).where(Contact.etat == Etat.NON_TRAITE))
    return s.CompteursContact(a_traiter=n or 0)


@router.get("/expediteurs", response_model=list[Option])
def expediteurs(db: Db, membre: Gestionnaire):
    """Membres ayant écrit au moins un message (filtre « Membre » de la liste de gestion)."""
    req = (
        select(Membre.id, Membre.nom, Membre.pseudonyme)
        .where(Membre.id.in_(select(Contact.membre_id).where(Contact.membre_id.is_not(None))))
        .order_by(Membre.nom)
    )
    return [Option(value=i, label=f"{nom} ({pseudo})" if pseudo and pseudo != nom else nom) for i, nom, pseudo in db.execute(req)]


def _obtenir(db: Db, id_: int, membre) -> Contact:
    contact = db.get(Contact, id_)
    if contact is None or not (membre.est_gestionnaire or contact.membre_id == membre.id):
        raise introuvable("Ce message n'existe pas.")
    return contact


@router.get("/{id_}", response_model=s.ContactDetail)
def detail(id_: int, db: Db, membre: MembreReq):
    d = s.ContactDetail.model_validate(_obtenir(db, id_, membre))
    d.peut_repondre = membre.est_gestionnaire
    return d


def _corps_email(contact: Contact, reponse: str, nom_site: str) -> str:
    return (
        f"Bonjour {contact.nom},\n\n"
        f"{reponse}\n\n"
        f"Bien à vous,\nVotre frangine — {nom_site}\n\n"
        "----------------------------------------\n"
        f"Votre message du {contact.date_envoi:%d/%m/%Y à %H:%M} : « {contact.objet} »\n\n"
        f"{contact.texte}\n"
    )


@router.post("/{id_}/reponse", response_model=Ok)
def repondre(id_: int, donnees: s.ReponseEntree, db: Db, membre: Gestionnaire, taches: BackgroundTasks):
    """Réponse d'un gestionnaire : enregistrée, puis envoyée par e-mail (F-TRV-40, F-TRV-42).
    Un membre expéditeur est aussi prévenu dans sa messagerie."""
    contact = _obtenir(db, id_, membre)
    reponse = donnees.reponse.strip()
    if len(reponse) < 2:
        raise erreur("Veuillez saisir la réponse.", reponse="Veuillez saisir la réponse.")
    contact.reponse = reponse
    contact.date_reponse = datetime.now()
    if contact.etat == Etat.NON_TRAITE:
        contact.etat = Etat.AUTORISE  # « Traité »
    expediteur = db.get(Membre, contact.membre_id) if contact.membre_id else None
    if expediteur is not None and not expediteur.est_gestionnaire and expediteur.etat != Etat.SUPPRIME:
        messagerie.notifier(
            db, expediteur.id,
            f"Bonjour ! Nous avons répondu à votre message « {contact.objet} ». "
            "Retrouvez la réponse sur la page Contact, rubrique « Mes messages ».",
            auteur_id=membre.id,
        )
    db.commit()  # l'e-mail ne part qu'une fois la réponse enregistrée

    parametre = db.get(Parametre, 1)
    nom_site = parametre.nom_site if parametre else "La Frangine"
    if contact.email:
        taches.add_task(
            emails.envoyer, contact.email, f"Re : {contact.objet}", _corps_email(contact, reponse, nom_site),
            (parametre.email or None) if parametre else None,
        )
        message = f"Réponse enregistrée et envoyée par e-mail à {contact.email}."
    elif expediteur is not None:
        message = "Réponse enregistrée. Pas d'adresse e-mail : le membre la retrouvera dans son espace."
    else:
        message = "Réponse enregistrée. Aucune adresse e-mail : contactez l'expéditeur par téléphone."
    return Ok(message=message, id=contact.id)


@router.post("/{id_}/etat", response_model=Ok)
def etat(id_: int, donnees: s.EtatContact, db: Db, membre: Gestionnaire):
    """Suivi du message (F-TRV-41) : l'état ne publie rien, il sert à la file d'attente."""
    contact = _obtenir(db, id_, membre)
    contact.etat = donnees.etat
    db.commit()
    return Ok(message="Modification effectuée.", id=contact.id)


routers = [router]
