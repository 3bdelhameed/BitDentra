// ══════════════════════════════════════════════════════════════════
//  procedures_catalog.js  v3.0
//
//  ✅ ميزات النظام الشامل:
//  1. صفحة مستقلة كاملة (proceduresView) مع إحصائيات وبحث وتصنيفات وجدول أنيق.
//  2. تخزين محلي غير منقطع (Dexie + LocalStorage backup + مزامنة Supabase عند الاتصال).
//  3. اختيار الإجراءات في نافذة إضافة علاج (addTreatmentModal):
//     - أزرار سريعة بنقرة واحدة (Quick Chips) لأكثر 7 إجراءات استخداماً مع السعر.
//     - قائمة ذكية منسدلة (Smart Dropdown) ببحث فوري عربي وإنجليزي وتصنيفات وأسعار ملونة.
//     - تطبيق السعر الافتراضي فوراً مع تأثير بصري جذاب + تحديث حالة السن ونسبة الطبيب.
//     - إضافة إجراء جديد للكتالوج مباشرة من داخل نافذة العلاج دون فقد البيانات.
//  4. ربط كامل بالـ Sidebar و switchView('procedures') مع تصاريح المستخدمين.
// ══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── TABLE & STORE NAMES ────────────────────────────────────────
    const SB_TABLE      = 'procedure_catalog';
    const DEX_STORE     = 'procedureCatalog';
    const LOCAL_BACKUP  = 'bitdentra_procedures_cache_v3';

    // ── CATEGORIES ────────────────────────────────────────────────
    const CATEGORIES = [
        { value: 'restorative',   label: '🔧 ترميمي وحشوات',  icon: 'fa-wrench',      color: 'bg-amber-50 text-amber-700 border-amber-200' },
        { value: 'endodontic',    label: '🩹 علاج عصب',       icon: 'fa-heart-pulse', color: 'bg-purple-50 text-purple-700 border-purple-200' },
        { value: 'surgical',      label: '🔪 جراحة وخلع',     icon: 'fa-scissors',    color: 'bg-rose-50 text-rose-700 border-rose-200' },
        { value: 'prosthodontic', label: '👑 تركيبات وزراعة', icon: 'fa-crown',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
        { value: 'periodontic',   label: '🧹 لثة وتنظيف',     icon: 'fa-broom',       color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { value: 'cosmetic',      label: '✨ تجميل وتبييض',   icon: 'fa-wand-magic',  color: 'bg-pink-50 text-pink-700 border-pink-200' },
        { value: 'orthodontic',   label: '📎 تقويم أسنان',    icon: 'fa-paperclip',   color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        { value: 'diagnostic',    label: '🔍 تشخيص وأشعة',    icon: 'fa-x-ray',       color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        { value: 'other',         label: '📋 خدمات أخرى',     icon: 'fa-clipboard',   color: 'bg-gray-50 text-gray-700 border-gray-200' },
    ];

    // ── DEFAULT PROCEDURES (Bilingual Dental List with Egyptian Clinic Pricing) ──
    const DEFAULT_PROCEDURES = [
        // Restorative
        { name: 'حشو كومبوزيت تجميلي (Composite)',     price: 350,  category: 'restorative',   notes: 'جلسة واحدة، ترميم ضوئي' },
        { name: 'حشو أملجم فضي (Amalgam)',             price: 250,  category: 'restorative',   notes: 'حشو خلفي متين' },
        { name: 'بناء ضرس ودعامة فايبر (Post & Core)',  price: 600,  category: 'restorative',   notes: 'إعادة بناء بعد علاج العصب' },
        { name: 'حشو جلاس ايونمر (Glass Ionomer)',     price: 300,  category: 'restorative',   notes: 'للأطفال أو عنق الأسنان' },
        { name: 'حشو مؤقت (Temporary Filling)',        price: 150,  category: 'restorative',   notes: 'بين الجلسات' },

        // Endodontic
        { name: 'علاج عصب ضرس خلفي (Root Canal Molar)', price: 1400, category: 'endodontic',    notes: 'شامل الحشو النهائي للقنوات' },
        { name: 'علاج عصب سن أمامي (Root Canal Anterior)', price: 1000, category: 'endodontic', notes: 'قناة واحدة' },
        { name: 'إعادة علاج عصب (Re-RCT)',             price: 1600, category: 'endodontic',    notes: 'إزالة حشو قديم وإعادة تنظيف' },
        { name: 'فتح خراج وتصريف (Abscess Drainage)',   price: 300,  category: 'endodontic',    notes: 'إسعاف طارئ ومضادات' },
        { name: 'بتر عصب أطفال (Pulpotomy)',           price: 450,  category: 'endodontic',    notes: 'أسنان لبنية' },

        // Surgical
        { name: 'خلع أسنان عادي (Simple Extraction)',   price: 300,  category: 'surgical',      notes: 'تخدير موضعي بسيط' },
        { name: 'خلع جراحي / ضرس عقل (Surgical Extraction)', price: 900, category: 'surgical', notes: 'خياطة ومتابعة' },
        { name: 'خلع بقايا جذور (Root Tip Extraction)', price: 350,  category: 'surgical',      notes: 'أدوات دقيقة' },
        { name: 'خلع أسنان أطفال (Deciduous Extraction)', price: 200, category: 'surgical',    notes: 'سريع وبسيط' },
        { name: 'قص لثة جراحي (Gingivectomy)',         price: 500,  category: 'surgical',      notes: 'تعديل خط الابتسامة' },

        // Prosthodontics & Implants
        { name: 'طربوش / كراون زركونيا (Zirconia Crown)', price: 2500, category: 'prosthodontic', notes: 'شديد القوة وتجميلي' },
        { name: 'طربوش بورسلين PFM (Porcelain Crown)',  price: 1800, category: 'prosthodontic', notes: 'معدن مغطى ببورسلين' },
        { name: 'طربوش إيماكس (E-Max Crown)',          price: 3000, category: 'prosthodontic', notes: 'أعلى شفافية للأسنان الأمامية' },
        { name: 'زراعة أسنان (Dental Implant)',        price: 8000, category: 'prosthodontic', notes: 'زرعة معملية كاملة' },
        { name: 'طقم أسنان كامل (Full Denture)',       price: 5500, category: 'prosthodontic', notes: 'علوي أو سفلي' },
        { name: 'طقم جزئي متحرك (Partial Denture)',    price: 3200, category: 'prosthodontic', notes: 'أكريل أو كروما' },
        { name: 'لصق كراون ساقط (Recementation)',      price: 200,  category: 'prosthodontic', notes: 'تنظيف ولصق حديث' },

        // Periodontic
        { name: 'تنظيف جير وتلميع (Scaling & Polishing)', price: 400, category: 'periodontic', notes: 'موجات فوق صوتية وبولش' },
        { name: 'تنظيف لثة عميق وكحت (Deep Curettage)', price: 700,  category: 'periodontic',  notes: 'علاج الجيوب اللثوية' },
        { name: 'جلسة علاج التهاب اللثة (Gingivitis Session)', price: 350, category: 'periodontic', notes: 'غسول ومضادات موضعية' },

        // Cosmetic
        { name: 'تبييض أسنان عيادة (In-Office Whitening)', price: 1500, category: 'cosmetic',  notes: 'جلسة 45 دقيقة بالضوء' },
        { name: 'فينير / عدسات إيماكس (Veneer E-Max)', price: 2800, category: 'cosmetic',      notes: 'للسن الواحد' },
        { name: 'فينير كومبوزيت (Composite Veneer)',   price: 900,  category: 'cosmetic',      notes: 'مباشر بالعيادة' },

        // Orthodontic
        { name: 'كشف واستشارة تقويم (Ortho Consultation)', price: 250, category: 'orthodontic', notes: 'فحص خطة العلاج' },
        { name: 'جلسة شد تقويم شهري (Ortho Adjustment)', price: 400, category: 'orthodontic', notes: 'تغيير أسلاك ومطاط' },
        { name: 'مثبت تقويم شفاف (Clear Retainer)',    price: 800,  category: 'orthodontic',   notes: 'فك واحد' },

        // Diagnostic
        { name: 'كشف وتشخيص عام (Examination)',        price: 150,  category: 'diagnostic',    notes: 'فحص شامل بالمرآة' },
        { name: 'أشعة سينية صغيرة (Periapical X-Ray)',  price: 100,  category: 'diagnostic',    notes: 'صورة للسن والذروة' },
        { name: 'أشعة بانوراما رقمية (Panoramic X-Ray)', price: 300, category: 'diagnostic',   notes: 'للفكين بالكامل' },

        // Other
        { name: 'واقي أسنان ليلي (Night Guard)',       price: 1000, category: 'other',         notes: 'حماية من الجز أثناء النوم' },
        { name: 'دفعة نقدية من الحساب (Account Payment)', price: 0,  category: 'other',         notes: 'سداد دفعة سابقة' },
    ];

    // Top recommended procedures for instant quick-pick chips
    const TOP_SHORTCUTS = [
        { name: 'حشو كومبوزيت تجميلي (Composite)',     price: 350,  icon: 'fa-tooth', color: 'blue' },
        { name: 'علاج عصب ضرس خلفي (Root Canal Molar)', price: 1400, icon: 'fa-heart-pulse', color: 'purple' },
        { name: 'خلع أسنان عادي (Simple Extraction)',   price: 300,  icon: 'fa-scissors', color: 'rose' },
        { name: 'تنظيف جير وتلميع (Scaling & Polishing)', price: 400, icon: 'fa-broom', color: 'emerald' },
        { name: 'طربوش / كراون زركونيا (Zirconia Crown)', price: 2500, icon: 'fa-crown', color: 'amber' },
        { name: 'زراعة أسنان (Dental Implant)',        price: 8000, icon: 'fa-gem', color: 'cyan' },
        { name: 'تبييض أسنان عيادة (In-Office Whitening)', price: 1500, icon: 'fa-wand-magic', color: 'pink' },
    ];

    // ── STATE ──────────────────────────────────────────────────────
    let _allProcedures     = [];
    let _activePageFilter  = 'all';
    let _activeDropdownCat = 'all';
    let _highlightedIndex  = -1;

    // ── HELPERS ───────────────────────────────────────────────────
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function sbReady() {
        if (!window._sbReady) return false;
        return typeof window._sbReady === 'function' ? window._sbReady() : !!window._sbReady;
    }

    function getCurrStr() {
        return typeof window.getCurrency === 'function' ? window.getCurrency() : 'EGP';
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

    function loadLocalBackup() {
        try {
            const raw = localStorage.getItem(LOCAL_BACKUP);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        return [];
    }

    function saveLocalBackup(rows) {
        try {
            if (Array.isArray(rows) && rows.length > 0) {
                localStorage.setItem(LOCAL_BACKUP, JSON.stringify(rows));
            }
        } catch (_) {}
    }

    function getCategoryMeta(catVal) {
        return CATEGORIES.find(c => c.value === catVal) || {
            value: catVal || 'other',
            label: '📋 أخرى',
            icon: 'fa-tag',
            color: 'bg-gray-50 text-gray-700 border-gray-200'
        };
    }

    // ── READ PROCEDURES (Multi-layer fallback) ─────────────────────
    async function getAllProcedures() {
        // 1. Try Dexie store
        const store = getDexStore();
        if (store) {
            try {
                const rows = await store.toArray();
                if (rows && rows.length > 0) {
                    _allProcedures = rows.map(normalizeProcedure);
                    saveLocalBackup(_allProcedures);
                    return _allProcedures;
                }
            } catch (e) {
                console.warn('[ProcCat] Dexie read fallback:', e.message);
            }
        }

        // 2. Try LocalStorage backup
        const localRows = loadLocalBackup();
        if (localRows.length > 0) {
            _allProcedures = localRows.map(normalizeProcedure);
            return _allProcedures;
        }

        // 3. Try Supabase cloud
        if (sbReady() && window._sb) {
            try {
                const { data, error } = await window._sb.from(SB_TABLE).select('*').order('name');
                if (!error && data && data.length > 0) {
                    _allProcedures = data.map(normalizeProcedure);
                    saveLocalBackup(_allProcedures);
                    await mirrorToDexie(_allProcedures);
                    return _allProcedures;
                }
            } catch (e) {
                console.warn('[ProcCat] Supabase read fallback:', e.message);
            }
        }

        return _allProcedures;
    }

    function normalizeProcedure(p) {
        return {
            id:        p.id || Date.now() + Math.floor(Math.random() * 1000),
            name:      (p.name || '').trim(),
            price:     parseFloat(p.price) || 0,
            category:  p.category || 'general',
            notes:     p.notes || '',
            isActive:  p.isActive !== false && p.is_active !== false,
            createdAt: p.createdAt || p.created_at || new Date().toISOString()
        };
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
                isActive:  r.isActive !== false,
                createdAt: r.createdAt
            }));
            await store.bulkPut(camelRows);
        } catch (e) {
            console.warn('[ProcCat] Mirror to Dexie failed:', e.message);
        }
    }

    // ── SAVE PROCEDURE ─────────────────────────────────────────────
    async function saveProcedure(data, existingId = null) {
        const row = {
            name:      data.name.trim(),
            price:     parseFloat(data.price) || 0,
            category:  data.category || 'restorative',
            notes:     data.notes ? data.notes.trim() : '',
            isActive:  true,
            createdAt: new Date().toISOString()
        };

        const store = getDexStore();
        let localId = existingId;

        if (store) {
            try {
                const camel = {
                    name:      row.name,
                    price:     row.price,
                    category:  row.category,
                    notes:     row.notes,
                    isActive:  true
                };
                if (existingId) {
                    await store.update(existingId, camel);
                } else {
                    localId = await store.add({ ...camel, _pendingSync: !sbReady() });
                }
            } catch (e) {
                console.warn('[ProcCat] Dexie write error:', e.message);
            }
        }

        // Update in-memory state
        if (existingId) {
            const idx = _allProcedures.findIndex(p => p.id == existingId);
            if (idx >= 0) _allProcedures[idx] = { ..._allProcedures[idx], ...row };
        } else {
            localId = localId || Date.now();
            _allProcedures.unshift({ id: localId, ...row });
        }

        saveLocalBackup(_allProcedures);

        // Supabase sync (graceful background attempt)
        if (sbReady() && window._sb) {
            try {
                const sbRow = {
                    name:      row.name,
                    price:     row.price,
                    category:  row.category,
                    notes:     row.notes,
                    is_active: true
                };
                if (existingId) {
                    await window._sb.from(SB_TABLE).update(sbRow).eq('id', existingId);
                } else {
                    const { data: created, error } = await window._sb.from(SB_TABLE).insert(sbRow).select().single();
                    if (!error && created && store && localId && created.id !== localId) {
                        try {
                            await store.delete(localId);
                            await store.put({ id: created.id, ...camel });
                            const mIdx = _allProcedures.findIndex(p => p.id == localId);
                            if (mIdx >= 0) _allProcedures[mIdx].id = created.id;
                            localId = created.id;
                        } catch (_) {}
                    }
                }
            } catch (e) {
                console.log('[ProcCat] Cloud sync skipped (stored locally):', e.message);
            }
        }

        updateTreatmentUI();
        return { id: localId, ...row };
    }

    // ── DELETE PROCEDURE ───────────────────────────────────────────
    async function deleteProcedure(id) {
        const store = getDexStore();
        if (store) {
            try { await store.delete(id); } catch (_) {}
        }
        _allProcedures = _allProcedures.filter(p => p.id != id);
        saveLocalBackup(_allProcedures);

        if (sbReady() && window._sb) {
            try {
                await window._sb.from(SB_TABLE).delete().eq('id', id);
            } catch (e) {
                console.log('[ProcCat] Cloud delete skipped:', e.message);
            }
        }

        updateTreatmentUI();
    }

    // ── SEED PROCEDURES ────────────────────────────────────────────
    async function seedDefaults(force = false) {
        if (!force && _allProcedures.length > 0) return;

        console.log('[ProcCat] Seeding standard dental catalog...');
        const store = getDexStore();
        let seeded = [];

        for (let i = 0; i < DEFAULT_PROCEDURES.length; i++) {
            const def = DEFAULT_PROCEDURES[i];
            const item = {
                id:        Date.now() + i,
                name:      def.name,
                price:     def.price,
                category:  def.category,
                notes:     def.notes || '',
                isActive:  true,
                createdAt: new Date().toISOString()
            };
            seeded.push(item);

            if (store) {
                try {
                    await store.put(item);
                } catch (_) {}
            }
        }

        _allProcedures = seeded;
        saveLocalBackup(_allProcedures);

        // Try syncing to Supabase if available
        if (sbReady() && window._sb) {
            try {
                const sbItems = seeded.map(s => ({
                    name:      s.name,
                    price:     s.price,
                    category:  s.category,
                    notes:     s.notes,
                    is_active: true
                }));
                await window._sb.from(SB_TABLE).upsert(sbItems, { onConflict: 'name' });
            } catch (_) {}
        }

        updateTreatmentUI();
    }

    // ══════════════════════════════════════════════════════════════
    //  PROCEDURES VIEW (THE DEDICATED FULL PAGE)
    // ══════════════════════════════════════════════════════════════

    async function loadProceduresView() {
        if (!_allProcedures || _allProcedures.length === 0) {
            await getAllProcedures();
            if (_allProcedures.length === 0) {
                await seedDefaults(false);
            }
        }

        renderPageStats();
        renderPageCategoryFilters();
        renderPageTable();
    }

    function renderPageStats() {
        const total = _allProcedures.length;
        const avg   = total > 0 ? Math.round(_allProcedures.reduce((s, p) => s + (parseFloat(p.price) || 0), 0) / total) : 0;
        const max   = total > 0 ? Math.max(..._allProcedures.map(p => parseFloat(p.price) || 0)) : 0;
        const cats  = new Set(_allProcedures.map(p => p.category)).size;
        const curr  = getCurrStr();

        const setT = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        setT('procPageStatTotal',  total);
        setT('procPageStatAvg',    avg.toLocaleString() + ' ' + curr);
        setT('procPageStatCats',   cats);
        setT('procPageStatMax',    max.toLocaleString() + ' ' + curr);
        setT('procPageBadgeCount', total + ' إجراء');
    }

    function renderPageCategoryFilters() {
        const container = document.getElementById('procPageCategoryFilters');
        if (!container) return;

        const counts = { all: _allProcedures.length };
        CATEGORIES.forEach(c => {
            counts[c.value] = _allProcedures.filter(p => p.category === c.value).length;
        });

        const allActive = _activePageFilter === 'all';
        let html = `
            <button onclick="setProcedurePageFilter('all')"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${allActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                <span>🌟 الكل</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full ${allActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}">${counts.all}</span>
            </button>
        `;

        CATEGORIES.forEach(c => {
            const count = counts[c.value] || 0;
            const active = _activePageFilter === c.value;
            html += `
                <button onclick="setProcedurePageFilter('${c.value}')"
                    class="px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                    <span>${c.label}</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}">${count}</span>
                </button>
            `;
        });

        container.innerHTML = html;
    }

    function renderPageTable() {
        const tbody = document.getElementById('procPageTableBody');
        const empty = document.getElementById('procPageEmpty');
        if (!tbody) return;

        const query  = (document.getElementById('procPageViewSearch')?.value || '').toLowerCase().trim();
        const sortBy = document.getElementById('procPageSortBy')?.value || 'name_asc';
        const curr   = getCurrStr();

        let filtered = _allProcedures.filter(p => {
            const matchesCat = _activePageFilter === 'all' || p.category === _activePageFilter;
            if (!matchesCat) return false;
            if (!query) return true;

            const nameMatch  = (p.name || '').toLowerCase().includes(query);
            const notesMatch = (p.notes || '').toLowerCase().includes(query);
            const catMeta    = getCategoryMeta(p.category);
            const catMatch   = catMeta.label.toLowerCase().includes(query);
            return nameMatch || notesMatch || catMatch;
        });

        // Sorting
        filtered.sort((a, b) => {
            if (sortBy === 'price_asc')  return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
            if (sortBy === 'price_desc') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
            if (sortBy === 'category')   return (a.category || '').localeCompare(b.category || '', 'ar');
            return (a.name || '').localeCompare(b.name || '', 'ar');
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            empty?.classList.remove('hidden');
            return;
        }

        empty?.classList.add('hidden');

        tbody.innerHTML = filtered.map((p, idx) => {
            const cat = getCategoryMeta(p.category);
            const safeName = (p.name || '').replace(/'/g, "\\'");
            return `
                <tr class="hover:bg-blue-50/40 transition duration-150">
                    <td class="px-4 py-3 text-xs text-gray-400 font-bold">${idx + 1}</td>
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center text-xs shrink-0">
                                <i class="fa-solid ${cat.icon}"></i>
                            </div>
                            <div>
                                <p class="font-bold text-gray-800 text-sm leading-tight">${escapeHtml(p.name)}</p>
                                <p class="text-[11px] text-gray-400 mt-0.5">${p.notes ? escapeHtml(p.notes) : 'لا توجد ملاحظات إضافية'}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${cat.color}">
                            <i class="fa-solid ${cat.icon} text-[9px]"></i>
                            <span>${cat.label}</span>
                        </span>
                    </td>
                    <td class="px-4 py-3 text-right">
                        <span class="text-sm font-black text-gray-900">${(parseFloat(p.price) || 0).toLocaleString()}</span>
                        <span class="text-xs font-semibold text-emerald-600 ml-1">${curr}</span>
                    </td>
                    <td class="px-4 py-3 text-right text-xs text-gray-500 max-w-xs truncate">
                        ${p.notes ? escapeHtml(p.notes) : '<span class="text-gray-300">—</span>'}
                    </td>
                    <td class="px-4 py-3 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="testProcedureInTreatment(${p.id})"
                                class="btn text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                                title="إضافة في علاج المريض الآن">
                                <i class="fa-solid fa-tooth mr-1"></i> <span>استخدام</span>
                            </button>
                            <button onclick="openProcCatItemModal(${p.id})"
                                class="btn btn-outline text-xs px-2 py-1 text-blue-600 hover:text-blue-700" title="تعديل">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button onclick="confirmDeleteProc(${p.id}, '${safeName}')"
                                class="btn text-xs px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition" title="حذف">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.setProcedurePageFilter = function (val) {
        _activePageFilter = val;
        renderPageCategoryFilters();
        renderPageTable();
    };

    window.filterProcedurePageView = function () {
        renderPageTable();
    };

    window.restoreDefaultProcedures = async function () {
        if (!confirm('هل تريد استعادة قائمة الإجراءات الافتراضية الشاملة؟ سيتم إضافة الإجراءات القياسية لعيادات الأسنان.')) return;
        await seedDefaults(true);
        if (typeof showToast === 'function') showToast('✅ تم استعادة كتالوج الإجراءات الافتراضية بنجاح', 'success');
        await loadProceduresView();
    };

    window.confirmDeleteProc = async function (id, name) {
        if (!confirm(`هل أنت متأكد من حذف الإجراء:\n"${name}"؟`)) return;
        await deleteProcedure(id);
        if (typeof showToast === 'function') showToast('🗑️ تم حذف الإجراء', 'success');
        await loadProceduresView();
    };

    // Fast-test in treatment modal: opens addTreatmentModal and pre-fills procedure + cost
    window.testProcedureInTreatment = function (id) {
        const proc = _allProcedures.find(p => p.id == id);
        if (!proc) return;

        if (typeof window.openModal === 'function') {
            window.openModal('addTreatmentModal');
            setTimeout(() => {
                selectProcedureForTreatment(proc);
            }, 150);
        }
    };

    // ══════════════════════════════════════════════════════════════
    //  REVOLUTIONARY PROCEDURE PICKER IN ADD TREATMENT MODAL
    // ══════════════════════════════════════════════════════════════

    function updateTreatmentUI() {
        renderTreatmentQuickChips();
        renderDropdownCategories();
        renderDropdownList();
        updateTreatmentDatalist();
    }

    function renderTreatmentQuickChips() {
        const container = document.getElementById('treatmentQuickChips');
        if (!container) return;

        const chips = TOP_SHORTCUTS.map(s => {
            const match = _allProcedures.find(p => (p.name || '').includes(s.name.split(' ')[0]) || (p.name || '').toLowerCase() === s.name.toLowerCase());
            const price = match ? match.price : s.price;
            const fullName = match ? match.name : s.name;
            const safeName = fullName.replace(/'/g, "\\'");
            const curr = getCurrStr();

            return `
                <button type="button"
                    onclick="selectQuickChipProcedure('${safeName}', ${price})"
                    class="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 text-gray-700 hover:text-blue-700 text-xs font-semibold whitespace-nowrap shadow-sm transition active:scale-95">
                    <i class="fa-solid ${s.icon} text-blue-500 text-[10px]"></i>
                    <span>${escapeHtml(fullName.split('(')[0].trim())}</span>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 group-hover:bg-emerald-100">
                        ${price} ${curr}
                    </span>
                </button>
            `;
        }).join('');

        container.innerHTML = chips;
    }

    function renderDropdownCategories() {
        const container = document.getElementById('procDropdownCatFilter');
        if (!container) return;

        let html = `
            <button type="button" onclick="setDropdownCategory('all')"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${_activeDropdownCat === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}">
                الكل
            </button>
        `;

        CATEGORIES.forEach(c => {
            const active = _activeDropdownCat === c.value;
            html += `
                <button type="button" onclick="setDropdownCategory('${c.value}')"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap ${active ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}">
                    ${c.label.split(' ')[1] || c.label}
                </button>
            `;
        });

        container.innerHTML = html;
    }

    function renderDropdownList(searchQuery = '') {
        const listEl  = document.getElementById('procDropdownList');
        const countEl = document.getElementById('procDropdownCount');
        if (!listEl) return;

        const q = (searchQuery || document.getElementById('treatmentProcedure')?.value || '').toLowerCase().trim();
        const curr = getCurrStr();

        let filtered = _allProcedures.filter(p => {
            const matchCat = _activeDropdownCat === 'all' || p.category === _activeDropdownCat;
            if (!matchCat) return false;
            if (!q) return true;

            const nameMatch  = (p.name || '').toLowerCase().includes(q);
            const notesMatch = (p.notes || '').toLowerCase().includes(q);
            const catMeta    = getCategoryMeta(p.category);
            const catMatch   = catMeta.label.toLowerCase().includes(q);
            return nameMatch || notesMatch || catMatch;
        });

        if (countEl) {
            countEl.innerText = `${filtered.length} إجراء متاح`;
        }

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="p-6 text-center text-gray-400">
                    <i class="fa-solid fa-magnifying-glass text-2xl mb-2 opacity-30"></i>
                    <p class="text-xs font-semibold">لا يوجد إجراء مطابق لـ "${escapeHtml(q)}"</p>
                    <p class="text-[11px] text-gray-400 mt-1">يمكنك متابعة الكتابة كإجراء مخصص أو إضافته للكتالوج</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = filtered.map((p, idx) => {
            const cat = getCategoryMeta(p.category);
            const isHighlighted = idx === _highlightedIndex;
            const safeName = (p.name || '').replace(/'/g, "\\'");

            return `
                <div onclick="selectProcedureForTreatmentById(${p.id})"
                    id="procDropItem-${idx}"
                    class="p-2.5 px-3 flex items-center justify-between cursor-pointer transition ${isHighlighted ? 'bg-blue-100/70' : 'hover:bg-blue-50/60'}">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-7 h-7 rounded-lg ${cat.color} flex items-center justify-center text-xs shrink-0">
                            <i class="fa-solid ${cat.icon}"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="font-bold text-xs text-gray-800 truncate">${escapeHtml(p.name)}</p>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <span class="text-[10px] text-gray-400">${cat.label}</span>
                                ${p.notes ? `<span class="text-[10px] text-gray-300">• ${escapeHtml(p.notes)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="text-left shrink-0 mr-2">
                        <span class="inline-block text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ${(parseFloat(p.price) || 0).toLocaleString()} ${curr}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.setDropdownCategory = function (cat) {
        _activeDropdownCat = cat;
        renderDropdownCategories();
        renderDropdownList();
    };

    window.toggleProcedureDropdown = function () {
        const dropdown = document.getElementById('procSmartDropdown');
        if (!dropdown) return;
        if (dropdown.classList.contains('hidden')) {
            openProcedureDropdown();
        } else {
            closeProcedureDropdown();
        }
    };

    window.openProcedureDropdown = function () {
        const dropdown = document.getElementById('procSmartDropdown');
        const chevron  = document.getElementById('procDropdownChevron');
        if (!dropdown) return;

        dropdown.classList.remove('hidden');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        _highlightedIndex = -1;
        renderDropdownCategories();
        renderDropdownList();
    };

    window.closeProcedureDropdown = function () {
        const dropdown = document.getElementById('procSmartDropdown');
        const chevron  = document.getElementById('procDropdownChevron');
        if (!dropdown) return;

        dropdown.classList.add('hidden');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        _highlightedIndex = -1;
    };

    window.handleProcedureInputSearch = function (val) {
        openProcedureDropdown();
        renderDropdownList(val);
        if (typeof window.checkImplantProcedure === 'function') {
            window.checkImplantProcedure();
        }
    };

    window.selectQuickChipProcedure = function (name, price) {
        const match = _allProcedures.find(p => (p.name || '').toLowerCase() === (name || '').toLowerCase());
        if (match) {
            selectProcedureForTreatment(match);
        } else {
            selectProcedureForTreatment({ name, price });
        }
    };

    window.selectProcedureForTreatmentById = function (id) {
        const match = _allProcedures.find(p => p.id == id);
        if (match) {
            selectProcedureForTreatment(match);
        }
    };

    function selectProcedureForTreatment(proc) {
        const input     = document.getElementById('treatmentProcedure');
        const costInput = document.getElementById('treatmentTotalCost');
        const condEl    = document.getElementById('treatmentToothCondition');
        if (!input) return;

        // 1. Fill procedure name
        input.value = proc.name;
        closeProcedureDropdown();

        // 2. Fill price
        if (costInput && parseFloat(proc.price) >= 0) {
            costInput.value = proc.price;
            // Flash animation for visual confirmation
            costInput.style.transition = 'all 0.3s';
            costInput.style.background = '#dcfce7';
            costInput.style.borderColor = '#22c55e';
            costInput.style.transform = 'scale(1.02)';
            setTimeout(() => {
                costInput.style.background = '';
                costInput.style.borderColor = '';
                costInput.style.transform = '';
            }, 600);
        }

        // 3. Smart Tooth Condition auto-selection
        if (condEl) {
            const val = proc.name.toLowerCase();
            if (val.includes('crown') || val.includes('طربوش') || val.includes('كراون') ||
                val.includes('تركيب') || val.includes('تركيبه') || val.includes('تركيبة') ||
                val.includes('bridge') || val.includes('جسر') || val.includes('كبري') ||
                val.includes('denture') || val.includes('طقم') ||
                val.includes('veneer') || val.includes('فينير') ||
                val.includes('zircon') || val.includes('زركون') ||
                val.includes('emax') || val.includes('إيماكس') || val.includes('ايماكس') ||
                val.includes('inlay') || val.includes('onlay')) {
                condEl.value = 'crown_work';
            } else if (val.includes('root') || val.includes('عصب') || val.includes('جذور')) {
                condEl.value = 'root_canal';
            } else if (val.includes('extract') || val.includes('خلع')) {
                condEl.value = 'missing';
            } else if (val.includes('fill') || val.includes('حشو') || val.includes('scaling') || val.includes('تنظيف')) {
                condEl.value = 'treated';
            }
        }

        // 4. Trigger implant check if needed
        if (typeof window.checkImplantProcedure === 'function') {
            window.checkImplantProcedure();
        }

        // 5. Trigger Doctor Commission recalculation
        if (typeof window.onTreatmentDoctorChange === 'function') {
            window.onTreatmentDoctorChange();
        }

        // 6. Dispatch native events so other listeners are notified
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        // 7. Micro feedback
        if (typeof showToast === 'function') {
            showToast(`✅ تم اختيار: ${proc.name} (${proc.price} ${getCurrStr()})`, 'info');
        }
    }

    function updateTreatmentDatalist() {
        const dl = document.getElementById('proceduresList');
        if (!dl) return;
        dl.innerHTML = _allProcedures
            .filter(p => p.isActive !== false)
            .map(p => `<option value="${escapeHtml(p.name)}">`)
            .join('');
    }

    // Close dropdown on outside click
    document.addEventListener('click', e => {
        const wrapper = document.getElementById('procPickerWrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            closeProcedureDropdown();
        }
    });

    // Keyboard navigation (Arrow keys & Enter) inside procedure input
    document.addEventListener('keydown', e => {
        const input = document.getElementById('treatmentProcedure');
        if (!input || document.activeElement !== input) return;

        const dropdown = document.getElementById('procSmartDropdown');
        if (!dropdown || dropdown.classList.contains('hidden')) return;

        const items = dropdown.querySelectorAll('[id^="procDropItem-"]');
        if (!items || items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            _highlightedIndex = Math.min(_highlightedIndex + 1, items.length - 1);
            updateHighlightedDropdownItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            _highlightedIndex = Math.max(_highlightedIndex - 1, 0);
            updateHighlightedDropdownItem(items);
        } else if (e.key === 'Enter') {
            if (_highlightedIndex >= 0 && items[_highlightedIndex]) {
                e.preventDefault();
                items[_highlightedIndex].click();
            }
        } else if (e.key === 'Escape') {
            closeProcedureDropdown();
        }
    });

    function updateHighlightedDropdownItem(items) {
        items.forEach((item, idx) => {
            if (idx === _highlightedIndex) {
                item.classList.add('bg-blue-100/80');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('bg-blue-100/80');
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    //  ADD / EDIT PROCEDURE MODAL (ITEM FORM)
    // ══════════════════════════════════════════════════════════════

    function injectCatalogItemModal() {
        if (document.getElementById('procCatItemModal')) return;

        const modal = document.createElement('div');
        modal.id = 'procCatItemModal';
        modal.className = 'modal-base';
        modal.style.zIndex = '70';
        modal.innerHTML = `
            <div class="modal-box max-w-md">
                <div class="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 class="text-lg font-bold flex items-center gap-2" id="procCatItemModalTitle">
                        <i class="fa-solid fa-plus-circle text-blue-500"></i> إجراء جديد
                    </h3>
                    <button onclick="closeProcCatItemModal()"
                        class="text-gray-300 hover:text-red-400 text-xl w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <input type="hidden" id="procCatEditId">
                <div class="space-y-3.5">
                    <div>
                        <label class="text-xs font-semibold text-gray-700 block mb-1">اسم الإجراء الطبي *</label>
                        <input type="text" id="procCatName" placeholder="مثال: حشو كومبوزيت تجميلي"
                            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-semibold text-gray-700 block mb-1">السعر الافتراضي *</label>
                            <div class="flex items-center gap-2">
                                <input type="number" id="procCatPrice" min="0" step="1" placeholder="0"
                                    class="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition">
                                <span class="text-xs text-emerald-700 font-bold px-2.5 py-2 rounded-xl bg-emerald-50 border border-emerald-100" id="procCatCurrLabel">EGP</span>
                            </div>
                        </div>
                        <div>
                            <label class="text-xs font-semibold text-gray-700 block mb-1">الفئة الطبية</label>
                            <select id="procCatCategory"
                                class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition">
                                ${CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-700 block mb-1">ملاحظات أو إرشادات (اختياري)</label>
                        <input type="text" id="procCatNotes" placeholder="مثال: عدد الجلسات، تعليمات خاصة..."
                            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition">
                    </div>
                </div>
                <div class="flex gap-2.5 mt-5 pt-4 border-t">
                    <button onclick="closeProcCatItemModal()" class="btn btn-gray flex-1">إلغاء</button>
                    <button onclick="submitProcCat()" class="btn btn-blue flex-1 justify-center shadow-md shadow-blue-500/20" id="procCatSaveBtn">
                        <i class="fa-solid fa-save mr-1.5"></i> حفظ الإجراء
                    </button>
                </div>
            </div>
        `;

        modal.addEventListener('click', e => {
            if (e.target === modal) closeProcCatItemModal();
        });

        document.body.appendChild(modal);
    }

    window.openProcCatItemModal = async function (id = null) {
        injectCatalogItemModal();

        document.getElementById('procCatEditId').value    = id || '';
        document.getElementById('procCatName').value      = '';
        document.getElementById('procCatPrice').value     = '';
        document.getElementById('procCatNotes').value     = '';
        document.getElementById('procCatCategory').value  = 'restorative';
        document.getElementById('procCatCurrLabel').innerText = getCurrStr();

        if (id) {
            const proc = _allProcedures.find(p => p.id == id);
            if (proc) {
                document.getElementById('procCatItemModalTitle').innerHTML =
                    '<i class="fa-solid fa-pen text-blue-500"></i> تعديل الإجراء';
                document.getElementById('procCatName').value     = proc.name || '';
                document.getElementById('procCatPrice').value    = proc.price || 0;
                document.getElementById('procCatNotes').value    = proc.notes || '';
                document.getElementById('procCatCategory').value = proc.category || 'restorative';
            }
        } else {
            document.getElementById('procCatItemModalTitle').innerHTML =
                '<i class="fa-solid fa-plus-circle text-blue-500"></i> إضافة إجراء جديد';
        }

        const modal = document.getElementById('procCatItemModal');
        if (modal) modal.classList.add('open');
        setTimeout(() => document.getElementById('procCatName')?.focus(), 150);
    };

    window.closeProcCatItemModal = function () {
        document.getElementById('procCatItemModal')?.classList.remove('open');
    };

    window.submitProcCat = async function () {
        const name   = document.getElementById('procCatName')?.value.trim();
        const price  = document.getElementById('procCatPrice')?.value;
        const cat    = document.getElementById('procCatCategory')?.value;
        const notes  = document.getElementById('procCatNotes')?.value.trim();
        const editId = document.getElementById('procCatEditId')?.value;

        if (!name) {
            if (typeof showToast === 'function') showToast('⚠️ يرجى كتابة اسم الإجراء الطبي', 'error');
            return;
        }

        const saveBtn = document.getElementById('procCatSaveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> جارٍ الحفظ...';
        }

        try {
            await saveProcedure({ name, price, category: cat, notes }, editId ? parseInt(editId) : null);
            if (typeof showToast === 'function') showToast('✅ تم حفظ الإجراء في الكتالوج بنجاح', 'success');
            window.closeProcCatItemModal();
            await loadProceduresView();
            updateTreatmentUI();
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-save mr-1.5"></i> حفظ الإجراء';
            }
        }
    };

    // ══════════════════════════════════════════════════════════════
    //  SWITCHVIEW HOOK & NAVIGATION ENHANCEMENT
    // ══════════════════════════════════════════════════════════════

    function patchSwitchView() {
        const _orig = window.switchView;
        if (!_orig || _orig._procCatPatched) return;

        window.switchView = function (viewName, ...args) {
            _orig.call(this, viewName, ...args);

            if (viewName === 'procedures') {
                const procView = document.getElementById('proceduresView');
                if (procView) {
                    procView.classList.add('active');
                }
                const navLink = document.getElementById('nav-proc-catalog');
                if (navLink) {
                    navLink.classList.add('active');
                }
                const headerTitle = document.getElementById('headerTitle');
                if (headerTitle) {
                    const isAr = (localStorage.getItem('clinicLang') || 'ar') === 'ar';
                    headerTitle.innerText = isAr ? 'كتالوج الإجراءات والأسعار' : 'Procedures & Pricing';
                }
                loadProceduresView();
            }
        };
        window.switchView._procCatPatched = true;
    }

    function patchOpenModal() {
        const _orig = window.openModal;
        if (!_orig || _orig._procPickerPatched) return;

        window.openModal = function (modalId, ...args) {
            _orig.call(this, modalId, ...args);
            if (modalId === 'addTreatmentModal') {
                setTimeout(() => {
                    updateTreatmentUI();
                }, 100);
            }
        };
        window.openModal._procPickerPatched = true;
    }

    // Helper to escape HTML safely
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ══════════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════════

    async function init() {
        let waited = 0;
        while (typeof window.dbGetAll !== 'function' && waited < 40) {
            await sleep(50);
            waited++;
        }

        // Fetch / seed procedures
        await getAllProcedures();
        if (_allProcedures.length === 0) {
            await seedDefaults(false);
        }

        // Inject modal
        injectCatalogItemModal();

        // Patch navigation and modal hooks
        patchSwitchView();
        patchOpenModal();

        // Render treatment quick picker
        updateTreatmentUI();

        // If current view is procedures, load page
        const procView = document.getElementById('proceduresView');
        if (procView && procView.classList.contains('active')) {
            loadProceduresView();
        }

        console.log('[ProcCat] ✅ v3.0 initialized successfully with', _allProcedures.length, 'procedures');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
    } else {
        setTimeout(init, 300);
    }

    // ── PUBLIC API EXPORT ──────────────────────────────────────────
    window.ProcedureCatalog = {
        getAll:           getAllProcedures,
        save:             saveProcedure,
        delete:           deleteProcedure,
        restoreDefaults:  seedDefaults,
        loadView:         loadProceduresView,
        selectProcedure:  selectProcedureForTreatment,
        openItemModal:    window.openProcCatItemModal
    };

    window.loadProceduresView    = loadProceduresView;
    window.openProcCatalogModal = () => (typeof switchView === 'function' ? switchView('procedures') : loadProceduresView());

})();
