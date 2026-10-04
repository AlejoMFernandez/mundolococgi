/* Mundoloco CGI — hero "Reel": fondo de fotogramas con Ken Burns + índice de trabajos */
(() => {
  'use strict';
  const M = window.MUNDO, P = M.projects;
  const $ = (s) => document.querySelector(s);
  const DUR = 6000;
  const slidesEl = $('#slides'), list = $('#list'), index = document.querySelector('.index');
  const dots = $('#dots'), barNow = $('#barNow'), nowName = $('#nowName'), nowType = $('#nowType');

  const ui = M.ui(() => { render(); });

  const slides = P.map((p) => {
    const d = document.createElement('div');
    d.className = 'slide' + (p.contain ? ' contain' : '');
    d.innerHTML = `${p.contain ? `<div class="bg" style="background-image:url(img/stills/${p.still}.webp)"></div>` : ''}<img src="img/stills/${p.still}.webp" alt="" loading="lazy">`;
    slidesEl.appendChild(d);
    return d;
  });
  slides[0].querySelector('img').loading = 'eager';

  const items = P.map((p, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button"><span class="n">${String(i + 1).padStart(2, '0')}</span><b>${p.short || p.name}</b><span class="t"></span></button><span class="prog"></span>`;
    const b = li.querySelector('button');
    b.addEventListener('mouseenter', () => { go(i); pause(true); });
    b.addEventListener('mouseleave', () => pause(false));
    b.addEventListener('focus', () => { go(i); pause(true); });
    b.addEventListener('blur', () => pause(false));
    b.addEventListener('click', () => ui.open(p, b));
    list.appendChild(li);
    const dot = document.createElement('i'); dots.appendChild(dot);
    return { li, t:li.querySelector('.t'), dot };
  });
  index.style.setProperty('--dur', DUR + 'ms');

  let cur = -1, timer = null, paused = false, left = DUR, startedAt = 0;
  function go(i){
    if (i === cur) return;
    if (cur >= 0){ slides[cur].classList.remove('on'); items[cur].li.classList.remove('on'); items[cur].dot.classList.remove('on'); }
    cur = (i + P.length) % P.length;
    // reinicia la animación de la barra de progreso
    const li = items[cur].li; void li.offsetWidth;
    slides[cur].classList.add('on'); li.classList.add('on'); items[cur].dot.classList.add('on');
    const nxt = slides[(cur + 1) % P.length].querySelector('img'); nxt.loading = 'eager';
    render();
    schedule(DUR);
  }
  function render(){
    const p = P[cur < 0 ? 0 : cur];
    items.forEach((it, i) => { it.t.textContent = P[i].type[ui.lang]; });
    nowName.textContent = p.short || p.name; nowType.textContent = p.type[ui.lang];
    barNow.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(P.length).padStart(2, '0')} — ${p.name}`;
  }
  function schedule(ms){
    clearTimeout(timer); left = ms; startedAt = performance.now();
    if (!paused) timer = setTimeout(() => go(cur + 1), ms);
  }
  function pause(v){
    if (v === paused) return;
    paused = v; index.classList.toggle('paused', v);
    if (v){ clearTimeout(timer); left = Math.max(400, left - (performance.now() - startedAt)); }
    else schedule(left);
  }
  $('#nowBtn').addEventListener('click', () => ui.open(P[cur], $('#nowBtn')));

  // swipe en mobile
  let sx = null;
  const reel = $('#reel');
  reel.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive:true });
  reel.addEventListener('touchend', (e) => {
    if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
  });

  // timecode 24 fps
  const tc = $('#tc'), t0 = performance.now();
  const pad = (n) => String(n).padStart(2, '0');
  (function tick(){
    const f = Math.floor((performance.now() - t0) / (1000 / 24));
    const fr = f % 24, s = Math.floor(f / 24) % 60, m = Math.floor(f / 1440) % 60, h = Math.floor(f / 86400);
    tc.textContent = `TC ${pad(h)}:${pad(m)}:${pad(s)}:${pad(fr)}`;
    requestAnimationFrame(tick);
  })();

  // reproductor del showreel
  const player = $('#player'), video = $('#video'), missing = $('#missing');
  const src = video.querySelector('source');
  src.addEventListener('error', () => { missing.hidden = false; video.style.display = 'none'; });
  $('#playReel').addEventListener('click', () => {
    player.hidden = false; pause(true);
    video.play().catch(() => { missing.hidden = false; video.style.display = 'none'; });
    $('#playerX').focus();
  });
  function closePlayer(){ if (player.hidden) return; player.hidden = true; video.pause(); pause(false); $('#playReel').focus(); }
  $('#playerX').addEventListener('click', closePlayer);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closePlayer(); });

  // pausa si el hero no se ve
  new IntersectionObserver(([e]) => pause(!e.isIntersecting)).observe(reel);

  go(0);
})();
