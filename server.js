const http=require('http'),crypto=require('crypto'),{WebSocketServer}=require('ws');
const BOT=process.env.BOT_TOKEN||'',BUSER=process.env.BOT_USERNAME||'LayloUonBot',APP=process.env.APP_SHORT||'uno';
const TURN=+process.env.TURN_MS||20000,GAME=+process.env.GAME_MS||300000,R=new Map();let Q=null;
const sh=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const mk=()=>{const d=[];for(const c of'rygb'){d.push({c,v:'0'});for(let i=1;i<10;i++)d.push({c,v:i+''},{c,v:i+''});for(const v of['S','R','+2'])d.push({c,v},{c,v})}for(let k=0;k<4;k++)d.push({c:'w',v:'W'},{c:'w',v:'+4'});return sh(d)};
const ok=(g,k)=>k.c==='w'||k.c===g.cur||k.v===g.D[g.D.length-1].v;
const nc=()=>Math.random().toString(36).slice(2,10);
function draw(g,p,n){for(let i=0;i<n;i++){if(!g.P.length){const t=g.D.pop();g.P=sh(g.D);g.D=[t];if(!g.P.length)return}g.pl[p].h.push(g.P.pop())}}
function send(g){const now=Date.now();g.pl.forEach((p,i)=>{if(p.ws&&p.ws.readyState===1)p.ws.send(JSON.stringify({t:'s',code:g.code,ph:g.ph,me:i,h:p.h,top:g.D&&g.D[g.D.length-1],dn:g.D?g.D.length:0,cur:g.cur,dir:g.dir,turn:g.turn,drew:g.drew,tl:Math.max(0,(g.dl||now)-now),gl:Math.max(0,(g.end||now)-now),win:g.win,why:g.why,pl:g.pl.map(q=>({n:q.n,pic:q.pic,c:q.h.length}))}))})}
function arm(g,ms){clearTimeout(g.tt);g.dl=Date.now()+ms;g.tt=setTimeout(()=>tick(g),ms)}
function adv(g,s){g.turn=(g.turn+s)%2;g.drew=false;arm(g,TURN);send(g)}
function tick(g){if(g.ph!=='play')return;const p=g.pl[g.turn];if(++p.miss>=3)return finish(g,1-g.turn,'afk');if(!g.drew)draw(g,g.turn,1);adv(g,1)}
function finish(g,w,why){if(g.ph==='end')return;clearTimeout(g.tt);clearTimeout(g.et);g.ph='end';
if(w===undefined){const a=g.pl[0].h.length,b=g.pl[1].h.length;w=a<b?0:b<a?1:-1;why='time'}
g.win=w;g.why=why;send(g);setTimeout(()=>R.delete(g.code),600000)}
function begin(g){g.P=mk();g.pl.forEach(p=>{p.h=[];p.miss=0});draw(g,0,7);draw(g,1,7);
const i=g.P.findIndex(k=>k.c!=='w'&&/^\d$/.test(k.v));g.D=[g.P.splice(i,1)[0]];g.cur=g.D[0].c;g.dir=1;g.turn=0;g.drew=false;g.ph='play';
g.end=Date.now()+GAME+2500;arm(g,TURN+2500);g.et=setTimeout(()=>finish(g),GAME+2500)}
function vfy(init){try{const p=new URLSearchParams(init),h=p.get('hash');p.delete('hash');if(!h||Date.now()/1000-(+p.get('auth_date')||0)>86400)return null;
const s=[...p].map(([k,v])=>k+'='+v).sort().join('\n'),k=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
return crypto.createHmac('sha256',k).update(s).digest('hex')===h?JSON.parse(p.get('user')):null}catch{return null}}
const srv=http.createServer((q,r)=>{r.writeHead(200);r.end('ok')}),wss=new WebSocketServer({server:srv});
wss.on('connection',ws=>{let g,me;ws.isAlive=true;ws.on('pong',()=>ws.isAlive=true);
ws.on('message',raw=>{let d;try{d=JSON.parse(raw)}catch{return}
if(d.t==='join'&&!g){let u;if(BOT){u=vfy(d.init);if(!u){ws.send('{"t":"auth"}');return}}else u={id:d.id,first_name:d.name,photo_url:d.pic};
const id=String(u.id);let code=String(d.room||'').replace(/[^\w-]/g,'').slice(0,24);
if(!code){const w=Q&&R.get(Q);if(w&&w.ph==='wait'&&w.pl.length===1&&w.pl[0].id!==id)code=Q;else code=Q=nc()}
g=R.get(code);if(!g){g={code,pl:[],ph:'wait',dir:1};R.set(code,g)}
let i=g.pl.findIndex(p=>p.id===id);
if(i<0){if(g.pl.length>=2){ws.send('{"t":"full"}');g=null;return}i=g.pl.push({id,h:[],miss:0})-1}
me=i;Object.assign(g.pl[i],{ws,n:String(u.first_name||u.username||'Player').slice(0,24),pic:String(u.photo_url||'').slice(0,300)});
if(g.pl.length===2&&g.ph==='wait'){if(Q===code)Q=null;begin(g)}
send(g);return}
if(!g)return;
if(d.t==='leave'){if(g.ph==='wait')R.delete(g.code);else finish(g,1-me,'left');return}
if(g.ph!=='play'||g.turn!==me)return;
const p=g.pl[me];
if(d.t==='draw'&&!g.drew){draw(g,me,1);g.drew=true;p.miss=0;send(g);
if(!ok(g,p.h[p.h.length-1]))setTimeout(()=>{if(g.ph==='play'&&g.turn===me&&g.drew)adv(g,1)},900)}
else if(d.t==='pass'&&g.drew){p.miss=0;adv(g,1)}
else if(d.t==='play'){const k=p.h[d.i];
if(!k||!ok(g,k)||(g.drew&&d.i!==p.h.length-1)||(k.c==='w'&&!'rygb'.includes(d.c)))return send(g);
p.h.splice(d.i,1);g.D.push(k);g.cur=k.c==='w'?d.c:k.c;p.miss=0;
if(k.v==='R')g.dir*=-1;
if(k.v==='+2'||k.v==='+4')draw(g,1-me,k.v==='+2'?2:4);
if(!p.h.length)return finish(g,me,'win');
adv(g,['S','R','+2','+4'].includes(k.v)?2:1)}});
ws.on('close',()=>{if(g&&g.pl[me]&&g.pl[me].ws===ws){g.pl[me].ws=null;if(g.ph==='wait'){R.delete(g.code);if(Q===g.code)Q=null}}})});
setInterval(()=>wss.clients.forEach(w=>{if(!w.isAlive)return w.terminate();w.isAlive=false;w.ping()}),25000);
process.on('uncaughtException',e=>console.error(e));
async function tg(m,b){const r=await fetch(`https://api.telegram.org/bot${BOT}/${m}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});return r.json()}
async function poll(){let off=0;for(;;){try{const r=await tg('getUpdates',{offset:off,timeout:25,allowed_updates:['inline_query','message']});
for(const u of r.result||[]){off=u.update_id+1;const q=u.inline_query,m=u.message;
if(q){const c=nc();await tg('answerInlineQuery',{inline_query_id:q.id,cache_time:0,is_personal:true,results:[{type:'article',id:c,title:'🃏 العب UNO معي',description:'أرسل دعوة للعب',input_message_content:{message_text:`🃏 ${q.from.first_name} يتحداك في UNO!\nاضغط الزر وادخل الغرفة`},reply_markup:{inline_keyboard:[[{text:'▶️ العب الآن',url:`https://t.me/${BUSER}/${APP}?startapp=${c}`}]]}}]})}
else if(m&&m.text&&m.text.startsWith('/start'))await tg('sendMessage',{chat_id:m.chat.id,text:'أهلاً! اضغط للعب UNO 🃏',reply_markup:{inline_keyboard:[[{text:'🃏 العب UNO',url:`https://t.me/${BUSER}/${APP}`}]]}})}}catch(e){await new Promise(r=>setTimeout(r,3000))}}}
if(BOT)tg('deleteWebhook',{}).then(poll).catch(()=>{});
srv.listen(process.env.PORT||8080);
