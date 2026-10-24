/* Offline/standalone mode (outside claude.ai): data is cached in this browser and, if a sync URL is set, saved to Google Drive via Apps Script. */
window.SSWL_SYNC_URL = window.SSWL_SYNC_URL || "";
(function(){
if(window.claude&&typeof window.claude.use==="function")return;
var KEY="sswl.localdb.v1",SK="sswl.sync",QK="sswl.queue",store={},ls=[],queue=[],busy=false,started=false;
var SYNC=(window.SSWL_SYNC_URL||"").trim();try{SYNC=(localStorage.getItem(SK)||SYNC).trim()}catch(e){}
try{store=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){store={}}
try{queue=JSON.parse(localStorage.getItem(QK)||"[]")}catch(e){queue=[]}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}}
function saveQ(){try{localStorage.setItem(QK,JSON.stringify(queue))}catch(e){}}
function ids(col){var p=col+"/";return Object.keys(store).filter(function(k){return k.indexOf(p)===0&&k.slice(p.length).indexOf("/")<0})}
function sd(path){var d=store[path];return{id:path.split("/").pop(),exists:!!d,data:function(){return d?JSON.parse(JSON.stringify(d)):undefined}}}
function notify(){ls.slice().forEach(function(f){f()})}
function fire(){persist();notify()}
function sub(f){ls.push(f);setTimeout(f,0);return function(){ls=ls.filter(function(x){return x!==f})}}
/* ---- Google Drive sync ---- */
var bar=null,msg=null;
function setStatus(s){if(!msg)return;
msg.textContent="v3 · "+(!SYNC?"☁ Google Drive sync: not set":s==="ok"?"☁ Google Drive sync: connected ✓":s==="sync"?"☁ Saving…":"⚠ Drive sync problem – will retry (data is safe in this browser)")}
function url(q){return SYNC+(SYNC.indexOf("?")>-1?"&":"?")+q}
function flush(){if(!SYNC||busy||!queue.length)return;busy=true;setStatus("sync");var ops=queue.slice();
fetch(SYNC,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({ops:ops})}).then(function(r){return r.json()}).then(function(r){
if(!r.ok)throw new Error(r.error);queue.splice(0,ops.length);saveQ();busy=false;setStatus("ok");flush()}).catch(function(){busy=false;setStatus("err");setTimeout(flush,8000)})}
function pull(){if(!SYNC||busy||queue.length)return Promise.resolve();
return fetch(url("action=all&t="+Date.now())).then(function(r){return r.json()}).then(function(r){
if(!r.ok)throw new Error(r.error);if(JSON.stringify(r.docs)!==JSON.stringify(store)){store=r.docs;fire()}setStatus("ok")}).catch(function(){setStatus("err")})}
function push(op){if(!SYNC)return;queue.push(op);saveQ();flush()}
async function init(){if(started)return;started=true;if(!SYNC)return;
flush();await Promise.race([pull(),new Promise(function(r){setTimeout(r,8000)})]);setInterval(pull,10000)}
/* ---- db API ---- */
function docRef(path){return{
get:async function(){return sd(path)},
set:async function(d){store[path]=JSON.parse(JSON.stringify(d));fire();push({action:"set",path:path,data:store[path]})},
update:async function(d){store[path]=Object.assign({},store[path]||{},d);fire();push({action:"set",path:path,data:store[path]})},
delete:async function(){delete store[path];fire();push({action:"delete",path:path})},
onSnapshot:function(n){return sub(function(){n(sd(path))})}}}
function query(col,ord,lim){
function mk(){var docs=ids(col).map(sd);if(ord)docs.sort(function(a,b){var x=a.data()[ord.f],y=b.data()[ord.f];return(x>y?1:x<y?-1:0)*(ord.d==="desc"?-1:1)});if(lim)docs=docs.slice(0,lim);return{docs:docs,size:docs.length,empty:!docs.length}}
return{orderBy:function(f,d){return query(col,{f:f,d:d||"asc"},lim)},limit:function(n){return query(col,ord,n)},get:async function(){return mk()},onSnapshot:function(n){return sub(function(){n(mk())})}}}
var db={doc:docRef,collection:function(c){var q=query(c);q.add=async function(d){var id="a"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);await docRef(c+"/"+id).set(d);return docRef(c+"/"+id)};q.doc=function(i){return docRef(c+"/"+i)};return q}};
var user={isOwner:async function(){return true},canEdit:async function(){return true},can:async function(){return true},me:async function(){return{id:"local",name:"Admin",isOwner:true}},id:async function(){return"local"},profiles:async function(){return{}},search:async function(){return[]}};
var dl={save:async function(o){var b=new Blob([o.data],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=o.filename;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}};
window.claude={use:async function(n){if(n==="db"){await init();return db}return n==="user"?user:n==="downloads"?dl:null}};
/* ---- sync status bar ---- */
bar=document.createElement("div");bar.style.cssText="position:fixed;right:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:20;background:var(--card);color:var(--mu);border:1px solid var(--bd);border-radius:20px;padding:5px 12px;font-size:12px;display:flex;gap:8px;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,.15)";
msg=document.createElement("span");var bt=document.createElement("button");bt.textContent="Setup";bt.style.cssText="font-size:12px;padding:2px 8px;border-radius:12px;border:1px solid var(--bd);background:transparent;color:inherit;cursor:pointer";
bt.onclick=function(){var v=prompt("Paste your Google Apps Script Web App URL here.\nLeave empty to turn Drive sync off.",SYNC);if(v===null)return;try{if(v.trim())localStorage.setItem(SK,v.trim());else localStorage.removeItem(SK)}catch(e){}location.reload()};
bar.appendChild(msg);bar.appendChild(bt);document.body.appendChild(bar);setStatus(queue.length?"sync":"ok");
})();
(async function(){
function $(i){return document.getElementById(i)}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function gate(m){$("app").classList.add("hid");$("gate").classList.remove("hid");$("gate").textContent=m}
function fail(x){alert("Action not allowed or failed: "+((x&&x.message)||x))}
window.addEventListener("unhandledrejection",function(e){var g=$("gate");if(g&&!g.classList.contains("hid"))gate("Error: "+((e.reason&&e.reason.message)||e.reason))});
window.addEventListener("error",function(e){var g=$("gate");if(g&&!g.classList.contains("hid"))gate("Error: "+e.message)});
setTimeout(function(){var g=$("gate");if(g&&!g.classList.contains("hid")&&(g.textContent==="Loading…"||/^(Connecting|Checking)/.test(g.textContent)))g.textContent="Still loading ("+g.textContent+") — open the portal from its claude.ai link while signed in, then refresh the page."},8000);
if(typeof claude==="undefined"||!claude.use){gate("Open this portal from its claude.ai artifact link while signed in. Opening the file directly will not work.");return}
function tmo(p){return Promise.race([p,new Promise(function(r){setTimeout(function(){r(null)},12000)})])}
gate("Connecting to database…");
var db=await tmo(claude.use("db")),user=await tmo(claude.use("user"));
if(!db){gate("Please open this page signed in to claude.ai (through the shared link).");return}
gate("Checking your account…");
var me=user?((await tmo(user.me()))||{id:null,name:""}):{id:null,name:""};
var isAdminAcct=user?!!(await tmo(user.canEdit())):false;
var PORTALS=[{id:"firestick",name:"Firestick Stock",icon:"📺"},{id:"clients",name:"Client Records",icon:"🗂️"}];
var cur=null,view="",unsubC=null,started=false,fails=0,lock=0;
var sticks=[],events=[],clients=[],users=[],logs=[],fS=false,fE=false,popped=false,editId=null,fsort={k:"serial",d:1},cedit=null;

/* ---------- access (no login: full access) ---------- */
function isAdm(){return true}
function lv(p){return "admin"}
function W(p){return true}
function setCur(c){cur=c;startData();$("gate").classList.add("hid");$("app").classList.remove("hid");build()}

/* ---------- data ---------- */
function snap(q,fn,soft){q.onSnapshot(function(s){fn(s.docs.map(function(d){var x=d.data()||{};x.id=d.id;return x}))},function(e){if(!soft)gate("Cannot read data: "+(e&&e.message))})}
function startData(){if(started)return;started=true;
snap(db.collection("sticks"),function(a){sticks=a;fS=true;draw()});
snap(db.collection("events"),function(a){events=a;fE=true;draw()});
snap(db.collection("clients"),function(a){clients=a;draw()});
}

/* ---------- shell / nav ---------- */
function tabs(){var a=PORTALS.filter(function(p){return lv(p.id)!=="none"}).map(function(p){return{id:p.id,t:p.icon+" "+p.name}});
return a}
function build(){if(!cur)return;var t=tabs();
if(!t.some(function(x){return x.id===view}))view=t.length?t[0].id:"";
$("nav").innerHTML=t.map(function(x){return"<button data-v='"+x.id+"' class='"+(x.id===view?"on":"")+"'>"+x.t+"</button>"}).join("");
draw()}
$("nav").onclick=function(e){var b=e.target.closest("button");if(!b)return;view=b.dataset.v;build()};
function draw(){if(!cur)return;
["firestick","clients"].forEach(function(v){$("v-"+v).classList.toggle("hid",v!==view)});
$("v-none").classList.toggle("hid",view!=="");
if(view==="firestick")drawF();else if(view==="clients")drawC();}

/* ---------- Firestick portal ---------- */
var F=["serial","model","hub","status","fe","cid","cname","date","note"];
function mk(o){var d=new Date();d.setDate(1);d.setMonth(d.getMonth()+o);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")}
function cls(s){return s==="In Stock"?"In":s}
function fstats(){var tm=mk(0),lm=mk(-1),cnt=function(m){return events.filter(function(e){return String(e.date).slice(0,7)===m}).length};
var inS=sticks.filter(function(r){return r.status==="In Stock"}),fe={};
inS.forEach(function(r){var k=r.fe||"Unassigned / Store";(fe[k]=fe[k]||{s:0,i:0}).s++});
events.forEach(function(e){if(String(e.date).slice(0,7)===tm){var k=e.fe||"Unassigned / Store";(fe[k]=fe[k]||{s:0,i:0}).i++}});
return{tm:cnt(tm),lm:cnt(lm),inS:inS.length,iss:sticks.filter(function(r){return r.status==="Issued"}).length,total:sticks.length,fl:sticks.filter(function(r){return r.status==="Faulty"}).length,fe:fe}}
function feTable(fe){var k=Object.keys(fe).sort();if(!k.length)return"<div style='color:var(--mu);padding:6px'>No data yet.</div>";
return"<table><thead><tr><th>FE</th><th>In stock</th><th>Issued this month</th></tr></thead><tbody>"+k.map(function(x){return"<tr><td>"+esc(x)+"</td><td><b>"+fe[x].s+"</b></td><td>"+fe[x].i+"</td></tr>"}).join("")+"</tbody></table>"}
function chart(a,b){var m=Math.max(a,b,1),h=110,ha=Math.round(a/m*h),hb=Math.round(b/m*h);
return"<svg viewBox='0 0 340 190' width='100%' role='img' aria-label='Issued last month "+b+", this month "+a+"'><line x1='30' y1='150' x2='320' y2='150' stroke='currentColor' opacity='.3'/><rect class='b2' x='70' y='"+(150-hb)+"' width='80' height='"+hb+"' rx='4'/><rect class='b1' x='200' y='"+(150-ha)+"' width='80' height='"+ha+"' rx='4'/><text x='110' y='"+(144-hb)+"' text-anchor='middle' font-weight='700'>"+b+"</text><text x='240' y='"+(144-ha)+"' text-anchor='middle' font-weight='700'>"+a+"</text><text x='110' y='170' text-anchor='middle'>Last month</text><text x='110' y='186' text-anchor='middle' opacity='.7'>"+mk(-1)+"</text><text x='240' y='170' text-anchor='middle'>This month</text><text x='240' y='186' text-anchor='middle' opacity='.7'>"+mk(0)+"</text></svg>"}
function showPop(){var s=fstats();
$("popb").innerHTML="<div class='stats'><div class='s'><b class='In'>"+s.inS+"</b><span>In stock</span></div><div class='s'><b class='Issued'>"+s.iss+"</b><span>Issued (now)</span></div><div class='s'><b>"+s.tm+"</b><span>Issued this month</span></div><div class='s'><b>"+s.lm+"</b><span>Issued last month</span></div></div><b>Who holds the stock</b><div class='mini tw'>"+feTable(s.fe)+"</div>";
if(!$("pop").open)$("pop").showModal()}
$("sum").onclick=showPop;$("popx").onclick=function(){$("pop").close()};
function drawF(){var s=fstats(),w=W("firestick");
$("fstats").innerHTML=[["Total",s.total,""],["In stock",s.inS,"In"],["Issued (now)",s.iss,"Issued"],["Issued this month",s.tm,""],["Faulty",s.fl,"Faulty"]].map(function(x){return"<div class='s'><b class='"+x[2]+"'>"+x[1]+"</b><span>"+x[0]+"</span></div>"}).join("");
$("chart").innerHTML=chart(s.tm,s.lm);$("fetab").innerHTML=feTable(s.fe);
document.querySelectorAll(".fw").forEach(function(b){b.classList.toggle("hid",!w)});
var hs=[];sticks.forEach(function(r){if(r.hub&&hs.indexOf(r.hub)<0)hs.push(r.hub)});hs.sort();var c=$("ffh").value;
$("ffh").innerHTML='<option value="">All hubs</option>'+hs.map(function(x){return"<option>"+esc(x)+"</option>"}).join("");$("ffh").value=hs.indexOf(c)>-1?c:"";
var q=$("fq").value.toLowerCase(),fs=$("ffs").value,fh=$("ffh").value;
var l=sticks.filter(function(r){return(!fs||r.status===fs)&&(!fh||r.hub===fh)&&(!q||F.map(function(k){return r[k]}).join(" ").toLowerCase().indexOf(q)>-1)});
l.sort(function(a,b){var x=String(a[fsort.k]||"").toLowerCase(),y=String(b[fsort.k]||"").toLowerCase();return(x>y?1:x<y?-1:0)*fsort.d});
$("ftb").innerHTML=l.map(function(r){var a="";
if(w){if(r.status==="In Stock")a+="<button data-a='i' data-id='"+r.id+"'>Issue</button> ";if(r.status==="Issued")a+="<button data-a='r' data-id='"+r.id+"'>Return</button> ";a+="<button data-a='e' data-id='"+r.id+"'>Edit</button> "}
if(isAdm())a+="<button class='d' data-a='d' data-id='"+r.id+"'>✕</button>";
return"<tr>"+F.map(function(k){return k==="status"?"<td><span class='tag "+cls(r.status)+"'>"+esc(r.status)+"</span></td>":"<td>"+esc(r[k])+"</td>"}).join("")+"<td>"+a+"</td></tr>"}).join("")||"<tr><td colspan='10' style='color:var(--mu)'>No records.</td></tr>";
if(!popped&&fS&&fE){popped=true;showPop()}}
function fnd(id){return sticks.filter(function(x){return x.id===id})[0]}
function openD(r){editId=r?r.id:null;$("dt").textContent=r?"Edit Firestick":"Add Firestick";$("err").textContent="";F.forEach(function(k){$(k).value=r?(r[k]||""):(k==="status"?"In Stock":"")});$("dlg").showModal()}
$("fadd").onclick=function(){openD()};$("cx").onclick=function(){$("dlg").close()};
$("fm").onsubmit=async function(e){var d={};F.forEach(function(k){d[k]=$(k).value.trim()});var m="",old=editId?fnd(editId):null;
if(sticks.some(function(r){return r.id!==editId&&String(r.serial).toLowerCase()===d.serial.toLowerCase()}))m="Serial No. already exists.";
else if(d.status==="Issued"&&(!d.cid||!d.fe||!d.date))m="Issued হলে Client ID, FE ও Date দিন।";
if(m){$("err").textContent=m;e.preventDefault();return false}
try{if(editId)await db.doc("sticks/"+editId).set(d);else await db.collection("sticks").add(d);
if(d.status==="Issued"&&(!old||old.status!=="Issued"))await db.collection("events").add({serial:d.serial,fe:d.fe,cid:d.cid,date:d.date})}catch(x){fail(x)}};
var issueId=null;$("icx").onclick=function(){$("idlg").close()};
$("ifm").onsubmit=async function(){var r=fnd(issueId);if(!r)return;var d=Object.assign({},r);delete d.id;d.status="Issued";d.cid=$("icid").value.trim();d.cname=$("icname").value.trim();d.fe=$("ife").value.trim();d.date=$("idate").value;
try{await db.doc("sticks/"+issueId).set(d);await db.collection("events").add({serial:d.serial,fe:d.fe,cid:d.cid,date:d.date})}catch(x){fail(x)}};
$("fbulk").onclick=function(){$("be").textContent="";$("bl").value="";$("bdlg").showModal()};$("bx").onclick=function(){$("bdlg").close()};
$("bf").onsubmit=async function(e){var list=$("bl").value.split(/\r?\n/).map(function(s){return s.trim()}).filter(Boolean),seen={},dup=[],add=[];
sticks.forEach(function(r){seen[String(r.serial).toLowerCase()]=1});
list.forEach(function(s){if(seen[s.toLowerCase()])dup.push(s);else{seen[s.toLowerCase()]=1;add.push(s)}});
if(dup.length){$("be").textContent="Duplicate: "+dup.slice(0,5).join(", ")+(dup.length>5?"…":"");e.preventDefault();return false}
try{for(var i=0;i<add.length;i++)await db.collection("sticks").add({serial:add[i],model:$("bm").value,hub:$("bh").value.trim(),status:"In Stock",fe:$("bfe").value.trim(),cid:"",cname:"",date:"",note:""})}catch(x){fail(x)}};
$("ftb").onclick=async function(e){var b=e.target.closest("button");if(!b)return;var id=b.dataset.id,r=fnd(id),a=b.dataset.a;if(!r)return;
if(a==="e")return openD(r);
if(a==="i"){issueId=id;$("it").textContent="Issue "+r.serial;$("icid").value="";$("icname").value="";$("ife").value=r.fe||"";$("idate").value=new Date().toISOString().slice(0,10);return $("idlg").showModal()}
try{if(a==="r"&&confirm("Mark "+r.serial+" as Returned?")){var d=Object.assign({},r);delete d.id;d.status="Returned";d.date=new Date().toISOString().slice(0,10);await db.doc("sticks/"+id).set(d)}
if(a==="d"&&confirm("Delete "+r.serial+"?"))await db.doc("sticks/"+id).delete()}catch(x){fail(x)}};
$("fh").onclick=function(e){var k=e.target.dataset.k;if(!k)return;fsort=fsort.k===k?{k:k,d:-fsort.d}:{k:k,d:1};draw()};
$("fq").oninput=draw;$("ffs").onchange=draw;$("ffh").onchange=draw;
async function exportCsv(name,h,rows){var csv=[h].concat(rows).map(function(a){return a.map(function(c){return'"'+String(c==null?"":c).replace(/"/g,'""')+'"'}).join(",")}).join("\n");
var dl=await claude.use("downloads");if(dl){try{await dl.save({filename:name,data:csv});return}catch(x){}}
var w=window.open("","_blank");if(w)w.document.write("<pre>"+esc(csv)+"</pre>");else alert("Pop-up blocked.")}
$("fexp").onclick=function(){exportCsv("firestick-stock.csv",["Serial No.","Model","HUB","Status","FE","Client ID","Client Name","Date","Remarks"],sticks.map(function(r){return F.map(function(k){return r[k]})}))};

/* ---------- Client Records portal ---------- */
var CF=["name","half","cid","zone","zid","hub","fe","serial","mac","acc","pkg","doi"];
var CL=["Name","Half Name","Client ID","Zone","Zone ID","HUB","FE","ISTICS Serial No.","Pan Metro MAC ID","Pan Metro Account ID","Package","Date of Issue"];
$("ch").innerHTML="<tr>"+CL.map(function(x){return"<th>"+x+"</th>"}).join("")+"<th></th></tr>";
$("cgrid").innerHTML=CF.map(function(k,i){return"<div><label>"+CL[i]+"</label><input id='c_"+k+"' "+(k==="doi"?"type='date' ":"")+(k==="mac"?"placeholder='AA:BB:CC:DD:EE:FF' ":"")+"required></div>"}).join("");
function drawC(){var w=W("clients"),q=$("cq").value.toLowerCase();
document.querySelectorAll(".cw").forEach(function(b){b.classList.toggle("hid",!w)});
var l=clients.filter(function(r){return!q||CF.map(function(k){return r[k]}).join(" ").toLowerCase().indexOf(q)>-1});
l.sort(function(a,b){return String(a.name).toLowerCase()>String(b.name).toLowerCase()?1:-1});
$("ccnt").textContent=l.length+" / "+clients.length;
$("ctb").innerHTML=l.map(function(r){return"<tr>"+CF.map(function(k){return"<td>"+esc(r[k])+"</td>"}).join("")+"<td>"+(w?"<button data-a='e' data-id='"+r.id+"'>Edit</button> ":"")+(isAdm()?"<button class='d' data-a='d' data-id='"+r.id+"'>✕</button>":"")+"</td></tr>"}).join("")||"<tr><td colspan='13' style='color:var(--mu)'>No records.</td></tr>"}
function cfnd(id){return clients.filter(function(x){return x.id===id})[0]}
function openC(r){cedit=r?r.id:null;$("cdt").textContent=r?"Edit record":"Add record";$("cerr").textContent="";CF.forEach(function(k){$("c_"+k).value=r?(r[k]||""):(k==="doi"?new Date().toISOString().slice(0,10):"")});$("cdlg").showModal()}
$("cadd").onclick=function(){openC()};$("ccx").onclick=function(){$("cdlg").close()};
$("c_name").oninput=function(){if(!cedit&&!$("c_half").dataset.t)$("c_half").value=$("c_name").value.trim().split(/\s+/)[0]||""};$("c_half").oninput=function(){$("c_half").dataset.t=1};
$("cfm").onsubmit=async function(e){var d={};CF.forEach(function(k){d[k]=$("c_"+k).value.trim()});d.mac=d.mac.toUpperCase().replace(/-/g,":");var m="";
if(!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(d.mac))m="MAC ID must look like AA:BB:CC:DD:EE:FF";
else if(clients.some(function(r){return r.id!==cedit&&String(r.cid).toLowerCase()===d.cid.toLowerCase()}))m="Client ID already exists.";
else if(clients.some(function(r){return r.id!==cedit&&r.mac===d.mac}))m="This MAC ID is already registered.";
if(m){$("cerr").textContent=m;e.preventDefault();return false}
$("c_half").dataset.t="";try{if(cedit)await db.doc("clients/"+cedit).set(d);else await db.collection("clients").add(d)}catch(x){fail(x)}};
$("ctb").onclick=async function(e){var b=e.target.closest("button");if(!b)return;var r=cfnd(b.dataset.id);if(!r)return;
if(b.dataset.a==="e")return openC(r);if(confirm("Delete "+r.name+"?"))try{await db.doc("clients/"+r.id).delete()}catch(x){fail(x)}};
$("cq").oninput=draw;
$("cexp").onclick=function(){exportCsv("client-records.csv",CL,clients.map(function(r){return CF.map(function(k){return r[k]})}))};

/* ---------- start ---------- */
setCur({type:"admin",name:"Admin",portals:{}});
})();
