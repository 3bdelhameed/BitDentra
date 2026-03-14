// ══════════════════════════════════════════════════════════════════
//  fix_financial_sync.js  — v6.0 (The Absolute Offline Master)
//  إصلاح اختفاء القوائم أوفلاين + حل مشكلة انهيار شاشة التقارير
//  الحل الجذري: حظر الاتصال بالسيرفر أوفلاين والاعتماد الكلي على Dexie
// ══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    console.log('[FinancialSync] v6.0 Initializing Absolute Offline Master...');

    // ── 1. المحرك الأساسي لجلب البيانات من Dexie مباشرة وبقوة ─────────
    async function forceDexieGet(table, filterObj) {
        if (!window.db) return [];
        try {
            let dexTable = table;
            if (table === 'tooth_states') dexTable = 'toothStates';
            if (table === 'patient_notes') dexTable = 'patientNotes';
            if (table === 'lab_orders') dexTable = 'labOrders';
            
            // استخدام الطريقة الأكثر أماناً للوصول للجدول
            const store = window.db.table ? window.db.table(dexTable) : window.db[dexTable];
            if (!store) return [];
            
            let all = await store.toArray();
            
            // تطبيق الفلاتر بذكاء للتعامل مع اختلاف أسماء الحقول
            if (filterObj && Object.keys(filterObj).length > 0) {
                return all.filter(item => {
                    return Object.entries(filterObj).every(([k, v]) => {
                        const snakeK = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                        const camelK = k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                        
                        const itemV = item[k] !== undefined ? item[k] :
                                      (item[snakeK] !== undefined ? item[snakeK] : item[camelK]);
                        
                        return String(itemV) === String(v);
                    });
                });
            }
            return all;
        } catch(e) {
            console.error('[SyncFix] Force Dexie Error:', e);
            return [];
        }
    }

    // ── 2. التدخل الحاسم في dbGetAll لمنع مسح الشاشة ─────────────────
    const _origDbGetAllSync = window.dbGetAll;
    window.dbGetAll = async function(table, filterObj) {
        // إذا كنا أوفلاين، يُمنع تشغيل الدالة الأصلية منعاً باتاً لمنع مسح الشاشة
        if (!navigator.onLine) {
            return await forceDexieGet(table, filterObj);
        }
        
        // إذا كنا أونلاين (أو شبكة وهمية متصلة براوتر بدون إنترنت)
        try {
            let res = await _origDbGetAllSync(table, filterObj);
            // لو الدالة الأصلية رجعت مصفوفة فاضية رغم وجود بيانات في Dexie (بسبب ضعف النت)
            if (!res || res.length === 0) {
                let dexRes = await forceDexieGet(table, filterObj);
                if (dexRes && dexRes.length > 0) return dexRes;
            }
            return res || [];
        } catch (e) {
            // لو حصل خطأ في الاتصال، الجأ فوراً لـ Dexie
            console.warn('[SyncFix] Online fetch failed, forcing Dexie fallback:', e);
            return await forceDexieGet(table, filterObj);
        }
    };

    // ── 3. إصلاح إعادة حساب الفلوس (Recalc) مع منع الأخطاء ───────────
    const _origRecalc = window.recalcTreatmentPaid;
    window.recalcTreatmentPaid = async function(treatmentId) {
        if (!navigator.onLine && window.db) {
            try {
                let allPayments = await forceDexieGet('session_payments');
                const treatmentPayments = allPayments.filter(p => String(p.treatment_id || p.treatmentId) === String(treatmentId));
                const totalPaid = treatmentPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                
                const trStore = window.db.table ? window.db.table('treatments') : window.db.treatments;
                if (trStore) {
                    const numericId = Number(treatmentId);
                    let tr = await trStore.get(numericId) || await trStore.get(String(treatmentId));
                    if (tr) {
                        await trStore.update(tr.id, { paid: totalPaid });
                    }
                }
                console.log(`[SyncFix] Dexie Updated! Treatment ${treatmentId} paid amount: ${totalPaid}`);
                return; // إيقاف التنفيذ هنا في الأوفلاين لمنع الدوال الأصلية من التسبب في أخطاء
            } catch(e) {
                console.error('[SyncFix] Dexie recalc error:', e);
            }
        }

        try {
            if (typeof _origRecalc === 'function') {
                await _origRecalc(treatmentId);
            }
        } catch(e) {
            console.warn('[SyncFix] Orig recalc error ignored:', e);
        }
    };

    // ── 4. دوال جلب آمنة لجلب البيانات للوحات الرئيسية ────────────────
    async function getSafeData(table) {
        return await window.dbGetAll(table); // أصبحت الدالة آمنة ومحصنة الآن
    }

    // ── 5. إصلاح اختفاء الأموال من الشاشة الرئيسية (Dashboard) ────────
    const _origUpdateDashboard = window.updateDashboard;
    window.updateDashboard = async function() {
        if (navigator.onLine) {
            try { if (typeof _origUpdateDashboard === 'function') await _origUpdateDashboard(); } catch(e){}
        }

        try {
            const todayStr = typeof today === 'function' ? today() : new Date().toISOString().split('T')[0];
            const treatments = await getSafeData('treatments');
            const expenses = await getSafeData('expenses');
            const sessionPayments = await getSafeData('session_payments');

            let dailyRevenue = 0, dailyExpense = 0;
            
            treatments.forEach(tr => { if (tr.date === todayStr) dailyRevenue += parseFloat(tr.paid) || 0; });
            sessionPayments.forEach(sp => { if (sp.date === todayStr) dailyRevenue += parseFloat(sp.amount) || 0; });
            expenses.forEach(e => { if (e.date === todayStr) dailyExpense += parseFloat(e.amount) || 0; });

            const curr = typeof getCurrency === 'function' ? getCurrency() : 'EGP';
            const elRev = document.getElementById('todayRevenue');
            const elExp = document.getElementById('todayExpenses');
            const elNet = document.getElementById('netProfit');

            if (elRev) elRev.innerText = `${dailyRevenue} ${curr}`;
            if (elExp) elExp.innerText = `${dailyExpense} ${curr}`;
            if (elNet) elNet.innerText = `${dailyRevenue - dailyExpense} ${curr}`;
        } catch(e) {}
    };

    // ── 6. إصلاح اختفاء الأموال من صفحة المريض (Patient Profile) ──────
    const _origOpenPatientProfile = window.openPatientProfile;
    window.openPatientProfile = async function(id) {
        if (navigator.onLine) {
            try { if (typeof _origOpenPatientProfile === 'function') await _origOpenPatientProfile(id); } catch(e){}
        }

        try {
            const treatments = await getSafeData('treatments');
            const sessionPayments = await getSafeData('session_payments');

            const patTreatments = treatments.filter(t => String(t.patient_id || t.patientId) === String(id));
            const patPayments = sessionPayments.filter(sp => String(sp.patient_id || sp.patientId) === String(id));

            let totalC = 0, totalP = 0;
            patTreatments.forEach(tr => {
                totalC += parseFloat(tr.total_cost || tr.totalCost) || 0;
                totalP += parseFloat(tr.paid) || 0;
            });
            patPayments.forEach(sp => {
                totalP += parseFloat(sp.amount) || 0;
            });

            const curr = typeof getCurrency === 'function' ? getCurrency() : 'EGP';
            const debt = totalC - totalP;

            const cards = document.querySelectorAll('#profileInfoCards .stat-card');
            if (cards.length >= 4) {
                const paidEl = cards[2].querySelector('p.text-green-600, p.font-bold:not(.text-gray-400)');
                if (paidEl) paidEl.innerText = `${totalP} ${curr}`;

                cards[3].className = `stat-card border-l-4 ${debt > 0 ? 'border-l-red-400' : 'border-l-green-400'}`;
                const debtEl = cards[3].querySelector('p.font-bold:not(.text-gray-400)');
                if (debtEl) {
                    debtEl.className = `font-bold text-sm ${debt > 0 ? 'text-red-500' : 'text-green-600'}`;
                    debtEl.innerText = debt > 0 ? `${debt} ${curr}` : 'مسدد ✓';
                }
            }
        } catch(e) {}
    };

    // ── 7. إصلاح حسابات جدول كل المرضى (Patients Table) ───────────────
    const _origLoadAllPatients = window.loadAllPatients;
    window.loadAllPatients = async function() {
        if (navigator.onLine) {
            try { if (typeof _origLoadAllPatients === 'function') await _origLoadAllPatients(); } catch(e){}
        }

        try {
            const allTreatments = await getSafeData('treatments');
            const sessionPayments = await getSafeData('session_payments');

            const balanceMap = {};
            allTreatments.forEach(tr => {
                const pid = tr.patient_id || tr.patientId;
                if (!balanceMap[pid]) balanceMap[pid] = { cost: 0, paid: 0 };
                balanceMap[pid].cost += parseFloat(tr.total_cost || tr.totalCost) || 0;
                balanceMap[pid].paid += parseFloat(tr.paid) || 0;
            });

            sessionPayments.forEach(sp => {
                const pid = sp.patient_id || sp.patientId;
                if (balanceMap[pid]) {
                    balanceMap[pid].paid += parseFloat(sp.amount) || 0;
                }
            });

            const tbody = document.getElementById('allPatientsTableBody');
            if (!tbody) return;
            const rows = tbody.querySelectorAll('tr');
            const curr = typeof getCurrency === 'function' ? getCurrency() : 'EGP';

            rows.forEach(row => {
                const onClickAttr = row.getAttribute('onclick');
                if (onClickAttr && onClickAttr.includes('openPatientProfile')) {
                    const match = onClickAttr.match(/openPatientProfile\((\d+)\)/);
                    if (match) {
                        const pid = parseInt(match[1]);
                        const b = balanceMap[pid] || { cost: 0, paid: 0 };
                        const debt = b.cost - b.paid;
                        
                        const debtCell = row.cells[5];
                        if (debtCell) {
                            debtCell.innerHTML = debt > 0
                                ? `<span class="badge" style="background:#fef2f2;color:#ef4444;">${debt} ${curr}</span>`
                                : `<span class="badge" style="background:#f0fdf4;color:#16a34a;">مسدد ✓</span>`;
                        }
                    }
                }
            });
        } catch(e) {}
    };

    // ── 8. الحل الجذري لاختفاء شاشة التقارير (Reports) ────────────────
    const _origLoadReports = window.loadReports;
    window.loadReports = async function() {
        
        // إخفاء الـ Spinner الإجباري وإظهار المحتوى عشان الشاشة متفضلش معلقة
        const spinner = document.getElementById('reportsSpinner');
        const content = document.getElementById('reportsContent');
        if (spinner) spinner.style.display = 'none';
        if (content) content.style.display = 'block';

        // محاولة تشغيل التقارير الأصلية (للرسومات البيانية) فقط لو أونلاين
        if (navigator.onLine) {
            try { if (typeof _origLoadReports === 'function') await _origLoadReports(); } catch(e){}
        }

        // الحسابات الثابتة (شغالة %100 أوفلاين وأونلاين من Dexie فوراً)
        try {
            const treatments = await getSafeData('treatments');
            const expenses = await getSafeData('expenses');
            const sessionPayments = await getSafeData('session_payments');

            let totalRevenue = 0, totalPaid = 0, totalExpenses = 0;
            treatments.forEach(tr => {
                totalRevenue += parseFloat(tr.total_cost || tr.totalCost) || 0;
                totalPaid    += parseFloat(tr.paid) || 0;
            });
            sessionPayments.forEach(sp => {
                totalPaid += parseFloat(sp.amount) || 0;
            });
            expenses.forEach(e => { totalExpenses += parseFloat(e.amount) || 0; });
            
            const totalDebt = totalRevenue - totalPaid;
            const curr = typeof getCurrency === 'function' ? getCurrency() : 'EGP';

            const getTrans = (key, fallback) => typeof t === 'function' ? t(key) : fallback;

            const finReport = document.getElementById('financialReport');
            if (finReport) {
                finReport.innerHTML = `
                    <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${getTrans('rep.totalRevenue', 'إجمالي الإيرادات')}</span><span class="font-bold text-gray-800">${totalRevenue} ${curr}</span></div>
                    <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${getTrans('rep.collected', 'المدفوع')}</span><span class="font-bold text-green-600">${totalPaid} ${curr}</span></div>
                    <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${getTrans('rep.debt', 'الديون')}</span><span class="font-bold text-red-500">${totalDebt} ${curr}</span></div>
                    <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${getTrans('rep.totalExp', 'إجمالي المصروفات')}</span><span class="font-bold text-orange-500">${totalExpenses} ${curr}</span></div>
                    <div class="flex justify-between text-sm font-bold text-base mt-1"><span>${getTrans('rep.netProfit', 'صافي الربح')}</span><span class="${totalPaid - totalExpenses >= 0 ? 'text-green-600' : 'text-red-500'}">${totalPaid - totalExpenses} ${curr}</span></div>
                `;
            }

            const debtMap = {};
            treatments.forEach(tr => {
                const pid  = tr.patient_id || tr.patientId;
                const name = tr.patient_name || tr.patientName;
                if (!debtMap[pid]) debtMap[pid] = { name, cost: 0, paid: 0, id: pid };
                debtMap[pid].cost += parseFloat(tr.total_cost || tr.totalCost) || 0;
                debtMap[pid].paid += parseFloat(tr.paid) || 0;
            });
            sessionPayments.forEach(sp => {
                const pid = sp.patient_id || sp.patientId;
                if (debtMap[pid]) debtMap[pid].paid += parseFloat(sp.amount) || 0;
            });

            const debtors = Object.values(debtMap).filter(d => d.cost - d.paid > 0).sort((a, b) => (b.cost - b.paid) - (a.cost - a.paid));
            const debtReport = document.getElementById('debtReport');
            
            if (debtReport) {
                if (debtors.length === 0) {
                    debtReport.innerHTML = `<p class="text-green-600 font-semibold text-sm"><i class="fa-solid fa-circle-check mr-1"></i> ${getTrans('rep.allSettled', 'لا يوجد ديون على المرضى')}</p>`;
                } else {
                    debtReport.innerHTML = `
                        <table class="w-full text-sm">
                            <thead><tr class="text-gray-400 text-xs uppercase border-b">
                                <th class="text-left pb-2">${getTrans('rep.debtor', 'المدين')}</th>
                                <th class="text-right pb-2">${getTrans('rep.debtAmt', 'قيمة الدين')}</th>
                            </tr></thead>
                            <tbody>${debtors.map(d => `
                                <tr class="border-b border-gray-50">
                                    <td class="py-2 cursor-pointer hover:text-blue-600 font-semibold" onclick="openPatientProfile(${d.id})">${d.name}</td>
                                    <td class="py-2 text-right text-red-500 font-bold">${d.cost - d.paid} ${curr}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>`;
                }
            }
        } catch(e) {}
    };

    console.log('[FinancialSyncPatch] ✅ v6.0 Complete: Absolute Offline Master Active!');
})();