// Dotted-underline jargon word with a plain-English hover from the glossary.
// <Term k="prohibit"/> or <Term k="group mode">mode</Term>.
import { GLOSSARY } from "../../lib/glossary";

export default function Term({ k, children }) {
  const text = GLOSSARY[k];
  if (!text) return <span>{children ?? k}</span>;
  return (
    <span className="term" title={text}>
      {children ?? k}
    </span>
  );
}
