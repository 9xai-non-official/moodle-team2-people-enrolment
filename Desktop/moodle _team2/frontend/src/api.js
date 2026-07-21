// Tiny API helper. Points at the FastAPI backend during development.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8010";

async function handle(res) {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function apiGet(path) {
  return handle(await fetch(`${BASE_URL}${path}`));
}

export async function apiPost(path, body) {
  return handle(
    await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export async function apiDelete(path) {
  return handle(await fetch(`${BASE_URL}${path}`, { method: "DELETE" }));
}

export { BASE_URL };
