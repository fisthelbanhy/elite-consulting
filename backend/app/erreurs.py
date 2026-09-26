"""Format d'erreur unique renvoyé au frontend :
`{"message": "…", "champs": {"nom_du_champ": "…"}}` (HTTP 400/401/403/404/422)."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ErreurMetier(Exception):
    # Paramètres positionnels uniquement : un champ de formulaire peut s'appeler « message »
    def __init__(self, message: str, statut: int = 400, /, **champs: str):
        self.message = message
        self.statut = statut
        self.champs = champs


def erreur(message: str, /, **champs: str) -> ErreurMetier:
    """`raise erreur("…", champ="…")` — erreur de validation métier (400)."""
    return ErreurMetier(message, 400, **champs)


def introuvable(message: str = "Élément introuvable.") -> ErreurMetier:
    return ErreurMetier(message, 404)


def interdit(message: str = "Vous n'avez pas le droit d'effectuer cette action.") -> ErreurMetier:
    return ErreurMetier(message, 403)


_MESSAGES = {
    "missing": "Ce champ est obligatoire.",
    "string_too_short": "Au moins {min_length} caractères.",
    "string_too_long": "Au plus {max_length} caractères.",
    "greater_than_equal": "Doit être supérieur ou égal à {ge}.",
    "greater_than": "Doit être supérieur à {gt}.",
    "less_than_equal": "Doit être inférieur ou égal à {le}.",
    "less_than": "Doit être inférieur à {lt}.",
    "int_parsing": "Nombre entier attendu.",
    "int_type": "Nombre entier attendu.",
    "float_parsing": "Nombre attendu.",
    "date_from_datetime_parsing": "Date invalide.",
    "date_parsing": "Date invalide.",
    "datetime_parsing": "Date et heure invalides.",
    "value_error": "{msg}",
    "enum": "Valeur non autorisée.",
    "literal_error": "Valeur non autorisée.",
    "bool_parsing": "Valeur oui/non attendue.",
}


def _traduire(err: dict) -> str:
    modele = _MESSAGES.get(err.get("type", ""))
    ctx = dict(err.get("ctx") or {})
    if err.get("type") == "value_error":
        return str(ctx.get("error", err.get("msg", ""))).removeprefix("Value error, ")
    if modele:
        try:
            return modele.format(**ctx, msg=err.get("msg", ""))
        except (KeyError, IndexError):
            pass
    return err.get("msg", "Valeur invalide.")


def installer(app: FastAPI) -> None:
    @app.exception_handler(ErreurMetier)
    async def _metier(_: Request, exc: ErreurMetier):
        return JSONResponse({"message": exc.message, "champs": exc.champs}, status_code=exc.statut)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        champs: dict[str, str] = {}
        for err in exc.errors():
            loc = [str(x) for x in err.get("loc", []) if x not in ("body", "query", "path")]
            cle = ".".join(loc) or "_"
            champs.setdefault(cle, _traduire(err))
        return JSONResponse(
            {"message": "Veuillez corriger les champs signalés.", "champs": champs}, status_code=422
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        message = exc.detail if isinstance(exc.detail, str) else "Erreur."
        return JSONResponse({"message": message, "champs": {}}, status_code=exc.status_code)
