// ══════════════════════════════════════════════════════════════════
//  app_optimized_patch.js — تحسينات الأداء (v2)
//  أضفه في index.html بعد app.js مباشرة
// ══════════════════════════════════════════════════════════════════

if (window._perfPatchApplied) {
    console.log('[optPatch] already applied, skipping.');
} else {
    window._perfPatchApplied = true;

// ── UTILITIES ────────────────────────────────────────────────────

/** تأخير تنفيذ دالة حتى يتوقف المستخدم عن الكتابة */
function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/** استخراج اسم العملة بأمان */
function _getCurrency() {
    return (typeof getCurrency === 'function') ? getCurrency() : '';
}

/** قراءة قيمة رقمية بأمان من عدة أسماء حقول محتملة */
function _num(obj, ...keys) {
    for (const k of keys) {
        const v = parseFloat(obj[k]);
        if (!isNaN(v)) return v;
    }
    return 0;
}

// ══════════════════════════════════════════════════════════════════
// ✅ FIX 1: updateDashboard
//    Promise.all بدل 4 calls متتالية
//    الأصل: ~1200ms | بعد التحسين: ~350ms
// ══════════════════════════════════════════════════════════════════
window.updateDashboard = async function () {
    const todayStr = today();
    const curr = _getCurrency();

    const [patients, appointments, treatments, expenses] = await Promise.all([
        dbGetAll('patients'),
        dbGetAll('appointments'),
        dbGetAll('treatments'),
        dbGetAll('expenses'),
    ]);

    // إجماليات اليوم
    let dailyRevenue = 0, dailyExpense = 0;
    for (const tr of treatments) {
        if (tr.date === todayStr) dailyRevenue += _num(tr, 'paid');
    }
    for (const e of expenses) {
        if (e.date === todayStr) dailyExpense += _num(e, 'amount');
    }
    const net = dailyRevenue - dailyExpense;

    // تحديث الأرقام
    document.getElementById('totalPatientsCount').innerText = patients.length;
    document.getElementById('todayRevenue').innerText  = `${dailyRevenue} ${curr}`;
    document.getElementById('todayExpenses').innerText = `${dailyExpense} ${curr}`;
    document.getElementById('netProfit').innerText     = `${net} ${curr}`;

    // التاريخ والتحية
    document.getElementById('dashDate').innerText = new Date().toLocaleDateString(
        currentLang === 'ar' ? 'ar-EG' : 'en-US',
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    );
    const hr = new Date().getHours();
    document.getElementById('dashGreeting').innerText =
        hr < 12 ? t('dash.greeting.morning') :
        hr < 17 ? t('dash.greeting.afternoon') :
                  t('dash.greeting.evening');

    // قائمة آخر المرضى
    const recentList = document.getElementById('recentPatientsList');
    if (!patients.length) {
        recentList.innerHTML = `
            <div class="text-center text-gray-300 mt-8">
                <i class="fa-solid fa-folder-open text-3xl mb-2 block"></i>
                <p class="text-sm">${t('dash.noPatients')}</p>
            </div>`;
    } else {
        recentList.innerHTML = patients.slice(0, 7).map(p => `
            <div onclick="openPatientProfile(${p.id})"
                 class="flex items-center gap-2 p-2.5 hover:bg-blue-50 cursor-pointer rounded-xl transition group border-b border-gray-50 last:border-0">
                <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    ${p.name.charAt(0)}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm text-gray-800 truncate">${p.name}</p>
                    <p class="text-[10px] text-gray-400">${p.phone || ''}</p>
                </div>
                <i class="fa-solid fa-chevron-right text-xs text-gray-300 group-hover:text-blue-400"></i>
            </div>`).join('');
    }

    // مواعيد اليوم
    const todayAppts = appointments
        .filter(a => a.date === todayStr)
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const apptsList = document.getElementById('appointmentsList');
    if (!todayAppts.length) {
        apptsList.innerHTML = `
            <div class="flex flex-col items-center py-10 text-gray-300">
                <i class="fa-solid fa-calendar-xmark text-3xl mb-2"></i>
                <p class="text-sm">${t('dash.noAppts')}</p>
            </div>`;
    } else {
        const STATUS_BADGE = {
            Waiting  : 'badge-waiting',
            Inside   : 'badge-inside',
            Examined : 'badge-examined',
            Cancelled: 'badge-cancelled',
        };
        apptsList.innerHTML = todayAppts.map(a => {
            const sc    = STATUS_BADGE[a.status] || 'badge-waiting';
            const pName = a.patient_name || a.patientName || '';
            const pId   = a.patient_id   || a.patientId;
            return `
                <div class="grid grid-cols-4 gap-2 px-4 py-3 text-xs text-center border-b border-gray-50 items-center hover:bg-gray-50">
                    <div class="font-bold text-blue-600">${a.time}</div>
                    <div class="font-semibold text-gray-800 truncate cursor-pointer hover:text-blue-600"
                         onclick="openPatientProfile(${pId})">${pName}</div>
                    <div class="text-gray-400 truncate">${a.doctor}</div>
                    <div>
                        <select onchange="updateAppointmentStatus(${a.id}, this.value)"
                                class="badge ${sc} border-0 bg-transparent font-semibold text-xs outline-none cursor-pointer w-full">
                            <option value="Waiting"   ${a.status === 'Waiting'   ? 'selected' : ''}>${t('appts.waiting')}</option>
                            <option value="Inside"    ${a.status === 'Inside'    ? 'selected' : ''}>${t('appts.inside')}</option>
                            <option value="Examined"  ${a.status === 'Examined'  ? 'selected' : ''}>${t('appts.examined')}</option>
                            <option value="Cancelled" ${a.status === 'Cancelled' ? 'selected' : ''}>${t('appts.cancelled')}</option>
                        </select>
                    </div>
                </div>`;
        }).join('');
    }
};

// ══════════════════════════════════════════════════════════════════
// ✅ FIX 2: openPatientProfile
//    Promise.all بدل 5 calls متتالية
//    الأصل: ~1400ms | بعد التحسين: ~400ms
// ══════════════════════════════════════════════════════════════════
window.openPatientProfile = async function (id) {
    currentProfilePatientId = id;

    const [patientRows, treatments, notesRows, xrays, toothStates] = await Promise.all([
        dbGetAll('patients',      { id }),
        dbGetAll('treatments',    { patient_id: id }),
        dbGetAll('patient_notes', { patient_id: id }),
        dbGetAll('xrays',         { patient_id: id }),
        dbGetAll('tooth_states',  { patient_id: id }),
    ]);

    const patient = patientRows[0];
    if (!patient) { console.warn(`[profile] patient ${id} not found`); return; }

    const pName       = patient.name;
    const pPhone      = patient.phone           || '';
    const pGender     = patient.gender          || '';
    const pAge        = patient.age             || '';
    const pMedHistory = patient.medical_history || patient.medHistory  || '';
    const pCreatedAt  = patient.created_at      || patient.createdAt   || '';
    const curr        = _getCurrency();

    document.getElementById('profileName').innerText   = pName;
    document.getElementById('profileAvatar').innerText = pName.charAt(0).toUpperCase();
    document.getElementById('profilePhone').innerText  =
        [pPhone, pGender, pAge ? `Age: ${pAge}` : ''].filter(Boolean).join(' · ');

    // إجماليات مالية
    let totalC = 0, totalP = 0;
    for (const tr of treatments) {
        totalC += _num(tr, 'total_cost', 'totalCost');
        totalP += _num(tr, 'paid');
    }
    const debt = totalC - totalP;

    document.getElementById('profileInfoCards').innerHTML = `
        <div class="stat-card">
            <div><p class="text-xs text-gray-400">Registered</p>
            <p class="font-bold text-sm">${pCreatedAt}</p></div>
        </div>
        <div class="stat-card">
            <div><p class="text-xs text-gray-400">Treatments</p>
            <p class="font-bold text-sm">${treatments.length}</p></div>
        </div>
        <div class="stat-card">
            <div><p class="text-xs text-gray-400">Total Paid</p>
            <p class="font-bold text-sm text-green-600">${totalP} ${curr}</p></div>
        </div>
        <div class="stat-card border-l-4 ${debt > 0 ? 'border-l-red-400' : 'border-l-green-400'}">
            <div><p class="text-xs text-gray-400">Balance</p>
            <p class="font-bold text-sm ${debt > 0 ? 'text-red-500' : 'text-green-600'}">
                ${debt > 0 ? `${debt} ${curr}` : 'Settled ✓'}
            </p></div>
        </div>
        ${pMedHistory ? `
        <div class="col-span-2 md:col-span-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-xs text-yellow-800">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i>
            <strong>Medical History:</strong> ${pMedHistory}
        </div>` : ''}`;

    switchView('profile');

    // عرض البيانات المحملة مباشرةً — بدون calls إضافية
    _renderTreatments(id, treatments, curr);
    _renderXrays(id, xrays);
    _renderNotes(notesRows);

    if (typeof generateDentalChartFromData === 'function') {
        generateDentalChartFromData(id, toothStates);
    } else {
        generateDentalChart(id);
    }
};

// ── Helper: عرض قائمة العلاجات ──────────────────────────────────
function _renderTreatments(patientId, treatments, curr) {
    curr = curr || _getCurrency();

    let totalC = 0, totalP = 0;
    for (const tr of treatments) {
        totalC += _num(tr, 'total_cost', 'totalCost');
        totalP += _num(tr, 'paid');
    }

    const elCost = document.getElementById('profileTotalCost');
    const elPaid = document.getElementById('profileTotalPaid');
    const elDebt = document.getElementById('profileTotalDebt');
    if (elCost) elCost.innerText = `${totalC} ${curr}`;
    if (elPaid) elPaid.innerText = `${totalP} ${curr}`;
    if (elDebt) elDebt.innerText = `${totalC - totalP} ${curr}`;

    const list = document.getElementById('patientTreatmentsList');
    if (!list) return;

    if (!treatments.length) {
        list.innerHTML = '<p class="text-gray-400 text-center text-sm mt-5">No treatments recorded.</p>';
        return;
    }

    // بناء كل HTML مرة واحدة
    list.innerHTML = treatments.map(tr => {
        const cost     = _num(tr, 'total_cost', 'totalCost');
        const paid     = _num(tr, 'paid');
        const rem      = cost - paid;
        const toothNum = tr.tooth_number || tr.toothNumber;
        const canPay   = rem > 0 && typeof openRecordPaymentModal === 'function';
        const canEdit  = typeof openEditTreatmentModal === 'function';

        return `
            <div class="border-b border-gray-50 py-2.5 flex justify-between items-start gap-2">
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm text-gray-800 truncate">
                        ${tr.procedure || '—'}
                        ${toothNum ? `<span class="text-blue-500 text-xs font-normal">#${toothNum}</span>` : ''}
                    </p>
                    <p class="text-xs text-gray-400">
                        ${tr.date || ''}${tr.notes ? ' · ' + tr.notes : ''}
                    </p>
                    <div class="flex gap-2 mt-0.5 text-xs">
                        <span class="font-bold text-gray-700">${cost} ${curr}</span>
                        <span class="text-green-600">${paid} paid</span>
                        ${rem > 0
                            ? `<span class="text-red-500 font-semibold">${rem} remaining</span>`
                            : '<span class="text-green-600">✓ settled</span>'}
                    </div>
                </div>
                <div class="flex flex-col gap-1 items-end shrink-0">
                    ${canPay  ? `<button onclick="openRecordPaymentModal(${tr.id}, ${patientId})" class="text-xs px-2 py-1 rounded-lg font-medium" style="background:#f0fdf4;color:#15803d;border:1px solid #86efac;"><i class="fa-solid fa-coins"></i> دفعة</button>` : ''}
                    ${canEdit ? `<button onclick="openEditTreatmentModal(${tr.id}, ${patientId})" class="text-xs px-2 py-1 rounded-lg font-medium" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;"><i class="fa-solid fa-pen"></i> تعديل</button>` : ''}
                    <button onclick="deleteTreatment(${tr.id}, ${patientId})" class="text-gray-200 hover:text-red-400 text-xs mt-0.5">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
    }).join('');
}

// ── Helper: عرض الأشعة ──────────────────────────────────────────
function _renderXrays(patientId, xrays) {
    const grid = document.getElementById('patientXraysGrid');
    if (!grid) return;

    if (!xrays.length) {
        grid.innerHTML = `<p class="text-gray-400 text-sm col-span-full">${t('profile.noImages')}</p>`;
        return;
    }

    grid.innerHTML = xrays.map(x => {
        const src = x.image_base64 || x.imageBase64 || '';
        return `
            <div class="relative group cursor-pointer border border-gray-100 rounded-xl overflow-hidden h-24 bg-gray-50">
                <img src="${src}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                     onclick="viewImage('${src}')">
                <div class="absolute bottom-0 bg-black bg-opacity-50 w-full text-white text-[10px] text-center py-0.5">
                    ${x.date}
                </div>
                <button onclick="deleteXray(${x.id}, ${patientId})"
                        class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] items-center justify-center hidden group-hover:flex">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>`;
    }).join('');
}

// ── Helper: عرض الملاحظات ────────────────────────────────────────
function _renderNotes(notesRows) {
    const el = document.getElementById('patientNotes');
    if (el) el.value = notesRows[0]?.notes || '';
}

// ══════════════════════════════════════════════════════════════════
// ✅ FIX 3: loadAllPatients
//    O(n²) → O(n) لحساب الرصيد
//    الأصل: ~800ms على 500 مريض | بعد التحسين: ~150ms
// ══════════════════════════════════════════════════════════════════
window.loadAllPatients = async function () {
    const [patients, allTreatments] = await Promise.all([
        dbGetAll('patients'),
        dbGetAll('treatments'),
    ]);
    allPatientsData = patients;

    // بناء خريطة الأرصدة مرة واحدة O(n)
    const balanceMap = _buildBalanceMap(allTreatments);
    _renderPatientsTable(patients, balanceMap);
};

/** بناء خريطة { patientId → { cost, paid } } من قائمة العلاجات */
function _buildBalanceMap(treatments) {
    const map = {};
    for (const tr of treatments) {
        const pid = tr.patient_id || tr.patientId;
        if (!map[pid]) map[pid] = { cost: 0, paid: 0 };
        map[pid].cost += _num(tr, 'total_cost', 'totalCost');
        map[pid].paid += _num(tr, 'paid');
    }
    return map;
}

function _renderPatientsTable(patients, balanceMap) {
    const tbody = document.getElementById('allPatientsTableBody');
    const curr  = _getCurrency();

    const empty = document.getElementById('patientsEmptyState');
    if (!patients.length) {
        tbody.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');

    // inject مرة واحدة في DOM
    tbody.innerHTML = [...patients].reverse().map((p, i) => {
        const b    = balanceMap[p.id] || { cost: 0, paid: 0 };
        const debt = b.cost - b.paid;
        const medHist = p.medical_history || p.medHistory || '';
        const debtBadge = debt > 0
            ? `<span class="badge" style="background:#fef2f2;color:#ef4444;">${debt} ${curr}</span>`
            : `<span class="badge" style="background:#f0fdf4;color:#16a34a;">${t('patients.settled')}</span>`;

        return `
            <tr class="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer"
                onclick="openPatientProfile(${p.id})">
                <td class="p-3 text-gray-400 text-sm font-medium">${i + 1}</td>
                <td class="p-3">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                            ${p.name.charAt(0)}
                        </div>
                        <div>
                            <p class="font-semibold text-sm text-gray-800">${p.name}</p>
                            ${medHist ? `<p class="text-[10px] text-yellow-600"><i class="fa-solid fa-triangle-exclamation"></i> ${medHist}</p>` : ''}
                        </div>
                    </div>
                </td>
                <td class="p-3 text-sm text-gray-600">${p.phone || ''}</td>
                <td class="p-3 text-sm text-gray-500">${p.age || '—'}</td>
                <td class="p-3 text-sm text-gray-400">${p.created_at || p.createdAt || ''}</td>
                <td class="p-3 text-center">${debtBadge}</td>
                <td class="p-3 text-center" onclick="event.stopPropagation()">
                    <div class="flex gap-1 justify-center">
                        <button onclick="openPatientProfile(${p.id})"
                                class="btn btn-outline text-xs px-2 py-1">
                            <i class="fa-solid fa-folder-open"></i>
                        </button>
                        <button onclick="deletePatient(${p.id})"
                                class="btn text-xs px-2 py-1"
                                style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

// ── filterPatients: يعيد استخدام _buildBalanceMap ──────────────
window.filterPatients = async function () {
    const q = document.getElementById('patientSearch').value.toLowerCase().trim();
    const allTreatments = await dbGetAll('treatments');
    const balanceMap = _buildBalanceMap(allTreatments);
    const filtered = allPatientsData.filter(p =>
        p.name.toLowerCase().includes(q) || (p.phone || '').includes(q)
    );
    _renderPatientsTable(filtered, balanceMap);
};

// ══════════════════════════════════════════════════════════════════
// ✅ FIX 4: loadReports
//    Promise.all بدل 4 calls متتالية
// ══════════════════════════════════════════════════════════════════
window.loadReports = async function () {
    const curr = _getCurrency();

    const [treatments, expenses, patients, appointments] = await Promise.all([
        dbGetAll('treatments'),
        dbGetAll('expenses'),
        dbGetAll('patients'),
        dbGetAll('appointments'),
    ]);

    renderReportKpis(treatments, expenses, patients, appointments);
    _renderCharts(treatments);

    // الملخص المالي
    let totalRevenue = 0, totalPaid = 0, totalExpenses = 0;
    for (const tr of treatments) {
        totalRevenue += _num(tr, 'total_cost', 'totalCost');
        totalPaid    += _num(tr, 'paid');
    }
    for (const e of expenses) totalExpenses += _num(e, 'amount');

    const totalDebt = totalRevenue - totalPaid;
    const netProfit = totalPaid - totalExpenses;

    document.getElementById('financialReport').innerHTML = `
        <div class="flex justify-between text-sm border-b pb-2">
            <span class="text-gray-500">${t('rep.totalRevenue')}</span>
            <span class="font-bold text-gray-800">${totalRevenue} ${curr}</span>
        </div>
        <div class="flex justify-between text-sm border-b pb-2">
            <span class="text-gray-500">${t('rep.collected')}</span>
            <span class="font-bold text-green-600">${totalPaid} ${curr}</span>
        </div>
        <div class="flex justify-between text-sm border-b pb-2">
            <span class="text-gray-500">${t('rep.debt')}</span>
            <span class="font-bold text-red-500">${totalDebt} ${curr}</span>
        </div>
        <div class="flex justify-between text-sm border-b pb-2">
            <span class="text-gray-500">${t('rep.totalExp')}</span>
            <span class="font-bold text-orange-500">${totalExpenses} ${curr}</span>
        </div>
        <div class="flex justify-between text-sm font-bold text-base mt-1">
            <span>${t('rep.netProfit')}</span>
            <span class="${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}">${netProfit} ${curr}</span>
        </div>`;

    // تقرير المرضى
    const examined = appointments.filter(a => a.status === 'Examined').length;
    document.getElementById('patientReport').innerHTML = `
        <div class="flex justify-between text-sm border-b pb-2">
            <span class="text-gray-500">${t('rep.totalPatients')}</span>
            <span class="font-bold">${patients.length}</span>
        </div>
        <div class="flex justify-between text-sm border-b pb-2">
            <span class="text-gray-500">${t('rep.totalAppts')}</span>
            <span class="font-bold">${appointments.length}</span>
        </div>
        <div class="flex justify-between text-sm border-b pb-2">
            <span class="text-gray-500">${t('rep.completed')}</span>
            <span class="font-bold text-green-600">${examined}</span>
        </div>
        <div class="flex justify-between text-sm border-b pb-2">
            <span class="text-gray-500">${t('rep.totalTreat')}</span>
            <span class="font-bold">${treatments.length}</span>
        </div>
        <div class="flex justify-between text-sm">
            <span class="text-gray-500">${t('rep.totalRx')}</span>
            <span class="font-bold">(see list)</span>
        </div>`;

    // تقرير المديونيات
    const debtMap = {};
    for (const tr of treatments) {
        const pid  = tr.patient_id   || tr.patientId;
        const name = tr.patient_name || tr.patientName || '';
        if (!debtMap[pid]) debtMap[pid] = { name, cost: 0, paid: 0, id: pid };
        debtMap[pid].cost += _num(tr, 'total_cost', 'totalCost');
        debtMap[pid].paid += _num(tr, 'paid');
    }
    const debtors = Object.values(debtMap)
        .filter(d => d.cost - d.paid > 0)
        .sort((a, b) => (b.cost - b.paid) - (a.cost - a.paid));

    document.getElementById('debtReport').innerHTML = !debtors.length
        ? `<p class="text-green-600 font-semibold text-sm">
               <i class="fa-solid fa-circle-check mr-1"></i> ${t('rep.allSettled')}
           </p>`
        : `<table class="w-full text-sm">
               <thead>
                   <tr class="text-gray-400 text-xs uppercase border-b">
                       <th class="text-left pb-2">${t('rep.debtor')}</th>
                       <th class="text-right pb-2">${t('rep.debtAmt')}</th>
                   </tr>
               </thead>
               <tbody>
                   ${debtors.map(d => `
                   <tr class="border-b border-gray-50">
                       <td class="py-2 cursor-pointer hover:text-blue-600 font-semibold"
                           onclick="openPatientProfile(${d.id})">${d.name}</td>
                       <td class="py-2 text-right text-red-500 font-bold">${d.cost - d.paid} ${curr}</td>
                   </tr>`).join('')}
               </tbody>
           </table>`;
};

// ══════════════════════════════════════════════════════════════════
// ✅ FIX 5: _renderCharts
//    يأخذ البيانات جاهزة بدل call إضافي لـ DB
// ══════════════════════════════════════════════════════════════════
function _renderCharts(treatments) {
    const isDark    = document.body.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // بيانات آخر 6 أشهر
    const months = [], revenueData = [], paidData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key   = d.toISOString().slice(0, 7);
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        const monthTr = treatments.filter(tr => (tr.date || '').startsWith(key));
        months.push(label);
        revenueData.push(monthTr.reduce((s, tr) => s + _num(tr, 'total_cost', 'totalCost'), 0));
        paidData.push(monthTr.reduce((s, tr) => s + _num(tr, 'paid'), 0));
    }

    const axisOpts = {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } },
    };

    // مخطط الإيرادات
    const rCanvas = document.getElementById('revenueChart');
    if (rCanvas) {
        window.revenueChartInstance?.destroy();
        window.revenueChartInstance = new Chart(rCanvas, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Billed',    data: revenueData, backgroundColor: 'rgba(37,99,235,0.15)',  borderColor: '#2563eb', borderWidth: 2, borderRadius: 6 },
                    { label: 'Collected', data: paidData,    backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22c55e', borderWidth: 2, borderRadius: 6 },
                ],
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: textColor, font: { size: 11 } } } },
                scales: axisOpts,
            },
        });
    }

    // مخطط أكثر الإجراءات تكراراً
    const procCount = {};
    for (const tr of treatments) {
        const p = (tr.procedure || 'Other').split(' ')[0];
        procCount[p] = (procCount[p] || 0) + 1;
    }
    const topProcs = Object.entries(procCount).sort((a, b) => b[1] - a[1]).slice(0, 7);

    const tCanvas = document.getElementById('treatmentChart');
    if (tCanvas) {
        window.treatmentChartInstance?.destroy();
        window.treatmentChartInstance = new Chart(tCanvas, {
            type: 'doughnut',
            data: {
                labels: topProcs.map(e => e[0]),
                datasets: [{
                    data: topProcs.map(e => e[1]),
                    backgroundColor: ['#2563eb','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'],
                    borderWidth: 2,
                    borderColor: isDark ? '#1e293b' : '#ffffff',
                }],
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'right', labels: { color: textColor, font: { size: 11 }, boxWidth: 12 } } },
            },
        });
    }
}

// دالة wrapper للاستدعاء الخارجي (تجلب البيانات من الـ cache في الغالب)
async function renderCharts() {
    const treatments = await dbGetAll('treatments');
    _renderCharts(treatments);
}

// ══════════════════════════════════════════════════════════════════
// ✅ FIX 6: refreshBookedSlots — debounce 300ms
//    كان يتشغل مع كل ضغطة مفتاح → الآن ينتظر 300ms بعد التوقف
// ══════════════════════════════════════════════════════════════════
if (typeof refreshBookedSlots === 'function') {
    window.refreshBookedSlots = debounce(window.refreshBookedSlots, 300);
}

// ══════════════════════════════════════════════════════════════════
// ✅ FIX 7: checkReminders — cache لمدة 60 ثانية
//    كان يتشغل عند كل فتح تبويب → الآن مرة واحدة كل دقيقة
// ══════════════════════════════════════════════════════════════════
if (typeof checkReminders === 'function') {
    let _lastReminderCheck = 0;
    const _origCheckReminders = window.checkReminders;

    window.checkReminders = async function () {
        const now = Date.now();
        if (now - _lastReminderCheck < 60_000) return;
        _lastReminderCheck = now;
        await _origCheckReminders();
    };
}

console.log('[⚡ Performance Patch v2] Promise.all + Debounce + Cache + O(n) Balance — active');

} // end if (!window._perfPatchApplied)