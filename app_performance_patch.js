// ══════════════════════════════════════════════════════════════════
//  performance_patch.js  —  تحسينات الأداء لـ BitDentra
//  أضفه بعد app.js في index.html
//  <script src="performance_patch.js"></script>
// ══════════════════════════════════════════════════════════════════

// ── 0. PATCH GUARD ────────────────────────────────────────────────
// prevent this patch being applied twice in case the file is accidentally loaded
if (window._perfPatchApplied) {
    console.warn('[perfPatch] already applied, skipping second load');
} else {
window._perfPatchApplied = true;

// helper for one‑time global listeners (avoids duplicate handlers)
function onceListener(type, id, handler) {
    window._perflisteners = window._perflisteners || {};
    if (window._perflisteners[id]) return;
    window._perflisteners[id] = true;
    window.addEventListener(type, handler);
}

// ── 1. DEBOUNCE UTILITY ──────────────────────────────────────────
function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ── 2. SIMPLE CACHE ──────────────────────────────────────────────
const _cache = {};
const _cacheExpiry = {};

function cacheSet(key, value, ttlMs = 30000) {
    _cache[key] = value;
    _cacheExpiry[key] = Date.now() + ttlMs;
}

function cacheGet(key) {
    if (_cache[key] && Date.now() < _cacheExpiry[key]) return _cache[key];
    return null;
}

function cacheClear(key) {
    delete _cache[key];
    delete _cacheExpiry[key];
}

function cacheClearAll() {
    Object.keys(_cache).forEach(k => { delete _cache[k]; delete _cacheExpiry[k]; });
}

// ── 2a. dbGetAllCached ───────────────────────────────────────────
// wrapper على dbGetAll بيستخدم الـ cache
async function dbGetAllCached(table, filter = {}, ttlMs = 30000) {
    const key = table + JSON.stringify(filter);
    const hit = cacheGet(key);
    if (hit) return hit;
    const result = await dbGetAll(table, filter);
    cacheSet(key, result, ttlMs);
    return result;
}

// ── 3. OPTIMIZED updateDashboard ─────────────────────────────────
// الأصل: 4 calls متتالية → الجديد: Promise.all (كلهم مع بعض)
window.updateDashboard = async function() {
    const todayStr = today();
    const curr     = getCurrency();

    const [patients, appointments, treatments, expenses] = await Promise.all([
        dbGetAllCached('patients'),
        dbGetAllCached('appointments'),
        dbGetAllCached('treatments'),
        dbGetAllCached('expenses'),
    ]);

    document.getElementById('totalPatientsCount').innerText = patients.length;

    // Financials
    let dailyRevenue = 0, dailyExpense = 0;
    treatments.forEach(tr => { if (tr.date === todayStr) dailyRevenue += parseFloat(tr.paid) || 0; });
    expenses.forEach(e    => { if (e.date === todayStr)  dailyExpense += parseFloat(e.amount) || 0; });
    const net = dailyRevenue - dailyExpense;

    document.getElementById('todayRevenue').innerText  = `${dailyRevenue} ${curr}`;
    document.getElementById('todayExpenses').innerText = `${dailyExpense} ${curr}`;
    document.getElementById('netProfit').innerText     = `${net} ${curr}`;

    // Date & greeting
    document.getElementById('dashDate').innerText = new Date().toLocaleDateString(
        currentLang === 'ar' ? 'ar-EG' : 'en-US',
        { weekday:'long', year:'numeric', month:'long', day:'numeric' }
    );
    const hr = new Date().getHours();
    document.getElementById('dashGreeting').innerText =
        hr < 12 ? t('dash.greeting.morning') :
        hr < 17 ? t('dash.greeting.afternoon') :
                  t('dash.greeting.evening');

    // Recent patients (آخر 7)
    const recentList = document.getElementById('recentPatientsList');
    if (patients.length === 0) {
        recentList.innerHTML = `<div class="text-center text-gray-300 mt-8">
            <i class="fa-solid fa-folder-open text-3xl mb-2 block"></i>
            <p class="text-sm">${t('dash.noPatients')}</p>
        </div>`;
    } else {
        recentList.innerHTML = patients.slice(0, 7).map(p => `
            <div onclick="openPatientProfile(${p.id})" class="flex items-center gap-2 p-2.5 hover:bg-blue-50 cursor-pointer rounded-xl transition group border-b border-gray-50 last:border-0">
                <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">${p.name.charAt(0)}</div>
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm text-gray-800 truncate">${p.name}</p>
                    <p class="text-[10px] text-gray-400">${p.phone || ''}</p>
                </div>
                <i class="fa-solid fa-chevron-right text-xs text-gray-300 group-hover:text-blue-400"></i>
            </div>`).join('');
    }

    // Today's appointments
    const todayAppts = appointments
        .filter(a => a.date === todayStr)
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const apptsList = document.getElementById('appointmentsList');
    if (todayAppts.length === 0) {
        apptsList.innerHTML = `<div class="flex flex-col items-center py-10 text-gray-300">
            <i class="fa-solid fa-calendar-xmark text-3xl mb-2"></i>
            <p class="text-sm">${t('dash.noAppts')}</p>
        </div>`;
    } else {
        const statusColors = {
            Waiting:'badge-waiting', Inside:'badge-inside',
            Examined:'badge-examined', Cancelled:'badge-cancelled'
        };
        apptsList.innerHTML = todayAppts.map(a => {
            const sc    = statusColors[a.status] || 'badge-waiting';
            const pName = a.patient_name || a.patientName;
            const pId   = a.patient_id   || a.patientId;
            return `<div class="grid grid-cols-4 gap-2 px-4 py-3 text-xs text-center border-b border-gray-50 items-center hover:bg-gray-50">
                <div class="font-bold text-blue-600">${a.time}</div>
                <div class="font-semibold text-gray-800 truncate cursor-pointer hover:text-blue-600" onclick="openPatientProfile(${pId})">${pName}</div>
                <div class="text-gray-400 truncate">${a.doctor}</div>
                <div>
                    <select onchange="updateAppointmentStatus(${a.id}, this.value)" class="badge ${sc} border-0 bg-transparent font-semibold text-xs outline-none cursor-pointer w-full">
                        <option value="Waiting"  ${a.status==='Waiting' ?'selected':''}>${t('appts.waiting')}</option>
                        <option value="Inside"   ${a.status==='Inside'  ?'selected':''}>${t('appts.inside')}</option>
                        <option value="Examined" ${a.status==='Examined'?'selected':''}>${t('appts.examined')}</option>
                        <option value="Cancelled"${a.status==='Cancelled'?'selected':''}>${t('appts.cancelled')}</option>
                    </select>
                </div>
            </div>`;
        }).join('');
    }
};

// ── 4. OPTIMIZED openPatientProfile ─────────────────────────────
// الأصل: 4 calls متتالية → الجديد: Promise.all
window.openPatientProfile = async function(id) {
    currentProfilePatientId = id;

    const [
        patientRows,
        treatments,
        notesRows,
        xrays,
        toothStates
    ] = await Promise.all([
        dbGetAll('patients', { id }),
        dbGetAll('treatments', { patient_id: id }),
        dbGetAll('patient_notes', { patient_id: id }),
        dbGetAll('xrays', { patient_id: id }),
        dbGetAll('tooth_states', { patient_id: id }),
    ]);

    const patient = patientRows[0];
    if (!patient) return;

    const pName       = patient.name;
    const pPhone      = patient.phone || '';
    const pGender     = patient.gender || '';
    const pAge        = patient.age || '';
    const pMedHistory = patient.medical_history || patient.medHistory || '';
    const pCreatedAt  = patient.created_at || patient.createdAt || '';

    document.getElementById('profileName').innerText  = pName;
    document.getElementById('profilePhone').innerText =
        [pPhone, pGender, pAge ? `Age: ${pAge}` : ''].filter(Boolean).join(' · ');
    document.getElementById('profileAvatar').innerText = pName.charAt(0).toUpperCase();

    let totalC = 0, totalP = 0;
    treatments.forEach(tr => {
        totalC += parseFloat(tr.total_cost || tr.totalCost) || 0;
        totalP += parseFloat(tr.paid) || 0;
    });
    const debt = totalC - totalP;
    const curr = getCurrency();

    document.getElementById('profileInfoCards').innerHTML = `
        <div class="stat-card"><div><p class="text-xs text-gray-400">Registered</p><p class="font-bold text-sm">${pCreatedAt}</p></div></div>
        <div class="stat-card"><div><p class="text-xs text-gray-400">Treatments</p><p class="font-bold text-sm">${treatments.length}</p></div></div>
        <div class="stat-card"><div><p class="text-xs text-gray-400">Total Paid</p><p class="font-bold text-sm text-green-600">${totalP} ${curr}</p></div></div>
        <div class="stat-card border-l-4 ${debt > 0 ? 'border-l-red-400' : 'border-l-green-400'}">
            <div><p class="text-xs text-gray-400">Balance</p>
            <p class="font-bold text-sm ${debt > 0 ? 'text-red-500' : 'text-green-600'}">
                ${debt > 0 ? debt + ' ' + curr : 'Settled ✓'}
            </p></div>
        </div>
    `;

    if (pMedHistory) {
        document.getElementById('profileInfoCards').innerHTML += `
            <div class="col-span-2 md:col-span-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-xs text-yellow-800">
                <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                <strong>Medical History:</strong> ${pMedHistory}
            </div>`;
    }

    switchView('profile');

    _renderDentalChartFromStates(id, toothStates);
    _renderPatientHistoryFromData(id, treatments);
    _renderPatientXraysFromData(id, xrays);
    _renderPatientNotesFromData(notesRows);
};

// ── 4a. Dental chart من بيانات جاهزة ───────────────────────────
function _renderDentalChartFromStates(patientId, states) {
    const stateMap   = {};
    const surfaceMap = {};
    states.forEach(s => {
        const num = s.tooth_number || s.toothNumber;
        stateMap[num]   = s.condition;
        surfaceMap[num] = s.surfaces || {};
    });

    const upper = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
    const lower = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

    function buildTooth(num) {
        const cond       = stateMap[num] || 'healthy';
        const surfaces   = surfaceMap[num] || {};
        const isSelected = selectedToothNum == num;
        return `<div class="tooth-wrapper" id="tooth-wrap-${num}"
            style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.15s;user-select:none;"
            onclick="clickTooth(${num})"
            onmouseenter="this.style.transform='scale(1.12)'"
            onmouseleave="this.style.transform='scale(1)'"
            title="Tooth #${num} — ${cond}">
            ${typeof getToothSVG === 'function' ? getToothSVG(num, cond, isSelected, surfaces) : `<div class="tooth-btn ${cond !== 'healthy' ? 'tooth-'+cond : ''}">${num}</div>`}
            <span style="font-size:9px;font-weight:700;color:${isSelected?'#2563eb':'#6b7280'};margin-top:2px;">${num}</span>
        </div>`;
    }

    const upperEl = document.getElementById('upperTeeth');
    const lowerEl = document.getElementById('lowerTeeth');
    if (upperEl) upperEl.innerHTML = upper.map(buildTooth).join('');
    if (lowerEl) lowerEl.innerHTML = lower.map(buildTooth).join('');

    const total = Object.keys(stateMap).length;
    const legendEl = document.getElementById('chartLegendCounts');
    if (legendEl) legendEl.textContent = total ? `${total} teeth charted` : '';
}

// ── 4b. Patient history من بيانات جاهزة ────────────────────────
function _renderPatientHistoryFromData(patientId, treatments) {
    let totalC = 0, totalP = 0;
    treatments.forEach(tr => {
        totalC += parseFloat(tr.total_cost || tr.totalCost) || 0;
        totalP += parseFloat(tr.paid) || 0;
    });
    const curr = getCurrency();

    const elCost = document.getElementById('profileTotalCost');
    const elPaid = document.getElementById('profileTotalPaid');
    const elDebt = document.getElementById('profileTotalDebt');
    if (elCost) elCost.innerText = `${totalC} ${curr}`;
    if (elPaid) elPaid.innerText = `${totalP} ${curr}`;
    if (elDebt) elDebt.innerText = `${totalC - totalP} ${curr}`;

    const list = document.getElementById('patientTreatmentsList');
    if (!list) return;

    if (treatments.length === 0) {
        list.innerHTML = '<p class="text-gray-400 text-center text-sm mt-5">No treatments recorded.</p>';
        return;
    }

    list.innerHTML = treatments.map(tr => {
        const cost      = parseFloat(tr.total_cost || tr.totalCost) || 0;
        const paid      = parseFloat(tr.paid) || 0;
        const remaining = cost - paid;
        const isSettled = remaining <= 0.01;
        const toothNum  = tr.tooth_number || tr.toothNumber;

        return `
        <div class="border-b border-gray-100 py-3 flex justify-between items-start gap-2">
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm text-gray-800 truncate">
                    ${tr.procedure || '—'}
                    ${toothNum ? `<span class="text-blue-500 text-xs font-normal ml-1">#${toothNum}</span>` : ''}
                </p>
                <p class="text-xs text-gray-400 mt-0.5">${tr.date || ''}${tr.notes ? ' · ' + tr.notes : ''}</p>
                <div class="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
                    <span class="text-xs font-bold text-gray-700">${cost.toLocaleString()} ${curr}</span>
                    <span class="text-xs text-green-600">مدفوع: ${paid.toLocaleString()}</span>
                    ${!isSettled
                        ? `<span class="text-xs text-red-500 font-semibold">متبقي: ${remaining.toLocaleString()} ${curr}</span>`
                        : `<span class="text-xs text-green-600 font-semibold">✓ مسدد</span>`
                    }
                </div>
            </div>
            <div class="flex flex-col gap-1 items-end shrink-0">
                ${!isSettled ? `
                <button onclick="openRecordPaymentModal(${tr.id}, ${patientId})"
                    class="text-xs px-2 py-1 rounded-lg font-medium flex items-center gap-1"
                    style="background:#f0fdf4;color:#15803d;border:1px solid #86efac;">
                    <i class="fa-solid fa-coins"></i> دفعة
                </button>` : `
                <span class="text-[10px] bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full font-semibold">مسدد ✓</span>`}
                <button onclick="openEditTreatmentModal(${tr.id}, ${patientId})"
                    class="text-xs px-2 py-1 rounded-lg font-medium flex items-center gap-1"
                    style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;">
                    <i class="fa-solid fa-pen"></i> تعديل
                </button>
                <button onclick="deleteTreatment(${tr.id}, ${patientId})"
                    class="text-gray-300 hover:text-red-400 text-xs mt-0.5">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

// ── 4c. Patient xrays من بيانات جاهزة ──────────────────────────
function _renderPatientXraysFromData(patientId, xrays) {
    const grid = document.getElementById('patientXraysGrid');
    if (!grid) return;
    if (xrays.length === 0) {
        grid.innerHTML = `<p class="text-gray-400 text-sm col-span-full">${t('profile.noImages')}</p>`;
        return;
    }
    grid.innerHTML = xrays.map(x => `
        <div class="relative group cursor-pointer border border-gray-100 rounded-xl overflow-hidden h-24 bg-gray-50">
            <img src="${x.image_base64 || x.imageBase64}"
                class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                onclick="viewImage('${x.image_base64 || x.imageBase64}')">
            <div class="absolute bottom-0 bg-black bg-opacity-50 w-full text-white text-[10px] text-center py-0.5">${x.date}</div>
            <button onclick="deleteXray(${x.id}, ${patientId})"
                class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] items-center justify-center hidden group-hover:flex">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>`).join('');
}

// ── 4d. Patient notes من بيانات جاهزة ──────────────────────────
function _renderPatientNotesFromData(notesRows) {
    const el  = document.getElementById('patientNotes');
    const rec = notesRows[0];
    if (el) el.value = rec ? rec.notes : '';
}

// ── 5. OPTIMIZED loadAllPatients ─────────────────────────────────
window.loadAllPatients = async function() {
    const [patients, allTreatments] = await Promise.all([
        dbGetAll('patients'),
        dbGetAll('treatments'),
    ]);
    allPatientsData = patients;

    const balanceMap = {};
    allTreatments.forEach(tr => {
        const pid = tr.patient_id || tr.patientId;
        if (!balanceMap[pid]) balanceMap[pid] = { cost: 0, paid: 0 };
        balanceMap[pid].cost += parseFloat(tr.total_cost || tr.totalCost) || 0;
        balanceMap[pid].paid += parseFloat(tr.paid) || 0;
    });

    _renderPatientsTableOptimized(patients, balanceMap);
};

function _renderPatientsTableOptimized(patients, balanceMap) {
    const tbody = document.getElementById('allPatientsTableBody');
    const curr  = getCurrency();

    if (patients.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('patientsEmptyState').classList.remove('hidden');
        return;
    }
    document.getElementById('patientsEmptyState').classList.add('hidden');

    const rows = [...patients].reverse().map((p, i) => {
        const b    = balanceMap[p.id] || { cost: 0, paid: 0 };
        const debt = b.cost - b.paid;
        const debtHtml = debt > 0
            ? `<span class="badge" style="background:#fef2f2;color:#ef4444;">${debt} ${curr}</span>`
            : `<span class="badge" style="background:#f0fdf4;color:#16a34a;">${t('patients.settled')}</span>`;

        return `
        <tr class="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onclick="openPatientProfile(${p.id})">
            <td class="p-3 text-gray-400 text-sm font-medium">${i + 1}</td>
            <td class="p-3">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">${p.name.charAt(0)}</div>
                    <div>
                        <p class="font-semibold text-sm text-gray-800">${p.name}</p>
                        ${(p.medical_history || p.medHistory) ? `<p class="text-[10px] text-yellow-600"><i class="fa-solid fa-triangle-exclamation"></i> ${p.medical_history || p.medHistory}</p>` : ''}
                    </div>
                </div>
            </td>
            <td class="p-3 text-sm text-gray-600">${p.phone}</td>
            <td class="p-3 text-sm text-gray-500">${p.age || '—'}</td>
            <td class="p-3 text-sm text-gray-400">${p.created_at || p.createdAt}</td>
            <td class="p-3 text-center">${debtHtml}</td>
            <td class="p-3 text-center" onclick="event.stopPropagation()">
                <div class="flex gap-1 justify-center">
                    <button onclick="openPatientProfile(${p.id})" class="btn btn-outline text-xs px-2 py-1"><i class="fa-solid fa-folder-open"></i></button>
                    <button onclick="deletePatient(${p.id})" class="btn text-xs px-2 py-1" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    });

    tbody.innerHTML = rows.join('');
}

// ── 6. DEBOUNCED refreshBookedSlots ─────────────────────────────
const _refreshBookedSlotsDebounced = debounce(async function() {
    const date   = document.getElementById('appointmentDate')?.value   || '';
    const time   = document.getElementById('appointmentTime')?.value   || '';
    const doctor = document.getElementById('appointmentDoctor')?.value || '';
    const durEl  = document.getElementById('appointmentDuration');
    const dur    = durEl ? durEl.value : 30;
    const hintEl = document.getElementById('bookedSlotsHint');
    const warnEl = document.getElementById('apptConflictWarning');

    if (!date || !doctor) {
        if (hintEl) hintEl.innerHTML = '';
        if (warnEl) { warnEl.style.display = 'none'; warnEl.innerHTML = ''; }
        return;
    }

    const allAppts = await dbGetAll('appointments');
    const dayAppts = allAppts
        .filter(a => a.date === date && a.doctor === doctor && (a.status || '') !== 'Cancelled')
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    if (hintEl) {
        if (dayAppts.length === 0) {
            hintEl.innerHTML = `<div style="color:#16a34a;font-size:11px;padding:6px 10px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-top:4px;">
                ✅ لا توجد مواعيد محجوزة لهذا الطبيب في هذا اليوم</div>`;
        } else {
            hintEl.innerHTML = `<div style="font-size:11px;padding:6px 10px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;color:#1d4ed8;margin-top:4px;">
                <strong>📅 مواعيد ${doctor} يوم ${date}:</strong><br>` +
                dayAppts.map(a => {
                    const d   = parseInt(a.duration_mins || a.durationMins || 30);
                    const hh  = parseInt((a.time || '00:00').split(':')[0]);
                    const mm  = parseInt((a.time || '00:00').split(':')[1]);
                    const end = hh * 60 + mm + d;
                    const endStr = String(Math.floor(end/60)).padStart(2,'0') + ':' + String(end%60).padStart(2,'0');
                    return `• ${a.time}–${endStr} <strong>${a.patient_name || a.patientName || '—'}</strong>`;
                }).join('<br>') + '</div>';
        }
    }

    if (time && warnEl && typeof checkAppointmentConflict === 'function') {
        const result = await checkAppointmentConflict(date, time, doctor, dur);
        if (result.conflict) {
            warnEl.style.display = 'flex';
            warnEl.style.background = '#fff1f2';
            warnEl.style.borderColor = '#fda4af';
            warnEl.style.color = '#be123c';
            warnEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="flex-shrink:0;margin-top:2px"></i>
                <span style="margin-right:6px;margin-left:6px">⚠️ ${result.message}</span>`;
        } else {
            warnEl.style.display = 'flex';
            warnEl.style.background = '#f0fdf4';
            warnEl.style.borderColor = '#86efac';
            warnEl.style.color = '#15803d';
            warnEl.innerHTML = `<i class="fa-solid fa-circle-check" style="flex-shrink:0;margin-top:2px"></i>
                <span style="margin-right:6px;margin-left:6px">✅ الوقت متاح</span>`;
        }
    }
}, 300);

if (!window.refreshBookedSlots || window.refreshBookedSlots !== _refreshBookedSlotsDebounced) {
    window.refreshBookedSlots = _refreshBookedSlotsDebounced;
}

// ── 7. OPTIMIZED loadReports ─────────────────────────────────────
window.loadReports = async function() {
    const [treatments, expenses, patients, appointments] = await Promise.all([
        dbGetAllCached('treatments', {}, 20000),
        dbGetAllCached('expenses', {}, 20000),
        dbGetAllCached('patients', {}, 20000),
        dbGetAllCached('appointments', {}, 20000),
    ]);
    const curr = getCurrency();

    renderReportKpis(treatments, expenses, patients, appointments);
    renderCharts();

    let totalRevenue = 0, totalPaid = 0, totalDebt = 0, totalExpenses = 0;
    treatments.forEach(tr => {
        totalRevenue += parseFloat(tr.total_cost || tr.totalCost) || 0;
        totalPaid    += parseFloat(tr.paid) || 0;
    });
    totalDebt = totalRevenue - totalPaid;
    expenses.forEach(e => { totalExpenses += parseFloat(e.amount) || 0; });

    document.getElementById('financialReport').innerHTML = `
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.totalRevenue')}</span><span class="font-bold text-gray-800">${totalRevenue} ${curr}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.collected')}</span><span class="font-bold text-green-600">${totalPaid} ${curr}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.debt')}</span><span class="font-bold text-red-500">${totalDebt} ${curr}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.totalExp')}</span><span class="font-bold text-orange-500">${totalExpenses} ${curr}</span></div>
        <div class="flex justify-between text-sm font-bold text-base mt-1"><span>${t('rep.netProfit')}</span><span class="${totalPaid-totalExpenses>=0?'text-green-600':'text-red-500'}">${totalPaid - totalExpenses} ${curr}</span></div>
    `;

    const examined = appointments.filter(a => a.status === 'Examined').length;
    document.getElementById('patientReport').innerHTML = `
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.totalPatients')}</span><span class="font-bold">${patients.length}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.totalAppts')}</span><span class="font-bold">${appointments.length}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.completed')}</span><span class="font-bold text-green-600">${examined}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.totalTreat')}</span><span class="font-bold">${treatments.length}</span></div>
        <div class="flex justify-between text-sm"><span class="text-gray-500">${t('rep.totalRx')}</span><span class="font-bold">(see list)</span></div>
    `;

    const debtMap = {};
    treatments.forEach(tr => {
        const pid  = tr.patient_id || tr.patientId;
        const name = tr.patient_name || tr.patientName;
        if (!debtMap[pid]) debtMap[pid] = { name, cost: 0, paid: 0, id: pid };
        debtMap[pid].cost += parseFloat(tr.total_cost || tr.totalCost) || 0;
        debtMap[pid].paid += parseFloat(tr.paid) || 0;
    });
    const debtors = Object.values(debtMap)
        .filter(d => d.cost - d.paid > 0)
        .sort((a, b) => (b.cost - b.paid) - (a.cost - a.paid));

    if (debtors.length === 0) {
        document.getElementById('debtReport').innerHTML = `<p class="text-green-600 font-semibold text-sm"><i class="fa-solid fa-circle-check mr-1"></i> ${t('rep.allSettled')}</p>`;
        return;
    }
    document.getElementById('debtReport').innerHTML = `
        <table class="w-full text-sm">
            <thead><tr class="text-gray-400 text-xs uppercase border-b">
                <th class="text-left pb-2">${t('rep.debtor')}</th>
                <th class="text-right pb-2">${t('rep.debtAmt')}</th>
            </tr></thead>
            <tbody>${debtors.map(d => `
                <tr class="border-b border-gray-50">
                    <td class="py-2 cursor-pointer hover:text-blue-600 font-semibold" onclick="openPatientProfile(${d.id})">${d.name}</td>
                    <td class="py-2 text-right text-red-500 font-bold">${d.cost - d.paid} ${curr}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
};

// ── 8. CACHE INVALIDATION ────────────────────────────────────────
const _origDbInsert = window.dbInsert;
const _origDbUpdate = window.dbUpdate;
const _origDbDelete = window.dbDelete;

if (_origDbInsert) {
    window.dbInsert = async function(table, data) {
        const result = await _origDbInsert(table, data);
        cacheClear(table);
        return result;
    };
}
if (_origDbUpdate) {
    window.dbUpdate = async function(table, id, data) {
        const result = await _origDbUpdate(table, id, data);
        cacheClear(table);
        return result;
    };
}
if (_origDbDelete) {
    window.dbDelete = async function(table, id) {
        const result = await _origDbDelete(table, id);
        cacheClear(table);
        return result;
    };
}

// ── 9. REMINDERS — cache لمدة 60 ثانية ──────────────────────────
const _origCheckReminders = window.checkReminders;
window.checkReminders = async function() {
    const cached = cacheGet('reminders_badge');
    if (cached) {
        const badge = document.getElementById('notifBadge');
        if (badge) {
            badge.textContent = cached.total;
            cached.total > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');
            badge.classList.toggle('flex', cached.total > 0);
        }
    }
    if (typeof _origCheckReminders === 'function') {
        await _origCheckReminders();
        const badge = document.getElementById('notifBadge');
        if (badge) cacheSet('reminders_badge', { total: parseInt(badge.textContent) || 0 }, 60000);
    }
};

console.log('[Performance Patch] ✅ Loaded — Promise.all + Debounce + Cache active');

} // end patch guard