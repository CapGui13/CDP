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

## Fonctionnement actuel (26 novembre 2026)

- Classement de travail cumulatif dès la première collecte, même si les centres ou certaines séries sont encore inconnus. Moyenne des quatre meilleurs scores disponibles, paires identifiées par licences triées. Aucune qualification calculée sur une collecte incomplète.
- Actualisation directe du simultané 12, étape S1 = 364548 ; découverte des autres étapes sur les six dates convenues. Les identifiants ambigus et les dates hors calendrier sont écartés.
- Enrichissement des séries : champs explicites et IV du résultat FFB, recherche groupée des licenciés actifs du comité de Provence (code 5400000) et consultation des fiches de classement de la saison FFB 38 si nécessaire. L'IC n'est jamais utilisé à la place de l'IV.
- Centres de jeu : lecture des champs explicites de centre, tournoi local ou club organisateur. Le club de licence du joueur n'est jamais utilisé comme substitut. Le champ effectif du résultat du simultané 12 n'a pas encore été confirmé.
- Stockage local automatique des collectes et aperçus par séance, conservation des résultats validés ; sauvegarde régulière pendant l'enrichissement. Les données brutes et les jetons ne sont pas sauvegardés.
- Classement public : export sportif minimal dans data/published.json, consultable sans connexion une fois le fichier publié sur GitHub Pages. Les identifiants FFB et internes sont exclus et remplacés par des identifiants aléatoires propres à la publication. La publication est volontaire et manuelle, sans clé d'écriture GitHub dans le navigateur. Ne publier que les résultats dont la diffusion est autorisée.

### Utilisation

1. Ouvrir https://capgui13.github.io/CDP/.
2. Se connecter avec son e-mail et son mot de passe FFB ; aucune clé à saisir.
3. Cliquer sur « Actualiser toutes les séances FFB » ou actualiser la séance choisie. Les résultats récupérés s'affichent et sont sauvegardés.
4. Si les centres restent inconnus : dans Outils avancés, exporter le schéma (sans données personnelles), pour identifier le champ réel du centre organisateur. Si nécessaire le mapping explicite des résultats permet un import validé.
5. Pour partager : « Préparer le classement public », déposer le fichier published.json dans data/ sur GitHub (ou demander à l'assistant de le publier après avoir fourni le fichier). Le classement public est lu automatiquement par les visiteurs sans données locales.

### Tests et état de recette

Commande : `node --test tests/*.test.mjs`.

Le 26 novembre, les 24 cas des trois fichiers de tests ont été exécutés dans un environnement JavaScript avec un harnais d'assertions compatible (24 réussites, 0 échec). Syntaxe du script de la page et 42 références DOM contrôlées. La recette de bout en bout avec une connexion FFB réelle et le déploiement du classement public contenant les véritables résultats restent à faire.

Le fichier public initial est vide ; aucun résultat fictif n'est publié. La qualification est une projection indépendante, non un résultat officiel du Comité.

Références : [règlement du Comité](https://coupedeprovence.bridgecomitedeprovence.com/ReglementCoupedeProvence2026.php), [barème des IV](https://bridge-courbevoie.fr/en-savoir-plus/indice-de-competition-de-valeur-162852). Le tableau des seuils cité date de 2024-2025 ; les correspondances utilisées sont à confirmer pour les cas hors quota et la saison de référence.
