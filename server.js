const http=require('http'),{WebSocketServer}=require('ws');
const R=new Map(),TURN=20000,GAME=300000;
const sh=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const mk=()=>{const d=[];for(const c of'rygb'){d.push({c,v:'0'});for(let i=1;i<10;i++)d.push({c,v:i+''},{c,v:i+''});for(const v of['S','R','+2'])d.push({c,v},{c,v})}for(let k=0;k<4;k++)d.push({c:'w',v:'W'},{c:'w',v:'+4'});return sh(d)};
const ok=(g,k)=>k.c==='w'||k.c===g.cur||k.v===g.D[g.D.length-1].v;
function draw(g,p,n){for(let i=0;i<n;i++){if(!g.P.length){const t=g.D.pop();g.P=sh(g.D);g.D=[t];if(!g.P.length)return}g.pl[p].h.push(g.P.pop())}}
function send(g){const now=Date.now();g.pl.forEach((p,i)=>{if(p.ws&&p.ws.readyState===1)p.ws.send(JSON.stringify({t:'s',code:g.code,ph:g.ph,me:i,h:p.h,top:g.D&&g.D[g.D.length-1],dn:g.D?g.D.length:0,cur:g.cur,dir:g.dir,turn:g.turn,drew:g.drew,tl:Math.max(0,(g.dl||now)-now),gl:Math.max(0,(g.end||now)-now),win:g.win,why:g.why,pl:g.pl.map(q=>({n:q.n,pic:q.pic,c:q.h.length}))}))})}
function arm(g,ms){clearTimeout(g.tt);g.dl=Date.now()+ms;g.tt=setTimeout(()=>tick(g),ms)}
function adv(g,s){g.turn=(g.turn+s)%2;g.drew=false;arm(g,TURN);send(g)}
function tick(g){if(g.ph!=='play')return;const p=g.pl[g.turn];if(++p.miss>=3)return finish(g,1-g.turn,'afk');if(!g.drew)draw(g,g.turn,1);adv(g,1)}
function finish(g,w,why){if(g.ph==='end')return;clearTimeout(g.tt);clearTimeout(g.et);g.ph='end';
if(w===undefined){const a=g.pl[0].h.length,b=g.pl[1].h.length;w=a<b?0:b<a?1:-1;why='time'}
g.win=w;g.why=why;send(g);setTimeout(()=>R.delete(g.code),600000)}
function begin(g){g.P=mk();g.pl.forEach(p=>{p.h=[];p.miss=0});draw(g,0,7);draw(g,1,7);
const i=g.P.findIndex(k=>k.c!=='w'&&!isNaN(k.v));g.D=[g.P.splice(i,1)[0]];g.cur=g.D[0].c;g.dir=1;g.turn=0;g.drew=false;g.ph='play';
g.end=Date.now()+GAME+2500;arm(g,TURN+2500);g.et=setTimeout(()=>finish(g),GAME+2500)}
const srv=http.createServer((q,r)=>r.end('ok')),wss=new WebSocketServer({server:srv});
wss.on('connection',ws=>{let g,me;
ws.on('message',raw=>{let d;try{d=JSON.parse(raw)}catch{return}
if(d.t==='join'&&!g){const code=String(d.room||'').replace(/[^\w-]/g,'').slice(0,16)||Math.random().toString(36).slice(2,8);
g=R.get(code);if(!g){g={code,pl:[],ph:'wait',dir:1};R.set(code,g)}
let i=g.pl.findIndex(p=>p.id===d.id);
if(i<0){if(g.pl.length>=2){ws.send('{"t":"full"}');g=null;return}i=g.pl.push({id:d.id,h:[],miss:0})-1}
me=i;Object.assign(g.pl[i],{ws,n:String(d.name||'Player').slice(0,24),pic:String(d.pic||'').slice(0,300)});
if(g.pl.length===2&&g.ph==='wait')begin(g);
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
ws.on('close',()=>{if(g&&g.pl[me]){g.pl[me].ws=null;if(g.ph==='wait')R.delete(g.code)}})});
srv.listen(process.env.PORT||8080);
