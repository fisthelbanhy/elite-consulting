from conftest import creer_membre, entetes
from sqlalchemy import func, select

import app.models as m
from app.db import SessionLocal
from app.enums import CategorieMembre, TypeMembre

MESSAGE = "Il faut avoir un compte entreprise pour y avoir accès."


def _societe(client, identifiant: str, nom: str, **kw) -> tuple[dict, int]:
    """Membre personne morale + son entreprise dans l'annuaire."""
    creer_membre(identifiant, categorie=CategorieMembre.MORALE, nom=nom, **kw)
    h = entetes(client, identifiant)
    r = client.post("/api/entreprises", json={"domaine_id": 1, "nom": nom, "forme_juridique": 2, "ville_id": 2,
                                              "telephone": "061112233", "email": f"{identifiant}@exemple.cg"}, headers=h)
    assert r.status_code == 201, r.text
    return h, r.json()["id"]


def _ligne(entreprise_id: int, **kw) -> dict:
    return {"entreprise_id": entreprise_id, "offre_ou_demande": 1, "nouveau_produit": "ciment  50 kg",
            "unite_vente": "Sac", "prix": 5000, "quantite_mensuelle": 200, "fournisseur_ou_client": "Dangote", **kw}


def test_acces_reserve_aux_comptes_entreprise(client):
    creer_membre("particulier")
    creer_membre("morale_sans_entreprise", categorie=CategorieMembre.MORALE)
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    h_soc, _ = _societe(client, "societe", "Kongo Matériaux")

    assert client.get("/api/comparateur/acces").json() == {
        "acces": False, "motif": "visiteur", "message": MESSAGE, "gestionnaire": False, "entreprises": []}
    r = client.get("/api/comparateur/lignes")
    assert r.status_code == 401 and r.json()["message"] == MESSAGE

    h = entetes(client, "particulier")
    assert client.get("/api/comparateur/acces", headers=h).json()["motif"] == "personne_physique"
    r = client.get("/api/comparateur/lignes", headers=h)
    assert r.status_code == 403 and r.json()["message"] == MESSAGE
    h = entetes(client, "morale_sans_entreprise")
    assert client.get("/api/comparateur/acces", headers=h).json()["motif"] == "sans_entreprise"
    assert client.get("/api/comparateur/produits", headers=h).status_code == 403

    acces = client.get("/api/comparateur/acces", headers=h_soc).json()
    assert acces["acces"] is True and acces["entreprises"][0]["nom"] == "Kongo Matériaux"
    assert client.get("/api/comparateur/lignes", headers=h_soc).status_code == 200
    ha = entetes(client, "admin")
    assert client.get("/api/comparateur/acces", headers=ha).json()["gestionnaire"] is True
    assert client.get("/api/comparateur/lignes", headers=ha).status_code == 200


def test_fiche_rattachee_a_l_entreprise_produit_cree_a_la_volee(client):
    h, ent = _societe(client, "societe", "Kongo Matériaux")
    r = client.post("/api/comparateur/lignes", json=_ligne(ent, nouveau_produit="", unite_vente=" ", prix=0), headers=h)
    assert r.status_code == 400
    assert r.json()["champs"] == {"produit_id": "Veuillez indiquer le produit.",
                                  "unite_vente": "Veuillez indiquer l'unité de vente.", "prix": "Veuillez indiquer le prix."}
    r = client.post("/api/comparateur/lignes", json=_ligne(ent, nouveau_produit="Ri"), headers=h)
    assert r.status_code == 400 and "nouveau_produit" in r.json()["champs"]

    r = client.post("/api/comparateur/lignes", json=_ligne(ent), headers=h)
    assert r.status_code == 201 and r.json()["message"] == "Enregistrement effectué."
    with SessionLocal() as db:
        fiche = db.scalar(select(m.FicheProspective))
        assert fiche.entreprise_id == ent  # corrigé : plus l'id du membre (ADR-0007 S6a)
        produit = db.scalar(select(m.ProduitProspective))
        assert produit.nom == "Ciment 50 kg"
    # même produit tapé autrement : réutilisé ; même unité = doublon ; autre unité acceptée
    r = client.post("/api/comparateur/lignes", json=_ligne(ent, nouveau_produit="CIMENT 50 KG", unite_vente="sac"), headers=h)
    assert r.status_code == 400 and "déjà" in r.json()["message"]
    assert client.post("/api/comparateur/lignes", json=_ligne(ent, unite_vente="Tonne", prix=98000), headers=h).status_code == 201
    # la liste l'emporte sur le texte ; une demande du même produit est une autre ligne
    r = client.post("/api/comparateur/lignes", json=_ligne(ent, offre_ou_demande=2, produit_id=produit.id,
                                                           nouveau_produit="Autre chose"), headers=h)
    assert r.status_code == 201
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(m.ProduitProspective)) == 1
        assert db.scalar(select(func.count()).select_from(m.FicheProspective)) == 1

    fiche = client.get("/api/comparateur/ma-fiche", headers=h).json()
    assert fiche["entreprise"]["nom"] == "Kongo Matériaux" and fiche["sigle"] == "societe"
    assert len(fiche["offres"]) == 2 and len(fiche["demandes"]) == 1
    assert fiche["offres"][0]["produit"]["nom"] == "Ciment 50 kg"


def test_comparaison_triee_par_prix_et_limitee_aux_fiches_publiees(client):
    h1, e1 = _societe(client, "societe1", "Kongo Matériaux")
    h2, e2 = _societe(client, "societe2", "Brazza Bâtiment")
    h3, e3 = _societe(client, "societe3", "Pointe Béton")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    client.post("/api/comparateur/lignes", json=_ligne(e1, prix=5200), headers=h1)
    client.post("/api/comparateur/lignes", json=_ligne(e2, prix=4800), headers=h2)
    client.post("/api/comparateur/lignes", json=_ligne(e3, prix=4500), headers=h3)
    client.post("/api/comparateur/lignes", json=_ligne(e2, offre_ou_demande=2, nouveau_produit="Fer à béton", prix=7000), headers=h2)
    # l'entreprise 3 est retirée de l'annuaire par la modération : ses prix disparaissent
    client.post(f"/api/entreprises/{e3}/etat", json={"etat": 1}, headers=entetes(client, "admin"))

    offres = client.get("/api/comparateur/lignes?type=1", headers=h1).json()
    assert offres["total"] == 2
    assert [(li["entreprise"]["nom"], li["prix"]) for li in offres["items"]] == [("Brazza Bâtiment", 4800), ("Kongo Matériaux", 5200)]
    premiere = offres["items"][0]
    assert premiere["produit"]["nom"] == "Ciment 50 kg" and premiere["unite_vente"] == "Sac"
    assert premiere["quantite_mensuelle"] == 200 and premiere["fournisseur_ou_client"] == "Dangote"
    assert premiere["entreprise"]["telephone"] == "061112233"  # pour le bouton « Contacter »
    decroissant = client.get("/api/comparateur/lignes?type=1&tri=prix_desc", headers=h1).json()["items"]
    assert decroissant[0]["prix"] == 5200
    assert client.get("/api/comparateur/lignes?type=2", headers=h1).json()["total"] == 1
    assert client.get("/api/comparateur/lignes?q=fer", headers=h1).json()["total"] == 1
    assert client.get(f"/api/comparateur/lignes?entreprise_id={e2}", headers=h1).json()["total"] == 2

    produits = client.get("/api/comparateur/produits", headers=h1).json()
    ciment = next(p for p in produits if p["nom"] == "Ciment 50 kg")
    assert ciment["offres"] == 2 and ciment["demandes"] == 0
    assert client.get(f"/api/comparateur/lignes?produit_id={ciment['id']}", headers=h1).json()["total"] == 2


def test_seul_le_proprietaire_modifie_ou_supprime_ses_lignes(client):
    h1, e1 = _societe(client, "societe1", "Kongo Matériaux")
    h2, e2 = _societe(client, "societe2", "Brazza Bâtiment")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    id_ = client.post("/api/comparateur/lignes", json=_ligne(e1), headers=h1).json()["id"]

    # un concurrent ne peut ni écrire sur la fiche d'un autre, ni modifier ou supprimer ses lignes (corrigé)
    assert client.post("/api/comparateur/lignes", json=_ligne(e1, prix=1), headers=h2).status_code == 403
    assert client.put(f"/api/comparateur/lignes/{id_}", json=_ligne(e2, prix=1), headers=h2).status_code == 403
    assert client.delete(f"/api/comparateur/lignes/{id_}", headers=h2).status_code == 403
    assert client.get(f"/api/comparateur/ma-fiche?entreprise_id={e1}", headers=h2).status_code == 403
    # sa propre fiche ne montre que ses lignes (corrigé : le legacy listait celles de tout le monde)
    assert client.get("/api/comparateur/ma-fiche", headers=h2).json()["offres"] == []

    r = client.put(f"/api/comparateur/lignes/{id_}", json=_ligne(e1, prix=5500, unite_vente="Sac"), headers=h1)
    assert r.status_code == 200 and r.json()["message"] == "Modification effectuée."
    assert client.get("/api/comparateur/ma-fiche", headers=h1).json()["offres"][0]["prix"] == 5500

    r = client.delete(f"/api/comparateur/lignes/{id_}", headers=h1)
    assert r.status_code == 200
    with SessionLocal() as db:  # suppression physique, comme le legacy
        assert db.get(m.LigneProspective, id_) is None
    # le gestionnaire habilité gère la fiche de n'importe quelle entreprise
    id_ = client.post("/api/comparateur/lignes", json=_ligne(e1), headers=h1).json()["id"]
    ha = entetes(client, "admin")
    assert client.get(f"/api/comparateur/ma-fiche?entreprise_id={e1}", headers=ha).status_code == 200
    assert client.delete(f"/api/comparateur/lignes/{id_}", headers=ha).status_code == 200


def test_ma_fiche_sans_entreprise(client):
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    r = client.get("/api/comparateur/ma-fiche", headers=entetes(client, "admin"))
    assert r.status_code == 400 and "annuaire" in r.json()["message"]


def test_catalogue_des_produits_gere_par_les_gestionnaires(client):
    h, ent = _societe(client, "societe", "Kongo Matériaux")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    ha = entetes(client, "admin")
    assert client.post("/api/comparateur/produits", json={"nom": "Sucre"}, headers=h).status_code == 403
    assert client.post("/api/comparateur/produits", json={"nom": "Sucre"}, headers=entetes(client, "admin_sans_droit")).status_code == 403
    r = client.post("/api/comparateur/produits", json={"nom": "sucre en poudre"}, headers=ha)
    assert r.status_code == 201
    pid = r.json()["id"]
    r = client.post("/api/comparateur/produits", json={"nom": "Sucre en Poudre"}, headers=ha)
    assert r.status_code == 400 and r.json()["message"] == "Ce produit est déjà enregistré."
    assert client.post("/api/comparateur/produits", json={"nom": "Su"}, headers=ha).status_code == 400

    client.post("/api/comparateur/lignes", json=_ligne(ent, produit_id=pid, nouveau_produit=""), headers=h)
    assert client.get("/api/comparateur/lignes", headers=h).json()["total"] == 1
    # un produit retiré disparaît du comparateur et ne peut plus être choisi
    r = client.put(f"/api/comparateur/produits/{pid}", json={"nom": "Sucre en poudre", "etat": 3}, headers=ha)
    assert r.status_code == 200
    assert client.get("/api/comparateur/lignes", headers=h).json()["total"] == 0
    assert client.get("/api/comparateur/produits", headers=h).json() == []
    assert len(client.get("/api/comparateur/produits?tous=true", headers=ha).json()) == 1
    r = client.post("/api/comparateur/lignes", json=_ligne(ent, produit_id=pid, unite_vente="kg"), headers=h)
    assert r.status_code == 400


def test_email_du_gestionnaire_a_l_entreprise(client):
    h, ent = _societe(client, "societe", "Kongo Matériaux")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    ha = entetes(client, "admin")
    url = f"/api/comparateur/entreprises/{ent}/email"
    assert client.post(url, json={"message": "Bonjour, nous avons un client pour votre ciment."}, headers=h).status_code == 403
    r = client.post(url, json={"message": "Trop court"[:9]}, headers=ha)
    assert r.status_code == 400 and r.json()["message"] == "Le message doit avoir 10 caractères minimum."
    r = client.post(url, json={"message": "Bonjour, nous avons un client pour votre ciment."}, headers=ha)
    assert r.status_code == 200 and r.json()["message"] == "Votre opération a bien été envoyée."
    with SessionLocal() as db:
        e = db.get(m.Entreprise, ent)
        e.email = ""
        db.commit()
    r = client.post(url, json={"message": "Bonjour, nous avons un client pour votre ciment."}, headers=ha)
    assert r.status_code == 400 and r.json()["message"] == "Veuillez vérifier l'adresse mail de l'entreprise."
