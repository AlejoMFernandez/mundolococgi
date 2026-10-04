/* Mundoloco CGI — hero "Planeta" cinematográfico
   Globo de puntos + campo de estrellas 3D (con warp para la intro) + arcos desde
   Buenos Aires + proyectos orbitando. Expone window.PLANETA para que intro.js
   controle la cámara durante la escena de arranque. Canvas 2D, sin librerías. */
(() => {
  'use strict';
  const M = window.MUNDO;
  const $ = (s) => document.querySelector(s);
  const hero = $('#hero'), cvs = $('#globe'), ctx = cvs.getContext('2d');
  const cardsEl = $('#cards'), pinLabel = $('#pinLabel'), nav = $('#nav');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEG = Math.PI / 180;

  const ui = M.ui(() => cards.forEach(c => { c.cap.textContent = c.p.type[ui.lang]; }));

  /* estado controlable desde la intro */
  const S = { intro:true, cx:0, cy:0, r:0, alpha:0, reveal:0, warp:0, ring:0 };

  /* ---------- tarjetas ---------- */
  const cards = M.projects.map((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card'; b.setAttribute('aria-label', p.name);
    b.innerHTML = `<span class="in" style="animation-delay:${(i * 0.08).toFixed(2)}s"><span class="frame"><img src="img/stills/${p.still}-card.webp" alt="" draggable="false"></span><span class="cap"><b>${p.short || p.name}</b><span>${p.type.es}</span></span></span>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); if (!moved) ui.open(p, b); });
    b.addEventListener('pointerenter', () => { hover = i; b.classList.add('on'); });
    b.addEventListener('pointerleave', () => { hover = -1; b.classList.remove('on'); });
    b.addEventListener('focus', () => { hover = i; b.classList.add('on'); });
    b.addEventListener('blur', () => { hover = -1; b.classList.remove('on'); });
    cardsEl.appendChild(b);
    return { el:b, p, cap:b.querySelector('.cap span') };
  });
  let hover = -1;

  /* ---------- geografía ---------- */
  const vec = (lat, lon) => [Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lon * DEG)];
  const BA = vec(-34.6, -58.4);
  const CITIES = [[34.05,-118.24],[40.71,-74.0],[40.42,-3.7],[51.5,-0.12],[19.43,-99.13],[-23.55,-46.63],[35.68,139.69],[48.85,2.35]].map(([a, b]) => vec(a, b));

  let land = null, landAng = null;
  function buildLand(mask, mw, mh, step){
    const pts = [], ang = [];
    for (let lat = -58; lat <= 82; lat += step){
      const c = Math.cos(lat * DEG), dl = step / Math.max(c, 0.2);
      for (let lon = -180; lon < 180; lon += dl){
        const mx = Math.floor((lon + 180) / 360 * mw), my = Math.floor((90 - lat) / 180 * mh);
        if (mask[(my * mw + mx) * 4] > 127){
          const v = vec(lat, lon);
          pts.push(v[0], v[1], v[2]);
          ang.push(Math.acos(Math.max(-1, Math.min(1, v[0]*BA[0] + v[1]*BA[1] + v[2]*BA[2]))));
        }
      }
    }
    land = Float32Array.from(pts); landAng = Float32Array.from(ang);
  }
  const maskImg = new Image(); let maskData = null;
  maskImg.onload = () => {
    const c = document.createElement('canvas'); c.width = maskImg.width; c.height = maskImg.height;
    const x = c.getContext('2d'); x.drawImage(maskImg, 0, 0);
    maskData = x.getImageData(0, 0, c.width, c.height).data;
    buildLand(maskData, c.width, c.height, innerWidth < 640 ? 2.2 : 1.5);
  };
  maskImg.src = 'img/earth-mask.png';

  /* ---------- estrellas 3D ---------- */
  let stars = [];
  function buildStars(){
    const n = innerWidth < 640 ? 260 : 520;
    stars = Array.from({length:n}, () => ({ x:(Math.random() * 2 - 1), y:(Math.random() * 2 - 1), z:Math.random(), s:Math.random() }));
  }

  /* ---------- layout ---------- */
  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, RG = 200, R = 400, RY = 80, CW = 200, mobile = false;
  const VIEW_LAT = -16 * DEG, cV = Math.cos(VIEW_LAT), sV = Math.sin(VIEW_LAT);
  const RING_TILT = -7 * DEG, cR = Math.cos(RING_TILT), sR = Math.sin(RING_TILT);
  function layout(){
    W = hero.clientWidth; H = hero.clientHeight; mobile = W < 860;
    DPR = Math.min(devicePixelRatio || 1, 2);
    cvs.width = W * DPR; cvs.height = H * DPR;
    cx = W / 2; cy = H * (mobile ? 0.45 : 0.5);
    RG = mobile ? Math.min(W * 0.4, H * 0.25) : Math.min(H * 0.31, W * 0.24, 340);
    CW = mobile ? 116 : Math.round(Math.max(160, Math.min(W * 0.135, 220)));
    R = mobile ? W / 2 - 8 : Math.min(RG * 1.95, W / 2 - CW * 0.6);
    RY = R * (mobile ? 0.3 : 0.2);
    cards.forEach(c => { c.el.style.width = CW + 'px'; });
    const small = innerWidth < 640;
    if (maskData && small !== layout._small) buildLand(maskData, maskImg.width, maskImg.height, small ? 2.2 : 1.5);
    layout._small = small;
  }
  layout._small = innerWidth < 640;

  /* ---------- proyección ---------- */
  let rot = 0.95, oa = 0;
  function proj(v, out){
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const x = v[0] * cr + v[2] * sr, z0 = -v[0] * sr + v[2] * cr, y0 = v[1];
    out[0] = x; out[1] = y0 * cV - z0 * sV; out[2] = y0 * sV + z0 * cV; return out;
  }
  function slerp(a, b, t, out){
    const d = Math.acos(Math.max(-1, Math.min(1, a[0]*b[0] + a[1]*b[1] + a[2]*b[2])));
    const s = Math.sin(d) || 1, k1 = Math.sin((1 - t) * d) / s, k2 = Math.sin(t * d) / s;
    out[0] = a[0]*k1 + b[0]*k2; out[1] = a[1]*k1 + b[1]*k2; out[2] = a[2]*k1 + b[2]*k2;
    return d;
  }

  /* ---------- dibujo ---------- */
  const tmp = [0,0,0], tmp2 = [0,0,0];
  const LIGHT = (() => { const v = [-0.5, 0.45, 0.74], m = Math.hypot(...v); return v.map(c => c / m); })();
  let scrollP = 0, arcT0 = 0, mx = 0, my = 0, pmx = 0, pmy = 0;

  function drawStars(dt){
    const speed = (0.00012 + S.warp * 0.022) * dt;
    const f = Math.max(W, H) * 0.55;
    const ox = W / 2 - pmx * 20, oy = H / 2 - pmy * 14;
    ctx.lineCap = 'round';
    for (const s of stars){
      const zPrev = s.z;
      s.z -= speed;
      if (s.z <= 0.02){ s.z = 1; s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; continue; }
      const px = ox + s.x / s.z * f, py = oy + s.y / s.z * f;
      if (px < -50 || px > W + 50 || py < -50 || py > H + 50) continue;
      const a = Math.min(1, (1 - s.z) * 1.3) * (0.35 + s.s * 0.65);
      if (S.warp > 0.15){
        const zp = Math.min(1, zPrev + speed * 5);
        const qx = ox + s.x / zp * f, qy = oy + s.y / zp * f;
        ctx.strokeStyle = `rgba(190,228,255,${a.toFixed(3)})`; ctx.lineWidth = 0.6 + (1 - s.z) * 1.6;
        ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke();
      } else {
        const r = 0.35 + (1 - s.z) * 1.3;
        ctx.fillStyle = `rgba(220,238,255,${a.toFixed(3)})`;
        ctx.fillRect(px - r / 2, py - r / 2, r, r);
      }
    }
  }

  function drawRing(back, gx, gy, gr, alpha){
    if (alpha <= 0.01) return;
    const k = gr / RG;
    ctx.beginPath(); let started = false;
    for (let i = 0; i <= 120; i++){
      const a = i / 120 * Math.PI * 2, s = Math.sin(a);
      if (back ? s > 0.02 : s < -0.02){ started = false; continue; }
      const ex = R * k * Math.cos(a), ey = RY * k * s;
      const x = gx + ex * cR - ey * sR, y = gy + gr * 0.06 + ex * sR + ey * cR;
      if (!started){ ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(255,255,255,${(0.09 * alpha).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke();
  }

  function draw(t, dt){
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawStars(dt);

    const zoom = 1 + scrollP * 0.35;
    const gx = S.intro ? S.cx : cx, gy = (S.intro ? S.cy : cy) - scrollP * H * 0.08;
    const gr = (S.intro ? S.r : RG) * zoom;
    const GA = (S.intro ? S.alpha : 1) * (1 - scrollP * 0.55);
    const REV = (S.intro ? S.reveal : 1) * Math.PI * 1.02;
    const ringA = S.intro ? S.ring : 1;
    if (gr < 2 || GA <= 0.003){ return; }

    ctx.globalAlpha = GA;
    drawRing(true, gx, gy, gr, ringA);

    let g = ctx.createRadialGradient(gx, gy, gr * 0.9, gx, gy, gr * 1.5);
    g.addColorStop(0, 'rgba(39,170,225,.17)'); g.addColorStop(1, 'rgba(39,170,225,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, gr * 1.5, 0, Math.PI * 2); ctx.fill();
    g = ctx.createRadialGradient(gx - gr * 0.35, gy - gr * 0.4, gr * 0.1, gx, gy, gr);
    g.addColorStop(0, '#13283F'); g.addColorStop(0.7, '#0A1626'); g.addColorStop(1, '#060C16');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();

    // retícula
    ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1;
    const line = (fn) => { ctx.beginPath(); let on = false; fn((v) => { proj(v, tmp); if (tmp[2] < 0){ on = false; return; } const x = gx + tmp[0] * gr, y = gy - tmp[1] * gr; if (!on){ ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y); }); ctx.stroke(); };
    for (let lon = -180; lon < 180; lon += 30) line((p) => { for (let lat = -90; lat <= 90; lat += 5) p(vec(lat, lon)); });
    for (let lat = -60; lat <= 60; lat += 30) line((p) => { for (let lon = -180; lon <= 180; lon += 5) p(vec(lat, lon)); });

    // puntos de tierra (se encienden desde Buenos Aires durante la intro)
    if (land){
      const B = 7, paths = Array.from({length:B}, () => []), back = [], edge = [];
      const cr = Math.cos(rot), sr = Math.sin(rot);
      for (let i = 0, j = 0; i < land.length; i += 3, j++){
        const ang = landAng[j];
        if (ang > REV) continue;
        const vx = land[i], vy = land[i + 1], vz = land[i + 2];
        const x = vx * cr + vz * sr, z0 = -vx * sr + vz * cr;
        const y = vy * cV - z0 * sV, z = vy * sV + z0 * cV;
        const sx = gx + x * gr, sy = gy - y * gr;
        if (z < 0){ back.push(sx, sy); continue; }
        if (S.intro && REV - ang < 0.2){ edge.push(sx, sy); continue; }
        const lit = Math.max(0, x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]);
        const v = Math.min(B - 1, Math.floor((0.25 + 0.55 * Math.pow(z, 0.7) + 0.35 * lit) * (B - 1) / 1.15));
        paths[v].push(sx, sy);
      }
      const ds = (mobile ? 1.5 : 1.7) * Math.max(0.6, Math.min(1.4, gr / RG));
      ctx.fillStyle = 'rgba(140,200,235,.07)';
      ctx.beginPath(); for (let k = 0; k < back.length; k += 2) ctx.rect(back[k] - 0.6, back[k + 1] - 0.6, 1.2, 1.2); ctx.fill();
      for (let b = 0; b < B; b++){
        const a = 0.18 + b / (B - 1) * 0.82;
        ctx.fillStyle = b > B - 3 ? `rgba(220,242,255,${a})` : `rgba(110,190,235,${a})`;
        const p = paths[b]; ctx.beginPath();
        for (let k = 0; k < p.length; k += 2) ctx.rect(p[k] - ds / 2, p[k + 1] - ds / 2, ds, ds);
        ctx.fill();
      }
      if (edge.length){
        ctx.fillStyle = '#7FD8FF'; ctx.shadowColor = '#27AAE1'; ctx.shadowBlur = 8;
        ctx.beginPath(); for (let k = 0; k < edge.length; k += 2) ctx.rect(edge[k] - ds * 0.7, edge[k + 1] - ds * 0.7, ds * 1.4, ds * 1.4); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    g = ctx.createRadialGradient(gx - gr * 0.5, gy - gr * 0.45, gr * 0.2, gx, gy, gr * 1.05);
    g.addColorStop(0, 'rgba(3,5,10,0)'); g.addColorStop(0.65, 'rgba(3,5,10,.05)'); g.addColorStop(1, 'rgba(3,5,10,.6)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,240,.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.stroke();

    // arcos (después de la intro)
    if (!S.intro){
      const P = 5200, tt = t - arcT0;
      CITIES.forEach((c, ci) => {
        const ph = ((tt + ci * 900) % P) / P;
        if (tt + ci * 900 < 0) return;
        const head = Math.min(1, ph * 1.6), tail = Math.max(0, ph * 1.6 - 0.45);
        if (tail >= 1) return;
        let prev = null; ctx.lineWidth = 1.2;
        for (let s = 0; s <= 48; s++){
          const u = s / 48; if (u > head) break;
          const d = slerp(BA, c, u, tmp2);
          const h = 1 + Math.sin(Math.PI * u) * (0.08 + d * 0.12);
          proj(tmp2, tmp);
          const x = gx + tmp[0] * gr * h, y = gy - tmp[1] * gr * h;
          const vis = tmp[2] > 0 || Math.hypot(tmp[0] * h, tmp[1] * h) > 1.0;
          if (prev && vis && prev[2]){
            const a = u < tail ? 0 : Math.min(1, (u - tail) / Math.max(0.001, head - tail));
            ctx.strokeStyle = `rgba(39,170,225,${(0.15 + a * 0.75).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(x, y); ctx.stroke();
          }
          prev = [x, y, vis];
        }
        if (head >= 1 && ph * 1.6 < 1.25){
          proj(c, tmp);
          if (tmp[2] > 0){
            const k = (ph * 1.6 - 1) / 0.25;
            ctx.strokeStyle = `rgba(39,170,225,${(1 - k).toFixed(3)})`;
            ctx.beginPath(); ctx.arc(gx + tmp[0] * gr, gy - tmp[1] * gr, 2 + k * 10, 0, Math.PI * 2); ctx.stroke();
          }
        }
      });
    }

    // pin Buenos Aires
    proj(BA, tmp);
    const px = gx + tmp[0] * gr, py = gy - tmp[1] * gr;
    if (tmp[2] > 0.08 && REV > 0.05){
      const k = (t % 2200) / 2200;
      ctx.strokeStyle = `rgba(39,170,225,${(0.8 * (1 - k)).toFixed(3)})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(px, py, 4 + k * 18, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#27AAE1'; ctx.shadowColor = '#27AAE1'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(px, py, 3.6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      pinLabel.style.transform = `translate(${(px + 20).toFixed(1)}px,${(py - 9).toFixed(1)}px)`;
      pinLabel.classList.toggle('on', !S.intro && tmp[2] > 0.25 && scrollP < 0.3);
    } else pinLabel.classList.remove('on');

    drawRing(false, gx, gy, gr, ringA);
    ctx.globalAlpha = 1;
  }

  /* ---------- órbita ---------- */
  function placeCards(){
    const zoom = 1 + scrollP * 0.35, k = zoom;
    const gy = cy - scrollP * H * 0.08;
    const n = cards.length;
    cardsEl.style.opacity = (1 - scrollP * 1.4).toFixed(3);
    for (let i = 0; i < n; i++){
      const c = cards[i];
      const a = oa + i * Math.PI * 2 / n, s = Math.sin(a);
      const ex = R * k * Math.cos(a), ey = RY * k * s;
      const x = cx + ex * cR - ey * sR, y = gy + RG * k * 0.06 + ex * sR + ey * cR;
      const sc = (0.5 + 0.5 * (s + 1) / 2) * k;
      const front = s > 0;
      c.el.style.transform = `translate3d(${(x - CW / 2).toFixed(1)}px,${(y - CW * 0.28).toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
      c.el.style.zIndex = front ? 8 + Math.round(s * 4) : 3;
      c.el.style.filter = front ? '' : `brightness(${(0.35 + 0.35 * (s + 1)).toFixed(2)}) blur(${(1.2 * -s).toFixed(1)}px)`;
    }
  }

  /* ---------- interacción ---------- */
  const BASE = reduce ? 0.0004 : 0.0016;
  let vel = BASE, dragging = false, moved = false, lastX = 0, downX = 0;
  hero.addEventListener('pointerdown', (e) => {
    if (S.intro || e.target.closest('a,button:not(.card)')) return;
    dragging = true; moved = false; lastX = downX = e.clientX; hero.classList.add('dragging');
  });
  addEventListener('pointermove', (e) => {
    mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1;
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    if (Math.abs(e.clientX - downX) > 6) moved = true;
    rot += dx * 0.005; oa += dx * 0.0035; vel = dx * 0.005;
  });
  const end = () => { if (!dragging) return; dragging = false; hero.classList.remove('dragging'); setTimeout(() => { moved = false; }, 0); };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);

  function onScroll(){
    scrollP = Math.max(0, Math.min(1, scrollY / (H || 1)));
    nav.classList.toggle('show', !S.intro && scrollY > 60);
  }
  addEventListener('scroll', onScroll, { passive:true });

  /* ---------- loop ---------- */
  let running = true, visible = true, last = 0;
  function frame(t){
    if (!running) return;
    const dt = last ? Math.min(50, t - last) / 16.67 : 1; last = t;
    if (!dragging){
      const target = hover >= 0 ? BASE * 0.2 : BASE;
      vel += (target - vel) * 0.04;
      rot += vel * dt;
      oa += (hover >= 0 ? vel * 0.1 : vel * 0.9 + 0.0006) * dt;
    }
    pmx += (mx - pmx) * 0.04; pmy += (my - pmy) * 0.04;
    draw(t, dt);
    placeCards();
    requestAnimationFrame(frame);
  }
  function setRunning(v){ const was = running; running = v; if (v && !was){ last = 0; requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(visible && !document.hidden); }).observe(hero);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));
  addEventListener('resize', () => { clearTimeout(layout._t); layout._t = setTimeout(layout, 120); });

  layout(); buildStars(); onScroll();
  requestAnimationFrame(frame);

  /* ---------- API para la intro ---------- */
  window.PLANETA = {
    S,
    target: () => ({ cx, cy, r:RG }),
    showCards(){ cardsEl.classList.add('on'); },
    finish(){
      S.intro = false; S.warp = 0; arcT0 = performance.now() + 300;
      cardsEl.classList.add('on');
      hero.classList.add('ready');
      onScroll();
    }
  };
})();
