(function () {
  "use strict";
  const Core = window.FusionCore;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const W = 1280, H = 720;
  const GRID = { x: 259, y: 86, cols: 9, rows: 5, cw: 96.25, ch: 120.25 };
  const CARD_Y = 22;
  const CARD_X = 274, CARD_STEP = 71, CARD_W = 66, CARD_H = 76;
  const TYPES = Object.keys(Core.PLANTS);
  const plantDef = plant => Core.plantDef(plant);
  const LOADOUT_SIZE = 10;
  const RECOMMENDED_LOADOUT = ["sun","pea","nut","potato","frost","chomper","puff","fume","corn","melon"];
  const TAU = Math.PI * 2;
  const BASE_WAVE_SECONDS = 30;
  const SPAWN_GAPS = [9.8,9.2,8.6,8,7.4,6.8,6.2,5.7,5.2,4.8];
  const CARD_SIGILS={pea:"●",sun:"✹",cherry:"✦",nut:"⬢",potato:"◆",frost:"❄",chomper:"◇",gloom:"◉",puff:"·",sunshroom:"☀",fume:"◒",hypno:"◎",iceShroom:"❅",doom:"☢",lilypad:"⌁",pepper:"♨",spikeweed:"✷",torchwood:"♨",tallnut:"▥",lantern:"☀",cactus:"✣",blover:"✤",star:"★",pumpkin:"⬡",magnet:"∩",cabbage:"●",corn:"▦",garlic:"◈",umbrella:"☂",melon:"◉",scaredy:"◌",threepeater:"⋯",squash:"▼",kelp:"≋",cattail:"➤",spikerock:"✸",seaShroom:"◔",flowerpot:"▱",marigold:"✺",coffee:"◐",steelLeaf:"◆",spruce:"➶",spruceBallista:"➵",aloe:"♧",iceLotus:"❉",pineFurnace:"♨",winterBamboo:"▥",snowThorn:"✵"};
  const CLASSIC_SPRITES={chomper:0,torchwood:1,tallnut:2,blover:3,spikeweed:4};
  const TRAIT_SPRITES=Object.fromEntries(TYPES.map((id,index)=>[id,index]));
  const art={plants:new Image(),zombies:new Image(),expansion:new Image(),classic:new Image(),traits:new Image(),background:new Image()};
  art.background.src="assets/classic-lawn-background.jpg?v=2.9.1";
  const ZOMBIE_TEXT={basic:"我是普僵",flag:"我是旗帜僵尸",cone:"我是路障僵尸",pole:"我是撑杆僵尸",bucket:"我是铁桶僵尸",paper:"我是读报僵尸",screen:"我是铁门僵尸",football:"我是橄榄球僵尸",duck:"我是鸭子救生圈僵尸",duckCone:"我是鸭子路障僵尸",duckBucket:"我是鸭子铁桶僵尸",zamboni:"我是雪橇车僵尸",snorkel:"我是潜水僵尸",dolphin:"我是海豚骑士",jackbox:"我是玩偶匣僵尸",balloon:"我是气球僵尸",miner:"我是矿工僵尸",catapult:"我是投篮车僵尸",pogo:"我是跳跳僵尸",ladder:"我是扶梯僵尸",gargantuar:"我是巨人僵尸",gigaGargantuar:"我是红眼巨人僵尸",imp:"我是小鬼僵尸",bungee:"我是蹦极僵尸",yeti:"我是雪人僵尸",snowImp:"我是小雪兽",penguin:"我是僵尸企鹅",emperorPenguin:"我是僵尸帝王企鹅",mammoth:"我是僵尸巨象",peaZombie:"我是豌豆射手僵尸",wallnutZombie:"我是坚果僵尸",squashZombie:"我是窝瓜僵尸",jalapenoZombie:"我是辣椒僵尸",doomZombie:"我是毁灭菇僵尸",gatlingZombie:"我是机枪射手僵尸",danceCommander:"我是舞王指挥官",millenniumKing:"我是千年尸王",obsidianImp:"我是黑曜石小鬼僵尸",blackMammoth:"我是黑橄榄巨象",gatlingVehicle:"我是机枪黑橄榄兵车",commandoImp:"我是特种武装小鬼"};
  const qaDuration = Number(new URLSearchParams(location.search).get("testDuration"));
  const QA_MODE = Number.isFinite(qaDuration) && qaDuration >= 2 && qaDuration < 300;
  const WAVE_SECONDS = QA_MODE ? qaDuration : BASE_WAVE_SECONDS;
  const CHOMPER_RULES={
    fusion015:{biteDamage:200,biteInterval:1.75,devourCooldown:20,devourDamage:2000,shotDamage:80,label:"超级吞噬"},
    ultimate004:{biteDamage:800,biteInterval:1.75,devourCooldown:15,instantDevour:true,shotDamage:300,label:"战神吞噬"}
  };
  function isChomperPlant(p){const def=plantDef(p),name=p.displayName||def?.name||"";return p.baseId==="chomper"||Boolean(p.fusionId&&(def?.materialIds?.includes("chomper")||/大嘴花|樱桃战神|毒蒜战神/.test(name)));}
  function chomperRule(p){const def=plantDef(p),custom=CHOMPER_RULES[p.fusionId];return custom||{biteDamage:Math.max(1,Core.damageFor(p)),biteInterval:Math.max(.6,def.interval||2),devourCooldown:Infinity,shotDamage:Math.max(30,Math.round(Core.damageFor(p)*.3)),label:"吞噬"};}
  function healPlant(p,amount){const cap=isChomperPlant(p)&&p.fusionId?p.maxHp*4:p.maxHp;p.hp=Math.min(cap,p.hp+amount);}
  function isThreepeaterPlant(p){const def=plantDef(p),name=p.displayName||def?.name||"";return p.baseId==="threepeater"||Boolean(p.fusionId&&(def?.materialIds?.includes("threepeater")||name.includes("三线")));}
  function isAshThreepeater(p){return p.fusionId==="fusion201"||p.displayName==="灰烬三线射手";}
  function threepeaterRows(p){return [p.row-1,p.row,p.row+1].filter(row=>row>=0&&row<GRID.rows);}
  function threepeaterShotsPerRow(p){const def=plantDef(p),name=p.displayName||def?.name||"",authored=def.abilities?.shotCount||0;if(/机枪三线|三线机枪/.test(name))return 4;return authored>=6?Math.max(1,Math.round(authored/3)):1;}

  const state = {
    mode: "menu", gameMode: "classic", loadout: [...RECOMMENDED_LOADOUT], paused: false, sound: true, timeStop: false, timeScale: 1, time: 0, battleTime: 0,
    sun: 400, selected: null, hoverCell: null, plants: [], zombies: [], bullets: [], particles: [], effects: [], suns: [], floaters: [],
    nextUid: 1, spawnTimer: 10, naturalSunTimer: 2.5, wave: 1, waveBanner: 0, mowers: [1,1,1,1,1],
    dragging: null, dragPoint: null, dragTarget: null, dragCell: null, preview: null, pointerDown: null,
    cooldowns: Object.fromEntries(TYPES.map(t => [t, 0])),
    stats: { planted: 0, fusions: 0, discovered: new Set(), kills: 0, sunMade: 0 },
    fps: 60, frameAcc: 0, frameCount: 0, lastFpsAt: 0, zombieKindsSeen: new Set(),
    tutorial: { card: false, planted: false, dragged: false }, cameraShake: 0, lastKillSoundAt: -1
  };

  let audio = null;
  function initAudio() {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
  }
  function tone(freq=440, dur=.08, type="sine", vol=.035, slide=0) {
    if (!state.sound || !audio) return;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, audio.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), audio.currentTime + dur);
    g.gain.setValueAtTime(vol, audio.currentTime); g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + dur);
    o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur);
  }
  function noise(dur=.09,vol=.025){
    if(!state.sound||!audio)return;
    const length=Math.max(1,Math.floor(audio.sampleRate*dur)),buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;gain.gain.setValueAtTime(vol,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);source.connect(gain).connect(audio.destination);source.start();
  }
  function sfx(name) {
    if (name === "plant") { tone(310,.08,"sine",.035,90); setTimeout(()=>tone(510,.07,"sine",.025),55); }
    if (name === "shoot") tone(210,.035,"triangle",.018,-40);
    if (name === "sun") { tone(630,.07,"sine",.03,180); setTimeout(()=>tone(920,.09,"sine",.02),50); }
    if (name === "fuse") { [330,440,660,880].forEach((f,i)=>setTimeout(()=>tone(f,.15,"sine",.035),i*45)); }
    if (name === "select") { tone(520,.045,"sine",.018,70); }
    if (name === "bite") { noise(.06,.018);tone(86,.07,"square",.014,-24); }
    if (name === "kill") { noise(.07,.018);tone(130,.06,"triangle",.018,-55); }
    if (name === "wave") { [294,392,494].forEach((f,i)=>setTimeout(()=>tone(f,.2,"triangle",.03,90),i*75)); }
    if (name === "mower") { noise(.34,.045);tone(72,.38,"sawtooth",.045,45); }
    if (name === "boom") { tone(80,.32,"sawtooth",.07,-30); tone(46,.4,"triangle",.05,-8); }
    if (name === "freeze") { noise(.18,.018);[740,520,360].forEach((f,i)=>setTimeout(()=>tone(f,.28,"sine",.028,-90),i*45)); }
    if (name === "vault") { tone(260,.14,"triangle",.025,280);setTimeout(()=>noise(.08,.018),150); }
    if (name === "slamWind") { tone(92,.42,"sawtooth",.024,55); }
    if (name === "slam") { noise(.28,.055);tone(48,.34,"triangle",.06,-8); }
    if (name === "start") { [262,330,392,523].forEach((f,i)=>setTimeout(()=>tone(f,.14,"sine",.026,45),i*55)); }
    if (name === "pause") tone(240,.12,"sine",.025,-100);
    if (name === "resume") tone(260,.12,"sine",.025,150);
    if (name === "timeStop") { tone(520,.35,"sine",.022,-340);setTimeout(()=>tone(118,.45,"triangle",.018,-35),80); }
    if (name === "timeResume") tone(170,.18,"sine",.02,280);
    if (name === "lose") { [260,196,147,98].forEach((f,i)=>setTimeout(()=>tone(f,.3,"sawtooth",.032,-25),i*130)); }
  }

  function reset() {
    const tower=state.gameMode==="tower";
    Object.assign(state, {
      mode: "playing", paused: false, timeStop: false, timeScale: 1, time: 0, battleTime: 0, sun: tower?500:400, selected: null, hoverCell: null,
      plants: [], zombies: [], bullets: [], particles: [], effects: [], suns: [], floaters: [], nextUid: 1,
      spawnTimer: 10, naturalSunTimer: 2.5, wave: 1, waveBanner: 2.2, mowers: [1,1,1,1,1],
      dragging: null, dragPoint: null, dragTarget: null, dragCell: null, preview: null, pointerDown: null,
      cooldowns: Object.fromEntries(TYPES.map(t => [t, 0])),
      stats: { planted: 0, fusions: 0, discovered: new Set(), kills: 0, sunMade: 0 },
      cameraShake: 0, zombieKindsSeen: new Set(), lastKillSoundAt: -1
    });
    hidePanels();
    syncTimeStopButton();
    initAudio();
    sfx("start");
    toast(`${tower?"塔防":"经典"}模式开始：先布阵，10 秒后出现僵尸`);
  }

  function hidePanels() {
    document.querySelectorAll(".panel").forEach(p => {
      p.classList.remove("visible");
      p.inert=true;
      p.setAttribute("aria-hidden","true");
    });
  }
  function showPanel(id) {
    hidePanels();
    const panel=document.getElementById(id);
    panel.classList.add("visible");
    panel.inert=false;
    panel.setAttribute("aria-hidden","false");
  }
  let toastTimer;
  function toast(text) {
    const el = document.getElementById("toast"); el.textContent = text; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove("show"), 1900);
  }
  function syncTimeStopButton(){const button=document.getElementById("timeStopBtn"),ready=state.mode==="playing"&&!state.paused;button.disabled=!ready;button.classList.toggle("ready",ready);button.classList.toggle("active",ready&&state.timeStop);button.setAttribute("aria-pressed",String(ready&&state.timeStop));button.setAttribute("aria-label",state.timeStop?"关闭时停":"开启时停");button.querySelector("b").textContent=state.timeStop?"恢复":"时停";button.querySelector("small").textContent=state.timeStop?"正常流速":"8% 流速";}
  function toggleTimeStop(){if(state.mode!=="playing"||state.paused)return;state.timeStop=!state.timeStop;sfx(state.timeStop?"timeStop":"timeResume");toast(state.timeStop?"时停开启：再次点击左下角按钮恢复":"时停结束：恢复正常速度");syncTimeStopButton();}

  function cellAt(x,y) {
    const col = Math.floor((x-GRID.x)/GRID.cw), row = Math.floor((y-GRID.y)/GRID.ch);
    return row>=0 && row<GRID.rows && col>=0 && col<GRID.cols ? {row,col} : null;
  }
  function plantAt(row,col) { return state.plants.find(p=>p.alive && p.row===row && p.col===col); }
  function cellCenter(row,col) { return { x: GRID.x + col*GRID.cw + GRID.cw/2, y: GRID.y + row*GRID.ch + GRID.ch/2 }; }
  function canvasPoint(evt) {
    const r=canvas.getBoundingClientRect(); return {x:(evt.clientX-r.left)*W/r.width, y:(evt.clientY-r.top)*H/r.height};
  }
  function cardAt(x,y) {
    if (y < CARD_Y || y > CARD_Y+CARD_H) return null;
    const i=Math.floor((x-CARD_X)/CARD_STEP);
    if(i>=0&&i<state.loadout.length){const bx=CARD_X+i*CARD_STEP;if(x>=bx&&x<=bx+CARD_W)return state.loadout[i];}
    return null;
  }

  canvas.addEventListener("pointerdown", e => {
    if (state.mode!=="playing" || state.paused) return;
    initAudio(); canvas.setPointerCapture(e.pointerId);
    const pt=canvasPoint(e), card=cardAt(pt.x,pt.y), cell=cellAt(pt.x,pt.y);
    if (card) { selectCard(card); return; }
    if (!cell) return;
    const plant=plantAt(cell.row,cell.col);
    if (plant && state.selected) {
      fuseSelectedInto(plant);
    } else if (plant) {
      state.pointerDown={pt,plant,at:performance.now()};
      state.dragPoint=pt;
    } else if (state.selected) placeSelected(cell.row,cell.col);
  });
  canvas.addEventListener("pointermove", e => {
    const pt=canvasPoint(e); state.hoverCell=cellAt(pt.x,pt.y);
    if (state.pointerDown && !state.dragging) {
      const d=Math.hypot(pt.x-state.pointerDown.pt.x,pt.y-state.pointerDown.pt.y);
      if(d>10) { state.dragging=state.pointerDown.plant; state.dragging.dragging=true; state.tutorial.dragged=true; }
    }
    if (state.dragging) {
      state.dragPoint=pt; const c=cellAt(pt.x,pt.y); const target=c?plantAt(c.row,c.col):null;
      state.dragTarget=target && target.uid!==state.dragging.uid ? target : null;
      state.dragCell=c && !target && (c.row!==state.dragging.row||c.col!==state.dragging.col) ? c : null;
      state.preview=state.dragTarget?Core.previewFusion(state.dragging,state.dragTarget):null;
    }
  });
  canvas.addEventListener("pointerup", e => {
    if (state.dragging) {
      state.dragging.dragging=false;
      if (state.dragTarget && state.preview?.valid) commitFusion(state.dragging,state.dragTarget);
      else if(state.dragCell&&!plantAt(state.dragCell.row,state.dragCell.col)){
        const moved=state.dragging;moved.row=state.dragCell.row;moved.col=state.dragCell.col;
        const c=cellCenter(moved.row,moved.col);burstParticles(c.x,c.y,"#baf59f",12,48);floater(c.x,c.y-48,"已移动","#d9ffc7");sfx("plant");
      }
      else if (state.preview && !state.preview.valid) toast(state.preview.reason);
    } else if (state.pointerDown) {
      const p=state.pointerDown.plant; toast(`${p.displayName} · ${p.rank}★ · ${Math.ceil(p.hp)}/${p.maxHp} 耐久`);
    }
    state.dragging=null; state.dragTarget=null; state.dragCell=null; state.preview=null; state.pointerDown=null;
  });
  canvas.addEventListener("pointercancel", ()=>{ if(state.dragging)state.dragging.dragging=false; state.dragging=null; state.dragTarget=null; state.dragCell=null; state.pointerDown=null; state.preview=null; });

  function selectCard(id) {
    const def=Core.PLANTS[id];
    if(state.cooldowns[id]>0) { toast(`卡片还需冷却 ${state.cooldowns[id].toFixed(1)} 秒`); return; }
    if(state.sun<def.cost) { toast("阳光不足"); tone(120,.12,"square",.02); return; }
    state.selected=state.selected===id?null:id; state.tutorial.card=true; sfx("select");
  }
  function placeSelected(row,col) {
    const id=state.selected, def=Core.PLANTS[id]; if(!id||plantAt(row,col))return;
    if(state.sun<def.cost) { state.selected=null; toast("阳光不足"); return; }
    const plant=Core.createPlant(id,state.nextUid++,row,col); state.plants.push(plant);
    state.sun-=def.cost; state.cooldowns[id]=def.cooldown; state.stats.planted++; state.selected=null; state.tutorial.planted=true;
    const c=cellCenter(row,col); burstParticles(c.x,c.y,def.color,18,60); floater(c.x,c.y-40,`-${def.cost} ☀`,"#ffe47d"); sfx("plant");
    if(def.body==="burst") plant.detonate=.8;
  }
  function fuseSelectedInto(host) {
    const id=state.selected,def=Core.PLANTS[id];if(!id||!host)return;
    if(state.cooldowns[id]>0){toast(`卡片还需冷却 ${state.cooldowns[id].toFixed(1)} 秒`);return;}
    if(state.sun<def.cost){state.selected=null;toast("阳光不足");tone(120,.12,"square",.02);return;}
    const donor=Core.createPlant(id,state.nextUid,host.row,host.col),preview=Core.previewFusion(donor,host);
    if(!preview.valid){toast(preview.reason);tone(120,.12,"square",.02);return;}
    state.nextUid++;state.sun-=def.cost;state.cooldowns[id]=def.cooldown;state.stats.planted++;state.selected=null;state.tutorial.planted=true;state.tutorial.dragged=true;
    const c=cellCenter(host.row,host.col);floater(c.x,c.y+42,`-${def.cost} ☀`,"#ffe47d");commitFusion(donor,host);
  }
  function commitFusion(donor,host) {
    const preview=Core.previewFusion(donor,host); const c=cellCenter(host.row,host.col);
    const result=Core.fuse(donor,host); if(!result.ok)return;
    host.devourCharge=isChomperPlant(host)&&host.fusionId?0:undefined;
    donor.alive=false; state.stats.fusions++; state.stats.discovered.add(preview.name);
    burstParticles(c.x,c.y,"#f5df78",36,130); burstParticles(c.x,c.y,Core.PLANTS[donor.baseId].color,24,90);
    floater(c.x,c.y-58,preview.name,preview.authored?"#ffe27a":"#b9f4a0",1.2); state.cameraShake=5; sfx("fuse");
    toast(`${preview.name}：${preview.note}`);
  }

  function update(dt,realDt=dt) {
    state.time+=realDt; state.frameAcc+=realDt; state.frameCount++;
    if(state.time-state.lastFpsAt>=.5){state.fps=Math.round(state.frameCount/state.frameAcc);state.frameAcc=0;state.frameCount=0;state.lastFpsAt=state.time;}
    updateParticles(realDt); updateEffects(realDt); if(state.mode!=="playing"||state.paused)return;
    state.battleTime+=dt; state.waveBanner=Math.max(0,state.waveBanner-dt); state.cameraShake=Math.max(0,state.cameraShake-dt*20);
    const classicFinished=state.gameMode==="classic"&&state.battleTime>=WAVE_SECONDS*10;
    const nextWave=Math.min(state.gameMode==="classic"?10:Infinity,Math.floor(state.battleTime/WAVE_SECONDS)+1);
    if(nextWave!==state.wave){
      state.wave=nextWave;state.waveBanner=2.4;sfx("wave");
      const reward=25+Math.min(75,Math.floor(state.wave/5)*10);state.sun+=reward;floater(640,118,`第 ${state.wave} 波 · +${reward} 阳光`,"#ffe173",1.05);
      if(QA_MODE)for(const [i,kind] of poolForWave(state.wave).entries()){state.zombieKindsSeen.add(kind);state.zombies.push(makeZombie(kind,i%5,1110+i*18));}
    }
    for(const k of TYPES) state.cooldowns[k]=Math.max(0,state.cooldowns[k]-dt);
    state.naturalSunTimer-=dt;
    if(state.naturalSunTimer<=0){spawnSun(160+Math.random()*900,90+Math.random()*360,25,true);state.naturalSunTimer=(state.gameMode==="tower"?5:5.5)+Math.random()*1.5;}
    state.spawnTimer-=dt;
    if(!classicFinished&&state.spawnTimer<=0&&state.zombies.length<48){spawnZombie();const base=SPAWN_GAPS[Math.min(9,state.wave-1)],endless=state.gameMode==="tower"?Math.pow(.992,Math.max(0,state.wave-10)):1;state.spawnTimer=Math.max(2.7,base*endless)*(.92+Math.random()*.28);}
    updatePlants(dt); updateBullets(dt); updateZombies(dt); updateSuns(dt);
    state.plants=state.plants.filter(p=>p.alive); state.zombies=state.zombies.filter(z=>z.alive); state.bullets=state.bullets.filter(b=>b.alive); state.suns=state.suns.filter(s=>s.alive);
    if(classicFinished&&state.zombies.length===0)winClassic();
  }

  function updatePlants(dt) {
    for(const p of state.plants){if(!p.alive)continue;p.age+=dt;p.hitFlash=Math.max(0,p.hitFlash-dt*4);p.attackAnim=Math.max(0,(p.attackAnim||0)-dt);p.freeze=Math.max(0,(p.freeze||0)-dt);const chomper=isChomperPlant(p);if(chomper&&p.fusionId){const rule=chomperRule(p);p.devourCharge=Math.min(rule.devourCooldown,(p.devourCharge||0)+dt);if(p.hp>p.maxHp)p.hp=Math.max(p.maxHp,p.hp-p.maxHp*.05*dt);}if(p.freeze>0||p.dragging)continue;const rate=(p.baseId==="coffee"?1.18:1)*(p.genes.includes("haste")?1.3:1);p.timer-=dt*rate;
      const def=plantDef(p);
      if(def.body==="burst"&&!chomper){p.detonate-=dt;if(p.detonate<=0)explodePlant(p);continue;}
      const center=cellCenter(p.row,p.col);
      const hasEnemy=isAshThreepeater(p)?false:isThreepeaterPlant(p)
        ? state.zombies.some(z=>z.alive&&threepeaterRows(p).includes(z.row)&&z.x>center.x-10)
        : p.baseId==="gloom"
        ? state.zombies.some(z=>z.alive&&Math.abs(z.x-center.x)<=GRID.cw*1.5&&Math.abs(z.y-center.y)<=GRID.ch*1.5)
        : p.baseId==="star"
          ? state.zombies.some(z=>z.alive)
          : state.zombies.some(z=>z.alive&&z.row===p.row&&z.x>center.x-10);
      if(chomper&&p.timer<=0)chomp(p);
      else if(p.baseId==="gloom")updateGloom(p,dt,hasEnemy);
      else if(p.baseId==="fume")updateFume(p,hasEnemy);
      else if(def.body==="shooter"&&hasEnemy&&p.timer<=0){shoot(p);p.timer=def.interval/(1+(p.rank-1)*.08);}
      if(def.body==="producer"&&p.timer<=0){produce(p);p.timer=def.interval/(p.genes.includes("guard")?1.18:1);}
      if(def.body==="support"&&p.timer<=0){supportPulse(p);p.timer=def.interval;}
      if(def.body==="melee"&&!chomper&&p.timer<=0){chomp(p);}
      if(def.body==="trap"&&p.timer<=0){spikeAttack(p);p.timer=def.interval;}
      if(!chomper&&def.body==="guard"&&p.genes.includes("shooter")&&p.retaliate>=5){shoot(p,.85);p.retaliate=0;}
      if(p.genes.includes("magnet")&&def.body!=="support"){p.magnetTimer=(p.magnetTimer||8)-dt;if(p.magnetTimer<=0){supportPulse(p);p.magnetTimer=9;}}
      if(p.genes.includes("producer")&&def.body!=="producer"){const sunCycle=def.abilities?.sunCycle||8,sunValue=def.abilities?.sunProduction||10;p.sunTimer=(p.sunTimer||sunCycle)-dt;if(p.sunTimer<=0){spawnSun(cellCenter(p.row,p.col).x,cellCenter(p.row,p.col).y-35,sunValue,false);p.sunTimer=sunCycle;}}
      updateInheritedTraits(p,dt,def,hasEnemy,chomper);
    }
  }
  function updateFume(p,hasEnemy){
    if(!hasEnemy||p.timer>0)return;
    const c=cellCenter(p.row,p.col),def=plantDef(p),targets=state.zombies.filter(z=>z.alive&&z.row===p.row&&z.x>=c.x-10);
    if(!targets.length)return;
    p.attackAnim=.48;
    const damage=Core.damageFor(p);
    for(const z of targets){z.hp-=damage;z.hit=1;z.poison=Math.max(z.poison||0,1.1);if(z.hp<=0)killZombie(z);}
    const right=GRID.x+GRID.cols*GRID.cw;
    state.effects.push({type:"gasRow",x:c.x,y:c.y,w:right-c.x,h:GRID.ch*.58,life:.58,max:.58,color:"#9b63d3"});
    burstParticles(c.x+34,c.y,"#c89aef",28,92);tone(118,.12,"sine",.022,42);
    p.timer=def.interval/(1+(p.rank-1)*.08);
  }
  function updateGloom(p,dt,hasEnemy){
    p.gloomRest=Math.max(0,(p.gloomRest||0)-dt);
    p.gloomPulseTimer=Math.max(0,(p.gloomPulseTimer||0)-dt);
    if(!hasEnemy||p.gloomRest>0||p.gloomPulseTimer>0)return;
    if(!p.gloomShotsLeft)p.gloomShotsLeft=3;
    const c=cellCenter(p.row,p.col),targets=state.zombies.filter(z=>z.alive&&Math.abs(z.x-c.x)<=GRID.cw*1.5&&Math.abs(z.y-c.y)<=GRID.ch*1.5);
    if(!targets.length)return;
    p.attackAnim=.34;
    const damage=p.fusionId?Core.damageFor(p):28;
    for(const z of targets){z.hp-=damage;z.hit=1;z.poison=Math.max(z.poison||0,1.1);z.weaken=Math.max(z.weaken,.18);if(z.hp<=0)killZombie(z);}
    state.effects.push({type:"gasArea",x:c.x,y:c.y,w:GRID.cw*3,h:GRID.ch*3,life:.42,max:.42,color:"#9257c8"});
    burstParticles(c.x,c.y,"#c793ef",32,105);tone(135,.1,"sine",.022,48);
    p.gloomShotsLeft--;
    if(p.gloomShotsLeft>0)p.gloomPulseTimer=.2;
    else{p.gloomShotsLeft=0;p.gloomRest=1.25;}
  }
  function updateInheritedTraits(p,dt,def,hasEnemy,chomper=isChomperPlant(p)){
    const offensive=["shooter","frost","burst","stun","fire","pierce","crit","splash","multishot","nova","deepfreeze","radial","reveal","ignite","gust"],ability=def.abilities||{},abilityAttack=ability.splash||ability.knockback||ability.freeze||ability.fire||ability.stun||ability.pierce||ability.radial||ability.shotCount>1;
    if(!chomper&&!isAshThreepeater(p)&&def.body!=="shooter"&&hasEnemy&&(abilityAttack||p.genes.some(g=>offensive.includes(g)))){p.traitShotTimer=(p.traitShotTimer||.45)-dt;if(p.traitShotTimer<=0){shoot(p,.72);p.traitShotTimer=2.15;}}
    if((ability.heal||p.genes.includes("heal"))&&def.body!=="producer"){p.healTraitTimer=(p.healTraitTimer||3)-dt;if(p.healTraitTimer<=0){const c=cellCenter(p.row,p.col);for(const ally of state.plants)if(ally.alive&&Math.abs(ally.row-p.row)<=1&&Math.abs(ally.col-p.col)<=2)healPlant(ally,65*p.rank);burstParticles(c.x,c.y,"#ffb8d7",15,55);p.healTraitTimer=7;}}
    if(!chomper&&(ability.devour||p.genes.includes("devour"))&&def.body!=="melee"){p.devourTraitTimer=(p.devourTraitTimer||4)-dt;if(p.devourTraitTimer<=0){chomp(p);p.devourTraitTimer=8;}}
    if(p.genes.includes("nova")&&def.body!=="shooter"){p.novaTraitTimer=(p.novaTraitTimer||6)-dt;if(p.novaTraitTimer<=0){const c=cellCenter(p.row,p.col);explosion(c.x,c.y,105,150*p.rank,"#9a65ff");p.novaTraitTimer=9;}}
    if(p.genes.includes("deepfreeze")&&def.body!=="shooter"){p.freezeTraitTimer=(p.freezeTraitTimer||5)-dt;if(p.freezeTraitTimer<=0){const c=cellCenter(p.row,p.col);for(const z of state.zombies)if(z.alive&&Math.abs(z.x-c.x)<165){z.slow=Math.max(z.slow,4);z.stun=Math.max(z.stun,.45);}burstParticles(c.x,c.y,"#d8fbff",18,70);p.freezeTraitTimer=8;}}
    if(p.genes.includes("reveal")&&def.body!=="shooter"&&def.body!=="producer")for(const z of state.zombies)if(z.alive&&z.air&&Math.abs(z.x-cellCenter(p.row,p.col).x)<360){z.grounded=Math.max(z.grounded,1);z.revealed=2;}
  }
  function shoot(p,scale=1) {
    if((isChomperPlant(p)&&p.fusionId)||isAshThreepeater(p))return;
    if(isThreepeaterPlant(p)){shootThreepeater(p,scale);return;}
    const c=cellCenter(p.row,p.col), def=plantDef(p); p.attackCount++;p.attackAnim=.26;
    const ability=def.abilities||{},authoredCount=ability.shotCount>1?ability.shotCount:0;
    let count=authoredCount||(p.baseId==="threepeater"?3:1+(p.genes.includes("shooter")?1:0)+(p.rank>=2&&p.baseId==="pea"?1:0)+(p.genes.includes("multishot")?1:0));
    const isStar=p.baseId==="star",radial=isStar||ability.radial||p.genes.includes("radial"),backShots=radial?0:Math.min(count-1,ability.backShots||0);
    const angles=isStar
      ? Array.from({length:5},(_,i)=>-Math.PI/2+i*TAU/5)
      : radial
          ? [-.42,-.21,0,.21,.42]
          : Array.from({length:count},(_,i)=>i<backShots?Math.PI:0);
    for(let i=0;i<angles.length;i++){
      const a=angles[i],backward=Math.cos(a)<0,speed=radial?305:290,ignited=p.genes.includes("ignite"),tipRadius=isStar?38:0,straightIndex=backward?i:i-backShots,launchY=tipRadius?c.y+Math.sin(a)*tipRadius:c.y-9;
      state.bullets.push({
        x:tipRadius?c.x+Math.cos(a)*tipRadius:c.x+(backward?-26:26)+(backward?straightIndex*9:-straightIndex*9),
        y:launchY,lineY:radial?null:launchY,
        row:p.row,vx:Math.cos(a)*speed,vy:radial?Math.sin(a)*speed:0,spin:Math.random()*TAU,
        kind:isStar?"star":radial?"star":p.baseId,
        damage:Math.max(8,Core.damageFor(p)*(i&&!radial&&!authoredCount?0.62:1)*scale*(ignited?1.35:1)),
        frost:ability.freeze||p.baseId==="frost"||p.genes.includes("frost")||p.genes.includes("deepfreeze"),deepfreeze:p.genes.includes("deepfreeze"),sunny:ability.sunEvery? p.attackCount%ability.sunEvery===0:p.genes.includes("producer"),sunnyGuaranteed:Boolean(ability.sunEvery&&p.attackCount%ability.sunEvery===0),sunValue:ability.sunValue||10,burst:ability.splash||(p.genes.includes("burst")&&p.attackCount%6===0)||(p.genes.includes("nova")&&p.attackCount%10===0),stun:ability.stun||p.baseId==="corn"||p.genes.includes("stun"),fire:ability.fire||p.genes.includes("fire")||ignited,gust:p.genes.includes("gust"),crit:p.baseId==="cactus"||p.genes.includes("crit"),light:p.baseId==="lantern"||p.genes.includes("reveal"),magnet:p.genes.includes("magnet"),splash:ability.splash||p.baseId==="melon"||p.baseId==="cabbage"||p.genes.includes("splash"),knockback:Boolean(ability.knockback),bounce:Boolean(ability.bounce),hitsLeft:ability.pierce?99:["puff","fume","gloom"].includes(p.baseId)||p.genes.includes("pierce")?2:1,hitIds:[],alive:true,life:4,color:ignited?"#ff9148":def.color
      });
    }
    sfx("shoot");
  }
  function shootThreepeater(p,scale=1){
    const c=cellCenter(p.row,p.col),def=plantDef(p),ability=def.abilities||{},rows=threepeaterRows(p),shotsPerRow=threepeaterShotsPerRow(p),ignited=ability.fire||p.genes.includes("fire")||p.genes.includes("ignite");p.attackCount++;p.attackAnim=.32;
    for(const row of rows){const launchY=cellCenter(row,p.col).y-9;for(let i=0;i<shotsPerRow;i++)state.bullets.push({x:c.x+26-i*9,y:launchY,lineY:launchY,row,vx:290,vy:0,spin:0,kind:"threepeater",damage:Math.max(1,Core.damageFor(p)*scale),frost:ability.freeze||p.genes.includes("frost"),deepfreeze:p.genes.includes("deepfreeze"),sunny:false,sunnyGuaranteed:false,sunValue:0,burst:Boolean(ability.splash),stun:Boolean(ability.stun),fire:ignited,gust:p.genes.includes("gust"),crit:p.genes.includes("crit"),light:false,magnet:false,splash:Boolean(ability.splash),knockback:Boolean(ability.knockback),bounce:false,hitsLeft:ability.pierce?99:p.genes.includes("pierce")?2:1,hitIds:[],alive:true,life:4,color:ignited?"#ff704d":def.color});}
    sfx("shoot");
  }
  function produce(p) {
    const c=cellCenter(p.row,p.col), value=25+(p.rank-1)*10;p.attackAnim=.55; spawnSun(c.x,c.y-38,value,false);
    if(p.baseId==="lotus"||p.genes.includes("heal"))for(const ally of state.plants)if(ally.alive&&Math.abs(ally.row-p.row)<=1&&Math.abs(ally.col-p.col)<=2)healPlant(ally,90*p.rank);
    if(p.baseId==="lantern")for(const z of state.zombies)if(z.alive&&Math.abs(z.x-c.x)<560&&z.air){z.grounded=Math.max(z.grounded||0,5);z.revealed=3;burstParticles(z.x,z.y-25,"#ffe882",8,40);}
    if(p.genes.includes("shooter")||p.genes.includes("pierce")||p.baseId==="lantern")for(let i=0;i<(p.baseId==="lantern"?2:3);i++)state.bullets.push({x:c.x+18-i*9,y:c.y-12,lineY:c.y-12,row:p.row,vx:270,vy:0,spin:0,kind:p.baseId==="lantern"?"light":"seed",damage:(p.baseId==="lantern"?18:10)*p.rank,frost:false,sunny:false,stun:p.genes.includes("stun"),fire:p.genes.includes("fire"),light:p.baseId==="lantern"||p.genes.includes("reveal"),hitsLeft:p.genes.includes("pierce")?2:1,hitIds:[],alive:true,life:4,color:"#f2d35d"});
  }
  function supportPulse(p){
    p.attackAnim=.5;const c=cellCenter(p.row,p.col);
    if(p.baseId==="torchwood"){state.effects.push({type:"flameAura",x:c.x,y:c.y,life:.65,max:.65,color:"#ff9a46"});for(const z of state.zombies)if(z.alive&&z.row===p.row&&Math.abs(z.x-c.x)<85){z.burn=Math.max(z.burn,2.5);z.hp-=30*p.rank;}return;}
    if(p.baseId==="coffee"){for(const ally of state.plants)if(ally.alive&&Math.abs(ally.row-p.row)<=1&&Math.abs(ally.col-p.col)<=1)ally.timer=Math.max(0,ally.timer-.9);burstParticles(c.x,c.y,"#d7a878",16,65);return;}
    if(p.baseId==="pineFurnace"){state.effects.push({type:"flameAura",x:c.x,y:c.y,life:.65,max:.65,color:"#ff9a46"});for(const z of state.zombies)if(z.alive&&Math.abs(z.x-c.x)<GRID.cw*1.5&&Math.abs(z.y-c.y)<GRID.ch*1.5){z.burn=Math.max(z.burn,3);z.hp-=36*p.rank;if(z.hp<=0)killZombie(z);}return;}
    const targets=state.zombies.filter(z=>z.alive&&Math.abs(z.x-c.x)<610&&z.metal).sort((a,b)=>Math.abs(a.x-c.x)-Math.abs(b.x-c.x));const target=targets[0];if(!target){p.timer=Math.min(p.timer,2.2);return;}if(!target.metalStripped){const strip=Math.min(target.hp-1,Math.max(90,target.maxHp*.3));target.hp-=strip;target.metalStripped=true;target.revealed=4;floater(target.x,target.y-75,"护甲剥离","#9cf4ff");state.effects.push({type:"magnet",x:c.x,y:c.y,tx:target.x,ty:target.y-25,life:.55,max:.55,color:"#f16a67"});burstParticles(target.x,target.y-25,"#b8d8dc",18,90);tone(180,.22,"sawtooth",.025,260);}else{target.stun=Math.max(target.stun,.65);target.hp-=35*p.rank;}}
  function fireChomperBullet(p,damage){
    const c=cellCenter(p.row,p.col),def=plantDef(p),ability=def.abilities||{};
    state.bullets.push({x:c.x+30,y:c.y-8,lineY:c.y-8,row:p.row,vx:290,vy:0,spin:0,kind:"chompSeed",damage,frost:Boolean(ability.freeze),deepfreeze:p.genes.includes("deepfreeze"),sunny:false,sunnyGuaranteed:false,sunValue:0,burst:Boolean(ability.splash),stun:Boolean(ability.stun),fire:Boolean(ability.fire),gust:false,crit:false,light:false,magnet:false,splash:Boolean(ability.splash),knockback:Boolean(ability.knockback),bounce:false,hitsLeft:ability.pierce?99:1,hitIds:[],alive:true,life:4,color:def.color});
    sfx("shoot");
  }
  function chomp(p){
    const c=cellCenter(p.row,p.col),target=state.zombies.filter(z=>z.alive&&!z.air&&z.row===p.row&&z.x>c.x-22&&z.x<c.x+138).sort((a,b)=>a.x-b.x)[0];
    if(!target){p.timer=.22;return;}
    p.attackAnim=.72;state.effects.push({type:"chomp",x:target.x,y:target.y-18,life:.42,max:.42,color:"#dd7ad0"});
    if(p.fusionId&&isChomperPlant(p)){
      const rule=chomperRule(p),charged=Number.isFinite(rule.devourCooldown)&&(p.devourCharge||0)>=rule.devourCooldown,damage=charged&&rule.instantDevour?target.hp:charged?rule.devourDamage:rule.biteDamage;
      target.hp-=damage;target.hit=1;target.stun=Math.max(target.stun,.28);healPlant(p,p.maxHp/3);fireChomperBullet(p,rule.shotDamage);
      if(charged){p.devourCharge=0;floater(target.x,target.y-74,rule.instantDevour?"吞噬秒杀!":`${rule.label} ${rule.devourDamage}`,"#ffd36f");}
      else floater(target.x,target.y-72,`啃咬 ${rule.biteDamage}`,"#ffd1f5");
      if(target.hp<=0)killZombie(target);p.timer=rule.biteInterval;tone(125,.16,"sawtooth",.026,-55);return;
    }
    if(target.kind!=="giant"&&target.maxHp<1800){target.hp=0;killZombie(target);floater(target.x,target.y-74,"吞噬!","#ffd1f5");p.timer=Math.max(5.5,plantDef(p).interval-(p.rank-1));}
    else{target.hp-=120*p.rank;target.stun=Math.max(target.stun,.55);if(target.hp<=0)killZombie(target);p.timer=2.4;}tone(125,.16,"sawtooth",.026,-55);
  }
  function spikeAttack(p){const c=cellCenter(p.row,p.col),targets=state.zombies.filter(z=>z.alive&&!z.air&&z.row===p.row&&Math.abs(z.x-c.x)<54);if(!targets.length){p.timer=.18;return;}p.attackAnim=.26;for(const z of targets){z.hp-=Core.damageFor(p)*p.rank;z.hit=1;if(p.baseId==="snowThorn"||p.genes.includes("frost"))z.slow=Math.max(z.slow,2.5);if(z.hp<=0)killZombie(z);}burstParticles(c.x,c.y+18,"#d9e2b2",7,38);}
  function mostDangerousRow(){let best=0,score=-1;for(let r=0;r<5;r++){const s=state.zombies.filter(z=>z.alive&&z.row===r).reduce((a,z)=>a+(1100-z.x),0);if(s>score){score=s;best=r;}}return best;}
  function explodePlant(p){const c=cellCenter(p.row,p.col);p.attackAnim=.6;if(p.baseId==="pepper")lineExplosion(p.row,Core.damageFor(p)||620);else if(p.baseId==="doom"){state.effects.push({type:"doom",x:c.x,y:c.y,life:1,max:1,color:"#9a65ff"});explosion(c.x,c.y,285,Core.damageFor(p)||1380,"#8a4dff");state.cameraShake=15;}else if(p.baseId==="iceShroom"){globalFreeze(c.x,c.y,Core.damageFor(p)||60);}else if(p.baseId==="blover"){sfx("freeze");state.effects.push({type:"gust",x:c.x,y:c.y,life:1,max:1,color:"#b8ffd1"});for(const z of state.zombies)if(z.alive&&z.air){z.hp-=Math.max(180,z.maxHp*.42);z.grounded=7;z.x+=210;z.stun=1.3;if(z.hp<=0)killZombie(z);}burstParticles(c.x,c.y,"#b8ffd1",50,170);}else explosion(c.x,c.y,150,Core.damageFor(p)||900);p.alive=false;}
  function lineExplosion(row,damage){state.cameraShake=10;sfx("boom");for(let x=GRID.x;x<1240;x+=58)burstParticles(x,GRID.y+row*GRID.ch+GRID.ch/2,"#ff704d",5,110);for(const z of state.zombies)if(z.alive&&z.row===row){z.hp-=damage;z.hit=1;z.burn=3;if(z.hp<=0)killZombie(z);}}
  function explosion(x,y,radius,damage,color="#ef5c61"){state.cameraShake=9;sfx("boom");state.effects.push({type:"ring",x,y,life:.55,max:.55,color});burstParticles(x,y,"#ffbc62",46,210);burstParticles(x,y,color,34,150);for(const z of state.zombies)if(z.alive&&Math.hypot(z.x-x,z.y-y)<radius){z.hp-=damage;z.hit=1;if(z.hp<=0)killZombie(z);}}
  function globalFreeze(x,y,damage){sfx("freeze");state.effects.push({type:"freeze",x,y,life:1.1,max:1.1,color:"#baf7ff"});for(const z of state.zombies)if(z.alive){z.hp-=damage;z.stun=Math.max(z.stun,4.2);z.slow=Math.max(z.slow,7);z.grounded=Math.max(z.grounded||0,4.2);if(z.hp<=0)killZombie(z);}for(let i=0;i<80;i++)burstParticles(Math.random()*W,100+Math.random()*470,"#d8fbff",1,45);}
  function splashImpact(x,y,radius,damage){burstParticles(x,y,"#9adb76",9,65);for(const z of state.zombies)if(z.alive&&Math.hypot(z.x-x,z.y-y)<radius){z.hp-=damage;z.hit=1;if(z.hp<=0)killZombie(z);}}

  const ZOMBIE_DEFS={
    basic:{hp:270,speed:18,color:"#8eb38c"},flag:{hp:270,speed:18,color:"#b46f68"},cone:{hp:640,speed:18,color:"#dca14a",armored:true},pole:{hp:500,speed:40,color:"#94ad87",metal:true,vault:true},bucket:{hp:1370,speed:18,color:"#a9b6b4",metal:true,armored:true},paper:{hp:420,speed:18,color:"#a0b59b",rage:1.7},screen:{hp:1370,speed:18,color:"#7fa09b",metal:true,armored:true},football:{hp:1670,speed:50,color:"#a87070",metal:true,armored:true},
    duck:{hp:270,speed:22,color:"#75a7ad",aquatic:true},duckCone:{hp:640,speed:22,color:"#d7a254",aquatic:true,armored:true},duckBucket:{hp:1370,speed:22,color:"#9eafb0",aquatic:true,metal:true,armored:true},zamboni:{hp:1350,speed:20,color:"#a5c9d4",metal:true,armored:true,vehicle:true,bite:120},snorkel:{hp:270,speed:20,color:"#688d91",aquatic:true,stealth:true},dolphin:{hp:500,speed:25,color:"#5f9fab",aquatic:true,vault:true},jackbox:{hp:720,speed:40,color:"#bd6f88",exploder:"area"},balloon:{hp:270,speed:42,color:"#9aaec2",air:true},miner:{hp:270,speed:24,color:"#927f68",metal:true,burrow:true},catapult:{hp:850,speed:16,color:"#9b8061",metal:true,vehicle:true,ranged:80,splash:true},pogo:{hp:720,speed:28,color:"#9aa878",metal:true,vault:true},ladder:{hp:720,speed:20,color:"#998c75",metal:true,armored:true,vault:true},
    gargantuar:{hp:3000,speed:15,color:"#708c72",giant:true,bite:150},gigaGargantuar:{hp:6000,speed:15,color:"#a35e63",giant:true,bite:220,boss:true},imp:{hp:270,speed:30,color:"#a8bd8c"},bungee:{hp:720,speed:26,color:"#8a7799",air:true,bungee:true},yeti:{hp:1350,speed:43,color:"#d9edf0",ice:true,armored:true},snowImp:{hp:300,speed:34,color:"#b8dbe5",ice:true},penguin:{hp:1350,speed:24,color:"#52646a",ice:true,armored:true},emperorPenguin:{hp:1440,speed:22,color:"#394f59",ice:true,armored:true,boss:true},mammoth:{hp:6000,speed:10,color:"#7c695a",giant:true,bite:240,boss:true},
    peaZombie:{hp:270,speed:21,color:"#70ad69",ranged:20},wallnutZombie:{hp:1350,speed:21,color:"#b9854f",armored:true},squashZombie:{hp:500,speed:49,color:"#78a75f",vault:true,bite:500},jalapenoZombie:{hp:500,speed:18,color:"#dd5b45",exploder:"line",bite:1000000},doomZombie:{hp:1350,speed:14,color:"#7f62a8",exploder:"doom",bite:1800},gatlingZombie:{hp:500,speed:21,color:"#4b9760",ranged:20,burstCount:4},danceCommander:{hp:3000,speed:18,color:"#9a5a9d",summon:"commandoImp",armored:true},millenniumKing:{hp:3000,speed:18,color:"#72546e",summon:"obsidianImp",boss:true},obsidianImp:{hp:1500,speed:30,color:"#3f4650",armored:true},blackMammoth:{hp:18000,speed:8,color:"#363536",giant:true,bite:360,boss:true},gatlingVehicle:{hp:3000,speed:12,color:"#4d5350",metal:true,vehicle:true,ranged:50,burstCount:6,armored:true},commandoImp:{hp:1500,speed:30,color:"#596a5b",ranged:35,armored:true}
  };
  const ZOMBIE_ALMANAC={
    basic:{name:"普僵",sigil:"尸",tags:["normal"],firstWave:1,armor:"无",ability:"最基础的僵尸，沿当前行前进并啃咬植物。"},flag:{name:"旗帜僵尸",sigil:"旗",tags:["normal","special"],firstWave:1,armor:"旗帜",ability:"挥舞旗帜带领尸群，是每轮进攻的先导。"},cone:{name:"路障僵尸",sigil:"△",tags:["normal","armored"],firstWave:2,armor:"路障",ability:"路障提供额外耐久。"},pole:{name:"撑杆僵尸",sigil:"⌒",tags:["special","armored"],firstWave:3,armor:"撑杆",ability:"首次接近植物时跳过目标，但无法越过高坚果。"},bucket:{name:"铁桶僵尸",sigil:"▣",tags:["armored"],firstWave:4,armor:"金属铁桶",ability:"重型金属防具，可被磁力类植物剥离。"},paper:{name:"读报僵尸",sigil:"▤",tags:["normal","special"],firstWave:3,armor:"报纸",ability:"生命低于一半后暴怒，移动速度提升。"},screen:{name:"铁门僵尸",sigil:"▰",tags:["armored"],firstWave:4,armor:"金属铁门",ability:"铁门提供高额耐久，可被磁力类植物剥离。"},football:{name:"橄榄球僵尸",sigil:"◆",tags:["armored","special"],firstWave:4,armor:"金属护具",ability:"高耐久、高速度的冲锋单位。"},
    duck:{name:"鸭子救生圈僵尸",sigil:"泳",tags:["normal","water"],firstWave:2,armor:"救生圈",ability:"融合版水池单位，在草地规则中沿当前行推进。"},duckCone:{name:"鸭子救生圈路障僵尸",sigil:"泳△",tags:["armored","water"],firstWave:3,armor:"救生圈与路障",ability:"兼具水池单位与路障耐久。"},duckBucket:{name:"鸭子救生圈铁桶僵尸",sigil:"泳▣",tags:["armored","water"],firstWave:4,armor:"救生圈与铁桶",ability:"重型水池单位，可被磁力类植物破甲。"},zamboni:{name:"雪橇车僵尸",sigil:"车",tags:["armored","special"],firstWave:5,armor:"雪橇车",ability:"车辆单位，碾压攻击造成更高伤害。"},snorkel:{name:"潜水僵尸",sigil:"潜",tags:["water","special"],firstWave:3,armor:"潜水装备",ability:"潜行接近防线，受到伤害后显形。"},dolphin:{name:"海豚骑士",sigil:"豚",tags:["water","special"],firstWave:5,armor:"海豚",ability:"首次接近植物时进行一次快速跃过。"},jackbox:{name:"玩偶匣僵尸",sigil:"匣",tags:["special"],firstWave:5,armor:"玩偶匣",ability:"接触植物后引爆，对附近植物造成范围伤害。"},balloon:{name:"气球僵尸",sigil:"○",tags:["air","special"],firstWave:5,armor:"气球",ability:"飞行时越过地面植物，可被风力与照明击落。"},miner:{name:"矿工僵尸",sigil:"⌁",tags:["armored","special"],firstWave:5,armor:"矿工装备",ability:"从草坪中段切入，绕开前排防线。"},catapult:{name:"投篮车僵尸",sigil:"投",tags:["armored","special"],firstWave:6,armor:"投篮车",ability:"远距离投射篮球，对植物造成范围伤害。"},pogo:{name:"跳跳僵尸",sigil:"跳",tags:["special"],firstWave:6,armor:"弹跳杆",ability:"首次接近植物时跃过目标。"},ladder:{name:"扶梯僵尸",sigil:"梯",tags:["armored","special"],firstWave:6,armor:"金属扶梯",ability:"利用扶梯越过第一株普通植物。"},
    gargantuar:{name:"巨人僵尸",sigil:"巨",tags:["special","boss"],firstWave:7,armor:"巨型",ability:"蓄力砸击植物，造成高额伤害。"},gigaGargantuar:{name:"红眼巨人僵尸",sigil:"红巨",tags:["special","boss"],firstWave:9,armor:"巨型",ability:"巨人僵尸的强化形态，生命和砸击伤害更高。"},imp:{name:"小鬼僵尸",sigil:"小",tags:["normal"],firstWave:6,armor:"无",ability:"生命较低但移动速度很快。"},bungee:{name:"蹦极僵尸",sigil:"绳",tags:["air","special"],firstWave:6,armor:"蹦极绳",ability:"空中切入战场，落地后快速冲向防线。"},yeti:{name:"雪人僵尸",sigil:"雪",tags:["armored","special"],firstWave:7,armor:"厚毛",ability:"啃咬会冻结植物，耐久较高。"},snowImp:{name:"小雪兽",sigil:"雪小",tags:["normal","special"],firstWave:7,armor:"冰雪",ability:"快速冰系小型单位，啃咬会冻结植物。"},penguin:{name:"僵尸企鹅",sigil:"鹅",tags:["armored","special"],firstWave:7,armor:"冰甲",ability:"冰系重装单位，啃咬会冻结植物。"},emperorPenguin:{name:"僵尸帝王企鹅",sigil:"帝鹅",tags:["armored","special","boss"],firstWave:8,armor:"帝王冰甲",ability:"企鹅首领，拥有更高耐久和冰冻攻击。"},mammoth:{name:"僵尸巨象",sigil:"象",tags:["special","boss"],firstWave:8,armor:"巨型",ability:"超重型单位，缓慢推进并发动强力砸击。"},
    peaZombie:{name:"豌豆射手僵尸",sigil:"豆尸",tags:["plant","special"],firstWave:4,armor:"无",ability:"在远距离向植物发射豌豆。"},wallnutZombie:{name:"坚果僵尸",sigil:"果尸",tags:["plant","armored"],firstWave:7,armor:"坚果外壳",ability:"植物僵尸中的高耐久防御单位。"},squashZombie:{name:"窝瓜僵尸",sigil:"瓜尸",tags:["plant","special"],firstWave:7,armor:"无",ability:"高速跃向目标，啃咬造成500伤害。"},jalapenoZombie:{name:"辣椒僵尸",sigil:"椒尸",tags:["plant","special"],firstWave:8,armor:"无",ability:"接触植物后引爆并烧灼整行。"},doomZombie:{name:"毁灭菇僵尸",sigil:"毁尸",tags:["plant","special"],firstWave:8,armor:"无",ability:"接触植物后产生大范围毁灭爆炸。"},gatlingZombie:{name:"机枪射手僵尸",sigil:"枪尸",tags:["plant","special"],firstWave:8,armor:"无",ability:"远距离连续发射4颗豌豆。"},danceCommander:{name:"舞王指挥官",sigil:"舞",tags:["armored","special","boss"],firstWave:9,armor:"指挥护甲",ability:"周期性召唤特种武装小鬼。"},millenniumKing:{name:"千年尸王",sigil:"尸王",tags:["special","boss"],firstWave:9,armor:"王者护甲",ability:"周期性召唤黑曜石小鬼。"},obsidianImp:{name:"黑曜石小鬼僵尸",sigil:"曜小",tags:["armored","special"],firstWave:9,armor:"黑曜石",ability:"高耐久的精英小鬼。"},blackMammoth:{name:"黑橄榄巨象",sigil:"黑象",tags:["special","boss"],firstWave:10,armor:"黑橄榄巨甲",ability:"18000基础生命的终极巨象，砸击伤害极高。"},gatlingVehicle:{name:"机枪黑橄榄兵车",sigil:"兵车",tags:["armored","special","boss"],firstWave:10,armor:"金属兵车",ability:"重装兵车，远距离连续发射6颗子弹。"},commandoImp:{name:"特种武装小鬼",sigil:"特小",tags:["armored","special"],firstWave:9,armor:"特种护具",ability:"拥有1500生命并在远距离射击植物。"}
  };
  const ZOMBIE_POOLS=[
    ["basic","basic","flag"],["basic","cone","duck","peaZombie"],["cone","pole","paper","duckCone","snorkel"],["bucket","screen","football","duckBucket","peaZombie"],["zamboni","dolphin","jackbox","balloon","miner"],
    ["catapult","pogo","ladder","bungee","imp"],["yeti","snowImp","penguin","wallnutZombie","squashZombie","gargantuar"],["emperorPenguin","jalapenoZombie","doomZombie","gatlingZombie","mammoth"],["gargantuar","gigaGargantuar","danceCommander","millenniumKing","obsidianImp","commandoImp"],["gigaGargantuar","mammoth","blackMammoth","gatlingVehicle","commandoImp","bucket","football","gatlingZombie"]
  ];
  function poolForWave(wave){
    if(wave<=ZOMBIE_POOLS.length)return ZOMBIE_POOLS[wave-1];
    const veteran=Object.keys(ZOMBIE_DEFS).filter(id=>ZOMBIE_ALMANAC[id].firstWave<=Math.min(10,Math.ceil(wave/1.4))),rotation=wave%7;
    return veteran.filter((_,i)=>(i+rotation)%3!==0).concat(wave%4===0?["blackMammoth"]:[],wave%3===0?["gatlingVehicle"]:[]);
  }
  function makeZombie(kind,row,x){const d=ZOMBIE_DEFS[kind],beyond=Math.max(0,state.wave-1),hpScale=1+beyond*.075+Math.floor(beyond/10)*.12,speedScale=1+Math.min(.65,beyond*.012),hp=Math.round(d.hp*hpScale);return{id:state.nextUid++,row,x:x??1185+Math.random()*45,y:GRID.y+row*GRID.ch+GRID.ch/2,hp,maxHp:hp,speed:d.speed*speedScale,kind,color:d.color,metal:Boolean(d.metal),air:Boolean(d.air),alive:true,attackTimer:0,attackAnim:0,healTimer:2.8,summonTimer:5,shotTimer:1.2,hit:0,slow:0,stun:0,burn:0,poison:0,weaken:0,grounded:0,revealed:0,slam:0,slamHit:false,vaulted:false,vaultAnim:0,step:Math.random()*TAU};}
  function spawnZombie(){const row=Math.floor(Math.random()*5),pool=poolForWave(state.wave),kind=pool[Math.floor(Math.random()*pool.length)],d=ZOMBIE_DEFS[kind],x=d.burrow?790+Math.random()*120:d.bungee?650+Math.random()*260:undefined;state.zombieKindsSeen.add(kind);state.zombies.push(makeZombie(kind,row,x));}
  function updateZombies(dt){
    for(const z of state.zombies){if(!z.alive)continue;z.hit=Math.max(0,z.hit-dt*5);z.slow=Math.max(0,z.slow-dt);z.stun=Math.max(0,(z.stun||0)-dt);z.poison=Math.max(0,(z.poison||0)-dt);z.weaken=Math.max(0,(z.weaken||0)-dt);z.grounded=Math.max(0,(z.grounded||0)-dt);z.revealed=Math.max(0,(z.revealed||0)-dt);z.attackAnim=Math.max(0,(z.attackAnim||0)-dt);z.step+=dt*5;
      if(z.burn>0){z.burn-=dt;z.hp-=18*dt;if(z.hp<=0){killZombie(z);continue;}}
      const zombieDef=ZOMBIE_DEFS[z.kind];
      if(zombieDef.summon){z.summonTimer-=dt;if(z.summonTimer<=0&&state.zombies.length<55){state.zombies.push(makeZombie(zombieDef.summon,z.row,z.x+48));z.summonTimer=6;burstParticles(z.x,z.y-28,"#c9a5e8",12,55);}}
      if(z.stun>0)continue;
      if(z.vaultAnim>0){z.vaultAnim=Math.max(0,z.vaultAnim-dt);const t=1-z.vaultAnim/.72,ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;z.x=z.vaultFrom+(z.vaultTo-z.vaultFrom)*ease;continue;}
      const airborne=z.air&&z.grounded<=0;
      const target=airborne?null:state.plants.filter(p=>p.alive&&p.row===z.row&&plantDef(p).body!=="trap").sort((a,b)=>b.col-a.col).find(p=>cellCenter(p.row,p.col).x<z.x+12&&z.x-cellCenter(p.row,p.col).x<58);
      if(target&&zombieDef.vault&&!z.vaulted&&target.baseId!=="tallnut"&&!target.genes.includes("tall")){z.vaulted=true;z.vaultAnim=.72;z.vaultFrom=z.x;z.vaultTo=cellCenter(target.row,target.col).x-70;z.attackTimer=.7;sfx("vault");state.effects.push({type:"arc",x:z.x,y:z.y,tx:z.vaultTo,ty:z.y,life:.72,max:.72,color:"#f4d77a"});continue;}
      const rangedTarget=state.plants.filter(p=>p.alive&&p.row===z.row&&plantDef(p).body!=="trap"&&cellCenter(p.row,p.col).x<z.x).sort((a,b)=>b.col-a.col)[0];
      if(!target&&zombieDef.ranged&&rangedTarget&&z.x-cellCenter(rangedTarget.row,rangedTarget.col).x<560){
        z.shotTimer-=dt;
        if(z.shotTimer<=0){
          const shots=zombieDef.burstCount||1,damage=zombieDef.ranged,impact=cellCenter(rangedTarget.row,rangedTarget.col);
          for(let i=0;i<shots;i++){
            damagePlant(rangedTarget,damage);
            if(zombieDef.splash){for(const nearby of state.plants)if(nearby.alive&&nearby!==rangedTarget&&Math.abs(nearby.row-rangedTarget.row)<=1&&Math.abs(nearby.col-rangedTarget.col)<=1)damagePlant(nearby,damage*.45);}
            state.effects.push({type:"arc",x:z.x-20,y:z.y-20,tx:impact.x,ty:impact.y,life:.18+i*.04,max:.18+i*.04,color:zombieDef.splash?"#d8a65b":"#8ecb65"});
          }
          z.attackAnim=.4;z.shotTimer=1.5;sfx("shoot");
        }
        continue;
      }
      if(target&&zombieDef.giant){
        z.attackTimer-=dt;
        if(z.attackTimer<=0&&z.slam<=0){z.attackTimer=1.7;z.slam=1.7;z.slamHit=false;sfx("slamWind");}
        if(z.slam>0){z.slam=Math.max(0,z.slam-dt);if(!z.slamHit&&z.slam<=.56){let smash=zombieDef.bite||150;if(z.weaken>0)smash*=.65;damagePlant(target,smash);z.slamHit=true;state.cameraShake=11;state.effects.push({type:"impact",x:cellCenter(target.row,target.col).x,y:cellCenter(target.row,target.col).y+20,life:.5,max:.5,color:"#e4c38a"});burstParticles(cellCenter(target.row,target.col).x,cellCenter(target.row,target.col).y+20,"#d6b67a",28,150);sfx("slam");}}
      }
      else if(target){z.attackTimer-=dt;if(z.attackTimer<=0){const tc=cellCenter(target.row,target.col);if(zombieDef.exploder){const damage=zombieDef.bite||500;if(zombieDef.exploder==="line"){for(const p of state.plants)if(p.alive&&p.row===z.row)damagePlant(p,damage);}else if(zombieDef.exploder==="doom"){for(const p of state.plants)if(p.alive&&Math.abs(p.row-z.row)<=1&&Math.abs(cellCenter(p.row,p.col).x-z.x)<GRID.cw*2.2)damagePlant(p,damage);}else{for(const p of state.plants)if(p.alive&&Math.hypot(cellCenter(p.row,p.col).x-z.x,cellCenter(p.row,p.col).y-z.y)<GRID.cw*1.4)damagePlant(p,damage);}state.effects.push({type:"doom",x:z.x,y:z.y,life:.8,max:.8,color:zombieDef.exploder==="doom"?"#8a4dff":"#ff704d"});z.alive=false;state.cameraShake=12;sfx("boom");continue;}let bite=zombieDef.bite||50;if(z.weaken>0)bite*=.65;damagePlant(target,bite);z.attackAnim=.34;state.effects.push({type:"bite",x:tc.x+30,y:tc.y-5,life:.28,max:.28,color:"#f4e2bd"});if(target.genes.includes("spike")){z.hp-=45;z.hit=1;if(z.hp<=0)killZombie(z);}if(zombieDef.ice)target.freeze=Math.max(target.freeze||0,1.5);if(target.baseId==="garlic"||target.baseId==="hypno"||target.genes.includes("weaken")){z.weaken=3;if(Math.random()<.32)z.row=Math.max(0,Math.min(4,z.row+(z.row===4?-1:z.row===0?1:Math.random()<.5?-1:1)));}z.attackTimer=.5;sfx("bite");}}
      else z.x-=z.speed*(z.slow>0?.55:1)*(zombieDef.rage&&z.hp<z.maxHp*.5?zombieDef.rage:1)*dt;
      if(z.x<GRID.x-46){if(QA_MODE){z.alive=false;clearRow(z.row);}else if(state.mowers[z.row]>0){state.mowers[z.row]--;const left=state.mowers[z.row];z.alive=false;clearRow(z.row);toast(left>0?`第 ${z.row+1} 路推土机启动，还剩 ${left} 次机会`:`第 ${z.row+1} 路推土机已耗尽，下次突破将失败`);state.cameraShake=7;sfx("mower");}else{endGame();return;}}
    }
  }
  function damagePlant(p,amount){
    if(p.shield>0){const d=Math.min(p.shield,amount);p.shield-=d;amount-=d;}
    p.hp-=amount;p.hitFlash=1;p.retaliate=(p.retaliate||0)+1;
    if(p.genes.includes("producer")&&Math.random()<.08)spawnSun(cellCenter(p.row,p.col).x,cellCenter(p.row,p.col).y-20,5,false);
    if(p.genes.includes("frost"))for(const z of state.zombies)if(z.alive&&z.row===p.row&&Math.abs(z.x-cellCenter(p.row,p.col).x)<75)z.slow=1.2;
    if(p.hp<=0){if(p.genes.includes("burst"))explosion(cellCenter(p.row,p.col).x,cellCenter(p.row,p.col).y,110,240);if(p.genes.includes("fire"))lineExplosion(p.row,180);p.alive=false;burstParticles(cellCenter(p.row,p.col).x,cellCenter(p.row,p.col).y,"#7d5a3a",15,90);}
  }
  function clearRow(row){for(const z of state.zombies)if(z.alive&&z.row===row)killZombie(z);}
  function killZombie(z){if(!z.alive)return;z.alive=false;state.stats.kills++;burstParticles(z.x,z.y,z.color,12,70);if(state.time-state.lastKillSoundAt>.08){state.lastKillSoundAt=state.time;sfx("kill");}}

  function updateBullets(dt){for(const b of state.bullets){if(!b.alive)continue;b.x+=b.vx*dt;if(Number.isFinite(b.lineY))b.y=b.lineY;else b.y+=(b.vy||0)*dt;b.spin=(b.spin||0)+dt*7;b.life-=dt;if(b.bounce&&b.x<GRID.x-40){b.x=GRID.x-38;b.vx=Math.abs(b.vx);b.bounce=false;}if(b.life<=0||b.x>1250||b.x<GRID.x-40||b.y<GRID.y-30||b.y>GRID.y+GRID.rows*GRID.ch+20){b.alive=false;continue;}if(!b.fire){const torch=state.plants.find(p=>p.alive&&(p.baseId==="torchwood"||p.genes.includes("ignite"))&&p.row===b.row&&Math.abs(cellCenter(p.row,p.col).x-b.x)<17);if(torch){b.fire=true;b.damage*=2;b.color="#ff9148";torch.attackAnim=.36;state.effects.push({type:"ignite",x:b.x,y:b.y,life:.3,max:.3,color:"#ff9a46"});tone(360,.05,"triangle",.012,120);}}const hit=state.zombies.filter(z=>z.alive&&!b.hitIds.includes(z.id)&&Math.abs(z.x-b.x)<25&&Math.abs(z.y-b.y)<34).sort((a,c)=>a.x-c.x)[0];if(hit){let dealt=ZOMBIE_DEFS[hit.kind].armored&&!b.fire&&!b.burst&&!hit.metalStripped?b.damage*.82:b.damage;if(b.crit&&Math.random()<(b.light?.34:.22))dealt*=2;hit.hp-=dealt;hit.hit=1;if((b.light||b.crit)&&hit.air){hit.grounded=Math.max(hit.grounded,5);hit.revealed=4;floater(hit.x,hit.y-70,"击落","#fff2a0");}if(b.magnet&&!hit.metalStripped&&hit.metal){hit.metalStripped=true;hit.hp-=Math.min(hit.hp-1,hit.maxHp*.22);}if(b.frost&&zSlowable(hit))hit.slow=Math.max(hit.slow,b.deepfreeze?4.5:2.6);if(b.deepfreeze&&Math.random()<.22)hit.stun=Math.max(hit.stun,1.25);if(b.stun&&Math.random()<.3)hit.stun=Math.max(hit.stun,.8);if(b.fire)hit.burn=Math.max(hit.burn,3);if(b.knockback){hit.x+=34;hit.stun=Math.max(hit.stun,.18);}if(b.gust){hit.x+=34;hit.stun=Math.max(hit.stun,.18);if(hit.air)hit.grounded=Math.max(hit.grounded,2.5);}if(b.sunny&&(b.sunnyGuaranteed||Math.random()<.16))spawnSun(b.x,b.y,b.sunValue||5,false);if(b.burst)explosion(b.x,b.y,b.kind==="star"?92:72,b.kind==="star"?95:70,b.color);if(b.splash)splashImpact(b.x,b.y,58,Math.max(18,dealt*.45));burstParticles(b.x,b.y,b.color,7,55);b.hitIds.push(hit.id);b.hitsLeft--;if(b.hitsLeft<=0)b.alive=false;else b.x+=25;if(hit.hp<=0)killZombie(hit);}}}
  function zSlowable(z){return !z.air||z.grounded>0;}
  function spawnSun(x,y,value,natural){state.suns.push({x,y:natural?-20:y,targetY:y,value,life:14,alive:true,vy:natural?105:0,phase:Math.random()*TAU});}
  function updateSuns(dt){for(const s of state.suns){s.life-=dt;s.phase+=dt*4;if(s.vy){s.y+=s.vy*dt;if(s.y>=s.targetY){s.y=s.targetY;s.vy=0;}}if(s.life<=8&&s.alive)collectSun(s,false);}}
  function collectSun(s,withSound=true){if(!s?.alive)return false;s.alive=false;state.sun+=s.value;state.stats.sunMade+=s.value;floater(s.x,s.y-20,`+${s.value} ☀`,"#ffe173");if(withSound)sfx("sun");return true;}
  function collectSunAt(pt){const s=state.suns.find(s=>s.alive&&Math.hypot(s.x-pt.x,s.y-pt.y)<35);return collectSun(s,true);}
  canvas.addEventListener("click",e=>{if(state.mode!=="playing"||state.paused)return;collectSunAt(canvasPoint(e));});

  function burstParticles(x,y,color,count,speed){for(let i=0;i<count;i++){const a=Math.random()*TAU,s=speed*(.25+Math.random()*.75);state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-20,life:.45+Math.random()*.55,max:1,color,size:2+Math.random()*5,grav:80});}}
  function floater(x,y,text,color,scale=1){state.floaters.push({x,y,text,color,life:1.2,max:1.2,scale});}
  function updateParticles(dt){for(const p of state.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.grav||0)*dt;p.vx*=.985;}state.particles=state.particles.filter(p=>p.life>0);for(const f of state.floaters){f.life-=dt;f.y-=24*dt;}state.floaters=state.floaters.filter(f=>f.life>0);}
  function updateEffects(dt){for(const e of state.effects)e.life-=dt;state.effects=state.effects.filter(e=>e.life>0);}

  function endGame(){if(state.mode!=="playing")return;state.mode="lost";state.paused=true;state.timeStop=false;syncTimeStopButton();sfx("lose");
    document.getElementById("resultEyebrow").textContent=state.gameMode==="tower"?"塔防模式结束":"经典模式失败";
    document.getElementById("resultTitle").textContent=`坚持到了第 ${state.wave} 波`;
    document.getElementById("resultCopy").textContent="僵尸突破了最后一道防线。重新安排融合顺序，下一局挑战更高纪录。";
    document.getElementById("resultStats").innerHTML=`<div><b>${state.wave}</b><span>生存波数</span></div><div><b>${state.stats.kills}</b><span>击败僵尸</span></div><div><b>${state.stats.fusions}</b><span>完成融合</span></div>`;
    showPanel("resultPanel");
  }
  function winClassic(){if(state.mode!=="playing")return;state.mode="won";state.paused=true;state.timeStop=false;syncTimeStopButton();sfx("wave");
    document.getElementById("resultEyebrow").textContent="经典模式通关";
    document.getElementById("resultTitle").textContent="十波尸潮全部击退！";
    document.getElementById("resultCopy").textContent="你的十株植物守住了花园。可以更换阵容重玩，或进入塔防模式挑战无限波次。";
    document.getElementById("resultStats").innerHTML=`<div><b>10</b><span>完成波数</span></div><div><b>${state.stats.kills}</b><span>击败僵尸</span></div><div><b>${state.stats.fusions}</b><span>完成融合</span></div>`;
    showPanel("resultPanel");
  }

  function draw(){
    ctx.save();const sh=state.cameraShake; if(sh)ctx.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);
    drawBackground();drawGrid();drawMowers();drawSuns();drawPlants();drawPlacementPreview();drawZombies();drawBullets();drawEffects();drawParticles();drawHUD();drawCards();drawFusionPreview();drawTutorial();ctx.restore();
  }
  function drawBackground(){
    if(art.background.complete&&art.background.naturalWidth){const sourceW=Math.round(art.background.naturalWidth*.81);ctx.drawImage(art.background,0,0,sourceW,art.background.naturalHeight,0,0,W,H);const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,"rgba(8,31,26,.04)");shade.addColorStop(.7,"rgba(8,31,20,.01)");shade.addColorStop(1,"rgba(5,22,16,.15)");ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);return;}
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#8bc9a0");sky.addColorStop(.34,"#b7ddb1");sky.addColorStop(.35,"#50875c");sky.addColorStop(1,"#1c5135");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#f3d893";ctx.beginPath();ctx.arc(1100,75,42,0,TAU);ctx.fill();
    ctx.fillStyle="rgba(244,255,240,.36)";for(let i=0;i<4;i++){const x=120+i*285+Math.sin(state.time*.08+i)*16,y=58+(i%2)*25;ctx.beginPath();ctx.ellipse(x,y,46,16,0,0,TAU);ctx.ellipse(x+36,y+4,35,13,0,0,TAU);ctx.ellipse(x-31,y+5,28,11,0,0,TAU);ctx.fill();}
    ctx.fillStyle="rgba(31,75,48,.42)";for(let i=0;i<13;i++){const x=i*110-30,h=45+(i%4)*18;ctx.beginPath();ctx.moveTo(x,135);ctx.quadraticCurveTo(x+40,135-h,x+90,135);ctx.fill();}
    ctx.fillStyle="rgba(38,92,55,.48)";for(let i=0;i<22;i++){const x=i*63+Math.sin(i)*18;ctx.beginPath();ctx.arc(x,132,18+(i%3)*4,Math.PI,TAU);ctx.fill();}
    ctx.fillStyle="#e9d1a0";ctx.fillRect(0,130,250,478);
    for(let i=0;i<70;i++){ctx.fillStyle=`rgba(70,46,28,${.05+(i%3)*.025})`;ctx.fillRect((i*47)%250,140+(i*83)%455,2+(i%4),2+(i%3));}
    for(let i=0;i<20;i++){const x=22+(i*79)%210,y=160+(i*113)%420;ctx.fillStyle=i%2?"#f1a3bd":"#f7d16a";ctx.beginPath();for(let a=0;a<5;a++){ctx.ellipse(x+Math.cos(a*TAU/5)*5,y+Math.sin(a*TAU/5)*5,3,5,a*TAU/5,0,TAU);}ctx.fill();}
    ctx.fillStyle="#2f6046";ctx.fillRect(250,128,18,480);ctx.fillStyle="#123c2a";ctx.fillRect(268,128,10,480);
  }
  function drawGrid(){}
  function drawTextEntity(text,x,y,color,alpha=1,sub="",maxWidth=88){
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);const fontSize=text.length>8?10:text.length>6?11:13;ctx.font=`900 ${fontSize}px system-ui`;const width=Math.min(maxWidth,Math.max(58,ctx.measureText(text).width+16));const height=sub?42:32;
    ctx.fillStyle="rgba(8,28,21,.9)";ctx.strokeStyle=color;ctx.lineWidth=2;ctx.shadowColor="rgba(0,0,0,.28)";ctx.shadowBlur=6;roundRect(-width/2,-height/2,width,height,9);ctx.fill();ctx.shadowBlur=0;ctx.stroke();
    ctx.fillStyle="#f7fff8";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,0,sub?-7:0,maxWidth-12);if(sub){ctx.fillStyle=color;ctx.font="800 10px system-ui";ctx.fillText(sub,0,11,maxWidth-12);}ctx.restore();
  }
  function drawMowers(){for(let r=0;r<5;r++)if(state.mowers[r]>0){const y=GRID.y+r*GRID.ch+GRID.ch/2,charges=state.mowers[r];drawTextEntity("我是小推车",224,y,"#ff9b77",1,`剩余 ${charges} 次`,82);}}
  function drawPlantBodyVector(p,x,y,alpha=1){const def=plantDef(p),bob=Math.sin(p.age*2.2+p.bob)*2;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y+bob);if(p.hitFlash>0){ctx.shadowColor="#fff";ctx.shadowBlur=18;}
    ctx.fillStyle="rgba(16,42,25,.22)";ctx.beginPath();ctx.ellipse(0,28,32,9,0,0,TAU);ctx.fill();
    if(p.baseId==="pea"||p.baseId==="frost"){ctx.strokeStyle="#3d8c42";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,22);ctx.quadraticCurveTo(-2,0,5,-15);ctx.stroke();leaf(-8,14,-1);leaf(10,12,1);ctx.fillStyle=def.color;ctx.beginPath();ctx.arc(2,-24,24,0,TAU);ctx.fill();ctx.beginPath();ctx.ellipse(29,-25,24,17,0,0,TAU);ctx.fill();ctx.fillStyle="#173f2d";ctx.beginPath();ctx.ellipse(38,-25,10,8,0,0,TAU);ctx.fill();eye(-4,-29);}
    else if(p.baseId==="sun"){ctx.strokeStyle="#438f40";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,28);ctx.lineTo(0,-2);ctx.stroke();for(let i=0;i<12;i++){ctx.fillStyle=i%2?"#ffd354":"#f5b83e";ctx.save();ctx.rotate(i*TAU/12);ctx.beginPath();ctx.ellipse(0,-30,10,20,0,0,TAU);ctx.fill();ctx.restore();}ctx.fillStyle="#80552c";ctx.beginPath();ctx.arc(0,0,22,0,TAU);ctx.fill();eye(-8,-4);eye(8,-4);smile(0,5);}
    else if(p.baseId==="nut"){ctx.fillStyle="#aa7045";roundRect(-31,-41,62,72,25);ctx.fill();ctx.strokeStyle="#714527";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-15,-25);ctx.quadraticCurveTo(-4,-14,-13,-3);ctx.moveTo(17,-12);ctx.quadraticCurveTo(4,0,16,13);ctx.stroke();eye(-11,-15);eye(11,-15);ctx.strokeStyle="#56331f";ctx.beginPath();ctx.moveTo(-8,12);ctx.lineTo(8,12);ctx.stroke();}
    else if(p.baseId==="cherry"){ctx.strokeStyle="#378445";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-13,-12);ctx.quadraticCurveTo(0,-38,18,-28);ctx.stroke();ctx.fillStyle="#eb4e57";ctx.beginPath();ctx.arc(-15,3,24,0,TAU);ctx.arc(20,5,23,0,TAU);ctx.fill();eye(-20,-3);eye(14,-2);}
    else if(p.baseId==="corn"){ctx.strokeStyle="#4f9845";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,28);ctx.lineTo(0,-11);ctx.stroke();ctx.fillStyle="#5bae4f";ctx.beginPath();ctx.ellipse(-13,5,21,9,-.65,0,TAU);ctx.ellipse(14,7,22,9,.65,0,TAU);ctx.fill();ctx.fillStyle="#f2c94c";ctx.beginPath();ctx.ellipse(2,-25,20,30,0,0,TAU);ctx.fill();ctx.fillStyle="#b88624";for(let yy=-40;yy<0;yy+=11)for(let xx=-8;xx<14;xx+=10){ctx.beginPath();ctx.arc(xx+(yy%2?4:0),yy,2.2,0,TAU);ctx.fill();}eye(-5,-27);eye(8,-27);}
    else if(p.baseId==="pepper"){ctx.strokeStyle="#3d8c42";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,-35);ctx.quadraticCurveTo(8,-51,22,-45);ctx.stroke();ctx.fillStyle="#ff704d";ctx.beginPath();ctx.moveTo(0,-38);ctx.bezierCurveTo(-30,-38,-29,15,8,29);ctx.bezierCurveTo(30,6,29,-29,0,-38);ctx.fill();eye(-7,-15);eye(8,-14);ctx.strokeStyle="#6f251c";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-6,2);ctx.lineTo(9,-1);ctx.stroke();}
    else if(p.baseId==="mushroom"){ctx.fillStyle="#e9dfc8";roundRect(-12,-4,24,34,10);ctx.fill();ctx.fillStyle="#b98cff";ctx.beginPath();ctx.arc(0,-14,31,Math.PI,TAU);ctx.quadraticCurveTo(0,3,-31,-14);ctx.fill();ctx.fillStyle="#f5d7ff";ctx.beginPath();ctx.arc(-13,-24,5,0,TAU);ctx.arc(11,-17,4,0,TAU);ctx.fill();eye(-5,7);eye(6,7);}
    else if(p.baseId==="cactus"){ctx.fillStyle="#59bd74";roundRect(-19,-39,38,70,16);ctx.fill();ctx.fillRect(-36,-12,22,14);ctx.fillRect(14,-25,20,14);ctx.strokeStyle="#d8f5bd";ctx.lineWidth=2;for(let i=-25;i<26;i+=13){ctx.beginPath();ctx.moveTo(-20,i);ctx.lineTo(-27,i-3);ctx.moveTo(20,i-5);ctx.lineTo(27,i-8);ctx.stroke();}eye(-7,-16);eye(8,-16);}
    else if(p.baseId==="garlic"){ctx.fillStyle="#ede2bd";ctx.beginPath();ctx.moveTo(0,-45);ctx.bezierCurveTo(-7,-28,-32,-24,-30,5);ctx.bezierCurveTo(-27,34,28,35,31,4);ctx.bezierCurveTo(33,-23,8,-29,0,-45);ctx.fill();ctx.strokeStyle="#b6a77e";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(0,25);ctx.stroke();eye(-10,-4);eye(10,-4);}
    else if(p.baseId==="coffee"){ctx.fillStyle="#9a633f";ctx.beginPath();ctx.ellipse(0,-4,28,36,-.12,0,TAU);ctx.fill();ctx.strokeStyle="#e2b47d";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-5,-36);ctx.quadraticCurveTo(7,-8,2,30);ctx.stroke();eye(-10,-12);eye(10,-12);}
    else if(p.baseId==="melon"){ctx.strokeStyle="#4b9143";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,28);ctx.lineTo(0,-5);ctx.stroke();ctx.fillStyle="#67bf66";ctx.beginPath();ctx.arc(0,-25,29,0,TAU);ctx.fill();ctx.strokeStyle="#2e7b3d";ctx.lineWidth=3;for(let a=-1;a<=1;a++){ctx.beginPath();ctx.arc(a*7,-25,20,Math.PI/2,Math.PI*1.5);ctx.stroke();}eye(-8,-28);eye(8,-28);}
    else if(p.baseId==="bamboo"){ctx.fillStyle="#77c65d";roundRect(-14,-46,28,75,8);ctx.fill();ctx.strokeStyle="#3f8a42";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-14,-20);ctx.lineTo(14,-20);ctx.moveTo(-14,5);ctx.lineTo(14,5);ctx.stroke();ctx.save();ctx.rotate(-.2);ctx.fillStyle="#92da72";roundRect(4,-34,34,18,7);ctx.fill();ctx.restore();eye(-6,-34);eye(6,-34);}
    else if(p.baseId==="lotus"){ctx.strokeStyle="#4f9b58";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,28);ctx.lineTo(0,0);ctx.stroke();for(let i=0;i<9;i++){ctx.save();ctx.rotate(i*TAU/9);ctx.fillStyle=i%2?"#f7bad5":"#ee8fbd";ctx.beginPath();ctx.ellipse(0,-20,9,19,0,0,TAU);ctx.fill();ctx.restore();}ctx.fillStyle="#ffe397";ctx.beginPath();ctx.arc(0,0,10,0,TAU);ctx.fill();eye(-3,-1);eye(4,-1);}
    else if(p.baseId==="pumpkin"){ctx.fillStyle="#e8923b";ctx.beginPath();ctx.ellipse(0,-2,38,34,0,0,TAU);ctx.fill();ctx.strokeStyle="#b9652d";ctx.lineWidth=3;for(let x=-18;x<=18;x+=12){ctx.beginPath();ctx.ellipse(x,-2,14,32,0,0,TAU);ctx.stroke();}ctx.fillStyle="#477b3c";ctx.fillRect(-5,-42,10,13);eye(-12,-9);eye(12,-9);ctx.strokeStyle="#67391f";ctx.beginPath();ctx.moveTo(-10,10);ctx.lineTo(10,10);ctx.stroke();}
    drawGenes(p);if(p.rank>1){ctx.font="900 15px system-ui";ctx.textAlign="center";ctx.fillStyle="#ffe16b";ctx.strokeStyle="#604916";ctx.lineWidth=4;ctx.strokeText("★".repeat(p.rank),0,-55);ctx.fillText("★".repeat(p.rank),0,-55);}if(p.shield>0){ctx.strokeStyle="rgba(160,225,255,.75)";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-5,45,0,TAU);ctx.stroke();}ctx.restore();}
  function drawAtlasCell(image,index,x,y,w,h,cols=5,rows=3){
    const col=index%cols,row=Math.floor(index/cols),sw=image.naturalWidth/cols,sh=image.naturalHeight/rows;
    ctx.drawImage(image,col*sw,row*sh,sw,sh,x,y,w,h);
  }
  function drawFusionTraits(p){
    const materials=p.materialIds||[];if(!materials.length||!art.traits.complete||!art.traits.naturalWidth)return false;
    for(let i=0;i<materials.length;i++){const id=materials[i],index=TRAIT_SPRITES[id];if(index===undefined)continue;ctx.save();const pulse=1+Math.sin(state.time*3+p.uid+i)*.025,scale=i?1.02:.94;ctx.globalAlpha=i?.82:.96;ctx.scale(pulse*scale,pulse*scale);if(i)ctx.rotate((i%2?.045:-.045)*Math.sin(state.time*1.7+p.uid));drawAtlasCell(art.traits,index,-66,-79,132,132,5,5);ctx.restore();}
    return true;
  }
  function drawPlantBody(p,x,y,alpha=1){
    const def=plantDef(p),bob=Math.sin(p.age*2.2+p.bob)*2,attack=Math.sin(Math.min(1,(p.attackAnim||0)/.72)*Math.PI),name=p.fusionId?p.displayName:(def.short||def.name),sub=[p.fusionId?(def.abilities?.ultimate?"究极配方":"文件配方"):"",p.shield>0?"护盾":""].filter(Boolean).join(" · ");
    if(p.baseId==="star"||p.baseId==="gloom"){drawRadialPlant(p,x,y+bob-5*attack,alpha,name,sub,attack);return;}
    drawTextEntity(`我是${name}`,x+(def.body==="shooter"?-5:0)*attack,y+bob-5*attack,p.hitFlash>0?"#ffffff":def.color,alpha,sub,92);
    if(p.fusionId==="ultimate004")drawDevourCharge(p,x,y,alpha);
  }
  function drawDevourCharge(p,x,y,alpha=1){
    const rule=chomperRule(p),progress=Math.min(1,(p.devourCharge||0)/rule.devourCooldown),ready=progress>=1;
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle="rgba(8,25,19,.88)";roundRect(x+42,y-35,13,70,6);ctx.fill();ctx.strokeStyle=ready?"#ffe46f":"#e7a5a9";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=ready?"#ffe46f":"#d76b72";roundRect(x+45,y+31-62*progress,7,62*progress,3);ctx.fill();ctx.fillStyle=ready?"#fff5a8":"#f5c0c4";ctx.font="900 8px system-ui";ctx.textAlign="center";ctx.fillText(ready?"吞":"充",x+48.5,y-40);ctx.restore();
  }
  function drawRadialPlant(p,x,y,alpha,name,sub,attack=0){
    const isStar=p.baseId==="star",points=isStar?5:8,outer=isStar?39:35,inner=isStar?18:35,start=isStar?-Math.PI/2:-Math.PI/8,def=plantDef(p);
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(1+attack*.08,1-attack*.06);ctx.shadowColor=def.color;ctx.shadowBlur=12+attack*10;ctx.beginPath();
    const vertices=isStar?points*2:points;
    for(let i=0;i<vertices;i++){const a=start+i*TAU/vertices,r=isStar?(i%2?inner:outer):outer,px=Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();
    ctx.fillStyle=p.hitFlash>0?"#ffffff":def.color;ctx.fill();ctx.strokeStyle=isStar?"#fff1a3":"#c7a9ef";ctx.lineWidth=3;ctx.stroke();
    if(!isStar){ctx.fillStyle="#d9bbff";const glow=p.attackAnim>0?5.5:3.5;for(let i=0;i<8;i++){const a=start+i*TAU/8;ctx.beginPath();ctx.arc(Math.cos(a)*35,Math.sin(a)*35,glow,0,TAU);ctx.fill();}}
    ctx.shadowBlur=0;ctx.fillStyle="#253128";ctx.beginPath();ctx.arc(-8,-5,3.5,0,TAU);ctx.arc(8,-5,3.5,0,TAU);ctx.fill();ctx.strokeStyle="#4d3a2a";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,5,8,.15,Math.PI-.15);ctx.stroke();
    ctx.fillStyle="#f8fff3";ctx.textAlign="center";ctx.font=`900 ${name.length>5?9:11}px system-ui`;ctx.fillText(name,0,isStar?19:16,62);if(sub){ctx.fillStyle="#fff1a3";ctx.font="800 9px system-ui";ctx.fillText(sub,0,51,82);}ctx.restore();
  }
  function drawGenes(p){for(const g of p.genes){if(g==="producer"){ctx.strokeStyle="#ffd95d";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-6,40,0,TAU);ctx.stroke();}if(g==="guard"||g==="armor"){ctx.fillStyle=g==="armor"?"#e8923b":"#b2784b";ctx.beginPath();ctx.arc(-30,-17,10,0,TAU);ctx.arc(28,-10,9,0,TAU);ctx.fill();}if(g==="frost"||g==="deepfreeze"){ctx.fillStyle=g==="deepfreeze"?"#e6feff":"#baf4ff";for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(-23+i*15,-43+(i%2)*8,g==="deepfreeze"?4:3,0,TAU);ctx.fill();}}if(g==="burst"){ctx.fillStyle="#ef5c61";ctx.beginPath();ctx.arc(22,-40,8,0,TAU);ctx.fill();}if(g==="shooter"&&p.baseId!=="pea"){ctx.fillStyle="#70cf59";ctx.beginPath();ctx.arc(24,-22,10,0,TAU);ctx.fill();ctx.fillStyle="#173f2d";ctx.beginPath();ctx.arc(28,-22,4,0,TAU);ctx.fill();}if(g==="stun"){ctx.fillStyle="#ffe36b";ctx.fillRect(-30,-46,7,7);ctx.fillRect(24,-36,6,6);}if(g==="fire"){ctx.fillStyle="#ff704d";ctx.beginPath();ctx.moveTo(-28,-8);ctx.quadraticCurveTo(-17,-33,-9,-8);ctx.fill();}if(g==="pierce"){ctx.strokeStyle="#d8b9ff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-7,44,0,TAU);ctx.stroke();}if(g==="crit"){ctx.fillStyle="#f1fff3";ctx.fillRect(-2,-51,4,11);ctx.fillRect(-6,-47,12,4);}if(g==="weaken"){ctx.fillStyle="#ddd1aa";ctx.beginPath();ctx.arc(-30,7,7,0,TAU);ctx.fill();}if(g==="haste"){ctx.strokeStyle="#75e3d4";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-35,-25);ctx.lineTo(-48,-25);ctx.moveTo(-33,-14);ctx.lineTo(-44,-10);ctx.stroke();}if(g==="splash"){ctx.fillStyle="#75cf71";ctx.beginPath();ctx.arc(31,-34,8,0,TAU);ctx.fill();}if(g==="multishot"){ctx.fillStyle="#99df76";ctx.beginPath();ctx.arc(25,-23,6,0,TAU);ctx.arc(34,-13,5,0,TAU);ctx.fill();}if(g==="heal"){ctx.fillStyle="#ffb4d4";ctx.fillRect(-4,-50,8,20);ctx.fillRect(-10,-44,20,8);}if(g==="nova"){ctx.strokeStyle="#a66cff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-7,46,0,TAU);ctx.stroke();}if(g==="radial"){ctx.fillStyle="#ffe06a";ctx.font="900 16px system-ui";ctx.fillText("★",27,-38);}if(g==="reveal"){ctx.strokeStyle="#fff0a0";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-10,48,0,TAU);ctx.stroke();}if(g==="magnet"){ctx.strokeStyle="#ef6660";ctx.lineWidth=4;ctx.beginPath();ctx.arc(-30,-8,9,Math.PI/2,Math.PI*1.5);ctx.stroke();}}}
  function leaf(x,y,dir){ctx.fillStyle="#55a94c";ctx.save();ctx.translate(x,y);ctx.rotate(dir*.5);ctx.beginPath();ctx.ellipse(0,0,14,7,0,0,TAU);ctx.fill();ctx.restore();}
  function eye(x,y){ctx.fillStyle="#173228";ctx.beginPath();ctx.arc(x,y,4,0,TAU);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x-1.2,y-1.4,1.2,0,TAU);ctx.fill();}
  function smile(x,y){ctx.strokeStyle="#3e2b1c";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,8,.2,Math.PI-.2);ctx.stroke();}
  function drawPlants(){for(const p of state.plants){if(!p.alive)continue;const c=cellCenter(p.row,p.col);if(p.dragging){if(state.dragCell){const target=cellCenter(state.dragCell.row,state.dragCell.col);drawPlantBody(p,target.x,target.y,.48);}else if(!state.dragTarget)drawPlantBody(p,state.dragPoint.x,state.dragPoint.y,.58);}else{drawPlantBody(p,c.x,c.y);drawHp(p,c.x,c.y+39);}}}
  function drawPlacementPreview(){if(state.dragging||!state.selected||!state.hoverCell||plantAt(state.hoverCell.row,state.hoverCell.col))return;const def=Core.PLANTS[state.selected],c=cellCenter(state.hoverCell.row,state.hoverCell.col);if(state.selected==="star"||state.selected==="gloom"){const preview=Core.createPlant(state.selected,-1,state.hoverCell.row,state.hoverCell.col);drawRadialPlant(preview,c.x,c.y,.46,def.short,"种植预览");}else drawTextEntity(`我是${def.short}`,c.x,c.y,def.color,.46,"种植预览",92);}
  function drawHp(p,x,y){if(p.hp===p.maxHp&&p.shield<=0)return;const baseRatio=Math.min(1,Math.max(0,p.hp/p.maxHp)),overRatio=Math.min(1,Math.max(0,(p.hp-p.maxHp)/(p.maxHp*3)));ctx.fillStyle="rgba(0,0,0,.35)";roundRect(x-28,y,56,5,3);ctx.fill();ctx.fillStyle=baseRatio>.35?"#93e36f":"#ef6a5d";roundRect(x-28,y,56*baseRatio,5,3);ctx.fill();if(overRatio>0){ctx.fillStyle="rgba(0,0,0,.42)";roundRect(x-28,y-7,56,4,2);ctx.fill();ctx.fillStyle="#ffd66b";roundRect(x-28,y-7,56*overRatio,4,2);ctx.fill();}}
  function drawZombieVector(z){ctx.save();ctx.translate(z.x,z.y);const leg=Math.sin(z.step)*6,giant=z.kind==="giant"?1.28:1;ctx.scale(giant,giant);ctx.strokeStyle="#5e735f";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-8,20);ctx.lineTo(-12+leg,42);ctx.moveTo(8,20);ctx.lineTo(12-leg,42);ctx.stroke();ctx.fillStyle="#765d4a";roundRect(-24,-9,48,42,10);ctx.fill();ctx.fillStyle=z.hit>0?"#d9fff0":"#91ad8d";ctx.beginPath();ctx.arc(0,-28,24,0,TAU);ctx.fill();ctx.fillStyle="#eef1d5";ctx.beginPath();ctx.arc(-8,-32,5,0,TAU);ctx.arc(9,-30,5,0,TAU);ctx.fill();ctx.fillStyle="#27372e";ctx.beginPath();ctx.arc(-7,-31,2,0,TAU);ctx.arc(10,-29,2,0,TAU);ctx.fill();if(z.kind==="cone"){ctx.fillStyle="#e99d3e";ctx.beginPath();ctx.moveTo(-20,-48);ctx.lineTo(0,-83);ctx.lineTo(22,-47);ctx.closePath();ctx.fill();}if(z.kind==="bucket"){ctx.fillStyle="#aeb9b7";roundRect(-23,-67,46,34,6);ctx.fill();ctx.strokeStyle="#697877";ctx.lineWidth=3;ctx.stroke();}if(z.kind==="runner"){ctx.fillStyle="#e65555";ctx.fillRect(-23,-6,46,12);}if(z.kind==="paper"){ctx.fillStyle="#ece5ce";ctx.rotate(-.08);ctx.fillRect(-31,-4,55,31);ctx.fillStyle="#7d6a54";ctx.fillRect(-22,4,35,3);ctx.fillRect(-22,12,28,3);}if(z.kind==="shield"){ctx.fillStyle="#70908e";roundRect(-36,-10,30,58,6);ctx.fill();ctx.strokeStyle="#b7d0cb";ctx.lineWidth=3;ctx.stroke();}if(z.kind==="healer"){ctx.fillStyle="#e9eee8";roundRect(-25,-62,50,18,5);ctx.fill();ctx.fillStyle="#69b86f";ctx.fillRect(-4,-60,8,14);ctx.fillRect(-9,-55,18,6);}if(z.kind==="football"){ctx.fillStyle="#a83f45";roundRect(-27,-13,54,44,9);ctx.fill();ctx.fillStyle="#dfd8c7";ctx.fillRect(-5,-12,10,43);ctx.beginPath();ctx.arc(0,-51,24,Math.PI,TAU);ctx.fill();}if(z.kind==="balloon"){ctx.strokeStyle="#dfc3e8";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,-42);ctx.lineTo(29,-89);ctx.stroke();ctx.fillStyle="#d69adf";ctx.beginPath();ctx.ellipse(30,-105,21,27,0,0,TAU);ctx.fill();}if(z.kind==="miner"){ctx.fillStyle="#d7b54a";ctx.beginPath();ctx.arc(0,-45,25,Math.PI,TAU);ctx.fill();ctx.strokeStyle="#6e5938";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-28,4);ctx.lineTo(28,-35);ctx.stroke();}if(z.kind==="dancer"){ctx.fillStyle="#9b5ba4";ctx.fillRect(-26,-5,52,11);ctx.fillStyle="#e5d4e8";ctx.beginPath();ctx.moveTo(-24,21);ctx.lineTo(0,40);ctx.lineTo(24,21);ctx.fill();}if(z.kind==="imp"){ctx.scale(.72,.72);ctx.fillStyle="#bd6b4a";ctx.beginPath();ctx.arc(0,-60,13,0,TAU);ctx.fill();}if(z.kind==="ice"){ctx.fillStyle="#a9e3ee";ctx.beginPath();ctx.moveTo(-25,-50);ctx.lineTo(-10,-72);ctx.lineTo(0,-51);ctx.lineTo(14,-75);ctx.lineTo(25,-48);ctx.fill();}if(z.kind==="giant"){ctx.fillStyle="#574f45";roundRect(-32,-15,64,18,5);ctx.fill();ctx.strokeStyle="#8a7154";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(23,-5);ctx.lineTo(45,29);ctx.stroke();}if(z.burn>0){ctx.fillStyle="#ff7a45";ctx.beginPath();ctx.moveTo(-5,-50);ctx.quadraticCurveTo(5,-72,12,-48);ctx.fill();}if(z.stun>0){ctx.strokeStyle="#ffe66e";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-60,18,0,TAU);ctx.stroke();}ctx.restore();drawEnemyHp(z);}
  function drawZombie(z){
    const vaultLift=z.vaultAnim>0?Math.sin((1-z.vaultAnim/.72)*Math.PI)*72:0,airLift=z.air&&z.grounded<=0?18+Math.sin(state.time*4+z.id)*3:0,walk=Math.sin(z.step)*2,status=[z.burn>0?"燃烧":"",z.poison>0?"中毒":"",z.stun>0?"眩晕":"",z.slow>0?"减速":"",z.metalStripped?"破甲":""].filter(Boolean).join(" · ");
    drawTextEntity(ZOMBIE_TEXT[z.kind]||"我是僵尸",z.x,z.y-vaultLift-airLift+walk,z.hit>0?"#ffffff":z.color,1,status,ZOMBIE_DEFS[z.kind].giant?94:76);drawEnemyHp(z);
  }
  function drawEnemyHp(z){ctx.fillStyle="rgba(0,0,0,.35)";roundRect(z.x-24,z.y-67,48,5,3);ctx.fill();ctx.fillStyle="#e56b62";roundRect(z.x-24,z.y-67,48*Math.max(0,z.hp/z.maxHp),5,3);ctx.fill();}
  function drawZombies(){for(const z of state.zombies)if(z.alive)drawZombie(z);}
  function drawBullets(){for(const b of state.bullets){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.spin||0);ctx.shadowColor=b.color;ctx.shadowBlur=b.light||b.burst?18:10;ctx.strokeStyle=b.color;ctx.lineWidth=3;ctx.globalAlpha=.42;ctx.beginPath();ctx.moveTo(-24,0);ctx.lineTo(-7,0);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=b.color;if(b.kind==="star"){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?4:10;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();}else if(b.frost){ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(0,7);ctx.lineTo(-9,0);ctx.lineTo(0,-7);ctx.closePath();ctx.fill();ctx.strokeStyle="#e6fdff";ctx.lineWidth=2;ctx.stroke();}else if(b.kind==="corn"){ctx.beginPath();ctx.ellipse(0,0,9,5,0,0,TAU);ctx.fill();ctx.strokeStyle="#8d6821";ctx.stroke();}else if(b.kind==="melon"){ctx.beginPath();ctx.arc(0,0,10,0,TAU);ctx.fill();ctx.strokeStyle="#296f39";ctx.lineWidth=3;ctx.stroke();}else if(b.kind==="light"){for(let i=0;i<8;i++){ctx.rotate(TAU/8);ctx.fillRect(-1,-13,2,8);}ctx.beginPath();ctx.arc(0,0,7,0,TAU);ctx.fill();}else{ctx.beginPath();ctx.arc(0,0,b.burst?10:6,0,TAU);ctx.fill();ctx.fillStyle="rgba(255,255,255,.55)";ctx.beginPath();ctx.arc(-2,-2,2,0,TAU);ctx.fill();}if(b.stun){ctx.strokeStyle="#ffe36b";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,11,0,TAU);ctx.stroke();}if(b.fire){ctx.fillStyle="#ff8b4d";ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-22,-6);ctx.lineTo(-18,6);ctx.fill();}if(b.sunny||b.light){ctx.strokeStyle="#fff0a0";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,14,0,TAU);ctx.stroke();}if(b.hitsLeft>1){ctx.strokeStyle="#d8b9ff";ctx.beginPath();ctx.arc(0,0,12,0,TAU);ctx.stroke();}ctx.restore();}}
  function drawSuns(){for(const s of state.suns)drawTextEntity("我是阳光",s.x,s.y+Math.sin(s.phase)*2,"#ffe06a",1,`+${s.value}`,72);}
  function drawParticles(){for(const p of state.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,TAU);ctx.fill();}ctx.globalAlpha=1;for(const f of state.floaters){ctx.globalAlpha=f.life/f.max;ctx.font=`900 ${16*f.scale}px system-ui`;ctx.textAlign="center";ctx.strokeStyle="rgba(8,25,18,.8)";ctx.lineWidth=4;ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;}
  function drawEffects(){for(const e of state.effects){const t=1-e.life/e.max;ctx.save();ctx.globalAlpha=Math.max(0,e.life/e.max);ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.shadowColor=e.color;ctx.shadowBlur=16;if(e.type==="ring"||e.type==="doom"){ctx.lineWidth=e.type==="doom"?12:6;ctx.beginPath();ctx.arc(e.x,e.y,(e.type==="doom"?30:18)+t*(e.type==="doom"?290:105),0,TAU);ctx.stroke();if(e.type==="doom"){ctx.globalAlpha*=.18;ctx.beginPath();ctx.arc(e.x,e.y,25+t*250,0,TAU);ctx.fill();}}else if(e.type==="freeze"){ctx.globalAlpha*=.2*(1-t);ctx.fillStyle="#c9f9ff";ctx.fillRect(0,128,W,480);ctx.globalAlpha=.9*(1-t);for(let i=0;i<9;i++){const x=120+i*145,y=160+(i%4)*105;ctx.beginPath();ctx.moveTo(x,y-24);ctx.lineTo(x+8,y);ctx.lineTo(x,y+24);ctx.lineTo(x-8,y);ctx.closePath();ctx.stroke();}}else if(e.type==="gust"){ctx.lineWidth=5;for(let i=0;i<7;i++){const yy=160+i*62,shift=t*300+i*23;ctx.beginPath();ctx.moveTo(220+shift%180,yy);ctx.bezierCurveTo(480,yy-30,780,yy+35,1160,yy-8);ctx.stroke();}}else if(e.type==="gasRow"){const front=e.x+e.w*Math.min(1,t*1.45);ctx.globalAlpha*=.24*(1-t);ctx.fillStyle=e.color;roundRect(e.x,e.y-e.h/2,Math.max(10,front-e.x),e.h,24);ctx.fill();ctx.globalAlpha=.9*(1-t);for(let i=0;i<72;i++){const progress=(i/72+t*.72)%1,xx=e.x+progress*e.w,yy=e.y+Math.sin(i*2.3+t*10)*e.h*.32,r=3+(i%5)*1.35;ctx.fillStyle=i%4===0?"#d7b4f5":i%4===1?"#b77de5":e.color;ctx.beginPath();ctx.arc(xx,yy,r*(1-t*.3),0,TAU);ctx.fill();}}else if(e.type==="gasArea"){ctx.globalAlpha*=.2;ctx.fillStyle=e.color;roundRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h,22);ctx.fill();ctx.globalAlpha=.9*(1-t);ctx.strokeStyle="#d3aaf2";ctx.lineWidth=4;roundRect(e.x-e.w/2+t*16,e.y-e.h/2+t*16,e.w-t*32,e.h-t*32,20);ctx.stroke();for(let i=0;i<80;i++){const a=i*2.399+t*.8,r=16+(i%10)*12+t*52;ctx.fillStyle=i%4===0?"#dab8f5":i%4===1?"#b779e3":e.color;ctx.beginPath();ctx.arc(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,3+(i%4)*1.25,0,TAU);ctx.fill();}}else if(e.type==="magnet"){ctx.lineWidth=4;ctx.setLineDash([7,7]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.quadraticCurveTo((e.x+e.tx)/2,e.y-90,e.tx,e.ty);ctx.stroke();ctx.setLineDash([]);}else if(e.type==="impact"){ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(e.x,e.y,18+t*70,8+t*24,0,0,TAU);ctx.stroke();for(let i=0;i<7;i++){const a=Math.PI+(i/6)*Math.PI;ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*16,e.y+Math.sin(a)*8);ctx.lineTo(e.x+Math.cos(a)*(38+t*55),e.y+Math.sin(a)*(18+t*35));ctx.stroke();}}else if(e.type==="arc"){ctx.lineWidth=3;ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.quadraticCurveTo((e.x+e.tx)/2,e.y-110,e.tx,e.ty);ctx.stroke();ctx.setLineDash([]);}else if(e.type==="bite"||e.type==="chomp"){ctx.lineWidth=e.type==="chomp"?8:4;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(e.x-i*8,e.y+(i-1)*7,15+t*28,-.8,.8);ctx.stroke();}}else if(e.type==="ignite"||e.type==="flameAura"){ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,10+t*(e.type==="flameAura"?60:25),0,TAU);ctx.stroke();}ctx.restore();}ctx.globalAlpha=1;}
  function drawHUD(){
    const waveProgress=(state.battleTime%WAVE_SECONDS)/WAVE_SECONDS,totalSeconds=Math.floor(state.battleTime),minutes=Math.floor(totalSeconds/60),seconds=String(totalSeconds%60).padStart(2,"0");
    ctx.fillStyle="rgba(10,31,24,.88)";roundRect(20,18,236,96,18);ctx.fill();ctx.fillStyle="#ffe06a";ctx.font="900 30px system-ui";ctx.textAlign="left";ctx.fillText(`☀ ${Math.floor(state.sun)}`,42,58);ctx.fillStyle="#a8c0b1";ctx.font="700 12px system-ui";ctx.fillText(`阳光资源  ·  +${state.stats.sunMade}`,43,84);ctx.fillStyle="rgba(255,255,255,.09)";roundRect(43,92,188,7,4);ctx.fill();ctx.fillStyle="#90df70";roundRect(43,92,188*waveProgress,7,4);ctx.fill();
    const modeLabel=state.gameMode==="classic"?`经典模式 · ${state.wave}/10 波`:`塔防模式 · 第 ${state.wave} 波`;
    ctx.fillStyle="rgba(10,31,24,.88)";roundRect(1000,632,254,68,16);ctx.fill();ctx.fillStyle="#dcebe0";ctx.font="800 15px system-ui";ctx.fillText(modeLabel,1024,660);ctx.fillStyle="#94ac9d";ctx.font="650 12px system-ui";ctx.fillText(`生存 ${minutes}:${seconds}  ·  ${state.fps} FPS`,1024,682);
    if(state.timeStop){ctx.save();ctx.fillStyle="rgba(72,76,160,.11)";ctx.fillRect(0,0,W,608);const pulse=1+Math.sin(state.time*5)*.05;ctx.translate(640,78);ctx.scale(pulse,pulse);ctx.fillStyle="rgba(19,26,70,.94)";roundRect(-132,-28,264,48,16);ctx.fill();ctx.strokeStyle="#a9c9ff";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#ddebff";ctx.textAlign="center";ctx.font="900 16px system-ui";ctx.fillText("⏱ 时停中 · 8% 流速",0,3);ctx.restore();}
    if(state.waveBanner>0){const names=["第一波 · 萌芽","第二波 · 快步逼近","第三波 · 报纸狂潮","第四波 · 医疗护卫","第五波 · 铁桶列队","第六波 · 球场冲锋","第七波 · 天空与地底","第八波 · 冰夜舞会","第九波 · 巨人脚步","第十波 · 万怪决战"],endlessNames=["尸潮再临","精英集结","极速突袭","重甲压境","无尽进化"];const name=names[state.wave-1]||`第 ${state.wave} 波 · ${endlessNames[(state.wave-11)%endlessNames.length]}`;ctx.globalAlpha=Math.min(1,state.waveBanner);ctx.fillStyle="rgba(10,31,24,.78)";roundRect(465,104,350,36,13);ctx.fill();ctx.textAlign="center";ctx.fillStyle="#f8e17a";ctx.font="900 18px system-ui";ctx.fillText(name,640,129);ctx.globalAlpha=1;}
  }
  function drawCards(){for(let i=0;i<state.loadout.length;i++){const id=state.loadout[i],d=Core.PLANTS[id],x=CARD_X+i*CARD_STEP,y=CARD_Y,sel=state.selected===id,ready=state.cooldowns[id]<=0&&state.sun>=d.cost;ctx.fillStyle=sel?"#eff5cf":ready?"rgba(20,69,48,.94)":"rgba(14,45,35,.9)";ctx.strokeStyle=sel?"#ffe064":"rgba(255,255,255,.16)";ctx.lineWidth=sel?3:1;roundRect(x,y,CARD_W,CARD_H,12);ctx.fill();ctx.stroke();ctx.textAlign="center";ctx.fillStyle=sel?"#183126":"#f4fff6";ctx.font=`900 ${d.short.length>3?9:10}px system-ui`;ctx.fillText(d.short,x+CARD_W/2,y+22,CARD_W-8);ctx.fillStyle=sel?"#315440":d.color;ctx.font="800 9px system-ui";ctx.fillText("文字植物",x+CARD_W/2,y+39,CARD_W-8);ctx.fillStyle=sel?"#5f5318":"#ffe177";ctx.font="800 9px system-ui";ctx.fillText(`☀ ${d.cost}`,x+CARD_W/2,y+56);ctx.fillStyle=sel?"#5f5318":"#91aa9b";ctx.font="800 8px system-ui";ctx.fillText(`${i+1}`,x+CARD_W/2,y+69);if(state.cooldowns[id]>0){const ratio=state.cooldowns[id]/d.cooldown;ctx.fillStyle="rgba(5,16,12,.72)";roundRect(x,y,CARD_W,CARD_H*ratio,12);ctx.fill();ctx.fillStyle="#d9e6dd";ctx.textAlign="center";ctx.font="800 11px system-ui";ctx.fillText(state.cooldowns[id].toFixed(1),x+CARD_W/2,y+43);}}}
  function drawFusionPreview(){if(!state.dragging||!state.dragTarget)return;const pt=state.dragPoint,c=cellCenter(state.dragTarget.row,state.dragTarget.col),valid=state.preview?.valid,color=valid?(state.preview.authored?"#ffe271":"#9cec86"):"#ef6f61";if(valid)drawTextEntity(`我是${state.preview.name}`,c.x,c.y,color,.5,"融合预览",92);const w=330,h=76,x=Math.min(920,Math.max(290,pt.x-165)),y=Math.max(54,pt.y-105);ctx.fillStyle="rgba(8,28,21,.92)";roundRect(x,y,w,h,15);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=valid?"#fff1a3":"#ffb0a7";ctx.font="900 18px system-ui";ctx.textAlign="left";ctx.fillText(valid?state.preview.name:state.preview?.reason,x+18,y+29);ctx.fillStyle="#bcd0c3";ctx.font="650 12px system-ui";ctx.fillText(valid?state.preview.note:"松手将取消",x+18,y+53);}
  function drawTutorial(){if(state.mode!=="playing"||state.battleTime>28)return;let text="";if(!state.tutorial.card)text="① 选择上方一张植物卡";else if(!state.tutorial.planted)text="② 点击草坪空格种植";else if(state.plants.length>=2&&!state.tutorial.dragged)text="③ 按住一株植物，拖到另一株上";if(text){ctx.fillStyle="rgba(8,27,20,.86)";roundRect(440,560,400,44,13);ctx.fill();ctx.fillStyle="#eef6ed";ctx.textAlign="center";ctx.font="800 15px system-ui";ctx.fillText(text,640,588);}}
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}

  let last=performance.now();
  function loop(now){const realDt=Math.min(.033,(now-last)/1000||0);last=now;state.timeScale=state.timeStop ? .08 : 1;update(realDt*state.timeScale,realDt);draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);

  let pendingMode="classic",pendingLoadout=[];
  const picker=document.getElementById("plantPicker"),pickCount=document.getElementById("pickCount"),confirmPlantsBtn=document.getElementById("confirmPlantsBtn");
  function buildPlantPicker(){picker.innerHTML=TYPES.map(id=>{const d=Core.PLANTS[id];return `<button class="plant-pick" type="button" data-plant-id="${id}" style="--plant-color:${d.color}" aria-pressed="false"><span class="pick-sigil">${CARD_SIGILS[id]||"●"}</span><span class="pick-name"><b>${d.name}</b><small>☀ ${d.cost} · ${Core.geneName(d.gene)}</small></span><span class="pick-order"></span></button>`;}).join("");renderPicker();}
  function renderPicker(){for(const button of picker.querySelectorAll("[data-plant-id]")){const index=pendingLoadout.indexOf(button.dataset.plantId),selected=index>=0;button.classList.toggle("selected",selected);button.setAttribute("aria-pressed",String(selected));button.querySelector(".pick-order").textContent=selected?String(index+1):"";}pickCount.textContent=String(pendingLoadout.length);const count=pendingLoadout.length;confirmPlantsBtn.disabled=count===0;confirmPlantsBtn.textContent=count===0?"请至少选择 1 种":`带 ${count} 种植物开始 →`;}
  const almanacGrid=document.getElementById("almanacGrid"),almanacSearch=document.getElementById("almanacSearch"),almanacCount=document.getElementById("almanacCount");
  let almanacFilter="all";
  const escapeText=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const almanacPlants=[
    ...TYPES.map(id=>{const d=Core.PLANTS[id];return{kind:"base",id,name:d.name,color:d.color,sigil:CARD_SIGILS[id]||"●",available:true,recipe:"基础植物",hp:d.hp,damage:d.damage||0,interval:d.interval||0,description:`阳光消耗：${d.cost}；冷却：${d.cooldown}秒；类型：${Core.geneName(d.gene)}`} }),
    ...Object.values(Core.FUSIONS).map((d,index)=>({kind:"fusion",ultimate:Boolean(d.abilities?.ultimate),id:d.id,name:d.name,color:d.color,sigil:d.abilities?.ultimate?"★":["✦","◆","✹","⬢","●","◉"][index%6],available:Boolean(d.available),recipe:d.recipe||d.materials.join(" + "),hp:d.hp,damage:d.damage||0,interval:d.interval||0,description:d.description}))
  ];
  function almanacCard(item){
    const override=item.id==="ultimate004"?{damage:800,interval:1.75,description:"普通啃咬造成800伤害；每15秒充能一次吞噬，可秒杀被啃咬的僵尸；啃咬后回复三分之一基础生命并吐出一颗子弹。"}:item.id==="fusion015"?{damage:200,interval:1.75,description:"每1.75秒啃咬造成200伤害；每20秒发动一次2000伤害吞噬；啃咬后回复三分之一基础生命并吐出一颗子弹。"}:null,damage=override?.damage??(item.damage?item.damage:"—"),interval=(override?.interval??item.interval)?`${override?.interval??item.interval}秒`:"—",badge=item.kind==="base"?"基础":item.ultimate?"究极":item.available?"可融合":"待补材料",description=override?.description||item.description;
    return `<article class="almanac-card${item.available?"":" unavailable"}" role="listitem" style="--card-color:${escapeText(item.color)}" data-kind="${item.kind}"><span class="card-badge${item.available?"":" locked"}">${badge}</span><div class="card-top"><span class="card-emblem">${escapeText(item.sigil)}</span><span class="card-title"><b>${escapeText(item.name)}</b><small>${item.kind==="base"?"基础植物卡":item.ultimate?`究极植物卡 · ${escapeText(item.id.replace("ultimate","U-"))}`:`融合植物卡 · ${escapeText(item.id.replace("fusion","#"))}`}</small></span></div><div class="card-recipe">${item.kind==="base"?"直接选择植物卡种植":`融合配方：${escapeText(item.recipe)}`}</div><div class="card-stats"><span>耐久<b>${escapeText(item.hp)}</b></span><span>伤害<b>${escapeText(damage)}</b></span><span>间隔<b>${escapeText(interval)}</b></span></div><p class="card-desc">${escapeText(description)}</p></article>`;
  }
  function renderAlmanac(){
    const query=almanacSearch.value.trim().toLowerCase();
    const visible=almanacPlants.filter(item=>(almanacFilter==="all"||(almanacFilter==="base"&&item.kind==="base")||(almanacFilter==="fusion"&&item.kind==="fusion"&&!item.ultimate)||(almanacFilter==="ultimate"&&item.ultimate)||(almanacFilter==="available"&&item.kind==="fusion"&&item.available))&&(!query||`${item.name} ${item.recipe} ${item.description}`.toLowerCase().includes(query)));
    almanacGrid.innerHTML=visible.length?visible.map(almanacCard).join(""):`<div class="almanac-empty">没有找到符合条件的植物卡片</div>`;
    almanacCount.textContent=`显示 ${visible.length} / ${almanacPlants.length} 张植物卡片`;
  }
  document.querySelectorAll("[data-almanac-filter]").forEach(button=>button.onclick=()=>{almanacFilter=button.dataset.almanacFilter;document.querySelectorAll("[data-almanac-filter]").forEach(tab=>tab.classList.toggle("active",tab===button));renderAlmanac();sfx("select");});
  almanacSearch.addEventListener("input",renderAlmanac);
  const zombieAlmanacGrid=document.getElementById("zombieAlmanacGrid"),zombieAlmanacSearch=document.getElementById("zombieAlmanacSearch"),zombieAlmanacCount=document.getElementById("zombieAlmanacCount");
  let zombieAlmanacFilter="all";
  const zombieAlmanacEntries=Object.entries(ZOMBIE_DEFS).map(([id,def])=>({id,...def,...ZOMBIE_ALMANAC[id]}));
  function zombieSpeedLabel(speed){return speed>=28?"极快":speed>=23?"快速":speed>=17?"普通":"缓慢";}
  function zombieAlmanacCard(item){
    const badge=item.air?"空中":item.metal?"重甲":item.tags.includes("special")?"特殊":"普通";
    return `<article class="almanac-card zombie-card" role="listitem" style="--card-color:${escapeText(item.color)}" data-kind="${escapeText(item.id)}"><span class="card-badge">${badge}</span><div class="card-top"><span class="card-emblem">${escapeText(item.sigil)}</span><span class="card-title"><b>${escapeText(item.name)}</b><small>敌军档案 · ${escapeText(item.id.toUpperCase())}</small></span></div><div class="card-recipe">特殊能力：${escapeText(item.ability)}</div><div class="card-stats"><span>基础生命<b>${escapeText(item.hp)}</b></span><span>速度<b>${escapeText(zombieSpeedLabel(item.speed))} ${escapeText(item.speed)}</b></span><span>首次登场<b>第 ${escapeText(item.firstWave)} 波</b></span></div><p class="card-desc">防具：${escapeText(item.armor)}。无限模式中，生命与速度会随波次继续提升。</p></article>`;
  }
  function renderZombieAlmanac(){
    const query=zombieAlmanacSearch.value.trim().toLowerCase();
    const visible=zombieAlmanacEntries.filter(item=>(zombieAlmanacFilter==="all"||item.tags.includes(zombieAlmanacFilter))&&(!query||`${item.name} ${item.armor} ${item.ability} ${item.id}`.toLowerCase().includes(query)));
    zombieAlmanacGrid.innerHTML=visible.length?visible.map(zombieAlmanacCard).join(""):`<div class="almanac-empty">没有找到符合条件的僵尸档案</div>`;
    zombieAlmanacCount.textContent=`显示 ${visible.length} / ${zombieAlmanacEntries.length} 种僵尸`;
  }
  document.querySelectorAll("[data-zombie-filter]").forEach(button=>button.onclick=()=>{zombieAlmanacFilter=button.dataset.zombieFilter;document.querySelectorAll("[data-zombie-filter]").forEach(tab=>tab.classList.toggle("active",tab===button));renderZombieAlmanac();sfx("select");});
  zombieAlmanacSearch.addEventListener("input",renderZombieAlmanac);
  picker.addEventListener("click",e=>{const button=e.target.closest("[data-plant-id]");if(!button)return;const id=button.dataset.plantId,index=pendingLoadout.indexOf(id);if(index>=0)pendingLoadout.splice(index,1);else if(pendingLoadout.length<LOADOUT_SIZE)pendingLoadout.push(id);else{toast("每局最多选择 10 种植物");return;}sfx("select");renderPicker();});
  document.querySelectorAll("[data-game-mode]").forEach(button=>button.onclick=()=>{initAudio();pendingMode=button.dataset.gameMode;pendingLoadout=[];document.getElementById("selectEyebrow").textContent=`${pendingMode==="classic"?"经典模式 · 十波通关":"塔防模式 · 无限防守"} · 出战准备`;renderPicker();showPanel("selectPanel");sfx("select");});
  document.getElementById("recommendBtn").onclick=()=>{pendingLoadout=[...RECOMMENDED_LOADOUT];renderPicker();sfx("select");};
  document.getElementById("backToModesBtn").onclick=()=>showPanel("startPanel");
  confirmPlantsBtn.onclick=()=>{if(pendingLoadout.length<1||pendingLoadout.length>LOADOUT_SIZE)return;state.gameMode=pendingMode;state.loadout=[...pendingLoadout];reset();};
  document.getElementById("howBtn").onclick=()=>showPanel("howPanel");
  document.getElementById("almanacBtn").onclick=()=>{renderAlmanac();showPanel("almanacPanel");sfx("select");};
  document.getElementById("zombieAlmanacBtn").onclick=()=>{renderZombieAlmanac();showPanel("zombieAlmanacPanel");sfx("select");};
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>state.mode==="menu"?showPanel("startPanel"):hidePanels());
  document.getElementById("pauseBtn").onclick=togglePause;document.getElementById("resumeBtn").onclick=togglePause;
  document.getElementById("restartBtn").onclick=reset;document.getElementById("restartBtnPause").onclick=reset;
  document.getElementById("resultMenuBtn").onclick=()=>{state.mode="menu";state.paused=false;state.timeStop=false;syncTimeStopButton();showPanel("startPanel");};
  document.getElementById("soundBtn").onclick=()=>{state.sound=!state.sound;document.getElementById("soundBtn").textContent=state.sound?"♫":"×";if(state.sound)initAudio();};
  document.getElementById("timeStopBtn").onclick=toggleTimeStop;
  function togglePause(){if(state.mode!=="playing")return;state.paused=!state.paused;if(state.paused){state.timeStop=false;sfx("pause");showPanel("pausePanel");}else{sfx("resume");hidePanels();}syncTimeStopButton();}
  addEventListener("keydown",e=>{if(e.code==="Space"){e.preventDefault();togglePause();}if(e.code==="Escape"&&state.paused)togglePause();});
  addEventListener("blur",()=>{state.timeStop=false;if(state.mode==="playing"&&!state.paused)togglePause();else syncTimeStopButton();});

  buildPlantPicker();renderAlmanac();renderZombieAlmanac();showPanel("startPanel");

  fetch(new URL("api/status",location.href),{cache:"no-store"}).then(r=>r.ok?r.json():null).then(info=>{
    if(!info?.ok)return;
    const status=document.getElementById("runtimeStatus");
    if(status)status.textContent=`Cloudflare 动态版 · v${info.version} · ${info.colo}`;
  }).catch(()=>{});

  window.__gardenDebug={
    state, Core, reset, endGame, spawnZombie, shoot, updateBullets, cellCenter,
    setSun:n=>state.sun=n,
    advance:n=>{state.battleTime=Math.max(0,state.battleTime+n);},
    addPlant:(id,row,col)=>{const p=Core.createPlant(id,state.nextUid++,row,col);state.plants.push(p);return p;},
    fuse:(donor,host)=>commitFusion(donor,host),
    snapshot:()=>({mode:state.mode,gameMode:state.gameMode,loadout:[...state.loadout],wave:state.wave,fps:state.fps,timeStop:state.timeStop,timeScale:state.timeScale,sun:state.sun,selected:state.selected,mowers:[...state.mowers],plants:state.plants.filter(p=>p.alive).map(p=>({id:p.baseId,fusionId:p.fusionId,row:p.row,col:p.col,rank:p.rank,hp:p.hp,maxHp:p.maxHp,devourCharge:p.devourCharge||0,genes:p.genes,materials:p.materialIds||[],name:p.displayName})),zombies:state.zombies.filter(z=>z.alive).length,zombieKinds:[...new Set(state.zombies.filter(z=>z.alive).map(z=>z.kind))],zombieKindsSeen:[...state.zombieKindsSeen],stats:{...state.stats,discovered:[...state.stats.discovered]}})
  };

  // A hidden, read-only health snapshot keeps automated browser checks deterministic
  // without coupling gameplay code to a testing framework.
  const telemetry=document.getElementById("testTelemetry");
  setInterval(()=>{
    const snap=window.__gardenDebug.snapshot();
    telemetry.textContent=JSON.stringify(snap);
    telemetry.dataset.mode=snap.mode;
    telemetry.dataset.fps=String(snap.fps);
    telemetry.dataset.plants=String(snap.plants.length);
    telemetry.dataset.zombies=String(snap.zombies);
    telemetry.dataset.fusions=String(snap.stats.fusions);
  },250);
})();
