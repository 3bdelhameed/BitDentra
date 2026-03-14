// ══════════════════════════════════════════════════════════════════
//  offline_sync_patch.js  —  Fix: Update & Delete while Offline
//  يُحمَّل بعد supabase-config.js
//
//  المشاكل اللي بيحلها:
//  1. Edit (update) وأنت أوف لاين → بيتزامن صح لما يرجع النت
//  2. Delete وأنت أوف لاين → بيتنفذ في Supabase لما يرجع النت
//  3. Insert أوف لاين كان بيعمل duplicate → اتحل
// ══════════════════════════════════════════════════════════════════

(function patchOfflineSync() {

    // ── PENDING QUEUE ─────────────────────────────────────────────
    // بنحفظ قائمة العمليات في localStorage عشان تفضل حتى لو الصفحة اتقفلت
    const QUEUE_KEY = 'clinic_offline_queue';

    function loadQueue() {
        try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
        catch (_) { return []; }
    }

    function saveQueue(q) {
        try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (_) {}
    }

    function enqueue(op) {
        // op = { type: 'insert'|'update'|'delete', table, data, id, timestamp }
        const q = loadQueue();
        // لو في update على نفس السجل، حدّث بدل ما تضيف
        if (op.type === 'update') {
            const idx = q.findIndex(e => e.type === 'update' && e.table === op.table && e.id === op.id);
            if (idx >= 0) { q[idx] = op; saveQueue(q); return; }
        }
        // لو في delete، امسح أي update أو insert سابق لنفس السجل
        if (op.type === 'delete') {
            const filtered = q.filter(e => !(e.table === op.table && e.id === op.id && e.type !== 'delete'));
            filtered.push(op);
            saveQueue(filtered);
            return;
        }
        q.push(op);
        saveQueue(q);
    }

    function dequeue(op) {
        let q = loadQueue();
        q = q.filter(e => !(e.table === op.table && e.id === op.id && e.type === op.type && e.timestamp === op.timestamp));
        saveQueue(q);
    }

    // ── TABLE MAP (Dexie name → Supabase name) ────────────────────
    const DEXIE_TO_SB = {
        patients:        'patients',
        appointments:    'appointments',
        treatments:      'treatments',
        expenses:        'expenses',
        prescriptions:   'prescriptions',
        invoices:        'invoices',
        inventory:       'inventory',
        inventoryLog:    'inventory_log',
        labOrders:       'lab_orders',
        toothStates:     'tooth_states',
        patientNotes:    'patient_notes',
        doctors:         'doctors',
        clinicUsers:     'clinic_users',
        sessionPayments: 'session_payments',
    };

    // Supabase table name → Dexie name
    const SB_TO_DEXIE = Object.fromEntries(Object.entries(DEXIE_TO_SB).map(([k,v]) => [v, k]));

    // ── HELPERS ───────────────────────────────────────────────────
    function camelToSnake(obj) {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k.replace(/([A-Z])/g, '_$1').toLowerCase()] = v;
        }
        return out;
    }

    function snakeToCamel(obj) {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
        }
        return out;
    }

    // ── PATCH dbUpdate ────────────────────────────────────────────
    const _origUpdate = window.dbUpdate;
    window.dbUpdate = async function(table, id, data) {
        // حفظ العملية في القائمة دايماً (حتى لو أونلاين — بنشيلها لو نجحت)
        const op = { type: 'update', table, id, data: camelToSnake(data), timestamp: Date.now() };

        // لو أوف لاين، احفظ في Queue وفي Dexie وارجع
        if (!window._sbReady || !window._sbReady()) {
            // احفظ في Dexie محلياً
            const dexName = SB_TO_DEXIE[table] || table;
            if (typeof db !== 'undefined' && db[dexName]) {
                try {
                    await db[dexName].update(id, { ...snakeToCamel(data), _pendingSync: true, _pendingOp: 'update' });
                } catch (_) {}
            }
            enqueue(op);
            if (typeof scheduleSyncRetry === 'function') scheduleSyncRetry();
            if (typeof showToast === 'function') showToast('💾 تعديل حُفظ محلياً — سيُزامَن عند عودة الاتصال', 'warning');
            return true;
        }

        // أونلاين: نفّذ مباشرة
        const result = await _origUpdate(table, id, data);
        return result;
    };

    // ── PATCH dbDelete ────────────────────────────────────────────
    const _origDelete = window.dbDelete;
    window.dbDelete = async function(table, id) {
        // احذف من Dexie دايماً
        const dexName = SB_TO_DEXIE[table] || table;
        if (typeof db !== 'undefined' && db[dexName]) {
            try { await db[dexName].delete(id); } catch (_) {}
        }

        // لو أوف لاين، احفظ في Queue
        if (!window._sbReady || !window._sbReady()) {
            const op = { type: 'delete', table, id, timestamp: Date.now() };
            enqueue(op);
            if (typeof scheduleSyncRetry === 'function') scheduleSyncRetry();
            return;
        }

        // أونلاين: نفّذ في Supabase
        try {
            await window._sb.from(table).delete().eq('id', id);
        } catch (e) {
            console.error('[dbDelete] Supabase error:', e.message);
            // احفظ في Queue للمحاولة لاحقاً
            enqueue({ type: 'delete', table, id, timestamp: Date.now() });
            if (typeof scheduleSyncRetry === 'function') scheduleSyncRetry();
        }
    };

    // ── PATCH dbInsert — منع الـ Duplicate ───────────────────────
    const _origInsert = window.dbInsert;
    window.dbInsert = async function(table, data) {
        // لو أوف لاين، الـ _origInsert بيحفظ في Dexie بـ _pendingSync: true
        // بس نضيف _pendingOp: 'insert' عشان uploadPendingRecords يعرف
        if (!window._sbReady || !window._sbReady()) {
            const dexName = SB_TO_DEXIE[table] || table;
            const camel = snakeToCamel(data);
            let localId = null;
            if (typeof db !== 'undefined' && db[dexName]) {
                try {
                    localId = await db[dexName].add({ ...camel, _pendingSync: true, _pendingOp: 'insert' });
                } catch (e) {
                    console.warn('[dbInsert offline] Dexie write failed:', e.message);
                }
            }
            if (typeof scheduleSyncRetry === 'function') scheduleSyncRetry();
            if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامَن عند عودة الاتصال', 'warning');
            return { ...camel, id: localId, _offline: true };
        }

        return await _origInsert(table, data);
    };

    // ── MAIN SYNC — يشتغل لما يرجع النت ──────────────────────────
    async function runFullSync() {
        if (!window._sbReady || !window._sbReady()) return;

        const _syncRunning = window._syncRunning;
        if (_syncRunning) return;

        console.log('[OfflineSync] Starting full sync...');
        let synced = 0, failed = 0;

        // ── 1. معالجة قائمة الـ Queue (updates & deletes) ────────
        const queue = loadQueue();
        for (const op of queue) {
            try {
                if (op.type === 'update') {
                    const cleanData = { ...op.data };
                    delete cleanData._pending_sync;
                    delete cleanData._pending_op;
                    delete cleanData.id;

                    const { error } = await window._sb.from(op.table).update(cleanData).eq('id', op.id);
                    if (error) throw error;

                    // حدّث Dexie وشيل الـ pending flag
                    const dexName = SB_TO_DEXIE[op.table] || op.table;
                    if (typeof db !== 'undefined' && db[dexName]) {
                        try {
                            await db[dexName].update(op.id, { ...snakeToCamel(cleanData), _pendingSync: false, _pendingOp: null });
                        } catch (_) {}
                    }

                    dequeue(op);
                    synced++;

                } else if (op.type === 'delete') {
                    const { error } = await window._sb.from(op.table).delete().eq('id', op.id);
                    if (error && !error.message?.includes('not found')) throw error;
                    dequeue(op);
                    synced++;
                }
            } catch (e) {
                console.warn(`[OfflineSync] Queue op failed (${op.type} ${op.table} #${op.id}):`, e.message);
                failed++;
            }
        }

        // ── 2. معالجة Dexie _pendingSync (inserts جديدة) ─────────
        const pairs = [
            ['patients',        'patients'],
            ['appointments',    'appointments'],
            ['treatments',      'treatments'],
            ['expenses',        'expenses'],
            ['prescriptions',   'prescriptions'],
            ['invoices',        'invoices'],
            ['inventory',       'inventory'],
            ['inventoryLog',    'inventory_log'],
            ['labOrders',       'lab_orders'],
            ['toothStates',     'tooth_states'],
            ['patientNotes',    'patient_notes'],
            ['doctors',         'doctors'],
            ['clinicUsers',     'clinic_users'],
            ['sessionPayments', 'session_payments'],
        ];

        for (const [dexName, sbName] of pairs) {
            if (typeof db === 'undefined' || !db[dexName]) continue;
            let pending = [];
            try {
                // بس السجلات اللي عليها _pendingOp: 'insert' أو مفيش _pendingOp
                pending = await db[dexName]
                    .filter(r => r._pendingSync === true && (r._pendingOp === 'insert' || !r._pendingOp))
                    .toArray();
            } catch (_) { continue; }

            for (const row of pending) {
                const localId = row.id;
                const snake = camelToSnake({ ...row });
                delete snake.id;
                delete snake._pending_sync;
                delete snake._pending_op;

                try {
                    // تحقق إذا السجل موجود بالفعل في Supabase (منع duplicate)
                    // بنبحث بـ created_at + أول حقل تعريفي
                    const { data: existing } = await window._sb
                        .from(sbName)
                        .select('id')
                        .match(snake)
                        .limit(1);

                    let realId;
                    if (existing && existing.length > 0) {
                        // السجل موجود بالفعل، بس حدّث الـ ID المحلي
                        realId = existing[0].id;
                    } else {
                        const { data: inserted, error } = await window._sb
                            .from(sbName)
                            .insert(snake)
                            .select()
                            .single();
                        if (error) throw error;
                        realId = inserted.id;
                    }

                    // حدّث Dexie بالـ ID الحقيقي
                    await db[dexName].delete(localId);
                    try {
                        await db[dexName].add({ ...row, id: realId, _pendingSync: false, _pendingOp: null });
                    } catch (_) {}
                    synced++;

                } catch (e) {
                    console.warn(`[OfflineSync] Insert failed ${sbName} localId=${localId}:`, e.message);
                    failed++;
                }
            }
        }

        if (synced > 0) {
            console.log(`[OfflineSync] ✅ Synced ${synced} operations`);
            if (typeof showToast === 'function') showToast(`✅ تمت المزامنة — ${synced} عملية`, 'success');
            // رفرش الواجهة
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof loadAllPatients === 'function' && typeof isViewActive === 'function' && isViewActive('patientsView')) loadAllPatients();
            if (typeof loadAppointments === 'function' && typeof isViewActive === 'function' && isViewActive('appointmentsView')) loadAppointments();
        }
        if (failed > 0) {
            console.warn(`[OfflineSync] ❌ ${failed} operations failed — will retry`);
            if (typeof scheduleSyncRetry === 'function') scheduleSyncRetry(60000);
        }
    }

    // ── استبدال uploadPendingRecords بالنسخة الجديدة ─────────────
    window.uploadPendingRecords = runFullSync;

    // ── استمع لحدث عودة النت ──────────────────────────────────────
    if (!window._offlineSyncNetworkPatch) {
        window._offlineSyncNetworkPatch = true;

        window.addEventListener('online', async () => {
            // انتظر ثانيتين عشان Supabase يتأكد من الاتصال أول
            setTimeout(async () => {
                if (window._sbReady && window._sbReady()) {
                    await runFullSync();
                }
            }, 2000);
        });
    }

    // ── Badge: اعرض عدد العمليات المعلقة ─────────────────────────
    function updatePendingBadge() {
        const queue = loadQueue();
        const dexPending = 0; // بنحسبه async لو محتاجين

        let badge = document.getElementById('pendingSyncBadge');
        if (queue.length === 0) {
            if (badge) badge.style.display = 'none';
            return;
        }
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'pendingSyncBadge';
            badge.style.cssText = `
                position: fixed; bottom: 16px; left: 16px; z-index: 9999;
                background: #f59e0b; color: #fff; font-size: 12px; font-weight: 700;
                padding: 6px 14px; border-radius: 20px; box-shadow: 0 2px 8px rgba(0,0,0,.2);
                display: flex; align-items: center; gap: 6px; cursor: pointer;
            `;
            badge.title = 'انقر لمحاولة المزامنة';
            badge.addEventListener('click', () => {
                if (window._sbReady && window._sbReady()) runFullSync();
                else if (typeof showToast === 'function') showToast('لا يوجد اتصال بالإنترنت', 'error');
            });
            document.body.appendChild(badge);
        }
        badge.style.display = 'flex';
        badge.innerHTML = `⏳ ${queue.length} عملية معلقة`;
    }

    // حدّث الـ badge كل 5 ثواني
    setInterval(updatePendingBadge, 5000);
    updatePendingBadge();

    console.log('[OfflineSync] ✅ Patch loaded — update/delete/insert fully offline-safe');

})();
