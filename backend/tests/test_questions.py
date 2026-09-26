from conftest import creer_membre, entetes

from app.enums import TypeMembre

SUJET = {"confidentialite": 2, "objet": "Ouvrir un compte bancaire", "texte": "Quels papiers faut-il pour ouvrir un compte d'entreprise ?"}
PRIVE = {"confidentialite": 1, "objet": "Mon projet de boulangerie", "texte": "J'aimerais un avis confidentiel sur mon projet de boulangerie."}


def test_creation_regles_reference_et_doublon(client):
    creer_membre("awa")
    h = entetes(client, "awa")
    assert client.post("/api/questions", json=SUJET).status_code == 401
    r = client.post("/api/questions", json={"confidentialite": None, "objet": "Aide", "texte": "Trop court"}, headers=h)
    assert r.status_code == 400
    champs = r.json()["champs"]
    assert champs["objet"] == "L'objet du conseil doit avoir 5 caractères minimum."
    assert champs["texte"] == "Le texte du conseil doit avoir 20 caractères minimum."
    assert "confidentialite" in champs

    r = client.post("/api/questions", json=SUJET, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["reference"].startswith("CSL")
    # Même objet (casse différente) : refusé
    r = client.post("/api/questions", json={**SUJET, "objet": "ouvrir un COMPTE bancaire"}, headers=h)
    assert r.status_code == 400 and r.json()["message"] == "Cette fiche est déjà enregistrée."
    detail = client.get(f"/api/questions/{client.get('/api/questions').json()['items'][0]['id']}").json()
    assert detail["etat"] == 2  # publié immédiatement (F-S1-11)


def test_sujet_prive_visible_seulement_auteur_et_gestionnaire(client):
    creer_membre("awa")
    creer_membre("curieux")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    h = entetes(client, "awa")
    id_prive = client.post("/api/questions", json=PRIVE, headers=h).json()["id"]
    client.post("/api/questions", json=SUJET, headers=h)

    # Visiteur et autre membre : ni dans la liste, ni la recherche, ni le détail (ADR-0007 S1a)
    assert client.get("/api/questions").json()["total"] == 1
    assert client.get("/api/questions?q=boulangerie").json()["total"] == 0
    assert client.get(f"/api/questions/{id_prive}").status_code == 404
    hc = entetes(client, "curieux")
    assert client.get(f"/api/questions/{id_prive}", headers=hc).status_code == 404
    assert client.post(f"/api/questions/{id_prive}/reponses", json={"texte": "Coucou"}, headers=hc).status_code == 404
    assert client.get("/api/questions/derniers").json()[0]["objet"] == SUJET["objet"]
    assert client.get("/api/questions/compteurs").json() == {"sujets": 1}

    # Auteur et gestionnaire
    assert client.get("/api/questions", headers=h).json()["total"] == 2
    ha = entetes(client, "admin")
    admin = client.get(f"/api/questions/{id_prive}", headers=ha).json()
    assert admin["texte"] == PRIVE["texte"] and admin["auteur_nom"] == "Awa Test"
    # La frangine est prévenue d'une question privée (message dans le fil de l'auteur)
    assert client.get("/api/espace/compteurs", headers=ha).json()["messages_non_lus"] == 1


def test_nom_reel_reserve(client):
    creer_membre("awa", pseudonyme="awa_b")
    creer_membre("master", type_compte=TypeMembre.MASTER)
    id_ = client.post("/api/questions", json=SUJET, headers=entetes(client, "awa")).json()["id"]
    public = client.get(f"/api/questions/{id_}").json()
    assert public["auteur"]["pseudonyme"] == "awa_b" and public["auteur_nom"] is None
    assert "telephone" not in public["auteur"]
    assert client.get(f"/api/questions/{id_}", headers=entetes(client, "master")).json()["auteur_nom"] == "Awa Test"


def test_reponses_heritage_compteur_notification(client):
    creer_membre("awa")
    creer_membre("bob")
    ha, hb = entetes(client, "awa"), entetes(client, "bob")
    id_ = client.post("/api/questions", json=SUJET, headers=ha).json()["id"]
    assert client.post(f"/api/questions/{id_}/reponses", json={"texte": "x"}, headers=hb).json()["champs"]["texte"] == (
        "Le commentaire doit avoir 2 caractères minimum."
    )
    r = client.post(f"/api/questions/{id_}/reponses", json={"texte": "Un Kbis et une pièce d'identité."}, headers=hb)
    assert r.status_code == 201
    rid = r.json()["id"]
    assert client.post(f"/api/questions/{id_}/reponses", json={"texte": "Un Kbis et une pièce d'identité."}, headers=hb).status_code == 400
    detail = client.get(f"/api/questions/{id_}").json()
    assert detail["nombre_reponses"] == 1 and detail["reponses"][0]["texte"].startswith("Un Kbis")
    assert detail["peut_repondre"] is False  # visiteur : il faut un compte
    # l'auteur du sujet est prévenu
    assert client.get("/api/espace/compteurs", headers=ha).json()["messages_non_lus"] == 1
    # modification de sa réponse (sans contrainte de 20 caractères, F-S1-16), pas celle des autres
    assert client.put(f"/api/questions/reponses/{rid}", json={"texte": "OK"}, headers=hb).status_code == 200
    assert client.put(f"/api/questions/reponses/{rid}", json={"texte": "Pirate"}, headers=ha).status_code == 403
    # suppression logique : le compteur est recalculé
    assert client.delete(f"/api/questions/reponses/{rid}", headers=hb).status_code == 200
    detail = client.get(f"/api/questions/{id_}").json()
    assert detail["nombre_reponses"] == 0 and detail["reponses"] == []


def test_confidentialite_heritee_et_modification(client):
    creer_membre("awa")
    creer_membre("bob")
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    ha = entetes(client, "awa")
    id_ = client.post("/api/questions", json=SUJET, headers=ha).json()["id"]
    client.post(f"/api/questions/{id_}/reponses", json={"texte": "Réponse publique"}, headers=entetes(client, "bob"))
    # autre membre : interdit
    assert client.put(f"/api/questions/{id_}", json=SUJET | {"texte": "x" * 30}, headers=entetes(client, "bob")).status_code == 403
    # l'auteur passe le sujet en privé : sujet et réponses disparaissent du public
    r = client.put(f"/api/questions/{id_}", json={**SUJET, "confidentialite": 1}, headers=ha)
    assert r.status_code == 200 and r.json()["message"] == "Modification effectuée."
    assert client.get(f"/api/questions/{id_}").status_code == 404
    detail = client.get(f"/api/questions/{id_}", headers=entetes(client, "admin")).json()
    assert detail["confidentialite"] == 1 and len(detail["reponses"]) == 1


def test_moderation_et_cloture(client):
    creer_membre("awa")
    creer_membre("admin_sans_droit", type_compte=TypeMembre.GESTIONNAIRE)
    creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    ha = entetes(client, "awa")
    id_ = client.post("/api/questions", json=SUJET, headers=ha).json()["id"]
    assert client.post(f"/api/questions/{id_}/etat", json={"etat": 3}, headers=entetes(client, "admin_sans_droit")).status_code == 403
    hadm = entetes(client, "admin")
    # Clôturé : toujours lisible, plus de réponse
    assert client.post(f"/api/questions/{id_}/etat", json={"etat": 4}, headers=hadm).status_code == 200
    assert client.get(f"/api/questions/{id_}").status_code == 200
    r = client.post(f"/api/questions/{id_}/reponses", json={"texte": "Encore une question"}, headers=ha)
    assert r.status_code == 400 and "clôturé" in r.json()["message"]
    # Non traité : masqué au public, visible de l'auteur
    client.post(f"/api/questions/{id_}/etat", json={"etat": 1}, headers=hadm)
    assert client.get(f"/api/questions/{id_}").status_code == 404
    assert client.get(f"/api/questions/{id_}", headers=ha).status_code == 200
    # Suppression logique par le gestionnaire habilité
    assert client.delete(f"/api/questions/{id_}", headers=hadm).status_code == 200
    assert client.get(f"/api/questions/{id_}", headers=ha).status_code == 404
    assert client.get("/api/questions", headers=hadm).json()["total"] == 0
    assert client.get("/api/questions?etat=3", headers=hadm).json()["total"] == 1
