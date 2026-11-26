// Les champs d'identité et de score reprennent le lecteur Ranking E-Open V9.3.
// Le centre organisateur et la série sont exigés pour calculer les qualifications.
export function readRanking(payload){
 const candidates=[payload,payload?.data,payload?.ranking,payload?.pairs,payload?.results,payload?.data?.ranking,payload?.data?.pairs,payload?.data?.results,payload?.data?.items,payload?.items];
 const rows=candidates.find(Array.isArray);
 if(!rows||!rows.length)throw Error("La FFB n'a pas renvoyé de liste de paires exploitable.");
 const totals=[payload?.total,payload?.totalCount,payload?.totalItems,payload?.data?.total,payload?.pagination?.total,payload?.meta?.total].filter(x=>x!=null);
 if(totals.some(t=>!Number.isSafeInteger(Number(t))||Number(t)<rows.length))throw Error("Total FFB incohérent.");
 return {rows,total:totals.length?Number(totals[0]):null};
}
const first=(...values)=>values.find(v=>v!=null&&String(v).trim()!=="");
const label=value=>typeof value==="string"?value.trim():typeof value?.name==="string"?value.name.trim():typeof value?.label==="string"?value.label.trim():"";
const valid=new Set(["1N","1P","1C","1K","1T","2PR","2P","2C","2K","2T","3PR","3P","3C","3K","3T","4PR","4P","4C","4K","4T","NC"]);
export function seriesCode(value){
 const raw=typeof value==="string"?value:label(value);
 const s=raw.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/Œ/g,"OE").trim();
 if(valid.has(s))return s;
 const m=s.match(/^([1-4])(?:ERE|RE|EME|E)?\s*(?:SERIE\s*)?([NPKCT]|PROMOTION|NATIONAL(?:E)?|PIQUES?|COEURS?|CARREAUX?|TREFLES?|[♠♥♦♣])$/);
 if(!m)return null;
 const suffix=({"♠":"P","♥":"C","♦":"K","♣":"T",PROMOTION:"PR",NATIONAL:"N",NATIONALE:"N",PIQUE:"P",PIQUES:"P",COEUR:"C",COEURS:"C",CARREAU:"K",CARREAUX:"K",TREFLE:"T",TREFLES:"T"})[m[2]]||m[2];
 return valid.has(m[1]+suffix)?m[1]+suffix:null;
}
// Barème IV FFB, catégories ordinaires. Les IV hors quota restent à confirmer par la série explicite.
const ivSeries={100:"1N",92:"1P",84:"1C",76:"1K",68:"1T",60:"2PR",56:"2P",52:"2C",48:"2K",44:"2T",40:"3PR",38:"3P",36:"3C",34:"3K",32:"3T",30:"4PR",28:"4P",26:"4C",24:"4K",22:"4T",20:"NC"};
export function extractSeries(p){
 const explicit=[p?.series,p?.serie,p?.seriesLabel,p?.ranking?.series,p?.iv?.series,p?.iv?.label,p?.iv?.classification,p?.classification?.label,p?.person?.series,p?.person?.iv?.series].map(seriesCode).find(Boolean);
 if(explicit)return explicit;
 const v=[p?.iv?.iv,p?.iv?.value,p?.iv,p?.valueIndex,p?.indiceValeur,p?.person?.iv?.iv,p?.person?.iv].find(x=>(typeof x==="number"||typeof x==="string")&&String(x).trim()!==""&&Object.hasOwn(ivSeries,Number(x)));
 return v==null?null:ivSeries[Number(v)];
}
export function normalizeFfbRanking(rows,session){
 const seen=new Set(), missing={center:0,series:0};
 const normalized=rows.map((row,i)=>{
  const team=row.team||row;
  const members=(Array.isArray(row.players)?row.players:[team.player1,team.player2]).filter(Boolean);
  if(members.length!==2)throw Error("Paire "+(i+1)+" : deux joueurs attendus.");
  const players=members.map(p=>{
   const license=String(first(p.ffbId,p.idFFB,p.ffb_id,p.licenseNumber,p.license)||"").trim();
   if(!/^\d+$/.test(license)||seen.has(license))throw Error("Licence manquante ou répétée à la paire "+(i+1)+".");
   seen.add(license);
   const name=String(first(p.name,[p.firstName,p.lastName].filter(Boolean).join(" "))||license);
   const series=extractSeries(p);
   if(!series)missing.series++;
   return {license,name,series,personId:Number.isSafeInteger(Number(p.personId??p.id))&&Number(p.personId??p.id)>0?Number(p.personId??p.id):null,firstName:typeof (p.firstName??p.first_name)==="string"?(p.firstName??p.first_name):undefined,lastName:typeof (p.lastName??p.last_name)==="string"?(p.lastName??p.last_name):undefined};
  });
  const raw=first(row.sessionScore,row.score,row.percentage,row.percent);
  const score=Number(String(raw??"").replace("%","").trim().replace(",","."));
  if(raw==null||!Number.isFinite(score)||score<0||score>100)throw Error("Score invalide à la paire "+(i+1)+".");
  const center=[row.center,row.organizingCenter,row.sessionCenter,row.hostClub,row.organizingClub,row.organizerClub,row.clubName,team.center,team.organizingClub,team.hostClub].map(label).find(Boolean)||null;
  if(!center)missing.center++;
  return {session,score,players,center,ffbRank:Number(row.rank)||null};
 });
 return {rows:normalized,missing,complete:!missing.center&&!missing.series};
}
