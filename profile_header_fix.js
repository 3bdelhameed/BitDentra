(function () {
    'use strict';

    function splitProfileMetaParts(value) {
        return String(value || '')
            .split(/\s*(?:·|Â·|\|)\s*/g)
            .map(part => part.trim())
            .filter(Boolean);
    }

    function looksLikePhoneValue(value) {
        const text = String(value || '').trim();
        if (!text) return false;
        if (/[A-Za-z\u0600-\u06FF]/.test(text)) return false;
        return /[\d+]/.test(text);
    }

    function isValidProfilePhone(value) {
        const digits = String(value || '').replace(/\D/g, '');
        return digits.length >= 7 && !/^0+$/.test(digits);
    }

    function toWhatsAppPhone(value) {
        let digits = String(value || '').replace(/\D/g, '');
        if (!digits || /^0+$/.test(digits)) return '';
        if (digits.startsWith('00')) digits = digits.slice(2);
        if (digits.startsWith('0')) digits = '20' + digits.slice(1);
        return digits.length >= 10 ? digits : '';
    }

    function parseMoneyValue(value) {
        const match = String(value || '')
            .replace(/,/g, '')
            .match(/-?\d+(?:\.\d+)?/);
        return match ? Number(match[0]) : 0;
    }

    function syncProfileFinancialCards() {
        const cards = document.querySelectorAll('#profileInfoCards > .stat-card');
        if (!cards || cards.length < 4) return;

        const paidText = document.getElementById('profileTotalPaid')?.textContent?.trim();
        const debtText = document.getElementById('profileTotalDebt')?.textContent?.trim();
        const paidValueEl = cards[2]?.querySelector('p.font-bold');
        const balanceCard = cards[3];
        const balanceValueEl = balanceCard?.querySelector('p.font-bold');

        if (paidText && paidValueEl) {
            paidValueEl.textContent = paidText;
        }

        if (!balanceCard || !balanceValueEl) return;

        const debtValue = parseMoneyValue(debtText);
        const settledText = typeof t === 'function' ? t('patients.settled') : 'Settled ✓';

        balanceCard.classList.remove('border-l-red-400', 'border-l-green-400');
        balanceValueEl.classList.remove('text-red-500', 'text-green-600');

        if (debtText && debtValue > 0.009) {
            balanceCard.classList.add('border-l-red-400');
            balanceValueEl.classList.add('text-red-500');
            balanceValueEl.textContent = debtText;
            return;
        }

        balanceCard.classList.add('border-l-green-400');
        balanceValueEl.classList.add('text-green-600');
        balanceValueEl.textContent = settledText === 'patients.settled' ? 'Settled ✓' : settledText;
    }

    function refreshProfileHeader(patientId) {
        const phoneEl = document.getElementById('profilePhone');
        const nameEl = document.getElementById('profileName');
        const btn = document.getElementById('btnProfileWhatsapp');
        if (!phoneEl || !nameEl) return;

        if (btn) {
            btn.style.display = 'none';
            btn.onclick = null;
            const label = btn.querySelector('[data-t="profile.whatsapp"]');
            if (label) {
                const translated = typeof t === 'function' ? t('profile.whatsapp') : 'WhatsApp';
                label.textContent = translated === 'profile.whatsapp' ? 'WhatsApp' : translated;
            }
        }

        const parts = splitProfileMetaParts(phoneEl.innerText || '');
        if (!parts.length) {
            phoneEl.innerText = '';
            return;
        }

        const firstPart = parts[0] || '';
        const hasValidPhone = isValidProfilePhone(firstPart);
        const shouldDropFirst = !hasValidPhone && looksLikePhoneValue(firstPart);
        const metaParts = parts.slice(hasValidPhone || shouldDropFirst ? 1 : 0);
        const cleanMeta = [
            hasValidPhone ? firstPart.replace(/\s+/g, ' ').trim() : '',
            ...metaParts
        ].filter(Boolean);

        phoneEl.innerText = cleanMeta.join(' · ');

        if (!hasValidPhone || !btn) return;

        const intlPhone = toWhatsAppPhone(firstPart);
        if (!intlPhone) return;

        const patientName = nameEl.innerText || '';
        btn.style.display = 'flex';
        btn.onclick = function (event) {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            if (typeof openWhatsAppModal === 'function') {
                openWhatsAppModal(intlPhone, patientName, patientId);
            }
        };
    }

    function installProfileHeaderPatch() {
        const current = window.openPatientProfile;
        if (typeof current !== 'function' || current._profileHeaderFixWrapped) return false;

        const wrapped = async function (id) {
            const result = await current(id);
            refreshProfileHeader(id);
            syncProfileFinancialCards();
            setTimeout(() => refreshProfileHeader(id), 320);
            setTimeout(syncProfileFinancialCards, 320);
            return result;
        };

        wrapped._profileHeaderFixWrapped = true;
        window.openPatientProfile = wrapped;
        return true;
    }

    function installProfileRefreshPatch(fnName) {
        const current = window[fnName];
        if (typeof current !== 'function' || current._profileFinancialFixWrapped) return false;

        const wrapped = async function () {
            const result = await current.apply(this, arguments);
            syncProfileFinancialCards();
            setTimeout(syncProfileFinancialCards, 80);
            return result;
        };

        wrapped._profileFinancialFixWrapped = true;
        window[fnName] = wrapped;
        return true;
    }

    function bootProfileHeaderFix() {
        installProfileHeaderPatch();
        installProfileRefreshPatch('loadPatientHistory');
        installProfileRefreshPatch('renderSessionPayments');
        installProfileRefreshPatch('refreshPatientHistoryView');

        let attempts = 0;
        const timer = setInterval(() => {
            installProfileHeaderPatch();
            installProfileRefreshPatch('loadPatientHistory');
            installProfileRefreshPatch('renderSessionPayments');
            installProfileRefreshPatch('refreshPatientHistoryView');
            attempts += 1;
            if (attempts >= 8) clearInterval(timer);
        }, 300);

        setTimeout(() => refreshProfileHeader(window.currentProfilePatientId), 700);
        setTimeout(syncProfileFinancialCards, 700);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootProfileHeaderFix);
    } else {
        setTimeout(bootProfileHeaderFix, 0);
    }
})();
