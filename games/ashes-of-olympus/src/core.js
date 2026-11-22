/* ============================ CORE ============================ */
const $=s=>document.querySelector(s);
const app=$('#app'),cv=$('#cv'),ctx=cv.getContext('2d');
const rand=(a,b)=>a+Math.random()*(b-a),randi=(a,b)=>Math.floor(rand(a,b+1)),pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angDiff=(a,b)=>{let d=a-b;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function shade(hex,amt){const n=parseInt(hex.slice(1,7),16);let r=(n>>16)+amt,g=(n>>8&255)+amt,b=(n&255)+amt;return'#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('')}
function rgba(hex,a){const n=parseInt(hex.slice(1,7),16);return`rgba(${n>>16},${n>>8&255},${n&255},${a})`}

let S=Object.assign({dlc:{north:true,atlantis:true,underworld:true},sfx:.7,music:.4,dmgnums:true,labels:true},store.get('aoo2_settings',{}));
function saveSettings(){store.set('aoo2_settings',S)}
let UNL=store.get('aoo_costumes',['classic']);if(!UNL.includes('classic'))UNL.push('classic');
let BEATEN=store.get('aoo_beaten',false);
function unlock(id){if(!UNL.includes(id)){UNL.push(id);store.set('aoo_costumes',UNL)}}

/* ---------- iso projection: world in tiles, screen px = 64x32 diamonds ---------- */
const TW=32,TH=16; // half sizes
const isoX=(x,y)=>(x-y)*TW,isoY=(x,y)=>(x+y)*TH;

/* ============================ AUDIO ============================ */
const AU={ctx:null,sfxG:null,musG:null,noise:null,mus:null};
function audioInit(){
  try{
    if(!AU.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;AU.ctx=new C();
      const comp=AU.ctx.createDynamicsCompressor();comp.connect(AU.ctx.destination);
      AU.sfxG=AU.ctx.createGain();AU.sfxG.connect(comp);AU.musG=AU.ctx.createGain();AU.musG.connect(comp);
      const b=AU.ctx.createBuffer(1,AU.ctx.sampleRate,AU.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AU.noise=b;applyVolumes()}
    if(AU.ctx.state==='suspended')AU.ctx.resume();
  }catch(e){}
}
function applyVolumes(){if(!AU.ctx)return;AU.sfxG.gain.value=S.sfx*.55;AU.musG.gain.value=S.music*.5}
function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec)}
function tone(f,dur,type='sine',vol=.3,f2=null,delay=0,dest){
  if(!AU.ctx||!S.sfx&&!dest)return;const t=AU.ctx.currentTime+delay,o=AU.ctx.createOscillator(),g=AU.ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);
  env(g,t,.008,vol,dur);o.connect(g);g.connect(dest||AU.sfxG);o.start(t);o.stop(t+dur+.05)}
function noiseHit(dur,vol,freq,type='lowpass',q=1,delay=0,f2){
  if(!AU.ctx||!S.sfx)return;const t=AU.ctx.currentTime+delay,s=AU.ctx.createBufferSource(),f=AU.ctx.createBiquadFilter(),g=AU.ctx.createGain();
  s.buffer=AU.noise;f.type=type;f.frequency.setValueAtTime(freq,t);if(f2)f.frequency.exponentialRampToValueAtTime(f2,t+dur);f.Q.value=q;
  env(g,t,.005,vol,dur);s.connect(f);f.connect(g);g.connect(AU.sfxG);s.start(t,Math.random()*.5);s.stop(t+dur+.05)}
const sfxLast={};
function sfx(n){
  if(!AU.ctx||!S.sfx)return;const now=AU.ctx.currentTime;if(sfxLast[n]&&now-sfxLast[n]<.045)return;sfxLast[n]=now;
  switch(n){
    case'swing':noiseHit(.12,.25,1800,'bandpass',1.2,0,600);break;
    case'hit':tone(150,.12,'sine',.35,60);noiseHit(.08,.25,900);break;
    case'crit':tone(220,.18,'square',.12,80);noiseHit(.14,.35,1400);break;
    case'arrow':noiseHit(.16,.18,3000,'bandpass',4,0,1200);break;
    case'bolt':tone(660,.18,'triangle',.12,1320);break;
    case'fire':noiseHit(.45,.3,700,'lowpass',.8,0,200);tone(90,.3,'sawtooth',.06,50);break;
    case'zap':for(let i=0;i<4;i++)tone(rand(800,2200),.05,'square',.06,rand(200,600),i*.03);break;
    case'boom':noiseHit(.7,.5,400,'lowpass',1,0,60);tone(70,.5,'sine',.5,30);break;
    case'hurt':tone(110,.15,'square',.1,70);noiseHit(.1,.2,500);break;
    case'die':tone(300,.4,'sawtooth',.06,60);noiseHit(.25,.15,600);break;
    case'gold':tone(1568,.08,'triangle',.12);tone(2093,.12,'triangle',.1,null,.05);break;
    case'potion':tone(400,.25,'sine',.15,900);tone(600,.25,'sine',.1,1200,.08);break;
    case'level':[523,659,784,1047].forEach((f,i)=>tone(f,.35,'triangle',.15,null,i*.09));break;
    case'loot1':tone(880,.2,'triangle',.1);break;
    case'loot2':tone(880,.25,'triangle',.12);tone(1320,.3,'triangle',.1,null,.08);break;
    case'loot3':[880,1108,1320,1760].forEach((f,i)=>tone(f,.4,'triangle',.11,null,i*.07));break;
    case'click':tone(900,.05,'square',.04);break;
    case'portal':tone(200,.8,'sine',.12,800);tone(300,.8,'triangle',.08,1200,.1);break;
    case'step':noiseHit(.05,.05,300);break;
    case'chest':tone(300,.1,'square',.08,200);[660,880,1320].forEach((f,i)=>tone(f,.3,'triangle',.1,null,.1+i*.06));break;
    case'break':noiseHit(.2,.3,2500,'highpass',1);tone(400,.08,'square',.05,200);break;
    case'cry':tone(140,.5,'sawtooth',.12,90);noiseHit(.5,.15,400);break;
    case'heal':[440,554,659,880].forEach((f,i)=>tone(f,.5,'sine',.1,null,i*.05));break;
    case'summon':tone(110,.9,'sawtooth',.08,330);tone(165,.9,'sine',.1,440,.1);break;
    case'boss':tone(55,1.5,'sawtooth',.15,40);tone(82,1.5,'square',.06,60);break;
  }
}
const MODES={dorian:[0,2,3,5,7,9,10],hijaz:[0,1,4,5,7,8,10],penta:[0,2,4,7,9],lydian:[0,2,4,6,7,9,11],aeolian:[0,2,3,5,7,8,10],locrian:[0,1,3,5,6,8,10]};
function startMusic(mode,root){
  if(!AU.ctx)return;stopMusic();const c=AU.ctx,out=c.createGain();out.gain.value=0;out.connect(AU.musG);out.gain.linearRampToValueAtTime(1,c.currentTime+3);
  const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=420;lp.connect(out);
  const oscs=[];[[root/2,'sawtooth',.05],[root/2*1.004,'sawtooth',.05],[root*.75,'triangle',.05]].forEach(([f,t,v])=>{const o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;o.connect(g);g.connect(lp);o.start();oscs.push(o)});
  const lfo=c.createOscillator(),lg=c.createGain();lfo.frequency.value=.07;lg.gain.value=180;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();oscs.push(lfo);
  const sc=MODES[mode]||MODES.dorian;let next=c.currentTime+1,step=0;
  const timer=setInterval(()=>{if(!AU.ctx)return;while(next<c.currentTime+.6){
      if(Math.random()<.62){const deg=sc[randi(0,sc.length-1)]+(Math.random()<.3?12:0),f=root*Math.pow(2,deg/12);
        const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=f;env(g,next,.01,.09,1.6);o.connect(g);g.connect(out);o.start(next);o.stop(next+1.8);
        if(step%8===0){const o2=c.createOscillator(),g2=c.createGain();o2.type='sine';o2.frequency.value=f/2;env(g2,next,.05,.08,2.4);o2.connect(g2);g2.connect(out);o2.start(next);o2.stop(next+2.6)}}
      if(step%16===0){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(90,next);o.frequency.exponentialRampToValueAtTime(40,next+.3);env(g,next,.005,.12,.35);o.connect(g);g.connect(out);o.start(next);o.stop(next+.5)}
      step++;next+=rand(.32,.5)}},200);
  AU.mus={out,oscs,timer};
}
function stopMusic(){const m=AU.mus;if(!m||!AU.ctx)return;clearInterval(m.timer);const t=AU.ctx.currentTime;m.out.gain.cancelScheduledValues(t);m.out.gain.setValueAtTime(m.out.gain.value,t);m.out.gain.linearRampToValueAtTime(0,t+1);m.oscs.forEach(o=>{try{o.stop(t+1.1)}catch(e){}});AU.mus=null}
