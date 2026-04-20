"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { submitStep3 } from "../../../server/onboarding/actions";
import type { Step3Input } from "../../../server/onboarding/schemas";

type Kind = Step3Input["kind"];

export function Step3Form() {
  const t = useTranslations("onboarding.step3");
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("manual");
  const [csvData, setCsvData] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setPending(true);
    const payload: Step3Input =
      kind === "csv"
        ? { kind: "csv", csvData }
        : kind === "ical"
          ? { kind: "ical", feedUrl }
          : kind === "later"
            ? { kind: "later" }
            : { kind: "manual" };
    const result = await submitStep3(payload);
    setPending(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    router.push("/onboarding/step-5");
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <fieldset>
        <label>
          <input
            type="radio"
            name="kind"
            checked={kind === "manual"}
            onChange={() => setKind("manual")}
          />
          {t("manual")}
        </label>
        <label>
          <input type="radio" name="kind" checked={kind === "csv"} onChange={() => setKind("csv")} />
          {t("csv")}
        </label>
        <label>
          <input
            type="radio"
            name="kind"
            checked={kind === "ical"}
            onChange={() => setKind("ical")}
          />
          {t("ical")}
        </label>
        <label>
          <input
            type="radio"
            name="kind"
            checked={kind === "later"}
            onChange={() => setKind("later")}
          />
          {t("later")}
        </label>
      </fieldset>
      {kind === "csv" && (
        <textarea
          rows={6}
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
          placeholder="external_id,scheduled_at,duration_minutes,customer_full_name,customer_phone_e164"
        />
      )}
      {kind === "ical" && (
        <label>
          {t("feedUrl")}
          <input
            type="url"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            required
          />
        </label>
      )}
      <button type="submit" disabled={pending}>
        {t("submit")}
      </button>
      {serverError && <p role="alert">{serverError}</p>}
    </form>
  );
}
