function initPostFilter() {
  var textInput = document.getElementById('pf-text');
  if (!textInput) return;

  var clearBtn  = document.getElementById('pf-clear');
  var countEl   = document.getElementById('pf-count');
  var emptyEl   = document.getElementById('pf-empty');
  var list      = document.getElementById('post-list');
  var advPanel  = document.getElementById('pf-advanced');
  var advToggle = document.getElementById('pf-advanced-toggle');
  var active    = { cat: null, tags: [] };
  var sortBy    = 'date';

  advPanel.style.display = 'none';

  advToggle.addEventListener('click', function () {
    var isOpen = advPanel.style.display !== 'none';
    advPanel.style.display = isOpen ? 'none' : '';
    advToggle.textContent = isOpen ? 'advanced ▾' : 'advanced ▴';
    advToggle.setAttribute('aria-expanded', String(!isOpen));
    if (isOpen) {
      active = { cat: null, tags: [] };
      sortBy = 'date';
      textInput.value = '';
      document.querySelectorAll('.pf-filter').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.pf-sort').forEach(function (b) { b.classList.remove('active'); });
      document.querySelector('.pf-sort[data-sort="date"]').classList.add('active');
      run();
    }
  });

  function items() { return Array.from(list.querySelectorAll('.post-item')); }

  function applySort() {
    var arr = items();
    arr.sort(function (a, b) {
      switch (sortBy) {
        case 'date':   return parseInt(b.dataset.date) - parseInt(a.dataset.date);
        case 'cat':    return (a.dataset.catSort || '').localeCompare(b.dataset.catSort || '');
        case 'tag':    return (a.dataset.tagSort || '').localeCompare(b.dataset.tagSort || '');
        case 'rating': return parseInt(b.dataset.rating || 0) - parseInt(a.dataset.rating || 0);
      }
    });
    arr.forEach(function (el) { list.appendChild(el); });
  }

  function applyFilter() {
    var term  = textInput.value.trim().toLowerCase();
    var shown = 0;
    items().forEach(function (el) {
      var postTags = (el.dataset.tags || '').split(' ');
      var tagMatch = active.tags.length === 0 ||
        active.tags.some(function (t) { return postTags.indexOf(t) !== -1; });
      var ok =
        (!active.cat || (el.dataset.cats || '').split(' ').indexOf(active.cat) !== -1) &&
        tagMatch &&
        (!term || (el.dataset.text || '').includes(term));
      el.hidden = !ok;
      if (ok) shown++;
    });
    var total = items().length;
    countEl.textContent = shown === total ? total + ' posts' : shown + ' / ' + total;
    emptyEl.hidden = shown > 0;
  }

  function run() { applySort(); applyFilter(); }

  textInput.addEventListener('input', applyFilter);
  textInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); applyFilter(); }
  });

  document.querySelectorAll('.pf-sort').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.pf-sort').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      sortBy = this.dataset.sort;
      run();
    });
  });

  document.querySelectorAll('.pf-filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = this.dataset.group;
      var val   = this.dataset.value;
      if (group === 'cat') {
        if (active.cat === val) {
          active.cat = null;
          this.classList.remove('active');
        } else {
          document.querySelectorAll('.pf-filter[data-group="cat"]')
                  .forEach(function (b) { b.classList.remove('active'); });
          active.cat = val;
          this.classList.add('active');
        }
      } else {
        var idx = active.tags.indexOf(val);
        if (idx !== -1) {
          active.tags.splice(idx, 1);
          this.classList.remove('active');
        } else {
          active.tags.push(val);
          this.classList.add('active');
        }
      }
      applyFilter();
    });
  });

  clearBtn.addEventListener('click', function () {
    active = { cat: null, tags: [] };
    sortBy = 'date';
    textInput.value = '';
    document.querySelectorAll('.pf-filter').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.pf-sort').forEach(function (b) { b.classList.remove('active'); });
    document.querySelector('.pf-sort[data-sort="date"]').classList.add('active');
    run();
  });

  run();
}

document.addEventListener('turbo:load', initPostFilter);
