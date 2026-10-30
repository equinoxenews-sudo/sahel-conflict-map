# Profil, IDcode et dossiers partagés — plan (branche `partage-v1`)

Demande de Nicolas (30/10/2026) :

1. Un clic sur le profil (en haut à droite, ex. « Nicof ») ouvre un panneau : pseudo, mot de passe en étoiles non modifiable,
   accès (Plus, Pro… ou superadmin), et un **IDcode** (ex. `#78DG4HB5`).
2. Avec le pseudo + l'IDcode d'une personne, on peut lui **partager un graph ou un dossier de notes**. Elle voit « X souhaite
   partager avec vous le dossier Y ».
3. Une fois partagé, **A et B travaillent sur la même chose** : chacun voit les ajouts, modifications et suppressions de
   l'autre. Un bouton **« Faire une copie »** crée un dossier indépendant dont le titre porte « (copie) » (renommable), pour
   essayer des choses sans toucher au travail collaboratif.
4. Les graphs et notes partagés portent la mention **« collaboratif : » + le ou les pseudos**.

Écrit avant tout code. Rien n'est codé tant que Nicolas n'a pas validé ce plan.

## Ce qui change de nature : la collaboration

Aujourd'hui, un dossier **vit dans le navigateur** de son propriétaire (localStorage + IndexedDB) ; la copie en ligne n'est
qu'une sauvegarde. Les points 1, 2 et 4 se greffent sans toucher à cela. Le point 3 (travail à deux, en direct) change la
règle : un dossier partagé doit avoir **une version commune sur le serveur**, que chacun lit et modifie. C'est le gros du travail.

Constats dans le code (vérifiés) :

- Les fiches (`entities`), relations, sources, cartes et formes n'ont **pas de date de modification** (seulement `createdAt`),
  et la suppression n'est pas tracée. Sans cela, on ne peut pas savoir « qui a changé quoi » ni propager une suppression.
- La synchronisation actuelle (`decideAutoSave`) envoie le dossier **en entier** et demande à l'humain en cas de conflit :
  inadaptée à deux personnes qui modifient en même temps (l'une écraserait l'autre).

## Proposition

### Lot 1 — Profil et IDcode (simple, indépendant)

- Le bouton du profil du bandeau ouvre un panneau : pseudo, `••••••••••` (affichage fixe, non modifiable : le vrai mot de
  passe n'existe nulle part, seul son hachage), accès (offre ; « Superadmin » pour Nicof), IDcode avec bouton Copier.
- IDcode : 8 caractères (sans 0/O/1/I pour éviter les confusions), généré au premier affichage côté serveur, stocké dans une
  nouvelle table `account_codes (owner_id, code)` : pas de modification de `accounts`, et le fondateur y a aussi un code.
- **SQL à exécuter par Nicolas** : `supabase/add-sharing.sql` (tables `account_codes`, puis celles des lots 2 et 3).

### Lot 2 — Invitations par pseudo + IDcode

- « Partager » sur un dossier (Notes) ou un graph : saisir pseudo + IDcode. Le serveur vérifie la paire (message identique si
  l'un des deux est faux : on ne révèle pas quels pseudos existent), refuse de se partager à soi-même, limite les essais.
- Table `shares` : dossier, propriétaire, destinataire, état (en attente / acceptée / refusée / retirée).
- Le destinataire voit « X souhaite partager avec vous le dossier Y » (panneau du profil + pastille sur le bouton du profil) et
  **Accepte ou Refuse**. Rien n'arrive dans son espace sans son accord (sinon n'importe qui connaissant pseudo + code pourrait
  remplir son espace).
- Le propriétaire peut retirer un participant ; un participant peut quitter. Le dossier de A reste à A.

### Lot 3 — Travail à deux (le gros morceau)

- **Version commune sur le serveur** pour chaque dossier partagé, découpée par élément (fiche, relation, note, source, carte,
  forme) et non en bloc.
- **Modèle** : chaque élément reçoit une date de modification et un auteur ; une suppression laisse une trace (« pierre
  tombale ») pour se propager. Fusion élément par élément : **la dernière modification gagne**, par élément.
- **Synchronisation** : toutes les ~10 s tant que la page est ouverte (et à l'ouverture, au retour sur l'onglet, après chaque
  modification). Pas de temps réel instantané : Vercel Hobby ne garde pas de connexion ouverte ; l'interrogation régulière
  est le mode compatible avec l'hébergement gratuit actuel.
- **Limite à connaître** : si A et B modifient *le même texte de la même note* dans la même fenêtre de ~10 s, la version de la
  dernière personne l'emporte et le texte de l'autre est perdu pour cette note (pas d'édition simultanée caractère par
  caractère). Atténuation prévue : sauvegarde automatique de l'état précédent (les sauvegardes datées existent déjà) et
  indication « modifié par B à l'instant » sur la note ouverte. Une vraie co-édition de texte (type Google Docs) est un chantier
  à part, pas prévu ici.
- **Images et documents-preuves** (IndexedDB) : envoyés au serveur avec le dossier partagé, avec un plafond de taille à fixer.
- Les données d'un dossier partagé ne sont lisibles que par ses participants acceptés (même principe de clé côté serveur que
  le cloisonnement actuel : le serveur filtre sur la session, jamais sur la requête).

### Lot 4 — « Faire une copie » et mention « collaboratif »

- Bouton **Faire une copie** sur un dossier ou un graph (partagé ou non) : nouveau dossier indépendant, titre
  « Nom (copie) », nouveaux identifiants, non partagé. Utilise l'import existant (`importDossier`, ids régénérés).
- Mention « collaboratif : pseudo1, pseudo2 » sur les tuiles, dans l'en-tête du dossier et du graph.

## Sécurité (à ne pas perdre de vue)

- Le partage **perce volontairement** le cloisonnement entre comptes : il faut donc que l'accès à un dossier partagé passe par
  une table de participants vérifiée côté serveur à chaque requête, et jamais par un identifiant que le navigateur pourrait deviner.
- IDcode : traité comme un secret léger (il sert de preuve d'intention) ; bouton « Régénérer » dans le panneau si on veut l'invalider.
- Aucun mot de passe affiché, jamais.
- Nicolas peut partager avec les comptes individuels et inversement ; les rubriques réservées (Investigation…) ne sont pas concernées.

## Estimation honnête

Lot 1 : petit. Lot 2 : moyen. Lot 4 : petit. **Lot 3 : le plus gros** (modèle de données, fusion, synchronisation, tests de
conflits) ; je recommande de le livrer seul, derrière les lots 1, 2 et 4, après une vraie validation par deux comptes.

## Ordre proposé

1. Lot 1 + Lot 4 (profil, IDcode, « Faire une copie ») — utiles tout de suite, sans risque pour les dossiers.
2. Lot 2 (invitations et acceptation).
3. Lot 3 (travail à deux), dossier partagé par dossier.

## Questions pour Nicolas

a. OK pour cet ordre, et pour livrer le Lot 3 en dernier ?
b. La « dernière modification gagne » par élément te convient-elle (avec la limite sur le même texte de la même note) ?
c. Plafond de taille d'un dossier partagé, images comprises : 25 Mo te va-t-il ?
d. Un participant peut-il inviter d'autres personnes, ou seulement le propriétaire du dossier ?

---

## Décisions de Nicolas et état d'avancement (30/10/2026)

Réponses : ordre validé (travail à deux en dernier) ; « la dernière modification gagne » validé ; **un participant peut inviter
d'autres personnes** ; plafond de taille à relever.

- **Plafond de taille** : ce n'est pas payant en soi, c'est la place totale de la base Supabase (offre gratuite : 500 Mo de base
  et 1 Go de fichiers, à vérifier sur ton tableau de bord) qui limite, partagée avec les articles, brèves, etc. Proposition : 50 Mo
  par dossier partagé, images comprises, en une constante facile à changer ; les images iront dans le stockage de fichiers
  plutôt que dans la base si la place devient un sujet.
- **« Faire une copie »** : où que l'on soit (liste ou dossier ouvert). Dans un dossier ouvert (note ou graph), la copie est créée
  puis **ouverte tout de suite, dans la même vue** : on travaille directement dedans. Depuis la liste, la vignette « Nom (copie) »
  apparaît à côté des autres. Fait.
- **Lot 1 fait** : panneau du profil (clic sur le pseudo en haut à droite ; sur mobile, « Mon profil » dans le menu) avec pseudo,
  mot de passe en étoiles fixes, accès (« Superadmin » pour Nicof, Plus, Pro…), IDcode `#XXXXXXXX` avec Copier et Renouveler, et
  Se déconnecter. IDcode créé au premier affichage (table `account_codes`, SQL : `supabase/add-sharing.sql`).
- **Reste à faire** : lot 2 (invitations par pseudo + IDcode, acceptation) et lot 3 (travail à deux), avec la mention
  « collaboratif : pseudos ».
