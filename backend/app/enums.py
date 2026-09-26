"""Énumérations métier.

Chaque classe reprend un tableau `$arrayXXX` de `incl-variable.php` avec **les mêmes valeurs
numériques** que le legacy (les données reprises en dépendent). Les libellés sont corrigés
(accents, fautes de frappe) mais gardent leur sens.
"""

from enum import IntEnum


class Choix(IntEnum):
    """IntEnum portant un libellé : `Etat.AUTORISE.label == "Autorisé"`."""

    def __new__(cls, value: int, label: str):
        obj = int.__new__(cls, value)
        obj._value_ = value
        obj.label = label
        return obj

    @classmethod
    def options(cls) -> list[dict]:
        return [{"value": m.value, "label": m.label} for m in cls]

    @classmethod
    def libelle(cls, value: int | None) -> str:
        try:
            return cls(value).label  # type: ignore[arg-type]
        except (ValueError, TypeError):
            return ""


# --- Membres ---------------------------------------------------------------------------------


class TypeMembre(Choix):  # $arraytypembr
    GESTIONNAIRE = 1, "Gestionnaire"
    MASTER = 2, "Master"
    MEMBRE = 3, "Membre"


class CategorieMembre(Choix):  # $arraycategoriembr
    PHYSIQUE = 1, "Personne physique"
    MORALE = 2, "Personne morale"


class Sexe(Choix):  # $arraysexe
    FEMININ = 1, "Féminin"
    MASCULIN = 2, "Masculin"
    INDEFINI = 3, "Indéfini"


class EtatCivil(Choix):  # $arrayetatcivil
    CELIBATAIRE = 1, "Célibataire"
    CONCUBINAGE = 2, "Concubinage"
    MARIE = 3, "Marié(e)"
    VEUF = 4, "Veuf / Veuve"
    DIVORCE = 5, "Divorcé(e)"
    AUTRE = 6, "Autre"


class BanqueBoutique(Choix):  # $arraybanqboutq
    BANQUE = 1, "Banque"
    BOUTIQUE = 2, "Boutique"


class OuiNon(Choix):  # $arrayouinon
    OUI = 1, "Oui"
    NON = 2, "Non"


# --- États ------------------------------------------------------------------------------------


class Etat(Choix):  # $arrayetat
    NON_TRAITE = 1, "Non traité"
    AUTORISE = 2, "Autorisé"
    SUPPRIME = 3, "Supprimé"
    CLOTURE = 4, "Clôturé"


class EtatPaiement(Choix):  # $arrayetatpayement
    NON_PAYE = 1, "Non payé"
    NON_CONFIRME = 2, "Paiement non confirmé"
    CONFIRME = 3, "Paiement confirmé"


class ModePaiement(Choix):  # $arraymodepaye
    CASH = 1, "Cash"
    CHARDEN_FARELL = 2, "Charden Farell"
    MOBILE_MONEY = 3, "Mobile Money"


class TypeObjetPaye(Choix):  # $arraytypepnr (4 = Course : index vide dans le legacy mais utilisé)
    PRODUIT = 1, "Produit"
    ARTICLE = 2, "Article"
    COURSE = 4, "Course"
    LIKELEMBA = 5, "Likelemba"
    SOUSCRIPTION = 6, "Souscription distributeur"
    FOND_SOUTIEN = 7, "Fond de soutien"
    APPORT_FOND = 8, "Apport de fonds"


# --- Contenus ---------------------------------------------------------------------------------


class Confidentialite(Choix):  # $arrayconfidence (aussi type de marché : privé/public)
    PRIVE = 1, "Privé"
    PUBLIC = 2, "Public"


class Module(Choix):  # $arraychoix1 (suggestions)
    ACCUEIL = 0, "Accueil"
    SAVIEZ_VOUS = 1, "Le saviez-vous ?"
    RESSOURCES_HUMAINES = 2, "Ressources humaines"
    E_COMMERCE = 3, "E-commerce"
    APPELS_DE_FONDS = 4, "Appels de fonds"
    OPPORTUNITE = 5, "Opportunité d'affaire"
    ENTREPRISES = 6, "Entreprises - Marchés"
    OFFRES_FINANCIERES = 7, "Offres financières"
    TOUS = 8, "Tous les modules"


class TypeFichierPub(Choix):  # $arrayfichpub
    IMAGE = 1, "Image"
    SON = 2, "Son"
    VIDEO = 3, "Vidéo"


class OrigineIdee(Choix):  # $arrayorigineidee
    PERSONNEL = 1, "Personnelle"
    TIERCE = 2, "Par un tiers"
    RESEAUX_SOCIAUX = 3, "Réseaux sociaux"


# --- Ressources humaines ------------------------------------------------------------------------


class TypeAnnonceRH(Choix):  # $arraydmdeoffreemploi
    DEMANDE = 1, "Demande d'emploi"
    OFFRE = 2, "Offre d'emploi"


class TypeInteret(Choix):  # $arraybesoininteressement
    BESOIN = 1, "Présentation de besoin"
    INTERESSEMENT = 2, "Intéressement"


# --- E-commerce -------------------------------------------------------------------------------


class TypeTransaction(Choix):  # $arraybesoin
    INDIFFERENT = 0, "Indifférent"
    LOCATION = 1, "Location"
    VENTE = 2, "Vente"


class TypeBien(Choix):  # $arraytypebien
    INDIFFERENT = 0, "Indifférent"
    MAISON = 1, "Maison"
    APPARTEMENT = 2, "Appartement"
    TERRAIN = 3, "Terrain"
    COMMERCE = 4, "Commerce"
    IMMEUBLE = 5, "Immeuble"
    BUREAUX = 6, "Bureaux"
    GARAGE = 7, "Garage - Parking - Atelier"
    DEPOT = 8, "Dépôt"
    AUTRE = 9, "Autre bien"


class SituationBien(Choix):  # $arraysituatimb
    DISPONIBLE = 1, "Disponible"
    OCCUPE = 2, "Occupé"


class OffreDemande(Choix):  # $arrayoffredemande (« Recherche » dans les onglets e-commerce)
    OFFRE = 1, "Offre"
    DEMANDE = 2, "Demande"


class NeufOccasion(Choix):  # $arrayneufocas
    NEUF = 1, "Neuf"
    OCCASION = 2, "Occasion"


class EtatCourse(Choix):  # $arrayetatcourse
    EN_ATTENTE = 1, "En attente"
    SUPPRIMEE = 2, "Supprimée"
    EFFECTUEE = 3, "Effectuée"
    LIVREE = 4, "Livrée"


class UniteMesure(Choix):  # $arrayunitemesure (déclaré mais inutilisé dans le legacy)
    UNITE = 1, "Unité"
    DIZAINE = 2, "Dizaine"
    DOUZAINE = 3, "Douzaine"
    KILOGRAMME = 4, "Kilogramme"
    M3 = 5, "m³"


# --- Appels de fonds / épargne -----------------------------------------------------------------


class TypeApportFond(Choix):  # $arraytypeaportfond
    DON = 1, "Don"
    CREDIT = 2, "Crédit"
    ACTIONNARIAT = 3, "Actionnariat"


class Periodicite(Choix):  # $arrayperiode
    SEMAINE = 1, "Hebdomadaire"
    QUINZAINE = 2, "Quinzaine"
    MENSUEL = 3, "Mensuelle"


class DonPlacement(Choix):  # $arraydonplacement
    DON = 1, "Don"
    PLACEMENT = 2, "Placement"


class VersementRetrait(Choix):  # $arrayversementretrait
    VERSEMENT = 1, "Versement"
    RETRAIT = 2, "Retrait"


class TypeCaisse(Choix):  # pointcaisse.typecaissepcs / $arraytoperatencaisse
    OPERATION = 1, "Opération"
    ENCAISSE = 2, "Encaisse"


# --- Opportunité d'affaire -----------------------------------------------------------------------


class GroupeProduit(Choix):  # $arraygroupeproduit (catégories Forever Living Products)
    BUVABLES = 1, "Buvables Forever"
    COMPLEMENTS = 2, "Compléments alimentaires"
    RUCHE = 3, "Produits de la ruche"
    PROGRAMMES = 4, "Programmes Forever"
    LIGNE = 5, "Produits pour la ligne"
    SPORTIFS = 6, "Produits pour les sportifs"
    SOINS_CORPS = 7, "Soins du corps Forever"
    SOINS_VISAGE = 8, "Soins du visage Forever"
    ANTI_AGE = 9, "Soins anti-âge Forever"
    FLEUR_JOUVENCE = 10, "Fleur de jouvence"
    SONYA_SKIN = 11, "Sonya Skin Care"
    FLAWLESS = 12, "Flawless by Sonya"
    PREMIERS_SOINS = 13, "Premiers soins Forever"
    HYGIENE = 14, "Produits d'hygiène Forever"
    CHEVEUX = 15, "Soins des cheveux Forever"
    ENFANTS = 16, "Soins pour enfants"
    FEMMES = 17, "Soins pour femmes"
    HOMMES = 18, "Soins pour hommes"
    ANIMAUX = 19, "Soins pour animaux"
    CHEVAUX = 20, "Soins pour chevaux"


class ModeSouscription(Choix):  # $arraysouscription
    FOND_PROPRE = 1, "Fonds propres"
    CREDIT = 2, "Crédit"


class DisponibiliteHebdo(Choix):  # souscriptoportuniteaffaire.zone04soa
    H5_10 = 1, "5 à 10 heures par semaine"
    H10_20 = 2, "10 à 20 heures par semaine"
    H20_PLUS = 3, "Plus de 20 heures par semaine"


class Prestation(Choix):  # $arrayprestation (formations du parcours distributeur)
    POA = 1, "POA"
    JOURNEE_SUCCES = 2, "Journée de succès"
    FORMATION_ANIMATEUR = 3, "Formation animateur"
    FORMATION_MANAGER = 4, "Formation manager"


# --- Entreprises --------------------------------------------------------------------------------


class FormeJuridique(Choix):  # $arrayformjuridique
    SA = 1, "SA"
    SARL = 2, "SARL"
    SARLU = 3, "SARLU"
    SAU = 4, "SAU"
    ETS = 5, "Ets"
    EI = 6, "Entreprise individuelle"
    SCI = 7, "SCI"
    ASSOCIATION = 8, "Association"
    FONDATION = 9, "Fondation"


# --- Offres financières -------------------------------------------------------------------------


class RubriqueConseilFinance(Choix):  # $arraymenuchoix71
    CONSEIL = 1, "Conseil financier"
    RUMEURS = 2, "Rumeurs économiques"
    ACCOMPAGNEMENT = 3, "Accompagnement"


class TypeAccompagnement(Choix):  # $arrayaccompagnement
    BUSINESS_PLAN = 1, "Business plan"
    PROJET_AGRICOLE = 2, "Projet agricole"
    RESTRUCTURATION_CREDIT = 3, "Restructuration de crédit"
    CREDIT_IMMOBILIER = 4, "Crédit immobilier"


class RubriqueTresorerie(Choix):  # $arraymenuchoix72 / $arrayoperation (= type de dialogue)
    PLACEMENT = 1, "Placement"
    OPERATION = 2, "Opération bancaire"
    CREDIT = 3, "Demande de crédit"
    CONTENTIEUX = 4, "Contentieux"


class TypePlacement(Choix):  # $arrayplacement
    DEPOT_A_TERME = 1, "Dépôt à terme"
    INVESTISSEMENT = 2, "Investissement"


class Devise(Choix):  # $arraydevise
    FCFA = 1, "FCFA"
    EURO = 2, "€"
    DOLLAR = 3, "$"
    RMB = 4, "RMB"


class LocalInternational(Choix):  # $arraylocalinternat
    LOCAL = 1, "Local"
    INTERNATIONAL = 2, "International"


class TypeOperationBanque(Choix):  # $arrayoperationbanque
    RAPATRIEMENT = 1, "Rapatriement"
    VIREMENT_RECU = 2, "Virement reçu"
    VERSEMENT = 3, "Versement"
    TRANSFERT = 4, "Transfert"
    VIREMENT_EMIS = 5, "Virement émis"
    RETRAIT = 6, "Retrait"


ENUMS: dict[str, type[Choix]] = {
    cls.__name__: cls
    for cls in [
        TypeMembre, CategorieMembre, Sexe, EtatCivil, BanqueBoutique, OuiNon, Etat, EtatPaiement,
        ModePaiement, TypeObjetPaye, Confidentialite, Module, TypeFichierPub, OrigineIdee,
        TypeAnnonceRH, TypeInteret, TypeTransaction, TypeBien, SituationBien, OffreDemande,
        NeufOccasion, EtatCourse, UniteMesure, TypeApportFond, Periodicite, DonPlacement,
        VersementRetrait, TypeCaisse, GroupeProduit, ModeSouscription, DisponibiliteHebdo, Prestation,
        FormeJuridique, RubriqueConseilFinance, TypeAccompagnement, RubriqueTresorerie, TypePlacement,
        Devise, LocalInternational, TypeOperationBanque,
    ]
}

# Niveaux de diplôme proposés en saisie rapide ($arraydiplome)
NIVEAUX_DIPLOME = ["Sans diplôme", "CEP", "BMG", "BMT", "BAC", "BET", "Licence", "Master 1", "Master 2", "Master 3"]
