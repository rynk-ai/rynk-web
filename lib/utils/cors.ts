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
  // We need to retrieve the origin from the request to reflect it, 
  // but this helper doesn't take 'req' currently.
  // Ideally, valid CORS preflight checks are aggressive.
  // For the specific case of Credentials + Extension, we MUST reflect origin.
  // Let's modify this to accept request or origin.
  return new Response(null, {
    status: 204,
    headers: {
        "Access-Control-Allow-Origin": "*", // Placeholder, routes should override
        "Access-Control-Allow-Methods": "GET, OPTIONS, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true"
    }
  });
}

// Updated helper that takes the request to do it properly
export function handleOptionsWithCors(req: Request) {
    const origin = req.headers.get("origin");
    const res = new Response(null, { status: 204 });
    setCorsHeaders(res, origin);
    return res;
}
