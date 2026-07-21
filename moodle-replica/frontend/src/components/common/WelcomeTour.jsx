// First-run tour — the app in four sentences. Moodle drops you into a maze;
// we open with the map. Auto-shows once (localStorage), relaunchable from the
// header "?" button. Reuses Modal — no new visual language.
import { useState } from "react";
import Modal from "./Modal";

const STEPS = [
  {
    title: "What this app is",
    body: (
      <>
        <p>
          This is a rebuilt slice of Moodle: <strong>people & enrolment</strong>.
          It answers three questions about a course:
        </p>
        <ul>
          <li><strong>Who is in it?</strong> (enrolment — possibly by several routes at once)</li>
          <li><strong>What may they do?</strong> (roles & capabilities)</li>
          <li><strong>…and WHY?</strong> — every yes/no comes with its reasons. That's the point.</li>
        </ul>
      </>
    ),
  },
  {
    title: "You are always somebody",
    body: (
      <>
        <p>
          The <strong>"Acting as"</strong> select in the header decides who YOU are:
          admin, teacher, a teaching assistant who can only see her own group, a
          student in two groups at once…
        </p>
        <p>
          Switch persona and the whole app changes with you — what you can see,
          what you can do, and the explanations you get. It's the app's main move:
          try everything twice as two different people.
        </p>
      </>
    ),
  },
  {
    title: "Start at Demos",
    body: (
      <>
        <p>
          The <strong>Demos</strong> page walks the five "hard cases" from the
          hackathon brief — the situations where Moodle's real rules surface.
          One of them runs live, step by step, against the database.
        </p>
        <p>
          Every step prints the API call it made. The demo is the evidence.
        </p>
      </>
    ),
  },
  {
    title: "Nothing is hidden",
    body: (
      <>
        <p>
          Every refusal shows the backend's reason, word for word. Every error
          banner is click-to-copy for bug filing. Dotted-underlined words have
          plain-English explanations on hover.
        </p>
        <p className="muted">
          (A yellow <strong>MOCK DATA</strong> badge means fixture mode — flip
          <code> VITE_USE_MOCKS</code> to use the live database.)
        </p>
      </>
    ),
  },
];

export default function WelcomeTour({ open, onClose }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  function close() {
    localStorage.setItem("tour-done", "1");
    setStep(0);
    onClose();
  }

  return (
    <Modal
      open={open}
      title={`${STEPS[step].title} · ${step + 1}/${STEPS.length}`}
      onClose={close}
      footer={
        <>
          {step > 0 && (
            <button className="btn" onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          )}
          <button
            className="btn btn--primary"
            onClick={last ? close : () => setStep(step + 1)}
          >
            {last ? "Let me in" : "Next →"}
          </button>
        </>
      }
    >
      {STEPS[step].body}
    </Modal>
  );
}

export function tourSeen() {
  return localStorage.getItem("tour-done") === "1";
}
