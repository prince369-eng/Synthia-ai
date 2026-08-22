import { lookup } from "node:dns/promises";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "169.254.169.254",
]);

function blocked(message: string): never {
  throw new Error(`This destination is not available for public-web research: ${message}`);
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = parts;
  return first === 0 || first === 10 || first === 127 || first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19));
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd");
}

function isIpLiteral(hostname: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

function isBlockedHostname(hostname: string) {
  return BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal");
}

function isPrivateAddress(address: string, family: number) {
  return family === 4 ? isPrivateIpv4(address) : isPrivateIpv6(address);
}

export async function assertPublicWebDestination(value: string): Promise<URL> {
  let destination: URL;
  try {
    destination = new URL(value);
  } catch {
    blocked("enter a valid HTTP or HTTPS URL.");
  }
  if (destination.protocol !== "http:" && destination.protocol !== "https:") blocked("only HTTP and HTTPS destinations are allowed.");
  if (destination.username || destination.password) blocked("URLs containing credentials are not allowed.");
  if (destination.port) blocked("only standard HTTP and HTTPS ports are allowed.");

  const hostname = destination.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isBlockedHostname(hostname)) blocked("local, private, and cloud-metadata hostnames are blocked.");
  if (isIpLiteral(hostname)) blocked("literal IP addresses are blocked; use a public domain name.");

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    blocked("the public hostname could not be resolved.");
  }
  if (!addresses.length || addresses.some(entry => isPrivateAddress(entry.address, entry.family))) {
    blocked("the hostname does not resolve exclusively to public internet addresses.");
  }
  return destination;
}
