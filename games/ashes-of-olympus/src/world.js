/* ============================ WORLD ============================ */
const N=96;
let W=null;
const PROPR={olive:.42,cypress:.3,column:.32,rock:.45,ruin:.55,palm:.3,obelisk:.36,statue:.4,bamboo:.3,pine:.36,lantern:.25,pagoda:.6,runestone:.32,coral:.36,kelp:.25,tomb:.4,deadtree:.3,chest:.36,amphora:.24,wp:.45};
const tIdx=(x,y)=>y*N+x;
function tileAt(x,y){x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=N||y>=N)return 0;return W.t[y*N+x]}
const walkT=t=>t>=1&&t<=3;
function walkable(x,y){return walkT(tileAt(x,y))}
function canStand(x,y,r){return walkable(x-r,y-r)&&walkable(x+r,y-r)&&walkable(x-r,y+r)&&walkable(x+r,y+r)}
function propsNear(x,y){const out=[];const tx=Math.floor(x),ty=Math.floor(y);for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const a=W.pgrid.get(tIdx(tx+i,ty+j));if(a)for(const p of a)out.push(p)}return out}
function addPropGrid(p){const k=tIdx(Math.floor(p.x),Math.floor(p.y));if(!W.pgrid.has(k))W.pgrid.set(k,[]);W.pgrid.get(k).push(p)}
function removeProp(p){p.gone=true;const k=tIdx(Math.floor(p.x),Math.floor(p.y));const a=W.pgrid.get(k);if(a){const i=a.indexOf(p);if(i>=0)a.splice(i,1)}W.props.splice(W.props.indexOf(p),1);if(p.blk)W.pblk[k]=0}
function moveEnt(e,dx,dy){
  if(canStand(e.x+dx,e.y,e.r*.8))e.x+=dx;if(canStand(e.x,e.y+dy,e.r*.8))e.y+=dy;
  for(const p of propsNear(e.x,e.y)){const ox=e.x-p.x,oy=e.y-p.y,d=Math.hypot(ox,oy),m=p.r+e.r*.7;if(d<m&&d>0.0001){const nx=p.x+ox/d*m,ny=p.y+oy/d*m;if(canStand(nx,ny,e.r*.8)){e.x=nx;e.y=ny}}}
}
function propBlocks(x,y,r){for(const p of propsNear(x,y)){if(Math.hypot(p.x-x,p.y-y)<p.r+r)return p}return null}

/* value noise */
function makeNoise(rng,cells){const g=[];for(let i=0;i<(cells+1)*(cells+1);i++)g.push(rng());
  return(x,y)=>{const fx=x/N*cells,fy=y/N*cells,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,s=t=>t*t*(3-2*t);
    const a=g[iy*(cells+1)+ix],b=g[iy*(cells+1)+ix+1],c=g[(iy+1)*(cells+1)+ix],d=g[(iy+1)*(cells+1)+ix+1];return lerp(lerp(a,b,s(tx)),lerp(c,d,s(tx)),s(ty))}}

function genAct(){
  const A=curAct(),seed=7919+ACTS.indexOf(A)*1013+(P.diff||0)*331,rng=mulberry(seed),R=(a,b)=>a+rng()*(b-a);
  W={A,t:new Uint8Array(N*N),v:new Uint8Array(N*N),seen:new Uint8Array(N*N),pblk:new Uint8Array(N*N),near:new Uint8Array(N*N),
    props:[],pgrid:new Map(),en:[],pets:[],loot:[],proj:[],zones:[],traps:[],parts:[],texts:[],npcs:[],wps:[],corpses:[],beams:[],decals:[],
    portal:null,boss:null,killed:0,lair:null,time:0};
  const n1=makeNoise(rng,9),n2=makeNoise(rng,23),nb=makeNoise(rng,14);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const edge=Math.min(x,y,N-1-x,N-1-y),bw=3+nb(x,y)*6,i=tIdx(x,y);
    if(edge<bw){W.t[i]=0;continue}
    const n=n1(x,y)*.7+n2(x,y)*.3;W.t[i]=n<.3?4:1;W.v[i]=Math.floor(rng()*256);
  }
  for(let it=0;it<3;it++){const nt=W.t.slice();for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){const i=tIdx(x,y);if(W.t[i]===0)continue;let c=0;for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){if((ox||oy)&&W.t[i+oy*N+ox]===4)c++}
    if(W.t[i]===4&&c<=3)nt[i]=1;else if(W.t[i]===1&&c>=5)nt[i]=4}W.t=nt}
  const S0={x:11,y:N-12},B0={x:N-14,y:13};W.start={x:S0.x+.5,y:S0.y+.5};W.bossPos={x:B0.x+.5,y:B0.y+.5};
  // carve helpers
  const carve=(cx,cy,rWalk,rRoad,roadT)=>{for(let y=Math.floor(cy-rWalk-1);y<=cy+rWalk+1;y++)for(let x=Math.floor(cx-rWalk-1);x<=cx+rWalk+1;x++){
      if(x<3||y<3||x>N-4||y>N-4)continue;const d=Math.hypot(x+.5-cx,y+.5-cy),i=tIdx(x,y);
      if(d<rRoad&&W.t[i]!==3)W.t[i]=roadT;else if(d<rWalk&&(W.t[i]===0||W.t[i]===4))W.t[i]=1;
      if(d<rWalk+1.2)W.near[i]=1}};
  const carveLine=(pts,rW,rR,step=.5)=>{const out=[];for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1],L=Math.hypot(b.x-a.x,b.y-a.y);
      for(let s=0;s<L;s+=step){const t=s/L;const x=lerp(a.x,b.x,t),y=lerp(a.y,b.y,t);carve(x,y,rW,rR,2);out.push({x,y})}}return out};
  // main road
  const ctrl=[S0];const dx=B0.x-S0.x,dy=B0.y-S0.y,L=Math.hypot(dx,dy),px=-dy/L,py=dx/L;
  for(let i=1;i<6;i++){const t=i/6,off=(i%2?1:-1)*R(9,20);ctrl.push({x:clamp(S0.x+dx*t+px*off,8,N-9),y:clamp(S0.y+dy*t+py*off,8,N-9)})}
  ctrl.push(B0);
  // smooth with midpoints jitter
  const fine=[];for(let i=0;i<ctrl.length-1;i++){const a=ctrl[i],b=ctrl[i+1];fine.push(a);fine.push({x:(a.x+b.x)/2+R(-3,3),y:(a.y+b.y)/2+R(-3,3)})}fine.push(B0);
  W.path=carveLine(fine,3.4,1.25);W.roads=[W.path];
  // branches with clearings
  W.clear=[];
  [.22,.45,.68,.85].forEach((f,bi)=>{const p=W.path[Math.floor(W.path.length*f)],side=bi%2?1:-1,ang=Math.atan2(dy,dx)+side*R(1.1,1.9),len=R(12,19);
    const e={x:clamp(p.x+Math.cos(ang)*len,9,N-10),y:clamp(p.y+Math.sin(ang)*len,9,N-10)};
    W.roads.push(carveLine([p,{x:(p.x+e.x)/2+R(-3,3),y:(p.y+e.y)/2+R(-3,3)},e],2.6,.9));carve(e.x,e.y,5.5,0,1);W.clear.push(e)});
  // town & arena
  carve(S0.x,S0.y,8,5.8,3);carve(B0.x,B0.y,9,7.5,3);
  // flood fill from start → remove unreachable ground
  const seen=new Uint8Array(N*N),q=[tIdx(S0.x,S0.y)];seen[q[0]]=1;
  while(q.length){const i=q.pop(),x=i%N,y=(i/N)|0;for(const[ox,oy]of[[1,0],[-1,0],[0,1],[0,-1]]){const j=tIdx(x+ox,y+oy);if(!seen[j]&&walkT(W.t[j])){seen[j]=1;q.push(j)}}}
  for(let i=0;i<N*N;i++)if(walkT(W.t[i])&&!seen[i])W.t[i]=4;
  // props
  const nearPt=(x,y,c,r)=>Math.hypot(x-c.x,y-c.y)<r;
  for(let y=3;y<N-3;y++)for(let x=3;x<N-3;x++){const i=tIdx(x,y);if(W.t[i]!==1||W.near[i])continue;
    if(nearPt(x,y,S0,10)||nearPt(x,y,B0,11))continue;if(rng()>.085)continue;
    const kind=A.props[Math.floor(rng()*A.props.length)];addProp({x:x+.5+R(-.2,.2),y:y+.5+R(-.2,.2),kind,v:rng()})}
  // ruins/columns lining parts of the road
  for(let k=10;k<W.path.length-30;k+=R(14,30)|0){const p=W.path[k],q2=W.path[Math.min(W.path.length-1,k+2)],a=Math.atan2(q2.y-p.y,q2.x-p.x)+Math.PI/2;
    for(const s of[-1,1]){const x=p.x+Math.cos(a)*2.4*s,y=p.y+Math.sin(a)*2.4*s;if(walkable(x,y)&&!propBlocks(x,y,.5))addProp({x,y,kind:A.props.includes('column')?'column':A.props[2],v:rng()})}}
  // arena pillars
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;if(Math.abs(angDiff(a,Math.atan2(S0.y-B0.y,S0.x-B0.x)))<.6)continue;addProp({x:W.bossPos.x+Math.cos(a)*7.8,y:W.bossPos.y+Math.sin(a)*7.8,kind:A.props.includes('column')?'column':'rock',v:.9})}
  // amphorae
  for(let k=0;k<40;k++){const p=W.path[Math.floor(rng()*W.path.length)],x=p.x+R(-3,3),y=p.y+R(-3,3);if(walkable(x,y)&&!propBlocks(x,y,.4)&&!nearPt(x,y,S0,7))addProp({x,y,kind:'amphora',v:rng(),hp:1})}
  // chests at clearings + random
  W.clear.forEach(c=>addProp({x:c.x+.5,y:c.y-1,kind:'chest',v:rng(),open:false}));
  // waypoints
  const wpAt=(p,name)=>{const w={x:p.x,y:p.y,name,on:false,id:W.wps.length};W.wps.push(w);addProp({x:p.x,y:p.y,kind:'wp',v:0,ref:w})};
  wpAt({x:S0.x-2.5,y:S0.y-2.5},'Город');wpAt(W.path[Math.floor(W.path.length*.5)],'Перепутье');wpAt(W.path[Math.max(0,W.path.length-34)],'Подступы к логову');
  // npcs
  W.npcs.push({x:S0.x+2.5,y:S0.y-1.5,kind:'merchant',n:'Торговец Ксантипп',r:.35,face:-1});
  W.npcs.push({x:S0.x-1.5,y:S0.y+2.5,kind:'oracle',n:'Оракул Пифия',r:.35,face:1});
  W.npcs.forEach(n=>addProp({x:n.x,y:n.y,kind:'npc',v:0,r:.32,ref:n}));
  for(const p of W.props)if(p.r>=.3&&p.kind!=='npc'&&p.kind!=='amphora'){const k=tIdx(Math.floor(p.x),Math.floor(p.y));W.pblk[k]=1;p.blk=1}
  // decals (big soft patches)
  for(let i=0;i<260;i++)W.decals.push({x:R(3,N-3),y:R(3,N-3),r:R(.8,2.6),dark:rng()<.55,v:rng()});
  // enemies
  const idx=Math.max(0,campaign().findIndex(a=>a.id===A.id)),base=1+idx*3+DIFF[P.diff||0].lvl;
  const plen=W.path.length;
  for(let k=Math.floor(plen*.1);k<plen-40;k+=R(16,26)|0){const p=W.path[k],x=p.x+R(-3,3),y=p.y+R(-3,3);if(!walkable(x,y))continue;
    spawnPack(x,y,base+Math.floor(k/plen*3),A,rng()<.2)}
  W.clear.forEach((c,i)=>{const prog=W.path.findIndex(p=>Math.hypot(p.x-c.x,p.y-c.y)<25)/plen;spawnPack(c.x,c.y+1,base+Math.floor(Math.max(0,prog)*3)+1,A,i!==0,i===0?6:5)});
  // a few wanderers off-road
  for(let k=0;k<10;k++){const x=R(8,N-8),y=R(8,N-8);if(!walkable(x,y)||Math.hypot(x-S0.x,y-S0.y)<16)continue;spawnPack(x,y,base+1,A,false,randi(2,3))}
  // lair: named champion in first clearing
  const lc=W.clear[0];const lt=A.en[Math.floor(rng()*A.en.length)];
  const L0=spawn(lt,lc.x,lc.y,base+2,{champ:true,named:LAIR_NAMES[ACTS.indexOf(A)%LAIR_NAMES.length]});W.lair=L0;
  // boss
  W.boss=spawn(A.boss,W.bossPos.x,W.bossPos.y,base+3,{boss:true});
  // player
  P.x=W.start.x;P.y=W.start.y;P.path=null;P.target=null;P.dash=null;P.revived=false;
  const wpOn=(P.wp&&P.wp[A.id])||[];W.wps.forEach(w=>{if(wpOn.includes(w.id))w.on=true});W.wps[0].on=true;
  makeMinimapBase();reveal(P.x,P.y,12);
}
function addProp(p){p.r=p.r||PROPR[p.kind]||.35;W.props.push(p);addPropGrid(p);return p}
function spawnPack(x,y,lvl,A,champ,n){n=n||randi(3,6);
  for(let j=0;j<n;j++){const tp=pick(A.en);let ex=x+rand(-1.6,1.6),ey=y+rand(-1.6,1.6);if(!canStand(ex,ey,.3)){ex=x;ey=y}
    if(canStand(ex,ey,.3))spawn(tp,ex,ey,lvl,{champ:champ&&j===0})}}
function spawn(tp,x,y,lvl,o={}){
  const T=o.boss?BOSS[tp]:ET[tp],boss=!!o.boss,champ=!!o.champ;
  const hpF=boss?(1+.15*(lvl-1)):(1+.32*(lvl-1)),dF=1+.2*(lvl-1);
  const e={tp,T,x,y,r:T.r*(champ?1.18:1),lvl,boss,champ,named:o.named||null,team:'e',
    maxHp:Math.round(T.hp*hpF*.85*(champ?2.4:1)*(o.named?1.6:1)),dmg:T.dmg*dF*.8*(champ?1.3:1),spd:T.spd,xp:T.xp*(1+.3*(lvl-1))*(champ?3:1)*(o.named?2:1),
    fly:T.shape==='flyer'||T.shape==='ghost',aggro:false,atk:rand(0,1),stun:0,slow:1,slowT:0,poison:0,poisonT:0,flash:0,face:1,walk:rand(0,6),
    anim:0,atkAnim:0,hx:x,hy:y,dead:false,aff:[],ab:{},abT:2.5,mode:null,phase:1,wander:rand(1,4)};
  if(champ){const a=[...CHAMP_AFF].sort(()=>Math.random()-.5).slice(0,o.named?2:1);e.aff=a.map(x=>x.id);e.affN=a.map(x=>x.n);
    if(e.aff.includes('stone'))e.maxHp=Math.round(e.maxHp*1.5);if(e.aff.includes('fast'))e.spd*=1.4}
  e.hp=e.maxHp;W.en.push(e);return e;
}

/* ---------- A* on tiles ---------- */
function findPath(sx,sy,gx,gy){
  sx=Math.floor(sx);sy=Math.floor(sy);gx=Math.floor(gx);gy=Math.floor(gy);
  const ok=(x,y)=>x>=0&&y>=0&&x<N&&y<N&&walkT(W.t[y*N+x])&&!W.pblk[y*N+x];
  if(!ok(gx,gy)){let best=null,bd=1e9;for(let r=1;r<4&&!best;r++)for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++)if(ok(gx+i,gy+j)){const d=i*i+j*j;if(d<bd){bd=d;best=[gx+i,gy+j]}}if(!best)return null;[gx,gy]=best}
  const g=new Float32Array(N*N).fill(1e9),from=new Int32Array(N*N).fill(-1),closed=new Uint8Array(N*N);
  const heap=[];const push=(i,f)=>{heap.push([f,i]);let k=heap.length-1;while(k>0){const p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m}}return top};
  const s=sy*N+sx,goal=gy*N+gx;g[s]=0;push(s,0);let it=0;
  const h=(x,y)=>{const dx=Math.abs(x-gx),dy=Math.abs(y-gy);return Math.max(dx,dy)+.414*Math.min(dx,dy)};
  while(heap.length&&it++<9000){const[,i]=pop();if(closed[i])continue;closed[i]=1;if(i===goal)break;const x=i%N,y=(i/N)|0;
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){if(!ox&&!oy)continue;const nx=x+ox,ny=y+oy;if(!ok(nx,ny))continue;if(ox&&oy&&(!ok(x+ox,y)||!ok(x,y+oy)))continue;
      const j=ny*N+nx,ng=g[i]+(ox&&oy?1.414:1);if(ng<g[j]){g[j]=ng;from[j]=i;push(j,ng+h(nx,ny))}}}
  if(from[goal]<0&&goal!==s)return null;
  const pts=[];let c=goal;while(c!==s&&c>=0){pts.push({x:c%N+.5,y:((c/N)|0)+.5});c=from[c]}pts.reverse();
  // string pulling
  const out=[];let cur={x:sx+.5,y:sy+.5},k=0;
  while(k<pts.length){let far=k;for(let j=pts.length-1;j>k;j--){if(lineClear(cur,pts[j])){far=j;break}}out.push(pts[far]);cur=pts[far];k=far+1}
  return out;
}
function lineClear(a,b){const L=Math.hypot(b.x-a.x,b.y-a.y),n=Math.ceil(L/.25);for(let i=1;i<=n;i++){const x=lerp(a.x,b.x,i/n),y=lerp(a.y,b.y,i/n);if(!canStand(x,y,.28)||W.pblk[tIdx(Math.floor(x),Math.floor(y))])return false}return true}

/* ---------- fog / minimap ---------- */
let MINI=null;
function makeMinimapBase(){MINI=document.createElement('canvas');MINI.width=MINI.height=N;const g=MINI.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,N,N)}
function tileMiniColor(t){const A=W.A;return t===0?A.voidC:t===4?A.water:t===2?A.road[0]:t===3?A.pave[0]:A.g[0]}
function reveal(cx,cy,r){const g=MINI.getContext('2d');for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++){if(x<0||y<0||x>=N||y>=N)continue;const i=tIdx(x,y);if(W.seen[i])continue;if(Math.hypot(x+.5-cx,y+.5-cy)>r)continue;W.seen[i]=1;g.fillStyle=tileMiniColor(W.t[i]);g.fillRect(x,y,1,1);if(W.pblk[i]){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x,y,1,1)}}}
