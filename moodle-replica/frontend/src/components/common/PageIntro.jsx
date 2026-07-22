// "What am I looking at?" — a one-line purpose always visible, details one
// click away. Every page opens with this so a first-time user is never lost
// (the exact thing Moodle's admin screens don't do).
import { useState } from "react";

export default function PageIntro({ line, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="page-intro">
      <span>{line}</span>
      {children && (
        <button className="page-intro__more" onClick={() => setOpen(!open)}>
          {open ? "got it" : "what am I looking at?"}
        </button>
      )}
      {open && <div className="page-intro__body">{children}</div>}
    </div>
  );
}
