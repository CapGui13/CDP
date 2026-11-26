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

## Architecture cible

1. Moteur JavaScript pur, indépendant des API et de l'interface, avec tests reproductibles.
2. Import des résultats FFB sur le modèle de KOTP : authentification côté GitHub Actions, jamais d'identifiants ni de jetons dans la page publique.
3. Données normalisées par séance, centre, paire et classement des joueurs ; validation avant publication atomique.
4. Interface GitHub Pages : général, finales, centres, détail des séances, barres de qualification et statut de participation.
5. Les projections restent non officielles, les résultats manquants ne sont jamais traités comme des absences confirmées.

Statut : initialisation. Aucun résultat FFB n'a encore été importé.
