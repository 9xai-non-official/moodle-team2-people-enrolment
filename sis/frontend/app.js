/* 9xai Student Portal — application logic.
   Zero-build vanilla JS against the SIS API (same origin, /api/*).
   Views: dashboard · register · registrations · sync. Hash-routed. */

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
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .25s"; }, 2600);
  setTimeout(() => el.remove(), 2950);
}

/* deterministic avatar hue per person (identity ≠ status — decorative only) */
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
const tgtChip    = (t) => `<span class="chip plain tgt ${t === "whocan" ? "c-whocan" : "c-prov"}">${t === "whocan" ? "WhoCan" : "Microsoft"}</span>`;

/* ── state ──────────────────────────────────────────────────────────────── */
const S = {
  people: [], courses: [], terms: [], regs: [], outbox: { counts: {}, rows: [] },
  log: [], health: null,
  selected: null,          // person sis_id in the register workspace
  role: "student",         // chosen role for the next registration
  regFilter: "all", regQuery: "", personQuery: "",
  busy: false,
};
const currentTerm = () => S.terms.find((t) => t.is_current);

/* ── data refresh ───────────────────────────────────────────────────────── */
async function loadStatic() {
  [S.people, S.courses, S.terms] = await Promise.all(
    [api("/people"), api("/courses"), api("/terms")]);
}
async function loadLive() {
  [S.regs, S.outbox, S.log, S.health] = await Promise.all(
    [api("/registrations"), api("/outbox"), api("/sync-log"), api("/health")]);
}

/* ── router ─────────────────────────────────────────────────────────────── */
const TITLES = {
  dashboard:     ["Dashboard", "الرئيسية"],
  register:      ["Register", "تسجيل"],
  registrations: ["Registrations", "التسجيلات"],
  sync:          ["Sync", "المزامنة"],
};
function route() {
  const v = (location.hash.replace("#/", "") || "dashboard");
  const view = TITLES[v] ? v : "dashboard";
  $$(".view").forEach((el) => el.classList.toggle("active", el.id === "view-" + view));
  $$("#nav .nav-item").forEach((b) =>
    b.toggleAttribute("aria-current", b.dataset.nav === view) ||
    b.setAttribute("aria-current", b.dataset.nav === view ? "page" : "false"));
  $$("#nav .nav-item").forEach((b) => {
    if (b.dataset.nav === view) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  const [en, ar] = TITLES[view];
  $("#view-title").innerHTML = `${en} <span class="ar" lang="ar">${ar}</span>`;
  render();
}

/* ── renderers ──────────────────────────────────────────────────────────── */
function render() {
  renderTermPill();
  const v = location.hash.replace("#/", "") || "dashboard";
  if (v === "register")           renderRegister();
  else if (v === "registrations") renderRegTable();
  else if (v === "sync")          renderSync();
  else                            renderDashboard();
}

function renderTermPill() {
  const t = currentTerm();
  $("#term-pill").innerHTML = `<span class="dot"></span><span>${
    t ? `${esc(t.code)} · ${esc(t.name)}` : "no current term"}</span>`;
}

/* dashboard */
function renderDashboard() {
  const active   = S.regs.filter((r) => r.status === "active");
  const students = new Set(active.filter((r) => r.role === "student").map((r) => r.person_sis_id));
  const teachers = new Set(active.filter((r) => r.role === "teacher").map((r) => r.person_sis_id));
  const ob = S.outbox.counts || {};
  const pend = ob.pending || 0, fail = ob.failed || 0;

  $("#tiles").innerHTML = `
    ${tile("Enrolled students", "الطلاب", students.size, `${S.people.length} people on file`)}
    ${tile("Teaching staff", "المدرّسون", teachers.size, `across ${S.courses.length} course${S.courses.length === 1 ? "" : "s"}`)}
    ${tile("Active registrations", "تسجيلات نشطة", active.length, `${S.regs.length - active.length} dropped`)}
    ${tile("Sync queue", "قائمة المزامنة", pend,
      pend + fail === 0 ? `all delivered · ${ob.sent || 0} sent`
        : fail ? `<span class="chip plain c-err">⚠ ${fail} failed</span>` : "awaiting drain")}`;

  // single-series bar list — active registrations per course
  const byCourse = S.courses.map((c) => ({
    code: c.code, title: c.title,
    n: active.filter((r) => r.course_sis_id === c.sis_id).length,
  })).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...byCourse.map((x) => x.n));
  $("#barlist").innerHTML = byCourse.length
    ? byCourse.map((c) => `
      <div class="barrow">
        <div class="lbl">${esc(c.code)} <small>· ${esc(c.title)}</small></div>
        <div class="track"><div class="fill" style="width:${c.n / max * 100}%"></div></div>
        <div class="val num">${c.n}</div>
      </div>`).join("")
    : emptyBlock("📚", "No courses yet", "Seed demo data to get started.", S.people.length === 0);

  $("#dash-feed").innerHTML = feedLines(S.log.slice(0, 8)) ||
    emptyBlock("📡", "No sync activity yet", "Register someone, then drain the queue.");
}
function tile(k, ar, v, d) {
  return `<div class="tile"><div class="k">${k}<span class="ar" lang="ar">${ar}</span></div>
    <div class="v num">${v}</div><div class="d">${d}</div></div>`;
}

/* register workspace */
function renderRegister() {
  const q = S.personQuery.toLowerCase();
  const people = S.people.filter((p) =>
    !q || `${p.first} ${p.last} ${p.sis_id} ${p.email}`.toLowerCase().includes(q));

  $("#plist").innerHTML = people.length ? people.map((p) => `
    <button class="prow" role="option" data-sel="${esc(p.sis_id)}"
      aria-selected="${S.selected === p.sis_id}">
      ${avatar(p.first + " " + p.last)}
      <span><span class="n">${esc(p.first)} ${esc(p.last)}</span><br>
        <span class="s">${esc(p.sis_id)} · ${esc(p.email)}</span></span>
      <span class="chip plain ${p.kind === "teacher" ? "c-teacher" : "c-neut"}">${esc(p.kind)}</span>
    </button>`).join("")
    : emptyBlock("👤", "Nobody on file", "Seed demo data below.", S.people.length === 0);

  const p = S.people.find((x) => x.sis_id === S.selected);
  if (!p) {
    $("#sel-hd").innerHTML = `<h2>Select a person</h2><span class="ar" lang="ar">اختر شخصًا</span>`;
    $("#sel-bd").innerHTML = emptyBlock("👈", "Pick someone from the list",
      "Their schedule and registration actions appear here.");
    return;
  }

  const mine = S.regs.filter((r) => r.person_sis_id === p.sis_id);
  const active = mine.filter((r) => r.status === "active");
  const activeCourseIds = new Set(active.map((r) => r.course_sis_id));
  const t = currentTerm();

  $("#sel-hd").innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;width:100%">
      ${avatar(p.first + " " + p.last)}
      <div style="flex:1"><h2 style="margin:0">${esc(p.first)} ${esc(p.last)}</h2>
        <div class="sub" style="margin:0">${esc(p.sis_id)} · ${esc(p.email)}</div></div>
      <span class="chip plain ${p.kind === "teacher" ? "c-teacher" : "c-neut"}">${esc(p.kind)}</span>
    </div>`;

  $("#sel-bd").innerHTML = `
    <div class="field"><label>Current schedule <span class="ar" lang="ar">الجدول الحالي</span></label>
      <div class="sched">${
        active.length ? active.map((r) => `
          <div class="srow">
            <span class="cc">${esc(r.course_code)}</span>
            <span class="ct">${esc(r.title)}</span>
            ${roleChip(r.role)}
            <button class="x" data-drop="${esc(r.course_sis_id)}"
              aria-label="Drop ${esc(r.course_code)}">Drop</button>
          </div>`).join("")
        : `<div class="empty" style="padding:14px">No active registrations this term.</div>`}
      </div></div>

    <div class="field"><label>Add registration <span class="ar" lang="ar">إضافة تسجيل</span></label>${
      S.courses.some((c) => !activeCourseIds.has(c.sis_id))
        ? `<select class="input" id="course-pick">${
            S.courses.filter((c) => !activeCourseIds.has(c.sis_id)).map((c) =>
              `<option value="${esc(c.sis_id)}">${esc(c.code)} — ${esc(c.title)}</option>`).join("")}
          </select>`
        : `<div class="empty" style="padding:10px;text-align:left">Registered in every
            available course — drop one to change it.</div>`}
    </div>

    <div class="field"><label>Role <span class="ar" lang="ar">الدور</span></label>
      <div class="seg" role="group" aria-label="Role">
        <button id="role-student" aria-pressed="${S.role === "student"}">Student <span class="ar" lang="ar">طالب</span></button>
        <button id="role-teacher" aria-pressed="${S.role === "teacher"}">Teacher <span class="ar" lang="ar">مدرّس</span></button>
      </div></div>

    <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">
      <button class="btn btn-primary" id="do-register"
        ${t && S.courses.some((c) => !activeCourseIds.has(c.sis_id)) ? "" : "disabled"}>
        ${S.role === "teacher" ? "Assign to course" : "Register"} </button>
      <span style="color:var(--muted);font-size:12.5px">${
        t ? `into <b>${esc(t.code)}</b> — syncs to WhoCan + Teams on drain`
          : "no current term set"}</span>
    </div>`;
}

/* registrations table */
function renderRegTable() {
  const q = S.regQuery.toLowerCase();
  let rows = S.regs.filter((r) =>
    (S.regFilter === "all" || r.status === S.regFilter) &&
    (!q || `${r.first} ${r.last} ${r.person_sis_id} ${r.course_code} ${r.title}`
      .toLowerCase().includes(q)));

  $("#reg-table").innerHTML = rows.length ? `
    <table>
      <thead><tr><th>Person</th><th>Course</th><th>Term</th><th>Role</th>
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
        </tr>`).join("")}</tbody>
    </table>`
    : emptyBlock("🗂", "Nothing matches", S.regs.length ? "Adjust the search or filter." :
        "No registrations yet — use the Register view.", false);
}

/* sync center */
function renderSync() {
  const ob = S.outbox.counts || {};
  const modes = (S.health && S.health.modes) || {};
  $("#sync-tiles").innerHTML = `
    ${tile("Pending", "بالانتظار", ob.pending || 0, "queued for delivery")}
    ${tile("Delivered", "تم التسليم", ob.sent || 0, "idempotent — replays converge")}
    ${tile("Failed", "فشل", ob.failed || 0, (ob.failed ? `<span class="chip plain c-err">needs attention</span>` : "none parked"))}
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
    const st = l.status === "ok" || l.status === "would-send"
      ? (l.status === "ok" ? `<span class="chip plain c-ok">ok</span>`
                           : `<span class="chip plain c-warn">dry</span>`)
      : l.status === "skipped" ? `<span class="chip plain c-neut">skipped</span>`
      : `<span class="chip plain c-err">error</span>`;
    return `<div class="fline">${tgtChip(l.target)}<span class="act">${esc(l.action)}</span>
      ${st}<span class="det" title="${esc(l.detail)}">${esc(l.detail)}</span>
      <span class="ts">${ago(l.ts)}</span></div>`;
  }).join("");
}

function emptyBlock(icon, title, hint, withSeed = false) {
  return `<div class="empty"><div class="big">${icon}</div><b>${title}</b><br>${hint}
    ${withSeed ? `<div style="margin-top:14px"><button class="btn btn-soft" data-seed>Seed demo data</button></div>` : ""}</div>`;
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
  catch (e) { toast("Error: " + e.message, true); }
  finally { S.busy = false; await refreshLiveAndRender(); }
}

async function doRegister(personId, courseId, role) {
  const path = role === "teacher" ? "/assign" : "/register";
  await api(path, "POST", { person_sis_id: personId, course_sis_id: courseId });
}
async function doDrop(personId, courseId) {
  await api("/drop", "POST", { person_sis_id: personId, course_sis_id: courseId });
}

async function refreshLiveAndRender() {
  try {
    await loadLive();
    // Only re-render when the live data actually changed — an idle poll must
    // never rebuild the DOM under the user's cursor or mid-form.
    const sig = JSON.stringify([S.regs, S.outbox.counts,
      S.log[0] && S.log[0].id, S.health && S.health.modes]);
    if (sig !== S._sig) { S._sig = sig; render(); }
  } catch { /* transient — next tick retries */ }
}

/* ── events ─────────────────────────────────────────────────────────────── */
function wire() {
  // nav
  $("#nav").addEventListener("click", (e) => {
    const b = e.target.closest("[data-nav]");
    if (b) location.hash = "#/" + b.dataset.nav;
  });
  addEventListener("hashchange", route);

  // theme
  const applyTheme = (t) => {
    document.documentElement.dataset.theme = t;
    $("#i-moon").style.display = t === "dark" ? "none" : "";
    $("#i-sun").style.display = t === "dark" ? "" : "none";
  };
  const saved = localStorage.getItem("sis-theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "");
  applyTheme(saved);
  $("#theme-btn").onclick = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "" : "dark";
    localStorage.setItem("sis-theme", next);
    applyTheme(next);
  };

  // register workspace
  $("#person-search").addEventListener("input", (e) => {
    S.personQuery = e.target.value; renderRegister();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|select|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      const v = location.hash.replace("#/", "") || "dashboard";
      $(v === "registrations" ? "#reg-search" : "#person-search")?.focus();
    }
  });
  $("#view-register").addEventListener("click", async (e) => {
    const sel = e.target.closest("[data-sel]");
    if (sel) { S.selected = sel.dataset.sel; renderRegister(); return; }
    if (e.target.id === "role-student") { S.role = "student"; renderRegister(); return; }
    if (e.target.id === "role-teacher") { S.role = "teacher"; renderRegister(); return; }
    if (e.target.id === "do-register") {
      const course = $("#course-pick").value;
      const p = S.people.find((x) => x.sis_id === S.selected);
      const c = S.courses.find((x) => x.sis_id === course);
      if (!p || !c) return;
      await guard(() => doRegister(p.sis_id, c.sis_id, S.role),
        `${p.first} ${S.role === "teacher" ? "assigned to" : "registered in"} ${c.code} — queued for sync`);
      return;
    }
    const drop = e.target.closest("[data-drop]");
    if (drop) {
      const p = S.people.find((x) => x.sis_id === S.selected);
      const c = S.courses.find((x) => x.sis_id === drop.dataset.drop);
      const yes = await confirmModal({
        title: `Drop ${c.code}?`,
        body: `<b>${esc(p.first)} ${esc(p.last)}</b> will be removed from
          <b>${esc(c.code)}</b> in WhoCan and from its Teams team on the next drain.
          Grades and history in the LMS are kept.`,
        action: "Drop course",
      });
      if (yes) await guard(() => doDrop(p.sis_id, c.sis_id), `${c.code} dropped — queued for sync`);
    }
  });

  // registrations table
  $("#reg-search").addEventListener("input", (e) => { S.regQuery = e.target.value; renderRegTable(); });
  $("#status-seg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    S.regFilter = b.dataset.f;
    $$("#status-seg button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    renderRegTable();
  });
  $("#view-registrations").addEventListener("click", async (e) => {
    const d = e.target.closest("[data-drop-reg]");
    if (d) {
      const [pid, cid] = d.dataset.dropReg.split("|");
      const r = S.regs.find((x) => x.person_sis_id === pid && x.course_sis_id === cid);
      const yes = await confirmModal({
        title: `Drop ${r.course_code}?`,
        body: `<b>${esc(r.first)} ${esc(r.last)}</b> will be removed from <b>${esc(r.course_code)}</b>
          in WhoCan and Teams on the next drain. LMS grades and history are kept.`,
        action: "Drop course",
      });
      if (yes) await guard(() => doDrop(pid, cid), `${r.course_code} dropped — queued for sync`);
      return;
    }
    const rr = e.target.closest("[data-rereg]");
    if (rr) {
      const [pid, cid, role] = rr.dataset.rereg.split("|");
      await guard(() => doRegister(pid, cid, role), "Re-registered — queued for sync");
    }
  });

  // sync actions
  $("#drain-btn").addEventListener("click", () => guard(async () => {
    const r = await api("/outbox/drain", "POST");
    toast(`Drained — ${r.sent} sent · ${r.retrying} retrying · ${r.failed} failed`);
  }));
  $("#reconcile-btn").addEventListener("click", () => guard(async () => {
    const r = await api("/reconcile", "POST");
    toast(`Reconcile queued: ${r.queued.enrol} enrol · ${r.queued.drop} drop · ${r.queued.account} account`);
  }));

  // seed (delegated — button lives in empty states)
  document.addEventListener("click", async (e) => {
    if (e.target.closest("[data-seed]")) {
      await guard(async () => { await api("/seed", "POST"); await loadStatic(); }, "Demo data seeded");
    }
  });
}

/* ── boot ───────────────────────────────────────────────────────────────── */
(async function boot() {
  wire();
  $("#tiles").innerHTML =
    `<div class="tile skel" style="height:96px"></div>`.repeat(4);
  try {
    await Promise.all([loadStatic(), loadLive()]);
  } catch (e) {
    toast("API unreachable: " + e.message, true);
  }
  if (!S.selected && S.people.length) S.selected = S.people[0].sis_id;
  route();
  setInterval(refreshLiveAndRender, 4000);   // live data only; cheap renders
})();
