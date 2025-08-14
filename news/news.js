// Estado simple en memoria
let BANK = { items: [] };

export async function initNews(bankUrl = '/news/news_bank.json'){
  const res = await fetch(bankUrl, { cache: 'no-store' });
  BANK = await res.json();
}

// Decide si renderizar artículo o lista según la ruta
export async function maybeRenderArticleOrList(sel){
  const path = location.pathname.replace(/^\/+/, '');
  if (path === 'news/list') return renderList(sel);
  if (path.startsWith('news/')) return renderArticleByPath(sel);
}

// HOME: snippet aleatorio
export async function renderNewsInto(sel){
  const host = document.querySelector(sel);
  if (!host) return;
  const items = BANK.items || [];
  const snippets = items.filter(i => i.type === 'snippet');
  const pick = snippets[Math.floor(Math.random() * snippets.length)];
  if (!pick){ host.textContent = 'Sin guías.'; return; }
  host.innerHTML = `
    <section class="panel">
      <h3 style="margin:.2rem 0">${escapeHTML(pick.title)}</h3>
      <div class="news-meta">
        <span>Por ${escapeHTML(pick.author||'Ulock Press')}</span><span>•</span>
        <time>${escapeHTML(pick.date||'')}</time>
      </div>
      ${pick.subtitle ? `<p class="note" style="margin:.4rem 0 0">${escapeHTML(pick.subtitle)}</p>` : ''}
      <div style="margin-top:8px"><a class="btn" href="/news/${pick.id}">Leer guía completa</a></div>
    </section>`;
}

// /news/:id|slug → artículo
async function renderArticleByPath(sel){
  const host = document.querySelector(sel);
  const id = decodeURIComponent(location.pathname.split('/')[2] || '').trim();
  const it = (BANK.items||[]).find(i => (i.id===id || i.slug===id) && i.type==='article');
  if (!it){ host.innerHTML = `<div class="panel"><h3>Guía no encontrada</h3><p class="note">Prueba la <a class="btn" href="/news/list">lista</a>.</p></div>`; return; }
  host.innerHTML = renderArticle(it);
}

// /news/list → grilla + búsqueda + filtros
async function renderList(sel){
  const host = document.querySelector(sel);
  const items = BANK.items||[];
  const tags = Array.from(new Set(items.flatMap(i => i.tags||[]))).sort();
  host.innerHTML = `
    <section class="panel">
      <h2 style="margin:.2rem 0">Guías</h2>
      <div style="display:grid; gap:10px; grid-template-columns:1fr; margin:.6rem 0">
        <input id="q" placeholder="Buscar…" style="padding:.6rem .8rem; border-radius:10px; border:1px solid rgba(255,255,255,.15); background:rgba(0,0,0,.25); color:#fff" />
        <div style="display:flex; gap:8px; flex-wrap:wrap">
          <select id="type" style="padding:.5rem; border-radius:10px; background:rgba(0,0,0,.25); color:#fff; border:1px solid rgba(255,255,255,.15)">
            <option value="">Tipo: todos</option>
            <option value="article">Artículos</option>
            <option value="snippet">Snippets</option>
          </select>
          <select id="tag" style="padding:.5rem; border-radius:10px; background:rgba(0,0,0,.25); color:#fff; border:1px solid rgba(255,255,255,.15)">
            <option value="">Tag: todos</option>
            ${tags.map(t=>`<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="grid" class="news-grid"></div>
      <p style="margin-top:10px"><a class="btn" href="/">← Volver</a></p>
    </section>
  `;
  const q = host.querySelector('#q');
  const type = host.querySelector('#type');
  const tag = host.querySelector('#tag');
  const grid = host.querySelector('#grid');

  function apply(){
    const query = (q.value||'').toLowerCase().trim();
    const t = type.value;
    const tg = tag.value;
    let list = items.slice();
    // filtrar
    if (t) list = list.filter(i => i.type===t);
    if (tg) list = list.filter(i => (i.tags||[]).includes(tg));
    if (query) {
      list = list.filter(i => (i.title||'').toLowerCase().includes(query) ||
                              (i.subtitle||'').toLowerCase().includes(query) ||
                              (i.author||'').toLowerCase().includes(query));
    }
    // orden simple: artículos primero por fecha desc, luego snippets por fecha desc
    list.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
    // pintar (sin repetición visible: cada id/slug solo una card)
    const seen = new Set();
    grid.innerHTML = list.filter(i=>{
        const key = i.slug||i.id; if(seen.has(key)) return false; seen.add(key); return true;
      }).map(cardHTML).join('') || `<div class="note">Sin resultados.</div>`;
  }
  q.addEventListener('input', apply);
  type.addEventListener('change', apply);
  tag.addEventListener('change', apply);
  apply();
}

function cardHTML(i){
  const href = i.type==='article' ? `/news/${i.slug||i.id}` : `/news/${i.id}`;
  return `
    <article class="news-card">
      <h4>${escapeHTML(i.title)}</h4>
      <div class="news-meta">
        <span>${escapeHTML(i.author||'Ulock Press')}</span><span>•</span>
        <time>${escapeHTML(i.date||'')}</time>
      </div>
      ${i.subtitle?`<p class="note" style="margin:.4rem 0 0">${escapeHTML(i.subtitle)}</p>`:''}
      <a class="btn" href="${href}">${i.type==='article'?'Leer guía':'Abrir'}</a>
    </article>
  `;
}

function renderArticle(it){
  return `
    <article class="panel">
      <header style="margin-bottom:8px">
        <h2 style="margin:.2rem 0">${escapeHTML(it.title)}</h2>
        <div class="news-meta">
          <span>${escapeHTML(it.author||'Ulock Press')}</span><span>•</span>
          <time>${escapeHTML(it.date||'')}</time>
        </div>
      </header>
      ${renderHero(it.hero)}
      ${it.subtitle?`<p class="note">${escapeHTML(it.subtitle)}</p>`:''}
      ${(it.body||[]).map(p=>`<p class="note">${escapeHTML(p)}</p>`).join('')}
      <p style="margin-top:10px"><a class="btn" href="/news/list">← Volver a la lista</a></p>
    </article>
  `;
}

function renderHero(hero){
  if (!hero || hero.kind!=='svg') return '';
  const seed = hero.seed || Math.floor(Math.random()*999);
  return `<div class="illus"><svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g${seed}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>
    <rect width="600" height="200" fill="#0b1026"/>
    <circle cx="${80+(seed%120)}" cy="100" r="14" fill="url(#g${seed})"/>
    <path d="M60 150 C ${120+(seed%50)} 20, ${360+(seed%80)} 240, 560 60" stroke="url(#g${seed})" stroke-width="3" fill="none"/>
  </svg></div>`;
}

function escapeHTML(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
