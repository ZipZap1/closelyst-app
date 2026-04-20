import Link from "next/link";

export default function AppLandingPage() {
  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "1rem" }}>
      <h1>Willkommen im Dashboard</h1>
      <p>
        Dein Onboarding ist abgeschlossen. WhatsApp-Absender &amp; Template-Test stehen als nächster
        Schritt nach dem Messaging-Tranche an.
      </p>
      <p>
        <Link href="/app/settings/integrations">Integrationen verwalten</Link>
      </p>
    </main>
  );
}
