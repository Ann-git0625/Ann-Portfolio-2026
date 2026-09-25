/* Column order follows the supplied Google Sheets screenshot: A–O, with G/J separators. */
(function(root){
'use strict';
const columns=[
 ['A','code','案件代號',184,'text'],['B','owner','專案負責人',134,'owner'],['C','members','組員',154,'members'],['D','status','案件狀態',126,'status'],['E','progress','最新進度日期',130,'date'],['F','output','目前完成內容',184,'text'],['G',null,'',28,'gap'],['H','materials','待客戶補齊項目',176,'text'],['I','contact','上次聯絡日期',130,'date'],['J',null,'',28,'gap'],['K','handoff','內部轉移日',130,'date'],['L','finish','預估完成日',130,'date'],['M',null,'風險管控',262,'computed'],['N','revisions','客戶修改次數',140,'number'],['O','additions','客戶追加',108,'number']
].map(([letter,key,label,width,type])=>({letter,key,label,width,type}));
const people=['Ann','Evonne','Boy','Cliff','Irene'];
const statuses=['執行中','結案','等客戶','暫停','待審核'];
const raw=[
 ['Ann',['Evonne','Boy'],'執行中','2027-03-17','沙盤+樣品屋X1+功能','沙盤30個點位資料','2027-04-06','2025-12-17','2026-09-11',2,0],
 ['Evonne',['Ann','Cliff'],'執行中','2025-12-15','沙盤+公設','鋪面確認資料','2025-12-17','2025-12-24','2026-01-01',3,0],
 ['Boy',['Boy','Irene'],'結案','2025-12-04','沙盤+樣品屋X1+功能','建築檔案','2025-12-30','2025-12-02','2026-09-11',2,0],
 ['Cliff',['Ann','Evonne'],'等客戶','2025-12-10','沙盤','沙盤30個點位資料','2025-12-10','2025-12-03','2026-09-11',2,0],
 ['Ann',['Irene'],'暫停','2025-12-15','沙盤+公設X1','鋪面確認資料','2025-12-22','2025-12-15','2026-09-11',2,1],
 ['Irene',['Evonne','Boy'],'待審核','2025-12-17','樣品屋X1','建築檔案','2025-12-31','2025-12-24','2026-09-11',4,0],
 ['Boy',['Ann','Irene'],'等客戶','2025-12-04','沙盤','鋪面確認資料','2025-12-22','2025-12-01','2026-09-11',2,1],
 ['Cliff',['Irene','Boy'],'執行中','2025-12-10','沙盤+公設X1','建築檔案','2025-12-19','2025-12-22','2025-12-23',2,0],
 ['Evonne',['Ann','Irene'],'執行中','2025-12-17','沙盤+樣品屋X1+功能','沙盤30個點位資料','2025-12-22','2025-12-15','2025-12-24',2,0],
 ['Ann',['Evonne','Boy'],'結案','2025-12-15','鋪面+公設X1','鋪面確認資料','2025-12-31','2025-12-24','2025-12-31',1,0],
 ['Evonne',['Boy','Irene'],'執行中','2025-12-12','沙盤+樣品屋X1+功能','建築檔案','2025-12-10','2025-12-02','2026-01-01',1,1],
 ['Irene',['Cliff','Ann'],'執行中','2025-12-19','沙盤+樣品屋X1+功能','平面立面圖','2025-12-21','2025-12-03','2025-12-30',1,1]
];
const seed=()=>raw.map((r,i)=>({id:'seed-'+i,code:'專案 A-'+String(i+1).padStart(2,'0'),owner:r[0],members:[...r[1]],status:r[2],progress:r[3],output:r[4],materials:r[5],contact:r[6],handoff:r[7],finish:r[8],revisions:r[9],additions:r[10]}));
const day=(a,b)=>Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/86400000);
function risk(row,asOf,threshold=3){
 const cells={},messages=[];
 if(row.contact&&day(asOf,row.contact)>7)cells.I='danger';
 if(row.status==='結案')return{cells,messages};
 if(row.revisions>=threshold){cells.N='danger';messages.push('修改次數過多');}
 if(row.status==='暫停')messages.push('專案暫停');
 if(row.status==='執行中'){
  if(row.finish&&day(asOf,row.finish)>0){cells.L='danger';messages.push('進度落後');}
  else if(row.finish&&day(row.finish,asOf)<=3&&day(row.finish,asOf)>=0){cells.L='warning';messages.push('即將到期');}
  if(row.progress&&day(asOf,row.progress)>7){cells.E='danger';messages.push('產出停滯');}
 }
 if(row.handoff&&row.finish&&day(row.handoff,row.finish)>0){cells.K='danger';messages.push('排程衝突');}
 const missing=row.materials&&!['已齊','無','—'].includes(row.materials.trim());
 if(missing&&day(asOf,row.materialUpdated||row.contact)>7){cells.H='warning';messages.push('客戶未給資料');}
 return{cells,messages};
}
function cellValue(row,col,asOf,threshold){if(col.type==='computed')return risk(row,asOf,threshold).messages.join(' / ');if(!col.key)return '';const v=row[col.key];return Array.isArray(v)?v.join(', '):String(v??'');}
function normalized(col,value){
 const text=String(value??'').trim();
 if(col.type==='date'){
  if(!text)return '';
  const m=text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);if(!m)throw Error('日期請輸入 YYYY-MM-DD。');
  const iso=m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
  if(new Date(iso+'T00:00:00Z').toISOString().slice(0,10)!==iso)throw Error('請輸入有效日期。');return iso;
 }
 if(col.type==='number'){if(text==='')return 0;const n=Number(text);if(!Number.isInteger(n)||n<0)throw Error('次數必須是 0 或正整數。');return n;}
 if(col.type==='members')return [...new Set(text.split(/[,，、]/).map(x=>x.trim()).filter(Boolean))];
 if(col.type==='status'&&!statuses.includes(text))throw Error('請選擇原表中的案件狀態。');
 return text.slice(0,500);
}
function setCell(rows,rowIndex,colIndex,value,asOf){const col=columns[colIndex];if(!col?.key)return;rows[rowIndex][col.key]=normalized(col,value);if(col.key==='materials')rows[rowIndex].materialUpdated=asOf;}
function query(rows,person,status=''){return rows.filter(r=>(!person||r.owner===person||r.members.includes(person))&&(!status||r.status===status));}
function blank(id){return{id,code:'',owner:'',members:[],status:'執行中',progress:'',output:'',materials:'',contact:'',handoff:'',finish:'',revisions:0,additions:0};}
function isRow(r){return r&&typeof r.id==='string'&&columns.filter(c=>c.key).every(c=>c.type==='members'?Array.isArray(r[c.key])&&r[c.key].every(v=>typeof v==='string'):c.type==='number'?Number.isInteger(r[c.key])&&r[c.key]>=0:typeof r[c.key]==='string');}
const api={columns,people,statuses,seed,day,risk,cellValue,normalized,setCell,query,blank,isRow};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RiskSheet=api;
})(typeof globalThis!=='undefined'?globalThis:this);
