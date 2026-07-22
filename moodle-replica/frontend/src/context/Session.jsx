// Who is signed in — the LMS experience layer on top of ActingUser.
// mode "user": a real sign-in; the acting user is locked to the session and
// nav is scoped to the person's roles. mode "explore": the original demo
// behaviour — no sign-in, persona switcher drives everything.
import { createContext, useContext, useState } from "react";

const KEY = "session";

const SessionContext = createContext({
  session: null, // { mode, user, is_admin, teaches: [], enrolled: [] }
  signIn: () => {},
  signOut: () => {},
});

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) ?? null;
    } catch {
      return null;
    }
  });

  const signIn = (s) => {
    localStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
  };
  const signOut = () => {
    localStorage.removeItem(KEY);
    setSession(null);
  };

  return (
    <SessionContext.Provider value={{ session, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
