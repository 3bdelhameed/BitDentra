// ══════════════════════════════════════════════════════════════════
//  offline_profile_fix.js  v1.0
//  يُحمَّل بعد offline_first_patch.js و session_payments.js
//
//  المشكلة:
//  لما المريض يفتح بروفايله وهو أوف لاين، dbGetAll بيحاول يوصل
//  لـ Supabase وبيجيب ERR_NAME_NOT_RESOLVED قبل ما يعمل fallback
//  لـ Dexie → النتيجة: "No treatments recorded" وأرقام صفر
//
//  الحل:
//  لو أوف لاين → اقرأ من Dexie مباشرة بدون ما تلمس Supabase خالص
// ══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── انتظر DB تكون جاهزة ─────────────────────────────────────
    async function waitReady(ms = 8000) {
        const t = Date.now();
        while (typeof window.dbGetAll !== 'function' || !window.db) {
            if (Date.now() - t > ms) return false;
            await new Promise(r => setTimeout(r, 100));
        }
        return true;
    }

    // ── جيب من Dexie مباشرة بـ filter يدوي ─────────────────────
    async function dexieDirect(storeName, filterObj) {
        try {
            const store = window.db[storeName];
            if (!store) return [];
            const all = await store.toArray();
            if (!filterObj || !Object.keys(filterObj).length) return all;

            return all.filter(row => {
                return Object.entries(filterObj).every(([k, v]) => {
                    // جرّب snake_case
                    if (row[k] !== undefined) return String(row[k]) === String(v);
                    // جرّب camelCase
                    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
                    if (row[camel] !== undefined) return String(row[camel]) === String(v);
                    return false;
                });
            });
        } catch (e) {
            console.warn('[OfflineProfileFix] dexieDirect error:', storeName, e.message);
            return [];
        }
    }

    // ── PATCH openPatientProfile ─────────────────────────────────
    function patchOpenPatientProfile() {
        const orig = window.openPatientProfile;
        if (!orig || orig._offlineProfileFixed) return;

        window.openPatientProfile = async function (id) {
            // أون لاين → الأصل عادي
            if (navigator.onLine) {
                return orig.call(this, id);
            }

            // ── أوف لاين: اقرأ كل حاجة من Dexie مباشرة ──────────
            window.currentProfilePatientId = id;

            let patient = null;
            try {
                patient = await window.db.patients.get(parseInt(id));
            } catch (e) { /* silent */ }

            if (!patient) {
                // fallback: ابحث في المصفوفة
                const all = await dexieDirect('patients', {});
                patient = all.find(p => String(p.id) === String(id));
            }

            if (!patient) {
                if (typeof showToast === 'function') showToast('لم يُعثر على المريض في البيانات المحلية', 'error');
                return;
            }

            const pName           = patient.name || '';
            const pPhone          = patient.phone || '';
            const pGender         = patient.gender || '';
            const pAge            = patient.age || '';
            const pMedHistory     = patient.medical_history || patient.medHistory || '';
            const pIsPregnant     = patient.is_pregnant || false;
            const pIsBreastfeeding= patient.is_breastfeeding || false;
            const pCreatedAt      = patient.created_at || patient.createdAt || '';
            const curr            = typeof getCurrency === 'function' ? getCurrency() : 'EGP';

            const $ = id => document.getElementById(id);
            if ($('profileName'))  $('profileName').innerText  = pName;
            if ($('profilePhone')) $('profilePhone').innerText = [pPhone, pGender, pAge ? `Age: ${pAge}` : ''].filter(Boolean).join(' · ');
            if ($('profileAvatar')) $('profileAvatar').innerText = pName.charAt(0).toUpperCase();

            // جيب العلاجات من Dexie
            const treatments = await dexieDirect('treatments', { patient_id: id });

            let totalC = 0, totalP = 0;
            treatments.forEach(tr => {
                totalC += parseFloat(tr.total_cost || tr.totalCost) || 0;
                totalP += parseFloat(tr.paid) || 0;
            });
            const debt = totalC - totalP;

            if ($('profileInfoCards')) {
                $('profileInfoCards').innerHTML = `
                    <div class="stat-card"><div><p class="text-xs text-gray-400">Registered</p><p class="font-bold text-sm">${pCreatedAt}</p></div></div>
                    <div class="stat-card"><div><p class="text-xs text-gray-400">Treatments</p><p class="font-bold text-sm">${treatments.length}</p></div></div>
                    <div class="stat-card"><div><p class="text-xs text-gray-400">Total Paid</p><p class="font-bold text-sm text-green-600">${totalP.toFixed(2)} ${curr}</p></div></div>
                    <div class="stat-card border-l-4 ${debt > 0 ? 'border-l-red-400' : 'border-l-green-400'}"><div><p class="text-xs text-gray-400">Balance</p><p class="font-bold text-sm ${debt > 0 ? 'text-red-500' : 'text-green-600'}">${debt > 0 ? debt.toFixed(2) + ' ' + curr : 'Settled ✓'}</p></div></div>
                `;

                const warningParts = [];
                if (pIsPregnant) warningParts.push('🤰 Pregnant');
                if (pIsBreastfeeding) warningParts.push('🤱 Breastfeeding');
                if (pMedHistory) warningParts.push(pMedHistory);

                if (warningParts.length > 0) {
                    $('profileInfoCards').innerHTML += `
                        <div class="col-span-2 md:col-span-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-xs text-yellow-800">
                            <i class="fa-solid fa-triangle-exclamation mr-1"></i><strong>Medical History:</strong> ${warningParts.join(' · ')}
                        </div>`;
                }
            }

            // انقل للـ profile view
            if (typeof switchView === 'function') switchView('profile');

            // حمّل الدنتال تشارت والتاريخ والصور والملاحظات
            if (typeof window.generateDentalChart === 'function') {
                try { window.generateDentalChart(id); } catch (e) { /* silent */ }
            }

            // استخدم renderSessionPayments لو موجودة (session_payments.js)
            // وإلا استخدم loadPatientHistory
            if (typeof window.renderSessionPayments === 'function') {
                window.renderSessionPayments(id);
            } else if (typeof window.loadPatientHistory === 'function') {
                window.loadPatientHistory(id);
            }

            if (typeof loadPatientXrays === 'function') loadPatientXrays(id);
            if (typeof loadPatientNotes === 'function') loadPatientNotes(id);
        };

        window.openPatientProfile._offlineProfileFixed = true;
        console.log('[OfflineProfileFix] ✓ openPatientProfile patched');
    }

    // ── PATCH renderSessionPayments — إذا أوف لاين اقرأ من Dexie ─
    // هذا الـ patch يضمن إن renderSessionPayments تشتغل أوف لاين
    function patchRenderSessionPayments() {
        // session_payments.js بالفعل بيقرأ من Dexie
        // بس نتأكد إن الـ fallback الخاص بـ dbGetAll مش بيتعطل بـ Supabase timeout
        // الحل: لو أوف لاين نعمل bypass كامل لـ dbGetAll في session context

        const origDbGetAll = window.dbGetAll;
        if (!origDbGetAll || origDbGetAll._offlineProfileFixed) return;

        window.dbGetAll = async function (table, filters) {
            // لو أوف لاين → اقرأ من Dexie مباشرة بدون timeout
            if (!navigator.onLine) {
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
                };

                const dStoreName = TABLE_TO_DEXIE[table] || table;
                const store = window.db && window.db[dStoreName];
                if (!store) return [];

                try {
                    let rows = await store.toArray();
                    // طبّق الـ filters
                    if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
                        rows = rows.filter(row => {
                            return Object.entries(filters).every(([k, v]) => {
                                if (row[k] !== undefined) return String(row[k]) === String(v);
                                const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
                                if (row[camel] !== undefined) return String(row[camel]) === String(v);
                                const snake = k.replace(/([A-Z])/g, '_$1').toLowerCase();
                                if (row[snake] !== undefined) return String(row[snake]) === String(v);
                                return false;
                            });
                        });
                    }
                    console.log(`[OfflineProfileFix] offline dbGetAll[${table}] → ${rows.length} rows from Dexie`);
                    return rows;
                } catch (e) {
                    console.warn('[OfflineProfileFix] Dexie read error:', table, e.message);
                    return [];
                }
            }

            // أون لاين → الأصل
            return origDbGetAll.apply(this, arguments);
        };

        // احتفظ بالـ flags من الـ wrappers السابقة
        window.dbGetAll._v3Wrapped              = true;
        window.dbGetAll._offlineFirstWrapped    = true;
        window.dbGetAll._offlineProfileFixed    = true;

        console.log('[OfflineProfileFix] ✓ dbGetAll patched — instant Dexie when offline');
    }

    // ── INIT ─────────────────────────────────────────────────────
    async function init() {
        const ready = await waitReady(10000);
        if (!ready) {
            console.warn('[OfflineProfileFix] DB not ready after 10s');
            return;
        }

        // انتظر session_payments.js يحمّل loadPatientHistory override
        await new Promise(r => setTimeout(r, 800));

        patchRenderSessionPayments();
        patchOpenPatientProfile();

        console.log('[OfflineProfileFix] ✓ v1.0 Ready');
    }

    // ── START ────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 200));
    } else {
        setTimeout(init, 200);
    }

})();
