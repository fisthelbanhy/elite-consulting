from conftest import creer_membre, entetes

import app.models as m
from app.db import SessionLocal
from app.enums import Etat, TypeMembre


def _produits():
    with SessionLocal() as db:
        db.add_all([
            # id > 25 : le legacy n'enregistrait jamais ces produits dans le kit (ADR-0007 S5b)
            m.Produit(id=30, reference="470", nom="Pack Aloe", groupe=4, prix_distributeur=28_000, prix_public=40_000,
                      quantite_stock=10),
            m.Produit(id=31, reference="015", nom="Aloe Vera Gel", groupe=1, prix_distributeur=10_000, prix_public=15_000,
                      quantite_stock=10),
            m.Produit(id=32, reference="999", nom="Ancien produit", groupe=1, prix_distributeur=5_000, etat=Etat.SUPPRIME),
        ])
        db.commit()


def _etape(client, h, **donnees):
    return client.put("/api/distributeur/souscription", json=donnees, headers=h)


def test_assistant_sauvegarde_chaque_etape_et_reprend(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    assert client.get("/api/distributeur/souscription", headers=h).json() is None
    r = _etape(client, h, etape=1, objectifs="Payer les études des enfants")
    assert r.status_code == 200, r.text
    assert r.json()["reference"].startswith("SOA") and r.json()["etape_courante"] == 2
    _etape(client, h, etape=2, mon_histoire="Je me lance")
    _etape(client, h, etape=3, disponibilite_hebdo=2)

    prospects = [{"nom_prenom": "Grace Mabiala", "telephone": "061234567"}, {"nom_prenom": "Jo", "email": "jo@x.cg"}]
    _etape(client, h, etape=4, prospects=prospects, date_limite_complement="2026-10-15")
    s = client.get("/api/distributeur/souscription", headers=h).json()
    # règle legacy : seuls les noms de plus de 5 caractères sont enregistrés
    assert [p["nom_prenom"] for p in s["prospects"]] == ["Grace Mabiala"]
    # correctif : une nouvelle sauvegarde met la liste à jour (modification + retrait)
    _etape(client, h, etape=4, prospects=[{"nom_prenom": "Grace Mabiala", "telephone": "055000111"}])
    s = client.get("/api/distributeur/souscription", headers=h).json()
    assert len(s["prospects"]) == 1 and s["prospects"][0]["telephone"] == "055000111"

    heure = "18 h 30, après le travail"  # plus de troncature à 8 caractères
    _etape(client, h, etape=5, formations=[{"prestation": 2, "date": "2026-10-20", "lieu": "Bacongo", "heure": heure}])
    # « Précédent » : sauvegarde sans faire avancer la progression
    _etape(client, h, etape=7, nombre_rdv=4, avancer=False)
    s = client.get("/api/distributeur/souscription", headers=h).json()
    assert s["etape_courante"] == 6 and s["nombre_rdv"] == 4
    assert len(s["formations"]) == 4 and s["formations"][1] == {"prestation": 2, "date": "2026-10-20", "lieu": "Bacongo", "heure": heure}
    assert s["objectifs"] == "Payer les études des enfants" and s["mon_histoire"] == "Je me lance"
    assert s["disponibilite_hebdo"] == 2

    _etape(client, h, etape=8, filleuls=[{"nom": "Mireille", "montant": 150_000}])
    s = client.get("/api/distributeur/souscription", headers=h).json()
    assert s["filleuls"][0]["montant"] == 150_000 and s["etape_courante"] == 9


def test_envoi_controles_cumules_et_sauvegarde_sans_controle(client):
    _produits()
    creer_membre("awa")
    h = entetes(client, "awa")
    r = _etape(client, h, etape=9, produits=[{"produit_id": 31, "quantite": 1}], envoyer=True)
    assert r.status_code == 400
    champs = r.json()["champs"]
    assert champs["mode_souscription"] == "Veuillez indiquer le mode de souscription."
    assert champs["produits"] == "Le montant de souscription ne peut être inférieur à 56 000 FCFA."

    r = _etape(client, h, etape=9, mode_souscription=2, produits=[{"produit_id": 30, "quantite": 3}], envoyer=True)
    assert r.json()["champs"]["produits"] == "Pour une souscription à crédit le montant ne peut être supérieur à 66 000 FCFA."

    # « Sauvegarder » : aucun contrôle ; montant recalculé côté serveur
    r = _etape(client, h, etape=9, produits=[{"produit_id": 31, "quantite": 1}])
    assert r.status_code == 200 and r.json()["message"] == "Opération effectuée." and r.json()["montant"] == 10_000
    # produit retiré refusé
    assert _etape(client, h, etape=9, produits=[{"produit_id": 32, "quantite": 1}]).status_code == 400
    kit = client.get("/api/distributeur/kit", headers=h).json()
    assert [p["id"] for p in kit] == [31, 30]  # tous les produits actifs, triés par nom


def test_souscription_fonds_propres_payee_rend_distributeur(client):
    _produits()
    creer_membre("awa")
    creer_membre("caisse", type_compte=TypeMembre.GESTIONNAIRE, droit_caisse=True)
    h = entetes(client, "awa")
    # payer avant d'envoyer : refusé
    _etape(client, h, etape=9, mode_souscription=1, produits=[{"produit_id": 30, "quantite": 2}])
    sid = client.get("/api/distributeur/souscription", headers=h).json()["id"]
    assert client.post("/api/paiements", json={"type_objet": 6, "objet_id": sid, "mode": 1}, headers=h).status_code == 400

    r = _etape(client, h, etape=9, mode_souscription=1, produits=[{"produit_id": 30, "quantite": 2}], envoyer=True)
    assert r.status_code == 200 and r.json()["a_payer"] is True and r.json()["etape_courante"] == 10
    prep = client.get(f"/api/paiements/preparer?type_objet=6&objet_id={sid}", headers=h).json()
    assert prep["montant"] == 56_000 and prep["retour"] == "/devenir-distributeur/adhesion"
    r = client.post("/api/paiements", json={"type_objet": 6, "objet_id": sid, "mode": 1}, headers=h)
    assert r.status_code == 201, r.text
    s = client.get("/api/distributeur/souscription", headers=h).json()
    assert s["etat"] == 2 and s["etat_paiement"] == 2 and s["kit"][0]["montant"] == 56_000
    statut = client.get("/api/distributeur/statut", headers=h).json()
    assert statut["distributeur"] is True
    # le prix distributeur s'applique désormais dans la boutique
    assert next(p for p in client.get("/api/boutique/produits", headers=h).json()["items"] if p["id"] == 31)["prix"] == 10_000
    # kit verrouillé, second paiement refusé
    assert _etape(client, h, etape=9, mode_souscription=1, produits=[{"produit_id": 30, "quantite": 3}]).status_code == 400
    assert client.post("/api/paiements", json={"type_objet": 6, "objet_id": sid, "mode": 1}, headers=h).status_code == 400
    # rejet par la caisse : la souscription redevient « Non traitée »
    assert client.post(f"/api/paiements/{r.json()['id']}/rejeter", headers=entetes(client, "caisse")).status_code == 200
    assert client.get("/api/distributeur/statut", headers=h).json()["distributeur"] is False


def test_credit_suivi_par_les_gestionnaires(client):
    _produits()
    creer_membre("awa", nom="Awa Mabiala", telephone="061234567")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    h = entetes(client, "awa")
    r = _etape(client, h, etape=9, mode_souscription=2, produits=[{"produit_id": 30, "quantite": 2}], envoyer=True)
    assert r.status_code == 200 and r.json()["a_payer"] is False and "crédit" in r.json()["message"]
    sid = r.json()["id"]
    # pas de paiement en ligne pour un crédit
    assert client.post("/api/paiements", json={"type_objet": 6, "objet_id": sid, "mode": 1}, headers=h).status_code == 400
    # la frangine est prévenue dans la messagerie du membre
    ha = entetes(client, "admin")
    assert client.get("/api/espace/compteurs", headers=ha).json()["messages_non_lus"] == 1

    assert client.get("/api/distributeur/souscriptions", headers=h).status_code == 403
    suivi = client.get("/api/distributeur/souscriptions?mode=2&envoyees=true", headers=ha).json()
    assert suivi["total"] == 1
    ligne = suivi["items"][0]
    assert ligne["etat"] == 1 and ligne["envoyee"] is True and ligne["membre"]["telephone"] == "061234567"
    assert client.get("/api/distributeur/souscriptions?q=mabiala", headers=ha).json()["total"] == 1
    assert client.get(f"/api/distributeur/souscriptions/{sid}", headers=ha).json()["kit"][0]["quantite"] == 2

    refus = client.post(f"/api/distributeur/souscriptions/{sid}/etat", json={"etat": 2}, headers=entetes(client, "admin_sans_droit"))
    assert refus.status_code == 403
    assert client.post(f"/api/distributeur/souscriptions/{sid}/etat", json={"etat": 2}, headers=ha).status_code == 200
    assert client.get("/api/distributeur/statut", headers=h).json()["distributeur"] is True


def test_acces_reserve_aux_membres(client):
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    creer_membre("awa")
    creer_membre("curieux")
    assert client.put("/api/distributeur/souscription", json={"etape": 1}).status_code == 401
    assert client.get("/api/distributeur/statut").json() == {"connecte": False, "gestionnaire": False, "distributeur": False,
                                                             "souscription": None}
    assert _etape(client, entetes(client, "admin"), etape=1, objectifs="x").status_code == 403
    sid = _etape(client, entetes(client, "awa"), etape=1).json()["id"]
    assert client.get(f"/api/distributeur/souscriptions/{sid}", headers=entetes(client, "curieux")).status_code == 404
