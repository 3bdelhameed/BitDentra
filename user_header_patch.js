// ══════════════════════════════════════════════════════════════════
//  user_header_patch.js
//  تحديث اسم المستخدم والصلاحية في الـ Header بناءً على بيانات تسجيل الدخول
// ══════════════════════════════════════════════════════════════════

(function updateHeaderUserInfo() {
    'use strict';

    function applyUserData() {
        // 1. جلب اسم اليوزر وصلاحيته من الـ Session بعد تسجيل الدخول
        const userName = sessionStorage.getItem('clinicUserName') || sessionStorage.getItem('clinicUsername') || 'مستخدم';
        const role = sessionStorage.getItem('clinicRole') || 'admin';
        const lang = localStorage.getItem('clinicLang') || 'ar';

        // 2. ترجمة وتنسيق المسميات الوظيفية
        const ROLE_LABELS = {
            admin:     { ar: 'مدير النظام',   en: 'System Admin' },
            doctor:    { ar: 'طبيب',           en: 'Doctor' },
            reception: { ar: 'استقبال',        en: 'Receptionist' }
        };
        const roleText = ROLE_LABELS[role] ? ROLE_LABELS[role][lang] : (role === 'admin' ? 'مدير النظام' : role);

        // 3. الطريقة المباشرة والمضمونة 100% (باستخدام الـ IDs الموجودة في ملف index.html)
        const nameEl = document.getElementById('headerUsername');
        const roleEl = document.getElementById('headerRoleLabel');
        const avatarEl = document.getElementById('headerAvatar');

        if (nameEl) {
            nameEl.textContent = userName;
            nameEl.removeAttribute('data-t'); // إزالة الترجمة لمنع إرجاع الكلمة الافتراضية
        }
        
        if (roleEl) {
            roleEl.textContent = roleText;
            roleEl.removeAttribute('data-t');
        }
        
        if (avatarEl) {
            // تحديث الحرف الأول في الدائرة الرمزية
            avatarEl.textContent = userName.charAt(0).toUpperCase();
        }

        // 4. (احتياطي) لو الـ IDs غير موجودة في بعض الشاشات
        const fallbackNames = document.querySelectorAll('[data-t="header.clinicAdmin"]');
        fallbackNames.forEach(el => {
            el.textContent = userName;
            el.removeAttribute('data-t');
            if (el.parentElement) {
                const rEl = el.parentElement.querySelector('.text-gray-400');
                if (rEl) {
                    rEl.textContent = roleText;
                    rEl.removeAttribute('data-t');
                }
            }
        });
    }

    // التشغيل فور تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyUserData);
    } else {
        applyUserData();
    }

    // تأكيد التشغيل لضمان التغلب على أي تأخير في التحميل
    setTimeout(applyUserData, 200);
    setTimeout(applyUserData, 800);
    setTimeout(applyUserData, 2000);
    
    // ربط الدالة بحدث تغيير اللغة
    const origSwitchLang = window.switchLang;
    if (typeof origSwitchLang === 'function') {
        window.switchLang = function(lang) {
            origSwitchLang(lang);
            setTimeout(applyUserData, 100);
        };
    }
})();