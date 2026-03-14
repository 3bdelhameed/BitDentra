// FIX PATCH v2

window.onGenderChange = function () {
    const gender = document.getElementById('patientGender')?.value;
    const femaleFields = document.getElementById('femaleOnlyFields');
    if (!femaleFields) return;
    if (gender === 'Female') {
        femaleFields.classList.remove('hidden');
        femaleFields.classList.add('grid');
    } else {
        femaleFields.classList.add('hidden');
        femaleFields.classList.remove('grid');
        const preg = document.getElementById('patientPregnant');
        const bf   = document.getElementById('patientBreastfeeding');
        if (preg) preg.checked = false;
        if (bf)   bf.checked   = false;
    }
};

document.addEventListener('DOMContentLoaded', function () {
    const pregnantCb      = document.getElementById('patientPregnant');
    const breastfeedingCb = document.getElementById('patientBreastfeeding');
    if (pregnantCb && breastfeedingCb) {
        pregnantCb.addEventListener('change', function () {
            if (this.checked) breastfeedingCb.checked = false;
        });
        breastfeedingCb.addEventListener('change', function () {
            if (this.checked) pregnantCb.checked = false;
        });
    }
});

(function() {
    const COND_COLORS = {
        healthy:    {c:'#faf6ee',r:'#ddd0b8',ol:'#c0a870',hi:'rgba(255,255,255,0.9)'},
        treated:    {c:'#fee2e2',r:'#fca5a5',ol:'#ef4444',hi:'rgba(255,255,255,0.8)'},
        crown_work: {c:'#fef9c3',r:'#fde68a',ol:'#f59e0b',hi:'rgba(255,255,255,0.8)'},
        missing:    null,
        root_canal: {c:'#ede9fe',r:'#c4b5fd',ol:'#8b5cf6',hi:'rgba(255,255,255,0.8)'},
        implant:    {c:'#d1fae5',r:'#6ee7b7',ol:'#10b981',hi:'rgba(255,255,255,0.8)'},
        bridge:     {c:'#dbeafe',r:'#93c5fd',ol:'#3b82f6',hi:'rgba(255,255,255,0.8)'},
        decay:      {c:'#fef3c7',r:'#fbbf24',ol:'#92400e',hi:'rgba(255,255,255,0.6)'},
        fracture:   {c:'#ffedd5',r:'#fb923c',ol:'#c2410c',hi:'rgba(255,255,255,0.6)'},
        selected:   {c:'#bfdbfe',r:'#93c5fd',ol:'#2563eb',hi:'rgba(255,255,255,0.9)'},
    };

    const TOOTH_TYPE = {
        18:'wisdom',17:'molar',16:'molar',15:'premolar',14:'premolar',
        13:'canine',12:'lateral',11:'central',
        21:'central',22:'lateral',23:'canine',
        24:'premolar',25:'premolar',26:'molar',27:'molar',28:'wisdom',
        48:'wisdom',47:'molar',46:'molar',45:'premolar',44:'premolar',
        43:'canine',42:'lateral',41:'central',
        31:'central',32:'lateral',33:'canine',
        34:'premolar',35:'premolar',36:'molar',37:'molar',38:'wisdom',
    };

    function isUp(n){return n>=11&&n<=28;}

    function toothSVG(num, cond, sel) {
        const U   = isUp(num);
        const col = sel ? COND_COLORS.selected : (COND_COLORS[cond]||COND_COLORS.healthy);
        const typ = TOOTH_TYPE[num]||'molar';

        if (cond==='missing') return (
            `<svg viewBox="0 0 30 68" width="20" height="48" xmlns="http://www.w3.org/2000/svg">` +
            `<rect x="3" y="4" width="24" height="60" rx="5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="4 3"/>` +
            `<line x1="9" y1="16" x2="21" y2="52" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>` +
            `<line x1="21" y1="16" x2="9" y2="52" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>` +
            `</svg>`
        );

        const sh = sel
            ? 'filter:drop-shadow(0 0 4px rgba(37,99,235,0.7))'
            : 'filter:drop-shadow(0 2px 3px rgba(0,0,0,0.2))';

        const [cY1,cY2,rY1,rY2] = U ? [33,67,4,35] : [3,35,33,65];
        const cej = U ? cY1 : cY2;

        let p = '';
        if(typ==='central'||typ==='lateral'){
            const narrow = typ==='lateral';
            const rTip = U ? rY1+2 : rY2-2;
            const rM   = (rY1+rY2)/2;
            const x1=narrow?13:12, x2=narrow?17:18, cw=narrow?23:25, cl=narrow?7:5;
            const rootPath = `M${x1},${cej} C${x1-1},${cej+(U?-4:4)} ${x1-1},${rM} ${x1+1},${rTip+(U?3:-3)} C${x1+2},${rTip+(U?1:-1)} 15,${rTip} 15,${rTip} C16,${rTip+(U?1:-1)} ${x2-1},${rTip+(U?3:-3)} ${x2+1},${rM} C${x2},${cej+(U?-4:4)} ${x2},${cej} ${x2},${cej} Z`;
            const crownPath = `M${cl},${cej} C${cl},${cej+(U?-1:1)} 7,${cej+(U?-3:3)} 15,${cej+(U?-3:3)} C23,${cej+(U?-3:3)} ${cw},${cej+(U?-1:1)} ${cw},${cej} L${cw-1},${U?cY2-4:cY1+4} C${cw-2},${U?cY2+1:cY1-1} 20,${U?cY2+2:cY1-2} 15,${U?cY2+2:cY1-2} C10,${U?cY2+2:cY1-2} 7,${U?cY2+1:cY1-1} ${cl+1},${U?cY2-4:cY1+4} Z`;
            p = `<path d="${rootPath}" fill="${col.r}" stroke="${col.ol}" stroke-width="0.9"/>
            <path d="${crownPath}" fill="${col.c}" stroke="${col.ol}" stroke-width="1.2"/>
            <path d="M${cl+2},${cej+(U?1:-1)} C10,${cej+(U?-3:3)} 13,${cej+(U?-4:4)} 15,${cej+(U?-3:3)}" fill="none" stroke="${col.hi}" stroke-width="1.8" stroke-linecap="round"/>`;
        } else if(typ==='canine'){
            const cusp = U ? cY2+2 : cY1-2;
            const rTip = U ? rY1 : rY2;
            const rM = (rY1+rY2)/2;
            p = `<path d="M13,${cej} C12,${cej+(U?-5:5)} 12,${rM} 13.5,${rTip+(U?4:-4)} C14,${rTip+(U?2:-2)} 15,${rTip} 15,${rTip} C16,${rTip+(U?2:-2)} 17,${rTip+(U?4:-4)} 18,${rM} C18,${cej+(U?-5:5)} 17,${cej} 13,${cej} Z" fill="${col.r}" stroke="${col.ol}" stroke-width="0.9"/>
            <path d="M5,${cej} C5,${cej+(U?-2:2)} 8,${cej+(U?-4:4)} 15,${cej+(U?-4:4)} C22,${cej+(U?-4:4)} 25,${cej+(U?-2:2)} 25,${cej} L23,${U?cY2-10:cY1+10} C21,${U?cY2-3:cY1+3} 18,${cusp} 15,${cusp} C12,${cusp} 9,${U?cY2-3:cY1+3} 7,${U?cY2-10:cY1+10} Z" fill="${col.c}" stroke="${col.ol}" stroke-width="1.2"/>
            <path d="M8,${cej+(U?1:-1)} C10,${cej+(U?-3:3)} 13,${cej+(U?-5:5)} 15,${cej+(U?-4:4)}" fill="none" stroke="${col.hi}" stroke-width="1.8" stroke-linecap="round"/>`;
        } else if(typ==='premolar'){
            const lc = U ? cY2-2 : cY1+2;
            const mR = U ? `M8,${cej} C7,${cej-4} 7,${rY1+14} 9,${rY1+5} C10,${rY1+2} 11,${rY1} 11.5,${rY1+1} C10.5,${rY1+4} 10,${rY1+12} 10,${cej} Z`
                         : `M8,${cej} C7,${cej+4} 7,${rY2-14} 9,${rY2-5} C10,${rY2-2} 11,${rY2} 11.5,${rY2-1} C10.5,${rY2-4} 10,${rY2-12} 10,${cej} Z`;
            const dR = U ? `M20,${cej} C20,${rY1+12} 19.5,${rY1+4} 18.5,${rY1+1} C19,${rY1} 20,${rY1+2} 21,${rY1+5} C23,${rY1+14} 23,${cej-4} 22,${cej} Z`
                         : `M20,${cej} C20,${rY2-12} 19.5,${rY2-4} 18.5,${rY2-1} C19,${rY2} 20,${rY2-2} 21,${rY2-5} C23,${rY2-14} 23,${cej+4} 22,${cej} Z`;
            p = `<path d="${mR}" fill="${col.r}" stroke="${col.ol}" stroke-width="0.8"/>
            <path d="${dR}" fill="${col.r}" stroke="${col.ol}" stroke-width="0.8"/>
            <path d="M4,${cej} C4,${cej+(U?-2:2)} 7,${cej+(U?-4:4)} 15,${cej+(U?-4:4)} C23,${cej+(U?-4:4)} 26,${cej+(U?-2:2)} 26,${cej} L25,${U?cY2-10:cY1+10} C24,${U?cY2-3:cY1+3} 21,${lc} 19,${lc} C18,${lc+(U?1:-1)} 15,${lc+(U?2:-2)} 15,${lc+(U?2:-2)} C15,${lc+(U?2:-2)} 12,${lc+(U?1:-1)} 11,${lc} C9,${lc} 6,${U?cY2-3:cY1+3} 5,${U?cY2-10:cY1+10} Z" fill="${col.c}" stroke="${col.ol}" stroke-width="1.3"/>
            <line x1="15" y1="${U?cej-2:cej+2}" x2="15" y2="${lc+(U?1:-1)}" stroke="${col.ol}" stroke-width="0.7" opacity="0.3"/>
            <path d="M7,${cej+(U?1:-1)} C9,${cej+(U?-3:3)} 12,${cej+(U?-5:5)} 15,${cej+(U?-4:4)}" fill="none" stroke="${col.hi}" stroke-width="1.8" stroke-linecap="round"/>`;
        } else {
            const wide = typ==='wisdom';
            const fossa = U ? (cY1+cY2)/2+5 : (cY1+cY2)/2-5;
            // pre-compute to avoid inline ternaries inside SVG path d="" (causes parser errors)
            const mL1=wide?6:5, mL2=wide?5:4, mL3=wide?8:7, mL4=wide?9:8, mL5=wide?10:9, mL6=wide?11:10;
            const dR1=wide?20:21, dR2=wide?21:22, dR3=wide?21.5:22.5, dR4=wide?22:23, dR5=wide?23:24, dR6=wide?25:26, dR7=wide?24:25;
            const mR = U
                ? `M${mL1},${cej} C${mL2},${cej-5} ${mL2},${rY1+14} ${mL3},${rY1+5} C${mL4},${rY1+2} ${mL5},${rY1} ${mL6},${rY1+1} C${mL5},${rY1+5} ${mL4},${rY1+13} ${mL5},${cej} Z`
                : `M${mL1},${cej} C${mL2},${cej+5} ${mL2},${rY2-14} ${mL3},${rY2-5} C${mL4},${rY2-2} ${mL5},${rY2} ${mL6},${rY2-1} C${mL5},${rY2-5} ${mL4},${rY2-13} ${mL5},${cej} Z`;
            const dR = U
                ? `M${dR1},${cej} C${dR1},${rY1+13} ${dR2},${rY1+5} ${dR2},${rY1+2} C${dR3},${rY1} ${dR4},${rY1+1} ${dR5},${rY1+5} C${dR6},${rY1+14} ${dR6},${cej-5} ${dR7},${cej} Z`
                : `M${dR1},${cej} C${dR1},${rY2-13} ${dR2},${rY2-5} ${dR2},${rY2-2} C${dR3},${rY2} ${dR4},${rY2-1} ${dR5},${rY2-5} C${dR6},${rY2-14} ${dR6},${cej+5} ${dR7},${cej} Z`;
            p = `<path d="${mR}" fill="${col.r}" stroke="${col.ol}" stroke-width="0.9"/>
            <path d="${dR}" fill="${col.r}" stroke="${col.ol}" stroke-width="0.9"/>
            <path d="M3,${cej} C3,${cej+(U?-2:2)} 6,${cej+(U?-5:5)} 15,${cej+(U?-5:5)} C24,${cej+(U?-5:5)} 27,${cej+(U?-2:2)} 27,${cej} L27,${U?cY2-9:cY1+9} C27,${U?cY2-2:cY1+2} 23,${U?cY2+2:cY1-2} 20,${U?cY2+2:cY1-2} C18,${U?cY2+2:cY1-2} 15,${U?cY2+2:cY1-2} 15,${U?cY2+2:cY1-2} C12,${U?cY2+2:cY1-2} 9,${U?cY2+2:cY1-2} 7,${U?cY2+1:cY1-1} C5,${U?cY2-2:cY1+2} 3,${U?cY2-9:cY1+9} 3,${U?cY2-9:cY1+9} Z" fill="${col.c}" stroke="${col.ol}" stroke-width="1.4"/>
            <ellipse cx="15" cy="${fossa}" rx="4.5" ry="2.5" fill="rgba(0,0,0,0.06)" stroke="${col.ol}" stroke-width="0.5" opacity="0.4"/>
            <line x1="15" y1="${U?cej-3:cej+3}" x2="15" y2="${U?cY2-3:cY1+3}" stroke="${col.ol}" stroke-width="0.7" opacity="0.2"/>
            <line x1="5" y1="${fossa}" x2="25" y2="${fossa}" stroke="${col.ol}" stroke-width="0.7" opacity="0.2"/>
            <path d="M6,${cej+(U?2:-2)} C9,${cej+(U?-3:3)} 15,${cej+(U?-5:5)} 21,${cej+(U?-3:3)}" fill="none" stroke="${col.hi}" stroke-width="2.2" stroke-linecap="round"/>`;
        }

        p = p.replace(/\s+/g, ' ').trim();
        p = p.replace(/d="([^"]+)"/g, (m,dval) => {
            const clean = dval.replace(/\s+/g, ' ').trim();
            return `d="${clean}"`;
        });
        return `<svg viewBox="0 0 30 68" width="20" height="48" xmlns="http://www.w3.org/2000/svg" style="${sh}">${p}</svg>`;
    }

    let _patientStates = {};
    let _selectedNum = null;

    async function loadStates(patientId) {
        _patientStates = {};
        if (!patientId || !window.dbGetAll) return;
        try {
            const rows = await window.dbGetAll('tooth_states', {patient_id: patientId});
            (rows||[]).forEach(r => {
                const n = r.tooth_number || r.toothNumber;
                if (n) _patientStates[String(n)] = r.condition;
            });
        } catch(e) {}
    }

    const UPPER_NUMS = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
    const LOWER_NUMS = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

    function renderPicker(preSelected) {
        const uRow = document.getElementById('tpUpperRow');
        const lRow = document.getElementById('tpLowerRow');
        if (!uRow || !lRow) return;
        _selectedNum = preSelected || null;

        const NUM_COL = {
            healthy:'#94a3b8',treated:'#ef4444',crown_work:'#f59e0b',
            missing:'#94a3b8',root_canal:'#8b5cf6',implant:'#10b981',
            bridge:'#3b82f6',decay:'#92400e',fracture:'#c2410c',
        };

        function cell(num) {
            const cond = _patientStates[String(num)] || 'healthy';
            const sel  = _selectedNum == num;
            const nc   = sel ? '#2563eb' : (NUM_COL[cond]||'#94a3b8');
            const d    = document.createElement('div');
            d.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:0 1px;transition:transform 0.1s;' +
                (sel ? ('transform:scale(1.18) translateY('+(isUp(num)?'4px':'-4px')+')') : '');
            d.innerHTML = toothSVG(num, cond, sel) +
                '<span style="font-size:6px;font-weight:700;color:'+nc+';margin-top:1px;line-height:1;">'+num+'</span>';
            d.onmouseenter = () => { if(_selectedNum!=num) d.style.transform='scale(1.15) translateY('+(isUp(num)?'3px':'-3px')+')'; };
            d.onmouseleave = () => { if(_selectedNum!=num) d.style.transform=''; };
            d.onclick = () => {
                const hid = document.getElementById('treatmentToothNumber');
                const lbl = document.getElementById('treatmentToothPickerLabel');
                _selectedNum = (_selectedNum==num) ? null : num;
                if(hid) hid.value = _selectedNum||'';
                if(lbl) lbl.textContent = _selectedNum ? '— Tooth #'+_selectedNum : '';
                renderPicker(_selectedNum);
            };
            return d;
        }

        function sep() {
            const d = document.createElement('div');
            d.style.cssText = 'width:1.5px;background:#e2e8f0;border-radius:1px;margin:0 3px;align-self:stretch;flex-shrink:0;';
            return d;
        }

        uRow.style.cssText = 'display:flex;flex-wrap:nowrap;justify-content:center;align-items:flex-end;gap:0;overflow-x:auto;padding:4px 2px 0;';
        lRow.style.cssText = 'display:flex;flex-wrap:nowrap;justify-content:center;align-items:flex-start;gap:0;overflow-x:auto;padding:0 2px 4px;';
        uRow.innerHTML = ''; lRow.innerHTML = '';

        UPPER_NUMS.forEach((n,i)=>{ if(i===8) uRow.appendChild(sep()); uRow.appendChild(cell(n)); });
        LOWER_NUMS.forEach((n,i)=>{ if(i===8) lRow.appendChild(sep()); lRow.appendChild(cell(n)); });
    }

    window.buildToothPicker = function() {
        const pid = window.currentProfilePatientId;
        if (pid) loadStates(pid).then(()=>renderPicker(_selectedNum));
        else renderPicker(_selectedNum);
    };

    window.selectToothInPicker = function(num) {
        const hid = document.getElementById('treatmentToothNumber');
        const lbl = document.getElementById('treatmentToothPickerLabel');
        _selectedNum = num;
        if(hid) hid.value = num;
        if(lbl) lbl.textContent = '— Tooth #'+num;
        renderPicker(num);
    };

    const _origOpen = window.openModal;
    window.openModal = function(modalId, extra) {
        if(typeof _origOpen==='function') _origOpen(modalId, extra);

        if(modalId === 'addTreatmentModal') {
            _selectedNum = null;
            const hid = document.getElementById('treatmentToothNumber');
            const lbl = document.getElementById('treatmentToothPickerLabel');
            if(hid) hid.value = '';
            if(lbl) lbl.textContent = '';

            const pid = window.currentProfilePatientId;
            if(pid) {
                loadStates(pid).then(() => {
                    if(extra && typeof extra==='number') {
                        _selectedNum = extra;
                        if(hid) hid.value = String(extra);
                        if(lbl) lbl.textContent = '— Tooth #'+extra;
                    }
                    renderPicker(_selectedNum);
                });
            } else {
                setTimeout(() => renderPicker(null), 50);
            }
        }

        if(modalId === 'addPatientModal') {
            const ff = document.getElementById('femaleOnlyFields');
            if(ff){ ff.classList.add('hidden'); ff.classList.remove('grid'); }
            const gs = document.getElementById('patientGender');
            if(gs) gs.value = '';
            const pr = document.getElementById('patientPregnant');
            const bf = document.getElementById('patientBreastfeeding');
            if(pr) pr.checked = false;
            if(bf) bf.checked = false;
        }
    };

    document.addEventListener('DOMContentLoaded', () => renderPicker(null));

    window.addEventListener('load', () => {
        const form = document.getElementById('newTreatmentForm');
        if(!form || form._tpSync) return;
        form._tpSync = true;
        form.addEventListener('submit', () => {
            setTimeout(async () => {
                const pid = window.currentProfilePatientId;
                if(!pid) return;
                if(typeof window.generateDentalChart==='function') await window.generateDentalChart(pid);
                if(typeof window.renderSessionPayments==='function') await window.renderSessionPayments(pid);
            }, 400);
        }, true);
    });

})();

window.toggleSidebar = function () {
    const sidebar   = document.getElementById('sidebar');
    const backdrop  = document.getElementById('sidebarBackdrop');
    const isMobile  = window.innerWidth <= 900;
    if (!sidebar) return;
    if (isMobile) {
        const isOpen = sidebar.classList.contains('mobile-open');
        if (isOpen) {
            sidebar.classList.remove('mobile-open');
            if (backdrop) backdrop.style.display = 'none';
        } else {
            sidebar.classList.add('mobile-open');
            if (backdrop) backdrop.style.display = 'block';
        }
    } else {
        sidebar.classList.toggle('sidebar-collapsed');
    }
};

document.addEventListener('DOMContentLoaded', function () {
    const backdrop = document.getElementById('sidebarBackdrop');
    if (backdrop) {
        backdrop.onclick = function () {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('mobile-open');
            backdrop.style.display = 'none';
        };
    }
});

(function injectSidebarFix() {
    if (document.getElementById('sidebarFixStyle')) return;
    const style = document.createElement('style');
    style.id = 'sidebarFixStyle';
    style.textContent = `
        @keyframes apptShake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-8px)}
            40%{transform:translateX(8px)}
            60%{transform:translateX(-5px)}
            80%{transform:translateX(5px)}
        }
        #apptConflictWarning {
            display: none; align-items: flex-start; padding: 10px 12px;
            border-radius: 10px; border: 1.5px solid #fda4af;
            background: #fff1f2; color: #be123c;
            font-size: 12.5px; font-weight: 500; margin-top: 6px; transition: all 0.2s;
        }
        #bookedSlotsHint { margin-top: 2px; }
        #appointmentDuration { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 11px; padding: 10px 14px; font-size: 13.5px; outline: none; transition: border-color .18s; }
        #appointmentDuration:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
        @media (max-width: 900px) {
            #sidebar { position: fixed !important; left: 0 !important; top: 0 !important; height: 100% !important; z-index: 60 !important; transform: translateX(-100%) !important; transition: transform 0.3s ease !important; width: 240px !important; }
            #sidebar.mobile-open { transform: translateX(0) !important; }
            #sidebarBackdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 50; }
        }
        @media (min-width: 901px) {
            #sidebar { transition: width 0.25s ease !important; }
            #sidebar.sidebar-collapsed { width: 56px !important; overflow: hidden; }
            #sidebar.sidebar-collapsed .sidebar-link span, #sidebar.sidebar-collapsed [data-t], #sidebar.sidebar-collapsed .nav-label, #sidebar.sidebar-collapsed .sidebar-logo-text, #sidebar.sidebar-collapsed .logout-label { display: none !important; }
            #sidebar.sidebar-collapsed .sidebar-link { justify-content: center !important; padding-left: 0 !important; padding-right: 0 !important; }
            #sidebar.sidebar-collapsed #sidebarLogoArea { justify-content: center !important; padding: 0 !important; }
        }
        #tpUpperRow, #tpLowerRow { display: flex !important; flex-wrap: nowrap !important; justify-content: center !important; align-items: center !important; overflow-x: auto !important; padding: 4px 2px !important; gap: 0 !important; }
        #femaleOnlyFields { grid-template-columns: 1fr 1fr; }
    `;
    document.head.appendChild(style);
})();