/* 9xai Student Portal — role-based SPA against the SIS API (same origin).
   Roles: student (info · schedule · e-registration), teacher (info · teaching,
   assignments come from the registrar), admin/registrar (workspace · sync).
   Zero-build vanilla JS; hash-routed; change-detected polling. */

"use strict";

/* ── tiny utilities ─────────────────────────────────────────────────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function api(path, method = "GET", body) {
  const r = await fetch("/api" + path, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let msg = r.status;
    try { msg = (await r.json()).detail || msg; } catch { /* keep status */ }
    throw new Error(msg);
  }
  return r.status === 204 ? null : r.json();
}

function toast(msg, isErr = false) {
  const el = document.createElement("div");
  el.className = "toast" + (isErr ? " err" : "");
  el.textContent = msg;
  $("#toast-stack").append(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .25s"; }, 3000);
  setTimeout(() => el.remove(), 3400);
}

const HUES = [225, 262, 195, 330, 160, 20, 285, 45];
function avatar(name, sm = false) {
  const h = HUES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
  const ini = name.split(/\s+/).map((w) => w[0] || "").join("").slice(0, 2).toUpperCase();
  return `<span class="avatar${sm ? " sm" : ""}" aria-hidden="true"
    style="background:linear-gradient(135deg,hsl(${h} 62% 52%),hsl(${(h + 28) % 360} 62% 44%))">${esc(ini)}</span>`;
}

function ago(ts) {
  if (!ts) return "";
  const s = (Date.now() - new Date(ts.replace(" ", "T") + "Z").getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${s / 60 | 0}m`;
  if (s < 86400) return `${s / 3600 | 0}h`;
  return `${s / 86400 | 0}d`;
}

const roleChip   = (r) => `<span class="chip ${r === "teacher" ? "c-teacher" : "c-student"}">${r}</span>`;
const statusChip = (s) => `<span class="chip ${s === "active" ? "c-active" : "c-dropped"}">${s}</span>`;
const modeChip   = (m) => `<span class="chip plain ${m === "live" ? "c-ok" : m === "dry" ? "c-warn" : "c-neut"}">${m}</span>`;
const tgtChip    = (t) => `<span class="chip plain ${t === "whocan" ? "c-whocan" : "c-prov"}">${t === "whocan" ? "WhoCan" : "Microsoft"}</span>`;
const openChip   = (closed) => closed
  ? `<span class="chip c-err">مغلقة · closed</span>`
  : `<span class="chip c-ok">مفتوحة · open</span>`;

/* ── session ────────────────────────────────────────────────────────────── */
function session() {
  try { return JSON.parse(localStorage.getItem("sis-session")) || null; }
  catch { return null; }
}
const saveSession  = (s) => localStorage.setItem("sis-session", JSON.stringify(s));
const clearSession = () => localStorage.removeItem("sis-session");

/* ── state ──────────────────────────────────────────────────────────────── */
const S = {
  terms: [], profile: null, offerings: [], schedule: null,
  people: [], courses: [], regs: [], outbox: { counts: {}, rows: [] },
  log: [], health: null,
  selected: null, role: "student",
  regFilter: "all", regQuery: "", personQuery: "", offQuery: "",
  eregTab: "offered", busy: false, _sig: null,
};
const currentTerm = () => S.terms.find((t) => t.is_current);
const me = () => session()?.person?.sis_id;

/* ── role → navigation ──────────────────────────────────────────────────── */
const TITLES = {
  home:      ["My information", "معلومات الطالب"],
  schedule:  ["My schedule", "الجدول الدراسي"],
  ereg:      ["E-Registration", "التسجيل الإلكتروني"],
  teaching:  ["My teaching", "جدولي التدريسي"],
  adash:     ["Dashboard", "الرئيسية"],
  aregister: ["Registrar", "التسجيل"],
  aregs:     ["Registrations", "التسجيلات"],
  sync:      ["Sync", "المزامنة"],
};
const ROLE_VIEWS = {
  student: ["home", "schedule", "ereg"],
  teacher: ["home", "teaching"],
  admin:   ["adash", "aregister", "aregs", "sync"],
};

/* ── data loading (per role) ────────────────────────────────────────────── */
async function loadForRole() {
  const s = session();
  if (!s) return;
  const jobs = [api("/terms").then((t) => (S.terms = t))];
  if (s.role === "admin") {
    jobs.push(
      api("/people").then((x) => (S.people = x)),
      api("/courses").then((x) => (S.courses = x)),
      api("/registrations").then((x) => (S.regs = x)),
      api("/outbox").then((x) => (S.outbox = x)),
      api("/sync-log").then((x) => (S.log = x)),
      api("/health").then((x) => (S.health = x)));
  } else {
    jobs.push(
      api(`/people/${me()}`).then((x) => (S.profile = x)),
      api(`/schedule/${me()}`).then((x) => (S.schedule = x)));
    if (s.role === "student")
      jobs.push(api(`/offerings?person=${me()}`).then((x) => (S.offerings = x)));
  }
  await Promise.all(jobs);
}

/* ── router ─────────────────────────────────────────────────────────────── */
function route() {
  const s = session();
  if (!s) return;
  const allowed = ROLE_VIEWS[s.role];
  let v = location.hash.replace("#/", "") || allowed[0];
  if (!allowed.includes(v)) v = allowed[0];
  $$(".view").forEach((el) => el.classList.toggle("active", el.id === "view-" + v));
  $$("#nav .nav-item").forEach((b) => {
    if (b.dataset.nav === v) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  const [en, ar] = TITLES[v];
  $("#view-title").innerHTML = `${en} <span class="ar" lang="ar">${ar}</span>`;
  render();
}

/* ── shared render bits ─────────────────────────────────────────────────── */
function renderTermPill() {
  const t = currentTerm();
  $("#term-pill").innerHTML = `<span class="dot"></span><span>${
    t ? `${esc(t.code)} · ${esc(t.name)}` : "no current term"}</span>`;
}
function tile(k, ar, v, d) {
  return `<div class="tile"><div class="k">${k}<span class="ar" lang="ar">${ar}</span></div>
    <div class="v num">${v}</div><div class="d">${d}</div></div>`;
}
function emptyBlock(icon, title, hint) {
  return `<div class="empty"><div class="big">${icon}</div><b>${title}</b><br>${hint}</div>`;
}

const IC = {
  id:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 17c.6-1.8 4.4-1.8 6 0"/><line x1="14" y1="9" x2="19" y2="9"/><line x1="14" y1="13" x2="19" y2="13"/></svg>`,
  user:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></svg>`,
  flag:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 22V4a2 2 0 0 1 2-2h9l-1 4h6v10h-8l1-4H6"/></svg>`,
  cake:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M12 8v5M8 10v3M16 10v3"/><path d="M12 4c.7.7.7 1.8 0 2.5S10.6 8.3 12 8"/></svg>`,
  pin:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3A19.5 19.5 0 0 1 5.2 13 19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="20" x2="20" y2="20"/><line x1="7" y1="20" x2="7" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="17" y1="20" x2="17" y2="10"/></svg>`,
  mail:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>`,
  venus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>`,
};
function infoItem(icon, en, ar, value, arValue = false) {
  if (value === null || value === undefined || value === "") return "";
  return `<div class="info-item"><span class="info-ic">${IC[icon]}</span>
    <div><div class="lbl">${en}<span class="ar" lang="ar">${ar}</span></div>
    <div class="val"${arValue ? ' lang="ar"' : ""}>${esc(value)}</div></div></div>`;
}

/* ── views: student + teacher ───────────────────────────────────────────── */
function renderHome() {
  const p = S.profile, sch = S.schedule;
  if (!p) { $("#view-home").innerHTML = emptyBlock("⏳", "Loading…", ""); return; }
  const isStudent = session().role === "student";
  const tiles = isStudent ? `
    <div class="tiles">
      ${tile("Registered credits", "الساعات المسجلة", sch ? sch.total_credits : 0, `term ${esc(sch?.term || "—")}`)}
      ${tile("Registered courses", "المواد المسجلة", sch ? sch.rows.length : 0, "this semester")}
      ${tile("High-school avg", "معدل الثانوية", p.hs_avg ?? "—", "admission record")}
    </div>` : `
    <div class="tiles">
      ${tile("Sections taught", "الشعب المسندة", sch ? sch.rows.length : 0, `term ${esc(sch?.term || "—")}`)}
      ${tile("Students", "عدد الطلاب", sch ? sch.rows.reduce((a, r) => a + (r.enrolled || 0), 0) : 0, "across your sections")}
    </div>`;
  $("#view-home").innerHTML = `
    ${tiles}
    <div class="card">
      <div class="hd">
        <div style="display:flex;align-items:center;gap:13px;width:100%">
          ${avatar(p.first + " " + p.last)}
          <div style="flex:1"><h2 style="margin:0">${esc(p.first)} ${esc(p.last)}</h2>
            <div class="sub" style="margin:0">${esc(p.sis_id)} · ${esc(p.email)}</div></div>
          <span class="chip plain ${p.kind === "teacher" ? "c-teacher" : "c-student"}">${esc(p.kind)}</span>
        </div>
      </div>
      <div class="bd"><div class="info-grid">
        ${infoItem("id", "National ID", "الرقم الوطني", p.national_id)}
        ${infoItem("user", "SIS ID", "الرقم الجامعي", p.sis_id)}
        ${infoItem("venus", "Gender", "الجنس", p.gender, true)}
        ${infoItem("flag", "Nationality", "الجنسية", p.nationality, true)}
        ${infoItem("cake", "Birth date", "تاريخ الميلاد", p.birth_date)}
        ${infoItem("pin", "City", "المدينة", p.city, true)}
        ${infoItem("phone", "Phone", "رقم الهاتف", p.phone)}
        ${infoItem("mail", "Email", "البريد الإلكتروني", p.email)}
        ${isStudent ? infoItem("chart", "High-school average", "معدل الثانوية", p.hs_avg) : ""}
      </div>
      <p style="color:var(--muted);font-size:12px;margin:14px 2px 0">
        ✔ All data above is maintained by Admission &amp; Registration — contact the registrar for corrections.
        <span lang="ar">البيانات أعلاه بإشراف القبول والتسجيل — للتعديل يرجى مراجعة التسجيل.</span></p>
      </div>
    </div>`;
}

function schedTable(rows, { forTeacher = false } = {}) {
  if (!rows.length)
    return emptyBlock("📅", forTeacher ? "No sections assigned yet" : "No registered courses",
      forTeacher ? "The registrar assigns your sections — they appear here."
                 : "Use E-Registration to add courses.");
  const cols = forTeacher
    ? `<th>Course<span class="ar" lang="ar"> رقم المادة</span></th><th>Title<span class="ar" lang="ar"> اسم المادة</span></th>
       <th>Days<span class="ar" lang="ar"> الأيام</span></th><th>Time<span class="ar" lang="ar"> الوقت</span></th>
       <th>Room<span class="ar" lang="ar"> القاعة</span></th><th>Cr.<span class="ar" lang="ar"> الساعات</span></th>
       <th>Enrolled<span class="ar" lang="ar"> الطلبة</span></th>`
    : `<th>Course<span class="ar" lang="ar"> رقم المادة</span></th><th>Title<span class="ar" lang="ar"> اسم المادة</span></th>
       <th>Days<span class="ar" lang="ar"> الأيام</span></th><th>Time<span class="ar" lang="ar"> الوقت</span></th>
       <th>Room<span class="ar" lang="ar"> القاعة</span></th><th>Cr.<span class="ar" lang="ar"> الساعات</span></th>
       <th>Instructor<span class="ar" lang="ar"> المدرس</span></th>`;
  const body = rows.map((r) => `
    <tr>
      <td><b>${esc(r.code)}</b></td><td>${esc(r.title)}</td>
      <td lang="ar" class="num">${esc(r.days || "—")}</td>
      <td class="num">${esc(r.time_slot || "—")}</td>
      <td lang="ar">${esc(r.room || "—")}</td>
      <td class="num">${r.credits}</td>
      ${forTeacher
        ? `<td class="num seats">${r.enrolled}/${r.capacity}</td>`
        : `<td>${esc(r.instructor || "—")}</td>`}
    </tr>`).join("");
  const total = rows.reduce((a, r) => a + r.credits, 0);
  return `<table><thead><tr>${cols}</tr></thead><tbody>${body}
    <tr class="total-row"><td colspan="5">Total credits this term
      <span class="ar" lang="ar">مجموع الساعات لهذا الفصل</span></td>
      <td class="num">${total}</td><td></td></tr></tbody></table>`;
}

function renderSchedule() {
  const sch = S.schedule;
  $("#view-schedule").innerHTML = `
    <div class="card"><div class="hd"><h2>My weekly schedule</h2>
      <span class="ar" lang="ar">الجدول الدراسي</span>
      <div class="sub">Term ${esc(sch?.term || "—")} · courses sync to WhoCan and Microsoft Teams automatically</div></div>
      <div class="bd">${schedTable(sch?.rows || [])}</div></div>`;
}

function renderTeaching() {
  const sch = S.schedule;
  $("#view-teaching").innerHTML = `
    <div class="note-strip">🛈 Sections are assigned by the Registrar — you cannot self-register.
      <span lang="ar">تُسند الشعب من قِبل دائرة القبول والتسجيل.</span></div>
    <div class="card"><div class="hd"><h2>Sections I teach</h2>
      <span class="ar" lang="ar">جدولي التدريسي</span>
      <div class="sub">Term ${esc(sch?.term || "—")} · you own the Teams team of every section</div></div>
      <div class="bd">${schedTable(sch?.rows || [], { forTeacher: true })}</div></div>`;
}

/* e-registration: المواد المطروحة | التسجيل */
function renderEreg() {
  const q = S.offQuery.toLowerCase();
  const offs = S.offerings.filter((o) =>
    !q || `${o.code} ${o.title} ${o.instructor || ""}`.toLowerCase().includes(q));
  const tabBtn = (id, en, ar) => `
    <button aria-pressed="${S.eregTab === id}" data-etab="${id}">${en}
      <span class="ar" lang="ar">${ar}</span></button>`;

  const offeredTable = offs.length ? `
    <table><thead><tr>
      <th>Course<span class="ar" lang="ar"> رقم المادة</span></th>
      <th>Title<span class="ar" lang="ar"> اسم المادة</span></th>
      <th>Days<span class="ar" lang="ar"> الأيام</span></th>
      <th>Time<span class="ar" lang="ar"> الوقت</span></th>
      <th>Room<span class="ar" lang="ar"> القاعة</span></th>
      <th>Cr.</th><th>Instructor<span class="ar" lang="ar"> المدرس</span></th>
      <th>Seats<span class="ar" lang="ar"> المقاعد</span></th>
      <th>Status<span class="ar" lang="ar"> الحالة</span></th></tr></thead>
    <tbody>${offs.map((o) => `
      <tr class="${o.closed ? "is-closed" : ""}">
        <td><b>${esc(o.code)}</b></td><td>${esc(o.title)}
          ${o.my_status === "active" ? ` <span class="chip c-active">مسجّل</span>` : ""}</td>
        <td lang="ar" class="num">${esc(o.days || "—")}</td>
        <td class="num">${esc(o.time_slot || "—")}</td>
        <td lang="ar">${esc(o.room || "—")}</td>
        <td class="num">${o.credits}</td>
        <td>${esc(o.instructor || "—")}</td>
        <td class="seats num">${o.seats}/${o.capacity}</td>
        <td>${openChip(o.closed)}</td>
      </tr>`).join("")}</tbody></table>`
    : emptyBlock("📚", "No matching courses", "Adjust the search.");

  const registerable = offs.filter((o) => o.my_status !== "active");
  const mine = offs.filter((o) => o.my_status === "active");
  const registerTab = `
    ${mine.length ? `
      <div class="field"><label>My registered courses <span class="ar" lang="ar">موادّي المسجلة</span></label>
        <div class="sched">${mine.map((o) => `
          <div class="srow"><span class="cc">${esc(o.code)}</span>
            <span class="ct">${esc(o.title)} · ${esc(o.days || "")} ${esc(o.time_slot || "")}</span>
            <span class="chip c-active">مسجّل</span>
            <button class="x" data-selfdrop="${esc(o.sis_id)}">Drop</button></div>`).join("")}
        </div></div>` : ""}
    <div class="field"><label>Available to register <span class="ar" lang="ar">المتاح للتسجيل</span></label>
      ${registerable.length ? `<div class="sched">${registerable.map((o) => `
        <div class="srow ${o.closed ? "is-closed" : ""}">
          <span class="cc">${esc(o.code)}</span>
          <span class="ct">${esc(o.title)} · ${esc(o.instructor || "بدون مدرس")} ·
            <span class="seats">${o.seats}/${o.capacity}</span></span>
          ${o.closed ? openChip(true)
            : `<button class="btn btn-primary" style="padding:6px 14px;font-size:12.5px"
                 data-selfreg="${esc(o.sis_id)}">Register <span class="ar" lang="ar">سجّل</span></button>`}
        </div>`).join("")}</div>`
      : emptyBlock("✅", "Nothing left to add", "You are registered in every open course.")}
    </div>`;

  $("#view-ereg").innerHTML = `
    <div class="card">
      <div class="hd"><h2>E-Registration</h2><span class="ar" lang="ar">التسجيل الإلكتروني</span>
        <div class="sub">Registering a course enrols you in WhoCan (LMS) and its Microsoft Teams class automatically.</div></div>
      <div class="bd">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:13px">
          <div class="seg" role="group" aria-label="E-registration tabs" id="ereg-tabs" style="min-width:320px">
            ${tabBtn("offered", "Offered courses", "المواد المطروحة")}
            ${tabBtn("register", "Register", "التسجيل")}
          </div>
          <div class="search-wrap" style="flex:1;min-width:220px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
            <input class="input" id="off-search" placeholder="ابحث عن مواد… / search courses" aria-label="Search courses" value="${esc(S.offQuery)}" />
          </div>
        </div>
        ${S.eregTab === "offered" ? offeredTable : registerTab}
      </div>
    </div>`;
}

/* ── views: admin (ported from v2) ──────────────────────────────────────── */
function renderAdash() {
  const active   = S.regs.filter((r) => r.status === "active");
  const students = new Set(active.filter((r) => r.role === "student").map((r) => r.person_sis_id));
  const teachers = new Set(active.filter((r) => r.role === "teacher").map((r) => r.person_sis_id));
  const ob = S.outbox.counts || {};
  const pend = ob.pending || 0, fail = ob.failed || 0;
  $("#tiles").innerHTML = `
    ${tile("Enrolled students", "الطلاب", students.size, `${S.people.length} people on file`)}
    ${tile("Teaching staff", "المدرّسون", teachers.size, `across ${S.courses.length} courses`)}
    ${tile("Active registrations", "تسجيلات نشطة", active.length, `${S.regs.length - active.length} dropped`)}
    ${tile("Sync queue", "قائمة المزامنة", pend,
      pend + fail === 0 ? `all delivered · ${ob.sent || 0} sent`
        : fail ? `<span class="chip plain c-err">⚠ ${fail} failed</span>` : "awaiting drain")}`;
  const byCourse = S.courses.map((c) => ({
    code: c.code,
    n: active.filter((r) => r.course_sis_id === c.sis_id).length,
  })).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...byCourse.map((x) => x.n));
  $("#barlist").innerHTML = byCourse.map((c) => `
    <div class="barrow"><div class="lbl">${esc(c.code)}</div>
      <div class="track"><div class="fill" style="width:${c.n / max * 100}%"></div></div>
      <div class="val num">${c.n}</div></div>`).join("") ||
    emptyBlock("📚", "No courses yet", "Seed demo data via /docs.");
  $("#dash-feed").innerHTML = feedLines(S.log.slice(0, 8)) ||
    emptyBlock("📡", "No sync activity yet", "Register someone, then drain.");
}

function renderAregister() {
  const q = S.personQuery.toLowerCase();
  const people = S.people.filter((p) =>
    !q || `${p.first} ${p.last} ${p.sis_id} ${p.email}`.toLowerCase().includes(q));
  $("#plist").innerHTML = people.map((p) => `
    <button class="prow" role="option" data-sel="${esc(p.sis_id)}"
      aria-selected="${S.selected === p.sis_id}">
      ${avatar(p.first + " " + p.last)}
      <span><span class="n">${esc(p.first)} ${esc(p.last)}</span><br>
        <span class="s">${esc(p.sis_id)} · ${esc(p.kind)}</span></span>
      <span class="chip plain ${p.kind === "teacher" ? "c-teacher" : "c-neut"}">${esc(p.kind)}</span>
    </button>`).join("") || emptyBlock("👤", "Nobody on file", "Seed via /docs.");

  const p = S.people.find((x) => x.sis_id === S.selected);
  if (!p) {
    $("#sel-hd").innerHTML = `<h2>Select a person</h2><span class="ar" lang="ar">اختر شخصًا</span>`;
    $("#sel-bd").innerHTML = emptyBlock("👈", "Pick someone from the list",
      "Their registrations and actions appear here.");
    return;
  }
  const mine = S.regs.filter((r) => r.person_sis_id === p.sis_id && r.status === "active");
  const activeIds = new Set(mine.map((r) => r.course_sis_id));
  const t = currentTerm();
  const pickable = S.courses.filter((c) => !activeIds.has(c.sis_id));
  $("#sel-hd").innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;width:100%">
      ${avatar(p.first + " " + p.last)}
      <div style="flex:1"><h2 style="margin:0">${esc(p.first)} ${esc(p.last)}</h2>
        <div class="sub" style="margin:0">${esc(p.sis_id)} · ${esc(p.email)}</div></div>
      <span class="chip plain ${p.kind === "teacher" ? "c-teacher" : "c-neut"}">${esc(p.kind)}</span>
    </div>`;
  $("#sel-bd").innerHTML = `
    <div class="field"><label>Active registrations <span class="ar" lang="ar">التسجيلات النشطة</span></label>
      <div class="sched">${mine.length ? mine.map((r) => `
        <div class="srow"><span class="cc">${esc(r.course_code)}</span>
          <span class="ct">${esc(r.title)}</span>${roleChip(r.role)}
          <button class="x" data-drop="${esc(r.course_sis_id)}">Drop</button></div>`).join("")
        : `<div class="empty" style="padding:12px">None this term.</div>`}</div></div>
    <div class="field"><label>Add / assign <span class="ar" lang="ar">إضافة / إسناد</span></label>${
      pickable.length ? `<select class="input" id="course-pick">${
        pickable.map((c) => `<option value="${esc(c.sis_id)}">${esc(c.code)} — ${esc(c.title)}</option>`).join("")}
      </select>` : `<div class="empty" style="padding:10px;text-align:left">Registered everywhere.</div>`}</div>
    <div class="field"><label>Role <span class="ar" lang="ar">الدور</span></label>
      <div class="seg" role="group" aria-label="Role">
        <button id="role-student" aria-pressed="${S.role === "student"}">Student <span class="ar" lang="ar">طالب</span></button>
        <button id="role-teacher" aria-pressed="${S.role === "teacher"}">Teacher <span class="ar" lang="ar">مدرّس</span></button>
      </div></div>
    <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">
      <button class="btn btn-primary" id="do-register" ${t && pickable.length ? "" : "disabled"}>
        ${S.role === "teacher" ? "Assign as teacher" : "Register as student"}</button>
      <span style="color:var(--muted);font-size:12.5px">${
        t ? `into <b>${esc(t.code)}</b> — flows to WhoCan + Teams` : "no current term"}</span>
    </div>`;
}

function renderAregs() {
  const q = S.regQuery.toLowerCase();
  const rows = S.regs.filter((r) =>
    (S.regFilter === "all" || r.status === S.regFilter) &&
    (!q || `${r.first} ${r.last} ${r.person_sis_id} ${r.course_code} ${r.title}`
      .toLowerCase().includes(q)));
  $("#reg-table").innerHTML = rows.length ? `
    <table><thead><tr><th>Person</th><th>Course</th><th>Term</th><th>Role</th>
      <th>Status</th><th>Updated</th><th></th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr>
          <td><span class="person-cell">${avatar(r.first + " " + r.last, true)}
            <span><span class="n">${esc(r.first)} ${esc(r.last)}</span><br>
              <span class="s">${esc(r.person_sis_id)}</span></span></span></td>
          <td><b>${esc(r.course_code)}</b> <span style="color:var(--muted)">· ${esc(r.title)}</span></td>
          <td class="num">${esc(r.term_code)}</td>
          <td>${roleChip(r.role)}</td>
          <td>${statusChip(r.status)}</td>
          <td class="num" style="color:var(--muted)">${ago(r.updated_at)}</td>
          <td style="text-align:right">${
            r.status === "active"
              ? `<button class="btn btn-danger" style="padding:5px 12px;font-size:12px"
                   data-drop-reg="${esc(r.person_sis_id)}|${esc(r.course_sis_id)}">Drop</button>`
              : `<button class="btn btn-soft" style="padding:5px 12px;font-size:12px"
                   data-rereg="${esc(r.person_sis_id)}|${esc(r.course_sis_id)}|${esc(r.role)}">Re-register</button>`}</td>
        </tr>`).join("")}</tbody></table>`
    : emptyBlock("🗂", "Nothing matches", "Adjust the search or filter.");
}

function renderSync() {
  const ob = S.outbox.counts || {};
  const modes = (S.health && S.health.modes) || {};
  $("#sync-tiles").innerHTML = `
    ${tile("Pending", "بالانتظار", ob.pending || 0, "queued for delivery")}
    ${tile("Delivered", "تم التسليم", ob.sent || 0, "idempotent — replays converge")}
    ${tile("Failed", "فشل", ob.failed || 0, ob.failed ? `<span class="chip plain c-err">needs attention</span>` : "none parked")}
    <div class="tile"><div class="k">Targets<span class="ar" lang="ar">الأنظمة</span></div>
      <div class="d" style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
        <span>${tgtChip("whocan")} ${modeChip(modes.whocan || "?")}</span>
        <span>${tgtChip("provision")} ${modeChip(modes.provision || "?")}</span>
      </div></div>`;
  $("#sync-feed").innerHTML = feedLines(S.log.slice(0, 60)) ||
    emptyBlock("📡", "No deliveries yet", "Register someone, then drain.");
}

function feedLines(lines) {
  if (!lines.length) return "";
  return lines.map((l) => {
    const st = l.status === "ok" ? `<span class="chip plain c-ok">ok</span>`
      : l.status === "would-send" ? `<span class="chip plain c-warn">dry</span>`
      : l.status === "skipped" ? `<span class="chip plain c-neut">skipped</span>`
      : `<span class="chip plain c-err">error</span>`;
    return `<div class="fline">${tgtChip(l.target)}<span class="act">${esc(l.action)}</span>
      ${st}<span class="det" title="${esc(l.detail)}">${esc(l.detail)}</span>
      <span class="ts">${ago(l.ts)}</span></div>`;
  }).join("");
}

function render() {
  if (!session()) return;
  renderTermPill();
  const allowed = ROLE_VIEWS[session().role];
  let v = location.hash.replace("#/", "") || allowed[0];
  if (!allowed.includes(v)) v = allowed[0];
  ({ home: renderHome, schedule: renderSchedule, ereg: renderEreg,
     teaching: renderTeaching, adash: renderAdash, aregister: renderAregister,
     aregs: renderAregs, sync: renderSync }[v])();
}

/* ── login screen ───────────────────────────────────────────────────────── */
async function renderLogin() {
  $("#login").style.display = "grid";
  $("#shell").style.display = "none";
  let people = [];
  try { people = await api("/people"); } catch { /* fresh db */ }
  if (!people.length) {
    try { await api("/seed", "POST"); people = await api("/people"); }
    catch { /* API down — cards below stay empty */ }
  }
  const card = (p) => `
    <button class="persona" data-login="${esc(p.sis_id)}">
      ${avatar(p.first + " " + p.last)}
      <span><span class="n">${esc(p.first)} ${esc(p.last)}</span><br>
        <span class="s">${esc(p.sis_id)}</span></span>
    </button>`;
  const students = people.filter((p) => p.kind === "student");
  const teachers = people.filter((p) => p.kind === "teacher");
  $("#login-personas").innerHTML = `
    <div class="role-h">Students <span class="ar" lang="ar">الطلبة</span></div>
    <div class="personas">${students.map(card).join("")}</div>
    <div class="role-h">Teachers <span class="ar" lang="ar">المدرّسون</span></div>
    <div class="personas">${teachers.map(card).join("")}</div>
    <div class="role-h">Administration <span class="ar" lang="ar">الإدارة</span></div>
    <div class="personas">
      <button class="persona admin" data-login="admin">
        <span class="avatar" style="background:linear-gradient(135deg,#3f4358,#6f7387)">RG</span>
        <span><span class="n">The Registrar</span><br><span class="s">admin · القبول والتسجيل</span></span>
      </button>
    </div>`;
}

function enterShell() {
  const s = session();
  $("#login").style.display = "none";
  $("#shell").style.display = "grid";
  $$("#nav .nav-item").forEach((b) =>
    b.style.display = b.dataset.roles.split(" ").includes(s.role) ? "" : "none");
  $("#id-name").textContent = s.name;
  $("#id-role").textContent = s.role === "admin" ? "Registrar · إدارة"
    : s.role === "teacher" ? "Teacher · مدرّس" : "Student · طالب";
  $("#id-avatar").innerHTML = avatar(s.name, true);
  location.hash = "#/" + ROLE_VIEWS[s.role][0];
  route();
}

/* ── confirm modal ──────────────────────────────────────────────────────── */
function confirmModal({ title, body, action, danger = true }) {
  return new Promise((resolve) => {
    const root = $("#modal-root");
    root.innerHTML = `<div class="modal-wrap" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal"><h3>${esc(title)}</h3><p>${body}</p>
        <div class="btns">
          <button class="btn btn-ghost" data-m="no">Cancel</button>
          <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-m="yes">${esc(action)}</button>
        </div></div></div>`;
    const done = (v) => { root.innerHTML = ""; resolve(v); };
    root.onclick = (e) => {
      if (e.target.dataset.m) done(e.target.dataset.m === "yes");
      else if (e.target.classList.contains("modal-wrap")) done(false);
    };
    document.addEventListener("keydown", function esc_(e) {
      if (e.key === "Escape") { document.removeEventListener("keydown", esc_); done(false); }
    });
    root.querySelector('[data-m="yes"]').focus();
  });
}

/* ── actions ────────────────────────────────────────────────────────────── */
async function guard(fn, okMsg) {
  if (S.busy) return;
  S.busy = true;
  try { await fn(); if (okMsg) toast(okMsg); }
  catch (e) { toast("‏" + e.message, true); }
  finally { S.busy = false; await refresh(true); }
}
const doRegister = (pid, cid, role) =>
  api(role === "teacher" ? "/assign" : "/register", "POST",
      { person_sis_id: pid, course_sis_id: cid });
const doDrop = (pid, cid) =>
  api("/drop", "POST", { person_sis_id: pid, course_sis_id: cid });

async function refresh(force = false) {
  if (!session()) return;
  try {
    await loadForRole();
    const sig = JSON.stringify([S.regs, S.outbox.counts, S.offerings,
      S.schedule, S.log[0] && S.log[0].id, S.health && S.health.modes]);
    if (force || sig !== S._sig) { S._sig = sig; render(); }
  } catch { /* transient — next tick retries */ }
}

/* ── events ─────────────────────────────────────────────────────────────── */
function wire() {
  document.addEventListener("click", async (e) => {
    // login persona
    const lg = e.target.closest("[data-login]");
    if (lg) {
      try {
        const s = await api("/login", "POST", { sis_id: lg.dataset.login });
        saveSession(s); enterShell(); await refresh(true);
        toast(`Signed in — أهلاً ${s.name}`);
      } catch (err) { toast(err.message, true); }
      return;
    }
    // student self-register / self-drop (e-registration view)
    const sr = e.target.closest("[data-selfreg]");
    if (sr) {
      const o = S.offerings.find((x) => x.sis_id === sr.dataset.selfreg);
      await guard(() => doRegister(me(), o.sis_id, "student"),
        `${o.code} registered — syncing to WhoCan + Teams`);
      return;
    }
    const sd = e.target.closest("[data-selfdrop]");
    if (sd) {
      const o = S.offerings.find((x) => x.sis_id === sd.dataset.selfdrop);
      const yes = await confirmModal({
        title: `Drop ${o.code}?`,
        body: `You will be removed from <b>${esc(o.code)}</b> in WhoCan and from its
          Teams class. Your grades and history in the LMS are kept.
          <span lang="ar">سيتم حذف المادة من جدولك.</span>`,
        action: "Drop course",
      });
      if (yes) await guard(() => doDrop(me(), o.sis_id), `${o.code} dropped`);
      return;
    }
  });

  $("#logout-btn").addEventListener("click", () => {
    clearSession(); location.hash = ""; renderLogin();
  });

  // theme
  const applyTheme = (t) => {
    document.documentElement.dataset.theme = t;
    $("#i-moon").style.display = t === "dark" ? "none" : "";
    $("#i-sun").style.display = t === "dark" ? "" : "none";
  };
  applyTheme(localStorage.getItem("sis-theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : ""));
  $("#theme-btn").onclick = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "" : "dark";
    localStorage.setItem("sis-theme", next); applyTheme(next);
  };

  $("#nav").addEventListener("click", (e) => {
    const b = e.target.closest("[data-nav]");
    if (b) location.hash = "#/" + b.dataset.nav;
  });
  addEventListener("hashchange", route);

  // e-registration tabs + search (delegated — view re-renders)
  $("#view-ereg").addEventListener("click", (e) => {
    const t = e.target.closest("[data-etab]");
    if (t) { S.eregTab = t.dataset.etab; renderEreg(); }
  });
  $("#view-ereg").addEventListener("input", (e) => {
    if (e.target.id === "off-search") {
      S.offQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderEreg();
      const inp = $("#off-search"); inp.focus(); inp.setSelectionRange(pos, pos);
    }
  });

  // admin: registrar workspace
  $("#person-search").addEventListener("input", (e) => {
    S.personQuery = e.target.value; renderAregister();
  });
  $("#view-aregister").addEventListener("click", async (e) => {
    const sel = e.target.closest("[data-sel]");
    if (sel) { S.selected = sel.dataset.sel; renderAregister(); return; }
    if (e.target.id === "role-student") { S.role = "student"; renderAregister(); return; }
    if (e.target.id === "role-teacher") { S.role = "teacher"; renderAregister(); return; }
    if (e.target.id === "do-register") {
      const course = $("#course-pick")?.value;
      const p = S.people.find((x) => x.sis_id === S.selected);
      const c = S.courses.find((x) => x.sis_id === course);
      if (!p || !c) return;
      await guard(() => doRegister(p.sis_id, c.sis_id, S.role),
        `${p.first} ${S.role === "teacher" ? "assigned to" : "registered in"} ${c.code}`);
      return;
    }
    const drop = e.target.closest("[data-drop]");
    if (drop) {
      const p = S.people.find((x) => x.sis_id === S.selected);
      const c = S.courses.find((x) => x.sis_id === drop.dataset.drop);
      const yes = await confirmModal({
        title: `Drop ${c.code}?`,
        body: `<b>${esc(p.first)} ${esc(p.last)}</b> will be removed from
          <b>${esc(c.code)}</b> in WhoCan and Teams. LMS history is kept.`,
        action: "Drop course",
      });
      if (yes) await guard(() => doDrop(p.sis_id, c.sis_id), `${c.code} dropped`);
    }
  });

  // admin: registrations table
  $("#reg-search").addEventListener("input", (e) => { S.regQuery = e.target.value; renderAregs(); });
  $("#status-seg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    S.regFilter = b.dataset.f;
    $$("#status-seg button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    renderAregs();
  });
  $("#view-aregs").addEventListener("click", async (e) => {
    const d = e.target.closest("[data-drop-reg]");
    if (d) {
      const [pid, cid] = d.dataset.dropReg.split("|");
      const r = S.regs.find((x) => x.person_sis_id === pid && x.course_sis_id === cid);
      const yes = await confirmModal({
        title: `Drop ${r.course_code}?`,
        body: `<b>${esc(r.first)} ${esc(r.last)}</b> will be removed from
          <b>${esc(r.course_code)}</b> in WhoCan and Teams. LMS history is kept.`,
        action: "Drop course",
      });
      if (yes) await guard(() => doDrop(pid, cid), `${r.course_code} dropped`);
      return;
    }
    const rr = e.target.closest("[data-rereg]");
    if (rr) {
      const [pid, cid, role] = rr.dataset.rereg.split("|");
      await guard(() => doRegister(pid, cid, role), "Re-registered");
    }
  });

  // admin: sync actions
  $("#drain-btn").addEventListener("click", () => guard(async () => {
    const r = await api("/outbox/drain", "POST");
    toast(`Drained — ${r.sent} sent · ${r.retrying} retrying · ${r.failed} failed`);
  }));
  $("#reconcile-btn").addEventListener("click", () => guard(async () => {
    const r = await api("/reconcile", "POST");
    toast(`Reconcile: ${r.queued.enrol} enrol · ${r.queued.drop} drop · ${r.queued.account} account`);
  }));
}

/* ── boot ───────────────────────────────────────────────────────────────── */
(async function boot() {
  wire();
  if (session()) { enterShell(); await refresh(true); }
  else await renderLogin();
  setInterval(refresh, 4000);
})();
