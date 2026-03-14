// ══════════════════════════════════════════════════════════════════════
//  payment_update.js  —  تسجيل دفعات + تعديل العلاجات في بروفايل المريض
//  أضف <script src="payment_update.js"></script> في index.html
//  قبل </body> مباشرة (بعد app.js)
// ══════════════════════════════════════════════════════════════════════

// ── INJECT MODALS INTO PAGE ──────────────────────────────────────────
(function injectModals() {

    const modalsHTML = `

    <!-- ══ MODAL: تسجيل دفعة ══════════════════════════════════════ -->
    <div id="recordPaymentModal" class="modal-base">
      <div class="modal-box max-w-sm">
        <div class="flex justify-between items-center mb-4 border-b pb-3">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <i class="fa-solid fa-coins text-green-500"></i>
            <span id="payModalTitle">تسجيل دفعة</span>
          </h3>
          <button onclick="closeModal('recordPaymentModal')"
            class="text-gray-300 hover:text-red-400 text-xl w-7 h-7 flex items-center justify-center">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <input type="hidden" id="payTreatmentId">
        <input type="hidden" id="payPatientId">

        <!-- ملخص الحساب -->
        <div id="payModalSummary"
          class="mb-4 p-3 bg-slate-50 rounded-xl border border-gray-100 text-sm space-y-1.5">
        </div>

        <!-- مبلغ الدفعة -->
        <div class="mb-3">
          <label class="text-xs font-semibold text-gray-500 block mb-1">
            المبلغ المدفوع الآن <span class="text-red-400">*</span>
          </label>
          <input type="number" id="payNewAmount" min="1" placeholder="0"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
            onkeydown="if(event.key==='Enter') submitPaymentUpdate()">
        </div>

        <!-- ملاحظة -->
        <div>
          <label class="text-xs font-semibold text-gray-500 block mb-1">ملاحظة (اختياري)</label>
          <input type="text" id="payNote" placeholder="مثال: دفع نقدي، تحويل بنكي..."
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
        </div>

        <!-- Buttons -->
        <div class="flex gap-2 mt-4 pt-4 border-t">
          <button onclick="closeModal('recordPaymentModal')" class="btn btn-gray flex-1">إلغاء</button>
          <button id="paySubmitBtn" onclick="submitPaymentUpdate()"
            class="btn flex-1 justify-center"
            style="background:#22c55e;color:white;">
            <i class="fa-solid fa-check mr-1"></i> تسجيل الدفعة
          </button>
        </div>
      </div>
    </div>

    <!-- ══ MODAL: تعديل العلاج ══════════════════════════════════════ -->
    <div id="editTreatmentModal" class="modal-base">
      <div class="modal-box max-w-md">
        <div class="flex justify-between items-center mb-4 border-b pb-3">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <i class="fa-solid fa-pen-to-square text-blue-500"></i>
            تعديل العلاج
          </h3>
          <button onclick="closeModal('editTreatmentModal')"
            class="text-gray-300 hover:text-red-400 text-xl w-7 h-7 flex items-center justify-center">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <input type="hidden" id="editTreatmentId">
        <input type="hidden" id="editTreatmentPatientId">

        <div class="space-y-3">
          <!-- الإجراء -->
          <div>
            <label class="text-xs font-semibold text-gray-500 block mb-1">
              الإجراء / Procedure <span class="text-red-400">*</span>
            </label>
            <input type="text" id="editProcedure"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
              placeholder="مثال: حشو، خلع، تنظيف...">
          </div>

          <!-- التكلفة -->
          <div>
            <label class="text-xs font-semibold text-gray-500 block mb-1">
              إجمالي التكلفة <span class="text-red-400">*</span>
            </label>
            <input type="number" id="editTotalCost" min="0" placeholder="0"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
          </div>

          <!-- المدفوع -->
          <div>
            <label class="text-xs font-semibold text-gray-500 block mb-1">
              المدفوع حتى الآن
            </label>
            <input type="number" id="editPaidAmount" min="0" placeholder="0"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
          </div>

          <!-- الملاحظات -->
          <div>
            <label class="text-xs font-semibold text-gray-500 block mb-1">ملاحظات</label>
            <textarea id="editNotes" rows="2"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none"
              placeholder="ملاحظات إضافية..."></textarea>
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex gap-2 mt-4 pt-4 border-t">
          <button onclick="closeModal('editTreatmentModal')" class="btn btn-gray flex-1">إلغاء</button>
          <button id="editTreatmentSubmitBtn" onclick="submitEditTreatment()"
            class="btn btn-primary flex-1 justify-center">
            <i class="fa-solid fa-floppy-disk mr-1"></i> حفظ التعديلات
          </button>
        </div>
      </div>
    </div>`;

    document.addEventListener('DOMContentLoaded', function () {
        document.body.insertAdjacentHTML('beforeend', modalsHTML);
    });
})();


// ── PAYMENT: فتح مودال الدفعة ────────────────────────────────────────
window.openRecordPaymentModal = async function (treatmentId, patientId) {
    const treatments = await dbGetAll('treatments', { patient_id: patientId });
    const tr = treatments.find(t => t.id == treatmentId);
    if (!tr) { showToast('لم يُعثر على العلاج', 'error'); return; }

    const curr      = getCurrency();
    const totalCost = parseFloat(tr.total_cost || tr.totalCost) || 0;
    const oldPaid   = parseFloat(tr.paid) || 0;
    const remaining = totalCost - oldPaid;

    document.getElementById('payTreatmentId').value = treatmentId;
    document.getElementById('payPatientId').value   = patientId;
    document.getElementById('payNewAmount').value   = remaining > 0 ? remaining : '';
    document.getElementById('payNote').value        = '';

    document.getElementById('payModalTitle').textContent =
        `دفعة — ${tr.procedure || 'علاج'}`;

    document.getElementById('payModalSummary').innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-gray-500 text-xs">الإجراء:</span>
            <span class="font-semibold text-gray-800 text-xs truncate max-w-[180px]">${tr.procedure || '—'}</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="text-gray-500 text-xs">إجمالي التكلفة:</span>
            <span class="font-bold text-gray-800">${totalCost.toLocaleString()} ${curr}</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="text-gray-500 text-xs">المدفوع سابقاً:</span>
            <span class="font-bold text-green-600">${oldPaid.toLocaleString()} ${curr}</span>
        </div>
        <div class="flex justify-between items-center border-t border-gray-200 pt-1.5 mt-0.5">
            <span class="text-gray-600 font-semibold text-xs">المتبقي:</span>
            <span class="font-bold text-base ${remaining > 0 ? 'text-red-500' : 'text-green-600'}">
                ${remaining > 0 ? remaining.toLocaleString() + ' ' + curr : '✓ مسدد بالكامل'}
            </span>
        </div>`;

    openModal('recordPaymentModal');
    setTimeout(() => document.getElementById('payNewAmount')?.focus(), 150);
};


// ── PAYMENT: حفظ الدفعة ─────────────────────────────────────────────
window.submitPaymentUpdate = async function () {
    const treatmentId = parseInt(document.getElementById('payTreatmentId').value);
    const patientId   = parseInt(document.getElementById('payPatientId').value);
    const newAmount   = parseFloat(document.getElementById('payNewAmount').value) || 0;
    const note        = document.getElementById('payNote').value.trim();
    const curr        = getCurrency();

    if (!newAmount || newAmount <= 0) {
        showToast('أدخل مبلغاً صحيحاً', 'error');
        document.getElementById('payNewAmount')?.focus();
        return;
    }

    const treatments = await dbGetAll('treatments', { patient_id: patientId });
    const tr = treatments.find(t => t.id == treatmentId);
    if (!tr) { showToast('خطأ: لم يُعثر على العلاج', 'error'); return; }

    const totalCost = parseFloat(tr.total_cost || tr.totalCost) || 0;
    const oldPaid   = parseFloat(tr.paid) || 0;
    const newPaid   = oldPaid + newAmount;

    if (newPaid > totalCost + 0.01) {
        const over = (newPaid - totalCost).toFixed(2);
        const ok = confirm(`⚠️ المبلغ الكلي المدفوع (${newPaid.toLocaleString()} ${curr}) يتجاوز التكلفة بـ ${over} ${curr}.\n\nهل تريد الاستمرار؟`);
        if (!ok) return;
    }

    const btn = document.getElementById('paySubmitBtn');
    const origHTML = btn?.innerHTML;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> جاري الحفظ...';
    }

    try {
        const updateData = { paid: newPaid };

        if (note) {
            const oldNotes = tr.notes || '';
            updateData.notes = oldNotes
                ? `${oldNotes} | دفعة ${newAmount} ${curr}: ${note}`
                : `دفعة ${newAmount} ${curr}: ${note}`;
        }

        await dbUpdate('treatments', treatmentId, updateData);

        closeModal('recordPaymentModal');

        const remaining = totalCost - newPaid;
        if (remaining <= 0.01) {
            showToast(`🎉 تم السداد الكامل — ${newAmount.toLocaleString()} ${curr}`, 'success');
        } else {
            showToast(`✓ دُفع ${newAmount.toLocaleString()} ${curr} — متبقي ${remaining.toLocaleString()} ${curr}`, 'success');
        }

        if (typeof loadPatientHistory === 'function') loadPatientHistory(patientId);
        if (typeof updateDashboard   === 'function') updateDashboard();

    } catch (err) {
        console.error('[submitPaymentUpdate]', err);
        showToast('خطأ في الحفظ: ' + (err.message || 'تحقق من الاتصال'), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
    }
};


// ── EDIT TREATMENT: فتح مودال التعديل ──────────────────────────────
window.openEditTreatmentModal = async function (treatmentId, patientId) {
    const treatments = await dbGetAll('treatments', { patient_id: patientId });
    const tr = treatments.find(t => t.id == treatmentId);
    if (!tr) { showToast('لم يُعثر على العلاج', 'error'); return; }

    document.getElementById('editTreatmentId').value        = treatmentId;
    document.getElementById('editTreatmentPatientId').value = patientId;
    document.getElementById('editProcedure').value          = tr.procedure || '';
    document.getElementById('editTotalCost').value          = parseFloat(tr.total_cost || tr.totalCost) || 0;
    document.getElementById('editPaidAmount').value         = parseFloat(tr.paid) || 0;
    document.getElementById('editNotes').value              = tr.notes || '';

    openModal('editTreatmentModal');
    setTimeout(() => document.getElementById('editProcedure')?.focus(), 150);
};


// ── EDIT TREATMENT: حفظ التعديلات ──────────────────────────────────
window.submitEditTreatment = async function () {
    const treatmentId = parseInt(document.getElementById('editTreatmentId').value);
    const patientId   = parseInt(document.getElementById('editTreatmentPatientId').value);
    const procedure   = document.getElementById('editProcedure').value.trim();
    const totalCost   = parseFloat(document.getElementById('editTotalCost').value) || 0;
    const paid        = parseFloat(document.getElementById('editPaidAmount').value) || 0;
    const notes       = document.getElementById('editNotes').value.trim();

    if (!procedure) {
        showToast('أدخل اسم الإجراء', 'error');
        document.getElementById('editProcedure')?.focus();
        return;
    }
    if (totalCost < 0) {
        showToast('التكلفة لا يمكن أن تكون سالبة', 'error');
        return;
    }

    const btn = document.getElementById('editTreatmentSubmitBtn');
    const origHTML = btn?.innerHTML;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> جاري الحفظ...';
    }

    try {
        const updateData = {
            procedure:  procedure,
            total_cost: totalCost,
            paid:       paid,
            notes:      notes,
        };

        await dbUpdate('treatments', treatmentId, updateData);

        closeModal('editTreatmentModal');
        showToast('✓ تم حفظ التعديلات', 'success');

        if (typeof loadPatientHistory === 'function') loadPatientHistory(patientId);
        if (typeof updateDashboard   === 'function') updateDashboard();

    } catch (err) {
        console.error('[submitEditTreatment]', err);
        showToast('خطأ في الحفظ: ' + (err.message || 'تحقق من الاتصال'), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
    }
};

// ℹ️  loadPatientHistory override مُدار من session_payments.js
