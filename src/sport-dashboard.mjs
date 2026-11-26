import {computeRanking} from "./ranking.mjs?v=season-audit1";
import {qualificationDetails} from "./qualification-details.mjs?v=season-audit1";
import {isProjected,isUncertain} from "./ranking-tools.mjs?v=season-audit1";
import {playerName} from "./presentation.mjs";
const normalized=s=>String(s??"").normalize("NFC").trim().replace(/\s+/g," ").toLocaleLowerCase("fr");
// Stable across regenerated public pseudonyms; ambiguous homonyms are deliberately not resolved.
export const pairRef=p=>JSON.stringify(p.players.map(x=>normalized(playerName(x).display)).sort());
export function pairIndex(ranking){
 const map=new Map();
 for(const p of ranking){const key=pairRef(p);if(!map.has(key))map.set(key,p);else map.set(key,null);}
 return map;
}
const mean=rows=>rows.length?rows.reduce((s,r)=>s+r.score,0)/rows.length:null;
export function sportOverview(rows,result){
 const sessions=[...result.completedSessions].sort((a,b)=>a-b);
 const centers=[...new Set(rows.map(r=>r.center))].sort((a,b)=>a.localeCompare(b,"fr"));
 return {pairs:result.ranking.length,centers:centers.length,players:new Set(rows.flatMap(r=>r.players.map(p=>p.license))).size,sessions,finals:result.finals.map(f=>({finale:f.finale,capacity:f.capacity,projected:result.ranking.filter(p=>p.finale===f.finale&&isProjected(p)).length,uncertain:result.ranking.filter(p=>p.finale===f.finale&&isUncertain(p)).length})),byCenter:centers.map(center=>{
  const played=rows.filter(r=>r.center===center),assigned=result.ranking.filter(p=>p.center===center);
  return {center,occurrences:played.length,pairs:new Set(played.map(r=>JSON.stringify(r.players.map(p=>p.license).sort()))).size,average:mean(played),averageTables:sessions.length?played.length/(2*sessions.length):null,assigned:assigned.length,projected:assigned.filter(isProjected).length,quotas:result.finals.map(f=>{const q=f.quotas?.find(q=>q.center===center);return {finale:f.finale,min:q?.quota??null,max:q?q.quotaMax??q.quota:null};}),stages:sessions.map(session=>{const a=played.filter(r=>r.session===session);return {session,pairs:a.length,tables:a.length/2,average:mean(a)};})};
 })};
}
export function centerDetails(rows,result,center){
 const overview=sportOverview(rows,result).byCenter.find(c=>c.center===center);
 if(!overview)return null;
 const stages=result.completedSessions.map((session,i)=>{const sessions=result.completedSessions.slice(0,i+1);const stage=computeRanking(rows.filter(r=>sessions.includes(r.session)),{completedSessions:sessions});return {session,quotas:stage.finals.map(f=>{const q=f.quotas?.find(q=>q.center===center);return {finale:f.finale,min:q?.quota??null,max:q?q.quotaMax??q.quota:null};})};});
 return {...overview,stages:overview.stages.map((s,i)=>({...s,quotas:stages[i].quotas})),best:result.ranking.filter(p=>p.center===center).slice(0,5),categories:[1,2].map(n=>({finale:n,assigned:result.ranking.filter(p=>p.center===center&&p.finale===n).length,projected:result.ranking.filter(p=>p.center===center&&p.finale===n&&isProjected(p)).length}))};
}
export function sessionRanking(rows,result,session,center="",finale="all"){
 if(!result.completedSessions.includes(session))return [];
 const pairs=new Map(result.ranking.map(p=>[p.key,p]));
 const ranked=rows.filter(r=>r.session===session).map(r=>({row:r,pair:pairs.get(JSON.stringify(r.players.map(p=>p.license).sort((a,b)=>a.localeCompare(b))))})).filter(x=>x.pair).sort((a,b)=>Math.round(b.row.score*100)-Math.round(a.row.score*100)||a.pair.rank-b.pair.rank);
 let last=null,rank=0;
 return ranked.map((x,i)=>{const units=Math.round(x.row.score*100);if(units!==last)rank=i+1;last=units;return {...x,rank};}).filter(x=>(!center||x.row.center===center)&&(finale==="all"||String(x.pair.finale)===String(finale)));
}
export function scoreObjectives(result,p,route="center"){
 const d=qualificationDetails(result,p);
 if(!p.possible)return [];
 const f=result.finals.find(f=>f.finale===p.finale),q=f?.quotas?.find(q=>q.center===p.center);
 let boundary=null;
 if(route==="direct"){
  if(!p.first||p.finale!==1||!f?.reserved||f.directTies?.length||f.direct.length!==f.reserved)return [];
  boundary=result.ranking.find(x=>x.key===f.direct.at(-1));
 }else{
  if(p.route==="direct"||d.boundary===null)return [];
  boundary=result.ranking.find(x=>x.key===q?.local?.at(-1));
 }
 if(!boundary)return [];
 const existing=p.results.map(x=>x.units),remaining=6-result.completedSessions.length;
 const sumAt=(n,u)=>[...existing,...Array(n).fill(u)].sort((a,b)=>b-a).slice(0,4).reduce((a,b)=>a+b,0);
 const strict=(n,u)=>sumAt(n,u)*boundary.divisor>boundary.sum*4;
 const out=[];
 for(let n=Math.max(1,4-p.count);n<=remaining;n++){
  if(!strict(n,10000)){out.push({sessions:n,score:null});continue;}
  let lo=0,hi=10000;
  while(lo<hi){const mid=Math.floor((lo+hi)/2);if(strict(n,mid))hi=mid;else lo=mid+1;}
  out.push({sessions:n,score:lo/100});
 }
 return out;
}
export function pairSeries(rows,result,p){
 const sessions=[...result.completedSessions].sort((a,b)=>a-b);
 return sessions.map((session,i)=>{
  const stageSessions=sessions.slice(0,i+1);
  const stage=i===sessions.length-1?result:computeRanking(rows.filter(r=>stageSessions.includes(r.session)),{completedSessions:stageSessions});
  const x=stage.ranking.find(x=>x.key===p.key);
  if(!x)return {session,score:null,average:null,rank:null,localRank:null,threshold:null};
  const d=qualificationDetails(stage,x);
  return {session,score:x.results.find(r=>r.session===session)?.score??null,average:x.average,rank:x.rank,localRank:d.localRank,threshold:x.route==="direct"?null:d.boundary};
 });
}
