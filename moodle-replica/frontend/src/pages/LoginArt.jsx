// The hero on the right of the login splash: the approved 3D render, full-bleed
// over the entire right half of the viewport (mockup composition). It breathes
// on a slow loop and tilts gently toward the pointer, so the flat image reads
// as a living 3D object. Motion stops under prefers-reduced-motion (App.css).
import { useRef } from "react";
import illustration from "../assets/login-illustration.webp";

export default function LoginArt() {
  const ref = useRef(null);

  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  }
  function reset() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--mx", "0");
    el.style.setProperty("--my", "0");
  }

  return (
    <div className="art" ref={ref} onMouseMove={onMove} onMouseLeave={reset} aria-hidden="true">
      <div className="art__tilt">
        <img className="art__img" src={illustration} alt="" />
      </div>
    </div>
  );
}
