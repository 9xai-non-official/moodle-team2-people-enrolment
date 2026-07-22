// Accessible modal dialog for the Demos workspace: focus trap, Escape-to-close,
// focus restoration to the trigger, body-scroll lock, and backdrop dismissal —
// each guardable so a mutation-confirmation can refuse dismissal during a
// critical step (spec §39). The shell's minimal common/Modal lacks the trap, so
// the workspace uses this for its confirm + full-log dialogs.
import { useEffect, useRef } from "react";

export default function Dialog({
  open,
  onClose,
  labelledBy,
  className = "",
  dir,
  children,
  closeOnBackdrop = true,
  closeOnEscape = true,
  initialFocusRef,
}) {
  const panelRef = useRef(null);
  const returnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    returnRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.disabled && el.offsetParent !== null);

    (initialFocusRef?.current || focusables()[0] || panelRef.current)?.focus({
      preventScroll: true,
    });

    function onKey(e) {
      if (e.key === "Escape" && closeOnEscape) {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (!els.length) {
        e.preventDefault();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      const r = returnRef.current;
      if (r && typeof r.focus === "function") r.focus({ preventScroll: true });
    };
  }, [open, closeOnEscape, onClose, initialFocusRef]);

  if (!open) return null;
  return (
    <div
      className="dm-overlay"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={`dm-dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        dir={dir}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
