/* =============================================================
   DUITTRACK – script.js
   Smart Daily Expense Reminder
   ============================================================= */

'use strict';

/* ===================== STATE ===================== */
let expenses = [];
let savingTargets = [];
let settings = { saldoAwal: 0, saldoSekarang: 0, pin: '', theme: 'dark' };
let currentFilter = 'semua';
let editingId = null;
let confirmCallback = null;
let weeklyChart = null;
let categoryChart = null;
let dailyChart = null;
let pinBuffer = '';

/* ===================== INIT ===================== */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  applyTheme();
  initClock();
  checkLock();
  setDefaultDate();
  initNavigation();
  initFilterBtns();
  initSeeAll();
  updateDarkModeToggle();
  refreshAll();
});

function loadData() {
  expenses = JSON.parse(localStorage.getItem('dt_expenses') || '[]');
  savingTargets = JSON.parse(localStorage.getItem('dt_targets') || '[]');
  const s = JSON.parse(localStorage.getItem('dt_settings') || '{}');
  // migrate lama: budgetHarian → saldoSekarang
  const defaultSettings = { saldoAwal: 0, saldoSekarang: 0, pin: '', theme: 'dark' };
  settings = { ...defaultSettings, ...s };
  if (s.budgetHarian && !s.saldoAwal) {
    settings.saldoAwal = s.budgetHarian;
    settings.saldoSekarang = s.budgetHarian;
    delete settings.budgetHarian;
  }
}

function saveData() {
  localStorage.setItem('dt_expenses', JSON.stringify(expenses));
  localStorage.setItem('dt_targets', JSON.stringify(savingTargets));
  localStorage.setItem('dt_settings', JSON.stringify(settings));
}

/* ===================== LOCK SCREEN ===================== */
function checkLock() {
  if (settings.pin) {
    showEl('lockScreen');
    hideEl('app');
  } else {
    hideEl('lockScreen');
    showEl('app');
  }
}

function pinInput(digit) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += digit;
  updatePinDots();
  if (pinBuffer.length === 4) setTimeout(pinSubmit, 200);
}

function pinClear() {
  pinBuffer = pinBuffer.slice(0, -1);
  updatePinDots();
}

function updatePinDots() {
  const dots = document.querySelectorAll('#pinDots span');
  dots.forEach((d, i) => d.classList.toggle('filled', i < pinBuffer.length));
}

function pinSubmit() {
  if (pinBuffer === settings.pin) {
    hideEl('lockScreen');
    showEl('app');
    pinBuffer = '';
    updatePinDots();
    hideEl('pinError');
  } else {
    showEl('pinError');
    pinBuffer = '';
    updatePinDots();
    const dots = document.querySelectorAll('#pinDots span');
    dots.forEach(d => { d.style.borderColor = 'var(--danger)'; setTimeout(() => d.style.borderColor = '', 500); });
  }
}

/* ===================== NAVIGATION ===================== */
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
      closeSidebar();
    });
  });

  document.getElementById('fabBtn').addEventListener('click', () => navigateTo('tambah'));
  document.getElementById('menuBtn').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  const titles = { dashboard: 'Dashboard', tambah: 'Tambah Pengeluaran', riwayat: 'Riwayat', statistik: 'Statistik', target: 'Target Keuangan', pengaturan: 'Pengaturan' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  if (page === 'statistik') setTimeout(renderCharts, 100);
  if (page === 'riwayat') renderRiwayat();
  if (page === 'target') renderTargets();
  if (page === 'dashboard') renderDashboard();
}

function openSidebar() { document.getElementById('sidebar').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }

function initSeeAll() {
  document.querySelectorAll('[data-page="riwayat"]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigateTo('riwayat'); });
  });
}

/* ===================== CLOCK ===================== */
function initClock() {
  function tick() {
    const now = new Date();
    const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('realtimeClock').textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} · ${time}`;
    document.getElementById('todayDate').textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ===================== THEME ===================== */
function applyTheme() {
  const theme = settings.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  updateDarkModeToggle();
  saveData();
  if (weeklyChart || categoryChart || dailyChart) setTimeout(renderCharts, 100);
}

function updateDarkModeToggle() {
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.checked = settings.theme === 'dark';
}

/* ===================== REFRESH ALL ===================== */
function refreshAll() {
  renderDashboard();
  renderRiwayat();
  renderTargets();
}

/* ===================== DASHBOARD ===================== */
function renderDashboard() {
  const now = new Date();
  const todayStr = toDateStr(now);
  const monday = getMonday(now);

  const todayExp = expenses.filter(e => e.date === todayStr);
  const weekExp = expenses.filter(e => new Date(e.date) >= monday && new Date(e.date) <= now);
  const monthExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  setText('totalHariIni', formatRp(sumExpenses(todayExp)));
  setText('txHariIni', `${todayExp.length} transaksi`);
  setText('totalMingguIni', formatRp(sumExpenses(weekExp)));
  setText('txMingguIni', `${weekExp.length} transaksi`);
  setText('totalBulanIni', formatRp(sumExpenses(monthExp)));
  setText('txBulanIni', `${monthExp.length} transaksi`);

  // Top category this month
  const catMap = {};
  monthExp.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
  const topCat = Object.entries(catMap).sort((a,b) => b[1]-a[1])[0];
  if (topCat) {
    setText('topKategori', `${getCatIcon(topCat[0])} ${topCat[0]}`);
    setText('topKategoriNominal', formatRp(topCat[1]));
  } else {
    setText('topKategori', '–');
    setText('topKategoriNominal', 'belum ada data');
  }

  // Saldo bar
  const saldo = settings.saldoSekarang;
  const saldoAwal = settings.saldoAwal;
  const totalPengeluaran = sumExpenses(expenses);
  if (saldoAwal > 0) {
    const terpakai = saldoAwal - saldo;
    const pct = saldoAwal > 0 ? Math.min(Math.max((terpakai / saldoAwal) * 100, 0), 100) : 0;
    setText('budgetBarLabel', formatRp(saldo));
    setText('budgetUsed', `Terpakai: ${formatRp(terpakai)}`);
    setText('budgetLeft', saldo >= 0 ? `Sisa: ${formatRp(saldo)}` : `⚠️ Minus: ${formatRp(Math.abs(saldo))}`);
    const fill = document.getElementById('budgetProgress');
    fill.style.width = pct + '%';
    fill.classList.toggle('danger', saldo < 0 || pct >= 90);
  } else {
    setText('budgetBarLabel', 'Belum ada saldo');
    setText('budgetUsed', 'Terpakai: –');
    setText('budgetLeft', 'Isi saldo di menu Target');
    document.getElementById('budgetProgress').style.width = '0%';
  }

  // Recent 5
  const recent = [...expenses].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  renderTxList('recentList', recent, true);

  // Saldo warning notification
  if (settings.saldoAwal > 0 && settings.saldoSekarang < 0) {
    setNotifBadge(true);
  } else if (settings.saldoAwal > 0 && settings.saldoSekarang < settings.saldoAwal * 0.1) {
    setNotifBadge(true);
  } else {
    setNotifBadge(false);
  }
}

function setNotifBadge(on) {
  const btn = document.getElementById('notifBtn');
  btn.textContent = on ? '🔔' : '🔔';
  btn.style.filter = on ? 'drop-shadow(0 0 6px var(--warning))' : '';
}

/* ===================== EXPENSE CRUD ===================== */
function setDefaultDate() {
  const today = toDateStr(new Date());
  document.getElementById('inputTanggal').value = today;
}

function saveExpense() {
  const nama = document.getElementById('inputNama').value.trim();
  const kategori = document.getElementById('inputKategori').value;
  const nominal = parseFloat(document.getElementById('inputNominal').value);
  const tanggal = document.getElementById('inputTanggal').value;
  const catatan = document.getElementById('inputCatatan').value.trim();

  if (!nama || !kategori || !nominal || !tanggal) {
    showToast('⚠️ Lengkapi semua field yang wajib diisi!', 'warning');
    return;
  }
  if (nominal <= 0) { showToast('Nominal harus lebih dari 0', 'error'); return; }

  const expense = {
    id: Date.now().toString(),
    name: nama,
    category: kategori,
    amount: nominal,
    date: tanggal,
    note: catatan,
    createdAt: new Date().toISOString()
  };

  expenses.unshift(expense);
  // Kurangi saldo selalu (tidak perlu cek kondisi)
  settings.saldoSekarang = (settings.saldoSekarang || 0) - nominal;
  saveData();
  resetForm();
  showToast(`✅ Disimpan! Saldo berkurang ${formatRp(nominal)}`, 'success');
  refreshAll();
  checkBudgetWarning();
}

function checkBudgetWarning() {
  if (!settings.saldoAwal) return;
  const saldo = settings.saldoSekarang;
  if (saldo < 0) {
    showToast(`🚨 Saldo minus! ${formatRp(Math.abs(saldo))} melebihi saldo`, 'warning');
  } else if (saldo < settings.saldoAwal * 0.1) {
    showToast(`⚠️ Saldo hampir habis! Tersisa ${formatRp(saldo)}`, 'warning');
  }
}

function resetForm() {
  document.getElementById('inputNama').value = '';
  document.getElementById('inputKategori').value = '';
  document.getElementById('inputNominal').value = '';
  document.getElementById('inputCatatan').value = '';
  setDefaultDate();
}

function quickCategory(cat, icon) {
  document.getElementById('inputKategori').value = cat;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('inputNama').focus();
}

function deleteExpense(id) {
  openConfirm('Hapus Transaksi?', 'Data ini akan dihapus permanen dan saldo dikembalikan.', () => {
    const exp = expenses.find(e => e.id === id);
    if (exp) {
      settings.saldoSekarang = (settings.saldoSekarang || 0) + exp.amount;
      // saldoAwal juga naik kalau memang pernah ada saldo
      if (settings.saldoAwal > 0) {
        settings.saldoAwal = (settings.saldoAwal || 0) + exp.amount;
      }
    }
    expenses = expenses.filter(e => e.id !== id);
    saveData();
    refreshAll();
    showToast(exp ? `🗑️ Terhapus! Saldo +${formatRp(exp.amount)} dikembalikan` : '🗑️ Transaksi dihapus', 'success');
  });
}

function openEditModal(id) {
  const e = expenses.find(x => x.id === id);
  if (!e) return;
  editingId = id;
  document.getElementById('editNama').value = e.name;
  document.getElementById('editKategori').value = e.category;
  document.getElementById('editNominal').value = e.amount;
  document.getElementById('editTanggal').value = e.date;
  document.getElementById('editCatatan').value = e.note || '';
  showEl('editModal');
}

function updateExpense() {
  if (!editingId) return;
  const idx = expenses.findIndex(e => e.id === editingId);
  if (idx === -1) return;
  const oldAmount = expenses[idx].amount;
  const newAmount = parseFloat(document.getElementById('editNominal').value);
  const diff = newAmount - oldAmount; // positive = lebih besar
  expenses[idx] = {
    ...expenses[idx],
    name: document.getElementById('editNama').value.trim(),
    category: document.getElementById('editKategori').value,
    amount: newAmount,
    date: document.getElementById('editTanggal').value,
    note: document.getElementById('editCatatan').value.trim()
  };
  // adjust saldo selalu, tidak perlu cek kondisi
  settings.saldoSekarang = (settings.saldoSekarang || 0) - diff;
  saveData();
  closeModal();
  refreshAll();
  showToast('✅ Transaksi diperbarui!', 'success');
}

function closeModal() {
  hideEl('editModal');
  editingId = null;
}

/* ===================== RENDER TX LIST ===================== */
function renderTxList(containerId, list, hideActions = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada pengeluaran</p></div>`;
    return;
  }
  container.innerHTML = list.map(e => `
    <div class="tx-card" id="tx-${e.id}">
      <div class="tx-icon">${getCatIcon(e.category)}</div>
      <div class="tx-info">
        <div class="tx-name">${escHtml(e.name)}</div>
        <div class="tx-meta">${getCatLabel(e.category)} · ${formatDateShort(e.date)}${e.note ? ' · ' + escHtml(e.note) : ''}</div>
      </div>
      <div class="tx-amount">-${formatRp(e.amount)}</div>
      ${!hideActions ? `
      <div class="tx-actions">
        <button class="tx-btn" onclick="openEditModal('${e.id}')" title="Edit">✏️</button>
        <button class="tx-btn del" onclick="deleteExpense('${e.id}')" title="Hapus">🗑️</button>
      </div>` : ''}
    </div>
  `).join('');
}

/* ===================== RIWAYAT ===================== */
function initFilterBtns() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilter();
    });
  });
}

function applyFilter() {
  const now = new Date();
  const todayStr = toDateStr(now);
  const monday = getMonday(now);
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const cat = document.getElementById('filterKategori')?.value || '';
  const sort = document.getElementById('filterSort')?.value || 'terbaru';

  let filtered = [...expenses];

  // Time filter
  if (currentFilter === 'hari') filtered = filtered.filter(e => e.date === todayStr);
  else if (currentFilter === 'minggu') filtered = filtered.filter(e => new Date(e.date) >= monday && new Date(e.date) <= now);
  else if (currentFilter === 'bulan') filtered = filtered.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Category filter
  if (cat) filtered = filtered.filter(e => e.category === cat);

  // Search
  if (search) filtered = filtered.filter(e =>
    e.name.toLowerCase().includes(search) ||
    e.category.toLowerCase().includes(search) ||
    (e.note || '').toLowerCase().includes(search)
  );

  // Sort
  if (sort === 'terbesar') filtered.sort((a,b) => b.amount - a.amount);
  else if (sort === 'terkecil') filtered.sort((a,b) => a.amount - b.amount);
  else filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  renderRiwayatList(filtered);
}

function renderRiwayat() {
  applyFilter();
}

function renderRiwayatList(list) {
  renderTxList('riwayatList', list);
  const total = sumExpenses(list);
  const summary = document.getElementById('riwayatSummary');
  if (summary) {
    summary.innerHTML = `<span>${list.length} transaksi</span><span>Total: <b>${formatRp(total)}</b></span>`;
  }
}

/* ===================== STATISTIK ===================== */
function renderCharts() {
  const now = new Date();
  const isDark = settings.theme === 'dark';
  const textColor = isDark ? '#8b91a8' : '#5a6080';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // Stats cards
  if (expenses.length > 0) {
    const maxExp = expenses.reduce((a,b) => a.amount > b.amount ? a : b);
    setText('statTerbesar', formatRp(maxExp.amount));
    setText('statTerbesar2', `${maxExp.name} (${maxExp.date})`);

    const catMap = {};
    expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    const topCat = Object.entries(catMap).sort((a,b) => b[1]-a[1])[0];
    setText('statBorosKat', `${getCatIcon(topCat[0])} ${topCat[0]}`);
    setText('statBorosNom', formatRp(topCat[1]));

    // Avg per day (last 30 days)
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const last30 = expenses.filter(e => new Date(e.date) >= thirtyAgo);
    const uniqueDays = new Set(last30.map(e => e.date)).size || 1;
    setText('statRataHari', formatRp(sumExpenses(last30) / uniqueDays));
  } else {
    ['statTerbesar','statTerbesar2','statBorosKat','statBorosNom','statRataHari'].forEach(id => setText(id, '–'));
  }
  setText('statTotalTx', expenses.length);

  // Weekly Chart (last 7 days)
  const days7 = [];
  const labels7 = [];
  const daysName = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = toDateStr(d);
    days7.push(sumExpenses(expenses.filter(e => e.date === ds)));
    labels7.push(daysName[d.getDay()]);
  }

  const weekCtx = document.getElementById('weeklyChart').getContext('2d');
  if (weeklyChart) weeklyChart.destroy();
  weeklyChart = new Chart(weekCtx, {
    type: 'bar',
    data: {
      labels: labels7,
      datasets: [{
        label: 'Pengeluaran',
        data: days7,
        backgroundColor: 'rgba(0,212,170,0.7)',
        borderColor: '#00d4aa',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, callback: v => formatRpShort(v) }, grid: { color: gridColor } }
      }
    }
  });

  // Category Pie
  const catMap2 = {};
  expenses.forEach(e => { catMap2[e.category] = (catMap2[e.category] || 0) + e.amount; });
  const catLabels = Object.keys(catMap2);
  const catData = Object.values(catMap2);
  const catColors = ['#00d4aa','#4f9ef8','#a78bfa','#fb923c','#f87171','#fbbf24','#34d399','#94a3b8'];

  const catCtx = document.getElementById('categoryChart').getContext('2d');
  if (categoryChart) categoryChart.destroy();
  if (catLabels.length > 0) {
    categoryChart = new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catData,
          backgroundColor: catColors.slice(0, catLabels.length),
          borderColor: isDark ? '#13161e' : '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: textColor, padding: 12, font: { size: 12 } } }
        }
      }
    });
  }

  // Daily (this month)
  const mo = now.getMonth(), yr = now.getFullYear();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const dailyLabels = [], dailyData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    dailyLabels.push(d);
    dailyData.push(expenses.filter(e => e.date === ds).length);
  }
  const dailyCtx = document.getElementById('dailyChart').getContext('2d');
  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(dailyCtx, {
    type: 'line',
    data: {
      labels: dailyLabels,
      datasets: [{
        label: 'Transaksi',
        data: dailyData,
        borderColor: '#4f9ef8',
        backgroundColor: 'rgba(79,158,248,0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#4f9ef8'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, min: 0 }
      }
    }
  });
}

/* ===================== TARGET ===================== */
function setSaldo() {
  const v = parseFloat(document.getElementById('inputBudgetHarian').value);
  if (isNaN(v) || v < 0) { showToast('Masukkan nominal yang valid', 'error'); return; }
  openConfirm(
    'Set Ulang Saldo?',
    `Saldo akan diganti menjadi ${formatRp(v)}. Riwayat transaksi tidak berubah.`,
    () => {
      settings.saldoAwal = v;
      settings.saldoSekarang = v;
      document.getElementById('inputBudgetHarian').value = '';
      saveData();
      showToast(`✅ Saldo diset ke ${formatRp(v)}!`, 'success');
      renderTargets();
      renderDashboard();
    }
  );
}

function topUpSaldo() {
  const v = parseFloat(document.getElementById('inputBudgetHarian').value);
  if (isNaN(v) || v <= 0) { showToast('Masukkan nominal top up yang valid', 'error'); return; }
  settings.saldoAwal = (settings.saldoAwal || 0) + v;
  settings.saldoSekarang = (settings.saldoSekarang || 0) + v;
  document.getElementById('inputBudgetHarian').value = '';
  saveData();
  showToast(`➕ Top up ${formatRp(v)} berhasil! Saldo: ${formatRp(settings.saldoSekarang)}`, 'success');
  renderTargets();
  renderDashboard();
}

function saveBudget() { setSaldo(); }

function saveTarget() {
  const nama = document.getElementById('inputTargetNama').value.trim();
  const nominal = parseFloat(document.getElementById('inputTargetNominal').value);
  const sudah = parseFloat(document.getElementById('inputTargetSudah').value) || 0;
  if (!nama || !nominal || nominal <= 0) { showToast('Lengkapi data target', 'warning'); return; }
  savingTargets.push({ id: Date.now().toString(), name: nama, target: nominal, saved: sudah });
  saveData();
  document.getElementById('inputTargetNama').value = '';
  document.getElementById('inputTargetNominal').value = '';
  document.getElementById('inputTargetSudah').value = '';
  showToast('🎯 Target ditambahkan!', 'success');
  renderTargets();
}

function deleteTarget(id) {
  openConfirm('Hapus Target?', 'Target tabungan ini akan dihapus.', () => {
    savingTargets = savingTargets.filter(t => t.id !== id);
    saveData();
    renderTargets();
    showToast('🗑️ Target dihapus', 'success');
  });
}

function renderTargets() {
  // Saldo display
  const saldoAwal = settings.saldoAwal || 0;
  const saldo = settings.saldoSekarang || 0;
  const totalPakai = saldoAwal - saldo;

  // big saldo nominal
  const bigEl = document.getElementById('saldoNominalBig');
  if (bigEl) {
    bigEl.textContent = formatRp(saldo);
    bigEl.style.color = saldo < 0 ? 'var(--danger)' : saldo < saldoAwal * 0.1 ? 'var(--warning)' : 'var(--accent)';
  }

  if (saldoAwal > 0) {
    const pct = Math.min(Math.max(((saldoAwal - saldo) / saldoAwal) * 100, 0), 100);
    setText('tsBudget', formatRp(saldoAwal));
    setText('tsTerpakai', formatRp(Math.max(totalPakai, 0)));
    const sisaEl = document.getElementById('tsSisa');
    if (sisaEl) {
      sisaEl.textContent = saldo >= 0 ? formatRp(saldo) : `⚠️ Minus ${formatRp(Math.abs(saldo))}`;
      sisaEl.style.color = saldo < 0 ? 'var(--danger)' : saldo < saldoAwal * 0.1 ? 'var(--warning)' : '';
    }
    document.getElementById('targetProgress').style.width = pct + '%';
    document.getElementById('targetProgress').classList.toggle('danger', saldo < 0 || pct >= 90);

    const warn = document.getElementById('targetWarning');
    if (saldo < 0) {
      warn.textContent = `🚨 Saldo minus! Pengeluaran melebihi saldo ${formatRp(Math.abs(saldo))}`;
      showEl(warn);
    } else if (pct >= 80) {
      warn.textContent = `⚠️ Saldo tinggal ${formatRp(saldo)} (${Math.round(100-pct)}% tersisa)!`;
      showEl(warn);
    } else {
      hideEl(warn);
    }
  } else {
    setText('tsBudget', 'Belum ada saldo');
    setText('tsTerpakai', '–');
    setText('tsSisa', '–');
    hideEl(document.getElementById('targetWarning'));
    document.getElementById('targetProgress').style.width = '0%';
  }

  // Saving targets
  const container = document.getElementById('targetList');
  if (savingTargets.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎯</div><p>Belum ada target tabungan</p></div>';
    return;
  }
  container.innerHTML = savingTargets.map(t => {
    const pct = Math.min((t.saved / t.target) * 100, 100);
    const kurang = t.target - t.saved;
    return `
      <div class="target-item">
        <div class="target-item-header">
          <span class="target-item-name">🎯 ${escHtml(t.name)}</span>
          <span class="target-item-pct">${Math.round(pct)}%</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="target-item-sub">
          <span>Ditabung: ${formatRp(t.saved)} / ${formatRp(t.target)}</span>
          <span>${kurang > 0 ? `Kurang: ${formatRp(kurang)}` : '✅ Tercapai!'}</span>
        </div>
        <div style="text-align:right;margin-top:0.5rem">
          <span class="target-del" onclick="deleteTarget('${t.id}')">Hapus</span>
        </div>
      </div>`;
  }).join('');
}

/* ===================== SETTINGS ===================== */
function savePin() {
  const pin = document.getElementById('inputPin').value;
  const confirm = document.getElementById('inputPinConfirm').value;
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { showToast('PIN harus 4 digit angka', 'error'); return; }
  if (pin !== confirm) { showToast('Konfirmasi PIN tidak cocok', 'error'); return; }
  settings.pin = pin;
  saveData();
  document.getElementById('inputPin').value = '';
  document.getElementById('inputPinConfirm').value = '';
  showToast('🔐 PIN berhasil disimpan!', 'success');
}

function removePin() {
  openConfirm('Hapus PIN?', 'Proteksi PIN akan dinonaktifkan.', () => {
    settings.pin = '';
    saveData();
    showToast('PIN dihapus', 'success');
  });
}

/* ===================== EXPORT ===================== */
function exportCSV() {
  if (expenses.length === 0) { showToast('Tidak ada data untuk diekspor', 'warning'); return; }
  const header = ['Nama','Kategori','Nominal','Tanggal','Catatan'];
  const rows = expenses.map(e => [
    `"${e.name}"`, `"${e.category}"`, e.amount, e.date, `"${e.note || ''}"`
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  downloadFile('DuitTrack_Export.csv', 'text/csv', csv);
  showToast('📄 CSV berhasil diunduh!', 'success');
}

function exportExcel() {
  if (expenses.length === 0) { showToast('Tidak ada data untuk diekspor', 'warning'); return; }
  const ws_data = [
    ['Nama', 'Kategori', 'Nominal', 'Tanggal', 'Catatan'],
    ...expenses.map(e => [e.name, e.category, e.amount, e.date, e.note || ''])
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, 'DuitTrack');
  XLSX.writeFile(wb, 'DuitTrack_Export.xlsx');
  showToast('📊 Excel berhasil diunduh!', 'success');
}

function backupJSON() {
  const data = { expenses, savingTargets, settings, exportedAt: new Date().toISOString() };
  downloadFile('DuitTrack_Backup.json', 'application/json', JSON.stringify(data, null, 2));
  showToast('💾 Backup berhasil!', 'success');
}

function restoreJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.expenses) throw new Error('Format tidak valid');
      openConfirm('Restore Data?', 'Data saat ini akan ditimpa dengan data dari backup.', () => {
        expenses = data.expenses || [];
        savingTargets = data.savingTargets || [];
        if (data.settings) settings = { ...settings, ...data.settings };
        saveData();
        applyTheme();
        refreshAll();
        showToast('📥 Data berhasil di-restore!', 'success');
      });
    } catch {
      showToast('❌ File backup tidak valid', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function resetMonthly() {
  const now = new Date();
  openConfirm('Reset Bulan Ini?', `Semua data ${now.toLocaleString('id-ID',{month:'long',year:'numeric'})} akan dihapus.`, () => {
    const mo = now.getMonth(), yr = now.getFullYear();
    expenses = expenses.filter(e => {
      const d = new Date(e.date);
      return !(d.getMonth() === mo && d.getFullYear() === yr);
    });
    saveData();
    refreshAll();
    showToast('🔄 Data bulan ini direset!', 'success');
  });
}

function resetAll() {
  openConfirm('Hapus Semua Data?', '⚠️ Semua pengeluaran dan target akan dihapus PERMANEN!', () => {
    expenses = [];
    savingTargets = [];
    settings.saldoSekarang = 0;
    settings.saldoAwal = 0;
    saveData();
    refreshAll();
    showToast('🗑️ Semua data dihapus', 'success');
  });
}

/* ===================== CONFIRM MODAL ===================== */
function openConfirm(title, msg, cb) {
  setText('confirmTitle', title);
  setText('confirmMsg', msg);
  confirmCallback = cb;
  showEl('confirmModal');
  document.getElementById('confirmOkBtn').onclick = () => {
    hideEl('confirmModal');
    const fn = confirmCallback;
    confirmCallback = null;
    if (fn) fn();
  };
}

function closeConfirm() { hideEl('confirmModal'); confirmCallback = null; }

/* ===================== TOAST ===================== */
let toastTimeout = null;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(12px)';
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2800);
}

/* ===================== HELPERS ===================== */
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getMonday(d) {
  const day = new Date(d);
  const diff = day.getDate() - day.getDay() + (day.getDay() === 0 ? -6 : 1);
  day.setDate(diff);
  day.setHours(0,0,0,0);
  return day;
}

function sumExpenses(arr) { return arr.reduce((a,b) => a + (b.amount || 0), 0); }

function formatRp(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function formatRpShort(n) {
  if (n >= 1000000) return 'Rp ' + (n/1000000).toFixed(1) + 'jt';
  if (n >= 1000) return 'Rp ' + (n/1000).toFixed(0) + 'rb';
  return 'Rp ' + n;
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'short' });
}

function getCatIcon(cat) {
  const icons = { Makan:'🍽️', Bensin:'⛽', Kopi:'☕', Jajan:'🍿', Transportasi:'🚗', Tagihan:'📱', Belanja:'🛒', Lainnya:'📦' };
  return icons[cat] || '💸';
}

function getCatLabel(cat) { return cat || 'Lainnya'; }

function showEl(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (el) el.classList.remove('hidden');
}

function hideEl(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (el) el.classList.add('hidden');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function downloadFile(filename, type, content) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
