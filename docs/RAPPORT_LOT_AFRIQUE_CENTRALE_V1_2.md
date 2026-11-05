# Rapport consolidé — lot Afrique centrale V1.2 (correctif de la V1.1)

Branche `approche-v1`. Archive : `EQUINOXE_APPROCHE_LOT_10_PAYS_AFRIQUE_CENTRALE_V1_2_CORRIGE.zip`, seule, sans mélange avec les lots d'Afrique de l'Ouest. Les dix JSON remplacent la V1.1 (historique git conservé), identiques octet pour octet à l'archive, tous en `draft`. Rien n'est dans `main`. Aucun contenu géopolitique n'a été modifié par moi.

## Résultat

| Pays | Erreurs | Avertissements (V1.1 → V1.2) | URL à vérifier |
|---|---:|---|---:|
| Angola (AGO) | 0 | 4 → 4 | 1 |
| Burundi (BDI) | 0 | 4 → 3 | 0 |
| République centrafricaine (CAF) | 0 | 5 → 6 | 0 |
| Cameroun (CMR) | 0 | 2 → 2 | 0 |
| RDC (COD) | 0 | 3 → 2 | 0 |
| République du Congo (COG) | 0 | 2 → 2 | 0 |
| Gabon (GAB) | 0 | 4 → 4 | 0 |
| Guinée équatoriale (GNQ) | 0 | 3 → 2 | 0 |
| São Tomé-et-Príncipe (STP) | 0 | 4 → 4 | 0 |
| Tchad (TCD) | 0 | 3 → 3 | 0 |

Zod, références, licences, collisions Banque mondiale : aucune anomalie. Tests : 543 passent. TypeScript : propre. ESLint (`app`, `components`, `lib`, `scripts`, `types`) : propre. Validateur Zod : 10 fichiers valides. Smoke test : 10 pays × 6 onglets, tous les libellés retrouvés.

## Affichage des nouveaux blocs (vérifié dans les pages servies)

- **30 vulnérabilités** (onglet « Vulnérabilités et perspectives ») : 30 sur 30 affichées, titre et résumé.
- **40 entrées opportunités et risques** (20 + 20, onglet « Enjeux stratégiques ») : 40 sur 40 affichées.
- **80 cartes SWOT** (8 par pays, onglet « Vulnérabilités et perspectives ») : 80 sur 80 affichées, titre et résumé, et chaque résumé correspond à son titre.
- **Observations :** 116, aucune retirée ni ajoutée. Seules changent : la capitale de la Guinée équatoriale, le chef du gouvernement du Gabon, le chef de l'exécutif de l'Angola (valeurs descriptives institutionnelles annoncées), les sources de quelques dirigeants, deux libellés et les `topic` de croissance et d'inflation ajoutés (RDC, Burundi, Guinée équatoriale). Toutes restent `verified`.

## Régression et point bloquant : l'indice de capital humain 2020 de la RCA n'est toujours pas affiché

Le fichier met `theme: "Développement humain"`. Ce n'est pas un identifiant de rubrique du moteur (liste du contrat : appartenances, demographie, politique, geographie, projections, conjoncture, energie, infrastructures, ressources, recherche, ports, investissement, defense, humanitaire, cyber, securite, none). Le moteur le dit lui-même : « theme inconnu « Développement humain » : rubrique déduite du préfixe de la clé » ; or le préfixe `development.` n'a pas de rubrique non plus. Résultat : la valeur (0,26, 2020) n'apparaît dans aucun onglet. Le nouveau libellé daté « (Banque mondiale, 2020) » est bon. Deux façons de régler, je ne l'ai fait ni l'une ni l'autre :
1. ChatGPT choisit une rubrique existante (par exemple `demographie` ou `humanitaire`) ;
2. j'ajoute une rubrique « Développement humain » au moteur (une ligne dans la table des rubriques, onglet vue d'ensemble), ce qui ajoute un panneau à la page.

## Guinée équatoriale : modèle historique mis à jour

- `lib/countries/guinee-equatoriale.ts` : la capitale devient « Ciudad de la Paz (capitale officielle depuis le 2 janvier 2026 ; transfert progressif des services de l'État) ». « Malabo » n'apparaît plus nulle part dans le code du site (recherche faite). La fiche du modèle historique et la recherche affichent la nouvelle capitale.
- **Pas de point d'événement national :** un nouveau champ facultatif `capitalAnchorsNationalInfo` (à `false` pour la Guinée équatoriale) empêche `findCapitalByLabel` de renvoyer la capitale, donc `locateBrief` ne place plus sur la carte les informations d'ordre national de ce pays : elles restent publiées, sans marqueur local. Un événement qui cite une ville vérifiée garde sa ville. Les autres pays gardent leur capitale comme repli. Deux tests le garantissent. Les points déjà enregistrés en base ne sont pas modifiés.
- Étiquette du globe : le globe n'affiche aucun nom de capitale ; rien à changer.

## Nouvelles références institutionnelles

- **São Tomé-et-Príncipe :** la source de la réélection (S-STP-X) est maintenant le Tribunal constitutionnel (proclamation des résultats, 28 juillet 2026) : la provenance incorrecte (RDC) est corrigée. Le Premier ministre (Américo Ramos) reste sourcé par France Diplomatie du 15 mai 2026, antérieure au scrutin de juillet.
- **RDC :** ajout de la séance du Conseil de sécurité du 29 septembre 2026 et d'un point de presse onusien du 9 octobre 2026. Ce sont des transcriptions automatiques d'un portail de l'ONU (statut non officiel indiqué, en anglais). Elles étayent violences et déplacements en 2026, pas le contrôle territorial.
- **RCA :** séance du Conseil de sécurité du 20 octobre 2026 à la place de l'ancienne transcription. Le mandat de la MINUSCA expire le 15 novembre 2026 : à actualiser après le vote, comme la notice le demande.
- **Gabon :** le chef du gouvernement est maintenant sourcé par le gouvernement gabonais (11 octobre 2026), avec la distinction vice-président du gouvernement. Une source de la liste, « CIA World Leaders », est un site américain tiers pour les dirigeants.
- **Angola :** discours sur l'état de la Nation (15 octobre 2026) sur le site du gouvernement. Son adresse ne répond pas depuis mon poste (erreur de certificat TLS) : à vérifier à la main.
- **Tchad :** le Premier ministre (Allamaye Halina) est recoupé par un article de presse de mars 2026 (Africanews) en plus de France Diplomatie ; la source gouvernementale reste à trouver, comme la notice le dit.

## Avertissements restants (documentaires, jamais bloquants)

1. `topic` : growth et inflation ne sont ajoutés que sur les données annuelles comparables, volontairement. Restent sans `topic` : Angola (croissance du premier semestre 2026, inflation d'août 2026), Burundi (inflation d'août 2026), Gabon (inflation de mai 2026), São Tomé (PIB par habitant et inflation de mai 2026).
2. Libellés non harmonisés : « Langue(s) officielle(s) » contre « Langue officielle » (Afrique de l'Ouest) ; RCA « Réélection du président lors du scrutin de décembre 2025 » contre Gabon « Élection présidentielle ayant clos la transition ».
3. Valeurs anciennes à dire dans leur libellé : Tchad, pauvreté nationale 2022.
4. São Tomé : superficie du fichier 1 001 km² contre 960 km² (série Banque mondiale), PIB par habitant 4 044 contre 4 084 USD : à rapprocher.
5. Fiches toujours légères : 3 à 6 sources, 1 à 2 relations. Aucun niveau documentaire n'est déclaré ni affiché.
