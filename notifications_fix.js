// ══════════════════════════════════════════════════════════════════
//  notifications_fix.js
//  إصلاح شامل لنظام الإشعارات (Toast + Badge)
//
//  المشاكل المُصلحة:
//  1. إضافة ألوان CSS لـ warning و info
//  2. Icon صح لكل نوع إشعار
//  3. منع تراكم الـ Toasts (clearTimeout)
//  4. Badge count صح (overdue + tomorrow + today)
// ══════════════════════════════════════════════════════════════════

// ── 1. إضافة CSS للأنواع المفقودة ───────────────────────────────
(function injectToastStyles() {
    if (document.getElementById('notifFixStyles')) return;
    const style = document.createElement('style');
    style.id = 'notifFixStyles';
    style.textContent = `
        /* Warning Toast — برتقالي */
        .toast.warning {
            background: #92400e;
            border-left: 4px solid #f59e0b;
        }
        /* Info Toast — أزرق */
        .toast.info {
            background: #1e3a5f;
            border-left: 4px solid #3b82f6;
        }
        /* Dark mode overrides */
        body.dark .toast.success  { background: #14532d; border-left: 4px solid #22c55e; }
        body.dark .toast.error    { background: #7f1d1d; border-left: 4px solid #ef4444; }
        body.dark .toast.warning  { background: #78350f; border-left: 4px solid #f59e0b; }
        body.dark .toast.info     { background: #1e3a5f; border-left: 4px solid #3b82f6; }

        /* Toast أوسع قليلاً عشان النص العربي */
        .toast {
            max-width: 360px;
            min-width: 220px;
        }

        /* أيقونة Toast */
        .toast i {
            flex-shrink: 0;
            font-size: 15px;
        }

        /* Badge animation */
        #notifBadge {
            transition: transform 0.2s ease;
        }
        #notifBadge.bump {
            transform: scale(1.5);
        }
    `;
    document.head.appendChild(style);
})();

// ── 2. showToast مُحسّن ────────────────────────────────────────────
(function patchShowToast() {
    // Icon map — أيقونة مناسبة لكل نوع
    const ICONS = {
        success: 'fa-circle-check',
        error:   'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info:    'fa-circle-info',
    };

    let _toastTimer = null;   // نتتبع الـ timer عشان نلغيه لو جاء toast جديد

    window.showToast = function(msg, type = 'success') {
        const t = document.getElementById('toast');
        if (!t) return;

        // ألغِ الـ timer القديم عشان ما يشيلش الـ toast الجديد قبل وقته
        if (_toastTimer) {
            clearTimeout(_toastTimer);
            _toastTimer = null;
        }

        // شيل الـ show أولاً عشان يعمل re-animation لو نفس الـ toast
        t.classList.remove('show');

        const iconClass = ICONS[type] || ICONS.info;

        // استخدم requestAnimationFrame عشان يضمن إن الـ animation تحصل
        requestAnimationFrame(() => {
            t.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${msg}`;
            t.className = `toast ${type} show`;

            _toastTimer = setTimeout(() => {
                t.classList.remove('show');
                _toastTimer = null;
            }, 3500);
        });
    };

    // اعمله global
    window.showToast = window.showToast;
})();

// ── 3. إصلاح Badge count (يشمل today + tomorrow + overdue) ──────
(function patchCheckReminders() {
    const _orig = window.checkReminders;

    window.checkReminders = async function () {
        // شغّل الـ function الأصلية الأول عشان تحدّث الـ lists
        if (typeof _orig === 'function') {
            try { await _orig.apply(this, arguments); } catch(e) {}
        }

        // إعادة حساب الـ badge بشكل صح
        try {
            const appts = await window.dbGetAll('appointments');
            const now   = new Date();
            const todayStr    = now.toISOString().split('T')[0];
            const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

            const todayCount    = appts.filter(a => a.date === todayStr    && a.status !== 'Cancelled').length;
            const tomorrowCount = appts.filter(a => a.date === tomorrowStr && a.status !== 'Cancelled').length;
            const overdueCount  = appts.filter(a => a.date <  todayStr    && a.status === 'Waiting').length;

            // Badge = overdue + today + tomorrow (ما هو مهم للمستخدم)
            const total = overdueCount + todayCount + tomorrowCount;

            const badge = document.getElementById('notifBadge');
            if (badge) {
                badge.textContent = total > 99 ? '99+' : total;

                if (total > 0) {
                    badge.classList.remove('hidden');
                    badge.classList.add('flex');

                    // لون الـ badge بحسب الأولوية
                    if (overdueCount > 0) {
                        badge.style.background = '#ef4444'; // أحمر — فيه فائت
                    } else if (todayCount > 0) {
                        badge.style.background = '#f97316'; // برتقالي — مواعيد النهارده
                    } else {
                        badge.style.background = '#3b82f6'; // أزرق — بكره بس
                    }

                    // Animation بسيطة لما يتحدث العدد
                    badge.classList.add('bump');
                    setTimeout(() => badge.classList.remove('bump'), 200);
                } else {
                    badge.classList.add('hidden');
                    badge.classList.remove('flex');
                }
            }

            // Tooltip مفصّل على زر الجرس
            const bell = document.getElementById('notifBell');
            if (bell) {
                const parts = [];
                if (overdueCount  > 0) parts.push(`${overdueCount} فائت`);
                if (todayCount    > 0) parts.push(`${todayCount} اليوم`);
                if (tomorrowCount > 0) parts.push(`${tomorrowCount} غداً`);
                bell.title = parts.length > 0 ? parts.join(' · ') : 'لا توجد مواعيد';
            }

        } catch(e) {
            console.warn('[NotifFix] Badge update failed:', e);
        }
    };
})();

console.log('[NotificationsFixPatch] ✅ Loaded — toast + badge fixed');
