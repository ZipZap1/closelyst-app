"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { submitStep1 } from "../../../server/onboarding/actions";
import { step1Schema, type Step1Input } from "../../../server/onboarding/schemas";

export function Step1Form() {
  const t = useTranslations("onboarding.step1");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<Step1Input>({
    resolver: zodResolver(step1Schema),
    defaultValues: { industry: "salon", dpaAck: false }
  });
  const industry = watch("industry");

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await submitStep1(values);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    router.push("/onboarding/step-2");
  });

  return (
    <form onSubmit={onSubmit}>
      <h1>{t("title")}</h1>
      <label>
        {t("name")}
        <input type="text" {...register("tenantName")} required />
        {errors.tenantName && <span role="alert">{errors.tenantName.message}</span>}
      </label>
      <label>
        {t("billingEmail")}
        <input type="email" {...register("billingEmail")} required />
        {errors.billingEmail && <span role="alert">{errors.billingEmail.message}</span>}
      </label>
      <label>
        {t("industry")}
        <select {...register("industry")}>
          <option value="clinic">{t("industryClinic")}</option>
          <option value="salon">{t("industrySalon")}</option>
          <option value="other">{t("industryOther")}</option>
        </select>
      </label>
      {industry === "clinic" && (
        <label>
          <input type="checkbox" {...register("dpaAck")} />
          {t("dpaAck")}
          {errors.dpaAck && <span role="alert">{errors.dpaAck.message}</span>}
        </label>
      )}
      <button type="submit" disabled={isSubmitting}>
        {t("submit")}
      </button>
      {serverError && <p role="alert">{serverError}</p>}
    </form>
  );
}
