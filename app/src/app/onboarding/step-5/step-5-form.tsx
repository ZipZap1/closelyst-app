"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { submitStep5 } from "../../../server/onboarding/actions";
import { step5Schema, type Step5Input } from "../../../server/onboarding/schemas";

export function Step5Form() {
  const t = useTranslations("onboarding.step5");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<Step5Input>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      window24h: true,
      window2h: true,
      preferWhatsapp: true,
      waitlistEnabled: true
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await submitStep5(values);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    router.push("/app");
  });

  return (
    <form onSubmit={onSubmit}>
      <h1>{t("title")}</h1>
      <label>
        <input type="checkbox" {...register("window24h")} />
        {t("window24h")}
      </label>
      <label>
        <input type="checkbox" {...register("window2h")} />
        {t("window2h")}
      </label>
      <label>
        <input type="checkbox" {...register("preferWhatsapp")} />
        {t("channelWa")}
      </label>
      <label>
        <input type="checkbox" {...register("waitlistEnabled")} />
        {t("waitlist")}
      </label>
      <button type="submit" disabled={isSubmitting}>
        {t("submit")}
      </button>
      {serverError && <p role="alert">{serverError}</p>}
    </form>
  );
}
