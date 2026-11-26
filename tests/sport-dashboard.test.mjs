import {test} from "node:test";
import assert from "node:assert/strict";
import {computeRanking} from "../src/ranking.mjs";
import {pairRef,pairIndex,sportOverview,centerDetails,sessionRanking,scoreObjectives,pairSeries} from "../src/sport-dashboard.mjs";
const row=(id,session,score,center="A",names=[id+" Alice",id+" Bob"])=>({session,score,center,players:names.map((name,i)=>({license:id+i,name,series:"3P"}))});
test("référence publique indépendante des licences et homonymes non résolus",()=>{
 const a=row("a",1,60,"A",["Élise Dupont","Jean Martin"]),b=row("b",1,65,"A",["Jean Martin","Élise Dupont"]);
 assert.equal(pairRef(a),pairRef(b));assert.equal(pairIndex([a,b]).get(pairRef(a)),null);
});
test("statistiques : fréquentation réelle, rattachement, séances et ex aequo",()=>{
 const rows=[row("a",1,60),row("b",1,60),row("a",2,65,"B"),row("c",2,40,"B")],r=computeRanking(rows,{completedSessions:[1,2]});
 const s=sportOverview(rows,r);assert.equal(s.pairs,3);assert.equal(s.players,6);assert.equal(s.centers,2);
 const a=centerDetails(rows,r,"A");assert.equal(a.pairs,2);assert.equal(a.assigned,1);assert.equal(a.averageTables,.5);assert.equal(a.stages[1].pairs,0);assert.equal(a.stages[1].average,null);
 assert.deepEqual(sessionRanking(rows,r,1).map(x=>x.rank),[1,1]);assert.equal(sessionRanking(rows,r,3).length,0);
 const p=r.ranking.find(x=>x.players[0].license==="a0");assert.equal(pairSeries(rows,r,p)[1].localRank,null);
});
test("objectif strict, quatre meilleurs résultats, absence de mutation",()=>{
 const rows=[row("a",1,59.71),row("b",1,60.21)],r=computeRanking(rows,{completedSessions:[1],capacity:1,minimum:0,directPlaces:0});
 const p=r.ranking.find(x=>x.players[0].license==="a0"),before=JSON.stringify(r);
 assert.deepEqual(scoreObjectives(r,p),[{sessions:3,score:60.38},{sessions:4,score:60.22},{sessions:5,score:60.22}]);assert.equal(JSON.stringify(r),before);
});
test("objectif à seuil 100 impossible et frontière incertaine sans cible",()=>{
 const rows=[row("a",1,100),row("b",1,99)],r=computeRanking(rows,{completedSessions:[1],capacity:1,minimum:0,directPlaces:0});
 assert.deepEqual(scoreObjectives(r,r.ranking[1]).map(x=>x.score),[null,null,null]);
 const tie=computeRanking([row("a",1,60),row("b",1,60)],{completedSessions:[1],capacity:1,minimum:0,directPlaces:0});
 assert.deepEqual(scoreObjectives(tie,tie.ranking[0]),[]);
});
