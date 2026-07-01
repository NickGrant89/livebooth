/** Client-side fetch that always sends session cookies. */
export function apiFetch(input: string, init?: RequestInit) {
  return fetch(input, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}
