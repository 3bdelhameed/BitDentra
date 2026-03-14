// ══════════════════════════════════════════════════════════════════
//  procedures_catalog.js  v2.0
//
//  ✅ ميزات:
//  1. جدول إجراءات + أسعار محفوظ في Supabase (جدول: procedure_catalog)
//  2. Dexie store اسمه: procedureCatalog — أوف لاين بالكامل
//  3. لما تكتب في حقل الإجراء في modal الـ treatment → السعر يتحط تلقائي
//  4. Modal مستقلة لإدارة الكتالوج (بدلاً من سكشن داخل Settings)
//  5. زر في الـ sidebar وفي صفحة Settings لفتح الـ modal
// ══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── TABLE NAME ────────────────────────────────────────────────
    const SB_TABLE  = 'procedure_catalog';
    const DEX_STORE = 'procedureCatalog';

    // ── CATEGORIES ────────────────────────────────────────────────
    const CATEGORIES = [
        { value: 'general',       label: '🦷 عام' },
        { value: 'restorative',   label: '🔧 ترميمي' },
        { value: 'endodontic',    label: '🩹 علاج عصب' },
        { value: 'surgical',      label: '🔪 جراحي' },
        { value: 'prosthodontic', label: '👑 تركيبات' },
        { value: 'orthodontic',   label: '📎 تقويم' },
        { value: 'periodontic',   label: '🧹 لثة' },
        { value: 'cosmetic',      label: '✨ تجميلي' },
        { value: 'diagnostic',    label: '🔍 تشخيصي' },
        { value: 'other',         label: '📋 أخرى' },
    ];

    // ── DEFAULT PROCEDURES ────────────────────────────────────────
    const DEFAULT_PROCEDURES = [
        { name: 'Filling - Composite',       price: 300,  category: 'restorative' },
        { name: 'Filling - Amalgam',         price: 200,  category: 'restorative' },
        { name: 'Root Canal Treatment',      price: 1200, category: 'endodontic' },
        { name: 'Crown - Porcelain',         price: 2500, category: 'prosthodontic' },
        { name: 'Crown - Metal',             price: 1500, category: 'prosthodontic' },
        { name: 'Extraction - Simple',       price: 300,  category: 'surgical' },
        { name: 'Extraction - Surgical',     price: 600,  category: 'surgical' },
        { name: 'Scaling & Polishing',       price: 400,  category: 'periodontic' },
        { name: 'Teeth Whitening',           price: 1500, category: 'cosmetic' },
        { name: 'Dental Implant',            price: 8000, category: 'prosthodontic' },
        { name: 'Denture - Full',            price: 5000, category: 'prosthodontic' },
        { name: 'Denture - Partial',         price: 3000, category: 'prosthodontic' },
        { name: 'Orthodontic Consultation',  price: 200,  category: 'orthodontic' },
        { name: 'X-Ray - Periapical',        price: 100,  category: 'diagnostic' },
        { name: 'X-Ray - Panoramic',         price: 300,  category: 'diagnostic' },
        { name: 'Veneer - Porcelain',        price: 2000, category: 'cosmetic' },
        { name: 'Veneer - Composite',        price: 800,  category: 'cosmetic' },
        { name: 'Night Guard',               price: 1000, category: 'other' },
        { name: 'Post & Core',               price: 600,  category: 'restorative' },
        { name: 'Account Payment',           price: 0,    category: 'other' },
    ];

    // ── HELPERS ───────────────────────────────────────────────────
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function sbReady() {
        if (!window._sbReady) return false;
        return typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady;
    }

    function getCurrStr() {
        return typeof getCurrency === 'function' ? getCurrency() : 'EGP';
    }

    function getDexStore() {
        const db = window.db;
        if (!db) return null;
        try {
            const s = db[DEX_STORE];
            if (s && typeof s.toArray === 'function') return s;
        } catch (_) {}
        return null;
    }

    window._procedureCatalogCache = window._procedureCatalogCache || [];

    // ── READ ALL ──────────────────────────────────────────────────
    async function getAllProcedures() {
        const store = getDexStore();
        if (store) {
            try {
                const rows = await store.toArray();
                if (rows.length > 0) return rows;
            } catch (_) {}
        }
        if (window._procedureCatalogCache.length > 0) {
            return window._procedureCatalogCache;
        }
        if (sbReady() && window._sb) {
            try {
                const { data, error } = await window._sb.from(SB_TABLE).select('*').order('name');
                if (!error && data && data.length > 0) {
                    window._procedureCatalogCache = data;
                    await mirrorToDexie(data);
                    return data;
                }
            } catch (_) {}
        }
        return [];
    }

    async function mirrorToDexie(rows) {
        const store = getDexStore();
        if (!store || !rows || !rows.length) return;
        try {
            const camelRows = rows.map(r => ({
                id:        r.id,
                name:      r.name,
                price:     r.price,
                category:  r.category,
                notes:     r.notes,
                isActive:  r.is_active !== false,
                createdAt: r.created_at,
            }));
            await store.bulkPut(camelRows);
        } catch (e) {
            console.warn('[ProcCat] Dexie mirror failed:', e.message);
        }
    }

    async function saveProcedure(data, existingId = null) {
        const row = {
            name:      data.name.trim(),
            price:     parseFloat(data.price) || 0,
            category:  data.category || 'general',
            notes:     data.notes || '',
            is_active: true,
        };

        const store = getDexStore();
        let localId = existingId;

        if (store) {
            try {
                const camel = { name: row.name, price: row.price, category: row.category, notes: row.notes, isActive: true };
                if (existingId) {
                    await store.update(existingId, camel);
                } else {
                    localId = await store.add({ ...camel, _pendingSync: !sbReady() });
                }
            } catch (e) {
                console.warn('[ProcCat] Dexie write failed:', e.message);
            }
        } else {
            if (existingId) {
                const idx = window._procedureCatalogCache.findIndex(p => p.id === existingId);
                if (idx >= 0) window._procedureCatalogCache[idx] = { ...window._procedureCatalogCache[idx], ...row };
            } else {
                localId = Date.now();
                window._procedureCatalogCache.push({ id: localId, ...row });
            }
        }

        if (sbReady() && window._sb) {
            try {
                if (existingId) {
                    const { error } = await window._sb.from(SB_TABLE).update(row).eq('id', existingId);
                    if (error) throw error;
                } else {
                    const { data: created, error } = await window._sb.from(SB_TABLE).insert(row).select().single();
                    if (error) throw error;
                    if (store && localId && created.id !== localId) {
                        try {
                            await store.delete(localId);
                            await store.put({ id: created.id, name: created.name, price: created.price, category: created.category, notes: created.notes, isActive: created.is_active });
                            localId = created.id;
                        } catch (_) {}
                    }
                    return created;
                }
            } catch (e) {
                console.warn('[ProcCat] Supabase write failed (saved locally):', e.message);
                if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامَن عند الاتصال', 'warning');
            }
        } else if (!sbReady()) {
            if (typeof showToast === 'function') showToast('💾 حُفظ محلياً — سيُزامَن عند الاتصال', 'warning');
        }

        return { id: localId, ...row };
    }

    async function deleteProcedure(id) {
        const store = getDexStore();
        if (store) {
            try { await store.delete(id); } catch (_) {}
        } else {
            window._procedureCatalogCache = window._procedureCatalogCache.filter(p => p.id !== id);
        }

        if (sbReady() && window._sb) {
            try {
                await window._sb.from(SB_TABLE).delete().eq('id', id);
            } catch (e) {
                console.warn('[ProcCat] Supabase delete failed:', e.message);
            }
        }
    }

    async function seedIfEmpty() {
        const existing = await getAllProcedures();
        if (existing.length > 0) return;

        console.log('[ProcCat] Seeding default procedures...');
        for (const p of DEFAULT_PROCEDURES) {
            await saveProcedure(p);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  UI — STANDALONE CATALOG MODAL
    // ══════════════════════════════════════════════════════════════

    function injectCatalogModal() {
        if (document.getElementById('procCatModal')) return;

        const modal = document.createElement('div');
        modal.id = 'procCatModal';
        modal.className = 'modal-base';
        modal.innerHTML = `
            <div class="modal-box" style="max-width:860px;">
                <!-- Header -->
                <div class="flex justify-between items-center mb-4 border-b pb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                            <i class="fa-solid fa-list-check text-white"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-gray-800">كتالوج الإجراءات والأسعار</h3>
                            <p class="text-xs text-gray-400">إدارة قائمة الإجراءات والأسعار الافتراضية</p>
                        </div>
                    </div>
                    <button onclick="closeProcCatalogModal()"
                        class="text-gray-300 hover:text-red-400 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- Toolbar -->
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div class="flex gap-2 flex-wrap" id="procCatFilters">
                        <button onclick="setProcCatFilter('all')" id="pcf-all"
                            class="btn btn-blue text-xs px-3 py-1.5">الكل</button>
                        ${CATEGORIES.map(c => `
                            <button onclick="setProcCatFilter('${c.value}')" id="pcf-${c.value}"
                                class="btn btn-gray text-xs px-3 py-1.5">${c.label}</button>
                        `).join('')}
                    </div>
                    <div class="flex gap-2 items-center">
                        <div class="search-box">
                            <i class="fa-solid fa-magnifying-glass text-xs"></i>
                            <input type="text" id="procCatSearch" placeholder="بحث في الإجراءات..."
                                class="border border-gray-200 rounded-xl text-sm py-2 pr-4 pl-8 w-48"
                                oninput="filterProcedureCatalog()">
                        </div>
                        <button onclick="openProcCatItemModal()" class="btn btn-blue text-sm">
                            <i class="fa-solid fa-plus"></i> إجراء جديد
                        </button>
                    </div>
                </div>

                <!-- Stats bar -->
                <div class="grid grid-cols-3 gap-3 mb-4" id="procCatStats">
                    <div class="bg-blue-50 rounded-xl p-3 border border-blue-100 flex items-center gap-3">
                        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <i class="fa-solid fa-list text-white text-xs"></i>
                        </div>
                        <div>
                            <p class="text-xs text-blue-500">إجمالي الإجراءات</p>
                            <p class="font-bold text-blue-800" id="procCatStatTotal">0</p>
                        </div>
                    </div>
                    <div class="bg-green-50 rounded-xl p-3 border border-green-100 flex items-center gap-3">
                        <div class="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                            <i class="fa-solid fa-tag text-white text-xs"></i>
                        </div>
                        <div>
                            <p class="text-xs text-green-500">متوسط السعر</p>
                            <p class="font-bold text-green-800" id="procCatStatAvg">0</p>
                        </div>
                    </div>
                    <div class="bg-purple-50 rounded-xl p-3 border border-purple-100 flex items-center gap-3">
                        <div class="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                            <i class="fa-solid fa-layer-group text-white text-xs"></i>
                        </div>
                        <div>
                            <p class="text-xs text-purple-500">الفئات</p>
                            <p class="font-bold text-purple-800" id="procCatStatCats">0</p>
                        </div>
                    </div>
                </div>

                <!-- Table -->
                <div class="overflow-hidden rounded-xl border border-gray-100" style="max-height:50vh;overflow-y:auto;">
                    <table class="w-full text-sm">
                        <thead class="sticky top-0 z-10">
                            <tr class="bg-slate-50 text-gray-400 text-xs uppercase border-b">
                                <th class="text-right px-4 py-3">الإجراء</th>
                                <th class="text-center px-4 py-3">الفئة</th>
                                <th class="text-right px-4 py-3">السعر</th>
                                <th class="text-right px-4 py-3">ملاحظات</th>
                                <th class="text-center px-4 py-3">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="procCatTableBody"></tbody>
                    </table>
                    <div id="procCatEmpty" class="hidden text-center py-16 text-gray-400">
                        <i class="fa-solid fa-list-check text-5xl mb-3 opacity-20"></i>
                        <p class="font-medium">لا توجد إجراءات — أضف إجراءك الأول</p>
                    </div>
                </div>
            </div>
        `;

        // close on backdrop click
        modal.addEventListener('click', e => {
            if (e.target === modal) closeProcCatalogModal();
        });

        document.body.appendChild(modal);
    }

    // ── INJECT ADD/EDIT ITEM MODAL ────────────────────────────────
    function injectCatalogItemModal() {
        if (document.getElementById('procCatItemModal')) return;

        const modal = document.createElement('div');
        modal.id = 'procCatItemModal';
        modal.className = 'modal-base';
        modal.style.zIndex = '60';
        modal.innerHTML = `
            <div class="modal-box max-w-md">
                <div class="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 class="text-lg font-bold flex items-center gap-2" id="procCatItemModalTitle">
                        <i class="fa-solid fa-plus-circle text-blue-500"></i> إجراء جديد
                    </h3>
                    <button onclick="closeProcCatItemModal()"
                        class="text-gray-300 hover:text-red-400 text-xl w-7 h-7 flex items-center justify-center">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <input type="hidden" id="procCatEditId">
                <div class="space-y-3">
                    <div>
                        <label class="text-xs font-semibold text-gray-500 block mb-1">اسم الإجراء *</label>
                        <input type="text" id="procCatName" placeholder="مثال: حشو كومبوزيت"
                            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-semibold text-gray-500 block mb-1">السعر *</label>
                            <div class="flex items-center gap-2">
                                <input type="number" id="procCatPrice" min="0" step="0.5" placeholder="0"
                                    class="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
                                <span class="text-sm text-gray-500 font-semibold" id="procCatCurrLabel">EGP</span>
                            </div>
                        </div>
                        <div>
                            <label class="text-xs font-semibold text-gray-500 block mb-1">الفئة</label>
                            <select id="procCatCategory"
                                class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                                ${CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-500 block mb-1">ملاحظات (اختياري)</label>
                        <input type="text" id="procCatNotes" placeholder="مدة العلاج، تعليمات خاصة..."
                            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
                    </div>
                </div>
                <div class="flex gap-2 mt-4 pt-4 border-t">
                    <button onclick="closeProcCatItemModal()" class="btn btn-gray flex-1">إلغاء</button>
                    <button onclick="submitProcCat()" class="btn btn-blue flex-1 justify-center" id="procCatSaveBtn">
                        <i class="fa-solid fa-save mr-1"></i> حفظ
                    </button>
                </div>
            </div>
        `;

        modal.addEventListener('click', e => {
            if (e.target === modal) closeProcCatItemModal();
        });

        document.body.appendChild(modal);
    }

    // ── INJECT SIDEBAR BUTTON ─────────────────────────────────────
    function injectSidebarButton() {
        if (document.getElementById('nav-proc-catalog')) return;

        // Find the CLINICAL nav section to insert after prescriptions
        const prescriptionsNav = document.getElementById('nav-prescriptions');
        if (!prescriptionsNav) return;

        const btn = document.createElement('a');
        btn.id = 'nav-proc-catalog';
        btn.className = 'sidebar-link';
        btn.style.cursor = 'pointer';
        btn.setAttribute('onclick', 'openProcCatalogModal()');
        btn.innerHTML = `<i class="fa-solid fa-list-check"></i> <span>قائمة الإجراءات</span>`;

        prescriptionsNav.insertAdjacentElement('afterend', btn);
    }

    // ── INJECT SETTINGS SHORTCUT ──────────────────────────────────
    function injectSettingsShortcut() {
        // Wait for settings view to be visible, then add shortcut button
        const settingsView = document.getElementById('settingsView');
        if (!settingsView || document.getElementById('procCatalogSettingsBtn')) return;

        // Find the data management card or just append to settings
        const dataCard = settingsView.querySelector('.space-y-4 .bg-white');
        if (!dataCard) return;

        const shortcutDiv = document.createElement('div');
        shortcutDiv.className = 'bg-white rounded-xl border border-gray-100 p-5';
        shortcutDiv.innerHTML = `
            <h3 class="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                <i class="fa-solid fa-list-check text-blue-500"></i> كتالوج الإجراءات
            </h3>
            <p class="text-xs text-gray-400 mb-3">إدارة قائمة الإجراءات الطبية وأسعارها الافتراضية</p>
            <button id="procCatalogSettingsBtn" onclick="openProcCatalogModal()"
                class="btn btn-blue w-full justify-center">
                <i class="fa-solid fa-list-check"></i> فتح كتالوج الإجراءات
            </button>
        `;

        // Insert before the danger zone section
        const parentSpace = settingsView.querySelector('.space-y-4');
        if (parentSpace) {
            parentSpace.appendChild(shortcutDiv);
        }
    }

    // ── RENDER TABLE ──────────────────────────────────────────────
    let _allProcedures = [];
    let _activeFilter  = 'all';

    async function renderProcCatalog() {
        _allProcedures = await getAllProcedures();
        updateStats();
        applyProcCatalogRender();
    }

    function updateStats() {
        const total = _allProcedures.length;
        const avg   = total > 0 ? Math.round(_allProcedures.reduce((s, p) => s + (parseFloat(p.price)||0), 0) / total) : 0;
        const cats  = [...new Set(_allProcedures.map(p => p.category || 'general'))].length;
        const curr  = getCurrStr();

        const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setEl('procCatStatTotal', total);
        setEl('procCatStatAvg',   avg + ' ' + curr);
        setEl('procCatStatCats',  cats);
    }

    function applyProcCatalogRender() {
        const tbody = document.getElementById('procCatTableBody');
        const empty = document.getElementById('procCatEmpty');
        if (!tbody) return;

        const search = (document.getElementById('procCatSearch')?.value || '').toLowerCase();
        const curr   = getCurrStr();

        let filtered = _allProcedures.filter(p => {
            const name      = (p.name || '').toLowerCase();
            const matchSearch = !search || name.includes(search);
            const matchCat    = _activeFilter === 'all' || (p.category || 'general') === _activeFilter;
            return matchSearch && matchCat;
        });

        if (!filtered.length) {
            tbody.innerHTML = '';
            empty?.classList.remove('hidden');
            return;
        }
        empty?.classList.add('hidden');

        const catLabel = v => CATEGORIES.find(c => c.value === v)?.label || v;

        tbody.innerHTML = filtered.map(p => `
            <tr class="border-b border-gray-50 hover:bg-blue-50 transition">
                <td class="px-4 py-3">
                    <p class="font-semibold text-sm text-gray-800">${p.name}</p>
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                        ${catLabel(p.category || 'general')}
                    </span>
                </td>
                <td class="px-4 py-3 text-right">
                    <span class="font-bold text-gray-800">${parseFloat(p.price||0).toFixed(2)}</span>
                    <span class="text-xs text-gray-400 ml-1">${curr}</span>
                </td>
                <td class="px-4 py-3 text-right text-xs text-gray-400">${p.notes || '—'}</td>
                <td class="px-4 py-3 text-center">
                    <div class="flex gap-1 justify-center">
                        <button onclick="openProcCatItemModal(${p.id})"
                            class="btn btn-outline text-xs px-2 py-1" title="تعديل">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="confirmDeleteProcCat(${p.id}, '${(p.name||'').replace(/'/g,"\\'")}' )"
                            class="btn text-xs px-2 py-1" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca" title="حذف">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // ── GLOBAL FUNCTIONS ──────────────────────────────────────────

    window.openProcCatalogModal = async function () {
        const modal = document.getElementById('procCatModal');
        if (!modal) return;
        modal.classList.add('open');
        await renderProcCatalog();
    };

    window.closeProcCatalogModal = function () {
        document.getElementById('procCatModal')?.classList.remove('open');
    };

    window.filterProcedureCatalog = function () {
        applyProcCatalogRender();
    };

    window.setProcCatFilter = function (val) {
        _activeFilter = val;
        document.querySelectorAll('[id^="pcf-"]').forEach(btn => {
            btn.className = btn.id === `pcf-${val}`
                ? 'btn btn-blue text-xs px-3 py-1.5'
                : 'btn btn-gray text-xs px-3 py-1.5';
        });
        applyProcCatalogRender();
    };

    window.openProcCatItemModal = async function (id = null) {
        // Reset form
        document.getElementById('procCatEditId').value    = id || '';
        document.getElementById('procCatName').value      = '';
        document.getElementById('procCatPrice').value     = '';
        document.getElementById('procCatNotes').value     = '';
        document.getElementById('procCatCategory').value  = 'general';
        document.getElementById('procCatCurrLabel').innerText = getCurrStr();

        if (id) {
            const proc = _allProcedures.find(p => p.id == id);
            if (proc) {
                document.getElementById('procCatItemModalTitle').innerHTML =
                    '<i class="fa-solid fa-pen text-blue-500"></i> تعديل الإجراء';
                document.getElementById('procCatName').value     = proc.name || '';
                document.getElementById('procCatPrice').value    = proc.price || 0;
                document.getElementById('procCatNotes').value    = proc.notes || '';
                document.getElementById('procCatCategory').value = proc.category || 'general';
            }
        } else {
            document.getElementById('procCatItemModalTitle').innerHTML =
                '<i class="fa-solid fa-plus-circle text-blue-500"></i> إجراء جديد';
        }

        document.getElementById('procCatItemModal').classList.add('open');
        setTimeout(() => document.getElementById('procCatName').focus(), 100);
    };

    window.closeProcCatItemModal = function () {
        document.getElementById('procCatItemModal')?.classList.remove('open');
    };

    window.submitProcCat = async function () {
        const name   = document.getElementById('procCatName').value.trim();
        const price  = document.getElementById('procCatPrice').value;
        const cat    = document.getElementById('procCatCategory').value;
        const notes  = document.getElementById('procCatNotes').value.trim();
        const editId = document.getElementById('procCatEditId').value;

        if (!name) {
            if (typeof showToast === 'function') showToast('⚠️ اكتب اسم الإجراء', 'error');
            return;
        }

        const saveBtn = document.getElementById('procCatSaveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> جاري الحفظ...';
        }

        try {
            await saveProcedure({ name, price, category: cat, notes }, editId ? parseInt(editId) : null);
            if (typeof showToast === 'function') showToast('✅ تم حفظ الإجراء', 'success');
            window.closeProcCatItemModal();
            await renderProcCatalog();
            updateTreatmentDatalist();
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-save mr-1"></i> حفظ';
            }
        }
    };

    window.confirmDeleteProcCat = async function (id, name) {
        if (!confirm(`هل تريد حذف "${name}"؟`)) return;
        await deleteProcedure(id);
        _allProcedures = _allProcedures.filter(p => p.id != id);
        applyProcCatalogRender();
        updateStats();
        updateTreatmentDatalist();
        if (typeof showToast === 'function') showToast('🗑️ تم الحذف', 'success');
    };

    // ══════════════════════════════════════════════════════════════
    //  AUTO-PRICE: لما تختار إجراء يتحط السعر تلقائي
    // ══════════════════════════════════════════════════════════════

    function updateTreatmentDatalist() {
        let dl = document.getElementById('proceduresList');
        if (!dl) return;
        dl.innerHTML = _allProcedures
            .filter(p => p.isActive !== false && p.is_active !== false)
            .map(p => `<option value="${p.name}" data-price="${p.price}">`)
            .join('');
    }

    function hookAutoPriceOnTreatmentInput() {
        const input = document.getElementById('treatmentProcedure');
        const costInput = document.getElementById('treatmentTotalCost');
        if (!input || !costInput || input._procCatHooked) return;

        input._procCatHooked = true;

        let debounceTimer = null;
        const tryFillPrice = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const val = input.value.trim().toLowerCase();
                if (!val) return;
                const match = _allProcedures.find(p => (p.name||'').toLowerCase() === val);
                if (match && parseFloat(match.price) > 0) {
                    const current = parseFloat(costInput.value) || 0;
                    if (current === 0) {
                        costInput.value = match.price;
                        costInput.style.transition = 'background 0.3s';
                        costInput.style.background = '#f0fdf4';
                        setTimeout(() => { costInput.style.background = ''; }, 800);
                        if (typeof window.onTreatmentDoctorChange === 'function') {
                            window.onTreatmentDoctorChange();
                        }
                    }
                }
            }, 300);
        };

        input.addEventListener('input', tryFillPrice);
        input.addEventListener('change', tryFillPrice);

        console.log('[ProcCat] ✅ Auto-price hooked on treatment input');
    }

    function hookTreatmentModalOpen() {
        const origOpenModal = window.openModal;
        if (!origOpenModal || origOpenModal._procCatHooked) return;

        window.openModal = function (id, ...args) {
            const result = origOpenModal.call(this, id, ...args);
            if (id === 'addTreatmentModal') {
                setTimeout(() => {
                    hookAutoPriceOnTreatmentInput();
                    const costInput = document.getElementById('treatmentTotalCost');
                    if (costInput) costInput.value = '';
                }, 100);
            }
            return result;
        };
        window.openModal._procCatHooked = true;
    }

    // Hook settings view to inject shortcut button
    function hookSettingsView() {
        const origSwitchView = window.switchView;
        if (!origSwitchView || origSwitchView._procCatHooked) return;

        window.switchView = function (viewName, ...args) {
            const result = origSwitchView.call(this, viewName, ...args);
            if (viewName === 'settings') {
                setTimeout(() => injectSettingsShortcut(), 200);
            }
            return result;
        };
        window.switchView._procCatHooked = true;
    }

    // ══════════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════════

    async function init() {
        let waited = 0;
        while (typeof window.dbGetAll !== 'function' && waited < 100) {
            await sleep(100);
            waited++;
        }

        if (navigator.onLine) {
            await sleep(1500);
        }

        await seedIfEmpty();
        _allProcedures = await getAllProcedures();

        // Inject both modals into DOM
        injectCatalogModal();
        injectCatalogItemModal();

        // Add sidebar button
        injectSidebarButton();

        // Update treatment datalist
        updateTreatmentDatalist();

        // Hook auto-price
        hookAutoPriceOnTreatmentInput();
        hookTreatmentModalOpen();

        // Hook settings view for shortcut button
        hookSettingsView();

        // If settings already open, inject shortcut
        const settingsView = document.getElementById('settingsView');
        if (settingsView?.classList.contains('active')) {
            injectSettingsShortcut();
        }

        console.log('[ProcCat] ✅ v2.0 initialized —', _allProcedures.length, 'procedures');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }

    // Export
    window.ProcedureCatalog = {
        getAll:   getAllProcedures,
        save:     saveProcedure,
        delete:   deleteProcedure,
        render:   renderProcCatalog,
        reload:   async () => { _allProcedures = await getAllProcedures(); updateTreatmentDatalist(); },
        openModal: window.openProcCatalogModal,
    };

})();
