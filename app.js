const $ = id => document.getElementById(id);
const state = { headers: [], rows: [], source: '', numeric: [], labels: [], x: '', y: '', chartMode: 'auto', grouped: [], hover: -1 };
const canvas = $('chart'), ctx = canvas.getContext('2d');

const sample = [
  ['Month','Region','Sales','Orders'],
  ['Jan','North',12400,182],['Jan','South',9800,146],['Jan','West',11300,163],
  ['Feb','North',13800,195],['Feb','South',10500,153],['Feb','West',12700,178],
  ['Mar','North',15100,212],['Mar','South',11900,169],['Mar','West',14200,194],
  ['Apr','North',14700,207],['Apr','South',13200,184],['Apr','West',15900,218],
  ['May','North',16900,231],['May','South',14300,197],['May','West',18100,246],
  ['Jun','North',18700,254],['Jun','South',15800,216],['Jun','West',19400,269]
];

function cleanNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value === null || value === undefined || String(value).trim() === '') return null;
  let s=String(value).trim();
  let negative=/^\(.*\)$/.test(s); s=s.replace(/[(),$£€₹%\s]/g,'').replace(/,/g,'');
  const n=Number(s); return Number.isFinite(n)?(negative?-n:n):null;
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(value){if(!Number.isFinite(value))return '—';return new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(value);}
function fmtSigned(value){return `${value>=0?'+':''}${fmt(value)}%`;}

function loadRows(rows, name) {
  const useful=rows.filter(r=>r&&r.some(c=>c!==null&&c!==undefined&&String(c).trim()!==''));
  if(useful.length<2)throw Error('This file needs a heading row and at least one row of data.');
  const headers=useful[0].map((h,i)=>String(h??'').trim()||`Column ${i+1}`);
  const data=useful.slice(1).map(row=>headers.map((_,i)=>row[i]??''));
  const filtered=data.filter(row=>row.some(c=>c!==''));
  if(!filtered.length)throw Error('No data rows found under the headings.');
  state.headers=headers;state.rows=filtered;state.source=name||'Your data';
  detectColumns();$('fileTitle').textContent=state.source.replace(/\.[^.]+$/,'');$('datasetMeta').textContent=`${filtered.length.toLocaleString()} rows of data`;
  $('dropStage').hidden=true;$('resultsStage').hidden=false;$('answerBox').hidden=true;
  buildSelectors();updateAnalysis();window.scrollTo({top:0,behavior:'smooth'});
}
function detectColumns(){
  state.numeric=[];state.labels=[];
  state.headers.forEach((h,i)=>{const values=state.rows.map(r=>r[i]).filter(v=>String(v??'').trim()!=='');const numericCount=values.filter(v=>cleanNumber(v)!==null).length;const ratio=values.length?numericCount/values.length:0;const name=h.toLowerCase();const likelyNumeric=/(sales|revenue|price|amount|total|cost|profit|quantity|qty|count|score|value|units|orders|number|income|rate|percent|growth)/.test(name);const dateLikely=/(date|time|month|year|day|week|period)/.test(name);if(ratio>=.7&&(likelyNumeric||!dateLikely||!/(\d{4}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2})/.test(String(values[0]??''))))state.numeric.push(i);else state.labels.push(i)});
  if(!state.numeric.length){const ix=state.headers.findIndex((_,i)=>state.rows.some(r=>cleanNumber(r[i])!==null));if(ix>=0){state.numeric=[ix];state.labels=state.headers.map((_,i)=>i).filter(i=>i!==ix)}}
  if(!state.labels.length)state.labels=state.headers.map((_,i)=>i).filter(i=>!state.numeric.includes(i));
  state.y=state.numeric[0]!==undefined?String(state.numeric[0]):'';state.x=state.labels[0]!==undefined?String(state.labels[0]):'';
}
function buildSelectors(){
  $('measureSelect').innerHTML=state.numeric.map(i=>`<option value="${i}">${escapeHtml(state.headers[i])}</option>`).join('');
  $('labelSelect').innerHTML=state.labels.map(i=>`<option value="${i}">${escapeHtml(state.headers[i])}</option>`).join('');
  $('measureSelect').value=state.y;$('labelSelect').value=state.x;
  $('totalMetricLabel').textContent=state.headers[Number(state.y)]||'selected measure';$('legendText').textContent=state.headers[Number(state.y)]||'Values';
}
function rowsForChart(){
  const xi=Number(state.x),yi=Number(state.y),xName=state.headers[xi]||'Row';
  const entries=state.rows.map((r,i)=>({label:String(state.x!==''?r[xi]??`Row ${i+1}`:`Row ${i+1}`),value:cleanNumber(r[yi]),raw:r,index:i})).filter(o=>o.value!==null);
  if(!entries.length)throw Error('Could not find numeric values to analyze. Choose a column containing numbers.');
  const repeated=entries.some((o,i)=>entries.findIndex(e=>e.label===o.label)!==i);
  if(repeated){const groups=new Map();for(const e of entries){const g=groups.get(e.label)||{label:e.label,value:0,count:0};g.value+=e.value;g.count++;groups.set(e.label,g)}const out=[...groups.values()];if(out.length<=32){state.grouped=out;return out.map(g=>({label:g.label,value:g.value,count:g.count}))}}
  state.grouped=entries.map(e=>({label:e.label,value:e.value,count:1}));return entries;
}
function updateAnalysis(){
  if(!state.rows.length)return;
  let points;try{points=rowsForChart()}catch(e){showError(e.message);return}
  const vals=points.map(p=>p.value),rawValues=state.rows.map(r=>cleanNumber(r[Number(state.y)])).filter(v=>v!==null),n=vals.length,total=rawValues.reduce((a,b)=>a+b,0),avg=total/rawValues.length,first=vals[0],last=vals.at(-1),change=first===0?(last===0?0:null):(last-first)/Math.abs(first)*100;
  $('rowMetric').textContent=state.rows.length.toLocaleString();$('totalMetric').textContent=fmt(total);$('averageMetric').textContent=fmt(avg);$('changeMetric').textContent=change===null?'—':fmtSigned(change);$('totalMetricLabel').textContent=state.headers[Number(state.y)]||'selected measure';$('legendText').textContent=state.headers[Number(state.y)]||'Values';
  const xName=state.headers[Number(state.x)]||'row';const yName=state.headers[Number(state.y)]||'Values';$('chartHeading').textContent=`${yName} by ${xName}`;$('chartDescription').textContent=points.length<state.rows.length?`Shows total ${yName} for each ${xName}.`:`Shows ${yName} for each ${xName}.`;
  const asc=points.every((p,i)=>i===0||p.value>=points[i-1].value),desc=points.every((p,i)=>i===0||p.value<=points[i-1].value);const top=points.reduce((a,b)=>b.value>a.value?b:a,points[0]),bottom=points.reduce((a,b)=>b.value<a.value?b:a,points[0]);
  const findings=[];findings.push({icon:'↗',title:change===null?'Change needs a non-zero starting value':`${change>=0?'Up':'Down'} ${Math.abs(change).toFixed(1)}% across the rows`,text:`${state.headers[Number(state.y)]} goes from ${fmt(first)} to ${fmt(last)}.`});findings.push({icon:'✦',title:`Highest: ${top.label}`,text:`${fmt(top.value)} is the top ${state.headers[Number(state.y)]} value.`});findings.push({icon:'⌁',title:`Lowest: ${bottom.label}`,text:`${fmt(bottom.value)} is the smallest value. The average is ${fmt(avg)}.`});if(points.length>2)findings.push({icon:'∿',title:asc?'Values rise consistently':desc?'Values fall consistently':'Values vary across the rows',text:`${n} ${n===1?'value':'values'} compared. Ask a question above for a specific answer.`});
  $('insightsList').innerHTML=findings.map(f=>`<article class="insight-row"><span>${f.icon}</span><div><strong>${escapeHtml(f.title)}</strong><p>${escapeHtml(f.text)}</p></div></article>`).join('');
  renderTable();drawChart(points);
}
function showError(msg){const el=$('errorBanner');el.textContent=msg;el.hidden=false;setTimeout(()=>{el.hidden=true},5000)}
function renderTable(){const cols=[state.x===''?null:Number(state.x),Number(state.y)].filter((v,i,a)=>v!==null&&a.indexOf(v)===i);const names=cols.map(i=>state.headers[i]);let body=state.rows.slice(0,300).map(r=>`<tr>${cols.map(i=>`<td>${escapeHtml(r[i])}</td>`).join('')}</tr>`).join('');$('dataTable').innerHTML=`<table><thead><tr>${names.map(n=>`<th>${escapeHtml(n)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>${state.rows.length>300?`<small>Showing first 300 of ${state.rows.length.toLocaleString()} rows.</small>`:''}`;}
function drawChart(points){const rect=canvas.getBoundingClientRect();if(rect.width<2)return;const dpr=devicePixelRatio||1;canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);const w=rect.width,h=rect.height,p={l:3,r:8,t:8,b:6},vals=points.map(o=>o.value),min=Math.min(0,...vals),max=Math.max(...vals),span=max-min||1;const lo=min-span*.12,hi=max+span*.12,range=hi-lo,x=i=>p.l+(vals.length===1?(w-p.l-p.r)/2:i*(w-p.l-p.r)/(vals.length-1)),y=v=>p.t+(hi-v)/range*(h-p.t-p.b);ctx.clearRect(0,0,w,h);const ticks=4,axis=[];for(let i=0;i<=ticks;i++){const yy=p.t+(h-p.t-p.b)*i/ticks,val=hi-range*i/ticks;ctx.beginPath();ctx.strokeStyle='#202938';ctx.setLineDash([3,5]);ctx.moveTo(0,yy);ctx.lineTo(w,yy);ctx.stroke();ctx.setLineDash([]);axis.push(fmtAxis(val))}$('axis').innerHTML=axis.map(v=>`<span>${v}</span>`).join('');const skip=Math.max(1,Math.ceil(points.length/6));$('xAxis').innerHTML=points.map((o,i)=>({o,i})).filter(q=>q.i%skip===0||q.i===points.length-1).map(q=>`<span>${escapeHtml(shortLabel(q.o.label))}</span>`).join('');let mode=state.chartMode==='auto'?(state.labels.length&&/(date|time|month|year|day|week|period)/i.test(state.headers[Number(state.x)]||'')?'line':'bar'):state.chartMode;document.querySelectorAll('.chart-type').forEach(b=>b.classList.toggle('active',b.dataset.chart===state.chartMode));if(mode==='bar'){const slot=(w-p.l-p.r)/vals.length,bw=Math.max(3,slot*.56);vals.forEach((v,i)=>{ctx.beginPath();ctx.roundRect(x(i)-bw/2,y(v),bw,Math.max(2,h-p.b-y(v)),[4,4,0,0]);ctx.fillStyle=i===state.hover?'#c3b9ff':'#8979ee';ctx.fill()})}else{ctx.beginPath();vals.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.lineTo(x(vals.length-1),h-p.b);ctx.lineTo(x(0),h-p.b);ctx.closePath();const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'rgba(136,120,238,.25)');grad.addColorStop(1,'rgba(136,120,238,0)');ctx.fillStyle=grad;ctx.fill();ctx.beginPath();vals.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.strokeStyle='#a99bff';ctx.lineWidth=2.2;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();vals.forEach((v,i)=>{ctx.beginPath();ctx.arc(x(i),y(v),i===state.hover?4.5:2.3,0,Math.PI*2);ctx.fillStyle='#0d1421';ctx.fill();ctx.strokeStyle='#b4a9ff';ctx.lineWidth=1.5;ctx.stroke()})}if(state.hover>=0&&state.hover<points.length){const i=state.hover;ctx.beginPath();ctx.setLineDash([3,4]);ctx.strokeStyle='#635a91';ctx.moveTo(x(i),p.t);ctx.lineTo(x(i),h-p.b);ctx.stroke();ctx.setLineDash([]);const tip=$('chartTip');tip.innerHTML=`${escapeHtml(points[i].label)}<br><strong>${escapeHtml(state.headers[Number(state.y)])}: ${fmt(points[i].value)}</strong>`;tip.style.left=Math.min(w-155,Math.max(0,x(i)+10))+'px';tip.style.display='block'}else $('chartTip').style.display='none';}
function fmtAxis(n){if(Math.abs(n)>=1e6)return `${(n/1e6).toFixed(1)}m`;if(Math.abs(n)>=1e3)return `${(n/1e3).toFixed(1)}k`;return fmt(n)}function shortLabel(s){return String(s).length>12?String(s).slice(0,10)+'…':s}
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect(),pts=rowsForChart();state.hover=Math.min(pts.length-1,Math.max(0,Math.round((e.clientX-r.left)/r.width*(pts.length-1))));drawChart(pts)});canvas.addEventListener('mouseleave',()=>{state.hover=-1;drawChart(rowsForChart())});window.addEventListener('resize',()=>state.rows.length&&drawChart(rowsForChart()));
$('measureSelect').addEventListener('change',e=>{state.y=e.target.value;updateAnalysis()});$('labelSelect').addEventListener('change',e=>{state.x=e.target.value;updateAnalysis()});document.querySelectorAll('.chart-type').forEach(b=>b.addEventListener('click',()=>{state.chartMode=b.dataset.chart;updateAnalysis()}));$('tableToggle').addEventListener('click',()=>{$('dataTable').hidden=!$('dataTable').hidden;$('tableToggle').innerHTML=$('dataTable').hidden?'View rows <span>→':'Hide rows <span>↑'});

function answerQuestion(q){const question=q.toLowerCase(),mentionIndex=arr=>arr.find(i=>{const h=state.headers[i].toLowerCase();return h.length>1&&question.includes(h)}),askedMeasure=mentionIndex(state.numeric),measureIndex=askedMeasure??Number(state.y),measure=state.headers[measureIndex]||'Value';const askedLabel=mentionIndex(state.labels);let raw=state.rows.map((r,i)=>({label:String(r[askedLabel??Number(state.x)]??`Row ${i+1}`),value:cleanNumber(r[measureIndex])})).filter(p=>p.value!==null);if(!raw.length)raw=rowsForChart();const sum=raw.reduce((a,b)=>a+b.value,0),mean=sum/raw.length,max=raw.reduce((a,b)=>a.value>b.value?a:b),min=raw.reduce((a,b)=>a.value<b.value?a:b);let questionPoints=raw;if(askedLabel!==undefined||(/\b(category|group|region|department|product|team|city|country)\b/.test(question)&&state.labels.length)){const labelIndex=askedLabel??Number(state.x),group=new Map();for(const r of state.rows){const label=String(r[labelIndex]??'Other'),value=cleanNumber(r[measureIndex]);if(value===null)continue;const g=group.get(label)||{label,total:0,count:0};g.total+=value;g.count++;group.set(label,g)}questionPoints=[...group.values()].map(g=>({label:g.label,value:/\b(average|mean)\b/.test(question)?g.total/g.count:g.total}))}let text;
  if(/\b(average|mean)\b/.test(question))text=`The average ${measure} is ${fmt(mean)} across ${vals.length} plotted ${vals.length===1?'value':'values'}.`;
  else if(/\b(total|sum|combined)\b/.test(question))text=`The total ${measure} is ${fmt(sum)} across ${vals.length} plotted ${vals.length===1?'value':'values'}.`;
  else if(/\b(lowest|minimum|min|least|smallest)\b/.test(question)){let p=questionPoints.reduce((a,b)=>a.value<b.value?a:b);text=`${p.label} has the lowest ${measure}: ${fmt(p.value)}.`}
  else if(/\b(highest|maximum|max|most|largest|top)\b/.test(question)){let p=questionPoints.reduce((a,b)=>a.value>b.value?a:b);text=`${p.label} has the highest ${measure}: ${fmt(p.value)}.`}
  else if(/\b(compare|comparison|versus|vs|by region|by category|breakdown|group)\b/.test(question)){const sorted=[...questionPoints].sort((a,b)=>b.value-a.value).slice(0,5);text=`Top ${Math.min(5,questionPoints.length)} ${state.headers[askedLabel??Number(state.x)]||'groups'} by ${measure}: ${sorted.map((p,i)=>`${i+1}) ${p.label}: ${fmt(p.value)}`).join(' · ')}.`}
  else if(/\b(trend|change|growth|increase|decrease|direction)\b/.test(question)){const points=rowsForChart(),vals=points.map(p=>p.value);let first=vals[0],last=vals.at(-1),c=first===0?null:(last-first)/Math.abs(first)*100;text=c===null?`The series starts at zero, so percentage change is undefined. It goes from ${fmt(first)} to ${fmt(last)}.`:`${measure} ${c>=0?'increased':'decreased'} ${Math.abs(c).toFixed(1)}% from ${points[0].label} (${fmt(first)}) to ${points.at(-1).label} (${fmt(last)}).`}
  else text=`I can answer totals, averages, highest or lowest values, trends, and category comparisons. Try asking “Which ${state.headers[Number(state.x)]||'row'} had the highest ${measure}?”`;
  $('answerBox').innerHTML=`<span class="answer-spark">✦</span><div><strong>Here’s what I found</strong><p>${escapeHtml(text)}</p></div>`;$('answerBox').hidden=false;
}
$('questionForm').addEventListener('submit',e=>{e.preventDefault();const q=$('questionInput').value.trim();if(q)answerQuestion(q)});document.querySelectorAll('.suggestions button').forEach(b=>b.addEventListener('click',()=>{$('questionInput').value=b.dataset.question;answerQuestion(b.dataset.question)}));

async function readFile(file){$('errorBanner').hidden=true;if(file.size>25*1024*1024)throw Error('That file is over 25 MB. Try a smaller file.');const ext=file.name.split('.').pop().toLowerCase();if(!['csv','tsv','xlsx','xls','xlsm','ods'].includes(ext))throw Error('Choose a CSV, TSV, or Excel spreadsheet.');if(!window.XLSX)throw Error('Spreadsheet reader is still loading. Check your internet connection and try again.');const bytes=await file.arrayBuffer(),book=XLSX.read(bytes,{type:'array',cellDates:true});const sheet=book.Sheets[book.SheetNames[0]],rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false});loadRows(rows,file.name)}
function openPicker(){$('fileInput').click()}$('browseButton').addEventListener('click',openPicker);$('replaceButton').addEventListener('click',openPicker);$('replaceLink').addEventListener('click',openPicker);$('dropZone').addEventListener('click',e=>{if(e.target.closest('button'))return;openPicker()});$('dropZone').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPicker()}});$('fileInput').addEventListener('change',async e=>{const f=e.target.files[0];if(f)try{await readFile(f)}catch(err){showError(err.message||'Could not read this file.')}e.target.value=''});
$('sampleButton').addEventListener('click',()=>loadRows(sample,'Sample sales data'));
for(const zone of [$('dropZone'),$('dropMini'),$('bottomDrop')]){zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragging')});zone.addEventListener('dragleave',()=>zone.classList.remove('dragging'));zone.addEventListener('drop',async e=>{e.preventDefault();zone.classList.remove('dragging');const f=e.dataTransfer.files[0];if(!f)return;try{await readFile(f)}catch(err){showError(err.message||'Could not read this file.')}})}
let dragCount=0;document.addEventListener('dragenter',e=>{if(e.dataTransfer?.types?.includes('Files')){dragCount++;document.body.classList.add('file-hover')}});document.addEventListener('dragleave',e=>{dragCount=Math.max(0,dragCount-1);if(!dragCount)document.body.classList.remove('file-hover')});document.addEventListener('drop',()=>{dragCount=0;document.body.classList.remove('file-hover')});
$('downloadButton').addEventListener('click',()=>{const table=[state.headers,...state.rows].map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');const blob=new Blob([table],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.source.replace(/\.[^.]+$/,'').toLowerCase().replace(/[^a-z0-9]+/g,'-')||'clearview-data')+'-summary.csv';a.click();URL.revokeObjectURL(a.href);toast('Your data copy is ready to download')});
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400)}

