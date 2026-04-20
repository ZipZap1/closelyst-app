import { redirect } from "next/navigation";
import { readOnboardingCookie } from "../../../server/onboarding/session";
import { Step5Form } from "./step-5-form";

export default async function Step5Page() {
  const session = await readOnboardingCookie();
  if (!session) redirect("/onboarding/step-1");
  return <Step5Form />;
}
