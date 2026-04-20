import { redirect } from "next/navigation";
import { readOnboardingCookie } from "../../../server/onboarding/session";
import { Step2Form } from "./step-2-form";

export default async function Step2Page() {
  const session = await readOnboardingCookie();
  if (!session) redirect("/onboarding/step-1");
  return <Step2Form />;
}
