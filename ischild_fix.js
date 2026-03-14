// ══════════════════════════════════════════════════════════════════
//  child_patient_feature.js
//  Pediatric (Primary) Dental Chart — Palmer Notation
//  نفس نظام البالغ: modal + ألوان + حفظ في DB
//
//  أضف في آخر index.html قبل </body>:
//  <script src="child_patient_feature.js"></script>
// ══════════════════════════════════════════════════════════════════

(function () {
'use strict';

// ── FDI numbers for primary teeth ────────────────────────────────
// Upper right: 55 54 53 52 51 | Upper left: 61 62 63 64 65
// Lower right: 85 84 83 82 81 | Lower left: 71 72 73 74 75

// Palmer letter mapping
const PALMER = {
    16:'6', 26:'6', 46:'6', 36:'6',
    55:'E', 54:'D', 53:'C', 52:'B', 51:'A',
    61:'A', 62:'B', 63:'C', 64:'D', 65:'E',
    85:'E', 84:'D', 83:'C', 82:'B', 81:'A',
    71:'A', 72:'B', 73:'C', 74:'D', 75:'E',
};

// Arch positions (cx, cy, r) — upper arch curves up, lower curves down
const TOOTH_POS = {
    // Upper right (55→51) — right to midline
    16:{cx:58, cy:178,r:24}, 55:{cx:118,cy:155,r:22}, 54:{cx:172,cy:122,r:19},
    53:{cx:220,cy:98, r:16}, 52:{cx:260,cy:80, r:13},
    51:{cx:298,cy:68, r:13},
    // Upper left (61→65) — midline to left
    61:{cx:382,cy:68, r:13}, 62:{cx:420,cy:80, r:13},
    63:{cx:460,cy:98, r:16}, 64:{cx:508,cy:122,r:19},
    65:{cx:562,cy:155,r:22}, 26:{cx:622,cy:178,r:24},
    // Lower right (85→81)
    46:{cx:58, cy:332,r:24}, 85:{cx:118,cy:358,r:22}, 84:{cx:172,cy:392,r:19},
    83:{cx:220,cy:416,r:16}, 82:{cx:260,cy:432,r:13},
    81:{cx:298,cy:444,r:13},
    // Lower left (71→75)
    71:{cx:382,cy:444,r:13}, 72:{cx:420,cy:432,r:13},
    73:{cx:460,cy:416,r:16}, 74:{cx:508,cy:392,r:19},
    75:{cx:562,cy:358,r:22}, 36:{cx:622,cy:332,r:24},
};

// Label positions outside the circle
const LABEL_POS = {
    16:{x:38, y:208}, 26:{x:642,y:208},
    46:{x:38, y:308}, 36:{x:642,y:308},
    55:{x:100,y:182}, 54:{x:156,y:148}, 53:{x:207,y:120},
    52:{x:250,y:100}, 51:{x:310,y:52},
    61:{x:370,y:52},  62:{x:432,y:100}, 63:{x:473,y:120},
    64:{x:524,y:148}, 65:{x:580,y:182},
    85:{x:100,y:338}, 84:{x:154,y:372}, 83:{x:205,y:398},
    82:{x:248,y:414}, 81:{x:310,y:462},
    71:{x:370,y:462}, 72:{x:432,y:414}, 73:{x:475,y:398},
    74:{x:526,y:372}, 75:{x:580,y:338},
};

// Default fill per radius size — neutral beige, no conflict with condition colors
function defaultFill(r) {
    return r >= 20 ? '#e8e0d4' : r >= 15 ? '#ede7dd' : '#f2ede6';
}
const DEFAULT_STROKE = '#b5a898';
const DEFAULT_TEXT   = '#6b5c4e';

// Condition colors (same palette as adult TOOTH_COLORS)
const COND_COLORS = {
    healthy:    { fill: null,      stroke: DEFAULT_STROKE, text: DEFAULT_TEXT },
    treated:    { fill: '#fee2e2', stroke: '#ef4444',      text: '#ef4444'    },
    crown_work: { fill: '#fef3c7', stroke: '#f59e0b',      text: '#d97706'    },
    missing:    { fill: '#f1f5f9', stroke: '#94a3b8',      text: '#94a3b8'    },
    root_canal: { fill: '#cffafe', stroke: '#0891b2',      text: '#0e7490'    },
    implant:    { fill: '#d1fae5', stroke: '#10b981',      text: '#047857'    },
    bridge:     { fill: '#dbeafe', stroke: '#3b82f6',      text: '#1d4ed8'    },
    decay:      { fill: '#fef9c3', stroke: '#ca8a04',      text: '#92400e'    },
    fracture:   { fill: '#ffedd5', stroke: '#f97316',      text: '#c2410c'    },
};

// ── SVG Builder ───────────────────────────────────────────────────
function buildChartSVG(stateMap, selectedNum) {
    const teeth = Object.keys(TOOTH_POS).map(Number);

    // Build circles
    let circles = '';
    teeth.forEach(num => {
        const pos  = TOOTH_POS[num];
        const lbl  = LABEL_POS[num];
        const cond = stateMap[num] || 'healthy';
        const col  = COND_COLORS[cond] || COND_COLORS.healthy;
        const isSel = selectedNum == num;
        const fill   = col.fill || defaultFill(pos.r);
        const stroke = isSel ? '#2563eb' : col.stroke;
        const sw     = isSel ? 2.8 : 1.4;
        const textC  = col.text;
        const letter = PALMER[num];
        const glow   = isSel ? `filter="url(#selGlow)"` : '';

        if (cond === 'missing') {
            // X for missing
            const d = pos.r * 0.55;
            circles += `
            <g class="pt-tooth" id="pt${num}" onclick="clickPrimaryTooth(${num})" style="cursor:pointer;">
                <circle cx="${pos.cx}" cy="${pos.cy}" r="${pos.r}" fill="#f1f5f9" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="4 2" ${glow}/>
                <line x1="${pos.cx-d}" y1="${pos.cy-d}" x2="${pos.cx+d}" y2="${pos.cy+d}" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
                <line x1="${pos.cx+d}" y1="${pos.cy-d}" x2="${pos.cx-d}" y2="${pos.cy+d}" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
            </g>`;
        } else {
            circles += `
            <g class="pt-tooth" id="pt${num}" onclick="clickPrimaryTooth(${num})" style="cursor:pointer;">
                <circle cx="${pos.cx}" cy="${pos.cy}" r="${pos.r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${glow}/>
                <text font-size="${pos.r >= 20 ? 15 : pos.r >= 15 ? 13 : 12}" font-weight="600"
                      x="${pos.cx}" y="${pos.cy}" text-anchor="middle" dominant-baseline="central"
                      fill="${textC}" style="pointer-events:none;">${letter}</text>
            </g>`;
        }

        // Outside label
        circles += `<text font-size="10" x="${lbl.x}" y="${lbl.y}" text-anchor="middle" fill="#64748b" style="pointer-events:none;">${letter}</text>`;
    });

    return `<svg id="primaryChartSVG" width="100%" viewBox="0 0 680 560"
        xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;">
    <defs>
        <filter id="selGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <style>
            .pt-tooth circle { transition: filter 0.15s; }
            .pt-tooth:hover circle { filter: brightness(0.88); }
        </style>
    </defs>

    <!-- UPPER -->
    <text font-size="13" font-weight="500" x="340" y="22" text-anchor="middle" fill="currentColor">Maxillary arch</text>
    <text font-size="11" x="100" y="42"  text-anchor="start" fill="#64748b">Right quadrant</text>
    <text font-size="11" x="580" y="42"  text-anchor="end"   fill="#64748b">Left quadrant</text>
    <text font-size="11" x="62"  y="185" text-anchor="start" fill="#64748b">Right</text>
    <text font-size="11" x="618" y="185" text-anchor="end"   fill="#64748b">Left</text>
    <line x1="340" y1="48" x2="340" y2="210" stroke="#94a3b8" stroke-width="1" stroke-dasharray="5 3"/>
    <path d="M80,188 Q110,160 172,134 Q220,112 260,94 Q298,78 340,72 Q382,78 420,94 Q460,112 508,134 Q570,160 600,188"
          fill="none" stroke="#9580cc" stroke-width="1" opacity="0.2" stroke-dasharray="3 2"/>

    <!-- 6 upper — generated dynamically below -->

    <!-- LEGEND -->
    <rect x="190" y="218" width="300" height="44" rx="8" fill="#f5f2ee" stroke="#c9bfb4" stroke-width="0.8"/>
    <text font-size="10" x="340" y="235" text-anchor="middle" fill="#7a6a5e">A = Central incisor · B = Lateral incisor</text>
    <text font-size="10" x="340" y="251" text-anchor="middle" fill="#7a6a5e">C = Canine · D = First molar · E = Second molar</text>

    <!-- LOWER -->
    <text font-size="13" font-weight="500" x="340" y="548" text-anchor="middle" fill="currentColor">Mandibular arch</text>
    <text font-size="11" x="100" y="286" text-anchor="start" fill="#64748b">Right quadrant</text>
    <text font-size="11" x="580" y="286" text-anchor="end"   fill="#64748b">Left quadrant</text>
    <text font-size="11" x="62"  y="380" text-anchor="start" fill="#64748b">Right</text>
    <text font-size="11" x="618" y="380" text-anchor="end"   fill="#64748b">Left</text>
    <line x1="340" y1="274" x2="340" y2="530" stroke="#94a3b8" stroke-width="1" stroke-dasharray="5 3"/>
    <path d="M80,322 Q110,356 172,378 Q220,400 260,420 Q298,434 340,440 Q382,434 420,420 Q460,400 508,378 Q570,356 600,322"
          fill="none" stroke="#9580cc" stroke-width="1" opacity="0.2" stroke-dasharray="3 2"/>

    <!-- 6 lower — generated dynamically below -->

    ${circles}
</svg>`;
}

// ── State store ───────────────────────────────────────────────────
let _primaryStateMap    = {};   // { toothNum: condition }
let _primaryPatientId   = null;
let _primarySelectedNum = null;

// ── Render primary chart ──────────────────────────────────────────
function renderPrimaryChart(patientId, stateMap) {
    _primaryPatientId = patientId;
    _primaryStateMap  = stateMap || {};

    const upperEl = document.getElementById('upperTeeth');
    const lowerEl = document.getElementById('lowerTeeth');
    if (!upperEl || !lowerEl) return;

    // Hide adult rows
    upperEl.style.display = 'none';
    lowerEl.style.display = 'none';

    let container = document.getElementById('primaryChartContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'primaryChartContainer';
        container.style.cssText = 'width:100%;margin-top:6px;';
        lowerEl.parentElement.insertBefore(container, lowerEl.nextSibling);
    }
    container.innerHTML = buildChartSVG(_primaryStateMap, _primarySelectedNum);

    updateChartLegend(_primaryStateMap);
}

// ── Tooth click ───────────────────────────────────────────────────
window.clickPrimaryTooth = function (num) {
    _primarySelectedNum = num;

    // Redraw selection highlight
    renderPrimaryChart(_primaryPatientId, _primaryStateMap);

    // Set modal title
    const letter = PALMER[num];
    const label  = [16,26,46,36].includes(num) ? `Tooth ${num} (First Permanent Molar)` : `Tooth ${num} (${letter}) — Primary`;
    const titleEl = document.getElementById('toothActionTitle');
    if (titleEl) titleEl.innerText = label;

    if (window.openModal) window.openModal('toothActionModal');
};

// ── Tooth action (same as adult toothAction but saves to DB) ──────
window.primaryToothAction = async function (action) {
    if (window.closeModal) window.closeModal('toothActionModal');

    const patientId = _primaryPatientId;
    const toothNum  = _primarySelectedNum;
    if (!patientId || !toothNum) return;

    if (action === 'treatment') {
        if (window.openModal) window.openModal('addTreatmentModal', toothNum);
        return;
    }

    if (action === 'clear') {
        if (window.dbGetAll) {
            const existing = await dbGetAll('tooth_states', { patient_id: patientId });
            const row = existing.find(r => (r.tooth_number || r.toothNumber) == toothNum);
            if (row) await dbDelete('tooth_states', row.id);
        } else if (window.db) {
            const ex = await db.toothStates.where('patientId').equals(patientId)
                .and(t => t.toothNumber == toothNum).first();
            if (ex) await db.toothStates.delete(ex.id);
        }
        _primaryStateMap[toothNum] = 'healthy';
    } else {
        if (window.dbUpsert) {
            await dbUpsert('tooth_states',
                { patient_id: patientId, tooth_number: String(toothNum), condition: action, surfaces: {} },
                'patient_id,tooth_number'
            );
        } else if (window.db) {
            const ex = await db.toothStates.where('patientId').equals(patientId)
                .and(t => t.toothNumber == toothNum).first();
            if (ex) await db.toothStates.update(ex.id, { condition: action });
            else    await db.toothStates.add({ patientId, toothNumber: String(toothNum), condition: action });
        }
        _primaryStateMap[toothNum] = action;
    }

    _primarySelectedNum = null;
    renderPrimaryChart(patientId, _primaryStateMap);
    if (window.showToast) showToast('Tooth updated ✓');
};

// ── Patch toothActionModal to support both adult + child ──────────
function patchToothActionModal() {
    const modal = document.getElementById('toothActionModal');
    if (!modal || modal._primaryPatched) return;
    modal._primaryPatched = true;

    // Override the adult toothAction to route correctly
    const origToothAction = window.toothAction;
    window.toothAction = async function (action) {
        // If current chart is primary, route to primaryToothAction
        const container = document.getElementById('primaryChartContainer');
        if (container && container.innerHTML.trim() !== '') {
            return window.primaryToothAction(action);
        }
        return origToothAction && origToothAction(action);
    };
}

// ── generateDentalChart override ─────────────────────────────────
function patchGenerateDentalChart() {
    if (typeof window.generateDentalChart !== 'function') {
        setTimeout(patchGenerateDentalChart, 400); return;
    }
    if (window._primaryChartPatched) return;
    window._primaryChartPatched = true;

    const _orig = window.generateDentalChart;

    window.generateDentalChart = async function (patientId) {
        // Determine if child
        let isChild = false;
        try {
            const p = window.db
                ? await window.db.patients.get(patientId)
                : null;
            isChild = p && (p.is_child == 1 || (p.age && parseInt(p.age) < 13));
        } catch(e) {}

        // Clean up old primary container + show adult rows back
        const upperEl = document.getElementById('upperTeeth');
        const lowerEl = document.getElementById('lowerTeeth');
        const container = document.getElementById('primaryChartContainer');

        // Remove old label
        const oldLbl = document.getElementById('primaryTeethLabel');
        if (oldLbl) oldLbl.remove();
        const oldBadge = document.getElementById('childPatientBadge');
        if (oldBadge) oldBadge.remove();

        if (!isChild) {
            if (container) container.innerHTML = '';
            if (upperEl) upperEl.style.display = '';
            if (lowerEl) lowerEl.style.display = '';
            return _orig(patientId);
        }

        // ── Child: load states then render primary chart ──
        let stateMap = {};
        try {
            let states = [];
            if (window.dbGetAll) {
                states = await dbGetAll('tooth_states', { patient_id: patientId });
            } else if (window.db) {
                states = await db.toothStates.where('patientId').equals(patientId).toArray();
            }
            states.forEach(s => {
                const num  = s.tooth_number || s.toothNumber;
                const cond = s.condition;
                if (num) stateMap[parseInt(num)] = cond;
            });
        } catch(e) {}

        _primarySelectedNum = null;
        renderPrimaryChart(patientId, stateMap);

        // Add child badge
        const nameEl = document.getElementById('profileName');
        if (nameEl && !document.getElementById('childPatientBadge')) {
            const badge = document.createElement('span');
            badge.id = 'childPatientBadge';
            badge.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:#fef3c7;color:#d97706;border:1.5px solid #fcd34d;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700;margin-left:8px;vertical-align:middle;';
            badge.innerHTML = '👶 طفل';
            nameEl.after(badge);
        }

        // Add chart label
        const chartHeader = document.querySelector('#profileView .flex.items-center.justify-between.mb-4.border-b .font-bold')
                         || document.querySelector('#profileView .font-bold');
        if (chartHeader && !document.getElementById('primaryTeethLabel')) {
            const lbl = document.createElement('span');
            lbl.id = 'primaryTeethLabel';
            lbl.style.cssText = 'background:#fef3c7;color:#d97706;border:1px solid #fcd34d;border-radius:999px;padding:1px 8px;font-size:10px;font-weight:700;margin-left:6px;';
            lbl.textContent = '🦷 أسنان لبنية';
            chartHeader.appendChild(lbl);
        }

        patchToothActionModal();
    };
}

// ── Patient type toggle in Add Patient form ───────────────────────
function injectPatientTypeField() {
    if (document.getElementById('patientTypeToggle')) return;
    const form = document.getElementById('newPatientForm');
    if (!form) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'patientTypeWrapper';
    wrapper.style.marginBottom = '8px';
    wrapper.innerHTML = `
        <label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:6px;">نوع المريض</label>
        <div style="display:flex;gap:8px;">
            <button type="button" id="btnTypeAdult" onclick="setPatientType('adult')"
                style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:12px;border:2px solid #3b82f6;background:#eff6ff;color:#1d4ed8;font-size:13px;font-weight:600;cursor:pointer;">
                <i class="fa-solid fa-person"></i> بالغ
            </button>
            <button type="button" id="btnTypeChild" onclick="setPatientType('child')"
                style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:12px;border:2px solid #e2e8f0;background:white;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;">
                <i class="fa-solid fa-child"></i> طفل
            </button>
        </div>
        <input type="hidden" id="patientTypeToggle" value="adult">`;
    form.insertBefore(wrapper, form.firstChild);
}

window.setPatientType = function (type) {
    const input = document.getElementById('patientTypeToggle');
    const btnA  = document.getElementById('btnTypeAdult');
    const btnC  = document.getElementById('btnTypeChild');
    if (!input) return;
    input.value = type;
    const activeA = 'flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid #3b82f6;background:#eff6ff;color:#1d4ed8;';
    const activeC = 'flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid #f59e0b;background:#fffbeb;color:#d97706;';
    const inactive= 'flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid #e2e8f0;background:white;color:#64748b;';
    if (btnA) btnA.style.cssText = type === 'adult' ? activeA : inactive;
    if (btnC) btnC.style.cssText = type === 'child' ? activeC : inactive;
};

// ── Patch dbInsert to save is_child ──────────────────────────────
function patchDbInsert() {
    if (!window.dbInsert) { setTimeout(patchDbInsert, 300); return; }
    if (window._dbInsertChildPatched) return;
    window._dbInsertChildPatched = true;
    const _orig = window.dbInsert;
    window.dbInsert = async function (table, data) {
        if (table === 'patients' && typeof window._pendingIsChild !== 'undefined') {
            data = Object.assign({}, data, { is_child: window._pendingIsChild });
            delete window._pendingIsChild;
        }
        return _orig(table, data);
    };
}

function patchFormSubmit() {
    const form = document.getElementById('newPatientForm');
    if (!form) return;
    form.addEventListener('submit', function () {
        const t = document.getElementById('patientTypeToggle');
        window._pendingIsChild = (t && t.value === 'child') ? 1 : 0;
    }, true);
    const origReset = form.reset.bind(form);
    form.reset = function () {
        origReset();
        window.setPatientType && window.setPatientType('adult');
    };
}

// ── updateChartLegend (shared) ────────────────────────────────────
function updateChartLegend(stateMap) {
    const legendEl = document.getElementById('chartLegendCounts');
    if (!legendEl) return;
    const total = Object.values(stateMap).filter(v => v && v !== 'healthy').length;
    legendEl.textContent = total ? `${total} teeth charted` : '';
}

// ── Init ──────────────────────────────────────────────────────────
function init() {
    const run = () => {
        setTimeout(() => {
            injectPatientTypeField();
            patchFormSubmit();
            patchDbInsert();
            patchGenerateDentalChart();
            console.log('[ChildFeature] ✅ Ready');
        }, 800);
        setTimeout(() => {
            if (!window._primaryChartPatched)  patchGenerateDentalChart();
            if (!window._dbInsertChildPatched) patchDbInsert();
        }, 2500);
    };
    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', run)
        : run();
}

init();

})();