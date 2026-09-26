import io
from datetime import date, timedelta

from conftest import creer_membre, entetes
from PIL import Image

from app.db import SessionLocal
from app.enums import TypeMembre
from app.models import Entreprise, Publicite

AUJOURDHUI = date.today()


def _entreprise(nom="CECILIA &amp; SARICKA") -> int:
    with SessionLocal() as db:
        e = Entreprise(nom=nom, etat=2)
        db.add(e)
        db.commit()
        return e.id


def _png() -> bytes:
    tampon = io.BytesIO()
    Image.new("RGB", (40, 30), "orange").save(tampon, "PNG")
    return tampon.getvalue()


def _pub(demandeur: int, entreprise: int, **kw) -> dict:
    return {
        "demandeur_id": demandeur, "entreprise_id": entreprise, "texte": "Pour la beauté de vos enfants",
        "date_debut": str(AUJOURDHUI - timedelta(days=1)), "date_fin": str(AUJOURDHUI + timedelta(days=30)),
        "type_fichier": 1, **kw,
    }


def _inserer(n: int, entreprise: int, **kw) -> None:
    with SessionLocal() as db:
        for i in range(n):
            db.add(Publicite(reference=f"PUB{i}", entreprise_id=entreprise, texte=f"Publicité {i}", etat=2,
                             date_debut=AUJOURDHUI - timedelta(days=1), date_fin=AUJOURDHUI + timedelta(days=1), **kw))
        db.commit()


def test_creation_regles_reference_et_etat_initial(client):
    ent = _entreprise()
    admin = creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    creer_membre("chef", type_compte=TypeMembre.GESTIONNAIRE, droit_activation=True)
    creer_membre("awa")
    ha = entetes(client, "admin")

    assert client.post("/api/publicites", json=_pub(admin, ent), headers=entetes(client, "awa")).status_code == 403
    r = client.post("/api/publicites", json=_pub(None, None, texte="Court", date_debut=None, type_fichier=None), headers=ha)
    assert r.status_code == 400
    assert {"demandeur_id", "entreprise_id", "texte", "date_debut", "type_fichier"} <= set(r.json()["champs"])
    # correctif F-ADM-36 : la fin ne peut pas précéder le début
    r = client.post("/api/publicites", json=_pub(admin, ent, date_fin=str(AUJOURDHUI - timedelta(days=5))), headers=ha)
    assert r.status_code == 400 and "date_fin" in r.json()["champs"]
    r = client.post("/api/publicites", json=_pub(admin, ent, lien="javascript:alert(1)"), headers=ha)
    assert r.status_code == 400 and "lien" in r.json()["champs"]

    # sans droit Activation : l'état demandé est ignoré (état 1)
    r = client.post("/api/publicites", json=_pub(admin, ent, etat=2), headers=ha)
    assert r.status_code == 201 and r.json()["reference"].startswith("PUB")
    id_ = r.json()["id"]
    assert client.get(f"/api/publicites/{id_}", headers=ha).json()["etat"] == 1
    # doublon de texte
    r = client.post("/api/publicites", json=_pub(admin, ent), headers=ha)
    assert r.status_code == 400 and r.json()["message"] == "Cette publicité est déjà enregistrée."
    # avec droit Activation : l'état choisi est appliqué
    r = client.post("/api/publicites", json=_pub(admin, ent, texte="Nouvelle boutique à Poto-Poto", etat=2),
                    headers=entetes(client, "chef"))
    assert client.get(f"/api/publicites/{r.json()['id']}", headers=ha).json()["etat"] == 2
    # modification + changement d'état réservé au droit Activation
    r = client.put(f"/api/publicites/{id_}", json=_pub(admin, ent, texte="Texte corrigé de la publicité"), headers=ha)
    assert r.status_code == 200
    assert client.post(f"/api/publicites/{id_}/etat", json={"etat": 2}, headers=ha).status_code == 403
    assert client.post(f"/api/publicites/{id_}/etat", json={"etat": 2}, headers=entetes(client, "chef")).status_code == 200
    assert client.delete(f"/api/publicites/{id_}", headers=ha).status_code == 403


def test_diffusion_publique(client):
    ent = _entreprise()
    _inserer(12, ent)
    with SessionLocal() as db:
        db.add(Publicite(reference="PUBX", entreprise_id=ent, texte="Expirée", etat=2,
                         date_debut=AUJOURDHUI - timedelta(days=10), date_fin=AUJOURDHUI - timedelta(days=1)))
        db.add(Publicite(reference="PUBY", entreprise_id=ent, texte="Non validée", etat=1,
                         date_debut=AUJOURDHUI, date_fin=AUJOURDHUI))
        db.commit()
    encart = client.get("/api/publicites/diffusion").json()
    assert len(encart) == 10  # au plus 10 (F-TRV-04)
    assert all(p["texte"].startswith("Publicité") for p in encart)
    assert encart[0]["annonceur"] == "CECILIA & SARICKA"
    assert "nombre_vues" not in encart[0] and "demandeur" not in encart[0]
    assert len(client.get("/api/publicites/diffusion?limite=50").json()) == 12
    # la publicité expirée n'est pas consultable par le public
    with SessionLocal() as db:
        expiree = db.query(Publicite).filter_by(reference="PUBX").one().id
    assert client.get(f"/api/publicites/{expiree}").status_code == 404


def test_vues_comptees_pour_le_public_seulement(client):
    ent = _entreprise()
    admin = creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    _inserer(1, ent, demandeur_id=admin)
    id_ = client.get("/api/publicites/diffusion").json()[0]["id"]
    public = client.get(f"/api/publicites/{id_}").json()
    assert public["nombre_vues"] is None and public["demandeur"] is None and public["en_diffusion"] is True
    client.get(f"/api/publicites/{id_}")
    client.get(f"/api/publicites/{id_}", headers={"User-Agent": "Googlebot/2.1"})  # robot : ignoré
    admin_vue = client.get(f"/api/publicites/{id_}", headers=entetes(client, "admin")).json()
    assert admin_vue["nombre_vues"] == 2 and admin_vue["date_derniere_vue"] and admin_vue["peut_gerer"]


def test_fichier_conforme_au_type(client):
    ent = _entreprise()
    admin = creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    ha = entetes(client, "admin")
    id_ = client.post("/api/publicites", json=_pub(admin, ent, type_fichier=2), headers=ha).json()["id"]
    # une image pour une publicité « Son » est refusée
    r = client.post(f"/api/publicites/{id_}/fichier", files={"fichier": ("a.png", _png(), "image/png")}, headers=ha)
    assert r.status_code == 400 and "Son" in r.json()["message"]
    mp3 = b"ID3" + b"\x00" * 64
    r = client.post(f"/api/publicites/{id_}/fichier", files={"fichier": ("a.mp3", mp3, "audio/mpeg")}, headers=ha)
    assert r.status_code == 200, r.text
    d = client.get(f"/api/publicites/{id_}", headers=ha).json()
    assert d["genre"] == "son" and d["fichier_url"].endswith(".mp3")
    # passage en vidéo : le fichier MP4 est accepté
    client.put(f"/api/publicites/{id_}", json=_pub(admin, ent, type_fichier=3), headers=ha)
    mp4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64
    r = client.post(f"/api/publicites/{id_}/fichier", files={"fichier": ("v.mp4", mp4, "video/mp4")}, headers=ha)
    assert r.status_code == 200
    assert client.get(f"/api/publicites/{id_}", headers=ha).json()["genre"] == "video"


def test_filtres_de_gestion(client):
    ent1, ent2 = _entreprise("Boutique A"), _entreprise("Boutique B")
    admin = creer_membre("admin", type_compte=TypeMembre.GESTIONNAIRE)
    awa = creer_membre("awa")
    ha = entetes(client, "admin")
    client.post("/api/publicites", json=_pub(admin, ent1, texte="Soldes de la boutique A"), headers=ha)
    client.post("/api/publicites", json=_pub(awa, ent2, texte="Ouverture de la boutique B",
                                             date_debut="2030-01-01", date_fin="2030-02-01"), headers=ha)
    assert client.get("/api/publicites", headers=ha).json()["total"] == 2
    assert client.get(f"/api/publicites?entreprise_id={ent2}", headers=ha).json()["total"] == 1
    assert client.get(f"/api/publicites?demandeur_id={awa}", headers=ha).json()["total"] == 1
    assert client.get("/api/publicites?debut_du=2029-12-01&debut_au=2030-01-31", headers=ha).json()["total"] == 1
    assert client.get("/api/publicites?fin_au=2029-01-01", headers=ha).json()["total"] == 1
    assert client.get("/api/publicites?vues_min=1", headers=ha).json()["total"] == 0
    assert client.get("/api/publicites?q=soldes", headers=ha).json()["total"] == 1
    # un membre demandeur ne voit que ses publicités
    assert client.get("/api/publicites", headers=entetes(client, "awa")).json()["total"] == 1
    choix = client.get("/api/publicites/choix", headers=ha).json()
    assert len(choix["membres"]) == 2 and len(choix["entreprises"]) == 2
