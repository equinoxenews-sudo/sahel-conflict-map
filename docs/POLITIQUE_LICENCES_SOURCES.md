# Politique de licences des sources — Équinoxe News (29 octobre 2026)

## Règles
1. **SIPRI est exclu** de toute collecte, import, base de données et actualisation automatique tant qu'une autorisation commerciale écrite n'a pas été obtenue. L'exclusion vaut aussi pour les indicateurs SIPRI **redistribués par d'autres plateformes**, notamment la Banque mondiale (séries `MS.MIL.XPND.*`).
2. La licence de chaque source est contrôlée **avant** son intégration, y compris pour l'OTAN et les portails de l'UE. Une licence non vérifiée est signalée dans le tiroir de provenance (« Licence de réutilisation non vérifiée »).
3. On privilégie les sources gouvernementales primaires et les données officiellement réutilisables.
4. Pour chaque donnée, le fichier conserve : adresse exacte, organisme, date de consultation, licence, méthode et dernière vérification.
5. Aucune valeur n'est inventée pour remplacer une donnée indisponible : elle est affichée « Donnée non disponible » ou « À vérifier ».
6. Les données comparables internationalement (Banque mondiale, Eurostat) sont distinguées des données calculées selon des méthodes nationales (INSEE, ministères) : deux mesures d'un même sujet sont conservées côte à côte avec leur définition, sans moyenne.

## Où c'est appliqué dans le code
- `lib/approche/sourceRegistry.ts` : `commercial_license_required`, liste des éditeurs exclus (`BLOCKED_PUBLISHERS`), séries Banque mondiale exclues (`BLOCKED_WORLD_BANK_INDICATORS`), `publishProblems` (refus de publication) et `publishedObservations` (jamais affichée si la source est exclue).
- `scripts/sync-approche-worldbank.ts` : refuse une série exclue, et refuse toute série dont l'organisme d'origine déclaré par la Banque mondiale est SIPRI.
- `tests/approche.test.ts` : échoue si une source exclue figure dans une fiche, si une observation publiée n'a pas de source, ou si une valeur de la maquette de démonstration est reprise.

## Vérification des dépendances existantes (29/10/2026)
Aucune dépendance à SIPRI dans le code ni dans les données du dépôt. Les séries Banque mondiale utilisées par le site (population, superficie, PIB, croissance, inflation, chômage OIT, recherche-développement) ont pour origine l'ONU, l'OIT, les offices statistiques nationaux et Eurostat, pas SIPRI.

## À obtenir ou à contrôler
- Autorisation commerciale SIPRI (si l'on veut un jour les dépenses militaires comparables).
- Licence de réutilisation du portail de l'UE, de l'OTAN, de la Présidence et des chiffres clés du ministère des Armées.
- Alternative en attendant : dépenses de défense publiées par le ministère des Armées (budget en euros courants) avec leur périmètre national.
