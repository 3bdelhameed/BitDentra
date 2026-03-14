// ══════════════════════════════════════════════════════════════════
//  doctors_module.js  —  إدارة الدكاتره والعمولات
//  يستخدم dbGetAll / dbInsert / dbUpdate / dbDelete
//  من supabase-config.js تماماً زي باقي الـ app
//  Schema: id, name_ar, name_en, phone, specialty,
//          commission_pct, is_active, notes, created_at
// ══════════════════════════════════════════════════════════════════

// ── helpers ──────────────────────────────────────────────────────
function getCurr() {
    return typeof getCurrency === 'function' ? getCurrency() : 'EGP';
}

function docName(d) {
    // support both snake_case (supabase) and camelCase (offline patched)
    return (
        d.name_ar || d.nameAr ||
        d.name_en || d.nameEn ||
        d.name || ''
    ).trim();
}

function docPct(d) {
    return parseFloat(d.commission_pct ?? d.commissionPct ?? 0) || 0;
}

function docActive(d) {
    return d.is_active !== false && d.isActive !== false;
}

// ══════════════════════════════════════════════════════════════════
//  DB WRAPPERS — يستخدم نفس functions باقي الـ app
// ══════════════════════════════════════════════════════════════════
async function getAllDoctorsFromDB() {
    try {
        let rows = await dbGetAll('doctors');

        // when offline, Dexie may be empty while the queue holds pending
        // inserts; include them so the user still sees the doctor they added.
        if (!navigator.onLine && Array.isArray(rows) && rows.length === 0 &&
            typeof window.getQueue === 'function') {
            try {
                const q = window.getQueue() || [];
                const pending = q
                    .filter(op => op.table === 'doctors' && op.action === 'insert')
                    .map(op => op.data || {});
                if (pending.length) rows = pending;
            } catch (_e) { /* ignore */ }
        }

        // رتّبهم تنازلياً بالـ id
        return (rows || []).sort((a, b) => (b.id || 0) - (a.id || 0));
    } catch (e) {
        console.error('[Doctors] dbGetAll error:', e);
        throw e;
    }
}

async function insertDoctorToDB(row) {
    return await dbInsert('doctors', row);
}

async function updateDoctorInDB(id, row) {
    return await dbUpdate('doctors', id, row);
}

async function deleteDoctorFromDB(id) {
    return await dbDelete('doctors', id);
}

async function getAllTreatmentsFromDB() {
    try {
        return await dbGetAll('treatments') || [];
    } catch (e) {
        return [];
    }
}

// ══════════════════════════════════════════════════════════════════
//  LOAD + RENDER DOCTORS TABLE
// ══════════════════════════════════════════════════════════════════
window.loadDoctors = async function () {
    const tbody = document.getElementById('doctorsTableBody');
    const empty = document.getElementById('doctorsEmpty');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-400 text-sm">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i>جاري التحميل...
    </td></tr>`;

    let all = [];
    try {
        all = await getAllDoctorsFromDB();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-red-400 text-sm">
            خطأ في التحميل: ${e.message}
        </td></tr>`;
        return;
    }

    const active = all.filter(docActive);

    // KPIs
    const setKpi = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setKpi('docKpiTotal',   all.length);
    setKpi('docKpiActive',  active.length);
    const avgPct = active.length
        ? (active.reduce((s, d) => s + docPct(d), 0) / active.length).toFixed(1) + '%'
        : '0%';
    setKpi('docKpiAvgComm', avgPct);

    if (!all.length) {
        tbody.innerHTML = '';
        empty?.classList.remove('hidden');
        await refreshAllDoctorDropdowns();
        return;
    }
    empty?.classList.add('hidden');

    tbody.innerHTML = all.map(doc => {
        const nm     = docName(doc);
        const pct    = docPct(doc);
        const act    = docActive(doc);
        const pctCls = pct >= 40 ? 'bg-red-100 text-red-600'
                     : pct >= 25 ? 'bg-yellow-100 text-yellow-700'
                                 : 'bg-green-100 text-green-700';
        return `
        <tr class="border-b border-gray-50 hover:bg-purple-50 transition text-sm ${!act ? 'opacity-50' : ''}">
          <td class="p-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                ${nm.charAt(0) || '?'}
              </div>
              <div>
                <span class="font-semibold text-gray-800 block">${nm || '—'}</span>
                ${ (doc.name_en||doc.nameEn) ? `<span class="text-xs text-gray-400">${doc.name_en||doc.nameEn}</span>` : '' }
                ${ doc.specialty ? `<span class="text-xs text-blue-400 block">${doc.specialty}</span>` : '' }
              </div>
            </div>
          </td>
          <td class="p-3 text-gray-500 text-xs">${doc.phone || '—'}</td>
          <td class="p-3 text-center">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${pctCls}">
              ${pct}%
            </span>
          </td>
          <td class="p-3 text-center">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
              ${act ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}">
              <span class="w-1.5 h-1.5 rounded-full ${act ? 'bg-green-500' : 'bg-gray-400'}"></span>
              ${act ? 'فعّال' : 'موقوف'}
            </span>
          </td>
          <td class="p-3 text-center">
            <div class="flex gap-1 justify-center flex-wrap">
              <button onclick="openDoctorSalaryModal(${doc.id})" title="كشف العمولة"
                class="text-xs px-2 py-1 rounded-lg bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100">
                <i class="fa-solid fa-coins"></i>
              </button>
              <button onclick="editDoctor(${doc.id})" title="تعديل"
                class="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-500 border border-blue-200 hover:bg-blue-100">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button onclick="toggleDoctorStatus(${doc.id}, ${act})" title="${act ? 'إيقاف' : 'تفعيل'}"
                class="text-xs px-2 py-1 rounded-lg ${act
                  ? 'bg-orange-50 text-orange-500 border border-orange-200'
                  : 'bg-green-50 text-green-500 border border-green-200'} hover:opacity-80">
                <i class="fa-solid ${act ? 'fa-pause' : 'fa-play'}"></i>
              </button>
              <button onclick="deleteDoctor(${doc.id})" title="حذف"
                class="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-400 border border-red-200 hover:bg-red-100">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    await refreshAllDoctorDropdowns();
};

// ══════════════════════════════════════════════════════════════════
//  OPEN ADD MODAL
// ══════════════════════════════════════════════════════════════════
window.openAddDoctorModal = function () {
    const modal = document.getElementById('doctorFormModal');
    if (!modal) { console.error('[Doctors] #doctorFormModal not found'); return; }

    document.getElementById('dfModalTitle').textContent = 'إضافة طبيب جديد';

    ['dfNameAr','dfNameEn','dfSpecialty','dfPhone','dfCommissionPct','dfNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const isActiveEl = document.getElementById('dfIsActive');
    if (isActiveEl) isActiveEl.checked = true;
    document.getElementById('dfCommissionPreview')?.classList.add('hidden');

    const btn = document.getElementById('dfSaveBtn');
    if (btn) { btn.onclick = null; btn.onclick = () => saveDoctor(null); }

    modal.classList.add('open');
    setTimeout(() => document.getElementById('dfNameAr')?.focus(), 100);
};

// ══════════════════════════════════════════════════════════════════
//  SAVE DOCTOR
// ══════════════════════════════════════════════════════════════════
window.saveDoctor = async function (editId) {
    editId = editId ?? null;

    const nameArEl = document.getElementById('dfNameAr');
    const nameAr   = nameArEl?.value.trim();
    if (!nameAr) {
        showToast('اكتب اسم الطبيب بالعربي أولاً', 'error');
        nameArEl?.focus();
        return;
    }

    const pct = parseFloat(document.getElementById('dfCommissionPct')?.value) || 0;
    if (pct < 0 || pct > 100) {
        showToast('النسبة يجب أن تكون بين 0 و 100', 'error');
        return;
    }

    const row = {
        name_ar:        nameAr,
        name_en:        document.getElementById('dfNameEn')?.value.trim()    || null,
        specialty:      document.getElementById('dfSpecialty')?.value.trim() || null,
        phone:          document.getElementById('dfPhone')?.value.trim()     || null,
        commission_pct: pct,
        is_active:      document.getElementById('dfIsActive')?.checked !== false,
        notes:          document.getElementById('dfNotes')?.value.trim()     || null,
    };

    const btn  = document.getElementById('dfSaveBtn');
    const orig = btn?.innerHTML;
    if (btn) {
        btn.disabled  = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>جاري الحفظ...';
    }

    try {
        if (editId) {
            await updateDoctorInDB(editId, row);
            showToast(' تم تحديث بيانات الطبيب✓', 'success');
        } else {
            await insertDoctorToDB(row);
            showToast('تمت إضافة الطبيب بنجاح ✓', 'success');
        }
        document.getElementById('doctorFormModal')?.classList.remove('open');
        await loadDoctors();
    } catch (err) {
        console.error('[saveDoctor]', err);
        showToast('خطأ: ' + (err.message || 'تحقق من الاتصال'), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
};

// ══════════════════════════════════════════════════════════════════
//  EDIT DOCTOR
// ══════════════════════════════════════════════════════════════════
window.editDoctor = async function (id) {
    let all;
    try { all = await getAllDoctorsFromDB(); }
    catch (e) { showToast('خطأ في التحميل', 'error'); return; }

    const doc = all.find(d => String(d.id) === String(id));
    if (!doc) { showToast('لم يُعثر على الطبيب', 'error'); return; }

    const modal = document.getElementById('doctorFormModal');
    if (!modal) return;

    document.getElementById('dfModalTitle').textContent = 'تعديل بيانات الطبيب';

    const setVal = (elId, v) => {
        const el = document.getElementById(elId);
        if (el) el.value = v ?? '';
    };
    setVal('dfNameAr',        doc.name_ar    || '');
    setVal('dfNameEn',        doc.name_en    || '');
    setVal('dfSpecialty',     doc.specialty  || '');
    setVal('dfPhone',         doc.phone      || '');
    setVal('dfCommissionPct', docPct(doc));
    setVal('dfNotes',         doc.notes      || '');

    const isActiveEl = document.getElementById('dfIsActive');
    if (isActiveEl) isActiveEl.checked = docActive(doc);

    updateDfCommissionPreview();

    const btn = document.getElementById('dfSaveBtn');
    if (btn) { btn.onclick = null; btn.onclick = () => saveDoctor(id); }

    modal.classList.add('open');
    setTimeout(() => document.getElementById('dfNameAr')?.focus(), 100);
};

// ══════════════════════════════════════════════════════════════════
//  TOGGLE / DELETE
// ══════════════════════════════════════════════════════════════════
window.toggleDoctorStatus = async function (id, currentlyActive) {
    try {
        await updateDoctorInDB(id, { is_active: !currentlyActive });
        showToast(
            currentlyActive ? 'تم إيقاف الطبيب' : 'تم تفعيل الطبيب ✓',
            currentlyActive ? ''        : 'success'
        );
        await loadDoctors();
    } catch (e) { showToast('خطأ: ' + e.message, 'error'); }
};

window.deleteDoctor = async function (id) {
    if (!confirm('حذف هذا الطبيب نهائياً؟\nلن يؤثر على العلاجات المسجّلة.')) return;
    try {
        await deleteDoctorFromDB(id);
        showToast('تم حذف الطبيب', 'error');
        await loadDoctors();
    } catch (e) { showToast('خطأ: ' + e.message, 'error'); }
};

// ══════════════════════════════════════════════════════════════════
//  COMMISSION PREVIEW
// ══════════════════════════════════════════════════════════════════
window.updateDfCommissionPreview = function () {
    const pct = parseFloat(document.getElementById('dfCommissionPct')?.value) || 0;
    const el  = document.getElementById('dfCommissionPreview');
    if (!el) return;
    if (pct > 0) {
        const curr   = getCurr();
        const on1000 = (pct * 10).toFixed(0);
        el.innerHTML = `<i class="fa-solid fa-circle-info mr-1"></i>
            مثال: علاج بـ 1000 ${curr} محصّل ← الطبيب يأخذ <strong>${on1000} ${curr}</strong>`;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
};

// ══════════════════════════════════════════════════════════════════
//  REFRESH ALL DOCTOR DROPDOWNS
// ══════════════════════════════════════════════════════════════════
window.refreshAllDoctorDropdowns = async function () {
    let all = [];
    try { all = await getAllDoctorsFromDB(); } catch (e) { return; }
    const active = all.filter(docActive);

    // نافذة حجز الميعاد
    const apptSel = document.getElementById('appointmentDoctor');
    if (apptSel) {
        const cur = apptSel.value;
        apptSel.innerHTML =
            '<option value="">— اختر الطبيب —</option>' +
            active.map(d =>
                `<option value="${docName(d)}">${docName(d)}${d.specialty ? ' — ' + d.specialty : ''}</option>`
            ).join('');
        if (cur) apptSel.value = cur;
    }

    // نافذة إضافة العلاج
    const treatSel = document.getElementById('treatmentDoctorId');
    if (treatSel) {
        const cur = treatSel.value;
        treatSel.innerHTML =
            '<option value="">— اختر الطبيب المعالج —</option>' +
            active.map(d =>
                `<option value="${d.id}" data-pct="${docPct(d)}" data-name="${docName(d)}">
                    ${docName(d)}${docPct(d) ? ' (' + docPct(d) + '%)' : ''}
                </option>`
            ).join('');
        if (cur) treatSel.value = cur;
    }
};
window.refreshDoctorDropdowns = window.refreshAllDoctorDropdowns;

// ══════════════════════════════════════════════════════════════════
//  TREATMENT — معاينة العمولة لحظياً
// ══════════════════════════════════════════════════════════════════
window.onTreatmentDoctorChange = function () {
    const sel     = document.getElementById('treatmentDoctorId');
    const paidEl  = document.getElementById('treatmentPaid');
    const preview = document.getElementById('treatmentCommissionPreview');
    const amtEl   = document.getElementById('treatmentCommAmt');
    if (!sel?.value) { preview?.classList.add('hidden'); return; }
    const pct  = parseFloat(sel.selectedOptions[0]?.getAttribute('data-pct')) || 0;
    const paid = parseFloat(paidEl?.value) || 0;
    if (pct > 0) {
        if (amtEl) amtEl.textContent = (paid * pct / 100).toFixed(2) + ' ' + getCurr();
        preview?.classList.remove('hidden');
    } else {
        preview?.classList.add('hidden');
    }
};

// ══════════════════════════════════════════════════════════════════
//  SALARY MODAL
// ══════════════════════════════════════════════════════════════════
window.openDoctorSalaryModal = async function (docId) {
    let all;
    try { all = await getAllDoctorsFromDB(); }
    catch (e) { showToast('خطأ في التحميل', 'error'); return; }

    const doc = all.find(d => String(d.id) === String(docId));
    if (!doc) return;

    document.getElementById('salaryDoctorId').value             = docId;
    document.getElementById('salaryDoctorName').textContent     = docName(doc);
    document.getElementById('salaryCommissionRate').textContent  = `نسبة العمولة: ${docPct(doc)}%`;

    const now    = new Date();
    const defMon = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('salaryMonthFilter').value = defMon;

    const modal = document.getElementById('doctorSalaryModal');
    if (modal) modal.classList.add('open');
    else if (typeof openModal === 'function') openModal('doctorSalaryModal');

    await calcDoctorSalary(docId, defMon);
};

window.recalcDoctorSalary = async function () {
    const docId = document.getElementById('salaryDoctorId')?.value;
    const month = document.getElementById('salaryMonthFilter')?.value;
    if (docId) await calcDoctorSalary(docId, month);
};

async function calcDoctorSalary(docId, monthFilter) {
    const curr  = getCurr();
    const tbody = document.getElementById('salaryTreatmentsList');

    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400 text-xs">
        <i class="fa-solid fa-spinner fa-spin mr-1"></i>جاري الحساب...
    </td></tr>`;

    let rows = [];
    try { rows = await getAllTreatmentsFromDB(); }
    catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-400 text-xs">خطأ: ${e.message}</td></tr>`;
        return;
    }

    rows = rows.filter(t => {
        const tid  = String(t.doctor_id   ?? t.doctorId   ?? '');
        const tnam = String(t.doctor_name ?? t.doctorName ?? '');
        return tid === String(docId) || (tnam && tnam === String(docId));
    });
    if (monthFilter) rows = rows.filter(t => (t.date || '').startsWith(monthFilter));

    let rev = 0, coll = 0, comm = 0;
    rows.forEach(t => {
        const cost = parseFloat(t.total_cost ?? t.totalCost) || 0;
        const paid = parseFloat(t.paid) || 0;
        const pct  = parseFloat(t.doctor_commission_pct ?? t.doctorCommissionPct) || 0;
        const c    = parseFloat(t.doctor_commission_amt ?? t.doctorCommissionAmt)
                  || parseFloat((paid * pct / 100).toFixed(2));
        rev  += cost;
        coll += paid;
        comm += c;
    });

    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('salaryKpiRevenue',    rev.toLocaleString()  + ' ' + curr);
    setEl('salaryKpiCollected',  coll.toLocaleString() + ' ' + curr);
    setEl('salaryKpiCommission', comm.toFixed(2)       + ' ' + curr);
    setEl('salaryKpiSessions',   rows.length + ' جلسة');

    if (!tbody) return;
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400 text-sm">
            لا توجد علاجات لهذا الطبيب في هذه الفترة
        </td></tr>`;
        return;
    }

    tbody.innerHTML = [...rows]
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .map(t => {
            const cost = parseFloat(t.total_cost ?? t.totalCost) || 0;
            const paid = parseFloat(t.paid) || 0;
            const pct  = parseFloat(t.doctor_commission_pct ?? t.doctorCommissionPct) || 0;
            const c    = parseFloat(t.doctor_commission_amt ?? t.doctorCommissionAmt)
                      || parseFloat((paid * pct / 100).toFixed(2));
            return `<tr class="border-b border-gray-50 hover:bg-slate-50 text-xs">
              <td class="p-2 text-gray-400">${t.date || '—'}</td>
              <td class="p-2 font-medium text-gray-700">${t.procedure || '—'}</td>
              <td class="p-2 text-gray-500">${t.patient_name ?? t.patientName ?? '—'}</td>
              <td class="p-2 text-right text-gray-700">${cost.toLocaleString()} ${curr}</td>
              <td class="p-2 text-right text-green-600 font-semibold">${paid.toLocaleString()} ${curr}</td>
              <td class="p-2 text-right font-bold ${c > 0 ? 'text-purple-600' : 'text-gray-300'}">
                ${c.toFixed(2)} ${curr}
              </td>
            </tr>`;
        }).join('');
}

// ══════════════════════════════════════════════════════════════════
//  PATCH openModal — يحدّث dropdowns لما تُفتح المودالز
// ══════════════════════════════════════════════════════════════════
(function patchOpenModal() {
    const _orig = window.openModal;
    window.openModal = function (id, extra) {
        if (typeof _orig === 'function') _orig(id, extra);
        if (id === 'addTreatmentModal' || id === 'addAppointmentModal') {
            setTimeout(async () => {
                await refreshAllDoctorDropdowns();
                if (id === 'addTreatmentModal') {
                    const sel = document.getElementById('treatmentDoctorId');
                    if (sel) sel.value = '';
                    document.getElementById('treatmentCommissionPreview')?.classList.add('hidden');
                }
            }, 80);
        }
    };
})();

// ══════════════════════════════════════════════════════════════════
//  PATCH dbInsert — حقن doctor fields تلقائياً عند إضافة treatments
//  ده أضمن من انتظار بعد الـ submit
// ══════════════════════════════════════════════════════════════════
(function patchDbInsert() {
    const _origInsert = window.dbInsert;
    if (!_origInsert) {
        // لو dbInsert مش موجود بعد، جرّب بعد تحميل الصفحة
        window.addEventListener('load', () => setTimeout(patchDbInsert, 500));
        return;
    }
    if (window._dbInsertDocPatched) return;
    window._dbInsertDocPatched = true;

    window.dbInsert = async function(table, data) {
        // لو بنضيف treatment، أضف doctor fields تلقائياً
        if (table === 'treatments') {
            const sel  = document.getElementById('treatmentDoctorId');
            if (sel?.value) {
                const opt   = sel.selectedOptions[0];
                const docId = parseInt(sel.value);
                const pct   = parseFloat(opt?.getAttribute('data-pct')) || 0;
                const name  = opt?.getAttribute('data-name') || '';
                const paid  = parseFloat(data.paid ?? data.totalPaid ?? 0) || 0;
                const comm  = parseFloat((paid * pct / 100).toFixed(2));
                data = {
                    ...data,
                    doctor_id:             docId,
                    doctor_name:           name,
                    doctor_commission_pct: pct,
                    doctor_commission_amt: comm,
                };
            }
        }
        return await _origInsert(table, data);
    };
})();

// ── ربط input المدفوع بمعاينة العمولة ───────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    const paidEl = document.getElementById('treatmentPaid');
    if (paidEl && !paidEl._docListened) {
        paidEl.addEventListener('input', onTreatmentDoctorChange);
        paidEl._docListened = true;
    }
});

// ══════════════════════════════════════════════════════════════════
//  PATCH switchView — للـ doctors view بس
// ══════════════════════════════════════════════════════════════════
(function patchSwitchView() {
    const _orig = window.switchView;
    window.switchView = function (viewName) {
        if (viewName === 'doctors') {
            // امسح كل الـ active في الـ sidebar
            document.querySelectorAll('aside .sidebar-link').forEach(el => el.classList.remove('active'));
            // فعّل doctors
            document.getElementById('nav-doctors')?.classList.add('active');
            // فعّل الـ view
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
            document.getElementById('doctorsView')?.classList.add('active');
            // العنوان
            const title = document.getElementById('headerTitle');
            if (title) title.textContent = 'الدكاتره والعمولات';
            loadDoctors();
            return;
        }
        if (typeof _orig === 'function') _orig(viewName);
    };
})();

// ══════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════
window.addEventListener('load', function () {
    // انتظر تحميل كل الملفات، ثم حدّث القوائم
    setTimeout(async () => {
        await refreshAllDoctorDropdowns();
    }, 1200);
});
