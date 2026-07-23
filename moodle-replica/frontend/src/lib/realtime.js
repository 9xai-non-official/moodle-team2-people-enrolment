// Ably realtime — lazy singleton. The browser never sees the API key: it
// POSTs /api/realtime/token (authed via X-Acting-User) and gets a signed,
// subscribe-only TokenRequest scoped to course:* + its own user channel.
// Realtime is an overlay: every failure here is silent (callers keep their
// fetch-based rendering; live updates are a bonus, never a dependency).
import * as Ably from "ably";
import { apiPost } from "../api";

let client = null;

function getClient() {
  if (client) return client;
  client = new Ably.Realtime({
    authCallback: (params, cb) => {
      apiPost("/api/realtime/token")
        .then((tokenRequest) => cb(null, tokenRequest))
        .catch((err) => cb(err, null));
    },
  });
  return client;
}

// The token's clientId is the acting user — a stale connection would keep
// the previous identity's token, so drop it on switch (next subscribe
// reconnects as the new principal).
export function resetRealtime() {
  if (client) {
    try {
      client.close();
    } catch {
      /* already closed */
    }
    client = null;
  }
}

// Subscribe to a course channel; returns an unsubscribe function.
// onMsg receives { name, data } with data already JSON-parsed.
export function subscribeCourse(courseId, onMsg) {
  let channel;
  try {
    channel = getClient().channels.get(`course:${courseId}`);
    const handler = (msg) => {
      let data = msg.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          /* leave as string */
        }
      }
      onMsg({ name: msg.name, data });
    };
    channel.subscribe(handler);
    return () => {
      try {
        channel.unsubscribe(handler);
      } catch {
        /* connection already gone */
      }
    };
  } catch {
    return () => {};
  }
}
