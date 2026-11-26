// Classement de travail cumulant toutes les séances effectivement collectées.
// Aucune qualification n'est attribuée sans séries, centres et exhaustivité validés.
import {displayCategory} from "./presentation.mjs";
const pairKey=players=>JSON.stringify(players.map(p=>String(p.license)).sort());
export function provisionalRanking(snapshot){
 const validated=new Set(snapshot.completedSessions),bySession=new Map();
 for(const row of snapshot.rows){if(!bySession.has(row.session))bySession.set(row.session,[]);bySession.get(row.session).push(row);}
 for(const p of Object.values(snapshot.previews??{}))if(!validated.has(p.session))bySession.set(p.session,p.rows);
 const pairs=new Map(),people=new Map();
 for(const rows of bySession.values())for(const row of rows)for(const p of row.players){
  const old=people.get(p.license)||{};const merged={...old,...p};if(!p.series&&old.series)merged.series=old.series;
  people.set(p.license,merged);
 }
 for(const rows of bySession.values())for(const row of rows){
  const key=pairKey(row.players);if(!pairs.has(key))pairs.set(key,{key,players:row.players.map(p=>people.get(p.license)),results:[]});
  pairs.get(key).results.push({session:row.session,score:row.score,units:Math.round(row.score*100),center:row.center});
 }
 const out=[...pairs.values()].map(p=>{
  const best=[...p.results].sort((a,b)=>b.units-a.units||a.session-b.session).slice(0,4);
  const sum=best.reduce((n,r)=>n+r.units,0),divisor=best.length;
  const counts=new Map();
  for(const r of p.results)if(r.center)counts.set(r.center,(counts.get(r.center)||0)+1);
  const max=Math.max(0,...counts.values()),candidates=[...counts].filter(x=>x[1]===max).map(x=>x[0]);
  const center=p.results.every(r=>r.center)&&candidates.length===1?candidates[0]:null;
  return {...p,sum,divisor,average:sum/(100*divisor),retained:best.map(r=>r.session),count:p.results.length,center,finale:displayCategory(p.players)};
 });
 const compare=(a,b)=>b.sum*a.divisor-a.sum*b.divisor;
 out.sort((a,b)=>compare(a,b)||a.key.localeCompare(b.key));out.forEach((p,i)=>{p.rank=i&&compare(p,out[i-1])===0?out[i-1].rank:i+1;});
 return {ranking:out,sessions:[...bySession.keys()].sort((a,b)=>a-b),validated:validated.size};
}
