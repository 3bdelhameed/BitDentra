// ══════════════════════════════════════════════════════════════════
//  fix_tooth_display.js  — v2 (FIXED)
//  الإصلاح: إزالة override على loadPatientHistory
//           (session_payments.js هي المسؤولة عن ده)
//  ده الملف بيصلح بس عرض رقم السن في الـ UI
// ══════════════════════════════════════════════════════════════════

// ── Helper: عرض badge السن بشكل صحيح ─────────────────────────────
window.getToothBadgeHTML = function (toothNum) {
    const toothStr = toothNum !== null && toothNum !== undefined && String(toothNum).trim() !== ''
        ? String(toothNum).trim()
        : null;
    return toothStr
        ? `<span style="display:inline-flex;align-items:center;background:#eff6ff;color:#1d4ed8;font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px;border:1px solid #bfdbfe;margin-right:4px;">🦷 ${toothStr}</span>`
        : '';
};

console.log('[Fix] ✅ fix_tooth_display v2 loaded — tooth badge helper ready');
