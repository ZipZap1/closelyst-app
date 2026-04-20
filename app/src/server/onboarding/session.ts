import { cookies } from "next/headers";

export const ONBOARDING_COOKIE = "mdm_onboarding";

export async function readOnboardingCookie(): Promise<
  { tenantId: string; onboardingId: string } | null
> {
  const store = await cookies();
  const raw = store.get(ONBOARDING_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      t?: string;
      o?: string;
    };
    if (!parsed.t || !parsed.o) return null;
    return { tenantId: parsed.t, onboardingId: parsed.o };
  } catch {
    return null;
  }
}

export async function writeOnboardingCookie(tenantId: string, onboardingId: string): Promise<void> {
  const store = await cookies();
  const value = Buffer.from(JSON.stringify({ t: tenantId, o: onboardingId }), "utf8").toString(
    "base64url"
  );
  store.set({
    name: ONBOARDING_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearOnboardingCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ONBOARDING_COOKIE);
}
