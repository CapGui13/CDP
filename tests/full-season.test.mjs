import {test} from "node:test";
import assert from "node:assert/strict";
import {computeRanking,compareQuotaStages} from "../src/ranking.mjs";
import {qualificationDetails} from "../src/qualification-details.mjs";
import {rankingHistory,isProjected,simulatePair} from "../src/ranking-tools.mjs";
import {sportOverview,centerDetails,sessionRanking,pairSeries,scoreObjectives,pairRef} from "../src/sport-dashboard.mjs";
import {playerDirectory,sideRankings,simulateGlobal,finalPreparation,sportsBulletin} from "../src/race-tools.mjs";
import {publicSnapshot,readPublicSnapshot} from "../src/publication.mjs";
import {readSnapshot,withValidated} from "../src/persistence.mjs";
const sessions=[1,2,3,4,5,6];
const player=(id,series="3P")=>({license:id,name:"Fictif "+id,series});
const row=(id,session,center,score,series="3P")=>({session,center,score,players:[player(id+"a",series),player(id+"b",series)]});
const key=p=>JSON.stringify(p.players.map(x=>x.license).sort((a,b)=>a.localeCompare(b)));
const byId=(r,id)=>r.ranking.find(p=>p.players.some(x=>x.license===id+"a"));
function fixture(seed=42){
 let n=seed>>>0;const rnd=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 const centers=Array.from({length:16},(_,i)=>"Centre "+String(i+1).padStart(2,"0"));
 const rows=[];
 for(const session of sessions){
  for(let i=0;i<320;i++){
   if(i<10?session>3:i>=10&&i<20?session<3:rnd()<.13)continue;
   const home=centers[i%16],center=i%17===0&&session%2===0?centers[(i+1)%16]:home;
   const code=i%7===0?"1C":i%3===0?"2MH":i%3===1?"2H":"3P";
   rows.push(row("p"+String(i).padStart(3,"0"),session,center,Math.round((35+rnd()*40)*100)/100,code));
  }
  // Deux joueurs échangent de partenaire en cours de saison puis reviennent.
  for(let i=0;i<2;i++){
   const a=player("switch"+i+"a"),b=player("switch"+(session===3||session===4?1-i:i)+"b");
   rows.push({session,center:centers[i],score:55+i,players:[a,b]});
  }
 }
 return rows;
}
function projection(r){return r.ranking.map(p=>({ref:pairRef(p),rank:p.rank,average:p.average,count:p.count,center:p.center,status:p.status,route:p.route,finale:p.finale})).sort((a,b)=>a.ref.localeCompare(b.ref));}
function validateStage(rows,r){
 const n=r.completedSessions.length,groups=new Map();
 for(const x of rows){const k=key(x);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}
 assert.equal(r.ranking.length,groups.size);
 for(const p of r.ranking){
  const rr=groups.get(p.key),units=rr.map(x=>Math.round(x.score*100)).sort((a,b)=>b-a).slice(0,4);
  assert.equal(p.average,units.reduce((a,b)=>a+b,0)/(100*units.length));
  assert.equal(p.count,rr.length);assert.equal(p.eligible,rr.length>=4);assert.equal(p.possible,rr.length+6-n>=4);
  assert.equal(p.rank,1+r.ranking.filter(x=>x.sum*p.divisor>p.sum*x.divisor).length);
  if(!p.possible)assert.equal(p.status,"impossible");
  if(isProjected(p)){assert.ok(p.possible);assert.equal(p.status,p.eligible?"provisional":"conditional");}
  if(n===6)assert.ok(p.status!=="conditional");
 }
 for(const f of r.finals){
  const chosen=[...f.direct,...(f.quotas??[]).flatMap(q=>q.local??[])];
  assert.equal(chosen.length,new Set(chosen).size);assert.ok(chosen.length<=f.capacity);
  assert.equal(chosen.length,r.ranking.filter(p=>p.finale===f.finale&&isProjected(p)).length);
  if(f.finale===2)assert.equal(f.direct.length,0);
  for(const k of f.direct){const p=r.ranking.find(p=>p.key===k);assert.ok(p.first&&p.possible&&p.route==="direct");}
  if(f.quotas){
   const min=f.quotas.reduce((s,q)=>s+q.quota,0),max=f.quotas.reduce((s,q)=>s+(q.quotaMax??q.quota),0);
   assert.ok(min+f.reserved<=f.capacity);assert.ok(max>=min);
   if(rows.some(x=>r.ranking.find(p=>p.key===key(x)).finale===f.finale))assert.ok(max+f.reserved>=f.capacity);
   for(const q of f.quotas){
    assert.ok(q.quota>=2);assert.ok((q.local?.length??0)<=q.quota);
    const expected=rows.filter(x=>x.center===q.center&&r.ranking.find(p=>p.key===key(x)).finale===f.finale).length;
    assert.equal(q.weight,expected);assert.equal(q.averageTables,rows.filter(x=>x.center===q.center).length/(2*n));
    for(const k of q.local??[]){const p=r.ranking.find(p=>p.key===k);assert.equal(p.center,q.center);assert.equal(p.route,"center");}
   }
  }
 }
 assert.equal(sportOverview(rows,r).pairs,r.ranking.length);
 assert.equal(playerDirectory(rows,r).reduce((s,p)=>s+p.results.length,0),rows.length*2);
 assert.equal(sideRankings(rows,r).records.length,rows.length);
 assert.equal(sessionRanking(rows,r,r.completedSessions.at(-1)).length,rows.filter(x=>x.session===r.completedSessions.at(-1)).length);
 assert.ok(sportsBulletin(rows,r).includes("Bilan S"+r.completedSessions.at(-1)));
 assert.equal(finalPreparation(r)===null,n!==6);
}
test("saison complète reproductible : 6 étapes, 16 centres, 3 graines et invariants indépendants",()=>{
 for(const seed of [42,137,2027]){
  const all=fixture(seed);let prior=null;
  for(const n of sessions){const rows=all.filter(x=>x.session<=n),r=computeRanking(rows,{completedSessions:sessions.slice(0,n)});
   validateStage(rows,r);assert.deepEqual(projection(computeRanking([...rows].reverse(),{completedSessions:sessions.slice(0,n)})),projection(r));
   if(prior){const h=rankingHistory(rows,r),q=compareQuotaStages(rows,r);assert.equal(h.previousSession,n-1);assert.equal(q.latest,n);for(const p of r.ranking){const old=prior.ranking.find(x=>x.key===p.key);assert.equal(h.byKey.get(p.key).delta,old?old.rank-p.rank:null);}}
   prior=r;
  }
  const p=byId(prior,"p000");assert.equal(p.status,"impossible");assert.equal(p.count,3);
  const x=playerDirectory(all,prior).find(x=>x.player.license==="switch0a");assert.equal(x.results.length,6);assert.equal(x.partners.length,2);assert.equal(x.partners[0].count,4);assert.equal(x.partners[1].count,2);
 }
});
test("rattachement ambigu : deux places à risque, aucun seuil fictif, résolution à S3",()=>{
 const rows=[row("mobile",1,"A",90),row("mobile",2,"B",90),row("a1",1,"A",70),row("a2",1,"A",60),row("a3",1,"A",50),row("b1",1,"B",70),row("b2",1,"B",60),row("b3",1,"B",50)],opts={capacity:4,minimum:2,directPlaces:0};
 const r=computeRanking(rows,{...opts,completedSessions:[1,2]});
 assert.equal(byId(r,"mobile").status,"center-ambiguous");for(const id of ["a1","b1"])assert.equal(byId(r,id).status,"conditional");
 for(const id of ["a2","b2"]){const p=byId(r,id);assert.equal(p.status,"quota-uncertain");assert.equal(qualificationDetails(r,p).boundary,null);assert.deepEqual(scoreObjectives(r,p),[]);}
 for(const q of r.finals[1].quotas){assert.equal(q.local.length,1);assert.equal(q.centerRisk.length,1);assert.equal(q.centerCandidates.length,1);assert.equal(q.vacant,0);}
 const resolved=computeRanking([...rows,row("mobile",3,"A",90)],{...opts,completedSessions:[1,2,3]});assert.equal(byId(resolved,"mobile").route,"center");assert.equal(byId(resolved,"a2").status,"outside");assert.equal(byId(resolved,"b2").route,"center");
});
test("rattachement ambigu : une place vacante potentiellement occupée n'est pas déclarée libre",()=>{
 const rows=[row("mobile",1,"A",90),row("mobile",2,"B",90),row("a1",1,"A",70),row("b1",1,"B",60)];
 const r=computeRanking(rows,{completedSessions:[1,2],capacity:4,minimum:2,directPlaces:0});
 for(const q of r.finals[1].quotas){assert.equal(q.vacant,null);assert.equal(q.centerCandidates.length,1);}
});
test("rattachement ambigu : score trop faible ou qualification directe ne menace pas le quota local",()=>{
 const rows=[row("mobile",1,"A",40),row("mobile",2,"B",40),...["A","B"].flatMap(c=>[row(c+"1",1,c,70),row(c+"2",1,c,65)])];
 const r=computeRanking(rows,{completedSessions:[1,2],capacity:4,minimum:2,directPlaces:0});
 for(const q of r.finals[1].quotas){assert.equal(q.centerRisk,undefined);assert.equal(q.local.length,2);}
 const first=rows.map(x=>({...x,players:x.players.map(p=>({...p,series:"1C"})),score:x.players[0].license.startsWith("mobile")?95:x.score}));
 const f=computeRanking(first,{completedSessions:[1,2],capacity:5,minimum:2,directPlaces:1});
 assert.equal(byId(f,"mobile").route,"direct");for(const q of f.finals[0].quotas)assert.equal(q.local.length,2);
});
test("publication et restauration intégrales : saison complète et pseudonymes renouvelés",()=>{
 const rows=fixture(),snapshot={rows,completedSessions:sessions,previews:{},savedAt:"2027-05-05T20:00:00Z"};
 const r=computeRanking(rows,{completedSessions:sessions});let n=0;
 const publicData=publicSnapshot(snapshot,()=>String(++n));const restored=readPublicSnapshot(JSON.parse(JSON.stringify(publicData)));
 assert.deepEqual(projection(computeRanking(restored.rows,{completedSessions:sessions})),projection(r));
 const second=publicSnapshot(snapshot,()=>String(++n));assert.deepEqual(projection(computeRanking(second.rows,{completedSessions:sessions})),projection(r));
 assert.equal(readSnapshot(snapshot).rows.length,rows.length);assert.equal(withValidated({rows:[],completedSessions:[],previews:{}},snapshot).rows.length,rows.length);
});
test("simuler la dernière séance complète reproduit les véritables calculs du scénario",()=>{
 const rows=fixture().filter(x=>x.session<=5),current=computeRanking(rows,{completedSessions:[1,2,3,4,5]});
 const next=current.ranking.filter(p=>p.count>=3&&p.center).slice(0,70).filter((p,i,all)=>!all.slice(0,i).some(q=>q.players.some(x=>p.players.some(y=>y.license===x.license))));
 const entries=next.map(p=>({key:p.key,kind:"existing",session:6,center:p.center,score:"60.25"}));
 const before=JSON.stringify(rows),actual=simulateGlobal(rows,current,entries);
 const expected=computeRanking([...rows,...next.map(p=>({session:6,center:p.center,score:60.25,players:p.players}))],{completedSessions:sessions});
 assert.deepEqual(projection(actual.simulated),projection(expected));assert.equal(JSON.stringify(rows),before);
 assert.ok(finalPreparation(actual.simulated));for(const p of actual.simulated.ranking)assert.ok(p.status!=="conditional");
});
