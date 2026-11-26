import {test} from "node:test";
import assert from "node:assert/strict";
import {makeFfbClient} from "../src/ffb-browser.mjs";
const response=data=>({ok:true,status:200,json:async()=>data});
const login=()=>response({idToken:"fake-id",refreshToken:"fake-refresh",expiresIn:3600});
test("client FFB : paramètres capturés dans Network et pagination exacte",async()=>{
 const calls=[];const client=await makeFfbClient({email:"test@example.invalid",password:"test",firebaseApiKey:"test",pause:async()=>{},fetchImpl:async(url,opt)=>{
  if(url.includes("identitytoolkit"))return login();
  const body=JSON.parse(opt.body);calls.push(body);
  return response({items:[{rank:body.params.currentPage}],pagination:{total_items:2}});
 }});
 const result=await client.clubSessionRanking(364548,"5401070");
 assert.equal(result.items.length,2);assert.equal(calls.length,2);
 for(const call of calls){assert.equal(call.path,"api/results/sessions/364548/ranking");assert.equal(call.params.simultaneousId,"5401070");assert.equal(call.params.paginate,true);assert.ok(!("club" in call.params));}
});
test("client FFB : ne pas réessayer ni changer de route sur HTTP 429",async()=>{
 let calls=0;const client=await makeFfbClient({email:"test@example.invalid",password:"test",firebaseApiKey:"test",pause:async()=>{},fetchImpl:async(url)=>{
  if(url.includes("identitytoolkit"))return login();calls++;return {ok:false,status:429,json:async()=>({})};
 }});
 await assert.rejects(client.ranking(100,38),/429/);assert.equal(calls,1);
});
test("client FFB : opération déjà annulée, aucun appel réseau supplémentaire",async()=>{
 let calls=0;const client=await makeFfbClient({email:"test@example.invalid",password:"test",firebaseApiKey:"test",pause:async()=>{},fetchImpl:async()=>{calls++;return login();}});
 const ctrl=new AbortController();client.setOperationSignal(ctrl.signal);ctrl.abort();
 await assert.rejects(client.fullSessionRanking(364548),/interrompue/);assert.equal(calls,1);
});
