// Whose eyes are you looking through — a one-line reminder under the header.
// Shows only for a real persona that isn't the omnipotent admin.
import { useActingUser } from "../../context/ActingUser";
import { personaBlurb } from "../../lib/personas";

export default function PersonaStrip() {
  const { actingUser } = useActingUser();
  const blurb = actingUser && personaBlurb(actingUser.username);
  if (!blurb || actingUser.username === "admin1") return null;

  return (
    <div className="persona-strip">
      <span>
        You are {actingUser.full_name} — {blurb}
      </span>
      <button
        className="page-intro__more"
        onClick={() => document.querySelector(".acting-user select")?.focus()}
      >
        switch →
      </button>
    </div>
  );
}
