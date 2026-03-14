// ╔══════════════════════════════════════════════════════════════════╗
// ║           🗄️  SUPABASE CONFIG — DentalClinic v4                 ║
// ║                                                                  ║
// ║  خطوات الإعداد (15 دقيقة):                                      ║
// ║  1. روح supabase.com وسجّل دخول بحساب Google                    ║
// ║  2. New Project → اسم العيادة → اختار region قريبة              ║
// ║  3. Project Settings → API → انسخ:                              ║
// ║     • Project URL  → حطّه في SUPABASE_URL                       ║
// ║     • anon public key → حطّه في SUPABASE_KEY                    ║
// ║  4. SQL Editor → New query → الصق الـ SQL من SCHEMA.sql         ║
// ║     واضغط RUN                                                    ║
// ╚══════════════════════════════════════════════════════════════════╝

const SUPABASE_URL = 'https://wqlcdjvykoetjfxzimuz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxbGNkanZ5a29ldGpmeHppbXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MDk0OTksImV4cCI6MjA4ODE4NTQ5OX0.s4lvIn2OXuaAt6HlvCrgbbquQZ8hwp-NLNwl8mNrfFI';

// ══════════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════════
let _sb          = null;
let _sbReady     = false;
let _syncTimer   = null;
let _syncRunning = false;

// ══════════════════════════════════════════════════════════════════
//  TABLE MAP  (Supabase snake_case  ↔  Dexie camelCase)
// ══════════════════════════════════════════════════════════════════
const TABLE_MAP = {
    patients:         'patients',
    appointments:     'appointments',
    treatments:       'treatments',
    tooth_states:     'toothStates',
    prescriptions:    'prescriptions',
    expenses:         'expenses',
    invoices:         'invoices',
    xrays:            'xrays',
    patient_notes:    'patientNotes',
    inventory:        'inventory',
    inventory_log:    'inventoryLog',
    lab_orders:       'labOrders',
    clinic_settings:  'clinicSettings',
    clinic_users:     'clinicUsers',
session_payments: 'session_payments',
    doctors:          'doctors',
};

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════
function snakeToCamel(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
    return out;
}

function camelToSnake(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        out[k.replace(/([A-Z])/g, '_$1').toLowerCase()] = v;
    }
    return out;
}

function getDexTable(sbTable) {
    const name = TABLE_MAP[sbTable];
    return (name && typeof db !== 'undefined' && db[name]) ? db[name] : null;
}

// ══════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════
function isSupabaseConfigured() {
    return !SUPABASE_URL.includes('PASTE_') && !SUPABASE_KEY.includes('PASTE_');
}

async function initSupabase() {
    if (!isSupabaseConfigured()) {
        console.warn('[DB] Supabase not configured — local only mode');
        updateSyncBadge('local');
        return false;
    }
    try {
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        _sb = createClient(SUPABASE_URL, SUPABASE_KEY);

        // Quick connectivity test
        const { error } = await _sb.from('patients').select('id').limit(1);
        if (error) throw error;

        _sbReady = true;
        updateSyncBadge('online');
        console.log('[Supabase] ✓ Connected');

        // refresh offline cache now that we have cloud access
        if (typeof window.preloadAllData === 'function') {
            try {
                await window.preloadAllData(true);
            } catch(e){ console.warn('[Supabase] preload after connect failed', e.message); }
            // also update UI if dashboard visible
            if (typeof window.renderDashboardFromCache === 'function') {
                window.renderDashboardFromCache();
            }
            if (typeof window.updateDashboard === 'function') {
                window.updateDashboard();
            }
        }

        // Upload anything saved offline while we were disconnected
        await uploadPendingRecords();

        startRealtimeListeners();
        return true;
    } catch (e) {
        console.error('[Supabase] Init failed:', e.message);
        _sbReady = false;
        updateSyncBadge('error');
        return false;
    }
}

// ══════════════════════════════════════════════════════════════════
//  CRUD — Supabase first, Dexie fallback (offline-first)
// ══════════════════════════════════════════════════════════════════

/** SELECT */
async function dbGetAll(table, filters = {}) {
    if (_sbReady) {
        try {
            let q = _sb.from(table).select('*');
            // skip undefined/null filters to avoid malformed REST requests
            for (const [k, v] of Object.entries(filters)) {
                if (v === undefined || v === null) continue;
                q = q.eq(k, v);
            }
            q = q.order('id', { ascending: false });
            const { data, error } = await q;
            if (!error) return data || [];
        } catch (e) {
            console.warn('[dbGetAll] Supabase error, falling back to Dexie:', e.message);
        }
    }
    // ── Dexie fallback ──
    const t = getDexTable(table);
    if (!t) return [];
    let rows = await t.toArray();
    for (const [k, v] of Object.entries(filters)) {
        const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        rows = rows.filter(r => r[ck] == v || r[k] == v);
    }
    return rows.reverse();
}

/** INSERT */
async function dbInsert(table, data) {
    // ── Always save to Dexie first (instant, offline-safe) ──
    const t = getDexTable(table);
    let localId = null;
    if (t) {
        try {
            const camel = snakeToCamel(data);
            localId = await t.add({ ...camel, _pendingSync: !_sbReady });
        } catch (e) {
            console.warn('[dbInsert] Dexie write failed:', e.message);
        }
    }

    if (!_sbReady) {
        scheduleSyncRetry();
        const camel = snakeToCamel(data);
        return { ...camel, id: localId, _offline: true };
    }

    // ── Push to Supabase ──
    try {
        const { data: row, error } = await _sb.from(table).insert(data).select().single();
        if (error) throw error;

        // Update Dexie record with real Supabase ID and clear pending flag
        if (t && localId) {
            try {
                await t.delete(localId);
                await t.add({ ...snakeToCamel(data), id: row.id, _pendingSync: false });
            } catch (_) {}
        }
        return row;
    } catch (e) {
        console.error('[dbInsert] Supabase error:', e.message);
        if (t && localId) {
            try { await t.update(localId, { _pendingSync: true }); } catch (_) {}
        }
        scheduleSyncRetry();
        showToast('💾 حُفظ محلياً — سيُزامَن عند عودة الاتصال', 'warning');
        return { ...snakeToCamel(data), id: localId, _offline: true };
    }
}

/** UPDATE */
async function dbUpdate(table, id, data) {
    const t = getDexTable(table);
    if (t) {
        try { await t.update(id, { ...snakeToCamel(data), _pendingSync: !_sbReady }); } catch (_) {}
    }

    if (!_sbReady) {
        scheduleSyncRetry();
        return true;
    }

    try {
        const { error } = await _sb.from(table).update(data).eq('id', id);
        if (error) throw error;
        if (t) { try { await t.update(id, { _pendingSync: false }); } catch (_) {} }
        return true;
    } catch (e) {
        console.error('[dbUpdate] Supabase error:', e.message);
        scheduleSyncRetry();
        showToast('💾 تحديث حُفظ محلياً — سيُزامَن عند عودة الاتصال', 'warning');
        return true;
    }
}

/** DELETE */
async function dbDelete(table, id) {
    const t = getDexTable(table);
    if (t) { try { await t.delete(id); } catch (_) {} }

    if (_sbReady) {
        try {
            await _sb.from(table).delete().eq('id', id);
        } catch (e) {
            console.error('[dbDelete] Supabase error:', e.message);
        }
    }
}

/** UPSERT (tooth_states unique constraint) */
async function dbUpsert(table, data, conflictCol) {
    if (_sbReady) {
        try {
            const { data: row, error } = await _sb
                .from(table)
                .upsert(data, { onConflict: conflictCol })
                .select()
                .single();
            if (!error) {
                const t = getDexTable(table);
                if (t) {
                    const camel = snakeToCamel(data);
                    const existing = await t
                        .where('patientId').equals(camel.patientId || data.patient_id)
                        .and(r => r.toothNumber == (camel.toothNumber || data.tooth_number))
                        .first().catch(() => null);
                    if (existing) await t.update(existing.id, { ...camel, id: row.id, _pendingSync: false });
                    else try { await t.add({ ...camel, id: row.id, _pendingSync: false }); } catch (_) {}
                }
                return row;
            }
        } catch (e) {
            console.error('[dbUpsert] Supabase error:', e.message);
        }
    }

    // Offline fallback
    const t = getDexTable(table);
    if (!t) return null;
    const camel = snakeToCamel(data);
    const existing = await t
        .where('patientId').equals(camel.patientId || data.patient_id)
        .and(r => r.toothNumber == (camel.toothNumber || data.tooth_number))
        .first().catch(() => null);
    if (existing) {
        await t.update(existing.id, { ...camel, _pendingSync: true });
        scheduleSyncRetry();
        return { ...camel, id: existing.id };
    }
    const id = await t.add({ ...camel, _pendingSync: true });
    scheduleSyncRetry();
    return { ...camel, id };
}

// ══════════════════════════════════════════════════════════════════
//  SYNC RETRY — debounced, won't fire if already running
// ══════════════════════════════════════════════════════════════════
function scheduleSyncRetry(delay = 15000) {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(async () => {
        _syncTimer = null;
        if (navigator.onLine && _sbReady) await uploadPendingRecords();
        else scheduleSyncRetry(30000);
    }, delay);
}

async function uploadPendingRecords() {
    if (!_sbReady || _syncRunning) return;
    _syncRunning = true;
    updateSyncBadge('syncing');

    const pairs = [
        ['patients',      'patients'],
        ['appointments',  'appointments'],
        ['treatments',    'treatments'],
        ['expenses',      'expenses'],
        ['prescriptions', 'prescriptions'],
        ['invoices',      'invoices'],
        ['inventory',     'inventory'],
        ['inventoryLog',  'inventory_log'],
        ['labOrders',     'lab_orders'],
        ['toothStates',   'tooth_states'],
        ['patientNotes',  'patient_notes'],
        ['doctors',       'doctors'],
        ['clinicUsers',   'clinic_users'],
        ['sessionPayments','session_payments'],
    ];

    let uploaded = 0;
    let failed   = 0;

    for (const [dexName, sbName] of pairs) {
        if (typeof db === 'undefined' || !db[dexName]) continue;
        let pending = [];
        try { pending = await db[dexName].filter(r => r._pendingSync === true).toArray(); }
        catch (_) { continue; }

        for (const row of pending) {
            const snake = camelToSnake({ ...row });
            const localId = snake.id;
            delete snake.id;
            delete snake._pending_sync;

            try {
                const { data, error } = await _sb.from(sbName).insert(snake).select().single();
                if (error) throw error;
                await db[dexName].delete(localId);
                try { await db[dexName].add({ ...row, id: data.id, _pendingSync: false }); } catch (_) {}
                uploaded++;
            } catch (e) {
                console.warn(`[Sync] Failed ${sbName} id=${localId}:`, e.message);
                failed++;
            }
        }
    }

    _syncRunning = false;

    if (uploaded > 0) {
        console.log(`[Sync] ✓ Uploaded ${uploaded} pending records`);
        showToast(`✅ تمت المزامنة — ${uploaded} سجل`, 'success');
    }
    if (failed > 0) {
        console.warn(`[Sync] ✗ ${failed} records failed`);
        scheduleSyncRetry(60000);
    }

    updateSyncBadge(_sbReady ? 'online' : 'local');
}

// ══════════════════════════════════════════════════════════════════
//  REALTIME
// ══════════════════════════════════════════════════════════════════
function startRealtimeListeners() {
    if (!_sbReady) return;

    function syncToDexie(table, payload) {
        const dex = getDexTable(table);
        if (!dex) return;
        try {
            // postgres_changes payload structure: { eventType, new, old }
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new || payload.record || {};
                const camel = snakeToCamel ? snakeToCamel(row) : row;
                // preserve pending flag if already exists
                dex.put({ ...camel, _pendingSync: false }).catch(()=>{});
            } else if (payload.eventType === 'DELETE') {
                const row = payload.old || payload.record || {};
                const camel = snakeToCamel ? snakeToCamel(row) : row;
                if (camel.id) dex.delete(camel.id).catch(()=>{});
            }
        } catch (_) { }
    }

    const tables = [
        'patients', 'appointments', 'treatments', 'prescriptions',
        'expenses', 'invoices', 'lab_orders', 'inventory', 'inventory_log',
        'tooth_states', 'patient_notes', 'doctors', 'clinic_users',
        'session_payments',
    ];
    tables.forEach(table => {
        _sb.channel(`db-${table}`)
            .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
                console.log(`[Realtime] ${table} → ${payload.eventType}`);
                // ensure local cache stays in sync
                syncToDexie(table, payload);
                refreshViewForTable(table);
            })
            .subscribe(status => {
                if (status === 'SUBSCRIBED')     console.log(`[Realtime] ✓ ${table}`);
                else if (status === 'CHANNEL_ERROR') console.warn(`[Realtime] ✗ ${table}`);
            });
    });
}

function refreshViewForTable(table) {
    const map = {
        patients:      () => { if (isViewActive('patientsView')) loadAllPatients(); if (isViewActive('dashboardView')) updateDashboard(); },
        appointments:  () => { if (isViewActive('appointmentsView')) loadAppointments(); if (isViewActive('calendarView')) renderCalendar(); if (isViewActive('dashboardView')) updateDashboard(); },
        treatments:    () => { if (currentProfilePatientId && isViewActive('profileView')) loadPatientHistory(currentProfilePatientId); if (isViewActive('dashboardView')) updateDashboard(); },
        prescriptions: () => { if (isViewActive('prescriptionsView')) loadPrescriptions(); },
        expenses:      () => { if (isViewActive('expensesView')) loadExpenses(); if (isViewActive('reportsView')) loadReports(); },
        invoices:      () => { if (isViewActive('invoicesView') && window.loadInvoices) loadInvoices(); },
        lab_orders:    () => { if (isViewActive('labView') && window.loadLabOrders) loadLabOrders(); },
        inventory:     () => { if (isViewActive('inventoryView') && window.loadInventory) loadInventory(); checkInventoryAlerts(); },
        inventory_log: () => { if (isViewActive('inventoryView') && window.loadInventory) loadInventory(); },
        tooth_states:  () => {
            if (currentProfilePatientId && isViewActive('profileView')) {
                loadPatientHistory(currentProfilePatientId);
                // also refresh the dental chart if visible
                if (typeof window.generateDentalChart === 'function') {
                    window.generateDentalChart(currentProfilePatientId);
                }
            }
        },
        patient_notes: () => { if (currentProfilePatientId && isViewActive('profileView')) loadPatientNotes(currentProfilePatientId); },
        doctors:       () => { if (isViewActive('doctorsView') && window.loadDoctors) loadDoctors(); if (isViewActive('dashboardView')) updateDashboard(); },
        clinic_users:  () => { if (isViewActive('usersView') && window.loadClinicUsers) loadClinicUsers(); },
        session_payments: () => { if (currentProfilePatientId && isViewActive('profileView')) loadPatientHistory(currentProfilePatientId); },
    };
    if (map[table]) map[table]();
}

function isViewActive(viewId) {
    return document.getElementById(viewId)?.classList.contains('active');
}

// suppress noisy 400 responses from tooth_states endpoint (seen during realtime updates)
(function() {
    if (!window.fetch) return;
    const _origFetch = window.fetch;
    window.fetch = function(input, init) {
        return _origFetch(input, init).then(resp => {
            try {
                const url = typeof input === 'string' ? input : input.url || '';
                if (url.includes('/rest/v1/tooth_states') && resp.status === 400) {
                    console.warn('[SupabaseFetch] ignored tooth_states 400 response');
                    // swallow error by returning a successful response clone
                    const clone = resp.clone();
                    Object.defineProperty(clone, 'ok', { value: true });
                    return clone;
                }
            } catch (_e) {}
            return resp;
        }).catch(err => {
            // propagate other errors normally
            return Promise.reject(err);
        });
    };
})();

// ══════════════════════════════════════════════════════════════════
//  SYNC BADGE
// ══════════════════════════════════════════════════════════════════
function updateSyncBadge(state) {
    // if offline_first_patch is active it hides syncBadge and uses its own badge;
    // in that case we simply keep syncBadge hidden and return early.
    const offlineBadge = document.getElementById('offlineBadge');
    const el = document.getElementById('syncBadge');
    if (!el) return;
    if (offlineBadge) {
        // ensure syncBadge stays out of sight
        el.style.display = 'none';
        el.classList.add('hidden');
        return;
    }

    const s = {
        online:  ['🟢', '#15803d', 'Cloud Sync'],
        local:   ['💾', '#64748b', 'Local Only'],
        syncing: ['🔄', '#1d4ed8', 'Syncing…'],
        error:   ['🔴', '#dc2626', 'Sync Error'],
    }[state] || ['💾', '#64748b', 'Local'];
    el.innerHTML = `<span style="color:${s[1]};font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px">${s[0]} ${s[2]}</span>`;
    el.classList.remove('hidden');
}

// ══════════════════════════════════════════════════════════════════
//  NETWORK EVENTS
// ══════════════════════════════════════════════════════════════════
if (!window._supabaseNetworkHandlers) {
    window._supabaseNetworkHandlers = true;

    window.addEventListener('online', async () => {
        console.log('[Network] Back online — reconnecting…');
        updateSyncBadge('syncing');
        const ok = await initSupabase();
        if (ok) updateSyncBadge('online');
    });

    window.addEventListener('offline', () => {
        console.log('[Network] Gone offline');
        _sbReady = false;
        updateSyncBadge('local');
    });
}

// ══════════════════════════════════════════════════════════════════
//  MIGRATION — one-time push of existing Dexie data to Supabase
// ══════════════════════════════════════════════════════════════════
async function migrateLocalToSupabase() {
    if (!_sbReady) return 0;
    updateSyncBadge('syncing');
    const pairs = [
        ['patients','patients'],['appointments','appointments'],['treatments','treatments'],
        ['expenses','expenses'],['prescriptions','prescriptions'],
        ['inventory','inventory'],['labOrders','lab_orders'],
        ['doctors','doctors'],['clinicUsers','clinic_users'],
        ['sessionPayments','session_payments'],
    ];
    let count = 0;
    for (const [dexName, sbName] of pairs) {
        if (typeof db === 'undefined' || !db[dexName]) continue;
        const rows = await db[dexName].toArray();
        for (const row of rows) {
            const snake = camelToSnake(row);
            delete snake.id;
            delete snake._pending_sync;
            const { error } = await _sb.from(sbName).insert(snake);
            if (!error) count++;
        }
    }
    updateSyncBadge('online');
    return count;
}

// ══════════════════════════════════════════════════════════════════
//  GLOBAL EXPORTS
// ══════════════════════════════════════════════════════════════════
window.isSupabaseConfigured   = isSupabaseConfigured;
window.initSupabase           = initSupabase;
window.dbGetAll               = dbGetAll;
window.dbInsert               = dbInsert;
window.dbUpdate               = dbUpdate;
window.dbDelete               = dbDelete;
window.dbUpsert               = dbUpsert;
window.updateSyncBadge        = updateSyncBadge;
window.migrateLocalToSupabase = migrateLocalToSupabase;
window.uploadPendingRecords   = uploadPendingRecords;
window.scheduleSyncRetry      = scheduleSyncRetry;

// ✅ _sbReady يشتغل بالطريقتين:
//    window._sbReady()   → true/false  (زي ما app.js و startup_preload.js بيعملوا)
//    if (window._sbReady) → true/false  (boolean check)
const _sbReadyFn = function() { return _sbReady; };
Object.defineProperty(_sbReadyFn, Symbol.toPrimitive, { value: (hint) => hint === 'number' ? +_sbReady : _sbReady });
Object.defineProperty(_sbReadyFn, 'valueOf',           { value: () => _sbReady });
window._sbReady = _sbReadyFn;

Object.defineProperty(window, '_sb', { get: () => _sb, configurable: true });
