// ═══════════════════════════════════════════════════════════════
//  sync_manager.js  v1.0
//
//  الفكرة بسيطة:
//  1. أول ما التطبيق يشتغل أون لاين → اجلب كل حاجة من Supabase واحفظ في Dexie
//  2. أي عملية (insert/update/delete) → احفظ في Dexie + لو أون لاين ابعت Supabase
//  3. لو أوف لاين → احفظ في Queue فقط
//  4. لما النت يرجع → ابعت الـ Queue لـ Supabase (التعديلات بتوعك أولاً)
//
//  يتحمل بعد: supabase-config.js, app.js
//  يتحمل قبل: أي ملف تاني
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── الجداول: Supabase name → Dexie store name ─────────────────
    const TABLES = {
        patients:      'patients',
        appointments:  'appointments',
        treatments:    'treatments',
        expenses:      'expenses',
        prescriptions: 'prescriptions',
        xrays:         'xrays',
        tooth_states:  'toothStates',
        patient_notes: 'patientNotes',
        invoices:      'invoices',
        inventory:     'inventory',
        lab_orders:    'labOrders',
        doctors:       'doctors',
        session_payments: 'session_payments'

    };

    const QUEUE_KEY = 'syncQueue_v1';
    let _syncing = false;

    // ════════════════════════════════════════════════════════════
    //  QUEUE
    // ════════════════════════════════════════════════════════════
    function getQueue() {
        try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
        catch { return []; }
    }

    function saveQueue(q) {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    }

    function enqueue(action, table, data, id) {
        let q = getQueue();

        if (action === 'delete') {
            // امسح أي عملية قبلها على نفس السجل
            q = q.filter(op => !(op.table === table && String(op.id) === String(id)));
            q.push({ action: 'delete', table, id });

        } else if (action === 'update') {
            // لو في update قبله على نفس السجل → merge
            const i = q.findIndex(op =>
                op.action === 'update' && op.table === table && String(op.id) === String(id)
            );
            if (i >= 0) {
                q[i].data = { ...q[i].data, ...data };
            } else {
                q.push({ action: 'update', table, data, id });
            }

        } else {
            q.push({ action: 'insert', table, data });
        }

        saveQueue(q);
        updateBadge();
    }

    // ════════════════════════════════════════════════════════════
    //  DEXIE HELPERS
    // ════════════════════════════════════════════════════════════
    function getStore(sbTable) {
        const name = TABLES[sbTable];
        return (name && window.db && window.db[name]) ? window.db[name] : null;
    }

    function snakeToCamel(obj) {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
        }
        return out;
    }

    async function dexiePut(table, row) {
        const store = getStore(table);
        if (!store || !row || row.id == null) return;
        try { await store.put(snakeToCamel(row)); } catch (e) {
            // لو فشل bulkPut بسبب id مش رقم، جرب كما هو
            try { await store.put(row); } catch (_) {}
        }
    }

    async function dexiePutMany(table, rows) {
        const store = getStore(table);
        if (!store || !rows?.length) return;
        const valid = rows.filter(r => r.id != null);
        if (!valid.length) return;
        try {
            await store.bulkPut(valid.map(r => snakeToCamel(r)));
        } catch (e) {
            // fallback: واحدة واحدة
            for (const r of valid) await dexiePut(table, r);
        }
    }

    async function dexieDelete(table, id) {
        const store = getStore(table);
        if (!store) return;
        try { await store.delete(id); } catch (_) {}
    }

    // ════════════════════════════════════════════════════════════
    //  SUPABASE HELPER
    // ════════════════════════════════════════════════════════════
    function sb() { return window._sb || null; }

    function sbReady() {
        if (!window._sbReady) return false;
        return typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady;
    }

    // ════════════════════════════════════════════════════════════
    //  STEP 1: أول تشغيل → اجلب كل حاجة من Supabase واحفظ في Dexie
    // ════════════════════════════════════════════════════════════
    async function initialSync() {
        if (!navigator.onLine || !sbReady() || !sb()) return;

        console.log('[Sync] 🔄 Initial sync from Supabase...');

        for (const [sbTable, dStore] of Object.entries(TABLES)) {
            try {
                const { data, error } = await sb().from(sbTable).select('*').limit(10000);
                if (error || !data?.length) continue;

                const store = window.db?.[dStore];
                if (!store) continue;

                // اجلب الـ IDs الموجودة في Supabase
                const sbIds = new Set(data.map(r => r.id));

                // احفظ/حدّث كل الـ rows من Supabase في Dexie
                await dexiePutMany(sbTable, data);

                // امسح من Dexie أي record مش موجود في Supabase
                // (لكن مش الـ records المحلية اللي لسه مزامنتش)
                const pending = getQueue();
                const pendingIds = new Set(
                    pending.filter(op => op.table === sbTable && op.id)
                           .map(op => String(op.id))
                );
                const localRows = await store.toArray();
                const toDelete = localRows
                    .filter(r => r.id && !sbIds.has(r.id) && !pendingIds.has(String(r.id)))
                    .map(r => r.id);
                if (toDelete.length) {
                    await store.bulkDelete(toDelete);
                    console.log(`[Sync] 🗑️ Removed ${toDelete.length} stale records from ${sbTable}`);
                }

                console.log(`[Sync] ✓ ${sbTable}: ${data.length} rows`);
            } catch (e) {
                console.warn(`[Sync] ⚠️ Failed to sync ${sbTable}:`, e.message);
            }
        }

        console.log('[Sync] ✅ Initial sync complete');
        updateBadge();
    }

    // ════════════════════════════════════════════════════════════
    //  STEP 2: لما النت يرجع → ارفع الـ Queue لـ Supabase
    // ════════════════════════════════════════════════════════════
    async function pushQueue() {
        if (_syncing || !navigator.onLine || !sbReady() || !sb()) return;

        const q = getQueue();
        if (!q.length) { updateBadge(); return; }

        _syncing = true;
        updateBadge();
        console.log(`[Sync] 🔄 Pushing ${q.length} offline operations...`);

        const failed = [];
        let done = 0;

        for (const op of q) {
            try {
                if (op.action === 'insert') {
                    // شيل الـ temp id قبل الإرسال
                    const { id: _tempId, _localOnly, ...cleanData } = op.data || {};
                    const { data: inserted, error } = await sb()
                        .from(op.table).insert(cleanData).select().single();
                    if (error) throw error;
                    // حدّث Dexie: امسح الـ temp id وحط الـ real id
                    if (_tempId) await dexieDelete(op.table, _tempId);
                    if (inserted) await dexiePut(op.table, inserted);

                } else if (op.action === 'update') {
                    const { error } = await sb()
                        .from(op.table).update(op.data).eq('id', op.id);
                    if (error) throw error;

                } else if (op.action === 'delete') {
                    const { error } = await sb()
                        .from(op.table).delete().eq('id', op.id);
                    if (error) throw error;
                }
                done++;
            } catch (e) {
                console.warn(`[Sync] ❌ ${op.action} ${op.table}:`, e.message);
                failed.push(op);
            }
        }

        saveQueue(failed);
        _syncing = false;
        updateBadge();

        if (done > 0) {
            console.log(`[Sync] ✅ Pushed ${done} operations`);
            if (typeof showToast === 'function') showToast(`✅ تمت المزامنة (${done} عملية)`, 'success');
            // بعد رفع التعديلات، اجلب من Supabase عشان تتأكد
            setTimeout(initialSync, 1000);
        }
        if (failed.length > 0) {
            console.warn(`[Sync] ${failed.length} operations failed, retrying in 30s`);
            setTimeout(pushQueue, 30000);
        }
    }

    // ════════════════════════════════════════════════════════════
    //  WRAP dbInsert / dbUpdate / dbDelete
    //  كل عملية: احفظ في Dexie + لو أون لاين ابعت Supabase
    //                            لو أوف لاين حط في Queue
    // ════════════════════════════════════════════════════════════
    function wrapAll() {
        // ── dbInsert ─────────────────────────────────────────────
        const origInsert = window.dbInsert;
        if (origInsert && !origInsert._syncWrapped) {
            window.dbInsert = async function (table, data) {
                if (!navigator.onLine || !sbReady()) {
                    // أوف لاين: حفظ مؤقت في Dexie + Queue
                    const tempId = Date.now();
                    await dexiePut(table, { ...data, id: tempId, _localOnly: true });
                    enqueue('insert', table, { ...data, id: tempId });
                    if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامن لاحقاً', 'warning');
                    return { id: tempId, ...data, _offline: true };
                }
                // أون لاين: ابعت لـ Supabase + احفظ في Dexie
                try {
                    const { data: row, error } = await sb().from(table).insert(data).select().single();
                    if (error) throw error;
                    await dexiePut(table, row);
                    return row;
                } catch (e) {
                    // فشل → Queue
                    const tempId = Date.now();
                    await dexiePut(table, { ...data, id: tempId, _localOnly: true });
                    enqueue('insert', table, { ...data, id: tempId });
                    if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامن لاحقاً', 'warning');
                    return { id: tempId, ...data, _queued: true };
                }
            };
            window.dbInsert._syncWrapped = true;
            console.log('[Sync] ✓ dbInsert wrapped');
        }

        // ── dbUpdate ─────────────────────────────────────────────
        const origUpdate = window.dbUpdate;
        if (origUpdate && !origUpdate._syncWrapped) {
            window.dbUpdate = async function (table, id, data) {
                // احفظ في Dexie فوراً دايماً
                await dexiePut(table, { ...data, id });

                if (!navigator.onLine || !sbReady()) {
                    enqueue('update', table, data, id);
                    return { data, _offline: true };
                }
                try {
                    const { error } = await sb().from(table).update(data).eq('id', id);
                    if (error) throw error;
                    return { data, _updated: true };
                } catch (e) {
                    enqueue('update', table, data, id);
                    if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامن لاحقاً', 'warning');
                    return { data, _queued: true };
                }
            };
            window.dbUpdate._syncWrapped = true;
            console.log('[Sync] ✓ dbUpdate wrapped');
        }

        // ── dbDelete ─────────────────────────────────────────────
        const origDelete = window.dbDelete;
        if (origDelete && !origDelete._syncWrapped) {
            window.dbDelete = async function (table, id) {
                // امسح من Dexie فوراً
                await dexieDelete(table, id);

                if (!navigator.onLine || !sbReady()) {
                    enqueue('delete', table, null, id);
                    return { _offline: true };
                }
                try {
                    const { error } = await sb().from(table).delete().eq('id', id);
                    if (error) throw error;
                    return { _deleted: true };
                } catch (e) {
                    enqueue('delete', table, null, id);
                    if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامن لاحقاً', 'warning');
                    return { _queued: true };
                }
            };
            window.dbDelete._syncWrapped = true;
            console.log('[Sync] ✓ dbDelete wrapped');
        }

        // ── dbGetAll ─────────────────────────────────────────────
        const origGetAll = window.dbGetAll;
        if (origGetAll && !origGetAll._syncWrapped) {
            window.dbGetAll = async function (table, filters = {}) {
                // أوف لاين → من Dexie مباشرة
                if (!navigator.onLine || !sbReady()) {
                    const store = getStore(table);
                    if (!store) return [];
                    let rows = await store.toArray();
                    // فلتر
                    for (const [k, v] of Object.entries(filters)) {
                        const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
                        rows = rows.filter(r => r[ck] == v || r[k] == v);
                    }
                    return rows.reverse();
                }
                // أون لاين → من Supabase مع Dexie كـ fallback
                try {
                    const result = await origGetAll(table, filters);
                    return result || [];
                } catch (e) {
                    const store = getStore(table);
                    if (!store) return [];
                    return (await store.toArray()).reverse();
                }
            };
            window.dbGetAll._syncWrapped = true;
            console.log('[Sync] ✓ dbGetAll wrapped');
        }
    }

    // ════════════════════════════════════════════════════════════
    //  BADGE UI
    // ════════════════════════════════════════════════════════════
    function updateBadge() {
        const q = getQueue().length;
        const badge = document.getElementById('offlineBadge') || document.getElementById('syncBadge');
        if (!badge) return;

        badge.classList.remove('hidden');
        if (!navigator.onLine) {
            badge.innerHTML = `<span style="color:#b45309;font-size:11px;font-weight:700">
                <i class="fa-solid fa-wifi-slash"></i> أوف لاين ${q > 0 ? `(${q})` : ''}</span>`;
        } else if (_syncing) {
            badge.innerHTML = `<span style="color:#2563eb;font-size:11px;font-weight:700">
                <i class="fa-solid fa-rotate fa-spin"></i> جاري المزامنة…</span>`;
        } else if (q > 0) {
            badge.innerHTML = `<span style="color:#b45309;font-size:11px;font-weight:700;cursor:pointer" onclick="window._showQueue&&window._showQueue()">
                <i class="fa-solid fa-clock-rotate-left"></i> في انتظار المزامنة (${q})</span>`;
        } else {
            badge.innerHTML = `<span style="color:#15803d;font-size:11px;font-weight:700">
                <i class="fa-solid fa-cloud-check"></i> متزامن</span>`;
        }
    }

    function injectBanner() {
        if (document.getElementById('_syncBanner')) return;
        const style = document.createElement('style');
        style.textContent = `
            #_syncBanner {
                position:fixed; top:0; left:0; right:0; z-index:99999;
                background: linear-gradient(90deg,#f59e0b,#d97706);
                color:white; text-align:center; padding:7px;
                font-size:13px; font-weight:700;
                transform:translateY(-100%); transition:transform .3s;
            }
            #_syncBanner.show { transform:translateY(0); }
        `;
        document.head.appendChild(style);
        const banner = document.createElement('div');
        banner.id = '_syncBanner';
        banner.innerHTML = '<i class="fa-solid fa-wifi-slash"></i> أنت غير متصل — التعديلات محفوظة وستُزامن لاحقاً';
        document.body.prepend(banner);
        if (!navigator.onLine) banner.classList.add('show');
    }

    // ════════════════════════════════════════════════════════════
    //  NETWORK EVENTS
    // ════════════════════════════════════════════════════════════
    window.addEventListener('offline', () => {
        updateBadge();
        document.getElementById('_syncBanner')?.classList.add('show');
        if (typeof showToast === 'function')
            showToast('📵 أوف لاين — التعديلات ستُحفظ محلياً', 'warning');
    });

    window.addEventListener('online', async () => {
        document.getElementById('_syncBanner')?.classList.remove('show');
        updateBadge();
        if (typeof showToast === 'function')
            showToast('🌐 عاد الاتصال — جاري المزامنة…', 'success');

        // انتظر Supabase يتجهز
        let tries = 0;
        while (!sbReady() && tries < 20) {
            await new Promise(r => setTimeout(r, 500));
            tries++;
        }
        if (!sbReady()) return;

        // 1. ارفع التعديلات المحلية أولاً
        await pushQueue();
        // initialSync بيتنادى تلقائياً من pushQueue بعد ما ينجح
    });

    // retry كل دقيقتين لو في queue
    setInterval(() => {
        if (navigator.onLine && sbReady() && getQueue().length > 0) pushQueue();
    }, 120000);

    // ════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ════════════════════════════════════════════════════════════
    window._showQueue = () => {
        const q = getQueue();
        if (!q.length) { alert('✅ كل حاجة متزامنة'); return; }
        const lines = q.map((op, i) =>
            `${i+1}. ${op.action.toUpperCase()} → ${op.table}${op.id ? ` (id:${op.id})` : ''}`
        ).join('\n');
        alert(`📋 عمليات معلقة (${q.length}):\n\n${lines}`);
    };

    window._clearQueue = () => {
        if (!confirm('⚠️ مسح التعديلات المحلية غير المزامنة؟')) return;
        localStorage.removeItem(QUEUE_KEY);
        updateBadge();
    };

    window.syncNow = pushQueue;

    // ════════════════════════════════════════════════════════════
    //  INIT
    // ════════════════════════════════════════════════════════════
    async function init() {
        // انتظر dbGetAll وdb يتحملوا
        let waited = 0;
        while ((!window.dbGetAll || !window.db) && waited < 100) {
            await new Promise(r => setTimeout(r, 100));
            waited++;
        }

        // wrap الدوال
        wrapAll();

        // أضف البانر
        if (document.body) injectBanner();
        else document.addEventListener('DOMContentLoaded', injectBanner);

        updateBadge();

        // لو أون لاين → اجلب من Supabase (انتظر Supabase يتجهز أول)
        if (navigator.onLine) {
            let sbWait = 0;
            while (!sbReady() && sbWait < 60) {
                await new Promise(r => setTimeout(r, 300));
                sbWait++;
            }
            if (sbReady()) {
                // لو في queue من جلسة سابقة → ارفعها أولاً
                if (getQueue().length > 0) {
                    console.log('[Sync] Found pending queue, pushing first...');
                    await pushQueue();
                } else {
                    await initialSync();
                }
            }
        } else {
            console.log('[Sync] Offline on start — will sync when online');
        }

        console.log('[Sync] ✅ Ready');
    }

    // ابدأ
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 200));
    } else {
        setTimeout(init, 200);
    }

})();
