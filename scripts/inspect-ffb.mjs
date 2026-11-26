import {readFile} from "node:fs/promises";
import {makeFfbClient} from "./ffb-client.mjs";

const config=JSON.parse(await readFile(new URL("../config/season.json",import.meta.url),"utf8"));
const first=config.sessions.find(x=>x.ffbId);
if(!first) throw Error("Aucune séance configurée");

// Uniquement les noms de propriétés, types et tailles de tableaux ; aucune valeur
// personnelle, aucun identifiant joueur, aucun jeton dans le journal public.
function shape(value,depth=0){
  if(value===null)return "null";
  if(depth>=10)return Array.isArray(value)?"array":typeof value;
  if(Array.isArray(value))return {type:"array",length:value.length,samples:value.slice(0,2).map(x=>shape(x,depth+1))};
  if(typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([k])=>!/token|password|secret|email|address/i.test(k)).slice(0,100).map(([k,v])=>[k,shape(v,depth+1)]));
  return typeof value;
}
const api=await makeFfbClient({email:process.env.FFB_EMAIL,password:process.env.FFB_PASSWORD});
const results=await api.sessionRanking(first.ffbId,1,100);
console.log("Séance "+first.ffbId+" : structure de la page 1");
console.log(JSON.stringify(shape(results),null,2));
const page2=await api.sessionRanking(first.ffbId,2,100);
console.log("Structure de la page 2");
console.log(JSON.stringify(shape(page2),null,2));
const sessions=await api.sessions(config.simultaneousId);
console.log("Structure de la liste des séances du simultané "+config.simultaneousId);
console.log(JSON.stringify(shape(sessions),null,2));
