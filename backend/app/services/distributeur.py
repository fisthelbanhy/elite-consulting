"""Parcours « Devenir distributeur » (legacy incl-adhesion.php, tables souscriptoportuniteaffaire,
membreoportuniteaffaire, produitoportuniteaffaire) et paiement de la souscription (type 6).

Règles conservées (ADR-0004) : 1 souscription par membre, fonds propres ≥ 56 000 FCFA, crédit
entre 56 000 et 66 000 FCFA, prospects enregistrés seulement si le nom dépasse 5 caractères.
Corrections (ADR-0007 S5b, S5c) : le kit peut contenir **tous** les produits actifs ; la
référence est générée ; les prospects sont mis à jour ; le mode « Crédit » crée une souscription
« Non traitée » suivie par les gestionnaires ; la saisie est sauvegardée à chaque étape."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.enums import Etat, ModeSouscription, Prestation, TypeObjetPaye
from app.erreurs import erreur, interdit, introuvable
from app.models import Message, Paiement, Produit, ProduitSouscription, ProspectSouscription, Souscription
from app.models.membres import Membre
from app.services import paiements
from app.services.references import Prefixe, nouvelle_reference

SEUIL_MINIMUM = 56_000
PLAFOND_CREDIT = 66_000
NOMBRE_PROSPECTS = 25
NOMBRE_FILLEULS = 3

# `$arrayetapeadhesion` (orthographe corrigée) : titres des blocs de l'assistant
TITRES = {
    1: "Préalables au développement de votre entreprise : fixez-vous des objectifs",
    2: "Votre propre histoire",
    3: "Combien d'heures par semaine pensez-vous pouvoir consacrer à votre activité ?",
    4: "Votre liste de noms",
    5: "Comment devenir compétent dans le marketing de réseau",
    6: "Contactez vos prospects par téléphone",
    7: "Rendez-vous individuel",
    8: "Nombre d'intéressés",
    9: "Commande des produits",
    10: "Paiement",
}
# L'assistant suit les 10 blocs de `$arrayetapeadhesion` : 1 objectifs, 2 histoire, 3 disponibilité,
# 4 liste de noms, 5 formations, 6 contacts téléphoniques (texte seul), 7 rendez-vous individuels,
# 8 intéressés, 9 commande du kit ; 10 = paiement (souscription envoyée).
DERNIERE_ETAPE = 9
ETAPE_ENVOYEE = 10

# Une souscription « validée » (payée ou acceptée par un gestionnaire) fait du membre un distributeur
ETATS_DISTRIBUTEUR = (Etat.AUTORISE, Etat.CLOTURE)


def souscription_de(db: Session, membre_id: int) -> Souscription | None:
    return db.scalar(
        select(Souscription)
        .options(selectinload(Souscription.prospects), selectinload(Souscription.produits))
        .where(Souscription.membre_id == membre_id)
    )


def est_distributeur(db: Session, membre: Membre | None) -> bool:
    """Distributeur = membre ayant une souscription validée (ADR-0007 S5a)."""
    if membre is None:
        return False
    etat = db.scalar(select(Souscription.etat).where(Souscription.membre_id == membre.id))
    return etat in ETATS_DISTRIBUTEUR


def produits_du_kit(db: Session) -> list[Produit]:
    """Tous les produits actifs ayant un prix distributeur (correctif du legacy limité aux id ≤ 25)."""
    return list(db.scalars(
        select(Produit).where(Produit.etat == Etat.AUTORISE, Produit.prix_distributeur > 0).order_by(Produit.nom)
    ))


def dernier_paiement(db: Session, souscription: Souscription) -> Paiement | None:
    return db.scalar(
        select(Paiement)
        .where(Paiement.type_objet == TypeObjetPaye.SOUSCRIPTION, Paiement.objet_id == souscription.id)
        .order_by(Paiement.date_paiement.desc(), Paiement.id.desc())
        .limit(1)
    )


def _texte(v: str | None) -> str:
    return (v or "").strip()


def _creer(db: Session, membre: Membre) -> Souscription:
    s = Souscription(
        membre_id=membre.id, reference=nouvelle_reference(db, Prefixe.SOUSCRIPTION), etat=Etat.NON_TRAITE,
        etape_courante=1, formations=[], filleuls=[],
    )
    db.add(s)
    db.flush()
    return s


def enregistrer_etape(db: Session, membre: Membre, d) -> tuple[Souscription, str]:
    """Sauvegarde les données d'une étape de l'assistant (schéma `EtapeEntree`) et fait
    progresser `etape_courante`. Retourne la souscription et le message à afficher."""
    if membre.est_gestionnaire:
        raise interdit("L'adhésion distributeur est réservée aux membres.")
    s = souscription_de(db, membre.id) or _creer(db, membre)
    etape = d.etape
    message = "Enregistrement effectué."

    if etape == 1:
        s.objectifs = _texte(d.objectifs)
    elif etape == 2:
        s.mon_histoire = _texte(d.mon_histoire)
    elif etape == 3:
        s.disponibilite_hebdo = d.disponibilite_hebdo
    elif etape == 4:
        # Correctif F-S5-35 : la liste enregistrée remplace l'ancienne (modifications et retraits pris
        # en compte) ; règle legacy F-S5-26 : seuls les noms de plus de 5 caractères sont gardés.
        s.prospects.clear()
        db.flush()
        for p in d.prospects[:NOMBRE_PROSPECTS]:
            if len(_texte(p.nom_prenom)) > 5:
                s.prospects.append(ProspectSouscription(
                    membre_id=membre.id, nom_prenom=_texte(p.nom_prenom), telephone=_texte(p.telephone),
                    email=_texte(p.email), commentaire=_texte(p.commentaire), etat=Etat.AUTORISE,
                ))
        s.date_limite_complement = d.date_limite_complement
    elif etape == 5:
        saisies = {f.prestation: f for f in d.formations}
        s.formations = [
            {
                "prestation": int(p),
                "date": saisies[p].date.isoformat() if p in saisies and saisies[p].date else "",
                "lieu": _texte(saisies[p].lieu) if p in saisies else "",
                "heure": _texte(saisies[p].heure) if p in saisies else "",
            }
            for p in Prestation
        ]
    elif etape == 7:
        s.nombre_rdv = d.nombre_rdv
    elif etape == 8:
        s.filleuls = [
            {
                "nom": _texte(f.nom), "email": _texte(f.email), "adresse": _texte(f.adresse),
                "montant": f.montant, "date_presentation": f.date_presentation.isoformat() if f.date_presentation else "",
            }
            for f in d.filleuls[:NOMBRE_FILLEULS]
        ]
    elif etape == DERNIERE_ETAPE:
        message = _commande(db, s, d)

    # Progression (reprise « là où l'on s'était arrêté ») : l'étape la plus avancée atteinte.
    if etape < DERNIERE_ETAPE and d.avancer:
        s.etape_courante = max(s.etape_courante or 1, etape + 1)
    return s, message


def _commande(db: Session, s: Souscription, d) -> str:
    """Étape 9 : mode de souscription + kit produits. « Sauvegarder » sans contrôle ; « Envoyer »
    avec les 3 contrôles cumulés du legacy (messages exacts, orthographe corrigée)."""
    if s.etat in ETATS_DISTRIBUTEUR:
        raise erreur("Votre souscription est validée : le kit ne peut plus être modifié.")
    quantites: dict[int, int] = {}
    for ligne in d.produits:
        if ligne.quantite > 0:
            quantites[ligne.produit_id] = quantites.get(ligne.produit_id, 0) + ligne.quantite
    produits = {p.id: p for p in produits_du_kit(db)} if quantites else {}
    inconnus = [pid for pid in quantites if pid not in produits]
    if inconnus:
        raise erreur("Un produit choisi n'est plus disponible.", produits="Un produit choisi n'est plus disponible : actualisez la page.")

    # Montant toujours recalculé côté serveur (correctif F-S5-32 : jamais saisi à la main)
    montant = sum(produits[pid].prix_distributeur * q for pid, q in quantites.items())
    mode = d.mode_souscription or 0

    if d.envoyer:
        champs: dict[str, str] = {}
        if mode not in (ModeSouscription.FOND_PROPRE, ModeSouscription.CREDIT):
            champs["mode_souscription"] = "Veuillez indiquer le mode de souscription."
        if montant < SEUIL_MINIMUM:
            champs["produits"] = "Le montant de souscription ne peut être inférieur à 56 000 FCFA."
        elif mode == ModeSouscription.CREDIT and montant > PLAFOND_CREDIT:
            champs["produits"] = "Pour une souscription à crédit le montant ne peut être supérieur à 66 000 FCFA."
        if champs:
            raise erreur("Veuillez corriger les champs signalés.", **champs)

    s.mode_souscription = mode
    s.montant = montant
    s.produits.clear()
    db.flush()
    for pid, q in quantites.items():
        s.produits.append(ProduitSouscription(produit_id=pid, prix_unitaire=produits[pid].prix_distributeur, quantite=q))

    if not d.envoyer:
        # Le kit modifié doit être renvoyé : la souscription redevient un brouillon.
        s.etape_courante = DERNIERE_ETAPE
        return "Opération effectuée."

    deja_envoyee = (s.etape_courante or 0) >= ETAPE_ENVOYEE
    s.etape_courante = ETAPE_ENVOYEE
    if mode == ModeSouscription.CREDIT:
        # ADR-0007 S5c : pas de paiement ; la souscription reste « Non traitée » et apparaît dans le
        # suivi des gestionnaires. La frangine est prévenue par la messagerie.
        if not deja_envoyee:
            db.add(Message(
                membre_id=s.membre_id, auteur_id=s.membre_id, de_la_frangine=False,
                texte=f"[Message automatique] Je souhaite devenir distributeur avec une souscription à crédit "
                      f"(référence {s.reference}, kit de {fcfa(montant)}). Merci de me recontacter.",
            ))
        return "Votre demande de souscription à crédit est transmise à votre frangine : elle vous recontacte très vite."
    return "Souscription enregistrée : il ne reste plus qu'à régler votre kit."


# --- Paiement de la souscription (type 6) ----------------------------------------------------------


def _souscription_payee(db: Session, membre: Membre, objet_id: int | None) -> Souscription:
    s = db.get(Souscription, objet_id) if objet_id else souscription_de(db, membre.id)
    if s is None or s.membre_id != membre.id:
        raise introuvable("Souscription introuvable.")
    return s


def _libelle(db: Session, membre: Membre, objet_id: int | None) -> str:
    s = _souscription_payee(db, membre, objet_id)
    return f"Souscription distributeur {s.reference} — kit de démarrage"


def _montant(db: Session, membre: Membre, objet_id: int | None) -> int:
    s = _souscription_payee(db, membre, objet_id)
    return sum(p.prix_unitaire * p.quantite for p in s.produits)


def _verifier(db: Session, membre: Membre, objet_id: int | None, montant: int) -> None:
    s = _souscription_payee(db, membre, objet_id)
    if s.etat in ETATS_DISTRIBUTEUR:
        raise erreur("Cette souscription est déjà payée.")
    if (s.etape_courante or 0) < ETAPE_ENVOYEE:
        raise erreur("Envoyez d'abord votre souscription à l'étape « Commande des produits ».")
    if s.mode_souscription != ModeSouscription.FOND_PROPRE:
        raise erreur("Une souscription à crédit n'est pas payée en ligne : votre frangine vous recontacte.")
    if montant < SEUIL_MINIMUM:
        raise erreur("Le montant de souscription ne peut être inférieur à 56 000 FCFA.")


def _enregistrer(db: Session, p: Paiement) -> None:
    s = db.get(Souscription, p.objet_id) if p.objet_id else souscription_de(db, p.membre_id)
    if s is None:
        return
    p.objet_id = s.id
    s.etat = Etat.AUTORISE
    db.add(Message(
        membre_id=s.membre_id, de_la_frangine=True,
        texte=f"Bienvenue parmi les distributeurs ! Votre souscription {s.reference} est enregistrée ; "
              "notre caisse confirmera votre paiement. Vous bénéficiez désormais du prix distributeur sur la boutique.",
    ))


def _rejeter(db: Session, p: Paiement) -> None:
    s = db.get(Souscription, p.objet_id) if p.objet_id else None
    if s is not None and s.etat == Etat.AUTORISE:
        s.etat = Etat.NON_TRAITE


paiements.declarer(
    TypeObjetPaye.SOUSCRIPTION,
    paiements.Traitement(
        libelle=_libelle,
        montant=_montant,
        retour=lambda db, m, o: "/devenir-distributeur/adhesion",
        verifier=_verifier,
        enregistrer=_enregistrer,
        rejeter=_rejeter,
    ),
)


def etat_paiement(db: Session, s: Souscription) -> int | None:
    p = dernier_paiement(db, s)
    return p.etat if p else None


def fcfa(montant: int) -> str:
    return f"{montant:,}".replace(",", " ") + " FCFA"
