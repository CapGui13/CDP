// Minimal XLSX writer: stored ZIP entries, inline strings, numeric cells, no formulas.
const enc=new TextEncoder();
const xml=s=>String(s??"").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function header(n){const data=new Uint8Array(n),v=new DataView(data.buffer);return {data,u16:(o,x)=>v.setUint16(o,x,true),u32:(o,x)=>v.setUint32(o,x,true)};}
function zip(files){const chunks=[],central=[];let offset=0,size=0;for(const [name,source] of files){const n=enc.encode(name),data=enc.encode(source),crc=crc32(data),h=header(30);h.u32(0,0x04034b50);h.u16(4,20);h.u16(6,0x800);h.u16(12,33);h.u32(14,crc);h.u32(18,data.length);h.u32(22,data.length);h.u16(26,n.length);chunks.push(h.data,n,data);const c=header(46);c.u32(0,0x02014b50);c.u16(4,20);c.u16(6,20);c.u16(8,0x800);c.u16(14,33);c.u32(16,crc);c.u32(20,data.length);c.u32(24,data.length);c.u16(28,n.length);c.u32(42,offset);central.push(c.data,n);size+=46+n.length;offset+=30+n.length+data.length;}
 const end=header(22);end.u32(0,0x06054b50);end.u16(8,files.length);end.u16(10,files.length);end.u32(12,size);end.u32(16,offset);const all=new Uint8Array(offset+size+22);let i=0;for(const x of [...chunks,...central,end.data]){all.set(x,i);i+=x.length;}return all;
}
export function makeXlsx(rows){
 const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((v,j)=>{const a=String.fromCharCode(65+j)+(i+1);return typeof v==="number"&&Number.isFinite(v)?'<c r="'+a+'"><v>'+v+'</v></c>':'<c r="'+a+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>';}).join("")+'</row>').join("")+'</sheetData></worksheet>';
 return zip([
 ["[Content_Types].xml",'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
 ["_rels/.rels",'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
 ["xl/workbook.xml",'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Classement CDP" sheetId="1" r:id="rId1"/></sheets></workbook>'],
 ["xl/_rels/workbook.xml.rels",'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
 ["xl/worksheets/sheet1.xml",sheet]]);
}
