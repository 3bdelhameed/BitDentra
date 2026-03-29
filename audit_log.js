(function () {
    'use strict';

    const AUDIT_TABLE = 'audit_logs';
    const SESSION_LOG_PREFIX = 'audit_session_logged_';
    const TABLE_TO_STORE = {
        tooth_states: 'toothStates',
        patient_notes: 'patientNotes',
        lab_orders: 'labOrders',
        inventory_log: 'inventoryLog',
        clinic_users: 'clinicUsers',
        session_payments: 'session_payments',
        audit_logs: 'audit_logs'
    };

    let _auditRows = [];
    let _suppressDepth = 0;

    function isAdmin() {
        return (window.clinicAuth ? window.clinicAuth.getCurrentRole() : (sessionStorage.getItem('clinicRole') || '')) === 'admin';
    }

    function esc(value) {
        return (window.escapeHtml ? window.escapeHtml(value) : String(value ?? ''));
    }

    function lang() {
        return localStorage.getItem('clinicLang') || 'ar';
    }

    function getStore(table) {
        const storeName = TABLE_TO_STORE[table] || table;
        const db = window.db;
        return db && db[storeName] && !db[storeName]._noopProxy ? db[storeName] : null;
    }

    function getCurrentViewName() {
        const active = document.querySelector('.view-section.active');
        if (active?.id) {
            return active.id.replace(/View$/, '').toLowerCase();
        }
        const customVisible = ['usersView', 'auditView']
            .map(id => document.getElementById(id))
            .find(el => el && el.style.display === 'block');
        return customVisible?.id ? customVisible.id.replace(/View$/, '').toLowerCase() : 'unknown';
    }

    function getActor(fallbackUser = null) {
        const sessionUser = window.clinicAuth?.getSession?.()?.user || null;
        const user = fallbackUser || (window.clinicAuth ? window.clinicAuth.getCurrentUser() : null) || sessionUser;
        return {
            userId: user?.userId != null ? String(user.userId) : (user?.id != null ? String(user.id) : ''),
            username: user?.username || sessionStorage.getItem('clinicUsername') || '',
            displayName: user?.displayName || user?.nameAr || user?.name_ar || user?.nameEn || user?.name_en || sessionStorage.getItem('clinicUserName') || '',
            role: user?.role || sessionStorage.getItem('clinicRole') || ''
        };
    }

    function trimString(value, max = 180) {
        const text = String(value ?? '');
        return text.length > max ? text.slice(0, max) + '...' : text;
    }

    function sanitizeValue(value, depth = 0) {
        if (value == null) return value;
        if (typeof value === 'string') {
            if (/^data:image\//i.test(value)) return '[image omitted]';
            return trimString(value, 220);
        }
        if (typeof value === 'number' || typeof value === 'boolean') return value;
        if (depth >= 2) return '[truncated]';
        if (Array.isArray(value)) return value.slice(0, 10).map(item => sanitizeValue(item, depth + 1));
        if (typeof value === 'object') {
            const out = {};
            const blockedKeys = new Set([
                'password', 'password_hash', 'image_base64', 'imageBase64',
                'base64', 'salt', 'hash'
            ]);
            Object.entries(value).slice(0, 20).forEach(([key, val]) => {
                if (blockedKeys.has(key)) return;
                out[key] = sanitizeValue(val, depth + 1);
            });
            return out;
        }
        return String(value);
    }

    function describeRecord(table, row) {
        if (!row || typeof row !== 'object') return '';
        const candidates = [
            row.name, row.patient_name, row.patientName, row.username,
            row.procedure, row.item, row.work_type, row.workType,
            row.lab_name, row.labName, row.notes, row.title
        ].filter(Boolean);
        if (table === 'tooth_states') {
            const tooth = row.tooth_number ?? row.toothNumber;
            const patientId = row.patient_id ?? row.patientId;
            return tooth ? `Tooth ${tooth} / patient ${patientId || ''}`.trim() : '';
        }
        return trimString(candidates[0] || '', 80);
    }

    function getChangedFields(beforeRow, afterRow) {
        const keys = new Set([
            ...Object.keys(beforeRow || {}),
            ...Object.keys(afterRow || {})
        ]);
        return [...keys].filter(key => {
            const beforeVal = JSON.stringify(sanitizeValue(beforeRow?.[key]));
            const afterVal = JSON.stringify(sanitizeValue(afterRow?.[key]));
            return beforeVal !== afterVal;
        }).slice(0, 20);
    }

    function buildSummary(actionType, entityTable, entityLabel, entityId) {
        const label = entityLabel || (entityId != null ? `#${entityId}` : entityTable || 'record');
        const verbMap = {
            insert: 'Added',
            update: 'Updated',
            delete: 'Deleted',
            upsert: 'Saved',
            session_login: 'Signed in',
            session_logout: 'Signed out',
            custom: 'Action'
        };
        const verb = verbMap[actionType] || 'Changed';
        return `${verb} ${entityTable || 'record'} ${label}`.trim();
    }

    async function withAuditSuppressed(fn) {
        _suppressDepth++;
        try {
            return await fn();
        } finally {
            _suppressDepth = Math.max(0, _suppressDepth - 1);
        }
    }

    async function insertAuditRow(entry) {
        if (typeof window.dbInsert !== 'function') return null;
        const originalToast = window.showToast;
        try {
            if (typeof originalToast === 'function') {
                window.showToast = function () {};
            }
            return await withAuditSuppressed(async () => window.dbInsert(AUDIT_TABLE, entry));
        } catch (err) {
            console.warn('[Audit] insert failed:', err.message);
            return null;
        } finally {
            window.showToast = originalToast;
        }
    }

    async function readCurrentRow(table, id, data = null) {
        const store = getStore(table);
        if (!store) return null;
        if (id != null) {
            try {
                const row = await store.get(id);
                if (row) return row;
            } catch (_) {}
        }
        if (table === 'tooth_states' && data) {
            const patientId = data.patient_id ?? data.patientId;
            const toothNumber = String(data.tooth_number ?? data.toothNumber ?? '').trim();
            if (patientId != null && toothNumber) {
                try {
                    return await store
                        .where('patientId')
                        .equals(patientId)
                        .and(r => String(r.toothNumber ?? r.tooth_number ?? '') === toothNumber)
                        .first();
                } catch (_) {}
            }
        }
        return null;
    }

    async function auditLogEvent(actionType, options = {}) {
        if (_suppressDepth > 0) return null;
        const actor = getActor(options.actor || null);
        const entityTable = options.entityTable || null;
        const entityId = options.entityId != null ? String(options.entityId) : null;
        const entityLabel = options.entityLabel || '';
        const entry = {
            actor_user_id: actor.userId || null,
            actor_username: actor.username || null,
            actor_display_name: actor.displayName || null,
            actor_role: actor.role || null,
            action_type: actionType,
            entity_table: entityTable,
            entity_id: entityId,
            entity_label: entityLabel || null,
            view_name: options.viewName || getCurrentViewName(),
            summary: trimString(options.summary || buildSummary(actionType, entityTable, entityLabel, entityId), 180),
            details: sanitizeValue({
                ...(options.details || {}),
                online_state: navigator.onLine ? 'online' : 'offline'
            }),
            created_at: new Date().toISOString()
        };
        return insertAuditRow(entry);
    }

    function wrapDbInsert() {
        const orig = window.dbInsert;
        if (!orig || orig._auditWrapped) return;
        window.dbInsert = async function (table, data) {
            const result = await orig(table, data);
            if (_suppressDepth === 0 && table !== AUDIT_TABLE) {
                const entityId = result?.id ?? data?.id ?? null;
                auditLogEvent('insert', {
                    entityTable: table,
                    entityId,
                    entityLabel: describeRecord(table, result || data),
                    details: {
                        after: sanitizeValue(result && typeof result === 'object' ? result : data),
                        offline_saved: !!(result?._offline || result?._queued)
                    }
                }).catch(() => {});
            }
            return result;
        };
        window.dbInsert._auditWrapped = true;
    }

    function wrapDbUpdate() {
        const orig = window.dbUpdate;
        if (!orig || orig._auditWrapped) return;
        window.dbUpdate = async function (table, id, data) {
            const beforeRow = await readCurrentRow(table, id, data);
            const result = await orig(table, id, data);
            if (_suppressDepth === 0 && table !== AUDIT_TABLE) {
                const afterRow = { ...(beforeRow || {}), ...(data || {}), id: id ?? beforeRow?.id ?? null };
                auditLogEvent('update', {
                    entityTable: table,
                    entityId: id,
                    entityLabel: describeRecord(table, afterRow) || describeRecord(table, beforeRow),
                    details: {
                        before: sanitizeValue(beforeRow),
                        after: sanitizeValue(afterRow),
                        changed_fields: getChangedFields(beforeRow, afterRow),
                        offline_saved: !!(result?._offline || result?._queued)
                    }
                }).catch(() => {});
            }
            return result;
        };
        window.dbUpdate._auditWrapped = true;
    }

    function wrapDbDelete() {
        const orig = window.dbDelete;
        if (!orig || orig._auditWrapped) return;
        window.dbDelete = async function (table, id) {
            const beforeRow = await readCurrentRow(table, id);
            const result = await orig(table, id);
            if (_suppressDepth === 0 && table !== AUDIT_TABLE) {
                auditLogEvent('delete', {
                    entityTable: table,
                    entityId: id,
                    entityLabel: describeRecord(table, beforeRow),
                    details: {
                        before: sanitizeValue(beforeRow),
                        offline_saved: !!(result?._offline || result?._queued)
                    }
                }).catch(() => {});
            }
            return result;
        };
        window.dbDelete._auditWrapped = true;
    }

    function wrapDbUpsert() {
        const orig = window.dbUpsert;
        if (!orig || orig._auditWrapped) return;
        window.dbUpsert = async function (table, data, conflictCols) {
            const beforeRow = await readCurrentRow(table, data?.id, data);
            const result = await orig(table, data, conflictCols);
            if (_suppressDepth === 0 && table !== AUDIT_TABLE) {
                const payload = result?.data && typeof result.data === 'object' ? result.data : (result || data);
                auditLogEvent('upsert', {
                    entityTable: table,
                    entityId: payload?.id ?? data?.id ?? null,
                    entityLabel: describeRecord(table, payload || data),
                    details: {
                        before: sanitizeValue(beforeRow),
                        after: sanitizeValue(payload || data),
                        changed_fields: getChangedFields(beforeRow, payload || data),
                        offline_saved: !!(result?._offline || result?._queued || result?._localFirst)
                    }
                }).catch(() => {});
            }
            return result;
        };
        window.dbUpsert._auditWrapped = true;
    }

    function installCrudWrappers() {
        wrapDbInsert();
        wrapDbUpdate();
        wrapDbDelete();
        wrapDbUpsert();
    }

    function formatDateTime(value) {
        if (!value) return '—';
        try {
            return new Date(value).toLocaleString(lang() === 'ar' ? 'ar-EG' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (_) {
            return String(value);
        }
    }

    function getActionColor(actionType) {
        const map = {
            insert: 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;',
            update: 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;',
            delete: 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca;',
            upsert: 'background:#f8fafc;color:#475569;border:1px solid #e2e8f0;',
            session_login: 'background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;',
            session_logout: 'background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;'
        };
        return map[actionType] || 'background:#f8fafc;color:#334155;border:1px solid #e2e8f0;';
    }

    function updateAuditFilters(rows) {
        const tableSelect = document.getElementById('auditTableFilter');
        if (!tableSelect) return;
        const currentValue = tableSelect.value;
        const tables = [...new Set((rows || []).map(r => r.entity_table).filter(Boolean))].sort();
        tableSelect.innerHTML = ['<option value="">All Tables</option>']
            .concat(tables.map(table => `<option value="${esc(table)}">${esc(table)}</option>`))
            .join('');
        if (tables.includes(currentValue)) tableSelect.value = currentValue;
    }

    function isSessionRow(row) {
        return row?.action_type === 'session_login' || row?.action_type === 'session_logout' || row?.entity_table === 'session';
    }

    function getActorFromDetails(row) {
        const user = row?.details?.user;
        if (!user || typeof user !== 'object') return null;
        return {
            displayName: user.displayName || user.nameAr || user.name_ar || user.nameEn || user.name_en || user.username || '',
            username: user.username || '',
            role: user.role || ''
        };
    }

    function getKnownActor(row) {
        const detailActor = getActorFromDetails(row);
        return {
            displayName: row?.actor_display_name || detailActor?.displayName || row?.entity_label || '',
            username: row?.actor_username || detailActor?.username || '',
            role: row?.actor_role || detailActor?.role || ''
        };
    }

    function inferActorFromNearbySession(rows, index) {
        const current = rows[index];
        if (!isSessionRow(current)) return null;

        let best = null;
        let bestDelta = Infinity;
        const currentTime = new Date(current.created_at || 0).getTime();

        rows.forEach((candidate, candidateIndex) => {
            if (candidateIndex === index || !isSessionRow(candidate)) return;

            const actor = getKnownActor(candidate);
            if (!actor.displayName && !actor.username) return;

            if (current.entity_id && candidate.entity_id && String(current.entity_id) !== String(candidate.entity_id)) {
                return;
            }

            const candidateTime = new Date(candidate.created_at || 0).getTime();
            const delta = Math.abs(candidateTime - currentTime);
            if (!Number.isFinite(delta) || delta > 12 * 60 * 60 * 1000) return;

            if (delta < bestDelta) {
                bestDelta = delta;
                best = actor;
            }
        });

        return best;
    }

    function getRenderedActor(row, rows, index) {
        const actor = getKnownActor(row);
        if (actor.displayName || actor.username) {
            return {
                name: actor.displayName || actor.username,
                meta: [actor.role, actor.username ? '@' + actor.username : ''].filter(Boolean).join(' · ')
            };
        }

        const inferred = inferActorFromNearbySession(rows, index);
        if (inferred) {
            return {
                name: inferred.displayName || inferred.username,
                meta: [inferred.role, inferred.username ? '@' + inferred.username : '', 'inferred'].filter(Boolean).join(' · ')
            };
        }

        if (isSessionRow(row)) {
            return {
                name: 'Legacy session',
                meta: ''
            };
        }

        return {
            name: 'Unknown',
            meta: ''
        };
    }

    function getViewNameLabel(row) {
        if (row?.view_name && row.view_name !== 'unknown') return row.view_name;
        if (isSessionRow(row)) return 'session';
        return row?.entity_table || 'unknown';
    }

    function renderAuditRows(rows) {
        const list = document.getElementById('auditList');
        const empty = document.getElementById('auditEmptyState');
        if (!list || !empty) return;

        if (!rows.length) {
            list.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        list.innerHTML = rows.map((row, index) => {
            const renderedActor = getRenderedActor(row, rows, index);
            const entityLine = [row.entity_table, row.entity_id ? '#' + row.entity_id : '', row.entity_label || ''].filter(Boolean).join(' · ');
            const viewNameLabel = getViewNameLabel(row);
            const detailsJson = esc(JSON.stringify(row.details || {}, null, 2));
            return `
            <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div class="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div>
                        <div class="flex flex-wrap items-center gap-2 mb-1">
                            <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase" style="${getActionColor(row.action_type)}">${esc(row.action_type)}</span>
                            <span class="text-xs text-gray-400">${esc(formatDateTime(row.created_at))}</span>
                        </div>
                        <h4 class="font-bold text-sm text-gray-800">${esc(row.summary || 'Audit event')}</h4>
                        <p class="text-xs text-gray-500 mt-1">${esc(renderedActor.name)}${renderedActor.meta ? ' · ' + esc(renderedActor.meta) : ''}</p>
                        <p class="text-[11px] text-gray-400 mt-1">${esc(entityLine || viewNameLabel)}</p>
                    </div>
                    <span class="text-[10px] px-2 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200">${esc(viewNameLabel)}</span>
                </div>
                <details class="mt-2">
                    <summary class="text-xs font-semibold text-blue-600 cursor-pointer">Details</summary>
                    <pre class="mt-2 text-[11px] leading-5 bg-slate-50 border border-slate-100 rounded-xl p-3 overflow-auto whitespace-pre-wrap break-words">${detailsJson}</pre>
                </details>
            </div>`;
        }).join('');
    }

    function updateAuditKpis(rows) {
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(value);
        };
        setText('auditKpiTotal', rows.length);
        setText('auditKpiUsers', new Set(rows.map(r => r.actor_username).filter(Boolean)).size);
        setText('auditKpiTables', new Set(rows.map(r => r.entity_table).filter(Boolean)).size);
    }

    window.filterAuditLogs = function () {
        const search = (document.getElementById('auditSearchInput')?.value || '').trim().toLowerCase();
        const action = document.getElementById('auditActionFilter')?.value || '';
        const table = document.getElementById('auditTableFilter')?.value || '';

        const filtered = _auditRows.filter(row => {
            if (action && row.action_type !== action) return false;
            if (table && row.entity_table !== table) return false;
            if (!search) return true;
            const haystack = [
                row.summary,
                row.actor_display_name,
                row.actor_username,
                row.actor_role,
                row.entity_table,
                row.entity_id,
                row.entity_label,
                row.view_name
            ].map(v => String(v || '').toLowerCase()).join(' ');
            return haystack.includes(search);
        });

        renderAuditRows(filtered);
    };

    window.loadAuditLogView = async function () {
        if (!isAdmin()) return;
        const loader = document.getElementById('auditLoader');
        const listWrap = document.getElementById('auditListWrap');
        if (loader) loader.classList.remove('hidden');
        if (listWrap) listWrap.style.display = 'none';

        try {
            let rows = [];
            if (typeof window.dbGetAll === 'function') {
                rows = await window.dbGetAll(AUDIT_TABLE);
            } else {
                const store = getStore(AUDIT_TABLE);
                rows = store ? await store.toArray() : [];
            }
            _auditRows = (rows || [])
                .sort((a, b) => {
                    const left = new Date(b.created_at || 0).getTime() || Number(b.id || 0);
                    const right = new Date(a.created_at || 0).getTime() || Number(a.id || 0);
                    return left - right;
                })
                .slice(0, 500);

            updateAuditKpis(_auditRows);
            updateAuditFilters(_auditRows);
            window.filterAuditLogs();
        } catch (err) {
            console.error('[Audit] load failed:', err);
            if (typeof showToast === 'function') showToast('Audit log load failed: ' + err.message, 'error');
        } finally {
            if (loader) loader.classList.add('hidden');
            if (listWrap) listWrap.style.display = 'block';
        }
    };

    function injectUI() {
        if (!isAdmin()) return;
        const navSettings = document.getElementById('nav-settings');
        if (navSettings && !document.getElementById('nav-audit')) {
            navSettings.insertAdjacentHTML('afterend', `
            <a onclick="switchView('audit')" id="nav-audit" class="sidebar-link">
                <i class="fa-solid fa-clipboard-list"></i>
                <span class="nav-label">Audit Log</span>
            </a>`);
        }

        if (!document.getElementById('auditView')) {
            const mainArea = document.getElementById('mainArea') || document.querySelector('main');
            const container = mainArea?.querySelector('.flex-1.relative') || mainArea;
            if (!container) return;
            container.insertAdjacentHTML('beforeend', `
            <div class="view-section h-full overflow-y-auto p-5" id="auditView">
                <div class="flex flex-wrap justify-between items-center gap-3 mb-4">
                    <div>
                        <h2 class="text-xl font-bold flex items-center gap-2">
                            <i class="fa-solid fa-clipboard-list text-sky-600"></i>
                            Audit Log
                        </h2>
                        <p class="text-xs text-gray-400 mt-1">Track who changed what, when, and from which screen.</p>
                    </div>
                    <button onclick="loadAuditLogView()" class="btn btn-outline text-xs px-3 py-2">
                        <i class="fa-solid fa-rotate mr-1"></i> Refresh
                    </button>
                </div>

                <div class="grid grid-cols-3 gap-3 mb-4">
                    <div class="stat-card">
                        <div>
                            <p class="text-xs text-gray-400">Events</p>
                            <h3 class="text-xl font-bold text-gray-800" id="auditKpiTotal">0</h3>
                        </div>
                        <div class="w-9 h-9 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center"><i class="fa-solid fa-wave-square"></i></div>
                    </div>
                    <div class="stat-card">
                        <div>
                            <p class="text-xs text-gray-400">Users</p>
                            <h3 class="text-xl font-bold text-gray-800" id="auditKpiUsers">0</h3>
                        </div>
                        <div class="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><i class="fa-solid fa-users"></i></div>
                    </div>
                    <div class="stat-card">
                        <div>
                            <p class="text-xs text-gray-400">Tables</p>
                            <h3 class="text-xl font-bold text-gray-800" id="auditKpiTables">0</h3>
                        </div>
                        <div class="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><i class="fa-solid fa-database"></i></div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input type="text" id="auditSearchInput" oninput="filterAuditLogs()" placeholder="Search by user, action, table..." class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                        <select id="auditActionFilter" onchange="filterAuditLogs()" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                            <option value="">All Actions</option>
                            <option value="insert">Insert</option>
                            <option value="update">Update</option>
                            <option value="delete">Delete</option>
                            <option value="upsert">Upsert</option>
                            <option value="session_login">Session Login</option>
                            <option value="session_logout">Session Logout</option>
                        </select>
                        <select id="auditTableFilter" onchange="filterAuditLogs()" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                            <option value="">All Tables</option>
                        </select>
                    </div>
                </div>

                <div id="auditLoader" class="hidden text-center py-12">
                    <i class="fa-solid fa-circle-notch fa-spin text-3xl text-sky-500"></i>
                    <p class="text-sm text-gray-400 mt-2">Loading audit log...</p>
                </div>

                <div id="auditListWrap">
                    <div id="auditEmptyState" class="hidden text-center py-16 text-gray-400">
                        <i class="fa-solid fa-clipboard-question text-4xl mb-3 opacity-30"></i>
                        <p class="text-sm font-medium">No audit events found.</p>
                    </div>
                    <div id="auditList" class="space-y-3"></div>
                </div>
            </div>`);
        }
    }

    function patchLogout() {
        const orig = window.logout;
        if (!orig || orig._auditWrapped) return;
        window.logout = async function () {
            const actor = getActor(window.clinicAuth?.getSession?.()?.user || null);
            await auditLogEvent('session_logout', {
                actor,
                entityTable: 'session',
                entityId: actor.userId || actor.username || null,
                entityLabel: actor.displayName || actor.username,
                viewName: 'session',
                summary: 'Signed out',
                details: { user: actor }
            }).catch(() => {});
            return orig();
        };
        window.logout._auditWrapped = true;
    }

    async function logSessionStartOnce() {
        const session = window.clinicAuth?.getSession?.();
        if (!session?.user) return;
        const actor = getActor(session.user);
        const key = SESSION_LOG_PREFIX + String(session.issuedAt || session.user.id || session.user.username || 'current');
        if (sessionStorage.getItem(key) === '1') return;
        await auditLogEvent('session_login', {
            actor,
            entityTable: 'session',
            entityId: actor.userId || actor.username || null,
            entityLabel: actor.displayName || actor.username,
            viewName: 'session',
            summary: 'Signed in',
            details: {
                user: actor,
                issued_at: session.issuedAt,
                expires_at: session.expiresAt
            }
        }).catch(() => {});
        sessionStorage.setItem(key, '1');
    }

    function exposeApi() {
        window.auditLogEvent = auditLogEvent;
        window.withAuditSuppressed = withAuditSuppressed;
    }

    async function init() {
        let tries = 0;
        while (tries < 80 && (typeof window.dbInsert !== 'function' || typeof window.dbDelete !== 'function')) {
            await new Promise(r => setTimeout(r, 100));
            tries++;
        }
        injectUI();
        installCrudWrappers();
        patchLogout();
        exposeApi();
        await logSessionStartOnce();

        setTimeout(installCrudWrappers, 2000);
        setTimeout(installCrudWrappers, 5000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
