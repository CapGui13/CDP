// Synchronisation bornée : une seule source des scores, pas de balayage des licenciés.
import {readRanking,normalizeFfbRanking,extractSeries} from "./auto-import.mjs?v=audit1";
import {clubPairKeys,seedClubs} from "./club-centers.mjs?v=2";
import {listTotal} from "./sync.mjs?v=1";
const key=r=>JSON.stringify(r.players.map(p=>String(p.license)).sort());
const clubCode=r=>/^54\d{5}$/.test(String(r.simultaneousId??""))&&String(r.simultaneousId)!=="5400000"?String(r.simultaneousId):null;
const directory={...seedClubs,"5401035":"Set Bridge Club Marseille","5401041":"Bridge Club de Beaumont","5401054":"Vallée des Baux Bridge Club","5401056":"Bridge Club Carry Côte Bleue","5401062":"Bridge Club Salonais","5401063":"Bridge Club Istres","5401064":"Bridge Club de Miramas","5401065":"Cassidain Bridge Club","5401079":"Bridge Club Saussetois","5401116":"Bridge Club des Pins","5401130":"Les Passionnés du Bridge de Gémenos","5401136":"Bridge Club Seniors Plus","5402043":"École de Bridge Toulon","5402069":"BCV-AOC Bridge","5402071":"Toulon Bridge Club","5402073":"Saint-Cyr Promo Bridge","5402081":"Bridge Club de Saint-Maximin","5402082":"Trèfle Bandolais Bridge Club","5402084":"USAM Bridge","5402085":"Bridge Club du Lavandou","5402126":"CCS Craurois Bridge","5402127":"Club de Bridge Londais","5403083":"Bridge Club Vaisonnais","5403087":"Orangeois Bridge Club","5403089":"Amis Bridge Valréassien","5403094":"Avignon Bridge Club","5403095":"Bridge Club de Carpentras","5403115":"Sorgues Bridge Club","5403119":"Bridge des Fontaines","5403135":"Bridge Club Morières-Saint-Saturnin","5404003":"Bridge Club Moyenne Durance","5404007":"Cercle de Bridge Gap","5404008":"Bridge Fit Club de Gap","5404021":"Bridge Club Oraison"};
const abort=signal=>{if(signal?.aborted)throw Error("Synchronisation interrompue ; données déjà sauvegardées.");};
const fatal=e=>e?.status===429||e?.status===401||e?.status===403||e?.status>=500;
export function mergeCache(rows,cache){
 const people=new Map(),pairs=new Map();
 for(const r of cache){pairs.set(r.session+":"+key(r),r);for(const p of r.players){const prev=people.get(p.license)||{};people.set(p.license,{...prev,...p,series:prev.series||p.series});}}
 for(const r of rows){
  const old=pairs.get(r.session+":"+key(r));
  if(old?.centerVerified===true&&((clubCode(r)&&String(old.centerCode)===clubCode(r))||(!clubCode(r)&&r.ffbclubnetId&&r.ffbclubnetId===old.ffbclubnetId))){const code=String(old.centerCode);r.center=directory[code]||old.center||"Centre "+code;r.centerCode=code;r.centerVerified=true;}
  for(const p of r.players){const prev=people.get(p.license);if(!prev)continue;for(const k of ["series","personId","firstName","lastName","profileAttemptedAt"])if(!p[k]&&prev[k])p[k]=prev[k];}
 }
}
export async function syncSession({client,session,id,cache=[],previousCoverage=null,centersOnly=false,signal,onCheckpoint=()=>{},onProgress=()=>{},onRaw=()=>{},maxProfiles=80,maxClubs=40}){
 abort(signal);
 let payload,direct=true;
 try{payload=await client.fullSessionRanking(id);}catch(e){abort(signal);if(fatal(e))throw e;direct=false;payload=await client.sessionRanking(id,1,80,"results");}
 onRaw(payload);
 let {rows:raw,total}=readRanking(payload);
 if(total!==null&&raw.length<total){
  const first=await client.sessionRanking(id,1,80,"results");
  let page=readRanking(first),expected=page.total;
  if(expected!==total)throw Error("Le total FFB a changé pendant la collecte.");
  const collected=[...page.rows],signatures=new Set([JSON.stringify(page.rows)]);
  for(let n=2;collected.length<total&&n<=50;n++){abort(signal);page=readRanking(await client.sessionRanking(id,n,80,"results"));const signature=JSON.stringify(page.rows);if(page.total!==total||signatures.has(signature))throw Error("Pagination générale incohérente.");signatures.add(signature);collected.push(...page.rows);}
  if(collected.length!==total)throw Error("Classement général incomplet.");raw=collected;
 }
 const rows=normalizeFfbRanking(raw,session).rows;mergeCache(rows,cache);
 // Les données déjà validées ne doivent jamais être remplacées par une collecte raccourcie.
 const oldRows=cache.filter(r=>r.session===session);
 const oldCount=new Set(oldRows.map(key)).size;
 if(rows.length<oldCount)throw Error("Réponse plus courte que les données sauvegardées ; ancienne collecte conservée.");
 const errors=[];const codes=new Map();
 for(const r of rows){const c=clubCode(r);if(c){if(!codes.has(c))codes.set(c,[]);codes.get(c).push(r);}}
 const allCoded=[...codes.values()].reduce((n,g)=>n+g.length,0)===rows.length;
 const signature=JSON.stringify([id,rows.map(r=>[key(r),clubCode(r),r.ffbclubnetId]).sort((a,b)=>a[0].localeCompare(b[0]))]);
 let coverage=total===rows.length?"total FFB":null;
 if(!coverage&&previousCoverage?.signature===signature&&previousCoverage?.verified===true)coverage="couverture précédente";
 const reasons=()=>{const out=[];const missing=rows.filter(r=>!r.centerVerified).length;const unknown=rows.flatMap(r=>r.players).filter(p=>!p.series).length;if(missing)out.push(missing+" centres à confirmer");if(unknown)out.push(unknown+" séries manquantes");if(!coverage)out.push("exhaustivité FFB non confirmée");return out;};
 const checkpoint=()=>onCheckpoint({session,rows,reasons:reasons(),coverage:{verified:!!coverage,signature,source:coverage},errors:[...errors]});
 checkpoint();
 // Si le classement général possède des codes, contrôler seulement ces groupes.
 // Un club n'est validé que si le filtre officiel renvoie exactement les mêmes paires.
 if(allCoded&&codes.size>=2){
  const todo=[...codes].filter(([code,group])=>group.some(r=>!r.centerVerified)).slice(0,maxClubs);
  let done=0;
  for(let i=0;i<todo.length;i+=3){abort(signal);
   const batch=await Promise.all(todo.slice(i,i+3).map(async([code,group])=>{
    try{const actual=clubPairKeys(await client.clubSessionRanking(id,code),rows);const expected=new Set(group.map(key));if(actual.size!==expected.size||[...actual].some(k=>!expected.has(k)))throw Error("Le filtre ne correspond pas au groupe du classement général.");return {code,group};}
    catch(e){return {code,error:e};}
   }));
   let stop=null;
   for(const item of batch){done++;if(item.error){errors.push("Club "+item.code+" : "+item.error.message);if(fatal(item.error))stop=item.error;continue;}for(const r of item.group){r.center=directory[item.code]||"Centre "+item.code;r.centerCode=item.code;r.centerVerified=true;}}
   if(direct&&Array.isArray(payload)&&rows.every(r=>r.centerVerified))coverage=coverage||"partition par codes confirmée";
   checkpoint();onProgress("Centres : "+rows.filter(r=>r.centerVerified).length+"/"+rows.length+" paires · "+done+"/"+todo.length+" clubs contrôlés.");
   abort(signal);if(stop)throw stop;
  }
 }else{
  // Mode de secours : liste statique de clubs, pas d'annuaire ni de fiches de licenciés.
  // Les rattachements ne sont publiés qu'après contrôle croisé de réponses disjointes.
  const confirmed=new Map(),observations=[];
  for(const r of rows.filter(r=>r.centerVerified))confirmed.set(key(r),String(r.centerCode));
  const candidates=[...new Set([...codes.keys(),...Object.keys(seedClubs),...Object.keys(directory)])].filter(code=>!rows.some(r=>r.centerVerified&&String(r.centerCode)===code)).slice(0,Math.min(maxClubs,20));
  let done=0,conflict=false;
  for(let i=0;i<candidates.length;i+=3){abort(signal);
   const batch=await Promise.all(candidates.slice(i,i+3).map(async code=>{try{return {code,keys:clubPairKeys(await client.clubSessionRanking(id,code),rows)};}catch(e){return {code,error:e};}}));
   let stop=null;
   for(const item of batch){done++;if(item.error){errors.push("Club "+item.code+" : "+item.error.message);if(fatal(item.error))stop=item.error;continue;}
    if([...item.keys].some(k=>confirmed.has(k)&&confirmed.get(k)!==item.code)){conflict=true;errors.push("Rattachements contradictoires pour le club "+item.code);continue;}
    for(const k of item.keys)confirmed.set(k,item.code);if(item.keys.size)observations.push(item.code);
   }
   onProgress("Centres (secours) : "+done+"/"+candidates.length+" clubs · "+confirmed.size+"/"+rows.length+" paires recoupées.");
   abort(signal);if(stop)throw stop;if(conflict||confirmed.size===rows.length)break;
  }
  if(!conflict&&new Set(confirmed.values()).size>=2){
   for(const r of rows){const code=confirmed.get(key(r));if(code){r.center=directory[code]||"Centre "+code;r.centerCode=code;r.centerVerified=true;}}
   if(direct&&Array.isArray(payload)&&confirmed.size===rows.length)coverage=coverage||"partition filtrée confirmée";
   checkpoint();
  }
  if(rows.some(r=>!r.centerVerified))errors.push("Centres restants non confirmés : le général ne contient pas tous les codes utilisables. Aucun balayage des licenciés.");
 }
 // Contrôle indépendant du total, sans télécharger tout le classement une seconde fois.
 if(!coverage&&direct&&Array.isArray(payload)&&allCoded&&rows.every(r=>r.centerVerified))coverage="partition par codes confirmée";
 if(!coverage){abort(signal);try{const p=await client.sessionRanking(id,1,80,"results");const n=listTotal(p);if(n===rows.length)coverage="total FFB paginé";else if(n!==null)errors.push("Total FFB "+n+" différent des "+rows.length+" résultats.");}catch(e){abort(signal);if(fatal(e))throw e;errors.push("Total FFB : "+e.message);}checkpoint();}
 if(!centersOnly){
  const pending=rows.flatMap(r=>r.players).filter(p=>!p.series);
  const todo=pending.filter(p=>p.personId).sort((a,b)=>String(a.profileAttemptedAt??"").localeCompare(String(b.profileAttemptedAt??""))).slice(0,maxProfiles);
  if(pending.length>todo.length)errors.push((pending.length-todo.length)+" fiches non traitées (identifiant absent ou limite par passe).");
  if(todo.length){
   abort(signal);const season=await client.currentSeason();
   if(Number(season?.id)!==38)throw Error("Saison fédérale non confirmée : identifiant 38 attendu.");
   let done=0,found=0;
   for(let i=0;i<todo.length;i+=4){abort(signal);
    const batch=await Promise.all(todo.slice(i,i+4).map(async p=>{p.profileAttemptedAt=new Date().toISOString();try{const payload=await client.ranking(p.personId,38);const data=payload?.data??payload;const series=extractSeries(data);if(series){p.series=series;return {found:true};}const iv=data?.iv?.iv??data?.iv?.value??data?.iv;return {unknown:typeof iv==="number"||typeof iv==="string"?String(iv).slice(0,20):"absent"};}catch(e){return {error:e};}}));
    let stop=null;for(const item of batch){done++;if(item.found)found++;else if(item.error){errors.push("Fiche : "+item.error.message);if(fatal(item.error))stop=item.error;}else if(item.unknown&&!errors.includes("IV non reconnu : "+item.unknown))errors.push("IV non reconnu : "+item.unknown);}
    checkpoint();onProgress("Séries : "+found+" nouvelles · "+done+"/"+todo.length+" fiches ciblées · "+rows.flatMap(r=>r.players).filter(p=>!p.series).length+" restantes.");
    abort(signal);if(stop)throw stop;
   }
  }
 }
 checkpoint();
 return {rows,complete:reasons().length===0,reasons:reasons(),errors,coverage:{verified:!!coverage,signature,source:coverage},centers:rows.filter(r=>r.centerVerified).length,categories:rows.flatMap(r=>r.players).filter(p=>p.series).length};
}
