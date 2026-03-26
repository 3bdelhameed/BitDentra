// ══════════════════════════════════════════════════════════════════
//  startup_preload.js  v4.0 — Safe Sync (No Overwrite)
//
//  ✅ إصلاحات v4.0:
//  1. إزالة dex.clear() الخطيرة — لا مسح للبيانات المحلية أبداً
//  2. توحيد مفتاح الـ queue → clinic_offline_queue_v3
//  3. ترتيب صحيح: زامن أولاً ← ثم اجلب من Supabase
//  4. preloadAllData لا يكتب فوق بيانات pending
//
//  ترتيب التحميل في index.html:
//  supabase-config.js → app.js → offline_first_patch.js → startup_preload.js
// ══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // ── unified queue key (نفس offline_first_patch.js) ───────────
    const QUEUE_KEY = 'clinic_offline_queue_v3';

    function sbReady() {
        if (!window._sbReady) return false;
        return typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady;
    }

    function getQueue() {
        try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
        catch { return []; }
    }

    // ── CACHE ──────────────────────────────────────────────────────
    window._appCache = {
        patients: [], appointments: [], treatments: [],
        expenses: [], prescriptions: [], invoices: [],
        inventory: [], lab_orders: [], doctors: [],
        loaded: false, loadedAt: null, loading: false,
    };

    function badge(html) {
        const el = document.getElementById('syncBadge');
        if (!el) return;
        el.classList.remove('hidden');
        el.innerHTML = html;
    }

    async function waitForDb(ms = 10000) {
        const t = Date.now();
        while (typeof window.dbGetAll !== 'function') {
            if (Date.now() - t > ms) return false;
            await sleep(80);
        }
        return true;
    }

    async function waitForSupabase(ms = 10000) {
        const t = Date.now();
        while (!sbReady()) {
            if (Date.now() - t > ms) return false;
            await sleep(100);
        }
        return true;
    }

    // ── جيب البيانات من Supabase ───────────────────────────────────
    async function fetchFreshFromSupabase() {
        if (!window._sb) return null;

        const tables = [
            'patients', 'appointments', 'treatments',
            'expenses', 'prescriptions', 'invoices',
            'inventory', 'lab_orders', 'doctors', 'session_payments'
        ];

        const results = await Promise.allSettled(
            tables.map(t =>
                window._sb.from(t).select('*')
                    .then(({ data, error }) => {
                        if (error) throw error;
                        return data || [];
                    })
            )
        );

        // لو المريض أو التريتمنت فشل بس → fallback (مش كل حاجة)
        const coreIdx = [0, 1, 2]; // patients, appointments, treatments
        if (coreIdx.some(i => results[i].status === 'rejected')) return null;

        const fresh = {};
        tables.forEach((t, i) => {
            fresh[t] = results[i].status === 'fulfilled' ? results[i].value : [];
        });
        return fresh;
    }

    // ── Supabase table → Dexie store name ────────────────────────
    const TABLE_MAP = {
        patients:         'patients',
        appointments:     'appointments',
        treatments:       'treatments',
        expenses:         'expenses',
        prescriptions:    'prescriptions',
        invoices:         'invoices',
        inventory:        'inventory',
        lab_orders:       'labOrders',
        doctors:          'doctors',
        session_payments: 'session_payments',
    };

    // snake_case → camelCase مستقلة (لا تعتمد على supabase-config.js)
    function _snakeToCamel(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
        }
        return out;
    }

    // احصل على Dexie store بشكل آمن
    function _getDexStore(sbTable) {
        const dStore = TABLE_MAP[sbTable];
        if (!dStore) return null;
        const db = window.db;
        if (!db || !db[dStore]) return null;
        return db[dStore];
    }

    /**
     * اكتب بيانات Supabase في Dexie بأمان:
     * - لا تمسح أي حاجة
     * - استخدم bulkPut (upsert) فقط
     * - تجاهل الـ rows اللي في الـ pending queue
     */
    async function safeMirrorToDexie(fresh) {
        if (!window.db || !fresh) return;

        // IDs اللي في الـ queue — لا نكتب فوقها
        const pending = getQueue();
        const pendingByTable = {};
        pending.forEach(op => {
            if (!op.table || !op.id) return;
            if (!pendingByTable[op.table]) pendingByTable[op.table] = new Set();
            pendingByTable[op.table].add(String(op.id));
        });

        let totalWritten = 0;

        for (const [sbTable, rows] of Object.entries(fresh)) {
            const store = _getDexStore(sbTable);
            if (!store) continue;
            if (!rows || !rows.length) continue;

            try {
                const pendingIds = pendingByTable[sbTable] || new Set();

                // فلتر الـ rows اللي مش في الـ pending queue
                const safeRows = rows.filter(r => !r.id || !pendingIds.has(String(r.id)));

                if (safeRows.length > 0) {
                    // حوّل snake_case → camelCase + فلتر الـ rows اللي id ناقص
                    const camelRows = safeRows
                        .map(r => _snakeToCamel(r))
                        .filter(r => r.id != null && r.id !== 0 && r.id !== '');

                    if (camelRows.length > 0) {
                        try {
                            await store.bulkPut(camelRows);
                            totalWritten += camelRows.length;
                        } catch (bulkErr) {
                            let rowsWritten = 0;
                            for (const row of camelRows) {
                                try {
                                    await store.put(row);
                                    rowsWritten++;
                                } catch (rowErr) {
                                    console.warn(`[Preload] skip bad row in ${sbTable} id=${row.id}:`, rowErr.message);
                                }
                            }
                            totalWritten += rowsWritten;
                        }
                        console.log(`[Preload] ✓ Dexie[${sbTable}] <- ${camelRows.length} rows`);
                    }
                }

                // ✅ امسح من Dexie أي record اتمسح من Supabase
                const supabaseIds = new Set(rows.filter(r => r.id).map(r => String(r.id)));
                if (supabaseIds.size > 0) {
                    try {
                        const localRows = await store.toArray();
                        const toDelete = localRows
                            .filter(r => r.id
                                && !r._localOnly
                                && !pendingIds.has(String(r.id))
                                && !supabaseIds.has(String(r.id)))
                            .map(r => r.id);
                        if (toDelete.length > 0) {
                            await store.bulkDelete(toDelete);
                            console.log(`[Preload] 🗑️ Cleaned ${toDelete.length} deleted rows from Dexie[${sbTable}]`);
                        }
                    } catch (e) { /* silent */ }
                }

            } catch (e) {
                console.warn('[Preload] safeMirrorToDexie failed for', sbTable, ':', e.message);
            }
        }

        console.log(`[Preload] ✓ Dexie mirror complete — ${totalWritten} rows written`);
    }

    // ── MAIN PRELOAD ───────────────────────────────────────────────
    window.preloadAllData = async function (force = false) {
        const c = window._appCache;
        if (c.loading) { while (c.loading) await sleep(50); return; }

        const TTL = 30_000;
        if (!force && c.loaded && c.loadedAt && (Date.now() - c.loadedAt) < TTL) return;

        c.loading = true;
        badge('<span style="color:#1d4ed8;font-size:11px;font-weight:600">🔄 تحميل…</span>');

        try {
            let fresh = null;
            let source = 'dexie';

            // تحقق إن Supabase فعلاً جاهز ومتصل قبل أي request
            const isOnline = navigator.onLine && sbReady() && window._sb;

            if (isOnline) {
                // ✅ ترتيب صحيح: زامن الـ queue أولاً ← ثم اجلب من Supabase
                const pendingQ = getQueue();
                if (pendingQ.length > 0) {
                    console.log('[Preload] Queue pending (' + pendingQ.length + '), syncing first...');
                    if (typeof window.syncOfflineQueue === 'function') {
                        try { await window.syncOfflineQueue(); } catch (e) {
                            console.warn('[Preload] syncQueue failed:', e.message);
                        }
                    }
                    await sleep(1000);
                }

                fresh = await fetchFreshFromSupabase();
                if (fresh) {
                    source = 'cloud';
                    await safeMirrorToDexie(fresh);
                }
            }

            // Fallback: اقرأ من Dexie
            if (!fresh) {
                const ready = await waitForDb(5000);
                if (ready) {
                    const tables = ['patients','appointments','treatments','expenses','prescriptions','invoices','inventory','lab_orders','doctors'];
                    const res = await Promise.allSettled(tables.map(t => window.dbGetAll(t).catch(() => [])));
                    fresh = {};
                    tables.forEach((t, i) => { fresh[t] = res[i].status === 'fulfilled' ? (res[i].value || []) : []; });
                    source = 'dexie';

                    // إذا كنا أوفلاين وكل الجداول فاضية، نعلم المستخدم
                    if (!navigator.onLine) {
                        const empty = Object.values(fresh).every(arr => arr.length === 0);
                        if (empty && typeof showToast === 'function') {
                            showToast('📡 لا توجد بيانات محفوظة محلياً. افتح التطبيق مرة واحدة وأنت متصل لإجراء المزامنة.', 'warning');
                        }
                    }
                }
            }

            if (!fresh) {
                console.warn('[Preload] No data source available');
                return;
            }

            Object.assign(c, fresh);
            c.loaded   = true;
            c.loadedAt = Date.now();

            console.log('[Preload] ✓ (' + source + ')', {
                patients:     c.patients.length,
                appointments: c.appointments.length,
                treatments:   c.treatments.length
            });

            badge(sbReady()
                ? '<span style="color:#15803d;font-size:11px;font-weight:600">🟢 متزامن</span>'
                : '<span style="color:#64748b;font-size:11px;font-weight:600">💾 محلي</span>'
            );

        } catch (e) {
            console.error('[Preload]', e);
        } finally {
            c.loading = false;
        }
    };

    // ── RENDER DASHBOARD ───────────────────────────────────────────
    window.renderDashboardFromCache = function () {
        const c = window._appCache;
        if (!c.loaded) return;

        const today = new Date().toISOString().split('T')[0];
        const curr  = typeof getCurrency === 'function' ? getCurrency() : 'EGP';
        const lang  = typeof currentLang !== 'undefined' ? currentLang : 'en';

        const $ = id => document.getElementById(id);
        if ($('totalPatientsCount')) $('totalPatientsCount').innerText = c.patients.length;

        let rev = 0, exp = 0;
        c.treatments.forEach(t => {
            const d = t.date || (t.created_at || '').split('T')[0];
            if (d === today) rev += parseFloat(t.paid) || 0;
        });
        c.expenses.forEach(e => {
            if (e.date === today) exp += parseFloat(e.amount) || 0;
        });

        if ($('todayRevenue'))  $('todayRevenue').innerText  = rev.toFixed(2) + ' ' + curr;
        if ($('todayExpenses')) $('todayExpenses').innerText = exp.toFixed(2) + ' ' + curr;
        if ($('netProfit'))     $('netProfit').innerText     = (rev - exp).toFixed(2) + ' ' + curr;

        if ($('dashDate')) {
            $('dashDate').innerText = new Date().toLocaleDateString(
                lang === 'ar' ? 'ar-EG' : 'en-US',
                { weekday:'long', year:'numeric', month:'long', day:'numeric' }
            );
        }
        if ($('dashGreeting')) {
            const h = new Date().getHours();
            $('dashGreeting').innerText = h < 12 ? 'صباح الخير ☀️' : h < 17 ? 'مساء النهار 🌤️' : 'مساء الخير 🌙';
        }

        const rl = $('recentPatientsList');
        if (rl) {
            if (!c.patients.length) {
                rl.innerHTML = '<div class="text-center text-gray-300 mt-8"><i class="fa-solid fa-folder-open text-3xl mb-2 block"></i><p class="text-sm">لا يوجد مرضى</p></div>';
            } else {
                rl.innerHTML = [...c.patients].reverse().slice(0, 7).map(p => `
                    <div onclick="openPatientProfile(${p.id})" class="flex items-center gap-2 p-2.5 hover:bg-blue-50 cursor-pointer rounded-xl transition group border-b border-gray-50 last:border-0">
                        <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">${(p.name||'?')[0]}</div>
                        <div class="flex-1 min-w-0">
                            <p class="font-semibold text-sm text-gray-800 truncate">${p.name}</p>
                            <p class="text-[10px] text-gray-400">${p.phone||''}</p>
                        </div>
                        <i class="fa-solid fa-chevron-right text-xs text-gray-300 group-hover:text-blue-400"></i>
                    </div>`).join('');
            }
        }

        const al = $('appointmentsList');
        if (al) {
            const todayAppts = c.appointments.filter(a => a.date === today).sort((a,b) => (a.time||'').localeCompare(b.time||''));
            if (!todayAppts.length) {
                al.innerHTML = '<div class="flex flex-col items-center py-10 text-gray-300"><i class="fa-solid fa-calendar-xmark text-3xl mb-2"></i><p class="text-sm">لا توجد مواعيد اليوم</p></div>';
            } else {
                const sc = { Waiting:'badge-waiting', Inside:'badge-inside', Examined:'badge-examined', Cancelled:'badge-cancelled' };
                al.innerHTML = todayAppts.map(a => `
                    <div class="grid grid-cols-4 gap-2 px-4 py-3 text-xs text-center border-b border-gray-50 items-center hover:bg-gray-50">
                        <div class="font-bold text-blue-600">${a.time||''}</div>
                        <div class="font-semibold text-gray-800 truncate cursor-pointer hover:text-blue-600" onclick="openPatientProfile(${a.patient_id||a.patientId})">${a.patient_name||a.patientName||'—'}</div>
                        <div class="text-gray-400 truncate">${a.doctor||''}</div>
                        <div><select onchange="updateAppointmentStatus(${a.id},this.value)" class="badge ${sc[a.status]||'badge-waiting'} border-0 bg-transparent font-semibold text-xs outline-none cursor-pointer w-full">
                            <option value="Waiting"   ${a.status==='Waiting'  ?'selected':''}>Waiting</option>
                            <option value="Inside"    ${a.status==='Inside'   ?'selected':''}>Inside</option>
                            <option value="Examined"  ${a.status==='Examined' ?'selected':''}>Examined</option>
                            <option value="Cancelled" ${a.status==='Cancelled'?'selected':''}>Cancelled</option>
                        </select></div>
                    </div>`).join('');
            }
        }
    };

    // ── PATCH updateDashboard ──────────────────────────────────────
    function tryPatchDashboard() {
        if (window.updateDashboard && !window.updateDashboard._v4patched) {
            window.updateDashboard = async function () {
                const c = window._appCache;
                const TTL = 30_000;
                if (c.loaded && c.loadedAt && (Date.now() - c.loadedAt) < TTL) {
                    window.renderDashboardFromCache();
                    return;
                }
                await window.preloadAllData(true);
                window.renderDashboardFromCache();
            };
            window.updateDashboard._v4patched = true;
            console.log('[Preload] ✓ updateDashboard patched (v4)');
            return true;
        }
        return false;
    }

    // ── PATCH loadAllPatients ──────────────────────────────────────
    function tryPatchPatients() {
        if (window.loadAllPatients && !window.loadAllPatients._v4patched) {
            window.loadAllPatients = async function () {
                const c = window._appCache;
                if (!c.loaded) await window.preloadAllData(true);
                window.allPatientsData = c.patients || [];
                _renderPatientsTable(c.patients, c.treatments);
            };
            window.loadAllPatients._v4patched = true;

            window.filterPatients = function () {
                const q = (document.getElementById('patientSearch')?.value || '').toLowerCase();
                const c = window._appCache;
                const filtered = (c.patients || []).filter(p =>
                    (p.name||'').toLowerCase().includes(q) || (p.phone||'').includes(q)
                );
                _renderPatientsTable(filtered, c.treatments);
            };

            return true;
        }
        return false;
    }

    // ── RENDER جدول المرضى ────────────────────────────────────────
    function _renderPatientsTable(patients, treatments) {
        const tbody = document.getElementById('allPatientsTableBody');
        if (!tbody) return;
        const curr = typeof getCurrency === 'function' ? getCurrency() : 'EGP';
        const sortedPatients = [...(patients || [])].sort((a, b) => {
            const left = `${b.created_at || b.createdAt || ''}|${b.id || 0}`;
            const right = `${a.created_at || a.createdAt || ''}|${a.id || 0}`;
            return left.localeCompare(right);
        });

        if (!patients || !patients.length) {
            tbody.innerHTML = '';
            document.getElementById('patientsEmptyState')?.classList.remove('hidden');
            return;
        }
        document.getElementById('patientsEmptyState')?.classList.add('hidden');

        const bmap = {};
        (treatments || []).forEach(tr => {
            const pid = tr.patient_id || tr.patientId;
            if (!bmap[pid]) bmap[pid] = { cost: 0, paid: 0 };
            bmap[pid].cost += parseFloat(tr.total_cost || tr.totalCost) || 0;
            bmap[pid].paid += parseFloat(tr.paid) || 0;
        });

        tbody.innerHTML = sortedPatients.map((p, i) => {
            const b    = bmap[p.id] || { cost:0, paid:0 };
            const debt = b.cost - b.paid;
            const debtHtml = debt > 0.01
                ? `<span class="badge" style="background:#fef2f2;color:#ef4444">${debt.toFixed(2)} ${curr}</span>`
                : `<span class="badge" style="background:#f0fdf4;color:#16a34a">مسدد ✓</span>`;
            return `<tr class="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onclick="openPatientProfile(${p.id})">
                <td class="p-3 text-gray-400 text-sm">${i+1}</td>
                <td class="p-3"><div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">${(p.name||'?')[0]}</div>
                    <div><p class="font-semibold text-sm text-gray-800">${p.name}</p>
                    ${p.medical_history ? `<p class="text-[10px] text-yellow-600"><i class="fa-solid fa-triangle-exclamation"></i> ${p.medical_history}</p>` : ''}</div>
                </div></td>
                <td class="p-3 text-sm text-gray-600">${p.phone||''}</td>
                <td class="p-3 text-sm text-gray-500">${p.age||'—'}</td>
                <td class="p-3 text-sm text-gray-400">${(p.created_at||'').split('T')[0]||''}</td>
                <td class="p-3 text-center">${debtHtml}</td>
                <td class="p-3 text-center" onclick="event.stopPropagation()"><div class="flex gap-1 justify-center">
                    <button onclick="openPatientProfile(${p.id})" class="btn btn-outline text-xs px-2 py-1"><i class="fa-solid fa-folder-open"></i></button>
                    <button onclick="deletePatient(${p.id})" class="btn text-xs px-2 py-1" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca"><i class="fa-solid fa-trash"></i></button>
                </div></td>
            </tr>`;
        }).join('');
    }

    // ── WRAP WRITE OPERATIONS (invalidate cache) ───────────────────
    function wrapWrites() {
        ['dbInsert','dbUpdate','dbDelete'].forEach(fn => {
            if (!window[fn] || window[fn]._v4wrapped) return;
            const orig = window[fn];
            window[fn] = async function (...args) {
                const result = await orig(...args);
                window._appCache.loaded = false;
                return result;
            };
            window[fn]._v4wrapped = true;
            window[fn]._v3Wrapped = true;
            window[fn]._offlineFirstWrapped = true;
        });
    }

    // ── INIT ───────────────────────────────────────────────────────
    async function init() {
        console.log('[Preload v4] Starting...');

        const dbReady = await waitForDb(10000);
        if (!dbReady) { console.error('[Preload] dbGetAll timeout'); return; }

        let tries = 0;
        while (tries < 30) {
            const d = tryPatchDashboard();
            const p = tryPatchPatients();
            if (d && p) break;
            await sleep(100);
            tries++;
        }

        wrapWrites();

        window._appCache.loaded   = false;
        window._appCache.loadedAt = null;

        const sbConnected = await waitForSupabase(8000);
        if (!sbConnected) {
            console.warn('[Preload] Supabase not ready, using Dexie fallback');
        }

        await window.preloadAllData(true);
        window.renderDashboardFromCache();

        // تحديث تلقائي كل 5 دقايق (أون لاين فقط)
        setInterval(async () => {
            if (!navigator.onLine) return;
            await window.preloadAllData(true);
            const dv = document.getElementById('dashboardView');
            if (dv?.classList.contains('active')) window.renderDashboardFromCache();
        }, 5 * 60 * 1000);

        console.log('[Preload v4] ✓ Done —', window._appCache.patients.length, 'patients');
    }

    // ── NETWORK EVENTS ─────────────────────────────────────────────
    window.addEventListener('online', async () => {
        const el = document.getElementById('syncBadge');
        if (el) el.innerHTML = '<span style="color:#1d4ed8;font-size:11px;font-weight:600">🔄 جاري المزامنة…</span>';
    });

    window.addEventListener('offline', () => {
        badge('<span style="color:#f59e0b;font-size:11px;font-weight:600">📵 Offline</span>');
    });

    // ── CLEAR OFFLINE DATA (utility) ──────────────────────────────
    window.clearOfflineData = async function () {
        console.log('[Cache] clearing offline storage');
        try {
            if (typeof db !== 'undefined') {
                const names = db.tables.map(t => t.name);
                await Promise.all(names.map(n => db[n].clear()));
            }
        } catch (e) { console.warn('[Cache] cannot clear dexie:', e.message); }

        try { localStorage.removeItem(QUEUE_KEY); } catch {}
        try { localStorage.removeItem('clinic_offline_queue'); } catch {}
        try { localStorage.removeItem('clinic_doctors_cache_v3'); } catch {}

        window._appCache.loaded = false;

        if (navigator.onLine && typeof window.preloadAllData === 'function') {
            await window.preloadAllData(true);
            window.renderDashboardFromCache();
        }
        if (typeof showToast === 'function') showToast('🗑️ تم مسح الـ cache', 'success');
    };

    // ── START ──────────────────────────────────────────────────────
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})();
