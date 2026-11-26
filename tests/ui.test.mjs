import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as sync from "../src/session-sync.mjs";
import * as auto from "../src/auto-import.mjs";
import * as calendar from "../src/sync.mjs";
import * as persistence from "../src/persistence.mjs";
import * as presentation from "../src/presentation.mjs";
import * as ranking from "../src/ranking.mjs";
import * as provisional from "../src/provisional.mjs";
import * as publication from "../src/publication.mjs";
import * as query from "../src/query-import.mjs";
import * as details from "../src/qualification-details.mjs";
import * as rankingTools from "../src/ranking-tools.mjs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const storeKey="cdp-2027-normalized-v1";
function element(value=""){
 return {value,children:[],options:[],disabled:false,hidden:false,textContent:"",className:"",
  replaceChildren(...children){this.children=children;this.options=children;},
  append(...children){this.children.push(...children);},
  add(child){this.options.push(child);},
  addEventListener(event,fn){this["on"+event]=fn;},showModal(){this.open=true;},close(){this.open=false;}
 };
}
function boot(storage,client,{published=null,acceptToken=true}={}){
 const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],element()]));
 for(const [id,value] of Object.entries({view:"all",center:"",search:"",qualFilter:"all",sortKey:"rank",sortDirection:"asc",session:"1",sessionId:"364548",page:"1",pageSize:"80",route:"results",email:"test@example.invalid",password:"test"}))elements.get(id).value=value;
 const document={getElementById:id=>elements.get(id),createElement:()=>element()};
 const Option=function(text,value){this.text=text;this.value=value;};
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
 const modules={"ranking-tools.mjs":rankingTools,"qualification-details.mjs":details,"github-publish.mjs":{connectPublisher:async token=>{if(!acceptToken||token!=="test-token")throw Error("Token invalide");return {close(){},publish:async()=>({commit:"test-commit"})};}},"ffb-browser.mjs":{makeFfbClient:async()=>client},"session-sync.mjs":sync,"auto-import.mjs":auto,"sync.mjs":calendar,"persistence.mjs":persistence,"presentation.mjs":presentation,"ranking.mjs":ranking,"provisional.mjs":provisional,"publication.mjs":publication,"query-import.mjs":query};
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
 const imports=[...script.matchAll(/import\s+\{([^}]+)\}\s+from\s+"\.\/src\/([^"?]+)(?:\?[^"]*)?";/g)];
 const names=imports.flatMap(m=>m[1].split(",").map(x=>x.trim()));
 const values=imports.flatMap(m=>m[1].split(",").map(x=>modules[m[2]][x.trim()]));
 new Function("document","Option","localStorage","fetch","AbortController","setTimeout","clearTimeout",...names,script.replace(/^import .*$/gm,""))(document,Option,localStorage,async()=>published?({ok:true,json:async()=>published}):({ok:false}),AbortController,setTimeout,clearTimeout,...values);
 return elements;
}
test("interface : sauvegarde existante, connexion, centres, séries, classement puis rechargement",async()=>{
 const raw=Array.from({length:4},(_,i)=>({rank:i+1,sessionScore:60-i,simultaneousId:i<2?5401070:5401057,ffbclubnetId:i<2?10:20,team:{player1:{id:100+i*2,ffbId:200+i*2,firstName:"Jean",lastName:"A"+i},player2:{id:101+i*2,ffbId:201+i*2,firstName:"Marie",lastName:"B"+i}}}));
 const rows=auto.normalizeFfbRanking(raw,1).rows;for(const p of rows.flatMap(r=>r.players).slice(2))p.series="3P";
 const storage=new Map([[storeKey,JSON.stringify({completedSessions:[],rows:[],previews:{1:{session:1,rows,reasons:["séries et centres"]}}})]]);
 let profiles=0,clubs=0;
 const client={setOperationSignal(){},fullSessionRanking:async()=>raw,clubSessionRanking:async(id,code)=>{clubs++;return {items:raw.filter(r=>String(r.simultaneousId)===String(code))};},currentSeason:async()=>({id:38}),ranking:async()=>{profiles++;return {iv:{iv:50}};},sessionRanking:async()=>({items:raw,total:raw.length})};
 const elements=boot(storage,client),$=id=>elements.get(id);
 assert.equal($("syncPanel").hidden,true);
 $("githubToken").value="test-token";await $("manageForm").onsubmit({preventDefault(){}});
 assert.equal($("syncPanel").hidden,false);
 assert.equal($("ranking").children.length,4);
 await $("loginForm").onsubmit({preventDefault(){}});
 assert.equal($("auth").textContent,"Connecté");assert.equal($("password").value,"");
 await $("findCenters").onclick();
 let saved=JSON.parse(storage.get(storeKey));
 assert.equal(clubs,2);assert.equal(profiles,0);assert.equal(saved.previews[1].rows.filter(r=>r.centerVerified).length,4);
 assert.equal($("cancelSync").disabled,true);
 await $("query").onclick();
 saved=JSON.parse(storage.get(storeKey));
 assert.equal(clubs,2);assert.equal(profiles,2);assert.deepEqual(saved.completedSessions,[1]);assert.equal(saved.rows.length,4);
 assert.equal($("ranking").children.length,4);assert.ok($("message").textContent.includes("Séance validée"));
 const reloaded=boot(storage,client);
 reloaded.get("githubToken").value="test-token";await reloaded.get("manageForm").onsubmit({preventDefault(){}});
 assert.equal(reloaded.get("ranking").children.length,4);assert.ok(reloaded.get("overview").textContent.includes("1 / 6"));
});

test("page unique : cache privé inaccessible à l'affichage avant token, retour public après fermeture",async()=>{
 const row={session:1,center:"A",score:60,players:[{license:"100",name:"Exemple A",series:"3P"},{license:"101",name:"Exemple B",series:"3P"}]};
 const privateData={completedSessions:[1],rows:[row],previews:{},savedAt:"2026-11-26T20:00:00Z"};
 const local=JSON.stringify(privateData),storage=new Map([[storeKey,local]]);
 let i=0;const published=publication.publicSnapshot({...privateData,rows:[{...row,score:72}]},()=>String(++i));
 const pub=boot(storage,null,{published});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(pub.get("syncPanel").hidden,true);
 assert.equal(pub.get("storagePanel").hidden,true);
 assert.equal(pub.get("ranking").children.length,1);
 assert.ok(pub.get("ranking").children[0].children.some(c=>String(c.textContent).includes("72,00")));
 pub.get("githubToken").value="invalid";await pub.get("manageForm").onsubmit({preventDefault(){}});
 assert.equal(pub.get("syncPanel").hidden,true);assert.equal(pub.get("githubToken").value,"");
 pub.get("githubToken").value="test-token";await pub.get("manageForm").onsubmit({preventDefault(){}});
 assert.equal(pub.get("syncPanel").hidden,false);assert.equal(pub.get("storagePanel").hidden,false);
 assert.equal(pub.get("githubToken").value,"");
 assert.ok(pub.get("ranking").children[0].children.some(c=>String(c.textContent).includes("60,00")));
 assert.equal(storage.get(storeKey),local);
 await pub.get("manageClose").onclick();
 assert.equal(pub.get("syncPanel").hidden,true);
 assert.ok(pub.get("ranking").children[0].children.some(c=>String(c.textContent).includes("72,00")));
 assert.equal(storage.get(storeKey),local);
});


test("coupe avant les noms : projection directe ou locale, égalités et hors projection",()=>{
 const source=html.slice(html.indexOf("const statuses="),html.indexOf("function openPair(p){"));
 const cells=new Function("document","pairDisplay",source+"\nreturn {pairCell,qualificationCell};")({createElement:()=>element()},players=>players.map(p=>p.name).join(" / "));
 for(const [status,route,expected,label] of [["conditional","direct","🏆","Directe"],["provisional","center","🏆","Par centre"],["quota-uncertain",null,"?","Quota incertain"],["cutoff-tie","center","?","Ex æquo"],["center-ambiguous",null,"?","Centre ambigu"],["outside",null,"","Hors projection"],["impossible",null,"","Non qualifiable"]]){
  const tr=element(),p={status,route,count:1,players:[{name:"A"},{name:"B"}]};
  cells.pairCell(tr,p);cells.qualificationCell(tr,p);
  assert.equal(tr.children[0].children[0].textContent,expected);
  assert.equal(tr.children[0].children[1].textContent,"A / B");
  assert.equal(tr.children[1].children[0].textContent,label);
 }
});

test("fiche de paire cliquable : rangs, seuil, participation et fermeture",async()=>{
 const rows=Array.from({length:3},(_,i)=>({session:1,center:"A",score:70-i,players:[{license:"a"+i,name:"Exemple A"+i,series:"3P"},{license:"b"+i,name:"Exemple B"+i,series:"3P"}]}));
 let i=0;const published=publication.publicSnapshot({completedSessions:[1],rows,previews:{},savedAt:"2026-11-26T20:00:00Z"},()=>String(++i));
 const e=boot(new Map(),null,{published});
 await new Promise(resolve=>setTimeout(resolve,0));
 const row=e.get("ranking").children[0];
 assert.equal(row.children[0].children[1].textContent,"Cat. 1 · C. 1");
 row.children[1].children[1].onclick();
 assert.equal(e.get("pairDialog").open,true);
 const fields=e.get("pairDetails").children.find(x=>x.className==="pair-detail-grid").children;
 assert.equal(fields[0].textContent,"Rang général");assert.equal(fields[1].textContent,"1 / 3");
 assert.ok(fields.some(x=>x.textContent==="1 / 6 · 3 restante(s) pour atteindre 4"));
 e.get("pairClose").onclick();assert.equal(e.get("pairDialog").open,false);
});

test("filtres et tri cliquable : conservation des rangs et reset",async()=>{
 const rows=Array.from({length:3},(_,i)=>({session:1,center:"A",score:70-i,players:[{license:"a"+i,name:"Exemple A"+i,series:"3P"},{license:"b"+i,name:"Exemple B"+i,series:"3P"}]}));
 let i=0;const published=publication.publicSnapshot({completedSessions:[1],rows,previews:{},savedAt:"2026-11-26T20:00:00Z"},()=>String(++i));
 const e=boot(new Map(),null,{published});
 await new Promise(resolve=>setTimeout(resolve,0));
 e.get("qualFilter").value="direct";e.get("qualFilter").onchange();assert.equal(e.get("ranking").children.length,0);
 e.get("resetFilters").onclick();assert.equal(e.get("ranking").children.length,3);
 e.get("sort-average").onclick();assert.equal(e.get("ranking").children[0].children[0].children[0].textContent,1);
 e.get("sort-average").onclick();assert.equal(e.get("ranking").children[0].children[0].children[0].textContent,3);
 e.get("mobileView").onclick();assert.ok(e.get("rankingTable").className.includes("mobile-full"));
 e.get("ranking").children[0].children[1].children[1].onclick();
 const sim=e.get("pairDetails").children.find(x=>x.className==="pair-simulator");
 const grid=sim.children.find(x=>x.className==="sim-grid");
 grid.children[0].children[0].value="80";
 sim.children.find(x=>x.textContent==="Calculer la simulation").onclick();
 assert.ok(sim.children.find(x=>x.className==="sim-output").textContent.includes("74,00 %"));
});
