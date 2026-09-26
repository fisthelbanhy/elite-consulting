"""Envoi d'e-mails (legacy `incl-envoimail.php`). Sans SMTP configuré, les e-mails sont
écrits dans le journal — pratique en développement."""

import logging
import smtplib
from email.message import EmailMessage

from app.config import get_settings

log = logging.getLogger("lafrangine.emails")
settings = get_settings()


def envoyer(destinataire: str, sujet: str, texte: str, repondre_a: str | None = None) -> bool:
    if not destinataire:
        return False
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = destinataire
    msg["Subject"] = sujet
    if repondre_a:
        msg["Reply-To"] = repondre_a
    msg.set_content(texte)

    if not settings.smtp_host:
        log.warning("[e-mail non envoyé — SMTP non configuré] À: %s | %s\n%s", destinataire, sujet, texte)
        return False
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
        return True
    except Exception:
        log.exception("Échec d'envoi d'e-mail à %s", destinataire)
        return False
