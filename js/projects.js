/* Datos compartidos de proyectos + textos ES/EN (planeta y reel) */
window.MUNDO = {
  projects: [
    { id:'metegol', name:'Metegol', still:'metegol', alt:'metegol-2',
      type:{es:'Película', en:'Feature film'},
      desc:{es:'La película animada más grande hecha en Latinoamérica, dirigida por Juan José Campanella.',
            en:'The largest animated feature ever made in Latin America, directed by Juan José Campanella.'} },
    { id:'mafalda', name:'Mafalda', still:'mafalda', alt:'mafalda', contain:true,
      type:{es:'Serie · Netflix', en:'Series · Netflix'},
      desc:{es:'La serie animada basada en las tiras icónicas de Quino, dirigida por Juan José Campanella para Netflix.',
            en:'The animated series based on Quino’s iconic comic strips, directed by Juan José Campanella for Netflix.'} },
    { id:'underdogs', name:'Underdogs United', still:'under', alt:'under-2',
      type:{es:'Serie', en:'TV series'},
      desc:{es:'Serie basada en los personajes de la película Metegol / Underdogs.',
            en:'TV series based on the characters of the Underdogs feature film.'} },
    { id:'mbpr', name:'Mini Beat Power Rockers', still:'mbpr', alt:'mbpr-2',
      type:{es:'Serie · Discovery Kids', en:'Series · Discovery Kids'},
      desc:{es:'Serie nominada al Emmy Internacional, emitida por Discovery Kids.',
            en:'International Emmy-nominated series aired on Discovery Kids.'} },
    { id:'india', name:'Escape to India', still:'india', alt:'india-2',
      type:{es:'Película', en:'Feature film'},
      desc:{es:'Película animada. [Sinopsis a confirmar]', en:'Animated feature. [Synopsis TBC]'} },
    { id:'ian', name:'Ian', still:'ian', alt:'ian-2',
      type:{es:'Cortometraje', en:'Short film'},
      desc:{es:'Cortometraje desarrollado y producido para la Fundación Ian.',
            en:'Short film developed and produced for Ian’s Foundation.'} },
    { id:'floribella', name:'Floribella', still:'flor', alt:'flor-2',
      type:{es:'Serie animada', en:'Animated series'},
      desc:{es:'Serie animada basada en el éxito mundial “Floricienta”.',
            en:'Animated series based on the worldwide hit “Floricienta”.'} },
    { id:'triviatopia', name:'Triviatopia', still:'trivia', alt:'trivia-2',
      type:{es:'Serie', en:'TV series'},
      desc:{es:'Serie basada en la app Preguntados (Trivia Crack).',
            en:'TV series based on the mobile game Trivia Crack.'} },
    { id:'gloria', name:'Gloria Wants to Know It All', short:'Gloria', still:'gloria', alt:'gloria-2',
      type:{es:'Serie', en:'Series'},
      desc:{es:'Canciones originales supervisadas por Marc Anthony, productor ejecutivo musical de la serie.',
            en:'Original songs supervised by Marc Anthony, the series’ Music Executive Producer.'} },
    { id:'bubba', name:'Bubba & Friends', still:'bubba', alt:'bubba-2',
      type:{es:'Serie', en:'Series'},
      desc:{es:'Serie. [Descripción a confirmar]', en:'Series. [Description TBC]'} },
  ],
  i18n: {
    es:{ nav1:'Trabajos', nav2:'Estudio', nav3:'Equipo', nav4:'Prensa', nav5:'Contacto',
         h1a:'Animación hecha en Buenos Aires,', h1b:'vista en todo el', h1c:'mundo.',
         side:'Creadores de Metegol y de la serie animada de Mafalda para Netflix. Películas, series y cortos animados. Trabajamos con Netflix, Disney, Discovery Kids, Cartoon Network y más.',
         reel:'Ver showreel', hint:'Arrastrá para explorar', see:'Ver proyecto',
         r1:'Películas y series animadas', r2:'que viajan por el', r3:'mundo.', rside:'Estudio de animación CGI en Buenos Aires. Creadores de Metegol y de Mafalda para Netflix.',
         full:'Ver reel completo', index:'Trabajos seleccionados', planet:'Ver versión planeta',
         next:'Acá sigue el resto del sitio (trabajos, estudio, equipo…). Este demo es solo el hero.',
         credit:'Sitio desarrollado por', menuOpen:'Abrir menú', menuClose:'Cerrar menú', close:'Cerrar' },
    en:{ nav1:'Work', nav2:'Studio', nav3:'Team', nav4:'Press', nav5:'Contact',
         h1a:'Animation made in Buenos Aires,', h1b:'seen all around the', h1c:'world.',
         side:'Creators of Underdogs and of Netflix’s animated Mafalda series. Animated features, series and shorts. We work with Netflix, Disney, Discovery Kids, Cartoon Network and more.',
         reel:'Watch showreel', hint:'Drag to explore', see:'See project',
         r1:'Animated films and series', r2:'that travel the', r3:'world.', rside:'CGI animation studio in Buenos Aires. Creators of Underdogs and Netflix’s Mafalda.',
         full:'Watch full reel', index:'Selected work', planet:'See planet version',
         next:'The rest of the site goes here (work, studio, team…). This demo is just the hero.',
         credit:'Website by', menuOpen:'Open menu', menuClose:'Close menu', close:'Close' }
  }
};

/* utilidades comunes: idioma, menú, modal */
window.MUNDO.ui = function(onLang){
  const M = window.MUNDO, $ = (s) => document.querySelector(s);
  let lang = 'es', current = null, lastFocus = null;
  const burger = $('#burger');

  function setLang(l){
    lang = l; document.documentElement.lang = l;
    document.querySelectorAll('[data-i18n]').forEach(el => { const t = M.i18n[l][el.dataset.i18n]; if (t) el.textContent = t; });
    document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === l));
    if (burger) burger.setAttribute('aria-label', document.body.classList.contains('menu-open') ? M.i18n[l].menuClose : M.i18n[l].menuOpen);
    const x = $('#modalX'); if (x) x.setAttribute('aria-label', M.i18n[l].close);
    if (current) fill(current);
    onLang && onLang(l);
  }
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  function toggleMenu(force){
    const open = force ?? !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    if (burger){ burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? M.i18n[lang].menuClose : M.i18n[lang].menuOpen); }
    const menu = $('#menu'); if (menu) menu.setAttribute('aria-hidden', !open);
  }
  if (burger) burger.addEventListener('click', () => toggleMenu());
  document.querySelectorAll('#menu ul a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  const modal = $('#modal');
  function fill(p){
    $('#mImg').src = `img/stills/${p.still}.webp`; $('#mImg').alt = p.name;
    $('#mType').textContent = p.type[lang];
    $('#mTitle').textContent = p.name;
    $('#mDesc').textContent = p.desc[lang];
  }
  function open(p, from){ current = p; lastFocus = from || document.activeElement; fill(p); modal.hidden = false; $('#modalX').focus(); }
  function close(){ if (modal.hidden) return; modal.hidden = true; current = null; if (lastFocus) lastFocus.focus(); }
  if (modal){
    $('#modalX').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape'){ close(); toggleMenu(false); } });

  return { get lang(){ return lang; }, open, close, setLang };
};
