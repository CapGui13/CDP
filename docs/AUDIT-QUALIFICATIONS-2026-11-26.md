# Audit réglementaire et recette du classement — 26 novembre 2026

## Source et statut

[Règlement publié par le Comité de Provence](https://coupedeprovence.bridgecomitedeprovence.com/ReglementCoupedeProvence2026.php), relu le 26 novembre 2026. Le titre annonce 2027, mais le corps du règlement indique 2026 et des dates différentes de la saison courante. Les dispositions sportives sont donc une base de projection, pas une confirmation de la version 2027.

| Disposition | Implémentation | Statut |
|---|---|---|
| Deux finales, catégories selon les séries | Classement et filtre finale 1/2 | Conforme dans son principe ; catégorie de la paire selon le mieux classé = convention |
| Maximum 60 paires par finale | Capacité 60, places directes comprises en finale 1 | Plafond respecté ; inclusion des places directes dans le plafond est l'interprétation retenue |
| Minimum deux paires par centre organisateur | Minimum avant répartition, places vacantes affichées | Cas d'un centre sans candidats de la catégorie non précisé |
| Cinq premières paires de première série au général | Sélection directe en finale 1, sans double qualification locale | Critère « au moins un joueur première série » à confirmer |
| Qualification locale au prorata de la participation sur quatre séances jouées ensemble | Poids par occurrences de paires catégorie/centre à chaque séance validée ; plus fort reste après minimum | Provisoire ; ni dénominateur ni arrondi définis dans le texte |
| Moyenne de sept tables minimum | Avertissement, pas d'exclusion automatique | Portée exacte et moment du contrôle à confirmer |
| Quatre séances ensemble | Identité par deux joueurs ; quatre résultats nécessaires ; moyenne des quatre meilleurs | Moyenne des quatre meilleurs et traitement des séances excédentaires à confirmer |
| Changement de centre | Centre le plus fréquenté ; égalité signalée | Règle non détaillée dans le texte |
| Ex æquo au seuil ou au prorata | Pas de départage par identifiant ; statut incertain | Règle de départage à confirmer |
| Places vacantes et forfaits | Vacances affichées ; pas de redistribution automatique | Le règlement prévoit remplacement par ordre du centre après confirmation ; redistribution hors centre non définie |
| Minimum incompatible avec le plafond | Quotas indisponibles, candidats concernés marqués incertains | Correction technique de cet audit ; aucun faux hors-quota |
| Confirmation à J-8, finale en IMP | Hors périmètre du classement sportif provisoire | À traiter éventuellement avec la gestion finale |

Le moteur reste indépendant de la présentation. Le diagnostic, les filtres et tris n'attribuent aucune place supplémentaire. Toute modification d'une convention sportive doit être validée par le Comité avant application.

## Lot fonctionnel

- Filtres : projection, directe, centre, premières hors quota, incertains, hors projection, entrées/sorties, nouvelles paires.
- Tri des en-têtes et par rang secondaire ou progression. Les rangs conservent leur valeur réelle, les scores manquants restent en bas.
- Historique : recalcul cumulatif pour chaque séance validée, avec rangs et qualification à chaque étape ; nouvelle paire distincte d'une entrée dans la projection. Une perte de statut certain peut refléter un départage en attente.
- Simulation dans la fiche : scores futurs facultatifs, calcul des quatre meilleurs, participation, rangs relatifs aux scores actuels. Aucune qualification future promise ; adversaires, rattachements, voies et quotas figés. Aucun score simulé enregistré ou publié.
- Mobile : tableau compact rang/paire/moyenne ; bouton d'accès à toutes les colonnes, fiche détaillée conservée.
- Aperçus non validés : filtres de qualification et tri de projection désactivés.

## Recette

Données publiques S1 : 346 paires, 118 projetées (5 directes, 113 locales), 2 incertaines, 226 hors projection, 28 premières hors quota certain. Pas de mouvements avant deux séances validées. Les résultats publiés ne sont pas modifiés par ce lot.

Tests ciblés : historique synthétique multi-séance, rangs à égalité, simulation de six séances et scores retenus, filtres et tris, fiche et simulation interactive, verrouillage des données privées, absence de mutation. Tests complémentaires : incompatibilité plafond/minimum, changement de centre, impossibilité de participation. Les tests de navigateur sont réalisés avec un DOM simulé ; rendu mobile réel et déploiement GitHub Pages à vérifier.
