// Libellés vérifiés dans les annuaires FFB ; aucune attribution de centre déduite d'un nom de joueur.
export const centerNames=Object.freeze({
"5401013":"Peynier Bridge Club","5401035":"Set Bridge Club Marseille","5401036":"Cercle de St Barnabé",
"5401053":"Bridge Club d'Éguilles","5401055":"Bridge Club Martégal","5401057":"Bridge Club Roy René",
"5401062":"Bridge Club Salonais","5401070":"Bridge Club Ciotaden","5401131":"Aix Set Bridge Club",
"5402060":"Hyères les Palmiers","5402074":"Bridge Club de Six Fours","5402128":"Le Bridge au Pradet",
"5403088":"Bridge Club Pertuisien","5403095":"Bridge Club de Carpentras","5403096":"CBC Cavaillon Bridge Club",
"5404003":"Bridge Club Moyenne Durance"
});
export function normalizeCenter(row){
 const code=String(row.centerCode??"");
 // Une ancienne sauvegarde validée possède déjà le code de rattachement. On corrige uniquement son libellé.
 const name=centerNames[code];
 if(!name||!row.center||String(row.simultaneousId??code)!==code||row.center===name)return row;
 return {...row,center:name};
}
