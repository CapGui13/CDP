import {computeRanking,compareQuotaStages} from "./ranking.mjs";
import {qualificationDetails} from "./qualification-details.mjs";
import {sportOverview,sessionRanking} from "./sport-dashboard.mjs";
import {rankingHistory,isProjected,isUncertain} from "./ranking-tools.mjs";
import {pairDisplay,playerName} from "./presentation.mjs";
export const normalizeSearch=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
function distance(a,b){let prev=Array.from({length:b.length+1},(_,i)=>i),older=null;for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++){cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])cur[j]=Math.min(cur[j],older[j-2]+1);}older=prev;prev=cur;}return prev[b.length];}
export function matchesSearch(text,query){
 const q=normalizeSearch(query),t=normalizeSearch(text);if(!q)return true;if(t.includes(q))return true;
 const words=t.split(" ");return q.split(" ").every(part=>words.some(w=>w.includes(part)||(part.length>=4&&Math.abs(w.length-part.length)<= (part.length>=8?2:1)&&distance(w,part)<=(part.length>=8?2:1))));
}
export function raceStatus(result,p){
 const remaining=6-result.completedSessions.length,missing=Math.max(0,4-p.count),d=qualificationDetails(result,p);
 return {remaining,missing,absenceBudget:remaining-missing,possible:p.possible,eligible:p.eligible,localRank:d.localRank,quotaMin:d.quotaMin,quotaMax:d.quotaMax,gap:d.gap,status:p.status};
}
export function playerDirectory(rows,result){
 const pairs=new Map(result.ranking.map(p=>[p.key,p])),map=new Map();
 for(const r of rows){const pair=pairs.get(JSON.stringify(r.players.map(p=>p.license).sort((a,b)=>a.localeCompare(b))));if(!pair)continue;
  for(const [i,p] of r.players.entries()){if(!map.has(p.license))map.set(p.license,{player:p,results:[],partners:new Map()});const x=map.get(p.license),partner=r.players[1-i];x.results.push({session:r.session,score:r.score,center:r.center,partner,pair});x.partners.set(partner.license,{partner,pair,count:(x.partners.get(partner.license)?.count??0)+1});}
 }
 return [...map.values()].map(x=>({...x,results:x.results.sort((a,b)=>a.session-b.session),partners:[...x.partners.values()].sort((a,b)=>b.count-a.count),average:x.results.reduce((n,r)=>n+r.score,0)/x.results.length})).sort((a,b)=>playerName(a.player).display.localeCompare(playerName(b.player).display,"fr"));
}
export function sideRankings(rows,result){
 const h=rankingHistory(rows,result),r=result.ranking;
 const regularity=r.filter(p=>p.count>=3).map(p=>{const mean=p.results.reduce((n,x)=>n+x.score,0)/p.count;return {p,sd:Math.sqrt(p.results.reduce((n,x)=>n+(x.score-mean)**2,0)/p.count),mean};}).sort((a,b)=>a.sd-b.sd||b.mean-a.mean);
 const progression=r.map(p=>({p,first:h.byKey.get(p.key)?.stages.find(s=>s.rank!==null)})).filter(x=>x.first&&x.first.session===result.completedSessions[0]&&result.completedSessions.length>=2).map(x=>({...x,gain:x.first.rank-x.p.rank})).sort((a,b)=>b.gain-a.gain);
 const records=r.flatMap(p=>p.results.map(x=>({p,...x}))).sort((a,b)=>b.units-a.units||a.session-b.session);
 const attendance=result.completedSessions.length?r.filter(p=>p.count===result.completedSessions.length):[];
 // Exact composition by series: a mixed-series pair appears in both corresponding groups.
 const series=[...new Set(r.flatMap(p=>p.players.map(x=>x.series)))].sort().map(series=>({series,pairs:r.filter(p=>p.players.some(x=>x.series===series)).slice(0,3)}));
 return {regularity,progression,records,attendance,series};
}
export function centerComparison(rows,result){
 const base=sportOverview(rows,result),last=base.sessions.at(-1),prev=base.sessions.at(-2);
 const directory=playerDirectory(rows,result);
 return base.byCenter.map(c=>{const played=rows.filter(r=>r.center===c.center),ids=new Set(played.flatMap(r=>r.players.map(p=>p.license))),players=directory.filter(x=>ids.has(x.player.license)),first=players.filter(x=>x.player.series.startsWith("1")).length;
 return {...c,players:ids.size,firstSeries:first,latestTables:c.stages.find(s=>s.session===last)?.tables??null,deltaTables:prev===undefined?null:(c.stages.find(s=>s.session===last)?.tables??0)-(c.stages.find(s=>s.session===prev)?.tables??0)};}).sort((a,b)=>b.occurrences-a.occurrences);
}
export function simulateGlobal(rows,result,entries){
 if(!Array.isArray(entries)||!entries.length||entries.length>500)throw Error("Ajouter 1 à 500 résultats hypothétiques.");
 const current=new Map(result.ranking.map(p=>[p.key,p])),completed=new Set(result.completedSessions),centers=new Set(rows.map(r=>r.center)),extra=[],ids=new Set(rows.flatMap(r=>r.players.map(p=>p.license)));
 let counter=0;const nextId=()=>{let id;do{id="scenario-only-"+(++counter);}while(ids.has(id));ids.add(id);return id;};
 for(const e of entries){
  const n=Number(e.session),score=Number(String(e.score).replace(",",".")),center=String(e.center??"").trim();
  if(!Number.isInteger(n)||n<1||n>6||completed.has(n)||!centers.has(center)||String(e.score??"").trim()===""||!Number.isFinite(score)||score<0||score>100||!/^(?:\d{1,3})(?:[.,]\d{1,2})?$/.test(String(e.score).trim()))throw Error("Séance future, centre existant et score de 0 à 100 requis.");
  if(e.kind==="new"){
   const count=Number(e.count??1),series=e.finale==="1"?"2C":e.finale==="2"?"3P":null;
   if(!series||!Number.isInteger(count)||count<1||count>100||extra.length+count>1000)throw Error("Paires fictives : catégorie et effectif de 1 à 100 requis (1000 résultats maximum).");
   for(let i=0;i<count;i++){const a=nextId(),b=nextId();extra.push({session:n,center,score,players:[{license:a,name:"Fictive "+a,series},{license:b,name:"Fictive "+b,series}]});}
  }else{
   const p=current.get(e.key);if(!p)throw Error("Paire existante introuvable.");
   extra.push({session:n,center,score,players:p.players.map(x=>({...x}))});
  }
 }
 const sessions=[...new Set([...completed,...extra.map(r=>r.session)])].sort((a,b)=>a-b);
 const simulated=computeRanking([...rows,...extra],{completedSessions:sessions});
 const before=new Map(result.ranking.map(p=>[p.key,p])),changes=simulated.ranking.filter(p=>before.has(p.key)).map(p=>({p,prior:before.get(p.key),delta:before.get(p.key).rank-p.rank})).filter(x=>x.p.status!==x.prior.status||x.p.route!==x.prior.route);
 return {simulated,changes,added:extra.length,sessions,quotas:simulated.finals.map(f=>({finale:f.finale,quotas:f.quotas?.map(q=>{const old=result.finals.find(x=>x.finale===f.finale)?.quotas?.find(x=>x.center===q.center);return {center:q.center,old:old?.quota??null,oldMax:old?old.quotaMax??old.quota:null,next:q.quota,nextMax:q.quotaMax??q.quota};})??null}))};
}
export function finalPreparation(result){
 if(result.completedSessions.length!==6)return null;
 return result.finals.map(f=>({finale:f.finale,selected:result.ranking.filter(p=>p.finale===f.finale&&p.eligible&&isProjected(p)),uncertain:result.ranking.filter(p=>p.finale===f.finale&&isUncertain(p)),centers:f.quotas?.map(q=>({center:q.center,vacant:q.vacant??null,reserves:result.ranking.filter(p=>p.finale===f.finale&&p.center===q.center&&p.eligible&&p.status==="outside")}))??null}));
}
export function sportsBulletin(rows,result){
 const n=result.completedSessions.at(-1);if(!n)return "Aucune séance validée.";
 const h=rankingHistory(rows,result),scores=sessionRanking(rows,result,n),top=scores[0]?.row.score,leaders=result.ranking.filter(p=>p.rank===1),stats=sportOverview(rows,result);
 const lines=["Coupe de Provence · Bilan S"+n,"","Séance : "+scores.length+" paires dans "+new Set(scores.map(x=>x.row.center)).size+" centres. Saison : "+stats.pairs+" paires distinctes.","Meilleure performance : "+scores.filter(x=>x.row.score===top).map(x=>pairDisplay(x.pair.players)).join(" / ")+" ("+top.toFixed(2).replace(".",",")+" %).","En tête du général : "+leaders.map(p=>pairDisplay(p.players)).join(" / ")+".",...stats.finals.map(f=>"Finale "+f.finale+" : "+f.projected+"/"+f.capacity+" projetées qualifiables ; "+f.uncertain+" cas incertains.")];
 if(h.hasPrevious){
  const changes=[...h.byKey.values()];lines.push("Depuis S"+h.previousSession+" : "+changes.filter(x=>x.event==="in").length+" entrée(s), "+changes.filter(x=>x.event==="out").length+" sortie(s), "+changes.filter(x=>x.event==="new").length+" nouvelle(s) paire(s).");
  const best=Math.max(0,...changes.map(x=>x.delta??0));if(best>0)lines.push("Plus forte remontée : "+result.ranking.filter(p=>h.byKey.get(p.key).delta===best).map(p=>pairDisplay(p.players)).join(" / ")+" (+"+best+" places).");
  const quota=compareQuotaStages(rows,result);for(const f of quota.finals)for(const q of f.quotas??[])if(q.delta&&(q.delta.min!==0||q.delta.max!==0))lines.push("Quota F"+f.finale+" · "+q.center+" : "+q.priorMin+(q.priorMax!==q.priorMin?"–"+q.priorMax:"")+" → "+q.quotaMin+(q.quotaMax!==q.quotaMin?"–"+q.quotaMax:"")+".");
 }
 const counts=stats.sessions.map(session=>({session,count:rows.filter(r=>r.session===session).length}));const record=Math.max(...counts.map(x=>x.count));lines.push("Record de participation : "+record+" paires (",counts.filter(x=>x.count===record).map(x=>"S"+x.session).join(", ")+").","", "Projection indépendante non officielle ; quatre séances ensemble requises.");
 return lines.join("\n").replace("paires (\n","paires (");
}
