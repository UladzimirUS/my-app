/* ============================ DATA ============================ */
const MAST={
  war:{name:'Война',color:'#d0553c',desc:'Оружие ближнего боя: натиск, вихрь клинков, боевой клич.',per:{str:2,hp:6},start:'sword',skills:['charge','whirl','warcry','twohand','frenzy']},
  def:{name:'Защита',color:'#c9a24a',desc:'Щит и доспех: оглушения, сокрушение, несокрушимость.',per:{vit:2,armor:2},start:'mace',shield:true,skills:['shieldbash','bulwark','crush','temper','endure']},
  hunt:{name:'Охота',color:'#6fb24a',desc:'Лук и ловушки: залпы, пробивающие выстрелы, звериное чутьё.',per:{dex:2,hp:3},start:'bow',skills:['volley','pierce','trap','instinct','marksman']},
  shad:{name:'Тень',color:'#8a6ad0',desc:'Яды и скрытность: метательные ножи, теневой шаг, смертельные удары.',per:{dex:1,str:1,crit:.2},start:'sword',skills:['knives','venom','shadowstep','evasion','lethal']},
  elem:{name:'Стихии',color:'#e07a2a',desc:'Огонь и молния: огненный шар, цепная молния, метеор.',per:{int:2,mana:5},start:'staff',skills:['fireball','chain','meteor','pyre','iceskin']},
  spir:{name:'Дух',color:'#5ac0c8',desc:'Жизнь и смерть: похищение жизни, дух-страж, исцеление.',per:{int:1,vit:1,mana:3},start:'staff',skills:['drain','guardian','mend','commune','lifeaura']},
};
const MAST_MAX=20;
const CLASSN={war:'Воитель',def:'Защитник',hunt:'Охотник',shad:'Разбойник',elem:'Чародей',spir:'Мистик',
  'def+war':'Страж','hunt+war':'Налётчик','shad+war':'Головорез','elem+war':'Боевой маг','spir+war':'Каратель',
  'def+hunt':'Егерь','def+shad':'Телохранитель','def+elem':'Хранитель стихий','def+spir':'Храмовник',
  'hunt+shad':'Ассасин','elem+hunt':'Стрелок бури','hunt+spir':'Друид','elem+shad':'Колдун','shad+spir':'Некромант','elem+spir':'Оракул'};
const SK={
  // war
  charge:{n:'Натиск',m:'war',req:1,act:1,cd:6,mana:10,ic:'Н',desc:l=>`Рывок до 6 клеток: ${160+24*(l-1)}% урона оружием всем на пути и оглушение на 1 с.`},
  whirl:{n:'Вихрь клинков',m:'war',req:4,act:1,cd:7,mana:16,ic:'В',desc:l=>`Вращение с оружием: 3 удара по ${70+10*(l-1)}% всем врагам рядом.`},
  warcry:{n:'Боевой клич',m:'war',req:8,act:1,cd:18,mana:20,ic:'К',desc:l=>`10 с: +${20+4*l}% урона. Оглушает врагов рядом на 1,2 с.`},
  twohand:{n:'Хватка ветерана',m:'war',req:1,act:0,ic:'Х',desc:l=>`Пассивно: +${6*l}% физического урона.`},
  frenzy:{n:'Ярость',m:'war',req:12,act:0,ic:'Я',desc:l=>`Пассивно: ${4+2*l}% шанс нанести дополнительный удар.`},
  // def
  shieldbash:{n:'Удар щитом',m:'def',req:1,act:1,cd:4,mana:8,ic:'У',desc:l=>`Удар: ${150+22*(l-1)}% урона и оглушение на 1,5 с. Со щитом +30%.`},
  bulwark:{n:'Стена щитов',m:'def',req:4,act:1,cd:20,mana:18,ic:'С',desc:l=>`10 с: +${40+6*l}% брони, ${15+3*l}% урона в ближнем бою отражается.`},
  crush:{n:'Сокрушение',m:'def',req:8,act:1,cd:10,mana:25,ic:'С',desc:l=>`Удар о землю: ${250+35*(l-1)}% урона в радиусе 3 клеток и оглушение.`},
  temper:{n:'Закалка',m:'def',req:1,act:0,ic:'З',desc:l=>`Пассивно: +${8*l}% брони.`},
  endure:{n:'Стойкость',m:'def',req:12,act:0,ic:'С',desc:l=>`Пассивно: +${4*l}% здоровья, +${2*l}% шанс блока щитом.`},
  // hunt
  volley:{n:'Залп',m:'hunt',req:1,act:1,cd:3,mana:9,ic:'З',bow:1,desc:l=>`Веер из ${5+Math.floor(l/2)} стрел по ${85+12*(l-1)}% урона. Нужен лук.`},
  pierce:{n:'Пробивающий выстрел',m:'hunt',req:4,act:1,cd:5,mana:14,ic:'П',bow:1,desc:l=>`Стрела пробивает всех врагов на линии: ${220+30*(l-1)}% урона. Нужен лук.`},
  trap:{n:'Капкан',m:'hunt',req:8,act:1,cd:10,mana:20,ic:'К',desc:l=>`Ловушка у цели: взрыв на ${300+40*(l-1)}% урона и замедление.`},
  instinct:{n:'Звериное чутьё',m:'hunt',req:1,act:0,ic:'Ч',desc:l=>`Пассивно: +${(1.5*l).toFixed(1)}% к шансу крита.`},
  marksman:{n:'Меткость',m:'hunt',req:12,act:0,ic:'М',desc:l=>`Пассивно: +${8*l}% урона в дальнем бою.`},
  // shad
  knives:{n:'Метательные ножи',m:'shad',req:1,act:1,cd:3,mana:9,ic:'Н',desc:l=>`5 ножей веером по ${70+10*(l-1)}% урона, каждый отравляет.`},
  venom:{n:'Ядовитый клинок',m:'shad',req:4,act:1,cd:16,mana:16,ic:'Я',desc:l=>`12 с: каждый удар отравляет на ${30+5*l}% урона в секунду.`},
  shadowstep:{n:'Теневой шаг',m:'shad',req:8,act:1,cd:7,mana:18,ic:'Т',desc:l=>`Мгновенно за спину цели: ${200+30*(l-1)}% урона, удар всегда критический.`},
  evasion:{n:'Уклонение',m:'shad',req:1,act:0,ic:'У',desc:l=>`Пассивно: ${2*l}% шанс увернуться от удара.`},
  lethal:{n:'Смертельный удар',m:'shad',req:12,act:0,ic:'С',desc:l=>`Пассивно: +${10*l}% к урону критических ударов.`},
  // elem
  fireball:{n:'Огненный шар',m:'elem',req:1,act:1,cd:1.2,mana:10,ic:'О',spell:1,desc:l=>`Взрывается при попадании: ${160+22*(l-1)}% силы заклинаний по площади.`},
  chain:{n:'Цепная молния',m:'elem',req:4,act:1,cd:3,mana:16,ic:'М',spell:1,desc:l=>`Бьёт цель и перескакивает на ${3+Math.floor(l/3)} врагов: ${130+18*(l-1)}% каждому.`},
  meteor:{n:'Метеор',m:'elem',req:8,act:1,cd:12,mana:32,ic:'Т',spell:1,desc:l=>`Через 1 с падает метеор: ${420+55*(l-1)}% силы заклинаний в радиусе 2,5.`},
  pyre:{n:'Сердце пламени',m:'elem',req:1,act:0,ic:'П',desc:l=>`Пассивно: +${8*l}% урона заклинаний.`},
  iceskin:{n:'Ледяная кожа',m:'elem',req:12,act:0,ic:'Л',desc:l=>`Пассивно: −${2*l}% получаемого урона.`},
  // spir
  drain:{n:'Похищение жизни',m:'spir',req:1,act:1,cd:2,mana:11,ic:'П',spell:1,desc:l=>`Луч в цель: ${140+20*(l-1)}% силы заклинаний, половина уходит вам в здоровье.`},
  guardian:{n:'Дух-страж',m:'spir',req:4,act:1,cd:15,mana:30,ic:'Д',spell:1,desc:l=>`Призывает призрачного воина. Уровень навыка повышает его силу (${l}).`},
  mend:{n:'Исцеление',m:'spir',req:8,act:1,cd:14,mana:24,ic:'И',desc:l=>`Восстанавливает ${30+3*l}% здоровья вам и стражу.`},
  commune:{n:'Связь с духами',m:'spir',req:1,act:0,ic:'С',desc:l=>`Пассивно: +${12*l}% восстановления энергии, +${3*l}% урона заклинаний.`},
  lifeaura:{n:'Аура жизни',m:'spir',req:12,act:0,ic:'А',desc:l=>`Пассивно: восстановление ${(0.12*l).toFixed(2)}% здоровья в секунду.`},
};
const COSTUMES={
  classic:{name:'Эллин',desc:'Стандартное снаряжение героя Эллады.',bonus:'Без бонуса',body:'#9a3426',trim:'#d69c48',skin:'#e0b48a',legs:'#5a3a22',head:'laurel',codes:[]},
  ninja:{name:'Ниндзя',desc:'Тень с Востока. Чёрный костюм, красная повязка.',bonus:'+12% к скорости бега, +5% к шансу крита',mods:{move:.12,crit:5},body:'#1d1d25',trim:'#c62f2f',skin:'#e0b48a',legs:'#15151b',head:'ninja',codes:['NINJA','НИНДЗЯ','SHINOBI']},
  samurai:{name:'Самурай',desc:'Доспех о-ёрой и шлем кабуто с золотыми рогами.',bonus:'+10% к урону',mods:{dmg:.10},body:'#7a1f1f',trim:'#e0c060',skin:'#e0b48a',legs:'#2a1616',head:'kabuto',codes:['SAMURAI','САМУРАЙ','BUSHIDO']},
  spartan:{name:'Спартанец',desc:'Бронзовый шлем с гребнем и багровый плащ.',bonus:'+20% к броне',mods:{armor:.20},body:'#b07a30',trim:'#e0b860',skin:'#d8a878',legs:'#6a2a1a',head:'spartan',cape:'#a3241c',codes:['SPARTA','СПАРТА','MOLONLABE']},
  pharaoh:{name:'Фараон',desc:'Полосатый немес и золотой урей.',bonus:'+15% к энергии, быстрее её восстановление',mods:{mana:.15,mreg:.5},body:'#ebe0c4',trim:'#2f5fa8',skin:'#c08a5a',legs:'#d8ccb0',head:'nemes',codes:['PHARAOH','ФАРАОН','RA']},
  viking:{name:'Викинг',desc:'Рогатый шлем, рыжая борода и меховой плащ.',bonus:'+12% к здоровью',mods:{hp:.12},body:'#4a5a6a',trim:'#a0724a',skin:'#e8b890',legs:'#3a3028',head:'horns',cape:'#7a5a3a',codes:['VALHALLA','ВАЛЬХАЛЛА','SKAL']},
  pirate:{name:'Пират',desc:'Треуголка, повязка на глаз и жажда золота.',bonus:'+30% золота, +3% шанс найти предмет',mods:{gold:.30,luck:.03},body:'#2b3f66',trim:'#efe7d6',skin:'#e0b48a',legs:'#2a2420',head:'tricorn',codes:['PIRATE','ПИРАТ','YARR']},
  necro:{name:'Некромант',desc:'Капюшон, зелёные огни глаз, тёмный плащ.',bonus:'3% урона возвращается здоровьем',mods:{leech:.03},body:'#2a1f33',trim:'#7fdc7f',skin:'#b8c8b0',legs:'#1a1222',head:'hood',cape:'#1a1222',codes:['NECRO','НЕКРОМАНТ','LICH']},
  cyborg:{name:'Киборг',desc:'Гость из будущего: металл и голубой визор.',bonus:'+12% к скорости атаки',mods:{aspd:.12},body:'#5d6b78',trim:'#33e0ff',skin:'#9aa8b4',legs:'#3d4852',head:'visor',codes:['CYBORG','КИБОРГ','2077']},
  gladiator:{name:'Гладиатор',desc:'Сетчатый шлем, наплечник и рёв арены.',bonus:'+8% к урону, +8% к здоровью',mods:{dmg:.08,hp:.08},body:'#7a5230',trim:'#c0c0c0',skin:'#d8a878',legs:'#4a3020',head:'gladiator',codes:['ARENA','АРЕНА','GLADIATOR']},
  phoenix:{name:'Феникс',secret:true,desc:'Секретный костюм. Огненный венец и пламенный плащ.',bonus:'Регенерация 1% здоровья/с, раз за акт воскрешает',mods:{regen:.01,revive:1},body:'#c64a10',trim:'#ffd34d',skin:'#f0c090',legs:'#7a2a08',head:'phoenix',cape:'#ff7a1a',codes:['PHOENIX','ФЕНИКС']},
  olympian:{name:'Олимпиец',reward:true,desc:'Золотой доспех победителя. Даётся за прохождение кампании.',bonus:'+10% к урону, здоровью и броне',mods:{dmg:.10,hp:.10,armor:.10},body:'#e8d8a8',trim:'#ffd34d',skin:'#f0c8a0',legs:'#c8b080',head:'olympian',cape:'#f5f0e6',codes:['OLYMPUS','ОЛИМП']},
};
/* enemies: spd in tiles/s, r in tiles */
const ET={
  satyr:{n:'Сатир',shape:'humanoid',c:'#7b4f2e',h:'#c99a6b',lg:'#5a3a20',r:.32,hp:38,dmg:6,spd:3.1,xp:10,horns:1,wpn:'club',hoof:1},
  boar:{n:'Вепрь',shape:'beast',c:'#5a4434',r:.4,hp:50,dmg:8,spd:3.9,xp:12,tusk:1,mane:'#3a2a1e'},
  harpy:{n:'Гарпия',shape:'flyer',c:'#7d5a99',h:'#e0b48a',r:.3,hp:28,dmg:6,spd:3.6,xp:11,ranged:1,pc:'#c9a0ff',hair:'#3a2040'},
  scorpion:{n:'Гигантский скорпион',shape:'insect',c:'#9a6a26',r:.4,hp:50,dmg:8,spd:3.3,xp:12,tail:1},
  mummy:{n:'Мумия',shape:'humanoid',c:'#cfc3a0',h:'#cfc3a0',lg:'#b8ac88',r:.32,hp:70,dmg:9,spd:2.2,xp:13,wrap:1,wpn:'none',glow:'#7ad0ff'},
  jackal:{n:'Шакалоголовый лучник',shape:'humanoid',c:'#2f3346',h:'#2a2420',lg:'#d8c8a0',r:.3,hp:34,dmg:7,spd:3.1,xp:12,ranged:1,pc:'#f5d76e',ears:1,wpn:'bow',gold:1},
  tiger:{n:'Тигр-людоед',shape:'beast',c:'#d47a1f',r:.42,hp:55,dmg:9,spd:4.4,xp:13,stripes:1},
  terracotta:{n:'Терракотовый воин',shape:'humanoid',c:'#a0603a',h:'#b87050',lg:'#8a5030',r:.34,hp:85,dmg:9,spd:2.2,xp:14,wpn:'spear',helmet:'#8a5030'},
  fox:{n:'Лисий дух',shape:'ghost',c:'#ff9f5a',r:.3,hp:36,dmg:8,spd:3.6,xp:13,ranged:1,pc:'#ffb36b',fox:1},
  cyclops:{n:'Циклоп',shape:'humanoid',c:'#8a7a5a',h:'#b59a72',lg:'#6a5a40',r:.55,hp:140,dmg:16,spd:2.4,xp:24,eye:1,wpn:'club',big:1},
  fury:{n:'Эриния',shape:'flyer',c:'#5a2a3a',h:'#c08a8a',r:.3,hp:40,dmg:9,spd:3.9,xp:14,ranged:1,pc:'#ff5a5a',hair:'#2a8a3a'},
  automaton:{n:'Бронзовый автоматон',shape:'golem',c:'#b0772f',r:.42,hp:95,dmg:11,spd:2.5,xp:16,glow:'#ffd060'},
  wolf:{n:'Лютоволк',shape:'beast',c:'#7a8590',r:.4,hp:50,dmg:9,spd:4.6,xp:13,mane:'#5a6570'},
  draugr:{n:'Драугр',shape:'humanoid',c:'#4a5a4f',h:'#8fa79a',lg:'#3a4a3f',r:.32,hp:75,dmg:10,spd:2.7,xp:14,wpn:'axe',helmet:'#6a7078',glow:'#7affff'},
  frostgiant:{n:'Инеистый великан',shape:'humanoid',c:'#6f9fc8',h:'#bfe0f5',lg:'#4f7fa8',r:.55,hp:150,dmg:15,spd:2,xp:25,ranged:1,pc:'#bfeaff',big:1,beard:'#e8f6ff',wpn:'none'},
  triton:{n:'Тритон',shape:'humanoid',c:'#2f8f7f',h:'#5fc8b0',lg:'#1f6f5f',r:.32,hp:55,dmg:9,spd:3,xp:13,ranged:1,pc:'#7fffe0',wpn:'spear',fins:1},
  crab:{n:'Панцирный краб',shape:'insect',c:'#c0482f',r:.42,hp:80,dmg:9,spd:2.7,xp:14,claws:1},
  siren:{n:'Сирена',shape:'flyer',c:'#3a7fb0',h:'#e0c8b0',r:.3,hp:40,dmg:10,spd:3.8,xp:14,ranged:1,pc:'#9fd8ff',hair:'#e0a040'},
  shade:{n:'Тень',shape:'ghost',c:'#7a6a9a',r:.3,hp:45,dmg:10,spd:3.8,xp:14},
  skeleton:{n:'Скелет-гоплит',shape:'humanoid',c:'#d8d2c0',h:'#e8e2d0',lg:'#d8d2c0',r:.32,hp:60,dmg:11,spd:3,xp:14,bones:1,wpn:'spear',helmet:'#9a7a3a',shieldE:1},
  hound:{n:'Адская гончая',shape:'beast',c:'#5a1a14',r:.4,hp:60,dmg:11,spd:4.8,xp:15,fire:1},
};
const BOSS={
  gorgon:{n:'Горгона Эвриала',shape:'serpent',c:'#3f7a3a',h:'#9fd07a',r:.95,hp:520,dmg:15,spd:2.6,xp:400,abil:['burst','summon','gaze'],pc:'#b6ff7a',minion:'satyr'},
  sobek:{n:'Себек-Пожиратель',shape:'beast',c:'#3d5a2a',r:1.05,hp:800,dmg:19,spd:3,xp:650,abil:['charge','slam','summon'],minion:'scorpion',croc:1},
  jadegolem:{n:'Нефритовый колосс',shape:'golem',c:'#3aa57a',r:1.1,hp:1000,dmg:22,spd:2,xp:900,abil:['slam','burst','summon'],pc:'#7affc8',minion:'terracotta',glow:'#d8fff0'},
  typhon:{n:'Тифон, отец чудовищ',shape:'humanoid',c:'#4a2a6a',h:'#8a6ab5',lg:'#3a1a5a',r:1.2,hp:1400,dmg:27,spd:2.4,xp:1500,abil:['burst','slam','summon','charge'],pc:'#d07aff',minion:'fury',big:1,snakes:1,wpn:'club'},
  ymir:{n:'Ётун Хримтурс',shape:'humanoid',c:'#5a8fc0',h:'#d8f0ff',lg:'#3a6fa0',r:1.2,hp:1800,dmg:31,spd:2.2,xp:2000,abil:['slam','burst','summon'],pc:'#cfefff',minion:'wolf',big:1,beard:'#f0faff',wpn:'axe',crown:1},
  leviathan:{n:'Левиафан',shape:'serpent',c:'#1f5f7a',h:'#5fc0d0',r:1.15,hp:2200,dmg:35,spd:2.9,xp:2600,abil:['burst','charge','summon','gaze'],pc:'#7fe8ff',minion:'crab',sea:1},
  cerberus:{n:'Цербер',shape:'beast',c:'#3a0f0c',r:1.2,hp:2800,dmg:40,spd:3.4,xp:3400,abil:['charge','burst','summon','slam'],pc:'#ff6a2a',minion:'hound',heads:3,fire:1},
};
const CHAMP_AFF=[
  {id:'fire',n:'Огненный',c:'#ff7a2a'},{id:'fast',n:'Быстрый',c:'#ffe07a'},{id:'stone',n:'Каменнокожий',c:'#b0a890'},{id:'vamp',n:'Кровопийца',c:'#d03050'},{id:'frost',n:'Ледяной',c:'#9fdfff'}];
const LAIR_NAMES=['Гриммак Свирепый','Ахеронт Клык','Мегера Злоязыкая','Кетос Пожиратель','Борей Ледяной','Тартарос Мрачный','Ликаон Воющий'];
const ACTS=[
  {id:'hellas',tag:'Акт I',name:'Эллада',voidC:'#13202c',voidK:'sky',g:['#7a8a42','#6c7c3a','#93a157'],road:['#bfa97c','#a8946a'],pave:['#d6cdb6','#bfb59e'],water:'#3a7396',liquid:'water',cliff:['#8f7f5e','#5a4c38'],props:['olive','olive','cypress','column','rock','ruin'],decal:'flower',amb:'dust',mode:'dorian',root:146.8,en:['satyr','boar','harpy'],boss:'gorgon',
    intro:'Чудовища вырвались из-под земли. Их предводительница ждёт в руинах храма на северо-востоке.',side:'В оливковой роще засел свирепый вожак. Найдите его логово.'},
  {id:'egypt',tag:'Акт II',name:'Египет',voidC:'#2a1c10',voidK:'sand',g:['#d4b26e','#c6a460','#e2c688'],road:['#ead8aa','#d8c492'],pave:['#e4d4a8','#cdb98c'],water:'#2f7f8e',liquid:'water',cliff:['#b48c52','#7a5a30'],props:['palm','palm','obelisk','rock','ruin','statue'],decal:'sand',amb:'sand',mode:'hijaz',root:138.6,en:['scorpion','mummy','jackal'],boss:'sobek',
    intro:'Пески Нила кишат мертвецами. Себек ждёт у древнего святилища.',side:'Расхитители гробниц разбудили древнего стража. Уничтожьте его.'},
  {id:'orient',tag:'Акт III',name:'Шёлковый путь',voidC:'#0e1812',voidK:'mist',g:['#58744c','#4e6844','#6a865c'],road:['#ab9b7a','#988868'],pave:['#8e8c86','#7c7a74'],water:'#2f6560',liquid:'water',cliff:['#6e6e5c','#3e3e34'],props:['bamboo','bamboo','pine','lantern','rock','pagoda'],decal:'grass',amb:'petal',mode:'penta',root:164.8,en:['tiger','terracotta','fox'],boss:'jadegolem',
    intro:'На Шёлковом пути ожили глиняные армии. Остановите Нефритового колосса.',side:'В бамбуковой чаще прячется лисий оборотень. Отыщите его.'},
  {id:'olympus',tag:'Акт IV',name:'Олимп',voidC:'#9fb4d0',voidK:'clouds',g:['#a6a6b2','#989ca8','#babac6'],road:['#e8e2d4','#d8d1c0'],pave:['#f2ede2','#dfd8ca'],water:'#7fa8d8',liquid:'cloud',cliff:['#b4aebc','#7a7488'],props:['column','column','cypress','statue','rock','ruin'],decal:'cloud',amb:'sparkle',mode:'lydian',root:130.8,en:['cyclops','fury','automaton'],boss:'typhon',
    intro:'Тифон штурмует вершину богов. Это последняя битва основной кампании.',side:'Мятежный циклоп ломает храм Гефеста. Остановите его.'},
  {id:'north',tag:'Дополнение I',name:'Северные руны',dlc:'north',voidC:'#0e1620',voidK:'night',g:['#e4ebf1','#d6dfe8','#f2f6f9'],road:['#a8b4bc','#98a4ac'],pave:['#9aa2aa','#8a9298'],water:'#9ac4dc',liquid:'ice',cliff:['#8a98a6','#4e5a66'],props:['pine','pine','runestone','rock','deadtree'],decal:'snow',amb:'snow',mode:'aeolian',root:110,en:['wolf','draugr','frostgiant'],boss:'ymir',
    intro:'Вечная зима спускается с гор Ётунхейма. Ётун ведёт за собой волков и мертвецов.',side:'Вожак стаи лютоволков рыщет у рунных камней. Выследите его.'},
  {id:'atlantis',tag:'Дополнение II',name:'Затонувшая Атлантида',dlc:'atlantis',voidC:'#04121c',voidK:'abyss',g:['#2f7078','#29646c','#3c828c'],road:['#c8c0a0','#b4ac8c'],pave:['#7ab0b0','#6aa0a0'],water:'#0a3048',liquid:'abyss',cliff:['#2a5a64','#123038'],props:['coral','coral','kelp','column','rock'],decal:'shell',amb:'bubble',mode:'lydian',root:123.5,tint:'rgba(0,70,110,.16)',en:['triton','crab','siren'],boss:'leviathan',
    intro:'Город под волнами пробудил древнего змея. Пройдите по дну до его логова.',side:'Король крабов охраняет сокровищницу Посейдона. Заберите её.'},
  {id:'underworld',tag:'Дополнение III',name:'Врата Аида',dlc:'underworld',voidC:'#0a0508',voidK:'lava',g:['#3a2e40','#322836','#463a4e'],road:['#5a4a50','#4a3c42'],pave:['#4a4048','#3c3438'],water:'#c04a10',liquid:'lava',cliff:['#2a2028','#120c10'],props:['deadtree','deadtree','tomb','rock','column'],decal:'ember',amb:'ember',mode:'locrian',root:116.5,tint:'rgba(70,0,25,.14)',en:['shade','skeleton','hound'],boss:'cerberus',
    intro:'Цербер сорвался с цепи, и мёртвые идут к живым. Закройте врата подземного царства.',side:'Палач Тартара собирает души у реки Стикс. Освободите их.'},
];
const DLC={north:{name:'Северные руны',desc:'Снежный край ётунов: лютоволки, драугры, инеистые великаны и босс Ётун Хримтурс.'},atlantis:{name:'Затонувшая Атлантида',desc:'Подводный город: тритоны, сирены, панцирные крабы и босс Левиафан.'},underworld:{name:'Врата Аида',desc:'Подземное царство: тени, скелеты-гоплиты, адские гончие и трёхголовый Цербер.'}};
const DIFF=[{n:'Обычный',lvl:0,loot:0},{n:'Эпический',lvl:22,loot:.06},{n:'Легендарный',lvl:44,loot:.12}];
const RAR=[{n:'Обычный',c:'#d8d0c0',a:0,m:1},{n:'Магический',c:'#f2d24c',a:1,m:1.12},{n:'Редкий',c:'#5fd068',a:2,m:1.25},{n:'Эпический',c:'#5a9af5',a:3,m:1.42},{n:'Легендарный',c:'#c07af0',a:4,m:1.7}];
const SLOTS=['weapon','offhand','head','chest','legs','arms','ring1','ring2','amulet'];
const SLOTN={weapon:'Оружие',offhand:'Щит',head:'Голова',chest:'Торс',legs:'Ноги',arms:'Руки',ring1:'Кольцо',ring2:'Кольцо',amulet:'Амулет',ring:'Кольцо'};
const WTYPE={
  sword:{n:['Меч','Ксифос','Клинок','Фальката'],spd:1.5,reach:1.45,dmg:1,attr:'str'},
  axe:{n:['Топор','Секира','Лабрис'],spd:1.3,reach:1.45,dmg:1.18,attr:'str'},
  mace:{n:['Булава','Палица','Молот'],spd:1.25,reach:1.4,dmg:1.22,attr:'str'},
  spear:{n:['Копьё','Дори','Гаста'],spd:1.3,reach:2,dmg:1.08,attr:'dex',two:1},
  bow:{n:['Лук','Составной лук','Длинный лук'],spd:1.3,ranged:1,dmg:.98,attr:'dex',two:1},
  staff:{n:['Посох','Жезл стихий','Скипетр'],spd:1.15,ranged:1,dmg:1,attr:'int',two:1,magic:1},
};
const ARM={head:{n:['Шлем','Шапель','Венец','Капюшон'],a:.8},chest:{n:['Кираса','Туника','Чешуйчатый доспех','Мантия'],a:1.6},legs:{n:['Поножи','Кнемиды','Наголенники'],a:1},arms:{n:['Наручи','Браслеты','Перчатки'],a:.7},offhand:{n:['Щит','Гоплон','Пельта','Аспис'],a:1.1},ring:{n:['Кольцо','Перстень','Печатка'],a:0},amulet:{n:['Амулет','Талисман','Оберег','Ожерелье'],a:0}};
const AFF={
  dmg:['ярости',l=>Math.round(2+l*.9)],fire:['пламени',l=>Math.round(2+l*1.1)],light:['грозы',l=>Math.round(2+l*1.1)],
  armor:['бастиона',l=>Math.round(3+l*1.1)],hp:['жизни',l=>Math.round(12+l*7)],mana:['мудрости',l=>Math.round(8+l*3.5)],
  crit:['точности',()=>randi(2,5)],aspd:['вихря',()=>randi(5,12)],move:['ветра',()=>randi(4,9)],spell:['чародейства',()=>randi(6,15)],cdr:['времени',()=>randi(3,7)],
  str:['титана',l=>Math.round(2+l*.5)],dex:['рыси',l=>Math.round(2+l*.5)],int:['оракула',l=>Math.round(2+l*.5)],vit:['стойкости',l=>Math.round(2+l*.5)],
  leech:['вампира',()=>randi(1,3)],regen:['исцеления',l=>+(0.5+l*.12).toFixed(1)],block:['твердыни',()=>randi(3,8)]};
const STATN={dmg:'Урон',fire:'Урон огнём',light:'Урон молнией',armor:'Броня',hp:'Здоровье',mana:'Энергия',crit:'Шанс крита, %',aspd:'Скорость атаки, %',move:'Скорость бега, %',spell:'Урон умений, %',cdr:'Перезарядка, −%',str:'Сила',dex:'Ловкость',int:'Интеллект',vit:'Выносливость',leech:'Вампиризм, %',regen:'Здоровье в секунду',block:'Шанс блока, %'};
const HEROES=['Ахиллеса','Геракла','Ясона','Одиссея','Тесея','Аякса','Персея','Аталанты','Беллерофонта','Гектора','Мелеагра'];
const LEGEND={
  sword:[['Меч Ареса','Кровь на клинке никогда не высыхает.'],['Харпа Персея','Срезала голову чудовищу.']],axe:[['Лабрис Миноса','Знак лабиринта на лезвии.'],['Секира Тора','Гремит, как далёкий гром.']],
  mace:[['Палица Геракла','Сделана из ствола дикой оливы.'],['Молот Гефеста','Всё ещё тёплый от горна.']],spear:[['Копьё Ахиллеса','Только его владелец может им исцелять.'],['Трезубец Посейдона','Пахнет солью и бурей.']],
  bow:[['Лук Артемиды','Серебро луны на тетиве.'],['Лук Филоктета','Стрелы Геракла не знают промаха.']],staff:[['Посох Гекаты','Видит все три дороги.'],['Кадуцей Гермеса','Две змеи шепчут секреты.']],
  head:[['Шлем Аида','Делает невидимым для смертных глаз.'],['Венец Зевса','Искрит перед грозой.']],chest:[['Эгида Афины','Взгляд горгоны застыл на ней навсегда.'],['Шкура Немейского льва','Её не берёт бронза.']],
  legs:[['Поножи Ахилла','Пятка всё же открыта.']],arms:[['Наручи Атланта','Держали небесный свод.']],offhand:[['Щит Персея','Отражает даже взгляд Медузы.'],['Гоплон Леонида','Со щитом или на щите.']],
  ring:[['Кольцо Гигеса','Повернёшь — исчезнешь.'],['Перстень Мидаса','Холодный, как золото.']],amulet:[['Ожерелье Гармонии','Красота с проклятием.'],['Око Гора','Видит сквозь пески времени.']]};
