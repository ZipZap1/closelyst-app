import { redirect } from "next/navigation";
import { readOnboardingCookie } from "../../../server/onboarding/session";
import { Step3Form } from "./step-3-form";

export default async function Step3Page() {
  const session = await readOnboardingCookie();
  if (!session) redirect("/onboarding/step-1");
  return <Step3Form />;
}
