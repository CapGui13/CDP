import {pairRef,pairIndex,sportOverview,centerDetails,sessionRanking,scoreObjectives,pairSeries} from "./sport-dashboard.mjs";
import {rankingHistory,isProjected} from "./ranking-tools.mjs";
import {computeRanking} from "./ranking.mjs";
export function createSportUI({document,storage,getState,openPair,render,pairDisplay,statuses,OptionCtor=globalThis.Option}){
 const $=id=>document.getElementById(id);
 const el=(tag,cls="",value="")=>{const n=document.createElement(tag);n.className=cls;n.textContent=value;return n;};
 const pct=n=>Number.isFinite(n)?n.toFixed(2).replace(".",",")+" %":"—";
 const quota=q=>q.min===null?"—":q.min===q.max?String(q.min):q.min+"–"+q.max;
 const prefKey="cdp-2027-view-preferences";
 let theme="dark",favorites=new Set(),comparison=new Set(),favoritesActive=false,source=null,stats=null,index=new Map(),installEvent=null,shareOpened=false;
 try{const p=JSON.parse(storage.getItem(prefKey)||"{}");if(p.theme==="light")theme="light";if(Array.isArray(p.favorites))favorites=new Set(p.favorites.filter(x=>typeof x==="string").slice(0,1000));}catch{}
 const persist=()=>{try{storage.setItem(prefKey,JSON.stringify({theme,favorites:[...favorites]}));}catch{}};
 const metric=(label,value)=>{const b=el("div","season-metric");b.append(el("span","muted",label),el("strong","",String(value)));return b;};
 function table(headers,rows){
  const wrap=el("div","sport-table-wrap"),t=el("table","sport-table"),head=el("thead"),tr=el("tr");
  for(const h of headers)tr.append(el("th","",h));head.append(tr);t.append(head);
  const body=el("tbody");for(const row of rows){const line=el("tr");for(const v of row){const cell=el("td");if(typeof v==="object"&&v!==null)cell.append(v);else cell.textContent=v??"—";line.append(cell);}body.append(line);}t.append(body);wrap.append(t);return wrap;
 }
 function show(title){$("sportTitle").textContent=title;const body=$("sportDetails");body.replaceChildren();if(!$("sportDialog").open)$("sportDialog").showModal();return body;}
 function button(label,fn,cls="secondary"){const b=el("button",cls,label);b.type="button";b.onclick=fn;return b;}
 function pairButton(p){return button((isProjected(p)?"🏆 ":"")+pairDisplay(p.players),()=>{$("sportDialog").close();openPair(p);},"pair-name-link");}
 function fill(select,options,placeholder){const current=select.value;select.replaceChildren(new OptionCtor(placeholder,""));for(const [v,label] of options)select.add(new OptionCtor(label,v));select.value=options.some(x=>String(x[0])===current)?current:"";}
 function openCenter(center){
  const {state,result,publisher}=getState();if(!center||publisher)return;const d=centerDetails(state.rows,result,center);if(!d)return;
  const body=show(center),metrics=el("div","season-stats");metrics.append(metric("Paires distinctes",d.pairs),metric("Tables moyennes",d.averageTables===null?"—":d.averageTables.toFixed(1)),metric("Score moyen",pct(d.average)),metric("Paires rattachées",d.assigned),metric("Dans la projection",d.projected));body.append(metrics);
  body.append(el("h3","","Participation et évolution des quotas"),table(["Séance","Paires","Tables","Moyenne","Quota F1","Quota F2"],d.stages.map(s=>["S"+s.session,s.pairs,s.tables,pct(s.average),...s.quotas.map(quota)])));
  body.append(el("h3","","Catégories"),table(["Finale","Paires rattachées","Projetées qualifiables"],d.categories.map(c=>[c.finale,c.assigned,c.projected])));
  body.append(el("h3","","Meilleures paires rattachées"),table(["Rang général","Paire","Moyenne"],d.best.map(p=>[p.rank,pairButton(p),pct(p.average)])),el("p","muted","La fréquentation correspond au lieu de jeu réel ; le rattachement sportif peut différer. Tables estimées à partir du nombre de paires divisé par deux. Quotas provisoires."));
 }
 function openPerformances(){
  const {state,result,publisher}=getState(),n=Number($("performanceSession").value);if(publisher||!result.completedSessions.includes(n))return;
  const body=show("Performances de la séance "+n),center=el("select"),category=el("select");
  center.add(new OptionCtor("Tous les centres",""));for(const c of stats.byCenter)center.add(new OptionCtor(c.center,c.center));category.add(new OptionCtor("Toutes catégories","all"));category.add(new OptionCtor("Finale 1","1"));category.add(new OptionCtor("Finale 2","2"));
  const actions=el("div","sport-actions");actions.append(center,category);body.append(actions);const content=el("div");body.append(content);
  const update=()=>{const ranked=sessionRanking(state.rows,result,n,center.value||"",category.value||"all");content.replaceChildren(el("p","muted",ranked.length+" paires · rang de la séance au général"),table(["Rang S"+n,"Paire","Centre de jeu","Score","Rang cumulé actuel"],ranked.map(x=>[x.rank,pairButton(x.pair),x.row.center,pct(x.row.score),x.pair.rank])));};
  center.onchange=category.onchange=update;update();
  const sessions=result.completedSessions.filter(s=>s<=n),rows=state.rows.filter(r=>sessions.includes(r.session)),stage=computeRanking(rows,{completedSessions:sessions}),h=rankingHistory(rows,stage);
  if(h.hasPrevious){const movers=stage.ranking.filter(p=>h.byKey.get(p.key)?.delta>0).sort((a,b)=>h.byKey.get(b.key).delta-h.byKey.get(a.key).delta).slice(0,10),entrants=stage.ranking.filter(p=>h.byKey.get(p.key)?.event==="in");body.append(el("h3","","Plus fortes progressions"),table(["Paire","Places gagnées"],movers.map(p=>[pairDisplay(p.players),h.byKey.get(p.key).delta])),el("h3","","Entrées dans la projection"),table(["Paire","Rang"],entrants.map(p=>[pairDisplay(p.players),p.rank])));}
 }
 function openComparison(){
  const {result,detailMap,publisher}=getState();if(publisher)return;const body=show("Comparer les paires");
  const selected=[...comparison].map(k=>index.get(k)).filter(Boolean);const pick=el("select");pick.add(new OptionCtor("Ajouter une paire",""));
  for(const p of result.ranking){const key=pairRef(p);if(index.get(key)===p&&!comparison.has(key))pick.add(new OptionCtor(pairDisplay(p.players),key));}
  const add=button("Ajouter",()=>{if(pick.value&&index.get(pick.value)&&comparison.size<4){comparison.add(pick.value);openComparison();render();}});add.disabled=selected.length>=4;
  const actions=el("div","sport-actions");actions.append(pick,add);body.append(actions);
  for(const p of selected)body.append(button("Retirer "+pairDisplay(p.players),()=>{comparison.delete(pairRef(p));openComparison();render();}));
  if(selected.length<2){body.append(el("p","muted","Sélectionne deux à quatre paires. Tu peux aussi les ajouter depuis leur fiche."));return;}
  body.append(table(["Indicateur",...selected.map(p=>pairDisplay(p.players))],[
   ["Moyenne",...selected.map(p=>pct(p.average))],["Rang général",...selected.map(p=>p.rank)],["Rang catégorie",...selected.map(p=>detailMap.get(p.key)?.categoryRank??"—")],["Rang centre",...selected.map(p=>detailMap.get(p.key)?.centerRank??"—")],["Qualification",...selected.map(p=>statuses[p.status]??p.status)],["Séances",...selected.map(p=>p.count+"/6")],...Array.from({length:6},(_,i)=>["S"+(i+1),...selected.map(p=>pct(p.results.find(x=>x.session===i+1)?.score))])
  ]));
 }
 function lineChart(title,stages,series,invert){
  const section=el("section","sport-chart");section.append(el("h3","",title));if(!stages.length)return section;
  const values=stages.flatMap(s=>series.map(([k])=>s[k]).filter(Number.isFinite));
  if(!values.length){section.append(el("p","muted","Aucune donnée disponible."));return section;}
  // Accessible numeric fallback also covers non-visual and simulated DOMs.
  if(!document.createElementNS){section.append(table(["Séance",...series.map(x=>x[1])],stages.map(s=>["S"+s.session,...series.map(([k])=>s[k]??"—")])));return section;}
  let low=Math.min(...values),high=Math.max(...values);if(low===high){low=Math.max(0,low-1);high+=1;}else{const pad=(high-low)*.08;low=Math.max(0,low-pad);high+=pad;}if(!invert)high=Math.min(100,high);
  const W=440,H=150,x=n=>34+(n-1)*((W-50)/5),y=v=>12+(invert?(v-low):(high-v))/(high-low)*(H-38);
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("role","img");svg.setAttribute("aria-label",title);
  const node=(tag,attrs,txt)=>{const a=document.createElementNS("http://www.w3.org/2000/svg",tag);for(const [k,v] of Object.entries(attrs))a.setAttribute(k,String(v));if(txt!==undefined)a.textContent=txt;svg.append(a);};
  for(let i=0;i<3;i++){const v=low+(high-low)*i/2;node("line",{x1:34,x2:W-15,y1:y(v),y2:y(v),stroke:"currentColor",opacity:.18});node("text",{x:1,y:y(v)+4,fill:"currentColor","font-size":10},invert?String(Math.round(v)):v.toFixed(1));}
  for(let n=1;n<=6;n++)node("text",{x:x(n),y:H-7,"text-anchor":"middle","font-size":10,fill:"currentColor"},"S"+n);
  for(const [key,label,color] of series){let prev=null;for(const s of stages){if(!Number.isFinite(s[key])){prev=null;continue;}const point=[x(s.session),y(s[key])];if(prev)node("line",{x1:prev[0],y1:prev[1],x2:point[0],y2:point[1],stroke:color,"stroke-width":2});node("circle",{cx:point[0],cy:point[1],r:3.5,fill:color});prev=point;}}
  section.append(svg);const legend=el("div","chart-legend");for(const [,label,color] of series){const span=el("span","",label);span.style.color=color;legend.append(span);}section.append(legend);
  const detail=el("details");detail.append(el("summary","","Valeurs du graphique"),table(["Séance",...series.map(x=>x[1])],stages.map(s=>["S"+s.session,...series.map(([k])=>s[k]===null?"—":invert?String(s[k]):pct(s[k]))])));section.append(detail);return section;
 }
 const applyTheme=()=>{if(document.documentElement)document.documentElement.dataset.theme=theme;$("themeSwitch").textContent=theme==="light"?"Thème sombre":"Thème clair";};
 applyTheme();$("themeSwitch").onclick=()=>{theme=theme==="light"?"dark":"light";persist();applyTheme();};
 $("sportClose").onclick=()=>$("sportDialog").close();
 $("centerStatsOpen").onclick=()=>openCenter($("statsCenter").value);
 $("performanceOpen").onclick=openPerformances;
 $("favoritesOnly").onclick=()=>{favoritesActive=!favoritesActive;render();};
 $("compareOpen").onclick=openComparison;
 $("printRanking").onclick=()=>{if(typeof window!=="undefined")window.print();};
 $("installApp").onclick=async()=>{if(installEvent){const event=installEvent;installEvent=null;await event.prompt();}else $("sportNotice").textContent="Android ou ordinateur : menu du navigateur → Installer l’application. iPhone : Safari → Partager → Sur l’écran d’accueil." ;};
 if(typeof window!=="undefined"){window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvent=e;});window.addEventListener("appinstalled",()=>{$("installApp").hidden=true;});if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});}
 return {
  render(hidden){
   $("sportPanel").hidden=hidden;if(hidden)return;
   const {state,result}=getState();if(source!==result){stats=sportOverview(state.rows,result);index=pairIndex(result.ranking);source=result;comparison=new Set([...comparison].filter(k=>index.get(k)));}
   $("seasonStats").replaceChildren(metric("Paires distinctes",stats.pairs),metric("Joueurs distincts",stats.players),metric("Centres participants",stats.centers),...stats.finals.map(f=>metric("Finale "+f.finale+" · projection",f.projected+" / "+f.capacity)));
   $("seasonDates").replaceChildren(...["25/11","27/01","24/02","24/03","14/04","05/05"].map((date,i)=>{const day=el("div","season-date"+(stats.sessions.includes(i+1)?" done":""));day.append(el("strong","","S"+(i+1)),el("span","",date),el("small","",stats.sessions.includes(i+1)?"Validée":"À venir"));return day;}));
   fill($("statsCenter"),stats.byCenter.map(x=>[x.center,x.center]),"Choisir un centre");fill($("performanceSession"),stats.sessions.map(n=>[String(n),"Séance "+n]),"Choisir une séance");
   $("favoritesOnly").textContent=(favoritesActive?"★ Tous les résultats":"☆ Favoris")+" ("+result.ranking.filter(p=>index.get(pairRef(p))===p&&favorites.has(pairRef(p))).length+")";
   $("compareOpen").textContent="Comparer ("+comparison.size+"/4)";
   $("centerOverview").replaceChildren(table(["Centre","Paires distinctes","Tables moy.","Moy. des scores","Quota F1","Quota F2"],[...stats.byCenter].sort((a,b)=>b.occurrences-a.occurrences||a.center.localeCompare(b.center,"fr")).map(c=>[button(c.center,()=>openCenter(c.center),"pair-name-link"),c.pairs,String(c.averageTables??"—").replace(".",","),pct(c.average),...c.quotas.map(quota)])));
  },
  accept(p){return !favoritesActive||index.get(pairRef(p))===p&&favorites.has(pairRef(p));},
  reset(){favoritesActive=false;},
  pairActions(body,p){
   const key=pairRef(p),actions=el("div","sport-actions");
   if(index.get(key)!==p){actions.append(el("p","muted","Suivi et partage indisponibles : noms publics identiques pour plusieurs paires."));body.append(actions);return;}
   const favorite=button(favorites.has(key)?"★ Retirer des favoris":"☆ Ajouter aux favoris",()=>{favorites.has(key)?favorites.delete(key):favorites.add(key);persist();favorite.textContent=favorites.has(key)?"★ Retirer des favoris":"☆ Ajouter aux favoris";render();});
   const compare=button(comparison.has(key)?"Retirer du comparateur":"Ajouter au comparateur",()=>{if(comparison.has(key))comparison.delete(key);else if(comparison.size<4)comparison.add(key);else{compare.textContent="Maximum quatre paires";return;}compare.textContent=comparison.has(key)?"Retirer du comparateur":"Ajouter au comparateur";render();});
   const share=button("Partager la paire",async()=>{if(typeof location==="undefined")return;const url=new URL(location.href);url.search="";url.hash="";url.searchParams.set("paire",key);try{await navigator.clipboard.writeText(url.href);share.textContent="Lien copié";}catch{const link=el("input","share-url");link.value=url.href;link.readOnly=true;actions.append(link);link.select?.();}});
   actions.append(favorite,compare,share);body.append(actions);
  },
  pairCharts(body,p){
   const {state,result}=getState(),series=pairSeries(state.rows,result,p);
   body.append(lineChart("Performances et moyenne",series,[["score","Score","#56b9e8"],["average","Moyenne","#40b890"],["threshold","Seuil local","#c28a32"]],false),lineChart("Évolution du rang",series,[["rank","Général","#56b9e8"],["localRank","Local hors directs","#40b890"]],true));
   const targets=[["Objectif local à seuil constant",scoreObjectives(result,p)],["Objectif de qualification directe à seuil constant",scoreObjectives(result,p,"direct")]].filter(x=>x[1].length);
   for(const [label,items] of targets){const target=el("section","score-targets");target.append(el("h3","",label),el("p","muted","Score identique minimal à réaliser à chaque séance future jouée pour dépasser strictement le seuil actuel, avec quatre séances ensemble. Ce n’est pas une garantie de qualification."));
    for(const t of items)target.append(el("div","target-row",t.sessions+" séance(s) future(s) : "+(t.score===null?"Objectif impossible même à 100 %":pct(t.score))));body.append(target);}
   if(!targets.length)body.append(el("p","muted","Objectif de score indisponible : seuil certain absent, participation impossible ou saison terminée."));
  },
  openShared(key){if(shareOpened)return;shareOpened=true;if(!key)return;const p=index.get(key);if(p)openPair(p);else $("sportNotice").textContent="Ce lien ne correspond pas à une paire unique dans cette publication.";}
 };
}
