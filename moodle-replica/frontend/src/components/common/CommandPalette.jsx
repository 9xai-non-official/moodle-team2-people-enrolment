// ⌘K / Ctrl-K command palette — jump to a page, switch persona, pick a course,
// look up a glossary term, or fire a meta action. Always mounted; renders the
// overlay only while open. Command list is rebuilt each time it opens.
import { useEffect, useMemo, useRef, useState } from "react";
import { useActingUser } from "../../context/ActingUser";
import { useSelectedCourse } from "../../context/SelectedCourse";
import { cachedGet } from "../../lib/catalog";
import { personaLabel } from "../../lib/personas";
import { GLOSSARY } from "../../lib/glossary";
import { NAV_ITEMS } from "../../pages";

export default function CommandPalette({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [def, setDef] = useState(null); // glossary definition shown in-palette
  const [courses, setCourses] = useState([]);
  const activeRef = useRef(null);
  const { users, setActingUserId } = useActingUser();
  const { setCourseId } = useSelectedCourse();

  // ⌘K / Ctrl-K toggles from anywhere — modifier combo, so allowed inside inputs.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fetch courses (cached) and reset transient state on each open.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSel(0);
    setDef(null);
    cachedGet("/api/courses").then(setCourses).catch(() => {});
  }, [open]);

  const commands = useMemo(() => {
    const cmds = NAV_ITEMS.map((page) => ({
      label: `Go to ${page}`,
      kw: "page navigate",
      run: () => onNavigate(page),
    }));
    for (const u of users)
      cmds.push({
        label: `Act as ${u.full_name} — ${personaLabel(u.username)}`,
        kw: `persona user ${u.username}`,
        run: () => setActingUserId(u.id),
      });
    for (const c of courses)
      cmds.push({
        label: `Select course ${c.short_name}`,
        kw: "course select",
        run: () => setCourseId(c.id),
      });
    for (const term of Object.keys(GLOSSARY))
      cmds.push({
        label: `What is ${term}?`,
        kw: `glossary term define ${term}`,
        def: { term, text: GLOSSARY[term] },
      });
    cmds.push({
      label: "Take the tour",
      kw: "help tour guide",
      run: () => window.dispatchEvent(new CustomEvent("open-tour")),
    });
    cmds.push({
      label: "Toggle presenter mode",
      kw: "presenter script demo",
      run: () => window.dispatchEvent(new CustomEvent("toggle-presenter")),
    });
    return cmds;
  }, [users, courses, onNavigate, setActingUserId, setCourseId]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return commands.slice(0, NAV_ITEMS.length); // empty → pages only
    return commands.filter((c) => `${c.label} ${c.kw}`.toLowerCase().includes(q));
  }, [q, commands]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  function runCommand(cmd) {
    if (!cmd) return;
    if (cmd.def) {
      setDef(cmd.def); // glossary → show definition, keep palette open
      return;
    }
    cmd.run();
    setOpen(false);
  }

  function onInputKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runCommand(filtered[sel]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          aria-label="Command palette"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
        />
        <ul className="palette__list">
          {filtered.map((c, i) => (
            <li
              key={c.label}
              ref={i === sel ? activeRef : null}
              className={`palette__item ${i === sel ? "palette__item--active" : ""}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => runCommand(c)}
            >
              {c.label}
            </li>
          ))}
        </ul>
        {filtered.length === 0 && (
          <div className="muted palette__typehint">no matches</div>
        )}
        {!q && (
          <div className="muted palette__typehint">
            type to search personas, courses, terms…
          </div>
        )}
        {def && (
          <div className="palette__def">
            <strong>{def.term}</strong>
            <div>{def.text}</div>
          </div>
        )}
        <div className="palette__hint">↑↓ navigate · ⏎ run · esc close</div>
      </div>
    </div>
  );
}
