"""Likelemba : groupes, adhésions, cotisations par paiement type 5, reçus (F-S4-27 à F-S4-44,
ADR-0007 S4b)."""

from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.enums import TypeMembre

GROUPE = {"montant_cotisation": 10_000, "periodicite": 3, "date_debut": "2026-01-15", "observation": "Commerçantes du marché Total"}
ADHESION = {
    "caution_nom": "Moukala Jean", "caution_est_membre": True, "caution_piece_identite": "CNI 123456",
    "caution_adresse": "Poto-Poto", "caution_activite": "Commerçant", "caution_telephone": "05 555 12 12",
    "temoins": [{"nom": "Nkounkou Marie", "telephone": "061112233", "emploi": "Couturière", "est_membre": False},
                {"nom": "", "telephone": "", "emploi": ""}],
}


def _admin(client):
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True, droit_caisse=True)
    return entetes(client, "admin")


def _groupe(client, h, responsable_id, **kw) -> int:
    r = client.post("/api/likelemba", json={**GROUPE, "responsable_id": responsable_id, **kw}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_creation_reservee_et_regles(client):
    chef = creer_membre("chef")
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    hg = _admin(client)
    r = client.post("/api/likelemba", json={**GROUPE, "responsable_id": chef}, headers=entetes(client, "chef"))
    assert r.status_code == 403
    r = client.post("/api/likelemba", json={**GROUPE, "responsable_id": chef}, headers=entetes(client, "admin_sans_droit"))
    assert r.status_code == 403
    r = client.post("/api/likelemba", json={"montant_cotisation": 0}, headers=hg)
    assert r.status_code == 400
    assert r.json()["champs"] == {
        "responsable_id": "Veuillez indiquer le responsable du likelemba.",
        "montant_cotisation": "Le montant de participation ne peut être 0.",
        "periodicite": "Veuillez indiquer la périodicité du likelemba.",
    }
    r = client.post("/api/likelemba", json={**GROUPE, "responsable_id": chef}, headers=hg)
    assert r.status_code == 201 and r.json()["reference"].startswith("LKB")
    assert client.post("/api/likelemba", json={**GROUPE, "responsable_id": chef}, headers=hg).status_code == 400
    # Unicité arbitrée (F-S4-31) : responsable + montant + périodicité + date de début ;
    # deux groupes sans observation sont désormais possibles
    sans_obs = {**GROUPE, "observation": "", "responsable_id": chef, "date_debut": "2026-03-01"}
    assert client.post("/api/likelemba", json=sans_obs, headers=hg).status_code == 201
    assert client.post("/api/likelemba", json={**sans_obs, "montant_cotisation": 5_000}, headers=hg).status_code == 201
    # Le responsable est prévenu
    assert client.get("/api/espace/compteurs", headers=entetes(client, "chef")).json()["messages_non_lus"] == 3


def test_liste_filtre_montant_une_borne(client):
    chef = creer_membre("chef")
    hg = _admin(client)
    _groupe(client, hg, chef)
    _groupe(client, hg, chef, montant_cotisation=50_000, observation="Fonctionnaires")
    assert client.get("/api/likelemba").json()["total"] == 2
    assert client.get("/api/likelemba?montant_min=20000").json()["total"] == 1
    assert client.get("/api/likelemba?montant_max=20000").json()["total"] == 1
    assert client.get("/api/likelemba/compteurs").json()["groupes"] == 2


def test_adhesion_code_caution_temoins_et_doublon(client):
    chef = creer_membre("chef")
    creer_membre("awa", pseudonyme="awa")
    autre = creer_membre("bob")
    hg = _admin(client)
    gid = _groupe(client, hg, chef)
    code = client.get(f"/api/likelemba/{gid}").json()["code"]
    ha = entetes(client, "awa")
    # Un membre ne peut pas inscrire quelqu'un d'autre
    assert client.post(f"/api/likelemba/{gid}/adhesions", json={"membre_id": autre}, headers=ha).status_code == 403
    r = client.post(f"/api/likelemba/{gid}/adhesions", json={**ADHESION, "caution_telephone": "123"}, headers=ha)
    assert r.status_code == 400 and "caution_telephone" in r.json()["champs"]
    r = client.post(f"/api/likelemba/{gid}/adhesions", json=ADHESION, headers=ha)
    assert r.status_code == 201 and r.json()["reference"] == f"1{code}"
    adhesion = r.json()["id"]
    r = client.post(f"/api/likelemba/{gid}/adhesions", json=ADHESION, headers=ha)
    assert r.status_code == 400 and r.json()["message"] == "Ce membre est déjà enregistré dans ce likelemba."
    # Le gestionnaire inscrit un autre membre (décision F-S4-36)
    r = client.post(f"/api/likelemba/{gid}/adhesions", json={"membre_id": autre, "date_entree": "2026-01-10"}, headers=hg)
    assert r.status_code == 201 and r.json()["reference"] == f"2{code}"

    fiche = client.get(f"/api/likelemba/adhesions/{adhesion}", headers=ha).json()
    assert fiche["caution_est_membre"] is True and fiche["caution_telephone"] == "055551212"
    assert fiche["temoins"] == [{"nom": "Nkounkou Marie", "telephone": "061112233", "emploi": "Couturière", "est_membre": False}]
    assert fiche["ordre"] == 1 and fiche["date_entree"] is not None
    # Fiche réservée : adhérent, responsable, gestionnaire
    assert client.get(f"/api/likelemba/adhesions/{adhesion}", headers=entetes(client, "bob")).status_code == 403
    assert client.get(f"/api/likelemba/adhesions/{adhesion}", headers=entetes(client, "chef")).status_code == 200
    # L'adhérent modifie ses témoins
    r = client.put(f"/api/likelemba/adhesions/{adhesion}", json={**ADHESION, "caution_est_membre": False}, headers=ha)
    assert r.status_code == 200
    assert client.get(f"/api/likelemba/adhesions/{adhesion}", headers=ha).json()["caution_est_membre"] is False

    groupe = client.get(f"/api/likelemba/{gid}", headers=ha).json()
    assert groupe["nombre_adherents"] == 2 and groupe["compteur_entrees"] == 2 and groupe["cagnotte"] == 20_000
    assert groupe["mon_adhesion_id"] == adhesion and groupe["peut_adherer"] is False
    # Calendrier indicatif : un bénéficiaire par tour, dans l'ordre d'entrée, tous les mois
    assert [(e["tour"], e["date"], e["beneficiaire"]) for e in groupe["calendrier"]] == [
        (1, "2026-01-15", "awa"), (2, "2026-02-15", "bob")]


def test_cotisation_par_paiement_type_5(client):
    chef = creer_membre("chef")
    creer_membre("awa")
    creer_membre("curieux")
    hg = _admin(client)
    gid = _groupe(client, hg, chef)
    code = client.get(f"/api/likelemba/{gid}").json()["code"]
    ha = entetes(client, "awa")
    adhesion = client.post(f"/api/likelemba/{gid}/adhesions", json={}, headers=ha).json()["id"]

    prep = client.get(f"/api/paiements/preparer?type_objet=5&objet_id={adhesion}", headers=ha).json()
    assert prep["montant"] == 10_000 and code in prep["libelle"]
    assert prep["retour"] == f"/likelemba/{gid}/cotiser?adhesion={adhesion}"
    # Un tiers ne peut pas payer pour cette adhésion
    corps = {"type_objet": 5, "objet_id": adhesion, "mode": 1, "remarque": ""}
    assert client.post("/api/paiements", json=corps, headers=entetes(client, "curieux")).status_code == 403
    # Le montant est imposé (celui du groupe choisi, F-S4-41)
    p1 = client.post("/api/paiements", json={**corps, "montant": 1}, headers=ha).json()["id"]
    p2 = client.post("/api/paiements", json={**corps, "mode": 3, "remarque": "MP123456789"}, headers=hg).json()["id"]

    fiche = client.get(f"/api/likelemba/adhesions/{adhesion}", headers=ha).json()
    recus = sorted(c["numero_recu"] for c in fiche["cotisations"])
    assert recus == [f"{code}P1", f"{code}P2"]  # reçus uniques non tronqués (F-S4-43)
    assert fiche["total_cotisations"] == 20_000
    caissiers = {c["nom_caissier"] for c in fiche["cotisations"]}
    assert caissiers == {"awa", "admin"}  # F-S4-42 : cotisation rattachée à l'adhérent, caissier = payeur
    assert all(c["montant"] == 10_000 and c["etat"] == 1 for c in fiche["cotisations"])

    # Confirmation → validée ; rejet → cotisation annulée, exclue du total
    client.post(f"/api/paiements/{p1}/confirmer", headers=hg)
    client.post(f"/api/paiements/{p2}/rejeter", headers=hg)
    fiche = client.get(f"/api/likelemba/adhesions/{adhesion}", headers=ha).json()
    assert {c["numero_recu"]: c["etat"] for c in fiche["cotisations"]} == {f"{code}P1": 2, f"{code}P2": 3}
    assert fiche["total_cotisations"] == 10_000

    # Historique du groupe : adhérents, responsable, gestionnaires seulement
    assert client.get(f"/api/likelemba/{gid}", headers=entetes(client, "curieux")).json()["cotisations"] is None
    assert client.get(f"/api/likelemba/{gid}").json()["cotisations"] is None
    groupe = client.get(f"/api/likelemba/{gid}", headers=entetes(client, "chef")).json()
    assert groupe["total_cotisations"] == 10_000 and len(groupe["cotisations"]) == 2
    assert groupe["cotisations"][0]["observation"] is not None  # le responsable voit les remarques


def test_adhesion_en_attente_ne_cotise_pas(client):
    chef = creer_membre("chef")
    creer_membre("awa")
    hg = _admin(client)
    gid = _groupe(client, hg, chef)
    ha = entetes(client, "awa")
    adhesion = client.post(f"/api/likelemba/{gid}/adhesions", json={}, headers=ha).json()["id"]
    assert client.post(f"/api/likelemba/adhesions/{adhesion}/etat", json={"etat": 1}, headers=ha).status_code == 403
    assert client.post(f"/api/likelemba/adhesions/{adhesion}/etat", json={"etat": 1}, headers=hg).status_code == 200
    r = client.post("/api/paiements", json={"type_objet": 5, "objet_id": adhesion, "mode": 1}, headers=ha)
    assert r.status_code == 400 and "attente" in r.json()["message"]


def test_validation_de_recu_par_le_responsable(client):
    chef = creer_membre("chef")
    awa = creer_membre("awa")
    creer_membre("curieux")
    hg = _admin(client)
    gid = _groupe(client, hg, chef)
    adhesion = client.post(f"/api/likelemba/{gid}/adhesions", json={}, headers=entetes(client, "awa")).json()["id"]
    code = client.get(f"/api/likelemba/{gid}").json()["code"]
    # Cotisation reprise du legacy avec un reçu tronqué (« LKB…P », varchar(10))
    with SessionLocal() as db:
        c = m.CotisationLikelemba(groupe_id=gid, adhesion_id=adhesion, caissier_id=awa, numero_recu=code[:9] + "P",
                                  montant=10_000, etat=1)
        db.add(c)
        db.commit()
        cid = c.id
    hc = entetes(client, "chef")
    groupe = client.get(f"/api/likelemba/{gid}", headers=hc).json()
    assert groupe["cotisations"][0]["recu_valide"] is False and groupe["cotisations"][0]["peut_valider"] is True
    assert client.post(f"/api/likelemba/cotisations/{cid}/valider", headers=entetes(client, "curieux")).status_code == 403
    r = client.post(f"/api/likelemba/cotisations/{cid}/valider", headers=hc)
    assert r.status_code == 200 and r.json()["reference"] == f"{code}P1"
    ligne = client.get(f"/api/likelemba/{gid}", headers=hc).json()["cotisations"][0]
    assert ligne["recu_valide"] is True and ligne["etat"] == 2 and ligne["peut_valider"] is False


def test_modification_du_groupe(client):
    chef = creer_membre("chef")
    autre = creer_membre("autre")
    hg = _admin(client)
    gid = _groupe(client, hg, chef)
    corps = {**GROUPE, "responsable_id": chef, "montant_cotisation": 15_000}
    assert client.put(f"/api/likelemba/{gid}", json=corps, headers=entetes(client, "autre")).status_code == 403
    assert client.put(f"/api/likelemba/{gid}", json=corps, headers=entetes(client, "chef")).status_code == 200
    assert client.get(f"/api/likelemba/{gid}").json()["montant_cotisation"] == 15_000
    # Passation de responsabilité
    r = client.put(f"/api/likelemba/{gid}", json={**corps, "responsable_id": autre}, headers=entetes(client, "chef"))
    assert r.status_code == 200
    assert client.get(f"/api/likelemba/{gid}").json()["responsable"]["id"] == autre
    # Liste des membres pour choisir : gestionnaires et responsables seulement
    assert client.get("/api/likelemba/membres", headers=entetes(client, "chef")).status_code == 403
    assert len(client.get("/api/likelemba/membres", headers=hg).json()) == 3
