    // ══════════════════════════════════════════════════════════════════
    //  easy_wins.js
    //  ١. WhatsApp تذكير في بروفايل المريض
    //  ٢. Dashboard — كارت أكثر إجراء + مرضى جدد الشهر
    //  ٣. فاتورة احترافية قابلة للطباعة
    //  ٤. بحث سريع عام Ctrl+K
    // ══════════════════════════════════════════════════════════════════

    (function () {
        'use strict';

        // ════════════════════════════════════════════════════════
        //  ١. WhatsApp تذكير
        // ════════════════════════════════════════════════════════

        // بعد فتح البروفايل — أضف زر واتساب لو فيه رقم
        const _origOpenProfile = window.openPatientProfile;
        window.openPatientProfile = async function (id) {
            await _origOpenProfile(id);

            // انتظر الـ DOM يتحدث
            setTimeout(() => {
                const phoneEl = document.getElementById('profilePhone');
                const nameEl  = document.getElementById('profileName');
                if (!phoneEl || !nameEl) return;

                const rawPhone = (phoneEl.innerText || '').split('·')[0].trim().replace(/\s+/g,'');
                if (!rawPhone) return;

                // حوّل الرقم المصري لـ international
                let intlPhone = rawPhone;
                if (intlPhone.startsWith('0')) intlPhone = '20' + intlPhone.slice(1);
                intlPhone = intlPhone.replace(/\D/g,'');

                const patientName = nameEl.innerText || '';

                // أضف زر واتساب لو مش موجود
                const btn = document.getElementById('btnProfileWhatsapp');
                if (btn) {
                    btn.style.display = 'flex';
                    btn.onclick = () => openWhatsAppModal(intlPhone, patientName, id);
                }
            }, 200);
        };

        // Modal واتساب
        function injectWhatsAppModal() {
            if (document.getElementById('whatsappModal')) return;
            document.body.insertAdjacentHTML('beforeend', `
            <div id="whatsappModal" class="modal-base">
            <div class="modal-box max-w-sm">
                <div class="flex justify-between items-center mb-4 border-b pb-3">
                <h3 class="font-bold text-gray-800 flex items-center gap-2">
                    <i class="fa-brands fa-whatsapp text-green-500 text-lg"></i> إرسال واتساب
                </h3>
                <button onclick="closeModal('whatsappModal')" class="text-gray-300 hover:text-red-400 text-xl w-7 h-7 flex items-center justify-center">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                </div>
                <div class="space-y-3">
                <div>
                    <label class="text-xs font-semibold text-gray-500 block mb-1">الرسالة</label>
                    <textarea id="waMessage" rows="5"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-green-400"></textarea>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <button onclick="setWaTemplate('reminder')"
                    class="text-xs border border-gray-200 rounded-xl px-2 py-2 hover:border-green-400 hover:text-green-600 transition font-semibold">
                    📅 تذكير موعد
                    </button>
                    <button onclick="setWaTemplate('thanks')"
                    class="text-xs border border-gray-200 rounded-xl px-2 py-2 hover:border-green-400 hover:text-green-600 transition font-semibold">
                    🙏 شكر زيارة
                    </button>
                    <button onclick="setWaTemplate('followup')"
                    class="text-xs border border-gray-200 rounded-xl px-2 py-2 hover:border-green-400 hover:text-green-600 transition font-semibold">
                    💊 متابعة
                    </button>
                </div>
                <button id="waSendBtn"
                    class="w-full py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition"
                    style="background:#25d366;"
                    onclick="sendWhatsApp()">
                    <i class="fa-brands fa-whatsapp"></i> فتح واتساب
                </button>
                </div>
            </div>
            </div>`);
        }

        let _waPhone = '', _waName = '', _waPatientId = null;

        window.openWhatsAppModal = async function(phone, name, patientId) {
            injectWhatsAppModal();
            _waPhone = phone;
            _waName  = name;
            _waPatientId = patientId;

            // جيب أول موعد قادم للمريض
            let nextAppt = null;
            try {
                const appts = await window.dbGetAll('appointments', { patient_id: patientId });
                const today = new Date().toISOString().split('T')[0];
                const upcoming = appts.filter(a => a.date >= today && a.status !== 'Cancelled')
                                    .sort((a,b) => a.date.localeCompare(b.date));
                nextAppt = upcoming[0] || null;
            } catch(e) {}

            window._waNextAppt = nextAppt;
            setWaTemplate('reminder');
            openModal('whatsappModal');
        };

        window.setWaTemplate = function(type) {
            const name   = _waName;
            const appt   = window._waNextAppt;
            const s      = typeof getSettings === 'function' ? getSettings() : {};
            const clinic = s.clinicName || 'العيادة';
            let msg = '';
            if (type === 'reminder') {
                msg = appt
                    ? `السلام عليكم ${name},\nنذكركم بموعدكم في ${clinic}\nالتاريخ: ${appt.date}${appt.time ? '  الوقت: ' + appt.time : ''}\nفي انتظاركم.`
                    : `السلام عليكم ${name},\nيسعدنا تذكيركم بمتابعة علاجكم في ${clinic}.\nيرجى التواصل لتحديد موعد.`;
            } else if (type === 'thanks') {
                msg = `شكراً ${name} على زيارتكم لـ ${clinic}.\nنتمنى لكم الصحة والسلامة.\nفي انتظار زيارتكم القادمة.`;
            } else if (type === 'followup') {
                msg = `السلام عليكم ${name},\nفريق ${clinic} يتمنى لكم الصحة والعافية.\nهل تحتاجون أي متابعة بعد الجلسة الأخيرة؟`;
            }
            document.getElementById('waMessage').value = msg;
        };

        window.sendWhatsApp = function() {
            const msg = document.getElementById('waMessage').value.trim();
            if (!msg || !_waPhone) return;
            const url = `https://wa.me/${_waPhone}?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
            closeModal('whatsappModal');
        };


        // ════════════════════════════════════════════════════════
        //  ٢. Dashboard — كارتين جديدين
        // ════════════════════════════════════════════════════════

        const _origUpdateDashboard = window.updateDashboard || updateDashboard;

        async function updateDashboardExtra() {
            try {
                const treatments = await window.dbGetAll('treatments');
                const patients   = await window.dbGetAll('patients');
                const curr       = typeof getCurrency === 'function' ? getCurrency() : 'EGP';

                // أكثر إجراء اليوم
                const todayStr = new Date().toISOString().split('T')[0];
                const todayTr  = treatments.filter(tr => tr.date === todayStr);
                const procCount = {};
                todayTr.forEach(tr => {
                    const p = (tr.procedure || '').trim();
                    if (p) procCount[p] = (procCount[p] || 0) + 1;
                });
                const topProc = Object.entries(procCount).sort((a,b) => b[1]-a[1])[0];

                // مرضى جدد الشهر
                const thisMonth = todayStr.slice(0,7);
                const newThisMonth = patients.filter(p =>
                    (p.created_at || p.createdAt || '').startsWith(thisMonth)
                ).length;

                // حدّث الكارتين
                const topEl  = document.getElementById('dashTopProc');
                const newEl  = document.getElementById('dashNewPatients');
                if (topEl)  topEl.innerText  = topProc ? `${topProc[0]} (${topProc[1]})` : '—';
                if (newEl)  newEl.innerText  = newThisMonth;
            } catch(e) {}
        }

        // Patch updateDashboard
        window.updateDashboard = async function() {
            if (typeof _origUpdateDashboard === 'function') await _origUpdateDashboard();
            await updateDashboardExtra();
        };

        // أضف الكارتين في الـ DOM بعد التحميل
        function injectDashboardCards() {
            const grid = document.querySelector('#dashboardView .grid.grid-cols-2.lg\\:grid-cols-4');
            if (!grid || document.getElementById('dashTopProc')) return;

            grid.insertAdjacentHTML('beforeend', `
                <div class="stat-card border-l-4 border-l-cyan-500">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800 truncate" id="dashTopProc">—</h3>
                        <p class="text-gray-400 text-xs mt-1 font-medium">أكثر إجراء اليوم</p>
                    </div>
                    <div class="w-10 h-10 bg-cyan-50 text-cyan-500 rounded-xl flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-tooth"></i>
                    </div>
                </div>
                <div class="stat-card border-l-4 border-l-purple-500">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-800" id="dashNewPatients">0</h3>
                        <p class="text-gray-400 text-xs mt-1 font-medium">مريض جديد الشهر</p>
                    </div>
                    <div class="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-user-plus"></i>
                    </div>
                </div>
            `);
        }


        // ════════════════════════════════════════════════════════
        //  ٣. فاتورة احترافية
        // ════════════════════════════════════════════════════════

        window.printPatientInvoice = async function(patientId) {
            try {
                const patients = await window.dbGetAll('patients');
                const p        = patients.find(x => x.id == patientId);
                if (!p) return;

                const treatments = await window.dbGetAll('treatments', { patient_id: patientId });
                const s   = typeof getSettings === 'function' ? getSettings() : {};
                const curr = typeof getCurrency === 'function' ? getCurrency() : 'EGP';
                const lang = localStorage.getItem('clinicLang') || 'ar';
                const isAr = lang === 'ar';

                let totalCost = 0, totalPaid = 0;
                treatments.forEach(tr => {
                    totalCost += parseFloat(tr.total_cost || tr.totalCost) || 0;
                    totalPaid += parseFloat(tr.paid) || 0;
                });
                const remaining = totalCost - totalPaid;
                const printDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { year:'numeric', month:'long', day:'numeric' });
                const invNum = `INV-${patientId}-${Date.now().toString().slice(-5)}`;

                const logoHtml = s.logo
                    ? `<img src="${s.logo}" style="height:55px;object-fit:contain;">`
                    : `<div style="width:50px;height:50px;border-radius:10px;background:#eff6ff;font-size:28px;display:flex;align-items:center;justify-content:center;">🦷</div>`;

                const win = window.open('', '_blank', 'width=820,height:1100');
                win.document.write(`<!DOCTYPE html><html dir="${isAr?'rtl':'ltr'}"><head><meta charset="UTF-8">
                <title>Invoice — ${p.name}</title>
                <style>
                    *{box-sizing:border-box;margin:0;padding:0;}
                    body{font-family:${isAr?"'Cairo',Arial":"'Segoe UI',Arial"},sans-serif;background:#fff;color:#1e293b;padding:36px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
                    .page{max-width:740px;margin:0 auto;}
                    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e2e8f0;}
                    .clinic-name{font-size:22px;font-weight:800;color:#1d4ed8;}
                    .clinic-sub{font-size:12px;color:#64748b;margin-top:3px;}
                    .inv-tag{background:#1d4ed8;color:#fff;padding:6px 16px;border-radius:8px;font-size:12px;font-weight:700;text-align:center;}
                    .inv-num{font-size:11px;color:#94a3b8;margin-top:4px;text-align:center;}
                    .patient-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;}
                    .pt-name{font-size:17px;font-weight:800;color:#0f172a;}
                    .pt-meta{font-size:12px;color:#64748b;margin-top:4px;}
                    .badge-settled{background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;}
                    .badge-due{background:#fee2e2;color:#dc2626;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;}
                    table{width:100%;border-collapse:collapse;margin-bottom:20px;}
                    thead th{background:#1d4ed8;color:#fff;padding:10px 14px;font-size:11px;font-weight:600;text-align:${isAr?'right':'left'};}
                    tbody tr:nth-child(even){background:#f8fafc;}
                    tbody td{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#374151;}
                    .totals{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;width:260px;margin-${isAr?'right':'left'}:auto;}
                    .tot-row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;}
                    .tot-final{border-top:2px solid #e2e8f0;margin-top:8px;padding-top:10px;font-size:15px;font-weight:800;}
                    .footer{margin-top:32px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;}
                    @media print{@page{margin:10mm;size:A4}body{padding:0}}
                </style></head><body>
                <div class="page">
                    <div class="header">
                        <div>
                            <div class="clinic-name">${s.clinicName || 'Dental Clinic'}</div>
                            ${s.doctorName ? `<div class="clinic-sub">👨‍⚕️ ${s.doctorName}</div>` : ''}
                            <div class="clinic-sub">${[s.phone, s.address].filter(Boolean).join(' · ')}</div>
                        </div>
                        <div style="text-align:center;">${logoHtml}</div>
                        <div>
                            <div class="inv-tag">${isAr ? 'فاتورة' : 'INVOICE'}</div>
                            <div class="inv-num">${invNum}</div>
                            <div style="font-size:11px;color:#64748b;margin-top:4px;">${printDate}</div>
                        </div>
                    </div>

                    <div class="patient-box">
                        <div>
                            <div class="pt-name">${p.name}</div>
                            <div class="pt-meta">${[p.phone, p.age ? (isAr ? p.age+' سنة' : p.age+' yrs') : ''].filter(Boolean).join(' · ')}</div>
                        </div>
                        <div class="${remaining <= 0 ? 'badge-settled' : 'badge-due'}">
                            ${remaining <= 0 ? (isAr ? 'مسدد ✓' : 'Settled ✓') : (isAr ? 'متبقي' : 'Balance Due')}
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>${isAr ? 'الإجراء' : 'Procedure'}</th>
                                <th>${isAr ? 'السن' : 'Tooth'}</th>
                                <th>${isAr ? 'التاريخ' : 'Date'}</th>
                                <th>${isAr ? 'التكلفة' : 'Cost'}</th>
                                <th>${isAr ? 'المدفوع' : 'Paid'}</th>
                                <th>${isAr ? 'المتبقي' : 'Due'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${treatments.map(tr => {
                                const cost = parseFloat(tr.total_cost || tr.totalCost) || 0;
                                const paid = parseFloat(tr.paid) || 0;
                                const due  = cost - paid;
                                return `<tr>
                                    <td><strong>${tr.procedure || '—'}</strong></td>
                                    <td>${tr.tooth_number || tr.toothNumber || '—'}</td>
                                    <td>${tr.date || '—'}</td>
                                    <td>${cost.toLocaleString()} ${curr}</td>
                                    <td style="color:#16a34a;font-weight:600;">${paid.toLocaleString()} ${curr}</td>
                                    <td style="color:${due>0?'#dc2626':'#16a34a'};font-weight:600;">${due > 0 ? due.toLocaleString()+' '+curr : '✓'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>

                    <div class="totals">
                        <div class="tot-row"><span style="color:#64748b;">${isAr ? 'إجمالي التكلفة' : 'Total Cost'}</span><span style="font-weight:700;">${totalCost.toLocaleString()} ${curr}</span></div>
                        <div class="tot-row"><span style="color:#16a34a;">${isAr ? 'إجمالي المدفوع' : 'Total Paid'}</span><span style="color:#16a34a;font-weight:700;">${totalPaid.toLocaleString()} ${curr}</span></div>
                        <div class="tot-row tot-final"><span>${isAr ? 'المتبقي' : 'Balance Due'}</span><span style="color:${remaining>0?'#dc2626':'#16a34a'}">${remaining > 0 ? remaining.toLocaleString()+' '+curr : (isAr ? 'مسدد ✓' : 'Settled ✓')}</span></div>
                    </div>

                    <div class="footer">
                        <span>${s.clinicName || 'Dental Clinic'} — ${isAr ? 'وثيقة مالية رسمية' : 'Official Financial Document'}</span>
                        <span>${printDate}</span>
                    </div>
                </div>
                <script>window.onload=()=>{window.print();}<\/script>
                </body></html>`);
                win.document.close();
            } catch(e) {
                console.error('[Invoice]', e);
                if (typeof showToast === 'function') showToast('خطأ في طباعة الفاتورة', 'error');
            }
        };

        // أضف زر الفاتورة في الـ profile action buttons
        function injectInvoiceButton() {
            const actionBtns = document.getElementById('profileActionButtons');
            if (!actionBtns || document.getElementById('btnPrintInvoice')) return;
            const backBtn = actionBtns.querySelector('button[onclick*="switchView"]');
            const invoiceBtn = document.createElement('button');
            invoiceBtn.id = 'btnPrintInvoice';
            invoiceBtn.className = 'btn btn-outline text-xs';
            invoiceBtn.innerHTML = '<i class="fa-solid fa-file-invoice"></i> فاتورة';
            invoiceBtn.onclick = () => {
                if (typeof currentProfilePatientId !== 'undefined') {
                    window.printPatientInvoice(currentProfilePatientId);
                }
            };
            if (backBtn) actionBtns.insertBefore(invoiceBtn, backBtn);
            else actionBtns.appendChild(invoiceBtn);
        }


        // ════════════════════════════════════════════════════════
        //  ٤. بحث سريع Ctrl+K
        // ════════════════════════════════════════════════════════

        function injectQuickSearch() {
            if (document.getElementById('quickSearchOverlay')) return;
            document.body.insertAdjacentHTML('beforeend', `
            <div id="quickSearchOverlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9999;align-items:flex-start;justify-content:center;padding-top:80px;"
                onclick="if(event.target===this) closeQuickSearch()">
                <div style="background:#fff;border-radius:16px;width:100%;max-width:560px;box-shadow:0 25px 60px rgba(0,0,0,0.25);overflow:hidden;">
                    <div style="display:flex;align-items:center;padding:14px 18px;border-bottom:1px solid #f1f5f9;gap:10px;">
                        <i class="fa-solid fa-magnifying-glass" style="color:#94a3b8;font-size:14px;"></i>
                        <input id="quickSearchInput" type="text" placeholder="ابحث عن مريض، موعد، فاتورة..."
                            style="flex:1;border:none;outline:none;font-size:15px;font-family:inherit;background:transparent;color:#0f172a;"
                            oninput="runQuickSearch(this.value)" onkeydown="handleQSKey(event)">
                        <kbd style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;padding:2px 7px;font-size:11px;color:#94a3b8;font-family:inherit;">ESC</kbd>
                    </div>
                    <div id="quickSearchResults" style="max-height:380px;overflow-y:auto;padding:8px;"></div>
                </div>
            </div>`);
        }

        window.openQuickSearch = function() {
            injectQuickSearch();
            const overlay = document.getElementById('quickSearchOverlay');
            overlay.style.display = 'flex';
            setTimeout(() => document.getElementById('quickSearchInput')?.focus(), 50);
            document.getElementById('quickSearchResults').innerHTML = `
                <div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px;">
                    <i class="fa-solid fa-magnifying-glass" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>
                    ابدأ الكتابة للبحث...
                </div>`;
        };

        window.closeQuickSearch = function() {
            const overlay = document.getElementById('quickSearchOverlay');
            if (overlay) { overlay.style.display = 'none'; }
            const inp = document.getElementById('quickSearchInput');
            if (inp) inp.value = '';
        };

        let _qsTimer = null;
        window.runQuickSearch = async function(q) {
            clearTimeout(_qsTimer);
            const res = document.getElementById('quickSearchResults');
            if (!q || q.trim().length < 1) {
                res.innerHTML = `<div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px;"><i class="fa-solid fa-magnifying-glass" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>ابدأ الكتابة للبحث...</div>`;
                return;
            }
            res.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
            _qsTimer = setTimeout(async () => {
                try {
                    const ql = q.toLowerCase();
                    const [patients, appts, invoices] = await Promise.all([
                        window.dbGetAll('patients'),
                        window.dbGetAll('appointments'),
                        window.dbGetAll('invoices').catch(() => []),
                    ]);

                    const pResults = patients.filter(p =>
                        (p.name||'').toLowerCase().includes(ql) || (p.phone||'').includes(q)
                    ).slice(0,5);

                    const aResults = appts.filter(a =>
                        (a.patient_name||a.patientName||'').toLowerCase().includes(ql) ||
                        (a.date||'').includes(q)
                    ).slice(0,4);

                    const iResults = invoices.filter(i =>
                        (i.patient_name||i.patientName||'').toLowerCase().includes(ql) ||
                        String(i.id||'').includes(q)
                    ).slice(0,3);

                    const total = pResults.length + aResults.length + iResults.length;
                    if (total === 0) {
                        res.innerHTML = `<div style="text-align:center;padding:28px;color:#94a3b8;font-size:13px;"><i class="fa-solid fa-face-frown" style="font-size:28px;display:block;margin-bottom:8px;opacity:0.3;"></i>لا توجد نتائج</div>`;
                        return;
                    }

                    let html = '';

                    if (pResults.length) {
                        html += `<div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;padding:6px 10px 4px;">المرضى</div>`;
                        html += pResults.map((p,i) => `
                            <div class="qs-item" data-idx="${i}" onclick="closeQuickSearch();openPatientProfile(${p.id})"
                                style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;cursor:pointer;transition:background 0.12s;"
                                onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background=''">
                                <div style="width:32px;height:32px;border-radius:8px;background:#dbeafe;color:#2563eb;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${(p.name||'?').charAt(0)}</div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:600;font-size:13px;color:#0f172a;">${p.name}</div>
                                    <div style="font-size:11px;color:#94a3b8;">${p.phone||''}</div>
                                </div>
                                <i class="fa-solid fa-chevron-right" style="color:#cbd5e1;font-size:11px;"></i>
                            </div>`).join('');
                    }

                    if (aResults.length) {
                        html += `<div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;padding:10px 10px 4px;">المواعيد</div>`;
                        html += aResults.map(a => `
                            <div onclick="closeQuickSearch();openPatientProfile(${a.patient_id||a.patientId})"
                                style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;cursor:pointer;transition:background 0.12s;"
                                onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background=''">
                                <div style="width:32px;height:32px;border-radius:8px;background:#dcfce7;color:#16a34a;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-calendar-check"></i></div>
                                <div style="flex:1;">
                                    <div style="font-weight:600;font-size:13px;color:#0f172a;">${a.patient_name||a.patientName||'—'}</div>
                                    <div style="font-size:11px;color:#94a3b8;">${a.date} ${a.time ? '· '+a.time : ''} · ${a.status||''}</div>
                                </div>
                                <i class="fa-solid fa-chevron-right" style="color:#cbd5e1;font-size:11px;"></i>
                            </div>`).join('');
                    }

                    if (iResults.length) {
                        html += `<div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;padding:10px 10px 4px;">الفواتير</div>`;
                        html += iResults.map(i => `
                            <div onclick="closeQuickSearch();switchView('invoices')"
                                style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;cursor:pointer;transition:background 0.12s;"
                                onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background=''">
                                <div style="width:32px;height:32px;border-radius:8px;background:#fef3c7;color:#d97706;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-file-invoice"></i></div>
                                <div style="flex:1;">
                                    <div style="font-weight:600;font-size:13px;color:#0f172a;">${i.patient_name||i.patientName||'—'}</div>
                                    <div style="font-size:11px;color:#94a3b8;">#${i.id} · ${i.date||''}</div>
                                </div>
                                <i class="fa-solid fa-chevron-right" style="color:#cbd5e1;font-size:11px;"></i>
                            </div>`).join('');
                    }
                    res.innerHTML = html;
                } catch(e) {
                    res.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;font-size:12px;">حدث خطأ أثناء البحث</div>`;
                }
            }, 180);
        };

        window.handleQSKey = function(e) {
            if (e.key === 'Escape') closeQuickSearch();
        };

        // Ctrl+K shortcut
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                openQuickSearch();
            }
            if (e.key === 'Escape') closeQuickSearch();
        });


        // ════════════════════════════════════════════════════════
        //  INIT
        // ════════════════════════════════════════════════════════

        function init() {
            injectDashboardCards();
            injectInvoiceButton();

            // أعد inject الـ invoice button كل ما بروفايل يتفتح
            const _oPP = window.openPatientProfile;
            if (_oPP && !_oPP._ewPatched) {
                const wrapped = async function(id) {
                    await _oPP(id);
                    setTimeout(injectInvoiceButton, 250);
                };
                wrapped._ewPatched = true;
                window.openPatientProfile = wrapped;
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            setTimeout(init, 500);
        }

        console.log('[EasyWins] ✓ loaded — WhatsApp + Dashboard Cards + Invoice + Quick Search');

    })();