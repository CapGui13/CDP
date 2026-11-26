import {test} from "node:test";
import assert from "node:assert/strict";
import {syncSession} from "../src/session-sync.mjs";
import {readSnapshot,withPreview} from "../src/persistence.mjs";
import {computeRanking} from "../src/ranking.mjs";
import {extractSeries,seriesCode} from "../src/auto-import.mjs";
import {displayCategory} from "../src/presentation.mjs";
import {publicSnapshot} from "../src/publication.mjs";
function fixture(n=346){
 const codes=[5401070,5401057,5401053,5401055,5401059,5401131,5402060,5402074,5403088,5403096,5404016,5401062,5401063,5401064];
 return Array.from({length:n},(_,i)=>({id:i+1,rank:i+1,sessionScore:70-i/10,simultaneousId:codes[i%codes.length],ffbclubnetId:1000+i%codes.length,team:{player1:{id:10000+i*2,ffbId:20000+i*2,firstName:"Jean",lastName:"A"+i},player2:{id:10001+i*2,ffbId:20001+i*2,firstName:"Marie",lastName:"B"+i}}}));
}
function cacheOf(raw,missing=60){
 return raw.map((r,i)=>({session:1,score:r.sessionScore,players:[r.team.player1,r.team.player2].map((p,j)=>({license:String(p.ffbId),name:p.firstName+" "+p.lastName,personId:p.id,series:2*i+j<missing?null:"3P"})),center:null}));
}
function fake(raw){
 const calls={clubs:0,profiles:0,general:0,paginated:0,annuaire:0};
 return {calls,client:{
 fullSessionRanking:async()=>{calls.general++;return raw;},
 clubSessionRanking:async(id,code)=>{calls.clubs++;return {items:raw.filter(r=>String(r.simultaneousId)===String(code))};},
 sessionRanking:async()=>{calls.paginated++;return {items:raw.slice(0,80),pagination:{total_items:raw.length}};},
 currentSeason:async()=>({id:38}),
 ranking:async pid=>{calls.profiles++;return {iv:{iv:[96,88,80,72,64,58,50,42,31,52][pid%10]}};},
 persons:async()=>{calls.annuaire++;throw Error("Annuaire interdit");}
 }};
}
test("346 paires, 60 séries manquantes : une seule passe, 14 clubs, 60 fiches",async()=>{
 const raw=fixture(),{client,calls}=fake(raw);let snap={rows:[],completedSessions:[]};
 const result=await syncSession({client,session:1,id:364548,cache:cacheOf(raw),onCheckpoint:p=>{snap=withPreview(snap,p).snapshot;}});
 assert.equal(result.complete,true);assert.equal(result.centers,346);assert.equal(result.categories,692);
 assert.equal(calls.clubs,14);assert.equal(calls.profiles,60);assert.equal(calls.annuaire,0);assert.equal(calls.general,1);
 assert.equal(snap.previews[1].coverage.verified,true);
 assert.equal(result.rows[0].score,70);
 assert.equal(computeRanking(result.rows,{completedSessions:[1]}).ranking.length,346);
});
test("reprise : aucun club ni joueur déjà confirmé n'est recherché",async()=>{
 const raw=fixture(20),first=fake(raw);let snap={rows:[],completedSessions:[]};
 await syncSession({client:first.client,session:1,id:364548,cache:cacheOf(raw,20),maxProfiles:8,onCheckpoint:p=>{snap=withPreview(snap,p).snapshot;}});
 const saved=readSnapshot(JSON.parse(JSON.stringify(snap))).previews[1];
 const second=fake(raw);
 const r=await syncSession({client:second.client,session:1,id:364548,cache:saved.rows,previousCoverage:saved.coverage});
 assert.equal(r.complete,true);assert.equal(second.calls.clubs,0);assert.equal(second.calls.profiles,12);
 assert.equal(second.calls.annuaire,0);
});
test("annulation après premier lot : contrôle conservé et aucune fiche appelée",async()=>{
 const raw=fixture(20),{client,calls}=fake(raw),signal={aborted:false};let saved;
 await assert.rejects(syncSession({client,session:1,id:364548,cache:cacheOf(raw,20),signal,onCheckpoint:p=>{saved=JSON.parse(JSON.stringify(p));},onProgress:()=>{signal.aborted=true;}}),/interrompue/);
 assert.equal(calls.clubs,3);assert.equal(calls.profiles,0);assert.ok(saved.rows.some(r=>r.centerVerified));
});
test("filtre ignoré : aucun rattachement inventé",async()=>{
 const raw=fixture(20),{client}=fake(raw);client.clubSessionRanking=async()=>raw;
 const r=await syncSession({client,session:1,id:364548,cache:cacheOf(raw,0),centersOnly:true});
 assert.equal(r.centers,0);assert.equal(r.complete,false);assert.ok(r.errors.length>0);
});
test("une paire présente sous un mauvais code : groupe refusé",async()=>{
 const raw=fixture(20),{client}=fake(raw);const real=client.clubSessionRanking;
 client.clubSessionRanking=async(id,code)=>String(code)==="5401070"?{items:[raw[1]]}:real(id,code);
 const r=await syncSession({client,session:1,id:364548,cache:cacheOf(raw,0),centersOnly:true});
 assert.equal(r.complete,false);assert.ok(r.rows.filter(p=>String(p.simultaneousId)==="5401070").every(p=>!p.centerVerified));
});
test("collecte raccourcie rejetée avant sauvegarde",async()=>{
 const raw=fixture(20),{client}=fake(raw.slice(0,19));let saved=false;
 await assert.rejects(syncSession({client,session:1,id:364548,cache:cacheOf(raw),onCheckpoint:()=>{saved=true;}}),/plus courte/);
 assert.equal(saved,false);
});
test("réponse 429 : arrêt après lot, pas d'annuaire ni de fiches",async()=>{
 const raw=fixture(20),{client,calls}=fake(raw);client.clubSessionRanking=async()=>{calls.clubs++;const e=Error("HTTP 429");e.status=429;throw e;};
 await assert.rejects(syncSession({client,session:1,id:364548,cache:cacheOf(raw,20)}),/429/);
 assert.equal(calls.clubs,3);assert.equal(calls.profiles,0);assert.equal(calls.annuaire,0);
});
test("hors quota : neuf IV, catégories 1 et 2, aucune confusion avec IC",()=>{
 for(const [iv,series] of [[96,"1NH"],[88,"1PH"],[80,"1CH"],[72,"1KH"],[64,"1TH"],[58,"2PRH"],[50,"2MH"],[42,"2H"],[31,"3H"]])assert.equal(extractSeries({iv:{iv}}),series);
 assert.equal(seriesCode("1re nationale hors quota"),"1NH");assert.equal(seriesCode("2e majeure HQ"),"2MH");
 assert.equal(extractSeries({ic:{ic:100}}),null);
 assert.equal(displayCategory([{series:"2MH"},{series:"4T"}]),1);
 assert.equal(displayCategory([{series:"2H"},{series:"3H"}]),2);
});
test("publication : preuve locale et erreurs privées ne sont pas exportées",()=>{
 const raw=fixture(2),rows=cacheOf(raw,0),s=withPreview({rows:[],completedSessions:[]},{session:1,rows,coverage:{verified:true,signature:"license-20000",source:"test"},errors:["private-secret"]}).snapshot;
 let i=0;const p=publicSnapshot(s,()=>String(++i)),serialized=JSON.stringify(p);
 assert.ok(!serialized.includes("license-20000"));assert.ok(!serialized.includes("private-secret"));assert.ok(!serialized.includes('"personId"'));
});
