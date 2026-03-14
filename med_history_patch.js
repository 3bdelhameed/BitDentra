/**
 * med_history_patch.js
 * - Removes "Pregnancy" from medical checkboxes (already in dedicated field)
 * - Adds Hyperthyroidism, Hypothyroidism, Chemotherapy
 */
(function patchMedHistory() {
    function applyPatch() {
        const container = document.getElementById('medHistoryCheckboxes');
        if (!container) return;

        // 1. Remove "Pregnancy" checkbox label
        container.querySelectorAll('label').forEach(label => {
            const cb = label.querySelector('input[type="checkbox"]');
            if (cb && cb.value === 'Pregnancy') {
                label.remove();
            }
        });

        // 2. Add new conditions if not already present
        const existing = Array.from(container.querySelectorAll('input[type="checkbox"]'))
                              .map(cb => cb.value);

        const newConditions = ['Hyperthyroidism', 'Hypothyroidism', 'Chemotherapy'];

        newConditions.forEach(condition => {
            if (existing.includes(condition)) return; // already exists

            const label = document.createElement('label');
            label.className = 'flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer hover:text-blue-600';
            label.innerHTML = `
                <input type="checkbox" class="med-hist-cb rounded" value="${condition}">
                ${condition}
            `;
            container.appendChild(label);
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyPatch);
    } else {
        applyPatch();
    }

    // Also hook openModal to re-apply when modal opens (in case form resets)
    const _origOpen = window.openModal;
    window.openModal = function(id) {
        if (typeof _origOpen === 'function') _origOpen(id);
        if (id === 'addPatientModal') {
            setTimeout(applyPatch, 50);
        }
    };
})();
