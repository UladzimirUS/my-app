/* ============================ UI ============================ */
const keys={};const joy={x:0,y:0,on:false};let touchAtk=false;

/* ---------- HUD ---------- */
function updateHud(){
  $('#hpFill').style.height=(P.hp/D.maxHp*100)+'%';$('#hpTxt').textContent=Math.ceil(P.hp)+'/'+D.maxHp;
  $('#mpFill').style.height=(P.mp/D.maxMp*100)+'%';$('#mpTxt').textContent=Math.floor(P.mp)+'/'+D.maxMp;
  $('#hpBar').style.width=(P.hp/D.maxHp*100)+'%';$('#hpTxt2').textContent=Math.ceil(P.hp)+' / '+D.maxHp;
  $('#mpBar').style.width=(P.mp/D.maxMp*100)+'%';$('#mpTxt2').textContent=Math.floor(P.mp)+' / '+D.maxMp;
  $('#clsName').textContent=className();
  $('#lvlTxt').textContent='Ур. '+P.lvl+' · '+P.gold+' з. · '+curAct().name+(P.diff?' · '+DIFF[P.diff].n:'');
  $('#xpFill').style.width=(P.xp/xpNeed(P.lvl)*100)+'%';
  const bf=[];if(P.buffs.warcry)bf.push('Клич '+Math.ceil(P.buffs.warcry));if(P.buffs.bulwark)bf.push('Стена '+Math.ceil(P.buffs.bulwark));if(P.buffs.venom)bf.push('Яд '+Math.ceil(P.buffs.venom));if(inTown(P.x,P.y))bf.push('Город: отдых');
  const bh=bf.map(b=>'<i>'+b+'</i>').join('');if(G.lastBuffs!==bh){G.lastBuffs=bh;$('#buffs').innerHTML=bh}
  for(let i=0;i<8;i++){const el=G.slots[i+1];if(!el)continue;const id=P.bar[i];if(!id){el.classList.add('empty');continue}el.classList.remove('empty');
    const s=SK[id];el.querySelector('.ic').textContent=s.ic;el.style.setProperty('--mc',MAST[s.m].color);el.title=s.n;
    el.querySelector('.cd').style.setProperty('--p',Math.max(0,(P.cd[id]||0)/(s.cd*(1-D.cdr))));el.querySelector('.n').textContent=slv(id);el.classList.toggle('nomana',P.mp<s.mana+slv(id)*1.5)}
  G.slots[9].querySelector('.n').textContent=P.potH;G.slots[10].querySelector('.n').textContent=P.potM;
  const t=(G.hover&&!G.hover.dead)?G.hover:(P.target&&!P.target.dead&&!P.target.boss?P.target:null);
  const tg=$('#tgt');if(t&&!t.boss){tg.hidden=false;$('#tgtName').textContent=(t.named||((t.affN?t.affN.join(' ')+' ':'')+t.T.n));$('#tgtName').style.color=t.named?'#ff9a3a':t.champ?'#ffd34d':'#efe7d6';$('#tgtSub').textContent='Уровень '+t.lvl+(t.champ?' · чемпион':'');$('#tgtFill').style.width=(t.hp/t.maxHp*100)+'%'}else tg.hidden=true;
  const ni=nearInteract();const act=$('#act');
  if(W.portal&&Math.hypot(W.portal.x-P.x,W.portal.y-P.y)<4){act.hidden=false;act.textContent='Войти в портал';G.actObj={kind:'portal'}}
  else if(ni){act.hidden=false;act.innerHTML=esc(ni.label)+(G.touch?'':' <kbd>F</kbd>');G.actObj=ni.o}else{act.hidden=true;G.actObj=null}
  const dot=(n,t2)=>t2+(n?' <span class="dot">+'+n+'</span>':'');
  setBtn('#bInv',dot(0,'Снаряжение')+(P.inv.some(i=>!canEquip(i)&&itemScore(i)>itemScore(P.eq[slotFor(i)]))?' <span class="dot">▲</span>':'')+' <kbd>I</kbd>');
  setBtn('#bChar',dot(P.attrPts,'Герой')+' <kbd>C</kbd>');setBtn('#bSk',dot(P.skillPts,'Умения')+(P.lvl>=6&&!P.mast[1]?' <span class="dot">!</span>':'')+' <kbd>K</kbd>');
}
function setBtn(s,h){const e=$(s);if(e._h!==h){e._h=h;e.innerHTML=h}}
function buildSkillbar(){
  const sb=$('#skillbar');sb.innerHTML='';G.slots=[];
  const mk=(cls,k,fn,hold)=>{const el=document.createElement('div');el.className='slot '+cls;el.innerHTML='<span class="ic"></span><span class="k">'+k+'</span><span class="n"></span><span class="cd"></span>';
    if(hold){el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();touchAtk=true});['pointerup','pointercancel','pointerleave'].forEach(ev=>el.addEventListener(ev,()=>touchAtk=false))}
    else el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();audioInit();fn()});sb.appendChild(el);G.slots.push(el);return el};
  const a=mk('atk','',null,true);a.querySelector('.ic').textContent='⚔︎';
  for(let i=0;i<8;i++)mk('',G.touch?'':String(i+1),()=>castSkill(i));
  const h=mk('pot',G.touch?'':'Q',()=>drinkPotion('h'));h.style.setProperty('--pc','radial-gradient(circle at 40% 35%,#ff7a6a,#9a1a12)');
  const m=mk('pot',G.touch?'':'E',()=>drinkPotion('m'));m.style.setProperty('--pc','radial-gradient(circle at 40% 35%,#8ab0ff,#1a3a9a)');
  if(G.touch){for(let i=7;i>=6;i--)G.slots[i+1].hidden=true}
}
function toast(html){if(html===G.lastToast&&G.t-G.lastToastT<1.2)return;G.lastToast=html;G.lastToastT=G.t;const t=document.createElement('div');t.className='toast';t.innerHTML=html;const box=$('#toasts');box.appendChild(t);while(box.children.length>4)box.firstChild.remove();setTimeout(()=>t.remove(),2900)}
function banner(a,b){const el=$('#banner');el.classList.remove('show');void el.offsetWidth;el.innerHTML='<b>'+esc(a)+'</b>'+(b?'<span>'+esc(b)+'</span>':'');el.classList.add('show')}

/* ---------- screens ---------- */
function showScreen(html){const s=$('#screen');s.hidden=false;s.innerHTML=html;s.scrollTop=0}
function hideScreen(){$('#screen').hidden=true;$('#screen').innerHTML='';$('#screen').classList.remove('dim')}
function mainMenu(){
  G.state='menu';$('#hud').hidden=true;$('#panel').hidden=true;G.panel=null;G.paused=false;stopMusic();
  const has=!!store.get('aoo2_save',null);
  showScreen(`<div class="wrap menu"><div class="logo">Пепел Олимпа<small>мифологическая action-RPG</small></div>
  <div class="menu-list">
    ${has?'<button class="btn primary" id="mCont">Продолжить</button>':''}
    <button class="btn ${has?'':'primary'}" id="mNew">Новый герой</button>
    <button class="btn" id="mCos">Костюмы и коды</button>
    <button class="btn" id="mDlc">Дополнения</button>
    <button class="btn" id="mSet">Настройки</button>
    <button class="btn" id="mHelp">Как играть</button>
  </div><p class="eyebrow">Открыто костюмов: ${UNL.length} из ${Object.keys(COSTUMES).length}</p></div>`);
  if(has)$('#mCont').onclick=()=>{audioInit();if(loadGame())enterGame(false)};
  $('#mNew').onclick=()=>{audioInit();newGameScreen()};$('#mCos').onclick=()=>showCostumes(mainMenu);$('#mDlc').onclick=dlcScreen;$('#mHelp').onclick=helpScreen;$('#mSet').onclick=()=>settingsScreen(mainMenu);
}
let NG={m:'war',cos:'classic'};
function newGameScreen(){
  const mc=Object.entries(MAST).map(([id,m])=>`<button class="card mcard ${NG.m===id?'sel':''}" style="--mc:${m.color}" data-m="${id}" type="button"><canvas data-prev="${id}"></canvas><h3 style="color:${m.color}">${m.name}</h3><p>${m.desc}</p><span class="sk">${m.skills.map(s=>SK[s].n).join(' · ')}</span></button>`).join('');
  const cos=Object.entries(COSTUMES).filter(([id])=>UNL.includes(id)).map(([id,c])=>`<button class="cos ${NG.cos===id?'sel':''}" data-cos="${id}" type="button"><canvas data-cprev="${id}"></canvas>${c.name}</button>`).join('');
  showScreen(`<div class="wrap">
    <div class="sec-title"><h2>Новый герой</h2><button class="btn small" id="ngBack">Назад</button></div>
    <div class="eyebrow">1 · Первая мастерия. Вторую выберете на 6 уровне: из пары получится класс, например Страж или Некромант</div><div class="grid">${mc}</div>
    <div class="sec-title"><div class="eyebrow">2 · Костюм</div><button class="btn small" id="ngCos">Открыть костюмы (код или бесплатно)</button></div>
    <div class="costumes">${cos}</div>
    <div class="eyebrow">3 · Дополнения в кампании</div>
    <div class="row">${Object.entries(DLC).map(([id,d])=>`<label class="toggle"><input type="checkbox" id="dlc_${id}" ${S.dlc[id]?'checked':''}> ${d.name}</label>`).join('')}</div>
    <div class="row"><button class="btn primary" id="ngGo">Начать путь</button><span class="eyebrow" id="ngInfo"></span></div></div>`);
  document.querySelectorAll('[data-prev]').forEach(c=>{const m=MAST[c.dataset.prev];heroPreview(c,NG.cos,m.start,!!m.shield)});
  document.querySelectorAll('[data-cprev]').forEach(c=>heroPreview(c,c.dataset.cprev,MAST[NG.m].start,!!MAST[NG.m].shield));
  document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{sfx('click');NG.m=b.dataset.m;newGameScreen()});
  document.querySelectorAll('[data-cos]').forEach(b=>b.onclick=()=>{sfx('click');NG.cos=b.dataset.cos;newGameScreen()});
  const info=()=>{$('#ngInfo').textContent='Актов в кампании: '+campaign().length};info();
  Object.keys(DLC).forEach(id=>$('#dlc_'+id).onchange=e=>{S.dlc[id]=e.target.checked;saveSettings();info()});
  $('#ngBack').onclick=mainMenu;$('#ngCos').onclick=()=>showCostumes(newGameScreen);
  $('#ngGo').onclick=()=>{if(store.get('aoo2_save',null)&&!NG.confirm){NG.confirm=true;$('#ngGo').textContent='Сохранение будет перезаписано. Нажмите ещё раз';return}NG.confirm=false;newHero(NG.m,NG.cos);enterGame(true)};
}
function normCode(s){return s.trim().toUpperCase().replace(/Ё/g,'Е').replace(/\s+/g,'')}
function showCostumes(back){
  const cards=Object.entries(COSTUMES).filter(([id,c])=>!c.secret||UNL.includes(id)).map(([id,c])=>{const own=UNL.includes(id);let a;
    if(own)a='<span class="pill on">Открыт</span>';else if(c.reward)a=BEATEN?`<button class="btn small primary" data-free="${id}">Забрать награду</button>`:'<span class="pill">Пройдите кампанию или введите код</span>';else a=`<button class="btn small" data-free="${id}">Открыть без кода</button>`;
    return `<div class="card"><canvas data-cprev="${id}"></canvas><h3>${c.name}</h3><p>${c.desc}</p><div class="bonus">${c.bonus}</div><div class="row">${a}</div></div>`}).join('');
  const hidden=!UNL.includes('phoenix');
  showScreen(`<div class="wrap"><div class="sec-title"><h2>Костюмы</h2><button class="btn small" id="cBack">Назад</button></div>
    <p style="margin:0;color:var(--muted)">Костюм меняет облик героя и даёт небольшой бонус. Открыть можно кодом или бесплатно. Сменить надетый костюм можно в окне героя (C).</p>
    <form class="codebox" id="codeForm"><input id="codeIn" placeholder="Введите код, например NINJA" autocomplete="off" maxlength="24"><button class="btn primary" type="submit">Активировать</button><button class="btn" type="button" id="cAll">Открыть все бесплатно</button><div class="codemsg" id="codeMsg"></div></form>
    <div class="grid">${cards}</div>${hidden?'<p class="eyebrow">Есть ещё секретный костюм. Он открывается только кодом.</p>':''}</div>`);
  document.querySelectorAll('[data-cprev]').forEach(c=>heroPreview(c,c.dataset.cprev,P&&P.eq.weapon?P.eq.weapon.wt:'sword',P?!!P.eq.offhand:false));
  $('#cBack').onclick=back;
  document.querySelectorAll('[data-free]').forEach(b=>b.onclick=()=>{unlock(b.dataset.free);sfx('loot2');showCostumes(back)});
  $('#cAll').onclick=()=>{Object.entries(COSTUMES).forEach(([id,c])=>{if(!c.secret&&(!c.reward||BEATEN))unlock(id)});sfx('loot3');showCostumes(back)};
  $('#codeForm').onsubmit=e=>{e.preventDefault();const v=normCode($('#codeIn').value);const hit=Object.entries(COSTUMES).find(([,c])=>c.codes.some(k=>normCode(k)===v));const msg=$('#codeMsg');
    if(!v){msg.textContent='Введите код.';msg.style.color='var(--muted)';return}
    if(!hit){msg.textContent='Код не подошёл. Регистр не важен, проверьте написание.';msg.style.color='var(--blood)';return}
    const was=UNL.includes(hit[0]);unlock(hit[0]);sfx('loot3');showCostumes(back);const m2=$('#codeMsg');m2.textContent=was?'Костюм «'+hit[1].name+'» уже открыт.':'Открыт костюм «'+hit[1].name+'»!';m2.style.color='var(--good)'};
}
function dlcScreen(){
  showScreen(`<div class="wrap"><div class="sec-title"><h2>Дополнения</h2><button class="btn small" id="dBack">Назад</button></div>
  <p style="margin:0;color:var(--muted)">Дополнения идут после четырёх актов основной кампании. Включённые дополнения войдут в кампанию, если вы до них ещё не дошли.</p>
  <div class="grid">${Object.entries(DLC).map(([id,d])=>`<div class="card"><h3>${d.name}</h3><p>${d.desc}</p><label class="toggle"><input type="checkbox" id="dl_${id}" ${S.dlc[id]?'checked':''}> Включено</label></div>`).join('')}</div></div>`);
  Object.keys(DLC).forEach(id=>$('#dl_'+id).onchange=e=>{S.dlc[id]=e.target.checked;saveSettings()});$('#dBack').onclick=mainMenu;
}
function settingsHtml(){return `<div class="stats">
  <label class="stat"><span>Громкость эффектов</span><input type="range" id="sSfx" min="0" max="1" step="0.05" value="${S.sfx}"></label>
  <label class="stat"><span>Громкость музыки</span><input type="range" id="sMus" min="0" max="1" step="0.05" value="${S.music}"></label>
  <label class="stat toggle"><span>Цифры урона</span><input type="checkbox" id="sNum" ${S.dmgnums?'checked':''}></label>
  <label class="stat toggle"><span>Подписи обычных предметов</span><input type="checkbox" id="sLab" ${S.labels?'checked':''}></label></div>`}
function bindSettings(){$('#sSfx').oninput=e=>{S.sfx=+e.target.value;applyVolumes();saveSettings()};$('#sSfx').onchange=()=>sfx('hit');$('#sMus').oninput=e=>{S.music=+e.target.value;applyVolumes();saveSettings()};
  $('#sNum').onchange=e=>{S.dmgnums=e.target.checked;saveSettings()};$('#sLab').onchange=e=>{S.labels=e.target.checked;saveSettings()}}
function settingsScreen(back){showScreen(`<div class="wrap"><div class="sec-title"><h2>Настройки</h2><button class="btn small" id="sBack">Назад</button></div>${settingsHtml()}</div>`);bindSettings();$('#sBack').onclick=back}
function helpScreen(){
  showScreen(`<div class="wrap"><div class="sec-title"><h2>Как играть</h2><button class="btn small" id="hBack">Назад</button></div>
  <div class="card"><div class="help">
  <kbd>ЛКМ по земле</kbd><span>Идти (можно удерживать)</span><kbd>ЛКМ по врагу</kbd><span>Атаковать, герой сам подойдёт</span>
  <kbd>Shift + ЛКМ</kbd><span>Атака на месте</span><kbd>ПКМ</kbd><span>Умение из первой ячейки</span>
  <kbd>W A S D</kbd><span>Движение с клавиатуры</span><kbd>1 – 8</kbd><span>Умения</span><kbd>Q / E</kbd><span>Зелья здоровья и энергии</span>
  <kbd>F</kbd><span>Говорить с торговцем, оракулом, телепорт через обелиск</span><kbd>Alt</kbd><span>Показать все подписи предметов</span>
  <kbd>I C K J M</kbd><span>Снаряжение, герой, умения, задания, карта</span><kbd>Телефон</kbd><span>Джойстик, касание врага или земли, кнопки справа</span>
  </div></div>
  <div class="card"><p>Каждый уровень даёт 2 очка характеристик и 3 очка умений. Очки в шкалу мастерии повышают характеристики и открывают новые умения. На 6 уровне выберите вторую мастерию. В городе вас лечат, там же торговец и оракул, который сбрасывает умения. Обелиски переносят между открытыми точками акта. Логово вожака на карте отмечено оранжевым: за него дают очки. Игра сохраняется сама.</p></div></div>`);
  $('#hBack').onclick=mainMenu;
}
function showDeath(){
  if(G.state!=='dead')return;
  showScreen(`<div class="wrap menu"><div class="logo" style="color:#e06a5a">Вы пали<small>${esc(W.A.name)}</small></div>
  <div class="menu-list"><button class="btn primary" id="dRes">Воскреснуть в городе (−10% золота)</button><button class="btn" id="dMenu">Главное меню</button></div></div>`);$('#screen').classList.add('dim');
  $('#dRes').onclick=()=>{hideScreen();P.gold=Math.floor(P.gold*.9);P.hp=D.maxHp;P.mp=D.maxMp;P.x=W.start.x;P.y=W.start.y;P.inv_t=2;P.revived=false;P.target=null;P.path=null;P.atk=null;W.proj=[];W.zones=[];
    for(const e of W.en){if(e.dead)continue;e.aggro=false;e.tgt=null;if(e.boss){e.hp=e.maxHp;e.x=W.bossPos.x;e.y=W.bossPos.y;e.mode=null;e.phase=1;e.roared=false}}W.en=W.en.filter(e=>!e.minion);G.cam.x=P.x;G.cam.y=P.y;G.state='play';saveGame()};
  $('#dMenu').onclick=()=>{saveGame();mainMenu()};
}
function victory(){
  BEATEN=true;store.set('aoo_beaten',true);G.state='victory';$('#hud').hidden=true;
  const nd=Math.min(2,(P.diff||0)+1),can=(P.diff||0)<2;saveGame();
  showScreen(`<div class="wrap menu"><div class="logo">Олимп спасён<small>${DIFF[P.diff||0].n} сложность пройдена</small></div>
  <p style="max-width:540px;color:var(--muted)">Костюм «Олимпиец» теперь можно забрать бесплатно в разделе костюмов.${can?' Впереди сложность «'+DIFF[nd].n+'»: враги сильнее, добыча лучше, герой сохраняется.':''}</p>
  <div class="menu-list">${can?`<button class="btn primary" id="vNg">Начать «${DIFF[nd].n}»</button>`:''}<button class="btn" id="vCos">Костюмы</button><button class="btn" id="vMenu">Главное меню</button></div></div>`);
  if(can)$('#vNg').onclick=()=>{P.diff=nd;P.actId=campaign()[0].id;P.done={};P.quests={};P.wp={};enterGame(true)};
  $('#vCos').onclick=()=>showCostumes(victory);$('#vMenu').onclick=mainMenu;
}
function enterGame(fresh){
  hideScreen();$('#hud').hidden=false;G.state='play';G.paused=false;app.classList.toggle('touch',G.touch);$('#stick').hidden=!G.touch;resize();
  buildSkillbar();
  if(fresh)startAct();else{genAct();makeTex(W.A);recalc();P.hp=D.maxHp;P.mp=D.maxMp;startMusic(W.A.mode,W.A.root);banner(curAct().tag+' · '+curAct().name,'Продолжение пути')}
  G.cam.x=P.x;G.cam.y=P.y;makeShop();
}
function makeShop(){const lv=Math.max(1,1+campaign().findIndex(a=>a.id===P.actId)*3+DIFF[P.diff||0].lvl+1);W.shop=[];
  for(let i=0;i<14;i++){const slot=pick(['weapon','weapon','offhand','head','chest','legs','arms','ring1','amulet']);const r=Math.random()<.15?2:Math.random()<.6?1:0;const it=makeItem(slot,lv+randi(0,1),r);if(it.slot==='ring1')it.slot='ring';W.shop.push(it)}}

/* ---------- panels ---------- */
function openPanel(kind){if(G.state!=='play')return;G.paused=true;G.panel=kind;G.sel=null;$('#panel').hidden=false;touchAtk=false;G.mdown=false;renderPanel();sfx('click')}
function closePanel(){$('#panel').hidden=true;$('#ftip').hidden=true;G.paused=false;G.panel=null;recalc();saveGame()}
function statList(it,cmp){
  const rows=[];if(it.min)rows.push(['Урон оружия',it.min+'–'+it.max,cmp&&cmp.min?((it.min+it.max)-(cmp.min+cmp.max)):null]);
  for(const k in it.st){const v=it.st[k],o=cmp?(cmp.st[k]||0):null;rows.push([STATN[k],(k==='armor'||k==='block'?'':'+')+v,o!==null?+(v-o).toFixed(1):null])}
  return rows.map(([n,v,d])=>`<li>${n}: <b>${v}</b>${d?` <span class="${d>0?'up':'down'}">(${d>0?'+':''}${d})</span>`:''}</li>`).join('');
}
function tipHtml(it,cmp){
  const err=canEquip(it);const wt=it.wt?' · '+WTYPE[it.wt].n[0]+(WTYPE[it.wt].two?', двуручное':''):'';
  return `<b style="color:${RAR[it.rar].c}">${esc(it.name)}</b><span class="eyebrow">${SLOTN[it.slot]}${wt} · ${RAR[it.rar].n} · ур. ${it.lvl}</span><ul>${statList(it,cmp)}</ul>${it.quote?`<q>${esc(it.quote)}</q>`:''}<span class="${err?'down':''}" style="font-size:12px">${err||'Требуется уровень '+it.req}</span>`;
}
function cellHtml(it,attrs,label){if(!it)return `<button class="cell" type="button" ${attrs}><span class="sl">${label||''}</span></button>`;
  const better=!canEquip(it)&&!label&&itemScore(it)>itemScore(P.eq[slotFor(it)]);
  return `<button class="cell ${canEquip(it)?'bad':''}" type="button" ${attrs} style="border-color:${RAR[it.rar].c}66"><img src="${itemIcon(it)}" alt="">${better?'<span class="ar up">▲</span>':''}</button>`}
function equipItem(idx){const it=P.inv[idx];const err=canEquip(it);if(err){toast(err);return}const slot=slotFor(it);const old=P.eq[slot];P.inv.splice(idx,1);P.eq[slot]=Object.assign(it,{slot:slot.startsWith('ring')?'ring':it.slot});if(old)P.inv.push(old);
  if(slot==='weapon'&&WTYPE[it.wt].two&&P.eq.offhand){if(P.inv.length<40){P.inv.push(P.eq.offhand);P.eq.offhand=null}}sfx('loot1');recalc();buildSkillbar()}
function renderPanel(){
  const k=G.panel,box=$('#panel');const shop=k==='shop';
  const titles={inv:'Снаряжение',char:'Герой',sk:'Умения',quest:'Задания',map:'Карта',menu:'Пауза',shop:'Торговец Ксантипп',oracle:'Оракул Пифия',travel:'Обелиски'};
  const tabs=`<div class="tabs">${[['inv','Снаряжение'],['char','Герой'],['sk','Умения'],['quest','Задания'],['map','Карта'],['menu','Меню']].map(([id,n])=>`<button class="btn small ${k===id?'on':''}" data-tab="${id}">${n}</button>`).join('')}<button class="btn small primary" id="pClose">В бой</button></div>`;
  let body='';
  if(k==='inv'||k==='shop'){
    const s=G.sel;let selIt=null;if(s){selIt=s.src==='bag'?P.inv[s.i]:s.src==='eq'?P.eq[s.i]:W.shop[s.i]}
    const eqc=sl=>cellHtml(P.eq[sl],`data-eq="${sl}"`,SLOTN[sl]);
    const doll=`<div class="doll"><div class="dcol">${eqc('head')}${eqc('chest')}${eqc('legs')}</div><canvas id="dollc"></canvas><div class="dcol">${eqc('amulet')}${eqc('arms')}${eqc('offhand')}</div><div class="dbot">${eqc('weapon')}${eqc('ring1')}${eqc('ring2')}</div></div>`;
    const bag=`<div class="bag">${Array.from({length:40},(_,i)=>cellHtml(P.inv[i],`data-bag="${i}"`).replace('class="cell','class="cell'+(s&&s.src==='bag'&&s.i===i?' sel':''))).join('')}</div>`;
    let det='<div class="tip"><span class="eyebrow">Выберите предмет, чтобы увидеть свойства</span></div>';
    if(selIt){const cmp=s.src!=='eq'?P.eq[slotFor(selIt)]:null;let btns='';
      if(s.src==='bag')btns=`<button class="btn small primary" id="aEq" ${canEquip(selIt)?'disabled':''}>Надеть</button>`+(shop?`<button class="btn small" id="aSell">Продать · ${itemValue(selIt)} з.</button>`:`<button class="btn small" id="aDrop">Выбросить</button>`);
      if(s.src==='eq')btns=`<button class="btn small" id="aUn">Снять</button>`;
      if(s.src==='shop')btns=`<button class="btn small primary" id="aBuy" ${P.gold<itemValue(selIt)*4||P.inv.length>=40?'disabled':''}>Купить · ${itemValue(selIt)*4} з.</button>`;
      det=`<div class="tip">${tipHtml(selIt,cmp)}${cmp&&s.src!=='eq'?`<span class="eyebrow" style="margin-top:4px">Сейчас надето: <span style="color:${RAR[cmp.rar].c}">${esc(cmp.name)}</span></span>`:''}<div class="row">${btns}</div></div>`}
    const shopHtml=shop?`<div class="eyebrow">Товары</div><div class="bag">${W.shop.map((it,i)=>cellHtml(it,`data-shop="${i}"`).replace('class="cell','class="cell'+(s&&s.src==='shop'&&s.i===i?' sel':''))).join('')}</div>
      <div class="row"><button class="btn small" id="bPH" ${P.gold<potPrice()?'disabled':''}>Зелье здоровья · ${potPrice()} з.</button><button class="btn small" id="bPM" ${P.gold<potPrice()?'disabled':''}>Зелье энергии · ${potPrice()} з.</button><button class="btn small" id="sJunk">Продать всё хуже надетого</button></div>`:'';
    body=`<div class="invwrap"><div style="display:flex;flex-direction:column;gap:10px">${doll}${det}</div><div style="display:flex;flex-direction:column;gap:10px;min-width:0">
      <div class="row"><span>Золото: <b style="color:var(--bronze2)">${P.gold}</b></span><span>Зелья: <b style="color:#ff8a7a">${P.potH}</b> / <b style="color:#8ab0ff">${P.potM}</b></span><span class="eyebrow">Сумка ${P.inv.length}/40</span></div>${shopHtml}${shop?'<div class="eyebrow">Ваша сумка: выберите предмет, чтобы продать</div>':''}${bag}</div></div>`;
  }else if(k==='char'){
    const st=[['str','Сила','Урон мечом, топором и булавой, немного брони'],['dex','Ловкость','Урон луком и копьём, шанс крита, броня'],['int','Интеллект','Сила заклинаний и посоха, энергия'],['vit','Выносливость','Здоровье и его восстановление']];
    body=`<div class="row" style="align-items:flex-start"><canvas id="charPrev" style="width:130px;height:160px;background:radial-gradient(ellipse at 50% 85%,#3a2a1a,#15100c 70%);border-radius:6px"></canvas>
      <div style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:1"><h3 style="font-size:24px">${className()}, ур. ${P.lvl}</h3><span style="color:var(--muted)">Опыт: ${P.xp} / ${xpNeed(P.lvl)}</span>
      <span style="color:var(--muted)">Мастерии: ${P.mast.filter(Boolean).map(m=>`<span style="color:${MAST[m].color}">${MAST[m].name} ${P.mrank[m]}</span>`).join(' · ')}</span>
      <span style="color:var(--muted)">Костюм: ${COSTUMES[P.cos].name} · <span class="up">${COSTUMES[P.cos].bonus}</span></span><span>Свободных очков: <b style="color:var(--bronze2)">${P.attrPts}</b></span></div></div>
      <div class="stats">${st.map(([id,n,h])=>`<div class="stat"><div><b>${n}: ${D.st[id]}</b><br><span>${h}</span></div><button class="btn small" data-stat="${id}" ${P.attrPts?'':'disabled'}>+1</button></div>`).join('')}</div>
      <div class="stats">
        <div class="stat"><span>Урон оружием</span><b>${Math.round(D.wmin*D.wMult)}–${Math.round(D.wmax*D.wMult)}</b></div><div class="stat"><span>Сила заклинаний</span><b>${Math.round(D.spell)}</b></div>
        <div class="stat"><span>Броня</span><b>${Math.round(D.armor)}</b></div><div class="stat"><span>Здоровье / энергия</span><b>${D.maxHp} / ${D.maxMp}</b></div>
        <div class="stat"><span>Шанс крита / урон крита</span><b>${D.crit.toFixed(1)}% / ×${D.critM.toFixed(1)}</b></div><div class="stat"><span>Атак в секунду</span><b>${D.aspd.toFixed(2)}</b></div>
        <div class="stat"><span>Блок / уклонение</span><b>${D.block}% / ${D.dodge}%</b></div><div class="stat"><span>Вампиризм / снижение урона</span><b>${Math.round(D.leech*100)}% / ${Math.round(D.dr*100)}%</b></div>
        <div class="stat"><span>Восстановление здоровья</span><b>${D.hpReg.toFixed(1)}/с</b></div><div class="stat"><span>Скорость бега</span><b>${D.move.toFixed(2)}</b></div></div>
      <div class="sec-title"><div class="eyebrow">Сменить костюм</div><button class="btn small" id="moreCos">Открыть новые костюмы</button></div>
      <div class="costumes">${Object.entries(COSTUMES).filter(([id])=>UNL.includes(id)).map(([id,c])=>`<button class="cos ${P.cos===id?'sel':''}" data-setcos="${id}" type="button"><canvas data-cprev="${id}"></canvas>${c.name}</button>`).join('')}</div>`;
  }else if(k==='sk'){
    const col=m=>{const M=MAST[m],r=P.mrank[m]||0;
      return `<div class="mast" style="--mc:${M.color}"><div class="sec-title"><h3 style="color:${M.color};font-size:22px">${M.name}</h3><span class="eyebrow">Ранг ${r} / ${MAST_MAX}</span></div>
      <div class="mbar"><div><i style="width:${r/MAST_MAX*100}%"></i>${[4,8,12,16].map(t=>`<u style="left:${t/MAST_MAX*100}%"></u>`).join('')}</div><button class="btn small" data-mr="${m}" ${P.skillPts&&r<MAST_MAX?'':'disabled'}>+</button></div>
      <p class="eyebrow" style="margin:0">За ранг: ${Object.entries(M.per).map(([k2,v])=>'+'+v+' '+({str:'сила',dex:'ловкость',int:'интеллект',vit:'выносливость',hp:'здоровье',mana:'энергия',armor:'броня',crit:'% крит'}[k2])).join(', ')}</p>
      ${M.skills.map(id=>{const s=SK[id],lv=slv(id),open=r>=s.req;return `<div class="skrow ${open?'':'locked'}"><div class="skic ${s.act?'':'pas'}">${s.ic}</div><div><b>${s.n}</b> <span class="eyebrow">${s.act?'активное':'пассивное'}${lv?' · ур. '+lv:''}${s.act?' · '+Math.round(s.mana+Math.max(1,lv)*1.5)+' энергии · '+s.cd+' с':''}</span><p>${open?s.desc(Math.max(1,lv)):'Откроется на ранге мастерии '+s.req}</p></div><button class="btn small" data-sk="${id}" ${open&&P.skillPts&&lv<10?'':'disabled'}>+</button></div>`}).join('')}</div>`};
    let second='';
    if(!P.mast[1]){second=P.lvl>=6?`<div class="mast" style="--mc:#888"><h3>Выберите вторую мастерию</h3><div class="grid">${Object.entries(MAST).filter(([id])=>id!==P.mast[0]).map(([id,m])=>`<button class="card mcard" style="--mc:${m.color}" data-pick="${id}" type="button"><h3 style="color:${m.color}">${m.name}</h3><p>${m.desc}</p><span class="eyebrow">Класс: ${CLASSN[[P.mast[0],id].sort().join('+')]}</span></button>`).join('')}</div></div>`
      :`<div class="mast" style="--mc:#555"><h3>Вторая мастерия</h3><p class="eyebrow" style="margin:0">Откроется на 6 уровне</p></div>`}
    body=`<div class="row"><span>Очков умений: <b style="color:var(--bronze2)">${P.skillPts}</b></span><span class="eyebrow">Активные умения сами встают на панель в порядке изучения</span></div><div class="masts">${col(P.mast[0])}${P.mast[1]?col(P.mast[1]):second}</div>`;
  }else if(k==='quest'){
    const Q=q(),A=curAct();const row=(done,t,d)=>`<div class="qrow"><div class="ck">${done?'✓':''}</div><div><b>${t}</b><p style="margin:2px 0 0;color:var(--muted);font-size:14px">${d}</p></div></div>`;
    body=`<div class="eyebrow">${A.tag} · ${A.name} · ${DIFF[P.diff||0].n}</div>${row(Q.boss,'Главное задание: '+BOSS[A.boss].n,A.intro)}${row(Q.lair,'Логово: '+(W.lair?W.lair.named:''),A.side+' Награда: +1 очко характеристик, +2 очка умений. Логово отмечено на карте оранжевым.')}
      ${row(W.wps.every(w=>w.on),'Обелиски',`Пробуждено ${W.wps.filter(w=>w.on).length} из ${W.wps.length}. Они переносят между частями акта.`)}`;
  }else if(k==='map'){body=`<canvas id="bigmap" width="1000" height="525"></canvas><div class="row eyebrow"><span style="color:#fff">● вы</span><span style="color:#ff3a2a">● босс</span><span style="color:#ff8a2a">● логово</span><span style="color:#7ad8ff">● обелиск</span><span style="color:#ffd34d">● город, чемпионы</span></div>`}
  else if(k==='oracle'){const cost=50*P.lvl;body=`<p style="margin:0;color:var(--muted)">«Я вижу иные пути твоей судьбы». Оракул вернёт все потраченные очки умений и ранги мастерий. Первое умение каждой мастерии останется.</p>
    <div class="row"><button class="btn primary" id="oRes" ${P.gold<cost?'disabled':''}>Сбросить умения · ${cost} з.</button><span class="eyebrow">Здоровье и энергия в городе восстанавливаются быстрее</span></div>`}
  else if(k==='travel'){body=`<div class="wplist">${W.wps.map(w=>`<button class="btn" data-wp="${w.id}" ${w.on?'':'disabled'}>${esc(w.name)}${w.on?'':' · не пробуждён'}</button>`).join('')}</div>`}
  else{body=`<div class="menu-list" style="width:100%;max-width:360px"><button class="btn" id="pSave">Сохранить</button><button class="btn" id="pTown">Вернуться в город</button><button class="btn" id="pCos">Костюмы и коды</button><button class="btn" id="pMain">Выйти в главное меню</button></div><p class="eyebrow" id="pMsg"></p>${settingsHtml()}`}
  box.innerHTML=`<div class="pbox"><div class="phead"><h2>${titles[k]}</h2>${tabs}</div>${body}</div>`;
  box.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{G.panel=b.dataset.tab;G.sel=null;sfx('click');renderPanel()});
  $('#pClose').onclick=closePanel;
  const on=(sel,fn)=>{const e=$(sel);if(e)e.onclick=fn};
  box.querySelectorAll('[data-bag]').forEach(b=>{b.onclick=()=>{const i=+b.dataset.bag;if(!P.inv[i])return;if(G.sel&&G.sel.src==='bag'&&G.sel.i===i&&!G.touch){equipItem(i);G.sel=null}else G.sel={src:'bag',i};sfx('click');renderPanel()};hoverTip(b,()=>P.inv[+b.dataset.bag],true)});
  box.querySelectorAll('[data-eq]').forEach(b=>{b.onclick=()=>{if(!P.eq[b.dataset.eq])return;G.sel={src:'eq',i:b.dataset.eq};sfx('click');renderPanel()};hoverTip(b,()=>P.eq[b.dataset.eq],false)});
  box.querySelectorAll('[data-shop]').forEach(b=>{b.onclick=()=>{G.sel={src:'shop',i:+b.dataset.shop};sfx('click');renderPanel()};hoverTip(b,()=>W.shop[+b.dataset.shop],true)});
  on('#aEq',()=>{equipItem(G.sel.i);G.sel=null;renderPanel()});
  on('#aUn',()=>{const s=G.sel.i;if(P.inv.length>=40){toast('Сумка полна');return}P.inv.push(P.eq[s]);P.eq[s]=null;G.sel=null;recalc();buildSkillbar();renderPanel()});
  on('#aDrop',()=>{const it=P.inv.splice(G.sel.i,1)[0];W.loot.push(lootObj(P.x+rand(-.5,.5),P.y+rand(.3,.8),'item',{item:it,pop:1}));G.sel=null;renderPanel()});
  on('#aSell',()=>{const it=P.inv.splice(G.sel.i,1)[0];P.gold+=itemValue(it);sfx('gold');G.sel=null;renderPanel()});
  on('#aBuy',()=>{const it=W.shop[G.sel.i],pr=itemValue(it)*4;if(P.gold<pr||P.inv.length>=40)return;P.gold-=pr;P.inv.push(W.shop.splice(G.sel.i,1)[0]);sfx('gold');G.sel=null;renderPanel()});
  on('#bPH',()=>{if(P.gold>=potPrice()){P.gold-=potPrice();P.potH++;sfx('gold');renderPanel()}});on('#bPM',()=>{if(P.gold>=potPrice()){P.gold-=potPrice();P.potM++;sfx('gold');renderPanel()}});
  on('#sJunk',()=>{let g=0;P.inv=P.inv.filter(it=>{if(itemScore(it)<=itemScore(P.eq[slotFor(it)])){g+=itemValue(it);return false}return true});P.gold+=g;sfx('gold');G.sel=null;renderPanel()});
  const dc=$('#dollc');if(dc){const L=heroLook();heroPreview(dc,P.cos,L.wpn,L.shield)}
  box.querySelectorAll('[data-stat]').forEach(b=>b.onclick=()=>{if(P.attrPts>0){P.attrPts--;P.attr[b.dataset.stat]++;const r=P.hp/D.maxHp;recalc();P.hp=D.maxHp*r;sfx('click');renderPanel()}});
  box.querySelectorAll('[data-setcos]').forEach(b=>b.onclick=()=>{P.cos=b.dataset.setcos;recalc();sfx('click');renderPanel()});
  box.querySelectorAll('[data-cprev]').forEach(c=>{const L=heroLook();heroPreview(c,c.dataset.cprev,L.wpn,L.shield)});
  const cp=$('#charPrev');if(cp){const L=heroLook();heroPreview(cp,P.cos,L.wpn,L.shield)}
  on('#moreCos',()=>{$('#panel').hidden=true;showCostumes(()=>{hideScreen();$('#panel').hidden=false;renderPanel()})});
  box.querySelectorAll('[data-mr]').forEach(b=>b.onclick=()=>{const m=b.dataset.mr;if(P.skillPts>0&&P.mrank[m]<MAST_MAX){P.skillPts--;P.mrank[m]++;recalc();sfx('click');renderPanel()}});
  box.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>{if(P.skillPts>0){P.skillPts--;learnSkill(b.dataset.sk);recalc();buildSkillbar();sfx('level');renderPanel()}});
  box.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const m=b.dataset.pick;P.mast[1]=m;P.mrank[m]=1;learnSkill(MAST[m].skills[0]);recalc();buildSkillbar();sfx('level');banner('Новый класс: '+className(),MAST[m].name+' + '+MAST[P.mast[0]].name);renderPanel()});
  const bm=$('#bigmap');if(bm)drawMini(bm,true);
  on('#oRes',()=>{const cost=50*P.lvl;if(P.gold<cost)return;P.gold-=cost;P.sk={};P.bar=[];P.mast.forEach(m=>{if(m){P.mrank[m]=1;learnSkill(MAST[m].skills[0])}});P.skillPts=P.spEarned;recalc();buildSkillbar();sfx('heal');toast('Умения сброшены');renderPanel()});
  box.querySelectorAll('[data-wp]').forEach(b=>b.onclick=()=>{const w=W.wps[+b.dataset.wp];P.x=w.x+.9;P.y=w.y+.9;P.path=null;P.target=null;G.cam.x=P.x;G.cam.y=P.y;sfx('portal');reveal(P.x,P.y,11);closePanel()});
  on('#pSave',()=>{saveGame();$('#pMsg').textContent='Сохранено'});
  on('#pTown',()=>{P.x=W.start.x;P.y=W.start.y;P.path=null;P.target=null;G.cam.x=P.x;G.cam.y=P.y;sfx('portal');closePanel()});
  on('#pCos',()=>{$('#panel').hidden=true;showCostumes(()=>{hideScreen();$('#panel').hidden=false;renderPanel()})});
  on('#pMain',()=>{saveGame();mainMenu()});
  if($('#sSfx'))bindSettings();
}
function hoverTip(el,get,cmp){if(G.touch)return;const ft=$('#ftip');
  el.addEventListener('mouseenter',()=>{const it=get();if(!it)return;ft.innerHTML=tipHtml(it,cmp?P.eq[slotFor(it)]:null);ft.hidden=false});
  el.addEventListener('mousemove',e=>{const r=app.getBoundingClientRect();let x=e.clientX-r.left+16,y=e.clientY-r.top+12;const w=ft.offsetWidth,h=ft.offsetHeight;if(x+w>Wd-8)x=e.clientX-r.left-w-12;if(y+h>Hd-8)y=Hd-h-8;ft.style.left=x+'px';ft.style.top=y+'px'});
  el.addEventListener('mouseleave',()=>{ft.hidden=true})}
function potPrice(){return 20+P.lvl*4}

/* ---------- input ---------- */
window.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;keys[e.code]=true;if(G.state!=='play')return;
  if(e.code==='Space'||e.code.startsWith('Alt'))e.preventDefault();
  const tog=p=>{G.panel===p?closePanel():openPanel(p)};
  if(e.code==='Escape'){G.panel?closePanel():openPanel('menu');return}
  if(e.code==='KeyI'){tog('inv');return}if(e.code==='KeyC'){tog('char');return}if(e.code==='KeyK'){tog('sk');return}if(e.code==='KeyJ'){tog('quest');return}if(e.code==='KeyM'){tog('map');return}
  if(G.paused)return;
  const d=e.code.match(/^Digit([1-8])$/);if(d&&!e.repeat)castSkill(+d[1]-1);
  if(e.code==='KeyQ'&&!e.repeat)drinkPotion('h');if(e.code==='KeyE'&&!e.repeat)drinkPotion('m');
  if(e.code==='KeyF'&&!e.repeat)doAct();
  if(e.code==='Space'&&!e.repeat){const t=nearestEnemy(P.x,P.y,9);if(t)P.target=t}
  if(e.code==='ShiftLeft'||e.code==='ShiftRight')G.shift=true;
});
window.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code.startsWith('Shift')){G.shift=false;G.shiftAtk=false}});
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;G.mdown=false;touchAtk=false;G.shiftAtk=false});
function doAct(){const o=G.actObj;if(!o)return;if(o.kind==='portal'){P.path=[{x:W.portal.x,y:W.portal.y}];return}interactWith(o)}
$('#act').onclick=()=>{audioInit();doAct()};
function updateHover(){
  if(G.touch||G.mxs===undefined||G.state!=='play'){G.hover=null;return}let best=null,bd=1e9;
  for(const e of W.en){if(e.dead)continue;const s=enemyScale(e),sp=worldToScreen(e.x,e.y,(e.fly?30:0)+28*s);const d=Math.hypot(sp.x-G.mxs,sp.y-G.mys);if(d<34*s*G.zoom&&d<bd){bd=d;best=e}}
  G.hover=best;cv.classList.toggle('atk',!!best);
}
function labelAt(x,y){for(const L of G.labels)if(x>=L.x0&&x<=L.x1&&y>=L.y0&&y<=L.y1)return L.l;return null}
function interactAt(w){for(const n of W.npcs)if(Math.hypot(n.x-w.x,n.y-w.y)<1.1)return n;for(const wp of W.wps)if(wp.on&&Math.hypot(wp.x-w.x,wp.y-w.y)<1.1)return Object.assign({kind:'wp'},wp);return null}
function clickWorld(sx,sy,tap){
  if(G.state!=='play'||G.paused)return;
  const L=labelAt(sx,sy);if(L){P.pick=L;P.target=null;goTo(L.x,L.y);P.pick=L;return 'label'}
  let tgt=G.hover;
  if(tap){let bd=1e9;for(const e of W.en){if(e.dead)continue;const s=enemyScale(e),sp=worldToScreen(e.x,e.y,(e.fly?30:0)+28*s);const d=Math.hypot(sp.x-sx,sp.y-sy);if(d<44*s*G.zoom&&d<bd){bd=d;tgt=e}}}
  if(tgt){if(G.shift){G.shiftAtk=true;return 'atk'}P.target=tgt;P.path=null;P.interact=null;P.pick=null;return 'enemy'}
  const w=screenToWorld(sx,sy);
  if(G.shift&&!tap){G.shiftAtk=true;return 'atk'}
  const it=interactAt(w);if(it){P.interact=it;P.target=null;goTo(it.x+.8,it.y+.8);P.interact=it;return 'npc'}
  goTo(w.x,w.y);P.interact=null;return 'move';
}
cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){const r=cv.getBoundingClientRect();G.mxs=e.clientX-r.left;G.mys=e.clientY-r.top}});
cv.addEventListener('pointerdown',e=>{
  audioInit();const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
  if(e.pointerType!=='mouse'){if(!G.touch){G.touch=true;app.classList.add('touch');$('#stick').hidden=G.state!=='play';resize();if(G.state==='play')buildSkillbar()}clickWorld(sx,sy,true);return}
  if(G.touch){G.touch=false;app.classList.remove('touch');$('#stick').hidden=true;resize();if(G.state==='play')buildSkillbar()}
  G.mxs=sx;G.mys=sy;updateHover();
  if(e.button===2){castSkill(0);return}
  if(e.button===0){const res=clickWorld(sx,sy,false);G.mdown=true;G.mdownTarget=res!=='move';G.followT=.25}
});
window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&e.button===0){G.mdown=false;G.shiftAtk=false}});
cv.addEventListener('contextmenu',e=>e.preventDefault());
const stick=$('#stick'),knob=$('#knob');let stickId=null;
stick.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();stickId=e.pointerId;stick.setPointerCapture(e.pointerId);joy.on=true;moveStick(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e)});
['pointerup','pointercancel'].forEach(ev=>stick.addEventListener(ev,e=>{if(e.pointerId!==stickId)return;stickId=null;joy.on=false;joy.x=joy.y=0;knob.style.transform=''}));
function moveStick(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const m=r.width/2-10,d=Math.hypot(dx,dy);if(d>m){dx*=m/d;dy*=m/d}joy.x=dx/m;joy.y=dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`}
$('#bInv').onclick=()=>openPanel('inv');$('#bChar').onclick=()=>openPanel('char');$('#bSk').onclick=()=>openPanel('sk');$('#bQ').onclick=()=>openPanel('quest');$('#bMap').onclick=()=>openPanel('map');$('#bMenu').onclick=()=>openPanel('menu');
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.state==='play'){saveGame();if(!G.paused)openPanel('menu')}});

/* ---------- boot ---------- */
G.touch=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
resize();
let last=performance.now();
function loop(t){const dt=Math.min(.05,(t-last)/1000);last=t;G.dt=dt;
  try{
    if(G.state==='play'&&!G.paused){updateHover();update(dt)}
    if((G.state==='play'||G.state==='dead')&&W){if(G.state==='dead')G.t+=dt;render()}else renderMenuBg(t);
  }catch(err){console.error(err)}
  requestAnimationFrame(loop)}
mainMenu();requestAnimationFrame(loop);
