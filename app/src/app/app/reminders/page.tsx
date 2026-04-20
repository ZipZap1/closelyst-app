import { getReminderScheduler } from "../../../lib/reminders/registry";

export const dynamic = "force-dynamic";

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("de-DE");
  } catch {
    return dt;
  }
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#6b7280",
  sent: "#10b981",
  failed: "#ef4444",
  cancelled: "#9ca3af"
};

const WINDOW_LABELS: Record<string, string> = {
  t_24h: "T-24h",
  t_2h: "T-2h"
};

export default function RemindersPage() {
  const { reminders } = getReminderScheduler().snapshot();

  return (
    <main style={{ maxWidth: "960px", margin: "2rem auto", padding: "1rem" }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Reminder-Scheduler (In-Memory)</h1>
        <p>
          Zeigt alle eingeplanten Reminder (T-24h + T-2h) pro Buchung. Dev-Only, kein Runner/Cron —
          für echten Versand ruf{" "}
          <code>POST /api/reminders/tick</code>.
        </p>
        <ul>
          <li>
            <code>POST /api/reminders/enqueue</code> — erstellt T-24h + T-2h Reminder für eine Buchung
          </li>
          <li>
            <code>POST /api/reminders/tick</code> <code>{"{ now?: ISO }"}</code> — feuert fällige Reminder
            über Fake-Provider
          </li>
          <li>
            <code>GET /api/reminders/list</code> — Snapshot aller Reminder
          </li>
          <li>
            <code>DELETE /api/reminders/list</code> — Reset
          </li>
        </ul>
      </div>

      <div className="card mt-lg">
        <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>
          Geplante Reminder ({reminders.length})
        </h2>
        {reminders.length === 0 ? (
          <p className="text-muted">
            Noch keine Reminder. Lege eine Buchung an mit{" "}
            <code>POST /api/reminders/enqueue</code>.
          </p>
        ) : (
          <div style={{ overflow: "auto", margin: "-1.5rem", padding: "0" }}>
            <table>
              <thead>
                <tr>
                  <th>Geplant für</th>
                  <th>Fenster</th>
                  <th>Kanal</th>
                  <th>An</th>
                  <th>Status</th>
                  <th>Versendet</th>
                  <th>Provider-ID</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((r) => (
                  <tr key={r.id}>
                    <td className="text-muted" style={{ whiteSpace: "nowrap" }}>
                      {fmt(r.scheduledSendAt)}
                    </td>
                    <td>{WINDOW_LABELS[r.window] ?? r.window}</td>
                    <td>{r.channel}</td>
                    <td>{r.to}</td>
                    <td style={{ fontWeight: 600, color: STATUS_COLORS[r.status] ?? "#333" }}>
                      {r.status}
                    </td>
                    <td className="text-muted" style={{ whiteSpace: "nowrap" }}>
                      {r.sentAt ? fmt(r.sentAt) : "—"}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {r.providerMessageId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-muted text-center mt-lg">
        Persistenz/Job-Runner folgt auf <a href="/HAC/issues/HAC-13">HAC-13</a>{" "}
        (Reminder-Engine) — aktueller Stand ist prozess-lokal.
      </p>
    </main>
  );
}
