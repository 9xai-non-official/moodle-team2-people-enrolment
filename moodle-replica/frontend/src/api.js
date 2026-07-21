// API helper. Points at the FastAPI backend during development.
// Mock mode (VITE_USE_MOCKS=1): known routes are served from src/mocks/*;
// anything unmatched falls through to the real backend, so landed endpoints
// keep working while missing ones stay mocked (task 06 §8).
import { ApiError } from "./errors";
import { mockRequest } from "./mocks";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8010";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "1";

async function request(method, path, body) {
  if (USE_MOCKS) {
    const hit = await mockRequest(method, path, body);
    if (hit) return hit.data; // mock 403/409s throw ApiError from the handler
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    // FastAPI: {"detail": ...}; domain endpoints: reason/reasons fields.
    let payload = null;
    try {
      payload = await res.json();
    } catch {
      payload = { detail: res.statusText };
    }
    throw new ApiError(res.status, payload, `${method} ${path.split("?")[0]}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const apiGet = (path) => request("GET", path);
export const apiPost = (path, body) => request("POST", path, body ?? {});
export const apiPatch = (path, body) => request("PATCH", path, body ?? {});
export const apiDelete = (path) => request("DELETE", path);

export { BASE_URL, USE_MOCKS, ApiError };
