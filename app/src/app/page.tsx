import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <div className="card">
        <h1>mach-das-mal</h1>
        <p>
          Termin-/No-Show Reduzierer für Praxen &amp; Salons — WhatsApp &amp; SMS
          Reminder, Bestätigung, Warteliste.
        </p>

        <div style={{ marginTop: "2rem" }}>
          <Link href="/onboarding/step-1" className="btn">
            Jetzt starten →
          </Link>
        </div>
      </div>

      <div className="card mt-lg">
        <h2 style={{ marginTop: 0 }}>Demo-Navigation</h2>
        <ul>
          <li>
            <Link href="/onboarding/step-1">Onboarding-Wizard</Link> — Salon + Standort + Kanäle + Booking-Sync
          </li>
          <li>
            <Link href="/app">Dashboard</Link> (nach Onboarding)
          </li>
          <li>
            <Link href="/app/settings/integrations">Integrationen verwalten</Link>
          </li>
          <li>
            <Link href="/app/messaging-log">Messaging-Log</Link> — Outbound + Inbound live
          </li>
          <li>
            <Link href="/app/reminders">Reminder-Scheduler</Link> — T-24h/T-2h pro Buchung
          </li>
        </ul>
      </div>

      <div className="card mt-lg">
        <h2 style={{ marginTop: 0 }}>API-Endpunkte (Fake-Provider)</h2>
        <ul style={{ fontSize: "0.9rem" }}>
          <li>
            <code>POST /api/messaging/send</code> — <code>{"{ to, channel, body }"}</code>{" "}
            → 202 mit <code>providerMessageId</code>
          </li>
          <li>
            <code>POST /api/messaging/inbound</code> — normalisiert JA/NEIN → <code>{"{ normalizedAction }"}</code>
          </li>
          <li>
            <code>GET /api/messaging/log</code> / <code>DELETE</code>
          </li>
          <li>
            <code>POST /api/reminders/enqueue</code> — Buchung → T-24h + T-2h Reminder
          </li>
          <li>
            <code>POST /api/reminders/tick</code> — feuert fällige Reminder (Dev-Trigger)
          </li>
          <li>
            <code>GET /api/reminders/list</code> — alle geplanten Reminder
          </li>
        </ul>
      </div>

      <p className="text-muted text-center mt-lg">
        MVP-Stand: Onboarding-Wizard, Booking-Adapter (iCal/CSV/Manual), Drizzle-Schema, Fake-Messaging, In-Memory-Reminder-Scheduler
      </p>
    </main>
  );
}
