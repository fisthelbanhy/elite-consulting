"""Gestion des membres (legacy `pmembre.php` + `incl-formulairemembre.php` en contexte
gestionnaire) et des demandes de réinitialisation de mot de passe (ADR-0005 §3).
Inventaire : F-ADM-05 à F-ADM-15, F-ADM-40, F-TRV-23.

Droits (ADR-0007 T1/T4) :
- consulter : tout gestionnaire ;
- créer, modifier, valider, supprimer une fiche, générer un code de pointage ou un lien de
  réinitialisation : droit Activation ;
- attribuer ou retirer des droits, promouvoir ou rétrograder un gestionnaire, agir sur le
  compte d'un autre gestionnaire : droit Attribution.
"""

import csv
import io
import re
from datetime import datetime

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.deps import Db, Gestionnaire, exiger_droit, gestionnaire_requis
from app.enums import (
    BanqueBoutique,
    CategorieMembre,
    Etat,
    EtatCivil,
    EtatPaiement,
    FormeJuridique,
    Sexe,
    TypeMembre,
)
from app.erreurs import erreur, interdit, introuvable
from app.models import (
    Banque,
    DomaineActivite,
    Membre,
    Message,
    Paiement,
    Parametre,
    ReinitialisationMotDePasse,
    Ville,
    VisiteMembre,
)
from app.schemas import gestion as s
from app.schemas.commun import Liste, Ok
from app.security import hacher_mot_de_passe
from app.services import fichiers
from app.services import gestion as svc
from app.services.fiches import paginer, recherche
from app.services.gestion import PaginationGestion
from app.services.references import nouveau_code_membre
from app.services.validation import normaliser_telephone

router = APIRouter(prefix="/gestion", tags=["Gestion — membres"], dependencies=[Depends(gestionnaire_requis)])
settings = get_settings()

IDENTIFIANT_VALIDE = r"^[A-Za-z0-9_.\-@]{4,50}$"


# --- Liste, export ----------------------------------------------------------------------------------


def _requete_membres(moi: Membre, type_compte: int | None, categorie: int | None, ville_id: int | None,
                     etat: int | None, q: str | None, tri: str):
    req = select(Membre).options(selectinload(Membre.ville))
    if moi.id != svc.ID_COMPTE_SYSTEME:
        req = req.where(Membre.id != svc.ID_COMPTE_SYSTEME)  # F-ADM-08
    for cond in (
        Membre.type_compte == type_compte if type_compte else None,
        Membre.categorie == categorie if categorie else None,
        Membre.ville_id == ville_id if ville_id else None,
        Membre.etat == etat if etat else Membre.etat != Etat.SUPPRIME,
    ):
        if cond is not None:
            req = req.where(cond)
    texte = recherche(q, Membre.nom, Membre.pseudonyme, Membre.observation, Membre.identifiant, Membre.email,
                      Membre.code_membre, Membre.telephone)
    if texte is not None:
        tel = normaliser_telephone(q)
        req = req.where(or_(texte, Membre.telephone.contains(tel)) if tel.isdigit() and len(tel) >= 3 else texte)
    if tri == "recents":
        return req.order_by(Membre.date_creation.desc(), Membre.id.desc())
    return req.order_by(func.lower(Membre.nom), Membre.type_compte)


@router.get("/membres", response_model=s.ListeMembres)
def lister(
    db: Db, moi: Gestionnaire, page: PaginationGestion = Depends(),
    type_compte: int | None = None, categorie: int | None = None, ville_id: int | None = None,
    etat: int | None = None, q: str | None = None, tri: str = "nom",
):
    """F-ADM-05 à F-ADM-08 : filtres type, personnalité, ville, état, texte (nom, pseudonyme,
    téléphone, observation…) ; tri par nom ou plus récents ; compte système masqué."""
    items, total = paginer(db, _requete_membres(moi, type_compte, categorie, ville_id, etat, q, tri), page)
    return s.ListeMembres(items=items, total=total, page=page.page, taille=page.taille)


@router.get("/membres/options", response_model=list[s.OptionMembre])
def options(db: Db, moi: Gestionnaire):
    """Liste compacte pour les filtres (journal des connexions, paiements)."""
    req = select(Membre.id, Membre.nom, Membre.pseudonyme).where(Membre.etat != Etat.SUPPRIME)
    if moi.id != svc.ID_COMPTE_SYSTEME:
        req = req.where(Membre.id != svc.ID_COMPTE_SYSTEME)
    return [s.OptionMembre(value=i, label=f"{nom} ({pseudo})" if pseudo and pseudo != nom else nom)
            for i, nom, pseudo in db.execute(req.order_by(func.lower(Membre.nom))).all()]


def _cellule(v) -> str:
    """Neutralise l'injection de formules dans un tableur (=, +, -, @ en tête de cellule)."""
    t = "" if v is None else str(v)
    return "'" + t if t[:1] in ("=", "+", "-", "@") else t


@router.get("/membres/export", response_class=Response)
def exporter(
    db: Db, moi: Gestionnaire,
    type_compte: int | None = None, categorie: int | None = None, ville_id: int | None = None,
    etat: int | None = None, q: str | None = None, tri: str = "nom",
):
    """Export CSV de la liste filtrée (F-ADM-40 : l'impression legacy était cassée)."""
    membres = db.scalars(_requete_membres(moi, type_compte, categorie, ville_id, etat, q, tri)).all()
    tampon = io.StringIO()
    w = csv.writer(tampon, delimiter=";")
    w.writerow(["Code", "Type", "Personnalité", "Nom", "Pseudonyme / sigle", "Téléphone", "E-mail", "Ville",
                "Adresse", "État", "Inscrit le", "Dernière connexion"])
    for m in membres:
        w.writerow([_cellule(x) for x in (
            m.code_membre, TypeMembre.libelle(m.type_compte), CategorieMembre.libelle(m.categorie), m.nom,
            m.pseudonyme, m.telephone, m.email or "", m.ville.nom if m.ville else "", m.adresse,
            Etat.libelle(m.etat), m.date_creation.strftime("%d/%m/%Y") if m.date_creation else "",
            m.derniere_connexion.strftime("%d/%m/%Y %H:%M") if m.derniere_connexion else "",
        )])
    nom = f"membres-{datetime.now():%Y%m%d-%H%M}.csv"
    return Response(
        content=tampon.getvalue().encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nom}"', "Cache-Control": "no-store"},
    )


# --- Fiche ------------------------------------------------------------------------------------------


def _peut_modifier(moi: Membre, cible: Membre) -> bool:
    if not moi.droit_activation:
        return False
    return not (cible.est_gestionnaire and cible.id != moi.id and not moi.droit_attribution)


@router.get("/membres/{id_}", response_model=s.MembreDetail)
def detail(id_: int, db: Db, moi: Gestionnaire):
    m = svc.charger_membre(db, id_, moi)
    d = s.MembreDetail.model_validate(m)
    d.domaine_libelle = m.domaine_activite.libelle if m.domaine_activite else None
    d.a_code_pointage = bool(m.code_pointage_hash)
    d.en_ligne = svc.est_en_ligne(m)
    d.nombre_connexions = db.scalar(select(func.count()).select_from(VisiteMembre).where(VisiteMembre.membre_id == m.id)) or 0
    d.nombre_paiements = db.scalar(select(func.count()).select_from(Paiement).where(Paiement.membre_id == m.id)) or 0
    d.paiements_en_attente = db.scalar(select(func.count()).select_from(Paiement).where(
        Paiement.membre_id == m.id, Paiement.etat == EtatPaiement.NON_CONFIRME)) or 0
    d.demandes_reinitialisation = [s.DemandeResume.model_validate(r) for r in db.scalars(
        select(ReinitialisationMotDePasse).where(*svc.demandes_en_attente(m.id))
        .order_by(ReinitialisationMotDePasse.date_creation.desc())).all()]
    d.est_moi = m.id == moi.id
    d.peut_modifier = _peut_modifier(moi, m)
    d.peut_attribuer = moi.droit_attribution
    return d


def _valider(db: Db, d: s.MembreEntree, exclure_id: int | None = None) -> None:
    """Règles de `incl-formulairemembre.php` (messages repris, orthographe corrigée)."""
    physique = d.categorie == CategorieMembre.PHYSIQUE
    champs: dict[str, str] = {}
    if len(d.nom.strip()) < 3:
        champs["nom"] = ("Le nom et prénom doivent avoir 3 caractères minimum." if physique
                         else "Le nom de la personne morale doit avoir 3 caractères minimum.")
    pseudo = d.pseudonyme.strip()
    if physique and len(pseudo) < 6:
        champs["pseudonyme"] = "Le pseudonyme doit avoir 6 caractères minimum."
    elif not physique and len(pseudo) < 3:
        champs["pseudonyme"] = "Le sigle de la société doit avoir 3 caractères minimum."
    if not re.fullmatch(IDENTIFIANT_VALIDE, d.identifiant.strip()):
        champs["identifiant"] = "L'identifiant doit contenir de 4 à 50 caractères (lettres, chiffres, . _ - @)."
    if not d.ville_id or db.get(Ville, d.ville_id) is None:
        champs["ville_id"] = "Veuillez indiquer la ville du membre."
    if physique:
        if d.situation_matrimoniale is not None and d.situation_matrimoniale not in {e.value for e in EtatCivil}:
            champs["situation_matrimoniale"] = "Situation matrimoniale inconnue."
    else:
        if d.forme_juridique is not None and d.forme_juridique not in {e.value for e in FormeJuridique}:
            champs["forme_juridique"] = "Forme juridique inconnue."
        if d.type_partenaire is not None and d.type_partenaire not in {e.value for e in BanqueBoutique}:
            champs["type_partenaire"] = "Valeur inconnue."
        if d.domaine_activite_id and db.get(DomaineActivite, d.domaine_activite_id) is None:
            champs["domaine_activite_id"] = "Domaine d'activité inconnu."
    if d.mot_de_passe:
        if len(d.mot_de_passe) < 8:
            champs["mot_de_passe"] = "Le mot de passe doit contenir au moins 8 caractères."
        elif d.mot_de_passe.lower() == d.identifiant.strip().lower():
            champs["mot_de_passe"] = "Le mot de passe doit être différent de l'identifiant."
    if champs:
        raise erreur("Veuillez corriger les champs signalés.", **champs)
    svc.verifier_unicite(db, identifiant=d.identifiant.strip(), pseudonyme=pseudo, telephone=d.telephone,
                         email=d.email, exclure_id=exclure_id)


def _appliquer(db: Db, m: Membre, d: s.MembreEntree) -> None:
    m.type_compte = d.type_compte
    m.categorie = d.categorie
    m.nom = d.nom.strip()
    m.pseudonyme = d.pseudonyme.strip()
    m.identifiant = d.identifiant.strip()
    m.telephone = d.telephone
    m.email = d.email
    m.ville_id = d.ville_id
    m.adresse = d.adresse.strip()
    m.observation = d.observation.strip()
    m.point_caisse_actif = d.point_caisse_actif
    m.date_limite_master = d.date_limite_master
    m.numero_piece_identite = d.numero_piece_identite.strip()
    if d.categorie == CategorieMembre.PHYSIQUE:
        m.sexe = d.sexe if d.sexe in (Sexe.FEMININ, Sexe.MASCULIN) else Sexe.INDEFINI
        m.situation_matrimoniale = d.situation_matrimoniale
        m.nombre_enfants = d.nombre_enfants
        m.employeur = d.employeur.strip()
        m.forme_juridique = None
        m.type_partenaire = None
        m.domaine_activite_id = None
    else:
        # Personne morale : sexe « Indéfini », pas d'enfants (règle legacy) ; forme juridique
        # dans sa propre colonne (ADR-0007 T5)
        m.sexe = Sexe.INDEFINI
        m.situation_matrimoniale = None
        m.nombre_enfants = 0
        m.employeur = ""
        m.forme_juridique = d.forme_juridique
        m.type_partenaire = d.type_partenaire
        m.domaine_activite_id = d.domaine_activite_id


def _banque_du_membre(db: Db, m: Membre) -> None:
    """F-TRV-23 : une personne morale « Banque » alimente le référentiel des banques (sans écraser
    la banque n° 1 comme le legacy, F-TRV-29)."""
    if m.categorie != CategorieMembre.MORALE or m.type_partenaire != BanqueBoutique.BANQUE:
        return
    if db.scalar(select(Banque.id).where(Banque.membre_id == m.id).limit(1)) is None:
        db.add(Banque(membre_id=m.id, nom=m.nom, sigle=m.pseudonyme.upper()[:30], telephones=m.telephone,
                      email=m.email or "", adresse=m.adresse, etat=Etat.AUTORISE))


def _nom_site(db: Db) -> str:
    p = db.get(Parametre, 1)
    return p.nom_site if p and p.nom_site else "La Frangine"


def _lien(db: Db, m: Membre, jeton: str, expire: datetime, activation: bool = False) -> s.LienReinitialisation:
    chemin = f"/reinitialiser/{jeton}"
    lien = f"{settings.site_url}{chemin}"
    site = _nom_site(db)
    if activation:
        texte = (f"Bienvenue sur {site}, {m.pseudonyme} ! Votre identifiant : {m.identifiant}. "
                 f"Choisissez votre mot de passe avec ce lien (valable 24 h, une seule fois) : {lien}")
        message = "Compte créé. Transmettez le lien d'activation au membre : il ne sera plus affiché."
    else:
        texte = (f"Bonjour {m.pseudonyme}, voici votre lien pour choisir un nouveau mot de passe sur {site} "
                 f"(valable 24 h, une seule fois) : {lien}")
        message = "Lien de réinitialisation créé. Transmettez-le au membre : il ne sera plus affiché."
    return s.LienReinitialisation(
        message=message, id=m.id, chemin=chemin, lien=lien, expire=expire,
        membre=s.MembreCourt.model_validate(m), telephone=m.telephone, message_whatsapp=texte,
    )


@router.post("/membres", response_model=s.MembreCree, status_code=201)
def creer(d: s.MembreEntree, db: Db, moi: Gestionnaire):
    """F-ADM-09 : création d'un membre ou d'un gestionnaire (type, point caisse, état)."""
    exiger_droit(moi, "activation")
    if d.type_compte == TypeMembre.GESTIONNAIRE:
        exiger_droit(moi, "attribution")
    _valider(db, d)
    m = Membre(etat=d.etat)
    _appliquer(db, m, d)
    m.mot_de_passe_hash = hacher_mot_de_passe(d.mot_de_passe) if d.mot_de_passe else "!"
    m.code_membre = nouveau_code_membre(db)
    db.add(m)
    db.flush()
    _banque_du_membre(db, m)
    activation = None
    if not d.mot_de_passe:
        jeton, expire = svc.creer_lien_reinitialisation(db, m, moi)
        activation = _lien(db, m, jeton, expire, activation=True)
    db.commit()
    return s.MembreCree(message="Enregistrement effectué.", id=m.id, reference=m.code_membre, activation=activation)


def _changer_etat(db: Db, moi: Membre, m: Membre, etat: int) -> None:
    if etat == m.etat:
        return
    svc.interdire_sur_soi(moi, m, "changer l'état de")
    svc.exiger_attribution_si_gestionnaire(moi, m)
    ancien, m.etat = m.etat, etat
    if etat == Etat.SUPPRIME:
        svc.fermer_sessions(db, m.id)  # un compte supprimé ne peut plus se connecter
    elif ancien == Etat.NON_TRAITE and etat == Etat.AUTORISE:
        db.add(Message(membre_id=m.id, de_la_frangine=True, auteur_id=moi.id, texte=(
            f"Bonne nouvelle {m.pseudonyme} : votre compte est validé par la frangine. Complétez votre profil "
            "dans « Mon espace » pour profiter de tous les services, et écrivez-nous si vous avez une question.")))


@router.put("/membres/{id_}", response_model=Ok)
def modifier(id_: int, d: s.MembreEntree, db: Db, moi: Gestionnaire):
    """F-ADM-10 : modification complète, nom et personnalité compris. Les droits ne sont jamais
    touchés par cet écran (correctif F-ADM-12)."""
    exiger_droit(moi, "activation")
    m = svc.charger_membre(db, id_, moi)
    svc.exiger_attribution_si_gestionnaire(moi, m)
    if (d.type_compte == TypeMembre.GESTIONNAIRE) != m.est_gestionnaire:
        svc.interdire_sur_soi(moi, m, "changer le type de")
        exiger_droit(moi, "attribution")
    if d.type_compte != m.type_compte:
        svc.interdire_sur_soi(moi, m, "changer le type de")
    _valider(db, d, exclure_id=m.id)
    _appliquer(db, m, d)
    _changer_etat(db, moi, m, d.etat)
    if not m.est_gestionnaire:
        # Un compte qui n'est plus gestionnaire perd ses droits d'administration
        m.droit_attribution = m.droit_caisse = m.droit_activation = False
    _banque_du_membre(db, m)
    db.commit()
    return Ok(message="Modification effectuée.", id=m.id, reference=m.code_membre)


@router.post("/membres/{id_}/etat", response_model=Ok)
def etat(id_: int, d: s.EtatEntree, db: Db, moi: Gestionnaire):
    """F-ADM-15 : validation d'un nouveau membre (Non traité → Autorisé), ou suppression logique."""
    exiger_droit(moi, "activation")
    m = svc.charger_membre(db, id_, moi)
    _changer_etat(db, moi, m, d.etat)
    db.commit()
    msg = {Etat.AUTORISE: "Membre validé.", Etat.SUPPRIME: "Membre supprimé."}.get(d.etat, "Modification effectuée.")
    return Ok(message=msg, id=m.id)


@router.delete("/membres/{id_}", response_model=Ok)
def supprimer(id_: int, db: Db, moi: Gestionnaire):
    """Suppression logique (état 3) : le compte ne peut plus se connecter, ses données sont gardées."""
    exiger_droit(moi, "activation")
    m = svc.charger_membre(db, id_, moi)
    _changer_etat(db, moi, m, Etat.SUPPRIME)
    db.commit()
    return Ok(message="Membre supprimé.", id=m.id)


@router.put("/membres/{id_}/droits", response_model=Ok)
def droits(id_: int, d: s.DroitsEntree, db: Db, moi: Gestionnaire):
    """F-ADM-11/12 : seuls les gestionnaires ayant le droit d'attribution modifient les droits."""
    exiger_droit(moi, "attribution")
    m = svc.charger_membre(db, id_, moi)
    if not m.est_gestionnaire:
        raise erreur("Les droits ne concernent que les gestionnaires : changez d'abord le type de compte.")
    if m.id == moi.id and not d.droit_attribution:
        raise interdit("Vous ne pouvez pas retirer votre propre droit d'attribution.")
    m.droit_attribution, m.droit_caisse, m.droit_activation = d.droit_attribution, d.droit_caisse, d.droit_activation
    db.commit()
    return Ok(message="Droits modifiés.", id=m.id)


@router.post("/membres/{id_}/code-pointage", response_model=s.CodePointage)
def code_pointage(id_: int, db: Db, moi: Gestionnaire):
    """F-ADM-13 : nouveau code de pointage à 4 chiffres, affiché une seule fois, stocké haché
    (ADR-0005 §7)."""
    exiger_droit(moi, "activation")
    m = svc.charger_membre(db, id_, moi)
    if m.etat == Etat.SUPPRIME:
        raise erreur("Ce compte est supprimé.")
    code = svc.attribuer_code_pointage(m)
    db.commit()
    return s.CodePointage(message="Nouveau code de pointage généré. Communiquez-le au membre : il ne sera plus affiché.",
                          id=m.id, code=code)


def _reinitialiser(db: Db, moi: Membre, m: Membre) -> s.LienReinitialisation:
    exiger_droit(moi, "activation")
    if m.id == moi.id:
        raise interdit("Pour changer votre propre mot de passe, utilisez « Mon profil ».")
    svc.exiger_attribution_si_gestionnaire(moi, m)
    if m.etat == Etat.SUPPRIME:
        raise erreur("Ce compte est supprimé : réactivez-le avant de réinitialiser son mot de passe.")
    jeton, expire = svc.creer_lien_reinitialisation(db, m, moi)
    lien = _lien(db, m, jeton, expire)
    db.commit()
    return lien


@router.post("/membres/{id_}/reinitialisation", response_model=s.LienReinitialisation)
def reinitialisation(id_: int, db: Db, moi: Gestionnaire):
    """F-ADM-14 : le gestionnaire ne voit jamais le mot de passe ; il transmet un lien à usage
    unique au membre (WhatsApp, téléphone)."""
    return _reinitialiser(db, moi, svc.charger_membre(db, id_, moi))


@router.post("/membres/{id_}/photo", response_model=Ok)
async def photo(id_: int, db: Db, moi: Gestionnaire, fichier: UploadFile = File(...)):
    exiger_droit(moi, "activation")
    m = svc.charger_membre(db, id_, moi)
    svc.exiger_attribution_si_gestionnaire(moi, m)
    ancien = m.photo
    m.photo = await fichiers.enregistrer(fichier, "membres", {fichiers.IMAGE}, champ="photo")
    db.commit()
    fichiers.supprimer(ancien)
    return Ok(message="Photo enregistrée.", id=m.id)


# --- Demandes de réinitialisation ------------------------------------------------------------------


def _statut(r: ReinitialisationMotDePasse, maintenant: datetime) -> str:
    if r.jeton_hash is None:
        if r.traitee_par_id is None:
            return "en_attente"
        return "ignoree" if r.date_utilisation else "prise_en_charge"
    if r.date_utilisation:
        return "utilise"
    if r.date_expiration and r.date_expiration < maintenant:
        return "expire"
    return "lien_actif"


@router.get("/reinitialisations", response_model=Liste[s.ReinitialisationLigne])
def reinitialisations(db: Db, moi: Gestionnaire, page: PaginationGestion = Depends(), statut: str = "attente"):
    """Demandes issues de « Mot de passe oublié » pour les membres sans e-mail (à rappeler avant
    de leur transmettre un lien), et historique des liens."""
    req = select(ReinitialisationMotDePasse).options(selectinload(ReinitialisationMotDePasse.membre))
    if statut == "attente":
        req = req.where(*svc.demandes_en_attente())
    if moi.id != svc.ID_COMPTE_SYSTEME:
        req = req.where(ReinitialisationMotDePasse.membre_id != svc.ID_COMPTE_SYSTEME)
    items, total = paginer(db, req.order_by(ReinitialisationMotDePasse.date_creation.desc(),
                                            ReinitialisationMotDePasse.id.desc()), page)
    noms = svc.pseudonymes(db, {r.traitee_par_id for r in items if r.traitee_par_id})
    maintenant = datetime.now()
    lignes = []
    for r in items:
        ligne = s.ReinitialisationLigne.model_validate(r)
        ligne.traitee_par = noms.get(r.traitee_par_id) if r.traitee_par_id else None
        ligne.statut = _statut(r, maintenant)
        lignes.append(ligne)
    return Liste(items=lignes, total=total, page=page.page, taille=page.taille)


def _demande(db: Db, id_: int, moi: Membre) -> ReinitialisationMotDePasse:
    r = db.get(ReinitialisationMotDePasse, id_)
    if r is None or (r.membre_id == svc.ID_COMPTE_SYSTEME and moi.id != svc.ID_COMPTE_SYSTEME):
        raise introuvable("Demande introuvable.")
    return r


@router.post("/reinitialisations/{id_}/traiter", response_model=s.LienReinitialisation)
def traiter(id_: int, db: Db, moi: Gestionnaire):
    """Après avoir rappelé le membre, la frangine génère son lien de réinitialisation."""
    r = _demande(db, id_, moi)
    return _reinitialiser(db, moi, r.membre)


@router.post("/reinitialisations/{id_}/ignorer", response_model=Ok)
def ignorer(id_: int, db: Db, moi: Gestionnaire):
    """Demande suspecte ou déjà réglée : retirée de la file sans créer de lien."""
    exiger_droit(moi, "activation")
    r = _demande(db, id_, moi)
    if r.jeton_hash is not None or r.traitee_par_id is not None:
        raise erreur("Cette demande est déjà traitée.")
    r.traitee_par_id = moi.id
    r.date_utilisation = datetime.now()
    db.commit()
    return Ok(message="Demande classée sans suite.", id=r.id)


routers = [router]
