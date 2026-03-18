// ══════════════════════════════════════════════════════════════════
//  session_payments.js  v6  (OFFLINE FIX - in-memory cache)
//  ✅ v6 fixes:
//  1. _paymentsCache — in-memory array هو الـ source of truth أوف لاين
//  2. saveSessionPayment → يضيف فوراً للـ cache قبل render
//  3. getDexiePayments → بيقرأ من cache + Dexie + localStorage
//  4. recalcTreatmentPaid مكتملة
// ══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // ✅ IN-MEMORY CACHE — على window عشان يفضل موجود بعد أي re-render
    if (!window._spPaymentsCache) window._spPaymentsCache = [];
    const _paymentsCache = window._spPaymentsCache;

    function _cacheAdd(record) {
        const idx = _paymentsCache.findIndex(p => String(p.id) === String(record.id));
        if (idx >= 0) _paymentsCache[idx] = record;
        else _paymentsCache.push(record);
    }

    function _cacheRemove(id) {
        const idx = _paymentsCache.findIndex(p => String(p.id) === String(id));
        if (idx >= 0) _paymentsCache.splice(idx, 1);
    }

    function _cacheFilter(filters) {
        return _paymentsCache.filter(p =>
            Object.entries(filters).every(([key, val]) => {
                const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
                const v = p[key] ?? p[camel];
                return v !== undefined && String(v) === String(val);
            })
        );
    }

    // ── تملى الـ cache من Dexie عند الفتح ────────────────────────
    async function _initCache() {
        try {
            const store = window.db &&
                ((!window.db.session_payments?._noopProxy && window.db.session_payments) ||
                 (!window.db.sessionPayments?._noopProxy  && window.db.sessionPayments));
            if (store) {
                const all = await store.toArray();
                all.forEach(r => _cacheAdd(r));
                console.log(`[SP] Cache loaded: ${all.length} payments from Dexie`);
            }
        } catch(e) {}

        // كمان اضم من localStorage fallback
        try {
            const ls = JSON.parse(localStorage.getItem('sp_pending_payments') || '[]');
            ls.forEach(r => _cacheAdd(r));
        } catch(e) {}
    }

    // ── انتظر DB ثم ابدأ الـ cache ────────────────────────────────
    (async () => {
        let t = 0;
        while ((!window.db || !window.db.treatments) && t < 100) {
            await sleep(100); t++;
        }
        await _initCache();
    })();

    // ─── انتظر dbInsert / dbGetAll ────────────────────────────────
    async function waitForDb(ms = 10000) {
        const t = Date.now();
        while (typeof window.dbInsert !== 'function' || typeof window.dbGetAll !== 'function') {
            if (Date.now() - t > ms) return false;
            await sleep(100);
        }
        return true;
    }

    // ─── ✅ جيب treatments من Dexie مباشرة (أوف لاين آمن) ──────────
    async function getDexieTreatments(patientId) {
        try {
            if (window.db && window.db.treatments) {
                const all = await window.db.treatments.toArray();
                return all.filter(t => {
                    const pid = t.patient_id ?? t.patientId;
                    return String(pid) === String(patientId);
                });
            }
        } catch (e) {
            console.warn('[SP] getDexieTreatments Dexie error:', e);
        }
        try {
            return await window.dbGetAll('treatments', { patient_id: patientId });
        } catch (e) {
            return [];
        }
    }

    // ─── ✅ جيب دفعات — cache أولاً ثم Dexie ──────────────────────
    async function getDexiePayments(filters = {}) {
        // ── 1. لو الـ cache فيه بيانات — استخدمه مباشرة ──────────
        if (_paymentsCache.length > 0) {
            return _cacheFilter(filters);
        }

        // ── 2. Cache فاضي — جرّب Dexie ────────────────────────────
        try {
            const store = window.db &&
                ((!window.db.session_payments?._noopProxy && window.db.session_payments) ||
                 (!window.db.sessionPayments?._noopProxy  && window.db.sessionPayments));
            if (store) {
                const all = await store.toArray();
                all.forEach(r => _cacheAdd(r));
                return _cacheFilter(filters);
            }
        } catch (e) {
            console.warn('[SP] getDexiePayments Dexie error:', e);
        }

        // ── 3. Fallback لـ localStorage ───────────────────────────
        try {
            const ls = JSON.parse(localStorage.getItem('sp_pending_payments') || '[]');
            ls.forEach(r => _cacheAdd(r));
            if (_paymentsCache.length > 0) return _cacheFilter(filters);
        } catch(e) {}

        // ── 4. آخر حل: dbGetAll ────────────────────────────────────
        try {
            const rows = await window.dbGetAll('session_payments', filters);
            rows.forEach(r => _cacheAdd(r));
            return rows;
        } catch (e) {
            return [];
        }
    }

    // ─── جيب دفعات جلسة معينة ────────────────────────────────────────
    async function getPaymentsByTreatment(treatmentId) {
        try {
            return await getDexiePayments({ treatment_id: treatmentId });
        } catch (e) {
            console.error('[SP] getPaymentsByTreatment error:', e);
            return [];
        }
    }

    // ─── جيب كل دفعات مريض ───────────────────────────────────────────
    async function getPaymentsByPatient(patientId) {
        try {
            return await getDexiePayments({ patient_id: patientId });
        } catch (e) {
            console.error('[SP] getPaymentsByPatient error:', e);
            return [];
        }
    }

    // ─── حدّث treatments.paid بمجموع الدفعات ─────────────────────────

// ====== انسخ من أول السطر اللي تحت ده ======

async function recalcTreatmentPaid(treatmentId) {
    const payments = await getPaymentsByTreatment(treatmentId);
    const total = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

    // ✅ FIX: احفظ الـ paid في Dexie مباشرة (يشتغل أوف لاين وأون لاين)
    try {
        if (window.db && window.db.treatments) {
            await window.db.treatments.update(treatmentId, { paid: total });
        }
    } catch (e) {
        console.warn('[SP] recalcTreatmentPaid Dexie update error:', e);
    }

    // ✅ FIX: لو أون لاين — احفظ في Supabase كمان
    try {
        if (navigator.onLine && typeof window.dbUpdate === 'function') {
            await window.dbUpdate('treatments', treatmentId, { paid: total });
        }
    } catch (e) {
        console.warn('[SP] recalcTreatmentPaid Supabase update error:', e);
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

        ['spAmt','spNote'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('spDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('spPreview').classList.add('hidden');
        document.getElementById('spErr').classList.add('hidden');
        document.getElementById('spTrId').value = treatmentId;
        document.getElementById('spPtId').value = patientId;
        document.getElementById('spBtn').disabled = false;
        document.getElementById('spBtn').innerHTML = '<i class="fa-solid fa-save mr-1"></i> حفظ الدفعة';

        // ✅ جيب بيانات الجلسة من Dexie مباشرة
        let treatment = null;
        try {
            if (window.db && window.db.treatments) {
                treatment = await window.db.treatments.get(parseInt(treatmentId));
            }
        } catch(e) {}
        if (!treatment && window._appCache?.treatments?.length) {
            treatment = window._appCache.treatments.find(t => t.id == treatmentId);
        }
        if (!treatment) {
            const rows = await getDexieTreatments(patientId);
            treatment = rows.find(t => t.id == treatmentId) || null;
        }

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

        const nextNum = payments.length
            ? Math.max(...payments.map(p => parseInt(p.session_num || p.sessionNum) || 1)) + 1
            : 1;
        document.getElementById('spNum').value = nextNum;

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
            const paymentData = {
                treatment_id: treatmentId,
                patient_id:   patientId,
                session_num:  sessionNum,
                amount:       amount,
                notes:        notes || null,
                paid_at:      paidAt,
            };

            const result = await window.dbInsert('session_payments', paymentData);

            if (!result) throw new Error('dbInsert رجع null');

            console.log('[SP] ✓ Payment saved:', result);

            // ✅ أضيف فوراً للـ in-memory cache — ده بيضمن ظهور الدفعة فوراً
            const cachedRecord = { ...paymentData, id: result.id || Date.now(), _localOnly: !!(result._offline || result._queued) };
            _cacheAdd(cachedRecord);

            // ✅ اكتب في localStorage كـ backup
            try {
                const key = 'sp_pending_payments';
                const ls = JSON.parse(localStorage.getItem(key) || '[]');
                const exists = ls.find(p => String(p.id) === String(cachedRecord.id));
                if (!exists) { ls.push(cachedRecord); localStorage.setItem(key, JSON.stringify(ls)); }
            } catch(e) {}

            const newTotal = await recalcTreatmentPaid(treatmentId);
            console.log('[SP] ✓ Treatment paid =', newTotal);

            showToast('✓ تم تسجيل الدفعة', 'success');
            closeModal('sessionPayModal');

            // ✅ رفرش الـ profile بعد الحفظ
            setTimeout(() => {
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
            // ✅ اشيل من الـ cache فوراً
            _cacheRemove(paymentId);
            // وكمان من localStorage
            try {
                const key = 'sp_pending_payments';
                const ls = JSON.parse(localStorage.getItem(key) || '[]');
                localStorage.setItem(key, JSON.stringify(ls.filter(p => String(p.id) !== String(paymentId))));
            } catch(e) {}

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

        // ✅ جيب الجلسات من Dexie مباشرة (يشتغل أوف لاين وأون لاين)
        const treatments = await getDexieTreatments(patientId);

        if (!treatments.length) {
            container.innerHTML = '<p class="text-gray-400 text-center text-sm mt-5">No treatments recorded.</p>';
            _updateTotals(0, 0, curr);
            return;
        }

        // ✅ جيب كل دفعات المريض من Dexie مباشرة
        const allPayments = await getPaymentsByPatient(patientId);

        let totalCost = 0, totalPaid = 0;

        const rows = treatments.map((tr, idx) => {
            const cost  = parseFloat(tr.total_cost || tr.totalCost) || 0;
            const trPay = allPayments.filter(p => {
                const tid = p.treatment_id ?? p.treatmentId;
                return String(tid) === String(tr.id);
            });

            // ✅ FIX: لو مفيش دفعات في الـ cache، استخدم treatments.paid المحفوظ كـ fallback
            const paidFromPayments = trPay.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            const paidFromTreatment = parseFloat(tr.paid) || 0;
            const paid = (trPay.length > 0) ? paidFromPayments : paidFromTreatment;

            const debt  = cost - paid;

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
                            ${window.getToothBadgeHTML
                                ? window.getToothBadgeHTML(tr.tooth_number || tr.toothNumber)
                                : ((tr.tooth_number || tr.toothNumber)
                                    ? `<span class="text-blue-500 text-xs font-normal ml-1">🦷 ${tr.tooth_number || tr.toothNumber}</span>`
                                    : '')}
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

    // ✅ اعمل الـ cache functions متاحة لـ offline_first_patch
    window._spCacheAdd    = _cacheAdd;
    window._spCacheRemove = _cacheRemove;

    // ─── OVERRIDE loadPatientHistory ─────────────────────────────────
    async function hookLoadPatientHistory() {
        const ready = await waitForDb(10000);
        if (!ready) { console.error('[SP] DB not ready'); return; }

        let tries = 0;
        while (typeof window.loadPatientHistory !== 'function' && tries < 50) {
            await sleep(100);
            tries++;
        }

        if (typeof window.loadPatientHistory !== 'function') {
            console.warn('[SP] loadPatientHistory not found after 5s');
            return;
        }

        window.loadPatientHistory = async function (patientId) {
            await window.renderSessionPayments(patientId);
        };

        console.log('[SP] ✓ loadPatientHistory overridden (v5 offline-safe)');
    }

    // ─── START ────────────────────────────────────────────────────────
    if (document.readyState === 'complete') hookLoadPatientHistory();
    else window.addEventListener('load', hookLoadPatientHistory);

    console.log('[session_payments] v5 loaded');

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

    window.openEditPayment = function(payId, treatmentId, patientId, amount, sessionNum, notes) {
        injectEditModal();
        document.getElementById('epId').value    = payId;
        document.getElementById('epTrId').value  = treatmentId;
        document.getElementById('epPtId').value  = patientId;
        document.getElementById('epNum').value   = sessionNum || 1;
        document.getElementById('epAmt').value   = parseFloat(amount).toFixed(2);
        document.getElementById('epNote').value  = notes || '';
        document.getElementById('epErr').classList.add('hidden');

        (async () => {
            try {
                let p = null;
                if (window.db && window.db.session_payments) {
                    p = await window.db.session_payments.get(parseInt(payId));
                }
                document.getElementById('epDate').value = (p?.paid_at || p?.paidAt) || new Date().toISOString().split('T')[0];
            } catch(e) {
                document.getElementById('epDate').value = new Date().toISOString().split('T')[0];
            }
        })();

        document.getElementById('epBtn').disabled = false;
        document.getElementById('epBtn').innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> حفظ التعديل';
        openModal('editPaymentModal');
        setTimeout(() => document.getElementById('epAmt')?.focus(), 150);
    };

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

            // ✅ حدّث الـ cache فوراً عشان renderSessionPayments تشوف التعديل
            if (typeof window._spCacheAdd === 'function') {
                window._spCacheAdd({
                    id:          payId,
                    treatment_id: treatmentId,
                    patient_id:   patientId,
                    amount:       amount,
                    session_num:  sessionNum,
                    notes:        notes || null,
                    paid_at:      paidAt,
                });
            }

            await recalcTreatmentPaid(treatmentId);

            showToast('✓ تم تعديل الدفعة', 'success');
            closeModal('editPaymentModal');

            setTimeout(() => {
                if (typeof window.renderSessionPayments === 'function') window.renderSessionPayments(patientId);
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
// HOTFIX: patch getDexieTreatments to use toArray + filter instead of where().equals()
if (typeof window.getDexieTreatments === 'function') {
    window.getDexieTreatments = async function(patientId) {
        try {
            const all = await window.db.treatments.toArray();
            return all.filter(t => 
                String(t.patient_id || t.patientId) === String(patientId)
            );
        } catch(e) {
            console.error('getDexieTreatments error:', e);
            return [];
        }
    };
    console.log('✅ getDexieTreatments patched');
}