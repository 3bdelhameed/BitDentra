// ══════════════════════════════════════════════════════════════════
//  session_payments.js  v4  (FIXED)
//  الإصلاح: إزالة التعارض مع fix_tooth_display.js و payment_update.js
//  - loadPatientHistory override موجود هنا بس (مش في fix_tooth_display)
//  - tooth badge بيستخدم getToothBadgeHTML من fix_tooth_display
// ══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // ─── انتظر dbInsert / dbGetAll من supabase-config.js ─────────────
    async function waitForDb(ms = 10000) {
        const t = Date.now();
        while (typeof window.dbInsert !== 'function' || typeof window.dbGetAll !== 'function') {
            if (Date.now() - t > ms) return false;
            await sleep(100);
        }
        return true;
    }

    // ─── جيب دفعات جلسة معينة ────────────────────────────────────────
    async function getPaymentsByTreatment(treatmentId) {
        try {
            const rows = await window.dbGetAll('session_payments', { treatment_id: treatmentId });
            return rows || [];
        } catch (e) {
            console.error('[SP] getPaymentsByTreatment error:', e);
            return [];
        }
    }

    // ─── جيب كل دفعات مريض ───────────────────────────────────────────
    async function getPaymentsByPatient(patientId) {
        try {
            const rows = await window.dbGetAll('session_payments', { patient_id: patientId });
            return rows || [];
        } catch (e) {
            console.error('[SP] getPaymentsByPatient error:', e);
            return [];
        }
    }

    // ─── حدّث treatments.paid بمجموع الدفعات ─────────────────────────
    async function recalcTreatmentPaid(treatmentId) {
        const payments = await getPaymentsByTreatment(treatmentId);
        const total = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        await window.dbUpdate('treatments', treatmentId, { paid: total });
        // حدّث الكاش لو موجود
        if (window._appCache?.treatments) {
            window._appCache.treatments = window._appCache.treatments.map(t =>
                t.id == treatmentId ? { ...t, paid: total } : t
            );
        }
        return total;
    }

    // ─── MODAL ────────────────────────────────────────────────────────
    function injectModal() {
        if (document.getElementById('sessionPayModal')) return;
        document.body.insertAdjacentHTML('beforeend', `
        <div id="sessionPayModal" class="modal-base">
          <div class="modal-box max-w-sm">
            <div class="flex justify-between items-center mb-4 border-b pb-3">
              <h3 class="font-bold text-gray-800 flex items-center gap-2">
                <i class="fa-solid fa-money-bill-wave text-green-500"></i> تسجيل دفعة
              </h3>
              <button onclick="closeModal('sessionPayModal')"
                class="text-gray-300 hover:text-red-400 text-xl w-7 h-7 flex items-center justify-center">
                <i class="fa-solid fa-xmark"></i></button>
            </div>

            <div class="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-sm">
              <p class="font-semibold text-blue-800 truncate" id="spLabel">—</p>
              <div class="flex flex-wrap gap-3 text-xs mt-1 font-medium">
                <span class="text-gray-500">الإجمالي: <b id="spTotal" class="text-gray-700">—</b></span>
                <span class="text-green-600">مدفوع: <b id="spPaid">—</b></span>
                <span class="text-red-500">متبقي: <b id="spLeft">—</b></span>
              </div>
            </div>

            <input type="hidden" id="spTrId">
            <input type="hidden" id="spPtId">

            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-semibold text-gray-500 block mb-1">رقم الجلسة</label>
                  <input type="number" id="spNum" min="1" value="1"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center font-bold">
                </div>
                <div>
                  <label class="text-xs font-semibold text-gray-500 block mb-1">المبلغ *</label>
                  <input type="number" id="spAmt" min="0.01" step="0.01"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold"
                    placeholder="0.00" oninput="spCalcPreview()">
                </div>
              </div>

              <div>
                <label class="text-xs font-semibold text-gray-500 block mb-1">تاريخ الدفع</label>
                <input type="date" id="spDate"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              </div>

              <div>
                <label class="text-xs font-semibold text-gray-500 block mb-1">ملاحظة (اختياري)</label>
                <input type="text" id="spNote"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  placeholder="كاش / تحويل / ...">
              </div>

              <div id="spPreview" class="hidden bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-xs text-green-700 font-medium">
                <i class="fa-solid fa-circle-check mr-1"></i>
                بعد الدفع — مدفوع: <b id="spPrvPaid"></b> | متبقي: <b id="spPrvLeft"></b>
              </div>

              <div id="spErr" class="hidden bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 font-semibold"></div>

              <button id="spBtn" onclick="saveSessionPayment()"
                class="btn w-full justify-center font-semibold"
                style="background:#16a34a;color:white;">
                <i class="fa-solid fa-save mr-1"></i> حفظ الدفعة
              </button>
            </div>
          </div>
        </div>`);
    }

    // ─── OPEN ─────────────────────────────────────────────────────────
    window.openSessionPayment = async function (treatmentId, patientId) {
        injectModal();
        const curr = getCurrency ? getCurrency() : 'EGP';

        // reset
        ['spAmt','spNote'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('spDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('spPreview').classList.add('hidden');
        document.getElementById('spErr').classList.add('hidden');
        document.getElementById('spTrId').value = treatmentId;
        document.getElementById('spPtId').value = patientId;
        document.getElementById('spBtn').disabled = false;
        document.getElementById('spBtn').innerHTML = '<i class="fa-solid fa-save mr-1"></i> حفظ الدفعة';

        // جيب بيانات الجلسة
        let treatment = null;

        // من الكاش أولاً
        if (window._appCache?.treatments?.length) {
            treatment = window._appCache.treatments.find(t => t.id == treatmentId);
        }
        // من dbGetAll لو مش في الكاش
        if (!treatment) {
            const rows = await window.dbGetAll('treatments', { id: treatmentId });
            treatment = rows[0] || null;
        }

        // جيب الدفعات الموجودة
        const payments = await getPaymentsByTreatment(treatmentId);
        const alreadyPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

        let totalCost = 0;
        if (treatment) {
            totalCost = parseFloat(treatment.total_cost || treatment.totalCost) || 0;
            document.getElementById('spLabel').textContent =
                `${treatment.procedure || 'جلسة'}` +
                (treatment.tooth_number || treatment.toothNumber
                    ? ` — سن ${treatment.tooth_number || treatment.toothNumber}` : '');
        }

        const remaining = Math.max(0, totalCost - alreadyPaid);

        document.getElementById('spTotal').textContent = `${totalCost.toFixed(2)} ${curr}`;
        document.getElementById('spPaid').textContent  = `${alreadyPaid.toFixed(2)} ${curr}`;
        document.getElementById('spLeft').textContent  = `${remaining.toFixed(2)} ${curr}`;

        // رقم الجلسة التالية
        const nextNum = payments.length
            ? Math.max(...payments.map(p => parseInt(p.session_num || p.sessionNum) || 1)) + 1
            : 1;
        document.getElementById('spNum').value = nextNum;

        // اقترح المتبقي
        if (remaining > 0) {
            document.getElementById('spAmt').value = remaining.toFixed(2);
            spCalcPreview();
        }

        openModal('sessionPayModal');
    };

    // ─── PREVIEW ─────────────────────────────────────────────────────
    window.spCalcPreview = function () {
        const amt   = parseFloat(document.getElementById('spAmt').value) || 0;
        const paid  = parseFloat(document.getElementById('spPaid').textContent) || 0;
        const total = parseFloat(document.getElementById('spTotal').textContent) || 0;
        const curr  = getCurrency ? getCurrency() : 'EGP';

        if (amt > 0) {
            const np = paid + amt;
            const nl = Math.max(0, total - np);
            document.getElementById('spPrvPaid').textContent = `${np.toFixed(2)} ${curr}`;
            document.getElementById('spPrvLeft').textContent = `${nl.toFixed(2)} ${curr}`;
            document.getElementById('spPreview').classList.remove('hidden');
        } else {
            document.getElementById('spPreview').classList.add('hidden');
        }
    };

    // ─── SAVE ─────────────────────────────────────────────────────────
    window.saveSessionPayment = async function () {
        const treatmentId = parseInt(document.getElementById('spTrId').value);
        const patientId   = parseInt(document.getElementById('spPtId').value);
        const amount      = parseFloat(document.getElementById('spAmt').value);
        const sessionNum  = parseInt(document.getElementById('spNum').value) || 1;
        const notes       = document.getElementById('spNote').value.trim();
        const paidAt      = document.getElementById('spDate').value || new Date().toISOString().split('T')[0];

        const errEl = document.getElementById('spErr');
        const showErr = msg => { errEl.textContent = msg; errEl.classList.remove('hidden'); };
        errEl.classList.add('hidden');

        if (!treatmentId) { showErr('خطأ: لا يوجد ID للجلسة'); return; }
        if (!amount || amount <= 0) { showErr('أدخل مبلغ أكبر من صفر'); return; }

        const btn = document.getElementById('spBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> جاري الحفظ...';

        try {
            // ── 1. احفظ الدفعة بـ dbInsert (اللي يشتغل مع Supabase + Dexie) ──
            const result = await window.dbInsert('session_payments', {
                treatment_id: treatmentId,
                patient_id:   patientId,
                session_num:  sessionNum,
                amount:       amount,
                notes:        notes || null,
                paid_at:      paidAt,
            });

            if (!result) throw new Error('dbInsert رجع null — تحقق من الجدول في Supabase');

            console.log('[SP] ✓ Payment saved:', result);

            // ── 2. حدّث treatments.paid ──
            const newTotal = await recalcTreatmentPaid(treatmentId);
            console.log('[SP] ✓ Treatment paid =', newTotal);

            // ── 3. نجاح ──
            showToast('✓ تم تسجيل الدفعة', 'success');
            closeModal('sessionPayModal');

            // ── 4. أعد رسم الـ profile ──
            setTimeout(() => {
                if (typeof loadPatientHistory === 'function') loadPatientHistory(patientId);
                if (typeof window.renderSessionPayments === 'function') window.renderSessionPayments(patientId);
            }, 150);

        } catch (e) {
            console.error('[SP] Save error:', e);
            showErr('❌ ' + (e.message || 'حدث خطأ غير متوقع'));
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-save mr-1"></i> حفظ الدفعة';
        }
    };

    // ─── DELETE ───────────────────────────────────────────────────────
    window.deleteSessionPayment = async function (paymentId, treatmentId, patientId) {
        if (!confirm('هل تريد حذف هذه الدفعة؟')) return;
        try {
            await window.dbDelete('session_payments', paymentId);
            await recalcTreatmentPaid(treatmentId);
            showToast('تم حذف الدفعة', 'success');
            if (typeof window.renderSessionPayments === 'function') window.renderSessionPayments(patientId);
        } catch (e) {
            showToast('❌ خطأ في الحذف: ' + e.message, 'error');
        }
    };

    // ─── RENDER — يستبدل loadPatientHistory ──────────────────────────
    window.renderSessionPayments = async function (patientId) {
        const container = document.getElementById('patientTreatmentsList');
        if (!container) return;
        const curr = getCurrency ? getCurrency() : 'EGP';

        container.innerHTML = '<div class="text-center py-6 text-gray-300 text-xs"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل…</div>';

        // جيب الجلسات
        const treatments = await window.dbGetAll('treatments', { patient_id: patientId });

        if (!treatments.length) {
            container.innerHTML = '<p class="text-gray-400 text-center text-sm mt-5">No treatments recorded.</p>';
            _updateTotals(0, 0, curr);
            return;
        }

        // جيب كل دفعات المريض مرة واحدة
        const allPayments = await getPaymentsByPatient(patientId);

        let totalCost = 0, totalPaid = 0;

        const rows = treatments.map((tr, idx) => {
            const cost      = parseFloat(tr.total_cost || tr.totalCost) || 0;
            const trPay     = allPayments.filter(p =>
                (p.treatment_id || p.treatmentId) == tr.id
            );
            const paid      = trPay.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            const debt      = cost - paid;

            totalCost += cost;
            totalPaid += paid;

            const debtBadge = debt > 0.01
                ? `<span class="text-[10px] font-bold text-red-500">${debt.toFixed(2)} متبقي</span>`
                : `<span class="text-[10px] font-bold text-green-600">✓ مسدد</span>`;

            const payRows = trPay.map(p => `
                <div class="flex items-center justify-between bg-green-50 rounded-lg px-2.5 py-1.5 mt-1 text-[10px] group">
                    <span class="text-green-700 font-semibold">
                        <i class="fa-solid fa-circle-check text-green-400 mr-1"></i>
                        جلسة ${p.session_num || p.sessionNum} — ${parseFloat(p.amount).toFixed(2)} ${curr}
                        ${(p.notes) ? `<span class="text-gray-400 font-normal ml-1">· ${p.notes}</span>` : ''}
                    </span>
                    <div class="flex items-center gap-1.5 text-gray-400">
                        <span>${p.paid_at || p.paidAt || ''}</span>
                        <button onclick="openEditPayment(${p.id},${tr.id},${patientId},${parseFloat(p.amount)},${p.session_num||p.sessionNum||1},'${(p.notes||'').replace(/'/g,"\\'")}')"
                            class="hidden group-hover:inline text-blue-300 hover:text-blue-500 transition"
                            title="تعديل الدفعة">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="deleteSessionPayment(${p.id},${tr.id},${patientId})"
                            class="hidden group-hover:inline text-red-300 hover:text-red-500 transition"
                            title="حذف الدفعة">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>`).join('');

            return `
            <div class="border-b border-gray-50 py-2.5">
                <div class="flex justify-between items-start gap-2">
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-sm text-gray-800 truncate">
                            ${tr.procedure || '—'}
                            ${window.getToothBadgeHTML ? window.getToothBadgeHTML(tr.tooth_number || tr.toothNumber) : ((tr.tooth_number || tr.toothNumber) ? `<span class="text-blue-500 text-xs font-normal ml-1">🦷 ${tr.tooth_number || tr.toothNumber}</span>` : '')}
                        </p>
                        <div class="flex gap-2 text-[10px] mt-0.5">
                            <span class="text-gray-400">${tr.date || ''}</span>
                            <span class="text-gray-500">💰 ${cost.toFixed(2)} ${curr}</span>
                            <span class="text-green-600">✓ ${paid.toFixed(2)}</span>
                            ${debtBadge}
                        </div>
                        ${payRows}
                    </div>
                    <div class="flex flex-col gap-1 items-end shrink-0">
                        <button onclick="openSessionPayment(${tr.id}, ${patientId})"
                            class="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition"
                            style="background:${debt > 0.01 ? '#f0fdf4' : '#f8fafc'};color:${debt > 0.01 ? '#16a34a' : '#94a3b8'};border-color:${debt > 0.01 ? '#bbf7d0' : '#e2e8f0'};">
                            <i class="fa-solid fa-plus text-[9px]"></i> دفعة
                        </button>
                        <button onclick="deleteTreatment(${tr.id}, ${patientId})"
                            class="text-gray-200 hover:text-red-400 text-xs">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        });

        container.innerHTML = rows.join('');
        _updateTotals(totalCost, totalPaid, curr);
    };

    function _updateTotals(totalCost, totalPaid, curr) {
        const debt = Math.max(0, totalCost - totalPaid);
        const $ = id => document.getElementById(id);
        if ($('profileTotalCost')) $('profileTotalCost').innerText = `${totalCost.toFixed(2)} ${curr}`;
        if ($('profileTotalPaid')) $('profileTotalPaid').innerText = `${totalPaid.toFixed(2)} ${curr}`;
        if ($('profileTotalDebt')) $('profileTotalDebt').innerText = `${(totalCost - totalPaid).toFixed(2)} ${curr}`;
    }

    // ─── OVERRIDE loadPatientHistory ─────────────────────────────────
    // app.js بيستدعي loadPatientHistory من openPatientProfile
    // نعمل override عليها عشان تستخدم renderSessionPayments
    async function hookLoadPatientHistory() {
        const ready = await waitForDb(10000);
        if (!ready) { console.error('[SP] DB not ready'); return; }

        // انتظر لحد ما loadPatientHistory تتعرّف من app.js
        let tries = 0;
        while (typeof window.loadPatientHistory !== 'function' && tries < 50) {
            await sleep(100);
            tries++;
        }

        if (typeof window.loadPatientHistory !== 'function') {
            console.warn('[SP] loadPatientHistory not found after 5s');
            return;
        }

        // override
        window.loadPatientHistory = async function (patientId) {
            await window.renderSessionPayments(patientId);
        };

        console.log('[SP] ✓ loadPatientHistory overridden');
    }

    // ─── START ────────────────────────────────────────────────────────
    if (document.readyState === 'complete') hookLoadPatientHistory();
    else window.addEventListener('load', hookLoadPatientHistory);

    console.log('[session_payments] v3 loaded');

    // ══════════════════════════════════════════════════════════════
    //  EDIT PAYMENT MODAL
    // ══════════════════════════════════════════════════════════════
    function injectEditModal() {
        if (document.getElementById('editPaymentModal')) return;
        document.body.insertAdjacentHTML('beforeend', `
        <div id="editPaymentModal" class="modal-base">
          <div class="modal-box max-w-sm">
            <div class="flex justify-between items-center mb-4 border-b pb-3">
              <h3 class="font-bold text-gray-800 flex items-center gap-2">
                <i class="fa-solid fa-pen-to-square text-blue-500"></i> تعديل الدفعة
              </h3>
              <button onclick="closeModal('editPaymentModal')"
                class="text-gray-300 hover:text-red-400 text-xl w-7 h-7 flex items-center justify-center">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <input type="hidden" id="epId">
            <input type="hidden" id="epTrId">
            <input type="hidden" id="epPtId">

            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-semibold text-gray-500 block mb-1">رقم الجلسة</label>
                  <input type="number" id="epNum" min="1"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center font-bold">
                </div>
                <div>
                  <label class="text-xs font-semibold text-gray-500 block mb-1">المبلغ *</label>
                  <input type="number" id="epAmt" min="0.01" step="0.01"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold"
                    placeholder="0.00">
                </div>
              </div>

              <div>
                <label class="text-xs font-semibold text-gray-500 block mb-1">تاريخ الدفع</label>
                <input type="date" id="epDate"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              </div>

              <div>
                <label class="text-xs font-semibold text-gray-500 block mb-1">ملاحظة (اختياري)</label>
                <input type="text" id="epNote"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  placeholder="كاش / تحويل / ...">
              </div>

              <div id="epErr" class="hidden bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 font-semibold"></div>

              <button id="epBtn" onclick="saveEditPayment()"
                class="btn w-full justify-center font-semibold"
                style="background:#2563eb;color:white;">
                <i class="fa-solid fa-floppy-disk mr-1"></i> حفظ التعديل
              </button>
            </div>
          </div>
        </div>`);
    }

    // ── فتح modal التعديل ─────────────────────────────────────────
    window.openEditPayment = function(payId, treatmentId, patientId, amount, sessionNum, notes) {
        injectEditModal();

        document.getElementById('epId').value    = payId;
        document.getElementById('epTrId').value  = treatmentId;
        document.getElementById('epPtId').value  = patientId;
        document.getElementById('epNum').value   = sessionNum || 1;
        document.getElementById('epAmt').value   = parseFloat(amount).toFixed(2);
        document.getElementById('epNote').value  = notes || '';
        document.getElementById('epErr').classList.add('hidden');

        // جيب التاريخ الحالي من الـ DB
        (async () => {
            try {
                const rows = await window.dbGetAll('session_payments', { id: payId });
                const p = rows && rows[0];
                if (p) {
                    document.getElementById('epDate').value = p.paid_at || p.paidAt || new Date().toISOString().split('T')[0];
                } else {
                    document.getElementById('epDate').value = new Date().toISOString().split('T')[0];
                }
            } catch(e) {
                document.getElementById('epDate').value = new Date().toISOString().split('T')[0];
            }
        })();

        document.getElementById('epBtn').disabled = false;
        document.getElementById('epBtn').innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> حفظ التعديل';

        openModal('editPaymentModal');
        setTimeout(() => document.getElementById('epAmt')?.focus(), 150);
    };

    // ── حفظ التعديل ──────────────────────────────────────────────
    window.saveEditPayment = async function() {
        const payId      = parseInt(document.getElementById('epId').value);
        const treatmentId= parseInt(document.getElementById('epTrId').value);
        const patientId  = parseInt(document.getElementById('epPtId').value);
        const amount     = parseFloat(document.getElementById('epAmt').value);
        const sessionNum = parseInt(document.getElementById('epNum').value) || 1;
        const notes      = document.getElementById('epNote').value.trim();
        const paidAt     = document.getElementById('epDate').value || new Date().toISOString().split('T')[0];

        const errEl = document.getElementById('epErr');
        errEl.classList.add('hidden');

        if (!amount || amount <= 0) {
            errEl.textContent = 'أدخل مبلغ أكبر من صفر';
            errEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('epBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> جاري الحفظ...';

        try {
            await window.dbUpdate('session_payments', payId, {
                amount:      amount,
                session_num: sessionNum,
                notes:       notes || null,
                paid_at:     paidAt,
            });

            // أعد حساب المدفوع
            await recalcTreatmentPaid(treatmentId);

            showToast('✓ تم تعديل الدفعة', 'success');
            closeModal('editPaymentModal');

            setTimeout(() => {
                if (typeof window.renderSessionPayments === 'function') window.renderSessionPayments(patientId);
                if (typeof window.loadPatientHistory    === 'function') window.loadPatientHistory(patientId);
            }, 150);

        } catch(e) {
            console.error('[EditPayment] Error:', e);
            errEl.textContent = '❌ ' + (e.message || 'حدث خطأ');
            errEl.classList.remove('hidden');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> حفظ التعديل';
        }
    };

})();
