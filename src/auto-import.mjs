// Les champs d'identité et de score reprennent le lecteur Ranking E-Open V9.3.
// Le centre organisateur et la série sont exigés pour calculer les qualifications.
export function readRanking(payload){
 const candidates=[payload,payload?.data,payload?.ranking,payload?.pairs,payload?.results,payload?.data?.ranking,payload?.data?.pairs,payload?.data?.results,payload?.data?.items,payload?.items,payload?.content,payload?.data?.content];
 const rows=candidates.find(Array.isArray);
 if(!rows||!rows.length)throw Error("La FFB n'a pas renvoyé de liste de paires exploitable.");
 const totals=[payload?.total,payload?.totalCount,payload?.totalItems,payload?.data?.total,payload?.pagination?.total_items,payload?.pagination?.totalItems,payload?.pagination?.total,payload?.meta?.total].filter(x=>x!=null);
 if(totals.some(t=>!Number.isSafeInteger(Number(t))||Number(t)<rows.length))throw Error("Total FFB incohérent.");
 return {rows,total:totals.length?Number(totals[0]):null};
}
const first=(...values)=>values.find(v=>v!=null&&String(v).trim()!=="");
const label=value=>typeof value==="string"?value.trim():typeof value?.name==="string"?value.name.trim():typeof value?.label==="string"?value.label.trim():"";
const valid=new Set(["1N","1P","1C","1K","1T","2PR","2P","2C","2K","2T","3PR","3P","3C","3K","3T","4PR","4P","4C","4K","4T","NC","1NH","1PH","1CH","1KH","1TH","2PRH","2MH","2H","3H"]);
export function seriesCode(value){
 const raw=typeof value==="string"?value:label(value);
 const s=raw.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/Œ/g,"OE").trim();
 if(valid.has(s))return s;
 const hqAliases={NH:"1NH",PH:"1PH",CH:"1CH",KH:"1KH",TH:"1TH",PRH:"2PRH"};if(hqAliases[s])return hqAliases[s];
 const cleanHQ=s.replace(/\s*(?:HORS\s+QUOTA|HQ)\s*$/,"H");
 const aliases={"1N H":"1NH","1P H":"1PH","1C H":"1CH","1K H":"1KH","1T H":"1TH","2PR H":"2PRH","2 MAJEURE H":"2MH","2E MAJEUREH":"2MH"};if(aliases[cleanHQ])return aliases[cleanHQ];if(valid.has(cleanHQ))return cleanHQ;
 const m=s.match(/^([1-4])(?:ERE|RE|EME|E)?\s*(?:SERIE\s*)?([NPKCT]|PROMOTION|NATIONAL(?:E)?|PIQUES?|COEURS?|CARREAUX?|TREFLES?|[♠♥♦♣])$/);
 if(!m)return null;
 const suffix=({"♠":"P","♥":"C","♦":"K","♣":"T",PROMOTION:"PR",NATIONAL:"N",NATIONALE:"N",PIQUE:"P",PIQUES:"P",COEUR:"C",COEURS:"C",CARREAU:"K",CARREAUX:"K",TREFLE:"T",TREFLES:"T"})[m[2]]||m[2];
 return valid.has(m[1]+suffix)?m[1]+suffix:null;
}
// Barème IV FFB, catégories ordinaires. Les IV hors quota restent à confirmer par la série explicite.
const ivSeries={100:"1N",92:"1P",84:"1C",76:"1K",68:"1T",60:"2PR",56:"2P",52:"2C",48:"2K",44:"2T",40:"3PR",38:"3P",36:"3C",34:"3K",32:"3T",30:"4PR",28:"4P",26:"4C",24:"4K",22:"4T",20:"NC",96:"1NH",88:"1PH",80:"1CH",72:"1KH",64:"1TH",58:"2PRH",50:"2MH",42:"2H",31:"3H"};
export function extractSeries(p){
 const explicit=[p?.series,p?.classification,p?.iv?.seriesLabel,p?.iv?.name,p?.iv?.code,p?.iv?.abbreviation,p?.season?.ranking?.series,p?.serie,p?.seriesLabel,p?.ranking?.series,p?.iv?.series,p?.iv?.label,p?.iv?.classification,p?.classification?.label,p?.person?.series,p?.person?.iv?.series].map(seriesCode).find(Boolean);
 if(explicit)return explicit;
 const v=[p?.iv?.iv,p?.iv?.index,p?.iv?.indice,p?.iv?.valueIndex,p?.iv?.value,p?.iv,p?.valueIndex,p?.indiceValeur,p?.person?.iv?.iv,p?.person?.iv,p?.season?.ranking?.iv?.iv,p?.season?.ranking?.iv,p?.ranking?.iv?.iv,p?.ranking?.iv].find(x=>(typeof x==="number"||typeof x==="string")&&String(x).trim()!==""&&Object.hasOwn(ivSeries,Number(x)));
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
  const center=[row.center,row.centre,row.organizingCenter,row.sessionCenter,row.hostClub,row.organizingClub,row.organizerClub,row.clubName,row.tournamentClub,row.tournament?.club,row.localTournament?.club,row.localSession?.club,row.clubSession?.club,row.result?.tournament?.club,row.section?.tournament?.club,team.center,team.organizingClub,team.hostClub].map(label).find(Boolean)||null;
  if(!center)missing.center++;
  const numericId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
  return {session,score,players,center,ffbRank:Number(row.rank)||null,ffbclubnetId:numericId(row.ffbclubnetId),simultaneousId:numericId(row.simultaneousId)};
 });
 return {rows:normalized,missing,complete:!missing.center&&!missing.series};
}
