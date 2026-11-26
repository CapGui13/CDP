# Recette d'une saison complète — CDP

## Périmètre et méthode

Les données réelles de `data/published.json` n'ont pas été modifiées. La recette utilise des résultats entièrement fictifs, avec 320 compositions initiales, deux paires qui échangent leurs partenaires à S3/S4, des absences, des entrées tardives, des déplacements entre 16 centres, des premières séries, des deuxièmes séries majeures/mineures et des troisièmes séries. Trois graines déterministes (42, 137, 2027), six étapes cumulées chacune, ordre inverse des lignes et vérifications indépendantes des moyennes, rangs et participations.

Source : [règlement affiché par le Comité](https://coupedeprovence.bridgecomitedeprovence.com/ReglementCoupedeProvence2026.php), relu le 26 novembre 2026. La page affiche 2027 en en-tête, 2026 et d'autres dates dans le corps. Les six dates de la saison de l'application restent celles déjà retenues. Le texte prévoit deux finales, au plus 60 paires chacune, au moins deux paires par centre organisateur, cinq premières paires de première série au général en F1, et des places au prorata de la participation sur quatre séances ensemble ; il mentionne sept tables en moyenne. Le calcul du prorata, la définition précise d'une paire de première série, la méthode de rattachement, l'arrondi et le sort des places vacantes ne sont pas explicités. Ce rapport valide le modèle actuel, pas une interprétation officielle de ces points.

## Une saison de référence (graine 42)

| Étape | Résultats cumulés | Paires distinctes | Quatre séances ensemble | Participation impossible | Centres ambigus | Places locales à risque | F1 projetées | F2 projetées |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| S1 | 276 | 276 | 0 | 0 | 0 | 0 | 57 | 58 |
| S2 | 557 | 307 | 0 | 0 | 15 | 15 | 53 | 52 |
| S3 | 836 | 324 | 0 | 0 | 6 | 2 | 59 | 53 |
| S4 | 1 108 | 324 | 174 | 0 | 10 | 8 | 53 | 54 |
| S5 | 1 370 | 324 | 261 | 5 | 8 | 4 | 59 | 57 |
| S6 | 1 641 | 324 | 303 | 21 | 7 | 2 | 58 | 59 |

Les paires dont le centre reste à confirmer et les quotas en fourchette expliquent pourquoi la projection peut rester en dessous du plafond. Les 303 paires ayant quatre séances ne sont pas toutes qualifiées : elles satisfont seulement la condition de participation.

## Correction d'une anomalie reproductible

Avant : une paire à 90 % avec une séance dans A et une dans B était marquée centre ambigu, mais les deux meilleures paires rattachées à chacun de ces centres étaient toutes quatre projetées qualifiables pour deux places locales par centre, sans signaler le risque de déplacement.

Après : les deux premières places locales restent dans la projection et les deux secondes, potentiellement déplacées, passent en quota incertain. Les centres candidats et le nombre de places menacées sont signalés dans la table des quotas et dans les fiches. Le seuil local n'est plus donné comme certain lorsque ce rattachement pourrait modifier la frontière. Une vacance que le rattachement pourrait combler n'est pas déclarée libre. Une paire au score trop faible ou déjà retenue par la voie directe ne remet pas en cause les places locales. À S3, le rattachement devient A : la seconde paire de A sort, celle de B retrouve sa place.

La prudence consiste à considérer tous les rattachements plausibles au centre pour détecter les places vulnérables ; aucun centre n'est attribué arbitrairement, aucune place supplémentaire n'est créée et le classement général n'est pas modifié.

## Tests exécutés

- 6 tests de recette complète : trois saisons (18 étapes), invariance à l'ordre des lignes, rattachement ambigu/vacances/direct, publication anonymisée et restauration de saison, simulateur global S6 comparé au calcul réel du même scénario.
- 30 tests métier existants : 12 moteur, 6 outils du classement, 5 statistiques, 7 course finale/export.
- 9 tests d'interface en DOM simulé, dont passage en mode finale après S6, exclusion des paires non éligibles, confirmation locale et fermeture du simulateur lorsque la saison est terminée.
- Total : 45 tests ciblés réussis dans le harnais JavaScript compatible. Le workflow Node du dépôt exécutera les fichiers de tests natifs ; son résultat et celui de Chromium ne sont pas confirmés ici.
- Comparaison intégrale de la vraie S1 avant/après : résultat JSON du moteur strictement identique. 346 paires, 118 projections et 2 cas incertains inchangés. Aucun changement de données publiées ni d'espace de gestion.

## Suite

Validation en vrai navigateur, confirmation des conventions réglementaires par le Comité, puis chantier ergonomie et gestion/import/publication. Ce rapport n'autorise aucune publication de données fictives ni attribution officielle des places.
