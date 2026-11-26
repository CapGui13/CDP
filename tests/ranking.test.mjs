import {test} from "node:test";
import assert from "node:assert/strict";
import {computeRanking} from "../src/ranking.mjs";

const player=(i,series="3P")=>({license:String(i),series});
const row=(session,center,score,i,series="3P")=>({session,center,score,players:[player(i,series),player(i+1,series)]});

test("quatre meilleurs résultats sur six",()=>{
  const r=computeRanking([61,53,60,62,50,64].map((score,i)=>row(i+1,"A",score,1)),{completedSessions:[1,2,3,4,5,6]});
  assert.equal(r.ranking[0].average,61.75);
  assert.deepEqual(r.ranking[0].retained,[6,4,1,3]);
  assert.equal(r.ranking[0].eligible,true);
});

test("ordre des licences sans incidence",()=>{
  const second=row(2,"A",60,1);
  second.players.reverse();
  const r=computeRanking([row(1,"A",50,1),second],{completedSessions:[1,2]});
  assert.equal(r.ranking.length,1);
  assert.equal(r.ranking[0].average,55);
});

test("qualification directe réservée et participation conditionnelle",()=>{
  const r=computeRanking([row(1,"A",61,1,"1P"),row(1,"A",60,3,"1P"),row(1,"A",59,5)],{completedSessions:[1],directPlaces:1,capacity:4});
  assert.equal(r.ranking[0].route,"direct");
  assert.equal(r.ranking[0].status,"conditional");
  assert.equal(r.finals[0].quotas[0].quota,3);
  assert.equal(r.ranking[1].route,"center");
});

test("ex aequo direct non départagé arbitrairement",()=>{
  const r=computeRanking([row(1,"A",61,1,"1P"),row(1,"A",61,3,"1P")],{completedSessions:[1],directPlaces:1});
  assert.equal(r.finals[0].directTies.length,2);
  assert.equal(r.ranking[0].rank,r.ranking[1].rank);
});

test("participation devenue mathématiquement impossible",()=>{
  const r=computeRanking([row(1,"A",61,1)],{completedSessions:[1,2,3,4,5]});
  assert.equal(r.ranking[0].status,"impossible");
});

test("centre ambigu signalé",()=>{
  const r=computeRanking([row(1,"A",61,1),row(2,"B",60,1)],{completedSessions:[1,2]});
  assert.equal(r.ranking[0].center,null);
  assert.equal(r.ranking[0].status,"center-ambiguous");
});

test("absence de double qualification et plafonds",()=>{
  const rows=Array.from({length:12},(_,i)=>row(1,i<8?"A":"B",70-i,2*i+1,"1P"));
  const r=computeRanking(rows,{completedSessions:[1],capacity:10,directPlaces:2});
  const f=r.finals[0];
  const chosen=[...f.direct,...f.quotas.flatMap(q=>q.local||[])];
  assert.equal(chosen.length,new Set(chosen).size);
  assert.ok(chosen.length<=10);
  assert.equal(f.quotas.reduce((s,q)=>s+q.quota,0)+f.reserved,10);
});

test("rejet d'un joueur dupliqué",()=>{
  assert.throws(()=>computeRanking([row(1,"A",50,1),row(1,"B",60,2)],{completedSessions:[1]}),/dupliqué/);
});
