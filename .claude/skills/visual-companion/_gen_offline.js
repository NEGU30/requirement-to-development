/**
 * 离线化生成脚本 v2：只生成 HTML 中实际用到的 Tailwind 类
 */
const fs = require('fs');
const html = fs.readFileSync('AI开发流程设计分享_示例.html', 'utf8');

// 提取所有 class 属性中的类名
const usedClasses = new Set();
html.replace(/class="([^"]*)"/g, (_, c) => { c.split(/\s+/).forEach(x => { if(x) usedClasses.add(x); }); });
// 也从 JS 模板字符串中提取
html.replace(/className[^`]*`([^`]*)`/g, (_, c) => { c.split(/\s+/).forEach(x => { if(x) usedClasses.add(x); }); });

// ========== 颜色表 ==========
const C = {
  gray:   {50:'#f9fafb',100:'#f3f4f6',200:'#e5e7eb',300:'#d1d5db',400:'#9ca3af',500:'#6b7280',600:'#4b5563',700:'#374151',800:'#1f2937',900:'#111827'},
  blue:   {50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af'},
  emerald:{50:'#ecfdf5',100:'#d1fae5',200:'#a7f3d0',300:'#6ee7b7',400:'#34d399',500:'#10b981',600:'#059669',700:'#047857'},
  violet: {50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#8b5cf6',600:'#7c3aed',700:'#6d28d9',800:'#5b21b6'},
  amber:  {50:'#fffbeb',100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309',800:'#92400e'},
  orange: {50:'#fff7ed',100:'#ffedd5',200:'#fed7aa',300:'#fdba74',400:'#fb923c',500:'#f97316',600:'#ea580c',700:'#c2410c'},
  rose:   {50:'#fff1f2',100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#f43f5e',600:'#e11d48',700:'#be123c'},
  teal:   {50:'#f0fdfa',100:'#ccfbf1',200:'#99f6e4',300:'#5eead4',400:'#2dd4bf',500:'#14b8a6',600:'#0d9488',700:'#0f766e'},
  sky:    {50:'#f0f9ff',100:'#e0f2fe',200:'#bae6fd',300:'#7dd3fc',400:'#38bdf8',500:'#0ea5e9',600:'#0284c7',700:'#0369a1'},
  cyan:   {50:'#ecfeff',100:'#cffafe',200:'#a5f3fc',300:'#67e8f9',400:'#22d3ee',500:'#06b6d4',600:'#0891b2'},
  indigo: {50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca'},
  pink:   {50:'#fdf2f8',100:'#fce7f3',200:'#fbcfe8',300:'#f9a8d4',400:'#f472b6',500:'#ec4899',600:'#db2777'},
  red:    {50:'#fef2f2',100:'#fee2e2',200:'#fecaca',300:'#fca5a5',400:'#f87171',500:'#ef4444',600:'#dc2626',700:'#b91c1c'},
  purple: {50:'#faf5ff',100:'#f3e8ff',200:'#e9d5ff',300:'#d8b4fe',400:'#c084fc',500:'#a855f7',600:'#9333ea'},
};

function hexToRgba(hex, a) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// 解析颜色: "gray-500" => #6b7280, "blue-50/30" => rgba(...)
function parseColor(s) {
  if (s.startsWith('#')) return s;
  const m = s.match(/^(\w+)-(\d+)(?:\/(\d+))?$/);
  if (!m) return s === 'white' ? '#fff' : s === 'transparent' ? 'transparent' : null;
  const [,c,shade,op] = m;
  const hex = C[c]?.[shade];
  if (!hex) return null;
  return op ? hexToRgba(hex, parseInt(op)/100) : hex;
}

function cssEsc(s) { return s.replace(/\[/g,'\\[').replace(/\]/g,'\\]').replace(/\//g,'\\/').replace(/\./g,'\\.'); }

let out = '';

// ===== Preflight =====
out += `/* === Offline Preflight === */
*,*::before,*::after{box-sizing:border-box;border:0 solid #e5e7eb}
html{line-height:1.5;-webkit-text-size-adjust:100%;font-family:Inter,system-ui,-apple-system,sans-serif}
body{margin:0;line-height:inherit}
h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}
a{color:inherit;text-decoration:inherit}
button{background:transparent;padding:0}
img,svg{display:block;vertical-align:middle}
details,summary{display:block}
summary{cursor:pointer}
`;

// ===== Layout / Display =====
const simpleMap = {
  'hidden':'display:none','block':'display:block','inline-block':'display:inline-block',
  'flex':'display:flex','grid':'display:grid',
  'flex-col':'flex-direction:column','flex-1':'flex:1 1 0%','flex-wrap':'flex-wrap:wrap',
  'items-center':'align-items:center','items-stretch':'align-items:stretch',
  'justify-center':'justify-content:center','justify-between':'justify-content:space-between',
  'relative':'position:relative','absolute':'position:absolute','sticky':'position:sticky',
  'overflow-hidden':'overflow:hidden','overflow-x-auto':'overflow-x:auto','overflow-y-auto':'overflow-y:auto',
  'whitespace-nowrap':'white-space:nowrap',
  'text-left':'text-align:left','text-center':'text-align:center','uppercase':'text-transform:uppercase',
  'list-disc':'list-style-type:disc','list-circle':'list-style-type:circle','list-decimal':'list-style-type:decimal',
  'cursor-pointer':'cursor:pointer','select-none':'user-select:none',
  'antialiased':'-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale',
  'border-collapse':'border-collapse:collapse',
  'w-full':'width:100%','mx-auto':'margin-left:auto;margin-right:auto',
  'rounded':'border-radius:0.25rem','rounded-lg':'border-radius:0.5rem',
  'rounded-2xl':'border-radius:1rem','rounded-full':'border-radius:9999px','rounded-b-lg':'border-radius:0 0 0.5rem 0.5rem',
  'border':'border-width:1px','border-t':'border-top-width:1px','border-b':'border-bottom-width:1px',
  'border-l':'border-left-width:1px','border-r':'border-right-width:1px','border-b-2':'border-bottom-width:2px',
  'shrink-0':'flex-shrink:0',
  'transform':'transform:translateX(var(--tw-translate-x,0)) translateY(var(--tw-translate-y,0)) rotate(var(--tw-rotate,0)) scaleX(var(--tw-scale-x,1)) scaleY(var(--tw-scale-y,1))',
  'transition':'transition-property:color,background-color,border-color,opacity,box-shadow,transform;transition-timing-function:cubic-bezier(0.4,0,0.2,1);transition-duration:150ms',
  'transition-colors':'transition-property:color,background-color,border-color;transition-timing-function:cubic-bezier(0.4,0,0.2,1);transition-duration:150ms',
  'transition-opacity':'transition-property:opacity;transition-timing-function:cubic-bezier(0.4,0,0.2,1);transition-duration:150ms',
  'transition-transform':'transition-property:transform;transition-timing-function:cubic-bezier(0.4,0,0.2,1);transition-duration:150ms',
  'duration-200':'transition-duration:200ms',
  'opacity-0':'opacity:0',
  'shadow-sm':'box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)',
  'shadow-lg':'box-shadow:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1)',
  'backdrop-blur-sm':'backdrop-filter:blur(4px)',
  'inset-x-0':'left:0;right:0','top-0':'top:0','top-12':'top:3rem',
  'z-10':'z-index:10','z-20':'z-index:20','z-50':'z-index:50',
  'min-h-screen':'min-height:100vh','min-w-0':'min-width:0',
  'bg-gradient-to-r':'background-image:linear-gradient(to right,var(--tw-gradient-stops))',
  'bg-gradient-to-br':'background-image:linear-gradient(to bottom right,var(--tw-gradient-stops))',
  'from-transparent':'--tw-gradient-from:transparent;--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to,transparent)',
  'to-transparent':'--tw-gradient-to:transparent',
  'via-white':'--tw-gradient-stops:var(--tw-gradient-from),#fff,var(--tw-gradient-to,transparent)',
  'font-medium':'font-weight:500','font-semibold':'font-weight:600','font-bold':'font-weight:700',
  'font-black':'font-weight:900','font-normal':'font-weight:400',
  'tracking-tight':'letter-spacing:-0.025em','tracking-wider':'letter-spacing:0.05em','tracking-widest':'letter-spacing:0.1em',
  'leading-5':'line-height:1.25rem','leading-6':'line-height:1.5rem','leading-7':'line-height:1.75rem',
  'ml-auto':'margin-left:auto','my-4':'margin-top:1rem;margin-bottom:1rem',
  'pb-px':'padding-bottom:1px','scroll-mt-16':'scroll-margin-top:4rem',
  'scroll-smooth':'scroll-behavior:smooth',
};
for (const [cls, val] of Object.entries(simpleMap)) {
  if (usedClasses.has(cls)) out += `.${cls}{${val}}\n`;
}

// ===== Spacing =====
const sp = {0:'0',0.5:'0.125rem',1:'0.25rem',1.5:'0.375rem',2:'0.5rem',2.5:'0.625rem',3:'0.75rem',3.5:'0.875rem',4:'1rem',5:'1.25rem',6:'1.5rem',8:'2rem',10:'2.5rem',12:'3rem',16:'4rem'};
const spPrefixes = ['p','px','py','m','mx','mt','mb','ml','mr','pt','pb','pl','pr','gap'];
for (const [k,v] of Object.entries(sp)) {
  for (const p of spPrefixes) {
    const cls = `${p}-${k}`;
    if (!usedClasses.has(cls)) continue;
    let val;
    if (p==='p') val=`padding:${v}`;
    else if (p==='px') val=`padding-left:${v};padding-right:${v}`;
    else if (p==='py') val=`padding-top:${v};padding-bottom:${v}`;
    else if (p==='m') val=`margin:${v}`;
    else if (p==='mx') val=`margin-left:${v};margin-right:${v}`;
    else if (p==='mt') val=`margin-top:${v}`;
    else if (p==='mb') val=`margin-bottom:${v}`;
    else if (p==='ml') val=`margin-left:${v}`;
    else if (p==='mr') val=`margin-right:${v}`;
    else if (p==='pt') val=`padding-top:${v}`;
    else if (p==='pb') val=`padding-bottom:${v}`;
    else if (p==='pl') val=`padding-left:${v}`;
    else if (p==='pr') val=`padding-right:${v}`;
    else if (p==='gap') val=`gap:${v}`;
    const esc = k.includes('.') ? cls.replace('.','\\.') : cls;
    out += `.${esc}{${val}}\n`;
  }
}

// ===== Width / Height (arbitrary) =====
const whMap = {
  'w-2':'width:0.5rem','w-2.5':'width:0.625rem','w-3.5':'width:0.875rem','w-5':'width:1.25rem','w-52':'width:13rem',
  'max-w-2xl':'max-width:42rem','max-w-3xl':'max-width:48rem',
  'h-2':'height:0.5rem','h-2.5':'height:0.625rem','h-3.5':'height:0.875rem','h-5':'height:1.25rem','h-12':'height:3rem','h-px':'height:1px',
};
for (const [cls,val] of Object.entries(whMap)) {
  if (!usedClasses.has(cls)) continue;
  const esc = cls.replace('.','\\.');
  out += `.${esc}{${val}}\n`;
}
// Arbitrary values
if (usedClasses.has('h-[580px]')) out += `.h-\\[580px\\]{height:580px}\n`;
if (usedClasses.has('min-h-[400px]')) out += `.min-h-\\[400px\\]{min-height:400px}\n`;
if (usedClasses.has('min-h-[56px]')) out += `.min-h-\\[56px\\]{min-height:56px}\n`;

// ===== Font Size =====
const fontSizes = {
  'text-[9px]':'font-size:9px','text-[10px]':'font-size:10px','text-[11px]':'font-size:11px',
  'text-xs':'font-size:0.75rem;line-height:1rem',
  'text-sm':'font-size:0.875rem;line-height:1.25rem',
  'text-base':'font-size:1rem;line-height:1.5rem',
  'text-lg':'font-size:1.125rem;line-height:1.75rem',
  'text-2xl':'font-size:1.5rem;line-height:2rem',
  'text-3xl':'font-size:1.875rem;line-height:2.25rem',
};
for (const [cls,val] of Object.entries(fontSizes)) {
  if (!usedClasses.has(cls)) continue;
  const esc = cls.replace('[','\\[').replace(']','\\]');
  out += `.${esc}{${val}}\n`;
}

// ===== Colors (text / bg / border / from / via / to) =====
const colorPrefixes = [
  {p:'text', prop:'color'},
  {p:'bg', prop:'background-color'},
  {p:'border', prop:'border-color'},
  {p:'from', prop:'--tw-gradient-from', extra:true},
  {p:'to', prop:'--tw-gradient-to', extra:true},
  {p:'via', prop:null, extra:true},
];

// Iterate through all used classes and generate color rules
for (const cls of usedClasses) {
  for (const {p, prop, extra} of colorPrefixes) {
    if (!cls.startsWith(p+'-')) continue;
    const colorPart = cls.slice(p.length+1);
    const resolved = parseColor(colorPart);
    if (resolved === null) continue;
    const esc = cssEsc(cls);
    if (extra) {
      if (p === 'from') {
        out += `.${esc}{--tw-gradient-from:${resolved};--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to,rgba(0,0,0,0))}\n`;
      } else if (p === 'to') {
        out += `.${esc}{--tw-gradient-to:${resolved}}\n`;
      } else if (p === 'via') {
        // extract base color for "to" fallback
        const m = colorPart.match(/^(\w+)-(\d+)/);
        const baseHex = m ? C[m[1]]?.[m[2]] : null;
        const toFallback = baseHex ? hexToRgba(baseHex, 0) : 'rgba(0,0,0,0)';
        out += `.${esc}{--tw-gradient-stops:var(--tw-gradient-from),${resolved},var(--tw-gradient-to,${toFallback})}\n`;
      }
    } else {
      out += `.${esc}{${prop}:${resolved}}\n`;
    }
  }
}

// ===== Space-y =====
for (const [cls, val] of [['space-y-1','0.25rem'],['space-y-2','0.5rem'],['space-y-3','0.75rem'],['space-y-5','1.25rem'],['space-y-6','1.5rem'],['space-y-16','4rem']]) {
  if (usedClasses.has(cls)) out += `.${cls}>:not([hidden])~:not([hidden]){margin-top:${val}}\n`;
}

// ===== Hover states =====
for (const cls of usedClasses) {
  if (!cls.startsWith('hover:')) continue;
  const inner = cls.slice(6);
  for (const {p, prop, extra} of colorPrefixes) {
    if (!inner.startsWith(p+'-')) continue;
    const colorPart = inner.slice(p.length+1);
    const resolved = parseColor(colorPart);
    if (resolved === null) continue;
    const esc = cssEsc(cls);
    if (extra) continue;
    out += `.${esc}:hover{${prop}:${resolved}}\n`;
  }
}
// Special hover classes
const hoverSpecial = {
  'hover:shadow-sm':'box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)',
};
for (const [cls, val] of Object.entries(hoverSpecial)) {
  if (usedClasses.has(cls)) out += `.${cssEsc(cls)}:hover{${val}}\n`;
}

// ===== Focus =====
if (usedClasses.has('focus:outline-none')) out += `.focus\\:outline-none:focus{outline:2px solid transparent;outline-offset:2px}\n`;

// ===== Group-open =====
if (usedClasses.has('group-open:rotate-180')) out += `.group-open\\:rotate-180{transform:rotate(180deg)}\ndetails[open] .group-open\\:rotate-180{transform:rotate(180deg)}\n`;
if (usedClasses.has('group-open:rotate-90')) out += `.group-open\\:rotate-90{transform:rotate(90deg)}\ndetails[open] .group-open\\:rotate-90{transform:rotate(90deg)}\n`;

// ===== Responsive =====
if (usedClasses.has('sm:grid-cols-3')) out += '@media(min-width:640px){.sm\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}}\n';
if (usedClasses.has('sm:grid-cols-4')) out += '@media(min-width:640px){.sm\\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}}\n';
if (usedClasses.has('sm:block')) out += '@media(min-width:640px){.sm\\:block{display:block}}\n';
if (usedClasses.has('sm:w-60')) out += '@media(min-width:640px){.sm\\:w-60{width:15rem}}\n';
if (usedClasses.has('md:-mx-6')) out += '@media(min-width:768px){.md\\:-mx-6{margin-left:-1.5rem;margin-right:-1.5rem}}\n';
if (usedClasses.has('md:p-6')) out += '@media(min-width:768px){.md\\:p-6{padding:1.5rem}}\n';
if (usedClasses.has('md:p-8')) out += '@media(min-width:768px){.md\\:p-8{padding:2rem}}\n';
if (usedClasses.has('md:px-6')) out += '@media(min-width:768px){.md\\:px-6{padding-left:1.5rem;padding-right:1.5rem}}\n';
if (usedClasses.has('md:text-4xl')) out += '@media(min-width:768px){.md\\:text-4xl{font-size:2.25rem;line-height:2.5rem}}\n';
if (usedClasses.has('lg:grid-cols-[1.1fr_0.9fr]')) out += '@media(min-width:1024px){.lg\\:grid-cols-\\[1\\.1fr_0\\.9fr\\]{grid-template-columns:1.1fr 0.9fr}}\n';
if (usedClasses.has('lg:grid-cols-[0.7fr_1.5fr]')) out += '@media(min-width:1024px){.lg\\:grid-cols-\\[0\\.7fr_1\\.5fr\\]{grid-template-columns:0.7fr 1.5fr}}\n';
if (usedClasses.has('lg:hidden')) out += '@media(min-width:1024px){.lg\\:hidden{display:none}}\n';
if (usedClasses.has('lg:px-10')) out += '@media(min-width:1024px){.lg\\:px-10{padding-left:2.5rem;padding-right:2.5rem}}\n';
if (usedClasses.has('xl:grid-cols-[0.8fr_1.2fr]')) out += '@media(min-width:1280px){.xl\\:grid-cols-\\[0\\.8fr_1\\.2fr\\]{grid-template-columns:0.8fr 1.2fr}}\n';

fs.writeFileSync('_offline_tailwind.css', out);
console.log('Generated CSS:', out.length, 'bytes,', out.split('\n').length, 'lines');
