import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./cookies";

function request(protocol: string, forwardedProto?: string | string[]) {
  return {
    protocol,
    headers: forwardedProto === undefined ? {} : { "x-forwarded-proto": forwardedProto },
  } as Request;
}

describe("getSessionCookieOptions", () => {
  it("uses an HTTP-only Lax session cookie so OAuth navigation works without cross-site subrequest cookies", () => {
    expect(getSessionCookieOptions(request("https"))).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
    expect(getSessionCookieOptions(request("http"))).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });
  });

  it("retains secure cookie delivery through a trusted HTTPS forwarding chain", () => {
    expect(getSessionCookieOptions(request("http", "http, https"))).toMatchObject({
      sameSite: "lax",
      secure: true,
    });
  });
});
