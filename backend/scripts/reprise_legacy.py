"""Reprise des données de production legacy (dump MySQL) dans la nouvelle base.

Usage (depuis backend/) :
    .venv/Scripts/python scripts/reprise_legacy.py ../cp1019011_lafrangine.sql [--images ../lafrangine/V04/image/ig]

Ré-exécutable : toutes les tables sont vidées puis rechargées. Les clés primaires legacy sont
conservées (ADR-0003). Les mots de passe et codes PIN sont hachés (ADR-0005). Un rapport de
reprise liste les lignes écartées et les corrections appliquées.
"""

import argparse
import html
import shutil
import sys
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import insert, text  # noqa: E402
from sqldump import lire_dump  # noqa: E402

import app.models as m  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.enums import Etat, TypeMembre  # noqa: E402
from app.security import hacher_mot_de_passe  # noqa: E402
from app.services.validation import normaliser_telephone  # noqa: E402

settings = get_settings()
DATE_INCONNUE = datetime(2016, 1, 1)  # date de lancement du site, pour les lignes legacy sans date
rapport: dict[str, list[str]] = defaultdict(list)
compte: Counter = Counter()


# --- Conversions ----------------------------------------------------------------------------------


def d(v) -> date | None:
    """Date legacy ('YYYY-MM-DD', 'YYYYMMDD', '0000-00-00') → date."""
    if not v or not isinstance(v, str) or v.startswith("0000") or v.strip("0") == "":
        return None
    try:
        if "-" in v:
            return date.fromisoformat(v[:10])
        return datetime.strptime(v[:8], "%Y%m%d").date()
    except ValueError:
        return None


def dt(v) -> datetime | None:
    """Datetime legacy ('YYYY-MM-DD HH:MM:SS' ou 'YmdHis') → datetime."""
    if not v or not isinstance(v, str) or v.startswith("0000") or v.strip("0") == "":
        return None
    try:
        if "-" in v:
            return datetime.fromisoformat(v[:19])
        v = v.ljust(14, "0")
        return datetime.strptime(v[:14], "%Y%m%d%H%M%S")
    except ValueError:
        return None


def txt(v) -> str:
    """Texte legacy nettoyé : le PHP stockait les saisies passées par htmlspecialchars() (parfois
    deux fois : « &amp;amp; ») et addslashes() (« \\' »). On restitue le texte brut ; l'échappement
    se fait désormais à l'affichage (Svelte)."""
    if v is None:
        return ""
    s = str(v)
    for _ in range(3):
        brut = html.unescape(s)
        if brut == s:
            break
        s = brut
    return s.replace("\\'", "'").replace('\\"', '"').strip()


def n(v) -> int:
    try:
        return int(float(v or 0))
    except (TypeError, ValueError):
        return 0


def opt(v) -> int | None:
    """0 legacy → NULL."""
    v = n(v)
    return v or None


class Ids:
    """Identifiants effectivement chargés par table, pour valider les clés étrangères."""

    def __init__(self):
        self.par_table: dict[str, set[int]] = defaultdict(set)

    def fk(self, table: str, v, contexte: str = "") -> int | None:
        v = opt(v)
        if v is None:
            return None
        if v in self.par_table[table]:
            return v
        if contexte:
            rapport["références orphelines mises à NULL"].append(f"{contexte} → {table}#{v}")
        return None


ids = Ids()


def charger(db, modele, lignes: list[dict], nom: str | None = None) -> None:
    if lignes:
        db.execute(insert(modele), lignes)
    table = modele.__tablename__
    ids.par_table[table].update(r["id"] for r in lignes if "id" in r)
    compte[nom or table] += len(lignes)


def copier_media(images: Path | None, nom_source: str, dossier: str) -> str | None:
    if images is None:
        return None
    for candidat in (images / nom_source, images / nom_source.upper(), images / nom_source.lower()):
        if candidat.exists():
            cible = settings.media_dir / dossier
            cible.mkdir(parents=True, exist_ok=True)
            nom = f"legacy-{candidat.name.lower()}"
            shutil.copy2(candidat, cible / nom)
            compte["fichiers copiés"] += 1
            return f"{dossier}/{nom}"
    return None


# --- Reprise ----------------------------------------------------------------------------------------


def reprendre(dump: Path, images: Path | None) -> None:
    src = lire_dump(dump)
    T = lambda nom: src.get(nom, [])  # noqa: E731

    # Rechargement complet : le schéma est recréé à l'identique des modèles
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    db = SessionLocal()

    # Paramètres ------------------------------------------------------------------------------
    for p in T("parametre")[:1]:
        charger(db, m.Parametre, [{
            "id": 1, "nom_site": "La Frangine", "adresse": txt(p["adressepmt"]),
            "telephone_1": txt(p["phone1pmt"]), "telephone_2": txt(p["phone2pmt"]), "email": txt(p["mailpmt"]),
            "whatsapp": txt(p["phone1pmt"]), "texte_aide": txt(p["aidepmt"]),
            "montant_minimum_placement": n(p["fondplacementpmt"]), "montant_minimum_course": n(p["montantcoursepmt"]),
            "commission_course": n(p["commissioncoursepmt"]), "conditions_course": txt(p["conditioncoursepmt"]),
            **{f"description_section_{i}": txt(p[f"choix{i}pmt"]) for i in range(1, 8)},
            "compteur_membre": n(p["nummembrepmt"]), "compteur_reference": n(p["numreferencepmt"]),
        }])
    if not T("parametre"):
        charger(db, m.Parametre, [{"id": 1}])

    # Référentiels ----------------------------------------------------------------------------
    charger(db, m.Ville, [{"id": r["indexvil"], "nom": txt(r["nomvil"])} for r in T("ville")])
    charger(db, m.Quartier, [
        {"id": r["indexqtr"], "ville_id": r["indexvil"], "nom": txt(r["nomqtr"])}
        for r in T("quartier") if r["indexvil"] in ids.par_table["ville"]
    ])
    charger(db, m.SecteurActivite, [
        {"id": r["indexsat"], "libelle": txt(r["libelesat"]), "etat": n(r["etatsat"]) or Etat.AUTORISE} for r in T("secteuractivite")
    ])
    charger(db, m.DomaineActivite, [
        {"id": r["indexdat"], "libelle": txt(r["libeledat"]), "etat": n(r["etatdat"]) or Etat.AUTORISE,
         "secteur_id": ids.fk("secteur_activite", r["indexsat"], f"domaine#{r['indexdat']}")}
        for r in T("domaineactivite")
    ])
    charger(db, m.Diplome, [{"id": r["indexdpm"], "code": txt(r["codedpm"]), "libelle": txt(r["libeledpm"])} for r in T("diplome")])
    charger(db, m.FamilleArticle, [{"id": r["indexfam"], "libelle": txt(r["libelefam"])} for r in T("familart")])

    # Membres -------------------------------------------------------------------------------------
    premieres_visites: dict[int, datetime] = {}
    for r in T("visitembr"):
        v = dt(r["datevst"]) or dt(r["datenumvst"])
        if v and (r["indexmbr"] not in premieres_visites or v < premieres_visites[r["indexmbr"]]):
            premieres_visites[r["indexmbr"]] = v

    membres, identifiants = [], set()
    for r in T("membre"):
        ident = txt(r["identifmbr"]) or f"membre{r['indexmbr']}"
        if ident.lower() in identifiants:
            rapport["identifiants dupliqués renommés"].append(f"membre#{r['indexmbr']} {ident} → {ident}{r['indexmbr']}")
            ident = f"{ident}{r['indexmbr']}"
        identifiants.add(ident.lower())
        droits = (txt(r["droitmbr"]) + "0000")[:4]
        mdp = txt(r["motpasmbr"])
        code_pin = n(r["codepointagembr"])
        membres.append({
            "id": r["indexmbr"], "type_compte": n(r["typembr"]) or TypeMembre.MEMBRE,
            "categorie": n(r["categoriembr"]) or 1, "code_membre": txt(r["codembr"]),
            "nom": txt(r["nomprenmbr"]) or ident, "pseudonyme": txt(r["pseudombr"]) or ident,
            "sexe": n(r["sexembr"]) or 3, "telephone": normaliser_telephone(txt(r["phonembr"])),
            "email": txt(r["mailmbr"]) or None, "ville_id": ids.fk("ville", r["indexvil"]),
            "adresse": txt(r["adressembr"]), "identifiant": ident,
            # Mot de passe legacy en clair → haché (le membre garde le même mot de passe)
            "mot_de_passe_hash": hacher_mot_de_passe(mdp) if mdp else "!",
            "observation": txt(r["observmbr"]), "etat": n(r["etatmbr"]) or Etat.NON_TRAITE,
            "droit_attribution": droits[0] == "1", "droit_caisse": droits[1] == "1",
            "droit_activation": droits[2] == "1",
            "numero_piece_identite": txt(r["cnimbr"]), "employeur": txt(r["employeurmbr"]),
            # Personne morale : le legacy rangeait la forme juridique dans situatmatrimmbr
            "situation_matrimoniale": opt(r["situatmatrimmbr"]) if n(r["categoriembr"]) != 2 else None,
            "forme_juridique": opt(r["situatmatrimmbr"]) if n(r["categoriembr"]) == 2 else None,
            "nombre_enfants": n(r["nbenfantmbr"]),
            "type_partenaire": opt(r["banqboutqmbr"]), "domaine_activite_id": ids.fk("domaine_activite", r["indexdat"]),
            "date_limite_master": d(r["datemastermbr"]),
            "point_caisse_actif": n(r["pointcaissembr"]) == 1, "solde_point_caisse": n(r["soldepointcaissembr"]),
            "date_dernier_pointage": dt(r["datepointcaissembr"]),
            "code_pointage_hash": hacher_mot_de_passe(f"{code_pin:04d}") if code_pin else None,
            "photo": copier_media(images, f"mbr{r['indexmbr']}.jpg", "membres"),
            "date_creation": premieres_visites.get(r["indexmbr"]) or datetime(2016, 1, 1),
        })
        if not mdp:
            rapport["membres sans mot de passe (connexion impossible, réinitialisation requise)"].append(f"membre#{r['indexmbr']}")
    charger(db, m.Membre, membres)
    M = lambda v, ctx="": ids.fk("membre", v, ctx)  # noqa: E731

    charger(db, m.Banque, [{
        "id": r["indexbqe"], "membre_id": M(r["indexmbr"]), "sigle": txt(r["siglebqe"]), "nom": txt(r["nombqe"]),
        "telephones": txt(r["phonebqe"]), "adresse": txt(r["adressebqe"]), "email": txt(r["mailbqe"]),
        "site_web": txt(r["sitebqe"]), "nom_contact": txt(r["nomcontactbqe"]),
        "telephone_contact": txt(r["phonecontactbqe"]), "observation": txt(r["observatbqe"]),
        "etat": n(r["etatbqe"]) or Etat.AUTORISE,
    } for r in T("banque")])

    charger(db, m.Visite, [{
        "id": r["indexvst"], "membre_id": M(r["indexmbr"]), "adresse_ip": txt(r["adresipvst"]),
        "date_heure": dt(r["datevst"]) or dt(r["datenumvst"]) or datetime(2016, 1, 1),
    } for r in T("visite")])
    charger(db, m.VisiteMembre, [{
        "id": r["indexvst"], "membre_id": r["indexmbr"], "adresse_ip": txt(r["adresipvst"]),
        "date_connexion": dt(r["datevst"]) or dt(r["datenumvst"]) or datetime(2016, 1, 1),
    } for r in T("visitembr") if M(r["indexmbr"], f"visitembr#{r['indexvst']}")])

    # Catalogue produits & santé ----------------------------------------------------------------
    def groupe_produit(r) -> int:
        """Le legacy rangeait les compléments alimentaires sous les codes 100 et 0, hors des 20
        catégories FLP (la catégorie 2 « Compléments alimentaires » était vide) : on les reclasse."""
        g = n(r["groupepdt"])
        if 1 <= g <= 20:
            return g
        nom = txt(r["nompdt"]).lower()
        if any(mot in nom for mot in ("bee", "royal jelly", "propolis", "miel", "honey")):
            nouveau = 3  # Produits de la ruche
        elif any(mot in nom for mot in ("tea", "tisane", "drink", "gel")):
            nouveau = 1  # Buvables
        else:
            nouveau = 2  # Compléments alimentaires
        rapport["produits reclassés (catégorie legacy hors liste)"].append(f"produit#{r['indexpdt']} {g} → {nouveau}")
        return nouveau

    charger(db, m.Produit, [{
        "id": r["indexpdt"], "reference": txt(r["referencepdt"]), "nom": txt(r["nompdt"]),
        "description": txt(r["descriptionpdt"]), "groupe": groupe_produit(r),
        "prix_distributeur": n(r["prixdistpdt"]), "prix_non_distributeur": n(r["prixcompdt"]),
        "prix_public": n(r["prixpubpdt"]), "quantite_stock": n(r["quantitepdt"]),
        "photo": copier_media(images, f"pdt{r['indexpdt']}.jpg", "produits"),
        "etat": n(r["etatpdt"]) or Etat.AUTORISE, "nombre_visites": n(r["nbvisitepdt"]),
        "date_derniere_visite": dt(r["datevisitpdt"]),
    } for r in T("produit")])
    charger(db, m.Maladie, [{
        "id": r["indexmld"], "libelle": txt(r["libelemld"]), "description": txt(r["descriptionmld"]),
        "etat": n(r["etatmld"]) or Etat.AUTORISE,
    } for r in T("maladie")])
    liens = []
    for r in T("maladie"):
        for i in range(1, 6):
            pid = ids.fk("produit", r[f"index{i}pdt"], f"maladie#{r['indexmld']}")
            if pid:
                liens.append({"maladie_id": r["indexmld"], "produit_id": pid, "ordre": i,
                              "posologie": txt(r[f"posologie{i}pdtmld"])})
    # Le legacy écrit maladie.index*pdt (administration) mais la page publique lit
    # produit.index*mld + produit.posologie* : on fusionne les deux sources (inventaire 01, §5.3).
    deja = {(li["maladie_id"], li["produit_id"]) for li in liens}
    ordre = Counter(li["maladie_id"] for li in liens)
    for r in T("produit"):
        for i in range(1, 6):
            mid = ids.fk("maladie", r[f"index{i}mld"])
            if mid and (mid, r["indexpdt"]) not in deja:
                deja.add((mid, r["indexpdt"]))
                ordre[mid] += 1
                liens.append({"maladie_id": mid, "produit_id": r["indexpdt"], "ordre": ordre[mid],
                              "posologie": txt(r[f"posologie{i}pdt"])})
                rapport["liens maladie→produit repris depuis la fiche produit"].append(f"maladie#{mid} ← produit#{r['indexpdt']}")
    charger(db, m.MaladieProduit, liens)

    # Contenus ------------------------------------------------------------------------------------
    sujets = {(txt(r["referencecsl"]), r["indexcsl"]) for r in T("conseil") if n(r["sujetreponsecsl"]) == 1}
    sujet_par_ref = {ref: i for ref, i in sujets}
    conseils_s, conseils_r = [], []
    for r in T("conseil"):
        ligne = {
            "id": r["indexcsl"], "reference": txt(r["referencecsl"]), "objet": txt(r["objetcsl"]),
            "texte": txt(r["textecsl"]), "auteur_id": M(r["indexmbr"], f"conseil#{r['indexcsl']}"),
            "confidentialite": n(r["confidencecsl"]) or 2, "nombre_reponses": n(r["nbreponsecsl"]),
            "etat": n(r["etatcsl"]) or 1, "date_creation": dt(r["datecsl"]) or datetime(2016, 1, 1),
        }
        if n(r["sujetreponsecsl"]) == 1:
            conseils_s.append({**ligne, "sujet_id": None})
        elif ligne["reference"] in sujet_par_ref:
            conseils_r.append({**ligne, "sujet_id": sujet_par_ref[ligne["reference"]]})
        else:
            rapport["réponses de forum sans sujet écartées"].append(f"conseil#{r['indexcsl']}")
    charger(db, m.Conseil, conseils_s + conseils_r)

    zones_sga = [
        "activite_actuelle", "savoir_faire", "activite_quotidienne", "secret_a_partager", "origine_idee",
        "idee_vue_chez_autrui", "participation_idee_tierce", "est_sociable", "interet_pour_autrui",
        "a_deja_fait_commerce", "se_fait_des_amis", "garde_ses_relations", "percu_comme_ouvert",
        "perception_par_autrui", "est_meneur", "prefere_entourage", "a_des_amis_proches",
        "entourage_valorise_activite", "entourage_proche", "personnes_consideration", "motivation",
        "pourcentage_implication", "moyens_disponibles", "soutien_conjoint", "origine_soutien",
        "confronte_aux_faits", "notes_membre", "notes_conseillere", "etat_fiche", "cloturee",
    ]
    vus = set()
    lignes = []
    for r in T("soungangai"):
        if not M(r["indexmbr"], f"soungangai#{r['indexsga']}") or r["indexmbr"] in vus:
            rapport["découverte de soi écartée (membre absent ou doublon)"].append(f"soungangai#{r['indexsga']}")
            continue
        vus.add(r["indexmbr"])
        ligne = {"id": r["indexsga"], "membre_id": r["indexmbr"], "reference": txt(r["referencesga"]),
                 "date_creation": dt(r["datesga"]) or datetime(2016, 1, 1), "etat": n(r["etatsga"]) or 1}
        for i, champ in enumerate(zones_sga, start=1):
            v = r[f"zone{i:02d}sga"]
            ligne[champ] = n(v) if getattr(m.Soungangai, champ).type.python_type is int else txt(v)
        lignes.append(ligne)
    charger(db, m.Soungangai, lignes)

    # Bug legacy (inventaire 01, §5.35) : une réponse de gestionnaire partait toujours au membre n° 1.
    # On la rattache au dernier membre (non gestionnaire) ayant écrit dans la même rubrique avant elle.
    gestionnaires_ids = {r["indexmbr"] for r in T("membre") if n(r["typembr"]) == TypeMembre.GESTIONNAIRE}
    dialogues, dernier_membre = [], {}
    for r in sorted(T("dialogue"), key=lambda x: (dt(x["datedlg"]) or datetime(2016, 1, 1), x["indexdlg"])):
        if not M(r["indexmbr"], f"dialogue#{r['indexdlg']}"):
            continue
        rubrique, auteur, cible = n(r["typedlg"]), r["indexmbr"], n(r["indexmbrdlg"])
        if auteur in gestionnaires_ids:
            if cible in gestionnaires_ids or cible == 0:
                destinataire = dernier_membre.get(rubrique)
                if destinataire:
                    rapport["réponses de dialogue réattribuées (bug du destinataire n° 1)"].append(
                        f"dialogue#{r['indexdlg']} → membre#{destinataire}")
            else:
                destinataire = M(cible)
        else:
            dernier_membre[rubrique] = auteur
            destinataire = None  # adressé à la frangine
        dialogues.append({
            "id": r["indexdlg"], "auteur_id": auteur, "destinataire_id": destinataire, "type_dialogue": rubrique,
            "texte": txt(r["textedlg"]), "etat": n(r["etatdlg"]) or 2,
            "date_message": dt(r["datedlg"]) or datetime(2016, 1, 1),
        })
    charger(db, m.Dialogue, dialogues)

    # Message : index1mbr = auteur réel, indexmbr = destinataire (0 = la frangine)
    gestionnaires = {r["indexmbr"] for r in T("membre") if n(r["typembr"]) == TypeMembre.GESTIONNAIRE}
    messages = []
    for r in T("message"):
        auteur, cible = n(r["index1mbr"]), n(r["indexmbr"])
        if cible == 0 and M(auteur):
            messages.append({"membre_id": auteur, "auteur_id": auteur, "de_la_frangine": False})
        elif cible and auteur in gestionnaires and M(cible) and cible not in gestionnaires:
            messages.append({"membre_id": cible, "auteur_id": M(auteur), "de_la_frangine": True})
        else:
            rapport["messages non représentables écartés (échange gestionnaire↔gestionnaire ou membre absent)"].append(
                f"message#{r['indexmsg']}")
            continue
        messages[-1].update({"id": r["indexmsg"], "texte": txt(r["textemsg"]), "lu": n(r["etatmsg"]) == 2,
                             "date_message": dt(r["datemsg"]) or datetime(2016, 1, 1)})
    charger(db, m.Message, messages)

    charger(db, m.Contact, [{
        "id": r["indexctt"], "membre_id": M(r["indexmbr"]), "nom": txt(r["nomctt"]), "email": txt(r["mailctt"]),
        "objet": txt(r["objetctt"]), "texte": txt(r["textectt"]), "etat": n(r["etatctt"]) or 2,
        "date_envoi": dt(r["datectt"]) or datetime(2016, 1, 1), "reponse": txt(r.get("reponsectt")),
    } for r in T("contact")])
    charger(db, m.Suggestion, [{
        "id": r["indexsgt"], "date": dt(r["datesgt"]) or datetime(2016, 1, 1), "module": n(r["modulesgt"]),
        "texte": txt(r["textesgt"]), "etat": n(r["etatsgt"]) or 2,
    } for r in T("suggestion")])

    # Entreprises ---------------------------------------------------------------------------------
    # Le secteur n'était pas saisi dans l'interface legacy : on le déduit du domaine (ADR-0007)
    secteur_du_domaine = {r["indexdat"]: r["indexsat"] for r in T("domaineactivite")}
    charger(db, m.Entreprise, [{
        "id": r["indexent"], "reference": txt(r["referenceent"]), "membre_id": M(r["indexmbr"]),
        "secteur_id": ids.fk("secteur_activite", secteur_du_domaine.get(r["indexdat"]) or r["indexsat"]),
        "domaine_id": ids.fk("domaine_activite", r["indexdat"]),
        "nom": txt(r["noment"]), "forme_juridique": n(r["formeent"]), "capital_social": n(r["capitalent"]),
        "description": txt(r["descriptent"]), "commentaire": txt(r["commentent"]), "gerant": txt(r["gerantent"]),
        "telephone": normaliser_telephone(txt(r["phoneent"])), "email": txt(r["mailent"]), "site_web": txt(r["siteent"]),
        "adresse": txt(r["adresseent"]), "ville_id": ids.fk("ville", r["indexvil"]),
        "logo": copier_media(images, f"ent{r['indexent']}.jpg", "entreprises"),
        "etat": n(r["etatent"]) or Etat.NON_TRAITE, "date_creation": dt(r["dateinscriptent"]) or datetime(2016, 1, 1),
        "nombre_visites": n(r["nbvisiteent"]), "date_derniere_visite": dt(r["datevisiteent"]),
    } for r in T("entreprise")])

    ext_pub = {1: "jpg", 2: "mp3", 3: "mp4"}
    charger(db, m.Publicite, [{
        "id": r["indexpub"], "reference": txt(r["referencepub"]), "demandeur_id": M(r["indexmbr"]),
        "entreprise_id": ids.fk("entreprise", r["indexent"], f"publicite#{r['indexpub']}"),
        "objet": txt(r["objetpub"]), "texte": txt(r["textepub"]), "date_debut": d(r["datedebpub"]),
        "date_fin": d(r["datefinpub"]), "type_fichier": n(r["typefichpub"]),
        "fichier": copier_media(images, f"pub{r['indexpub']}.{ext_pub.get(n(r['typefichpub']), 'jpg')}", "publicites"),
        "nombre_vues": n(r["nbvuepub"]), "date_derniere_vue": dt(r["datevuepub"]), "etat": n(r["etatpub"]) or 1,
        "date_creation": dt(r["dateinscpub"]) or datetime(2016, 1, 1),
    } for r in T("publicite")])

    # Ressources humaines ---------------------------------------------------------------------
    charger(db, m.AnnonceEmploi, [{
        "id": r["indexhmn"], "type_annonce": n(r["typeinscripthmn"]) or 1,
        # Bug legacy : indexmbr reçoit le type de fiche (1/2) au lieu du membre → auteur irrécupérable
        "auteur_id": None if n(r["indexmbr"]) == n(r["typeinscripthmn"]) else M(r["indexmbr"]),
        "reference": txt(r["referencehmn"]), "secteur_id": ids.fk("secteur_activite", r["indexsat"]),
        "domaine_id": ids.fk("domaine_activite", r["indexdat"]), "nom": txt(r["nomhmn"]), "prenom": txt(r["prenomhmn"]),
        "sexe": n(r["sexehmn"]) or 3, "date_naissance": d(r["datenaishmn"]), "adresse": txt(r["adressehmn"]),
        "telephone": normaliser_telephone(txt(r["phonehmn"])), "email": txt(r["mailhmn"]),
        "diplomes": txt(r["diplomehmn"]), "savoir_faire": txt(r["savoirfairehmn"]),
        "experience": txt(r["experience1hmn"]), "experience_2": txt(r["experience2hmn"]),
        "competences": txt(r["competencehmn"]), "poste_a_pourvoir": txt(r["postepourvoirhmn"]),
        "autres_informations": txt(r["autreinfohmn"]),
        "photo": copier_media(images, f"hmn{r['indexhmn']}.jpg", "emploi"),
        "cv": copier_media(images, f"cv{r['indexhmn']}.pdf", "emploi"),
        "etat": n(r["etathmn"]) or 2, "date_creation": dt(r["dateinscripthmn"]) or datetime(2016, 1, 1),
        "nombre_visites": n(r["nbrvisitehmn"]), "date_derniere_visite": dt(r["datevisitehmn"]),
    } for r in T("humaine")])
    rapport["fiches RH sans auteur (bug legacy : indexmbr = type de fiche)"] += [
        f"humaine#{r['indexhmn']}" for r in T("humaine") if n(r["indexmbr"]) == n(r["typeinscripthmn"])]

    # E-commerce ------------------------------------------------------------------------------------
    charger(db, m.Immobilier, [{
        "id": r["indeximb"], "reference": txt(r["referenceimb"]), "auteur_id": M(r["indexmbr"]),
        "offre_ou_recherche": n(r["offredemandeimb"]) or 1, "type_transaction": n(r["transactionimb"]),
        "type_bien": n(r["typeimb"]), "quartier_id": ids.fk("quartier", r["indexqtr"]),
        "localisation": txt(r["localisationimb"]), "surface_m2": n(r["surfaceimb"]),
        "nombre_pieces": n(r["nbpieceimb"]), "nombre_chambres": n(r["nbchambreimb"]),
        "situation": n(r["situationimb"]) or 1, "prix": n(r["priximb"]), "description": txt(r["descriptimb"]),
        "photo": copier_media(images, f"imb{r['indeximb']}.jpg", "immobilier"),
        "etat": n(r["etatimb"]) or 1, "date_creation": dt(r["dateinscriptimb"]) or datetime(2016, 1, 1),
        "nombre_visites": n(r["nbvisiteimb"]), "date_derniere_visite": dt(r["datevisiteimb"]),
    } for r in T("immobilier")])
    charger(db, m.Article, [{
        "id": r["indexart"], "reference": txt(r["referenceart"]), "auteur_id": M(r["indexmbr"]),
        "famille_id": ids.fk("famille_article", r["indexfam"]), "offre_ou_recherche": n(r["offredemandeart"]) or 1,
        "libelle": txt(r["libeleart"]), "prix": n(r["prixart"]), "quantite": n(r["quantiteart"]),
        "neuf_ou_occasion": n(r["neufocasart"]), "description": txt(r["descriptart"]),
        "photo": copier_media(images, f"art{r['indexart']}.jpg", "articles"),
        "etat": n(r["etatart"]) or 1, "date_creation": dt(r["dateinscriptart"]) or datetime(2016, 1, 1),
        "nombre_visites": n(r["nbvisiteart"]), "date_derniere_visite": dt(r["datevisiteart"]),
    } for r in T("article")])

    charger(db, m.Partenariat, [{
        "id": r["indexptn"], "reference": txt(r["referenceptn"]), "auteur_id": M(r["indexmbr"]),
        "actif": txt(r["actifptn"]), "description": txt(r["descriptptn"]), "recherche": txt(r["rechercheptn"]),
        "objectif": txt(r["objectifptn"]), "etat": n(r["etatptn"]) or 2,
        "date_creation": datetime.combine(d(r["dateptn"]) or date(2016, 1, 1), datetime.min.time()),
    } for r in T("partenariat")])

    charger(db, m.Interet, [{
        "id": r["indexbsn"], "type_objet": n(r["typebsn"]), "sous_type": n(r["interesebsn"]) or 2,
        "membre_id": M(r["indexmbr"]), "annonce_emploi_id": ids.fk("annonce_emploi", r["indexhmn"], f"besoin#{r['indexbsn']}"),
        "immobilier_id": ids.fk("immobilier", r["indeximb"], f"besoin#{r['indexbsn']}"),
        "article_id": ids.fk("article", r["indexart"], f"besoin#{r['indexbsn']}"),
        "partenariat_id": ids.fk("partenariat", r["indexptn"], f"besoin#{r['indexbsn']}"),
        "message": txt(r["besoinbsn"]), "date_creation": dt(r["datebsn"]) or datetime(2016, 1, 1),
        "etat": n(r["etatbsn"]) or 2,
    } for r in T("besoin")])

    charger(db, m.Paiement, [{
        "id": r["indexpay"], "membre_id": M(r["indexmbr"]), "type_objet": n(r["typepnrpay"]),
        "date_paiement": dt(r["datepay"]) or datetime(2016, 1, 1), "mode": n(r["typepay"]) or 1,
        "montant": n(r["montantpay"]), "remarque": txt(r["remarquepay"]), "etat": n(r["etatpay"]) or 2,
    } for r in T("payement")])
    charger(db, m.LignePanier, [{
        "id": r["indexpnr"], "type_objet": n(r["typepnr"]), "membre_id": r["indexmbr"],
        "produit_id": ids.fk("produit", r["indexpdt"]), "article_id": ids.fk("article", r["indexart"]),
        "quantite": n(r["qtepnr"]), "prix_unitaire": n(r["prixpnr"]),
        "date_ajout": dt(r["datepnr"]) or datetime(2016, 1, 1), "paye": n(r["etatpayepnr"]) == 1,
        "date_paiement": d(r["datepayepnr"]), "paiement_id": ids.fk("paiement", r["indexpay"]),
        "etat": n(r["etatpnr"]) or 2,
    } for r in T("panier") if M(r["indexmbr"], f"panier#{r['indexpnr']}")])

    charger(db, m.ArticleCourse, [{
        "id": r["indexartcse"], "boutique_id": M(r["indexbtq"]), "code": txt(r["codeartcse"]), "nom": txt(r["nomartcse"]),
        "marque": txt(r["marqueartcse"]), "prix": n(r["prixartcse"]), "disponible": n(r["disponibleartcse"]) or 1,
        "description": txt(r["observationartcse"]), "etat": n(r["etatartcse"]) or 2,
        "photo": copier_media(images, f"artcse{r['indexartcse']}.jpg", "courses"),
    } for r in T("articlecourse")])
    charger(db, m.Course, [{
        "id": r["indexcrs1"], "reference": txt(r["referencecrs1"]), "client_id": M(r["indexmbr"]),
        "boutique_id": M(r["indexbtq"]), "lieu_achat": txt(r["magasincrs1"]), "date_achat": d(r["dateachatcrs1"]),
        "date_livraison": dt(r["datelivraisoncrs1"]), "lieu_livraison": txt(r["lieulivraisoncrs1"]),
        "montant_achats": n(r["montantcrs1"]), "frais_service": n(r["commissioncrs1"]),
        "mode_paiement": n(r["modepayecrs1"]), "paye": n(r["etatpayecrs1"]) or 2,
        "observation": txt(r["observationcrs1"]), "etat_course": n(r["etatcoursecrs1"]) or 1,
        "etat": n(r["etatcrs1"]) or 2, "date_creation": dt(r["datecrs1"]) or datetime(2016, 1, 1),
    } for r in T("course1")])
    charger(db, m.LigneCourse, [{
        "id": r["indexcrs2"], "course_id": r["indexcrs1"], "article_catalogue_id": ids.fk("article_course", r["indexartcse"]),
        "nom_article": txt(r["articlecrs2"]), "prix_plafond": n(r["prixcrs2"]), "quantite": n(r["quantitecrs2"]),
        "observation": txt(r["observationcrs2"]), "etat": n(r["etatcrs2"]) or 2,
    } for r in T("course2") if ids.fk("course", r["indexcrs1"], f"course2#{r['indexcrs2']}")])

    # Appels de fonds -------------------------------------------------------------------------------
    appels = []
    for r in T("appelfond"):
        if not ids.fk("entreprise", r["indexent"]):
            rapport["appels de fonds conservés sans entreprise (entreprise inexistante à la source)"].append(
                f"appelfond#{r['indexadf']} (indexent={r['indexent']})")
        mail, adresse = txt(r["mailpromotadf"]), txt(r["adressepromotadf"])
        if "@" not in mail and "@" in adresse:  # bug legacy : colonnes inversées à la création
            mail, adresse = adresse, mail
            rapport["appels de fonds : e-mail/adresse promoteur remis dans le bon ordre"].append(f"appelfond#{r['indexadf']}")
        appels.append({
            "id": r["indexadf"], "reference": txt(r["referenceadf"]), "auteur_id": M(r["indexmbr"]),
            "entreprise_id": ids.fk("entreprise", r["indexent"]), "secteur_id": ids.fk("secteur_activite", r["indexsat"]),
            "ville_id": ids.fk("ville", r["indexvil"]), "nom_projet": txt(r["nomprojetadf"]),
            "objet_projet": txt(r["objetprojetadf"]), "description_activite": txt(r["descriptactiviteadf"]),
            "description_projet": txt(r["descriptprojetadf"]), "devis_projet": n(r["devisprojetadf"]),
            "apport_fond_propre": n(r["apportfondadf"]), "besoin_financement": n(r["besoinfondadf"]),
            "niveau_realisation": n(r["niveaurealisatadf"]), "nom_promoteur": txt(r["nompromotadf"]),
            "telephone_promoteur": normaliser_telephone(txt(r["phonepromotadf"])), "email_promoteur": mail,
            "adresse_promoteur": adresse, "observation_gestionnaire": txt(r["observatadf"]),
            "appreciation": n(r["appreciatadf"]), "montant_promis": n(r["promisfondadf"]),
            "montant_collecte": n(r["colectefondadf"]), "etat": n(r["etatadf"]) or 1,
            "presentation_pdf": copier_media(images, f"adf{r['indexadf']}.pdf", "financement"),
            "date_creation": dt(r["dateinscriptadf"]) or datetime(2016, 1, 1),
            "nombre_visites": n(r["nbvisiteadf"]), "date_derniere_visite": dt(r["datevisiteadf"]),
        })
    charger(db, m.AppelFond, appels)
    charger(db, m.CollecteFond, [{
        "id": r["indexcdf"], "reference": txt(r["referencecdf"]), "appel_fond_id": r["indexadf"],
        "membre_id": M(r["indexmbr"]), "date_engagement": d(r["dateaportcdf"]), "type_apport": n(r["typeaportcdf"]) or 1,
        "montant_promis": n(r["montantprevucdf"]), "echeance_mois": n(r["echeancecdf"]),
        "montant_verse": n(r["montantversecdf"]), "date_dernier_versement": d(r["dateversecdf"]),
        "remarque": txt(r["remarquecdf"]), "observation_mediateur": txt(r["observcdf"]), "etat": n(r["etatcdf"]) or 1,
    } for r in T("collectefond") if ids.fk("appel_fond", r["indexadf"], f"collectefond#{r['indexcdf']}")])
    charger(db, m.VersementCollecte, [{
        "id": r["indexmcf"], "collecte_id": r["indexcdf"], "date_versement": d(r["datemcf"]) or date(2016, 1, 1),
        "montant": n(r["montantmcf"]), "etat": n(r["etatmcf"]) or 2,
    } for r in T("mouvcollectefond") if ids.fk("collecte_fond", r["indexcdf"], f"mouvcollectefond#{r['indexmcf']}")])

    # Likelemba ----------------------------------------------------------------------------------------
    charger(db, m.GroupeLikelemba, [{
        "id": r["indexlkb1"], "code": txt(r["codelkb1"]), "responsable_id": M(r["indexcheflkb1"]),
        "montant_cotisation": n(r["montantlkb1"]), "periodicite": n(r["periodelkb1"]) or 1,
        "date_debut": d(r["datedebutlkb1"]), "observation": txt(r["observatlkb1"]),
        "compteur_entrees": n(r["nbentrelkb1"]), "compteur_paiements": n(r["nbpayelkb1"]), "etat": n(r["etatlkb1"]) or 2,
    } for r in T("likelemba1")])
    charger(db, m.MembreLikelemba, [{
        "id": r["indexlkb2"], "groupe_id": r["indexlkb1"], "membre_id": M(r["indexmbr"]), "code": txt(r["codelkb2"]),
        "date_entree": d(r["dateentrelkb2"]), "observation": txt(r["observatlkb2"]), "etat": n(r["etatlkb2"]) or 2,
        "caution_nom": txt(r["personcautlkb2"]), "caution_est_membre": n(r["personcautmbrlkb2"]) or 1,
        "caution_piece_identite": txt(r["cnipersoncautlkb2"]), "caution_adresse": txt(r["adressepersoncautlkb2"]),
        "caution_activite": txt(r["activitepersoncautlkb2"]), "caution_telephone": txt(r["phonepersoncautlkb2"]),
        "temoins": [
            {"nom": txt(r[f"temoin{i}lkb2"]), "telephone": txt(r[f"phonetemoin{i}lkb2"]),
             "emploi": txt(r[f"emploitemoin{i}lkb2"]), "est_membre": n(r[f"temoin{i}mbrlkb2"]) or 1}
            for i in (1, 2, 3)
        ],
    } for r in T("likelemba2") if ids.fk("groupe_likelemba", r["indexlkb1"], f"likelemba2#{r['indexlkb2']}")])
    charger(db, m.CotisationLikelemba, [{
        "id": r["indexlkb3"], "groupe_id": r["indexlkb1"], "adhesion_id": ids.fk("membre_likelemba", r["indexlkb2"]),
        "caissier_id": M(r["indcaisrlkb3"]), "numero_recu": txt(r["codelkb3"]), "date_paiement": d(r["datepayelkb3"]),
        "montant": n(r["montantlkb3"]), "mode_paiement": n(r["modepayelkb3"]), "code_transfert": txt(r["codechardenlkb3"]),
        "observation": txt(r["observatlkb3"]), "etat": n(r["etatlkb3"]) or 2,
    } for r in T("likelemba3") if ids.fk("groupe_likelemba", r["indexlkb1"], f"likelemba3#{r['indexlkb3']}")])

    # Épargne solidaire & carte de pointage ------------------------------------------------------------
    charger(db, m.FondDeSoutien, [{
        "id": r["indexfds"], "reference": txt(r["referencefds"]), "membre_id": M(r["indexmbr"]),
        "date_souscription": d(r["datefds"]), "type_fond": n(r["typefds"]) or 1,
        "rapporteur_id": M(r["indrapporteurfds"]), "rapporteur_nom": txt(r["rapporteurfds"]),
        "souscripteur_id": M(r["indsouscripteurfds"]), "souscripteur_nom": txt(r["souscripteurfds"]),
        "motivation": txt(r["motivationfds"]), "montant": n(r["montantfds"]), "duree_mois": n(r["dureefds"]),
        "mode_paiement": n(r["modepayefds"]), "confirme": n(r["confirmefds"]) or 2, "etat": n(r["etatfds"]) or 2,
    } for r in T("fonddesoutien")])
    charger(db, m.PointCaisse, [{
        "id": r["indexpcs"], "reference": txt(r["codepcs"]), "date_heure": dt(r["dateheurepcs"]) or datetime(2016, 1, 1),
        "operateur_id": M(r["indexcaissepcs"]), "membre_id": r["indexmbr"], "type_operation": n(r["operationpcs"]),
        "montant": n(r["montantpcs"]), "motif": txt(r["motifpcs"]), "solde_apres": n(r["soldepcs"]),
        "type_caisse": n(r["typecaissepcs"]) or 1,
    } for r in T("pointcaisse") if M(r["indexmbr"], f"pointcaisse#{r['indexpcs']}")])

    # Opportunité d'affaire ---------------------------------------------------------------------------
    souscriptions = []
    for r in T("souscriptoportuniteaffaire"):
        if not M(r["indexmbr"], f"souscription#{r['indexsoa']}"):
            continue
        souscriptions.append({
            "id": r["indexsoa"], "reference": txt(r["referencesoa"]), "membre_id": r["indexmbr"],
            "date_creation": dt(r["datesoa"]) or datetime(2016, 1, 1), "objectifs": txt(r["zone02soa"]),
            "mon_histoire": txt(r["zone03soa"]), "disponibilite_hebdo": n(r["zone04soa"]),
            "formations": [
                {"prestation": i, "date": str(d(r[f"zone09{i}soa"]) or ""), "lieu": txt(r[f"zone10{i}soa"]),
                 "heure": txt(r[f"zone11{i}soa"])} for i in (1, 2, 3, 4)
            ],
            "nombre_rdv": n(r["zone12soa"]),
            "filleuls": [
                {"nom": txt(r[f"zone13{i}soa"]), "email": txt(r[f"zone14{i}soa"]), "adresse": txt(r[f"zone15{i}soa"]),
                 "montant": n(r[f"zone16{i}soa"]), "date_presentation": str(d(r[f"zone17{i}soa"]) or "")}
                for i in (1, 2, 3)
            ],
            "mode_souscription": n(r["zone21soa"]), "montant": n(r["zone22soa"]),
            "date_limite_complement": d(r["zone23soa"]), "etat": n(r["etatsoa"]) or 1,
        })
    charger(db, m.Souscription, souscriptions)
    charger(db, m.ProspectSouscription, [{
        "id": r["indexmoa"], "souscription_id": r["indexsoa"], "membre_id": M(r["indexmbr"]),
        "nom_prenom": txt(r["nomprenmoa"]), "telephone": txt(r["phonemoa"]), "email": txt(r["mailmoa"]),
        "commentaire": txt(r["commentairemoa"]), "etat": n(r["etatmoa"]) or 2,
    } for r in T("membreoportuniteaffaire") if ids.fk("souscription", r["indexsoa"], f"moa#{r['indexmoa']}")])
    charger(db, m.ProduitSouscription, [{
        "id": r["indexpoa"], "souscription_id": r["indexsoa"], "produit_id": r["indexpdt"],
        "prix_unitaire": n(r["prixpoa"]), "quantite": n(r["quantitepoa"]),
    } for r in T("produitoportuniteaffaire")
        if ids.fk("souscription", r["indexsoa"], f"poa#{r['indexpoa']}") and ids.fk("produit", r["indexpdt"])])

    champs_bp = [
        "type_activite", "description_projet", "moyens_actuels", "ressources_disponibles", "possessions",
        "organisation_actuelle", "organisation_souhaitee", "detail_besoin", "apport_actuel", "ambition",
        "strategie_resultats", "valeur_ajoutee", "prevision_ca_benefice", "processus_activite",
        "estimation_charges", "composantes_ca", "repartition_ca", "elements_environnementaux",
        "strategie_attaque", "devis_chiffre_besoin", "apport_prevu", "niveau_realisation",
        "difficultes_realisation", "planning_execution", "difficultes_futures",
    ]
    bps, vus = [], set()
    for r in T("businessplan"):
        if not M(r["indexmbr"], f"businessplan#{r['indexbsp']}") or r["indexmbr"] in vus:
            continue
        vus.add(r["indexmbr"])
        ligne = {"id": r["indexbsp"], "membre_id": r["indexmbr"], "reference": txt(r["zone27bsp"]),
                 "date_creation": dt(r["zone28bsp"]) or datetime(2016, 1, 1), "etat": n(r["zone29bsp"]) or 2}
        for i, champ in enumerate(champs_bp, start=2):
            v = r[f"zone{i:02d}bsp"]
            ligne[champ] = n(v) if champ == "niveau_realisation" else txt(v)
        bps.append(ligne)
    charger(db, m.BusinessPlan, bps)

    # Comparateur de prix, marchés, projets, réussites -----------------------------------------------
    charger(db, m.ProduitProspective, [
        {"id": r["indexptpv"], "nom": txt(r["nomproduitptpv"]), "etat": n(r["etatptpv"]) or 2} for r in T("produitprospective")
    ])
    # Bug legacy : prospective1.indexent reçoit l'id du membre, pas celui de l'entreprise
    entreprise_du_membre = {e["indexmbr"]: e["indexent"] for e in T("entreprise") if e["indexmbr"]}
    fiches, entreprises_vues = [], set()
    for r in T("prospective1"):
        ent = entreprise_du_membre.get(r["indexent"]) or entreprise_du_membre.get(r["indexmbr"])
        if not ent or ent in entreprises_vues:
            rapport["fiches comparateur écartées (entreprise introuvable ou doublon)"].append(
                f"prospective1#{r['indexppv1']} (indexent={r['indexent']})")
            continue
        entreprises_vues.add(ent)
        fiches.append({"id": r["indexppv1"], "membre_id": M(r["indexmbr"]), "entreprise_id": ent, "etat": n(r["etatppv1"]) or 2})
    charger(db, m.FicheProspective, fiches)
    charger(db, m.LigneProspective, [{
        "id": r["indexppv2"], "fiche_id": r["indexppv1"], "offre_ou_demande": n(r["offredemandeppv2"]) or 1,
        "produit_id": r["indexptpv"], "unite_vente": txt(r["unitemesureppv2"]), "prix": n(r["prixppv2"]),
        "fournisseur_ou_client": txt(r["fournisseurclientppv2"]), "quantite_mensuelle": n(r["volumeppv2"]),
        "etat": n(r["etatppv2"]) or 2,
    } for r in T("prospective2")
        if ids.fk("fiche_prospective", r["indexppv1"], f"prospective2#{r['indexppv2']}")
        and ids.fk("produit_prospective", r["indexptpv"], f"prospective2#{r['indexppv2']}")])
    charger(db, m.Marche, [{
        "id": r["indexmch"], "reference": txt(r["referencemch"]), "auteur_id": M(r["indexmbr"]),
        "numero_appel_offre": txt(r["numerooffremch"]), "type_marche": n(r["typemch"]) or 2,
        "libelle": txt(r["libellemch"]), "description": txt(r["descriptionmch"]), "montant": n(r["montantmch"]),
        "date_limite": d(r["delaimch"]), "dossier_a_fournir": txt(r["dossiermch"]), "lieu_depot": txt(r["lieudepotmch"]),
        "email": txt(r["adressemailmch"]), "maitre_ouvrage": txt(r["maitreouvragemch"]),
        "publie_par": txt(r["publierparmch"]), "beneficiaire": txt(r["beneficiairemch"]), "etat": n(r["etatmch"]) or 2,
        "date_creation": DATE_INCONNUE,  # la table legacy n'a pas de date de création
    } for r in T("marche")])
    charger(db, m.Projet, [{
        "id": r["indexpjt"], "reference": txt(r["referencepjt"]), "auteur_id": M(r["indexmbr"]),
        "responsable": txt(r["responsablepjt"]), "promoteur": txt(r["promoteurpjt"]), "objet": txt(r["objetpjt"]),
        "libelle": txt(r["libellepjt"]), "objectif": txt(r["objectifpjt"]), "description": txt(r["descriptionpjt"]),
        "adresse": txt(r["adressepjt"]), "duree_mois": n(r["dureepjt"]), "date_lancement": d(r["datelancementpjt"]),
        "conditions": txt(r["conditionpjt"]), "etat": n(r["etatpjt"]) or 2,
        "date_creation": DATE_INCONNUE,  # la table legacy n'a pas de date de création
    } for r in T("projet")])
    charger(db, m.Reussite, [{
        "id": r["indexrst"], "reference": txt(r["zone02rst"]), "membre_id": r["indexmbr"],
        "situation_avant": txt(r["zone03rst"]), "vision": txt(r["zone04rst"]), "projet": txt(r["zone05rst"]),
        "fond_demarrage": n(r["zone06rst"]), "besoin_reel_demarrage": n(r["zone07rst"]), "strategie": txt(r["zone08rst"]),
        "difficultes": txt(r["zone09rst"]), "deploiement_efforts": txt(r["zone10rst"]), "succes": txt(r["zone11rst"]),
        "conseil": txt(r["zone12rst"]), "etat": n(r["zone13rst"]) or 1,
        "date_creation": dt(r["zone14rst"]) or datetime(2016, 1, 1), "secteur_id": ids.fk("secteur_activite", r["zone15rst"]),
    } for r in T("reussite") if M(r["indexmbr"], f"reussite#{r['indexrst']}")])

    # Offres financières -------------------------------------------------------------------------------
    sujets_f = {txt(r["referencecsf"]): r["indexcsf"] for r in T("conseilfinance") if n(r["sujetreponsecsf"]) == 1}
    cf_s, cf_r = [], []
    for r in T("conseilfinance"):
        ligne = {
            "id": r["indexcsf"], "rubrique": n(r["typecsf"]) or 1, "reference": txt(r["referencecsf"]),
            "objet": txt(r["objetcsf"]), "texte": txt(r["textecsf"]), "auteur_id": M(r["indexmbr"]),
            "auteur_sujet_id": M(r["auteursujetcsf"]), "confidentialite": n(r["confidencecsf"]) or 2,
            "nombre_reponses": n(r["nbreponsecsf"]), "etat": n(r["etatcsf"]) or 1,
            "date_creation": dt(r["datecsf"]) or datetime(2016, 1, 1),
        }
        if n(r["sujetreponsecsf"]) == 1:
            cf_s.append({**ligne, "sujet_id": None})
        elif ligne["reference"] in sujets_f:
            cf_r.append({**ligne, "sujet_id": sujets_f[ligne["reference"]]})
        else:
            rapport["réponses de forum sans sujet écartées"].append(f"conseilfinance#{r['indexcsf']}")
    charger(db, m.ConseilFinance, cf_s + cf_r)

    charger(db, m.Placement, [{
        "id": r["indexpcm"], "reference": txt(r["referencepcm"]), "membre_id": M(r["indexmbr"]),
        "type_placement": n(r["typepcm"]) or 1, "date_placement": dt(r["datepcm"]) or datetime(2016, 1, 1),
        "montant": n(r["montantpcm"]), "duree_mois": n(r["durepcm"]), "taux": float(r["tauxpcm"] or 0),
        "banque": txt(r["banquepcm"]), "secteur_activite": txt(r["sectactivpcm"]), "observation": txt(r["observpcm"]),
        "etat": n(r["etatpcm"]) or 2,
    } for r in T("placement")])
    charger(db, m.OperationBanque, [{
        "id": r["indexopb"], "reference": txt(r["referenceopb"]), "membre_id": M(r["indexmbr"]),
        "date_saisie": dt(r["date1opb"]) or datetime(2016, 1, 1), "date_operation": d(r["date2opb"]),
        "montant": n(r["montantopb"]), "devise": n(r["deviseopb"]) or 1, "type_operation": n(r["typeopb"]),
        "banque_emettrice_id": ids.fk("banque", r["indexbqe"]), "banque_emettrice_nom": txt(r["nombanqueemettriceopb"]),
        "banque_emettrice_email": txt(r["mailbanqueemettriceopb"]), "beneficiaire": txt(r["beneficiaireopb"]),
        "banque_beneficiaire_id": ids.fk("banque", r["indexbanquebeneficiaireopb"]),
        "banque_beneficiaire_nom": txt(r["nombanquebeneficiaireopb"]),
        "banque_beneficiaire_adresse": txt(r["adressebanquebeneficiaireopb"]), "etat": n(r["etatopb"]) or 2,
    } for r in T("operatbanq")])
    charger(db, m.DemandeCredit, [{
        "id": r["indexdct"], "reference": txt(r["referencedct"]), "membre_id": M(r["indexmbr"]),
        "date_demande": d(r["datedct"]) or date(2016, 1, 1), "montant": n(r["montantdct"]), "objet": txt(r["objetdct"]),
        "duree_mois": n(r["duredct"]), "niveau_realisation": float(r["niveaurealisatdct"] or 0),
        "garantie": txt(r["garantidct"]), "delai_reponse_jours": n(r["delaireponsedct"]),
        "observation": txt(r["observdct"]), "devis_global": txt(r["devisglobaldct"]),
        "apport_propre": txt(r["apportpropredct"]), "etat": n(r["etatdct"]) or 2,
    } for r in T("demandecredit")])
    ctc = [("dette_compromise", "04"), ("revenus_journaliers", "05"), ("revenus_hebdomadaires", "06"),
           ("revenus_mensuels", "07"), ("charges_fixes", "08"), ("charges_variables", "09"),
           ("entrees_activite_en_cours", "11"), ("entrees_previsionnelles", "13"), ("entrees_totales", "14"),
           ("echeance_supportable", "16")]
    charger(db, m.ContentieuxCredit, [{
        "id": r["indexctc"], "reference": txt(r["referencectc"]), "membre_id": M(r["indexmbr"]),
        "date_dossier": dt(r["datectc"]) or datetime(2016, 1, 1),
        **{champ: n(r[f"zone{z}ctc"]) for champ, z in ctc},
        **{f"{champ}_detail": txt(r[f"zone{z}Actc"]) for champ, z in ctc},
        "activites_en_cours": txt(r["zone10ctc"]), "activite_previsionnelle": txt(r["zone12ctc"]),
        "echeance_actuelle": txt(r["zone15ctc"]), "elements_favorables": txt(r["zone17ctc"]), "etat": n(r["etatctc"]) or 2,
    } for r in T("contentcredit")])

    dossiers = []
    for type_dossier, (table, suffixe, nb) in enumerate(
        [("acompbusinesplan", "abp", 58), ("acompprojetagricol", "apa", 80),
         ("acomprestructcredit", "arc", 47), ("acompcreditimmobil", "aci", 38)], start=1):
        for r in T(table):
            dossiers.append({
                "type_dossier": type_dossier, "reference": txt(r[f"zone01{suffixe}"]), "membre_id": M(r["indexmbr"]),
                "date_creation": dt(r[f"zone02{suffixe}"]) or datetime(2016, 1, 1), "objet": txt(r[f"zone03{suffixe}"]),
                "reponses": {str(z): txt(r[f"zone{z:02d}{suffixe}"]) for z in range(4, nb + 1)},
                "etat": n(r[f"etat{suffixe}"]) or 2,
            })
    charger(db, m.DossierAccompagnement, dossiers)

    charger(db, m.BenchType, [{"id": r["indexbm1"], "libelle": txt(r["libelebm1"]), "etat": n(r["etatbm1"]) or 2} for r in T("benchmarking1")])
    charger(db, m.BenchOperation, [{
        "id": r["indexbm2"], "type_id": r["indexbm1"], "libelle": txt(r["libelebm2"]), "etat": n(r["etatbm2"]) or 2,
    } for r in T("benchmarking2") if ids.fk("bench_type", r["indexbm1"], f"benchmarking2#{r['indexbm2']}")])
    charger(db, m.BenchTarif, [{
        "id": r["indexbm3"], "operation_id": r["indexbm2"], "banque_id": r["indexbqe"], "tarif": txt(r["tarifbm3"]),
        "etat": n(r["etatbm3"]) or 2,
    } for r in T("benchmarking3")
        if ids.fk("bench_operation", r["indexbm2"], f"benchmarking3#{r['indexbm3']}") and ids.fk("banque", r["indexbqe"])])

    # Séquences PostgreSQL (les id legacy ont été insérés explicitement)
    if engine.dialect.name == "postgresql":
        for table in Base.metadata.sorted_tables:
            if "id" in table.c:
                db.execute(text(
                    f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), COALESCE((SELECT MAX(id) FROM {table.name}), 1))"
                ))
    db.commit()
    db.close()

    # Le schéma vient d'être créé depuis les modèles : on le déclare à jour pour Alembic
    from alembic import command
    from alembic.config import Config

    config = Config(str(Path(__file__).resolve().parent.parent / "alembic.ini"))
    command.stamp(config, "head", purge=True)


def ecrire_rapport(chemin: Path) -> None:
    lignes = ["# Rapport de reprise des données legacy", "", f"Généré le {datetime.now():%d/%m/%Y %H:%M}.", "",
              "## Lignes chargées", "", "| Table | Lignes |", "|---|---|"]
    lignes += [f"| {t} | {c} |" for t, c in sorted(compte.items())]
    lignes += ["", "## Corrections et écarts", ""]
    if not rapport:
        lignes.append("Aucun.")
    for titre, items in rapport.items():
        lignes += [f"### {titre} ({len(items)})", ""] + [f"- {i}" for i in items[:200]] + [""]
    chemin.write_text("\n".join(lignes), encoding="utf-8")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # console Windows
    ap = argparse.ArgumentParser()
    ap.add_argument("dump", type=Path)
    ap.add_argument("--images", type=Path, default=None)
    ap.add_argument("--rapport", type=Path, default=Path(__file__).resolve().parent.parent / "data" / "rapport-reprise.md")
    a = ap.parse_args()
    reprendre(a.dump, a.images)
    a.rapport.parent.mkdir(parents=True, exist_ok=True)
    ecrire_rapport(a.rapport)
    print(f"Reprise terminée : {sum(compte.values())} lignes. Rapport : {a.rapport}")
    for titre, items in rapport.items():
        print(f"  - {titre} : {len(items)}")
