import {test} from "node:test";
import assert from "node:assert/strict";
import {computeRanking} from "../src/ranking.mjs";
import {qualificationDetails} from "../src/qualification-details.mjs";
import {rankingHistory,qualificationFilter,sortRanking,simulatePair} from "../src/ranking-tools.mjs";
const row=(id,session,score,center="A",series="3P")=>({session,score,center,players:[{license:id+"a",name:id+" A",series},{license:id+"b",name:id+" B",series}]});
const byId=(r,id)=>r.ranking.find(p=>p.players[0].license===id+"a");
test("historique : entrées, sorties, nouvelles paires, rangs et scores réels",()=>{
 const rows=[...Array.from({length:61},(_,i)=>row("p"+String(i).padStart(2,"0"),1,90-i)),row("p00",2,0),row("p60",2,100),row("new",2,99)];
 const r=computeRanking(rows,{completedSessions:[1,2]}),h=rankingHistory(rows,r);
 assert.equal(h.hasPrevious,true);assert.equal(h.previousSession,1);
 assert.equal(h.byKey.get(byId(r,"new").key).event,"new");
 assert.equal(h.byKey.get(byId(r,"p60").key).event,"in");
 assert.equal([...h.byKey.values()].filter(x=>x.event==="out").length,2);
 assert.equal(h.byKey.get(byId(r,"p60").key).stages[0].rank,61);
 assert.equal(qualificationFilter(byId(r,"p60"),"in",null,h.byKey.get(byId(r,"p60").key)),true);
});
test("S1 : aucune évolution inventée ; filtres et tris n'altèrent pas le classement",()=>{
 const rows=[row("a",1,65,"A","1C"),row("b",1,55),row("c",1,55)];
 const r=computeRanking(rows,{completedSessions:[1]});
 const h=rankingHistory(rows,r);
 assert.equal(h.hasPrevious,false);assert.equal(h.byKey.get(byId(r,"a").key).delta,null);
 assert.equal(r.ranking.filter(p=>qualificationFilter(p,"direct")).length,1);
 const sorted=sortRanking(r.ranking,"average","asc");
 assert.equal(sorted[0].rank,2);assert.equal(sorted.at(-1).rank,1);assert.equal(r.ranking[0].rank,1);
 assert.equal(sortRanking(r.ranking,"s2","desc")[0].rank,1);
});
test("simulateur : 4 meilleurs, zéros, décimales, séances non jouées et absence de mutation",()=>{
 const rows=[row("a",1,60),row("a",2,55),row("a",3,50),row("a",4,45),row("b",1,70)];
 const r=computeRanking(rows,{completedSessions:[1,2,3,4]}),p=byId(r,"a");
 const snapshot=JSON.stringify(r);
 const sim=simulatePair(r,p,{5:"80,50",6:"0"});
 assert.equal(sim.average,61.375);assert.equal(sim.count,6);assert.deepEqual(sim.retained,[5,1,2,3]);assert.equal(sim.missing,0);
 assert.equal(sim.generalRank,2);assert.equal(JSON.stringify(r),snapshot);
 assert.throws(()=>simulatePair(r,p,{1:80}),/S1/);assert.throws(()=>simulatePair(r,p,{5:101}),/S5/);assert.throws(()=>simulatePair(r,p,{5:"50.123"}),/S5/);
 assert.equal(simulatePair(r,p,{5:"",6:""}).count,4);
});
test("rang à égalité et seuil indéterminé : pas de départage par licence",()=>{
 const r=computeRanking([row("a",1,60),row("b",1,60)],{completedSessions:[1],capacity:1,minimum:0,directPlaces:0});
 for(const p of r.ranking){const d=qualificationDetails(r,p);assert.equal(p.rank,1);assert.equal(d.categoryRank,1);assert.equal(d.boundary,null);assert.equal(p.status,"cutoff-tie");assert.equal(qualificationFilter(p,"uncertain",d),true);}
});

test("minimum par centre incompatible avec le plafond : aucune fausse exclusion",()=>{
 const r=computeRanking([row("a",1,65,"A"),row("b",1,60,"B")],{completedSessions:[1],capacity:3,minimum:2,directPlaces:0});
 assert.equal(r.finals.find(f=>f.finale===2).quotas,null);
 for(const p of r.ranking){assert.equal(p.status,"quota-uncertain");assert.equal(qualificationDetails(r,p).quotaMin,null);}
});
test("changement de centre à égalité et participation devenue impossible",()=>{
 const r=computeRanking([row("a",1,60,"A"),row("a",2,65,"B"),row("b",1,80,"A")],{completedSessions:[1,2]});
 const a=byId(r,"a");assert.equal(a.center,null);assert.equal(a.status,"center-ambiguous");assert.equal(qualificationDetails(r,a).localRank,null);
 const late=computeRanking([row("b",1,80)],{completedSessions:[1,2,3,4,5]});
 assert.equal(late.ranking[0].status,"impossible");
});
