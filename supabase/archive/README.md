# Scripts SQL ponctuels (archivés)

Ces fichiers ont servi une fois (amorçage de zones, données de test, nettoyage). Ils ne font **pas** partie de la
mise en place d'une base neuve et ne doivent pas être relancés sans les relire : certains écrivent ou effacent des
lignes.

| Fichier | Rôle d'origine |
|---|---|
| `seed-africa-zones.sql`, `seed-other-zones.sql`, `seed-amerique-du-sud-extra.sql` | Amorçage des zones et de leurs pays (remplacé par `lib/zones.ts` et `lib/zoneCountries.ts`). |
| `seed-test-data.sql` | Données d'essai du début du projet. |
| `cleanup-manual-zones.sql` | Nettoyage ponctuel d'anciennes lignes de zones saisies à la main. |

La mise en place d'une base neuve est décrite dans le dossier parent : `schema.sql` et `schema-articles.sql`,
puis les fichiers `add-*.sql` (ils sont écrits pour pouvoir être relancés sans danger).
