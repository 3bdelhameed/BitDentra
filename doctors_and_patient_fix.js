// ══════════════════════════════════════════════════════════════════════════════
//  doctors_and_patient_fix.js  v1.0
//  ✅ إصلاح 1: الدكاتره — doctor fields تتحقن صح في treatments حتى بعد wrap
//  ✅ إصلاح 2: تعديل بيانات المريض — modal كامل + زر تعديل في الـ profile
//  ✅ إصلاح 3: offline sync — يضمن الـ queue يشتغل صح مع doctors_module
//
//  أضفه في index.html بعد offline_first_patch.js (أو offline_sync_patch.js)
//  <script src="doctors_and_patient_fix.js"></script>
// ══════════════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ══════════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════
    //  إصلاح 1: DOCTORS — inject doctor fields في كل insert على treatments
    //  مع خصم تكلفة المعمل من نسبة الطبيب إذا كان الإجراء زراعة أو تركيبات
    // ══════════════════════════════════════════════════════════════════
    function isLabProcedure(procName, cond) {
        const p = String(procName || '').toLowerCase().trim();
        const c = String(cond || '').toLowerCase().trim();

        const isImplant = p.includes('implant') || p.includes('زرع') || p.includes('زراعة') || p.includes('زراعه') || c === 'implant';

        const isCrown = c === 'crown_work' || c === 'crown' || c === 'bridge' ||
            p.includes('crown') || p.includes('كراون') || p.includes('طربوش') ||
            p.includes('تركيب') || p.includes('تركيبه') || p.includes('تركيبة') ||
            p.includes('bridge') || p.includes('جسر') || p.includes('كبري') ||
            p.includes('denture') || p.includes('طقم') ||
            p.includes('veneer') || p.includes('فينير') || p.includes('عدس') ||
            p.includes('zircon') || p.includes('زركون') ||
            p.includes('porcelain') || p.includes('بورسل') ||
            p.includes('e-max') || p.includes('emax') || p.includes('إيماكس') || p.includes('ايماكس') ||
            p.includes('inlay') || p.includes('onlay') || p.includes('إنلاي') || p.includes('اونلاي') ||
            p.includes('prostho');

        const isLab = isImplant || isCrown;
        const typeLabel = isImplant ? 'الزرعة' : (isCrown ? 'التركيبة' : 'المعمل');

        return { isLab, isImplant, isCrown, typeLabel };
    }
    window.isLabProcedure = isLabProcedure;

    function extractTreatmentLabCost(data) {
        let lab = parseFloat(data.implant_lab_cost ?? data.implantLabCost ?? 0) || 0;
        if (!lab) {
            const el = document.getElementById('treatmentImplantLabCost');
            if (el && el.value) lab = parseFloat(el.value) || 0;
        }
        if (!lab && data.notes) {
            const m = String(data.notes).match(/\[(?:زرعة|تركيبة|معمل):[^\]]*تكلفة\s*([\d.]+)\]/i);
            if (m) lab = parseFloat(m[1]) || 0;
            else {
                const m2 = String(data.notes).match(/(?:معمل\s*الزرع(?:ة)?|معمل\s*التركيب(?:ة)?|تكلفة\s*المعمل|معمل)\s*[:=-]?\s*([\d.]+)/i);
                if (m2) lab = parseFloat(m2[1]) || 0;
            }
        }
        return lab;
    }

    function fixDoctorInjection() {
        // مسح الـ flag القديم عشان نعيد wrap صح
        window._dbInsertDocPatched = false;

        const origInsert = window.dbInsert;
        if (!origInsert) return setTimeout(fixDoctorInjection, 300);

        window.dbInsert = async function (table, data) {
            if (table === 'treatments') {
                const sel = document.getElementById('treatmentDoctorId');
                let docId = null, name = '', pct = 0;
                if (sel && sel.value) {
                    const opt   = sel.selectedOptions[0];
                    docId = parseInt(sel.value);
                    pct   = parseFloat(opt?.getAttribute('data-pct')) || 0;
                    name  = opt?.getAttribute('data-name') || opt?.textContent?.split('(')[0]?.trim() || '';
                } else if (data.doctor_id || data.doctorId) {
                    docId = parseInt(data.doctor_id ?? data.doctorId);
                    name  = data.doctor_name || data.doctorName || '';
                    pct   = parseFloat(data.doctor_commission_pct ?? data.doctorCommissionPct) || 0;
                }

                if (docId) {
                    const paid    = parseFloat(data.paid ?? data.totalPaid ?? 0) || 0;
                    const proc    = data.procedure || document.getElementById('treatmentProcedure')?.value || '';
                    const cond    = data.tooth_condition || document.getElementById('treatmentToothCondition')?.value || '';
                    const labInfo = isLabProcedure(proc, cond);
                    const labCost = labInfo.isLab ? extractTreatmentLabCost(data) : 0;
                    const netBase = labInfo.isLab ? Math.max(0, paid - labCost) : paid;
                    const comm    = pct > 0 ? parseFloat((netBase * pct / 100).toFixed(2)) : 0;

                    data = {
                        ...data,
                        doctor_id:             docId,
                        doctor_name:           name,
                        doctor_commission_pct: pct,
                        doctor_commission_amt: comm,
                    };
                    if (labInfo.isLab && labCost > 0) {
                        data.implant_lab_cost = labCost;
                        const labName = (data.implant_lab_name || document.getElementById('treatmentImplantLabName')?.value || '').trim();
                        if (labName) data.implant_lab_name = labName;
                        const labTag = `[${labInfo.isImplant ? 'زرعة' : 'تركيبة'}: معمل ${labName || 'معمل'} - تكلفة ${labCost}]`;
                        if (!data.notes) data.notes = labTag;
                        else if (!data.notes.includes('معمل')) data.notes = `${data.notes} ${labTag}`.trim();
                    }
                }
            }
            return await origInsert(table, data);
        };

        // نسخ أي flags من الأصل
        Object.keys(origInsert).forEach(k => {
            if (typeof origInsert[k] !== 'function') {
                window.dbInsert[k] = origInsert[k];
            }
        });

        window._dbInsertDocPatched = true;
        console.log('[DoctorFix] ✓ dbInsert doctor injection fixed (with implant & crown lab deduction)');
    }

    // ── تصحيح العمولات السابقة لعمليات الزراعة والتركيبات ───────────
    async function repairImplantDoctorCommissions() {
        try {
            if (!window.db || !window.db.treatments) return;
            const treatments = await window.db.treatments.toArray();
            let allDocs = [];
            try { allDocs = await (window.dbGetAll ? window.dbGetAll('doctors') : []); } catch (_) {}
            let labOrders = [];
            try { labOrders = await (window.dbGetAll ? window.dbGetAll('lab_orders') : []); } catch (_) {}

            for (const tr of treatments) {
                const labInfo = isLabProcedure(tr.procedure, tr.tooth_condition);
                if (!labInfo.isLab) continue;
                let pct = parseFloat(tr.doctor_commission_pct ?? tr.doctorCommissionPct) || 0;
                const docId = tr.doctor_id ?? tr.doctorId;
                if (!pct && docId && allDocs.length) {
                    const doc = allDocs.find(d => String(d.id) === String(docId));
                    if (doc) pct = parseFloat(doc.commission_pct ?? doc.commissionPct ?? 0);
                }
                if (!pct) continue;

                let labCost = extractTreatmentLabCost(tr);
                if (!labCost && labOrders.length && (tr.patient_id || tr.patientId)) {
                    const pid = String(tr.patient_id ?? tr.patientId);
                    const matchOrder = labOrders.find(o => String(o.patient_id ?? o.patientId) === pid && (
                        (o.work_type || o.workType || '').toLowerCase().includes(labInfo.isImplant ? 'زرع' : 'تركيب') ||
                        (o.work_type || o.workType || '').toLowerCase().includes('implant') ||
                        (o.work_type || o.workType || '').toLowerCase().includes('crown') ||
                        (o.work_type || o.workType || '').toLowerCase().includes('bridge')
                    ));
                    if (matchOrder) labCost = parseFloat(matchOrder.cost || matchOrder.amount || 0);
                }
                if (labCost <= 0) continue;

                const paid = parseFloat(tr.paid) || 0;
                const expectedComm = parseFloat((Math.max(0, paid - labCost) * pct / 100).toFixed(2));
                const currentComm = parseFloat(tr.doctor_commission_amt ?? tr.doctorCommissionAmt ?? -1);

                if (currentComm > expectedComm + 0.05) {
                    console.log(`[DoctorFix] Repairing ${labInfo.typeLabel} commission for #${tr.id}: ${currentComm} -> ${expectedComm} (after deducting lab ${labCost})`);
                    const patch = {
                        doctor_commission_amt: expectedComm,
                        implant_lab_cost: labCost
                    };
                    await window.db.treatments.update(tr.id, patch);
                    if (navigator.onLine && typeof window.dbUpdate === 'function') {
                        await window.dbUpdate('treatments', tr.id, patch).catch(() => {});
                    }
                }
            }
        } catch (e) {
            console.warn('[DoctorFix] repairImplantDoctorCommissions err:', e);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  إصلاح 2: EDIT PATIENT — modal + زر تعديل في profile
    // ══════════════════════════════════════════════════════════════════

    // ── إنشاء modal تعديل المريض ──────────────────────────────────
    function injectEditPatientModal() {
        if (document.getElementById('editPatientModal')) return;

        const modal = document.createElement('div');
        modal.id        = 'editPatientModal';
        modal.className = 'modal-base';
        modal.innerHTML = `
        <div class="modal-box max-w-lg w-full" onclick="event.stopPropagation()">

            <!-- Header -->
            <div class="flex items-center justify-between mb-5">
                <h3 class="text-base font-bold text-gray-800 flex items-center gap-2">
                    <i class="fa-solid fa-user-pen text-blue-500"></i>
                    تعديل بيانات المريض
                </h3>
                <button onclick="closeModal('editPatientModal')"
                    class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition">
                    <i class="fa-solid fa-xmark text-xs"></i>
                </button>
            </div>

            <form id="editPatientForm" onsubmit="return false">
                <input type="hidden" id="editPatientId">

                <!-- Name -->
                <div class="mb-3">
                    <label class="block text-xs font-semibold text-gray-600 mb-1">الاسم الكامل *</label>
                    <input id="editPatientName" type="text" required
                        class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                        placeholder="اسم المريض">
                </div>

                <!-- Phone + Age -->
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">الهاتف *</label>
                        <input id="editPatientPhone" type="tel"
                            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                            placeholder="01xxxxxxxxx">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">العمر</label>
                        <input id="editPatientAge" type="number" min="0" max="150"
                            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                            placeholder="العمر">
                    </div>
                </div>

                <!-- Gender -->
                <div class="mb-3">
                    <label class="block text-xs font-semibold text-gray-600 mb-1">الجنس</label>
                    <select id="editPatientGender"
                        class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none bg-white"
                        onchange="editPatientToggleFemaleFields()">
                        <option value="">اختر...</option>
                        <option value="Male">ذكر</option>
                        <option value="Female">أنثى</option>
                    </select>
                </div>

                <!-- Female-only fields -->
                <div id="editPatientFemaleFields" class="hidden mb-3">
                    <div class="bg-pink-50 border border-pink-100 rounded-xl p-3 grid grid-cols-2 gap-3">
                        <label class="flex items-center gap-2 cursor-pointer text-sm text-pink-700">
                            <input type="checkbox" id="editPatientPregnant" class="rounded">
                            🤰 حامل
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer text-sm text-pink-700">
                            <input type="checkbox" id="editPatientBreastfeeding" class="rounded">
                            🤱 مرضعة
                        </label>
                    </div>
                </div>

                <!-- Medical history checkboxes -->
                <div class="mb-3">
                    <label class="block text-xs font-semibold text-gray-600 mb-2">التاريخ الطبي</label>
                    <div class="grid grid-cols-2 gap-1.5 bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs">
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="سكري"> سكري</label>
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="ضغط دم مرتفع"> ضغط دم</label>
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="أمراض قلب"> أمراض قلب</label>
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="ربو"> ربو</label>
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="اضطراب نزيف"> اضطراب نزيف</label>
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="أمراض كلى"> أمراض كلى</label>
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="أمراض كبد"> أمراض كبد</label>
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="مميعات دم"> مميعات دم</label>
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="حساسية بنسلين"> حساسية بنسلين</label>
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="حساسية أسبرين"> حساسية أسبرين</label>
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="هشاشة عظام"> هشاشة عظام</label>
                        <label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="edit-med-cb" value="هشاشة عظام" style="display:none"></label>
                    </div>
                </div>

                <!-- Extra notes -->
                <div class="mb-4">
                    <label class="block text-xs font-semibold text-gray-600 mb-1">ملاحظات إضافية</label>
                    <textarea id="editPatientMedNotes" rows="2"
                        class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none resize-none"
                        placeholder="أخرى / حساسية / ملاحظات..."></textarea>
                </div>

                <!-- Buttons -->
                <div class="flex gap-2">
                    <button id="editPatientSaveBtn" onclick="saveEditedPatient()"
                        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-2.5 text-sm transition flex items-center justify-center gap-2">
                        <i class="fa-solid fa-floppy-disk"></i>
                        حفظ التعديلات
                    </button>
                    <button onclick="closeModal('editPatientModal')"
                        class="px-5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl py-2.5 text-sm transition">
                        إلغاء
                    </button>
                </div>
            </form>
        </div>`;

        // إغلاق بالضغط على الخلفية
        modal.addEventListener('click', e => { if (e.target === modal) closeModal('editPatientModal'); });
        document.body.appendChild(modal);

        // CSS إضافي لو مش موجود
        if (!document.getElementById('editPatientStyles')) {
            const style = document.createElement('style');
            style.id = 'editPatientStyles';
            style.textContent = `
                #editPatientModal.open { display:flex!important; }
                #editPatientModal {
                    display:none; position:fixed; inset:0; background:rgba(0,0,0,.45);
                    z-index:9999; align-items:center; justify-content:center; padding:16px;
                }
            `;
            document.head.appendChild(style);
        }

        console.log('[PatientFix] ✓ Edit patient modal injected');
    }

    // ── فتح modal التعديل ─────────────────────────────────────────
    window.openEditPatientModal = async function (id) {
        const patientId = id || window.currentProfilePatientId;
        if (!patientId) return;

        let patient;
        try {
            const rows = await dbGetAll('patients', { id: patientId });
            patient = rows[0] || rows.find?.(r => r.id == patientId);
            // لو مش لاقيه بالـ filter، جيبهم كلهم
            if (!patient) {
                const all = await dbGetAll('patients');
                patient   = all.find(r => String(r.id) === String(patientId));
            }
        } catch (e) {
            if (typeof showToast === 'function') showToast('خطأ في تحميل بيانات المريض', 'error');
            return;
        }
        if (!patient) { if (typeof showToast === 'function') showToast('لم يُعثر على المريض', 'error'); return; }

        // ملء الفورم
        document.getElementById('editPatientId').value    = patient.id;
        document.getElementById('editPatientName').value  = patient.name  || '';
        document.getElementById('editPatientPhone').value = patient.phone || '';
        document.getElementById('editPatientAge').value   = patient.age   || '';

        const genderEl = document.getElementById('editPatientGender');
        if (genderEl) {
            genderEl.value = patient.gender || '';
            editPatientToggleFemaleFields();
        }

        // حامل / مرضعة
        const pregnantEl       = document.getElementById('editPatientPregnant');
        const breastfeedingEl  = document.getElementById('editPatientBreastfeeding');
        if (pregnantEl)      pregnantEl.checked      = !!patient.is_pregnant;
        if (breastfeedingEl) breastfeedingEl.checked = !!patient.is_breastfeeding;

        // التاريخ الطبي — نفصّل الـ checkboxes
        const medHistory = patient.medical_history || patient.medHistory || '';
        const medParts   = medHistory ? medHistory.split(',').map(s => s.trim()) : [];

        // reset كل الـ checkboxes
        document.querySelectorAll('.edit-med-cb').forEach(cb => {
            cb.checked = medParts.some(p => p.includes(cb.value) || cb.value.includes(p));
        });

        // الملاحظات الإضافية (الجزء اللي مش checkbox)
        const knownConditions = [...document.querySelectorAll('.edit-med-cb')].map(cb => cb.value);
        const extraNotes = medParts
            .filter(p => !knownConditions.some(c => p.includes(c) || c.includes(p)))
            .join(', ');
        document.getElementById('editPatientMedNotes').value = extraNotes;

        // فتح الـ modal
        const modal = document.getElementById('editPatientModal');
        if (modal) modal.classList.add('open');
        setTimeout(() => document.getElementById('editPatientName')?.focus(), 100);
    };

    // toggle female fields
    window.editPatientToggleFemaleFields = function () {
        const gender     = document.getElementById('editPatientGender')?.value;
        const femaleDiv  = document.getElementById('editPatientFemaleFields');
        if (!femaleDiv) return;
        if (gender === 'Female') {
            femaleDiv.classList.remove('hidden');
            femaleDiv.classList.add('grid');
        } else {
            femaleDiv.classList.add('hidden');
            femaleDiv.classList.remove('grid');
        }
    };

    // ── حفظ التعديلات ─────────────────────────────────────────────
    window.saveEditedPatient = async function () {
        const id   = document.getElementById('editPatientId')?.value;
        const name = document.getElementById('editPatientName')?.value.trim();
        if (!id || !name) {
            if (typeof showToast === 'function') showToast('اسم المريض مطلوب', 'error');
            return;
        }

        // اجمع الـ checkboxes
        const checked = [];
        document.querySelectorAll('.edit-med-cb:checked').forEach(cb => checked.push(cb.value));
        const extraNotes = document.getElementById('editPatientMedNotes')?.value.trim() || '';
        const fullMedHistory = [...checked, ...(extraNotes ? [extraNotes] : [])].join(', ') || null;

        const data = {
            name,
            phone:            document.getElementById('editPatientPhone')?.value.trim() || null,
            age:              parseInt(document.getElementById('editPatientAge')?.value) || null,
            gender:           document.getElementById('editPatientGender')?.value || null,
            medical_history:  fullMedHistory,
            is_pregnant:      document.getElementById('editPatientPregnant')?.checked || false,
            is_breastfeeding: document.getElementById('editPatientBreastfeeding')?.checked || false,
        };

        const btn  = document.getElementById('editPatientSaveBtn');
        const orig = btn?.innerHTML;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>جاري الحفظ...'; }

        try {
            await dbUpdate('patients', parseInt(id), data);
            closeModal('editPatientModal');
            if (typeof showToast === 'function') showToast('✅ تم تحديث بيانات المريض', 'success');

            // تحديث الـ view
            if (window.currentProfilePatientId == id) {
                // تحديث الاسم في الهيدر
                document.getElementById('profileName').innerText  = name;
                // إعادة تحميل البروفايل كامل
                if (typeof openPatientProfile === 'function') {
                    await openPatientProfile(parseInt(id));
                }
            }
            if (typeof loadAllPatients === 'function') loadAllPatients();
            if (typeof updateDashboard  === 'function') updateDashboard();
        } catch (err) {
            if (typeof showToast === 'function') showToast('خطأ: ' + (err.message || 'تحقق من الاتصال'), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = orig; }
        }
    };

    // ── إضافة زر "تعديل البيانات" في صفحة البروفايل ──────────────
    function injectEditBtnInProfile() {
        // Patch openPatientProfile لإضافة زرار التعديل
        const origProfile = window.openPatientProfile;
        if (!origProfile || origProfile._editPatched) return;

        window.openPatientProfile = async function (id) {
            await origProfile(id);
            // انتظر قليلاً عشان الـ DOM يتبني
            setTimeout(() => addEditBtnToProfile(id), 150);
        };
        window.openPatientProfile._editPatched = true;
    }

    function addEditBtnToProfile(patientId) {
        // فيه زرار موجود؟ ما نضيفش تاني
        if (document.getElementById('profileEditPatientBtn')) {
            document.getElementById('profileEditPatientBtn').onclick = () => openEditPatientModal(patientId);
            return;
        }

        // دور على الزرار "إضافة علاج" أو "رجوع" في الهيدر
        const profileHeader = document.querySelector('#profileView .flex.items-center.gap-2, #profileView .profile-header-actions, #profileView [class*="flex"][class*="gap"]');
        const backBtn       = document.querySelector('#profileView button[onclick*="switchView"]') ||
                              document.querySelector('#profileView button[onclick*="patients"]');

        const btn = document.createElement('button');
        btn.id        = 'profileEditPatientBtn';
        btn.onclick   = () => openEditPatientModal(patientId);
        btn.title     = 'تعديل بيانات المريض';
        btn.className = 'btn btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5';
        btn.innerHTML = '<i class="fa-solid fa-user-pen"></i> تعديل';

        // نحط الزرار جنب الـ back button أو في أي مكان مناسب
        if (backBtn && backBtn.parentNode) {
            backBtn.parentNode.insertBefore(btn, backBtn.nextSibling);
        } else {
            // fallback: في الـ profileInfoCards
            const cards = document.getElementById('profileInfoCards');
            if (cards) {
                const wrapper = document.createElement('div');
                wrapper.className = 'col-span-2 md:col-span-4 flex justify-end mt-1';
                wrapper.appendChild(btn);
                cards.parentNode.insertBefore(wrapper, cards.nextSibling);
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  إصلاح 3: ضمان صحة الـ offline sync مع doctors
    //  الـ syncQueue يتعامل مع doctor_id بشكل صح
    // ══════════════════════════════════════════════════════════════════
    function fixOfflineSyncForDoctors() {
        // لو مفيش syncQueue، مش محتاجين نعمل حاجة
        if (typeof window.syncOfflineQueue !== 'function' && typeof window.syncQueue !== 'function') return;

        // Patch session_payments doctor_id — لو اتبعت بـ doctor_name نص
        // نضيف lookup عند المزامنة
        const origSync = window.syncOfflineQueue || window.syncQueue;
        if (origSync && !origSync._doctorPatched) {
            const patched = async function () {
                return await origSync();
            };
            patched._doctorPatched = true;
            if (window.syncOfflineQueue) window.syncOfflineQueue = patched;
            if (window.syncQueue)        window.syncQueue        = patched;
        }
        console.log('[DoctorFix] ✓ Offline sync doctor-aware');
    }

    // ══════════════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════════════
    async function init() {
        // انتظر حتى يتحمل الـ DOM + dbInsert
        let waited = 0;
        while ((typeof window.dbInsert !== 'function' || typeof window.openPatientProfile !== 'function') && waited < 200) {
            await new Promise(r => setTimeout(r, 100));
            waited++;
        }

        // 1. إصلاح doctor injection
        fixDoctorInjection();

        // 2. إنشاء modal تعديل المريض
        injectEditPatientModal();

        // 3. إضافة زر التعديل في البروفايل
        injectEditBtnInProfile();

        // 4. إصلاح offline sync
        fixOfflineSyncForDoctors();

        // 5. بعد 2 ثانية، لو الـ dbInsert اتبدّل تاني (من offline patch مثلاً) → أعد inject
        setTimeout(() => {
            if (!window._dbInsertDocPatched) {
                fixDoctorInjection();
            }
        }, 2000);

        // 6. لو اتفتح بروفايل مريض حاليًا، أضف الزر
        if (window.currentProfilePatientId) {
            setTimeout(() => addEditBtnToProfile(window.currentProfilePatientId), 500);
        }

        // 7. تصحيح العمولات المحسوبة سابقاً لعمليات الزراعة بعد فتح قاعدة البيانات
        setTimeout(repairImplantDoctorCommissions, 1500);
        window.repairImplantDoctorCommissions = repairImplantDoctorCommissions;

        console.log('[DoctorAndPatientFix] ✅ All fixes applied');
    }

    if (document.readyState !== 'loading') {
        setTimeout(init, 200);
    } else {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 200));
    }

})();
