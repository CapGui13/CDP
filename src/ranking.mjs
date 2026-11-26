// CDP — moteur de projection non officiel, conventions documentées dans README.md.
export function computeRanking(rows, options = {}) {
  const { completedSessions = [], centers: declaredCenters = [], capacity = 60, minimum = 2, directPlaces = 5, totalSessions = 6, required = 4 } = options;
  if (!Array.isArray(rows) || !Array.isArray(completedSessions) || !Array.isArray(declaredCenters)) throw Error("Entrées invalides");
  if (![capacity, minimum, directPlaces,totalSessions,required].every(Number.isInteger) || capacity<0 || minimum<0 || directPlaces<0 || directPlaces>capacity || totalSessions<1 || required<1 || required>totalSessions) throw Error("Paramètres invalides");
  const completed = new Set(completedSessions);
  if ([...completed].some(n=>!Number.isInteger(n)||n<1||n>totalSessions)) throw Error("Séance invalide");
  const centers = [...new Set(declaredCenters)];
  if (centers.some(c=>typeof c!=="string"||!c.trim())) throw Error("Centre invalide");
  const pairs = new Map(), players = new Map(), seenPlayers = new Set(), weights = new Map(), warnings = [];
  const validSeries = ["1N","1P","1C","1K","1T","2PR","2P","2C","2K","2T","3PR","3P","3C","3K","3T","4PR","4P","4C","4K","4T","NC","1NH","1PH","1CH","1KH","1TH","2PRH","2MH","2H","3H"];
  for (const row of rows) {
    const {session, center, score} = row;
    if (!completed.has(session) || typeof center!=="string" || !center.trim() || !Number.isFinite(score) || score<0 || score>100 || !Array.isArray(row.players) || row.players.length!==2) throw Error("Résultat invalide");
    const ps = row.players.map(p=>{
      if (typeof p.license!=="string" || !p.license.trim() || !validSeries.includes(p.series)) throw Error("Licence ou série inconnue");
      const prev=players.get(p.license);
      if(prev && prev!==p.series) throw Error("Série de référence incohérente : "+p.license);
      players.set(p.license,p.series);
      const sk=JSON.stringify([session,p.license]);
      if(seenPlayers.has(sk)) throw Error("Joueur dupliqué dans une séance : "+p.license);
      seenPlayers.add(sk);
      return {...p};
    }).sort((a,b)=>a.license.localeCompare(b.license));
    const key=JSON.stringify(ps.map(p=>p.license));
    if(!centers.includes(center)) centers.push(center);
    const first=ps.some(p=>p.series.startsWith("1"));
    const finale=first||ps.some(p=>["2PR","2P","2C","2PRH","2MH"].includes(p.series))?1:2;
    if(!pairs.has(key)) pairs.set(key,{key,players:ps,first,finale,results:[]});
    pairs.get(key).results.push({session,center,score,units:Math.round(score*100)});
    const wk=JSON.stringify([finale,center]);weights.set(wk,(weights.get(wk)||0)+1);
  }
  centers.sort();
  const ranking=[...pairs.values()].map(p=>{
    const ordered=[...p.results].sort((a,b)=>b.units-a.units||a.session-b.session);
    const best=ordered.slice(0,required), count=p.results.length;
    const counts=new Map();
    for(const r of p.results) counts.set(r.center,(counts.get(r.center)||0)+1);
    const max=Math.max(...counts.values()), candidates=[...counts].filter(x=>x[1]===max).map(x=>x[0]).sort();
    return {...p, count, sum:best.reduce((s,r)=>s+r.units,0), divisor:best.length, average:best.reduce((s,r)=>s+r.units,0)/(100*best.length), retained:best.map(r=>r.session), center:candidates.length===1?candidates[0]:null, candidateCenters:candidates, eligible:count>=required, possible:count+totalSessions-completed.size>=required, status:"outside", route:null};
  });
  const compare=(a,b)=>b.sum*a.divisor-a.sum*b.divisor;
  ranking.sort((a,b)=>compare(a,b)||a.key.localeCompare(b.key));
  ranking.forEach((p,i)=>{p.rank=i&&compare(p,ranking[i-1])===0?ranking[i-1].rank:i+1;if(!p.possible)p.status="impossible";else if(!p.center)p.status="center-ambiguous";});
  function select(candidates, limit, route) {
    if(limit<=0)return {selected:[],ties:[],tiePlaces:0};
    const sorted=candidates.filter(p=>p.possible).sort(compare);
    const boundary=sorted.length>limit&&compare(sorted[limit-1],sorted[limit])===0?sorted[limit-1]:null;
    const selected=[],ties=[];
    sorted.forEach((p,i)=>{
      if(boundary&&compare(p,boundary)===0) {p.status="cutoff-tie";p.route=route;ties.push(p);}
      else if(i<limit){p.status=p.eligible?"provisional":"conditional";p.route=route;selected.push(p);}
    });
    return {selected,ties,tiePlaces:boundary?Math.max(0,limit-selected.length):0};
  }
  const finals=[];
  for(const finale of [1,2]){
    const reserved=finale===1?directPlaces:0;
    const available=capacity-reserved;
    const direct=select(ranking.filter(p=>p.finale===finale&&p.first),reserved,"direct");
    if(direct.ties.length)warnings.push("Finale "+finale+" : ex æquo à la frontière directe ; la répartition locale dépend du départage.");
    const entries=centers.map(center=>({center,weight:weights.get(JSON.stringify([finale,center]))||0,quota:minimum}));
    const base=minimum*entries.length;
    if(base>available){warnings.push("Finale "+finale+" : minimum par centre incompatible avec le plafond.");for(const p of ranking.filter(p=>p.finale===finale&&p.possible&&p.center&&!p.route))p.status="quota-uncertain";finals.push({finale,capacity,reserved,direct:direct.selected.map(p=>p.key),directTies:direct.ties.map(p=>p.key),quotas:null});continue;}
    const total=entries.reduce((s,e)=>s+e.weight,0);
    const left=available-base;
    if(total){
      for(const e of entries){const numerator=left*e.weight;e.quota+=Math.floor(numerator/total);e.remainder=numerator%total;}
      const remaining=available-entries.reduce((s,e)=>s+e.quota,0);
      const ordered=[...entries].sort((a,b)=>b.remainder-a.remainder||a.center.localeCompare(b.center));
      if(remaining>0 && remaining<ordered.length && ordered[remaining-1].remainder===ordered[remaining].remainder){
        const border=ordered[remaining-1].remainder;
        warnings.push("Finale "+finale+" : égalité de restes pour les dernières places ; quotas concernés non tranchés.");
        for(const e of ordered){if(e.remainder>border)e.quota++;else if(e.remainder===border)e.quotaUncertain=true;}
      }else for(const e of ordered.slice(0,remaining))e.quota++;
    }else if(left) warnings.push("Finale "+finale+" : participation non disponible, places restantes non réparties.");
    for(const e of entries){
      const candidates=ranking.filter(p=>p.finale===finale&&p.center===e.center&&!p.route);
      if(direct.ties.length){for(const p of candidates.filter(p=>p.possible))p.status="quota-uncertain";e.local=null;}
      else {
        const local=select(candidates,e.quota,"center");
        e.local=local.selected.map(p=>p.key);e.ties=local.ties.map(p=>p.key);e.tiePlaces=local.tiePlaces;e.vacant=Math.max(0,e.quota-local.selected.length-local.tiePlaces);
        if(e.quotaUncertain){
          e.quotaMax=e.quota+1;
          const possible=candidates.filter(p=>p.possible).sort(compare);
          // The lower quota is certain under this projection. Only the extra seat is unresolved.
          const border=possible[e.quota];
          e.extraCandidates=border?possible.filter(p=>!p.route&&compare(p,border)===0).map(p=>{p.status="quota-uncertain";return p.key;}):[];
        }
      }
      const participation=[...rows].filter(r=>r.center===e.center).length;
      e.averageTables=completed.size?participation/(2*completed.size):null;
      e.minimumTablesReached=e.averageTables!==null&&e.averageTables>=7;
    }
    finals.push({finale,capacity,reserved,direct:direct.selected.map(p=>p.key),directTies:direct.ties.map(p=>p.key),quotas:entries});
  }
  if(completed.size){
    const small=centers.map(center=>({center,averageTables:rows.filter(r=>r.center===center).length/(2*completed.size)})).filter(c=>c.averageTables<7);
    if(small.length)warnings.push("Moyenne actuelle inférieure à 7 tables : "+small.map(c=>c.center+" ("+c.averageTables.toLocaleString("fr-FR",{maximumFractionDigits:2})+")").join(", ")+". Signalement provisoire ; aucune exclusion automatique.");
  }
  return {completedSessions:[...completed].sort((a,b)=>a-b),ranking,finals,warnings};
}

// Comparaison historique recalculée à partir des mêmes résultats et conventions.
// Aucune photographie de quota n'est enregistrée ni réutilisée comme règle.
export function compareQuotaStages(rows, current, options={}){
  const sessions=[...new Set(current.completedSessions)].sort((a,b)=>a-b);
  const latest=sessions.at(-1)??null;
  const previousSessions=sessions.slice(0,-1);
  const previous=previousSessions.length?computeRanking(rows.filter(r=>previousSessions.includes(r.session)),{...options,completedSessions:previousSessions}):null;
  const finals=current.finals.map(f=>{
    const old=previous?.finals.find(p=>p.finale===f.finale);
    const oldByCenter=new Map((old?.quotas??[]).map(q=>[q.center,q]));
    const localMin=f.quotas?.reduce((n,q)=>n+q.quota,0)??null;
    const unassigned=localMin===null?null:Math.max(0,f.capacity-f.reserved-localMin);
    const quotas=f.quotas?.map(q=>{
      const prior=oldByCenter.get(q.center);
      const min=q.quota,max=q.quotaMax??min;
      const priorMin=prior?.quota??null,priorMax=prior?prior.quotaMax??priorMin:null;
      const delta=prior?{min:min-priorMax,max:max-priorMin}:null;
      return {...q,quotaMin:min,quotaMax:max,priorMin,priorMax,delta,newCenter:!!previous&&!prior&&!!old?.quotas,priorUnavailable:!!previous&&!old?.quotas};
    })??null;
    return {...f,quotas,localMin,unassigned,unresolvedRemainder:!!f.quotas?.some(q=>q.quotaUncertain)};
  });
  return {latest,previousSessions,sessions,finals};
}
