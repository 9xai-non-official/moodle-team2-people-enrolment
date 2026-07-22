// "Signed in as" — the session identity (WP04). This is a LOGIN, not a per-request
// actor: selecting a user signs in as them (mints a verified token via the backend
// dev-login) and that token — not any request field — is what the hardened
// roles/permissions endpoints trust. The roles Permission Checker separately lets
// you INSPECT another user's access without changing who you are signed in as.
//
// Backward-compatible: still exposes { users, actingUser, setActingUserId, error }
// so the other pages keep working; adds { signedIn } for the roles UI.
import { createContext, useContext, useEffect, useState } from "react";
import { apiGet, apiPost, setAuthToken } from "../api";

const ActingUserContext = createContext({
  users: [],
  actingUser: null,
  setActingUserId: () => {},
  signedIn: false,
  error: null,
});

export function ActingUserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [actingUserId, setActingUserId] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/api/users")
      .then((list) => {
        setUsers(list);
        if (list.length) setActingUserId((cur) => cur ?? list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Signing in as the selected identity: mint + store a verified session token.
  // On failure (e.g. dev-login disabled) the app still runs for non-roles pages;
  // the hardened roles endpoints will answer 401 until a real credential exists.
  useEffect(() => {
    if (actingUserId == null) return;
    let cancelled = false;
    setSignedIn(false);
    setAuthToken(null);
    apiPost("/api/permissions/dev-login", { user_id: actingUserId })
      .then(({ token }) => {
        if (cancelled) return;
        setAuthToken(token);
        setSignedIn(true);
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actingUserId]);

  const actingUser = users.find((u) => u.id === actingUserId) || null;

  return (
    <ActingUserContext.Provider
      value={{ users, actingUser, setActingUserId, signedIn, error }}
    >
      {children}
    </ActingUserContext.Provider>
  );
}

export function useActingUser() {
  return useContext(ActingUserContext);
}
