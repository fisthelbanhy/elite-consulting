"""Diagnostic gratuit (ADR-0008 : CTA principal du site).

Huit questions courtes reprenant les questions clés de la Découverte de soi. Les réponses sont
des codes ; ce module est la source unique des libellés (le frontend affiche les questions
renvoyées par `GET /api/decouverte/diagnostic/questions`), de la restitution (profil + trois
prochaines étapes) et du report des réponses dans la fiche `soungangai` du membre.
"""

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.erreurs import erreur
from app.models import Soungangai, Ville
from app.schemas.decouverte import (
    DiagnosticEntree,
    Etape,
    OptionDiagnostic,
    Profil,
    QuestionDiagnostic,
    QuestionReponse,
    Restitution,
)

AUTRE_VILLE = 1  # « Autre ville » du référentiel legacy

# (clé, question, aide, [(code, libellé, description)]) — l'ordre est celui des écrans
_QUESTIONS: list[tuple[str, str, str | None, list[tuple[str, str, str | None]]]] = [
    ("activite", "Que faites-vous actuellement ?", "Choisissez ce qui vous ressemble le plus.", [
        ("salarie", "Je suis salarié·e", "Dans une entreprise, une administration, une ONG…"),
        ("independant", "J'ai déjà une petite activité", "Commerce, service, artisanat, même informel"),
        ("etudiant", "Je suis étudiant·e ou en formation", None),
        ("recherche", "Je cherche du travail", None),
        ("autre", "Autre situation", "Au foyer, à la retraite…"),
    ]),
    ("savoir_faire", "Qu'est-ce que vous savez bien faire ?", "Votre talent, ce pour quoi on vient vous voir.", [
        ("commerce", "Vendre, faire du commerce", None),
        ("cuisine", "Cuisine, pâtisserie, restauration", None),
        ("beaute", "Couture, mode, coiffure, beauté", None),
        ("agriculture", "Agriculture, élevage, pêche", None),
        ("artisanat", "Bâtiment, menuiserie, mécanique", None),
        ("numerique", "Informatique, numérique, communication", None),
        ("services", "Services : transport, nettoyage, garde d'enfants…", None),
        ("conseil", "Enseigner, conseiller, gérer", None),
        ("autre", "Autre chose", "Vous préciserez à votre conseillère"),
    ]),
    ("stade", "Où en est votre projet ?", None, [
        ("cherche", "Je cherche encore une idée", None),
        ("idee", "J'ai une idée, mais je n'ai pas commencé", None),
        ("debut", "J'ai commencé, je vends un peu", None),
        ("croissance", "Mon activité tourne, je veux la développer", None),
    ]),
    ("besoin", "De quoi avez-vous le plus besoin aujourd'hui ?", "Une seule réponse : la plus urgente.", [
        ("financement", "Trouver de l'argent", "Pour démarrer, acheter du stock ou du matériel"),
        ("clients", "Trouver des clients", "Commandes, marchés, visibilité"),
        ("organisation", "Mieux m'organiser", "Gestion, prix, épargne, temps"),
        ("formalisation", "Formaliser mon activité", "Papiers, statut, business plan"),
    ]),
    ("disponibilite", "Combien de temps pouvez-vous y consacrer ?", None, [
        ("moins5", "Moins de 5 heures par semaine", "Le soir ou le week-end"),
        ("partiel", "5 à 20 heures par semaine", None),
        ("plein", "Presque à plein temps", None),
    ]),
    ("moyens", "De quels moyens disposez-vous pour démarrer ?", None, [
        ("rien", "Rien pour l'instant", "Ce n'est pas un problème : on part de là"),
        ("epargne", "Un peu d'épargne", "Moins de 100 000 FCFA"),
        ("epargne_plus", "Une épargne plus importante", "100 000 FCFA ou plus"),
        ("materiel", "Du matériel, un local ou du stock", None),
    ]),
    ("soutien", "Votre entourage vous soutient-il dans ce projet ?", "Famille, conjoint, amis.", [
        ("oui", "Oui, ils m'encouragent", None),
        ("partiel", "Certains oui, d'autres non", None),
        ("non", "Pas vraiment", None),
    ]),
    ("ville", "Dans quelle ville êtes-vous ?", "Pour vous orienter vers les bonnes personnes près de chez vous.", []),
]

_PROFILS = {
    "cherche": (
        "Explorateur·rice",
        "Vous avez envie d'entreprendre mais l'idée n'est pas encore claire. C'est le bon moment pour "
        "faire le point sur vos talents : beaucoup de réussites partent d'un savoir-faire qu'on a déjà.",
    ),
    "idee": (
        "Porteur·se d'idée",
        "Vous avez une idée : avant d'engager de l'argent, il faut la tester auprès de quelques clients "
        "et la chiffrer. Votre frangine vous aide à le faire pas à pas.",
    ),
    "debut": (
        "Entrepreneur·e qui démarre",
        "Vous vendez déjà : bravo, c'est le plus difficile. L'enjeu est maintenant de sécuriser vos "
        "revenus, de séparer l'argent de l'activité de celui de la maison et de fidéliser vos clients.",
    ),
    "croissance": (
        "Entrepreneur·e en croissance",
        "Votre activité tourne. Pour passer un cap, il faut structurer : des chiffres clairs, un dossier "
        "solide pour les financeurs et de nouveaux marchés.",
    ),
}

_ETAPES = {
    "decouverte": ("Faire votre bilan « Découverte de soi »",
                   "26 questions pour mieux vous connaître, relues par votre conseillère.", "/decouverte-de-soi"),
    "business_plan": ("Écrire votre business plan",
                      "Pas à pas, pour chiffrer votre idée et convaincre un financeur.", "/business-plan"),
    "likelemba": ("Épargner avec une Likelemba",
                  "Constituez votre capital avec un groupe de confiance, sans cahier ni dispute.", "/likelemba"),
    "projets": ("Présenter votre projet aux membres",
                "Famille, amis, diaspora : montrez où va chaque franc et recevez leur soutien.", "/projets"),
    "accompagnement": ("Monter un dossier de financement",
                       "Votre conseillère prépare avec vous un dossier bancable.", "/accompagnement"),
    "marches": ("Répondre à des marchés",
                "Appels d'offres publics et privés, près de chez vous.", "/marches"),
    "entreprises": ("Faire connaître votre activité",
                    "Inscrivez-vous dans l'annuaire : clients et partenaires vous trouvent.", "/entreprises"),
    "partenariats": ("Trouver des partenaires",
                     "« J'ai… je cherche… » : échangez services, matériel et contacts.", "/partenariats"),
    "emplois": ("Assurer un revenu en attendant",
                "Des offres d'emploi relues par nos équipes, sans arnaque.", "/emplois"),
    "questions": ("Poser vos questions",
                  "Les membres et la frangine partagent leurs conseils, en public ou en privé.", "/questions"),
    "reussites": ("Vous inspirer de ceux qui ont réussi",
                  "Ils se sont lancés avant vous et racontent leur parcours.", "/reussites"),
    "conseil_financier": ("Demander conseil sur l'argent",
                          "Crédit, banque, trésorerie : un conseiller vous répond.", "/conseil-financier"),
}

_ETAPES_PAR_BESOIN = {
    "financement": ["likelemba", "business_plan", "projets", "accompagnement"],
    "clients": ["marches", "entreprises", "partenariats"],
    "organisation": ["likelemba", "conseil_financier", "questions"],
    "formalisation": ["business_plan", "accompagnement", "conseil_financier"],
}

# Correspondance avec les questions Oui/Non de la fiche (1 = Oui, 2 = Non)
_SOUTIEN_OUI_NON = {"oui": 1, "non": 2}


def villes(db: Session) -> list[OptionDiagnostic]:
    lignes = db.scalars(select(Ville).order_by(Ville.nom)).all()
    # Les deux grandes villes d'abord, « Autre ville » en dernier
    ordre = {"brazzaville": 0, "pointe-noire": 1}
    lignes = sorted(lignes, key=lambda v: (v.id == AUTRE_VILLE, ordre.get(v.nom.lower(), 2), v.nom))
    return [OptionDiagnostic(code=str(v.id), libelle=_capitaliser(v.nom)) for v in lignes]


def _capitaliser(nom: str) -> str:
    """« Pointe-noire » → « Pointe-Noire »."""
    return "-".join(p[:1].upper() + p[1:] for p in nom.split("-"))


def questions(db: Session) -> list[QuestionDiagnostic]:
    resultat = []
    for cle, question, aide, options in _QUESTIONS:
        opts = villes(db) if cle == "ville" else [OptionDiagnostic(code=c, libelle=li, description=d) for c, li, d in options]
        resultat.append(QuestionDiagnostic(cle=cle, question=question, aide=aide, options=opts))
    return resultat


def _libelles(qs: Sequence[QuestionDiagnostic]) -> dict[str, dict[str, str]]:
    return {q.cle: {o.code: o.libelle for o in q.options} for q in qs}


def valider(db: Session, d: DiagnosticEntree) -> dict[str, str]:
    """Contrôle chaque réponse contre la liste des choix ; renvoie les codes validés."""
    libelles = _libelles(questions(db))
    codes = d.model_dump()
    champs = {cle: "Veuillez répondre à cette question." for cle, choix in libelles.items() if codes.get(cle) not in choix}
    if champs:
        raise erreur("Le diagnostic est incomplet.", **champs)
    return {cle: codes[cle] for cle in libelles}


def restitution(db: Session, codes: dict[str, str]) -> Restitution:
    """Profil + points d'appui + points d'attention + 3 prochaines étapes (liens du site)."""
    qs = questions(db)
    libelles = _libelles(qs)
    lib = {cle: libelles[cle][code] for cle, code in codes.items() if cle in libelles}
    titre, texte = _PROFILS[codes["stade"]]

    forces: list[str] = []
    attentions: list[str] = []
    if codes["savoir_faire"] != "autre":
        forces.append(f"Un savoir-faire sur lequel bâtir : {lib['savoir_faire'].lower()}.")
    else:
        forces.append("Un savoir-faire bien à vous : parlez-en à votre conseillère.")
    if codes["stade"] in ("debut", "croissance"):
        forces.append("Vous avez déjà des clients : votre idée est validée par le marché.")
    if codes["soutien"] == "oui":
        forces.append("Le soutien de votre entourage, un vrai atout dans les moments difficiles.")
    if codes["disponibilite"] == "plein":
        forces.append("Du temps à consacrer à votre projet.")
    if codes["moyens"] in ("epargne_plus", "materiel"):
        forces.append("Des moyens pour démarrer sans dépendre d'un crédit.")

    if codes["moyens"] == "rien":
        attentions.append("Pas encore d'épargne : commencez petit et épargnez régulièrement, par exemple en Likelemba.")
    if codes["disponibilite"] == "moins5":
        attentions.append("Peu de temps disponible : choisissez une activité que vous pouvez tester le soir ou le week-end.")
    if codes["soutien"] == "non":
        attentions.append("Vous vous sentez seul·e : c'est justement le rôle de votre frangine de vous épauler.")
    if codes["stade"] == "cherche":
        attentions.append("L'idée reste à trouver : partez de ce que vous savez déjà faire et de ce que les gens autour de vous achètent.")
    if codes["stade"] == "idee" and codes["besoin"] == "financement":
        attentions.append("Avant de chercher de l'argent, chiffrez votre idée : c'est la première chose qu'on vous demandera.")

    candidats: list[str] = []
    if codes["stade"] == "cherche":
        candidats += ["decouverte", "reussites"]
    if codes["activite"] in ("recherche", "etudiant") and codes["stade"] in ("cherche", "idee"):
        candidats.append("emplois")
    if codes["stade"] == "idee" and codes["besoin"] == "financement":
        candidats.append("business_plan")
    if codes["stade"] == "croissance" and codes["besoin"] == "financement":
        candidats.append("accompagnement")
    candidats += _ETAPES_PAR_BESOIN[codes["besoin"]]
    if codes["moyens"] == "rien":
        candidats.append("likelemba")
    candidats += ["decouverte", "questions", "reussites"]
    choisies: list[str] = []
    for c in candidats:
        if c not in choisies:
            choisies.append(c)
    etapes = [Etape(titre=_ETAPES[c][0], texte=_ETAPES[c][1], href=_ETAPES[c][2]) for c in choisies[:3]]

    reponses = [QuestionReponse(question=q.question, reponse=lib.get(q.cle, "")) for q in qs]
    resume = (
        f"Profil : {titre}. Activité actuelle : {lib['activite'].lower()}. Savoir-faire : {lib['savoir_faire'].lower()}. "
        f"Projet : {lib['stade'].lower()}. Besoin principal : {lib['besoin'].lower()}. "
        f"Disponibilité : {lib['disponibilite'].lower()}. Moyens : {lib['moyens'].lower()}. "
        f"Soutien de l'entourage : {lib['soutien'].lower()}. Ville : {lib['ville']}."
    )
    return Restitution(
        profil=Profil(titre=titre, texte=texte), forces=forces[:3], attentions=attentions[:3],
        etapes=etapes, reponses=reponses, resume=resume,
    )


def appliquer(db: Session, fiche: Soungangai, codes: dict[str, str], r: Restitution) -> None:
    """Complète la fiche Découverte de soi sans écraser ce que le membre a déjà écrit."""
    libelles = _libelles(questions(db))
    lib = {cle: libelles[cle][code] for cle, code in codes.items()}
    if not fiche.activite_actuelle.strip():
        fiche.activite_actuelle = lib["activite"]
    if not fiche.savoir_faire.strip():
        fiche.savoir_faire = lib["savoir_faire"]
    if not fiche.moyens_disponibles.strip():
        fiche.moyens_disponibles = lib["moyens"]
    if not fiche.entourage_valorise_activite and codes["soutien"] in _SOUTIEN_OUI_NON:
        fiche.entourage_valorise_activite = _SOUTIEN_OUI_NON[codes["soutien"]]
    if not fiche.a_deja_fait_commerce and codes["stade"] in ("debut", "croissance"):
        fiche.a_deja_fait_commerce = 1
    fiche.diagnostic = {"version": 1, "codes": codes, **r.model_dump()}
    fiche.date_diagnostic = datetime.now()


def message_conseillere(r: Restitution) -> str:
    """Texte du message déposé dans le fil du membre pour que la conseillère le rappelle."""
    lignes = [f"• {q.question} {q.reponse}" for q in r.reponses]
    return "\n".join([
        "Nouveau diagnostic",
        f"Profil : {r.profil.titre}",
        *lignes,
        "Prochaines étapes proposées : " + " ; ".join(e.titre for e in r.etapes) + ".",
        "Merci de me rappeler pour construire mon plan d'action.",
    ])
