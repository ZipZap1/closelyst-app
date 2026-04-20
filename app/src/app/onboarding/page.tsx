import { redirect } from "next/navigation";
import { readOnboardingCookie } from "../../server/onboarding/session";

export default async function OnboardingEntry() {
  const session = await readOnboardingCookie();
  if (!session) redirect("/onboarding/step-1");
  redirect("/onboarding/step-2");
}
