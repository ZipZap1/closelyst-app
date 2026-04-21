import Link from "next/link";
import { DATENSCHUTZ_HTML } from "./content";

export const metadata = {
  title: "Datenschutzerklärung — closelyst",
  description: "Datenschutzerklärung für closelyst.com"
};

export default function DatenschutzPage() {
  return (
    <main className="container">
      <div className="card">
        <div
          className="legal-prose"
          style={{
            maxWidth: "760px",
            lineHeight: 1.55
          }}
          dangerouslySetInnerHTML={{ __html: DATENSCHUTZ_HTML }}
        />
        <p
          className="text-muted mt-lg"
          style={{ fontSize: "0.85rem", marginTop: "2rem" }}
        >
          <Link href="/">← Zurück zur Startseite</Link>
        </p>
      </div>
    </main>
  );
}
