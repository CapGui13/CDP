import {matchesSearch,raceStatus,playerDirectory,sideRankings,centerComparison,simulateGlobal,finalPreparation,sportsBulletin} from "./race-tools.mjs";
import {pairDisplay,playerName} from "./presentation.mjs";
import {pairRef,pairIndex} from "./sport-dashboard.mjs";
import {makeXlsx} from "./xlsx-export.mjs";
export function createRaceUI({document,storage,getState,openPair,OptionCtor=globalThis.Option,platform=globalThis}){
 const $=id=>document.getElementById(id);
 const el=(tag,cls="",value="")=>{const n=document.createElement(tag);n.className=cls;n.textContent=String(value??"");return n;};
 const pct=n=>Number.isFinite(n)?n.toFixed(2).replace(".",",")+" %":"—";
 const button=(label,fn)=>{const b=el("button","secondary",label);b.type="button";b.onclick=fn;return b;};
 const table=(headers,rows)=>{const w=el("div","sport-table-wrap"),t=el("table","sport-table"),head=el("thead"),tr=el("tr");for(const h of headers){const th=el("th","",h);th.scope="col";tr.append(th);}head.append(tr);t.append(head);const body=el("tbody");for(const row of rows){const line=el("tr");for(const v of row){const cell=el("td");if(v&&typeof v==="object")cell.append(v);else cell.textContent=v??"—";line.append(cell);}body.append(line);}t.append(body);w.append(t);return w;};
 const show=title=>{$("raceTitle").textContent=title;const body=$("raceDetails");body.replaceChildren();if(!$("raceDialog").open)$("raceDialog").showModal();return body;};
 const pairButton=p=>button(pairDisplay(p.players),()=>{$("raceDialog").close();openPair(p);});
 const select=(options,label)=>{const s=el("select");s.setAttribute?.("aria-label",label);for(const [v,t] of options)s.add(new OptionCtor(t,v));return s;};
 const field=(label,control)=>{const l=el("label","race-field",label);l.append(control);return l;};
 const section=(body,title,headers,rows)=>{body.append(el("h3","",title),rows.length?table(headers,rows):el("p","muted","Aucune donnée disponible pour le moment."));};
 let cached=null,directory=[],side=null,centers=null,visibleRows=[],confirmations={};
 const pref="cdp-final-preparation-v1";
 try{const x=JSON.parse(storage.getItem(pref)||"{}");if(x&&typeof x==="object"&&!Array.isArray(x))confirmations=x;}catch{}
 function refresh(){const {state,result}=getState();if(cached!==result){cached=result;directory=null;side=null;centers=null;}return {state,result};}
 function players(){const {state,result}=refresh();return directory??=playerDirectory(state.rows,result);}
 function rankings(){const {state,result}=refresh();return side??=sideRankings(state.rows,result);}
 function comparison(){const {state,result}=refresh();return centers??=centerComparison(state.rows,result);}
 function playerProfile(x){
  const body=show(playerName(x.player).display);
  body.append(el("p","race-note","Série "+x.player.series+" · "+x.results.length+" séance(s) · "+x.partners.length+" partenaire(s) · moyenne personnelle "+pct(x.average)),el("p","muted","Statistiques personnelles, sans valeur qualificative : seules les performances de la même paire comptent pour la finale."));
  section(body,"Parcours personnel",["Séance","Partenaire","Centre de jeu","Score","Fiche de paire"],x.results.map(r=>["S"+r.session,playerName(r.partner).display,r.center,pct(r.score),pairButton(r.pair)]));
  section(body,"Partenaires",["Partenaire","Séances ensemble","Moyenne qualificative actuelle","Situation"],x.partners.map(p=>[playerName(p.partner).display,p.count,pct(p.pair.average),p.pair.status]));
  body.append(button("Retour à la recherche",openPlayers));
 }
 function openPlayers(){
  const body=show("Parcours individuels"),search=el("input");search.type="search";search.placeholder="Nom ou prénom du joueur";search.setAttribute?.("aria-label","Rechercher un joueur");
  const list=el("div"),status=el("p","muted");body.append(search,status,list);
  const update=()=>{const found=players().filter(x=>matchesSearch(playerName(x.player).display,search.value));status.textContent=found.length+" joueur(s) · 100 premiers affichés";list.replaceChildren(table(["Joueur","Série","Séances","Partenaires"],found.slice(0,100).map(x=>[button(playerName(x.player).display,()=>playerProfile(x)),x.player.series,x.results.length,x.partners.length])));};search.oninput=update;update();
 }
 function openSide(){
  const body=show("Classements annexes et records"),s=rankings(),{result}=getState();
  body.append(el("p","muted","Classements indicatifs, indépendants du règlement qualificatif. Régularité : écart-type des scores sur au moins trois séances jouées (plus petit = plus régulier)."));
  section(body,"Régularité",["Paire","Écart-type (points)","Moyenne","Séances"],s.regularity.slice(0,30).map(x=>[pairButton(x.p),x.sd.toFixed(2),pct(x.mean),x.p.count]));
  section(body,"Progression depuis S"+(result.completedSessions[0]??"—"),["Paire","Places gagnées"],s.progression.filter(x=>x.gain>0).slice(0,30).map(x=>[pairButton(x.p),x.gain]));
  section(body,"Records de score de la saison",["Paire","Séance","Centre","Score"],s.records.slice(0,30).map(x=>[pairButton(x.p),"S"+x.session,x.center,pct(x.score)]));
  section(body,"Assiduité : toutes les séances validées",["Paire","Séances","Moyenne"],s.attendance.map(p=>[pairButton(p),p.count,pct(p.average)]));
  section(body,"Trois meilleures paires comportant un joueur de chaque série",["Série","Paire","Moyenne"],s.series.flatMap(g=>g.pairs.map(p=>[g.series,pairButton(p),pct(p.average)])));
 }
 function openCenters(){
  const body=show("Comparer les centres"),all=comparison();
  body.append(el("p","muted","Fréquentation réelle, joueurs distincts, moyenne des résultats joués et quotas projetés. Le nombre de tables est estimé par paires / 2. Les séries se rapportent aux joueurs distincts."));
  const sort=select([["attendance","Participation cumulée"],["latest","Dernière séance"],["delta","Progression des tables"],["score","Score moyen"],["level","Part de premières séries"]],"Tri des centres"),output=el("div");
  body.append(field("Trier par",sort),output);
  const update=()=>{const val=c=>sort.value==="latest"?c.latestTables:sort.value==="delta"?c.deltaTables:sort.value==="score"?c.average:sort.value==="level"?(c.players?c.firstSeries/c.players:0):c.occurrences;
   const ranked=[...all].sort((a,b)=>(val(b)??-Infinity)-(val(a)??-Infinity)||a.center.localeCompare(b.center,"fr"));
   const bars=el("div","race-bars"),max=Math.max(1,...ranked.map(c=>c.latestTables??0));
   for(const c of ranked){const line=el("div","race-bar-row"),bar=el("div","race-bar-track"),fill=el("div","race-bar-fill");if(fill.style)fill.style.width=((c.latestTables??0)/max*100)+"%";bar.append(fill);line.append(el("span","",c.center),bar,el("strong","",c.latestTables??"—"));bars.append(line);}
   output.replaceChildren(el("h3","","Tables lors de la dernière séance"),bars,table(["Centre","Paires-séances","Tables moy.","Évolution tables","Joueurs","1res séries","Moyenne","Quota F1","Quota F2"],ranked.map(c=>[c.center,c.occurrences,c.averageTables?.toFixed(1),c.deltaTables??"—",c.players,c.firstSeries,pct(c.average),...c.quotas.map(q=>q.min===null?"—":q.min===q.max?q.min:q.min+"–"+q.max)])));
  };sort.onchange=update;update();
 }
 function openPartners(){
  const body=show("Changements de partenaires"),all=players().filter(x=>x.partners.length>1).sort((a,b)=>b.partners.length-a.partners.length||b.results.length-a.results.length);
  body.append(el("p","muted",all.length+" joueur(s) ont changé de partenaire. Chaque colonne S1–S6 indique le partenaire réel de la séance."));
  section(body,"Matrice des partenaires",["Joueur",...Array.from({length:6},(_,i)=>"S"+(i+1)),"Partenaires distincts"],all.map(x=>[button(playerName(x.player).display,()=>playerProfile(x)),...Array.from({length:6},(_,i)=>{const r=x.results.find(r=>r.session===i+1);return r?playerName(r.partner).display:"—";}),x.partners.length]));
 }
 function openBulletin(){
  const {state,result}=getState(),body=show("Bulletin sportif"),area=el("textarea","race-bulletin");area.value=sportsBulletin(state.rows,result);area.setAttribute?.("aria-label","Bulletin sportif modifiable");
  body.append(el("p","muted","Bilan automatique de la dernière séance validée. Relis et adapte avant de publier."),area,button("Copier le bulletin",async()=>{try{await platform.navigator.clipboard.writeText(area.value);notice.textContent="Bulletin copié.";}catch{area.select?.();notice.textContent="Sélectionné : utilise Ctrl+C ou Copier.";} }),);
  const notice=el("p","muted");body.append(notice);
 }
 function openSimulation(){
  const {state,result}=getState(),body=show("Simulateur global des qualifications"),future=[1,2,3,4,5,6].filter(n=>!result.completedSessions.includes(n)),names=[...new Set(state.rows.map(r=>r.center))].sort();
  if(!future.length||!names.length){body.append(el("p","muted","Aucune séance future à simuler ou aucune donnée validée."));return;}
  body.append(el("p","race-note","SCÉNARIO HYPOTHÉTIQUE — aucune écriture ni publication"),el("p","muted","Ajoute des résultats de paires existantes ou des lots de nouvelles paires fictives pour les séances futures. Chaque séance simulée est considérée terminée : les autres paires y sont absentes. Les quotas, le rattachement, les quatre meilleurs scores et toutes les qualifications sont recalculés. Ce scénario n’est pas une prévision."));
  const list=el("div","race-scenario-list"),controls=el("div","sport-actions"),output=el("div"),entries=[];
  const add=()=>{const wrap=el("div","race-scenario"),kind=select([["existing","Paire existante"],["new","Nouvelles paires fictives"]],"Type de résultat"),pair=select([["","Choisir une paire"],...result.ranking.map(p=>[p.key,pairDisplay(p.players)])],"Paire"),session=select(future.map(n=>[String(n),"S"+n]),"Séance future"),center=select(names.map(n=>[n,n]),"Centre"),score=el("input"),count=el("input"),finale=select([["1","Finale 1 (2C)"],["2","Finale 2 (3P)"]],"Catégorie fictive");
   score.type="number";score.min="0";score.max="100";score.step=".01";score.value="50";count.type="number";count.min="1";count.max="100";count.value="1";session.value=String(future[0]);center.value=names[0];kind.value="existing";finale.value="1";
   const pField=field("Paire existante",pair),countField=field("Nombre de paires",count),fField=field("Catégorie fictive",finale);const entry={wrap,kind,pair,session,center,score,count,finale};entries.push(entry);
   const toggle=()=>{const fictional=kind.value==="new";pField.hidden=fictional;countField.hidden=!fictional;fField.hidden=!fictional;};kind.onchange=toggle;toggle();
   const remove=button("Retirer cette ligne",()=>{const i=entries.indexOf(entry);if(i>=0)entries.splice(i,1);list.replaceChildren(...entries.map(e=>e.wrap));});
   wrap.append(field("Type",kind),pField,field("Séance",session),field("Centre",center),field("Score (%)",score),countField,fField,remove);list.append(wrap);
  };
  controls.append(button("Ajouter un résultat",add),button("Recalculer le scénario",()=>{try{
   const scenario=simulateGlobal(state.rows,result,entries.map(e=>({kind:e.kind.value,key:e.pair.value,session:e.session.value,center:e.center.value,score:e.score.value,count:e.count.value,finale:e.finale.value})));
   const s=scenario.simulated,projected=p=>["conditional","provisional"].includes(p.status);
   output.replaceChildren(el("h3","","Résultats du scénario"),el("p","race-note",scenario.added+" résultat(s) fictif(s) · "+scenario.sessions.length+" séances considérées terminées"),table(["Finale","Projetées avant","Projetées après","Cas incertains après"],[1,2].map(n=>[n,result.ranking.filter(p=>p.finale===n&&projected(p)).length,s.ranking.filter(p=>p.finale===n&&projected(p)).length,s.ranking.filter(p=>p.finale===n&&["quota-uncertain","cutoff-tie","center-ambiguous"].includes(p.status)).length])));
   section(output,"Quotas recalculés",["Finale","Centre","Avant","Après"],scenario.quotas.flatMap(f=>(f.quotas??[]).map(q=>[f.finale,q.center,q.old===q.oldMax?q.old:q.old+"–"+q.oldMax,q.next===q.nextMax?q.next:q.next+"–"+q.nextMax])));
   section(output,"Paires réelles dont le statut change",["Paire","Rang avant","Rang après","Statut avant","Statut après"],scenario.changes.map(x=>[pairDisplay(x.p.players),x.prior.rank,x.p.rank,x.prior.status,x.p.status]));
   section(output,"Classement intégral du scénario",["Rang","Paire","Finale","Moyenne","Statut"],s.ranking.map(p=>[p.rank,pairDisplay(p.players),p.finale,pct(p.average),p.status]));
   if(s.warnings.length)output.append(el("p","muted",s.warnings.join(" · ")));
  }catch(e){output.replaceChildren(el("p","error",e.message));}}));
  body.append(list,controls,output);add();
 }
 function openFinal(){
  const {result}=getState(),body=show("Préparation des finales"),data=finalPreparation(result);
  if(!data){body.append(el("p","race-note","Disponible après validation des six séances."),el("p","muted",result.completedSessions.length+"/6 séances validées. Les listes actuelles restent provisoires ; aucune confirmation officielle ne peut être enregistrée ici."));return;}
  const index=pairIndex(result.ranking);
  body.append(el("p","race-note","Listes indicatives, à faire valider par le Comité."),el("p","muted","Suivi personnel des confirmations, conservé uniquement dans ce navigateur. Un forfait ne réattribue jamais automatiquement une place. Les remplaçants potentiels sont présentés par centre, selon la projection ; les départages et règles de remplacement direct restent à confirmer."));
  for(const f of data){
   section(body,"Finale "+f.finale+" · paires projetées",["Paire","Centre","Voie","Suivi personnel"],f.selected.map(p=>{
    const ref=pairRef(p),key=f.finale+":"+ref,s=select([["pending","À contacter"],["confirmed","Confirmée"],["withdrawn","Forfait"]],"Suivi "+pairDisplay(p.players));s.value=Object.hasOwn(confirmations,key)?confirmations[key]:"pending";s.disabled=index.get(ref)!==p;s.onchange=()=>{confirmations[key]=s.value;try{storage.setItem(pref,JSON.stringify(confirmations));}catch{}};return [pairButton(p),p.center??"—",p.route,s];
   }));
   section(body,"Finale "+f.finale+" · cas à confirmer",["Paire","Centre","Motif"],f.uncertain.map(p=>[pairButton(p),p.center??"—",p.status]));
   section(body,"Finale "+f.finale+" · places vacantes et réserves locales",["Centre","Vacantes","Réserves potentielles (ordre du général)"],(f.centers??[]).map(c=>[c.center,c.vacant??"—",c.reserves.map(p=>pairDisplay(p.players)).join(" / ")||"—"]));
  }
 }
 function exportExcel(){
  const rows=[["Rang général","Paire","Centre","Finale","Séances","Moyenne (%)","Qualification",...Array.from({length:6},(_,i)=>"S"+(i+1)+" (%)")],...visibleRows.map(p=>[p.rank,pairDisplay(p.players),p.center??"",p.finale,p.count,p.average,p.status,...Array.from({length:6},(_,i)=>p.results.find(r=>r.session===i+1)?.score??"")])];
  if(typeof platform.Blob!=="function"||!platform.URL?.createObjectURL)return;
  const bytes=makeXlsx(rows),url=platform.URL.createObjectURL(new platform.Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})),a=el("a");a.href=url;a.download="CDP-classement-filtre.xlsx";a.click();platform.setTimeout(()=>platform.URL.revokeObjectURL(url),1000);
 }
 $("raceClose").onclick=()=>$("raceDialog").close();$("racePlayers").onclick=openPlayers;$("raceSide").onclick=openSide;$("raceCenters").onclick=openCenters;$("racePartners").onclick=openPartners;$("raceBulletin").onclick=openBulletin;$("raceSimulation").onclick=openSimulation;$("raceFinal").onclick=openFinal;$("raceExcel").onclick=exportExcel;
 return {
  render(hidden,rows=[]){$("racePanel").hidden=hidden;visibleRows=hidden?[]:rows;if(hidden)return;const {result}=refresh();$("raceStatus").textContent=result.ranking.filter(p=>p.possible).length+" paires encore en course par la participation · "+result.ranking.filter(p=>p.eligible).length+" ont déjà quatre séances ensemble · "+result.ranking.filter(p=>!p.possible).length+" mathématiquement éliminées par la participation.";$("raceExcel").disabled=!rows.length;},
  pairRace(body,p){const {result}=getState(),r=raceStatus(result,p),section=el("section","score-targets");section.append(el("h3","","Course à la finale"),el("p","race-note",r.possible?(r.missing===0?"Condition de participation remplie.":r.missing+" séance(s) encore nécessaires sur "+r.remaining+" restantes."):"Participation devenue mathématiquement insuffisante."));if(r.possible)section.append(el("p","muted","Absences encore possibles ensemble : "+r.absenceBudget+". La qualification sportive dépend toujours des résultats et des quotas."));if(r.localRank!==null&&r.quotaMin!==null)section.append(el("p","","Rang local "+r.localRank+" · quota "+r.quotaMin+(r.quotaMax!==r.quotaMin?"–"+r.quotaMax:"")+" · écart au seuil "+(r.gap===null?"indéterminé":(r.gap>0?"+":"")+r.gap.toFixed(2)+" point(s)")));body.append(section);},
 };
}
