import {computeRanking} from "./ranking.mjs?v=season-audit1";
import {qualificationDetails} from "./qualification-details.mjs?v=season-audit1";
export const isProjected=p=>["conditional","provisional"].includes(p.status);
export const isUncertain=p=>["center-ambiguous","cutoff-tie","quota-uncertain"].includes(p.status);
export function rankingHistory(rows,current){
 const sessions=[...current.completedSessions].sort((a,b)=>a-b);
 const stages=sessions.slice(0,-1).map((session,i)=>({session,ranking:computeRanking(rows.filter(r=>sessions.slice(0,i+1).includes(r.session)),{completedSessions:sessions.slice(0,i+1)}).ranking}));
 if(sessions.length)stages.push({session:sessions.at(-1),ranking:current.ranking});
 const maps=stages.map(s=>({session:s.session,byKey:new Map(s.ranking.map(p=>[p.key,p]))}));
 const previous=maps.at(-2)?.byKey;
 const byKey=new Map(current.ranking.map(p=>{
  const prior=previous?.get(p.key),before=prior?isProjected(prior):false,after=isProjected(p);
  const event=!previous?"initial":!prior?"new":before&&!after?"out":!before&&after?"in":"same";
  return [p.key,{delta:prior?prior.rank-p.rank:null,event,stages:maps.map(s=>{const x=s.byKey.get(p.key);return {session:s.session,rank:x?.rank??null,average:x?.average??null,status:x?.status??null};})}];
 }));
 return {byKey,hasPrevious:!!previous,previousSession:maps.at(-2)?.session??null,latestSession:sessions.at(-1)??null};
}
export function qualificationFilter(p,filter,details,history){
 switch(filter){
 case "projected":return isProjected(p);
 case "direct":return isProjected(p)&&p.route==="direct";
 case "center":return isProjected(p)&&p.route==="center";
 case "near":return !!details?.firstOutside;
 case "uncertain":return isUncertain(p);
 case "outside":return p.status==="outside"||p.status==="impossible";
 case "in":case "out":case "new":return history?.event===filter;
 default:return true;
 }
}
const qualificationOrder=p=>isProjected(p)?(p.route==="direct"?0:1):isUncertain(p)?2:p.status==="outside"?3:4;
export function sortRanking(rows,sort="rank",direction="asc",detailMap=new Map(),historyMap=new Map(),nameFor=p=>p.players.map(x=>x.name).join(" / ")){
 const pick=p=>{
  if(sort==="name")return nameFor(p);
  if(sort==="center")return p.center;
  if(sort==="qualification")return qualificationOrder(p);
  if(sort==="categoryRank")return detailMap.get(p.key)?.categoryRank??null;
  if(sort==="centerRank")return detailMap.get(p.key)?.centerRank??null;
  if(sort==="delta")return historyMap.get(p.key)?.delta??null;
  if(/^s[1-6]$/.test(sort))return p.results.find(r=>r.session===Number(sort[1]))?.score??null;
  if(["rank","finale","count","average"].includes(sort))return p[sort];
  return p.rank;
 };
 return [...rows].sort((a,b)=>{
  const x=pick(a),y=pick(b);
  if(x==null||y==null)return x==null&&y==null?a.rank-b.rank:x==null?1:-1;
  const c=typeof x==="string"?x.localeCompare(y,"fr",{sensitivity:"base"}):x-y;
  return (direction==="desc"?-c:c)||a.rank-b.rank||a.key.localeCompare(b.key);
 });
}
// Simulation de moyenne, pas de qualification future : adversaires et seuils figés.
export function simulatePair(result,p,futureScores){
 if(!futureScores||typeof futureScores!=="object"||Array.isArray(futureScores))throw Error("Scores invalides");
 const completed=new Set(result.completedSessions),added=[];
 for(const [key,value] of Object.entries(futureScores)){
  if(value===""||value===null||value===undefined)continue;
  const session=Number(key),score=Number(String(value).replace(",","."));
  if(!Number.isInteger(session)||session<1||session>6||completed.has(session)||!Number.isFinite(score)||score<0||score>100||!/^(?:\d{1,3})(?:[.,]\d{1,2})?$/.test(String(value).trim()))throw Error("S"+key+" : saisir un score de 0 à 100, avec deux décimales au maximum.");
  added.push({session,units:Math.round(score*100)});
 }
 const best=[...p.results.map(r=>({session:r.session,units:r.units})),...added].sort((a,b)=>b.units-a.units||a.session-b.session).slice(0,4);
 const sum=best.reduce((n,r)=>n+r.units,0),divisor=best.length,average=sum/(100*divisor);
 const ahead=x=>x.key!==p.key&&x.sum*divisor>sum*x.divisor;
 const details=qualificationDetails(result,p);
 const local=result.ranking.filter(x=>x.key!==p.key&&x.center===p.center&&x.finale===p.finale&&x.possible&&x.route!=="direct");
 return {average,count:p.count+added.length,missing:Math.max(0,4-p.count-added.length),retained:best.map(r=>r.session),added:added.length,generalRank:1+result.ranking.filter(ahead).length,categoryRank:1+result.ranking.filter(x=>x.finale===p.finale&&ahead(x)).length,localRank:p.center&&p.route!=="direct"&&details.localRank!==null?1+local.filter(ahead).length:null,boundary:details.boundary,gap:details.boundary===null?null:average-details.boundary};
}
