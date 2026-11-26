// Le PAT reste en mémoire dans le navigateur. Aucun proxy, URL ou stockage ne le reçoit.
const ROOT="https://api.github.com/repos/CapGui13/CDP";
const PATH="/contents/data/published.json";
const headers=token=>({Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"});
function encode(s){const bytes=new TextEncoder().encode(s);let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
function decode(s){return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)));}
async function request(fetchImpl,token,path,options={}){
 const res=await fetchImpl(ROOT+path,{...options,headers:{...headers(token),...(options.body?{"Content-Type":"application/json"}:{})},cache:"no-store",signal:AbortSignal.timeout(20000)});
 if(!res.ok){
  const msg={401:"Token GitHub invalide ou expiré.",403:"Accès GitHub refusé : vérifier les droits Contents (lecture/écriture).",404:"Dépôt ou fichier non accessible avec ce token.",409:"Publication modifiée par ailleurs : reconnecte la gestion.",422:"Publication refusée par GitHub : vérifier les droits ou la protection de branche.",429:"Limite GitHub atteinte."}[res.status]||"GitHub : HTTP "+res.status;
  const e=Error(msg);e.status=res.status;throw e;
 }
 return res.json();
}
export async function connectPublisher(token,fetchImpl=fetch){
 token=String(token??"").trim();
 if(!token||/\s/.test(token))throw Error("Renseigne un token GitHub valide.");
 const repo=await request(fetchImpl,token,"");
 if(repo.full_name?.toLowerCase()!=="capgui13/cdp"||repo.permissions?.push!==true)throw Error("Ce compte GitHub ne dispose pas des droits de publication sur CDP.");
 if(repo.default_branch!=="main")throw Error("Branche de publication inattendue.");
 const load=async()=>{const file=await request(fetchImpl,token,PATH+"?ref=main");
  if(file.type!=="file"||!file.sha||file.encoding!=="base64"||typeof file.content!=="string")throw Error("Fichier de publication GitHub non reconnu.");
  return {sha:file.sha,data:JSON.parse(decode(file.content))};};
 let baseline=await load();
 return {
  get baseline(){return baseline.data;},
  async publish(snapshot){
   const current=await load();
   if(current.sha!==baseline.sha)throw Error("Le classement public a changé depuis la connexion. Ferme puis rouvre la gestion avant de publier.");
   const old=current.data;
   if(old.schema!=="cdp-public-v1"||old.season!=="2026-2027"||snapshot.schema!==old.schema||snapshot.season!==old.season)throw Error("Saison ou format public inattendu.");
   if(!snapshot.rows.length||Object.keys(snapshot.previews??{}).length)throw Error("Seules les séances validées peuvent être publiées.");
   for(const n of old.completedSessions){
    if(!snapshot.completedSessions.includes(n))throw Error("Publication refusée : une séance déjà publiée serait supprimée.");
    if(snapshot.rows.filter(r=>r.session===n).length<old.rows.filter(r=>r.session===n).length)throw Error("Publication refusée : une séance publiée deviendrait plus courte.");
   }
   if(old.savedAt&&(!snapshot.savedAt||snapshot.savedAt<old.savedAt))throw Error("Sauvegarde locale antérieure à la publication actuelle : actualise les résultats.");
   const data=await request(fetchImpl,token,PATH,{method:"PUT",body:JSON.stringify({message:"CDP : publication des séances "+snapshot.completedSessions.join(", "),content:encode(JSON.stringify(snapshot)),sha:current.sha,branch:"main"})});
   if(!data.content?.sha||!data.commit?.sha)throw Error("Confirmation de publication GitHub incomplète.");
   baseline={sha:data.content.sha,data:snapshot};
   return {commit:data.commit.sha};
  },
  close(){token="";baseline=null;}
 };
}
