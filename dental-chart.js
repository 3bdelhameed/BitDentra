// ══════════════════════════════════════════════════════════════════
//  dental-chart.js  —  Real SVG Tooth Shapes (FDI Numbering)
//  Based on the scientific illustration provided
// ══════════════════════════════════════════════════════════════════
//
//  Upper: 18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28
//  Lower: 48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38
//
//  Each tooth is an SVG path drawn to match the real anatomy:
//  - Molars: wide crown, multiple roots
//  - Premolars: bicuspid shape
//  - Canines: pointed single root
//  - Incisors: flat, chisel-shaped
//  - Wisdom: similar to molars but slightly smaller

// ── SURFACE STATE COLORS ─────────────────────────────────────────
const TOOTH_COLORS = {
    healthy:    { crown: '#f5f0e8', outline: '#c9b99a', root: '#e8ddd0', rootLine: '#c9b99a' },
    treated:    { crown: '#fee2e2', outline: '#ef4444', root: '#fecaca', rootLine: '#ef4444' },
    crown_work: { crown: '#fef3c7', outline: '#f59e0b', root: '#fde68a', rootLine: '#f59e0b' },
    missing:    { crown: '#f1f5f9', outline: '#94a3b8', root: '#f1f5f9', rootLine: '#94a3b8' },
    root_canal: { crown: '#ede9fe', outline: '#8b5cf6', root: '#ddd6fe', rootLine: '#8b5cf6' },
    implant:    { crown: '#d1fae5', outline: '#10b981', root: '#a7f3d0', rootLine: '#10b981' },
    bridge:     { crown: '#dbeafe', outline: '#3b82f6', root: '#bfdbfe', rootLine: '#3b82f6' },
    fracture:   { crown: '#ffedd5', outline: '#f97316', root: '#fed7aa', rootLine: '#f97316' },
    decay:      { crown: '#fef9c3', outline: '#ca8a04', root: '#fef08a', rootLine: '#ca8a04' },
    selected:   { crown: '#bfdbfe', outline: '#2563eb', root: '#93c5fd', rootLine: '#2563eb' },
};

// ── TOOTH TYPE DEFINITIONS ────────────────────────────────────────
// Types: 'molar', 'premolar', 'canine', 'lateral', 'central', 'wisdom'
const TOOTH_TYPE = {
    // Upper right
    18:'wisdom', 17:'molar', 16:'molar',  15:'premolar', 14:'premolar',
    13:'canine', 12:'lateral', 11:'central',
    // Upper left
    21:'central', 22:'lateral', 23:'canine',
    24:'premolar', 25:'premolar', 26:'molar', 27:'molar', 28:'wisdom',
    // Lower right
    48:'wisdom', 47:'molar', 46:'molar',  45:'premolar', 44:'premolar',
    43:'canine', 42:'lateral', 41:'central',
    // Lower left
    31:'central', 32:'lateral', 33:'canine',
    34:'premolar', 35:'premolar', 36:'molar', 37:'molar', 38:'wisdom',
};

function isUpperTooth(num) {
    return num >= 11 && num <= 28;
}

// ── SVG PATH GENERATOR ───────────────────────────────────────────
// Returns SVG string for a tooth, oriented correctly (upper=root up, lower=root down)
function getToothSVG(num, condition = 'healthy', isSelected = false, surfaces = {}) {
    const type = TOOTH_TYPE[num] || 'molar';
    const isUpper = isUpperTooth(num);
    // ✅ FIX: دايماً استخدم لون العلاج — مش تبدله بالأزرق لما السنة مختارة
    const col = TOOTH_COLORS[condition] || TOOTH_COLORS.healthy;
    const missing = condition === 'missing';

    // SVG viewBox is always 40×70 (crown+root together)
    // Upper teeth: crown at bottom, root at top
    // Lower teeth: crown at top, root at bottom
    let svg = '';

    if (missing) {
        // Just show an X for missing tooth
        const selectedStyle = isSelected
            ? 'filter:drop-shadow(0 0 5px rgba(37,99,235,0.9));outline:2px solid #2563eb;border-radius:4px;'
            : '';
        svg = `<svg viewBox="0 0 40 70" width="36" height="63" xmlns="http://www.w3.org/2000/svg" style="${selectedStyle}">
            <rect x="2" y="2" width="36" height="66" rx="4" fill="#f8fafc" stroke="${isSelected ? '#2563eb' : '#cbd5e1'}" stroke-width="${isSelected ? 2 : 1}" stroke-dasharray="4 2"/>
            <line x1="10" y1="15" x2="30" y2="55" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
            <line x1="30" y1="15" x2="10" y2="55" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
        return svg;
    }

    const paths = buildToothPaths(type, isUpper, col, surfaces);
    // ✅ FIX: التحديد يظهر كـ glow + border بدون ما يغير اللون
    const filterStyle = isSelected
        ? 'drop-shadow(0 0 5px rgba(37,99,235,0.9)) drop-shadow(0 0 2px rgba(37,99,235,0.6))'
        : 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))';

    svg = `<svg viewBox="0 0 40 70" width="36" height="63" xmlns="http://www.w3.org/2000/svg"
        style="filter:${filterStyle};">
        ${isSelected ? `<rect x="1" y="1" width="38" height="68" rx="5" fill="none" stroke="#2563eb" stroke-width="2" opacity="0.7"/>` : ''}
        ${paths}
    </svg>`;
    return svg;
}

function buildToothPaths(type, isUpper, col, surfaces = {}) {
    // Crown y-range and root y-range depend on orientation
    // Upper: crown bottom (y=35..65), roots top (y=5..35)
    // Lower: crown top (y=5..35), roots bottom (y=35..65)
    const flip = !isUpper;

    // Helper: flip y coordinate for lower teeth
    const fy = (y) => flip ? 70 - y : y;

    switch(type) {
        case 'central':  return buildCentral(col, fy, surfaces);
        case 'lateral':  return buildLateral(col, fy, surfaces);
        case 'canine':   return buildCanine(col, fy, surfaces);
        case 'premolar': return buildPremolar(col, fy, surfaces);
        case 'molar':    return buildMolar(col, fy, surfaces);
        case 'wisdom':   return buildWisdom(col, fy, surfaces);
        default:         return buildMolar(col, fy, surfaces);
    }
}

// ── CENTRAL INCISOR ──────────────────────────────────────────────
function buildCentral(col, fy, s) {
    const hasSurface = (name) => s[name] ? `fill="${TOOTH_COLORS.decay.crown}" stroke="${TOOTH_COLORS.decay.outline}"` : `fill="${col.crown}" stroke="${col.outline}"`;
    return `
    <!-- Root - single stout root, wide at CEJ tapering to rounded apex -->
    <!-- Left side: slight mesial convexity -->
    <path d="M14,${fy(6)} C13.5,${fy(10)} 12.5,${fy(18)} 12,${fy(26)} C11.5,${fy(33)} 13,${fy(38)} 20,${fy(38)} C14,${fy(38)} 13,${fy(33)} 13,${fy(26)} C12.5,${fy(18)} 13,${fy(10)} 14,${fy(6)} Z"
          fill="${col.root}" stroke="none"/>
    <!-- Right side: distal surface -->
    <path d="M26,${fy(6)} C26.5,${fy(10)} 27.5,${fy(18)} 28,${fy(26)} C28.5,${fy(33)} 27,${fy(38)} 20,${fy(38)} C26,${fy(38)} 27,${fy(33)} 27,${fy(26)} C27.5,${fy(18)} 27,${fy(10)} 26,${fy(6)} Z"
          fill="${col.root}" stroke="none"/>
    <!-- Root body fill -->
    <path d="M14,${fy(6)} C13,${fy(10)} 12,${fy(18)} 12,${fy(27)} C12,${fy(34)} 15,${fy(39)} 20,${fy(39)} C25,${fy(39)} 28,${fy(34)} 28,${fy(27)} C28,${fy(18)} 27,${fy(10)} 26,${fy(6)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="1.1" stroke-linejoin="round"/>
    <!-- Root top CEJ line -->
    <path d="M14,${fy(6)} L26,${fy(6)}" fill="none" stroke="${col.rootLine}" stroke-width="1.1"/>
    <!-- Labial longitudinal ridge groove -->
    <path d="M20,${fy(8)} C19.5,${fy(15)} 19,${fy(25)} 19.5,${fy(36)}" fill="none" stroke="${col.rootLine}" stroke-width="0.5" opacity="0.5"/>
    <!-- Mesial concavity -->
    <path d="M13,${fy(12)} C12.5,${fy(20)} 12.5,${fy(28)} 13,${fy(36)}" fill="none" stroke="${col.rootLine}" stroke-width="0.45" opacity="0.4"/>
    <!-- CEJ curve -->
    <path d="M10,${fy(39)} C13,${fy(41)} 20,${fy(42)} 30,${fy(39)}" fill="none" stroke="${col.rootLine}" stroke-width="0.7" opacity="0.45"/>
    <!-- Crown body -->
    <path d="M10,${fy(40)} C10,${fy(38)} 12,${fy(36)} 20,${fy(36)} C28,${fy(36)} 30,${fy(38)} 30,${fy(40)} L30,${fy(58)} C30,${fy(63)} 27,${fy(66)} 20,${fy(66)} C13,${fy(66)} 10,${fy(63)} 10,${fy(58)} Z"
          ${hasSurface('labial')} stroke-width="1.5"/>
    <!-- Mesial developmental groove -->
    <line x1="11" y1="${fy(42)}" x2="11" y2="${fy(59)}" stroke="${col.outline}" stroke-width="0.55" opacity="0.4"/>
    <!-- Distal developmental groove -->
    <line x1="29" y1="${fy(42)}" x2="29" y2="${fy(59)}" stroke="${col.outline}" stroke-width="0.55" opacity="0.4"/>
    <!-- Incisal edge -->
    <path d="M11,${fy(65)} C13,${fy(67)} 27,${fy(67)} 29,${fy(65)}" fill="none" stroke="${col.outline}" stroke-width="1" opacity="0.6"/>
    `;
}

// ── LATERAL INCISOR ──────────────────────────────────────────────
function buildLateral(col, fy, s) {
    return `
    <!-- Root - slender, often curved distally at apex -->
    <path d="M15,${fy(6)} C14,${fy(10)} 13,${fy(19)} 13,${fy(28)} C13,${fy(35)} 15.5,${fy(39)} 20,${fy(39)} C17,${fy(39)} 14.5,${fy(35)} 14.5,${fy(28)} C14,${fy(19)} 14.5,${fy(10)} 15,${fy(6)} Z"
          fill="${col.root}" stroke="none"/>
    <path d="M25,${fy(6)} C26,${fy(10)} 27,${fy(19)} 27,${fy(27)} C27,${fy(34)} 24.5,${fy(39)} 20,${fy(39)} C23,${fy(39)} 25.5,${fy(34)} 25.5,${fy(27)} C26,${fy(19)} 25.5,${fy(10)} 25,${fy(6)} Z"
          fill="${col.root}" stroke="none"/>
    <!-- Root body — slightly narrower than central, apex curves distally -->
    <path d="M15,${fy(6)} C14,${fy(11)} 13,${fy(20)} 13.5,${fy(29)} C14,${fy(36)} 16.5,${fy(39)} 20,${fy(39)} C23.5,${fy(39)} 26,${fy(35)} 26.5,${fy(28)} C27,${fy(20)} 26,${fy(11)} 25,${fy(6)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M15,${fy(6)} L25,${fy(6)}" fill="none" stroke="${col.rootLine}" stroke-width="1.1"/>
    <!-- Distal apical curvature groove (typical for laterals) -->
    <path d="M25,${fy(9)} C26,${fy(17)} 26.5,${fy(26)} 26,${fy(34)}" fill="none" stroke="${col.rootLine}" stroke-width="0.5" opacity="0.5"/>
    <!-- Mesial concavity -->
    <path d="M14,${fy(11)} C13.5,${fy(20)} 14,${fy(30)} 14.5,${fy(37)}" fill="none" stroke="${col.rootLine}" stroke-width="0.45" opacity="0.4"/>
    <!-- CEJ curve -->
    <path d="M10,${fy(39)} C13,${fy(41)} 20,${fy(42)} 30,${fy(39)}" fill="none" stroke="${col.rootLine}" stroke-width="0.7" opacity="0.4"/>
    <!-- Crown - slightly rounded -->
    <path d="M11,${fy(40)} C11,${fy(38)} 13,${fy(36)} 20,${fy(36)} C27,${fy(36)} 29,${fy(38)} 29,${fy(40)} L29,${fy(57)} C29,${fy(63)} 26,${fy(66)} 20,${fy(66)} C14,${fy(66)} 11,${fy(63)} 11,${fy(57)} Z"
          fill="${col.crown}" stroke="${col.outline}" stroke-width="1.5"/>
    <!-- Mesial groove -->
    <line x1="12" y1="${fy(42)}" x2="12" y2="${fy(58)}" stroke="${col.outline}" stroke-width="0.5" opacity="0.35"/>
    <!-- Distal groove -->
    <line x1="28" y1="${fy(42)}" x2="28" y2="${fy(58)}" stroke="${col.outline}" stroke-width="0.5" opacity="0.35"/>
    <path d="M12,${fy(64)} C14,${fy(67)} 26,${fy(67)} 28,${fy(64)}" fill="none" stroke="${col.outline}" stroke-width="0.8" opacity="0.5"/>
    `;
}

// ── CANINE ────────────────────────────────────────────────────────
function buildCanine(col, fy, s) {
    return `
    <!-- Canine: longest root in the mouth — stout, conical, single -->
    <!-- Left wall — gentle mesial curve -->
    <path d="M14,${fy(3)} C13.5,${fy(8)} 12.5,${fy(17)} 12,${fy(27)} C11.5,${fy(34)} 13,${fy(39)} 16,${fy(40)} C14,${fy(39)} 11.5,${fy(33)} 12,${fy(25)} C12,${fy(15)} 13,${fy(7)} 13,${fy(3)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="1"/>
    <!-- Right wall — slight distal lean -->
    <path d="M26,${fy(3)} C26.5,${fy(8)} 27.5,${fy(17)} 28,${fy(27)} C28.5,${fy(34)} 27,${fy(39)} 24,${fy(40)} C26,${fy(39)} 28.5,${fy(33)} 28,${fy(25)} C28,${fy(15)} 27,${fy(7)} 27,${fy(3)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="1"/>
    <!-- Root body -->
    <path d="M13,${fy(3)} C12,${fy(8)} 11.5,${fy(17)} 12,${fy(27)} C12,${fy(35)} 15,${fy(40)} 20,${fy(40)} C25,${fy(40)} 28,${fy(35)} 28,${fy(27)} C28.5,${fy(17)} 28,${fy(8)} 27,${fy(3)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="1.2"/>
    <!-- Prominent labial longitudinal ridge — canine hallmark -->
    <path d="M20,${fy(4)} C19.5,${fy(12)} 19,${fy(24)} 19.5,${fy(38)}" fill="none" stroke="${col.rootLine}" stroke-width="0.65" opacity="0.6"/>
    <!-- Distal root concavity -->
    <path d="M27,${fy(5)} C27.5,${fy(13)} 27.5,${fy(24)} 27,${fy(35)}" fill="none" stroke="${col.rootLine}" stroke-width="0.5" opacity="0.45"/>
    <!-- Mesial concavity -->
    <path d="M13,${fy(5)} C12.5,${fy(13)} 12,${fy(24)} 12.5,${fy(35)}" fill="none" stroke="${col.rootLine}" stroke-width="0.5" opacity="0.4"/>
    <!-- CEJ -->
    <path d="M9,${fy(40)} C12,${fy(43)} 28,${fy(43)} 31,${fy(40)}" fill="none" stroke="${col.rootLine}" stroke-width="0.7" opacity="0.45"/>
    <!-- Crown - pointed cusp -->
    <path d="M11,${fy(42)} C11,${fy(39)} 14,${fy(37)} 20,${fy(37)} C26,${fy(37)} 29,${fy(39)} 29,${fy(42)} L29,${fy(54)} C29,${fy(59)} 24,${fy(64)} 20,${fy(67)} C16,${fy(64)} 11,${fy(59)} 11,${fy(54)} Z"
          fill="${col.crown}" stroke="${col.outline}" stroke-width="1.5"/>
    <!-- Labial crown ridge -->
    <path d="M20,${fy(67)} C19,${fy(63)} 12.5,${fy(57)} 11.5,${fy(51)}" fill="none" stroke="${col.outline}" stroke-width="0.8" opacity="0.5"/>
    <path d="M20,${fy(67)} C21,${fy(63)} 27.5,${fy(57)} 28.5,${fy(51)}" fill="none" stroke="${col.outline}" stroke-width="0.8" opacity="0.5"/>
    `;
}

// ── PREMOLAR ──────────────────────────────────────────────────────
function buildPremolar(col, fy, s) {
    return `
    <!-- Buccal root — slightly wider, curved buccally -->
    <path d="M13,${fy(4)} C12.5,${fy(9)} 11.5,${fy(19)} 11,${fy(30)} C10.5,${fy(37)} 12,${fy(41)} 14,${fy(42)} C12,${fy(41)} 10,${fy(36)} 10,${fy(28)} C9.5,${fy(18)} 11,${fy(8)} 12,${fy(4)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="1"/>
    <path d="M12,${fy(4)} C11,${fy(9)} 10,${fy(19)} 10,${fy(30)} C9.5,${fy(38)} 12,${fy(42)} 15,${fy(43)} C13,${fy(42)} 11,${fy(37)} 11,${fy(28)} C10.5,${fy(18)} 12,${fy(8)} 13,${fy(4)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="0.9"/>
    <!-- Palatal root — longer, straighter -->
    <path d="M27,${fy(4)} C27.5,${fy(9)} 28.5,${fy(19)} 29,${fy(30)} C29.5,${fy(37)} 28,${fy(41)} 26,${fy(42)} C28,${fy(41)} 30,${fy(36)} 30,${fy(28)} C30.5,${fy(18)} 29,${fy(8)} 28,${fy(4)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="1"/>
    <path d="M28,${fy(4)} C29,${fy(9)} 30,${fy(19)} 30,${fy(30)} C30.5,${fy(38)} 28,${fy(42)} 25,${fy(43)} C27,${fy(42)} 29,${fy(37)} 29,${fy(28)} C29.5,${fy(18)} 28,${fy(8)} 27,${fy(4)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="0.9"/>
    <!-- Root trunk (fused at top, bifurcates below) -->
    <path d="M12,${fy(4)} L28,${fy(4)} L28,${fy(20)} C25,${fy(22)} 22,${fy(23)} 20,${fy(23)} C18,${fy(23)} 15,${fy(22)} 12,${fy(20)} Z"
          fill="${col.root}" stroke="none"/>
    <path d="M12,${fy(4)} L28,${fy(4)}" fill="none" stroke="${col.rootLine}" stroke-width="1.1"/>
    <!-- Furcation notch -->
    <path d="M12,${fy(20)} C15,${fy(24)} 18,${fy(25)} 20,${fy(24)} C22,${fy(25)} 25,${fy(24)} 28,${fy(20)}" fill="none" stroke="${col.rootLine}" stroke-width="0.7" opacity="0.65"/>
    <!-- Buccal root groove -->
    <path d="M11.5,${fy(6)} C11,${fy(14)} 10.5,${fy(24)} 11,${fy(36)}" fill="none" stroke="${col.rootLine}" stroke-width="0.5" opacity="0.5"/>
    <!-- Palatal root groove -->
    <path d="M28.5,${fy(6)} C29,${fy(14)} 29.5,${fy(24)} 29,${fy(36)}" fill="none" stroke="${col.rootLine}" stroke-width="0.5" opacity="0.5"/>
    <!-- CEJ -->
    <path d="M8,${fy(42)} C11,${fy(46)} 29,${fy(46)} 32,${fy(42)}" fill="none" stroke="${col.rootLine}" stroke-width="0.7" opacity="0.4"/>
    <!-- Crown - bicuspid shape -->
    <path d="M10,${fy(44)} C10,${fy(41)} 13,${fy(39)} 20,${fy(39)} C27,${fy(39)} 30,${fy(41)} 30,${fy(44)} L30,${fy(57)} C30,${fy(63)} 26,${fy(66)} 20,${fy(66)} C14,${fy(66)} 10,${fy(63)} 10,${fy(57)} Z"
          fill="${col.crown}" stroke="${col.outline}" stroke-width="1.5"/>
    <!-- Central fissure -->
    <path d="M20,${fy(41)} L20,${fy(59)}" stroke="${col.outline}" stroke-width="0.8" opacity="0.4"/>
    <!-- Buccal cusp -->
    <path d="M10,${fy(46)} C12,${fy(42)} 17,${fy(40)} 20,${fy(41)}" fill="none" stroke="${col.outline}" stroke-width="0.7" opacity="0.5"/>
    <!-- Lingual cusp -->
    <path d="M30,${fy(46)} C28,${fy(42)} 23,${fy(40)} 20,${fy(41)}" fill="none" stroke="${col.outline}" stroke-width="0.7" opacity="0.5"/>
    <!-- Transverse ridge -->
    <path d="M11,${fy(53)} C14,${fy(51)} 18,${fy(51)} 20,${fy(52)} C22,${fy(51)} 26,${fy(51)} 29,${fy(53)}" fill="none" stroke="${col.outline}" stroke-width="0.6" opacity="0.4"/>
    `;
}

// ── MOLAR ─────────────────────────────────────────────────────────
function buildMolar(col, fy, s) {
    // Surface-specific coloring
    const surf  = (name) => s[name] ? TOOTH_COLORS.decay.crown : col.crown;
    const surfS = (name) => s[name] ? `stroke="${TOOTH_COLORS.decay.outline}"` : `stroke="${col.outline}"`;

    return `
    <!-- Mesial root — wider, slightly curved mesially, rounded apex -->
    <path d="M8,${fy(4)} C7.5,${fy(9)} 6.5,${fy(18)} 6,${fy(29)} C5.5,${fy(37)} 7,${fy(42)} 9.5,${fy(44)} C8,${fy(43)} 6,${fy(38)} 6.5,${fy(28)} C6.5,${fy(18)} 8,${fy(8)} 9,${fy(4)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="1"/>
    <path d="M9,${fy(4)} C8,${fy(9)} 7,${fy(18)} 6.5,${fy(29)} C6,${fy(38)} 8,${fy(44)} 12,${fy(45)} C10,${fy(44)} 8,${fy(39)} 8,${fy(28)} C8,${fy(18)} 9.5,${fy(8)} 10,${fy(4)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="0.9"/>
    <!-- Mesial root grooves -->
    <path d="M7.5,${fy(6)} C7,${fy(14)} 6.5,${fy(24)} 7,${fy(37)}" fill="none" stroke="${col.rootLine}" stroke-width="0.55" opacity="0.5"/>

    <!-- Distal root — shorter, straighter, more conical -->
    <path d="M32,${fy(4)} C32.5,${fy(9)} 33.5,${fy(18)} 34,${fy(28)} C34.5,${fy(36)} 33,${fy(41)} 30.5,${fy(43)} C32,${fy(42)} 34,${fy(37)} 33.5,${fy(27)} C33.5,${fy(17)} 32,${fy(8)} 31,${fy(4)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="1"/>
    <path d="M31,${fy(4)} C32,${fy(9)} 33,${fy(18)} 33.5,${fy(28)} C34,${fy(37)} 32,${fy(43)} 28,${fy(44)} C30,${fy(43)} 32,${fy(38)} 32,${fy(27)} C32,${fy(17)} 30.5,${fy(8)} 30,${fy(4)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="0.9"/>
    <!-- Distal root groove -->
    <path d="M32.5,${fy(6)} C33,${fy(14)} 33.5,${fy(24)} 33,${fy(36)}" fill="none" stroke="${col.rootLine}" stroke-width="0.55" opacity="0.5"/>

    <!-- Root trunk — shared base before furcation -->
    <path d="M10,${fy(4)} L30,${fy(4)} L30,${fy(22)} C27,${fy(25)} 23.5,${fy(26)} 20,${fy(26)} C16.5,${fy(26)} 13,${fy(25)} 10,${fy(22)} Z"
          fill="${col.root}" stroke="none"/>
    <path d="M10,${fy(4)} L30,${fy(4)}" fill="none" stroke="${col.rootLine}" stroke-width="1.2"/>
    <!-- Furcation notch — anatomically concave -->
    <path d="M10,${fy(22)} C13,${fy(27)} 16.5,${fy(28)} 20,${fy(27)} C23.5,${fy(28)} 27,${fy(27)} 30,${fy(22)}" fill="none" stroke="${col.rootLine}" stroke-width="0.8" opacity="0.7"/>

    <!-- CEJ curve -->
    <path d="M5,${fy(44)} C9,${fy(48)} 31,${fy(48)} 35,${fy(44)}" fill="none" stroke="${col.rootLine}" stroke-width="0.7" opacity="0.4"/>

    <!-- Crown body -->
    <path d="M5,${fy(46)} C4,${fy(44)} 5,${fy(42)} 8,${fy(41)} C11,${fy(40)} 15,${fy(39)} 20,${fy(39)} C25,${fy(39)} 29,${fy(40)} 32,${fy(41)} C35,${fy(42)} 36,${fy(44)} 35,${fy(46)} L35,${fy(59)} C35,${fy(64)} 28.5,${fy(67)} 20,${fy(67)} C11.5,${fy(67)} 5,${fy(64)} 5,${fy(59)} Z"
          fill="${surf('occlusal')}" ${surfS('occlusal')} stroke-width="1.5"/>
    <!-- Buccal groove -->
    <path d="M20,${fy(41)} C19.5,${fy(46)} 19.5,${fy(56)} 20,${fy(64)}" fill="none" stroke="${col.outline}" stroke-width="0.7" opacity="0.45"/>
    <!-- Mesial marginal ridge -->
    <path d="M6,${fy(44)} C8,${fy(42)} 13,${fy(41)} 16,${fy(41)}" fill="none" stroke="${col.outline}" stroke-width="0.7" opacity="0.5"/>
    <!-- Distal marginal ridge -->
    <path d="M24,${fy(41)} C27,${fy(41)} 32,${fy(42)} 34,${fy(44)}" fill="none" stroke="${col.outline}" stroke-width="0.7" opacity="0.5"/>
    <!-- Central fossa ellipse -->
    <ellipse cx="20" cy="${(Math.min(fy(46),fy(66)) + Math.max(fy(46),fy(66)))/2}"
             rx="6" ry="5" fill="none" stroke="${col.outline}" stroke-width="0.6" opacity="0.38"/>
    <!-- Oblique ridge -->
    <path d="M12,${fy(50)} Q20,${fy(53)} 28,${fy(48)}" fill="none" stroke="${col.outline}" stroke-width="0.7" opacity="0.4"/>
    <!-- Mesial groove line -->
    <line x1="14" y1="${Math.min(fy(46),fy(66))+5}" x2="14" y2="${Math.max(fy(46),fy(66))-5}"
          stroke="${col.outline}" stroke-width="0.7" opacity="0.32"/>
    <!-- Distal groove line -->
    <line x1="26" y1="${Math.min(fy(46),fy(66))+5}" x2="26" y2="${Math.max(fy(46),fy(66))-5}"
          stroke="${col.outline}" stroke-width="0.7" opacity="0.32"/>
    `;
}

// ── WISDOM ───────────────────────────────────────────────────────
function buildWisdom(col, fy, s) {
    return `
    <!-- Wisdom teeth: roots often fused, shorter, curved distally -->
    <!-- Left root lobe -->
    <path d="M9,${fy(5)} C8.5,${fy(10)} 7.5,${fy(20)} 7,${fy(31)} C6.5,${fy(39)} 8,${fy(43)} 11,${fy(44)} C9,${fy(43)} 7,${fy(38)} 7.5,${fy(29)} C7.5,${fy(19)} 9,${fy(9)} 10,${fy(5)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="1"/>
    <!-- Right root lobe — curves distally (typical wisdom tooth) -->
    <path d="M29,${fy(5)} C29.5,${fy(10)} 30.5,${fy(19)} 31,${fy(29)} C31.5,${fy(37)} 30,${fy(42)} 27,${fy(44)} C29,${fy(43)} 31,${fy(38)} 30.5,${fy(28)} C30.5,${fy(18)} 29,${fy(9)} 28,${fy(5)} Z"
          fill="${col.root}" stroke="${col.rootLine}" stroke-width="1"/>
    <!-- Middle fused lobe -->
    <path d="M10,${fy(5)} C10,${fy(10)} 10,${fy(19)} 11,${fy(29)} C11.5,${fy(37)} 14,${fy(42)} 16,${fy(43)} C14,${fy(42)} 12,${fy(37)} 12,${fy(27)} C11.5,${fy(18)} 12,${fy(9)} 13,${fy(5)} Z"
          fill="${col.root}" stroke="none"/>
    <path d="M25,${fy(5)} C25,${fy(10)} 25,${fy(19)} 24,${fy(29)} C23.5,${fy(37)} 21,${fy(42)} 19,${fy(43)} C21,${fy(42)} 23,${fy(37)} 23,${fy(27)} C23.5,${fy(18)} 23,${fy(9)} 22,${fy(5)} Z"
          fill="${col.root}" stroke="none"/>
    <!-- Root trunk body -->
    <path d="M10,${fy(5)} L28,${fy(5)} L28,${fy(24)} C25,${fy(27)} 22,${fy(28)} 20,${fy(28)} C18,${fy(28)} 15,${fy(27)} 10,${fy(23)} Z"
          fill="${col.root}" stroke="none"/>
    <path d="M10,${fy(5)} L28,${fy(5)}" fill="none" stroke="${col.rootLine}" stroke-width="1.1"/>
    <!-- Furcation — wisdom roots diverge irregularly -->
    <path d="M10,${fy(23)} C13,${fy(28)} 16.5,${fy(30)} 20,${fy(28)} C23.5,${fy(30)} 25,${fy(27)} 28,${fy(24)}" fill="none" stroke="${col.rootLine}" stroke-width="0.7" opacity="0.6"/>
    <!-- Distobuccal curvature groove — wisdom hallmark -->
    <path d="M27.5,${fy(6)} C28,${fy(14)} 29,${fy(24)} 28.5,${fy(36)}" fill="none" stroke="${col.rootLine}" stroke-width="0.55" opacity="0.5"/>
    <path d="M10.5,${fy(6)} C10,${fy(14)} 9.5,${fy(24)} 10,${fy(36)}" fill="none" stroke="${col.rootLine}" stroke-width="0.55" opacity="0.5"/>
    <!-- CEJ -->
    <path d="M6,${fy(44)} C9,${fy(48)} 29,${fy(48)} 33,${fy(44)}" fill="none" stroke="${col.rootLine}" stroke-width="0.7" opacity="0.4"/>
    <!-- Crown - slightly smaller than molar -->
    <path d="M6,${fy(46)} C5,${fy(44)} 6,${fy(42)} 9,${fy(41)} C12,${fy(40)} 15.5,${fy(39)} 20,${fy(39)} C24.5,${fy(39)} 28,${fy(40)} 31,${fy(41)} C34,${fy(42)} 35,${fy(44)} 34,${fy(46)} L34,${fy(58)} C34,${fy(63)} 27.5,${fy(66)} 20,${fy(66)} C12.5,${fy(66)} 6,${fy(63)} 6,${fy(58)} Z"
          fill="${col.crown}" stroke="${col.outline}" stroke-width="1.5"/>
    <!-- Occlusal fissures -->
    <path d="M20,${fy(41)} C19.5,${fy(46)} 19.5,${fy(55)} 20,${fy(63)}" fill="none" stroke="${col.outline}" stroke-width="0.7" opacity="0.45"/>
    <path d="M8,${fy(53)} L32,${fy(53)}" fill="none" stroke="${col.outline}" stroke-width="0.6" opacity="0.35"/>
    <ellipse cx="20" cy="${(Math.min(fy(46),fy(65)) + Math.max(fy(46),fy(65)))/2}"
             rx="5" ry="4.5" fill="none" stroke="${col.outline}" stroke-width="0.5" opacity="0.35"/>
    `;
}

// ══════════════════════════════════════════════════════════════════
//  MAIN CHART RENDERER
// ══════════════════════════════════════════════════════════════════
async function generateDentalChart(patientId) {
    const upper = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
    const lower = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

    // Load states
    let states = [];
    if (window.dbGetAll) {
        states = await dbGetAll('tooth_states', { patient_id: patientId });
    } else {
        states = await db.toothStates.where('patientId').equals(patientId).toArray();
    }

    const stateMap = {};
    const surfaceMap = {};
    states.forEach(s => {
        const num = s.tooth_number || s.toothNumber;
        stateMap[num] = s.condition;
        surfaceMap[num] = s.surfaces || {};
    });

    function buildTooth(num) {
        const cond = stateMap[num] || 'healthy';
        const surfaces = surfaceMap[num] || {};
        const isSelected = selectedToothNum == num;

        return `<div class="tooth-wrapper" id="tooth-wrap-${num}" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.15s;user-select:none;"
            onclick="clickTooth(${num})"
            onmouseenter="this.style.transform='scale(1.12)'"
            onmouseleave="this.style.transform='scale(1)'"
            title="Tooth #${num} — ${cond}">
            ${getToothSVG(num, cond, isSelected, surfaces)}
            <span style="font-size:9px;font-weight:700;color:${isSelected?'#2563eb':'#6b7280'};margin-top:2px;letter-spacing:0.3px;background:${isSelected?'#eff6ff':'transparent'};padding:${isSelected?'0 4px':'0'};border-radius:4px;border:${isSelected?'1px solid #bfdbfe':'none'};transition:all 0.15s;">${num}</span>
        </div>`;
    }

    const upperContainer = document.getElementById('upperTeeth');
    const lowerContainer = document.getElementById('lowerTeeth');
    if (upperContainer) upperContainer.innerHTML = upper.map(buildTooth).join('');
    if (lowerContainer) lowerContainer.innerHTML = lower.map(buildTooth).join('');

    // Update legend counts
    updateChartLegend(stateMap);
}

function updateChartLegend(stateMap) {
    const counts = {};
    Object.values(stateMap).forEach(c => { counts[c] = (counts[c]||0) + 1; });

    const legendEl = document.getElementById('chartLegendCounts');
    if (!legendEl) return;
    const total = Object.keys(stateMap).length;
    legendEl.textContent = total ? `${total} teeth charted` : '';
}

// ── TOOTH CLICK ───────────────────────────────────────────────────
window.clickTooth = function(num) {
    selectedToothNum = num;
    // Highlight selected
    document.querySelectorAll('.tooth-wrapper').forEach(el => {
        el.style.filter = '';
    });
    const wrap = document.getElementById(`tooth-wrap-${num}`);
    if (wrap) wrap.style.filter = 'drop-shadow(0 0 6px rgba(37,99,235,0.8))';

    document.getElementById('toothActionTitle').innerText = `Tooth #${num}`;
    // Show current condition
    const wrap2 = document.getElementById(`tooth-wrap-${num}`);
    openModal('toothActionModal');
};

// ── TOOTH ACTION ─────────────────────────────────────────────────
window.toothAction = async function(action) {
    closeModal('toothActionModal');
    if (action === 'treatment') {
        openModal('addTreatmentModal', selectedToothNum);
        return;
    }

    const patientId = currentProfilePatientId;
    const toothNum  = selectedToothNum;

    if (action === 'clear') {
        if (window.dbGetAll) {
            const existing = await dbGetAll('tooth_states', { patient_id: patientId });
            const row = existing.find(r => (r.tooth_number||r.toothNumber) == toothNum);
            if (row) await dbDelete('tooth_states', row.id);
        } else {
            const ex = await db.toothStates.where('patientId').equals(patientId)
                .and(t => t.toothNumber == toothNum).first();
            if (ex) await db.toothStates.delete(ex.id);
        }
    } else {
        if (window.dbUpsert) {
            await dbUpsert('tooth_states',
                { patient_id: patientId, tooth_number: String(toothNum), condition: action, surfaces: {} },
                'patient_id,tooth_number'
            );
        } else {
            const ex = await db.toothStates.where('patientId').equals(patientId)
                .and(t => t.toothNumber == toothNum).first();
            if (ex) await db.toothStates.update(ex.id, { condition: action });
            else    await db.toothStates.add({ patientId, toothNumber: String(toothNum), condition: action });
        }
    }

    generateDentalChart(patientId);
    showToast('Tooth updated ✓');
};

// ══════════════════════════════════════════════════════════════════
//  ENHANCED TOOTH ACTION MODAL HTML (injected on init)
// ══════════════════════════════════════════════════════════════════
function upgradeToothActionModal() {
    const modal = document.getElementById('toothActionModal');
    if (!modal) return;

    modal.innerHTML = `
    <div class="modal-box max-w-xs">
        <div class="flex justify-between items-center mb-3 border-b pb-2">
            <h3 class="text-base font-bold flex items-center gap-2">
                <span style="font-size:18px">🦷</span>
                <span id="toothActionTitle">Tooth #</span>
            </h3>
            <button onclick="closeModal('toothActionModal')" class="text-gray-300 hover:text-red-400 text-xl w-7 h-7 flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <button onclick="toothAction('treatment')"
                class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition text-xs font-semibold">
                <i class="fa-solid fa-plus text-lg"></i> Add Treatment
            </button>
            <button onclick="toothAction('treated')"
                class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition text-xs font-semibold">
                <i class="fa-solid fa-circle-dot text-lg"></i> Treated (حشو)
            </button>
            <button onclick="toothAction('crown_work')"
                class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 transition text-xs font-semibold">
                <i class="fa-solid fa-crown text-lg"></i> Crown (تاج)
            </button>
            <button onclick="toothAction('missing')"
                class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition text-xs font-semibold">
                <i class="fa-solid fa-xmark text-lg"></i> Missing (مفقود)
            </button>
            <button onclick="toothAction('root_canal')"
                class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition text-xs font-semibold">
                <i class="fa-solid fa-tooth text-lg"></i> Root Canal (عصب)
            </button>
            <button onclick="toothAction('implant')"
                class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-700 transition text-xs font-semibold">
                <i class="fa-solid fa-bolt text-lg"></i> Implant (زرعة)
            </button>
            <button onclick="toothAction('bridge')"
                class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 transition text-xs font-semibold">
                <i class="fa-solid fa-link text-lg"></i> Bridge (جسر)
            </button>
            <button onclick="toothAction('decay')"
                class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 transition text-xs font-semibold">
                <i class="fa-solid fa-circle-exclamation text-lg"></i> Decay (تسوس)
            </button>
        </div>
        <button onclick="toothAction('clear')"
            class="w-full mt-2 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center gap-2 transition">
            <i class="fa-solid fa-eraser"></i> Clear / Healthy
        </button>
        <button onclick="closeModal('toothActionModal')"
            class="w-full mt-1 py-2 rounded-xl text-gray-400 text-xs hover:text-gray-600 transition">
            Cancel
        </button>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════
//  CHART LEGEND UPDATE
// ══════════════════════════════════════════════════════════════════
function upgradeChartLegend() {
    const legendEl = document.querySelector('#profileView .flex.gap-2.text-xs');
    if (!legendEl) return;

    legendEl.innerHTML = `
        <span class="flex items-center gap-1 text-[10px]">
            <svg width="14" height="14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#f5f0e8" stroke="#c9b99a" stroke-width="1.5"/></svg>Healthy
        </span>
        <span class="flex items-center gap-1 text-[10px]">
            <svg width="14" height="14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5"/></svg>Treated
        </span>
        <span class="flex items-center gap-1 text-[10px]">
            <svg width="14" height="14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/></svg>Crown
        </span>
        <span class="flex items-center gap-1 text-[10px]">
            <svg width="14" height="14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 1"/></svg>Missing
        </span>
        <span class="flex items-center gap-1 text-[10px]">
            <svg width="14" height="14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#ede9fe" stroke="#8b5cf6" stroke-width="1.5"/></svg>Root Canal
        </span>
        <span class="flex items-center gap-1 text-[10px]">
            <svg width="14" height="14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#d1fae5" stroke="#10b981" stroke-width="1.5"/></svg>Implant
        </span>
        <span class="flex items-center gap-1 text-[10px]">
            <svg width="14" height="14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/></svg>Bridge
        </span>
        <span id="chartLegendCounts" class="text-gray-400 ml-1"></span>
    `;
}

// Expose
window.generateDentalChart  = generateDentalChart;
window.upgradeToothActionModal = upgradeToothActionModal;
window.upgradeChartLegend   = upgradeChartLegend;
window.getToothSVG          = getToothSVG;
window.TOOTH_COLORS         = TOOTH_COLORS;