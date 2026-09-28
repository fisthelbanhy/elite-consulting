/**
 * Chargement des traitements de paiement (ADR-0006).
 *
 * Chaque module déclare son `Traitement` au chargement de son fichier de service. Comme les
 * modules de paiement ne sont pas tous importés par une route, ce fichier les importe
 * explicitement : sans cela, `POST /api/paiements` répondrait « ce type de paiement n'est pas
 * disponible » pour un type dont le module n'a pas encore été chargé.
 *
 * **À compléter à chaque nouveau type d'objet payé.**
 */
import './distributeur.js';
import './ecommerce.js';

/** Appelé une fois au démarrage, pour rendre l'intention explicite à la lecture. */
export function chargerTraitements(): void {
	// Les imports ci-dessus ont déjà fait le travail ; cette fonction sert de point d'appel lisible.
}
