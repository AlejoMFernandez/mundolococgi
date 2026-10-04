/* Mundoloco CGI — hero "Planeta" (versión pro)
   Globo de puntos con Buenos Aires como origen, arcos que salen hacia el mundo
   y los proyectos orbitando como fotogramas 16:9. Canvas 2D, sin librerías. */
(() => {
  'use strict';
  const M = window.MUNDO;
  const $ = (s) => document.querySelector(s);
  const hero = $('#hero'), cvs = $('#globe'), ctx = cvs.getContext('2d');
  const cardsEl = $('#cards'), pinLabel = $('#pinLabel'), counter = $('#counter');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEG = Math.PI / 180;

  const ui = M.ui(() => updateCounter(true));

  /* ---------- tarjetas ---------- */
  const cards = M.projects.map((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card'; b.setAttribute('aria-label', p.name);
    b.style.animationDelay = (0.9 + i * 0.07) + 's';
    b.innerHTML = `<span class="frame"><img src="img/stills/${p.still}-card.webp" alt="" draggable="false"></span><span class="cap"><b>${p.short || p.name}</b><span>${p.type.es}</span></span>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); if (!moved) ui.open(p, b); });
    b.addEventListener('pointerenter', () => { hover = i; b.classList.add('on'); });
    b.addEventListener('pointerleave', () => { hover = -1; b.classList.remove('on'); });
    b.addEventListener('focus', () => { hover = i; b.classList.add('on'); });
    b.addEventListener('blur', () => { hover = -1; b.classList.remove('on'); });
    cardsEl.appendChild(b);
    return { el:b, p, cap:b.querySelector('.cap span') };
  });
  let hover = -1;

  /* ---------- puntos de tierra ---------- */
  let land = null; // Float32Array [x,y,z, ...]
  function buildLand(mask, mw, mh, step){
    const pts = [];
    for (let lat = -58; lat <= 82; lat += step){
      const c = Math.cos(lat * DEG), dl = step / Math.max(c, 0.2);
      for (let lon = -180; lon < 180; lon += dl){
        const mx = Math.floor((lon + 180) / 360 * mw), my = Math.floor((90 - lat) / 180 * mh);
        if (mask[(my * mw + mx) * 4] > 127){
          const la = lat * DEG, lo = lon * DEG;
          pts.push(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
        }
      }
    }
    land = Float32Array.from(pts);
  }
  const maskImg = new Image();
  let maskData = null;
  maskImg.onload = () => {
    const c = document.createElement('canvas'); c.width = maskImg.width; c.height = maskImg.height;
    const x = c.getContext('2d'); x.drawImage(maskImg, 0, 0);
    maskData = x.getImageData(0, 0, c.width, c.height).data;
    buildLand(maskData, c.width, c.height, innerWidth < 640 ? 2.2 : 1.6);
  };
  maskImg.src = 'img/earth-mask.png';

  const vec = (lat, lon) => [Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lon * DEG)];
  const BA = vec(-34.6, -58.4);
  const CITIES = [[34.05,-118.24],[40.71,-74.0],[40.42,-3.7],[51.5,-0.12],[19.43,-99.13],[-23.55,-46.63],[35.68,139.69],[48.85,2.35]].map(([a, b]) => vec(a, b));

  /* ---------- layout ---------- */
  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, RG = 200, R = 400, RY = 80, CW = 200, mobile = false;
  const VIEW_LAT = -16 * DEG, cV = Math.cos(VIEW_LAT), sV = Math.sin(VIEW_LAT);
  const RING_TILT = -6 * DEG, cR = Math.cos(RING_TILT), sR = Math.sin(RING_TILT);
  function layout(){
    W = hero.clientWidth; H = hero.clientHeight; mobile = W < 860;
    DPR = Math.min(devicePixelRatio || 1, 2);
    cvs.width = W * DPR; cvs.height = H * DPR;
    cx = W / 2; cy = H * (mobile ? 0.43 : 0.44);
    RG = mobile ? Math.min(W * 0.4, H * 0.24) : Math.min(H * 0.27, W * 0.22, 300);
    CW = mobile ? 118 : Math.round(Math.max(160, Math.min(W * 0.14, 220)));
    R = mobile ? W / 2 - 10 : Math.min(RG * 2.05, W / 2 - CW * 0.62);
    RY = R * (mobile ? 0.3 : 0.2);
    cards.forEach(c => { c.el.style.width = CW + 'px'; });
    if (maskData && innerWidth < 640 !== layout._small){ layout._small = innerWidth < 640; buildLand(maskData, maskImg.width, maskImg.height, layout._small ? 2.2 : 1.6); }
  }
  layout._small = innerWidth < 640;

  /* ---------- proyección ---------- */
  let rot = 0.95, oa = 0;  // arranca mirando Sudamérica
  function proj(v, out){
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const x = v[0] * cr + v[2] * sr, z0 = -v[0] * sr + v[2] * cr, y0 = v[1];
    const y = y0 * cV - z0 * sV, z = y0 * sV + z0 * cV;
    out[0] = x; out[1] = y; out[2] = z; return out;
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
  function drawRing(back){
    ctx.beginPath();
    const steps = 120;
    let started = false;
    for (let i = 0; i <= steps; i++){
      const a = i / steps * Math.PI * 2, s = Math.sin(a);
      if (back ? s > 0.02 : s < -0.02){ started = false; continue; }
      const ex = R * Math.cos(a), ey = RY * s;
      const x = cx + ex * cR - ey * sR, y = cy + RG * 0.06 + ex * sR + ey * cR;
      if (!started){ ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1; ctx.stroke();
  }

  function draw(t){
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    drawRing(true);

    // halo
    let g = ctx.createRadialGradient(cx, cy, RG * 0.9, cx, cy, RG * 1.45);
    g.addColorStop(0, 'rgba(39,170,225,.16)'); g.addColorStop(1, 'rgba(39,170,225,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, RG * 1.45, 0, Math.PI * 2); ctx.fill();
    // océano
    g = ctx.createRadialGradient(cx - RG * 0.35, cy - RG * 0.4, RG * 0.1, cx, cy, RG);
    g.addColorStop(0, '#13283F'); g.addColorStop(0.7, '#0A1626'); g.addColorStop(1, '#060C16');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, RG, 0, Math.PI * 2); ctx.fill();

    // retícula
    ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1;
    for (let lon = -180; lon < 180; lon += 30){
      ctx.beginPath(); let on = false;
      for (let lat = -90; lat <= 90; lat += 4){
        proj(vec(lat, lon), tmp);
        if (tmp[2] < 0){ on = false; continue; }
        const x = cx + tmp[0] * RG, y = cy - tmp[1] * RG;
        if (!on){ ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30){
      ctx.beginPath(); let on = false;
      for (let lon = -180; lon <= 180; lon += 4){
        proj(vec(lat, lon), tmp);
        if (tmp[2] < 0){ on = false; continue; }
        const x = cx + tmp[0] * RG, y = cy - tmp[1] * RG;
        if (!on){ ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // puntos de tierra (agrupados por brillo)
    if (land){
      const B = 7, paths = Array.from({length:B}, () => []);
      const back = [];
      const cr = Math.cos(rot), sr = Math.sin(rot);
      for (let i = 0; i < land.length; i += 3){
        const vx = land[i], vy = land[i + 1], vz = land[i + 2];
        const x = vx * cr + vz * sr, z0 = -vx * sr + vz * cr;
        const y = vy * cV - z0 * sV, z = vy * sV + z0 * cV;
        const sx = cx + x * RG, sy = cy - y * RG;
        if (z < 0){ back.push(sx, sy); continue; }
        const lit = Math.max(0, x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]);
        const v = Math.min(B - 1, Math.floor((0.25 + 0.55 * Math.pow(z, 0.7) + 0.35 * lit) * (B - 1) / 1.15));
        paths[v].push(sx, sy);
      }
      const ds = mobile ? 1.5 : 1.7;
      ctx.fillStyle = 'rgba(140,200,235,.07)';
      ctx.beginPath(); for (let k = 0; k < back.length; k += 2) ctx.rect(back[k] - 0.6, back[k + 1] - 0.6, 1.2, 1.2); ctx.fill();
      for (let b = 0; b < B; b++){
        const a = 0.18 + b / (B - 1) * 0.82;
        ctx.fillStyle = b > B - 3 ? `rgba(220,242,255,${a})` : `rgba(110,190,235,${a})`;
        const p = paths[b]; ctx.beginPath();
        for (let k = 0; k < p.length; k += 2) ctx.rect(p[k] - ds / 2, p[k + 1] - ds / 2, ds, ds);
        ctx.fill();
      }
    }

    // terminador / sombra suave
    g = ctx.createRadialGradient(cx - RG * 0.5, cy - RG * 0.45, RG * 0.2, cx, cy, RG * 1.05);
    g.addColorStop(0, 'rgba(5,8,15,0)'); g.addColorStop(0.65, 'rgba(5,8,15,.05)'); g.addColorStop(1, 'rgba(5,8,15,.6)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, RG, 0, Math.PI * 2); ctx.fill();
    // borde
    ctx.strokeStyle = 'rgba(120,200,240,.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, RG, 0, Math.PI * 2); ctx.stroke();

    // arcos desde Buenos Aires
    const P = 5200;
    CITIES.forEach((c, ci) => {
      const ph = ((t + ci * 900) % P) / P;          // 0..1
      const head = Math.min(1, ph * 1.6), tail = Math.max(0, ph * 1.6 - 0.45);
      if (tail >= 1) return;
      const steps = 48; let prev = null;
      ctx.lineWidth = 1.2;
      for (let s = 0; s <= steps; s++){
        const u = s / steps;
        if (u > head) break;
        const d = slerp(BA, c, u, tmp2);
        const h = 1 + Math.sin(Math.PI * u) * (0.08 + d * 0.12);
        proj(tmp2, tmp);
        const x = cx + tmp[0] * RG * h, y = cy - tmp[1] * RG * h;
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
          ctx.beginPath(); ctx.arc(cx + tmp[0] * RG, cy - tmp[1] * RG, 2 + k * 10, 0, Math.PI * 2); ctx.stroke();
        }
      }
    });

    // pin Buenos Aires
    proj(BA, tmp);
    const px = cx + tmp[0] * RG, py = cy - tmp[1] * RG;
    if (tmp[2] > 0.08){
      const k = (t % 2200) / 2200;
      ctx.strokeStyle = `rgba(39,170,225,${(0.8 * (1 - k)).toFixed(3)})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(px, py, 4 + k * 18, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#27AAE1'; ctx.shadowColor = '#27AAE1'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(px, py, 3.6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      pinLabel.style.transform = `translate(${(px + 22).toFixed(1)}px,${(py - 18).toFixed(1)}px)`;
      pinLabel.classList.toggle('on', tmp[2] > 0.25 && !mobile);
    } else pinLabel.classList.remove('on');

    drawRing(false);
  }

  /* ---------- órbita de tarjetas ---------- */
  let front = -1;
  function placeCards(){
    const n = cards.length; let best = -2, bi = 0;
    for (let i = 0; i < n; i++){
      const c = cards[i];
      const a = oa + i * Math.PI * 2 / n, s = Math.sin(a);
      const ex = R * Math.cos(a), ey = RY * s;
      const x = cx + ex * cR - ey * sR, y = cy + RG * 0.06 + ex * sR + ey * cR;
      const sc = 0.5 + 0.5 * (s + 1) / 2;
      const isFront = s > 0;
      c.el.style.transform = `translate3d(${(x - CW / 2).toFixed(1)}px,${(y - CW * 0.28).toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
      c.el.style.zIndex = isFront ? 8 + Math.round(s * 4) : 3;
      c.el.style.filter = isFront ? '' : `brightness(${(0.35 + 0.35 * (s + 1)).toFixed(2)}) blur(${(1.2 * -s).toFixed(1)}px)`;
      if (s > best){ best = s; bi = i; }
    }
    if (bi !== front){ front = bi; updateCounter(); }
  }
  function updateCounter(force){
    const i = front < 0 ? 0 : front, p = M.projects[i];
    if (counter) counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(M.projects.length).padStart(2, '0')} — ${p.short || p.name}`;
    if (force) cards.forEach(c => { c.cap.textContent = c.p.type[ui.lang]; });
  }

  /* ---------- arrastre ---------- */
  const BASE = reduce ? 0.0004 : 0.0016;
  let vel = BASE, dragging = false, moved = false, lastX = 0, downX = 0;
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a,button:not(.card)')) return;
    dragging = true; moved = false; lastX = downX = e.clientX; hero.classList.add('dragging');
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    if (Math.abs(e.clientX - downX) > 6) moved = true;
    rot += dx * 0.005; oa += dx * 0.0035; vel = dx * 0.005;
  });
  const end = () => { if (!dragging) return; dragging = false; hero.classList.remove('dragging'); setTimeout(() => { moved = false; }, 0); };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);

  /* ---------- loop ---------- */
  let running = true, visible = true;
  function frame(t){
    if (!running) return;
    if (!dragging){
      const target = hover >= 0 ? BASE * 0.2 : BASE;
      vel += (target - vel) * 0.04;
      rot += vel;
      oa += hover >= 0 ? vel * 0.1 : vel * 0.9 + 0.0006;
    }
    draw(t || 0);
    placeCards();
    requestAnimationFrame(frame);
  }
  function setRunning(v){ const was = running; running = v; if (v && !was) requestAnimationFrame(frame); }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(visible && !document.hidden); }).observe(hero);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));

  addEventListener('resize', () => { clearTimeout(layout._t); layout._t = setTimeout(layout, 120); });
  layout();
  requestAnimationFrame(frame);
})();
