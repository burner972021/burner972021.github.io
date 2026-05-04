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
    imgdata text not null,
    created_at timestamptz default now()
  );
  alter table doodles enable row level security;
  create policy "read" on doodles for select using (true);
  create policy "insert" on doodles for insert to anon with check (length(imgdata) <= 10000);
-->

<div id="sketchbook">
  <div class="sketch-form">
    <input id="sk-author" type="text" placeholder="name (optional)" maxlength="30">
    <textarea id="sk-content" placeholder="leave a note..." maxlength="500" rows="4"></textarea>
    <div class="sketch-form-footer sketch-notes-footer">
      <span id="sk-status"></span>
      <button onclick="skSubmit()">post note</button>
    </div>
    <div class="sketch-doodle-toolbar">
      <button class="sk-color active" data-color="#000000" style="background:#000000" title="black"></button>
      <button class="sk-color" data-color="#ff0000" style="background:#ff0000" title="red"></button>
      <button class="sk-color" data-color="#00ff00" style="background:#00ff00" title="green"></button>
      <button class="sk-color" data-color="#0000ff" style="background:#0000ff" title="blue"></button>
    </div>
    <canvas id="sk-canvas" width="64" height="32"></canvas>
    <div class="sketch-form-footer">
      <span id="sk-doodle-status"></span>
      <div class="sketch-doodle-btns">
        <button onclick="skClearCanvas()">clear</button>
        <button onclick="skUndo()">undo</button>
        <button onclick="skSubmitDoodle()">post doodle</button>
      </div>
    </div>
  </div>

  <div id="sk-list"></div>
  <div id="sk-doodle-list"></div>
</div>

<script>
const SUPABASE_URL = 'https://ndmqbmjzpdjvfqftlllb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2_xS4urJYB5HczxgE5HzCg_c5EJymGe';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function skLoad() {
  const { data, error } = await db.from('notes').select('*').order('created_at', { ascending: false });
  if (error) {
    document.getElementById('sk-list').innerHTML = '<p style="color:#888;font-size:13px;">could not load notes.</p>';
    return;
  }
  document.getElementById('sk-list').innerHTML = data.length === 0
    ? '<p style="color:#888;font-size:13px;">no notes yet.</p>'
    : data.map(function(n) {
        const author = n.author ? esc(n.author) : 'anonymous';
        const date = new Date(n.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        return '<div class="sketch-note"><div class="sketch-note-header"><strong>' + author + '</strong><span>' + date + '</span></div><div class="sketch-note-body">' + esc(n.content) + '</div></div>';
      }).join('');
}

async function skSubmit() {
  const authorEl  = document.getElementById('sk-author');
  const contentEl = document.getElementById('sk-content');
  const status    = document.getElementById('sk-status');
  let author = authorEl.value.trim();
  if (!author) author = 'anonymous';
  const content = contentEl.value.trim();
  if (!content) return;

  const btn = document.querySelector('.sketch-notes-footer button');
  btn.disabled = true;
  status.textContent = '';

  const { error } = await db.from('notes').insert({ author, content });
  btn.disabled = false;

  if (error) {
    status.textContent = 'error — try again.';
  } else {
    authorEl.value  = '';
    contentEl.value = '';
    status.textContent = 'posted!';
    skLoad();
  }
}

const canvas  = document.getElementById('sk-canvas');
const ctx     = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let currentColor = '#000000';
let undoStack    = [];
let doodling     = false;
let lastPos      = null;

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

async function skSubmitDoodle() {
  const imgdata = canvas.toDataURL('image/png');
  const status  = document.getElementById('sk-doodle-status');
  const btns    = document.querySelectorAll('.sketch-doodle-btns button');
  btns.forEach(function(b) { b.disabled = true; });

  const { error } = await db.from('doodles').insert({ imgdata });
  btns.forEach(function(b) { b.disabled = false; });

  if (error) {
    status.textContent = 'error — try again.';
  } else {
    status.textContent = 'posted!';
    skClearCanvas();
    skLoadDoodles();
  }
}

async function skLoadDoodles() {
  const { data: rows, error } = await db.from('doodles').select('*').order('created_at', { ascending: false });
  if (error) {
    document.getElementById('sk-doodle-list').innerHTML = '<p style="color:#888;font-size:13px;">could not load doodles.</p>';
    return;
  }
  document.getElementById('sk-doodle-list').innerHTML = rows.length === 0
    ? '<p style="color:#888;font-size:13px;">no doodles yet.</p>'
    : rows.map(function(d) {
        const src = d.imgdata.startsWith('data:image/') ? d.imgdata : '';
        return '<div class="sketch-doodle"><img src="' + src + '" alt="doodle"></div>';
      }).join('');
}

Promise.all([skLoad(), skLoadDoodles()]);
</script>
