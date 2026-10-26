# Sources et synthèses — lot V1

Base : branche codex/actualites-carte-v1, commit cdb8ad0. Patch indépendant des composants de la carte et du module Investigation.

## Installation et contrôle avant activation

1. Appliquer le patch sur une branche de prévisualisation.
2. Le précontrôle vérifie updated_at et brief_revisions avant tout appel IA et renvoie une erreur explicite en cas de schéma indisponible. Il ne vérifie pas le trigger : exécuter la migration complète. Exécuter supabase/add-brief-revisions.sql AVANT de déployer le nouveau code. Aucun accès administrateur Supabase n'a été utilisé pour préparer ce patch. La migration et le trigger doivent être vérifiés dans une base de test.
3. Lancer npm run lint, npx tsc --noEmit et node --import tsx --test tests/brief-quality.test.ts.
4. Contrôler les flux via node --import tsx scripts/check-rss.ts.
5. Sur un lot témoin en base de test, lancer la synthèse avec la clé IA configurée côté serveur, contrôler les rapprochements (même fait, lieu et période), les citations et l'historique avant activation du cron en production.

## Résultat du contrôle RSS du 25 septembre 2026

18/18 flux lisibles avec le lecteur de l'application, dont les quatre ajouts : RFI Afrique, RFI Europe, ONU Info Afrique, Al Jazeera (flux général filtré pour le Moyen-Orient). Le premier contrôle avec un autre client avait échoué sur Middle East Eye ; le lecteur réel de l'application récupère 20 articles. BBC utilise désormais HTTPS. Les mots-clés français sont élargis pour les nouveaux flux.

Le contrôle valide la réponse et la lecture XML à cet instant, pas une garantie de disponibilité ou d'exhaustivité. Le rythme d'ingestion défini dans vercel.json reste quotidien. Le filtre de pertinence reste basé sur le titre : certains articles pertinents peuvent être manqués.

## Comportement des synthèses

- Jusqu'à huit nouveaux articles par zone ; comparaison avec les vingt dernières brèves publiées au cours des sept derniers jours.
- Regroupement demandé pour un même événement concret, jamais simplement un thème commun. Une reprise certaine peut mettre à jour l'ID existant avec union des références.
- Toute référence à une brève hors du contexte fourni est rejetée. Une source ne peut appartenir à deux groupes dans la même réponse.
- Les sources citées sont acquittées après écriture réussie. Après une réponse IA entièrement valide et la persistance du lot, les sources soumises mais écartées sont aussi marquées traitées pour éviter une facturation répétée. Les échecs API/JSON lèvent une erreur ; les sources sans texte disponible ne sont pas envoyées. Une source déjà citée dans une brève récente est acquittée sans nouvelle génération.
- Les versions précédentes sont archivées automatiquement par un trigger SQL ; leur lecture est réservée à l'administrateur/backend.
- Illustration systématique : photo citée non utilisée parmi les 100 dernières brèves, sinon image régionale locale avec mention explicite sur la fiche. Aucun emprunt de photo à un événement sans rapport.
- Pas de longueur minimale imposée ; les textes sources ne peuvent pas donner d'instructions au modèle.
- Dates : première synthèse et dernière mise à jour explicites. La date de publication de la source est transmise au modèle ; une date d'événement inconnue ne doit pas être inventée.

Limites : la correspondance sémantique reste une proposition IA, pas une certitude. Les doublons historiques ne sont pas fusionnés rétroactivement. La fenêtre est limitée à 7 jours/20 brèves. Les synthèses coûtent toujours l'appel à l'API Anthropic existante, avec un contexte plus grand. Les exécutions simultanées du cron ne sont pas protégées par un verrou transactionnel : ne pas lancer plusieurs synchronisations à la fois. La qualité réelle des fusions, la migration et le temps d'exécution doivent être testés avec les données du projet.

## Cotation

L'ancien score donnant 5/5 à un article issu d'un seul média est remplacé pour les brèves par une couverture documentaire : 1 sans domaine, 2 pour un domaine, 3 pour deux, 4 pour trois ou plus. Les variantes BBC sont regroupées. Il n'y a pas de 5 automatique. L'interface précise que les domaines ne prouvent ni l'indépendance ni la véracité. La cotation des événements GDELT sur la carte est un chantier distinct.

## Telegram — étude, pas de collecteur activé

API gratuite : https://core.telegram.org/api/obtaining_api_id
Bot API : le bot reçoit les messages des canaux dont il est membre : https://core.telegram.org/bots/faq
Compte utilisateur / client : nécessite une autorisation et une session protégée côté serveur ; peut tourner sur un ordinateur déjà disponible, avec dépendance à son fonctionnement et à sa connexion.

Ne pas promettre une collecte exhaustive ni un hébergement perpétuel gratuit. Prévoir un catalogue explicite de canaux, les identifiants canal/message pour la déduplication, date originale, lien et statut non corroboré, ainsi qu'un traitement des modifications/suppressions. Vérifier les droits et les conditions propres au contenu avant republication. Les conditions Telegram limitent fortement l'utilisation pour l'IA : https://telegram.org/tos/content-licensing. Aucun contenu Telegram n'est envoyé à l'IA par ce patch.

Prochaine donnée nécessaire : 3 à 5 liens de canaux publics souhaités et indication des canaux contrôlés par l'utilisateur.

Correctif après revue Claude : images garanties par ressources locales, distinction entre lot ignoré et échec, contrôle de migration avant dépense IA et HTTP 502 si une zone échoue. Les 8 tests ne remplacent pas le contrôle SQL et le test de rapprochement sur un lot réel.
