/**
 * Security headers applied to every non-preflight HTTP response. The policy
 * remains deterministic so it can be tested without booting the full server.
 */
export function responseSecurityHeaders(isProduction: boolean): Record<string, string> {
  const scriptPolicy = isProduction ? "script-src 'self'" : "script-src 'self' 'unsafe-inline'";
  return {
    "Content-Security-Policy": `default-src 'self'; ${scriptPolicy}; object-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), payment=()",
    ...(isProduction
      ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" }
      : {}),
  };
}
