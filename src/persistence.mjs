// Persistance du classement validé et des aperçus FFB non encore validés.
// Aucune donnée d'authentification ni réponse brute FFB n'est stockée.
export function readSnapshot(input) {
  if(!input || !Array.isArray(input.completedSessions) || !Array.isArray(input.rows)) throw Error("Sauvegarde invalide");
  const previews={};
  for(const [key,p] of Object.entries(input.previews??{})){
    const session=Number(key);
    if(!Number.isInteger(session)||session<1||session>6||p?.session!==session||!Array.isArray(p.rows)||!p.rows.length)throw Error("Aperçu de séance invalide");
    const seen=new Set();
    for(const row of p.rows){
      if(row.session!==session||!Number.isFinite(row.score)||row.score<0||row.score>100||!Array.isArray(row.players)||row.players.length!==2)throw Error("Résultat FFB en cache invalide");
      for(const player of row.players){
        if(!player||typeof player.license!=="string"||!player.license||seen.has(player.license))throw Error("Licence FFB en cache invalide");
        seen.add(player.license);
      }
    }
    previews[key]={session,rows:p.rows,savedAt:typeof p.savedAt==="string"?p.savedAt:null,reasons:Array.isArray(p.reasons)?p.reasons.filter(x=>typeof x==="string"):[],coverage:p.coverage&&typeof p.coverage.signature==="string"?{verified:p.coverage.verified===true,signature:p.coverage.signature,source:typeof p.coverage.source==="string"?p.coverage.source:null,checkedClubs:Array.isArray(p.coverage.checkedClubs)?p.coverage.checkedClubs.filter(x=>typeof x==="string"&&/^54\d{5}$/.test(x)).slice(0,100):[]}:null,errors:Array.isArray(p.errors)?p.errors.filter(x=>typeof x==="string").slice(0,100):[]};
  }
  return {completedSessions:input.completedSessions,rows:input.rows,previews,savedAt:typeof input.savedAt==="string"?input.savedAt:null};
}
export function withPreview(snapshot,preview,now=new Date().toISOString()){
  const current=readSnapshot(snapshot);
  const old=current.previews[preview.session];
  // Une collecte partielle plus courte ne remplace jamais une collecte plus riche.
  if(old&&old.rows.length>preview.rows.length)return {snapshot:current,kept:true};
  const next=readSnapshot({...current,previews:{...current.previews,[preview.session]:{...preview,savedAt:now}},savedAt:now});
  return {snapshot:next,kept:false};
}
export function withValidated(snapshot,next,now=new Date().toISOString()){
  const current=readSnapshot(snapshot);
  const previews={...current.previews};
  // Ne supprimer un aperçu que si la séance validée couvre au moins autant de paires.
  for(const key of Object.keys(previews)){
    if(next.completedSessions.includes(Number(key))&&next.rows.filter(r=>r.session===Number(key)).length>=previews[key].rows.length)delete previews[key];
  }
  return readSnapshot({...next,previews,savedAt:now});
}
export function latestPreview(snapshot){
  return Object.values(snapshot.previews??{}).sort((a,b)=>String(b.savedAt??"").localeCompare(String(a.savedAt??""))||b.session-a.session)[0]??null;
}
