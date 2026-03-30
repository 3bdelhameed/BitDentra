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
        session_payments: 'session_payments',
        audit_logs:       'audit_logs'
    };

    // ══════════════════════════════════════════════════════════════
    //  QUEUE — localStorage
    // ══════════════════════════════════════════════════════════════
    const QUEUE_KEY = 'clinic_offline_queue_v3';
    const SESSION_SYNC_DISABLED_KEY = 'clinic_session_sync_disabled_tables';
    const AUDIT_LOCAL_ONLY_NOTICE_KEY = 'audit_logs_local_only_notice';

    function getQueue() {
        try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
        catch { return []; }
    }

    function saveQueue(q) {
        try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
        catch (e) { console.warn('[Offline] saveQueue error:', e); }
    }

    function getSessionSyncDisabledTables() {
        try {
            const parsed = JSON.parse(sessionStorage.getItem(SESSION_SYNC_DISABLED_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function isSessionSyncDisabled(table) {
        return !!getSessionSyncDisabledTables()[table];
    }

    function disableSessionSyncForTable(table, reason = '') {
        if (!table) return;
        const current = getSessionSyncDisabledTables();
        if (!current[table]) {
            current[table] = {
                reason: String(reason || ''),
                disabled_at: new Date().toISOString()
            };
            try {
                sessionStorage.setItem(SESSION_SYNC_DISABLED_KEY, JSON.stringify(current));
            } catch (_) {}
        }
    }

    function shouldKeepTableLocalOnly(table, err) {
        if (table !== 'audit_logs') return false;
        const message = String(err?.message || err || '').toLowerCase();
        const code = String(err?.code || '').toLowerCase();
        return (
            code === '42p01' ||
            code === '42501' ||
            (message.includes('audit_logs') && (
                message.includes('schema cache') ||
                message.includes('does not exist') ||
                message.includes('relation') ||
                message.includes('permission denied') ||
                message.includes('row-level security') ||
                message.includes('rls') ||
                message.includes('could not find the table')
            ))
        );
    }

    function notifyLocalOnlyAuditMode() {
        if (typeof showToast !== 'function') return;
        try {
            if (sessionStorage.getItem(AUDIT_LOCAL_ONLY_NOTICE_KEY) === '1') return;
            sessionStorage.setItem(AUDIT_LOCAL_ONLY_NOTICE_KEY, '1');
        } catch (_) {}
        showToast('Audit Log محفوظ محليًا فقط. شغّل create_audit_logs.sql على Supabase لتفعيل مزامنته.', 'warning');
    }

    function getQueueOpId(op) {
        return op?.data?.id ?? op?.id ?? null;
    }

    function getTableLogicalKey(table, row) {
        if (!row) return '';
        if (table === 'tooth_states') {
            return getToothStateKey(row);
        }
        return '';
    }

    function getQueueOpLogicalKey(op) {
        return op?.logicalKey || getTableLogicalKey(op?.table, op?.data || op);
    }

    function getQueueDeleteExtra(table, row) {
        if (table !== 'tooth_states' || !row) return extraOrNull(null);
        const logicalKey = getTableLogicalKey(table, row);
        if (!logicalKey) return extraOrNull(null);
        return {
            logicalKey,
            patient_id: row?.patient_id ?? row?.patientId ?? null,
            tooth_number: String(row?.tooth_number ?? row?.toothNumber ?? '').trim() || null
        };
    }

    function extraOrNull(extra) {
        return extra && Object.keys(extra).length > 0 ? extra : null;
    }

    function matchesQueueTarget(op, table, id = null, logicalKey = '') {
        if (!op || op.table !== table) return false;
        const opId = getQueueOpId(op);
        if (id != null && opId != null && String(opId) === String(id)) return true;
        const opLogicalKey = getQueueOpLogicalKey(op);
        return !!logicalKey && !!opLogicalKey && opLogicalKey === logicalKey;
    }

    function mergeServerRowsWithPendingLocalRows(table, serverRows, localRows, pendingOps) {
        const merged = new Map();

        const toIdentityKey = row => {
            if (!row) return '';
            const logicalKey = getTableLogicalKey(table, row);
            if (logicalKey) return `key:${logicalKey}`;
            if (row.id != null) return `id:${row.id}`;
            return '';
        };

        const deleteIds = new Set();
        const deleteLogicalKeys = new Set();

        for (const op of pendingOps) {
            if (op.action !== 'delete') continue;
            const opId = getQueueOpId(op);
            if (opId != null) deleteIds.add(String(opId));
            const logicalKey = getQueueOpLogicalKey(op);
            if (logicalKey) deleteLogicalKeys.add(logicalKey);
        }

        for (const row of serverRows || []) {
            const rowId = row?.id;
            const logicalKey = getTableLogicalKey(table, row);
            if (rowId != null && deleteIds.has(String(rowId))) continue;
            if (logicalKey && deleteLogicalKeys.has(logicalKey)) continue;
            const identityKey = toIdentityKey(row);
            if (identityKey) merged.set(identityKey, row);
        }

        for (const row of localRows || []) {
            const identityKey = toIdentityKey(row);
            if (!identityKey) continue;

            const rowId = row?.id;
            const logicalKey = getTableLogicalKey(table, row);
            const isPendingLocal = !!row?._localOnly || !!row?._pendingSync || pendingOps.some(op => {
                if (op.action === 'delete') return false;
                if (rowId != null && getQueueOpId(op) != null && String(getQueueOpId(op)) === String(rowId)) return true;
                const opLogicalKey = getQueueOpLogicalKey(op);
                return !!logicalKey && !!opLogicalKey && opLogicalKey === logicalKey;
            });

            if (!isPendingLocal) continue;
            merged.set(identityKey, row);
        }

        return [...merged.values()].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
    }

    function normalizeLegacyQueueItem(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const action = raw.action || raw.type;
        const table = raw.table;
        if (!action || !table) return null;

        const normalized = {
            action,
            table,
            data: raw.data ?? null,
            id: raw.id ?? raw.data?.id ?? null,
            ts: raw.ts ?? raw.timestamp ?? Date.now()
        };

        const logicalKey = getTableLogicalKey(table, raw.data || raw);
        if (logicalKey) {
            normalized.logicalKey = logicalKey;
            normalized.patient_id = raw.patient_id ?? raw.data?.patient_id ?? raw.data?.patientId ?? null;
            normalized.tooth_number = raw.tooth_number ?? raw.data?.tooth_number ?? raw.data?.toothNumber ?? null;
        }

        if (raw.conflictCols) normalized.conflictCols = raw.conflictCols;
        return normalized;
    }

    function migrateLegacyQueues() {
        const legacyKeys = ['clinic_offline_queue'];
        let migrated = 0;

        legacyKeys.forEach(key => {
            let rawQueue = [];
            try { rawQueue = JSON.parse(localStorage.getItem(key) || '[]'); }
            catch (_) { rawQueue = []; }
            if (!Array.isArray(rawQueue) || rawQueue.length === 0) return;

            const normalized = rawQueue
                .map(normalizeLegacyQueueItem)
                .filter(Boolean)
                .sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));

            for (const op of normalized) {
                addToQueue(op.action, op.table, op.data, op.id, extraOrNull({
                    logicalKey: op.logicalKey,
                    patient_id: op.patient_id,
                    tooth_number: op.tooth_number,
                    conflictCols: op.conflictCols
                }));
                migrated++;
            }

            try { localStorage.removeItem(key); } catch (_) {}
        });

        if (migrated > 0) {
            console.log(`[Offline] Migrated ${migrated} operations from legacy offline queue`);
        }
    }

    function addToQueue(action, table, data, id = null, extra = null) {
        let q = getQueue();

        if (action === 'delete' && (id != null || extra?.logicalKey)) {
            const logicalKey = extra?.logicalKey || '';
            const hadUnsyncedLocalInsert = q.some(op =>
                op.action === 'insert' &&
                matchesQueueTarget(op, table, id, logicalKey)
            );
            const hadUnsyncedLocalUpsert = q.some(op =>
                op.action === 'upsert' &&
                op.data?._localOnly &&
                matchesQueueTarget(op, table, id, logicalKey)
            );

            q = q.filter(op => !matchesQueueTarget(op, table, id, logicalKey));

            const shouldKeepRemoteDelete = table === 'tooth_states' && !!logicalKey;
            if (shouldKeepRemoteDelete || !(hadUnsyncedLocalInsert || hadUnsyncedLocalUpsert)) {
                q.push({ action: 'delete', table, data: null, id, ts: Date.now(), ...(extra || {}) });
            }
        } else if (action === 'update' && id != null) {
            const existingIdx = q.findIndex(op =>
                op.action === 'update' && op.table === table && String(op.id) === String(id)
            );
            if (existingIdx >= 0) {
                q[existingIdx].data = { ...q[existingIdx].data, ...data };
                q[existingIdx].ts   = Date.now();
                if (extra) Object.assign(q[existingIdx], extra);
            } else {
                q.push({ action, table, data, id, ts: Date.now(), ...(extra || {}) });
            }
        } else if (action === 'upsert' && data) {
            const patientId = String(data.patient_id ?? data.patientId ?? '');
            const toothNumber = String(data.tooth_number ?? data.toothNumber ?? '');
            const existingIdx = (
                table === 'tooth_states' && patientId && toothNumber
            ) ? q.findIndex(op =>
                op.table === table &&
                op.action === 'upsert' &&
                String(op.data?.patient_id ?? op.data?.patientId ?? '') === patientId &&
                String(op.data?.tooth_number ?? op.data?.toothNumber ?? '') === toothNumber
            ) : -1;

            if (existingIdx >= 0) {
                q[existingIdx] = {
                    ...q[existingIdx],
                    data: { ...q[existingIdx].data, ...data },
                    id: id ?? q[existingIdx].id ?? null,
                    ts: Date.now(),
                    ...(extra || {})
                };
            } else {
                q.push({ action, table, data, id, ts: Date.now(), ...(extra || {}) });
            }
        } else {
            q.push({ action, table, data, id, ts: Date.now(), ...(extra || {}) });
        }

        saveQueue(q);
        updateBadge();
    }

    function getToothStateKey(row) {
        const patientId = String(row?.patient_id ?? row?.patientId ?? '').trim();
        const toothNumber = String(row?.tooth_number ?? row?.toothNumber ?? '').trim();
        if (!patientId || !toothNumber) return '';
        return `${patientId}::${toothNumber}`;
    }

    function getToothStatePriority(row) {
        if (!row) return -1;
        if (row._pendingSync) return 3;
        if (row._localOnly) return 1;
        return 2;
    }

    function choosePreferredToothStateRow(a, b) {
        const scoreA = getToothStatePriority(a);
        const scoreB = getToothStatePriority(b);
        if (scoreA !== scoreB) return scoreA > scoreB ? a : b;
        return Number(a?.id || 0) >= Number(b?.id || 0) ? a : b;
    }

    async function cleanupToothStateDuplicates(patientId = null, toothNumber = null) {
        const store = getDexieStore('tooth_states');
        if (!store) return 0;

        let rows = [];
        try {
            rows = await store.toArray();
        } catch (_) {
            return 0;
        }

        const filtered = rows.filter(row => {
            if (patientId != null && String(row?.patient_id ?? row?.patientId ?? '') !== String(patientId)) return false;
            if (toothNumber != null && String(row?.tooth_number ?? row?.toothNumber ?? '') !== String(toothNumber)) return false;
            return !!getToothStateKey(row);
        });

        const keepByKey = new Map();
        const deleteIds = [];

        for (const row of filtered) {
            const key = getToothStateKey(row);
            const existing = keepByKey.get(key);
            if (!existing) {
                keepByKey.set(key, row);
                continue;
            }

            const keep = choosePreferredToothStateRow(existing, row);
            const drop = keep === existing ? row : existing;
            keepByKey.set(key, keep);
            if (drop?.id != null) deleteIds.push(drop.id);
        }

        const uniqueDeleteIds = [...new Set(deleteIds.map(String))]
            .map(id => filtered.find(row => String(row.id) === id)?.id)
            .filter(id => id != null);

        if (uniqueDeleteIds.length > 0) {
            try { await store.bulkDelete(uniqueDeleteIds); } catch (_) {}
        }

        return uniqueDeleteIds.length;
    }

    async function recoverPendingToothStateQueue() {
        const store = getDexieStore('tooth_states');
        if (!store) return 0;

        let rows = [];
        try {
            rows = await store.toArray();
        } catch (_) {
            return 0;
        }

        let q = getQueue();
        let recovered = 0;

        for (const row of rows) {
            if (!row?._pendingSync) continue;

            const key = getToothStateKey(row);
            if (!key) continue;

            const [patientId, toothNumber] = key.split('::');
            const exists = q.some(op =>
                op.table === 'tooth_states' &&
                op.action === 'upsert' &&
                String(op.data?.patient_id ?? op.data?.patientId ?? '').trim() === patientId &&
                String(op.data?.tooth_number ?? op.data?.toothNumber ?? '').trim() === toothNumber
            );
            if (exists) continue;

            q.push({
                action: 'upsert',
                table: 'tooth_states',
                data: {
                    ...row,
                    patient_id: row?.patient_id ?? row?.patientId,
                    tooth_number: toothNumber,
                    _localOnly: !!row?._localOnly,
                    _pendingSync: true,
                    _pendingOp: 'upsert'
                },
                id: row?.id ?? null,
                ts: Date.now(),
                conflictCols: 'patient_id,tooth_number'
            });
            recovered++;
        }

        if (recovered > 0) {
            saveQueue(q);
            updateBadge();
            console.log(`[Offline] Recovered ${recovered} pending tooth_states operations from Dexie`);
        }

        return recovered;
    }

    // ══════════════════════════════════════════════════════════════
    //  DEXIE HELPERS
    // ══════════════════════════════════════════════════════════════
    async function recoverLocalOnlyAuditQueue() {
        if (isSessionSyncDisabled('audit_logs')) return 0;

        const store = getDexieStore('audit_logs');
        if (!store) return 0;

        let rows = [];
        try {
            rows = await store.toArray();
        } catch (_) {
            return 0;
        }

        let q = getQueue();
        let recovered = 0;

        for (const row of rows) {
            if (!row?._localOnly || row?._pendingSync) continue;

            const exists = q.some(op =>
                op.table === 'audit_logs' &&
                op.action === 'insert' &&
                String(getQueueOpId(op) ?? '') === String(row.id ?? '')
            );
            if (exists) continue;

            q.push({
                action: 'insert',
                table: 'audit_logs',
                data: {
                    ...row,
                    id: row.id,
                    _localOnly: true,
                    _pendingSync: false,
                    _pendingOp: null
                },
                id: row.id ?? null,
                ts: Date.now()
            });
            recovered++;
        }

        if (recovered > 0) {
            saveQueue(q);
            updateBadge();
            console.log(`[Offline] Recovered ${recovered} local-only audit log operations`);
        }

        return recovered;
    }

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
            // ✅ FIX: جرّب direct db access كـ fallback
            try {
                const dStore = TABLE_TO_DEXIE[table] || table;
                const directStore = window.db && window.db[dStore];
                if (directStore && !directStore._noopProxy) {
                    if (Array.isArray(data)) {
                        if (data.length) await directStore.bulkPut(data);
                    } else if (data && typeof data === 'object') {
                        await directStore.put(data);
                    }
                    return;
                }
            } catch (e2) { /* silent */ }
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

    async function keepQueueOpLocalOnly(op, reason = '') {
        if (!op || op.table !== 'audit_logs') return false;

        if (reason) {
            disableSessionSyncForTable(op.table, reason);
        }

        if (op.action === 'delete') {
            const targetId = op.id ?? op.data?.id ?? null;
            if (targetId != null) {
                await dexieDelete(op.table, targetId);
            }
            notifyLocalOnlyAuditMode();
            return true;
        }

        const recordId = op?.data?.id ?? op?.id ?? Date.now();
        const store = getDexieStore(op.table);
        let existing = null;
        if (store && recordId != null) {
            try { existing = await store.get(recordId); } catch (_) {}
        }

        await dexieUpsert(op.table, {
            ...(existing || {}),
            ...(op.data || {}),
            id: recordId,
            _localOnly: true,
            _pendingSync: false,
            _pendingOp: null
        });

        notifyLocalOnlyAuditMode();
        return true;
    }

    async function syncToothStateToSupabase(data) {
        if (!window._sb) throw new Error('supabase_not_ready');

        const patientId = data?.patient_id ?? data?.patientId;
        const toothNumber = String(data?.tooth_number ?? data?.toothNumber ?? '').trim();
        if (patientId == null || !toothNumber) {
            throw new Error('tooth_state_missing_keys');
        }

        const cleanData = { ...data, patient_id: patientId, tooth_number: toothNumber };
        delete cleanData.id;
        delete cleanData.patientId;
        delete cleanData.toothNumber;
        delete cleanData._localOnly;
        delete cleanData._pendingSync;
        delete cleanData._pendingOp;
        delete cleanData._pending_sync;
        delete cleanData._pending_op;

        const { data: existingRows, error: lookupError } = await window._sb
            .from('tooth_states')
            .select('id')
            .eq('patient_id', patientId)
            .eq('tooth_number', toothNumber)
            .order('id', { ascending: false })
            .limit(1);
        if (lookupError) throw lookupError;

        const existingId = existingRows && existingRows[0] ? existingRows[0].id : null;
        if (existingId) {
            const { data: updatedRow, error: updateError } = await window._sb
                .from('tooth_states')
                .update(cleanData)
                .eq('id', existingId)
                .select()
                .single();
            if (updateError) throw updateError;
            return updatedRow;
        }

        const { data: insertedRow, error: insertError } = await window._sb
            .from('tooth_states')
            .insert(cleanData)
            .select()
            .single();
        if (insertError) throw insertError;
        return insertedRow;
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
        const pendingLogicalKeys = new Set(
            pendingQueue
                .filter(op => op.table === table)
                .map(op => getQueueOpLogicalKey(op))
                .filter(Boolean)
        );
        const hasPendingInserts = pendingQueue.some(op => op.table === table && op.action === 'insert');
        const supabaseIds = new Set(supabaseRows.filter(r => r.id).map(r => String(r.id)));
        const store = getDexieStore(table);

        if (hasPendingInserts) {
            const safeRows = supabaseRows.filter(row =>
                row.id &&
                !pendingIds.has(String(row.id)) &&
                !pendingLogicalKeys.has(getTableLogicalKey(table, row))
            );
            await dexieUpsert(table, safeRows);
        } else {
            const safeRows = supabaseRows.filter(row =>
                !row.id ||
                (!pendingIds.has(String(row.id)) && !pendingLogicalKeys.has(getTableLogicalKey(table, row)))
            );
            await dexieUpsert(table, safeRows);

            if (store && supabaseIds.size > 0) {
                try {
                    const localRows = await store.toArray();
                    const toDelete = localRows
                        .filter(r => r.id
                            && !r._localOnly
                            && !r._pendingSync
                            && !supabaseIds.has(String(r.id))
                            && !pendingIds.has(String(r.id))
                            && !pendingLogicalKeys.has(getTableLogicalKey(table, r)))
                        .map(r => r.id);
                    if (toDelete.length > 0) {
                        await store.bulkDelete(toDelete);
                        console.log(`[Offline] 🗑️ Cleaned ${toDelete.length} deleted rows from Dexie[${table}]`);
                    }
                } catch (e) { /* silent */ }
            }
        }

        if (table === 'tooth_states') {
            try { await cleanupToothStateDuplicates(); } catch (_) {}
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  SYNC ENGINE
    // ══════════════════════════════════════════════════════════════
    let _isSyncing = false;
    let _lastSyncTime = 0;
    const SYNC_DEBOUNCE_MS = 3000; // منع sync مرتين في أقل من 3 ثواني

    async function syncQueue() {
        if (_isSyncing || !navigator.onLine) return;
        await recoverPendingToothStateQueue();
        await recoverLocalOnlyAuditQueue();


        // ✅ FIX: debounce — لو السينك خلص من أقل من 3 ثواني، تجاهل
        const now = Date.now();
        if (now - _lastSyncTime < SYNC_DEBOUNCE_MS) {
            console.log('[Offline] syncQueue debounced — too soon after last sync');
            return;
        }

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
        let   localOnlySkipped = 0;

        // ✅ FIX: خريطة تحويل الـ tempIds للـ real IDs بعد الـ insert
        // مثال: { 'patients': { 1703123456789: 42 } }
        const idRemap = {};

        // ── دالة مساعدة: حوّل الـ tempIds في أي object ──────────────
        function remapIds(data) {
            if (!data || typeof data !== 'object') return data;
            const out = { ...data };
            // حوّل patient_id
            if (out.patient_id && idRemap['patients'] && idRemap['patients'][String(out.patient_id)]) {
                out.patient_id = idRemap['patients'][String(out.patient_id)];
            }
            // حوّل treatment_id
            if (out.treatment_id && idRemap['treatments'] && idRemap['treatments'][String(out.treatment_id)]) {
                out.treatment_id = idRemap['treatments'][String(out.treatment_id)];
            }
            // حوّل appointment_id
            if (out.appointment_id && idRemap['appointments'] && idRemap['appointments'][String(out.appointment_id)]) {
                out.appointment_id = idRemap['appointments'][String(out.appointment_id)];
            }
            return out;
        }

        for (const op of q) {
            if (isSessionSyncDisabled(op.table)) {
                const skipped = await keepQueueOpLocalOnly(op);
                if (skipped) {
                    localOnlySkipped++;
                    continue;
                }
            }

            try {
                if (op.action === 'insert') {
                    let opData = op.data || {};

                    // ✅ FIX: حوّل الـ tempIds في البيانات قبل الـ insert
                    opData = remapIds(opData);

                    const { id: _localId, _localOnly, _pendingSync, _pendingOp, ...cleanData } = opData;

                    // ✅ FIX: تحقق أولاً إن السجل مش موجود بالفعل في Supabase (منع duplicate)
                    let inserted = null;
                    if (op.table === 'tooth_states') {
                        inserted = await syncToothStateToSupabase(cleanData);
                    } else {
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
                    }

                    if (inserted && inserted.id) {
                        // ✅ FIX: سجّل الـ tempId → realId في الخريطة عشان نحوّل الـ references
                        if (_localId && String(_localId) !== String(inserted.id)) {
                            if (!idRemap[op.table]) idRemap[op.table] = {};
                            idRemap[op.table][String(_localId)] = inserted.id;
                            console.log(`[Offline] 🔑 ID remap: ${op.table} ${_localId} → ${inserted.id}`);

                            // ✅ حدّث الـ Dexie: احذف الـ temp record وضيف الـ real record
                            await dexieDelete(op.table, _localId);
                            await dexieUpsert(op.table, {
                                ...inserted,
                                _localOnly: false,
                                _pendingSync: false,
                                _pendingOp: null
                            });
                            if (op.table === 'tooth_states') {
                                await cleanupToothStateDuplicates(inserted.patient_id, inserted.tooth_number);
                            }

                            // ✅ حدّث أي records في Dexie بتشاور على الـ tempId
                            // مثال: treatments بتشاور على patient_id القديم
                            if (op.table === 'patients') {
                                try {
                                    const allTr = await dexieGetAll('treatments', {});
                                    for (const tr of allTr) {
                                        const pid = tr.patient_id || tr.patientId;
                                        if (String(pid) === String(_localId)) {
                                            await dexieUpsert('treatments', { ...tr, patient_id: inserted.id, patientId: inserted.id });
                                        }
                                    }
                                    const allAppt = await dexieGetAll('appointments', {});
                                    for (const a of allAppt) {
                                        const pid = a.patient_id || a.patientId;
                                        if (String(pid) === String(_localId)) {
                                            await dexieUpsert('appointments', { ...a, patient_id: inserted.id, patientId: inserted.id });
                                        }
                                    }
                                } catch(_) {}
                            }
                        } else if (inserted) {
                            await dexieDelete(op.table, _localId);
                            await dexieUpsert(op.table, {
                                ...inserted,
                                _localOnly: false,
                                _pendingSync: false,
                                _pendingOp: null
                            });
                            if (op.table === 'tooth_states') {
                                await cleanupToothStateDuplicates(inserted.patient_id, inserted.tooth_number);
                            }
                        }

                        // ✅ FIX: حدّث الـ in-memory cache في session_payments.js
                        if (op.table === 'session_payments') {
                            try {
                                if (window._spCacheRemove) window._spCacheRemove(_localId);
                                if (window._spCacheAdd)    window._spCacheAdd({ ...inserted, _localOnly: false });
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
                    const remoteId = idRemap[op.table]?.[String(op.id)] || op.id;
                    const { error } = await window._sb
                        .from(op.table)
                        .update(cleanUpdateData)
                        .eq('id', remoteId);
                    if (error) throw error;
                    if (String(remoteId) !== String(op.id)) {
                        await dexieDelete(op.table, op.id);
                    }
                    await dexieUpsert(op.table, {
                        ...cleanUpdateData,
                        id: remoteId,
                        _localOnly: false,
                        _pendingSync: false,
                        _pendingOp: null
                    });

                } else if (op.action === 'upsert') {
                    let opData = remapIds(op.data || {});
                    const { id: _localId, _localOnly, _pendingSync, _pendingOp, ...cleanUpsertData } = opData;
                    const upserted = op.table === 'tooth_states'
                        ? await syncToothStateToSupabase(cleanUpsertData)
                        : await (async () => {
                            const { data, error } = await window._sb
                                .from(op.table)
                                .upsert(cleanUpsertData, { onConflict: op.conflictCols || 'patient_id,tooth_number' })
                                .select()
                                .single();
                            if (error) throw error;
                            return data;
                        })();

                    if (_localId && upserted && upserted.id && String(_localId) !== String(upserted.id)) {
                        if (!idRemap[op.table]) idRemap[op.table] = {};
                        idRemap[op.table][String(_localId)] = upserted.id;
                        await dexieDelete(op.table, _localId);
                    }
                    await dexieUpsert(op.table, {
                        ...upserted,
                        _localOnly: false,
                        _pendingSync: false,
                        _pendingOp: null
                    });
                    if (op.table === 'tooth_states') {
                        await cleanupToothStateDuplicates(upserted.patient_id, upserted.tooth_number);
                    }

                } else if (op.action === 'delete') {
                    if (op.table === 'tooth_states' && (op.logicalKey || (op.patient_id != null && op.tooth_number != null))) {
                        const patientId = op.patient_id ?? op.data?.patient_id ?? op.data?.patientId ?? null;
                        const toothNumber = String(op.tooth_number ?? op.data?.tooth_number ?? op.data?.toothNumber ?? '').trim();
                        const { error } = await window._sb
                            .from(op.table)
                            .delete()
                            .eq('patient_id', patientId)
                            .eq('tooth_number', toothNumber);
                        if (error) throw error;
                    } else {
                        const remoteId = idRemap[op.table]?.[String(op.id)] || op.id;
                        const { error } = await window._sb
                            .from(op.table)
                            .delete()
                            .eq('id', remoteId);
                        if (error) throw error;
                        await dexieDelete(op.table, op.id);
                        if (String(remoteId) !== String(op.id)) {
                            await dexieDelete(op.table, remoteId);
                        }
                    }
                }

                synced++;
            } catch (e) {
                if (shouldKeepTableLocalOnly(op.table, e)) {
                    await keepQueueOpLocalOnly(op, e?.message || String(e || ''));
                    localOnlySkipped++;
                    continue;
                }
                console.warn(`[Offline] ❌ Sync failed (${op.action} ${op.table}):`, e.message);
                failed.push(op);
            }
        }

        saveQueue(failed);
        _isSyncing = false;
        _lastSyncTime = Date.now(); // ✅ FIX: سجّل وقت انتهاء الـ sync للـ debounce
        updateBadge();

        if (synced > 0) {
            console.log(`[Offline] ✅ Synced ${synced} operations`);
            if (typeof showToast === 'function') {
                showToast(`✅ تمت المزامنة — ${synced} عملية`, 'success');
            }
            try { localStorage.removeItem('sp_pending_payments'); } catch(_) {}
            // امسح الـ localStorage backups بعد المزامنة
            Object.keys(TABLE_TO_DEXIE).forEach(t => {
                try { localStorage.removeItem('offline_backup_' + t); } catch(_) {}
            });
            if (typeof window.renderSessionPayments === 'function' && window.currentProfilePatientId) {
                setTimeout(() => window.renderSessionPayments(window.currentProfilePatientId), 300);
            }
        }

        if (localOnlySkipped > 0) {
            console.warn(`[Offline] Kept ${localOnlySkipped} audit log operations locally only`);
            notifyLocalOnlyAuditMode();
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
        if (!orig || orig._offlineV3Done) return;

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

                let arr = arrFromServer;
                const pendingOps = getQueue().filter(op => op.table === table);
                if (pendingOps.length > 0) {
                    const localRows = await dexieGetAll(table, filters);
                    arr = mergeServerRowsWithPendingLocalRows(table, arrFromServer, localRows, pendingOps);
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
        window.dbGetAll._offlineV3Done = true;
        window.dbGetAll._offlineFirstWrapped = true;
        console.log('[Offline] ✓ dbGetAll wrapped (v3.2 with offline filtering)');
    }

    // ══════════════════════════════════════════════════════════════
    //  WRAP dbInsert
    // ══════════════════════════════════════════════════════════════
    function wrapDbInsert() {
        const orig = window.dbInsert;
        if (!orig || orig._offlineV3Done) return;

        window.dbInsert = async function (table, data) {
            const sbOk = window._sbReady
                ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
                : false;

            // ── helper: احفظ في localStorage كـ emergency backup ──────
            function lsBackup(record) {
                try {
                    const key = 'offline_backup_' + table;
                    const existing = JSON.parse(localStorage.getItem(key) || '[]');
                    const idx = existing.findIndex(r => String(r.id) === String(record.id));
                    if (idx >= 0) existing[idx] = record;
                    else existing.push(record);
                    localStorage.setItem(key, JSON.stringify(existing));
                } catch(e) {}
            }

            async function saveLocalInsert(queueForSync) {
                const tempId = data?.id ?? Date.now();
                const record = {
                    ...data,
                    id: tempId,
                    _localOnly: true,
                    _pendingSync: false,
                    _pendingOp: null
                };
                await dexieUpsert(table, record);
                lsBackup(record);
                if (queueForSync) {
                    addToQueue('insert', table, { ...data, id: tempId });
                }
                updateBadge();
                return {
                    ...data,
                    id: tempId,
                    _localOnly: true,
                    ...(queueForSync ? { _queued: true } : { _offline: true })
                };
            }

            if (isSessionSyncDisabled(table)) {
                const localOnly = await saveLocalInsert(false);
                if (table === 'audit_logs') notifyLocalOnlyAuditMode();
                return localOnly;
            }

            // ✅ FIX: offline إذا مفيش نت أو Supabase مش جاهز
            if (!navigator.onLine || !sbOk || !window._sb) {
                const queuedLocal = await saveLocalInsert(true);
                if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامَن عند عودة الاتصال', 'warning');
                return { ...queuedLocal, _offline: true };
            }

            // ── أون لاين: جرّب Supabase مباشرةً بدون إضافة للـ queue
            try {
                const { _localOnly, _pendingSync, _pendingOp, ...cleanData } = data;

                const insertPromise = window._sb
                    .from(table)
                    .insert(cleanData)
                    .select()
                    .single();
                const timeoutPromise = new Promise((_, rej) =>
                    setTimeout(() => rej(new Error('insert_timeout')), 8000)
                );

                const { data: inserted, error } = await Promise.race([insertPromise, timeoutPromise]);
                if (error) throw error;

                // نجح → احفظ في Dexie بدون queue
                await dexieUpsert(table, { ...inserted, _localOnly: false });
                return inserted;

            } catch (e) {
                if (shouldKeepTableLocalOnly(table, e)) {
                    disableSessionSyncForTable(table, e?.message || String(e || ''));
                    const localOnly = await saveLocalInsert(false);
                    notifyLocalOnlyAuditMode();
                    return localOnly;
                }
                // فشل → دلوقتي نضيفه للـ queue كـ fallback
                if (e.message !== 'insert_timeout') {
                    console.warn('[Offline] dbInsert failed online, queuing:', e.message);
                }
                const queuedLocal = await saveLocalInsert(true);
                if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامَن عند عودة الاتصال', 'warning');
                return queuedLocal;
            }
        };
        window.dbInsert._v3Wrapped = true;
        window.dbInsert._offlineV3Done = true;
        window.dbInsert._offlineFirstWrapped = true;
        console.log('[Offline] ✓ dbInsert wrapped (v3.3 — instant save)');
    }

    // ══════════════════════════════════════════════════════════════
    //  WRAP dbUpdate
    // ══════════════════════════════════════════════════════════════
    function wrapDbUpdate() {
        const orig = window.dbUpdate;
        if (!orig || orig._offlineV3Done) return;

        window.dbUpdate = async function (table, id, data) {
            const { _localOnly, _pendingSync, _pendingOp, ...cleanData } = data || {};

            // ✅ FIX: استخدم .update() مش .put() عشان نحدّث الـ fields بس من غير ما نمسح الباقي
            try {
                const dStore = TABLE_TO_DEXIE[table] || table;
                const store = window.db && window.db[dStore];
                if (store && !store._noopProxy) {
                    await store.update(id, cleanData);
                }
            } catch (e) { /* silent */ }

            const sbOk = window._sbReady
                ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
                : false;

            if (!navigator.onLine || !sbOk || !window._sb) {
                addToQueue('update', table, cleanData, id);
                updateBadge();
                return { data: cleanData, _offline: true };
            }

            try {
                // ✅ FIX: timeout 8 ثواني
                const updatePromise = window._sb.from(table).update(cleanData).eq('id', id);
                const timeoutPromise = new Promise((_, rej) =>
                    setTimeout(() => rej(new Error('update_timeout')), 8000)
                );
                const { error } = await Promise.race([updatePromise, timeoutPromise]);
                if (error) throw error;
                return { data: cleanData, _updated: true };
            } catch (e) {
                if (e.message !== 'update_timeout') {
                    console.warn('[Offline] dbUpdate failed, queued:', e.message);
                }
                addToQueue('update', table, cleanData, id);
                if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامن لاحقاً', 'warning');
                updateBadge();
                return { data: cleanData, _queued: true };
            }
        };
        window.dbUpdate._v3Wrapped = true;
        window.dbUpdate._offlineV3Done = true;
        window.dbUpdate._offlineFirstWrapped = true;
        console.log('[Offline] ✓ dbUpdate wrapped (v3.3 — safe partial update)');
    }

    // ══════════════════════════════════════════════════════════════
    //  WRAP dbDelete
    // ══════════════════════════════════════════════════════════════
    function wrapDbDelete() {
        const orig = window.dbDelete;
        if (!orig || orig._offlineV3Done) return;

        window.dbDelete = async function (table, id) {
            if (id == null) {
                console.error('[Offline] dbDelete called without id for table', table);
            }

            // ✅ FIX: احذف من Dexie فوراً
            let deleteExtra = null;
            if (table === 'tooth_states' && id != null) {
                try {
                    const store = getDexieStore(table);
                    const existing = store ? await store.get(id) : null;
                    deleteExtra = getQueueDeleteExtra(table, existing);
                } catch (_) {}
            }

            await dexieDelete(table, id);

            const sbOk = window._sbReady
                ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
                : !!window._sb;

            if (!navigator.onLine || !sbOk || !window._sb) {
                console.log(`[Offline] queuing DELETE ${table} id=${id}`);
                addToQueue('delete', table, null, id, deleteExtra);
                if (typeof showToast === 'function') {
                    showToast('💾 تم الحذف محلياً — سيُزامن لاحقاً', 'warning');
                }
                updateBadge();
                return { _offline: true };
            }

            try {
                // ✅ FIX: timeout 8 ثواني
                const deletePromise = (
                    table === 'tooth_states' &&
                    deleteExtra?.patient_id != null &&
                    deleteExtra?.tooth_number
                )
                    ? window._sb
                        .from(table)
                        .delete()
                        .eq('patient_id', deleteExtra.patient_id)
                        .eq('tooth_number', deleteExtra.tooth_number)
                    : window._sb.from(table).delete().eq('id', id);
                const timeoutPromise = new Promise((_, rej) =>
                    setTimeout(() => rej(new Error('delete_timeout')), 8000)
                );
                await Promise.race([deletePromise, timeoutPromise]);
                return { _deleted: true };
            } catch (e) {
                if (e.message !== 'delete_timeout') {
                    console.warn('[Offline] dbDelete failed, queued:', e.message);
                }
                addToQueue('delete', table, null, id, deleteExtra);
                if (typeof showToast === 'function') {
                    showToast('💾 خطأ أثناء الحذف — سيتم إعادة المحاولة', 'warning');
                }
                updateBadge();
                return { _queued: true };
            }
        };
        window.dbDelete._v3Wrapped = true;
        window.dbDelete._offlineV3Done = true;
        window.dbDelete._offlineFirstWrapped = true;
        console.log('[Offline] ✓ dbDelete wrapped (v3.3 — instant save)');
    }

    // ══════════════════════════════════════════════════════════════
    //  WRAP dbUpsert
    // ══════════════════════════════════════════════════════════════
    function wrapDbUpsert() {
        const orig = window.dbUpsert;
        if (!orig || orig._offlineV3Done) return;

        window.dbUpsert = async function (table, data, conflictCols) {
            let localId = data?.id ?? null;
            let localOnly = false;
            // ✅ FIX: للـ tooth_states ابحث عن record موجود وحدّثه بدل put جديد
            try {
                const dStore = TABLE_TO_DEXIE[table] || table;
                const store = window.db && window.db[dStore];
                if (store && !store._noopProxy) {
                    if (table === 'tooth_states') {
                        const patId  = data.patient_id || data.patientId;
                        const toothN = data.tooth_number || data.toothNumber;
                        await cleanupToothStateDuplicates(patId, toothN);
                        const all    = await store.toArray();
                        const existing = all.find(r =>
                            String(r.patient_id || r.patientId) === String(patId) &&
                            String(r.tooth_number || r.toothNumber) === String(toothN)
                        );
                        if (existing) {
                            localId = existing.id;
                            localOnly = !!existing._localOnly;
                            await store.update(existing.id, {
                                ...data,
                                _localOnly: localOnly,
                                _pendingSync: true,
                                _pendingOp: 'upsert'
                            });
                        } else {
                            localId = await store.put({
                                ...data,
                                _localOnly: true,
                                _pendingSync: true,
                                _pendingOp: 'upsert'
                            });
                            localOnly = true;
                        }
                    } else {
                        localId = await store.put({
                            ...data,
                            _pendingSync: true,
                            _pendingOp: 'upsert'
                        });
                    }
                }
            } catch (e) { /* silent */ }

            const queuedData = localId != null
                ? { ...data, id: localId, _localOnly: localOnly, _pendingSync: true, _pendingOp: 'upsert' }
                : { ...data, _localOnly: localOnly, _pendingSync: true, _pendingOp: 'upsert' };

            if (!navigator.onLine) {
                addToQueue('upsert', table, queuedData, localId, { conflictCols });
                updateBadge();
                return { data: queuedData, _offline: true };
            }

            // ✅ FIX: ابعت لـ Supabase في الخلفية بدون await — الـ UI يتحدث فوراً
            const sbOk = window._sbReady
                ? (typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady)
                : false;

            if (sbOk && window._sb) {
                orig(table, data, conflictCols)
                    .then(async (result) => {
                        if (result && (result._offline || result._queued)) {
                            addToQueue('upsert', table, queuedData, localId, { conflictCols });
                            updateBadge();
                            return;
                        }
                        const dStore = TABLE_TO_DEXIE[table] || table;
                        const store = window.db && window.db[dStore];
                        if (!store || store._noopProxy) return;

                        const remoteId = result?.id ?? localId;
                        if (localId != null && remoteId != null && String(localId) !== String(remoteId)) {
                            try { await store.delete(localId); } catch (_) {}
                        }

                        if (remoteId != null) {
                            try {
                                await store.put({
                                    ...(result || data),
                                    id: remoteId,
                                    _localOnly: false,
                                    _pendingSync: false,
                                    _pendingOp: null
                                });
                            } catch (_) {}
                        } else if (localId != null) {
                            try {
                                await store.update(localId, {
                                    _localOnly: false,
                                    _pendingSync: false,
                                    _pendingOp: null
                                });
                            } catch (_) {}
                        }
                        updateBadge();
                    })
                    .catch(() => {
                        addToQueue('upsert', table, queuedData, localId, { conflictCols });
                        updateBadge();
                    });
            } else {
                addToQueue('upsert', table, queuedData, localId, { conflictCols });
                updateBadge();
            }

            return { data: queuedData, _localFirst: true };
        };
        window.dbUpsert._v3Wrapped = true;
        window.dbUpsert._offlineV3Done = true;
        window.dbUpsert._offlineFirstWrapped = true;
        console.log('[Offline] ✓ dbUpsert wrapped (v3.3 — smart tooth_states)');
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

        if (window._renderSyncCenter) window._renderSyncCenter();
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

        // ✅ FIX: زامن الـ queue الأول وانتظر يخلص قبل أي refresh
        await syncQueue();

        // ✅ استنى شوية إضافية بعد syncQueue عشان Supabase يثبّت البيانات
        await new Promise(r => setTimeout(r, 800));

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

        migrateLegacyQueues();

        // ✅ FIX: استرجع أي بيانات محفوظة في localStorage backups لـ Dexie
        // (في حالة الصفحة اتفتحت من جديد بعد حفظ أوف لاين)
        try {
            for (const table of Object.keys(TABLE_TO_DEXIE)) {
                const key = 'offline_backup_' + table;
                const backed = JSON.parse(localStorage.getItem(key) || '[]');
                for (const record of backed) {
                    if (record._localOnly) {
                        await dexieUpsert(table, record).catch(() => {});
                    }
                }
            }
        } catch(e) {}

        wrapDbGetAll();
        wrapDbInsert();
        wrapDbUpdate();
        wrapDbDelete();
        wrapDbUpsert();
        await cleanupToothStateDuplicates();
        await recoverPendingToothStateQueue();
        injectUI();
        patchSessionPaymentsOffline();

        const pendingQ = getQueue();
        // ✅ FIX: sync بس لو في ops فعلاً محتاجة sync (مش كل حاجة في الـ queue)
        const trulPending = pendingQ.filter(op => !op._syncing);
        if (trulPending.length > 0 && navigator.onLine) {
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

    function formatSyncTime(ts) {
        if (!ts) return 'Never yet';
        try { return new Date(ts).toLocaleString(); }
        catch (_) { return String(ts); }
    }

    function summarizeSyncOp(op) {
        const data = op?.data || {};
        const parts = [];
        const patientId = data.patient_id || data.patientId;
        const toothNumber = data.tooth_number || data.toothNumber;
        const procedure = data.procedure || data.item || data.name || '';
        const amount = data.amount != null ? data.amount : null;
        const date = data.date || data.paid_at || data.paidAt || '';

        if (patientId != null) parts.push(`patient ${patientId}`);
        if (toothNumber) parts.push(`tooth ${toothNumber}`);
        if (procedure) parts.push(String(procedure));
        if (amount != null) parts.push(`amount ${amount}`);
        if (date) parts.push(String(date));

        return parts.length ? parts.join(' | ') : 'No extra details';
    }

    function injectSyncCenter() {
        if (document.getElementById('syncCenterModal')) return;

        const style = document.createElement('style');
        style.id = 'syncCenterStyles';
        style.textContent = `
            #syncCenterModal .sync-kpis { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
            #syncCenterModal .sync-kpi { border:1px solid #e5e7eb; border-radius:14px; padding:10px 12px; background:#f8fafc; }
            #syncCenterModal .sync-kpi-label { font-size:11px; color:#64748b; font-weight:700; }
            #syncCenterModal .sync-kpi-value { margin-top:4px; font-size:14px; font-weight:800; color:#0f172a; }
            #syncCenterModal .sync-chip-row { display:flex; flex-wrap:wrap; gap:8px; }
            #syncCenterModal .sync-chip { border-radius:999px; padding:4px 10px; font-size:11px; font-weight:700; border:1px solid #e5e7eb; background:white; color:#334155; }
            #syncCenterModal .sync-list { max-height:320px; overflow:auto; border:1px solid #e5e7eb; border-radius:16px; background:#fff; }
            #syncCenterModal .sync-item { padding:12px 14px; border-bottom:1px solid #f1f5f9; }
            #syncCenterModal .sync-item:last-child { border-bottom:none; }
            #syncCenterModal .sync-title { display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:12px; font-weight:800; color:#0f172a; }
            #syncCenterModal .sync-sub { margin-top:4px; font-size:11px; color:#64748b; line-height:1.5; }
            #syncCenterModal .sync-actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; }
        `;
        document.head.appendChild(style);

        document.body.insertAdjacentHTML('beforeend', `
            <div id="syncCenterModal" class="modal-base">
                <div class="modal-box max-w-2xl">
                    <div class="flex justify-between items-center mb-4 border-b pb-3">
                        <div>
                            <h3 class="font-bold text-gray-800 flex items-center gap-2">
                                <i class="fa-solid fa-cloud-arrow-up text-blue-500"></i> Sync Center
                            </h3>
                            <p class="text-xs text-gray-400 mt-1">Pending offline operations, network state, and manual retry tools.</p>
                        </div>
                        <button onclick="closeModal('syncCenterModal')" class="text-gray-300 hover:text-red-400 text-xl w-7 h-7 flex items-center justify-center">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div class="sync-kpis mb-4">
                        <div class="sync-kpi">
                            <div class="sync-kpi-label">Connection</div>
                            <div class="sync-kpi-value" id="syncCenterConnection">--</div>
                        </div>
                        <div class="sync-kpi">
                            <div class="sync-kpi-label">Supabase</div>
                            <div class="sync-kpi-value" id="syncCenterSupabase">--</div>
                        </div>
                        <div class="sync-kpi">
                            <div class="sync-kpi-label">Pending Ops</div>
                            <div class="sync-kpi-value" id="syncCenterPending">0</div>
                        </div>
                        <div class="sync-kpi">
                            <div class="sync-kpi-label">Last Sync</div>
                            <div class="sync-kpi-value" id="syncCenterLastSync">--</div>
                        </div>
                    </div>

                    <div class="sync-chip-row mb-4" id="syncCenterSummary"></div>
                    <div class="sync-list" id="syncCenterList"></div>

                    <div class="sync-actions">
                        <button id="syncCenterRetryBtn" onclick="retryOfflineSyncNow()" class="btn btn-blue text-xs">
                            <i class="fa-solid fa-rotate"></i> Retry Now
                        </button>
                        <button id="syncCenterRefreshBtn" onclick="refreshSyncCenterFromCloud()" class="btn btn-outline text-xs">
                            <i class="fa-solid fa-cloud-arrow-down"></i> Refresh From Cloud
                        </button>
                        <button onclick="clearOfflineQueue()" class="btn btn-outline text-xs text-red-500 border-red-200">
                            <i class="fa-solid fa-trash-can"></i> Clear Pending Queue
                        </button>
                    </div>
                </div>
            </div>
        `);
    }

    function renderSyncCenter() {
        const listEl = document.getElementById('syncCenterList');
        const summaryEl = document.getElementById('syncCenterSummary');
        if (!listEl || !summaryEl) return;

        const q = getQueue();
        const sbOk = !!(window._sbReady && (typeof window._sbReady === 'function' ? window._sbReady() : window._sbReady));
        const byAction = q.reduce((acc, op) => {
            const key = op.action || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        const byTable = q.reduce((acc, op) => {
            const key = op.table || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const connEl = document.getElementById('syncCenterConnection');
        const sbEl = document.getElementById('syncCenterSupabase');
        const pendingEl = document.getElementById('syncCenterPending');
        const lastSyncEl = document.getElementById('syncCenterLastSync');
        const retryBtn = document.getElementById('syncCenterRetryBtn');
        const refreshBtn = document.getElementById('syncCenterRefreshBtn');

        if (connEl) connEl.textContent = navigator.onLine ? (_isSyncing ? 'Syncing...' : 'Online') : 'Offline';
        if (sbEl) sbEl.textContent = sbOk ? 'Ready' : 'Not ready';
        if (pendingEl) pendingEl.textContent = String(q.length);
        if (lastSyncEl) lastSyncEl.textContent = formatSyncTime(_lastSyncTime);
        if (retryBtn) retryBtn.disabled = _isSyncing || !q.length || !navigator.onLine;
        if (refreshBtn) refreshBtn.disabled = !navigator.onLine || !sbOk;

        summaryEl.innerHTML = [
            `<span class="sync-chip">Queue: ${q.length}</span>`,
            `<span class="sync-chip">Actions: ${Object.entries(byAction).map(([k, v]) => `${k} ${v}`).join(' | ') || 'none'}</span>`,
            `<span class="sync-chip">Tables: ${Object.entries(byTable).map(([k, v]) => `${k} ${v}`).join(' | ') || 'none'}</span>`
        ].join('');

        if (!q.length) {
            listEl.innerHTML = `
                <div class="sync-item">
                    <div class="sync-title">
                        <span><i class="fa-solid fa-circle-check text-green-500 mr-1"></i> Everything is synced</span>
                    </div>
                    <div class="sync-sub">No pending offline operations were found.</div>
                </div>`;
            return;
        }

        listEl.innerHTML = q.map((op, index) => `
            <div class="sync-item">
                <div class="sync-title">
                    <span>#${index + 1} ${String(op.action || '').toUpperCase()} -> ${op.table || 'unknown'}</span>
                    <span class="text-gray-400 font-semibold">${formatSyncTime(op.ts)}</span>
                </div>
                <div class="sync-sub">${summarizeSyncOp(op)}</div>
                ${op.id != null ? `<div class="sync-sub">Local id: ${op.id}</div>` : ''}
            </div>
        `).join('');
    }

    window._renderSyncCenter = renderSyncCenter;

    window.showOfflineQueue = function () {
        injectSyncCenter();
        renderSyncCenter();
        if (typeof openModal === 'function') openModal('syncCenterModal');
        else document.getElementById('syncCenterModal')?.classList.add('open');
    };
    window.openSyncCenter = window.showOfflineQueue;

    window.retryOfflineSyncNow = async function () {
        const btn = document.getElementById('syncCenterRetryBtn');
        if (btn) btn.disabled = true;
        try {
            await syncQueue();
            if (navigator.onLine) {
                await safeRefreshFromSupabase();
                refreshCurrentView();
            }
        } catch (e) {
            console.warn('[Offline] retryOfflineSyncNow failed:', e.message);
        } finally {
            renderSyncCenter();
        }
    };

    window.refreshSyncCenterFromCloud = async function () {
        const btn = document.getElementById('syncCenterRefreshBtn');
        if (btn) btn.disabled = true;
        try {
            await safeRefreshFromSupabase();
            refreshCurrentView();
        } catch (e) {
            console.warn('[Offline] refreshSyncCenterFromCloud failed:', e.message);
        } finally {
            renderSyncCenter();
        }
    };

    window._offlineDebug = () => ({
        queue:   getQueue(),
        online:  navigator.onLine,
        sbReady: !!(window._sbReady && (typeof window._sbReady === 'function' ? window._sbReady() : window._sbReady)),
        syncing: _isSyncing,
        dbInsertWrapped: !!(window.dbInsert?._v3Wrapped),
    });

    // ── 🔍 Diagnostic tool — اضغط 3 مرات على أيقونة الـ sync ──────
    window._showOfflineDiag = function() {
        const q = getQueue();
        const lsKeys = Object.keys(localStorage).filter(k => k.startsWith('offline_backup_'));
        const backups = lsKeys.map(k => {
            try { return `${k.replace('offline_backup_','')}: ${JSON.parse(localStorage.getItem(k)||'[]').length} records`; }
            catch(e) { return k; }
        });
        const sbOk = !!(window._sbReady && (typeof window._sbReady === 'function' ? window._sbReady() : window._sbReady));
        const msg = [
            '🔍 OFFLINE DIAGNOSTIC',
            '─────────────────────',
            `🌐 navigator.onLine: ${navigator.onLine}`,
            `🔌 Supabase Ready: ${sbOk}`,
            `💾 _sb client: ${!!window._sb}`,
            `🔄 Syncing: ${_isSyncing}`,
            `⛓️ dbInsert wrapped: ${!!(window.dbInsert?._offlineV3Done)}`,
            '',
            `📋 Queue (${q.length}):`,
            ...q.slice(0,10).map((op,i) => `  ${i+1}. ${op.action} ${op.table} id=${op.id||'?'}`),
            q.length > 10 ? `  ... +${q.length-10} more` : '',
            '',
            `💽 LS Backups: ${backups.length ? backups.join(', ') : 'none'}`,
        ].filter(x => x !== undefined).join('\n');
        alert(msg);
    };

    function attachDiagTrigger() {
        const badge = document.getElementById('offlineBadge');
        if (!badge) { setTimeout(attachDiagTrigger, 2000); return; }
        let clicks = 0;
        badge.addEventListener('click', () => {
            clicks++;
            if (clicks >= 3) { clicks = 0; window._showOfflineDiag(); }
            setTimeout(() => { clicks = 0; }, 2000);
        });
    }
    setTimeout(attachDiagTrigger, 2000);

    if (document.readyState !== 'loading') {
        setTimeout(init, 150);
    } else {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 150));
    }

    // ✅ FIX: startup_preload بيعمل re-wrap بعد init بوقت
    // نعمل re-check بعد 2 ثانية ونعيد الـ wrap لو اتفقد
    setTimeout(function reWrapIfNeeded() {
        if (!window.dbInsert?._offlineV3Done) {
            console.log('[Offline] Re-wrapping dbInsert (startup_preload overwrote it)');
            wrapDbInsert();
            wrapDbUpdate();
            wrapDbDelete();
            wrapDbUpsert();
        }
        if (!window.dbGetAll?._offlineV3Done) {
            wrapDbGetAll();
        }
    }, 2000);

})();
