// Sources: Ranking Provence (persons/search), E-Open (classement complet).
// On ne déduit jamais le centre de jeu du club de licence.
import {extractSeries} from "./auto-import.mjs";
const dates=["2026-11-25","2027-01-27","2027-02-24","2027-03-24","2027-04-14","2027-05-05"];
const positive=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
const text=v=>typeof v==="string"?v.trim():typeof v?.name==="string"?v.name.trim():typeof v?.label==="string"?v.label.trim():"";
const pickArray=(p,keys)=>Array.isArray(p)?p:keys.map(k=>p?.[k]).find(Array.isArray)??keys.map(k=>p?.data?.[k]).find(Array.isArray)??(Array.isArray(p?.data)?p.data:null);
export function listTotal(p){const v=p?.pagination?.total_items??p?.pagination?.totalItems??p?.pagination?.total??p?.total??p?.totalCount??p?.totalItems??p?.data?.total;return v!=null&&Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):null;}
export function discoverSessions(payload,today=new Date().toISOString().slice(0,10)){
 const list=pickArray(payload,["items","sessions","results","content","simultaneousSessions","groupSessions"]);
 if(!list)throw Error("Liste FFB de séances non reconnue.");
 const byDate=new Map([["2026-11-25",new Set([364548])]]);
 for(const item of list){const row=item?.session??item;
  const date=String(row?.date??row?.startDate??row?.startAt??row?.start_date??row?.sessionDate??"").slice(0,10);
  const id=positive(row?.id??row?.sessionId??row?.ffbId);
  if(!id||!dates.includes(date)||date>today)continue;
  if(!byDate.has(date))byDate.set(date,new Set());
  byDate.get(date).add(id);
 }
 const sessions=[],conflicts=[];
 for(const [date,ids] of byDate)if(date<=today){
  if(ids.size!==1)conflicts.push(date);
  else sessions.push({number:dates.indexOf(date)+1,date,ffbId:[...ids][0]});
 }
 return {sessions:sessions.sort((a,b)=>a.number-b.number),conflicts};
}
export function centerFromResult(row){
 const team=row?.team??row;
 // Exclusively explicitly identified venue/organizer fields; never player.club.
 return [row?.center,row?.centre,row?.organizingCenter,row?.sessionCenter,row?.hostClub,row?.organizingClub,row?.organizerClub,row?.clubName,row?.tournamentClub,row?.tournament?.club,row?.localTournament?.club,row?.localSession?.club,row?.clubSession?.club,row?.result?.tournament?.club,row?.section?.tournament?.club,team?.center,team?.organizingClub,team?.hostClub].map(text).find(Boolean)||null;
}
export function personIndex(payload,needed){
 const list=pickArray(payload,["items","results","content","persons"]);
 if(!list)throw Error("Liste de licenciés FFB non reconnue.");
 const result=new Map();
 for(const x of list){
  const license=String(x?.ffbId??x?.idFFB??x?.ffb_id??"");
  if(!needed.has(license))continue;
  const series=extractSeries(x?.season?.ranking??{})||extractSeries(x);
  const personId=positive(x?.id??x?.personId);
  const firstName=text(x?.firstName??x?.firstname),lastName=text(x?.lastName??x?.lastname);
  result.set(license,{series,personId,firstName,lastName});
 }
 return result;
}
export function applyPersonInfo(rows,index){
 let added=0;
 for(const row of rows)for(const p of row.players){
  const info=index.get(p.license);if(!info)continue;
  if(!p.series&&info.series){p.series=info.series;added++;}
  if(!p.personId&&info.personId)p.personId=info.personId;
  if(info.firstName)p.firstName=info.firstName;if(info.lastName)p.lastName=info.lastName;
 }
 return added;
}
export async function collectCommitteePeople(client,rows,onProgress=()=>{}){
 const needed=new Set(rows.flatMap(r=>r.players).filter(p=>!p.series).map(p=>p.license));
 if(!needed.size)return 0;
 let count=0,total=null;
 for(let page=1;page<=150;page++){
  const data=await client.persons({maxPerPage:100,ffbCode:"5400000",isClubLicensee:1,currentPage:page});
  if(page===1)total=listTotal(data);
  const index=personIndex(data,needed);count+=applyPersonInfo(rows,index);
  for(const p of rows.flatMap(r=>r.players))if(p.series)needed.delete(p.license);
  onProgress({page,total,count,remaining:needed.size});
  const list=pickArray(data,["items","results","content","persons"]);
  if(!needed.size||!list.length||(total!==null&&page*100>=total)||list.length<100)break;
 }
 return count;
}
export function schemaSummary(payload){
 const found=new Set();
 const visit=(v,path,depth)=>{if(depth>6||v==null)return;if(Array.isArray(v)){for(const x of v.slice(0,3))visit(x,path+"[]",depth+1);}else if(typeof v==="object"){for(const [k,x] of Object.entries(v)){const p=path?path+"."+k:k;found.add(p+" : "+(Array.isArray(x)?"array":typeof x));visit(x,p,depth+1);}}};
 visit(payload,"",0);return [...found].sort();
}
