import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const ink = "#090909";
const graphite = "#1b1b1b";
const smoke = "#f1f1ed";
const white = "#ffffff";
const red = "#e1121b";
const muted = "#66665f";
const line = "#d9d9d3";

function png(name) {
  return `data:image/png;base64,${fs.readFileSync(path.join(root, name)).toString("base64")}`;
}

function save(name, svg) {
  fs.writeFileSync(path.join(root, name), svg, "utf8");
}

function captureHtml(title, svg) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>html,body{margin:0;padding:0;width:1600px;min-height:1100px;overflow:visible;background:#fff}svg{display:block;width:1600px;height:1100px}</style></head><body>${svg}<script id="figma-html-to-design-capture" src="https://mcp.figma.com/mcp/html-to-design/capture.js"></script></body></html>`;
}

const assistant = png("10-assistant.png");
const admin = png("11-admin-login.png");
const translation = png("12-admin-malay-mixed-translation.png");
const compareEmpty = png("05-compare-empty.png");
const testDrive = png("07-book-test-drive.png");

const board3 = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100">
  <defs>
    <clipPath id="a"><rect x="72" y="262" width="520" height="224" rx="8"/></clipPath>
    <clipPath id="b"><rect x="72" y="510" width="250" height="210" rx="8"/></clipPath>
    <clipPath id="c"><rect x="342" y="510" width="250" height="210" rx="8"/></clipPath>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.12"/></filter>
  </defs>
  <rect width="1600" height="1100" fill="${white}"/>
  <rect width="14" height="1100" fill="${red}"/>
  <text x="72" y="70" font-family="Inter" font-size="13" font-weight="700" letter-spacing="2.2" fill="${red}">LAUNCH GATE  /  SECURITY · DATA · RELIABILITY</text>
  <text x="72" y="150" font-family="Oswald" font-size="64" font-weight="700" letter-spacing="-1.5" fill="${ink}">FIX THE FOUNDATION</text>
  <text x="72" y="218" font-family="Oswald" font-size="64" font-weight="700" letter-spacing="-1.5" fill="${ink}">BEFORE YOU BUY TRAFFIC.</text>
  <text x="980" y="112" font-family="Inter" font-size="18" fill="${muted}">Fourteen blockers can undermine trust, safety, or operations.</text>
  <text x="980" y="141" font-family="Inter" font-size="18" fill="${muted}">Resolve these before promoting the showroom heavily.</text>

  <rect x="64" y="252" width="536" height="244" rx="10" fill="${graphite}" filter="url(#shadow)"/>
  <image href="${assistant}" x="72" y="262" width="520" height="224" preserveAspectRatio="xMidYMid meet" clip-path="url(#a)"/>
  <rect x="72" y="444" width="520" height="42" fill="${ink}" fill-opacity="0.92"/>
  <text x="92" y="470" font-family="Inter" font-size="12" font-weight="700" letter-spacing="1.4" fill="${white}">10  ASSISTANT · RELIABLE ANSWERS NEED A RELEASE TEST</text>

  <rect x="64" y="502" width="266" height="260" rx="10" fill="${graphite}" filter="url(#shadow)"/>
  <image href="${admin}" x="72" y="510" width="250" height="210" preserveAspectRatio="xMidYMid meet" clip-path="url(#b)"/>
  <rect x="72" y="714" width="250" height="38" fill="${ink}" fill-opacity="0.94"/>
  <text x="88" y="738" font-family="Inter" font-size="11" font-weight="700" letter-spacing="1.1" fill="${white}">11  ADMIN · HARDEN ACCESS</text>

  <rect x="334" y="502" width="266" height="260" rx="10" fill="${graphite}" filter="url(#shadow)"/>
  <image href="${translation}" x="342" y="510" width="250" height="210" preserveAspectRatio="xMidYMid meet" clip-path="url(#c)"/>
  <rect x="342" y="714" width="250" height="38" fill="${ink}" fill-opacity="0.94"/>
  <text x="358" y="738" font-family="Inter" font-size="11" font-weight="700" letter-spacing="1.1" fill="${white}">12  LOCALIZATION · CRITICAL</text>

  <rect x="64" y="800" width="536" height="190" rx="8" fill="${ink}"/>
  <text x="92" y="842" font-family="Inter" font-size="12" font-weight="700" letter-spacing="1.8" fill="${red}">RELEASE RULE</text>
  <text x="92" y="890" font-family="Oswald" font-size="30" font-weight="600" fill="${white}">If the truth is not verified,</text>
  <text x="92" y="930" font-family="Oswald" font-size="30" font-weight="600" fill="${white}">do not let the UI imply it is.</text>
  <text x="92" y="966" font-family="Inter" font-size="14" fill="#bdbdb6">Inventory, claims, pricing, translations, and AI status all follow this rule.</text>

  <text x="656" y="282" font-family="Inter" font-size="12" font-weight="700" letter-spacing="2" fill="${red}">14 PRE-LAUNCH BLOCKERS</text>
  ${[
    ["01","Production DB seeding","Remove db:seed from Vercel builds."],
    ["02","Demo inventory &amp; prices","Replace samples with credible real stock."],
    ["03","Preview / production data","Separate Neon databases and write access."],
    ["04","Listing publish gate","Require complete specs, price, status, and location."],
    ["05","Vehicle-specific media","Require genuine photos and year/model consistency."],
    ["06","Trust pack &amp; claims","Evidence every inspection, history, and warranty claim."],
    ["07","Safe structured data","Escape JSON-LD and treat dealer text as untrusted."],
    ["08","Admin credential lifecycle","Provision once; add rotation, lockout, logs, and 2FA."],
    ["09","Booking abuse controls","Verify contact, hold slots, block duplicates and bots."],
    ["10","Private trade-in uploads","Use signed delivery, sessions, scans, and cleanup."],
    ["11","PDPA erasure workflow","Link copied PII and delete it through one lifecycle."],
    ["12","Durable email &amp; cron","Queue, retry, dead-letter, and expose delivery state."],
    ["13","Assistant release smoke test","Verify grounded Gemini answers and explicit fallback."],
    ["14","Reviewed locale catalogs","Render typed EN / BM / ZH messages server-side."]
  ].map((item,i)=>{
    const col=i<7?0:1; const row=i%7; const x=656+col*452; const y=314+row*94;
    return `<g>
      <rect x="${x}" y="${y}" width="428" height="78" rx="6" fill="${i<3?"#fff2f3":smoke}" stroke="${i<3?"#efb8bc":line}"/>
      <rect x="${x+14}" y="${y+14}" width="42" height="42" rx="21" fill="${i<3?red:ink}"/>
      <text x="${x+35}" y="${y+41}" text-anchor="middle" font-family="Oswald" font-size="18" font-weight="700" fill="${white}">${item[0]}</text>
      <text x="${x+70}" y="${y+29}" font-family="Inter" font-size="14" font-weight="700" fill="${ink}">${item[1]}</text>
      <text x="${x+70}" y="${y+53}" font-family="Inter" font-size="12.5" fill="${muted}">${item[2]}</text>
    </g>`;
  }).join("\n")}

  <rect x="640" y="998" width="888" height="44" rx="4" fill="${red}"/>
  <text x="664" y="1026" font-family="Inter" font-size="12" font-weight="700" letter-spacing="1.6" fill="${white}">RELEASE GATE  ·  ZERO DEMO DATA  ·  ZERO MIXED-LOCALE STATES  ·  EXPLICIT AI FALLBACK</text>
  <text x="72" y="1058" font-family="Inter" font-size="11" font-weight="700" letter-spacing="1.6" fill="${muted}">PRESTIGE MOTORS  ·  LAUNCH READINESS</text>
  <text x="1484" y="1058" font-family="Inter" font-size="11" font-weight="700" letter-spacing="1.2" fill="${muted}">03 / 05</text>
</svg>`;

const phases = [
  {n:"0",time:"0–2 WEEKS",title:"STABILIZE TRUTH",color:red,items:["Remove production seeding","Replace demo stock","Fail closed on env config","Fix JSON-LD and admin auth","Ship reviewed locale catalogs","Add assistant release smoke test"],metric:["No demo data","No mixed-language states","Grounded or explicit AI fallback"]},
  {n:"1",time:"2–6 WEEKS",title:"CONVERT MOBILE",color:white,items:["Resolve floating-control collisions","Launch filter / sort sheet","Add sticky detail actions","Confirm / cancel / reschedule bookings","Convert trade-in to four steps","Improve compare and empty states"],metric:["Zero content collisions","Form completion baseline","Lead conversion baseline"]},
  {n:"2",time:"6–12 WEEKS",title:"PROFESSIONALIZE",color:white,items:["Custom domain and branded email","Showroom, team, SSM, map, hours","Real reviews and delivery stories","12+ photo listing standard","Roles, audit log, listing QA","Ownership-cost and Malaysia FAQ"],metric:["Publish-quality score","Trust-pack coverage","Review and contact lift"]},
  {n:"3",time:"3–6 MONTHS",title:"SCALE OPERATIONS",color:white,items:["Durable job queue and outbox","Lead SLA and stock aging","Trusted conversion analytics","Monitoring and incident runbooks","Backup / restore drills","SEO inventory landing pages"],metric:["Delivery success rate","Lead response time","View → sale funnel"]}
];

const board4 = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100">
  <rect width="1600" height="1100" fill="${ink}"/>
  <rect x="0" y="0" width="14" height="1100" fill="${red}"/>
  <text x="64" y="70" font-family="Inter" font-size="13" font-weight="700" letter-spacing="2.2" fill="${red}">PHASED ROADMAP  /  SEQUENCE BEFORE SPEED</text>
  <text x="64" y="158" font-family="Oswald" font-size="68" font-weight="700" letter-spacing="-1.8" fill="${white}">SHIP IT IN FOUR</text>
  <text x="64" y="228" font-family="Oswald" font-size="68" font-weight="700" letter-spacing="-1.8" fill="${white}">CONTROLLED PHASES.</text>
  <text x="940" y="120" font-family="Inter" font-size="18" fill="#c9c9c2">Every phase has an outcome, a finite build list,</text>
  <text x="940" y="150" font-family="Inter" font-size="18" fill="#c9c9c2">and a measurable exit condition.</text>
  <line x1="96" y1="306" x2="1504" y2="306" stroke="#4b4b46" stroke-width="2"/>
  ${phases.map((p,i)=>{
    const x=64+i*382;
    return `<g>
      <circle cx="${x+44}" cy="306" r="28" fill="${i===0?red:graphite}" stroke="${i===0?red:"#686862"}" stroke-width="2"/>
      <text x="${x+44}" y="315" text-anchor="middle" font-family="Oswald" font-size="25" font-weight="700" fill="${white}">${p.n}</text>
      <rect x="${x}" y="352" width="352" height="610" rx="8" fill="${i===0?"#1f1112":graphite}" stroke="${i===0?red:"#3a3a36"}"/>
      <text x="${x+24}" y="398" font-family="Inter" font-size="12" font-weight="700" letter-spacing="1.8" fill="${i===0?red:"#a9a9a2"}">${p.time}</text>
      <text x="${x+24}" y="444" font-family="Oswald" font-size="30" font-weight="600" fill="${white}">${p.title}</text>
      <line x1="${x+24}" y1="468" x2="${x+328}" y2="468" stroke="${i===0?"#5f2629":"#44443f"}"/>
      ${p.items.map((item,j)=>`<g><circle cx="${x+30}" cy="${506+j*50}" r="3.5" fill="${i===0?red:"#8b8b84"}"/><text x="${x+44}" y="${511+j*50}" font-family="Inter" font-size="14" fill="#e2e2dc">${item}</text></g>`).join("\n")}
      <rect x="${x+20}" y="812" width="312" height="126" rx="6" fill="${i===0?red:"#252522"}"/>
      <text x="${x+38}" y="842" font-family="Inter" font-size="10.5" font-weight="700" letter-spacing="1.6" fill="${i===0?white:"#a9a9a2"}">EXIT CONDITION</text>
      ${p.metric.map((m,j)=>`<text x="${x+38}" y="${872+j*24}" font-family="Inter" font-size="13" fill="${i===0?white:"#ddddda"}">— ${m}</text>`).join("\n")}
    </g>`;
  }).join("\n")}
  <text x="64" y="1028" font-family="Inter" font-size="11" font-weight="700" letter-spacing="1.7" fill="#8d8d86">PRESTIGE MOTORS  ·  EXECUTION ROADMAP</text>
  <text x="1482" y="1028" font-family="Inter" font-size="11" font-weight="700" letter-spacing="1.2" fill="#8d8d86">04 / 05</text>
  <text x="64" y="1065" font-family="Inter" font-size="15" fill="#c9c9c2">Do not start growth experiments until trustworthy inventory, analytics, and release safety exist.</text>
</svg>`;

const board5 = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100">
  <defs>
    <clipPath id="d"><rect x="782" y="168" width="356" height="204" rx="8"/></clipPath>
    <clipPath id="e"><rect x="1160" y="168" width="356" height="204" rx="8"/></clipPath>
    <filter id="s" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.12"/></filter>
  </defs>
  <rect width="1600" height="1100" fill="${smoke}"/>
  <rect x="0" y="0" width="14" height="1100" fill="${red}"/>
  <text x="64" y="66" font-family="Inter" font-size="13" font-weight="700" letter-spacing="2.2" fill="${red}">DESIGN PRINCIPLES  /  WHAT TO PRESERVE · WHAT TO BUILD NEXT</text>
  <text x="64" y="142" font-family="Oswald" font-size="58" font-weight="700" letter-spacing="-1.4" fill="${ink}">BUILD A DEALERSHIP SYSTEM,</text>
  <text x="64" y="204" font-family="Oswald" font-size="58" font-weight="700" letter-spacing="-1.4" fill="${ink}">NOT JUST A SHOWROOM.</text>
  <text x="64" y="250" font-family="Inter" font-size="17" fill="${muted}">Premium presentation must connect to verifiable inventory and disciplined operations.</text>

  <rect x="772" y="158" width="376" height="258" rx="10" fill="${white}" filter="url(#s)"/>
  <image href="${compareEmpty}" x="782" y="168" width="356" height="204" preserveAspectRatio="xMidYMid meet" clip-path="url(#d)"/>
  <text x="794" y="397" font-family="Inter" font-size="11" font-weight="700" letter-spacing="1.3" fill="${ink}">05  COMPARE EMPTY · KEEP THE DIRECT NEXT STEP</text>
  <rect x="1150" y="158" width="376" height="258" rx="10" fill="${white}" filter="url(#s)"/>
  <image href="${testDrive}" x="1160" y="168" width="356" height="204" preserveAspectRatio="xMidYMid meet" clip-path="url(#e)"/>
  <text x="1172" y="397" font-family="Inter" font-size="11" font-weight="700" letter-spacing="1.3" fill="${ink}">07  TEST DRIVE · BRING THE FORM ABOVE THE FOLD</text>

  <rect x="64" y="314" width="650" height="664" rx="8" fill="${ink}"/>
  <text x="94" y="360" font-family="Inter" font-size="12" font-weight="700" letter-spacing="2" fill="${red}">STRENGTHS TO PRESERVE</text>
  ${[
    ["01","Editorial black / white / red system","Distinctive, premium, and worth protecting."],
    ["02","Strong hierarchy and direct CTAs","The product tells customers what to do next."],
    ["03","Accessible structural foundations","Landmarks, labels, focus behavior, and dialog semantics exist."],
    ["04","Finance caveats and trust-pack intent","Transparency is already part of the product idea."],
    ["05","Real workflow breadth","Compare, trade-in, booking, alerts, analytics, and admin are present."],
    ["06","AI fallback and human handoff","Make it observable and grounded; do not throw it away."]
  ].map((it,i)=>{
    const y=402+i*88;
    return `<g><text x="94" y="${y}" font-family="Oswald" font-size="26" font-weight="700" fill="${red}">${it[0]}</text><text x="152" y="${y-3}" font-family="Inter" font-size="15" font-weight="700" fill="${white}">${it[1]}</text><text x="152" y="${y+23}" font-family="Inter" font-size="13" fill="#bdbdb6">${it[2]}</text><line x1="94" y1="${y+47}" x2="682" y2="${y+47}" stroke="#343430"/></g>`;
  }).join("\n")}

  <text x="772" y="478" font-family="Inter" font-size="12" font-weight="700" letter-spacing="2" fill="${red}">SIX OPERATING PRINCIPLES</text>
  ${[
    "Trust before polish",
    "One primary CTA per vehicle state",
    "Evidence attached to every factual claim",
    "Mobile controls never cover customer content",
    "English, BM, and Chinese render server-side",
    "Every async job is observable and retryable"
  ].map((t,i)=>{
    const y=516+i*49;
    return `<g><rect x="772" y="${y-24}" width="356" height="38" rx="4" fill="${white}"/><rect x="772" y="${y-24}" width="6" height="38" fill="${i<2?red:ink}"/><text x="794" y="${y+1}" font-family="Inter" font-size="14" font-weight="700" fill="${ink}">${t}</text></g>`;
  }).join("\n")}

  <text x="1160" y="478" font-family="Inter" font-size="12" font-weight="700" letter-spacing="2" fill="${red}">RECOMMENDED BUILD ORDER</text>
  ${[
    "Real stock + production-safe deploys",
    "Publish gate + trust evidence",
    "Typed EN / BM / ZH localization",
    "Mobile conversion and booking flow",
    "Secure uploads, admin access, PDPA",
    "Durable jobs and notifications",
    "Dealer credibility and content depth",
    "Analytics, automation, and growth"
  ].map((t,i)=>{
    const y=510+i*48;
    return `<g><circle cx="1180" cy="${y}" r="17" fill="${i===0?red:ink}"/><text x="1180" y="${y+5}" text-anchor="middle" font-family="Oswald" font-size="14" font-weight="700" fill="${white}">${i+1}</text><text x="1210" y="${y+5}" font-family="Inter" font-size="14" fill="${ink}">${t}</text></g>`;
  }).join("\n")}

  <rect x="772" y="914" width="754" height="64" rx="6" fill="${red}"/>
  <text x="800" y="954" font-family="Oswald" font-size="25" font-weight="600" fill="${white}">NEXT DECISION: REAL INVENTORY + LAUNCH GATE FIRST.</text>
  <text x="64" y="1048" font-family="Inter" font-size="11" font-weight="700" letter-spacing="1.7" fill="${muted}">PRESTIGE MOTORS  ·  DESIGN NORTH STAR</text>
  <text x="1482" y="1048" font-family="Inter" font-size="11" font-weight="700" letter-spacing="1.2" fill="${muted}">05 / 05</text>
</svg>`;

save("Board 03 — Launch Blockers.svg", board3);
save("Board 04 — Phased Roadmap.svg", board4);
save("Board 05 — Design Principles.svg", board5);
save("board-03-capture.html", captureHtml("Board 03 — Launch Blockers", board3));
save("board-04-capture.html", captureHtml("Board 04 — Phased Roadmap", board4));
save("board-05-capture.html", captureHtml("Board 05 — Design Principles", board5));
