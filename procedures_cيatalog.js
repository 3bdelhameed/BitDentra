// ══════════════════════════════════════════════════════════════════
//  procedures_catalog.js  v1.0
//
//  ✅ ميزات:
//  1. جدول إجراءات + أسعار محفوظ في Supabase (جدول: procedure_catalog)
//  2. Dexie store اسمه: procedureCatalog — أوف لاين بالكامل
//  3. لما تكتب في حقل الإجراء في modal الـ treatment → السعر يتحط تلقائي
//  4. سكشن إدارة الكتالوج في صفحة الـ Settings
//
//  تحتاج في Supabase SQL Editor:
//  ══════════════════════════════
//  CREATE TABLE IF NOT EXISTS procedure_catalog (
//    id          BIGSERIAL PRIMARY KEY,
//    name        TEXT NOT NULL,
//    price       NUMERIC(10,2) DEFAULT 0,
//    category    TEXT DEFAULT 'general',
//    notes       TEXT,
//    is_active   BOOLEAN DEFAULT true,
//    created_at  TIMESTAMPTZ DEFAULT NOW()
//  );
//  ALTER TABLE procedure_catalog ENABLE ROW LEVEL SECURITY;
//  CREATE POLICY "allow_all" ON procedure_catalog FOR ALL USING (true) WITH CHECK (true);
//  ══════════════════════════════
//
//  إضافة Dexie store في app.js (إضافة للـ schema):
//  procedureCatalog: '++id, name, category, is_active'
//
//  إضافة في index.html بعد session_payments.js:
//  <script src="procedures_catalog.js"></script>
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

    // ── DEFAULT PROCEDURES (يتحطوا أول مرة لو الجدول فاضي) ───────
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
        // ── SAFE: لو الـ store مش موجود في schema القديم، نرجع null بهدوء
        try {
            const s = db[DEX_STORE];
            if (s && typeof s.toArray === 'function') return s;
        } catch (_) {}
        return null;
    }

    // ── IN-MEMORY FALLBACK (لو Dexie store مش موجود بعد) ─────────
    window._procedureCatalogCache = window._procedureCatalogCache || [];

    // ── READ ALL ──────────────────────────────────────────────────
    async function getAllProcedures() {
        // 1. جرب Dexie
        const store = getDexStore();
        if (store) {
            try {
                const rows = await store.toArray();
                if (rows.length > 0) return rows;
            } catch (_) {}
        }
        // 2. جرب الـ in-memory cache
        if (window._procedureCatalogCache.length > 0) {
            return window._procedureCatalogCache;
        }
        // 3. جرب Supabase
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

    // ── MIRROR TO DEXIE ───────────────────────────────────────────
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

    // ── SAVE PROCEDURE ────────────────────────────────────────────
    async function saveProcedure(data, existingId = null) {
        const row = {
            name:      data.name.trim(),
            price:     parseFloat(data.price) || 0,
            category:  data.category || 'general',
            notes:     data.notes || '',
            is_active: true,
        };

        // Dexie أولاً
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
            // fallback to memory
            if (existingId) {
                const idx = window._procedureCatalogCache.findIndex(p => p.id === existingId);
                if (idx >= 0) window._procedureCatalogCache[idx] = { ...window._procedureCatalogCache[idx], ...row };
            } else {
                localId = Date.now();
                window._procedureCatalogCache.push({ id: localId, ...row });
            }
        }

        // Supabase
        if (sbReady() && window._sb) {
            try {
                if (existingId) {
                    const { error } = await window._sb.from(SB_TABLE).update(row).eq('id', existingId);
                    if (error) throw error;
                } else {
                    const { data: created, error } = await window._sb.from(SB_TABLE).insert(row).select().single();
                    if (error) throw error;
                    // حدّث Dexie بـ ID الحقيقي
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

    // ── DELETE PROCEDURE ──────────────────────────────────────────
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

    // ── SEED DEFAULTS (أول مرة بس) ───────────────────────────────
    async function seedIfEmpty() {
        const existing = await getAllProcedures();
        if (existing.length > 0) return;

        console.log('[ProcCat] Seeding default procedures...');
        for (const p of DEFAULT_PROCEDURES) {
            await saveProcedure(p);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  UI — سكشن الكتالوج داخل Settings
    // ══════════════════════════════════════════════════════════════

    function injectCatalogSection() {
        // لو موجود بالفعل، مش نضيف تاني
        if (document.getElementById('procedureCatalogSection')) return;

        const settingsView = document.getElementById('settingsView');
        if (!settingsView) return;

        const section = document.createElement('div');
        section.id = 'procedureCatalogSection';
        section.className = 'mt-6';
        section.innerHTML = `
            <div class="bg-white rounded-xl border border-gray-100 p-5">
                <div class="flex items-center justify-between mb-4 border-b pb-3">
                    <h3 class="font-bold text-gray-800 flex items-center gap-2">
                        <i class="fa-solid fa-list-check text-blue-500"></i>
                        كتالوج الإجراءات والأسعار
                    </h3>
                    <div class="flex gap-2">
                        <div class="search-box">
                            <i class="fa-solid fa-magnifying-glass text-xs"></i>
                            <input type="text" id="procCatSearch" placeholder="بحث..."
                                class="border border-gray-200 rounded-xl text-sm py-1.5 pr-4 pl-8 w-44"
                                oninput="filterProcedureCatalog()">
                        </div>
                        <button onclick="openProcCatModal()" class="btn btn-blue text-xs">
                            <i class="fa-solid fa-plus"></i> إجراء جديد
                        </button>
                    </div>
                </div>

                <!-- Category filter -->
                <div class="flex gap-2 flex-wrap mb-4" id="procCatFilters">
                    <button onclick="setProcCatFilter('all')" id="pcf-all"
                        class="btn btn-blue text-xs px-3 py-1">الكل</button>
                    ${CATEGORIES.map(c => `
                        <button onclick="setProcCatFilter('${c.value}')" id="pcf-${c.value}"
                            class="btn btn-gray text-xs px-3 py-1">${c.label}</button>
                    `).join('')}
                </div>

                <!-- Table -->
                <div class="overflow-hidden rounded-xl border border-gray-100">
                    <table class="w-full text-sm">
                        <thead>
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
                    <div id="procCatEmpty" class="hidden text-center py-12 text-gray-400">
                        <i class="fa-solid fa-list-check text-4xl mb-3 opacity-20"></i>
                        <p class="text-sm">لا توجد إجراءات — أضف إجراءك الأول</p>
                    </div>
                </div>
            </div>
        `;

        settingsView.appendChild(section);
    }

    // ── INJECT ADD/EDIT MODAL ─────────────────────────────────────
    function injectCatalogModal() {
        if (document.getElementById('procCatModal')) return;

        const modal = document.createElement('div');
        modal.id = 'procCatModal';
        modal.className = 'modal-base';
        modal.innerHTML = `
            <div class="modal-box max-w-md">
                <div class="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 class="text-lg font-bold flex items-center gap-2" id="procCatModalTitle">
                        <i class="fa-solid fa-plus-circle text-blue-500"></i> إجراء جديد
                    </h3>
                    <button onclick="closeProcCatModal()"
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
                    <button onclick="closeProcCatModal()" class="btn btn-gray flex-1">إلغاء</button>
                    <button onclick="submitProcCat()" class="btn btn-blue flex-1 justify-center">
                        <i class="fa-solid fa-save mr-1"></i> حفظ
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // ── RENDER TABLE ──────────────────────────────────────────────
    let _allProcedures = [];
    let _activeFilter  = 'all';

    async function renderProcCatalog() {
        _allProcedures = await getAllProcedures();
        applyProcCatalogRender();
    }

    function applyProcCatalogRender() {
        const tbody = document.getElementById('procCatTableBody');
        const empty = document.getElementById('procCatEmpty');
        if (!tbody) return;

        const search = (document.getElementById('procCatSearch')?.value || '').toLowerCase();
        const curr   = getCurrStr();

        let filtered = _allProcedures.filter(p => {
            const name     = (p.name || '').toLowerCase();
            const category = p.category || p.isActive !== false;
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
                        <button onclick="openProcCatModal(${p.id})"
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

    window.filterProcedureCatalog = function () {
        applyProcCatalogRender();
    };

    window.setProcCatFilter = function (val) {
        _activeFilter = val;
        document.querySelectorAll('[id^="pcf-"]').forEach(btn => {
            btn.className = btn.id === `pcf-${val}` ? 'btn btn-blue text-xs px-3 py-1' : 'btn btn-gray text-xs px-3 py-1';
        });
        applyProcCatalogRender();
    };

    window.openProcCatModal = async function (id = null) {
        document.getElementById('procCatEditId').value = id || '';
        document.getElementById('procCatName').value    = '';
        document.getElementById('procCatPrice').value   = '';
        document.getElementById('procCatNotes').value   = '';
        document.getElementById('procCatCategory').value = 'general';
        document.getElementById('procCatCurrLabel').innerText = getCurrStr();

        if (id) {
            // تحميل البيانات الموجودة
            const proc = _allProcedures.find(p => p.id == id);
            if (proc) {
                document.getElementById('procCatModalTitle').innerHTML =
                    '<i class="fa-solid fa-pen text-blue-500"></i> تعديل الإجراء';
                document.getElementById('procCatName').value     = proc.name || '';
                document.getElementById('procCatPrice').value    = proc.price || 0;
                document.getElementById('procCatNotes').value    = proc.notes || '';
                document.getElementById('procCatCategory').value = proc.category || 'general';
            }
        } else {
            document.getElementById('procCatModalTitle').innerHTML =
                '<i class="fa-solid fa-plus-circle text-blue-500"></i> إجراء جديد';
        }

        document.getElementById('procCatModal').classList.add('open');
        setTimeout(() => document.getElementById('procCatName').focus(), 100);
    };

    window.closeProcCatModal = function () {
        document.getElementById('procCatModal')?.classList.remove('open');
    };

    window.submitProcCat = async function () {
        const name  = document.getElementById('procCatName').value.trim();
        const price = document.getElementById('procCatPrice').value;
        const cat   = document.getElementById('procCatCategory').value;
        const notes = document.getElementById('procCatNotes').value.trim();
        const editId = document.getElementById('procCatEditId').value;

        if (!name) {
            if (typeof showToast === 'function') showToast('⚠️ اكتب اسم الإجراء', 'error');
            return;
        }

        const saveBtn = document.querySelector('#procCatModal .btn-blue');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> جاري الحفظ...'; }

        try {
            await saveProcedure({ name, price, category: cat, notes }, editId ? parseInt(editId) : null);
            if (typeof showToast === 'function') showToast('✅ تم حفظ الإجراء', 'success');
            window.closeProcCatModal();
            await renderProcCatalog();
            // تحديث الـ datalist في modal الـ treatment
            updateTreatmentDatalist();
        } finally {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fa-solid fa-save mr-1"></i> حفظ'; }
        }
    };

    window.confirmDeleteProcCat = async function (id, name) {
        if (!confirm(`هل تريد حذف "${name}"؟`)) return;
        await deleteProcedure(id);
        _allProcedures = _allProcedures.filter(p => p.id != id);
        applyProcCatalogRender();
        updateTreatmentDatalist();
        if (typeof showToast === 'function') showToast('🗑️ تم الحذف', 'success');
    };

    // ══════════════════════════════════════════════════════════════
    //  AUTO-PRICE: لما تختار إجراء يتحط السعر تلقائي
    // ══════════════════════════════════════════════════════════════

    function updateTreatmentDatalist() {
        // حدّث datalist الإجراءات
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

        // لما المستخدم يختار من الـ datalist أو يكتب
        let debounceTimer = null;
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const val = input.value.trim().toLowerCase();
                if (!val) return;
                const match = _allProcedures.find(p => (p.name||'').toLowerCase() === val);
                if (match && parseFloat(match.price) > 0) {
                    // فقط لو حقل التكلفة فاضي أو صفر
                    const current = parseFloat(costInput.value) || 0;
                    if (current === 0) {
                        costInput.value = match.price;
                        // أنيمشن خفيف
                        costInput.style.transition = 'background 0.3s';
                        costInput.style.background = '#f0fdf4';
                        setTimeout(() => { costInput.style.background = ''; }, 800);
                        // تحديث عمولة الدكتور لو موجود
                        if (typeof window.onTreatmentDoctorChange === 'function') {
                            window.onTreatmentDoctorChange();
                        }
                    }
                }
            }, 300);
        });

        // كمان عند change (اختيار من datalist)
        input.addEventListener('change', () => {
            const val = input.value.trim().toLowerCase();
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
        });

        console.log('[ProcCat] ✅ Auto-price hooked on treatment input');
    }

    // ── كمان عند فتح modal الـ treatment ─────────────────────────
    function hookTreatmentModalOpen() {
        const origOpenModal = window.openModal;
        if (!origOpenModal || origOpenModal._procCatHooked) return;

        window.openModal = function (id, ...args) {
            const result = origOpenModal.call(this, id, ...args);
            if (id === 'addTreatmentModal') {
                // استنى شوية عشان الـ modal يفتح
                setTimeout(() => {
                    hookAutoPriceOnTreatmentInput();
                    // reset السعر لو modal اتفتح جديد
                    const costInput = document.getElementById('treatmentTotalCost');
                    if (costInput) costInput.value = '';
                }, 100);
            }
            return result;
        };
        window.openModal._procCatHooked = true;
    }

    // ══════════════════════════════════════════════════════════════
    //  SETTINGS: inject tab في صفحة الـ Settings
    // ══════════════════════════════════════════════════════════════

    function hookSettingsView() {
        const origSwitchView = window.switchView;
        if (!origSwitchView || origSwitchView._procCatHooked) return;

        window.switchView = function (viewName, ...args) {
            const result = origSwitchView.call(this, viewName, ...args);
            if (viewName === 'settings') {
                setTimeout(() => {
                    injectCatalogSection();
                    renderProcCatalog();
                }, 150);
            }
            return result;
        };
        window.switchView._procCatHooked = true;
    }

    // ══════════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════════

    async function init() {
        // انتظر DB
        let waited = 0;
        while (typeof window.dbGetAll !== 'function' && waited < 100) {
            await sleep(100);
            waited++;
        }

        // انتظر Supabase إذا أون لاين
        if (navigator.onLine) {
            await sleep(1500);
        }

        // Seed default procedures لو فاضي
        await seedIfEmpty();

        // تحميل الكتالوج في الذاكرة
        _allProcedures = await getAllProcedures();

        // Inject modal
        injectCatalogModal();

        // حدّث datalist الـ treatment modal
        updateTreatmentDatalist();

        // Hook auto-price
        hookAutoPriceOnTreatmentInput();
        hookTreatmentModalOpen();

        // Hook settings view
        hookSettingsView();

        // لو Settings مفتوحة حالياً
        const settingsView = document.getElementById('settingsView');
        if (settingsView?.classList.contains('active')) {
            injectCatalogSection();
            renderProcCatalog();
        }

        console.log('[ProcCat] ✅ v1.0 initialized —', _allProcedures.length, 'procedures');
    }

    // ── START ─────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }

    // ── EXPORT للاستخدام الخارجي ──────────────────────────────────
    window.ProcedureCatalog = {
        getAll:   getAllProcedures,
        save:     saveProcedure,
        delete:   deleteProcedure,
        render:   renderProcCatalog,
        reload:   async () => { _allProcedures = await getAllProcedures(); updateTreatmentDatalist(); },
    };

})();
