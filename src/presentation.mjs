// Présentation uniquement : l'identité des paires reste fondée sur les licences.
const clean=s=>String(s??"").trim().replace(/\s+/g," ");
const upper=s=>s.toLocaleUpperCase("fr");
const title=s=>s.toLocaleLowerCase("fr").replace(/(^|[\s\-’'])(\p{L})/gu,(_,sep,c)=>sep+upper(c));
const isUpper=s=>/\p{L}/u.test(s)&&s===upper(s);
const collator=new Intl.Collator("fr",{sensitivity:"base",numeric:true});
export function playerName(p){
 let first=clean(p.firstName??p.first_name),last=clean(p.lastName??p.last_name);
 const raw=clean(p.name);
 if(!first&&!last&&raw){
   const parts=raw.split(" ");
   if(raw.includes(",")){
     const i=raw.indexOf(",");last=clean(raw.slice(0,i));first=clean(raw.slice(i+1));
   }else if(parts.length>1){
     let start=0,end=parts.length;
     while(start<parts.length&&isUpper(parts[start]))start++;
     while(end>0&&isUpper(parts[end-1]))end--;
     if(start>0&&start<parts.length){last=parts.slice(0,start).join(" ");first=parts.slice(start).join(" ");}
     else if(end>0&&end<parts.length){first=parts.slice(0,end).join(" ");last=parts.slice(end).join(" ");}
     else {first=parts.slice(0,-1).join(" ");last=parts.at(-1);}
   }else last=raw;
 }
 if(!first&&!last)return {first:"",last:clean(p.license),display:clean(p.license)};
 // Respecter la structure explicite FFB, y compris les noms composés.
 return {first:title(first),last:upper(last),display:[title(first),upper(last)].filter(Boolean).join(" ")};
}
export function orderedPlayers(players){
 return players.map(p=>({...p,formatted:playerName(p)})).sort((a,b)=>collator.compare(a.formatted.last,b.formatted.last)||collator.compare(a.formatted.first,b.formatted.first)||collator.compare(String(a.license),String(b.license)));
}
export function pairDisplay(players){return orderedPlayers(players).map(p=>p.formatted.display).join(" / ");}
const cat1=new Set(["1N","1P","1C","1K","1T","2P","2C"]);
const cat2=new Set(["2K","2T","3P","3C","3K","3T","4P","4C","4K","4T","NC"]);
export function displayCategory(players){
 if(players.some(p=>cat1.has(p.series)))return 1;
 return players.length===2&&players.every(p=>cat2.has(p.series))?2:null;
}
