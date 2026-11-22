/* ============================ GAME ============================ */
const G={state:'menu',paused:false,t:0,shake:0,touch:false,zoom:1,cam:{x:0,y:0},ox:0,oy:0,hover:null,labels:[],panel:null};
let P=null,D={};
const xpNeed=l=>Math.floor(70*Math.pow(l,1.5));
function campaign(){return ACTS.filter(a=>!a.dlc||S.dlc[a.dlc])}
function curAct(){return ACTS.find(a=>a.id===P.actId)||ACTS[0]}

/* ---------- items ---------- */
let ITEMID=1;
function rollRarity(bonus=0){const r=Math.random()-bonus-(D.luck||0)-DIFF[P?P.diff||0:0].loot;if(r<.015)return 4;if(r<.065)return 3;if(r<.2)return 2;if(r<.55)return 1;return 0}
function makeItem(slot,lvl,rar,o={}){
  lvl=Math.max(1,lvl);const R=RAR[rar],it={id:ITEMID++,slot,lvl,rar,st:{},req:Math.max(1,lvl-2)};let baseName;
  if(slot==='weapon'){const wt=o.wt||pick(Object.keys(WTYPE));it.wt=wt;const W_=WTYPE[wt];baseName=pick(W_.n);const b=(5+lvl*1.7)*W_.dmg*R.m;it.min=Math.max(1,Math.round(b*rand(.7,.85)));it.max=Math.round(b*rand(1.15,1.35))}
  else{const key=slot.startsWith('ring')?'ring':slot;const A_=ARM[key];baseName=pick(A_.n);if(A_.a)it.st.armor=Math.round((3+lvl*1.05)*A_.a*rand(.85,1.15)*R.m);if(slot==='offhand')it.st.block=randi(14,22)+rar*2}
  const pool=Object.keys(AFF).filter(k=>!(k==='block'&&slot!=='offhand'));
  const na=R.a+(slot.startsWith('ring')||slot==='amulet'?1:0);
  const ks=pool.sort(()=>Math.random()-.5).slice(0,na);ks.forEach(k=>{it.st[k]=(it.st[k]||0)+(+(AFF[k][1](lvl)*R.m).toFixed(k==='regen'?1:0))});
  if(rar===4){const key=slot==='weapon'?it.wt:slot.startsWith('ring')?'ring':slot;const L=LEGEND[key]||LEGEND.ring;const[n,q]=pick(L);it.name=n;it.quote=q;it.leg=1}
  else if(rar===3)it.name=baseName+' '+pick(HEROES);
  else if(ks.length>=2)it.name=baseName+' '+AFF[ks[0]][0]+' и '+AFF[ks[1]][0];
  else if(ks.length===1)it.name=baseName+' '+AFF[ks[0]][0];
  else it.name=baseName;
  return it;
}
function itemScore(it){if(!it)return 0;const w={dmg:3,fire:2.5,light:2.5,armor:1.2,hp:.3,mana:.15,crit:3,aspd:2,move:1.5,spell:1.5,cdr:2,str:1.5,dex:1.5,int:1.5,vit:1.5,leech:5,regen:3,block:2};let v=0;for(const k in it.st)v+=(it.st[k]||0)*(w[k]||1);if(it.min)v+=(it.min+it.max)*1.6;return v}
function itemValue(it){return Math.round((it.lvl*3+5)*(1+it.rar*1.3))}
function slotFor(it){if(it.slot==='ring1'||it.slot==='ring2'||it.slot==='ring')return!P.eq.ring1?'ring1':!P.eq.ring2?'ring2':'ring1';return it.slot}
function canEquip(it){if(it.req>P.lvl)return'Нужен '+it.req+' уровень';if(it.slot==='offhand'&&P.eq.weapon&&WTYPE[P.eq.weapon.wt].two)return'Двуручное оружие не даёт взять щит';return null}

/* ---------- hero ---------- */
const SAVEKEYS=['cos','lvl','xp','attrPts','skillPts','spEarned','attr','mast','mrank','sk','bar','inv','eq','gold','potH','potM','actId','diff','wp','quests','done'];
function newHero(m1,cos){
  P={cos,lvl:1,xp:0,attrPts:0,skillPts:0,spEarned:0,attr:{str:10,dex:10,int:10,vit:10},mast:[m1,null],mrank:{[m1]:1},sk:{},bar:[],inv:[],
    eq:{weapon:null,offhand:null,head:null,chest:null,legs:null,arms:null,ring1:null,ring2:null,amulet:null},gold:40,potH:4,potM:3,actId:campaign()[0].id,diff:0,wp:{},quests:{},done:{}};
  const M=MAST[m1];const main={war:'str',def:'vit',hunt:'dex',shad:'dex',elem:'int',spir:'int'}[m1];P.attr[main]+=4;
  learnSkill(M.skills[0]);
  P.eq.weapon=makeItem('weapon',1,0,{wt:M.start});if(M.shield)P.eq.offhand=makeItem('offhand',1,0);P.eq.chest=makeItem('chest',1,0);
  initRuntime();recalc();P.hp=D.maxHp;P.mp=D.maxMp;
}
function initRuntime(){Object.assign(P,{x:0,y:0,r:.3,hp:1,mp:1,cd:{},buffs:{},face:1,walk:0,moving:false,atk:null,castT:0,path:null,target:null,interact:null,pick:null,atkT:0,inv_t:0,dash:null,hurt:0,slowT:0,revived:false,repathT:0,stepT:0})}
function learnSkill(id){P.sk[id]=(P.sk[id]||0)+1;if(SK[id].act&&!P.bar.includes(id)&&P.bar.length<8)P.bar.push(id)}
function className(){const m=P.mast.filter(Boolean).sort();return CLASSN[m.join('+')]||CLASSN[m[0]]}
function slv(id){return P.sk[id]||0}
function recalc(){
  const s={};for(const k in P.eq){const it=P.eq[k];if(!it)continue;for(const a in it.st)s[a]=(s[a]||0)+it.st[a]}
  const cm=(COSTUMES[P.cos]||{}).mods||{};const mb={str:0,dex:0,int:0,vit:0,hp:0,mana:0,armor:0,crit:0};
  for(const m of P.mast){if(!m)continue;const r=P.mrank[m]||0;for(const k in MAST[m].per)mb[k]+=MAST[m].per[k]*r}
  const st={};['str','dex','int','vit'].forEach(k=>st[k]=P.attr[k]+(s[k]||0)+mb[k]);D={st};
  const w=P.eq.weapon,wt=w?w.wt:'none',WT=WTYPE[wt]||{spd:1.4,reach:1.3,attr:'str',dmg:1};D.wt=wt;D.WT=WT;D.ranged=!!WT.ranged;D.reach=WT.reach||1.3;
  D.maxHp=Math.round((40+st.vit*9+P.lvl*8+(s.hp||0)+mb.hp)*(1+(cm.hp||0)+slv('endure')*.04));
  D.maxMp=Math.round((30+st.int*5+P.lvl*4+(s.mana||0)+mb.mana)*(1+(cm.mana||0)));
  const flat=(s.dmg||0)+(s.fire||0)+(s.light||0);D.wmin=(w?w.min:2)+flat;D.wmax=(w?w.max:4)+flat;
  D.wMult=(1+st[WT.attr||'str']/90)*(1+slv('twohand')*.06+(D.ranged&&!WT.magic?slv('marksman')*.08:0))*(1+(cm.dmg||0));
  D.spell=(8+P.lvl*3.2)*(1+st.int/70)*(1+(s.spell||0)/100+slv('pyre')*.08+slv('commune')*.03)*(1+(cm.dmg||0));
  D.armor=((s.armor||0)+st.dex*.25+st.str*.2+mb.armor)*(1+slv('temper')*.08)*(1+(cm.armor||0));
  D.crit=Math.min(60,5+st.dex*.1+(s.crit||0)+slv('instinct')*1.5+(cm.crit||0)+mb.crit);D.critM=1.8+slv('lethal')*.1;
  D.aspd=(WT.spd||1.4)*(1+(s.aspd||0)/100+(cm.aspd||0));D.move=4.3*(1+(s.move||0)/100+(cm.move||0));
  D.leech=(s.leech||0)/100+(cm.leech||0);D.hpReg=.6+st.vit*.06+(s.regen||0)+(cm.regen?D.maxHp*cm.regen:0)+slv('lifeaura')*.0012*D.maxHp;
  D.mpReg=(2+st.int*.1)*(1+(cm.mreg||0)+slv('commune')*.12);D.dodge=Math.min(35,slv('evasion')*2);
  D.block=P.eq.offhand?Math.min(60,(s.block||0)+slv('endure')*2):0;D.dr=slv('iceskin')*.02;D.cdr=Math.min(.3,(s.cdr||0)/100);
  D.frenzy=slv('frenzy')?.04+.02*slv('frenzy'):0;D.gold=1+(cm.gold||0);D.luck=cm.luck||0;D.revive=!!cm.revive;
  if(P.hp>D.maxHp)P.hp=D.maxHp;if(P.mp>D.maxMp)P.mp=D.maxMp;
}
function weaponRoll(mult){return rand(D.wmin,D.wmax)*D.wMult*mult*(P.buffs.warcry?P.wcMult:1)}
function spellRoll(mult){return D.spell*mult*rand(.92,1.08)*(P.buffs.warcry?P.wcMult:1)}
function heal(v){P.hp=Math.min(D.maxHp,P.hp+v)}
function gainXp(v){
  P.xp+=Math.round(v);let up=false;
  while(P.xp>=xpNeed(P.lvl)){P.xp-=xpNeed(P.lvl);P.lvl++;P.attrPts+=2;P.skillPts+=3;P.spEarned+=3;up=true}
  if(up){recalc();P.hp=D.maxHp;P.mp=D.maxMp;sfx('level');banner('Уровень '+P.lvl,'+2 очка характеристик, +3 очка умений');burst(P.x,P.y,'#f0c47a',40,4,30);
    if(P.lvl>=6&&!P.mast[1])setTimeout(()=>toast('Доступна вторая мастерия: откройте «Умения» (K)'),1200)}
}

/* ---------- fx helpers ---------- */
function txt(x,y,t,c,big,z=60){if(!S.dmgnums&&typeof t==='number')return;W.texts.push({x:x+rand(-.15,.15),y:y+rand(-.15,.15),z,t:String(t),c,big,life:1})}
function burst(x,y,c,n,sp,z=20){for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),s=rand(.2,1)*sp;W.parts.push({x,y,z:z+rand(-6,6),vx:Math.cos(a)*s,vy:Math.sin(a)*s,vz:rand(20,90),grav:160,life:rand(.35,.8),max:.8,c,sz:rand(2,4)})}}
function ring(x,y,r,c){W.parts.push({ring:1,x,y,r,life:.45,max:.45,c})}
function shake(v){G.shake=Math.min(14,G.shake+v)}
function enemiesNear(x,y,r){return W.en.filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<r+e.r)}

/* ---------- damage ---------- */
function dealDmg(e,base,o={}){
  if(e.dead)return 0;
  const crit=o.crit||(!o.nocrit&&Math.random()*100<D.crit);
  let d=Math.max(1,Math.round(base*(crit?D.critM:1)));e.hp-=d;e.flash=.1;e.aggro=true;if(!e.tgt)e.tgt=P;
  txt(e.x,e.y,d,crit?'#ffd34d':o.c||'#ffffff',crit,e.fly?90:70*enemyScale(e));
  if(!o.nocrit)sfx(crit?'crit':'hit');
  if(D.leech&&!o.nocrit)heal(d*D.leech);
  if(o.stun)e.stun=Math.max(e.stun,o.stun*(e.boss?.25:1));
  if(o.slow){e.slow=o.slow;e.slowT=o.slowT||2}
  if(o.poison){e.poison=Math.max(e.poison,o.poison);e.poisonT=4}
  if(P.buffs.venom&&o.weapon){e.poison=Math.max(e.poison,P.venomDps);e.poisonT=4}
  if(o.kb&&!e.boss&&!e.named){const a=Math.atan2(e.y-P.y,e.x-P.x);moveEnt(e,Math.cos(a)*o.kb,Math.sin(a)*o.kb)}
  burst(e.x,e.y,o.blood||(e.T.shape==='golem'?'#c8a060':e.T.shape==='ghost'?'#d0c0ff':e.T.bones?'#e8e2d0':'#a8201a'),crit?8:4,2.5,30*enemyScale(e));
  if(crit)shake(2);
  if(e.hp<=0)killEnemy(e);
  return d;
}
function killEnemy(e){
  e.dead=true;e.deadT=0;W.killed++;gainXp(e.xp);sfx('die');burst(e.x,e.y,e.T.c,e.boss?70:16,e.boss?6:3,30);
  if(G.hover===e)G.hover=null;if(P.target===e)P.target=null;
  const lv=e.lvl;
  if(e.boss){
    for(let i=0;i<4;i++)dropItem(e.x+rand(-1.5,1.5),e.y+rand(-1.5,1.5),lv+1,i===0?.25:.1,true);
    dropGold(e.x,e.y+1,Math.round((30+lv*12)*rand(1,1.5)));W.loot.push(lootObj(e.x-.8,e.y+.8,'potH'));W.loot.push(lootObj(e.x+.8,e.y+.8,'potM'));
    W.portal={x:e.x,y:e.y,t:0};P.done[P.actId]=true;q().boss=true;sfx('portal');
    banner(e.T.n+' повержен','Пройдите в портал, чтобы продолжить путь');saveGame();
  }else{
    if(Math.random()<(e.champ?.95:.15)+(D.luck||0))dropItem(e.x,e.y,lv,e.champ?.1:0);
    if(e.named){dropItem(e.x+.5,e.y,lv+1,.2,true);q().lair=true;P.attrPts+=1;P.skillPts+=2;P.spEarned+=2;banner('Задание выполнено','Награда: +1 очко характеристик, +2 очка умений');sfx('level')}
    if(Math.random()<.42)dropGold(e.x+rand(-.3,.3),e.y+rand(-.3,.3),Math.round((2+lv*1.6)*rand(.6,1.4)*(e.champ?3:1)));
    if(Math.random()<.07)W.loot.push(lootObj(e.x+rand(-.4,.4),e.y+rand(-.4,.4),Math.random()<.6?'potH':'potM'));
  }
}
function q(){return P.quests[P.actId]||(P.quests[P.actId]={lair:false,boss:false})}
function lootObj(x,y,type,o={}){return Object.assign({x,y,type,pop:0},o)}
function dropGold(x,y,amt){W.loot.push(lootObj(x,y,'gold',{amt}))}
function dropItem(x,y,lvl,bonus,boss){
  let rar=rollRarity(bonus);if(boss&&rar<2)rar=2;
  const slot=pick(['weapon','weapon','offhand','head','chest','legs','arms','ring','amulet']);
  const it=makeItem(slot==='ring'?'ring1':slot,lvl,rar,slot==='weapon'&&Math.random()<.55?{wt:P.eq.weapon?P.eq.weapon.wt:'sword'}:{});
  if(it.slot==='ring1')it.slot='ring';W.loot.push(lootObj(x,y,'item',{item:it}));
  if(rar>=2)sfx(rar>=4?'loot3':'loot2')
}
function hurtPlayer(amount,att){
  if(P.inv_t>0||G.state!=='play')return;
  if(Math.random()*100<D.dodge){txt(P.x,P.y,'Уклонение','#c0b0ff',false,70);return}
  let blk=false;if(D.block&&Math.random()*100<D.block){amount*=.4;blk=true}
  const lvl=att&&att.lvl||P.lvl,arm=D.armor*(P.buffs.bulwark?P.bwMult:1),red=arm/(arm+60+12*lvl);
  const d=Math.max(1,Math.round(amount*(1-red)*(1-D.dr)*rand(.9,1.1)));
  P.hp-=d;shake(3);P.hurt=.18;sfx('hurt');txt(P.x,P.y,blk?'Блок '+d:d,'#ff6a5a',false,75);
  if(att&&P.buffs.bulwark&&att.hp>0&&!att.T?.ranged)dealDmg(att,d*P.bwRefl,{nocrit:true,c:'#ffe08a'});
  if(att&&att.aff&&att.aff.includes('vamp'))att.hp=Math.min(att.maxHp,att.hp+d*.3);
  if(att&&att.aff&&att.aff.includes('frost'))P.slowT=1.5;
  if(P.hp<=0){
    if(D.revive&&!P.revived){P.revived=true;P.hp=D.maxHp*.5;P.inv_t=2;burst(P.x,P.y,'#ff9a3a',60,5,30);banner('Феникс возрождается','Костюм спас вас один раз за акт');return}
    P.hp=0;G.state='dead';sfx('die');setTimeout(showDeath,900);
  }
}
function hurtPet(p,amount){p.hp-=amount;p.flash=.1;txt(p.x,p.y,Math.round(amount),'#ffb0a0',false,60);if(p.hp<=0){p.dead=true;burst(p.x,p.y,'#9fdfff',20,3,30)}}

/* ---------- targeting ---------- */
function mouseWorld(){return{x:G.mx,y:G.my}}
function nearestEnemy(x,y,r){let b=null,bd=r;for(const e of W.en){if(e.dead)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<bd){bd=d;b=e}}return b}
function aimPoint(maxD){
  let tx,ty;
  if(P.target&&!P.target.dead){tx=P.target.x;ty=P.target.y}
  else if(!G.touch&&G.hover&&!G.hover.dead){tx=G.hover.x;ty=G.hover.y}
  else if(!G.touch&&G.mx!==undefined){tx=G.mx;ty=G.my}
  else{const e=nearestEnemy(P.x,P.y,9);if(e){tx=e.x;ty=e.y}else{tx=P.x+Math.cos(P.dir||0)*3;ty=P.y+Math.sin(P.dir||0)*3}}
  const dx=tx-P.x,dy=ty-P.y,d=Math.hypot(dx,dy)||1,k=d>maxD?maxD/d:1;return{x:P.x+dx*k,y:P.y+dy*k,ang:Math.atan2(dy,dx),d}
}
function skillTarget(range){
  if(P.target&&!P.target.dead&&dist(P,P.target)<range)return P.target;
  if(!G.touch&&G.hover&&!G.hover.dead&&dist(P,G.hover)<range)return G.hover;
  if(!G.touch&&G.mx!==undefined){const e=nearestEnemy(G.mx,G.my,2.5);if(e&&dist(P,e)<range)return e}
  return nearestEnemy(P.x,P.y,range);
}
function faceTo(x,y){const sx=isoX(x,y)-isoX(P.x,P.y);if(Math.abs(sx)>2)P.face=sx>0?1:-1;P.dir=Math.atan2(y-P.y,x-P.x)}

/* ---------- player attacks ---------- */
function startAttack(tgt,ax,ay){
  const dur=Math.max(.28,.9/D.aspd);
  const kind=D.wt==='bow'?'bow':D.wt==='staff'?'cast':D.wt==='spear'?'thrust':'melee';
  if(tgt)faceTo(tgt.x,tgt.y);else faceTo(ax,ay);
  P.atk={t:0,dur,hitAt:kind==='melee'?.5:kind==='thrust'?.45:.42,done:false,kind,tgt,ax:tgt?tgt.x:ax,ay:tgt?tgt.y:ay};P.atkT=1/D.aspd;
  if(kind==='melee'||kind==='thrust')setTimeout(()=>sfx('swing'),dur*350);
}
function resolveAttack(a){
  const tx=a.tgt&&!a.tgt.dead?a.tgt.x:a.ax,ty=a.tgt&&!a.tgt.dead?a.tgt.y:a.ay,ang=Math.atan2(ty-P.y,tx-P.x);
  if(a.kind==='bow'){shoot({ang,spd:15,dmg:weaponRoll(1),kind:'arrow',c:'#e8d8b0',weapon:true});sfx('arrow')}
  else if(a.kind==='cast'){shoot({ang,spd:11,dmg:weaponRoll(1),kind:'bolt',c:'#8fd0ff',r:.25,weapon:true});sfx('bolt')}
  else{const hits=meleeArc(ang,D.reach,a.kind==='thrust'?.7:1.9,1,{kb:.12,weapon:true});
    if(hits&&D.frenzy&&Math.random()<D.frenzy)setTimeout(()=>{if(W&&G.state==='play'){meleeArc(ang,D.reach,1.9,1,{weapon:true});txt(P.x,P.y,'Ярость!','#ff9a5a',false,80)}},120)}
}
function meleeArc(ang,reach,arc,mult,o={}){
  let hit=0;for(const e of W.en){if(e.dead)continue;const dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy);
    if(d<reach+e.r&&Math.abs(angDiff(Math.atan2(dy,dx),ang))<arc/2+.25){dealDmg(e,weaponRoll(mult),o);hit++}}
  hitProps(P.x+Math.cos(ang)*.9,P.y+Math.sin(ang)*.9,reach*.8);
  W.parts.push({arc:1,x:P.x,y:P.y,r:reach,a:ang,w:arc,life:.2,max:.2,c:o.c||'#fff2d0'});
  return hit;
}
function hitProps(x,y,r){for(const p of propsNear(x,y)){if(p.kind==='amphora'&&Math.hypot(p.x-x,p.y-y)<r+p.r){breakAmphora(p)}}}
function breakAmphora(p){removeProp(p);sfx('break');burst(p.x,p.y,'#b8602a',14,3,12);if(Math.random()<.5)dropGold(p.x,p.y,Math.round((2+P.lvl)*rand(.8,1.6)));else if(Math.random()<.15)W.loot.push(lootObj(p.x,p.y,Math.random()<.5?'potH':'potM'));else if(Math.random()<.08)dropItem(p.x,p.y,P.lvl,0)}
function shoot(o){const a=o.ang;W.proj.push(Object.assign({owner:'p',x:P.x+Math.cos(a)*.4,y:P.y+Math.sin(a)*.4,z:34,vx:Math.cos(a)*o.spd,vy:Math.sin(a)*o.spd,life:1.2,r:.18,hit:new Set()},o))}

/* ---------- skills ---------- */
function castSkill(i){
  if(G.state!=='play'||G.paused)return;const id=P.bar[i];if(!id)return;const s=SK[id],lv=slv(id);if(!lv)return;
  if((P.cd[id]||0)>0)return;const cost=Math.round(s.mana+lv*1.5);if(P.mp<cost){toast('Не хватает энергии');return}
  if(s.bow&&D.wt!=='bow'){toast('Для этого умения нужен лук');return}
  const m=1+.15*(lv-1);const ap=aimPoint(8);let ok=true;
  switch(id){
    case'charge':{const p=aimPoint(6);faceTo(p.x,p.y);P.dash={vx:Math.cos(p.ang)*20,vy:Math.sin(p.ang)*20,t:Math.min(.3,p.d/20),hit:new Set(),dmg:1.6+.24*(lv-1),stun:1};P.inv_t=.3;sfx('swing');break}
    case'whirl':P.whirl={t:.9,n:3,mult:.7+.1*(lv-1),next:0};sfx('swing');break;
    case'warcry':P.buffs.warcry=10;P.wcMult=1.2+.04*lv;ring(P.x,P.y,4,'#ffb04a');enemiesNear(P.x,P.y,4).forEach(e=>{e.stun=Math.max(e.stun,e.boss?.3:1.2)});sfx('cry');shake(4);break;
    case'shieldbash':{const t=skillTarget(D.reach+.8);if(!t){ok=false;toast('Нет цели рядом');break}faceTo(t.x,t.y);P.atk={t:0,dur:.35,hitAt:.45,done:true,kind:'melee'};dealDmg(t,weaponRoll((1.5+.22*(lv-1))*(P.eq.offhand?1.3:1)),{stun:1.5,kb:.4,weapon:true});ring(t.x,t.y,1,'#ffe08a');shake(4);break}
    case'bulwark':P.buffs.bulwark=10;P.bwMult=1.4+.06*lv;P.bwRefl=.15+.03*lv;ring(P.x,P.y,1.5,'#c9a24a');sfx('cry');break;
    case'crush':enemiesNear(P.x,P.y,3).forEach(e=>dealDmg(e,weaponRoll(2.5+.35*(lv-1)),{stun:1.5,c:'#ffcf7a',weapon:true}));ring(P.x,P.y,3,'#c89a5a');ring(P.x,P.y,2,'#e8c08a');burst(P.x,P.y,'#a07a4a',40,5,5);shake(10);sfx('boom');hitProps(P.x,P.y,3);P.castT=.35;break;
    case'volley':{const n=5+Math.floor(lv/2);faceTo(ap.x,ap.y);for(let k=0;k<n;k++)shoot({ang:ap.ang+(k-(n-1)/2)*.11,spd:15,dmg:weaponRoll(.85+.12*(lv-1)),kind:'arrow',c:'#ffe2a0',weapon:true});P.atk={t:0,dur:.35,hitAt:1,done:true,kind:'bow'};sfx('arrow');break}
    case'pierce':faceTo(ap.x,ap.y);shoot({ang:ap.ang,spd:20,dmg:weaponRoll(2.2+.3*(lv-1)),kind:'arrow',c:'#8affff',pierce:true,life:1,weapon:true});P.atk={t:0,dur:.35,hitAt:1,done:true,kind:'bow'};sfx('arrow');break;
    case'trap':{const p=aimPoint(7);W.traps.push({x:p.x,y:p.y,arm:.5,dmg:weaponRoll(3+.4*(lv-1)),life:25});sfx('click');break}
    case'knives':faceTo(ap.x,ap.y);for(let k=0;k<5;k++)shoot({ang:ap.ang+(k-2)*.16,spd:14,dmg:weaponRoll(.7+.1*(lv-1)),kind:'knife',c:'#d8e0e8',poison:weaponRoll(.25)});P.castT=.25;sfx('swing');break;
    case'venom':P.buffs.venom=12;P.venomDps=weaponRoll(.3+.05*lv);ring(P.x,P.y,1.2,'#8aff6a');sfx('potion');break;
    case'shadowstep':{const t=skillTarget(8);if(!t){ok=false;toast('Нет цели');break}const a=Math.atan2(t.y-P.y,t.x-P.x);const bx=t.x+Math.cos(a)*(t.r+.5),by=t.y+Math.sin(a)*(t.r+.5);burst(P.x,P.y,'#8a6ad0',20,3,30);
      if(canStand(bx,by,.25)){P.x=bx;P.y=by}else{P.x=t.x-Math.cos(a)*(t.r+.5);P.y=t.y-Math.sin(a)*(t.r+.5)}faceTo(t.x,t.y);dealDmg(t,weaponRoll(2+.3*(lv-1)),{crit:true,weapon:true});P.inv_t=.3;P.target=t;sfx('crit');break}
    case'fireball':faceTo(ap.x,ap.y);shoot({ang:ap.ang,spd:10,dmg:spellRoll(1.6+.22*(lv-1)),kind:'fire',c:'#ff8a2a',r:.3,aoe:1.6});P.castT=.3;sfx('fire');break;
    case'chain':{let t=skillTarget(8);if(!t){ok=false;toast('Нет цели');break}faceTo(t.x,t.y);const n=3+Math.floor(lv/3),hit=new Set(),pts=[{x:P.x,y:P.y,z:40}];let cur=t;
      for(let k=0;k<=n&&cur;k++){hit.add(cur);pts.push({x:cur.x,y:cur.y,z:30*enemyScale(cur)});dealDmg(cur,spellRoll(1.3+.18*(lv-1)),{c:'#bfe8ff'});let nb=null,bd=4;for(const e of W.en){if(e.dead||hit.has(e))continue;const d=dist(e,cur);if(d<bd){bd=d;nb=e}}cur=nb}
      W.beams.push({pts,life:.3,max:.3,c:'#bfe8ff',jag:1});P.castT=.3;sfx('zap');break}
    case'meteor':{const p=aimPoint(9);W.zones.push({x:p.x,y:p.y,r:2.5,t:1,max:1,dmg:spellRoll(4.2+.55*(lv-1)),owner:'p',c:'#ff7a2a',kind:'meteor'});P.castT=.4;sfx('fire');break}
    case'drain':{const t=skillTarget(7.5);if(!t){ok=false;toast('Нет цели');break}faceTo(t.x,t.y);const d=dealDmg(t,spellRoll(1.4+.2*(lv-1)),{c:'#ff8aa0'});heal(d*.5);W.beams.push({pts:[{x:P.x,y:P.y,z:40},{x:t.x,y:t.y,z:30*enemyScale(t)}],life:.35,max:.35,c:'#ff4a6a'});P.castT=.3;sfx('zap');break}
    case'guardian':{W.pets=W.pets.filter(p=>!p.dead&&p.kind!=='guardian');const g={kind:'guardian',x:P.x+1,y:P.y,r:.3,maxHp:Math.round(D.maxHp*(.4+.08*lv)),dmg:spellRoll(.45+.08*lv)/1.08,spd:4.6,face:1,walk:0,atk:0,atkAnim:0,team:'p',flash:0};g.hp=g.maxHp;W.pets.push(g);burst(g.x,g.y,'#9fdfff',30,3,30);sfx('summon');break}
    case'mend':heal(D.maxHp*(.3+.03*lv));W.pets.forEach(p=>{p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.4)});burst(P.x,P.y,'#8aff9a',30,2,40);sfx('heal');break;
  }
  if(!ok)return;P.mp-=cost;P.cd[id]=s.cd*(1-D.cdr);if(!P.atk&&!P.castT)P.castT=.25;
}
function drinkPotion(type){
  if(G.state!=='play'||G.paused)return;const k=type==='m'?'potM':'potH';
  if(P[k]<=0){toast(type==='m'?'Нет зелий энергии':'Нет зелий здоровья');return}if((P.cd[k]||0)>0)return;
  P[k]--;P.cd[k]=1;if(type==='m')P.mp=Math.min(D.maxMp,P.mp+D.maxMp*.5);else heal(D.maxHp*.45+20);sfx('potion');burst(P.x,P.y,type==='m'?'#5a8aff':'#ff5a5a',16,2,40);
}

/* ---------- update ---------- */
function update(dt){
  G.t+=dt;W.time+=dt;
  updatePlayer(dt);updatePets(dt);updateEnemies(dt);updateProj(dt);
  for(const z of W.zones){z.t-=dt;if(z.t<=0&&!z.done){z.done=true;
    if(z.owner==='p'){enemiesNear(z.x,z.y,z.r).forEach(e=>dealDmg(e,z.dmg,{stun:.8,c:'#ffb070'}));hitProps(z.x,z.y,z.r);shake(9);burst(z.x,z.y,'#ff8a2a',50,6,5);sfx('boom')}
    else if(z.kind==='line'){const d=segDist(P.x,P.y,z.x,z.y,z.x+Math.cos(z.ang)*z.len,z.y+Math.sin(z.ang)*z.len);if(d<z.w)hurtPlayer(z.dmg,z.src);sfx('zap')}
    else{if(Math.hypot(P.x-z.x,P.y-z.y)<z.r+.2)hurtPlayer(z.dmg,z.src);burst(z.x,z.y,z.c,30,5,5);shake(4);sfx('boom')}
    ring(z.x,z.y,z.r||1,z.c)}}
  W.zones=W.zones.filter(z=>!z.done);
  for(const t of W.traps){t.arm-=dt;t.life-=dt;if(t.arm<=0&&!t.done&&enemiesNear(t.x,t.y,1).length){t.done=true;enemiesNear(t.x,t.y,3).forEach(e=>dealDmg(e,t.dmg,{slow:.4,slowT:3,c:'#ffe08a'}));ring(t.x,t.y,3,'#ffd060');burst(t.x,t.y,'#ffcf6a',40,5,5);shake(5);sfx('boom')}}
  W.traps=W.traps.filter(t=>!t.done&&t.life>0);
  for(const p of W.parts){p.life-=dt;if(!p.ring&&!p.arc){p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;p.z+=(p.vz||0)*dt;if(p.grav){p.vz-=p.grav*dt;if(p.z<0){p.z=0;p.vz*=-.3;p.vx*=.5;p.vy*=.5}}}}
  W.parts=W.parts.filter(p=>p.life>0);if(W.parts.length>700)W.parts.splice(0,W.parts.length-700);
  for(const t of W.texts){t.life-=dt;t.z+=45*dt}W.texts=W.texts.filter(t=>t.life>0);
  for(const b of W.beams)b.life-=dt;W.beams=W.beams.filter(b=>b.life>0);
  for(const l of W.loot)l.pop=Math.min(1,l.pop+dt*2.5);
  W.en=W.en.filter(e=>!e.dead||e.deadT<4.5);W.pets=W.pets.filter(p=>!p.dead);
  ambient(dt);
  G.shake*=.86;
  G.cam.x+=(P.x-G.cam.x)*Math.min(1,dt*9);G.cam.y+=(P.y-G.cam.y)*Math.min(1,dt*9);
  G.saveT=(G.saveT||0)+dt;if(G.saveT>15){G.saveT=0;saveGame()}
  G.revT=(G.revT||0)+dt;if(G.revT>.25){G.revT=0;reveal(P.x,P.y,11)}
}
function shotClear(a,b){const L=Math.hypot(b.x-a.x,b.y-a.y),n=Math.ceil(L/.3);for(let i=2;i<n;i++){const x=lerp(a.x,b.x,i/n),y=lerp(a.y,b.y,i/n);const p=propBlocks(x,y,.05);if(p&&p.r>.28&&p.kind!=='npc'&&p.kind!=='wp')return false}return true}
function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy;let t=l?((px-ax)*dx+(py-ay)*dy)/l:0;t=clamp(t,0,1);return Math.hypot(px-(ax+dx*t),py-(ay+dy*t))}
function inTown(x,y){return Math.hypot(x-W.start.x,y-W.start.y)<8.5}
function updatePlayer(dt){
  // timers
  for(const k in P.cd)if(P.cd[k]>0)P.cd[k]-=dt;
  for(const k in P.buffs){P.buffs[k]-=dt;if(P.buffs[k]<=0)delete P.buffs[k]}
  P.inv_t=Math.max(0,P.inv_t-dt);P.atkT-=dt;P.hurt=Math.max(0,P.hurt-dt);P.castT=Math.max(0,P.castT-dt);P.slowT=Math.max(0,P.slowT-dt);
  const town=inTown(P.x,P.y);heal(D.hpReg*dt*(town?6:1));P.mp=Math.min(D.maxMp,P.mp+D.mpReg*dt*(town?4:1));
  if(P.atk){P.atk.t+=dt;const k=P.atk.t/P.atk.dur;if(!P.atk.done&&k>=P.atk.hitAt){P.atk.done=true;resolveAttack(P.atk)}if(k>=1)P.atk=null}
  if(P.whirl){P.whirl.t-=dt;P.whirl.next-=dt;P.face=Math.sin(G.t*30)>0?1:-1;if(P.whirl.next<=0&&P.whirl.n>0){P.whirl.n--;P.whirl.next=.28;enemiesNear(P.x,P.y,2.2).forEach(e=>dealDmg(e,weaponRoll(P.whirl.mult),{weapon:true}));W.parts.push({arc:1,x:P.x,y:P.y,r:2.2,a:0,w:Math.PI*2,life:.22,max:.22,c:'#ffe0b0'});hitProps(P.x,P.y,2.2);sfx('swing')}if(P.whirl.t<=0)P.whirl=null}
  // movement input
  let ix=0,iy=0;
  if(keys.KeyW||keys.ArrowUp)iy-=1;if(keys.KeyS||keys.ArrowDown)iy+=1;if(keys.KeyA||keys.ArrowLeft)ix-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;
  if(joy.on){ix+=joy.x;iy+=joy.y}
  let mx=0,my=0;const spd=D.move*(P.slowT>0?.6:1);
  if(ix||iy){const wx=ix/2+iy,wy=iy-ix/2,l=Math.hypot(wx,wy);if(l>0){mx=wx/l*Math.min(1,Math.hypot(ix,iy));my=wy/l*Math.min(1,Math.hypot(ix,iy))}P.path=null;P.target=null;P.interact=null;P.pick=null}
  // held mouse → follow cursor
  if(G.mdown&&!G.mdownTarget&&!G.touch&&!(ix||iy)&&G.mx!==undefined){G.followT=(G.followT||0)-dt;if(G.followT<=0){G.followT=.18;goTo(G.mx,G.my)}}
  if(P.dash){moveEnt(P,P.dash.vx*dt,P.dash.vy*dt);P.dash.t-=dt;P.walk+=dt*22;
    for(const e of enemiesNear(P.x,P.y,.7))if(!P.dash.hit.has(e)){P.dash.hit.add(e);dealDmg(e,weaponRoll(P.dash.dmg),{stun:P.dash.stun,kb:.3,weapon:true})}
    if(P.dash.t<=0)P.dash=null;P.moving=true;finishMove(dt);return}
  if(P.castT>0||P.whirl){P.moving=false;finishMove(dt);return}
  // auto-attack target (also hold-attack on touch)
  if(touchAtk&&(!P.target||P.target.dead)){const e=nearestEnemy(P.x,P.y,9);if(e)P.target=e}
  const T=P.target;
  if(T&&!T.dead&&!(ix||iy)){
    const range=D.ranged?7.5:D.reach+T.r;const d=dist(P,T);
    if(d>range||(D.ranged&&d>1.2&&!shotClear(P,T))){P.repathT-=dt;const a=Math.atan2(T.y-P.y,T.x-P.x);
      if(lineClear(P,T)){mx=Math.cos(a);my=Math.sin(a);P.path=null}else if(P.repathT<=0||!P.path){P.repathT=.5;P.path=findPath(P.x,P.y,T.x,T.y)}}
    else{P.path=null;faceTo(T.x,T.y);if(P.atkT<=0&&!P.atk)startAttack(T)}
  }else if(T&&T.dead)P.target=null;
  if(G.shiftAtk&&P.atkT<=0&&!P.atk&&!G.touch){startAttack(null,G.mx,G.my)}
  // path following
  if(P.path&&P.path.length&&!mx&&!my){const n=P.path[0],dx=n.x-P.x,dy=n.y-P.y,d=Math.hypot(dx,dy);if(d<.15){P.path.shift();if(!P.path.length)P.path=null}else{mx=dx/d;my=dy/d}}
  if(mx||my){const ox=P.x,oy=P.y;moveEnt(P,mx*spd*dt,my*spd*dt);P.moving=Math.hypot(P.x-ox,P.y-oy)>spd*dt*.2;faceTo(P.x+mx,P.y+my);P.walk+=dt*spd*2.6;
    if(!P.moving&&P.path){P.path.shift();if(!P.path.length)P.path=null}
    P.stepT-=dt;if(P.stepT<=0){P.stepT=.32;sfx('step');if(!['abyss'].includes(W.A.voidK))W.parts.push({x:P.x,y:P.y,z:1,vx:0,vy:0,vz:8,life:.5,max:.5,c:'rgba(200,190,160,.5)',sz:4})}}
  else P.moving=false;
  finishMove(dt);
}
function finishMove(dt){
  // interactions
  if(P.interact){const o=P.interact;if(Math.hypot(o.x-P.x,o.y-P.y)<1.6){P.path=null;interactWith(o);P.interact=null}}
  if(P.pick){const l=P.pick;if(!W.loot.includes(l))P.pick=null;else if(Math.hypot(l.x-P.x,l.y-P.y)<.9){pickUp(l,true);P.pick=null;P.path=null}}
  for(const l of W.loot){if(l.got)continue;const d=Math.hypot(l.x-P.x,l.y-P.y);if(d<.7&&l.pop>=1)pickUp(l,false)}
  W.loot=W.loot.filter(l=>!l.got);
  for(const p of propsNear(P.x,P.y)){if(p.kind==='chest'&&!p.open&&Math.hypot(p.x-P.x,p.y-P.y)<1.3)openChest(p);
    if(p.kind==='wp'&&!p.ref.on&&Math.hypot(p.x-P.x,p.y-P.y)<1.8){p.ref.on=true;(P.wp[P.actId]=P.wp[P.actId]||[]).push(p.ref.id);toast('Обелиск пробуждён: '+p.ref.name);sfx('portal');saveGame()}}
  if(W.portal){W.portal.t+=G.dt||.016;if(Math.hypot(W.portal.x-P.x,W.portal.y-P.y)<1)nextAct()}
}
function pickUp(l,manual){
  if(l.type==='gold'){const g=Math.round(l.amt*D.gold);P.gold+=g;txt(l.x,l.y,'+'+g+' з.','#ffd34d',false,30);sfx('gold');l.got=true}
  else if(l.type==='potH'||l.type==='potM'){P[l.type]=Math.min(30,P[l.type]+1);txt(l.x,l.y,l.type==='potH'?'+ зелье здоровья':'+ зелье энергии',l.type==='potH'?'#ff8a7a':'#8ab0ff',false,30);sfx('potion');l.got=true}
  else if(P.inv.length<40){P.inv.push(l.item);l.got=true;sfx('loot1');const better=itemScore(l.item)>itemScore(P.eq[slotFor(l.item)]);toast('<span style="color:'+RAR[l.item.rar].c+'">'+esc(l.item.name)+'</span>'+(better&&!canEquip(l.item)?' <span class="up">▲ лучше надетого</span>':''))}
  else if(manual||!G.fullT||G.t-G.fullT>4){G.fullT=G.t;toast('Сумка полна. Продайте лишнее торговцу или выбросьте')}
}
function openChest(p){p.open=true;sfx('chest');const lv=W.en.length?Math.max(1,Math.round(1+campaign().findIndex(a=>a.id===P.actId)*3+DIFF[P.diff].lvl+1)):P.lvl;
  const n=randi(1,3);for(let i=0;i<n;i++)dropItem(p.x+rand(-1,1),p.y+rand(.3,1.2),lv,.08);dropGold(p.x,p.y+.8,Math.round((10+lv*5)*rand(.8,1.5)));burst(p.x,p.y,'#ffd34d',20,3,20)}
function interactWith(o){
  if(o.kind==='merchant'){openPanel('shop')}
  else if(o.kind==='oracle'){openPanel('oracle')}
  else if(o.kind==='wp'){openPanel('travel')}
}
function goTo(x,y){P.target=null;P.pick=null;if(lineClear(P,{x,y})&&canStand(x,y,.25))P.path=[{x,y}];else P.path=findPath(P.x,P.y,x,y)}
function nearInteract(){
  let best=null,bd=2.2;
  for(const n of W.npcs){const d=Math.hypot(n.x-P.x,n.y-P.y);if(d<bd){bd=d;best={o:n,label:n.kind==='merchant'?'Торговать':'Оракул'}}}
  for(const w of W.wps){if(!w.on)continue;const d=Math.hypot(w.x-P.x,w.y-P.y);if(d<bd){bd=d;best={o:Object.assign({kind:'wp'},w),label:'Обелиск: телепорт'}}}
  return best;
}
function updatePets(dt){
  for(const p of W.pets){p.flash=Math.max(0,p.flash-dt);p.atk-=dt;p.atkAnim=Math.max(0,p.atkAnim-dt*3);
    let t=p.tgt;if(!t||t.dead||dist(t,P)>10){t=null;let bd=7;for(const e of W.en){if(e.dead)continue;const d=dist(e,p);if(d<bd&&dist(e,P)<9){bd=d;t=e}}p.tgt=t}
    let mx=0,my=0;
    if(t){const d=dist(p,t);if(d>p.r+t.r+.35){mx=(t.x-p.x)/d;my=(t.y-p.y)/d}else if(p.atk<=0){p.atk=1;p.atkAnim=1;setTimeout(()=>{if(!t.dead&&W)dealDmg(t,p.dmg*rand(.9,1.1),{nocrit:true,c:'#bfefff'})},200)}}
    else{const d=dist(p,P);if(d>1.8){mx=(P.x-p.x)/d;my=(P.y-p.y)/d}if(d>12){p.x=P.x+.8;p.y=P.y+.5}}
    if(mx||my){moveEnt(p,mx*p.spd*dt,my*p.spd*dt);p.walk+=dt*10;p.moving=true;p.face=isoX(mx,my)>0?1:-1}else p.moving=false;
    if(t)p.face=isoX(t.x-p.x,t.y-p.y)>0?1:-1;
  }
}
function updateEnemies(dt){
  const act=W.en.filter(e=>!e.dead&&Math.abs(e.x-P.x)+Math.abs(e.y-P.y)<30);
  for(const e of W.en){
    if(e.dead){e.deadT+=dt;continue}
    if(Math.abs(e.x-P.x)+Math.abs(e.y-P.y)>30)continue;
    e.flash=Math.max(0,e.flash-dt);e.atkAnim=Math.max(0,e.atkAnim-dt*2.6);
    if(e.poisonT>0){e.poisonT-=dt;e.pT=(e.pT||0)+dt;if(e.pT>=.5){e.pT=0;dealDmg(e,e.poison*.5,{nocrit:true,c:'#8aff6a'});if(e.dead)continue}}
    if(e.slowT>0){e.slowT-=dt;if(e.slowT<=0)e.slow=1}
    if(e.pend){e.pend.t-=dt;if(e.pend.t<=0){const tg=e.pend.tgt;e.pend=null;if(tg&&!tg.dead&&dist(e,tg)<e.r+tg.r+.9){if(tg===P)hurtPlayer(e.dmg,e);else hurtPet(tg,e.dmg)}}}
    if(e.stun>0){e.stun-=dt;e.moving=false;continue}
    // target
    const cands=[];if(G.state==='play'&&!inTown(P.x,P.y))cands.push(P);for(const p of W.pets)cands.push(p);
    let tgt=null,td=e.aggro?14:(e.boss?10:7.5);for(const c of cands){const d=dist(e,c);if(d<td){td=d;tgt=c}}
    if(tgt&&!e.aggro){e.aggro=true;if(e.boss&&!e.roared){e.roared=true;sfx('boss');banner(e.T.n,'Битва с боссом')}}
    e.tgt=tgt;e.atk-=dt;
    if(e.aff.includes('fire')&&tgt===P&&td<1.6){e.fireT=(e.fireT||0)-dt;if(e.fireT<=0){e.fireT=.5;hurtPlayer(e.dmg*.15,e)}}
    if(!tgt){e.aggro=false;const dh=Math.hypot(e.hx-e.x,e.hy-e.y);
      if(dh>14){e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.2*dt)}
      e.wander-=dt;if(e.wander<=0){e.wander=rand(2,5);e.wx=e.hx+rand(-2.5,2.5);e.wy=e.hy+rand(-2.5,2.5);if(dh>6){e.wx=e.hx;e.wy=e.hy}}
      if(e.wx!==undefined){const dx=e.wx-e.x,dy=e.wy-e.y,d=Math.hypot(dx,dy);if(d>.2){moveEnt(e,dx/d*e.spd*.35*dt,dy/d*e.spd*.35*dt);e.walk+=dt*4;e.moving=true;e.face=isoX(dx,dy)>0?1:-1}else e.moving=false}
      if(e.boss)$('#bossbar').hidden=true;
      continue}
    const dx=tgt.x-e.x,dy=tgt.y-e.y,d=Math.hypot(dx,dy)||.01;e.face=isoX(dx,dy)>0?1:-1;
    if(e.boss){$('#bossbar').hidden=false;$('#bossName').textContent=e.T.n+' · ур. '+e.lvl;$('#bossFill').style.width=(e.hp/e.maxHp*100)+'%';
      if(e.phase===1&&e.hp<e.maxHp*.5){e.phase=2;banner(e.T.n+' в ярости','Атаки босса стали чаще');sfx('boss')}
      if(bossAI(e,dt,d,dx,dy,tgt))continue}
    let mx=0,my=0;const sp=e.spd*e.slow;
    if(e.T.ranged){
      if(d>6){mx=dx/d;my=dy/d}else if(d<3.2){mx=-dx/d;my=-dy/d}
      if(e.atk<=0&&d<9){e.atk=rand(1.6,2.3);e.atkAnim=1;const a=Math.atan2(dy,dx);setTimeout(()=>{if(e.dead||!W)return;W.proj.push({owner:'e',x:e.x+Math.cos(a)*.3,y:e.y+Math.sin(a)*.3,z:e.fly?50:40,vx:Math.cos(a)*7.5,vy:Math.sin(a)*7.5,dmg:e.dmg,life:2.2,r:.22,c:e.T.pc||'#fff',kind:'orb',src:e})},180)}
    }else{
      if(d>e.r+tgt.r+.45){mx=dx/d;my=dy/d}
      else if(e.atk<=0){e.atk=rand(1.2,1.6);e.atkAnim=1;e.pend={t:.26,tgt}}
    }
    for(const o of act){if(o===e||o.dead)continue;const ox=e.x-o.x,oy=e.y-o.y,od=Math.hypot(ox,oy),m=e.r+o.r;if(od<m&&od>0){mx+=ox/od*.7;my+=oy/od*.7}}
    if(mx||my){moveEnt(e,mx*sp*dt,my*sp*dt);e.walk+=dt*sp*2.8;e.moving=true}else e.moving=false;
  }
}
function bossAI(e,dt,d,dx,dy,tgt){
  if(e.mode==='charge'){e.mt-=dt;if(e.mt>.55){e.moving=false;return true}
    moveEnt(e,e.cvx*dt,e.cvy*dt);e.walk+=dt*20;e.moving=true;if(Math.hypot(P.x-e.x,P.y-e.y)<e.r+.5&&!e.chit){e.chit=true;hurtPlayer(e.dmg*1.5,e);shake(8)}
    if(e.mt<=0)e.mode=null;return true}
  e.abT-=dt*(e.phase===2?1.45:1);
  if(e.abT<=0){const ab=pick(e.T.abil);e.abT=rand(3,4.2);e.atkAnim=1;
    if(ab==='burst'){const n=e.phase===2?18:13,off=rand(0,1);for(let i=0;i<n;i++){const a=i/n*Math.PI*2+off;W.proj.push({owner:'e',x:e.x,y:e.y,z:50,vx:Math.cos(a)*5.5,vy:Math.sin(a)*5.5,dmg:e.dmg*.8,life:3.2,r:.3,c:e.T.pc||'#ff7a5a',kind:'orb',src:e})}sfx('fire')}
    if(ab==='slam'){for(let i=0;i<(e.phase===2?4:3);i++){const ox=i?rand(-3,3):0,oy=i?rand(-3,3):0;W.zones.push({x:tgt.x+ox,y:tgt.y+oy,r:i?1.6:2.2,t:1.15,max:1.15,dmg:e.dmg*1.3,owner:'e',c:'#ff5a3a',src:e})}}
    if(ab==='summon'){const alive=W.en.filter(m=>m.minion&&!m.dead).length;if(alive<8){for(let i=0;i<3;i++){let mx=e.x+rand(-2,2),my=e.y+rand(-2,2);if(!canStand(mx,my,.3)){mx=e.x;my=e.y}const m=spawn(e.T.minion,mx,my,Math.max(1,e.lvl-2));m.minion=true;m.aggro=true;m.hx=W.bossPos.x;m.hy=W.bossPos.y;burst(m.x,m.y,'#a080ff',12,3,20)}sfx('summon')}}
    if(ab==='charge'){e.mode='charge';e.mt=1.15;e.chit=false;const a=Math.atan2(dy,dx);e.cvx=Math.cos(a)*11;e.cvy=Math.sin(a)*11;toast(e.T.n+' готовится к рывку!')}
    if(ab==='gaze'){const a=Math.atan2(dy,dx);W.zones.push({kind:'line',x:e.x,y:e.y,ang:a,len:12,w:.8,t:.9,max:.9,dmg:e.dmg*1.6,owner:'e',c:e.T.pc||'#b6ff7a',src:e})}
    return true}
  return false;
}
function updateProj(dt){
  for(const p of W.proj){
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.age=(p.age||0)+dt;
    const pr=p.age>.12&&propBlocks(p.x,p.y,.05);if(pr&&pr.kind!=='npc'){if(pr.kind==='amphora'&&p.owner==='p'){breakAmphora(pr)}else if(pr.r>.28&&pr.kind!=='wp'){p.life=0;if(p.aoe)explode(p);burst(p.x,p.y,p.c,4,2,p.z);continue}}
    if(p.owner==='p'){for(const e of W.en){if(e.dead||p.hit.has(e))continue;if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r){p.hit.add(e);if(p.aoe){explode(p);p.life=0;break}
          dealDmg(e,p.dmg,{poison:p.poison,c:p.poison?'#8aff6a':null,weapon:p.weapon});if(!p.pierce){p.life=0;break}}}}
    else{const tg=[P,...W.pets];for(const t of tg){if(t===P&&G.state!=='play')continue;if(Math.hypot(t.x-p.x,t.y-p.y)<.32+p.r){if(t===P)hurtPlayer(p.dmg,p.src);else hurtPet(t,p.dmg);p.life=0;burst(p.x,p.y,p.c,6,2,p.z);break}}}
    if(p.kind==='fire'&&Math.random()<.6)W.parts.push({x:p.x,y:p.y,z:p.z,vx:0,vy:0,vz:10,life:.35,max:.35,c:Math.random()<.5?'#ffb040':'#ff5a1a',sz:4});
  }
  W.proj=W.proj.filter(p=>{if(p.life<=0&&p.aoe&&!p.exp)explode(p);return p.life>0});
}
function explode(p){if(p.exp)return;p.exp=true;enemiesNear(p.x,p.y,p.aoe).forEach(e=>dealDmg(e,p.dmg,{c:'#ffb070'}));hitProps(p.x,p.y,p.aoe);burst(p.x,p.y,'#ff8a2a',26,4,p.z);ring(p.x,p.y,p.aoe,'#ffb060');sfx('boom')}
function ambient(dt){
  const A=W.A,k=A.amb;G.ambT=(G.ambT||0)+dt;if(G.ambT<.05)return;G.ambT=0;
  const x=P.x+rand(-10,10),y=P.y+rand(-10,10);
  const map={dust:['rgba(255,240,200,.5)',-4,2],sand:['rgba(230,200,140,.6)',-30,2],petal:['#ffb0c8',-6,3],sparkle:['#fff8d0',8,2],snow:['#ffffff',-25,3],bubble:['rgba(180,240,255,.6)',22,3],ember:['#ff8a3a',20,2]};
  const m=map[k];if(!m)return;W.parts.push({x,y,z:k==='snow'?120:k==='bubble'||k==='ember'?0:rand(10,80),vx:k==='sand'?2:rand(-.3,.3),vy:k==='sand'?-1:rand(-.3,.3),vz:m[1],life:3,max:3,c:m[0],sz:m[2],amb:1});
}

/* ---------- act flow ---------- */
function nextAct(){const list=campaign(),i=list.findIndex(a=>a.id===P.actId);sfx('portal');
  if(i<0||i>=list.length-1){victory();return}P.actId=list[i+1].id;startAct()}
function startAct(){genAct();makeTex(W.A);recalc();P.hp=D.maxHp;P.mp=D.maxMp;W.pets=[];
  const A=curAct();banner(A.tag+' · '+A.name,A.intro);$('#bossbar').hidden=true;audioInit();startMusic(A.mode,A.root);saveGame()}
function saveGame(){if(!P||!W)return;const s={};SAVEKEYS.forEach(k=>s[k]=P[k]);store.set('aoo2_save',s)}
function loadGame(){const s=store.get('aoo2_save',null);if(!s||!s.mast)return false;P=Object.assign({},s);initRuntime();
  const ids=[...P.inv,...Object.values(P.eq)].filter(Boolean).map(i=>i.id);ITEMID=(ids.length?Math.max(...ids):0)+1;recalc();return true}
