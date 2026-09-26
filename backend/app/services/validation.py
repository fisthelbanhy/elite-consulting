"""Règles de validation reprises du legacy (`incl-variable.php`)."""

import re

PREFIXES_TELEPHONE = ("01", "04", "05", "06", "22")


def normaliser_telephone(tel: str | None) -> str:
    """Retire espaces, points, tirets et l'indicatif +242 / 00242."""
    if not tel:
        return ""
    t = re.sub(r"[\s.\-()]", "", tel)
    for indicatif in ("+242", "00242"):
        if t.startswith(indicatif):
            t = t[len(indicatif) :]
    return t


def telephone_valide(tel: str | None) -> bool:
    """`phone()` legacy : vide autorisé, sinon 9 chiffres commençant par 01/04/05/06/22."""
    t = normaliser_telephone(tel)
    if not t:
        return True
    return len(t) == 9 and t.isdigit() and t[:2] in PREFIXES_TELEPHONE


MESSAGE_TELEPHONE = "Numéro invalide : 9 chiffres commençant par 01, 04, 05, 06 ou 22 (ex. 06 123 45 67)."


def code_charden_valide(code: str | None) -> bool:
    """`codecharden()` legacy : 13 caractères = 5 chiffres + 1 majuscule + 6 chiffres + 1 majuscule."""
    if not code:
        return False
    return re.fullmatch(r"\d{5}[A-Z]\d{6}[A-Z]", code.strip()) is not None


def verifier_telephone(tel: str | None, obligatoire: bool = False) -> str:
    t = normaliser_telephone(tel)
    if obligatoire and not t:
        raise ValueError("Le numéro de téléphone est obligatoire.")
    if not telephone_valide(t):
        raise ValueError(MESSAGE_TELEPHONE)
    return t
