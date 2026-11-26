import {test} from "node:test";
import assert from "node:assert/strict";
import {connectPublisher} from "../src/github-publish.mjs";
const snapshot=(sessions=[1],savedAt="2026-11-26T20:27:15Z")=>({schema:"cdp-public-v1",season:"2026-2027",completedSessions:sessions,rows:sessions.map(session=>({session,score:61,center:"A",players:[{license:"public-1",name:"André",series:"3P"},{license:"public-2",name:"Élise",series:"3P"}]})),previews:{},savedAt});
const fixture=({push=true,status=200,putStatus=200}={})=>{
 let data=snapshot(),sha="initial",writes=0;
 const calls=[];
 const fetchImpl=async(url,opt)=>{
  calls.push({url,opt});
  if(status!==200)return {ok:false,status,json:async()=>({})};
  if(url.endsWith("/CDP"))return {ok:true,json:async()=>({full_name:"CapGui13/CDP",default_branch:"main",permissions:{push}})};
  if(opt.method==="PUT"){
   writes++;if(putStatus!==200)return {ok:false,status:putStatus,json:async()=>({})};
   const body=JSON.parse(opt.body);assert.equal(body.sha,sha);assert.equal(body.branch,"main");
   data=JSON.parse(Buffer.from(body.content,"base64").toString("utf8"));sha="new"+writes;
   return {ok:true,json:async()=>({content:{sha},commit:{sha:"commit"+writes}})};
  }
  return {ok:true,json:async()=>({type:"file",encoding:"base64",sha,content:Buffer.from(JSON.stringify(data)).toString("base64")})};
 };
 return {fetchImpl,calls,get writes(){return writes;},get data(){return data;},change(){sha="changed";}};
};
test("token invalide ou compte sans droit de contribution : aucune écriture",async()=>{
 const denied=fixture({push:false});await assert.rejects(connectPublisher("test-token",denied.fetchImpl),/droits/);assert.equal(denied.writes,0);
 const invalid=fixture({status:401});await assert.rejects(connectPublisher("test-token",invalid.fetchImpl),/invalide/);assert.equal(invalid.writes,0);
});
test("publication directe : UTF-8, jeton uniquement en en-tête, SHA et confirmation",async()=>{
 const f=fixture();const p=await connectPublisher("test-token",f.fetchImpl);
 assert.equal(f.writes,0);
 const next=snapshot([1,2],"2027-01-27T20:00:00Z");
 assert.equal((await p.publish(next)).commit,"commit1");assert.deepEqual(f.data,next);assert.equal(f.writes,1);
 for(const call of f.calls){assert.equal(call.opt.headers.Authorization,"Bearer test-token");assert.ok(!call.url.includes("test-token"));assert.ok(!(call.opt.body||"").includes("test-token"));}
});
test("publication antérieure, séance supprimée, aperçu et modification concurrente refusés",async()=>{
 const f=fixture();const p=await connectPublisher("test-token",f.fetchImpl);
 await assert.rejects(p.publish(snapshot([2])),/supprimée/);
 await assert.rejects(p.publish(snapshot([1],"2026-11-25T10:00:00Z")),/antérieure/);
 await assert.rejects(p.publish({...snapshot(),previews:{2:{}}}),/validées/);
 f.change();await assert.rejects(p.publish(snapshot()),/changé/);assert.equal(f.writes,0);
});
test("un token en lecture seule peut être refusé par GitHub au PUT sans faux succès",async()=>{
 const f=fixture({putStatus:403});const p=await connectPublisher("test-token",f.fetchImpl);
 await assert.rejects(p.publish(snapshot()),/refusé/);assert.equal(f.writes,1);assert.deepEqual(f.data,snapshot());
});
