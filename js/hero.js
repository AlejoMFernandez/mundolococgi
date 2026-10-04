/* Mundoloco CGI — hero "Planeta Loco"
   Planeta toon renderizado en canvas (proyección ortográfica de una textura
   equirectangular) + personajes orbitando en 3D. Sin librerías. */
(() => {
  'use strict';

  /* ---------------- datos ---------------- */
  const PROJECTS = [
    { id:'metegol', name:'Metegol', face:'metegol', img:'metegol-key', accent:'#F2C230',
      type:{es:'Película', en:'Feature film'},
      desc:{es:'La película animada más grande hecha en Latinoamérica, dirigida por Juan José Campanella.',
            en:'The largest animated feature ever made in Latin America, directed by Juan José Campanella.'} },
    { id:'mafalda', name:'Mafalda', face:'mafalda', img:'mafalda', accent:'#D7261E',
      type:{es:'Serie · Netflix', en:'Series · Netflix'},
      desc:{es:'La serie animada basada en las tiras icónicas de Quino, dirigida por Juan José Campanella para Netflix.',
            en:'The animated series based on Quino’s iconic comic strips, directed by Juan José Campanella for Netflix.'} },
    { id:'underdogs', name:'Underdogs United', face:'under', img:'under-key', accent:'#C8323A',
      type:{es:'Serie', en:'TV series'},
      desc:{es:'La serie con los personajes de la película Metegol / Underdogs.',
            en:'TV series based on the characters of the Underdogs feature film.'} },
    { id:'mbpr', name:'Mini Beat Power Rockers', face:'mbpr', img:'mbpr-key', accent:'#FF4FA3',
      type:{es:'Serie · Discovery Kids', en:'Series · Discovery Kids'},
      desc:{es:'Serie nominada al Emmy Internacional, emitida por Discovery Kids.',
            en:'International Emmy-nominated series aired on Discovery Kids.'} },
    { id:'india', name:'Escape to India', face:'india', img:'india-key', accent:'#A99BD6',
      type:{es:'Película', en:'Feature film'},
      desc:{es:'Película animada. [Sinopsis a confirmar con el estudio]',
            en:'Animated feature. [Synopsis to be confirmed]'} },
    { id:'ian', name:'Ian', face:'ian', img:'ian-key', accent:'#E46F2E',
      type:{es:'Cortometraje', en:'Short film'},
      desc:{es:'Cortometraje desarrollado y producido para la Fundación Ian.',
            en:'Short film developed and produced for Ian’s Foundation.'} },
    { id:'floribella', name:'Floribella', face:'flor', img:'flor-key', accent:'#A6D23F',
      type:{es:'Serie animada', en:'Animated series'},
      desc:{es:'Serie animada basada en el éxito mundial “Floricienta”.',
            en:'Animated series based on the worldwide hit “Floricienta”.'} },
    { id:'triviatopia', name:'Triviatopia', face:'trivia', img:'trivia-key', accent:'#7D3CC8',
      type:{es:'Serie', en:'TV series'},
      desc:{es:'Serie basada en la app Preguntados (Trivia Crack).',
            en:'TV series based on the mobile game Trivia Crack.'} },
    { id:'gloria', name:'Gloria', face:'gloria', img:'gloria-key', accent:'#3CC0C0',
      type:{es:'Serie', en:'Series'},
      desc:{es:'Gloria Wants to Know It All: canciones originales supervisadas por Marc Anthony, productor ejecutivo musical.',
            en:'Gloria Wants to Know It All: original songs supervised by Marc Anthony, Music Executive Producer.'} },
    { id:'bubba', name:'Bubba & Friends', face:'bubba', img:'bubba-6', accent:'#C2412F',
      type:{es:'Serie', en:'Series'},
      desc:{es:'Serie. [Descripción a confirmar con el estudio]',
            en:'Series. [Description to be confirmed]'} },
  ];

  const I18N = {
    es:{ nav1:'Proyectos', nav2:'Estudio', nav3:'Equipo', nav4:'Prensa', nav5:'Contacto',
         h1a:'Ideas animadas que dan la vuelta al', h1b:'mundo',
         hint:'arrastrá el planeta · tocá un personaje', see:'Ver proyecto',
         next:'Acá sigue el resto del sitio (proyectos, estudio, equipo…). Este demo es solo el hero.',
         credit:'Sitio desarrollado por', menuOpen:'Abrir menú', menuClose:'Cerrar menú', close:'Cerrar' },
    en:{ nav1:'Work', nav2:'Studio', nav3:'Team', nav4:'Press', nav5:'Contact',
         h1a:'Animated ideas that travel around the', h1b:'world',
         hint:'drag the planet · tap a character', see:'See project',
         next:'The rest of the site goes here (work, studio, team…). This demo is just the hero.',
         credit:'Website by', menuOpen:'Open menu', menuClose:'Close menu', close:'Close' }
  };

  /* ---------------- elementos ---------------- */
  const $ = (s) => document.querySelector(s);
  const hero = $('#hero'), stage = $('#stage'), wrap = $('#planetWrap');
  const cvs = $('#planet'), ctx = cvs.getContext('2d');
  const starsCvs = $('#stars'), sctx = starsCvs.getContext('2d');
  const orbitersEl = $('#orbiters'), tip = $('#tip');
  const ringBack = $('#ringBack'), ringFront = $('#ringFront');
  const nebulas = [...document.querySelectorAll('.nebula')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let lang = 'es';

  /* ---------------- idioma ---------------- */
  function setLang(l){
    lang = l;
    document.documentElement.lang = l;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n; if (I18N[l][k]) el.textContent = I18N[l][k];
    });
    document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === l));
    $('#burger').setAttribute('aria-label', document.body.classList.contains('menu-open') ? I18N[l].menuClose : I18N[l].menuOpen);
    $('#modalX').setAttribute('aria-label', I18N[l].close);
    if (current) fillModal(current);
  }
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  /* ---------------- menú ---------------- */
  const burger = $('#burger'), menu = $('#menu');
  function toggleMenu(force){
    const open = force ?? !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? I18N[lang].menuClose : I18N[lang].menuOpen);
    menu.setAttribute('aria-hidden', !open);
  }
  burger.addEventListener('click', () => toggleMenu());
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  /* ---------------- orbitadores ---------------- */
  const orbs = PROJECTS.map((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'orb'; b.setAttribute('aria-label', p.name);
    b.innerHTML = `<span class="face" style="animation-delay:${0.6 + i * 0.08}s"><img src="img/faces/${p.face}.webp" alt="" draggable="false"></span>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); if (!dragMoved) openModal(p, b); });
    b.addEventListener('pointerenter', () => setHover(i));
    b.addEventListener('pointerleave', () => setHover(-1));
    b.addEventListener('focus', () => setHover(i));
    b.addEventListener('blur', () => setHover(-1));
    orbitersEl.appendChild(b);
    return { el:b, p, x:0, y:0, sc:1 };
  });
  let hover = -1;
  function setHover(i){
    hover = i;
    if (i < 0){ tip.classList.remove('on'); return; }
    const p = PROJECTS[i];
    tip.innerHTML = `<small>${p.type[lang]}</small>${p.name}`;
    tip.classList.add('on');
  }

  /* ---------------- texturas ---------------- */
  const TW = 1024, TH = 512, MASK = TW - 1;
  let tex = null, clouds = null;
  function loadTex(src){
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas'); c.width = TW; c.height = TH;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0, TW, TH);
        res(x.getImageData(0, 0, TW, TH).data);
      };
      im.onerror = rej; im.src = src;
    });
  }

  /* ---------------- layout + precálculo esfera ---------------- */
  let D = 400, N = 400, R = 360, RY = 100, ICON = 80, img = null;
  let IDX, U, V, S, A, RIM;
  const TILT = 0.38;            // inclinación del eje del planeta
  const RING_TILT = -0.16;      // inclinación de la órbita en pantalla
  const L = norm([-0.55, 0.55, 0.63]);
  function norm(v){ const m = Math.hypot(...v); return v.map(c => c / m); }

  function layout(){
    const vw = innerWidth, vh = hero.clientHeight;
    const mobile = vw < 640;
    D = Math.round(mobile ? Math.min(vw * 0.68, vh * 0.4) : Math.min(vh * 0.55, vw * 0.42, 600));
    wrap.style.width = wrap.style.height = D + 'px';
    N = Math.min(Math.round(D * Math.min(devicePixelRatio || 1, 1.5)), 640);
    cvs.width = cvs.height = N;
    img = ctx.createImageData(N, N);
    precompute();

    ICON = Math.round(Math.max(48, Math.min(D * 0.2, 96)));
    R = Math.min(D * 0.95, vw / 2 - ICON * 0.6 - 8);
    RY = R * (mobile ? 0.34 : 0.28);
    orbs.forEach(o => { o.el.style.width = o.el.style.height = ICON + 'px'; });
    drawRings();
    drawStars();
    if (tex) renderPlanet();
  }

  function precompute(){
    const idx = [], u = [], v = [], s = [], a = [], rim = [];
    const ct = Math.cos(TILT), st = Math.sin(TILT);
    for (let py = 0; py < N; py++){
      const ny = (py + 0.5) / N * 2 - 1;
      for (let px = 0; px < N; px++){
        const nx = (px + 0.5) / N * 2 - 1;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const nz = Math.sqrt(1 - r2);
        const y = -ny;
        const y2 = y * ct - nz * st, z2 = y * st + nz * ct;
        const lat = Math.asin(Math.max(-1, Math.min(1, y2)));
        const lon = Math.atan2(nx, z2);
        idx.push(py * N + px);
        u.push((lon / (2 * Math.PI) + 0.5) * TW);
        v.push(Math.min(TH - 1, Math.max(0, Math.floor((0.5 - lat / Math.PI) * TH))) * TW);
        // sombreado toon (3 escalones + suavizado mínimo en el terminador)
        const d = nx * L[0] + y * L[1] + nz * L[2];
        let sh = d > 0.5 ? 1.06 : d > 0.12 ? 0.94 : d > -0.22 ? 0.76 : 0.58;
        s.push(sh);
        rim.push(nz < 0.28 && d > -0.15 ? (0.28 - nz) / 0.28 : 0);
        a.push(Math.max(0, Math.min(1, (1 - Math.sqrt(r2)) * N / 2)));
      }
    }
    IDX = Int32Array.from(idx); U = Float32Array.from(u); V = Int32Array.from(v);
    S = Float32Array.from(s); A = Float32Array.from(a); RIM = Float32Array.from(rim);
  }

  let rot = 0, crot = 0;
  function renderPlanet(){
    const out = img.data;
    const off = ((rot / (2 * Math.PI)) * TW % TW + TW) % TW;
    const coff = ((crot / (2 * Math.PI)) * TW % TW + TW) % TW;
    for (let k = 0, n = IDX.length; k < n; k++){
      const row = V[k];
      const tp = (row + (((U[k] + off) | 0) & MASK)) << 2;
      const cp = (row + (((U[k] + coff) | 0) & MASK)) << 2;
      const ca = clouds[cp + 3] / 255;
      const sh = S[k], rm = RIM[k];
      let r = tex[tp] + (255 - tex[tp]) * ca;
      let g = tex[tp + 1] + (255 - tex[tp + 1]) * ca;
      let b = tex[tp + 2] + (255 - tex[tp + 2]) * ca;
      r = r * sh + rm * 70; g = g * sh + rm * 150; b = b * sh + rm * 190;
      const o = IDX[k] << 2;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = A[k] * 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ---------------- anillo ---------------- */
  function drawRings(){
    const deg = RING_TILT * 180 / Math.PI;
    const W = R + 60, Hh = RY + 60;
    const half = (front) => `
      <defs><clipPath id="clip${front ? 'F' : 'B'}"><rect x="${-W}" y="${front ? 0 : -Hh}" width="${W * 2}" height="${Hh}"/></clipPath></defs>
      <g transform="rotate(${deg})"><ellipse cx="0" cy="0" rx="${R}" ry="${RY}" clip-path="url(#clip${front ? 'F' : 'B'})"/></g>`;
    ringBack.innerHTML = half(false);
    ringFront.innerHTML = half(true);
  }

  /* ---------------- estrellas ---------------- */
  function drawStars(){
    const w = starsCvs.clientWidth, h = starsCvs.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    starsCvs.width = w * dpr; starsCvs.height = h * dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const n = Math.round(w * h / 3800);
    for (let i = 0; i < n; i++){
      const x = rnd() * w, y = rnd() * h, r = rnd() < 0.92 ? rnd() * 1.1 + 0.3 : rnd() * 1.6 + 1.2;
      sctx.globalAlpha = 0.25 + rnd() * 0.7;
      sctx.fillStyle = rnd() < 0.12 ? '#9fe0ff' : '#ffffff';
      sctx.beginPath(); sctx.arc(x, y, r, 0, Math.PI * 2); sctx.fill();
    }
    sctx.globalAlpha = 1;
  }
  // destellos con la estrella de la marca
  (function sparkles(){
    const spots = [[8,22,18,'#FFC83D'],[88,18,14,'#fff'],[14,70,12,'#27AAE1'],[80,64,20,'#FFC83D'],[30,12,10,'#fff'],[66,10,12,'#27AAE1'],[94,44,10,'#fff'],[4,46,10,'#fff'],[58,84,10,'#FFC83D'],[40,80,8,'#fff']];
    spots.forEach(([x, y, s, c], i) => {
      const d = document.createElement('div');
      d.className = 'sparkle';
      d.style.cssText = `left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:${i * 0.37}s;animation-duration:${2.4 + (i % 4) * 0.7}s`;
      d.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z" fill="${c}"/></svg>`;
      hero.insertBefore(d, stage);
    });
  })();

  /* ---------------- interacción: arrastre + inercia ---------------- */
  const BASE = reduce ? 0.0006 : 0.0032;   // rad/frame planeta
  let vel = BASE, oa = 0, dragging = false, dragMoved = false, lastX = 0, downX = 0, downY = 0;
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a,button:not(.orb)')) return;
    dragging = true; dragMoved = false; lastX = downX = e.clientX; downY = e.clientY;
    stage.classList.add('dragging');
  });
  addEventListener('pointermove', (e) => {
    mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1;
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    if (Math.abs(e.clientX - downX) > 6) dragMoved = true;
    rot += dx * 0.008; oa += dx * 0.005; vel = dx * 0.008;
  });
  addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false; stage.classList.remove('dragging');
    if (!dragMoved && !e.target.closest('.orb')){
      const r = wrap.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) < r.width / 2) boing();
    }
    setTimeout(() => { dragMoved = false; }, 0);
  });
  addEventListener('pointercancel', () => { dragging = false; stage.classList.remove('dragging'); });

  wrap.addEventListener('animationend', (e) => {
    if (e.animationName === 'planetIn') wrap.classList.add('ready');
    if (e.animationName === 'boing') wrap.classList.remove('boing');
  });
  function boing(){
    if (!wrap.classList.contains('ready')) return;
    wrap.classList.remove('boing'); void wrap.offsetWidth; wrap.classList.add('boing');
    vel += 0.06; // giro extra, como un trompo
  }

  /* ---------------- loop ---------------- */
  let mx = 0, my = 0, pmx = 0, pmy = 0, running = true, visible = true;
  function frame(){
    if (!running) return;
    if (!dragging){
      const target = hover >= 0 ? BASE * 0.25 : BASE;
      vel += (target - vel) * 0.035;
      rot += vel;
      oa += hover >= 0 ? vel * 0.15 : vel * 0.55 + 0.0008;
    }
    crot = rot * 1.18 + performance.now() * 0.00002;
    if (tex) renderPlanet();

    // órbita
    const ct = Math.cos(RING_TILT), st = Math.sin(RING_TILT), n = orbs.length;
    for (let i = 0; i < n; i++){
      const o = orbs[i];
      const a = oa + i * Math.PI * 2 / n;
      const s = Math.sin(a);
      const ex = R * Math.cos(a), ey = RY * s;
      const x = ex * ct - ey * st, y = ex * st + ey * ct;
      const sc = 0.62 + 0.38 * (s + 1) / 2;
      const front = s > -0.05;
      o.el.style.transform = `translate3d(${(x - ICON / 2).toFixed(1)}px,${(y - ICON / 2).toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
      o.el.style.zIndex = front ? 9 : 3;
      o.el.style.filter = front ? '' : `brightness(${(0.55 + 0.3 * (s + 1)).toFixed(2)}) saturate(.7)`;
      o.x = x; o.y = y; o.sc = sc;
    }
    if (hover >= 0){
      const o = orbs[hover];
      tip.style.left = o.x + 'px';
      tip.style.top = (o.y - ICON * o.sc / 2 - 10) + 'px';
    }

    // parallax suave
    pmx += (mx - pmx) * 0.05; pmy += (my - pmy) * 0.05;
    starsCvs.style.transform = `translate3d(${-pmx * 14}px,${-pmy * 14}px,0)`;
    nebulas.forEach((el, i) => { const f = (i + 1) * 12; el.style.transform = `translate3d(${pmx * f}px,${pmy * f}px,0)`; });
    stage.style.transform = `translate3d(${pmx * 10}px,${pmy * 8}px,0)`;

    requestAnimationFrame(frame);
  }
  function setRunning(v){
    const was = running; running = v;
    if (v && !was) requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(visible && !document.hidden); }).observe(hero);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));

  /* ---------------- modal ---------------- */
  const modal = $('#modal'), card = modal.querySelector('.modal-card');
  let current = null, lastFocus = null;
  function fillModal(p){
    $('#mImg').src = `img/projects/${p.img}.webp`;
    $('#mImg').alt = p.name;
    $('#mFace').src = `img/faces/${p.face}.webp`;
    $('#mType').textContent = p.type[lang];
    $('#mTitle').textContent = p.name;
    $('#mDesc').textContent = p.desc[lang];
    card.style.setProperty('--accent', p.accent);
  }
  function openModal(p, from){
    current = p; lastFocus = from || document.activeElement;
    fillModal(p);
    modal.hidden = false;
    $('#modalX').focus();
  }
  function closeModal(){
    if (modal.hidden) return;
    modal.hidden = true; current = null;
    if (lastFocus) lastFocus.focus();
  }
  $('#modalX').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){ closeModal(); toggleMenu(false); }
  });

  /* ---------------- arranque ---------------- */
  addEventListener('resize', () => { clearTimeout(layout._t); layout._t = setTimeout(layout, 120); });
  layout();
  Promise.all([loadTex('img/planet-tex.png'), loadTex('img/clouds-tex.png')])
    .then(([t, c]) => { tex = t; clouds = c; renderPlanet(); })
    .catch(() => { cvs.style.background = 'radial-gradient(circle at 35% 30%,#8fdcf7,#27AAE1 30%,#23568D 70%,#0C2341)'; });
  requestAnimationFrame(frame);
})();
