"""Épargne solidaire (legacy : incl-choix4C1.php, incl-fondsoutien.php, incl-choix4C2.php,
incl-pointcaisse.php). Inventaire : F-S4-45 à F-S4-67 ; ADR-0004 (règle des 97 %, PIN, effet
miroir, anti-doublon), ADR-0007 S4c/S4d, ADR-0009 (module désactivable + avertissements).

Toutes les routes, sauf `/epargne/statut`, sont refusées quand `parametre.module_epargne_actif`
est faux ; le frontend affiche alors une page explicative."""

from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, BackgroundTasks
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.deps import Db, MembreReq, Page, exiger_droit
from app.enums import DonPlacement, Etat, EtatPaiement, OuiNon, TypeCaisse, TypeObjetPaye, VersementRetrait
from app.erreurs import erreur, interdit, introuvable
from app.models import FondDeSoutien, Message, Paiement, PointCaisse, TentativeConnexion
from app.models.membres import Membre
from app.schemas import epargne as s
from app.schemas.commun import Liste, Ok
from app.security import verifier_mot_de_passe
from app.services import emails, fonds
from app.services.fiches import changer_etat, paginer, recherche
from app.services.references import Prefixe, nouvelle_reference
from app.services.validation import normaliser_telephone

router = APIRouter(prefix="/epargne", tags=["Épargne solidaire"])

DON_MINIMUM = 100
DUREE_MIN, DUREE_MAX = 12, 120
RETENTION_POURCENT = 97  # un retrait doit rester strictement sous 97 % du solde (ADR-0004)
RENTABILITE_POURCENT = 3
PIN_ECHECS_MAX = 5
PIN_FENETRE = timedelta(minutes=15)


@router.get("/statut", response_model=s.Statut)
def statut(db: Db):
    """Public : état du module et seuils (le frontend s'en sert pour la page explicative)."""
    actif = fonds.epargne_active(db)
    return s.Statut(
        actif=actif, message="" if actif else fonds.MESSAGE_EPARGNE_DESACTIVEE, don_minimum=DON_MINIMUM,
        placement_minimum=fonds.minimum_placement(db), duree_min=DUREE_MIN, duree_max=DUREE_MAX,
    )


# --- Don / Placement (fond de soutien) --------------------------------------------------------------


@router.get("/fonds", response_model=Liste[s.FondResume])
def lister_fonds(
    db: Db,
    membre: MembreReq,
    page: Page,
    du: date | None = None,
    type_fond: int | None = None,
    montant_min: int | None = None,
    confirme: int | None = None,
    q: str | None = None,
    membre_id: int | None = None,
):
    """Gestionnaire : toutes les fiches ; membre : celles qu'il a créées ou dont il est rapporteur
    ou souscripteur (F-S4-45). Filtres disponibles pour tous (F-S4-46)."""
    fonds.exiger_module_epargne(db)
    req = select(FondDeSoutien)
    if membre.est_gestionnaire:
        if membre_id:
            req = req.where(or_(FondDeSoutien.membre_id == membre_id, FondDeSoutien.souscripteur_id == membre_id,
                                FondDeSoutien.rapporteur_id == membre_id))
    else:
        req = req.where(
            or_(FondDeSoutien.membre_id == membre.id, FondDeSoutien.rapporteur_id == membre.id,
                FondDeSoutien.souscripteur_id == membre.id),
            FondDeSoutien.etat != Etat.SUPPRIME,
        )
    for cond in (
        FondDeSoutien.date_souscription >= du if du else None,
        FondDeSoutien.type_fond == type_fond if type_fond else None,
        FondDeSoutien.montant >= montant_min if montant_min else None,
        FondDeSoutien.confirme == confirme if confirme else None,
        recherche(q, FondDeSoutien.motivation, FondDeSoutien.reference, FondDeSoutien.souscripteur_nom,
                  FondDeSoutien.rapporteur_nom),
    ):
        if cond is not None:
            req = req.where(cond)
    items, total = paginer(db, req.order_by(FondDeSoutien.date_souscription.desc(), FondDeSoutien.id.desc()), page)
    return Liste(items=items, total=total, page=page.page, taille=page.taille)


def _trouver_membre(db: Db, texte: str) -> Membre | None:
    """Souscripteur désigné par son pseudonyme, son identifiant ou son numéro de téléphone."""
    t = texte.strip()
    conds = [func.lower(Membre.pseudonyme) == t.lower(), func.lower(Membre.identifiant) == t.lower()]
    tel = normaliser_telephone(t)
    if len(tel) == 9 and tel.isdigit():
        conds.append(Membre.telephone == tel)
    return db.scalar(select(Membre).where(or_(*conds), Membre.etat != Etat.SUPPRIME).limit(1))


def _regles_montant(db: Db, type_fond: int, montant: int, duree: int, champs: dict[str, str]) -> int:
    """Seuils legacy (incl-fondsoutien.php) ; le minimum de placement est enfin contrôlé
    (ADR-0007 S4c). Retourne la durée retenue (0 pour un don)."""
    if type_fond == DonPlacement.DON:
        if montant < DON_MINIMUM:
            champs["montant"] = "Le montant ne doit pas être inférieur à 100 francs CFA."
        return 0
    minimum = fonds.minimum_placement(db)
    if montant < minimum or montant <= 0:
        champs["montant"] = f"Le montant ne doit pas être inférieur à {fonds.montant_lisible(minimum)} francs CFA."
    if not DUREE_MIN <= duree <= DUREE_MAX:
        champs["duree_mois"] = "La durée du placement doit être comprise entre 12 et 120 mois."
    return duree


def _prevenir_souscripteur(db: Db, taches: BackgroundTasks, f: FondDeSoutien, rapporteur: Membre,
                           souscripteur: Membre) -> None:
    """E-mail « Souscription placement » du legacy, enfin envoyé (F-S4-53), + message interne."""
    quoi = "un placement" if f.type_fond == DonPlacement.PLACEMENT else "un don"
    duree = f" pour une durée de {f.duree_mois} mois" if f.type_fond == DonPlacement.PLACEMENT else ""
    lien = f"{get_settings().site_url}/epargne/dons-placements/{f.id}"
    texte = (
        f"{rapporteur.nom} a souscrit {quoi} sous le numéro {f.reference} en votre nom, d'un montant de "
        f"{fonds.montant_lisible(f.montant)} francs CFA{duree}. Veuillez vous connecter pour le paiement : {lien}"
    )
    db.add(Message(membre_id=souscripteur.id, de_la_frangine=True, texte=texte))
    if souscripteur.email:
        sujet = "Souscription placement" if f.type_fond == DonPlacement.PLACEMENT else "Souscription don"
        corps = (
            f"Bonjour {souscripteur.pseudonyme or souscripteur.nom},\n\n{texte}\n\n"
            "Rappel : La Frangine ne détient pas vos fonds et ne vous demandera jamais votre code PIN.\n\n"
            "Cordialement,\nVotre frangine"
        )
        taches.add_task(emails.envoyer, souscripteur.email, sujet, corps)


@router.post("/fonds", response_model=Ok, status_code=201)
def souscrire(donnees: s.FondEntree, db: Db, membre: MembreReq, taches: BackgroundTasks):
    """Don ou placement (F-S4-47 à F-S4-53). Le membre connecté est le rapporteur ; il souscrit
    pour lui-même, pour un autre membre ou pour une personne non inscrite."""
    fonds.exiger_module_epargne(db)
    champs: dict[str, str] = {}
    if donnees.type_fond not in {t.value for t in DonPlacement}:
        raise erreur("Veuillez indiquer le type de l'épargne : don ou placement.",
                     type_fond="Veuillez indiquer le type de l'épargne : don ou placement.")
    souscripteur: Membre | None = membre
    nom = membre.nom
    if donnees.souscripteur_membre.strip():
        trouve = _trouver_membre(db, donnees.souscripteur_membre)
        if trouve is None:
            champs["souscripteur_membre"] = "Aucun membre ne correspond à ce pseudonyme ou à ce numéro."
        else:
            souscripteur, nom = trouve, trouve.nom
    elif donnees.souscripteur_nom.strip():
        souscripteur, nom = None, donnees.souscripteur_nom.strip()
        if len(nom) < 3:
            champs["souscripteur_nom"] = "Veuillez indiquer le nom du souscripteur."
    duree = _regles_montant(db, donnees.type_fond, donnees.montant, donnees.duree_mois, champs)
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    aujourdhui = date.today()
    motivation = donnees.motivation.strip()
    doublon = db.scalar(select(FondDeSoutien.id).where(
        FondDeSoutien.membre_id == membre.id, FondDeSoutien.date_souscription == aujourdhui,
        FondDeSoutien.motivation == motivation, FondDeSoutien.montant == donnees.montant,
        FondDeSoutien.etat != Etat.SUPPRIME,
    ).limit(1))
    if doublon:
        raise erreur("Cette épargne est déjà enregistrée.")
    f = FondDeSoutien(
        reference=nouvelle_reference(db, Prefixe.FOND_SOUTIEN), membre_id=membre.id, date_souscription=aujourdhui,
        type_fond=donnees.type_fond, rapporteur_id=membre.id, rapporteur_nom=membre.nom,
        souscripteur_id=souscripteur.id if souscripteur else None, souscripteur_nom=nom, motivation=motivation,
        montant=donnees.montant, duree_mois=duree, mode_paiement=0, confirme=OuiNon.NON, etat=Etat.AUTORISE,
    )
    db.add(f)
    db.flush()
    if souscripteur is not None and souscripteur.id != membre.id:
        _prevenir_souscripteur(db, taches, f, membre, souscripteur)
    db.commit()
    return Ok(message="Enregistrement effectué.", id=f.id, reference=f.reference)


def _fond(db: Db, id_: int, membre: Membre) -> FondDeSoutien:
    fonds.exiger_module_epargne(db)
    f = db.get(FondDeSoutien, id_)
    if f is None or (f.etat == Etat.SUPPRIME and not membre.est_gestionnaire):
        raise introuvable("Cette épargne est introuvable.")
    if not fonds.peut_voir_fond(membre, f):
        raise interdit("Cette fiche est réservée au souscripteur, au rapporteur et à la frangine.")
    return f


@router.get("/fonds/{id_}", response_model=s.FondDetail)
def detail_fond(id_: int, db: Db, membre: MembreReq):
    f = _fond(db, id_, membre)
    d = s.FondDetail.model_validate(f)
    dernier = db.scalar(
        select(Paiement).where(Paiement.type_objet == TypeObjetPaye.FOND_SOUTIEN, Paiement.objet_id == f.id,
                               Paiement.etat != EtatPaiement.NON_PAYE)
        .order_by(Paiement.id.desc()).limit(1)
    )
    if dernier is not None:
        d.etat_paiement, d.date_paiement = dernier.etat, dernier.date_paiement
    d.peut_payer = f.etat == Etat.AUTORISE and f.confirme != OuiNon.OUI and f.montant > 0
    d.peut_modifier = d.peut_moderer = membre.peut_moderer()
    return d


@router.put("/fonds/{id_}", response_model=Ok)
def modifier_fond(id_: int, donnees: s.FondModification, db: Db, membre: MembreReq):
    """Gestionnaire habilité : motivation, montant, durée — sans écraser le montant (F-S4-55)."""
    exiger_droit(membre, "activation")
    f = _fond(db, id_, membre)
    champs: dict[str, str] = {}
    duree = _regles_montant(db, f.type_fond, donnees.montant, donnees.duree_mois, champs)
    if donnees.montant != f.montant and f.confirme == OuiNon.OUI:
        champs["montant"] = "Le montant d'une épargne déjà payée ne peut plus être modifié."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    f.motivation = donnees.motivation.strip()
    f.montant = donnees.montant
    f.duree_mois = duree
    db.commit()
    return Ok(message="Modification effectuée.", id=f.id, reference=f.reference)


@router.post("/fonds/{id_}/etat", response_model=Ok)
def etat_fond(id_: int, donnees: s.EtatEntree, db: Db, membre: MembreReq):
    f = _fond(db, id_, membre)
    changer_etat(f, donnees.etat, membre)
    db.commit()
    return Ok(message="Modification effectuée.", id=f.id)


# --- Carte de pointage ----------------------------------------------------------------------------


def _est_agent(membre: Membre) -> bool:
    return bool(membre.point_caisse_actif) and not membre.est_gestionnaire


def _exiger_operateur(membre: Membre) -> None:
    if not (membre.est_gestionnaire or membre.point_caisse_actif):
        raise interdit("La saisie des pointages est réservée aux agents de caisse et à la frangine.")


@router.get("/pointages", response_model=s.ListePointages)
def lister_pointages(
    db: Db,
    membre: MembreReq,
    page: Page,
    du: date | None = None,
    au: date | None = None,
    operateur_id: int | None = None,
    membre_id: int | None = None,
    type_operation: int | None = None,
    montant_min: int | None = None,
    montant_max: int | None = None,
    type_caisse: int | None = None,
):
    """Gestionnaire : toutes les opérations ; agent : celles qu'il a saisies (et celles de sa propre
    carte) ; membre : celles dont il est titulaire (F-S4-56 à F-S4-59)."""
    fonds.exiger_module_epargne(db)
    gestionnaire = membre.est_gestionnaire
    agent = _est_agent(membre)
    req = select(PointCaisse).options(selectinload(PointCaisse.operateur), selectinload(PointCaisse.membre))
    if agent:
        req = req.where(or_(PointCaisse.operateur_id == membre.id, PointCaisse.membre_id == membre.id))
    elif not gestionnaire:
        req = req.where(PointCaisse.membre_id == membre.id)
    for cond in (
        PointCaisse.date_heure >= datetime.combine(du, time.min) if du else None,
        PointCaisse.date_heure <= datetime.combine(au, time.max) if au else None,  # correctif : jour max inclus
        PointCaisse.operateur_id == operateur_id if operateur_id else None,
        PointCaisse.membre_id == membre_id if membre_id else None,
        PointCaisse.type_operation == type_operation if type_operation else None,
        PointCaisse.montant >= montant_min if montant_min else None,
        PointCaisse.montant <= montant_max if montant_max else None,
        PointCaisse.type_caisse == type_caisse if type_caisse and gestionnaire else None,
    ):
        if cond is not None:
            req = req.where(cond)
    sous = req.order_by(None).subquery()
    versements, retraits = db.execute(select(
        func.coalesce(func.sum(case((sous.c.type_operation == VersementRetrait.VERSEMENT, sous.c.montant), else_=0)), 0),
        func.coalesce(func.sum(case((sous.c.type_operation == VersementRetrait.RETRAIT, sous.c.montant), else_=0)), 0),
    )).one()
    items, total = paginer(db, req.order_by(PointCaisse.date_heure.desc(), PointCaisse.id.desc()), page)
    afficher_solde = gestionnaire or membre_id is not None or not agent
    sortie = []
    for p in items:
        o = s.PointageOut.model_validate(p)
        if not (afficher_solde or p.membre_id == membre.id):
            o.solde_apres = None
        sortie.append(o)
    encaisse, libelle = None, ""
    if agent:
        encaisse, libelle = membre.solde_point_caisse, "Votre encaisse"
    elif gestionnaire:
        caisse = db.get(Membre, operateur_id) if operateur_id else None
        if caisse is not None:
            encaisse, libelle = caisse.solde_point_caisse, f"Encaisse de {caisse.nom}"
        else:
            encaisse = int(db.scalar(select(func.coalesce(func.sum(Membre.solde_point_caisse), 0))
                                     .where(Membre.point_caisse_actif.is_(True), Membre.etat != Etat.SUPPRIME)) or 0)
            libelle = "Encaisse totale des agents"
    v, r = int(versements), int(retraits)
    return s.ListePointages(
        items=sortie, total=total, page=page.page, taille=page.taille,
        total_versements=v, total_retraits=r, net=v - r, rentabilite=(v * RENTABILITE_POURCENT + 50) // 100,
        encaisse=encaisse, libelle_encaisse=libelle, afficher_solde=afficher_solde,
        est_operateur=gestionnaire or agent, est_gestionnaire=gestionnaire,
        mon_solde=membre.solde_point_caisse or 0, date_dernier_pointage=membre.date_dernier_pointage,
    )


def _titulaire(db: Db, operateur: Membre, id_: int | None, verrou: bool = False) -> Membre:
    t = db.get(Membre, id_, with_for_update=verrou) if id_ else None
    if t is None or t.etat == Etat.SUPPRIME:
        raise erreur("Veuillez corriger les champs signalés.", membre_id="Ce membre est introuvable.")
    if t.id == operateur.id:
        raise erreur("Vous ne pouvez pas pointer votre propre carte.", membre_id="Choisissez un autre membre.")
    if operateur.est_gestionnaire and not t.point_caisse_actif:
        raise erreur("Un gestionnaire ne peut pointer que la caisse d'un agent (F-S4-61).",
                     membre_id="Choisissez un agent de caisse.")
    return t


@router.get("/pointages/titulaires", response_model=list[s.Titulaire])
def titulaires(db: Db, membre: MembreReq, q: str | None = None):
    """Membres pointables : agents de caisse pour un gestionnaire, tout membre (sauf soi) pour un agent."""
    fonds.exiger_module_epargne(db)
    _exiger_operateur(membre)
    req = select(Membre).where(Membre.etat != Etat.SUPPRIME, Membre.id != membre.id)
    if membre.est_gestionnaire:
        req = req.where(Membre.point_caisse_actif.is_(True))
    if (cond := recherche(q, Membre.nom, Membre.pseudonyme, Membre.telephone)) is not None:
        req = req.where(cond)
    return db.scalars(req.order_by(Membre.nom).limit(500)).all()


@router.get("/pointages/titulaires/{id_}", response_model=s.TitulaireDetail)
def titulaire(id_: int, db: Db, membre: MembreReq):
    """Solde, date de la dernière opération et photo du titulaire choisi (F-S4-60)."""
    fonds.exiger_module_epargne(db)
    _exiger_operateur(membre)
    t = _titulaire(db, membre, id_)
    d = s.TitulaireDetail.model_validate(t)
    d.a_un_code = bool(t.code_pointage_hash)
    return d


def _verifier_pin(db: Db, titulaire: Membre, pin: str) -> None:
    """PIN du titulaire (ADR-0004), avec limitation des essais : 5 échecs en 15 minutes bloquent la
    carte (protection contre la recherche du code par essais successifs)."""
    cle = f"pin:{titulaire.id}"
    echecs = db.scalar(select(func.count()).select_from(TentativeConnexion).where(
        TentativeConnexion.cle == cle, TentativeConnexion.date_heure >= datetime.now() - PIN_FENETRE,
    )) or 0
    if echecs >= PIN_ECHECS_MAX:
        raise erreur("Trop de codes erronés pour cette carte : réessayez dans 15 minutes.",
                     code_pin="Carte momentanément bloquée.")
    if verifier_mot_de_passe(pin.strip(), titulaire.code_pointage_hash):
        return
    db.add(TentativeConnexion(cle=cle))
    if echecs + 1 >= PIN_ECHECS_MAX:
        db.add(Message(membre_id=titulaire.id, de_la_frangine=True, texte=(
            "Plusieurs codes de pointage erronés ont été saisis pour votre carte : elle est bloquée 15 minutes. "
            "Si vous n'êtes pas à l'origine de ces essais, contactez la frangine. Ne communiquez jamais votre code PIN."
        )))
    db.commit()  # l'échec est journalisé même si l'opération est refusée
    raise erreur("Le code de pointage est incorrect.", code_pin="Le code de pointage est incorrect.")


@router.post("/pointages", response_model=Ok, status_code=201)
def pointer(donnees: s.PointageEntree, db: Db, membre: MembreReq):
    """Versement ou retrait sur la carte d'un titulaire (F-S4-60 à F-S4-66)."""
    fonds.exiger_module_epargne(db)
    _exiger_operateur(membre)
    champs: dict[str, str] = {}
    if donnees.type_operation not in {v.value for v in VersementRetrait}:
        champs["type_operation"] = "Veuillez indiquer le type de l'opération."
    if not donnees.membre_id:
        champs["membre_id"] = "Veuillez indiquer le membre."
    if donnees.montant <= 0:
        champs["montant"] = "Veuillez indiquer le montant."
    if not donnees.code_pin.strip():
        champs["code_pin"] = "Veuillez indiquer le code de pointage."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    t = _titulaire(db, membre, donnees.membre_id, verrou=True)
    if not t.code_pointage_hash:
        raise erreur("Ce membre n'a pas encore de code de pointage : il doit le demander à la frangine.",
                     code_pin="Aucun code de pointage attribué à ce membre.")
    _verifier_pin(db, t, donnees.code_pin)

    maintenant = datetime.now()
    doublon = db.scalar(select(PointCaisse.id).where(
        PointCaisse.date_heure >= datetime.combine(maintenant.date(), time.min),
        PointCaisse.date_heure <= datetime.combine(maintenant.date(), time.max),
        PointCaisse.type_operation == donnees.type_operation, PointCaisse.membre_id == t.id,
        PointCaisse.montant == donnees.montant,
    ).limit(1))
    if doublon:
        raise erreur("Ce pointage est déjà enregistré.")
    solde = t.solde_point_caisse or 0
    retrait = donnees.type_operation == VersementRetrait.RETRAIT
    # Règle des 97 % sur le solde lu en base (ADR-0007 S4d) : refus si montant ≥ 97 % du solde
    if retrait and donnees.montant * 100 >= solde * RETENTION_POURCENT:
        raise erreur("Impossible de faire un retrait, Le solde est inférieur au montant demandé.",
                     montant=f"Solde du membre : {fonds.montant_lisible(solde)} FCFA (97 % maximum, montant exclu).")

    mouvement = -donnees.montant if retrait else donnees.montant
    t.solde_point_caisse = solde + mouvement
    t.date_dernier_pointage = maintenant
    # Effet miroir (modèle « agent ») : la caisse de l'opérateur varie du même montant, même signe
    membre.solde_point_caisse = (membre.solde_point_caisse or 0) + mouvement
    p = PointCaisse(
        reference=nouvelle_reference(db, Prefixe.POINT_CAISSE),  # générée après validation (ADR-0007 S4d)
        date_heure=maintenant, operateur_id=membre.id, membre_id=t.id, type_operation=donnees.type_operation,
        montant=donnees.montant, motif=donnees.motif.strip(), solde_apres=t.solde_point_caisse,
        type_caisse=TypeCaisse.ENCAISSE if membre.est_gestionnaire else TypeCaisse.OPERATION,
    )
    db.add(p)
    quoi = "Retrait" if retrait else "Versement"
    db.add(Message(membre_id=t.id, de_la_frangine=True, texte=(
        f"Carte de pointage : {quoi.lower()} de {fonds.montant_lisible(donnees.montant)} FCFA enregistré par "
        f"{membre.nom} (référence {p.reference}). Nouveau solde : {fonds.montant_lisible(t.solde_point_caisse)} FCFA. "
        "Si vous n'êtes pas à l'origine de cette opération, contactez immédiatement la frangine."
    )))
    db.commit()
    return Ok(message="Pointage effectué.", id=p.id, reference=p.reference)


routers = [router]
