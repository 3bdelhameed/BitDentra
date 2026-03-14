// ══════════════════════════════════════════════════════════════════
//  patient_child_feature.js  v1.0
//  - حفظ حالة (طفل/بالغ) عند إضافة المريض
//  - عرض الحالة في بروفايل المريض
//  - إمكانية تعديل الحالة من نافذة التعديل
// ══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── 1. حفظ الحالة عند الإضافة (Patch dbInsert) ──────────────────
    const _origInsert = window.dbInsert;
    if (_origInsert) {
        window.dbInsert = async function (table, data) {
            if (table === 'patients') {
                const cb = document.getElementById('patientIsChild');
                if (cb) {
                    // إضافة قيمة is_child للبيانات المرسلة لقاعدة البيانات
                    data.is_child = cb.checked;
                }
            }
            return _origInsert.apply(this, arguments);
        };
    }

    // ── 2. حفظ الحالة عند التعديل (Patch dbUpdate) ──────────────────
    const _origUpdate = window.dbUpdate;
    if (_origUpdate) {
        window.dbUpdate = async function (table, id, data) {
            if (table === 'patients') {
                const editCb = document.getElementById('editPatientIsChild');
                // نتأكد أن نافذة التعديل هي المفتوحة لكي لا نعدل بالخطأ من مكان آخر
                if (editCb && document.getElementById('editPatientModal')?.classList.contains('open')) {
                    data.is_child = editCb.checked;
                }
            }
            return _origUpdate.apply(this, arguments);
        };
    }

    // ── 3. حقن زر التعديل في نافذة تعديل المريض ──────────────────────
    function injectEditToggle() {
        const editForm = document.getElementById('editPatientForm');
        if (!editForm) return;

        if (document.getElementById('editIsChildContainer')) return; // تم الحقن مسبقاً

        const submitBtn = editForm.querySelector('button[type="submit"]');
        if (!submitBtn) return;

        const div = document.createElement('div');
        div.id = 'editIsChildContainer';
        div.className = 'col-span-1 md:col-span-2 mb-4';
        div.innerHTML = `
            <label class="flex items-center gap-3 cursor-pointer p-3 border-2 border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <input type="checkbox" id="editPatientIsChild" class="w-5 h-5 text-blue-600 rounded cursor-pointer">
                <span class="font-bold text-gray-700">تصنيف المريض كـ (طفل) 👶</span>
            </label>
        `;
        // إضافته قبل زر الحفظ
        editForm.insertBefore(div, submitBtn.parentElement || submitBtn);
    }

    // ── 4. عرض الحالة في البروفايل وتحديث نافذة التعديل ──────────────
    const _origOpenProfile = window.openPatientProfile;
    if (_origOpenProfile) {
        window.openPatientProfile = async function (patientId) {
            // فتح البروفايل كالمعتاد
            const res = await _origOpenProfile.apply(this, arguments);

            // جلب بيانات المريض لمعرفة هل هو طفل أم لا
            let p = null;
            try {
                const all = await window.dbGetAll('patients');
                p = all.find(x => String(x.id) === String(patientId));
            } catch (e) { console.error(e); }

            if (p) {
                // إضافة الشارة (Badge) بجوار اسم المريض
                const nameHeader = document.getElementById('profilePatientName');
                if (nameHeader) {
                    let badge = document.getElementById('profileChildBadge');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.id = 'profileChildBadge';
                        // لضبط المسافة بشكل صحيح بجوار الاسم
                        badge.style.marginLeft = '12px';
                        badge.style.marginRight = '12px'; 
                        nameHeader.appendChild(badge);
                    }

                    const isChild = !!(p.is_child === true || String(p.is_child) === 'true');

                    if (isChild) {
                        badge.innerHTML = '<i class="fa-solid fa-child text-blue-600 mr-1"></i> طفل';
                        badge.className = 'text-xs px-3 py-1.5 rounded-full font-bold bg-blue-100 text-blue-700 align-middle inline-flex items-center shadow-sm';
                    } else {
                        badge.innerHTML = '<i class="fa-solid fa-person text-gray-600 mr-1"></i> بالغ';
                        badge.className = 'text-xs px-3 py-1.5 rounded-full font-bold bg-gray-100 text-gray-600 align-middle inline-flex items-center shadow-sm';
                    }
                }

                // تجهيز قيمة الـ Checkbox في نافذة التعديل لو تم فتحها
                setTimeout(() => {
                    const editCb = document.getElementById('editPatientIsChild');
                    if (editCb) {
                        editCb.checked = !!(p.is_child === true || String(p.is_child) === 'true');
                    }
                }, 500);
            }
            return res;
        };
    }

    // ── مراقبة ظهور نافذة التعديل لحقن الـ Checkbox ────────────────
    const observer = new MutationObserver(() => {
        if (document.getElementById('editPatientForm') && !document.getElementById('editIsChildContainer')) {
            injectEditToggle();
        }
    });
    
    // الانتظار حتى تحميل الصفحة لبدء المراقبة
    window.addEventListener('load', () => {
        observer.observe(document.body, { childList: true, subtree: true });
    });

    console.log('[PatientChildFeature] ✅ Loaded successfully');

})();