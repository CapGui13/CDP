import {test} from "node:test";
import assert from "node:assert/strict";
import {normalizeFfbRanking,extractSeries,readRanking} from "../src/auto-import.mjs";
import {discoverSessions,personIndex,applyPersonInfo,collectCommitteePeople,schemaSummary} from "../src/sync.mjs";
import {readSnapshot,withPreview,withValidated} from "../src/persistence.mjs";
import {provisionalRanking} from "../src/provisional.mjs";
import {publicSnapshot,readPublicSnapshot} from "../src/publication.mjs";
import {computeRanking} from "../src/ranking.mjs";
const player=(id,series=null)=>({license:String(id),name:"Joueur "+id,series,personId:id+1000});
const row=(session,score,a,b,center=null)=>({session,score,center,players:[player(a),player(b)]});
test("S1 fixe, découverte exacte des dates, pas de séance future",()=>{
 const r=discoverSessions({items:[{id:80,date:"2027-01-27T14:30:00"},{id:81,date:"2027-02-24"},{id:82,date:"2026-12-15"}]},"2027-01-28");
 assert.deepEqual(r.sessions.map(x=>[x.number,x.ffbId]),[[1,364548],[2,80]]);
});
test("détection d'une date ambiguë",()=>{
 const r=discoverSessions([{id:80,date:"2027-01-27"},{id:81,date:"2027-01-27"}],"2027-01-28");
 assert.deepEqual(r.conflicts,["2027-01-27"]);assert.equal(r.sessions.length,1);
});
test("centre du tournoi et IV imbriqués ; le club de licence n'est pas le centre",()=>{
 const p={ffbId:1,firstName:"Jean",lastName:"DUPONT",iv:{iv:52},club:{name:"Club de licence"}};
 const q={ffbId:2,name:"Marie MARTIN",iv:44};
 const a=normalizeFfbRanking([{rank:1,score:61,tournament:{club:{name:"Centre de jeu"}},players:[p,q]}],1);
 assert.equal(a.rows[0].center,"Centre de jeu");assert.equal(a.rows[0].players[0].series,"2C");
 assert.equal(normalizeFfbRanking([{score:61,players:[p,q]}],1).rows[0].center,null);
 assert.equal(extractSeries({ic:{ic:100}}),null);
});
test("pagination total_items du service FFB",()=>{
 const p={items:[{rank:1}],pagination:{total_items:15}};
 assert.equal(readRanking(p).total,15);
});
test("recherche groupée par licence, sans conserver les joueurs hors périmètre",async()=>{
 const rows=[row(1,60,1,2)];
 const response={items:[{id:1001,ffbId:1,firstName:"Jean",lastName:"DUPONT",season:{ranking:{iv:52}}},{id:1002,ffbId:2,season:{ranking:{iv:44}}},{id:1003,ffbId:3,iv:100}],pagination:{total_items:3}};
 assert.equal(personIndex(response,new Set(["1","2"])).size,2);
 const count=await collectCommitteePeople({persons:async()=>response},rows);
 assert.equal(count,2);assert.equal(rows[0].players[0].series,"2C");assert.equal(rows[0].players[1].series,"2T");
});
test("les quatre meilleurs scores même lorsque les centres restent inconnus",()=>{
 let s={rows:[],completedSessions:[],previews:{}};
 for(const [i,score] of [61,53,60,62,50,64].entries())s=withPreview(s,{session:i+1,rows:[row(i+1,score,i%2?2:1,i%2?1:2)]}).snapshot;
 const r=provisionalRanking(s);
 assert.equal(r.ranking.length,1);assert.equal(r.ranking[0].average,61.75);assert.equal(r.ranking[0].center,null);assert.deepEqual(r.ranking[0].retained,[6,4,1,3]);
});
test("publication sans licence FFB, identifiants internes ou jetons, identité stable dans le fichier",()=>{
 const a=row(1,60,123456,789012);a.players[0].name="123456";a.players[1].name="Marie MARTIN";a.players[1].token="secret";
 const s=withPreview({rows:[],completedSessions:[]},{session:1,rows:[a]}).snapshot;
 let i=0;const p=publicSnapshot(s,()=>String(++i));
 const serialized=JSON.stringify(p);
 assert.ok(!serialized.includes("123456"));assert.ok(!serialized.includes("789012"));assert.ok(!serialized.includes("secret"));assert.ok(!serialized.includes("personId"));
 assert.equal(readPublicSnapshot(p).previews[1].rows.length,1);
});
test("schéma exporté sans valeurs",()=>{
 const summary=schemaSummary({items:[{club:{name:"Ne pas exposer"},score:60}]});
 assert.ok(summary.includes("items[].club.name : string"));
 assert.ok(!summary.join(" ").includes("Ne pas exposer"));
});
test("classement catégorie 1 à partir de 2C et absence de double qualification",()=>{
 const a=row(1,60,1,2,"A");a.players[0].series="2C";a.players[1].series="4T";
 const b=row(1,59,3,4,"A");b.players.forEach(p=>p.series="2K");
 const r=computeRanking([a,b],{completedSessions:[1]});
 assert.equal(r.ranking[0].finale,1);assert.equal(r.ranking[1].finale,2);
});
test("un aperçu incomplet ne remplace pas un classement validé",()=>{
 const a=row(1,60,1,2,"A");a.players.forEach(p=>p.series="3P");
 const s=withPreview({rows:[a],completedSessions:[1]},{session:1,rows:[row(1,30,1,2)]}).snapshot;
 assert.equal(provisionalRanking(s).ranking[0].average,60);
});
