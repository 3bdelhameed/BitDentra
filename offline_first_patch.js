// ══════════════════════════════════════════════════════════════════
//  offline_first_patch.js  v3.2  — Offline Filter Fix
//
//  v3.2 fixes (إضافة على v3.1):
//  ✅ dexieGetAll أوف لاين → بيعمل client-side filtering صح
//     (كان بيرجع كل الـ rows بدون filter → الدفعات مش كانت بتتعرض)
//  ✅ dbGetAll أوف لاين → بيطبّق نفس الـ filters
//  ✅ session_payments preload → بيتضاف في PRELOAD_TABLES
//  ✅ recalcTreatmentPaid أوف لاين → بيشتغل من Dexie صح
//  ✅ باقي fixes v3.1 محتفظ بيها
// ══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── TABLE MAP ────────────────────────────────────────────────
    const TABLE_TO_DEXIE = {
        patients:         'patients',
        appointments:     'appointments',
        treatments:       'treatments',
        expenses:         'expenses',
        prescriptions:    'prescriptions',
        xrays:            'xrays',
        tooth_states:     'toothStates',
        patient_notes:    'patientNotes',
        invoices:         'invoices',
        inventory:        'inventory',
        lab_orders:       'labOrders',
        inventory_log:    'inventoryLog',
        doctors:          'doctors',
        session_payments: 'session_payments'
    };

    // ══════════════════════════════════════════════════════════════
    //  QUEUE — localStorage
    // ══════════════════════════════════════════════════════════════
    const QUEUE_KEY = 'clinic_offline_queue_v3';

    function getQueue() {
        try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
        catch { return []; }
    }

    function saveQueue(q) {
        try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
        catch (e) { console.warn('[Offline] saveQueue error:', e); }
    }

    function addToQueue(action, table, data, id = null) {
        let q = getQueue();

        if (action === 'delete' && id) {
            q = q.filter(op => !(op.table === table && String(op.id) === String(id)));
            q.push({ action: 'delete', table, data: null, id, ts: Date.now() });
        } else if (action === 'update' && id) {
            const existingIdx = q.findIndex(op =>
                op.action === 'update' && op.table === table && String(op.id) === String(id)
            );
            if (existingIdx >= 0) {
                q[existingIdx].data = { ...q[existingIdx].data, ...data };
                q[existingIdx].ts   = Date.now();
            } else {
                q.push({ action, table, data, id, ts: Date.now() });
            }
        } else {
            q.push({ action, table, data, id, ts: Date.now() });
        }

        saveQueue(q);
        updateBadge();
    }

    // ══════════════════════════════════════════════════════════════
    //  DEXIE HELPERS
    // ══════════════════════════════════════════════════════════════
    function getDexieStore(table) {
        const dStore = TABLE_TO_DEXIE[table];
        if (!dStore) return null;
        const db = window.db;
        if (!db || !db[dStore]) return null;
        return db[dStore];
    }

    /**
     * ✅ v3.2 FIX: applyFilters — يطبّق filters على array محلية
     * بيدعم: { patient_id: 1 }, { treatment_id: 5 }, etc.
     * يدعم camelCase و snake_case في نفس الوقت
     */
    function applyFilters(rows, filters) {
        if (!filters || typeof filters !== 'object') return rows;
        const entries = Object.entries(filters);
        if (entries.length === 0) return rows;

        return rows.filter(row => {
            return entries.every(([key, val]) => {
                // جرّب الـ key الأصلي أولاً
                if (row[key] !== undefined) {
                    return String(row[key]) === String(val);
                }
                // جرّب camelCase ↔ snake_case تحويل
                const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
                if (row[camel] !== undefined) {
                    return String(row[camel]) === String(val);
                }
                const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                if (row[snake] !== undefined) {
                    return String(row[snake]) === String(val);
                }
                return false;
            });
        });
    }

    /**
     * ✅ v3.2 FIX: dexieGetAll بيعمل filtering صح
     */
    async function dexieGetAll(table, filters) {
        const store = getDexieStore(table);
        if (!store) {
            console.warn('[Offline] dexieGetAll: store not found for', table);
            return [];
        }
        try {
            let rows = (await store.toArray()) || [];
            // طبّق الـ filters لو موجودة
            if (filters && Object.keys(filters).length > 0) {
                rows = applyFilters(rows, filters);
            }
            return rows;
        } catch (e) {
            console.warn('[Offline] dexieGetAll error for', table, e);
            return [];
        }
    }

    async function dexieUpsert(table, data) {
        const store = getDexieStore(table);
        if (!store) {
            console.warn('[Offline] dexieUpsert: store not found for', table, '– data will be missed', data);
            return;
        }
        try {
            if (Array.isArray(data)) {
                if (data.length) await store.bulkPut(data);
            } else if (data && typeof data === 'object') {
                await store.put(data);
            }
        } catch (e) { /* silent */ }
    }

    async function dexieDelete(table, id) {
        const store = getDexieStore(table);
        if (!store) {
            console.warn('[Offline] dexieDelete: store not found for', table);
            return;
        }
        try { await store.delete(id); } catch (e) { /* silent */ }
    }

    /**
     * حفظ Supabase response في Dexie بدون مسح التعديلات المحلية المعلقة
     */
    async function safeDexieSync(table, supabaseRows) {
        if (!supabaseRows) return;
        const pendingQueue = getQueue();
        const pendingIds   = new Set(
            pendingQueue
                .filter(op => op.table === table && op.id)
                .map(op => String(op.id))
        );
        const hasPendingInserts = pendingQueue.some(op => op.table === table && op.action === 'insert');
        const supabaseIds = new Set(supabaseRows.filter(r => r.id).map(r => String(r.id)));
        const store = getDexieStore(table);

        if (hasPendingInserts) {
            const safeRows = supabaseRows.filter(row => row.id && !pendingIds.has(String(row.id)));
            await dexieUpsert(table, safeRows);
        } else {
            const safeRows = supabaseRows.filter(row => !row.id || !pendingIds.has(String(row.id)));
            await dexieUpsert(table, safeRows);

            if (store && supabaseIds.size > 0) {
                try {
                    const localRows = await store.toArray();
                    const toDelete = localRows
                        .filter(r => r.id
                            && !r._localOnly
                            && !supabaseIds.has(String(r.id))
                            && !pendingIds.has(String(r.id)))
                        .map(r => r.id);
                    if (toDelete.length > 0) {
                        await store.bulkDelete(toDelete);
                        console.log(`[Offline] 🗑️ Cleaned ${toDelete.length} deleted rows from Dexie[${table}]`);
                    }
                } catch (e) { /* silent */ }
            }
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  SYNC ENGINE
    // ══════════════════════════════════════════════════════════════
    let _isSyncing = false;

    async function syncQueue() {
        if (_isSyncing || !navigator.onLine) return;

        const q = getQueue();
        if (!q.length) { updateBadge(); return; }
        console.log('[Offline] current queue items:', q);

        const sbOk = () => window._sbReady
            ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
            : !!window._sb;

        if (!sbOk()) {
            setTimeout(syncQueue, 2000);
            return;
        }

        _isSyncing = true;
        updateBadge();
        console.log(`[Offline] 🔄 Syncing ${q.length} operations...`);

        const failed  = [];
        let   synced  = 0;

        for (const op of q) {
            try {
                if (op.action === 'insert') {
                    const { id: _localId, _localOnly, _pendingSync, _pendingOp, ...cleanData } = op.data || {};

                    // ✅ FIX: تحقق أولاً إن السجل مش موجود بالفعل في Supabase (منع duplicate)
                    let inserted = null;
                    const keyFields = Object.fromEntries(
                        Object.entries(cleanData).filter(([k, v]) =>
                            v !== null && v !== undefined && !k.startsWith('_') &&
                            ['treatment_id','patient_id','amount','paid_at','session_num'].includes(k)
                        )
                    );
                    if (Object.keys(keyFields).length >= 2) {
                        try {
                            const { data: existing } = await window._sb
                                .from(op.table).select('id').match(keyFields).limit(1);
                            if (existing && existing.length > 0) {
                                inserted = existing[0];
                                console.log(`[Offline] ℹ️ Record already exists in ${op.table}, skipping insert`);
                            }
                        } catch (_) {}
                    }

                    if (!inserted) {
                        const { data: sbInserted, error } = await window._sb
                            .from(op.table)
                            .insert(cleanData)
                            .select()
                            .single();
                        if (error) throw error;
                        inserted = sbInserted;
                    }

                    if (inserted && inserted.id) {
                        // ✅ FIX: احذف الـ local record بالـ tempId واضيف الـ real record
                        if (_localId) await dexieDelete(op.table, _localId);
                        await dexieUpsert(op.table, { ...inserted, _localOnly: false });

                        // ✅ FIX: حدّث الـ in-memory cache في session_payments.js
                        if (op.table === 'session_payments') {
                            try {
                                // اشيل الـ temp record واضيف الـ real record
                                if (window._spCacheRemove) window._spCacheRemove(_localId);
                                if (window._spCacheAdd)    window._spCacheAdd({ ...inserted, _localOnly: false });
                                // امسح من localStorage
                                const ls = JSON.parse(localStorage.getItem('sp_pending_payments') || '[]');
                                localStorage.setItem('sp_pending_payments',
                                    JSON.stringify(ls.filter(p => String(p.id) !== String(_localId))));
                            } catch(_) {}
                        }

                        // ✅ FIX: لو كانت دفعة → recalc الـ paid في treatments
                        if (op.table === 'session_payments' && inserted.treatment_id) {
                            try {
                                const allPays = await dexieGetAll('session_payments', { treatment_id: inserted.treatment_id });
                                const newTotal = allPays.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                                await dexieUpsert('treatments', { id: inserted.treatment_id, paid: newTotal });
                                if (window._sb) {
                                    await window._sb.from('treatments').update({ paid: newTotal }).eq('id', inserted.treatment_id);
                                }
                            } catch (_) {}
                        }
                    }

                } else if (op.action === 'update') {
                    const { _localOnly, _pendingSync, _pendingOp, id: _ignoreId, ...cleanUpdateData } = op.data || {};
                    const { error } = await window._sb
                        .from(op.table)
                        .update(cleanUpdateData)
                        .eq('id', op.id);
                    if (error) throw error;
                    await dexieUpsert(op.table, { ...cleanUpdateData, id: op.id, _localOnly: false });

                } else if (op.action === 'delete') {
                    const { error } = await window._sb
                        .from(op.table)
                        .delete()
                        .eq('id', op.id);
                    if (error) throw error;
                    await dexieDelete(op.table, op.id);
                }

                synced++;
            } catch (e) {
                console.warn(`[Offline] ❌ Sync failed (${op.action} ${op.table}):`, e.message);
                failed.push(op);
            }
        }

        saveQueue(failed);
        _isSyncing = false;
        updateBadge();

        if (synced > 0) {
            console.log(`[Offline] ✅ Synced ${synced} operations`);
            if (typeof showToast === 'function') {
                showToast(`✅ تمت المزامنة — ${synced} عملية`, 'success');
            }
            // ✅ امسح الـ localStorage fallback لـ session_payments بعد الـ sync
            try { localStorage.removeItem('sp_pending_payments'); } catch(_) {}
            // ✅ FIX: لو بروفايل المريض مفتوح → رفرش الدفعات بعد الـ sync
            if (typeof window.renderSessionPayments === 'function' && window.currentProfilePatientId) {
                setTimeout(() => window.renderSessionPayments(window.currentProfilePatientId), 300);
            }
        }

        if (failed.length > 0) {
            console.warn(`[Offline] ${failed.length} operations failed, will retry in 30s`);
            if (typeof showToast === 'function') {
                showToast(`⚠️ فشلت ${failed.length} عملية في المزامنة، ستُعاد المحاولة`, 'warning');
            }
            setTimeout(syncQueue, 30000);
        }
    }

    async function safeRefreshFromSupabase() {
        if (!navigator.onLine || !window._sb) return;
        const sbOk = window._sbReady
            ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
            : false;
        if (!sbOk) return;

        if (window._appCache) window._appCache.loaded = false;

        for (const [table] of Object.entries(TABLE_TO_DEXIE)) {
            try {
                const { data, error } = await window._sb.from(table).select('*').limit(5000);
                if (error || !data) continue;
                await safeDexieSync(table, data);
            } catch (e) { /* skip */ }
        }

        refreshCurrentView();
    }

    // ══════════════════════════════════════════════════════════════
    //  WRAP dbGetAll — ✅ v3.2: filtering صح أوف لاين
    // ══════════════════════════════════════════════════════════════
    function wrapDbGetAll() {
        const orig = window.dbGetAll;
        if (!orig || orig._v3Wrapped) return;

        window.dbGetAll = async function (table, filters) {
            // ✅ أوف لاين → Dexie مع filtering صح
            if (!navigator.onLine) {
                const rows = await dexieGetAll(table, filters);
                console.log(`[Offline] dexieGetAll[${table}] filters:`, filters, '→', rows.length, 'rows');
                return rows;
            }

            // أون لاين → Supabase مع timeout + Dexie fallback
            try {
                const result = await Promise.race([
                    orig(table, filters),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
                ]);
                const arrFromServer = result || [];

                if (arrFromServer.length > 0) safeDexieSync(table, arrFromServer).catch(() => {});

                // إخفاء الـ pending deletes
                const pendingDeletes = getQueue().filter(op => op.table === table && op.action === 'delete' && op.id != null);
                let arr = arrFromServer;
                if (pendingDeletes.length > 0) {
                    const idsToHide = new Set(pendingDeletes.map(o => String(o.id)));
                    arr = arr.filter(r => !idsToHide.has(String(r.id)));
                }

                // ✅ v3.2: لو الـ Supabase رجّع نتيجة فاضية بسبب filter خاطئ أو مش موجود
                // جرّب الـ Dexie كـ fallback
                if (arr.length === 0 && filters) {
                    const dexieRows = await dexieGetAll(table, filters);
                    if (dexieRows.length > 0) {
                        console.log(`[Offline] Supabase returned 0 rows for ${table}, using Dexie (${dexieRows.length} rows)`);
                        return dexieRows;
                    }
                }

                return arr;
            } catch (err) {
                console.warn(`[Offline] Supabase unavailable (${table}), using Dexie`);
                const local = await dexieGetAll(table, filters);
                if (local.length > 0 && typeof showToast === 'function') {
                    showToast('📵 تعذّر الاتصال — جاري عرض البيانات المحلية', 'warning');
                }
                return local.length > 0 ? local : [];
            }
        };
        window.dbGetAll._v3Wrapped = true;
        window.dbGetAll._offlineFirstWrapped = true;
        console.log('[Offline] ✓ dbGetAll wrapped (v3.2 with offline filtering)');
    }

    // ══════════════════════════════════════════════════════════════
    //  WRAP dbInsert
    // ══════════════════════════════════════════════════════════════
    function wrapDbInsert() {
        const orig = window.dbInsert;
        if (!orig || orig._v3Wrapped) return;

        window.dbInsert = async function (table, data) {
            const sbOk = window._sbReady
                ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
                : false;

            if (!navigator.onLine || !sbOk || !window._sb) {
                const tempId = Date.now();
                await dexieUpsert(table, { ...data, id: tempId, _localOnly: true });
                addToQueue('insert', table, { ...data, id: tempId });
                if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامَن عند عودة الاتصال', 'warning');
                updateBadge();
                return { ...data, id: tempId, _offline: true };
            }

            try {
                const { _localOnly, _pendingSync, _pendingOp, ...cleanData } = data;
                const { data: inserted, error } = await window._sb
                    .from(table)
                    .insert(cleanData)
                    .select()
                    .single();
                if (error) throw error;
                await dexieUpsert(table, { ...inserted, _localOnly: false });
                return inserted;
            } catch (e) {
                console.warn('[Offline] dbInsert failed, queuing:', e.message);
                const tempId = Date.now();
                await dexieUpsert(table, { ...data, id: tempId, _localOnly: true });
                addToQueue('insert', table, { ...data, id: tempId });
                if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامَن عند عودة الاتصال', 'warning');
                updateBadge();
                return { ...data, id: tempId, _queued: true };
            }
        };
        window.dbInsert._v3Wrapped = true;
        window.dbInsert._offlineFirstWrapped = true;
        console.log('[Offline] ✓ dbInsert wrapped (v3.2)');
    }

    // ══════════════════════════════════════════════════════════════
    //  WRAP dbUpdate
    // ══════════════════════════════════════════════════════════════
    function wrapDbUpdate() {
        const orig = window.dbUpdate;
        if (!orig || orig._v3Wrapped) return;

        window.dbUpdate = async function (table, id, data) {
            const { _localOnly, _pendingSync, _pendingOp, ...cleanData } = data || {};
            await dexieUpsert(table, { ...cleanData, id });

            const sbOk = window._sbReady
                ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
                : false;

            if (!navigator.onLine || !sbOk || !window._sb) {
                addToQueue('update', table, cleanData, id);
                updateBadge();
                return { data: cleanData, _offline: true };
            }

            try {
                const { error } = await window._sb.from(table).update(cleanData).eq('id', id);
                if (error) throw error;
                return { data: cleanData, _updated: true };
            } catch (e) {
                console.warn('[Offline] dbUpdate failed, queuing:', e.message);
                addToQueue('update', table, cleanData, id);
                if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامن لاحقاً', 'warning');
                return { data: cleanData, _queued: true };
            }
        };
        window.dbUpdate._v3Wrapped = true;
        window.dbUpdate._offlineFirstWrapped = true;
        console.log('[Offline] ✓ dbUpdate wrapped (v3.2)');
    }

    // ══════════════════════════════════════════════════════════════
    //  WRAP dbDelete
    // ══════════════════════════════════════════════════════════════
    function wrapDbDelete() {
        const orig = window.dbDelete;
        if (!orig || orig._v3Wrapped) return;

        window.dbDelete = async function (table, id) {
            if (id == null) {
                console.error('[Offline] dbDelete called without id for table', table);
            }

            await dexieDelete(table, id);

            const sbOk = window._sbReady
                ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
                : !!window._sb;

            if (!navigator.onLine || !sbOk || !window._sb) {
                console.log(`[Offline] queuing DELETE ${table} id=${id}`);
                addToQueue('delete', table, null, id);
                if (typeof showToast === 'function') {
                    showToast('💾 تم الحذف محلياً — سيُزامن لاحقاً', 'warning');
                }
                return { _offline: true };
            }

            try {
                return await orig(table, id);
            } catch (e) {
                console.warn('[Offline] dbDelete failed, queuing:', e.message);
                addToQueue('delete', table, null, id);
                if (typeof showToast === 'function') {
                    showToast('💾 خطأ أثناء الحذف — سيتم إعادة المحاولة', 'warning');
                }
                return { _queued: true };
            }
        };
        window.dbDelete._v3Wrapped = true;
        window.dbDelete._offlineFirstWrapped = true;
        console.log('[Offline] ✓ dbDelete wrapped (v3.2)');
    }

    // ══════════════════════════════════════════════════════════════
    //  WRAP dbUpsert
    // ══════════════════════════════════════════════════════════════
    function wrapDbUpsert() {
        const orig = window.dbUpsert;
        if (!orig || orig._v3Wrapped) return;

        window.dbUpsert = async function (table, data, conflictCols) {
            await dexieUpsert(table, data);

            if (!navigator.onLine) {
                addToQueue('insert', table, data);
                return { data, _offline: true };
            }

            try {
                return await orig(table, data, conflictCols);
            } catch (e) {
                addToQueue('insert', table, data);
                return { data, _queued: true };
            }
        };
        window.dbUpsert._v3Wrapped = true;
        window.dbUpsert._offlineFirstWrapped = true;
    }

    // ══════════════════════════════════════════════════════════════
    //  PRELOAD — ✅ v3.2: يشمل session_payments
    // ══════════════════════════════════════════════════════════════
    async function preloadToDexie() {
        if (!navigator.onLine || !window._sb) return;
        const db = window.db;
        if (!db) return;

        const pendingQ = getQueue();
        if (pendingQ.length > 0) {
            console.log('[Offline] Preload: queue pending, syncing first...');
            await syncQueue();
        }

        for (const [table, dStore] of Object.entries(TABLE_TO_DEXIE)) {
            try {
                if (!db[dStore]) continue;
                const { data, error } = await window._sb.from(table).select('*').limit(5000);
                if (!error && data) {
                    await safeDexieSync(table, data);
                    if (data.length > 0)
                        console.log(`[Offline] Synced ${data.length} rows → ${table}`);
                }
            } catch (e) { /* skip */ }
        }
        console.log('[Offline] ✓ Dexie full sync complete (v3.2)');
    }

    // ══════════════════════════════════════════════════════════════
    //  ✅ v3.2: PATCH session_payments — Dexie-aware recalc
    //  recalcTreatmentPaid أوف لاين بيجيب من Dexie مباشرة
    // ══════════════════════════════════════════════════════════════
    function patchSessionPaymentsOffline() {
        // ننتظر session_payments.js يتحمل
        const tryPatch = () => {
            // الـ recalcTreatmentPaid موجودة في session_payments.js ضمن IIFE
            // بنحتاج نعمل override على dbGetAll لـ session_payments أوف لاين
            // ده اتعمل بالفعل في wrapDbGetAll مع applyFilters
            // بس كمان نتأكد إن الـ Dexie store موجود
            if (window.db && window.db.session_payments) {
                console.log('[Offline] ✓ session_payments Dexie store confirmed');
            } else {
                console.warn('[Offline] session_payments store not in Dexie yet — will retry');
                setTimeout(tryPatch, 1000);
            }
        };
        setTimeout(tryPatch, 500);
    }

    // ══════════════════════════════════════════════════════════════
    //  REFRESH CURRENT VIEW
    // ══════════════════════════════════════════════════════════════
    function refreshCurrentView() {
        const map = {
            dashboardView:     () => typeof updateDashboard   === 'function' && updateDashboard(),
            patientsView:      () => typeof loadAllPatients   === 'function' && loadAllPatients(),
            appointmentsView:  () => typeof loadAppointments  === 'function' && loadAppointments(),
            calendarView:      () => typeof renderCalendar    === 'function' && renderCalendar(),
            prescriptionsView: () => typeof loadPrescriptions === 'function' && loadPrescriptions(),
            expensesView:      () => typeof loadExpenses      === 'function' && loadExpenses(),
            reportsView:       () => typeof loadReports       === 'function' && loadReports(),
            invoicesView:      () => typeof loadInvoices      === 'function' && loadInvoices(),
            inventoryView:     () => typeof loadInventory     === 'function' && loadInventory(),
            labView:           () => typeof loadLabOrders     === 'function' && loadLabOrders(),
            doctorsView:       () => typeof loadDoctors       === 'function' && loadDoctors(),
            profileView:       () => window.currentProfilePatientId &&
                                     typeof openPatientProfile === 'function' &&
                                     openPatientProfile(window.currentProfilePatientId),
        };
        for (const [id, fn] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el && el.classList.contains('active')) {
                try { fn(); } catch (e) {}
                break;
            }
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  REFRESH BUTTON
    // ══════════════════════════════════════════════════════════════
    window.refreshPage = async function () {
        const btn = document.getElementById('pageRefreshBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i>'; }

        try {
            if (navigator.onLine) {
                await syncQueue();
                await safeRefreshFromSupabase();
            }
            refreshCurrentView();
            if (typeof showToast === 'function') {
                const q = getQueue();
                if (!navigator.onLine) {
                    showToast('📵 أوف لاين — عارض البيانات المحلية', 'warning');
                } else if (q.length > 0) {
                    showToast(`🔄 تم التحديث — ${q.length} عملية في انتظار المزامنة`, 'warning');
                } else {
                    showToast('✅ تم التحديث والمزامنة', 'success');
                }
            }
        } catch (e) {
            refreshCurrentView();
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rotate"></i>'; }
        }
    };

    // ══════════════════════════════════════════════════════════════
    //  UI — Badge + Banner
    // ══════════════════════════════════════════════════════════════
    function updateBadge() {
        const q     = getQueue();
        const badge = document.getElementById('offlineBadge');
        if (!badge) return;
        badge.classList.remove('hidden');

        const withRefresh = html => html +
            `<button id="pageRefreshBtn" onclick="refreshPage()" title="Refresh" style="background:none;border:none;cursor:pointer;padding:0;margin-left:4px;color:#4b5563;font-size:12px"><i class="fa-solid fa-rotate"></i></button>`;

        if (!navigator.onLine) {
            badge.innerHTML = withRefresh(`
                <span style="display:flex;align-items:center;gap:4px;color:#b45309;font-size:11px;font-weight:700;cursor:pointer" onclick="window.showOfflineQueue&&showOfflineQueue()">
                    <i class="fa-solid fa-circle" style="font-size:6px;color:#ef4444;"></i>
                    <i class="fa-solid fa-wifi-slash" style="font-size:10px"></i> Offline
                    ${q.length > 0 ? `<span style="background:#ef4444;color:white;border-radius:999px;padding:0 5px;font-size:9px">${q.length}</span>` : ''}
                </span>`);
        } else if (_isSyncing) {
            badge.innerHTML = withRefresh(`
                <span style="display:flex;align-items:center;gap:4px;color:#2563eb;font-size:11px;font-weight:700">
                    <i class="fa-solid fa-rotate fa-spin" style="font-size:10px"></i> Syncing…
                </span>`);
        } else if (q.length > 0) {
            badge.innerHTML = withRefresh(`
                <span style="display:flex;align-items:center;gap:4px;color:#b45309;font-size:11px;font-weight:700;cursor:pointer" onclick="window.showOfflineQueue&&showOfflineQueue()">
                    <i class="fa-solid fa-clock-rotate-left" style="font-size:10px"></i> Pending sync
                    <span style="background:#f59e0b;color:white;border-radius:999px;padding:0 5px;font-size:9px">${q.length}</span>
                </span>`);
        } else {
            badge.innerHTML = withRefresh(`
                <span style="display:flex;align-items:center;gap:4px;color:#15803d;font-size:11px;font-weight:700">
                    <i class="fa-solid fa-circle" style="font-size:6px;color:#10b981;"></i>
                    <i class="fa-solid fa-cloud-check" style="font-size:10px"></i> Cloud Sync
                </span>`);
        }
    }

    function injectUI() {
        if (!document.getElementById('offlineBadge')) {
            const badge = document.createElement('div');
            badge.id = 'offlineBadge';
            badge.style.cssText = 'display:flex;align-items:center;padding:0 4px;gap:4px';
            const syncBadge = document.getElementById('syncBadge');
            if (syncBadge) {
                syncBadge.style.display = 'none';
                syncBadge.classList.add('hidden');
                syncBadge.parentNode.insertBefore(badge, syncBadge.nextSibling);
            } else {
                const h = document.querySelector('header');
                if (h) h.appendChild(badge);
            }
        }
        updateBadge();

        if (!document.getElementById('offlineBanner')) {
            const style = document.createElement('style');
            style.textContent = `
                #offlineBanner {
                    position:fixed; top:0; left:0; right:0;
                    background:linear-gradient(90deg,#f59e0b,#d97706);
                    color:white; text-align:center; padding:7px 16px;
                    font-size:13px; font-weight:700; z-index:99999;
                    transform:translateY(-100%); transition:transform .3s ease;
                    display:flex; align-items:center; justify-content:center; gap:8px;
                }
                #offlineBanner.show { transform:translateY(0); }
                #pageRefreshBtn:disabled { opacity:.6; cursor:not-allowed; }
            `;
            document.head.appendChild(style);
            const banner = document.createElement('div');
            banner.id = 'offlineBanner';
            banner.innerHTML = `<i class="fa-solid fa-wifi-slash"></i> أنت غير متصل — السيستم يعمل من الذاكرة المحلية`;
            document.body.prepend(banner);
            if (!navigator.onLine) banner.classList.add('show');
        }

        window.addEventListener('online',  () => {
            document.getElementById('offlineBanner')?.classList.remove('show');
        });
        window.addEventListener('offline', () => {
            document.getElementById('offlineBanner')?.classList.add('show');
        });
    }

    // ══════════════════════════════════════════════════════════════
    //  NETWORK EVENTS
    // ══════════════════════════════════════════════════════════════
    window.addEventListener('online', async () => {
        updateBadge();
        if (typeof showToast === 'function') showToast('🌐 عاد الاتصال — جاري المزامنة…', 'success');

        await new Promise(r => setTimeout(r, 2000));

        let waited = 0;
        while (waited < 30) {
            const ok = window._sbReady
                ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
                : !!window._sb;
            if (ok) break;
            await new Promise(r => setTimeout(r, 300));
            waited++;
        }

        const sbOk = window._sbReady
            ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
            : !!window._sb;

        if (!sbOk) {
            console.warn('[Offline] Online event: Supabase not ready, will retry...');
            setTimeout(syncQueue, 5000);
            return;
        }

        await syncQueue();

        const remaining = getQueue();
        if (remaining.length === 0) {
            await safeRefreshFromSupabase();
        }

        if (typeof window.preloadAllData === 'function') {
            window._appCache.loaded = false;
            await window.preloadAllData(true);
        }
        if (typeof window.renderDashboardFromCache === 'function') {
            window.renderDashboardFromCache();
        }

        refreshCurrentView();
    });

    window.addEventListener('offline', () => {
        updateBadge();
        if (typeof showToast === 'function') {
            setTimeout(() => showToast('📵 أوف لاين — بياناتك محفوظة محلياً وستُزامن لاحقاً', 'warning'), 300);
        }
    });

    setInterval(() => {
        if (navigator.onLine && getQueue().length > 0) syncQueue();
    }, 120000);

    // ══════════════════════════════════════════════════════════════
    //  HOOK: startup_preload _appCache → Dexie
    // ══════════════════════════════════════════════════════════════
    const CACHE_TABLE_MAP = {
        patients:     'patients',
        appointments: 'appointments',
        treatments:   'treatments',
    };

    function hookAppCacheToDexie() {
        let tries = 0;
        const check = async () => {
            tries++;
            if (tries > 60) return;

            const cache = window._appCache;
            if (!cache || !cache.loaded) {
                setTimeout(check, 200);
                return;
            }

            const db = window.db;
            if (!db) return;

            let wrote = 0;
            for (const [cacheKey, dStore] of Object.entries(CACHE_TABLE_MAP)) {
                try {
                    const rows = cache[cacheKey];
                    if (rows && rows.length > 0 && db[dStore]) {
                        await safeDexieSync(cacheKey, rows);
                        wrote += rows.length;
                    }
                } catch(e) { /* skip */ }
            }

            if (wrote > 0) {
                console.log('[Offline] ✅ Synced _appCache → Dexie (' + wrote + ' rows)');
            }
        };
        setTimeout(check, 300);
    }

    // ══════════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════════
    async function init() {
        let waited = 0;
        while (typeof window.dbGetAll !== 'function' && waited < 200) {
            await new Promise(r => setTimeout(r, 100));
            waited++;
        }

        wrapDbGetAll();
        wrapDbInsert();
        wrapDbUpdate();
        wrapDbDelete();
        wrapDbUpsert();
        injectUI();
        patchSessionPaymentsOffline();

        const pendingQ = getQueue();
        if (pendingQ.length > 0 && navigator.onLine) {
            let sbWait = 0;
            while (sbWait < 80) {
                const ok = window._sbReady
                    ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
                    : !!window._sb;
                if (ok) break;
                await new Promise(r => setTimeout(r, 200));
                sbWait++;
            }
            await syncQueue();
        }

        if (navigator.onLine) {
            hookAppCacheToDexie();

            let sbWait2 = 0;
            while (sbWait2 < 50) {
                const ok = window._sbReady
                    ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
                    : !!window._sb;
                if (ok) break;
                await new Promise(r => setTimeout(r, 200));
                sbWait2++;
            }
            preloadToDexie().then(() => {
                setTimeout(refreshCurrentView, 300);
            }).catch(() => {});
        } else {
            console.log('[Offline] Offline on init — will sync when online');
        }

        console.log('[Offline] ✅ v3.2 Ready — Offline filtering active');
    }

    // ══════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ══════════════════════════════════════════════════════════════
    window.syncOfflineQueue = syncQueue;

    window.showOfflineQueue = function () {
        const q = getQueue();
        if (!q.length) {
            alert('✅ كل حاجة متزامنة — مفيش عمليات معلقة');
            return;
        }
        const lines = q.map((op, i) =>
            `${i + 1}. ${op.action.toUpperCase()} → ${op.table}${op.id ? ` (id: ${op.id})` : ''}`
        ).join('\n');
        alert(`📋 عمليات في انتظار المزامنة (${q.length}):\n\n${lines}\n\nستُزامن تلقائياً لما النت يرجع`);
    };

    window.clearOfflineQueue = function () {
        if (!confirm('⚠️ مسح الـ queue؟\nستفقد التغييرات اللي مش اتزامنت لـ Supabase.')) return;
        localStorage.removeItem(QUEUE_KEY);
        updateBadge();
        if (typeof showToast === 'function') showToast('تم مسح الـ queue', 'warning');
    };

    window._offlineDebug = () => ({
        queue:   getQueue(),
        online:  navigator.onLine,
        syncing: _isSyncing,
    });

    if (document.readyState !== 'loading') {
        setTimeout(init, 150);
    } else {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 150));
    }

})();