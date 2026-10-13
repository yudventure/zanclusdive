import { isIP } from "node:net";

// Addresses inside a private network, loopback or link-local range, which
// the server must not fetch for a link someone typed in.
export function privateAddress(address) {
  const version = isIP(address);
  if (version === 6) {
    const a = address.toLowerCase();
    return (
      a === "::1" ||
      a === "::" ||
      a.startsWith("fc") ||
      a.startsWith("fd") ||
      a.startsWith("fe80") ||
      (a.startsWith("::ffff:") && privateAddress(a.slice(7)))
    );
  }
  if (version !== 4) return true;
  const [x, y] = address.split(".").map(Number);
  return (
    x === 10 ||
    x === 127 ||
    x === 0 ||
    x >= 224 ||
    (x === 169 && y === 254) ||
    (x === 172 && y >= 16 && y <= 31) ||
    (x === 192 && y === 168) ||
    (x === 100 && y >= 64 && y <= 127)
  );
}
