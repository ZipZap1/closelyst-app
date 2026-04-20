"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { disconnectAction, syncNowAction } from "../../../../server/integrations/actions";

export interface IntegrationRow {
  id: string;
  adapter: string;
  locationName: string;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export function IntegrationsList({ rows }: { rows: IntegrationRow[] }) {
  const t = useTranslations("integrations");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function syncNow(id: string) {
    setPendingId(id);
    setNotice(null);
    startTransition(async () => {
      const result = await syncNowAction(id);
      setPendingId(null);
      if (!result.ok) setNotice(result.message ?? "error");
    });
  }

  function disconnect(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await disconnectAction(id);
      setPendingId(null);
    });
  }

  if (rows.length === 0) {
    return (
      <section>
        <h1>{t("title")}</h1>
        <p>{t("empty")}</p>
      </section>
    );
  }

  return (
    <section>
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
      {notice && <p role="alert">{notice}</p>}
      <table>
        <thead>
          <tr>
            <th>{t("adapter")}</th>
            <th>{t("location")}</th>
            <th>{t("lastSynced")}</th>
            <th>{t("lastError")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.adapter}</td>
              <td>{row.locationName}</td>
              <td>{row.lastSyncedAt ?? t("never")}</td>
              <td>{row.lastError ?? "—"}</td>
              <td>
                <button
                  type="button"
                  onClick={() => syncNow(row.id)}
                  disabled={pendingId === row.id}
                >
                  {t("syncNow")}
                </button>
                <button
                  type="button"
                  onClick={() => disconnect(row.id)}
                  disabled={pendingId === row.id}
                >
                  {t("disconnect")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
