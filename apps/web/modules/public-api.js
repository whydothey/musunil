export function createPublicApi(baseUrl, fetchImpl = window.fetch.bind(window)) {
  const base = String(baseUrl || "").replace(/\/$/, "");

  async function request(path, options = {}) {
    const response = await fetchImpl(`${base}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(options.headers || {})
      }
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "request_failed");
    return body;
  }

  return Object.freeze({
    request,
    home: () => request("/home"),
    map: () => request("/map"),
    reels: ({ seed, cursor } = {}) => {
      const params = new URLSearchParams();
      if (seed) params.set("seed", seed);
      if (Number.isFinite(cursor)) params.set("cursor", String(cursor));
      const query = params.toString();
      return request(query ? `/reels?${query}` : "/reels");
    },
    laws: (sort) => request(sort ? `/laws?sort=${encodeURIComponent(sort)}` : "/laws"),
    issue: (id) => request(`/issues/${encodeURIComponent(id)}`),
    occurrence: (id) => request(`/occurrences/${encodeURIComponent(id)}`)
  });
}
