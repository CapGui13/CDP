// Centres : codes candidats (annuaire et menu du Comité), jamais des résultats historiques.
// La présence pour une séance donnée est prouvée uniquement par sa query FFB filtrée.
export const seedClubs={
 "5401070":"Bridge Club Ciotaden",
 "5401036":"Cercle de St Barnabé",
 "5401053":"Bridge Club d'Éguilles",
 "5401055":"Bridge Club Martégal",
 "5401057":"Bridge Club Roy René",
 "5401059":"Marignane Bridge Club",
 "5401131":"Aix Set Bridge Club",
 "5401137":"Alpilles Bridge Club",
 "5402060":"Hyères les Palmiers",
 "5402074":"Bridge Club de Six Fours",
 "5402128":"Le Bridge au Pradet",
 "5403088":"Bridge Club Pertuisien",
 "5403096":"CBC Cavaillon Bridge Club",
 "5404002":"Bridge Club de Manosque",
 "5404016":"Briançon Serre Chevalier"
};
const pairKey=players=>JSON.stringify(players.map(p=>String(p.license)).sort());
const positive=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
export function clubDirectoryFromPeople(payload){
 const rows=Array.isArray(payload)?payload:["items","results","content","persons","data"].map(k=>payload?.[k]).find(Array.isArray)??[];
 const out={};
 for(const p of rows){
  const c=p?.club,code=String(c?.ffbCode??"");
  const name=c?.name??c?.label;
  if(/^54\d{5}$/.test(code)&&code!=="5400000"&&typeof name==="string"&&name.trim())out[code]=name.trim();
 }
 return out;
}
export function clubPairKeys(payload,globalRows){
 const rows=Array.isArray(payload)?payload:[payload?.data,payload?.ranking,payload?.pairs,payload?.results,payload?.items,payload?.content,payload?.data?.items,payload?.data?.ranking,payload?.data?.pairs,payload?.data?.results,payload?.data?.content].find(Array.isArray);
 if(!rows)throw Error("Réponse filtrée non reconnue.");
 const totals=[payload?.total,payload?.totalCount,payload?.totalItems,payload?.pagination?.total_items,payload?.pagination?.totalItems,payload?.pagination?.total,payload?.meta?.total].filter(x=>x!=null);
 if(totals.some(n=>Number(n)!==rows.length))throw Error("Classement filtré paginé ou total incohérent.");
 const all=new Map(globalRows.map(r=>[pairKey(r.players),r])),keys=new Set();
 for(const row of rows){
  const t=row.team??row;
  const players=Array.isArray(row.players)?row.players:[t.player1,t.player2].filter(Boolean);
  if(players.length!==2)throw Error("Paire filtrée illisible.");
  const licenses=players.map(p=>String(p.ffbId??p.idFFB??p.ffb_id??p.licenseNumber??p.license??""));
  if(licenses.some(x=>!/^\d+$/.test(x)))throw Error("Licences absentes dans le filtre.");
  const key=pairKey(licenses.map(license=>({license})));
  if(!all.has(key)||keys.has(key))throw Error("Paire filtrée absente du général ou répétée.");
  const global=all.get(key),localId=positive(row.ffbclubnetId);
  if(localId&&global.ffbclubnetId&&localId!==global.ffbclubnetId)throw Error("Identifiant de tournoi différent du général.");
  keys.add(key);
 }
 if(keys.size&&keys.size===all.size)throw Error("Le filtre club renvoie tout le classement général : filtre non démontré.");
 return keys;
}
export function assignClubCenters(globalRows,observations){
 const choices=new Map(),nonEmpty=[];
 for(const {code,name,keys} of observations){
  if(keys.size)nonEmpty.push(code);
  for(const key of keys){
   if(!choices.has(key))choices.set(key,new Map());
   choices.get(key).set(code,name);
  }
 }
 const conflicts=[...choices.values()].filter(m=>m.size>1).length;
 if(conflicts||new Set(nonEmpty).size<2)return {assigned:0,conflicts,clubs:new Set(nonEmpty).size,remaining:globalRows.filter(r=>!r.center).length,verified:false};
 // Les deux requêtes au moins doivent retourner des sous-ensembles disjoints du général.
 let assigned=0,existingConflicts=0;
 for(const row of globalRows){
  const match=choices.get(pairKey(row.players));
  if(!match)continue;
  const [code,name]=[...match.entries()][0];
  if(row.centerCode&&row.centerCode!==code){existingConflicts++;continue;}
  if(row.center&&!row.centerCode&&row.center!==name){existingConflicts++;continue;}
  if(!row.center){row.center=name;assigned++;}
  row.centerCode=code;
 }
 return {assigned,conflicts:existingConflicts,clubs:new Set(nonEmpty).size,remaining:globalRows.filter(r=>!r.center).length,verified:true};
}
export async function collectClubCenters(client,id,rows,clubs=seedClubs,onProgress=()=>{},previous=[]){
 const observations=[...previous],errors=[];const entries=Object.entries(clubs).filter(([code])=>!previous.some(o=>o.code===code));
 for(let i=0;i<entries.length;i++){
  const [code,name]=entries[i];
  try{
   const payload=await client.clubSessionRanking(id,code);
   const keys=clubPairKeys(payload,rows);
   observations.push({code,name,keys});
  }catch(e){
   errors.push({code,message:String(e.message||e)});
   if(i===0&&String(e.message).includes("tout le classement général"))break;
  }
  onProgress({done:i+1,total:entries.length});
 }
 const report=assignClubCenters(rows,observations);
 return {...report,errors,observations};
}

export async function discoverClubDirectory(client,onProgress=()=>{}){
 const directory={};let total=null,seen=new Set();
 for(let page=1;page<=150;page++){
  const payload=await client.persons({maxPerPage:100,ffbCode:"5400000",isClubLicensee:1,currentPage:page});
  const list=Array.isArray(payload)?payload:["items","results","content","persons","data"].map(k=>payload?.[k]).find(Array.isArray);
  if(!list)throw Error("Annuaire FFB : format non reconnu.");
  if(!list.length)break;
  const signature=JSON.stringify(list.map(p=>p?.id??p?.ffbId));
  if(seen.has(signature))throw Error("Annuaire FFB : pagination répétée.");
  seen.add(signature);Object.assign(directory,clubDirectoryFromPeople(payload));
  if(page===1){const n=payload?.pagination?.total_items??payload?.pagination?.totalItems??payload?.pagination?.total??payload?.total;total=n!=null&&Number.isSafeInteger(Number(n))?Number(n):null;}
  onProgress({page,clubs:Object.keys(directory).length});
  if(list.length<100||(total!==null&&page*100>=total))return directory;
 }
 return directory;
}
