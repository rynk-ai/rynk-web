export function setCorsHeaders(res: Response, origin: string | null) {
  // Allow all internal localhost ports
  const isLocalhost = origin?.includes("localhost") || origin?.includes("127.0.0.1");
  const isExtension = origin?.startsWith("chrome-extension://");

  if (isLocalhost || isExtension) {
    res.headers.set("Access-Control-Allow-Origin", origin || "*");
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS, POST, PUT, DELETE");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
}

export function handleOptions() {
  const res = new Response(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*"); // Will be overwritten by setCorsHeaders logic in real route?
  // Actually OPTIONS needs the specific origin too if credentials used.
  // This helper is for manual route use.
  return res;
}
