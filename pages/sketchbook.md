---
layout: default
title: sketchbook
permalink: /sketchbook/
---

<!--
  SETUP (one-time, in Supabase SQL Editor):

  create table notes (
    id bigint primary key generated always as identity,
    author text default 'anonymous',
    content text not null,
    created_at timestamptz default now()
  );
  alter table notes enable row level security;
  create policy "read" on notes for select using (true);
  create policy "insert" on notes for insert to anon with check (length(content) <= 500);

  create table doodles (
    id bigint primary key generated always as identity,
    author text default 'anonymous',
    imgdata text not null,
    created_at timestamptz default now()
  );
  -- if table already exists: alter table doodles add column author text default 'anonymous';
  alter table doodles enable row level security;
  create policy "read" on doodles for select using (true);
  create policy "insert" on doodles for insert to anon with check (length(imgdata) <= 10000);
-->

<div id="sketchbook">
  <div class="sketch-form">
    <input id="sk-author" type="text" placeholder="name (optional)" maxlength="30">
    <textarea id="sk-content" placeholder="leave a note..." maxlength="500" rows="4"></textarea>
    <div class="sketch-doodle-toolbar">
      <button class="sk-color active" data-color="#000000" style="background:#000000" title="black"></button>
      <button class="sk-color" data-color="#ff0000" style="background:#ff0000" title="red"></button>
      <button class="sk-color" data-color="#00ff00" style="background:#00ff00" title="green"></button>
      <button class="sk-color" data-color="#0000ff" style="background:#0000ff" title="blue"></button>
    </div>
    <canvas id="sk-canvas" width="64" height="32"></canvas>
    <div class="sketch-form-footer">
      <span id="sk-status"></span>
      <div class="sketch-doodle-btns">
        <button onclick="skClearCanvas()">clear</button>
        <button onclick="skUndo()">undo</button>
        <button onclick="skPost()">post</button>
      </div>
    </div>
  </div>
  <div id="sk-feed"></div>
</div>

<script>
const SUPABASE_URL = 'https://ndmqbmjzpdjvfqftlllb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2_xS4urJYB5HczxgE5HzCg_c5EJymGe';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function skLoadFeed() {
  const [nr, dr] = await Promise.all([
    db.from('notes').select('*'),
    db.from('doodles').select('*')
  ]);

  if (nr.error && dr.error) {
    document.getElementById('sk-feed').innerHTML = '<p style="color:#888;font-size:13px;">could not load posts.</p>';
    return;
  }

  const items = [];
  if (nr.data) {
    nr.data.forEach(function(n) {
      items.push({ type: 'note', author: n.author, content: n.content, created_at: n.created_at });
    });
  }
  if (dr.data) {
    dr.data.forEach(function(d) {
      items.push({ type: 'doodle', author: d.author, imgdata: d.imgdata, created_at: d.created_at });
    });
  }

  items.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

  document.getElementById('sk-feed').innerHTML = items.length === 0
    ? '<p style="color:#888;font-size:13px;">nothing here yet.</p>'
    : items.map(function(item) {
        const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (item.type === 'note') {
          const author = item.author ? esc(item.author) : 'anonymous';
          return '<div class="sketch-note"><div class="sketch-note-header"><strong>' + author + '</strong><span>' + date + '</span></div><div class="sketch-note-body">' + esc(item.content) + '</div></div>';
        }
        const src = item.imgdata.startsWith('data:image/') ? item.imgdata : '';
        const dauthor = item.author ? esc(item.author) : 'anonymous';
        return '<div class="sketch-doodle"><span class="sketch-doodle-author">' + dauthor + '</span><img src="' + src + '" alt="doodle"><span class="sketch-doodle-date">' + date + '</span></div>';
      }).join('');
}

async function skPost() {
  const authorEl  = document.getElementById('sk-author');
  const contentEl = document.getElementById('sk-content');
  const status    = document.getElementById('sk-status');
  const content   = contentEl.value.trim();
  const hasText   = content.length > 0;
  const btns      = document.querySelectorAll('.sketch-doodle-btns button');

  if (!hasText && isCanvasBlank()) {
    status.textContent = 'write a note or draw something first.';
    return;
  }

  btns.forEach(function(b) { b.disabled = true; });
  status.textContent = '';

  const tasks = [];
  if (hasText) {
    let author = authorEl.value.trim();
    if (!author) author = 'anonymous';
    tasks.push(db.from('notes').insert({ author, content }));
  }
  if (!isCanvasBlank()) {
    let doodleAuthor = authorEl.value.trim();
    if (!doodleAuthor) doodleAuthor = 'anonymous';
    tasks.push(db.from('doodles').insert({ author: doodleAuthor, imgdata: canvas.toDataURL('image/png') }));
  }

  const results = await Promise.all(tasks);
  btns.forEach(function(b) { b.disabled = false; });

  const anyError = results.some(function(r) { return r.error; });
  if (anyError) {
    status.textContent = 'error — try again.';
  } else {
    authorEl.value  = '';
    contentEl.value = '';
    status.textContent = 'posted!';
    skClearCanvas();
    skLoadFeed();
  }
}

const canvas  = document.getElementById('sk-canvas');
const ctx     = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let currentColor = '#000000';
let undoStack    = [];
let doodling     = false;
let lastPos      = null;

function isCanvasBlank() {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i]   !== 240) return false;
    if (data[i+1] !== 239) return false;
    if (data[i+2] !== 235) return false;
  }
  return true;
}

function initCanvas() {
  ctx.fillStyle = '#f0efeb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = currentColor;
}
initCanvas();

const colorBtns = document.querySelectorAll('.sk-color');
colorBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    colorBtns.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentColor = btn.dataset.color;
    ctx.fillStyle = currentColor;
  });
});

function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width  / rect.width;
  const sy = canvas.height / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return {
    x: Math.floor((src.clientX - rect.left) * sx),
    y: Math.floor((src.clientY - rect.top)  * sy)
  };
}

function paintLine(x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const steps = Math.max(dx, dy, 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1);
  }
}

function saveState() {
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (undoStack.length > 20) undoStack.shift();
}

function onDrawEnd() { doodling = false; lastPos = null; }

function onDrawStart(e) {
  e.preventDefault();
  saveState();
  doodling = true;
  lastPos  = canvasPos(e);
  ctx.fillRect(lastPos.x, lastPos.y, 1, 1);
}

function onDrawMove(e) {
  e.preventDefault();
  if (!doodling) return;
  const p = canvasPos(e);
  paintLine(lastPos.x, lastPos.y, p.x, p.y);
  lastPos = p;
}

canvas.addEventListener('mousedown',  onDrawStart);
canvas.addEventListener('mousemove',  onDrawMove);
canvas.addEventListener('mouseup',    onDrawEnd);
canvas.addEventListener('mouseleave', onDrawEnd);
canvas.addEventListener('touchstart', onDrawStart, { passive: false });
canvas.addEventListener('touchmove',  onDrawMove,  { passive: false });
canvas.addEventListener('touchend',   onDrawEnd);

function skUndo() {
  if (undoStack.length === 0) return;
  ctx.putImageData(undoStack.pop(), 0, 0);
  ctx.fillStyle = currentColor;
}

document.addEventListener('keydown', function(e) {
  if (e.key !== 'z') return;
  if (!e.ctrlKey && !e.metaKey) return;
  if (document.activeElement.tagName === 'INPUT') return;
  if (document.activeElement.tagName === 'TEXTAREA') return;
  e.preventDefault();
  skUndo();
});

function skClearCanvas() {
  saveState();
  initCanvas();
}

skLoadFeed();
</script>
