// "Acting as" — global persona switcher (task 06 §3.4). Almost every page
// sends the actor id with permission-sensitive requests; the header select
// is how the demo swaps between admin1 / teacher.a / ta.a / student.a / …
import { createContext, useContext, useEffect, useState } from "react";
import { cachedGet } from "../lib/catalog";
import { setApiActingUser } from "../api";
import { resetRealtime } from "../lib/realtime";

const ActingUserContext = createContext({
  users: [],
  actingUser: null,
  setActingUserId: () => {},
  addUser: () => {},
  error: null,
});

export function ActingUserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [actingUserId, setActingUserId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    cachedGet("/api/users")
      .then((list) => {
        setUsers(list);
        if (list.length) setActingUserId((cur) => cur ?? list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Signup (mock) creates a user the initial /api/users fetch didn't know —
  // register it so login can act as it immediately.
  const addUser = (u) =>
    setUsers((cur) => (cur.some((x) => x.id === u.id) ? cur : [...cur, u]));

  const actingUser = users.find((u) => u.id === actingUserId) || null;
  setApiActingUser(actingUser?.id ?? null); // keep the API principal header in sync

  // Realtime tokens carry the acting user's identity — drop the connection
  // on switch so the next subscribe reconnects as the new principal.
  useEffect(() => {
    resetRealtime();
  }, [actingUserId]);

  return (
    <ActingUserContext.Provider
      value={{ users, actingUser, setActingUserId, addUser, error }}
    >
      {children}
    </ActingUserContext.Provider>
  );
}

export function useActingUser() {
  return useContext(ActingUserContext);
}
