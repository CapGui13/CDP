# CDP — Coupe de Provence 2027

Application indépendante de classement provisoire et de projection des qualifications.
Source réglementaire unique : [règlement du Comité de Provence](https://coupedeprovence.bridgecomitedeprovence.com/ReglementCoupedeProvence2026.php), consulté le 26 novembre 2026. La page porte l'en-tête 2027 mais le corps du règlement indique 2026 : on applique le texte fourni comme convenu, sans rétroanalyse.

## Règles explicites

- Finale 1 : premières séries et deuxièmes séries majeures ; finale 2 : deuxièmes séries mineures, troisièmes et quatrièmes séries.
- Maximum de 60 paires par finale ; au moins deux paires par centre organisateur.
- Finale 1 : cinq premières paires de première série au classement général.
- Autres qualifications par centre et par catégorie, proportionnellement à la participation sur quatre séances jouées ensemble ; le texte mentionne un minimum moyen de sept tables.
- Confirmation huit jours avant la finale ; remplacement des forfaits suivant le classement du centre.
- Finale en IMP.

## Conventions de calcul (non explicites dans le texte)

- Six étapes : 25/11/2026, 27/01, 24/02, 24/03, 14/04 et 05/05/2027. Finale : 23/06/2027.
- Identité de la paire : deux licences triées. Une autre composition constitue une nouvelle paire.
- Moyenne des quatre meilleurs pourcentages, provisoirement sur les résultats disponibles ; quatre participations ensemble nécessaires avant qualification effective.
- Catégorie déterminée par le joueur le mieux classé, y compris pour les qualifications directes ; classement de série de référence à conserver pendant la saison.
- Centre de rattachement : centre le plus fréquenté ; égalité de fréquentation signalée, sans attribution arbitraire. Si ce rattachement peut déloger une paire locale, la place menacée est signalée comme incertaine ; seuils et vacances dépendants du rattachement restent indéterminés.
- Projection locale : classement sur la moyenne générale, et participation mesurée par les occurrences de paires par catégorie et centre dans les étapes publiées. Cette définition opérationnelle du prorata n'est pas détaillée par le règlement.
- Places directes réservées dans le plafond de la finale 1, pas de double qualification ; minimum local puis distribution des places restantes au plus fort reste, avec plafond de 60.
- Sept tables : indicateur de participation, pas de suppression automatique du minimum de deux places.
- Ex æquo à une frontière de qualification : signaler, ne pas départager par le nom ou la licence.
- Insuffisance de candidats : afficher les places vacantes et signaler les cas non définis ; aucune qualification automatique non justifiée.

## Fonctionnement actuel — audit du 26 novembre 2026

Voir [rapport d'audit complet](docs/AUDIT-2026-11-26.md) et [audit réglementaire et recette du classement](docs/AUDIT-QUALIFICATIONS-2026-11-26.md).

- Page unique : https://capgui13.github.io/CDP/. Le classement public est affiché par défaut, indépendamment du cache privé. Pour gérer la saison, cliquer sur « Gestion », renseigner un token GitHub limité à CapGui13/CDP (Contents : lecture et écriture), puis se connecter à la FFB et actualiser les séances. Les résultats privés déjà sauvegardés sont restaurés après déverrouillage. Le token est conservé uniquement en mémoire et ne transite pas par le proxy FFB.
- « Identifier les centres de jeu » traite seulement les centres ; « Actualiser la séance choisie » traite la séance sélectionnée. L'arrêt manuel et la limite de deux minutes conservent les collectes effectuées. Une nouvelle actualisation reprend les fiches et centres restants.
- La route FFB constatée utilise `simultaneousId` et `paginate=true`. Le moteur vérifie chaque groupe par licences, conserve les pourcentages du général et ne déduit jamais le centre du club de licence. Pas de balayage des annuaires de joueurs.
- Le barème IV comprend les neuf catégories hors quota. Les fiches fédérales sont consultées uniquement si la série manque.
- Les moyennes cumulées sont visibles dès la première collecte ; les qualifications ne sont calculées que pour les séances validées (couverture, centres, séries).
- La sauvegarde reste locale au navigateur ; export JSON privé possible. Après validation des séances, « Publier le classement » envoie directement le fichier sportif minimal à GitHub (`data/published.json`, branche main). Les numéros FFB et identifiants internes sont exclus. La publication refuse une sauvegarde plus ancienne, une séance supprimée/raccourcie ou une modification concurrente ; GitHub confirme les droits effectifs d’écriture au moment de la publication. Fermer la gestion réaffiche le classement public et efface le token de la mémoire applicative. Ne jamais déposer une sauvegarde privée brute dans ce dépôt public.

## Consultation du classement public

Depuis la refonte du 27 novembre, l'adresse canonique reste unique et ouvre par défaut le classement. Quatre rubriques sont disponibles sans navigation vers une autre URL : **Classement** (recherche, centre, finale, favoris, comparaison, export PDF/Excel), **Saison** (indicateurs, calendrier, statistiques des centres et séances), **Qualifications** (quotas, variations, avertissements) et **Outils** (parcours individuels, partenaires, records, simulation globale, bulletin et préparation des finales). Les filtres avancés sont repliés par défaut et signalés lorsqu'ils sont actifs. Les filtres et le tri sont conservés lors d'un changement de rubrique. En gestion, la navigation publique est masquée ; le classement, les quotas, la synchronisation et la sauvegarde restent disponibles. La vue compacte mobile et les séries colorées sont conservées.

Recette ergonomique : 10 tests d'interface réussis dans le DOM simulé, dont navigation exclusive, persistance des filtres, réinitialisation et isolation de la gestion. Les contrôles Chromium/axe sont adaptés à la navigation et vérifient aussi l'absence de débordement horizontal au niveau de la page mobile. Déploiement et rendu réel non confirmés : l'accès réseau à GitHub Pages n'était pas disponible dans l'environnement de recette.


Les filtres se combinent avec la recherche, la finale et le centre. Les en-têtes sont cliquables pour trier les colonnes ; les rangs réels ne sont jamais renumérotés après filtrage. La fiche de paire affiche les rangs, seuils locaux certains, conditions de participation, scores retenus et historique cumulatif des séances. Les mouvements de qualification sont disponibles dès la deuxième séance validée. Le simulateur compare les scores hypothétiques aux adversaires et seuils actuels, à quotas et voies de qualification figés, sans enregistrer ni publier les hypothèses. Sur téléphone, la vue compacte conserve rang, paire et moyenne ; le bouton « Toutes les colonnes » rétablit le tableau complet.

## Tableau de bord sportif et suivi individuel

Le tableau de bord affiche les paires et joueurs distincts, les centres, les places projetées par finale et le calendrier des six séances. Les fiches centres distinguent la fréquentation réelle (lieu de jeu) des paires rattachées pour la qualification ; les tables correspondent au nombre de paires divisé par deux. Les quotas historiques sont recalculés après chaque séance validée. Les performances par séance conservent les rangs de la séance au général, même en filtrant par centre ou catégorie.

Les fiches de paire présentent deux graphiques (scores/moyennes/seuil local et rang général/local), les valeurs exactes et les objectifs à seuil constant. L'objectif est le score identique minimal au centième à réaliser lors de chacune des séances futures choisies, avec la condition de quatre participations et un dépassement strict du seuil actuel. Les voies directe et locale sont distinguées lorsque leurs frontières sont certaines ; aucune cible inventée en cas d'incertitude. Les scores simulés ne sont jamais publiés.

Les favoris sont conservés dans le navigateur, sans compte ; la comparaison permet de sélectionner jusqu'à quatre paires. Le lien partageable utilise exclusivement les noms publics normalisés, indépendamment des pseudonymes renouvelés lors des publications. Les homonymes exacts sont signalés et ne peuvent pas être résolus arbitrairement ; un changement de nom peut rendre un ancien lien introuvable. Le classement filtré peut être imprimé ou enregistré en PDF via la boîte de dialogue du navigateur (A4 paysage). Le thème clair/sombre est mémorisé localement.

La PWA utilise un manifeste, une icône vectorielle et un service worker avec priorité réseau. Le cache ne contient que les ressources publiques explicitement autorisées et exclut les requêtes authentifiées, les API externes et les sauvegardes privées. En cas de lecture de la dernière publication hors connexion, un avertissement est affiché. Compatibilité d'installation, impression et rendu visuel à valider sur un véritable navigateur.

Recette du lot : 11 tests ciblés exécutés dans le harnais JavaScript simulé, dont 6 scénarios d'interface et 5 tests de statistiques. Contrôle de S1 : 346 paires, 692 joueurs, 16 centres, 60 projections F1 et 58 F2, 2 cas incertains F2. La paire 26 nécessite 60,38 % sur trois séances futures ou 60,22 % sur quatre/cinq, pour dépasser le seuil local actuel de 60,21 %. Les données publiées et le moteur de qualification n'ont pas été modifiés.

## Course à la finale

- Participation : condition de quatre séances ensemble, nombre d'absences encore possibles et impossibilité mathématique de remplir cette condition. Ces indicateurs ne prédisent pas la qualification sportive.
- Recherche publique tolérante aux accents, inversion des mots, fautes simples et transpositions ; les identifiants FFB ne sont jamais exposés dans la vue publique.
- Parcours individuels : toutes les séances et tous les partenaires d'un même joueur, moyenne personnelle sans valeur qualificative, matrice des changements de partenaire. L'identité individuelle utilise le pseudonyme public stable dans la publication courante.
- Classements annexes : écart-type sur au moins trois séances, progression depuis la première séance, records de score, assiduité et trois meilleures paires comportant un joueur de chaque série. Une paire mixte peut apparaître dans deux séries.
- Comparaison des centres : participation cumulée, évolution des tables estimées, joueurs distincts, premières séries, moyenne des scores et quotas. Bulletin sportif modifiable et copiable, généré à partir de la dernière séance validée.
- Simulateur global : résultats futurs de paires réelles et lots fictifs, recalcul intégral du moteur, changements de statuts et de quotas. Chaque séance simulée est considérée terminée : les autres paires y sont absentes. Les lots fictifs créent de nouvelles paires distinctes à chaque ligne, sans continuité implicite. Aucune hypothèse n'est enregistrée ni publiée.
- Préparation de la finale : verrouillée tant que les six séances ne sont pas validées. Listes de projection, réserves potentielles par centre et places vacantes ; suivi personnel local des confirmations et forfaits, sans attribution automatique ni communication au Comité.
- Export XLSX natif du classement filtré et trié, avec scores numériques et chaînes littérales, sans licence ni données privées.
- Recette : 7 scénarios d'interface simulée et 7 tests métier ciblés (dont vérification de la structure ZIP/XLSX), contrôles des 346 paires réelles. Charge synthétique : 6 000 résultats, 1 000 paires, 2 000 joueurs et 16 centres ; classement calculé en environ 52 ms et statistiques en 264 ms dans le harnais JavaScript. Ces durées sont indicatives, hors rendu DOM.
- Le workflow `.github/workflows/browser.yml` lance Chromium/Playwright et axe, vérifie les dialogues, la simulation, l'export et les vues mobile/clair/sombre. Il publie un rapport d'accessibilité, une capture mobile et un export de test. L'exécution native et les éventuelles violations axe restent à vérifier ; aucun audit WCAG complet n'est revendiqué.

## Recette d'une saison complète

Voir [le rapport S1–S6](docs/RECETTE-SAISON-COMPLETE.md) : trois saisons synthétiques, 45 tests ciblés réussis dans le harnais JavaScript, résultat de S1 réelle intégralement inchangé. Le mode finale et les situations de rattachement ambigu sont testés. Les conventions réglementaires restent à confirmer par le Comité.

## Tests

`node --test tests/*.test.mjs`

Le contrôle GitHub Actions est configuré. 37 tests ont été exécutés dans un harnais JavaScript compatible, dont un scénario synthétique de 346 paires et un parcours d'interface simulé. La recette FFB authentifiée, avec les données réelles complètes, n'a pas été exécutée dans cet environnement. Les hypothèses réglementaires ci-dessus restent des conventions explicites.
