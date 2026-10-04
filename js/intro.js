/* Mundoloco CGI — escena de arranque
   1) Letterbox + logo que se arma (MUND · globo · ↄOↄ⅃)
   2) La cámara "entra" al globo del logo: las letras se abren y se desenfocan,
      las estrellas hacen warp y el globo del logo se transforma en el planeta del hero
   3) El planeta se enciende desde Buenos Aires y llegan los proyectos a la órbita */
(() => {
  'use strict';
  const P = window.PLANETA, S = P.S;
  const $ = (s) => document.querySelector(s);
  const intro = $('#intro'), lpL = $('#lpLeft'), lpG = $('#lpGlobe'), lpR = $('#lpRight'), tcEl = $('#introTc');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noIntro = new URLSearchParams(location.search).has('nointro') || reduce;

  const clamp = (v) => Math.max(0, Math.min(1, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  // tamaño del logo (proporciones del original: 226 · 60 · 145 px)
  function sizeLogo(){
    const total = Math.min(innerWidth * (innerWidth < 640 ? 0.84 : 0.6), 820), k = total / 435;
    lpL.style.width = 227 * k + 'px'; lpG.style.width = 62 * k + 'px'; lpR.style.width = 146 * k + 'px';
  }

  function done(){
    P.finish();
    document.documentElement.classList.remove('intro-on');
    intro.classList.add('gone', 'open');
    setTimeout(() => intro.classList.add('hidden'), 1300);
  }

  if (noIntro){ intro.classList.add('hidden'); P.finish(); document.documentElement.classList.remove('intro-on'); return; }

  let zooming = false, zStart = 0, zDur = 2300, cardsShown = false, from = null;
  sizeLogo();
  addEventListener('resize', sizeLogo);
  S.intro = true; S.alpha = 0; S.reveal = 0; S.warp = 0.6; S.ring = 0;

  // timecode de la intro
  const t0 = performance.now(); let tcOn = true;
  const pad = (n) => String(n).padStart(2, '0');
  (function tc(){
    if (!tcOn) return;
    const f = Math.floor((performance.now() - t0) / (1000 / 24));
    tcEl.textContent = `MUNDOLOCO · ${pad(Math.floor(f / 1440))}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`;
    requestAnimationFrame(tc);
  })();

  // estrellas que frenan al principio (como si llegáramos)
  (function settle(){
    if (zooming) return;
    S.warp = Math.max(0, S.warp - 0.012);
    if (S.warp > 0) requestAnimationFrame(settle);
  })();

  const timers = [];
  timers.push(setTimeout(() => intro.classList.add('s1'), 150));
  timers.push(setTimeout(() => intro.classList.add('s2'), 1100));
  timers.push(setTimeout(() => zoom(2300), 2700));

  function zoom(dur){
    if (zooming) return;
    zooming = true; zDur = dur;
    timers.forEach(clearTimeout);
    intro.classList.add('s1', 'zoom');
    // punto de partida: el círculo del globo del logo
    const r = lpG.getBoundingClientRect();
    from = { cx:r.left + r.width * 0.5, cy:r.top + r.height * 0.48, r:r.width * 0.47 };
    S.cx = from.cx; S.cy = from.cy; S.r = from.r;
    [lpL, lpG, lpR].forEach(el => { el.style.transition = 'none'; });
    lpG.style.transformOrigin = '50% 48%';
    zStart = performance.now();
    requestAnimationFrame(step);
  }

  function step(now){
    const p = clamp((now - zStart) / zDur), e = ease(p), to = P.target();
    // cámara: el globo crece hasta el planeta del hero
    S.r = from.r * Math.pow(to.r / from.r, e);
    S.cx = lerp(from.cx, to.cx, e); S.cy = lerp(from.cy, to.cy, e);
    S.alpha = smooth(0.1, 0.45, p);
    S.reveal = smooth(0.3, 1, p);
    S.ring = smooth(0.7, 1, p);
    S.warp = Math.sin(Math.PI * clamp(p * 1.15)) * 1.1;

    // el globo del logo acompaña el zoom y se disuelve en el planeta
    const sc = S.r / from.r;
    lpG.style.transform = `translate(${(S.cx - from.cx).toFixed(1)}px,${(S.cy - from.cy).toFixed(1)}px) scale(${sc.toFixed(3)}) rotate(${(e * 40).toFixed(1)}deg)`;
    lpG.style.opacity = (1 - smooth(0.12, 0.5, p)).toFixed(3);
    lpG.style.filter = `drop-shadow(0 0 ${(24 + e * 60).toFixed(0)}px rgba(39,170,225,${(0.55 * (1 - p)).toFixed(2)}))`;

    // las letras se abren hacia los costados, como si la cámara pasara entre ellas
    const out = e * e * innerWidth * 0.7, blur = (e * 22).toFixed(1), op = (1 - smooth(0.04, 0.4, p)).toFixed(3), s2 = (1 + e * 1.6).toFixed(3);
    lpL.style.transform = `translateX(${-out}px) scale(${s2})`; lpL.style.filter = `blur(${blur}px)`; lpL.style.opacity = op;
    lpR.style.transform = `translateX(${out}px) scale(${s2})`; lpR.style.filter = `blur(${blur}px)`; lpR.style.opacity = op;

    if (p > 0.55) intro.classList.add('open');
    if (p > 0.72 && !cardsShown){ cardsShown = true; P.showCards(); }
    if (p < 1) requestAnimationFrame(step);
    else { tcOn = false; done(); }
  }

  // saltar: acelera la escena
  function skip(){
    if (!zooming) zoom(900);
    else if (zDur > 900){ const p = (performance.now() - zStart) / zDur; zDur = 900; zStart = performance.now() - p * 900; }
  }
  $('#skip').addEventListener('click', skip);
  addEventListener('wheel', skip, { passive:true, once:true });
  addEventListener('keydown', (e) => { if (['Escape', 'Enter', ' ', 'ArrowDown'].includes(e.key)) skip(); }, { once:true });
  intro.addEventListener('touchstart', skip, { passive:true, once:true });
})();
