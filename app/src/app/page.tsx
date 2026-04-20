import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "3rem auto",
        padding: "1rem",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.55,
      }}
    >
      <h1 style={{ marginBottom: "0.25rem" }}>mach-das-mal</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Termin-/No-Show Reduzierer für Praxen &amp; Salons — WhatsApp &amp; SMS
        Reminder, Bestätigung, Warteliste.
      </p>

      <h2 style={{ marginTop: "2rem" }}>Demo</h2>
      <ul>
        <li>
          <Link href="/onboarding/step-1">Onboarding-Wizard starten</Link> —
          Salon + Standort + Kanäle + iCal/CSV Booking-Sync
        </li>
        <li>
          <Link href="/app">Dashboard (nach Onboarding)</Link>
        </li>
        <li>
          <Link href="/app/settings/integrations">Integrationen verwalten</Link>
        </li>
        <li>
          <Link href="/app/messaging-log">Messaging-Log (Fake-Provider)</Link> —
          Outbound + Inbound live sehen
        </li>
      </ul>

      <h2 style={{ marginTop: "2rem" }}>API (Fake-Provider, In-Memory)</h2>
      <ul>
        <li>
          <code>POST /api/messaging/send</code> — <code>{"{ to, channel, body }"}</code>{" "}
          → 202 mit <code>providerMessageId</code>
        </li>
        <li>
          <code>POST /api/messaging/inbound</code> —{" "}
          <code>{"{ from, channel, body }"}</code> → normalisiert JA/NEIN →{" "}
          <code>{"{ normalizedAction }"}</code>
        </li>
        <li>
          <code>GET /api/messaging/log</code> / <code>DELETE</code> zum Reset
        </li>
      </ul>

      <p
        style={{
          marginTop: "2rem",
          fontSize: "0.85rem",
          color: "#888",
        }}
      >
        MVP-Stand: Onboarding-Wizard (Schritte 1–3 + 5, Schritt 4 pending auf
        WABA-Provisionierung), Booking-Adapter (iCal/CSV/Manual), Drizzle-Schema,
        Messaging-Route-Stubs.
      </p>
    </main>
  );
}
