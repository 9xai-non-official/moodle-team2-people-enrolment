// Read-only catalog lists (users, courses) for the workspace selectors, via the
// shared 30s promise cache so four workspaces sharing "/api/users" issue ONE
// request (spec §51). Stale responses are dropped if the path changes mid-flight.
import { useEffect, useState } from "react";
import { cachedGet } from "../../lib/catalog";

export function useCatalog(path) {
  const [state, setState] = useState({ list: null, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    setState({ list: null, loading: true, error: null });
    cachedGet(path)
      .then((list) => alive && setState({ list, loading: false, error: null }))
      .catch((e) => alive && setState({ list: null, loading: false, error: e.message }));
    return () => {
      alive = false;
    };
  }, [path]);
  return state;
}
