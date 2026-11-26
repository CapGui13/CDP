// Aucun champ FFB non vérifié n'est supposé obligatoire : le mapping est explicite.
export function at(obj,path){
  if(path===""||path==null)return obj;
  return String(path).split(".").reduce((o,k)=>o!=null&&Object.hasOwn(o,k)?o[k]:undefined,obj);
}
export function arrayPaths(value,prefix="",depth=0){
  if(Array.isArray(value))return [prefix];
  if(value===null||typeof value!=="object"||depth>=5)return [];
  return Object.entries(value).flatMap(([k,v])=>arrayPaths(v,prefix?prefix+"."+k:k,depth+1));
}
export async function collectPages(fetchPage,{listPath,pageSize=80,maxPages=200,totalPath=""}={}){
  const rows=[];const signatures=new Set();
  for(let page=1;page<=maxPages;page++){
    const payload=await fetchPage(page,pageSize);
    const list=at(payload,listPath);
    if(!Array.isArray(list))throw Error("Le chemin de la liste ne correspond pas à un tableau.");
    const signature=JSON.stringify(list);
    if(list.length&&signatures.has(signature))throw Error("Pagination répétée : import interrompu.");
    signatures.add(signature);rows.push(...list);
    if(totalPath){
      const total=Number(at(payload,totalPath));
      if(!Number.isSafeInteger(total)||total<0)throw Error("Total FFB non valide.");
      if(rows.length>total)throw Error("Nombre de résultats supérieur au total annoncé.");
      if(rows.length===total)return rows;
      if(!list.length)throw Error("Pagination incomplète.");
    }else if(list.length<pageSize)return rows;
  }
  throw Error("Limite de pagination atteinte ; aucun résultat publié.");
}
const required=(v,label)=>{if(v===undefined||v===null||String(v).trim()==="")throw Error("Champ absent : "+label);return v;};
export function normalizeRows(raw,session,mapping){
  return raw.map((r,i)=>{
    try{
      const center=String(required(at(r,mapping.center),"centre")).trim();
      const score=Number(String(required(at(r,mapping.score),"score")).replace("%","").trim().replace(",","."));
      const players=[1,2].map(n=>{
        const license=String(required(at(r,mapping["license"+n]),"licence "+n));
        const source=String(required(at(r,mapping["series"+n]),"série "+n)).trim();
        const series=mapping.seriesValues?.[source]??source;
        const name=mapping["name"+n]?String(at(r,mapping["name"+n])??""):"";
        return {license,series,name};
      });
      return {session,center,score,players};
    }catch(e){throw Error("Ligne "+(i+1)+" : "+e.message);}
  });
}
