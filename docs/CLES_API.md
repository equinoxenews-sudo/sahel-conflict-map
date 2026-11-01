# Clés API Anthropic : une clé par tâche

Une clé par usage permet de lire la consommation de chaque tâche dans la Console Anthropic (colonne « Coût » de la liste des clés). Les clés se créent dans la Console, sans date d'expiration, puis se collent dans GitHub ou Vercel. Elles n'entrent jamais dans le dépôt, dans une conversation ni dans un fichier.

| Clé à créer (Console) | Tâche | Où la coller | Nom du secret ou de la variable |
|---|---|---|---|
| `equinoxe-synthese-jour` | Rédaction des articles (matin et soir), par zone | Vercel > Settings > Environment Variables (Production, et Preview si présente), puis redéployer | `ANTHROPIC_API_KEY` |
| `equinoxe-synthese-zone` | Synthèse de zone (workflow « Synthèse de zone ») | GitHub > Settings > Secrets and variables > Actions | `ANTHROPIC_KEY_SYNTHESE_ZONE` |
| `equinoxe-psit` | Points de situation (lundi et jeudi) | idem | `ANTHROPIC_KEY_PSIT` |
| `equinoxe-veille-osint` | Veille OSINT du dimanche (carrousel de Mon espace) | idem | `ANTHROPIC_KEY_VEILLE_OSINT` |
| `equinoxe-traduction-osint` | Traduction des fiches d'outils OSINT (lancement manuel, rare) | idem | `ANTHROPIC_KEY_TRADUCTION_OSINT` |

## Transition

Chaque workflow lit d'abord son secret dédié, puis, à défaut, l'ancien secret `ANTHROPIC_API_KEY` : rien ne casse tant qu'un secret dédié n'est pas créé. Une fois les cinq clés en place et testées, supprimer l'ancien secret `ANTHROPIC_API_KEY` de GitHub (le repli ne sert alors plus) et révoquer les anciennes clés (`NICOF`, `equinoxe-vercel`).

## Vérifier

- « Veille OSINT » à la main (Run workflow) : environ 1 centime, prouve la clé `equinoxe-veille-osint`.
- « Rédaction des articles » à la main sur une seule zone : prouve la clé `equinoxe-synthese-jour`.
- Console > liste des clés : le coût de chaque clé s'affiche séparément après son premier appel.
