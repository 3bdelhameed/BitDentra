// ══════════════════════════════════════════════════════════════════
//  tooth_picker_patch.js  v3
//  FIX: استخدام fill مباشر بدل url(#gradient) عشان مفيش تعارض
//  بين SVGs كتير في نفس الصفحة
// ══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── ألوان كل حالة ─────────────────────────────────────────────
    const CONDITIONS = {
        healthy:    { c1:'#faf6ee', c2:'#f0e8d0', hi:'rgba(255,255,255,0.9)', r:'#ddd0b8', r2:'#c8b898', ol:'#c0a870' },
        treated:    { c1:'#fee2e2', c2:'#fca5a5', hi:'rgba(255,255,255,0.8)', r:'#fca5a5', r2:'#f87171', ol:'#ef4444' },
        crown_work: { c1:'#fef9c3', c2:'#fde68a', hi:'rgba(255,255,255,0.8)', r:'#fde68a', r2:'#fcd34d', ol:'#f59e0b' },
        missing:    null,
        root_canal: { c1:'#ede9fe', c2:'#c4b5fd', hi:'rgba(255,255,255,0.8)', r:'#c4b5fd', r2:'#a78bfa', ol:'#8b5cf6' },
        implant:    { c1:'#d1fae5', c2:'#6ee7b7', hi:'rgba(255,255,255,0.8)', r:'#6ee7b7', r2:'#34d399', ol:'#10b981' },
        bridge:     { c1:'#dbeafe', c2:'#93c5fd', hi:'rgba(255,255,255,0.8)', r:'#93c5fd', r2:'#60a5fa', ol:'#3b82f6' },
        decay:      { c1:'#fef3c7', c2:'#d97706', hi:'rgba(255,255,255,0.6)', r:'#d97706', r2:'#b45309', ol:'#92400e' },
        fracture:   { c1:'#fee2e2', c2:'#f97316', hi:'rgba(255,255,255,0.6)', r:'#f97316', r2:'#ea580c', ol:'#c2410c' },
        selected:   { c1:'#bfdbfe', c2:'#60a5fa', hi:'rgba(255,255,255,0.85)', r:'#93c5fd', r2:'#60a5fa', ol:'#2563eb' },
    };

    const TYPES = {
        18:'wisdom', 17:'molar', 16:'molar', 15:'premolar', 14:'premolar',
        13:'canine', 12:'lateral', 11:'central',
        21:'central', 22:'lateral', 23:'canine',
        24:'premolar', 25:'premolar', 26:'molar', 27:'molar', 28:'wisdom',
        48:'wisdom', 47:'molar', 46:'molar', 45:'premolar', 44:'premolar',
        43:'canine', 42:'lateral', 41:'central',
        31:'central', 32:'lateral', 33:'canine',
        34:'premolar', 35:'premolar', 36:'molar', 37:'molar', 38:'wisdom',
    };

    function isUpper(n) { return n >= 11 && n <= 28; }

    // ─────────────────────────────────────────────────────────────
    //  CORE: رسم كل سنة بـ plain fill (مفيش gradient IDs)
    // ─────────────────────────────────────────────────────────────
    function toothSVG(num, cond, selected) {
        const type = TYPES[num] || 'molar';
        const U    = isUpper(num);
        const col  = selected ? CONDITIONS.selected : (CONDITIONS[cond] || CONDITIONS.healthy);

        if (cond === 'missing') {
            return `<svg viewBox="0 0 30 68" width="22" height="50" xmlns="http://www.w3.org/2000/svg"
                style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.1))">
                <rect x="3" y="4" width="24" height="60" rx="5"
                    fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="4 3"/>
                <line x1="9" y1="16" x2="21" y2="52" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
                <line x1="21" y1="16" x2="9" y2="52" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
            </svg>`;
        }

        const sh = selected
            ? 'filter:drop-shadow(0 0 5px rgba(37,99,235,0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            : 'filter:drop-shadow(0 2px 4px rgba(0,0,0,0.22)) drop-shadow(0 1px 2px rgba(0,0,0,0.12))';

        const [cY1, cY2, rY1, rY2] = U ? [33,67,4,35] : [3,35,33,65];
        const cej = U ? cY1 : cY2;

        let paths = '';
        switch(type) {
            case 'central':  paths = central(col,U,cej,cY1,cY2,rY1,rY2); break;
            case 'lateral':  paths = lateral(col,U,cej,cY1,cY2,rY1,rY2); break;
            case 'canine':   paths = canine(col,U,cej,cY1,cY2,rY1,rY2);  break;
            case 'premolar': paths = premolar(col,U,cej,cY1,cY2,rY1,rY2);break;
            case 'molar':    paths = molar(col,U,cej,cY1,cY2,rY1,rY2);   break;
            case 'wisdom':   paths = wisdom(col,U,cej,cY1,cY2,rY1,rY2);  break;
        }

        // strip excessive whitespace/newlines from path data to avoid parser
        // complaints about unexpected characters
        paths = paths.replace(/\s+/g, ' ').trim();

        return `<svg viewBox="0 0 30 68" width="22" height="50"
            xmlns="http://www.w3.org/2000/svg" style="${sh}">${paths}</svg>`;
    }

    // كل دوال الرسم بتستخدم col.c1 col.c2 col.r col.r2 col.ol col.hi مباشرة

    function central(col,U,cej,cY1,cY2,rY1,rY2) {
        const rTip = U ? rY1+1 : rY2-1;
        const rM = (rY1+rY2)/2;
        return `
        <path d="M12,${cej} C11,${cej+(U?-4:4)} 11,${rM} 13,${rTip+(U?3:-3)}
                 C14,${rTip+(U?1:-1)} 15,${rTip} 15,${rTip}
                 C16,${rTip+(U?1:-1)} 17,${rTip+(U?3:-3)} 19,${rM}
                 C18,${cej+(U?-4:4)} 18,${cej} 12,${cej} Z"
              fill="${col.r}" stroke="${col.ol}" stroke-width="0.8"/>
        <path d="M5,${cej} C5,${cej+(U?-1:1)} 7,${cej+(U?-3:3)} 15,${cej+(U?-3:3)}
                 C23,${cej+(U?-3:3)} 25,${cej+(U?-1:1)} 25,${cej}
                 L24,${U?cY2-4:cY1+4}
                 C23,${U?cY2+1:cY1-1} 20,${U?cY2+2:cY1-2} 15,${U?cY2+2:cY1-2}
                 C10,${U?cY2+2:cY1-2} 7,${U?cY2+1:cY1-1} 6,${U?cY2-4:cY1+4} Z"
              fill="${col.c1}" stroke="${col.ol}" stroke-width="1.2"/>
        <path d="M7,${cej+(U?-1:1)} C9,${cej+(U?-3:3)} 13,${cej+(U?-3.5:3.5)} 15,${cej+(U?-3:3)}"
              fill="${col.c2}" opacity="0.35" stroke="none"/>
        <path d="M8,${cej+(U?1:-1)} C10,${cej+(U?-3:3)} 13,${cej+(U?-4:4)} 15,${cej+(U?-3:3)}"
              fill="none" stroke="${col.hi}" stroke-width="2" stroke-linecap="round"/>
        <path d="${U?`M5,${cY2-5} C8,${cY2+1} 22,${cY2+1} 25,${cY2-5}`
                   :`M5,${cY1+5} C8,${cY1-1} 22,${cY1-1} 25,${cY1+5}`}"
              fill="${col.hi}" opacity="0.18" stroke="none"/>`;
    }

    function lateral(col,U,cej,cY1,cY2,rY1,rY2) {
        const rTip = U ? rY1+1 : rY2-1;
        const rM = (rY1+rY2)/2;
        return `
        <path d="M13,${cej} C12,${cej+(U?-4:4)} 12,${rM} 14,${rTip+(U?2:-2)}
                 C15,${rTip} 15,${rTip} 16,${rTip+(U?1:-1)}
                 C17,${rTip+(U?2:-2)} 18,${rM} 17,${cej+(U?-4:4)} C17,${cej} 13,${cej} Z"
              fill="${col.r}" stroke="${col.ol}" stroke-width="0.8"/>
        <path d="M6,${cej} C6,${cej+(U?-1:1)} 8,${cej+(U?-3:3)} 15,${cej+(U?-3:3)}
                 C22,${cej+(U?-3:3)} 24,${cej+(U?-1:1)} 24,${cej}
                 L23,${U?cY2-3:cY1+3}
                 C22,${U?cY2+1:cY1-1} 19,${U?cY2+2:cY1-2} 15,${U?cY2+2:cY1-2}
                 C11,${U?cY2+2:cY1-2} 8,${U?cY2+1:cY1-1} 7,${U?cY2-3:cY1+3} Z"
              fill="${col.c1}" stroke="${col.ol}" stroke-width="1.2"/>
        <path d="M8,${cej+(U?1:-1)} C10,${cej+(U?-3:3)} 13,${cej+(U?-4:4)} 15,${cej+(U?-3:3)}"
              fill="none" stroke="${col.hi}" stroke-width="2" stroke-linecap="round"/>`;
    }

    function canine(col,U,cej,cY1,cY2,rY1,rY2) {
        const rTip = U ? rY1 : rY2;
        const cusp = U ? cY2+2 : cY1-2;
        const rM = (rY1+rY2)/2;
        return `
        <path d="M13,${cej} C12,${cej+(U?-5:5)} 12,${rM} 13.5,${rTip+(U?4:-4)}
                 C14,${rTip+(U?2:-2)} 15,${rTip} 15,${rTip}
                 C16,${rTip+(U?2:-2)} 17,${rTip+(U?4:-4)} 18,${rM}
                 C18,${cej+(U?-5:5)} 17,${cej} 13,${cej} Z"
              fill="${col.r}" stroke="${col.ol}" stroke-width="0.8"/>
        <path d="M5,${cej} C5,${cej+(U?-2:2)} 8,${cej+(U?-4:4)} 15,${cej+(U?-4:4)}
                 C22,${cej+(U?-4:4)} 25,${cej+(U?-2:2)} 25,${cej}
                 L23,${U?cY2-10:cY1+10}
                 C21,${U?cY2-3:cY1+3} 18,${cusp+(U?-1:1)} 15,${cusp}
                 C12,${cusp+(U?-1:1)} 9,${U?cY2-3:cY1+3} 7,${U?cY2-10:cY1+10} Z"
              fill="${col.c1}" stroke="${col.ol}" stroke-width="1.2"/>
        <path d="M8,${cej+(U?1:-1)} C10,${cej+(U?-3:3)} 13,${cej+(U?-5:5)} 16,${cej+(U?-4:4)}"
              fill="none" stroke="${col.hi}" stroke-width="2" stroke-linecap="round"/>`;
    }

    function premolar(col,U,cej,cY1,cY2,rY1,rY2) {
        const lc = U ? cY2-2 : cY1+2;
        const mR = U
            ? `M8,${cej} C7,${cej-4} 7,${rY1+14} 9,${rY1+5} C10,${rY1+2} 11,${rY1} 11.5,${rY1+1} C10.5,${rY1+4} 10,${rY1+12} 10,${cej} Z`
            : `M8,${cej} C7,${cej+4} 7,${rY2-14} 9,${rY2-5} C10,${rY2-2} 11,${rY2} 11.5,${rY2-1} C10.5,${rY2-4} 10,${rY2-12} 10,${cej} Z`;
        const dR = U
            ? `M20,${cej} C20,${rY1+12} 19.5,${rY1+4} 18.5,${rY1+1} C19,${rY1} 20,${rY1+2} 21,${rY1+5} C23,${rY1+14} 23,${cej-4} 22,${cej} Z`
            : `M20,${cej} C20,${rY2-12} 19.5,${rY2-4} 18.5,${rY2-1} C19,${rY2} 20,${rY2-2} 21,${rY2-5} C23,${rY2-14} 23,${cej+4} 22,${cej} Z`;
        return `
        <path d="${mR}" fill="${col.r}" stroke="${col.ol}" stroke-width="0.8"/>
        <path d="${dR}" fill="${col.r}" stroke="${col.ol}" stroke-width="0.8"/>
        <path d="M4,${cej} C4,${cej+(U?-2:2)} 7,${cej+(U?-4:4)} 15,${cej+(U?-4:4)}
                 C23,${cej+(U?-4:4)} 26,${cej+(U?-2:2)} 26,${cej}
                 L25,${U?cY2-10:cY1+10}
                 C24,${U?cY2-3:cY1+3} 21,${lc} 19,${lc}
                 C18,${lc+(U?1:-1)} 16,${lc+(U?2:-2)} 15,${lc+(U?2:-2)}
                 C14,${lc+(U?2:-2)} 12,${lc+(U?1:-1)} 11,${lc}
                 C9,${lc} 6,${U?cY2-3:cY1+3} 5,${U?cY2-10:cY1+10} Z"
              fill="${col.c1}" stroke="${col.ol}" stroke-width="1.3"/>
        <line x1="15" y1="${U?cej-2:cej+2}" x2="15" y2="${lc+(U?1:-1)}"
              stroke="${col.ol}" stroke-width="0.8" opacity="0.3"/>
        <path d="M7,${cej+(U?1:-1)} C9,${cej+(U?-3:3)} 12,${cej+(U?-5:5)} 15,${cej+(U?-4:4)}"
              fill="none" stroke="${col.hi}" stroke-width="2" stroke-linecap="round"/>`;
    }

    function molar(col,U,cej,cY1,cY2,rY1,rY2) {
        const fossa = U ? (cY1+cY2)/2+5 : (cY1+cY2)/2-5;
        const mR = U
            ? `M5,${cej} C4,${cej-5} 4,${rY1+14} 7,${rY1+5} C8,${rY1+2} 9,${rY1} 10,${rY1+1} C9,${rY1+5} 8,${rY1+13} 9,${cej} Z`
            : `M5,${cej} C4,${cej+5} 4,${rY2-14} 7,${rY2-5} C8,${rY2-2} 9,${rY2} 10,${rY2-1} C9,${rY2-5} 8,${rY2-13} 9,${cej} Z`;
        const dR = U
            ? `M21,${cej} C21,${rY1+13} 22,${rY1+5} 22,${rY1+2} C22.5,${rY1} 23,${rY1+1} 24,${rY1+5} C26,${rY1+14} 26,${cej-5} 25,${cej} Z`
            : `M21,${cej} C21,${rY2-13} 22,${rY2-5} 22,${rY2-2} C22.5,${rY2} 23,${rY2-1} 24,${rY2-5} C26,${rY2-14} 26,${cej+5} 25,${cej} Z`;
        return `
        <path d="${mR}" fill="${col.r}" stroke="${col.ol}" stroke-width="0.9"/>
        <path d="${dR}" fill="${col.r}" stroke="${col.ol}" stroke-width="0.9"/>
        <path d="M3,${cej} C3,${cej+(U?-2:2)} 6,${cej+(U?-5:5)} 15,${cej+(U?-5:5)}
                 C24,${cej+(U?-5:5)} 27,${cej+(U?-2:2)} 27,${cej}
                 L27,${U?cY2-9:cY1+9}
                 C27,${U?cY2-2:cY1+2} 23,${U?cY2+2:cY1-2} 20,${U?cY2+2:cY1-2}
                 C18,${U?cY2+2:cY1-2} 15,${U?cY2+2:cY1-2} 15,${U?cY2+2:cY1-2}
                 C12,${U?cY2+2:cY1-2} 9,${U?cY2+2:cY1-2} 7,${U?cY2+1:cY1-1}
                 C5,${U?cY2-2:cY1+2} 3,${U?cY2-9:cY1+9} 3,${U?cY2-9:cY1+9} Z"
              fill="${col.c1}" stroke="${col.ol}" stroke-width="1.4"/>
        <ellipse cx="15" cy="${fossa}" rx="4.5" ry="2.5"
              fill="${col.c2}" opacity="0.3" stroke="${col.ol}" stroke-width="0.5" opacity="0.4"/>
        <line x1="15" y1="${U?cej-3:cej+3}" x2="15" y2="${U?cY2-3:cY1+3}"
              stroke="${col.ol}" stroke-width="0.7" opacity="0.22"/>
        <line x1="5" y1="${fossa}" x2="25" y2="${fossa}"
              stroke="${col.ol}" stroke-width="0.7" opacity="0.22"/>
        <path d="M6,${cej+(U?2:-2)} C9,${cej+(U?-3:3)} 15,${cej+(U?-5:5)} 21,${cej+(U?-3:3)}"
              fill="none" stroke="${col.hi}" stroke-width="2.2" stroke-linecap="round"/>`;
    }

    function wisdom(col,U,cej,cY1,cY2,rY1,rY2) {
        const fossa = U ? (cY1+cY2)/2+4 : (cY1+cY2)/2-4;
        const root = U
            ? `M7,${cej} C6,${cej-5} 6,${rY1+14} 9,${rY1+5} C10,${rY1+2} 12,${rY1} 13,${rY1+1}
               C14,${rY1} 15,${rY1} 16,${rY1} C17,${rY1} 18,${rY1+1}
               C20,${rY1+2} 21,${rY1+5} C24,${rY1+14} 24,${cej-5} 23,${cej} Z`
            : `M7,${cej} C6,${cej+5} 6,${rY2-14} 9,${rY2-5} C10,${rY2-2} 12,${rY2} 13,${rY2-1}
               C14,${rY2} 15,${rY2} 16,${rY2} C17,${rY2} 18,${rY2-1}
               C20,${rY2-2} 21,${rY2-5} C24,${rY2-14} 24,${cej+5} 23,${cej} Z`;
        return `
        <path d="${root}" fill="${col.r}" stroke="${col.ol}" stroke-width="0.9"/>
        <path d="M4,${cej} C4,${cej+(U?-2:2)} 7,${cej+(U?-4:4)} 15,${cej+(U?-4:4)}
                 C23,${cej+(U?-4:4)} 26,${cej+(U?-2:2)} 26,${cej}
                 L26,${U?cY2-9:cY1+9}
                 C26,${U?cY2-2:cY1+2} 22,${U?cY2+2:cY1-2} 19,${U?cY2+2:cY1-2}
                 C17,${U?cY2+2:cY1-2} 15,${U?cY2+2:cY1-2} 15,${U?cY2+2:cY1-2}
                 C13,${U?cY2+2:cY1-2} 11,${U?cY2+2:cY1-2} 9,${U?cY2+1:cY1-1}
                 C6,${U?cY2-2:cY1+2} 4,${U?cY2-9:cY1+9} 4,${U?cY2-9:cY1+9} Z"
              fill="${col.c1}" stroke="${col.ol}" stroke-width="1.3"/>
        <ellipse cx="15" cy="${fossa}" rx="4" ry="2.3"
              fill="${col.c2}" opacity="0.3" stroke="${col.ol}" stroke-width="0.5" opacity="0.4"/>
        <line x1="15" y1="${U?cej-2:cej+2}" x2="15" y2="${U?cY2-3:cY1+3}"
              stroke="${col.ol}" stroke-width="0.7" opacity="0.2"/>
        <line x1="6" y1="${fossa}" x2="24" y2="${fossa}"
              stroke="${col.ol}" stroke-width="0.7" opacity="0.2"/>
        <path d="M7,${cej+(U?2:-2)} C9,${cej+(U?-3:3)} 13,${cej+(U?-5:5)} 18,${cej+(U?-4:4)}"
              fill="none" stroke="${col.hi}" stroke-width="2" stroke-linecap="round"/>`;
    }

    // ══════════════════════════════════════════════════════════════
    //  BUILD MINI CHART
    // ══════════════════════════════════════════════════════════════
    const UPPER = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
    const LOWER = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

    let _selectedNum  = null;
    let _patientStates = {};

    async function loadPatientToothStates(patientId) {
        _patientStates = {};
        if (!patientId || !window.dbGetAll) return;
        try {
            const rows = await window.dbGetAll('tooth_states', { patient_id: patientId });
            rows.forEach(r => {
                const n = r.tooth_number || r.toothNumber;
                if (n) _patientStates[String(n)] = r.condition;
            });
        } catch(e) { /* silent */ }
    }

    function buildMiniChart(preSelected) {
        const upper = document.getElementById('tpUpperRow');
        const lower = document.getElementById('tpLowerRow');
        if (!upper || !lower) return;

        _selectedNum = preSelected || null;

        const numColors = {
            healthy:'#94a3b8', treated:'#ef4444', crown_work:'#f59e0b',
            missing:'#94a3b8', root_canal:'#8b5cf6', implant:'#10b981',
            bridge:'#3b82f6', decay:'#92400e', fracture:'#c2410c',
        };

        function makeCell(num) {
            const cond = _patientStates[String(num)] || 'healthy';
            const sel  = _selectedNum == num;
            const col  = sel ? '#2563eb' : (numColors[cond] || '#94a3b8');

            const div = document.createElement('div');
            div.style.cssText = [
                'display:flex', 'flex-direction:column', 'align-items:center',
                'cursor:pointer', 'padding:0 1px',
                'transition:transform 0.1s ease',
                sel ? 'transform:scale(1.18) translateY('+(isUpper(num)?'4px':'-4px')+')' : '',
            ].join(';');

            div.innerHTML =
                toothSVG(num, cond, sel) +
                `<span style="font-size:6.5px;font-weight:700;color:${col};
                    margin-top:1px;line-height:1;font-family:'Cairo',sans-serif;">${num}</span>`;

            div.addEventListener('mouseenter', () => {
                if (_selectedNum != num)
                    div.style.transform = `scale(1.15) translateY(${isUpper(num)?'3px':'-3px'})`;
            });
            div.addEventListener('mouseleave', () => {
                if (_selectedNum != num) div.style.transform = '';
            });
            div.addEventListener('click', () => selectTooth(num));
            return div;
        }

        function makeSep() {
            const d = document.createElement('div');
            d.style.cssText = 'width:1.5px;background:#e2e8f0;border-radius:1px;margin:0 3px;align-self:stretch;flex-shrink:0;';
            return d;
        }

        upper.innerHTML = '';
        lower.innerHTML = '';
        upper.style.cssText = 'display:flex;flex-wrap:nowrap;justify-content:center;align-items:flex-end;gap:0;overflow-x:auto;padding:4px 2px 0;';
        lower.style.cssText = 'display:flex;flex-wrap:nowrap;justify-content:center;align-items:flex-start;gap:0;overflow-x:auto;padding:0 2px 4px;';

        UPPER.forEach((n,i) => { if(i===8) upper.appendChild(makeSep()); upper.appendChild(makeCell(n)); });
        LOWER.forEach((n,i) => { if(i===8) lower.appendChild(makeSep()); lower.appendChild(makeCell(n)); });
    }

    function selectTooth(num) {
        const hidden = document.getElementById('treatmentToothNumber');
        const label  = document.getElementById('treatmentToothPickerLabel');
        _selectedNum = (_selectedNum == num) ? null : num;
        if (hidden) hidden.value = _selectedNum ? String(_selectedNum) : '';
        if (label)  label.textContent = _selectedNum ? `— Tooth #${_selectedNum}` : '';
        buildMiniChart(_selectedNum);
    }

    // ── override buildToothPicker ──────────────────────────────────
    window.buildToothPicker = function() {
        const pid = window.currentProfilePatientId;
        if (pid) {
            loadPatientToothStates(pid).then(() => buildMiniChart(_selectedNum));
        } else {
            buildMiniChart(_selectedNum);
        }
    };

    window.selectToothInPicker = function(num) { selectTooth(num); };

    // ── patch openModal ────────────────────────────────────────────
    const _origOpen = window.openModal;
    window.openModal = function(modalId, extra) {
        if (typeof _origOpen === 'function') _origOpen(modalId, extra);
        if (modalId !== 'addTreatmentModal') return;

        _selectedNum = null;
        const hidden = document.getElementById('treatmentToothNumber');
        const label  = document.getElementById('treatmentToothPickerLabel');
        if (hidden) hidden.value = '';
        if (label)  label.textContent = '';

        const pid = window.currentProfilePatientId;
        if (pid) {
            loadPatientToothStates(pid).then(() => {
                if (extra && typeof extra === 'number') {
                    _selectedNum = extra;
                    if (hidden) hidden.value = String(extra);
                    if (label)  label.textContent = `— Tooth #${extra}`;
                }
                buildMiniChart(_selectedNum);
            });
        } else {
            setTimeout(() => buildMiniChart(null), 30);
        }
    };

    // ── sync dental chart after save ──────────────────────────────
    window.addEventListener('load', () => {
        const form = document.getElementById('newTreatmentForm');
        if (!form || form._tpPatched) return;
        form._tpPatched = true;
        form.addEventListener('submit', () => {
            setTimeout(async () => {
                const pid = window.currentProfilePatientId;
                if (!pid) return;
                if (typeof window.generateDentalChart   === 'function') await window.generateDentalChart(pid);
                if (typeof window.renderSessionPayments === 'function') await window.renderSessionPayments(pid);
            }, 350);
        }, true);
    });

    console.log('[ToothPickerPatch] v3 ✅ no gradient conflicts');
})();