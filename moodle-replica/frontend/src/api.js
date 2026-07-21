// Tiny API helper. Points at the FastAPI backend during development.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8010";

export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export { BASE_URL };
