// Diagnostic de lecture du résultat du moteur ; aucune attribution de qualification ici.
const ahead=(a,b)=>a.sum*b.divisor>b.sum*a.divisor;
const rankIn=(p,group)=>group.some(x=>x.key===p.key)?1+group.filter(x=>ahead(x,p)).length:null;
export function qualificationDetails(result,p){
 const category=result.ranking.filter(x=>x.finale===p.finale);
 const center=p.center?category.filter(x=>x.center===p.center):[];
 const final=result.finals.find(f=>f.finale===p.finale);
 const quota=final?.quotas?.find(q=>q.center===p.center)??null;
 const directSet=new Set(final?.direct??[]);
 const directTies=new Set(final?.directTies??[]);
 const local=center.filter(x=>x.possible&&!directSet.has(x.key)&&!directTies.has(x.key));
 const localRank=final?.directTies?.length?null:rankIn(p,local);
 const selected=new Set(quota?.local??[]);
 const selectedPairs=local.filter(x=>selected.has(x.key));
 // Seuil affiché uniquement si le quota est rempli et la frontière est certaine.
 const boundary=quota&&quota.quota>0&&!quota.quotaUncertain&&!quota.centerCandidates?.length&&quota.local!==null&&!quota.ties?.length&&selectedPairs.length===quota.quota?selectedPairs.at(-1):null;
 const gap=boundary?p.average-boundary.average:null;
 return {generalRank:p.rank,generalTotal:result.ranking.length,categoryRank:rankIn(p,category),categoryTotal:category.length,centerRank:rankIn(p,center),centerTotal:center.length,localRank,localTotal:local.length,quotaMin:quota?.quota??null,quotaMax:quota?quota.quotaMax??quota.quota:null,localVacant:quota?.vacant??null,boundary:boundary?.average??null,gap,firstOutside:!!boundary&&p.status==="outside"&&localRank===quota.quota+1,missing:Math.max(0,4-p.count),remaining:6-result.completedSessions.length};
}
export function qualificationReason(p,d){
 switch(p.status){
  case "conditional":return (p.route==="direct"?"Dans les cinq places directes projetées.":"Dans les places attribuées au centre.")+" Il reste "+d.missing+" séance(s) à jouer ensemble.";
  case "provisional":return (p.route==="direct"?"Dans les places directes projetées.":"Dans le quota projeté du centre.")+" La condition de quatre séances ensemble est remplie.";
  case "outside":return d.localRank!==null&&d.quotaMin!==null?(d.firstOutside?"Première paire hors quota. ":"")+"Rang local "+d.localRank+" pour "+(d.quotaMax!==d.quotaMin?d.quotaMin+" à "+d.quotaMax:d.quotaMin)+" place(s).":"Hors projection actuelle ; consulter les quotas et avertissements.";
  case "impossible":return "Le nombre de séances restantes ne permet plus d’atteindre quatre séances ensemble.";
  case "center-ambiguous":return "Plusieurs centres fréquentés à égalité : rattachement à confirmer.";
  case "cutoff-tie":return "Ex æquo à la frontière "+(p.route==="direct"?"des places directes":"du quota local")+" : départage nécessaire.";
  case "quota-uncertain":return "Le quota, le rattachement d’une autre paire ou le départage direct reste incertain.";
  default:return "Qualification à vérifier.";
 }
}
