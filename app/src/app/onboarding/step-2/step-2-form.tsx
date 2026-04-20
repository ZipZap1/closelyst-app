"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { submitStep2 } from "../../../server/onboarding/actions";
import { step2Schema, type Step2Input } from "../../../server/onboarding/schemas";

export function Step2Form() {
  const t = useTranslations("onboarding.step2");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Step2Input>({
    resolver: zodResolver(step2Schema),
    defaultValues: { timezone: "Europe/Berlin" }
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await submitStep2(values);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    router.push("/onboarding/step-3");
  });

  return (
    <form onSubmit={onSubmit}>
      <h1>{t("title")}</h1>
      <label>
        {t("locationName")}
        <input type="text" {...register("locationName")} required />
        {errors.locationName && <span role="alert">{errors.locationName.message}</span>}
      </label>
      <label>
        {t("timezone")}
        <input type="text" {...register("timezone")} required />
      </label>
      <label>
        {t("ownerName")}
        <input type="text" {...register("ownerName")} required />
        {errors.ownerName && <span role="alert">{errors.ownerName.message}</span>}
      </label>
      <label>
        Owner E-Mail
        <input type="email" {...register("ownerEmail")} required />
        {errors.ownerEmail && <span role="alert">{errors.ownerEmail.message}</span>}
      </label>
      <button type="submit" disabled={isSubmitting}>
        {t("submit")}
      </button>
      {serverError && <p role="alert">{serverError}</p>}
    </form>
  );
}
