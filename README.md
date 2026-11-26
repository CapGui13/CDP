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
- Centre de rattachement : centre le plus fréquenté ; égalité de fréquentation signalée, sans attribution arbitraire.
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

Les filtres se combinent avec la recherche, la finale et le centre. Les en-têtes sont cliquables pour trier les colonnes ; les rangs réels ne sont jamais renumérotés après filtrage. La fiche de paire affiche les rangs, seuils locaux certains, conditions de participation, scores retenus et historique cumulatif des séances. Les mouvements de qualification sont disponibles dès la deuxième séance validée. Le simulateur compare les scores hypothétiques aux adversaires et seuils actuels, à quotas et voies de qualification figés, sans enregistrer ni publier les hypothèses. Sur téléphone, la vue compacte conserve rang, paire et moyenne ; le bouton « Toutes les colonnes » rétablit le tableau complet.

## Tableau de bord sportif et suivi individuel

Le tableau de bord affiche les paires et joueurs distincts, les centres, les places projetées par finale et le calendrier des six séances. Les fiches centres distinguent la fréquentation réelle (lieu de jeu) des paires rattachées pour la qualification ; les tables correspondent au nombre de paires divisé par deux. Les quotas historiques sont recalculés après chaque séance validée. Les performances par séance conservent les rangs de la séance au général, même en filtrant par centre ou catégorie.

Les fiches de paire présentent deux graphiques (scores/moyennes/seuil local et rang général/local), les valeurs exactes et les objectifs à seuil constant. L'objectif est le score identique minimal au centième à réaliser lors de chacune des séances futures choisies, avec la condition de quatre participations et un dépassement strict du seuil actuel. Les voies directe et locale sont distinguées lorsque leurs frontières sont certaines ; aucune cible inventée en cas d'incertitude. Les scores simulés ne sont jamais publiés.

Les favoris sont conservés dans le navigateur, sans compte ; la comparaison permet de sélectionner jusqu'à quatre paires. Le lien partageable utilise exclusivement les noms publics normalisés, indépendamment des pseudonymes renouvelés lors des publications. Les homonymes exacts sont signalés et ne peuvent pas être résolus arbitrairement ; un changement de nom peut rendre un ancien lien introuvable. Le classement filtré peut être imprimé ou enregistré en PDF via la boîte de dialogue du navigateur (A4 paysage). Le thème clair/sombre est mémorisé localement.

La PWA utilise un manifeste, une icône vectorielle et un service worker avec priorité réseau. Le cache ne contient que les ressources publiques explicitement autorisées et exclut les requêtes authentifiées, les API externes et les sauvegardes privées. En cas de lecture de la dernière publication hors connexion, un avertissement est affiché. Compatibilité d'installation, impression et rendu visuel à valider sur un véritable navigateur.

Recette du lot : 11 tests ciblés exécutés dans le harnais JavaScript simulé, dont 6 scénarios d'interface et 5 tests de statistiques. Contrôle de S1 : 346 paires, 692 joueurs, 16 centres, 60 projections F1 et 58 F2, 2 cas incertains F2. La paire 26 nécessite 60,38 % sur trois séances futures ou 60,22 % sur quatre/cinq, pour dépasser le seuil local actuel de 60,21 %. Les données publiées et le moteur de qualification n'ont pas été modifiés.

## Tests

`node --test tests/*.test.mjs`

Le contrôle GitHub Actions est configuré. 37 tests ont été exécutés dans un harnais JavaScript compatible, dont un scénario synthétique de 346 paires et un parcours d'interface simulé. La recette FFB authentifiée, avec les données réelles complètes, n'a pas été exécutée dans cet environnement. Les hypothèses réglementaires ci-dessus restent des conventions explicites.
