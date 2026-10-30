# Correctif d’affichage

L’appel à CanvasRenderingContext2D.transform() recevait quatre coefficients au lieu des six obligatoires dans le navigateur. L’exception interrompait le dessin de la croix après le socle, puis laissait la translation active ; un dessin ultérieur de la coque était donc décalé sur le premier canvas. Le moteur Canvas hors navigateur utilisé pour les premiers rendus tolérait cet appel incomplet, ce qui a masqué le défaut.

Correction : six coefficients explicites pour chaque matrice, restauration du contexte par try/finally, arrêt du dessin et affichage de la version sans commandes en cas d’échec de démarrage. Les URL des scripts modifiés sont versionnées pour éviter de recharger l’ancienne version en cache.

Vérification supplémentaire : verifier-page.cjs exécute les quatre scripts dans l’ordre de la page, charge les vraies images, exige six arguments à transform(), contrôle les deux rendus, les appuis/relâchements et la restauration du contexte après exception. Ce contrôle ne remplace pas un essai interactif dans le navigateur, inaccessible à l’outil pour les fichiers locaux dans cette session.
