// Mock router. Domain files (core.js, enrolment.js, roles.js, groups.js,
// progress.js) each export `routes: [{ method, pattern, handler }]`.
// Aggregated via import.meta.glob so DELETING a domain file changes nothing
// else — unmatched paths fall through to the real backend (task 06 §8).
//
// handler(match, body, query) → response data, or throw ApiError for 403/409
// demos. `match` is the RegExp match array (capture groups = path params).

const modules = import.meta.glob("./*.js", { eager: true });

const routes = Object.entries(modules)
  .filter(([file]) => !file.endsWith("/index.js") && !file.endsWith("/seed.js"))
  .flatMap(([, mod]) => (Array.isArray(mod.routes) ? mod.routes : []));

export async function mockRequest(method, path, body) {
  const [rawPath, rawQuery] = path.split("?");
  const query = Object.fromEntries(new URLSearchParams(rawQuery || ""));
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = rawPath.match(route.pattern);
    if (!match) continue;
    // tiny latency so loading states are visible in the demo
    await new Promise((r) => setTimeout(r, 120));
    return { data: route.handler(match, body, query) };
  }
  return null; // no mock — caller falls through to the real API
}
