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

Voir [rapport d'audit complet](docs/AUDIT-2026-11-26.md).

- Ouvrir https://capgui13.github.io/CDP/, se connecter à la FFB et utiliser « Actualiser toutes les séances FFB ». Les résultats déjà sauvegardés sont conservés.
- « Identifier les centres de jeu » traite seulement les centres ; « Actualiser la séance choisie » traite la séance sélectionnée. L'arrêt manuel et la limite de deux minutes conservent les collectes effectuées. Une nouvelle actualisation reprend les fiches et centres restants.
- La route FFB constatée utilise `simultaneousId` et `paginate=true`. Le moteur vérifie chaque groupe par licences, conserve les pourcentages du général et ne déduit jamais le centre du club de licence. Pas de balayage des annuaires de joueurs.
- Le barème IV comprend les neuf catégories hors quota. Les fiches fédérales sont consultées uniquement si la série manque.
- Les moyennes cumulées sont visibles dès la première collecte ; les qualifications ne sont calculées que pour les séances validées (couverture, centres, séries).
- La sauvegarde reste locale au navigateur ; export JSON privé possible. Le classement public est lu dans `data/published.json` après publication volontaire du fichier sportif minimal. Ne jamais déposer une sauvegarde privée brute dans ce dépôt public.

## Tests

`node --test tests/*.test.mjs`

Le contrôle GitHub Actions est configuré. 37 tests ont été exécutés dans un harnais JavaScript compatible, dont un scénario synthétique de 346 paires et un parcours d'interface simulé. La recette FFB authentifiée, avec les données réelles complètes, n'a pas été exécutée dans cet environnement. Les hypothèses réglementaires ci-dessus restent des conventions explicites.
