/* ============================ ART ============================ */
const OUT='rgba(16,10,6,.88)';
function ell(g,x,y,rx,ry){g.beginPath();g.ellipse(x,y,Math.abs(rx),Math.abs(ry),0,0,Math.PI*2);g.fill()}
function circ(g,x,y,r){g.beginPath();g.arc(x,y,Math.abs(r),0,Math.PI*2);g.fill()}
function ln(g,x1,y1,x2,y2){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()}
function poly(g,pts,stroke){g.beginPath();g.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.closePath();g.fill();if(stroke){g.strokeStyle=OUT;g.lineWidth=1.2;g.stroke()}}
function rr(g,x,y,w,h,r){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);g.fill()}
function oc(g,x,y,r,fill){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=fill;g.fill();g.strokeStyle=OUT;g.lineWidth=1.3;g.stroke()}
function oe(g,x,y,rx,ry,fill,rot=0){g.beginPath();g.ellipse(x,y,rx,ry,rot,0,Math.PI*2);g.fillStyle=fill;g.fill();g.strokeStyle=OUT;g.lineWidth=1.3;g.stroke()}
/* outlined limb with highlight */
function limb(g,x1,y1,x2,y2,w,col){g.lineCap='round';g.strokeStyle=OUT;g.lineWidth=w+2.4;ln(g,x1,y1,x2,y2);g.strokeStyle=col;g.lineWidth=w;ln(g,x1,y1,x2,y2);g.strokeStyle='rgba(255,255,255,.16)';g.lineWidth=w*.35;ln(g,x1-w*.15,y1-w*.15,x2-w*.15,y2-w*.15)}
const joint=(x,y,len,a)=>[x+Math.sin(a)*len,y+Math.cos(a)*len];
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

/* ---------- textures ---------- */
const TEX={};
function makeTex(A){
  const mk=(draw)=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');draw(g);const p=ctx.createPattern(c,'repeat');
    try{p.setTransform(new DOMMatrix().scale(1/64))}catch(e){}return p};
  const rng=mulberry(ACTS.indexOf(A)*77+5);
  const wrapBlob=(g,x,y,rx,ry,col,a)=>{g.globalAlpha=a;g.fillStyle=col;for(const ox of[-256,0,256])for(const oy of[-256,0,256]){g.beginPath();g.ellipse(x+ox,y+oy,rx,ry,0,0,Math.PI*2);g.fill()}g.globalAlpha=1};
  TEX.ground=mk(g=>{g.fillStyle=A.g[0];g.fillRect(0,0,256,256);
    for(let i=0;i<55;i++)wrapBlob(g,rng()*256,rng()*256,10+rng()*40,8+rng()*30,i%2?A.g[1]:A.g[2],.22+rng()*.25);
    for(let i=0;i<900;i++){g.fillStyle=rng()<.5?shade(A.g[0],-28):shade(A.g[0],22);g.globalAlpha=.35;g.fillRect(rng()*256,rng()*256,rng()*3+1,rng()*2+1)}
    if(['flower','grass'].includes(A.decal)){g.globalAlpha=.5;g.strokeStyle=shade(A.g[0],-35);g.lineWidth=1.2;for(let i=0;i<260;i++){const x=rng()*256,y=rng()*256;ln(g,x,y,x+rng()*3-1.5,y-3-rng()*4)}}
    g.globalAlpha=1});
  TEX.road=mk(g=>{g.fillStyle=A.road[0];g.fillRect(0,0,256,256);
    for(let i=0;i<120;i++){const x=rng()*256,y=rng()*256,r=5+rng()*9;g.fillStyle=rng()<.5?A.road[1]:shade(A.road[0],10);g.globalAlpha=.75;g.beginPath();g.ellipse(x,y,r,r*.75,rng()*3,0,Math.PI*2);g.fill();g.globalAlpha=.4;g.strokeStyle=shade(A.road[1],-35);g.lineWidth=1.2;g.stroke()}
    g.globalAlpha=.3;for(let i=0;i<600;i++){g.fillStyle=shade(A.road[0],-30);g.fillRect(rng()*256,rng()*256,2,2)}g.globalAlpha=1});
  TEX.pave=mk(g=>{for(let r=0;r<8;r++)for(let c=0;c<8;c++){const off=(r%2)*16;g.fillStyle=shade(rng()<.5?A.pave[0]:A.pave[1],Math.floor(rng()*14-7));g.fillRect(c*32+off,r*32,32,32);g.fillRect(c*32+off-256,r*32,32,32)}
    g.strokeStyle=shade(A.pave[1],-40);g.globalAlpha=.55;g.lineWidth=2;for(let r=0;r<=8;r++){ln(g,0,r*32,256,r*32);for(let c=0;c<=8;c++){const off=(r%2)*16;ln(g,c*32+off,r*32,c*32+off,r*32+32)}}
    g.globalAlpha=.25;for(let i=0;i<400;i++){g.fillStyle='#000';g.fillRect(rng()*256,rng()*256,1.5,1.5)}g.globalAlpha=1});
}

/* ---------- headgear (v1 coords: head center (1,-38)) ---------- */
function drawHeadgear(g,C,t){
  switch(C.head){
    case'laurel':g.fillStyle='#3a2516';g.beginPath();g.arc(1,-39,7.2,Math.PI*.95,Math.PI*2.05);g.fill();g.strokeStyle='#5a9a34';g.lineWidth=2.4;g.beginPath();g.arc(1,-38,8,Math.PI*.85,Math.PI*2.15);g.stroke();g.fillStyle='#7ac04a';for(let i=0;i<6;i++){const a=Math.PI*(.9+i*.22);ell(g,1+Math.cos(a)*8,-38+Math.sin(a)*8,2.2,1.2)}break;
    case'ninja':g.fillStyle=C.body;circ(g,1,-38,7.6);g.fillStyle=C.skin;g.fillRect(1,-40,7,3);g.fillStyle='#111';g.fillRect(4,-39.5,1.5,1.5);g.fillStyle=C.trim;g.fillRect(-7,-44,15,2.5);
      g.strokeStyle=C.trim;g.lineWidth=2;g.beginPath();g.moveTo(-6,-43);g.quadraticCurveTo(-12,-44+Math.sin(t*9)*2,-19,-40+Math.sin(t*9+1)*3);g.stroke();g.beginPath();g.moveTo(-6,-42);g.quadraticCurveTo(-11,-38,-17,-34+Math.sin(t*9+2)*3);g.stroke();break;
    case'kabuto':g.fillStyle='#2a1616';g.beginPath();g.arc(1,-38,8.5,Math.PI,0);g.fill();g.fillRect(-9,-39,20,3);g.fillStyle=C.body;g.fillRect(-9,-37,4,6);g.strokeStyle=C.trim;g.lineWidth=2.2;g.beginPath();g.moveTo(1,-45);g.quadraticCurveTo(-6,-48,-7,-55);g.moveTo(1,-45);g.quadraticCurveTo(8,-48,9,-55);g.stroke();g.fillStyle='#7a1f1f';g.fillRect(2,-35,7,3);break;
    case'spartan':g.fillStyle='#c0903a';circ(g,1,-38,8.3);g.fillStyle='#e0b860';g.beginPath();g.arc(1,-38,8.3,Math.PI*1.1,Math.PI*1.6);g.lineTo(1,-38);g.fill();g.fillStyle='#1a1208';g.fillRect(3,-40,6,2.2);g.fillRect(5,-40,2,7);g.fillStyle='#a3241c';g.beginPath();g.ellipse(-1,-47,11,4.5,0,Math.PI,0);g.fill();g.strokeStyle='#6a140e';g.lineWidth=1;for(let i=-9;i<9;i+=2.5)ln(g,i,-47,i,-50.5);break;
    case'nemes':g.fillStyle=C.trim;poly(g,[-7,-46,8,-46,11,-29,-11,-29]);g.fillStyle='#e8c860';for(let i=0;i<4;i++)g.fillRect(-10+i*0.6,-44+i*4,20-i*1.2,1.8);g.fillStyle=C.skin;circ(g,3,-37,5.2);g.fillStyle='#ffd34d';circ(g,7,-44,1.8);g.fillStyle='#1a1a1a';g.fillRect(5,-38,3,1);break;
    case'horns':g.fillStyle='#8a929a';g.beginPath();g.arc(1,-39,8,Math.PI,0);g.fill();g.fillStyle='#efe7d6';poly(g,[-6,-42,-15,-53,-12,-43],1);poly(g,[8,-42,17,-53,14,-43],1);g.fillStyle='#d8742a';poly(g,[0,-36,9,-36,6,-26,1,-29]);break;
    case'tricorn':g.fillStyle='#16161c';poly(g,[-12,-41,13,-41,8,-48,-7,-48]);g.fillRect(-6,-50,13,4);g.fillStyle='#efe7d6';circ(g,1,-45,1.6);g.strokeStyle='#111';g.lineWidth=1.5;ln(g,-6,-41,8,-35);g.fillStyle='#111';circ(g,5,-38,1.8);break;
    case'hood':g.fillStyle=C.body;circ(g,0,-38,9.5);poly(g,[-9,-38,-11,-27,0,-30]);g.fillStyle='#08060a';circ(g,3,-37,5.5);g.fillStyle=C.trim;g.shadowColor=C.trim;g.shadowBlur=8;circ(g,2,-38,1.3);circ(g,6,-38,1.3);g.shadowBlur=0;break;
    case'visor':g.fillStyle='#7d8a96';circ(g,1,-38,7.5);g.fillStyle=C.trim;g.shadowColor=C.trim;g.shadowBlur=10;g.fillRect(-1,-40,10,3);g.shadowBlur=0;g.strokeStyle='#9aa8b4';g.lineWidth=1.2;ln(g,-4,-44,-6,-50);g.fillStyle='#ff4a4a';circ(g,-6,-50,1.5);break;
    case'gladiator':g.fillStyle='#9a9aa0';g.beginPath();g.arc(1,-38,8.5,Math.PI,0);g.fill();g.fillRect(-8,-38,18,4);g.strokeStyle='#5a5a60';g.lineWidth=1;for(let i=-5;i<10;i+=3)ln(g,i,-37,i,-31);g.fillStyle='#c0392b';poly(g,[-6,-46,8,-46,4,-53,-3,-53]);break;
    case'phoenix':for(let i=0;i<5;i++){g.fillStyle=i%2?'#ffd34d':'#ff7a1a';const h=8+Math.sin(t*12+i*1.7)*3;poly(g,[-6+i*3,-43,-4.5+i*3,-43-h,-3+i*3,-43])}g.fillStyle='#ffd34d';g.fillRect(-6,-44,15,2);break;
    case'olympian':g.fillStyle='#e8c040';g.beginPath();g.arc(1,-39,8.4,Math.PI,0);g.fill();g.fillRect(-8,-39,4,8);g.fillStyle='#fffaf0';g.beginPath();g.ellipse(-1,-48,9,4,-.2,Math.PI,0);g.fill();g.strokeStyle='#ffe58a';g.lineWidth=1.5;g.globalAlpha=.6+Math.sin(t*3)*.3;g.beginPath();g.arc(1,-40,13,0,Math.PI*2);g.stroke();g.globalAlpha=1;break;
  }
}

/* ---------- weapons (drawn along +x from hand) ---------- */
function drawWeapon(g,type,rar,t){
  const glow=rar>=3?RAR[rar].c:null;
  if(glow){g.shadowColor=glow;g.shadowBlur=10}
  switch(type){
    case'sword':g.fillStyle='#dfe4ec';poly(g,[4,-2,30,-1.6,34,0,30,1.6,4,2],1);g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=.8;ln(g,6,-.5,30,-.5);g.fillStyle='#c8963a';rr(g,1.5,-6,3,12,1);g.fillStyle='#5a3a1e';rr(g,-5,-1.6,7,3.2,1);oc(g,-5.5,0,2,'#c8963a');break;
    case'axe':g.fillStyle='#6a4520';rr(g,-6,-1.8,32,3.6,1.5);g.fillStyle='#cfd5dd';g.beginPath();g.moveTo(20,-1.5);g.quadraticCurveTo(26,-13,32,-11);g.quadraticCurveTo(29,0,32,11);g.quadraticCurveTo(26,13,20,1.5);g.closePath();g.fill();g.strokeStyle=OUT;g.lineWidth=1.2;g.stroke();break;
    case'mace':g.fillStyle='#6a4520';rr(g,-5,-1.8,26,3.6,1.5);oc(g,24,0,6,'#a8acb4');g.fillStyle='#d8dce4';for(let i=0;i<6;i++){const a=i/6*Math.PI*2;poly(g,[24+Math.cos(a)*5,Math.sin(a)*5,24+Math.cos(a+.25)*9,Math.sin(a+.25)*9,24+Math.cos(a+.5)*5,Math.sin(a+.5)*5])}break;
    case'club':g.fillStyle='#7a5a30';poly(g,[-4,-2,26,-5,30,0,26,5,-4,2],1);g.fillStyle='#5a3a1a';circ(g,14,-2,1.2);circ(g,22,2,1.2);break;
    case'spear':g.fillStyle='#7a5228';rr(g,-14,-1.4,46,2.8,1.2);g.fillStyle='#d8dde6';poly(g,[31,-3.5,42,0,31,3.5,29,0],1);g.fillStyle='#c8963a';g.fillRect(28,-2,2,4);break;
    case'bow':g.strokeStyle=OUT;g.lineWidth=4.2;g.beginPath();g.arc(-6,0,17,-1.15,1.15);g.stroke();g.strokeStyle='#8a5a28';g.lineWidth=2.6;g.beginPath();g.arc(-6,0,17,-1.15,1.15);g.stroke();
      g.strokeStyle='#efe7d6';g.lineWidth=.9;const ex=-6+17*Math.cos(1.15),ey=17*Math.sin(1.15);g.beginPath();g.moveTo(ex,-ey);g.lineTo(-6-(t||0)*9,0);g.lineTo(ex,ey);g.stroke();
      if(t>0){g.strokeStyle='#d8c8a0';g.lineWidth=1.4;ln(g,-6-t*9,0,16,0);g.fillStyle='#ccd';poly(g,[16,-2,21,0,16,2])}break;
    case'staff':g.fillStyle='#6a4520';rr(g,-18,-1.6,48,3.2,1.5);g.fillStyle='#c8963a';g.fillRect(26,-2.5,3,5);
      {const c=glow||'#8fd0ff';g.shadowColor=c;g.shadowBlur=14;oc(g,33,0,4.6+Math.sin((G.t||0)*6)*.6,c);g.fillStyle='rgba(255,255,255,.8)';circ(g,32,-1.5,1.5)}break;
    case'none':break;
  }
  g.shadowBlur=0;
}
function drawShield(g,rar,col){g.save();oe(g,0,0,9,11,'#7a4a1e');g.fillStyle=col||'#c8963a';ell(g,0,0,7,8.8);g.strokeStyle='#5a3414';g.lineWidth=1;g.beginPath();g.ellipse(0,0,4.5,5.6,0,0,Math.PI*2);g.stroke();g.fillStyle=rar>=3?RAR[rar].c:'#5a3414';circ(g,0,0,2);g.restore()}

/* ---------- humanoid rig ---------- */
/* o: {C (colors/head), wpn, rar, shield, walk, moving, atk(0..1 or -1), atkKind, cast, dead(0..1), t, feats} */
function drawHumanoid(g,o){
  const C=o.C,t=o.t||0,p=o.walk||0,mv=o.moving?1:0,F=o.feats||{};
  const bob=mv?Math.abs(Math.sin(p))*1.6:Math.sin(t*2.2)*.6;
  g.save();
  if(o.dead>0){const d=ease(Math.min(1,o.dead*2.2));g.rotate(-d*Math.PI/2*.95);g.translate(0,-d*4)}
  // cape
  if(C.cape){g.fillStyle=C.cape;const fl=Math.sin(t*5)*2.5-(mv?6:0);g.beginPath();g.moveTo(-6,-46+bob);g.lineTo(5,-46+bob);g.quadraticCurveTo(-4,-28,-8+fl*.5,-14);g.lineTo(-17+fl,-17);g.closePath();g.fill();g.strokeStyle=OUT;g.lineWidth=1.2;g.stroke();
    if(C.head==='phoenix'){g.fillStyle='#ffd34d';poly(g,[-13+fl,-17,-21+fl,-24+Math.sin(t*12)*3,-10,-22])}}
  // legs
  const hipY=-26+bob,legC=C.legs||shade(C.body,-40),la=mv?Math.sin(p)*.62:.08,kb=a=>mv?Math.max(0,Math.sin(a))*.7:.05;
  const leg=(a,back)=>{const[kx,ky]=joint(0,hipY,13,a);const[fx,fy]=joint(kx,ky,13,a-kb(back?p+Math.PI:p));const col=back?shade(legC,-22):legC;limb(g,0,hipY,kx,ky,6,col);limb(g,kx,ky,fx,fy,5,col);
    g.fillStyle=F.hoof?'#2a1a10':shade(legC,-30);ell(g,fx+2,fy+.5,4.2,2.2)};
  leg(-la,true);
  // back arm
  const shX=1,shY=-44+bob;let ba=mv?-Math.sin(p)*.5:.12,bel=.35;
  if(o.atkKind==='bow'&&o.atk>=0){ba=1.45;bel=-1.6}
  if(o.cast>0){ba=2.4;bel=.2}
  {const[ex,ey]=joint(shX-2,shY,11,ba);const[hx,hy]=joint(ex,ey,10,ba+bel);limb(g,shX-2,shY,ex,ey,5,shade(C.skin,-25));limb(g,ex,ey,hx,hy,4.5,shade(C.skin,-25))}
  // torso
  g.fillStyle=C.body;g.beginPath();g.moveTo(-9,shY-1);g.quadraticCurveTo(1,shY-4,11,shY-1);g.lineTo(8,hipY-1);g.lineTo(-7,hipY-1);g.closePath();g.fill();g.strokeStyle=OUT;g.lineWidth=1.4;g.stroke();
  g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.moveTo(-9,shY-1);g.lineTo(-2,shY-1);g.lineTo(-1,hipY-1);g.lineTo(-7,hipY-1);g.closePath();g.fill();
  g.fillStyle='rgba(255,255,255,.12)';ell(g,5,shY+6,3.5,5);
  if(F.wrap){g.strokeStyle='rgba(120,100,70,.7)';g.lineWidth=1;for(let i=0;i<5;i++)ln(g,-8,shY+2+i*3.6,9,shY+4+i*3.6)}
  if(F.bones){g.strokeStyle='#6a6458';g.lineWidth=1.5;for(let i=0;i<4;i++)ln(g,-5,shY+4+i*3.5,7,shY+4+i*3.5);ln(g,1,shY+2,1,hipY)}
  if(F.gold){g.fillStyle='#e8c050';g.fillRect(-8,shY,18,3)}
  if(C.head==='gladiator'){g.strokeStyle='#d0d0d0';g.lineWidth=1;for(let i=-6;i<9;i+=4)ln(g,i,shY+1,i-4,hipY)}
  if(C.head==='visor'){g.fillStyle=C.trim;g.globalAlpha=.6+Math.sin(t*5)*.3;circ(g,3,shY+8,2.5);g.globalAlpha=1}
  if(C.head==='ninja'){g.strokeStyle=C.trim;g.lineWidth=2;ln(g,-8,shY+1,9,hipY+2)}
  // belt + skirt (pteruges)
  g.fillStyle=C.trim;g.fillRect(-7.5,hipY-3,16,3);
  if(!F.noSkirt){for(let i=0;i<5;i++){g.fillStyle=i%2?shade(C.body,-25):C.trim;rr(g,-7+i*3.2,hipY,3,8+(i%2),1)}}
  // front leg
  leg(la,false);
  // shoulder pad
  if(C.pad!==false&&!F.bones&&!F.wrap){oe(g,3,shY+1,5,3.5,C.trim)}
  // head
  const hx=2,hy=shY-9;
  g.save();g.translate(hx-1,hy+38);
  if(F.skull){oc(g,1,-38,7,'#ece6d4');g.fillStyle='#111';circ(g,4,-39,1.8);g.fillRect(2,-34,6,1.5)}
  else if(F.ears){g.fillStyle=C.skin;poly(g,[-3,-43,-4,-55,1,-44],1);poly(g,[2,-44,5,-55,6,-42],1);oc(g,1,-38,7,C.skin);g.fillStyle=C.skin;poly(g,[5,-40,15,-36,5,-33],1);g.fillStyle='#ffd34d';circ(g,4,-40,1.3)}
  else{oc(g,1,-38,7.2,C.skin);g.fillStyle='#1a120c';circ(g,5.2,-39,1.1);g.fillStyle=shade(C.skin,-30);poly(g,[7.5,-38,9.5,-35.5,7,-35.5])}
  if(F.horns){g.fillStyle='#e8dcc0';poly(g,[-3,-43,-8,-52,-1,-44],1);poly(g,[4,-43,8,-52,6,-43],1)}
  if(F.eye){g.fillStyle='#fff';circ(g,3,-39,3.2);g.fillStyle='#c0392b';circ(g,4,-39,1.7)}
  if(F.helmet){g.fillStyle=F.helmet;g.beginPath();g.arc(1,-39,8,Math.PI,0);g.fill();g.fillRect(-7,-39,4,6);g.strokeStyle=OUT;g.lineWidth=1.2;g.beginPath();g.arc(1,-39,8,Math.PI,0);g.stroke()}
  if(F.beard){g.fillStyle=F.beard;poly(g,[-1,-35,9,-35,6,-25,1,-28],1)}
  if(F.crown){g.fillStyle='#d8f0ff';poly(g,[-6,-45,-4,-52,-1,-46,2,-53,5,-46,8,-51,9,-45])}
  if(F.fins){g.fillStyle=shade(C.skin,-20);poly(g,[-6,-42,-12,-48,-7,-36],1)}
  if(F.hair){g.fillStyle=F.hair;g.beginPath();g.arc(1,-40,7.6,Math.PI*.9,Math.PI*2.1);g.fill();poly(g,[-6,-40,-10,-26,-2,-34])}
  if(F.snakes){g.strokeStyle='#6a4a9a';g.lineWidth=2.6;for(let i=0;i<5;i++){g.beginPath();g.moveTo(-6+i*3,-44);g.quadraticCurveTo(-10+i*5+Math.sin(t*4+i)*4,-54,-4+i*5,-60+Math.sin(t*5+i)*3);g.stroke()}}
  if(F.glow){g.fillStyle=F.glow;g.shadowColor=F.glow;g.shadowBlur=8;circ(g,5,-39,1.4);g.shadowBlur=0}
  if(C.head)drawHeadgear(g,C,t);
  g.restore();
  // shield
  if(o.shield){g.save();g.translate(-3,shY+10);drawShield(g,o.shieldRar||0,o.shieldCol);g.restore()}
  // front arm + weapon
  let fa,fel,wa;
  const a=o.atk;
  if(a>=0&&o.atkKind==='melee'){const k=a<.35?ease(a/.35):a<.62?1:1-ease((a-.62)/.38);const s=a<.35?-2.4*ease(a/.35):a<.62?lerp(-2.4,1.25,ease((a-.35)/.27)):lerp(1.25,.35,ease((a-.62)/.38));fa=s;fel=.25;wa=fa+fel+1.2;void k}
  else if(a>=0&&o.atkKind==='thrust'){const s=a<.4?-.2:a<.6?1.55:lerp(1.55,.4,(a-.6)/.4);fa=s;fel=.05;wa=fa+fel}
  else if(a>=0&&o.atkKind==='bow'){fa=1.55;fel=0;wa=Math.PI/2+.0}
  else if(o.cast>0||(a>=0&&o.atkKind==='cast')){fa=2.3;fel=.1;wa=fa+fel-1.6}
  else{fa=mv?Math.sin(p)*.45+.2:.35+Math.sin(t*2.2)*.03;fel=.6;wa=fa+fel+.9}
  const[ex,ey]=joint(shX+1,shY+1,11,fa);const[hx2,hy2]=joint(ex,ey,10,fa+fel);
  limb(g,shX+1,shY+1,ex,ey,5,C.skin);limb(g,ex,ey,hx2,hy2,4.5,C.skin);
  if(o.wpn&&o.wpn!=='none'){g.save();g.translate(hx2,hy2);g.rotate(Math.PI/2-wa);drawWeapon(g,o.wpn,o.rar||0,o.atkKind==='bow'&&a>=0?Math.sin(Math.min(1,a*1.6)*Math.PI/2):0);g.restore()}
  oc(g,hx2,hy2,2.6,C.skin);
  g.restore();
}

/* ---------- monsters ---------- */
function drawBeast(g,e,T,col){
  const t=G.t,p=e.walk,mv=e.moving?1:0,lunge=(e.atkAnim>0?Math.sin((1-e.atkAnim)*Math.PI)*8:0);
  g.save();if(e.deadT>0){const d=ease(Math.min(1,e.deadT*2));g.translate(0,-4*d);g.scale(1,1-d*.35);g.rotate(d*.25)}
  g.translate(lunge,0);
  const leg=(x,ph,back)=>{const a=mv?Math.sin(p+ph)*.55:0,c=back?shade(T.c,-35):shade(T.c,-15);const[kx,ky]=joint(x,-16,7,a);const[fx,fy]=joint(kx,ky,8,a-(mv?Math.max(0,Math.sin(p+ph))*.6:0));limb(g,x,-16,kx,ky,T.croc?5:4.5,c);limb(g,kx,ky,fx,fy,3.6,c);g.fillStyle='#1a120c';ell(g,fx+1.5,fy,2.6,1.4)};
  leg(-11,Math.PI,true);leg(10,0,true);
  // tail
  g.strokeStyle=OUT;g.lineWidth=T.croc?8:5;g.lineCap='round';const tw=Math.sin(t*5+p)*4;g.beginPath();g.moveTo(-15,-20);g.quadraticCurveTo(-26,-24+tw,-32,T.croc?-12:-30+tw);g.stroke();g.strokeStyle=col;g.lineWidth=T.croc?6:3;g.stroke();
  // body
  const bl=T.croc?22:17;oe(g,0,-21,bl,T.croc?7:9.5,col);
  g.fillStyle='rgba(255,255,255,.1)';ell(g,0,-17,bl*.8,3.5);g.fillStyle='rgba(0,0,0,.18)';ell(g,-2,-26,bl*.8,3);
  if(T.stripes){g.strokeStyle='#2a1508';g.lineWidth=2.2;for(let i=-12;i<14;i+=5)ln(g,i,-30,i-2,-21)}
  if(T.croc){g.fillStyle=shade(T.c,25);for(let i=-18;i<18;i+=5)poly(g,[i,-27,i+2,-32,i+4,-27])}
  if(T.mane){g.fillStyle=T.mane;poly(g,[6,-31,18,-30,16,-16,8,-14],1)}
  if(T.fire){g.fillStyle='rgba(255,120,30,.75)';for(let i=-12;i<12;i+=5)poly(g,[i,-29,i+2,-35-Math.sin(t*12+i)*3,i+4,-29])}
  leg(-8,Math.PI*.9,false);leg(12,.1,false);
  // heads
  const heads=T.heads?[[18,-26,0],[13,-35,-.3],[22,-16,.2]]:[[18,-26,0]];
  for(const[hx,hy,rot]of heads){g.save();g.translate(hx,hy-(e.atkAnim>0?-3:0));g.rotate(rot+(e.atkAnim>0?.25:0));
    if(T.croc){oe(g,6,0,12,5,col);g.fillStyle='#fff';for(let i=0;i<5;i++)poly(g,[2+i*4,3,3.5+i*4,6,5+i*4,3]);g.fillStyle='#ffe030';circ(g,0,-3,1.8)}
    else{g.fillStyle=shade(T.c,-15);poly(g,[-3,-6,-1,-13,3,-7],1);oe(g,0,0,7.5,6.5,col);oe(g,7,2,6,3.8,shade(T.c,8));g.fillStyle='#111';circ(g,12,1,1.4);
      g.fillStyle=T.fire?'#ffb030':e.boss?'#ff4a2a':'#111';if(T.fire||e.boss){g.shadowColor=g.fillStyle;g.shadowBlur=8}circ(g,2.5,-1.5,1.6);g.shadowBlur=0;
      if(T.tusk){g.fillStyle='#efe7d6';poly(g,[9,4,15,-2,11,5],1)}
      if(e.atkAnim>0){g.fillStyle='#4a0a0a';poly(g,[6,5,13,4,8,8])}}
    g.restore()}
  g.restore();
}
function drawFlyer(g,e,T,col){
  const t=G.t,fl=Math.sin(t*13+e.walk)*.9;
  g.save();if(e.deadT>0){g.rotate(ease(Math.min(1,e.deadT*2))*1.3)}
  const wing=(dir,back)=>{g.save();g.translate(-1,-14);g.rotate(dir*(.3+fl*.6)-(back?.25:0));g.fillStyle=back?shade(T.c,-35):shade(T.c,-12);
    g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-14,-22,-26,-18);g.lineTo(-20,-12);g.lineTo(-24,-6);g.lineTo(-16,-4);g.lineTo(-18,1);g.closePath();g.fill();g.strokeStyle=OUT;g.lineWidth=1.2;g.stroke();g.restore()};
  wing(-1,true);
  // talons
  g.strokeStyle='#4a3020';g.lineWidth=2;ln(g,-2,-4,-4,3);ln(g,3,-4,3,3);
  oe(g,0,-12,7,10,col);g.fillStyle='rgba(255,255,255,.14)';ell(g,2,-14,3,6);
  wing(1,false);
  // head
  oc(g,2,-26,6,T.h||shade(T.c,40));if(T.hair){g.fillStyle=T.hair;g.beginPath();g.arc(2,-27,6.5,Math.PI*.85,Math.PI*2.1);g.fill();poly(g,[-4,-28,-9,-16,0,-22])}
  g.fillStyle='#1a0a0a';circ(g,5,-27,1.2);if(e.atkAnim>0){g.fillStyle=T.pc||'#fff';g.shadowColor=T.pc;g.shadowBlur=10;circ(g,10,-24,3);g.shadowBlur=0}
  g.restore();
}
function drawInsect(g,e,T,col){
  const t=G.t,p=e.walk,mv=e.moving?1:0;
  g.save();if(e.deadT>0){g.scale(1,1-ease(Math.min(1,e.deadT*2))*.5)}
  const legs=(back)=>{for(let i=0;i<3;i++){const x=-9+i*8,a=mv?Math.sin(p*1.5+i*2+(back?Math.PI:0))*.4:0;g.strokeStyle=OUT;g.lineWidth=3.2;const k1=[x-4+a*6,-15],f1=[x-8+a*8,-1];g.beginPath();g.moveTo(x,-10);g.lineTo(...k1);g.lineTo(...f1);g.stroke();g.strokeStyle=back?shade(T.c,-40):shade(T.c,-20);g.lineWidth=1.8;g.stroke();
    const k2=[x+5+a*6,-15],f2=[x+9+a*8,-1];g.strokeStyle=OUT;g.lineWidth=3.2;g.beginPath();g.moveTo(x,-10);g.lineTo(...k2);g.lineTo(...f2);g.stroke();g.strokeStyle=back?shade(T.c,-40):shade(T.c,-20);g.lineWidth=1.8;g.stroke()}};
  legs(true);
  if(T.tail){const sw=Math.sin(t*3)*2+(e.atkAnim>0?Math.sin((1-e.atkAnim)*Math.PI)*-8:0);let px=-12,py=-12;for(let i=0;i<5;i++){const a=-2.1+i*.55;const nx=px+Math.cos(a)*6,ny=py+Math.sin(a)*6+sw*(i/5);oc(g,nx,ny,4.2-i*.3,i%2?col:shade(T.c,-12));px=nx;py=ny}g.fillStyle='#2a1a0a';poly(g,[px,py-2,px+7,py+2,px,py+3],1)}
  if(T.claws){oe(g,0,-12,15,8,col);g.fillStyle='rgba(255,255,255,.15)';ell(g,-2,-15,10,3)}else{oe(g,-6,-11,9,6,shade(T.c,-10));oe(g,6,-12,8,6.5,col)}
  // pincers
  const op=e.atkAnim>0?.6:.15+Math.sin(t*3)*.08;
  for(const[yy,s]of[[-14,1],[-7,.85]]){g.save();g.translate(13,yy);g.scale(s,s);g.fillStyle=shade(T.c,-8);poly(g,[0,0,8,-2,12,-6,16,-4-op*4,11,0,16,4+op*4,12,6,8,2],1);g.restore()}
  if(T.claws){g.strokeStyle=OUT;g.lineWidth=1.5;ln(g,8,-18,9,-25);ln(g,4,-18,4,-25);g.fillStyle='#111';circ(g,9,-25,1.8);circ(g,4,-25,1.8)}else{g.fillStyle='#111';circ(g,11,-14,1.3)}
  legs(false);
  g.restore();
}
function drawGhost(g,e,T,col){
  const t=G.t;g.save();g.globalAlpha*=e.deadT>0?Math.max(0,1-e.deadT*1.5):.88;
  const grd=g.createLinearGradient(0,-36,0,0);grd.addColorStop(0,col);grd.addColorStop(1,rgba(T.c,0));g.fillStyle=grd;g.shadowColor=T.c;g.shadowBlur=14;
  g.beginPath();g.arc(0,-24,10,Math.PI,0);for(let i=0;i<=5;i++)g.lineTo(10-i*4+Math.sin(t*7+i)*2-(i*1.5),-8+(i%2?-5:0)+Math.sin(t*6+i)*2);g.closePath();g.fill();g.shadowBlur=0;
  if(T.fox){g.fillStyle=col;poly(g,[-6,-31,-4,-40,0,-32]);poly(g,[3,-32,7,-40,8,-30]);g.strokeStyle=col;g.lineWidth=3;g.globalAlpha*=.6;for(let i=0;i<3;i++){g.beginPath();g.moveTo(-6,-14);g.quadraticCurveTo(-18,-20+i*6+Math.sin(t*4+i)*3,-24,-28+i*8);g.stroke()}g.globalAlpha/=.6;g.fillStyle='#fff';poly(g,[8,-26,14,-23,8,-21])}
  g.fillStyle='#fff';g.shadowColor='#fff';g.shadowBlur=6;ell(g,-1,-25,1.8,2.4);ell(g,5,-25,1.8,2.4);g.shadowBlur=0;
  g.restore();
}
function drawGolem(g,e,T,col){
  const t=G.t,p=e.walk,mv=e.moving?1:0,sw=mv?Math.sin(p)*3:0,arm=e.atkAnim>0?Math.sin((1-e.atkAnim)*Math.PI)*-1.6:0;
  g.save();if(e.deadT>0){const d=ease(Math.min(1,e.deadT*2));g.rotate(-d*1.2);g.globalAlpha*=1-Math.max(0,e.deadT-1.2)}
  const blk=(x,y,w,h,c)=>{g.fillStyle=c;rr(g,x,y,w,h,2.5);g.strokeStyle=OUT;g.lineWidth=1.3;g.stroke()};
  blk(-10+sw,-14,8,14,shade(T.c,-30));blk(2-sw,-14,8,14,shade(T.c,-20));
  g.save();g.translate(-10,-36);g.rotate(-arm*.4);blk(-5,0,8,20,shade(T.c,-28));g.restore();
  blk(-13,-40,26,26,col);g.fillStyle='rgba(255,255,255,.14)';g.fillRect(-11,-38,10,22);
  g.strokeStyle=T.glow||'#ffd060';g.globalAlpha*=.7+Math.sin(t*4)*.3;g.lineWidth=1.5;g.beginPath();g.moveTo(-6,-34);g.lineTo(-1,-27);g.lineTo(-4,-20);g.moveTo(5,-36);g.lineTo(8,-28);g.stroke();g.globalAlpha=1;
  blk(-6,-50,13,11,col);g.fillStyle=T.glow||'#ffd060';g.shadowColor=g.fillStyle;g.shadowBlur=10;g.fillRect(1,-46,5,2.6);g.shadowBlur=0;
  g.save();g.translate(10,-36);g.rotate(arm);blk(-3,0,9,21,shade(T.c,-8));g.restore();
  g.restore();
}
function drawSerpent(g,e,T,col){
  const t=G.t;g.save();if(e.deadT>0){g.globalAlpha*=Math.max(0,1-e.deadT*.6)}
  for(let i=12;i>=0;i--){const xx=-i*5.5,yy=-6-Math.sin(t*4+i*.6)*3.2;oc(g,xx,yy,Math.max(3,10-i*.55),i%2?col:shade(T.c,-14))}
  if(T.sea){g.save();g.translate(4,-14);oe(g,0,-8,8,14,col);g.fillStyle=shade(T.c,30);for(let i=0;i<4;i++)poly(g,[-6,-16+i*6,-14,-12+i*6,-6,-10+i*6]);
    g.translate(4,-24);oe(g,6,0,14,7,col);g.fillStyle='#e8f8ff';for(let i=0;i<5;i++)poly(g,[4+i*3.5,3,5.5+i*3.5,8,7+i*3.5,3]);g.fillStyle='#ffef8a';g.shadowColor='#ffef8a';g.shadowBlur=8;circ(g,6,-2,2.2);g.shadowBlur=0;
    g.fillStyle=shade(T.c,30);poly(g,[-4,-4,0,-16,4,-5],1);g.restore()}
  else{const C={skin:T.h,body:shade(T.c,-10),trim:'#c8963a',legs:T.c,pad:false};g.save();g.translate(0,-4);
    // torso only (no legs): draw humanoid upper body manually
    oe(g,0,-18,7,10,T.c);g.fillStyle=C.body;g.beginPath();g.moveTo(-8,-38);g.lineTo(9,-38);g.lineTo(7,-20);g.lineTo(-6,-20);g.closePath();g.fill();g.strokeStyle=OUT;g.lineWidth=1.3;g.stroke();
    g.fillStyle='#c8963a';g.fillRect(-7,-30,15,2.5);
    limb(g,-1,-37,-5,-27,4.5,shade(T.h,-25));
    oc(g,1,-46,7,T.h);g.fillStyle='#ffef3a';g.shadowColor='#ffef3a';g.shadowBlur=10;circ(g,5,-47,1.6);g.shadowBlur=0;
    g.strokeStyle='#4a8a3a';g.lineWidth=2.6;for(let i=0;i<7;i++){g.beginPath();g.moveTo(-5+i*2,-51);g.quadraticCurveTo(-9+i*3+Math.sin(t*6+i)*3,-58,-7+i*3,-63+Math.sin(t*7+i)*2);g.stroke()}
    const a=e.atkAnim>0?1.5:.6;const[ex,ey]=joint(3,-37,10,a);const[hx,hy]=joint(ex,ey,9,a);limb(g,3,-37,ex,ey,4.5,T.h);limb(g,ex,ey,hx,hy,4,T.h);
    g.save();g.translate(hx,hy);g.rotate(Math.PI/2-1.57);drawWeapon(g,'bow',0,e.atkAnim>0?.8:0);g.restore();
    g.restore()}
  g.restore();
}
function enemyScale(e){const base=e.T.shape==='beast'?.4:e.T.shape==='insect'?.4:e.T.shape==='golem'?.42:.32;return .5+.5*e.r/base}
function drawEnemy(g,e){
  const T=e.T,s=enemyScale(e),col=T.c;
  g.save();
  const z=e.fly?(e.deadT>0?Math.max(0,22-e.deadT*40):22+Math.sin(G.t*3+e.walk)*4):0;
  // shadow
  g.fillStyle='rgba(0,0,0,.32)';ell(g,0,0,e.r*TW*1.25,e.r*TH*1.25);
  if(e.deadT>0)g.globalAlpha=Math.max(0,1-Math.max(0,e.deadT-3)/1.5);
  if(G.hover===e&&!e.dead){g.strokeStyle='rgba(255,80,60,.9)';g.lineWidth=2;g.beginPath();g.ellipse(0,0,e.r*TW*1.5,e.r*TH*1.5,0,0,Math.PI*2);g.stroke()}
  if((e.champ||e.boss)&&!e.dead){g.strokeStyle=e.boss?'rgba(255,90,60,.6)':'rgba(255,211,77,.75)';g.lineWidth=2;g.beginPath();g.ellipse(0,0,e.r*TW*1.35,e.r*TH*1.35,0,0,Math.PI*2);g.stroke()}
  g.translate(0,-z);g.scale(s*e.face,s);
  if(e.flash>0&&!e.dead)g.filter='brightness(2.4)';
  if(e.mode==='charge'&&e.mt>.5)g.translate(Math.sin(G.t*60)*1.5,0);
  switch(T.shape){
    case'humanoid':{const F={horns:T.horns,ears:T.ears,wrap:T.wrap,bones:T.bones,skull:T.bones,helmet:T.helmet,eye:T.eye,beard:T.beard,crown:T.crown,fins:T.fins,snakes:T.snakes,glow:T.glow||(e.boss?'#ff4a2a':null),hoof:T.hoof,gold:T.gold,noSkirt:T.bones||T.wrap};
      const kind=T.wpn==='bow'?'bow':T.wpn==='spear'?'thrust':(T.ranged?'cast':'melee');
      drawHumanoid(g,{C:{skin:T.h,body:col,trim:shade(col,-30),legs:T.lg||shade(col,-30),pad:false},wpn:T.wpn||'none',shield:T.shieldE,shieldCol:'#8a6a2a',walk:e.walk,moving:e.moving,atk:e.atkAnim>0?1-e.atkAnim:-1,atkKind:kind,t:G.t+e.walk,dead:e.deadT,feats:F});break}
    case'beast':drawBeast(g,e,T,col);break;
    case'flyer':drawFlyer(g,e,T,col);break;
    case'insect':drawInsect(g,e,T,col);break;
    case'ghost':drawGhost(g,e,T,col);break;
    case'golem':drawGolem(g,e,T,col);break;
    case'serpent':drawSerpent(g,e,T,col);break;
  }
  g.filter='none';
  g.restore();
  if(e.stun>0&&!e.dead){g.fillStyle='#ffe08a';for(let i=0;i<3;i++){const a=G.t*5+i*2.1;circ(g,Math.cos(a)*10,-z-62*s*.9+Math.sin(a)*3,2)}}
  if(e.aff.length&&!e.dead&&Math.random()<.3){const a=CHAMP_AFF.find(x=>x.id===e.aff[0]);W.parts.push({x:e.x+rand(-.3,.3),y:e.y+rand(-.3,.3),z:rand(0,40*s),vx:0,vy:0,vz:30,life:.6,max:.6,c:a.c,sz:2.5})}
}

/* ---------- props ---------- */
function drawProp(g,p,A){
  const k=p.kind,v=p.v,t=G.t;
  g.save();
  g.fillStyle='rgba(0,0,0,.3)';ell(g,6,2,p.r*TW*1.5,p.r*TH*1.4);
  switch(k){
    case'rock':{const c=A.cliff[0];g.fillStyle=c;g.beginPath();g.moveTo(-15,0);g.lineTo(-13,-14);g.lineTo(-4,-22-v*6);g.lineTo(9,-18);g.lineTo(15,-6);g.lineTo(12,2);g.closePath();g.fill();g.strokeStyle=OUT;g.lineWidth=1.4;g.stroke();
      g.fillStyle='rgba(255,255,255,.18)';poly(g,[-13,-14,-4,-22-v*6,2,-14,-8,-9]);g.fillStyle='rgba(0,0,0,.2)';poly(g,[9,-18,15,-6,12,2,4,-2]);
      if(A.id==='north'){g.fillStyle='#f4f8fb';poly(g,[-13,-14,-4,-22-v*6,9,-18,2,-16,-6,-15])}break}
    case'column':{const broken=v<.35,h=broken?40+v*30:86;g.fillStyle='#cfc8b8';rr(g,-14,-6,28,8,2);g.strokeStyle=OUT;g.lineWidth=1.2;g.stroke();
      const grd=g.createLinearGradient(-10,0,10,0);grd.addColorStop(0,'#bdb6a6');grd.addColorStop(.4,'#f2ede2');grd.addColorStop(1,'#a8a090');g.fillStyle=grd;g.fillRect(-10,-h,20,h-4);g.strokeRect(-10,-h,20,h-4);
      g.strokeStyle='rgba(0,0,0,.15)';g.lineWidth=1;for(let i=-6;i<=6;i+=4)ln(g,i,-h,i,-6);
      if(!broken){g.fillStyle='#e6e0d2';rr(g,-15,-h-8,30,8,2);g.strokeStyle=OUT;g.stroke();g.fillStyle='#d8d2c4';ell(g,-10,-h-2,4,3);ell(g,10,-h-2,4,3)}
      else{g.fillStyle='#a8a090';poly(g,[-10,-h,10,-h+7,4,-h-5,-3,-h+2]);g.fillStyle='#cfc8b8';rr(g,12,-8,16,8,3)}
      if(A.id==='atlantis'){g.fillStyle='rgba(60,160,120,.5)';for(let i=0;i<4;i++)ell(g,-6+i*4,-h*.3-i*7,3,6)}
      if(A.id==='underworld'){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-10,-h,20,h-4)}break}
    case'ruin':{g.fillStyle=A.pave[1];for(let r=0;r<3;r++)for(let c=0;c<4-r;c++){g.fillStyle=shade(A.pave[(r+c)%2],-10-r*4);rr(g,-22+c*12+r*4,-10-r*10,12,10,1);g.strokeStyle=OUT;g.lineWidth=1;g.stroke()}g.fillStyle='#6a8a40';ell(g,-14,-2,6,3);break}
    case'olive':case'cypress':case'pine':case'palm':case'bamboo':case'deadtree':case'kelp':case'coral':drawTree(g,k,v,A,t);break;
    case'obelisk':{const h=96;g.fillStyle='#c8a868';poly(g,[-9,0,9,0,6,-h,-6,-h],1);g.fillStyle='#e8cc90';poly(g,[-6,-h,6,-h,0,-h-12],1);g.fillStyle='rgba(0,0,0,.18)';poly(g,[2,0,9,0,6,-h,1,-h]);g.fillStyle='#8a6a34';for(let i=1;i<6;i++){g.fillRect(-3,-h*i/6,4,3);g.fillRect(-1,-h*i/6-6,2,3)}break}
    case'statue':{g.fillStyle='#bdb6a6';rr(g,-12,-14,24,14,2);g.strokeStyle=OUT;g.stroke();g.save();g.translate(0,-14);g.scale(1.05,1.05);
      drawHumanoid(g,{C:{skin:'#e8e2d4',body:'#d8d2c4',trim:'#c4bdae',legs:'#cfc8b8',pad:false},wpn:A.id==='egypt'?'staff':'spear',walk:0,moving:false,atk:-1,t:0,feats:{noSkirt:false}});g.restore();
      if(A.id==='egypt'){g.fillStyle='#2f5fa8';poly(g,[-7,-79,8,-79,11,-62,-11,-62])}break}
    case'lantern':{g.fillStyle='#7a7a7a';g.fillRect(-4,-36,8,36);g.strokeStyle=OUT;g.strokeRect(-4,-36,8,36);g.fillStyle='#8a8a8a';poly(g,[-12,-36,12,-36,7,-43,-7,-43],1);
      g.fillStyle='#ffcf6a';g.shadowColor='#ffcf6a';g.shadowBlur=18;g.fillRect(-6,-56,12,12);g.shadowBlur=0;g.fillStyle='#6a1a1a';poly(g,[-11,-56,11,-56,0,-66],1);break}
    case'pagoda':{for(let i=0;i<3;i++){const y=-16-i*22,w=34-i*7;g.fillStyle='#8a2a1a';g.fillRect(-w*.55,y,w*1.1,16);g.strokeStyle=OUT;g.strokeRect(-w*.55,y,w*1.1,16);g.fillStyle='#3a4a3a';poly(g,[-w,y,w,y,w*.6,y-9,-w*.6,y-9],1)}g.fillStyle='#e8c050';g.fillRect(-2,-90,4,10);break}
    case'runestone':{g.fillStyle='#7f8a94';rr(g,-10,-50,20,50,8);g.strokeStyle=OUT;g.lineWidth=1.3;g.stroke();g.fillStyle='rgba(0,0,0,.2)';rr(g,2,-48,8,46,4);
      g.strokeStyle='#4ac0ff';g.shadowColor='#4ac0ff';g.shadowBlur=10;g.lineWidth=2;g.globalAlpha=.6+Math.sin(t*2+v*9)*.4;ln(g,0,-42,0,-12);ln(g,0,-34,6,-27);ln(g,0,-24,-6,-18);g.globalAlpha=1;g.shadowBlur=0;g.fillStyle='#eef3f7';ell(g,0,-49,9,3);break}
    case'tomb':{g.fillStyle='#4a4052';rr(g,-12,-36,24,36,10);g.strokeStyle=OUT;g.lineWidth=1.3;g.stroke();g.fillStyle='#5a5062';g.fillRect(-2,-30,4,20);g.fillRect(-8,-25,16,4);g.fillStyle='rgba(140,255,140,.35)';circ(g,0,-44,3+Math.sin(t*3+v*20)*1.5);break}
    case'amphora':{oe(g,0,-10,8,10,'#b8602a');g.fillStyle='#2a1a10';g.fillRect(-6,-12,12,2.5);rr(g,-3,-26,6,8,2);g.fillStyle='#b8602a';rr(g,-4,-28,8,3,1);g.strokeStyle=OUT;g.lineWidth=1.5;g.beginPath();g.arc(-6,-18,3,Math.PI*.5,Math.PI*1.5);g.stroke();g.beginPath();g.arc(6,-18,3,-Math.PI*.5,Math.PI*.5);g.stroke();g.fillStyle='rgba(255,255,255,.2)';ell(g,-3,-12,2,5);break}
    case'chest':{const o=p.open;g.fillStyle='#6a3e1a';rr(g,-14,-16,28,16,2);g.strokeStyle=OUT;g.lineWidth=1.3;g.stroke();g.fillStyle='#c8963a';g.fillRect(-14,-11,28,2.5);g.fillRect(-2,-16,4,8);
      if(o){g.fillStyle='#4a2a10';poly(g,[-14,-16,14,-16,12,-28,-12,-28],1)}else{g.fillStyle='#7a4a20';g.beginPath();g.moveTo(-14,-16);g.quadraticCurveTo(0,-30,14,-16);g.fill();g.stroke();g.fillStyle='#ffd34d';g.globalAlpha=.5+Math.sin(t*4)*.4;circ(g,0,-20,2.5);g.globalAlpha=1}break}
    case'wp':{const on=p.ref&&p.ref.on;g.fillStyle='#8a8a94';poly(g,[-12,0,12,0,8,-6,-8,-6],1);g.fillStyle='#a8a8b4';poly(g,[-7,-6,7,-6,4,-56,0,-64,-4,-56],1);g.fillStyle='rgba(0,0,0,.2)';poly(g,[1,-6,7,-6,4,-56,0,-64]);
      g.fillStyle=on?'#7ad8ff':'#3a4a5a';if(on){g.shadowColor='#7ad8ff';g.shadowBlur=16}g.beginPath();g.moveTo(0,-48);g.lineTo(3,-40);g.lineTo(0,-30);g.lineTo(-3,-40);g.closePath();g.fill();g.shadowBlur=0;
      if(on){g.globalAlpha=.25+Math.sin(t*2)*.1;g.fillStyle='#7ad8ff';ell(g,0,0,26,13);g.globalAlpha=1}break}
    case'npc':{const n=p.ref;const C=n.kind==='merchant'?{skin:'#d8a878',body:'#2a6a5a',trim:'#e0c060',legs:'#3a2a1a',head:'laurel',cape:'#1a4a3a'}:{skin:'#e8c8a8',body:'#e8e2d4',trim:'#7a3aa0',legs:'#d8d2c4',head:'hood',cape:'#5a2a80'};
      g.save();g.scale(n.face*1.05,1.05);drawHumanoid(g,{C,wpn:n.kind==='merchant'?'none':'staff',walk:0,moving:false,atk:-1,t:t+v,feats:{}});g.restore();
      if(n.kind==='merchant'){g.fillStyle='#7a4a20';rr(g,12,-12,22,12,2);g.fillStyle='#c8963a';circ(g,18,-14,3);circ(g,26,-15,3);g.fillStyle='#8a2a2a';circ(g,22,-17,2.5)}
      g.fillStyle='#ffd34d';g.font='700 13px Philosopher,serif';g.textAlign='center';g.fillText('!',0,-80+Math.sin(t*3)*2);break}
  }
  g.restore();
}
function drawTree(g,k,v,A,t){
  const sway=Math.sin(t*1.3+v*10)*1.5;
  switch(k){
    case'olive':{g.fillStyle='#5a4028';poly(g,[-4,0,4,0,3,-26,6,-34,1,-30,-2,-36,-3,-26],1);const cs=[[0,-46,17],[-12,-38,11],[12,-40,12],[-4,-56,11],[8,-54,9]];
      for(const[x,y,r]of cs)oc(g,x+sway,y,r,'#5a7838');g.fillStyle='#7a9a50';for(const[x,y,r]of cs)circ(g,x+sway-r*.3,y-r*.3,r*.55);g.fillStyle='#2a3a1a';for(let i=0;i<8;i++)circ(g,Math.cos(i*1.7)*13+sway,-44+Math.sin(i*2.3)*9,1.5);break}
    case'cypress':{g.fillStyle='#4a3020';g.fillRect(-2,-8,4,8);oe(g,sway*.5,-46,10,40,'#2f4a2a');g.fillStyle='#45683c';ell(g,-3+sway*.5,-50,5,30);break}
    case'pine':{g.fillStyle='#4a3020';g.fillRect(-3,-14,6,14);const snow=A.id==='north';for(let i=0;i<4;i++){const y=-12-i*16,w=26-i*5;g.fillStyle=i%2?'#2f5a46':'#3a6a52';poly(g,[-w+sway*i*.2,y,w+sway*i*.2,y,sway*i*.3,y-26],1);if(snow){g.fillStyle='#f4f8fb';poly(g,[-w*.5+sway*i*.2,y-12,w*.5+sway*i*.2,y-12,sway*i*.3,y-26])}}break}
    case'palm':{g.strokeStyle=OUT;g.lineWidth=7;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(14,-40,6+sway,-78);g.stroke();g.strokeStyle='#9a7a4a';g.lineWidth=5;g.stroke();g.strokeStyle='#6a5030';g.lineWidth=1;for(let i=1;i<9;i++){const y=-i*9;ln(g,i*1.2-2,y,i*1.2+3,y-1)}
      for(let i=0;i<7;i++){const a=i/7*Math.PI*2;g.strokeStyle=OUT;g.lineWidth=6;g.beginPath();g.moveTo(6+sway,-78);g.quadraticCurveTo(6+sway+Math.cos(a)*18,-90+Math.sin(a)*6,6+sway+Math.cos(a)*32,-72+Math.sin(a)*12);g.stroke();g.strokeStyle=i%2?'#4a8a3a':'#5aa048';g.lineWidth=4;g.stroke()}
      g.fillStyle='#5a3a1a';circ(g,4+sway,-76,3);circ(g,9+sway,-75,3);break}
    case'bamboo':{for(let i=-1;i<=1;i++){const h=70+i*10+v*20,x=i*8;g.fillStyle='#6a9a3a';g.fillRect(x-2.5+sway*.3,-h,5,h);g.strokeStyle=OUT;g.lineWidth=1;g.strokeRect(x-2.5+sway*.3,-h,5,h);g.fillStyle='#4a7a2a';for(let j=1;j<6;j++)g.fillRect(x-3+sway*.3,-h*j/6,6,2);g.fillStyle='#7ab04a';poly(g,[x+sway,-h,x+16+sway,-h-6,x+3+sway,-h+4]);poly(g,[x+sway,-h*.6,x-14+sway,-h*.6-5,x-2+sway,-h*.6+4])}break}
    case'deadtree':{g.strokeStyle=OUT;g.lineCap='round';const br=(x1,y1,x2,y2,w)=>{g.strokeStyle=OUT;g.lineWidth=w+2;ln(g,x1,y1,x2,y2);g.strokeStyle='#3a2c30';g.lineWidth=w;ln(g,x1,y1,x2,y2)};
      br(0,0,0,-44,7);br(0,-28,-16,-46,4);br(0,-36,14,-56,4);br(-8,-38,-14,-58,2.5);br(7,-46,18,-46,2.5);br(0,-44,-3,-62,3);break}
    case'kelp':{for(let i=-1;i<=1;i++){g.strokeStyle=OUT;g.lineWidth=6;g.beginPath();g.moveTo(i*7,0);for(let j=1;j<=7;j++)g.lineTo(i*7+Math.sin(t*1.8+j*.8+i)*6,-j*11);g.stroke();g.strokeStyle=i?'#3a8a5a':'#4aa06a';g.lineWidth=4;g.stroke()}break}
    case'coral':{const c=v<.5?'#ff7a8a':'#ffae5a';for(let i=0;i<5;i++){const a=-Math.PI/2+(i-2)*.38;g.strokeStyle=OUT;g.lineWidth=8;ln(g,0,0,Math.cos(a)*26,Math.sin(a)*34);g.strokeStyle=c;g.lineWidth=6;ln(g,0,0,Math.cos(a)*26,Math.sin(a)*34);g.fillStyle=c;circ(g,Math.cos(a)*26,Math.sin(a)*34,5)}break}
  }
}

/* ---------- hero ---------- */
function heroLook(){const C=COSTUMES[P.cos]||COSTUMES.classic;const w=P.eq.weapon;const sh=P.eq.offhand;
  return{C,wpn:w?w.wt:'none',rar:w?w.rar:0,shield:!!sh,shieldRar:sh?sh.rar:0,shieldCol:C.trim}}
function drawHeroAt(g,L,scale){g.save();g.scale(scale*(L.face||1),scale);drawHumanoid(g,L);g.restore()}
function heroPreview(canvas,cos,wpn,shield){
  const r=canvas.getBoundingClientRect(),dp=Math.min(2,devicePixelRatio||1),w=r.width||100,h=r.height||100;canvas.width=w*dp;canvas.height=h*dp;
  const g=canvas.getContext('2d');g.setTransform(dp,0,0,dp,0,0);g.translate(w/2,h-8);g.fillStyle='rgba(0,0,0,.35)';ell(g,0,0,16,5);
  drawHeroAt(g,{C:COSTUMES[cos]||COSTUMES.classic,wpn:wpn||'sword',shield,walk:0,moving:false,atk:-1,t:performance.now()/1000},h/80);
}

/* ---------- item icons ---------- */
const ICONC=new Map();
function itemIcon(it){
  const key=(it.wt||it.slot)+'|'+it.rar+'|'+(it.leg?1:0);if(ICONC.has(key))return ICONC.get(key);
  const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');const R=RAR[it.rar];
  const bg=g.createRadialGradient(48,48,6,48,48,52);bg.addColorStop(0,rgba(R.c,.35));bg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=bg;g.fillRect(0,0,96,96);
  g.translate(48,48);g.scale(1.6,1.6);const metal=it.rar>=4?'#e8c0ff':it.rar>=3?'#cfe0ff':'#d8dde6';
  const s=it.slot;
  if(s==='weapon'){g.save();g.rotate(it.wt==='bow'?0:-Math.PI/4);g.translate(it.wt==='bow'?6:-14,0);drawWeapon(g,it.wt,it.rar,0);g.restore()}
  else if(s==='offhand'){g.scale(1.6,1.6);drawShield(g,it.rar,it.rar>=3?R.c:'#c8963a')}
  else if(s==='head'){oc(g,0,2,14,metal);g.fillStyle='#1a120c';g.fillRect(-2,0,13,4);g.fillRect(3,0,3,12);g.fillStyle='#a3241c';g.beginPath();g.ellipse(0,-12,14,6,0,Math.PI,0);g.fill()}
  else if(s==='chest'){g.fillStyle=metal;g.beginPath();g.moveTo(-14,-16);g.lineTo(14,-16);g.lineTo(11,16);g.lineTo(-11,16);g.closePath();g.fill();g.strokeStyle=OUT;g.lineWidth=1.5;g.stroke();g.strokeStyle='rgba(0,0,0,.3)';ln(g,0,-14,0,14);g.beginPath();g.arc(-5,-4,6,0,Math.PI);g.stroke();g.beginPath();g.arc(5,-4,6,0,Math.PI);g.stroke()}
  else if(s==='legs'){g.fillStyle=metal;rr(g,-12,-16,9,30,4);rr(g,3,-16,9,30,4);g.strokeStyle=OUT;g.lineWidth=1.5;g.strokeRect(-12,-16,9,30);g.strokeRect(3,-16,9,30)}
  else if(s==='arms'){g.fillStyle=metal;rr(g,-10,-14,20,28,6);g.strokeStyle=OUT;g.lineWidth=1.5;g.strokeRect(-10,-14,20,28);g.fillStyle='#c8963a';g.fillRect(-10,-6,20,3);g.fillRect(-10,4,20,3)}
  else if(s==='ring'){g.strokeStyle=OUT;g.lineWidth=7;g.beginPath();g.arc(0,4,11,0,Math.PI*2);g.stroke();g.strokeStyle='#e8c050';g.lineWidth=4.5;g.stroke();oc(g,0,-8,5.5,R.c)}
  else if(s==='amulet'){g.strokeStyle='#c8a040';g.lineWidth=2;g.beginPath();g.arc(0,-6,14,Math.PI*1.1,Math.PI*1.9,true);g.stroke();oc(g,0,8,9,'#e8c050');oc(g,0,8,5,R.c)}
  const url=c.toDataURL();ICONC.set(key,url);return url;
}
