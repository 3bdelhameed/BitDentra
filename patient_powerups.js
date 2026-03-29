(function () {
    'use strict';

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    function escapeHtml(value) {
        if (window.escapeHtml) return window.escapeHtml(value);
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getCurrencySafe() {
        return typeof window.getCurrency === 'function' ? window.getCurrency() : 'EGP';
    }

    function formatMoney(value) {
        const num = Number(value || 0);
        return `${num.toFixed(2)} ${getCurrencySafe()}`;
    }

    function formatDate(value) {
        if (!value) return 'No date';
        return String(value);
    }

    function normalizeCondition(value) {
        const key = String(value || '').trim().toLowerCase();
        const map = {
            crown: 'crown_work',
            crown_work: 'crown_work',
            root: 'root_canal',
            root_canal: 'root_canal',
            treated: 'treated',
            implant: 'implant',
            bridge: 'bridge',
            missing: 'missing',
            fracture: 'fracture',
            decay: 'decay',
            healthy: 'healthy'
        };
        return map[key] || key || '';
    }

    function conditionLabel(value) {
        const key = normalizeCondition(value);
        const labels = {
            crown_work: 'Crown',
            root_canal: 'Root canal',
            treated: 'Treated',
            implant: 'Implant',
            bridge: 'Bridge',
            missing: 'Missing',
            fracture: 'Fracture',
            decay: 'Decay',
            healthy: 'Healthy'
        };
        return labels[key] || (value ? String(value) : 'State updated');
    }

    function getToothNumber(row) {
        return row?.tooth_number ?? row?.toothNumber ?? '';
    }

    function getPatientId(row) {
        return row?.patient_id ?? row?.patientId;
    }

    function getPaymentTreatmentId(row) {
        return row?.treatment_id ?? row?.treatmentId;
    }

    function getPaidAmount(row) {
        return Number(row?.paid || 0);
    }

    function getTreatmentTotal(row) {
        return Number(row?.total_cost ?? row?.totalCost ?? 0);
    }

    function getRemaining(row, paymentsByTreatment) {
        const treatmentId = String(row.id);
        const paymentRows = paymentsByTreatment.get(treatmentId) || [];
        const paidFromPayments = paymentRows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        const paid = paymentRows.length ? paidFromPayments : getPaidAmount(row);
        return {
            paid,
            remaining: Math.max(0, getTreatmentTotal(row) - paid),
            installments: paymentRows
        };
    }

    function treatmentStatus(remainingInfo) {
        if (remainingInfo.remaining <= 0.01) return { label: 'Completed', cls: 'done' };
        if (remainingInfo.paid > 0.01) return { label: 'In Progress', cls: 'partial' };
        return { label: 'Planned', cls: 'planned' };
    }

    function sortByDateDesc(rows) {
        return [...rows].sort((a, b) => {
            const left = `${b?.date || b?.paid_at || b?.paidAt || b?.created_at || b?.createdAt || ''}|${b?.id || 0}`;
            const right = `${a?.date || a?.paid_at || a?.paidAt || a?.created_at || a?.createdAt || ''}|${a?.id || 0}`;
            return left.localeCompare(right);
        });
    }

    async function getPatientTreatments(patientId) {
        const rows = await window.dbGetAll('treatments', { patient_id: patientId });
        return sortByDateDesc(rows);
    }

    async function getPatientPayments(patientId) {
        try {
            const rows = await window.dbGetAll('session_payments', { patient_id: patientId });
            return sortByDateDesc(rows);
        } catch (_) {
            return [];
        }
    }

    async function getPatientToothStates(patientId) {
        try {
            const rows = await window.dbGetAll('tooth_states', { patient_id: patientId });
            return [...rows].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
        } catch (_) {
            return [];
        }
    }

    async function getUpcomingAppointment(patientId) {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const rows = await window.dbGetAll('appointments', { patient_id: patientId });
            return rows
                .filter(row => String(row?.date || '') >= todayStr && String(row?.status || '') !== 'Cancelled')
                .sort((a, b) => `${a.date || ''}|${a.time || ''}`.localeCompare(`${b.date || ''}|${b.time || ''}`))[0] || null;
        } catch (_) {
            return null;
        }
    }

    function buildYearOptions(treatments, yearSelect) {
        if (!yearSelect) return '';
        const currentValue = yearSelect.value || '';
        const years = [...new Set(treatments.map(row => String(row?.date || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
        yearSelect.innerHTML = '<option value="">All</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');
        if (currentValue && years.includes(currentValue)) {
            yearSelect.value = currentValue;
        }
        return yearSelect.value || '';
    }

    function buildYearStateMap(treatments) {
        const ordered = [...treatments].sort((a, b) => `${a?.date || ''}|${a?.id || 0}`.localeCompare(`${b?.date || ''}|${b?.id || 0}`));
        const map = {};
        ordered.forEach(row => {
            const toothNumber = getToothNumber(row);
            const condition = normalizeCondition(row?.tooth_condition ?? row?.toothCondition);
            if (!toothNumber || !condition) return;
            map[String(toothNumber)] = condition;
        });
        return map;
    }

    function buildStateSnapshot(treatments, toothStates, yearFilter) {
        if (yearFilter) {
            return buildYearStateMap(treatments);
        }

        const stateMap = {};
        toothStates.forEach(row => {
            const toothNumber = getToothNumber(row);
            const condition = normalizeCondition(row?.condition);
            if (!toothNumber || !condition || stateMap[String(toothNumber)] !== undefined) return;
            stateMap[String(toothNumber)] = condition;
        });
        return stateMap;
    }

    function paymentsByTreatment(payments) {
        const map = new Map();
        payments.forEach(payment => {
            const treatmentId = String(getPaymentTreatmentId(payment));
            if (!treatmentId) return;
            if (!map.has(treatmentId)) map.set(treatmentId, []);
            map.get(treatmentId).push(payment);
        });
        return map;
    }

    function injectStyles() {
        if (document.getElementById('patientPowerupsStyles')) return;
        const style = document.createElement('style');
        style.id = 'patientPowerupsStyles';
        style.textContent = `
            #patientPowerupsGrid { display:grid; grid-template-columns:repeat(1,minmax(0,1fr)); gap:20px; margin-bottom:20px; }
            @media (min-width: 1024px) {
                #patientPowerupsGrid { grid-template-columns:repeat(2,minmax(0,1fr)); }
            }
            .power-card { background:#fff; border:1px solid #e5e7eb; border-radius:20px; padding:20px; }
            .power-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #f1f5f9; }
            .power-card-title { font-size:16px; font-weight:800; color:#111827; display:flex; align-items:center; gap:8px; }
            .power-card-sub { font-size:12px; color:#64748b; margin-top:4px; }
            .power-pill-row { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:14px; }
            .power-pill { min-width:110px; border:1px solid #e2e8f0; border-radius:16px; padding:10px 12px; background:#f8fafc; }
            .power-pill-label { font-size:11px; color:#64748b; font-weight:700; }
            .power-pill-value { margin-top:4px; font-size:15px; font-weight:800; color:#0f172a; }
            .power-callout { border:1px solid #dbeafe; background:#eff6ff; color:#1d4ed8; border-radius:16px; padding:12px 14px; font-size:12px; font-weight:700; margin-bottom:14px; }
            .power-list { max-height:420px; overflow:auto; display:flex; flex-direction:column; gap:10px; }
            .plan-item { border:1px solid #eef2f7; border-radius:16px; padding:12px 14px; background:#ffffff; }
            .plan-row { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
            .plan-title { font-size:13px; font-weight:800; color:#111827; }
            .plan-meta { margin-top:4px; font-size:11px; color:#64748b; line-height:1.5; }
            .plan-actions { display:flex; align-items:center; gap:8px; margin-top:10px; flex-wrap:wrap; }
            .plan-chip { border-radius:999px; padding:4px 10px; font-size:11px; font-weight:800; }
            .plan-chip.done { background:#dcfce7; color:#166534; }
            .plan-chip.partial { background:#fef3c7; color:#b45309; }
            .plan-chip.planned { background:#dbeafe; color:#1d4ed8; }
            .installment-row { display:flex; align-items:center; justify-content:space-between; gap:12px; border-radius:12px; background:#f0fdf4; color:#166534; padding:8px 10px; font-size:11px; margin-top:8px; }
            .timeline-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
            .timeline-toolbar select { border:1px solid #e5e7eb; border-radius:12px; padding:8px 10px; font-size:12px; min-width:120px; }
            .timeline-item { position:relative; padding:0 0 14px 18px; border-left:2px solid #e5e7eb; }
            .timeline-item:last-child { padding-bottom:0; }
            .timeline-dot { position:absolute; left:-7px; top:2px; width:12px; height:12px; border-radius:999px; background:#3b82f6; box-shadow:0 0 0 4px #eff6ff; }
            .timeline-title { font-size:13px; font-weight:800; color:#111827; }
            .timeline-meta { margin-top:4px; font-size:11px; color:#64748b; line-height:1.5; }
            .timeline-badges { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
            .timeline-badge { border-radius:999px; padding:5px 10px; font-size:11px; font-weight:800; background:#f8fafc; border:1px solid #e2e8f0; color:#334155; }
            .empty-power { text-align:center; color:#94a3b8; font-size:13px; padding:24px 12px; border:1px dashed #e2e8f0; border-radius:16px; background:#f8fafc; }
        `;
        document.head.appendChild(style);
    }

    function ensurePowerContainers() {
        injectStyles();
        const profileView = document.getElementById('profileView');
        if (!profileView || document.getElementById('patientPowerupsGrid')) return;

        const notesSection = document.getElementById('patientNotes')?.closest('.bg-white');
        const wrapper = document.createElement('div');
        wrapper.id = 'patientPowerupsGrid';
        wrapper.innerHTML = `
            <div class="power-card">
                <div class="power-card-head">
                    <div>
                        <div class="power-card-title"><i class="fa-solid fa-list-check text-emerald-500"></i> Treatment Plan</div>
                        <div class="power-card-sub">Open items, balances, installments, and next visit.</div>
                    </div>
                    <button id="patientInvoiceBtn" class="btn btn-outline text-xs hidden">
                        <i class="fa-solid fa-file-invoice"></i> Patient Invoice
                    </button>
                </div>
                <div id="patientPlanKpis" class="power-pill-row"></div>
                <div id="patientPlanCallout"></div>
                <div id="patientPlanList" class="power-list"></div>
            </div>
            <div class="power-card">
                <div class="power-card-head">
                    <div>
                        <div class="power-card-title"><i class="fa-solid fa-timeline text-blue-500"></i> Dental Timeline</div>
                        <div class="power-card-sub">Chronological tooth events and the current chart snapshot.</div>
                    </div>
                    <div class="timeline-toolbar">
                        <select id="timelineToothFilter">
                            <option value="">All teeth</option>
                        </select>
                    </div>
                </div>
                <div id="timelineSnapshot" class="timeline-badges"></div>
                <div id="patientTimelineList" class="power-list"></div>
            </div>
        `;

        if (notesSection && notesSection.parentNode === profileView) {
            profileView.insertBefore(wrapper, notesSection);
        } else {
            profileView.appendChild(wrapper);
        }

        const invoiceBtn = document.getElementById('patientInvoiceBtn');
        if (invoiceBtn) {
            invoiceBtn.addEventListener('click', () => {
                if (window.currentProfilePatientId && typeof window.printPatientInvoice === 'function') {
                    window.printPatientInvoice(window.currentProfilePatientId);
                }
            });
        }

        const filterEl = document.getElementById('timelineToothFilter');
        if (filterEl) {
            filterEl.addEventListener('change', () => {
                if (window.currentProfilePatientId) {
                    refreshPatientHistoryView(window.currentProfilePatientId);
                }
            });
        }
    }

    function renderLedger(treatments, paymentMap, patientId) {
        const container = document.getElementById('patientTreatmentsList');
        if (!container) return;

        if (!treatments.length) {
            container.innerHTML = '<div class="empty-power">No treatments recorded for this filter.</div>';
            document.getElementById('profileTotalCost').innerText = formatMoney(0);
            document.getElementById('profileTotalPaid').innerText = formatMoney(0);
            document.getElementById('profileTotalDebt').innerText = formatMoney(0);
            return;
        }

        let totalCost = 0;
        let totalPaid = 0;

        container.innerHTML = treatments.map(treatment => {
            const info = getRemaining(treatment, paymentMap);
            const total = getTreatmentTotal(treatment);
            const status = treatmentStatus(info);
            const tooth = getToothNumber(treatment);
            const payments = paymentMap.get(String(treatment.id)) || [];

            totalCost += total;
            totalPaid += info.paid;

            const paymentRows = payments.map(payment => `
                <div class="installment-row">
                    <span>Session ${escapeHtml(payment.session_num ?? payment.sessionNum ?? '')} • ${formatMoney(payment.amount)}</span>
                    <span>
                        ${escapeHtml(payment.paid_at || payment.paidAt || '')}
                        ${typeof window.openEditPayment === 'function'
                            ? `<button onclick="openEditPayment(${payment.id},${treatment.id},${patientId},${Number(payment.amount || 0)},${Number(payment.session_num || payment.sessionNum || 1)},decodeURIComponent('${encodeURIComponent(String(payment.notes || ''))}'))" class="text-blue-400 hover:text-blue-600 ml-2"><i class="fa-solid fa-pen-to-square"></i></button>`
                            : ''
                        }
                        ${typeof window.deleteSessionPayment === 'function'
                            ? `<button onclick="deleteSessionPayment(${payment.id},${treatment.id},${patientId})" class="text-red-400 hover:text-red-600 ml-2"><i class="fa-solid fa-trash"></i></button>`
                            : ''
                        }
                    </span>
                </div>
            `).join('');

            const toothBadge = tooth
                ? (window.getToothBadgeHTML ? window.getToothBadgeHTML(tooth) : `<span class="text-blue-500 text-xs font-semibold">#${escapeHtml(tooth)}</span>`)
                : '';

            return `
                <div class="plan-item">
                    <div class="plan-row">
                        <div class="min-w-0 flex-1">
                            <div class="plan-title">${escapeHtml(treatment.procedure || 'Treatment')} ${toothBadge}</div>
                            <div class="plan-meta">
                                ${formatDate(treatment.date)} • Total ${formatMoney(total)} • Paid ${formatMoney(info.paid)} • Remaining ${formatMoney(info.remaining)}
                                ${treatment.notes ? ` • ${escapeHtml(treatment.notes)}` : ''}
                            </div>
                        </div>
                        <span class="plan-chip ${status.cls}">${status.label}</span>
                    </div>
                    ${paymentRows}
                    <div class="plan-actions">
                        ${info.remaining > 0.01 && typeof window.openSessionPayment === 'function'
                            ? `<button onclick="openSessionPayment(${treatment.id}, ${patientId})" class="btn btn-outline text-xs"><i class="fa-solid fa-money-bill-wave"></i> Payment</button>`
                            : ''
                        }
                        ${typeof window.deleteTreatment === 'function'
                            ? `<button onclick="deleteTreatment(${treatment.id}, ${patientId})" class="btn btn-outline text-xs text-red-500 border-red-200"><i class="fa-solid fa-trash"></i> Delete</button>`
                            : ''
                        }
                    </div>
                </div>
            `;
        }).join('');

        const totalDebt = Math.max(0, totalCost - totalPaid);
        document.getElementById('profileTotalCost').innerText = formatMoney(totalCost);
        document.getElementById('profileTotalPaid').innerText = formatMoney(totalPaid);
        document.getElementById('profileTotalDebt').innerText = formatMoney(totalDebt);
    }

    function renderPlanSummary(treatments, payments, paymentMap, upcomingAppointment) {
        const kpisEl = document.getElementById('patientPlanKpis');
        const calloutEl = document.getElementById('patientPlanCallout');
        const listEl = document.getElementById('patientPlanList');
        const invoiceBtn = document.getElementById('patientInvoiceBtn');
        if (!kpisEl || !calloutEl || !listEl) return;

        if (invoiceBtn) {
            invoiceBtn.classList.toggle('hidden', typeof window.printPatientInvoice !== 'function');
        }

        const items = treatments.map(treatment => {
            const info = getRemaining(treatment, paymentMap);
            return { treatment, info, status: treatmentStatus(info) };
        });

        const installmentCount = items.reduce((sum, item) => sum + (paymentMap.get(String(item.treatment.id)) || []).length, 0);
        const totalCost = items.reduce((sum, item) => sum + getTreatmentTotal(item.treatment), 0);
        const totalPaid = items.reduce((sum, item) => sum + item.info.paid, 0);
        const totalRemaining = Math.max(0, totalCost - totalPaid);
        const openItems = items.filter(item => item.info.remaining > 0.01);
        const completedItems = items.filter(item => item.info.remaining <= 0.01);

        kpisEl.innerHTML = [
            { label: 'Plan Items', value: String(items.length) },
            { label: 'Completed', value: String(completedItems.length) },
            { label: 'Installments', value: String(installmentCount) },
            { label: 'Remaining', value: formatMoney(totalRemaining) }
        ].map(item => `
            <div class="power-pill">
                <div class="power-pill-label">${item.label}</div>
                <div class="power-pill-value">${item.value}</div>
            </div>
        `).join('');

        if (upcomingAppointment) {
            calloutEl.innerHTML = `
                <div class="power-callout">
                    Next visit: ${escapeHtml(upcomingAppointment.date || '')}${upcomingAppointment.time ? ` at ${escapeHtml(upcomingAppointment.time)}` : ''}
                    ${upcomingAppointment.doctor ? ` • ${escapeHtml(upcomingAppointment.doctor)}` : ''}
                </div>
            `;
        } else {
            calloutEl.innerHTML = '';
        }

        if (!items.length) {
            listEl.innerHTML = '<div class="empty-power">No treatment plan items yet.</div>';
            return;
        }

        const ordered = [...items].sort((a, b) => {
            const left = `${b.info.remaining > 0.01 ? 1 : 0}|${b.treatment.date || ''}|${b.treatment.id || 0}`;
            const right = `${a.info.remaining > 0.01 ? 1 : 0}|${a.treatment.date || ''}|${a.treatment.id || 0}`;
            return left.localeCompare(right);
        });

        listEl.innerHTML = ordered.map(({ treatment, info, status }) => {
            const tooth = getToothNumber(treatment);
            const installments = paymentMap.get(String(treatment.id)) || [];
            return `
                <div class="plan-item">
                    <div class="plan-row">
                        <div class="min-w-0 flex-1">
                            <div class="plan-title">${escapeHtml(treatment.procedure || 'Treatment')}${tooth ? ` • Tooth ${escapeHtml(tooth)}` : ''}</div>
                            <div class="plan-meta">${formatDate(treatment.date)} • ${conditionLabel(treatment.tooth_condition || treatment.toothCondition)} • ${installments.length} installments</div>
                        </div>
                        <span class="plan-chip ${status.cls}">${status.label}</span>
                    </div>
                    <div class="plan-meta">Total ${formatMoney(getTreatmentTotal(treatment))} • Paid ${formatMoney(info.paid)} • Remaining ${formatMoney(info.remaining)}</div>
                </div>
            `;
        }).join('');
    }

    function renderTimeline(treatments, toothStates, yearFilter) {
        const listEl = document.getElementById('patientTimelineList');
        const snapshotEl = document.getElementById('timelineSnapshot');
        const filterEl = document.getElementById('timelineToothFilter');
        if (!listEl || !snapshotEl || !filterEl) return;

        const teethFromTreatments = [...new Set(treatments.map(row => String(getToothNumber(row) || '')).filter(Boolean))].sort();
        const currentValue = filterEl.value || '';
        filterEl.innerHTML = '<option value="">All teeth</option>' + teethFromTreatments.map(tooth => `<option value="${tooth}">Tooth ${tooth}</option>`).join('');
        if (currentValue && teethFromTreatments.includes(currentValue)) {
            filterEl.value = currentValue;
        }
        const toothFilter = filterEl.value || '';

        const snapshotMap = buildStateSnapshot(treatments, toothStates, yearFilter);
        const snapshotEntries = Object.entries(snapshotMap).sort((a, b) => a[0].localeCompare(b[0]));
        snapshotEl.innerHTML = snapshotEntries.length
            ? snapshotEntries.map(([tooth, condition]) => `<span class="timeline-badge">#${escapeHtml(tooth)} ${escapeHtml(conditionLabel(condition))}</span>`).join('')
            : '<span class="timeline-badge">No chart snapshot for this filter</span>';

        const events = sortByDateDesc(
            treatments
                .filter(row => !toothFilter || String(getToothNumber(row) || '') === toothFilter)
                .map(row => {
                    const info = {
                        total: getTreatmentTotal(row),
                        paid: getPaidAmount(row),
                        remaining: Math.max(0, getTreatmentTotal(row) - getPaidAmount(row))
                    };
                    return {
                        id: row.id,
                        tooth: getToothNumber(row),
                        date: row.date || row.created_at || row.createdAt || '',
                        title: row.procedure || conditionLabel(row.tooth_condition || row.toothCondition),
                        condition: row.tooth_condition || row.toothCondition || row.condition || '',
                        notes: row.notes || '',
                        meta: `Paid ${formatMoney(info.paid)} • Remaining ${formatMoney(info.remaining)}`
                    };
                })
        );

        if (!events.length) {
            listEl.innerHTML = '<div class="empty-power">No dental history found for this filter.</div>';
            return;
        }

        listEl.innerHTML = events.map(event => `
            <div class="timeline-item">
                <span class="timeline-dot"></span>
                <div class="timeline-title">${escapeHtml(event.title)}${event.tooth ? ` • Tooth ${escapeHtml(event.tooth)}` : ''}</div>
                <div class="timeline-meta">${formatDate(event.date)} • ${escapeHtml(conditionLabel(event.condition))}</div>
                <div class="timeline-meta">${escapeHtml(event.meta)}${event.notes ? ` • ${escapeHtml(event.notes)}` : ''}</div>
            </div>
        `).join('');
    }

    async function refreshPatientHistoryView(patientId) {
        if (!patientId || typeof window.dbGetAll !== 'function' || typeof window.generateDentalChart !== 'function') return;

        ensurePowerContainers();

        const allTreatments = await getPatientTreatments(patientId);
        const payments = await getPatientPayments(patientId);
        const toothStates = await getPatientToothStates(patientId);
        const yearSelect = document.getElementById('patientHistoryYear');
        const yearFilter = buildYearOptions(allTreatments, yearSelect);
        const filteredTreatments = yearFilter
            ? allTreatments.filter(row => String(row?.date || '').startsWith(yearFilter))
            : allTreatments;
        const paymentMap = paymentsByTreatment(payments);
        const upcomingAppointment = await getUpcomingAppointment(patientId);

        const yearStateMap = buildYearStateMap(filteredTreatments);
        if (yearFilter) {
            await window.generateDentalChart(patientId, yearStateMap);
        } else {
            await window.generateDentalChart(patientId);
        }

        renderLedger(filteredTreatments, paymentMap, patientId);
        renderPlanSummary(filteredTreatments, payments, paymentMap, upcomingAppointment);
        renderTimeline(filteredTreatments, toothStates, yearFilter);
    }

    async function install() {
        let tries = 0;
        while (
            tries < 120 &&
            (
                typeof window.dbGetAll !== 'function' ||
                typeof window.generateDentalChart !== 'function' ||
                typeof window.openPatientProfile !== 'function'
            )
        ) {
            tries++;
            await wait(100);
        }

        ensurePowerContainers();
        window.refreshPatientHistoryView = refreshPatientHistoryView;
        window.loadPatientHistory = refreshPatientHistoryView;
        window.renderSessionPayments = refreshPatientHistoryView;

        if (window.currentProfilePatientId && document.getElementById('profileView')?.classList.contains('active')) {
            refreshPatientHistoryView(window.currentProfilePatientId).catch(() => {});
        }
    }

    if (document.readyState === 'complete') {
        setTimeout(() => { install().catch(() => {}); }, 80);
    } else {
        window.addEventListener('load', () => {
            setTimeout(() => { install().catch(() => {}); }, 80);
        });
    }
})();
