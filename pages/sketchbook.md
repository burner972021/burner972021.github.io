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
  create policy "insert" on notes for insert with check (length(content) <= 500);
-->

<div id="sketchbook">
  <div class="sketch-form">
    <input id="sk-author" type="text" placeholder="name (optional)" maxlength="30">
    <textarea id="sk-content" placeholder="leave a note..." maxlength="500" rows="4"></textarea>
    <div class="sketch-form-footer">
      <span id="sk-status"></span>
      <button onclick="skSubmit()">post</button>
    </div>
  </div>
  <div id="sk-list"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script>
// Replace these two values with your Supabase project URL and anon key
const SUPABASE_URL  = 'https://ndmqbmjzpdjvfqftlllb.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbXFibWp6cGRqdmZxZnRsbGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNTE2NzUsImV4cCI6MjA5MjkyNzY3NX0.mHYrUy1rRcRlxx9M038fADE_U-g-dHuNaM1jmVgRVJ4';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function skLoad() {
  const { data, error } = await db.from('notes').select('*').order('created_at', { ascending: false });
  if (error) return;
  document.getElementById('sk-list').innerHTML = data.length === 0
    ? '<p style="color:#888;font-size:13px;">no notes yet.</p>'
    : data.map(n => `
        <div class="sketch-note">
          <div class="sketch-note-header">
            <strong>${esc(n.author || 'anonymous')}</strong>
            <span>${new Date(n.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
          </div>
          <div class="sketch-note-body">${esc(n.content)}</div>
        </div>`).join('');
}

async function skSubmit() {
  const author  = document.getElementById('sk-author').value.trim() || 'anonymous';
  const content = document.getElementById('sk-content').value.trim();
  const status  = document.getElementById('sk-status');
  if (!content) return;

  const btn = document.querySelector('.sketch-form button');
  btn.disabled = true;
  status.textContent = '';

  const { error } = await db.from('notes').insert({ author, content });
  btn.disabled = false;

  if (error) {
    status.textContent = 'error — try again.';
  } else {
    document.getElementById('sk-author').value  = '';
    document.getElementById('sk-content').value = '';
    status.textContent = 'posted!';
    skLoad();
  }
}

skLoad();
</script>
