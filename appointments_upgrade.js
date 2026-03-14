// ══════════════════════════════════════════════════════════════════
//  appointments_upgrade.js  —  Conflict Detection + Doctor Dropdown
//  يُحمَّل بعد app.js
// ══════════════════════════════════════════════════════════════════

// ── 1. LOAD DOCTORS FROM clinic_users ────────────────────────────
// cached doctor list so the dropdown doesn't hammer the server every time
let _cachedDoctors = null;
let _cachedDoctorsAt = 0;
async function loadDoctorsDropdown() {
    const sel = document.getElementById('appointmentDoctor');
    if (!sel || sel.tagName !== 'SELECT') return;

    try {
        let doctors = [];

        // if we have a cache younger than 1 minute, reuse it
        if (_cachedDoctors && (Date.now() - _cachedDoctorsAt) < 60000) {
            doctors = _cachedDoctors;
        } else if (window._sbReady && window._sbReady()) {
            const { data, error } = await window._sb
                .from('clinic_users')
                .select('id, name_en, name_ar, role')
                .eq('role', 'doctor')
                .eq('is_active', true);
            if (!error && data && data.length) {
                doctors = data;
                _cachedDoctors = doctors;
                _cachedDoctorsAt = Date.now();
            }
        }

        if (!doctors.length) {
            const s = getSettings();
            const fallbackName = s.doctorName || 'Dr. Admin';
            sel.innerHTML = `<option value="${fallbackName}">${fallbackName}</option>`;
            return;
        }

    } catch (e) {
        console.warn('[Doctors] Dropdown fallback:', e.message);
        const s = getSettings();
        const fallbackName = s.doctorName || 'Dr. Admin';
        sel.innerHTML = `<option value="${fallbackName}">${fallbackName}</option>`;
    }
}

// ── 2. CONFLICT DETECTION ─────────────────────────────────────────
async function checkAppointmentConflict(date, time, doctor, durationMins, excludeId) {
    if (!date || !time || !doctor || !durationMins) {
        return { conflict: false, message: '', existingAppt: null };
    }

    const allAppts = await dbGetAll('appointments');
    const sameDay  = allAppts.filter(a => {
        return a.date === date &&
               a.doctor === doctor &&
               (a.status || '') !== 'Cancelled' &&
               (excludeId == null || a.id != excludeId);
    });

    function toMins(t) {
        if (!t) return 0;
        const parts = t.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }

    const newStart = toMins(time);
    const newEnd   = newStart + parseInt(durationMins);

    for (const appt of sameDay) {
        const existStart = toMins(appt.time);
        const existDur   = parseInt(appt.duration_mins || appt.durationMins || 30);
        const existEnd   = existStart + existDur;

        if (newStart < existEnd && existStart < newEnd) {
            const pName = appt.patient_name || appt.patientName || 'مريض';
            const endHH  = String(Math.floor(existEnd / 60)).padStart(2, '0');
            const endMM  = String(existEnd % 60).padStart(2, '0');
            const startHH = String(Math.floor(existStart / 60)).padStart(2, '0');
            const startMM = String(existStart % 60).padStart(2, '0');
            return {
                conflict: true,
                message: `تعارض مع موعد ${pName} (${startHH}:${startMM} – ${endHH}:${endMM})`,
                existingAppt: appt
            };
        }
    }

    return { conflict: false, message: '', existingAppt: null };
}

// ── 3. LIVE BOOKED SLOTS HINT ─────────────────────────────────────
// prevent re-definition if another patch already provided a debounced version
if (!window._appointmentsRefreshDefined) {
    window._appointmentsRefreshDefined = true;

    async function refreshBookedSlots() {
        const date     = document.getElementById('appointmentDate')   ? document.getElementById('appointmentDate').value   : '';
        const time     = document.getElementById('appointmentTime')   ? document.getElementById('appointmentTime').value   : '';
        const doctor   = document.getElementById('appointmentDoctor') ? document.getElementById('appointmentDoctor').value : '';
        const durEl    = document.getElementById('appointmentDuration');
        const duration = durEl ? durEl.value : 30;
        const hintEl   = document.getElementById('bookedSlotsHint');
        const warnEl   = document.getElementById('apptConflictWarning');

        if (!date || !doctor) {
            if (hintEl) hintEl.innerHTML = '';
            if (warnEl) { warnEl.style.display = 'none'; warnEl.innerHTML = ''; }
            return;
        }

        const allAppts = await dbGetAll('appointments');
        const dayAppts = allAppts.filter(a =>
            a.date === date && a.doctor === doctor && (a.status || '') !== 'Cancelled'
        ).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

        if (hintEl) {
            if (dayAppts.length === 0) {
                hintEl.innerHTML = `<div style="color:#16a34a;font-size:11px;padding:6px 10px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-top:4px;">
                    ✅ لا توجد مواعيد محجوزة لهذا الطبيب في هذا اليوم</div>`;
            } else {
                hintEl.innerHTML = `<div style="font-size:11px;padding:6px 10px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;color:#1d4ed8;margin-top:4px;">
                    <strong>📅 مواعيد ${doctor} يوم ${date}:</strong><br>` +
                    dayAppts.map(a => {
                        const dur  = parseInt(a.duration_mins || a.durationMins || 30);
                        const hh   = parseInt((a.time || '00:00').split(':')[0]);
                        const mm   = parseInt((a.time || '00:00').split(':')[1]);
                        const mins = hh * 60 + mm;
                        const end  = mins + dur;
                        const endStr = String(Math.floor(end/60)).padStart(2,'0') + ':' + String(end%60).padStart(2,'0');
                        const pName = a.patient_name || a.patientName || '—';
                        return `• ${a.time}–${endStr} <strong>${pName}</strong>`;
                    }).join('<br>') + `</div>`;
            }
        }

        if (time && warnEl) {
            const result = await checkAppointmentConflict(date, time, doctor, duration);
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
                    <span style="margin-right:6px;margin-left:6px">✅ الوقت متاح — لا يوجد تعارض</span>`;
            }
        }
    }

    // expose inside the if block so the function is defined before assignment
    window.refreshBookedSlots = refreshBookedSlots;
}

// ── 4. INTERCEPT FORM SUBMIT ──────────────────────────────────────
(function patchAppointmentForm() {
    window.addEventListener('load', function() {
        const form = document.getElementById('newAppointmentForm');
        if (!form) return;

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            const dateEl   = document.getElementById('appointmentDate');
            const timeEl   = document.getElementById('appointmentTime');
            const doctorEl = document.getElementById('appointmentDoctor');
            const durEl    = document.getElementById('appointmentDuration');
            const warnEl   = document.getElementById('apptConflictWarning');

            const date     = dateEl   ? dateEl.value   : '';
            const time     = timeEl   ? timeEl.value   : '';
            const doctor   = doctorEl ? doctorEl.value : '';
            const duration = durEl    ? parseInt(durEl.value) : 30;

            if (!date || !time || !doctor) {
                if (typeof showToast === 'function') showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
                return;
            }

            const result = await checkAppointmentConflict(date, time, doctor, duration);

            if (result.conflict) {
                // Shake
                form.style.animation = 'apptShake 0.4s';
                setTimeout(() => { form.style.animation = ''; }, 450);

                if (warnEl) {
                    warnEl.style.display = 'flex';
                    warnEl.style.background = '#fff1f2';
                    warnEl.style.borderColor = '#fda4af';
                    warnEl.style.color = '#be123c';
                    warnEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="flex-shrink:0;margin-top:2px"></i>
                        <span style="margin-right:6px;margin-left:6px">⚠️ ${result.message} — يرجى اختيار وقت آخر</span>`;
                    warnEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                return;
            }

            // ── Save appointment ──
            const sel = document.getElementById('appointmentPatientId');
            if (!sel || !sel.value) {
                if (typeof showToast === 'function') showToast('يرجى اختيار المريض', 'error');
                return;
            }

            const selectedOpt = sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
            const patientName = selectedOpt ? selectedOpt.text : '';
            const complaintEl = document.getElementById('appointmentComplaint');

            await dbInsert('appointments', {
                patient_id:    parseInt(sel.value),
                patient_name:  patientName,
                date:          date,
                time:          time,
                doctor:        doctor,
                complaint:     complaintEl ? (complaintEl.value.trim() || '') : '',
                status:        'Waiting',
                duration_mins: duration
            });

            form.reset();
            if (dateEl) dateEl.value = typeof today === 'function' ? today() : new Date().toISOString().split('T')[0];

            closeModal('addAppointmentModal');
            if (typeof updateDashboard  === 'function') updateDashboard();
            if (typeof loadAppointments === 'function') loadAppointments();
            if (typeof showToast === 'function') {
                const lang = typeof currentLang !== 'undefined' ? currentLang : 'en';
                showToast(lang === 'ar' ? 'تم حجز الموعد ✓' : 'Appointment booked ✓');
            }
        }, true); // capture=true — runs before app.js listener
    });
})();

// ── 5. PATCH openModal ────────────────────────────────────────────
(function() {
    const _orig = window.openModal;
    window.openModal = function(modalId, extra) {
        if (_orig) _orig(modalId, extra);
        else {
            const m = document.getElementById(modalId);
            if (m) m.classList.add('open');
        }
        if (modalId === 'addAppointmentModal') {
            const warnEl = document.getElementById('apptConflictWarning');
            const hintEl = document.getElementById('bookedSlotsHint');
            if (warnEl) { warnEl.style.display = 'none'; warnEl.innerHTML = ''; }
            if (hintEl) hintEl.innerHTML = '';
            setTimeout(loadDoctorsDropdown, 80);
        }
    };
})();

// ── 6. PATCH setLanguage ──────────────────────────────────────────
(function() {
    const _orig = window.setLanguage;
    window.setLanguage = function(lang) {
        if (_orig) _orig(lang);
        const sel = document.getElementById('appointmentDoctor');
        if (sel && sel.tagName === 'SELECT') setTimeout(loadDoctorsDropdown, 100);
    };
})();

// ── 7. STYLES ─────────────────────────────────────────────────────
(function() {
    if (document.getElementById('apptUpgradeStyle')) return;
    const style = document.createElement('style');
    style.id = 'apptUpgradeStyle';
    style.textContent = `
        @keyframes apptShake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-8px)}
            40%{transform:translateX(8px)}
            60%{transform:translateX(-5px)}
            80%{transform:translateX(5px)}
        }
        #apptConflictWarning {
            display: none;
            align-items: flex-start;
            padding: 10px 12px;
            border-radius: 10px;
            border: 1.5px solid #fda4af;
            background: #fff1f2;
            color: #be123c;
            font-size: 12.5px;
            font-weight: 500;
            margin-top: 6px;
            transition: all 0.2s;
        }
        #bookedSlotsHint { margin-top: 2px; }
        #appointmentDuration { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 11px; padding: 10px 14px; font-size: 13.5px; outline: none; transition: border-color .18s; }
        #appointmentDuration:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
    `;
    document.head.appendChild(style);
})();

// ── 8. EXPOSE ─────────────────────────────────────────────────────
window.loadDoctorsDropdown      = loadDoctorsDropdown;
window.checkAppointmentConflict = checkAppointmentConflict;