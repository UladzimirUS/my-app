/* ============================ RENDER ============================ */
let Wd=0,Hd=0,DPR=1;
function resize(){const r=app.getBoundingClientRect();DPR=Math.min(2,window.devicePixelRatio||1);Wd=r.width;Hd=r.height;cv.width=Math.round(Wd*DPR);cv.height=Math.round(Hd*DPR);
  G.zoom=clamp(Math.min(Wd,Hd)/(G.touch?470:720),.62,1.5)}
window.addEventListener('resize',resize);
const setScr=()=>ctx.setTransform(DPR*G.zoom,0,0,DPR*G.zoom,DPR*G.ox,DPR*G.oy);
const setIso=()=>ctx.setTransform(DPR*G.zoom*TW,DPR*G.zoom*TH,-DPR*G.zoom*TW,DPR*G.zoom*TH,DPR*G.ox,DPR*G.oy);
const setPx=()=>ctx.setTransform(DPR,0,0,DPR,0,0);
function screenToWorld(mx,my){const sx=(mx-G.ox)/G.zoom,sy=(my-G.oy)/G.zoom;return{x:(sx/TW+sy/TH)/2,y:(sy/TH-sx/TW)/2}}
function worldToScreen(x,y,z=0){return{x:isoX(x,y)*G.zoom+G.ox,y:(isoY(x,y)-z)*G.zoom+G.oy}}

function drawBackground(A){
  setPx();const g=ctx,k=A.voidK;let gr;
  if(k==='clouds'){gr=g.createLinearGradient(0,0,0,Hd);gr.addColorStop(0,'#7f9fd0');gr.addColorStop(1,'#e8eef6')}
  else if(k==='lava'){gr=g.createLinearGradient(0,0,0,Hd);gr.addColorStop(0,'#050203');gr.addColorStop(1,'#3a0a04')}
  else if(k==='abyss'){gr=g.createLinearGradient(0,0,0,Hd);gr.addColorStop(0,'#0a2a40');gr.addColorStop(1,'#020a12')}
  else{gr=g.createLinearGradient(0,0,0,Hd);gr.addColorStop(0,shade(A.voidC,18));gr.addColorStop(1,shade(A.voidC,-8))}
  g.fillStyle=gr;g.fillRect(0,0,Wd,Hd);
  if(k==='clouds'||k==='mist'||k==='sky'){g.fillStyle=k==='clouds'?'rgba(255,255,255,.55)':'rgba(200,220,220,.06)';for(let i=0;i<9;i++){const x=((i*347+G.t*8-G.ox*.15)%(Wd+400)+Wd+400)%(Wd+400)-200,y=((i*211-G.oy*.15)%Hd+Hd)%Hd;ell(g,x,y,160,40);ell(g,x+70,y-15,90,30)}}
  if(k==='night'||k==='sky'){g.fillStyle='rgba(255,255,255,.6)';for(let i=0;i<60;i++){const x=((i*733-G.ox*.05)%Wd+Wd)%Wd,y=((i*397-G.oy*.05)%Hd+Hd)%Hd;g.fillRect(x,y,1.5,1.5)}}
}
function visRange(){const pad=140;const c=[screenToWorld(-pad,-pad),screenToWorld(Wd+pad,-pad),screenToWorld(-pad,Hd+pad*2),screenToWorld(Wd+pad,Hd+pad*2)];
  return{x0:clamp(Math.floor(Math.min(...c.map(p=>p.x))),0,N-1),x1:clamp(Math.ceil(Math.max(...c.map(p=>p.x))),0,N-1),y0:clamp(Math.floor(Math.min(...c.map(p=>p.y))),0,N-1),y1:clamp(Math.ceil(Math.max(...c.map(p=>p.y))),0,N-1)}}
function onScreen(x,y,m=120){const sx=isoX(x,y)*G.zoom+G.ox,sy=isoY(x,y)*G.zoom+G.oy;return sx>-m&&sx<Wd+m&&sy>-m&&sy<Hd+m*2}
function drawGround(A,V){
  const g=ctx;setIso();
  g.fillStyle=TEX.ground||A.g[0];
  for(let y=V.y0;y<=V.y1;y++){let x=V.x0;while(x<=V.x1){if(W.t[y*N+x]!==0){const s=x;while(x<=V.x1&&W.t[y*N+x]!==0)x++;g.fillRect(s-.01,y-.01,x-s+.02,1.03)}else x++}}
  // soft patches
  for(const d of W.decals){if(d.x<V.x0-3||d.x>V.x1+3||d.y<V.y0-3||d.y>V.y1+3)continue;if(!walkable(d.x,d.y))continue;const gr=g.createRadialGradient(d.x,d.y,0,d.x,d.y,d.r);gr.addColorStop(0,d.dark?'rgba(0,0,0,.13)':'rgba(255,255,230,.09)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(d.x-d.r,d.y-d.r,d.r*2,d.r*2)}
  // roads
  g.lineJoin='round';g.lineCap='round';
  for(const r of W.roads){g.beginPath();g.moveTo(r[0].x,r[0].y);for(let i=1;i<r.length;i+=2)g.lineTo(r[i].x,r[i].y);g.strokeStyle='rgba(0,0,0,.16)';g.lineWidth=r===W.path?3:2.3;g.stroke();g.strokeStyle=TEX.road||A.road[0];g.lineWidth=r===W.path?2.5:1.8;g.stroke()}
  for(const[c,r]of[[W.start,6],[W.bossPos,8]]){g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.arc(c.x,c.y,r+.25,0,Math.PI*2);g.fill();g.fillStyle=TEX.pave||A.pave[0];g.beginPath();g.arc(c.x,c.y,r,0,Math.PI*2);g.fill();
    g.strokeStyle=rgba(A.pave[1],.9);g.lineWidth=.12;g.beginPath();g.arc(c.x,c.y,r*.55,0,Math.PI*2);g.stroke()}
  // liquids
  const liq=A.liquid,lc=A.water,t=G.t;
  const shoreC=liq==='lava'?'#1a0604':liq==='cloud'?'rgba(255,255,255,.9)':liq==='ice'?'#e8f4fa':shade(lc,-35);
  for(const pass of[0,1]){g.beginPath();for(let y=V.y0;y<=V.y1;y++)for(let x=V.x0;x<=V.x1;x++){if(W.t[y*N+x]!==4)continue;const r=pass?.62:.74;g.moveTo(x+.5+r,y+.5);g.arc(x+.5,y+.5,r,0,Math.PI*2)}
    g.fillStyle=pass?(liq==='cloud'?shade(A.voidC,10):lc):shoreC;g.fill()}
  // liquid shimmer
  g.lineWidth=.05;
  for(let y=V.y0;y<=V.y1;y++)for(let x=V.x0;x<=V.x1;x++){const i=y*N+x;if(W.t[i]!==4)continue;const v=W.v[i];
    if(liq==='lava'){if(v%4)continue;const p=.5+.5*Math.sin(t*1.5+v);g.fillStyle=`rgba(255,${170+p*70|0},60,${.18+p*.22})`;g.beginPath();g.ellipse(x+.5+Math.sin(v)*.25,y+.5+Math.cos(v)*.25,.35+p*.2,.22+p*.1,v,0,Math.PI*2);g.fill()}
    else if(liq==='cloud'){g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(x+.5+Math.sin(t*.3+v)*.3,y+.5,.35,0,Math.PI*2);g.fill()}
    else if(v%3===0){g.strokeStyle=liq==='ice'?'rgba(255,255,255,.6)':'rgba(255,255,255,.22)';const o=(t*.2+v/40)%1,ox=(v%11)/14;g.globalAlpha=Math.sin(o*Math.PI);g.beginPath();g.moveTo(x+ox,y+o);g.lineTo(x+ox+.35,y+o+.08);g.stroke();g.globalAlpha=1}}
  // cliffs (screen space)
  setScr();
  const cl0=A.cliff[0],cl1=A.cliff[1],H=liq==='lava'?40:54;
  for(let y=V.y0;y<=V.y1;y++)for(let x=V.x0;x<=V.x1;x++){const ti=W.t[y*N+x];if(ti===0)continue;
    const rN=x+1<N?W.t[y*N+x+1]:0,bN=y+1<N?W.t[(y+1)*N+x]:0;
    if(rN===0){const ax=isoX(x+1,y),ay=isoY(x+1,y),bx=isoX(x+1,y+1),by=isoY(x+1,y+1);g.fillStyle=cl1;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.lineTo(bx,by+H);g.lineTo(ax,ay+H*.8);g.closePath();g.fill();g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.moveTo(ax,ay+H*.45);g.lineTo(bx,by+H*.55);g.lineTo(bx,by+H);g.lineTo(ax,ay+H*.8);g.fill()}
    if(bN===0){const ax=isoX(x+1,y+1),ay=isoY(x+1,y+1),bx=isoX(x,y+1),by=isoY(x,y+1);g.fillStyle=cl0;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.lineTo(bx,by+H*.8);g.lineTo(ax,ay+H);g.closePath();g.fill();g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.moveTo(ax,ay+H*.5);g.lineTo(bx,by+H*.4);g.lineTo(bx,by+H*.8);g.lineTo(ax,ay+H);g.fill();
      g.strokeStyle='rgba(0,0,0,.15)';g.lineWidth=1;ln(g,ax,ay+H*.25,bx,by+H*.2)}
  }
  // small decals
  for(let y=V.y0;y<=V.y1;y++)for(let x=V.x0;x<=V.x1;x++){const i=y*N+x;if(W.t[i]!==1)continue;const v=W.v[i];if(v%7)continue;
    g.save();g.translate(isoX(x+.3+(v%5)*.1,y+.3+(v%3)*.15),isoY(x+.3+(v%5)*.1,y+.3+(v%3)*.15));drawTuft(g,A.decal,v);g.restore()}
}
function drawTuft(g,k,v){
  switch(k){
    case'flower':g.strokeStyle='#4a6a2a';g.lineWidth=1.3;ln(g,0,0,-2,-7);ln(g,0,0,2,-8);ln(g,0,0,4,-6);if(v%2){g.fillStyle=v%3?'#e8d050':'#e86a6a';circ(g,-2,-8,2);circ(g,2,-9,2);circ(g,4,-7,1.8)}break;
    case'grass':g.strokeStyle=v%2?'#3f5a32':'#7a9a58';g.lineWidth=1.4;for(let i=-2;i<=2;i++)ln(g,i*2,0,i*3,-8-Math.abs(i));break;
    case'sand':g.strokeStyle='rgba(140,100,40,.4)';g.lineWidth=1.5;g.beginPath();g.arc(0,8,14,-2.4,-.7);g.stroke();if(v%3===0){g.fillStyle='#e8e0d0';ell(g,4,-1,4,1.5)}break;
    case'snow':g.fillStyle='rgba(255,255,255,.8)';ell(g,0,0,12,4);if(v%3===0){g.fillStyle='#8aa0b0';circ(g,4,-1,2.2)}break;
    case'cloud':g.fillStyle='rgba(255,255,255,.3)';ell(g,0,0,18,6);break;
    case'shell':g.fillStyle='#f0d8c0';g.beginPath();g.arc(0,0,4,Math.PI,0);g.fill();g.strokeStyle='#c8a890';g.lineWidth=.8;ln(g,0,0,0,-4);break;
    case'ember':g.fillStyle='rgba(255,120,40,.7)';circ(g,0,-2,1.5);g.fillStyle='rgba(90,60,100,.5)';ell(g,0,0,8,2.5);break;
  }
}
function drawLootGround(g,l){
  const h=Math.sin(l.pop*Math.PI)*20;g.save();g.translate(isoX(l.x,l.y),isoY(l.x,l.y)-h);
  if(l.type==='gold'){g.fillStyle='#ffd34d';ell(g,0,0,5,2.6);ell(g,4,2,4,2);g.fillStyle='#b8860b';ell(g,0,0,2,1)}
  else if(l.type==='potH'||l.type==='potM'){const c=l.type==='potH'?'#d03030':'#3060d0';oc(g,0,-5,5,c);g.fillStyle='#ddd';g.fillRect(-1.5,-13,3,4);g.fillStyle='rgba(255,255,255,.4)';circ(g,-2,-7,1.5)}
  else{const c=RAR[l.item.rar].c;if(l.item.rar>=2){g.globalAlpha=.2+Math.sin(G.t*3)*.07;const gr=g.createLinearGradient(0,-90,0,0);gr.addColorStop(0,rgba(c,0));gr.addColorStop(1,c);g.fillStyle=gr;g.fillRect(-4,-90,8,90);g.globalAlpha=1}
    g.fillStyle=c;poly(g,[0,-9,8,-3,0,3,-8,-3],1);g.fillStyle='rgba(255,255,255,.35)';poly(g,[0,-9,8,-3,0,-3])}
  g.restore();
}
function render(){
  const A=W.A,z=G.zoom;
  G.ox=Wd/2-isoX(G.cam.x,G.cam.y)*z+(Math.random()-.5)*G.shake;G.oy=Hd/2-isoY(G.cam.x,G.cam.y)*z+28*z+(Math.random()-.5)*G.shake;
  if(G.mxs!==undefined){const w=screenToWorld(G.mxs,G.mys);G.mx=w.x;G.my=w.y}
  drawBackground(A);const V=visRange();drawGround(A,V);
  const g=ctx;
  // iso-space ground fx
  setIso();
  for(const zn of W.zones){const k=1-zn.t/zn.max;g.globalAlpha=.18+k*.25;g.fillStyle=zn.c;
    if(zn.kind==='line'){g.save();g.translate(zn.x,zn.y);g.rotate(zn.ang);g.fillRect(0,-zn.w,zn.len,zn.w*2);g.globalAlpha=.8;g.fillRect(0,-zn.w*k,zn.len,zn.w*2*k);g.restore()}
    else{g.beginPath();g.arc(zn.x,zn.y,zn.r,0,Math.PI*2);g.fill();g.globalAlpha=.85;g.strokeStyle=zn.c;g.lineWidth=.07;g.beginPath();g.arc(zn.x,zn.y,zn.r*k,0,Math.PI*2);g.stroke()}g.globalAlpha=1}
  for(const t of W.traps){g.strokeStyle=t.arm>0?'rgba(255,220,120,.4)':'#ffd060';g.lineWidth=.06;g.beginPath();g.arc(t.x,t.y,.4,0,Math.PI*2);g.stroke();g.fillStyle='#8a6a3a';g.beginPath();g.arc(t.x,t.y,.18,0,Math.PI*2);g.fill()}
  if(P.target&&!P.target.dead){const e=P.target;g.strokeStyle='rgba(255,90,60,.8)';g.lineWidth=.05;g.setLineDash([.2,.15]);g.lineDashOffset=-G.t;g.beginPath();g.arc(e.x,e.y,e.r*1.6,0,Math.PI*2);g.stroke();g.setLineDash([])}
  if(P.path&&P.path.length&&!P.target){const d=P.path[P.path.length-1];g.strokeStyle='rgba(255,240,200,.5)';g.lineWidth=.05;g.beginPath();g.arc(d.x,d.y,.3+Math.sin(G.t*8)*.05,0,Math.PI*2);g.stroke()}
  if(P.buffs.warcry||P.buffs.bulwark||P.buffs.venom){g.strokeStyle=P.buffs.venom?'rgba(138,255,106,.5)':'rgba(255,170,70,.55)';g.lineWidth=.05;g.beginPath();g.arc(P.x,P.y,.55,0,Math.PI*2);g.stroke()}
  for(const p of W.parts){if(!p.ring&&!p.arc)continue;const k=p.life/p.max;g.globalAlpha=k;g.strokeStyle=p.c;
    if(p.ring){g.lineWidth=.12;g.beginPath();g.arc(p.x,p.y,p.r*(1.1-k*.6),0,Math.PI*2);g.stroke()}
    else{g.lineWidth=.22;g.beginPath();g.arc(p.x,p.y,p.r*.8,p.a-p.w/2,p.a+p.w/2);g.stroke()}}
  g.globalAlpha=1;
  setScr();
  for(const l of W.loot)if(onScreen(l.x,l.y))drawLootGround(g,l);
  // y-sorted objects
  const list=[];
  for(const p of W.props)if(onScreen(p.x,p.y,180))list.push({d:p.x+p.y,f:()=>drawProp(g,p,A),x:p.x,y:p.y});
  for(const e of W.en)if(onScreen(e.x,e.y,200))list.push({d:e.x+e.y-(e.dead?.6:0),f:()=>drawEnemy(g,e),x:e.x,y:e.y});
  for(const p of W.pets)list.push({d:p.x+p.y,f:()=>drawPet(g,p),x:p.x,y:p.y});
  if(W.portal)list.push({d:W.portal.x+W.portal.y,f:()=>drawPortal(g,W.portal),x:W.portal.x,y:W.portal.y});
  list.push({d:P.x+P.y,f:()=>drawPlayer(g),x:P.x,y:P.y});
  list.sort((a,b)=>a.d-b.d);
  for(const it of list){g.save();g.translate(isoX(it.x,it.y),isoY(it.x,it.y));it.f();g.restore()}
  // projectiles
  for(const p of W.proj){if(!onScreen(p.x,p.y))continue;const sx=isoX(p.x,p.y),sy=isoY(p.x,p.y)-p.z;
    g.fillStyle='rgba(0,0,0,.25)';ell(g,sx,isoY(p.x,p.y),5,2);
    if(p.kind==='arrow'||p.kind==='knife'){const a=Math.atan2(isoY(p.vx,p.vy),isoX(p.vx,p.vy));g.save();g.translate(sx,sy);g.rotate(a);
      if(p.kind==='arrow'){g.strokeStyle='#6a4520';g.lineWidth=2;ln(g,-16,0,4,0);g.fillStyle=p.c;poly(g,[4,-3,10,0,4,3]);g.fillStyle='#efe7d6';poly(g,[-16,0,-20,-3,-13,0]);poly(g,[-16,0,-20,3,-13,0])}
      else{g.rotate(G.t*25);g.fillStyle=p.c;poly(g,[-6,-1.5,6,0,-6,1.5],1)}g.restore()}
    else{const r=p.kind==='fire'?9:p.kind==='bolt'?6:7;g.fillStyle=p.c;g.shadowColor=p.c;g.shadowBlur=16;circ(g,sx,sy,r);g.shadowBlur=0;g.fillStyle='rgba(255,255,255,.85)';circ(g,sx,sy,r*.45)}}
  // beams
  for(const b of W.beams){const k=b.life/b.max;g.globalAlpha=k;g.strokeStyle=b.c;g.shadowColor=b.c;g.shadowBlur=14;g.lineWidth=b.jag?2.5:4;g.beginPath();
    b.pts.forEach((p,i)=>{const sx=isoX(p.x,p.y),sy=isoY(p.x,p.y)-p.z;if(!i){g.moveTo(sx,sy);return}const q=b.pts[i-1],qx=isoX(q.x,q.y),qy=isoY(q.x,q.y)-q.z;if(b.jag)for(let s=1;s<5;s++)g.lineTo(lerp(qx,sx,s/5)+rand(-7,7),lerp(qy,sy,s/5)+rand(-7,7));g.lineTo(sx,sy)});g.stroke();g.shadowBlur=0;g.globalAlpha=1}
  // particles
  for(const p of W.parts){if(p.ring||p.arc)continue;const k=p.life/p.max;g.globalAlpha=p.amb?Math.min(1,k*3)*Math.min(1,(1-k)*4):k;g.fillStyle=p.c;const sx=isoX(p.x,p.y),sy=isoY(p.x,p.y)-p.z;g.fillRect(sx-p.sz/2,sy-p.sz/2,p.sz,p.sz)}
  g.globalAlpha=1;
  // lighting
  setPx();const pc=worldToScreen(P.x,P.y,30);const dark={hellas:.32,egypt:.25,orient:.42,olympus:.12,north:.45,atlantis:.5,underworld:.62}[A.id]||.35;
  const lg=g.createRadialGradient(pc.x,pc.y,90*z,pc.x,pc.y,Math.max(Wd,Hd)*.72);lg.addColorStop(0,'rgba(0,0,0,0)');lg.addColorStop(1,`rgba(0,0,0,${dark})`);g.fillStyle=lg;g.fillRect(0,0,Wd,Hd);
  if(A.tint){g.fillStyle=A.tint;g.fillRect(0,0,Wd,Hd)}
  if(A.id==='atlantis'){g.globalAlpha=.06;g.fillStyle='#bff';for(let i=0;i<6;i++){const x=((i*263+G.t*20)%(Wd+200))-100;g.beginPath();g.moveTo(x,0);g.lineTo(x+60,0);g.lineTo(x-80,Hd);g.lineTo(x-160,Hd);g.fill()}g.globalAlpha=1}
  if(P.hurt>0){g.fillStyle=`rgba(200,30,20,${P.hurt})`;g.fillRect(0,0,Wd,Hd)}
  // texts & labels (screen px)
  g.textAlign='center';
  for(const t of W.texts){const s=worldToScreen(t.x,t.y,t.z);g.globalAlpha=Math.min(1,t.life*2);g.font=(t.big?'700 22px ':'700 15px ')+'"Fira Sans",sans-serif';g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.8)';g.strokeText(t.t,s.x,s.y);g.fillStyle=t.c;g.fillText(t.t,s.x,s.y)}
  g.globalAlpha=1;G.labels=[];
  g.font='600 12px "Fira Sans",sans-serif';
  const placed=[];
  for(const l of W.loot){if(l.type!=='item')continue;if(l.item.rar<1&&!keys.AltLeft&&!keys.AltRight&&!S.labels)continue;if(!onScreen(l.x,l.y,0))continue;
    const s=worldToScreen(l.x,l.y,22);let y=s.y;const w=g.measureText(l.item.name).width+12;
    for(const p of placed)if(Math.abs(p.x-s.x)<(p.w+w)/2&&Math.abs(p.y-y)<17)y=p.y-18;placed.push({x:s.x,y,w});
    g.fillStyle='rgba(10,7,5,.82)';g.fillRect(s.x-w/2,y-13,w,17);g.strokeStyle=rgba(RAR[l.item.rar].c,.6);g.lineWidth=1;g.strokeRect(s.x-w/2+.5,y-12.5,w-1,16);
    g.fillStyle=RAR[l.item.rar].c;g.fillText(l.item.name,s.x,y);G.labels.push({l,x0:s.x-w/2,x1:s.x+w/2,y0:y-13,y1:y+4})}
  g.font='700 13px Philosopher,serif';
  for(const n of W.npcs){if(!onScreen(n.x,n.y))continue;const s=worldToScreen(n.x,n.y,92);g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.8)';g.strokeText(n.n,s.x,s.y);g.fillStyle='#f0c47a';g.fillText(n.n,s.x,s.y)}
  for(const w of W.wps){if(!onScreen(w.x,w.y)||Math.hypot(w.x-P.x,w.y-P.y)>6)continue;const s=worldToScreen(w.x,w.y,80);g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.8)';g.strokeText(w.name,s.x,s.y);g.fillStyle=w.on?'#9fe0ff':'#a0a0a0';g.fillText(w.name,s.x,s.y)}
  if(G.state==='play')updateHud();
  drawMini($('#mini'),false);
}
function drawPlayer(g){
  const L=heroLook();Object.assign(L,{walk:P.walk,moving:P.moving,atk:P.atk?Math.min(1,P.atk.t/P.atk.dur):-1,atkKind:P.atk?P.atk.kind:null,cast:P.castT>0?1:0,t:G.t,dead:G.state==='dead'?(P.deadT=(P.deadT||0)+.016):0,face:P.face});
  if(G.state!=='dead')P.deadT=0;
  g.fillStyle='rgba(0,0,0,.35)';ell(g,0,0,15,6.5);
  if(P.inv_t>0&&!P.dash&&Math.floor(G.t*20)%2)g.globalAlpha=.55;
  if(P.whirl){g.save();g.scale(1,1);L.atk=(G.t*3)%1;L.atkKind='melee'}
  drawHeroAt(g,L,1.05);if(P.whirl)g.restore();g.globalAlpha=1;
}
function drawPet(g,p){
  g.fillStyle='rgba(0,0,0,.25)';ell(g,0,0,13,5.5);g.globalAlpha=.78;if(p.flash>0)g.filter='brightness(2)';
  drawHeroAt(g,{C:{skin:'#bfefff',body:'#5aa8c8',trim:'#e8ffff',legs:'#3a88a8',head:'spartan',cape:'#7fd8f0'},wpn:'sword',shield:true,shieldCol:'#9fe8ff',walk:p.walk,moving:p.moving,atk:p.atkAnim>0?1-p.atkAnim:-1,atkKind:'melee',t:G.t,face:p.face},1);
  g.filter='none';g.globalAlpha=1;
  const w=24;g.fillStyle='rgba(0,0,0,.6)';g.fillRect(-w/2,-74,w,4);g.fillStyle='#5ac0e8';g.fillRect(-w/2,-74,w*p.hp/p.maxHp,4);
}
function drawPortal(g,p){g.save();for(let i=0;i<3;i++){g.strokeStyle=['#7ad8ff','#a87aff','#ffffff'][i];g.lineWidth=3;g.globalAlpha=.85;g.beginPath();g.ellipse(0,-34,26-i*5,40-i*7,0,p.t*2+i,p.t*2+i+Math.PI*1.4);g.stroke()}
  g.globalAlpha=.3;g.fillStyle='#7ad8ff';ell(g,0,-34,22,34);g.globalAlpha=.4;ell(g,0,0,30,12);g.globalAlpha=1;g.restore();
  if(Math.random()<.4)W.parts.push({x:p.x+rand(-.4,.4),y:p.y+rand(-.4,.4),z:rand(0,60),vx:0,vy:0,vz:30,life:.8,max:.8,c:'#bfefff',sz:3})}
function drawMini(m,big){
  if(!m||!MINI)return;const g=m.getContext('2d'),w=m.width,h=m.height,k=Math.min(w/(2*N),h/N)*.98;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,w,h);
  g.setTransform(k,k/2,-k,k/2,w/2,(h-N*k)/2);g.imageSmoothingEnabled=false;g.drawImage(MINI,0,0);
  const mk=(x,y,c,r)=>{g.fillStyle=c;g.beginPath();g.arc(x,y,r/k,0,Math.PI*2);g.fill()};
  for(const e of W.en){if(e.dead||!W.seen[tIdx(Math.floor(e.x),Math.floor(e.y))])continue;mk(e.x,e.y,e.boss?'#ff3a2a':e.named?'#ff8a2a':e.champ?'#ffd34d':'#c05040',e.boss?4.5:big?2.4:1.6)}
  for(const w2 of W.wps)if(W.seen[tIdx(Math.floor(w2.x),Math.floor(w2.y))])mk(w2.x,w2.y,w2.on?'#7ad8ff':'#7a8a9a',3);
  for(const n of W.npcs)mk(n.x,n.y,'#ffd34d',2.5);
  if(W.lair&&!W.lair.dead&&!q().lair)mk(W.lair.x,W.lair.y,'#ff8a2a',big?4:3);
  mk(W.bossPos.x,W.bossPos.y,W.boss&&!W.boss.dead?'rgba(255,60,40,.9)':'#7ad8ff',big?5:3.5);
  if(W.portal)mk(W.portal.x,W.portal.y,'#7ad8ff',4);
  g.strokeStyle='#fff';g.lineWidth=1.5/k;g.beginPath();g.arc(P.x,P.y,3/k,0,Math.PI*2);g.stroke();mk(P.x,P.y,'#fff',2);
}

/* ---------- menu background ---------- */
const embers=[];for(let i=0;i<80;i++)embers.push({x:Math.random(),y:Math.random(),s:rand(.5,2),v:rand(.01,.05)});
function renderMenuBg(t){
  setPx();const g=ctx;
  const gr=g.createLinearGradient(0,0,0,Hd);gr.addColorStop(0,'#1a120b');gr.addColorStop(.65,'#2e1c0e');gr.addColorStop(1,'#0d0907');g.fillStyle=gr;g.fillRect(0,0,Wd,Hd);
  const sg=g.createRadialGradient(Wd*.5,Hd*.78,10,Wd*.5,Hd*.78,Math.max(Wd,Hd)*.55);sg.addColorStop(0,'rgba(240,160,70,.35)');sg.addColorStop(1,'rgba(240,160,70,0)');g.fillStyle=sg;g.fillRect(0,0,Wd,Hd);
  g.fillStyle='#0b0806';const base=Hd*.86,cw=Math.min(Wd*.8,900),cx=Wd/2;
  for(let i=0;i<8;i++){const x=cx-cw/2+cw*(i+.5)/8,h=Hd*.36;if(i===5){g.fillRect(x-14,base-h*.45,28,h*.45);continue}g.fillRect(x-14,base-h,28,h);g.fillRect(x-20,base-h-10,40,10)}
  g.fillRect(0,base,Wd,Hd-base);g.fillRect(cx-cw/2,base-Hd*.36-24,cw,14);poly(g,[cx-cw/2,base-Hd*.36-24,cx+cw/2,base-Hd*.36-24,cx,base-Hd*.36-24-Hd*.12]);
  for(const e of embers){e.y-=e.v*.016;if(e.y<0){e.y=1;e.x=Math.random()}g.fillStyle=`rgba(255,${140+e.s*40|0},60,${.4+Math.sin(t/300+e.x*20)*.3})`;g.fillRect(e.x*Wd,e.y*Hd,e.s*2,e.s*2)}
}
