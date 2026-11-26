// Export volontaire pour GitHub Pages : seules les données sportives nécessaires.
// Les identifiants FFB, identifiants internes, métadonnées privées et jetons sont exclus.
import {readSnapshot} from "./persistence.mjs";
export function publicSnapshot(snapshot,makeId=()=>crypto.randomUUID()){
 const src=readSnapshot(snapshot),ids=new Map();
 const idFor=license=>{if(!ids.has(license))ids.set(license,"public-"+makeId());return ids.get(license);};
 const stripRow=row=>({session:row.session,score:row.score,center:row.center??null,ffbRank:row.ffbRank??null,players:row.players.map(p=>({license:idFor(p.license),name:String(p.name&&String(p.name).trim()!==String(p.license) ? p.name : "Joueur"),firstName:p.firstName??"",lastName:p.lastName??"",series:p.series??null}))});
 return {schema:"cdp-public-v1",season:"2026-2027",...readSnapshot({completedSessions:src.completedSessions,rows:src.rows.map(stripRow),savedAt:src.savedAt,previews:Object.fromEntries(Object.entries(src.previews).map(([k,p])=>[k,{...p,rows:p.rows.map(stripRow)}]))})};
}
export function readPublicSnapshot(input){
 if(input?.schema!=="cdp-public-v1"||input.season!=="2026-2027")throw Error("Publication CDP invalide");
 const snap=readSnapshot(input);
 for(const row of [...snap.rows,...Object.values(snap.previews).flatMap(p=>p.rows)])for(const p of row.players){
  if(!String(p.license).startsWith("public-")||Object.keys(p).some(k=>!["license","name","firstName","lastName","series"].includes(k)))throw Error("Publication contenant des identifiants non publics");
 }
 return snap;
}
