(function () {
  "use strict";
  const Core = window.FusionCore;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const W = 1280, H = 720;
  const GRID = { x: 286, y: 142, cols: 9, rows: 5, cw: 96, ch: 96 };
  const CARD_Y = 616;
  const CARD_X = 48, CARD_STEP = 148, CARD_W = 139, CARD_H = 42, CARDS_PER_ROW = 8;
  const TYPES = Object.keys(Core.PLANTS);
  const TAU = Math.PI * 2;
  const BASE_WAVE_SECONDS = 30;
  const SPAWN_GAPS = [7.2,6.8,6.4,6,5.6,5.2,4.8,4.4,4,3.6];
  const CARD_SIGILS={pea:"●",sun:"✹",nut:"⬢",frost:"❄",cherry:"✦",corn:"▦",pepper:"♨",mushroom:"✧",cactus:"✣",garlic:"◈",coffee:"◆",melon:"◉",bamboo:"║",lotus:"❀",pumpkin:"⬡"};
  const PLANT_SPRITES={pea:0,sun:1,nut:2,frost:3,cherry:4,corn:5,pepper:6,mushroom:7,cactus:8,garlic:9,coffee:10,melon:11,bamboo:12,lotus:13,pumpkin:14};
  const ZOMBIE_SPRITES={basic:0,cone:1,bucket:2,runner:3,paper:4,shield:5,healer:6,football:7,balloon:8,miner:9,dancer:10,giant:11,imp:12,ice:13};
  const art={plants:new Image(),zombies:new Image()};
  art.plants.src="assets/plants-atlas.png?v=2.2.0";
  art.zombies.src="assets/zombies-atlas.png?v=2.2.0";
  const qaDuration = Number(new URLSearchParams(location.search).get("testDuration"));
  const QA_MODE = Number.isFinite(qaDuration) && qaDuration >= 2 && qaDuration < 300;
  const WAVE_SECONDS = QA_MODE ? qaDuration : BASE_WAVE_SECONDS;

  const state = {
    mode: "menu", paused: false, sound: true, time: 0, battleTime: 0,
    sun: 400, selected: null, hoverCell: null, plants: [], zombies: [], bullets: [], particles: [], suns: [], floaters: [],
    nextUid: 1, spawnTimer: 6, naturalSunTimer: 2.5, wave: 1, waveBanner: 0, mowers: [2,2,2,2,2],
    dragging: null, dragPoint: null, dragTarget: null, preview: null, pointerDown: null,
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
    if (name === "start") { [262,330,392,523].forEach((f,i)=>setTimeout(()=>tone(f,.14,"sine",.026,45),i*55)); }
    if (name === "pause") tone(240,.12,"sine",.025,-100);
    if (name === "resume") tone(260,.12,"sine",.025,150);
    if (name === "lose") { [260,196,147,98].forEach((f,i)=>setTimeout(()=>tone(f,.3,"sawtooth",.032,-25),i*130)); }
  }

  function reset() {
    Object.assign(state, {
      mode: "playing", paused: false, time: 0, battleTime: 0, sun: 400, selected: null, hoverCell: null,
      plants: [], zombies: [], bullets: [], particles: [], suns: [], floaters: [], nextUid: 1,
      spawnTimer: 6, naturalSunTimer: 2.5, wave: 1, waveBanner: 2.2, mowers: [2,2,2,2,2],
      dragging: null, dragPoint: null, dragTarget: null, preview: null, pointerDown: null,
      cooldowns: Object.fromEntries(TYPES.map(t => [t, 0])),
      stats: { planted: 0, fusions: 0, discovered: new Set(), kills: 0, sunMade: 0 },
      cameraShake: 0, zombieKindsSeen: new Set(), lastKillSoundAt: -1
    });
    hidePanels();
    initAudio();
    sfx("start");
    toast("选择一张植物卡，再点击草坪种植");
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
    if (y < CARD_Y || y > 708) return null;
    const row=y<663?0:1, local=Math.floor((x-CARD_X)/CARD_STEP), i=row*CARDS_PER_ROW+local;
    if(local>=0&&local<CARDS_PER_ROW&&i<TYPES.length){const bx=CARD_X+local*CARD_STEP,by=row?665:618;if(x>=bx&&x<=bx+CARD_W&&y>=by&&y<=by+CARD_H)return TYPES[i];}
    return null;
  }

  canvas.addEventListener("pointerdown", e => {
    if (state.mode!=="playing" || state.paused) return;
    initAudio(); canvas.setPointerCapture(e.pointerId);
    const pt=canvasPoint(e), card=cardAt(pt.x,pt.y), cell=cellAt(pt.x,pt.y);
    if (card) { selectCard(card); return; }
    if (!cell) return;
    const plant=plantAt(cell.row,cell.col);
    if (plant) {
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
      state.preview=state.dragTarget?Core.previewFusion(state.dragging,state.dragTarget):null;
    }
  });
  canvas.addEventListener("pointerup", e => {
    if (state.dragging) {
      state.dragging.dragging=false;
      if (state.dragTarget && state.preview?.valid) commitFusion(state.dragging,state.dragTarget);
      else if (state.preview && !state.preview.valid) toast(state.preview.reason);
    } else if (state.pointerDown) {
      const p=state.pointerDown.plant; toast(`${p.displayName} · ${p.rank}★ · ${Math.ceil(p.hp)}/${p.maxHp} 耐久`);
    }
    state.dragging=null; state.dragTarget=null; state.preview=null; state.pointerDown=null;
  });
  canvas.addEventListener("pointercancel", ()=>{ if(state.dragging)state.dragging.dragging=false; state.dragging=null; state.pointerDown=null; state.preview=null; });

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
  function commitFusion(donor,host) {
    const preview=Core.previewFusion(donor,host); const c=cellCenter(host.row,host.col);
    const result=Core.fuse(donor,host); if(!result.ok)return;
    donor.alive=false; state.stats.fusions++; state.stats.discovered.add(preview.name);
    burstParticles(c.x,c.y,"#f5df78",36,130); burstParticles(c.x,c.y,Core.PLANTS[donor.baseId].color,24,90);
    floater(c.x,c.y-58,preview.name,preview.authored?"#ffe27a":"#b9f4a0",1.2); state.cameraShake=5; sfx("fuse");
    toast(`${preview.name}：${preview.note}`);
  }

  function update(dt) {
    state.time+=dt; state.frameAcc+=dt; state.frameCount++;
    if(state.time-state.lastFpsAt>=.5){state.fps=Math.round(state.frameCount/state.frameAcc);state.frameAcc=0;state.frameCount=0;state.lastFpsAt=state.time;}
    updateParticles(dt); if(state.mode!=="playing"||state.paused)return;
    state.battleTime+=dt; state.waveBanner=Math.max(0,state.waveBanner-dt); state.cameraShake=Math.max(0,state.cameraShake-dt*20);
    const nextWave=Math.floor(state.battleTime/WAVE_SECONDS)+1;
    if(nextWave!==state.wave){
      state.wave=nextWave;state.waveBanner=2.4;sfx("wave");
      const reward=25+Math.min(75,Math.floor(state.wave/5)*10);state.sun+=reward;floater(640,118,`第 ${state.wave} 波 · +${reward} 阳光`,"#ffe173",1.05);
      if(state.wave%10===0){const damaged=state.mowers.findIndex(v=>v<2);if(damaged>=0){state.mowers[damaged]++;toast(`坚持到第 ${state.wave} 波：补充了一次推土机机会`);}}
      if(QA_MODE)for(const [i,kind] of poolForWave(state.wave).entries()){state.zombieKindsSeen.add(kind);state.zombies.push(makeZombie(kind,i%5,1110+i*18));}
    }
    for(const k of TYPES) state.cooldowns[k]=Math.max(0,state.cooldowns[k]-dt);
    state.naturalSunTimer-=dt;
    if(state.naturalSunTimer<=0){spawnSun(160+Math.random()*900,90+Math.random()*360,25,true);state.naturalSunTimer=5.5+Math.random()*1.5;}
    state.spawnTimer-=dt;
    if(state.spawnTimer<=0&&state.zombies.length<62){spawnZombie();const base=SPAWN_GAPS[Math.min(9,state.wave-1)],endless=Math.pow(.985,Math.max(0,state.wave-10));state.spawnTimer=Math.max(1.55,base*endless)*(.9+Math.random()*.3);}
    updatePlants(dt); updateBullets(dt); updateZombies(dt); updateSuns(dt);
    state.plants=state.plants.filter(p=>p.alive); state.zombies=state.zombies.filter(z=>z.alive); state.bullets=state.bullets.filter(b=>b.alive); state.suns=state.suns.filter(s=>s.alive);
  }

  function updatePlants(dt) {
    for(const p of state.plants){if(!p.alive)continue;p.age+=dt;p.hitFlash=Math.max(0,p.hitFlash-dt*4);p.freeze=Math.max(0,(p.freeze||0)-dt);if(p.freeze>0)continue;const rate=(p.baseId==="coffee"?1.18:1)*(p.genes.includes("haste")?1.3:1);p.timer-=dt*rate;
      const def=Core.PLANTS[p.baseId];
      if(def.body==="burst"){p.detonate-=dt;if(p.detonate<=0)explodePlant(p);continue;}
      const hasEnemy=state.zombies.some(z=>z.alive&&z.row===p.row&&z.x>cellCenter(p.row,p.col).x-10);
      if(def.body==="shooter"&&hasEnemy&&p.timer<=0){shoot(p);p.timer=def.interval/(1+(p.rank-1)*.08);}
      if(def.body==="producer"&&p.timer<=0){produce(p);p.timer=def.interval/(p.genes.includes("guard")?1.18:1);}
      if(def.body==="guard"&&p.genes.includes("shooter")&&p.retaliate>=5){shoot(p,.85);p.retaliate=0;}
      if(p.genes.includes("producer")&&def.body!=="producer"){p.sunTimer=(p.sunTimer||6)-dt;if(p.sunTimer<=0){spawnSun(cellCenter(p.row,p.col).x,cellCenter(p.row,p.col).y-35,10,false);p.sunTimer=8;}}
    }
  }
  function shoot(p,scale=1) {
    const c=cellCenter(p.row,p.col), def=Core.PLANTS[p.baseId]; p.attackCount++;
    let count=1+(p.genes.includes("shooter")?1:0)+(p.rank>=2&&p.baseId==="pea"?1:0)+(p.baseId==="bamboo"?1:0)+(p.genes.includes("multishot")?1:0);
    for(let i=0;i<count;i++) state.bullets.push({x:c.x+26-i*8,y:c.y-9+i*7,row:p.row,vx:290+i*14,damage:Math.max(8,Core.damageFor(p)*(i?0.62:1)*scale),frost:p.baseId==="frost"||p.genes.includes("frost"),sunny:p.genes.includes("producer"),burst:p.genes.includes("burst")&&p.attackCount%6===0,stun:p.baseId==="corn"||p.genes.includes("stun"),fire:p.genes.includes("fire"),crit:p.baseId==="cactus"||p.genes.includes("crit"),splash:p.baseId==="melon"||p.genes.includes("splash"),hitsLeft:p.baseId==="mushroom"||p.genes.includes("pierce")?2:1,hitIds:[],alive:true,life:4,color:def.color});
    sfx("shoot");
  }
  function produce(p) {
    const c=cellCenter(p.row,p.col), value=25+(p.rank-1)*10; spawnSun(c.x,c.y-38,value,false);
    if(p.baseId==="lotus"||p.genes.includes("heal"))for(const ally of state.plants)if(ally.alive&&Math.abs(ally.row-p.row)<=1&&Math.abs(ally.col-p.col)<=2)ally.hp=Math.min(ally.maxHp,ally.hp+90*p.rank);
    if(p.genes.includes("shooter")||p.genes.includes("pierce")){const target=mostDangerousRow();for(let i=0;i<3;i++)state.bullets.push({x:c.x+18,y:c.y-12,row:target,vx:270+i*18,damage:10*p.rank,frost:false,sunny:false,stun:p.genes.includes("stun"),fire:p.genes.includes("fire"),hitsLeft:p.genes.includes("pierce")?2:1,hitIds:[],alive:true,life:4,color:"#f2d35d"});}
  }
  function mostDangerousRow(){let best=0,score=-1;for(let r=0;r<5;r++){const s=state.zombies.filter(z=>z.alive&&z.row===r).reduce((a,z)=>a+(1100-z.x),0);if(s>score){score=s;best=r;}}return best;}
  function explodePlant(p){const c=cellCenter(p.row,p.col);if(p.baseId==="pepper")lineExplosion(p.row,Core.damageFor(p)||620);else explosion(c.x,c.y,150,Core.damageFor(p)||900);p.alive=false;}
  function lineExplosion(row,damage){state.cameraShake=10;sfx("boom");for(let x=GRID.x;x<1240;x+=58)burstParticles(x,GRID.y+row*GRID.ch+50,"#ff704d",5,110);for(const z of state.zombies)if(z.alive&&z.row===row){z.hp-=damage;z.hit=1;z.burn=3;if(z.hp<=0)killZombie(z);}}
  function explosion(x,y,radius,damage){state.cameraShake=9;sfx("boom");burstParticles(x,y,"#ffbc62",46,210);burstParticles(x,y,"#ef5c61",34,150);for(const z of state.zombies)if(z.alive&&Math.hypot(z.x-x,z.y-y)<radius){z.hp-=damage;z.hit=1;if(z.hp<=0)killZombie(z);}}
  function splashImpact(x,y,radius,damage){burstParticles(x,y,"#9adb76",9,65);for(const z of state.zombies)if(z.alive&&Math.hypot(z.x-x,z.y-y)<radius){z.hp-=damage;z.hit=1;if(z.hp<=0)killZombie(z);}}

  const ZOMBIE_DEFS={basic:{hp:155,speed:15,color:"#8eb38c"},cone:{hp:360,speed:13,color:"#dca14a"},bucket:{hp:720,speed:10,color:"#a9b6b4"},runner:{hp:135,speed:24,color:"#b2d27f"},paper:{hp:280,speed:16,color:"#a0b59b"},shield:{hp:600,speed:10,color:"#7fa09b"},healer:{hp:390,speed:12,color:"#9db995"},football:{hp:980,speed:20,color:"#a87070"},balloon:{hp:230,speed:22,color:"#9aaec2"},miner:{hp:430,speed:17,color:"#927f68"},dancer:{hp:500,speed:14,color:"#b68ab9"},giant:{hp:1850,speed:8,color:"#708c72"},imp:{hp:95,speed:29,color:"#a8bd8c"},ice:{hp:470,speed:12,color:"#8bb9c7"}};
  const ZOMBIE_POOLS=[
    ["basic"],["basic","basic","cone","runner"],["basic","cone","paper","runner"],["cone","paper","shield","healer"],["bucket","shield","healer","paper"],
    ["football","imp","cone","runner"],["balloon","miner","shield","paper"],["dancer","ice","healer","football"],["giant","bucket","dancer","balloon","miner"],["giant","football","ice","dancer","healer","shield","bucket","imp"]
  ];
  function poolForWave(wave){
    if(wave<=ZOMBIE_POOLS.length)return ZOMBIE_POOLS[wave-1];
    const veteran=["bucket","shield","healer","football","balloon","miner","dancer","giant","imp","ice"],rotation=wave%5;
    return veteran.filter((_,i)=>(i+rotation)%4!==0).concat(wave%3===0?["giant"]:[],wave%2===0?["runner"]:["paper"]);
  }
  function makeZombie(kind,row,x){const d=ZOMBIE_DEFS[kind],beyond=Math.max(0,state.wave-1),hpScale=1+beyond*.075+Math.floor(beyond/10)*.12,speedScale=1+Math.min(.65,beyond*.012),hp=Math.round(d.hp*hpScale);return{id:state.nextUid++,row,x:x??1185+Math.random()*45,y:GRID.y+row*GRID.ch+54,hp,maxHp:hp,speed:d.speed*speedScale,kind,color:d.color,alive:true,attackTimer:0,healTimer:2.8,summonTimer:5,hit:0,slow:0,stun:0,burn:0,weaken:0,step:Math.random()*TAU};}
  function spawnZombie(){const row=Math.floor(Math.random()*5),pool=poolForWave(state.wave),kind=pool[Math.floor(Math.random()*pool.length)],x=kind==="miner"?790+Math.random()*120:undefined;state.zombieKindsSeen.add(kind);state.zombies.push(makeZombie(kind,row,x));}
  function updateZombies(dt){
    for(const z of state.zombies){if(!z.alive)continue;z.hit=Math.max(0,z.hit-dt*5);z.slow=Math.max(0,z.slow-dt);z.stun=Math.max(0,(z.stun||0)-dt);z.weaken=Math.max(0,(z.weaken||0)-dt);z.step+=dt*5;
      if(z.burn>0){z.burn-=dt;z.hp-=18*dt;if(z.hp<=0){killZombie(z);continue;}}
      if(z.kind==="healer"){z.healTimer-=dt;if(z.healTimer<=0){for(const ally of state.zombies)if(ally.alive&&ally.row===z.row&&Math.abs(ally.x-z.x)<170)ally.hp=Math.min(ally.maxHp,ally.hp+34);burstParticles(z.x,z.y-28,"#9af59a",10,45);z.healTimer=3.2;}}
      if(z.kind==="dancer"){z.summonTimer-=dt;if(z.summonTimer<=0&&state.zombies.length<55){state.zombies.push(makeZombie("imp",z.row,z.x+48));z.summonTimer=6;}}
      if(z.stun>0)continue;
      const target=state.plants.filter(p=>p.alive&&p.row===z.row).sort((a,b)=>b.col-a.col).find(p=>cellCenter(p.row,p.col).x<z.x+12&&z.x-cellCenter(p.row,p.col).x<58);
      if(target){z.attackTimer-=dt;if(z.attackTimer<=0){let bite=z.kind==="giant"?48:25;if(z.weaken>0)bite*=.65;damagePlant(target,bite);if(z.kind==="ice")target.freeze=Math.max(target.freeze||0,1.5);if(target.baseId==="garlic"||target.genes.includes("weaken")){z.weaken=3;if(Math.random()<.32)z.row=Math.max(0,Math.min(4,z.row+(z.row===4?-1:z.row===0?1:Math.random()<.5?-1:1)));}z.attackTimer=.85;sfx("bite");}}
      else z.x-=z.speed*(z.slow>0?.55:1)*(z.kind==="paper"&&z.hp<z.maxHp*.5?1.7:1)*dt;
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

  function updateBullets(dt){for(const b of state.bullets){if(!b.alive)continue;b.x+=b.vx*dt;b.life-=dt;if(b.life<=0||b.x>1250){b.alive=false;continue;}const hit=state.zombies.filter(z=>z.alive&&z.row===b.row&&!b.hitIds.includes(z.id)&&Math.abs(z.x-b.x)<24).sort((a,c)=>a.x-c.x)[0];if(hit){let dealt=hit.kind==="shield"&&!b.fire&&!b.burst?b.damage*.65:b.damage;if(b.crit&&Math.random()<.22)dealt*=2;hit.hp-=dealt;hit.hit=1;if(b.frost&&zSlowable(hit))hit.slow=Math.max(hit.slow,2.6);if(b.stun&&Math.random()<.3)hit.stun=Math.max(hit.stun,.8);if(b.fire)hit.burn=Math.max(hit.burn,3);if(b.sunny&&Math.random()<.16)spawnSun(b.x,b.y,5,false);if(b.burst)explosion(b.x,b.y,72,70);if(b.splash)splashImpact(b.x,b.y,58,Math.max(18,dealt*.45));b.hitIds.push(hit.id);b.hitsLeft--;if(b.hitsLeft<=0)b.alive=false;else b.x+=25;if(hit.hp<=0)killZombie(hit);}}}
  function zSlowable(z){return z.kind!=="balloon";}
  function spawnSun(x,y,value,natural){state.suns.push({x,y:natural?-20:y,targetY:y,value,life:14,alive:true,vy:natural?105:0,phase:Math.random()*TAU});}
  function updateSuns(dt){for(const s of state.suns){s.life-=dt;s.phase+=dt*4;if(s.vy){s.y+=s.vy*dt;if(s.y>=s.targetY){s.y=s.targetY;s.vy=0;}}if(s.life<=8&&s.alive)collectSun(s,false);}}
  function collectSun(s,withSound=true){if(!s?.alive)return false;s.alive=false;state.sun+=s.value;state.stats.sunMade+=s.value;floater(s.x,s.y-20,`+${s.value} ☀`,"#ffe173");if(withSound)sfx("sun");return true;}
  function collectSunAt(pt){const s=state.suns.find(s=>s.alive&&Math.hypot(s.x-pt.x,s.y-pt.y)<35);return collectSun(s,true);}
  canvas.addEventListener("click",e=>{if(state.mode!=="playing"||state.paused)return;collectSunAt(canvasPoint(e));});

  function burstParticles(x,y,color,count,speed){for(let i=0;i<count;i++){const a=Math.random()*TAU,s=speed*(.25+Math.random()*.75);state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-20,life:.45+Math.random()*.55,max:1,color,size:2+Math.random()*5,grav:80});}}
  function floater(x,y,text,color,scale=1){state.floaters.push({x,y,text,color,life:1.2,max:1.2,scale});}
  function updateParticles(dt){for(const p of state.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.grav||0)*dt;p.vx*=.985;}state.particles=state.particles.filter(p=>p.life>0);for(const f of state.floaters){f.life-=dt;f.y-=24*dt;}state.floaters=state.floaters.filter(f=>f.life>0);}

  function endGame(){if(state.mode!=="playing")return;state.mode="lost";state.paused=true;sfx("lose");
    document.getElementById("resultEyebrow").textContent="无限防守结束";
    document.getElementById("resultTitle").textContent=`坚持到了第 ${state.wave} 波`;
    document.getElementById("resultCopy").textContent="僵尸突破了最后一道防线。重新安排融合顺序，下一局挑战更高纪录。";
    document.getElementById("resultStats").innerHTML=`<div><b>${state.wave}</b><span>生存波数</span></div><div><b>${state.stats.kills}</b><span>击败僵尸</span></div><div><b>${state.stats.fusions}</b><span>完成融合</span></div>`;
    showPanel("resultPanel");
  }

  function draw(){
    ctx.save();const sh=state.cameraShake; if(sh)ctx.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);
    drawBackground();drawGrid();drawMowers();drawSuns();drawPlants();drawZombies();drawBullets();drawParticles();drawHUD();drawCards();drawFusionPreview();drawTutorial();ctx.restore();
  }
  function drawBackground(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#8bc9a0");sky.addColorStop(.34,"#b7ddb1");sky.addColorStop(.35,"#50875c");sky.addColorStop(1,"#1c5135");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#f3d893";ctx.beginPath();ctx.arc(1100,75,42,0,TAU);ctx.fill();
    ctx.fillStyle="rgba(244,255,240,.36)";for(let i=0;i<4;i++){const x=120+i*285+Math.sin(state.time*.08+i)*16,y=58+(i%2)*25;ctx.beginPath();ctx.ellipse(x,y,46,16,0,0,TAU);ctx.ellipse(x+36,y+4,35,13,0,0,TAU);ctx.ellipse(x-31,y+5,28,11,0,0,TAU);ctx.fill();}
    ctx.fillStyle="rgba(31,75,48,.42)";for(let i=0;i<13;i++){const x=i*110-30,h=45+(i%4)*18;ctx.beginPath();ctx.moveTo(x,135);ctx.quadraticCurveTo(x+40,135-h,x+90,135);ctx.fill();}
    ctx.fillStyle="rgba(38,92,55,.48)";for(let i=0;i<22;i++){const x=i*63+Math.sin(i)*18;ctx.beginPath();ctx.arc(x,132,18+(i%3)*4,Math.PI,TAU);ctx.fill();}
    ctx.fillStyle="#183c2d";ctx.fillRect(0,608,W,112);
    ctx.fillStyle="#e9d1a0";ctx.fillRect(0,130,250,478);
    for(let i=0;i<70;i++){ctx.fillStyle=`rgba(70,46,28,${.05+(i%3)*.025})`;ctx.fillRect((i*47)%250,140+(i*83)%455,2+(i%4),2+(i%3));}
    for(let i=0;i<20;i++){const x=22+(i*79)%210,y=160+(i*113)%420;ctx.fillStyle=i%2?"#f1a3bd":"#f7d16a";ctx.beginPath();for(let a=0;a<5;a++){ctx.ellipse(x+Math.cos(a*TAU/5)*5,y+Math.sin(a*TAU/5)*5,3,5,a*TAU/5,0,TAU);}ctx.fill();}
    ctx.fillStyle="#2f6046";ctx.fillRect(250,128,18,480);ctx.fillStyle="#123c2a";ctx.fillRect(268,128,10,480);
  }
  function drawGrid(){
    for(let r=0;r<5;r++)for(let c=0;c<9;c++){const x=GRID.x+c*GRID.cw,y=GRID.y+r*GRID.ch;ctx.fillStyle=(r+c)%2?"#4e9456":"#5aa45f";roundRect(x+2,y+2,GRID.cw-4,GRID.ch-4,10);ctx.fill();ctx.fillStyle="rgba(255,255,255,.035)";ctx.beginPath();ctx.ellipse(x+GRID.cw/2,y+GRID.ch/2+28,31,8,0,0,TAU);ctx.fill();}
    const c=state.hoverCell;if(c&&state.selected&&!plantAt(c.row,c.col)){const p=cellCenter(c.row,c.col);ctx.strokeStyle="#f8df78";ctx.lineWidth=4;roundRect(p.x-44,p.y-44,88,88,12);ctx.stroke();}
  }
  function drawMowers(){for(let r=0;r<5;r++)if(state.mowers[r]>0){const y=GRID.y+r*GRID.ch+52,charges=state.mowers[r];ctx.save();ctx.translate(251,y);ctx.fillStyle=charges===2?"#d94e47":"#b56a45";roundRect(-30,-18,52,30,7);ctx.fill();ctx.fillStyle="#2b332d";ctx.beginPath();ctx.arc(-18,15,8,0,TAU);ctx.arc(13,15,8,0,TAU);ctx.fill();ctx.strokeStyle="#e9e3c6";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(18,-10);ctx.lineTo(31,-29);ctx.stroke();ctx.fillStyle="#fff0a6";ctx.strokeStyle="#502c24";ctx.lineWidth=3;ctx.font="900 12px system-ui";ctx.textAlign="center";ctx.strokeText(`×${charges}`,-5,-24);ctx.fillText(`×${charges}`,-5,-24);ctx.restore();}}
  function drawPlantBodyVector(p,x,y,alpha=1){const def=Core.PLANTS[p.baseId],bob=Math.sin(p.age*2.2+p.bob)*2;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y+bob);if(p.hitFlash>0){ctx.shadowColor="#fff";ctx.shadowBlur=18;}
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
  function drawAtlasCell(image,index,x,y,w,h){
    const col=index%5,row=Math.floor(index/5),sw=image.naturalWidth/5,sh=image.naturalHeight/3;
    ctx.drawImage(image,col*sw,row*sh,sw,sh,x,y,w,h);
  }
  function drawPlantBody(p,x,y,alpha=1){
    if(!art.plants.complete||!art.plants.naturalWidth){drawPlantBodyVector(p,x,y,alpha);return;}
    const bob=Math.sin(p.age*2.2+p.bob)*2,index=PLANT_SPRITES[p.baseId]??0;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y+bob);
    ctx.fillStyle="rgba(9,36,20,.27)";ctx.beginPath();ctx.ellipse(0,31,34,9,0,0,TAU);ctx.fill();
    if(p.hitFlash>0){ctx.filter="brightness(1.75) saturate(.75)";ctx.shadowColor="#fff";ctx.shadowBlur=16;}
    drawAtlasCell(art.plants,index,-55,-71,110,110);
    ctx.filter="none";
    drawGenes(p);
    if(p.rank>1){ctx.font="900 15px system-ui";ctx.textAlign="center";ctx.fillStyle="#ffe16b";ctx.strokeStyle="#604916";ctx.lineWidth=4;ctx.strokeText("★".repeat(p.rank),0,-55);ctx.fillText("★".repeat(p.rank),0,-55);}
    if(p.shield>0){ctx.strokeStyle="rgba(164,231,255,.85)";ctx.shadowColor="#8bddff";ctx.shadowBlur=10;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-5,45,0,TAU);ctx.stroke();}
    ctx.restore();
  }
  function drawGenes(p){for(const g of p.genes){if(g==="producer"){ctx.strokeStyle="#ffd95d";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-6,40,0,TAU);ctx.stroke();}if(g==="guard"||g==="armor"){ctx.fillStyle=g==="armor"?"#e8923b":"#b2784b";ctx.beginPath();ctx.arc(-30,-17,10,0,TAU);ctx.arc(28,-10,9,0,TAU);ctx.fill();}if(g==="frost"){ctx.fillStyle="#baf4ff";for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(-23+i*15,-43+(i%2)*8,3,0,TAU);ctx.fill();}}if(g==="burst"){ctx.fillStyle="#ef5c61";ctx.beginPath();ctx.arc(22,-40,8,0,TAU);ctx.fill();}if(g==="shooter"&&p.baseId!=="pea"){ctx.fillStyle="#70cf59";ctx.beginPath();ctx.arc(24,-22,10,0,TAU);ctx.fill();ctx.fillStyle="#173f2d";ctx.beginPath();ctx.arc(28,-22,4,0,TAU);ctx.fill();}if(g==="stun"){ctx.fillStyle="#ffe36b";ctx.fillRect(-30,-46,7,7);ctx.fillRect(24,-36,6,6);}if(g==="fire"){ctx.fillStyle="#ff704d";ctx.beginPath();ctx.moveTo(-28,-8);ctx.quadraticCurveTo(-17,-33,-9,-8);ctx.fill();}if(g==="pierce"){ctx.strokeStyle="#d8b9ff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-7,44,0,TAU);ctx.stroke();}if(g==="crit"){ctx.fillStyle="#f1fff3";ctx.fillRect(-2,-51,4,11);ctx.fillRect(-6,-47,12,4);}if(g==="weaken"){ctx.fillStyle="#ddd1aa";ctx.beginPath();ctx.arc(-30,7,7,0,TAU);ctx.fill();}if(g==="haste"){ctx.strokeStyle="#75e3d4";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-35,-25);ctx.lineTo(-48,-25);ctx.moveTo(-33,-14);ctx.lineTo(-44,-10);ctx.stroke();}if(g==="splash"){ctx.fillStyle="#75cf71";ctx.beginPath();ctx.arc(31,-34,8,0,TAU);ctx.fill();}if(g==="multishot"){ctx.fillStyle="#99df76";ctx.beginPath();ctx.arc(25,-23,6,0,TAU);ctx.arc(34,-13,5,0,TAU);ctx.fill();}if(g==="heal"){ctx.fillStyle="#ffb4d4";ctx.fillRect(-4,-50,8,20);ctx.fillRect(-10,-44,20,8);}}}
  function leaf(x,y,dir){ctx.fillStyle="#55a94c";ctx.save();ctx.translate(x,y);ctx.rotate(dir*.5);ctx.beginPath();ctx.ellipse(0,0,14,7,0,0,TAU);ctx.fill();ctx.restore();}
  function eye(x,y){ctx.fillStyle="#173228";ctx.beginPath();ctx.arc(x,y,4,0,TAU);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x-1.2,y-1.4,1.2,0,TAU);ctx.fill();}
  function smile(x,y){ctx.strokeStyle="#3e2b1c";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,8,.2,Math.PI-.2);ctx.stroke();}
  function drawPlants(){for(const p of state.plants){if(!p.alive)continue;const c=cellCenter(p.row,p.col);if(p.dragging)drawPlantBody(p,state.dragPoint.x,state.dragPoint.y,.72);else drawPlantBody(p,c.x,c.y);drawHp(p,c.x,c.y+39);}}
  function drawHp(p,x,y){if(p.hp>=p.maxHp&&p.shield<=0)return;ctx.fillStyle="rgba(0,0,0,.35)";roundRect(x-28,y,56,5,3);ctx.fill();ctx.fillStyle=p.hp/p.maxHp>.35?"#93e36f":"#ef6a5d";roundRect(x-28,y,56*Math.max(0,p.hp/p.maxHp),5,3);ctx.fill();}
  function drawZombieVector(z){ctx.save();ctx.translate(z.x,z.y);const leg=Math.sin(z.step)*6,giant=z.kind==="giant"?1.28:1;ctx.scale(giant,giant);ctx.strokeStyle="#5e735f";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-8,20);ctx.lineTo(-12+leg,42);ctx.moveTo(8,20);ctx.lineTo(12-leg,42);ctx.stroke();ctx.fillStyle="#765d4a";roundRect(-24,-9,48,42,10);ctx.fill();ctx.fillStyle=z.hit>0?"#d9fff0":"#91ad8d";ctx.beginPath();ctx.arc(0,-28,24,0,TAU);ctx.fill();ctx.fillStyle="#eef1d5";ctx.beginPath();ctx.arc(-8,-32,5,0,TAU);ctx.arc(9,-30,5,0,TAU);ctx.fill();ctx.fillStyle="#27372e";ctx.beginPath();ctx.arc(-7,-31,2,0,TAU);ctx.arc(10,-29,2,0,TAU);ctx.fill();if(z.kind==="cone"){ctx.fillStyle="#e99d3e";ctx.beginPath();ctx.moveTo(-20,-48);ctx.lineTo(0,-83);ctx.lineTo(22,-47);ctx.closePath();ctx.fill();}if(z.kind==="bucket"){ctx.fillStyle="#aeb9b7";roundRect(-23,-67,46,34,6);ctx.fill();ctx.strokeStyle="#697877";ctx.lineWidth=3;ctx.stroke();}if(z.kind==="runner"){ctx.fillStyle="#e65555";ctx.fillRect(-23,-6,46,12);}if(z.kind==="paper"){ctx.fillStyle="#ece5ce";ctx.rotate(-.08);ctx.fillRect(-31,-4,55,31);ctx.fillStyle="#7d6a54";ctx.fillRect(-22,4,35,3);ctx.fillRect(-22,12,28,3);}if(z.kind==="shield"){ctx.fillStyle="#70908e";roundRect(-36,-10,30,58,6);ctx.fill();ctx.strokeStyle="#b7d0cb";ctx.lineWidth=3;ctx.stroke();}if(z.kind==="healer"){ctx.fillStyle="#e9eee8";roundRect(-25,-62,50,18,5);ctx.fill();ctx.fillStyle="#69b86f";ctx.fillRect(-4,-60,8,14);ctx.fillRect(-9,-55,18,6);}if(z.kind==="football"){ctx.fillStyle="#a83f45";roundRect(-27,-13,54,44,9);ctx.fill();ctx.fillStyle="#dfd8c7";ctx.fillRect(-5,-12,10,43);ctx.beginPath();ctx.arc(0,-51,24,Math.PI,TAU);ctx.fill();}if(z.kind==="balloon"){ctx.strokeStyle="#dfc3e8";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,-42);ctx.lineTo(29,-89);ctx.stroke();ctx.fillStyle="#d69adf";ctx.beginPath();ctx.ellipse(30,-105,21,27,0,0,TAU);ctx.fill();}if(z.kind==="miner"){ctx.fillStyle="#d7b54a";ctx.beginPath();ctx.arc(0,-45,25,Math.PI,TAU);ctx.fill();ctx.strokeStyle="#6e5938";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-28,4);ctx.lineTo(28,-35);ctx.stroke();}if(z.kind==="dancer"){ctx.fillStyle="#9b5ba4";ctx.fillRect(-26,-5,52,11);ctx.fillStyle="#e5d4e8";ctx.beginPath();ctx.moveTo(-24,21);ctx.lineTo(0,40);ctx.lineTo(24,21);ctx.fill();}if(z.kind==="imp"){ctx.scale(.72,.72);ctx.fillStyle="#bd6b4a";ctx.beginPath();ctx.arc(0,-60,13,0,TAU);ctx.fill();}if(z.kind==="ice"){ctx.fillStyle="#a9e3ee";ctx.beginPath();ctx.moveTo(-25,-50);ctx.lineTo(-10,-72);ctx.lineTo(0,-51);ctx.lineTo(14,-75);ctx.lineTo(25,-48);ctx.fill();}if(z.kind==="giant"){ctx.fillStyle="#574f45";roundRect(-32,-15,64,18,5);ctx.fill();ctx.strokeStyle="#8a7154";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(23,-5);ctx.lineTo(45,29);ctx.stroke();}if(z.burn>0){ctx.fillStyle="#ff7a45";ctx.beginPath();ctx.moveTo(-5,-50);ctx.quadraticCurveTo(5,-72,12,-48);ctx.fill();}if(z.stun>0){ctx.strokeStyle="#ffe66e";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-60,18,0,TAU);ctx.stroke();}ctx.restore();drawEnemyHp(z);}
  function drawZombie(z){
    if(!art.zombies.complete||!art.zombies.naturalWidth){drawZombieVector(z);return;}
    const index=ZOMBIE_SPRITES[z.kind]??0;
    const scale=z.kind==="giant"?1.3:z.kind==="imp"?.78:1;
    const bob=Math.sin(z.step)*1.7,lean=z.kind==="runner"?-.07:Math.sin(z.step*.5)*.018;
    ctx.save();ctx.translate(z.x,z.y+bob);ctx.rotate(lean);ctx.scale(scale,scale);
    ctx.fillStyle="rgba(7,28,18,.28)";ctx.beginPath();ctx.ellipse(0,34,31,8,0,0,TAU);ctx.fill();
    if(z.hit>0)ctx.filter="brightness(1.75) saturate(.65)";
    drawAtlasCell(art.zombies,index,-54,-79,108,108);
    ctx.filter="none";
    if(z.burn>0){ctx.shadowColor="#ff7a45";ctx.shadowBlur=12;ctx.fillStyle="#ff7a45";ctx.beginPath();ctx.moveTo(-7,-43);ctx.quadraticCurveTo(3,-70,12,-45);ctx.quadraticCurveTo(1,-52,-7,-43);ctx.fill();}
    if(z.stun>0){ctx.strokeStyle="#ffe66e";ctx.shadowColor="#ffe66e";ctx.shadowBlur=8;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-63,19,7,0,0,TAU);ctx.stroke();}
    if(z.slow>0){ctx.strokeStyle="rgba(174,239,255,.8)";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-18,42,0,TAU);ctx.stroke();}
    ctx.restore();drawEnemyHp(z);
  }
  function drawEnemyHp(z){ctx.fillStyle="rgba(0,0,0,.35)";roundRect(z.x-24,z.y-67,48,5,3);ctx.fill();ctx.fillStyle="#e56b62";roundRect(z.x-24,z.y-67,48*Math.max(0,z.hp/z.maxHp),5,3);ctx.fill();}
  function drawZombies(){for(const z of state.zombies)if(z.alive)drawZombie(z);}
  function drawBullets(){for(const b of state.bullets){ctx.save();ctx.translate(b.x,b.y);ctx.shadowColor=b.color;ctx.shadowBlur=8;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(0,0,b.burst?10:6,0,TAU);ctx.fill();if(b.frost||b.stun){ctx.strokeStyle=b.stun?"#ffe36b":"#d7fbff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,9,0,TAU);ctx.stroke();}if(b.fire){ctx.fillStyle="#ff8b4d";ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(-20,-5);ctx.lineTo(-17,5);ctx.fill();}if(b.hitsLeft>1){ctx.strokeStyle="#d8b9ff";ctx.beginPath();ctx.arc(0,0,12,0,TAU);ctx.stroke();}ctx.restore();}}
  function drawSuns(){for(const s of state.suns){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.sin(s.phase)*.08);ctx.shadowColor="#ffe66e";ctx.shadowBlur=18;ctx.fillStyle="#ffd85a";for(let i=0;i<10;i++){ctx.rotate(TAU/10);ctx.fillRect(-2,-24,4,10);}ctx.beginPath();ctx.arc(0,0,16,0,TAU);ctx.fill();ctx.fillStyle="#7c5d18";ctx.font="900 12px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(s.value,0,1);ctx.restore();}}
  function drawParticles(){for(const p of state.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,TAU);ctx.fill();}ctx.globalAlpha=1;for(const f of state.floaters){ctx.globalAlpha=f.life/f.max;ctx.font=`900 ${16*f.scale}px system-ui`;ctx.textAlign="center";ctx.strokeStyle="rgba(8,25,18,.8)";ctx.lineWidth=4;ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;}
  function drawHUD(){
    const waveProgress=(state.battleTime%WAVE_SECONDS)/WAVE_SECONDS,totalSeconds=Math.floor(state.battleTime),minutes=Math.floor(totalSeconds/60),seconds=String(totalSeconds%60).padStart(2,"0");
    ctx.fillStyle="rgba(10,31,24,.88)";roundRect(20,18,236,96,18);ctx.fill();ctx.fillStyle="#ffe06a";ctx.font="900 30px system-ui";ctx.textAlign="left";ctx.fillText(`☀ ${Math.floor(state.sun)}`,42,58);ctx.fillStyle="#a8c0b1";ctx.font="700 12px system-ui";ctx.fillText(`阳光资源  ·  +${state.stats.sunMade}`,43,84);ctx.fillStyle="rgba(255,255,255,.09)";roundRect(43,92,188,7,4);ctx.fill();ctx.fillStyle="#90df70";roundRect(43,92,188*waveProgress,7,4);ctx.fill();
    ctx.fillStyle="rgba(10,31,24,.85)";roundRect(1000,20,254,70,16);ctx.fill();ctx.fillStyle="#dcebe0";ctx.font="800 15px system-ui";ctx.fillText(`第 ${state.wave} 波 · 休闲无限`,1024,50);ctx.fillStyle="#94ac9d";ctx.font="650 12px system-ui";ctx.fillText(`生存 ${minutes}:${seconds}  ·  ${state.fps} FPS`,1024,72);
    if(state.waveBanner>0){const names=["第一波 · 萌芽","第二波 · 快步逼近","第三波 · 报纸狂潮","第四波 · 医疗护卫","第五波 · 铁桶列队","第六波 · 球场冲锋","第七波 · 天空与地底","第八波 · 冰夜舞会","第九波 · 巨人脚步","第十波 · 万怪决战"],endlessNames=["尸潮再临","精英集结","极速突袭","重甲压境","无尽进化"];const name=names[state.wave-1]||`第 ${state.wave} 波 · ${endlessNames[(state.wave-11)%endlessNames.length]}`;ctx.globalAlpha=Math.min(1,state.waveBanner);ctx.fillStyle="rgba(10,31,24,.78)";roundRect(465,84,350,64,18);ctx.fill();ctx.textAlign="center";ctx.fillStyle="#f8e17a";ctx.font="900 25px system-ui";ctx.fillText(name,640,124);ctx.globalAlpha=1;}
  }
  function drawCards(){ctx.fillStyle="rgba(8,28,21,.96)";roundRect(28,610,1224,106,18);ctx.fill();for(let i=0;i<TYPES.length;i++){const id=TYPES[i],d=Core.PLANTS[id],row=Math.floor(i/CARDS_PER_ROW),col=i%CARDS_PER_ROW,x=CARD_X+col*CARD_STEP,y=row?665:618,sel=state.selected===id,ready=state.cooldowns[id]<=0&&state.sun>=d.cost;ctx.fillStyle=sel?"#eff5cf":ready?"#1d4935":"#173329";ctx.strokeStyle=sel?"#ffe064":"rgba(255,255,255,.12)";ctx.lineWidth=sel?3:1;roundRect(x,y,CARD_W,CARD_H,11);ctx.fill();ctx.stroke();if(art.plants.complete&&art.plants.naturalWidth){ctx.save();roundRect(x+2,y+2,36,CARD_H-4,9);ctx.clip();drawAtlasCell(art.plants,PLANT_SPRITES[id],x-2,y-4,44,48);ctx.restore();}else{ctx.fillStyle=d.color;ctx.beginPath();ctx.arc(x+19,y+21,13,0,TAU);ctx.fill();ctx.fillStyle="#173228";ctx.font="900 13px system-ui";ctx.textAlign="center";ctx.fillText(CARD_SIGILS[id]||"●",x+19,y+26);}ctx.fillStyle=sel?"#183126":"#e7f0e9";ctx.font="800 11px system-ui";ctx.textAlign="left";ctx.fillText(d.short,x+40,y+17);ctx.fillStyle=sel?"#5f5318":"#ffe177";ctx.font="800 10px system-ui";ctx.fillText(`☀${d.cost}`,x+40,y+33);if(state.cooldowns[id]>0){const ratio=state.cooldowns[id]/d.cooldown;ctx.fillStyle="rgba(5,16,12,.72)";roundRect(x,y,CARD_W,CARD_H*ratio,11);ctx.fill();ctx.fillStyle="#d9e6dd";ctx.textAlign="center";ctx.font="800 11px system-ui";ctx.fillText(state.cooldowns[id].toFixed(1),x+CARD_W/2,y+26);}}}
  function drawFusionPreview(){if(!state.dragging)return;const pt=state.dragPoint;if(state.dragTarget){const c=cellCenter(state.dragTarget.row,state.dragTarget.col);ctx.strokeStyle=state.preview?.valid?(state.preview.authored?"#ffe271":"#9cec86"):"#ef6f61";ctx.lineWidth=5;ctx.setLineDash([8,5]);ctx.beginPath();ctx.arc(c.x,c.y,48,0,TAU);ctx.stroke();ctx.setLineDash([]);const w=330,h=76,x=Math.min(920,Math.max(290,pt.x-165)),y=Math.max(54,pt.y-105);ctx.fillStyle="rgba(8,28,21,.95)";roundRect(x,y,w,h,15);ctx.fill();ctx.strokeStyle=ctx.strokeStyle;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=state.preview?.valid?"#fff1a3":"#ffb0a7";ctx.font="900 18px system-ui";ctx.textAlign="left";ctx.fillText(state.preview?.valid?state.preview.name:state.preview?.reason,x+18,y+29);ctx.fillStyle="#bcd0c3";ctx.font="650 12px system-ui";ctx.fillText(state.preview?.valid?state.preview.note:"松手将取消",x+18,y+53);}}
  function drawTutorial(){if(state.mode!=="playing"||state.battleTime>28)return;let text="";if(!state.tutorial.card)text="① 选择下方一张植物卡";else if(!state.tutorial.planted)text="② 点击草坪空格种植";else if(state.plants.length>=2&&!state.tutorial.dragged)text="③ 按住一株植物，拖到另一株上";if(text){ctx.fillStyle="rgba(8,27,20,.86)";roundRect(440,560,400,44,13);ctx.fill();ctx.fillStyle="#eef6ed";ctx.textAlign="center";ctx.font="800 15px system-ui";ctx.fillText(text,640,588);}}
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}

  let last=performance.now();
  function loop(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);

  document.getElementById("startBtn").onclick=reset;
  document.getElementById("howBtn").onclick=()=>showPanel("howPanel");
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>state.mode==="menu"?showPanel("startPanel"):hidePanels());
  document.getElementById("pauseBtn").onclick=togglePause;document.getElementById("resumeBtn").onclick=togglePause;
  document.getElementById("restartBtn").onclick=reset;document.getElementById("restartBtnPause").onclick=reset;
  document.getElementById("soundBtn").onclick=()=>{state.sound=!state.sound;document.getElementById("soundBtn").textContent=state.sound?"♫":"×";if(state.sound)initAudio();};
  function togglePause(){if(state.mode!=="playing")return;state.paused=!state.paused;if(state.paused){sfx("pause");showPanel("pausePanel");}else{sfx("resume");hidePanels();}}
  addEventListener("keydown",e=>{if(e.code==="Space"){e.preventDefault();togglePause();}if(e.code==="Escape"&&state.paused)togglePause();});
  addEventListener("blur",()=>{if(state.mode==="playing"&&!state.paused)togglePause();});

  showPanel("startPanel");

  fetch(new URL("api/status",location.href),{cache:"no-store"}).then(r=>r.ok?r.json():null).then(info=>{
    if(!info?.ok)return;
    const status=document.getElementById("runtimeStatus");
    if(status)status.textContent=`Cloudflare 动态版 · v${info.version} · ${info.colo}`;
  }).catch(()=>{});

  window.__gardenDebug={
    state, Core, reset, endGame, spawnZombie,
    setSun:n=>state.sun=n,
    advance:n=>{state.battleTime=Math.max(0,state.battleTime+n);},
    addPlant:(id,row,col)=>{const p=Core.createPlant(id,state.nextUid++,row,col);state.plants.push(p);return p;},
    fuse:(donor,host)=>commitFusion(donor,host),
    snapshot:()=>({mode:state.mode,wave:state.wave,fps:state.fps,sun:state.sun,selected:state.selected,mowers:[...state.mowers],plants:state.plants.filter(p=>p.alive).map(p=>({id:p.baseId,row:p.row,col:p.col,rank:p.rank,genes:p.genes,name:p.displayName})),zombies:state.zombies.filter(z=>z.alive).length,zombieKinds:[...new Set(state.zombies.filter(z=>z.alive).map(z=>z.kind))],zombieKindsSeen:[...state.zombieKindsSeen],stats:{...state.stats,discovered:[...state.stats.discovered]}})
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
