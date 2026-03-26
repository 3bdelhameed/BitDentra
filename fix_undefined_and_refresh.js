// ══════════════════════════════════════════════════════════════════
//  fix_undefined_and_refresh.js
//  FIX 1: patient name showing "undefined" in Today's Appointments
//  FIX 2: Refresh button → hard reload + cloud sync
// ══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ════════════════════════════════════════════════════════════
    //  HELPER: استخرج اسم المريض بأمان من أي object
    // ════════════════════════════════════════════════════════════
    function getPatientName(obj) {
        const name = obj.patient_name || obj.patientName || obj.name || '';
        return (name && name !== 'undefined') ? name : '—';
    }

    function getPatientId(obj) {
        return obj.patient_id || obj.patientId || obj.id || '';
    }

    // ════════════════════════════════════════════════════════════
    //  FIX 1: patch updateDashboard — يصلح عرض اسم المريض
    //  المشكلة: appointment محفوظ بـ patientName لكن الكود بيدور
    //           على patient_name فقط في بعض الإصدارات
    // ════════════════════════════════════════════════════════════
    function patchUpdateDashboard() {
        const _orig = window.updateDashboard;
        if (!_orig || _orig._namePatchApplied) return;

        window.updateDashboard = async function () {
            // شغّل الأصلي
            await _orig.apply(this, arguments);

            // بعد ما الأصلي يرسم، صلّح أي "undefined" في القائمة
            fixUndefinedInDOM();
        };
        window.updateDashboard._namePatchApplied = true;
        console.log('[FixPatch] ✓ updateDashboard patched for undefined names');
    }

    // ════════════════════════════════════════════════════════════
    //  FIX 1b: Override buildAppointmentRow في الـ dashboard
    //  نعمل override كامل لـ updateDashboard عشان نضمن الاسم صح
    // ════════════════════════════════════════════════════════════
    function overrideUpdateDashboard() {
        // انتظر الدوال المطلوبة
        if (!window.dbGetAll || !window.today || !window.t || !window.getCurrency) {
            setTimeout(overrideUpdateDashboard, 200);
            return;
        }

        window.updateDashboard = async function () {
            const todayStr = today();
            const curr = getCurrency();

            const [patients, appointments, treatments, expenses] = await Promise.all([
                dbGetAll('patients'),
                dbGetAll('appointments'),
                dbGetAll('treatments'),
                dbGetAll('expenses'),
            ]);

            // Cache patients for name lookup
            const patientMap = {};
            patients.forEach(p => { patientMap[p.id] = p.name; });

            // KPIs
            const totalEl = document.getElementById('totalPatientsCount');
            if (totalEl) totalEl.innerText = patients.length;

            let dailyRevenue = 0, dailyExpense = 0;
            treatments.forEach(tr => {
                if (tr.date === todayStr) dailyRevenue += parseFloat(tr.paid) || 0;
            });
            expenses.forEach(e => {
                if (e.date === todayStr) dailyExpense += parseFloat(e.amount) || 0;
            });
            const net = dailyRevenue - dailyExpense;

            const revEl  = document.getElementById('todayRevenue');
            const expEl  = document.getElementById('todayExpenses');
            const netEl  = document.getElementById('netProfit');
            const dateEl = document.getElementById('dashDate');
            const greetEl= document.getElementById('dashGreeting');

            if (revEl)  revEl.innerText  = `${dailyRevenue} ${curr}`;
            if (expEl)  expEl.innerText  = `${dailyExpense} ${curr}`;
            if (netEl)  netEl.innerText  = `${net} ${curr}`;

            if (dateEl) dateEl.innerText = new Date().toLocaleDateString(
                typeof currentLang !== 'undefined' && currentLang === 'ar' ? 'ar-EG' : 'en-US',
                { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            );
            if (greetEl) {
                const hr = new Date().getHours();
                greetEl.innerText = hr < 12 ? t('dash.greeting.morning') :
                                    hr < 17 ? t('dash.greeting.afternoon') :
                                              t('dash.greeting.evening');
            }

            // Recent patients
            const recentList = document.getElementById('recentPatientsList');
            if (recentList) {
                if (patients.length === 0) {
                    recentList.innerHTML = `<div class="text-center text-gray-300 mt-8">
                        <i class="fa-solid fa-folder-open text-3xl mb-2 block"></i>
                        <p class="text-sm">${t('dash.noPatients')}</p>
                    </div>`;
                } else {
                    recentList.innerHTML = patients.slice(0, 7).map(p => `
                        <div onclick="openPatientProfile(${p.id})" class="flex items-center gap-2 p-2.5 hover:bg-blue-50 cursor-pointer rounded-xl transition group border-b border-gray-50 last:border-0">
                            <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">${(p.name || '?').charAt(0)}</div>
                            <div class="flex-1 min-w-0">
                                <p class="font-semibold text-sm text-gray-800 truncate">${p.name || '—'}</p>
                                <p class="text-[10px] text-gray-400">${p.phone || ''}</p>
                            </div>
                            <i class="fa-solid fa-chevron-right text-xs text-gray-300 group-hover:text-blue-400"></i>
                        </div>`).join('');
                }
            }

            // Today's appointments
            const todayAppts = appointments
                .filter(a => a.date === todayStr)
                .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

            const apptsList = document.getElementById('appointmentsList');
            if (!apptsList) return;

            if (todayAppts.length === 0) {
                apptsList.innerHTML = `<div class="flex flex-col items-center py-10 text-gray-300">
                    <i class="fa-solid fa-calendar-xmark text-3xl mb-2"></i>
                    <p class="text-sm">${t('dash.noAppts')}</p>
                </div>`;
                return;
            }

            const statusColors = {
                Waiting: 'badge-waiting', Inside: 'badge-inside',
                Examined: 'badge-examined', Cancelled: 'badge-cancelled'
            };

            apptsList.innerHTML = todayAppts.map(a => {
                const sc = statusColors[a.status] || 'badge-waiting';

                // ✅ FIX: جيب الاسم بكل الطرق الممكنة
                const pid = a.patient_id || a.patientId;
                let pName = a.patient_name || a.patientName;

                // لو الاسم فاضي أو undefined → دور في patientMap
                if (!pName || pName === 'undefined' || pName === 'null') {
                    pName = (pid && patientMap[pid]) ? patientMap[pid] : '—';
                }

                return `<div class="grid grid-cols-4 gap-2 px-4 py-3 text-xs text-center border-b border-gray-50 items-center hover:bg-gray-50">
                    <div class="font-bold text-blue-600">${a.time || '--:--'}</div>
                    <div class="font-semibold text-gray-800 truncate cursor-pointer hover:text-blue-600" onclick="openPatientProfile(${pid})">${pName}</div>
                    <div class="text-gray-400 truncate">${a.doctor || '—'}</div>
                    <div>
                        <select onchange="updateAppointmentStatus(${a.id}, this.value)" class="badge ${sc} border-0 bg-transparent font-semibold text-xs outline-none cursor-pointer w-full">
                            <option value="Waiting"   ${a.status === 'Waiting'   ? 'selected' : ''}>${t('appts.waiting')}</option>
                            <option value="Inside"    ${a.status === 'Inside'    ? 'selected' : ''}>${t('appts.inside')}</option>
                            <option value="Examined"  ${a.status === 'Examined'  ? 'selected' : ''}>${t('appts.examined')}</option>
                            <option value="Cancelled" ${a.status === 'Cancelled' ? 'selected' : ''}>${t('appts.cancelled')}</option>
                        </select>
                    </div>
                </div>`;
            }).join('');
        };

        console.log('[FixPatch] ✓ updateDashboard fully overridden — undefined names fixed');
    }

    // ════════════════════════════════════════════════════════════
    //  FIX 1c: مسح أي "undefined" موجود في الـ DOM
    // ════════════════════════════════════════════════════════════
    function fixUndefinedInDOM() {
        const apptsList = document.getElementById('appointmentsList');
        if (!apptsList) return;
        apptsList.querySelectorAll('div').forEach(el => {
            if (el.textContent.trim() === 'undefined') {
                el.textContent = '—';
            }
        });
    }

    // ════════════════════════════════════════════════════════════
    //  FIX 2: Refresh Button — Hard Reload + Cloud Sync
    // ════════════════════════════════════════════════════════════
    function injectRefreshButton() {
        // لو في زرار موجود خليه
        if (document.getElementById('_hardRefreshBtn')) return;

        // دور على مكان مناسب في الـ header
        const header = document.querySelector('header');
        if (!header) return;

        // ابنِ الزرار
        const btn = document.createElement('button');
        btn.id = '_hardRefreshBtn';
        btn.title = 'Refresh & Sync';
        btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
        btn.className = 'btn btn-outline text-xs px-2.5 py-1.5';
        btn.style.cssText = 'transition:transform 0.4s;';

        btn.addEventListener('click', async function () {
            // Animation
            btn.style.transform = 'rotate(360deg)';
            btn.disabled = true;

            try {
                // 1. امسح الـ Service Worker cache القديم
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                    console.log('[Refresh] Caches cleared');
                }

                // 2. لو في syncNow → زامن أولاً
                if (typeof window.syncNow === 'function') {
                    await window.syncNow();
                    console.log('[Refresh] Sync done');
                }

                // 3. Hard reload (bypass cache)
                window.location.reload(true);

            } catch (e) {
                console.warn('[Refresh] Error:', e);
                window.location.reload(true);
            }
        });

        // ضع الزرار قبل زرار اللغة
        const langBtn = document.getElementById('langToggleBtn');
        if (langBtn && langBtn.parentNode) {
            langBtn.parentNode.insertBefore(btn, langBtn);
        } else {
            // fallback: ضيفه في أي مكان في الـ header
            const headerFlex = header.querySelector('.flex.items-center.gap-3:last-child');
            if (headerFlex) headerFlex.prepend(btn);
            else header.appendChild(btn);
        }

        console.log('[FixPatch] ✓ Refresh button injected');
    }

    // ════════════════════════════════════════════════════════════
    //  FIX 3: patch dbInsert عشان يحفظ patient_name صح
    //  لما بيتحفظ appointment ممكن patientName يتحفظ فارغ
    // ════════════════════════════════════════════════════════════
    function patchAppointmentInsert() {
        // انتظر dbInsert
        if (!window.dbInsert) { setTimeout(patchAppointmentInsert, 300); return; }
        if (window.dbInsert._apptNamePatchApplied) return;

        const _orig = window.dbInsert;
        window.dbInsert = async function (table, data) {
            // لو بنضيف appointment وفيه patient_id بس مش patient_name
            if (table === 'appointments') {
                let name = data.patient_name || data.patientName || '';
                if (!name || name === 'undefined') {
                    // دور في cache
                    const pid = data.patient_id || data.patientId;
                if (pid) {
                    const cached = window.cachedPatients || window.allPatientsData || [];
                    const found = cached.find(p => p.id == pid);
                    if (found) {
                        name = found.name || '';
                        data = { ...data, patient_name: name };
                    } else {
                        const searchInput = document.getElementById('appointmentPatientSearch');
                        const typedName = searchInput ? (searchInput.value || '').trim() : '';
                        if (typedName) data = { ...data, patient_name: typedName };
                    }
                }
            }
            }
            return _orig.call(this, table, data);
        };
        window.dbInsert._apptNamePatchApplied = true;
        console.log('[FixPatch] ✓ dbInsert patched for appointment names');
    }

    // ════════════════════════════════════════════════════════════
    //  INIT
    // ════════════════════════════════════════════════════════════
    function init() {
        overrideUpdateDashboard();
        patchAppointmentInsert();
        injectRefreshButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }

    console.log('[FixPatch] fix_undefined_and_refresh.js loaded ✓');
})();
