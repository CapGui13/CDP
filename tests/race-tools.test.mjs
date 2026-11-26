import {test} from "node:test";
import assert from "node:assert/strict";
import {computeRanking} from "../src/ranking.mjs";
import {matchesSearch,raceStatus,playerDirectory,sideRankings,centerComparison,simulateGlobal,finalPreparation,sportsBulletin} from "../src/race-tools.mjs";
import {makeXlsx} from "../src/xlsx-export.mjs";
const player=(id,series="3P")=>({license:id,name:"Joueur "+id,series});
const row=(a,b,session,score,center="A")=>({session,score,center,players:[player(a),player(b)]});
test("recherche : accents, inversion, faute de frappe, plusieurs mots",()=>{
 assert.ok(matchesSearch("Élise DUPONT / Jean MARTIN","dupont elise"));assert.ok(matchesSearch("Élise DUPONT","duopnt"));assert.ok(!matchesSearch("Élise DUPONT","durand"));assert.ok(!matchesSearch("Élise DUPONT","xx"));
});
test("parcours individuel : partenaires distincts, moyenne personnelle sans mélange qualificatif",()=>{
 const rows=[row("a","b",1,60),row("a","c",2,70,"B"),row("a","b",3,50)];
 const r=computeRanking(rows,{completedSessions:[1,2,3]}),d=playerDirectory(rows,r).find(x=>x.player.license==="a");
 assert.equal(d.results.length,3);assert.equal(d.partners.length,2);assert.equal(d.average,60);assert.equal(d.partners[0].count,2);assert.equal(d.partners[0].pair.average,55);
 assert.equal(sideRankings(rows,r).regularity.length,0);assert.equal(sideRankings(rows,r).records[0].score,70);
 assert.equal(centerComparison(rows,r).find(c=>c.center==="A").players,2);
});
test("course à la finale : absences possibles et impossibilité mathématique",()=>{
 const rows=[row("a","b",1,60)];const r=computeRanking(rows,{completedSessions:[1]});const d=raceStatus(r,r.ranking[0]);assert.equal(d.missing,3);assert.equal(d.absenceBudget,2);
 const late=computeRanking(rows,{completedSessions:[1,2,3,4,5]});assert.equal(raceStatus(late,late.ranking[0]).possible,false);assert.equal(finalPreparation(late),null);
});
test("simulation globale : quotas recalculés, résultats existants et fictifs, isolement",()=>{
 const rows=[row("a","b",1,60),row("c","d",1,55,"B")],r=computeRanking(rows,{completedSessions:[1]}),before=JSON.stringify([rows,r]);
 const e=[{kind:"existing",key:r.ranking[0].key,session:2,center:"A",score:"65.50"},{kind:"new",session:2,center:"B",score:"51",count:40,finale:"2"}];
 const s=simulateGlobal(rows,r,e);assert.equal(s.added,41);assert.equal(s.simulated.ranking.length,42);assert.equal(s.simulated.ranking.find(p=>p.key===r.ranking[0].key).average,62.75);assert.equal(JSON.stringify([rows,r]),before);
 assert.ok(s.quotas.find(f=>f.finale===2).quotas.some(q=>q.old!==q.next));assert.throws(()=>simulateGlobal(rows,r,[{...e[0],session:1}]),/Séance future/);assert.throws(()=>simulateGlobal(rows,r,[e[0],e[0]]),/dupliqué/);
});
test("finales : six séances, quatre ensemble, réserves potentielles et aucune attribution",()=>{
 const rows=Array.from({length:6},(_,i)=>row("a","b",i+1,60));const r=computeRanking(rows,{completedSessions:[1,2,3,4,5,6]});const final=finalPreparation(r);assert.equal(final[1].selected.length,1);assert.equal(final[1].selected[0].count,6);assert.ok(final[1].centers[0].vacant>0);
});
test("bulletin : données exactes, absent ou multi-séances, pas de qualification officielle",()=>{
 const rows=[row("a","b",1,60),row("a","b",2,65)];const r=computeRanking(rows,{completedSessions:[1,2]});const b=sportsBulletin(rows,r);assert.ok(b.includes("Bilan S2"));assert.ok(b.includes("65,00 %"));assert.ok(b.includes("non officielle"));assert.equal(sportsBulletin([],computeRanking([])),"Aucune séance validée.");assert.ok(sportsBulletin([],computeRanking([],{completedSessions:[1]})).includes("0 paires"));
});
test("xlsx : archive ZIP et chaînes littérales, aucune formule",()=>{
 const bytes=makeXlsx([["Paire","Score"],["=1+1 & <test>",59.71]]);const dv=new DataView(bytes.buffer);assert.equal(dv.getUint32(0,true),0x04034b50);assert.equal(dv.getUint32(bytes.length-22,true),0x06054b50);const txt=new TextDecoder().decode(bytes);assert.ok(txt.includes("xl/worksheets/sheet1.xml"));assert.ok(txt.includes("=1+1 &amp; &lt;test&gt;"));assert.ok(txt.includes("<v>59.71</v>"));assert.ok(!txt.includes("<f>"));
});
