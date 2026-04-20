import { getMessagingProvider } from "../../../lib/messaging/registry";

export const dynamic = "force-dynamic";

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("de-DE");
  } catch {
    return dt;
  }
}

export default function MessagingLogPage() {
  const { outbound, inbound } = getMessagingProvider().snapshot();
  const outboundSorted = outbound.slice().reverse();
  const inboundSorted = inbound.slice().reverse();

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "2rem auto",
        padding: "1rem",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.5
      }}
    >
      <h1>Messaging-Log (Fake-Provider)</h1>
      <p style={{ color: "#555" }}>
        Nur für Dev/Demo — <code>provider: fake</code>, In-Memory, kein echter WhatsApp/SMS-Versand.
        Für echte Zustellung siehe <a href="/HAC/issues/HAC-17">HAC-17</a> (DPA + WABA-Provisionierung).
      </p>

      <h2 style={{ marginTop: "2rem" }}>Outbound ({outboundSorted.length})</h2>
      {outboundSorted.length === 0 ? (
        <p style={{ color: "#888" }}>
          Noch nichts gesendet. Triggere: <code>POST /api/messaging/send</code> mit{" "}
          <code>{"{ to, channel, body }"}</code>.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: "0.4rem" }}>Zeit</th>
              <th style={{ padding: "0.4rem" }}>Kanal</th>
              <th style={{ padding: "0.4rem" }}>An</th>
              <th style={{ padding: "0.4rem" }}>Nachricht</th>
              <th style={{ padding: "0.4rem" }}>Provider-ID</th>
            </tr>
          </thead>
          <tbody>
            {outboundSorted.map((e) => (
              <tr key={e.providerMessageId} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "0.4rem" }}>{fmt(e.sentAt)}</td>
                <td style={{ padding: "0.4rem" }}>{e.channel}</td>
                <td style={{ padding: "0.4rem" }}>{e.to}</td>
                <td style={{ padding: "0.4rem" }}>{e.body}</td>
                <td style={{ padding: "0.4rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
                  {e.providerMessageId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: "2rem" }}>Inbound ({inboundSorted.length})</h2>
      {inboundSorted.length === 0 ? (
        <p style={{ color: "#888" }}>
          Noch keine Antwort. Triggere: <code>POST /api/messaging/inbound</code> mit{" "}
          <code>{'{ from, channel, body: "JA" }'}</code>.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: "0.4rem" }}>Zeit</th>
              <th style={{ padding: "0.4rem" }}>Kanal</th>
              <th style={{ padding: "0.4rem" }}>Von</th>
              <th style={{ padding: "0.4rem" }}>Nachricht</th>
              <th style={{ padding: "0.4rem" }}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {inboundSorted.map((e) => (
              <tr key={e.eventId} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "0.4rem" }}>{fmt(e.receivedAt)}</td>
                <td style={{ padding: "0.4rem" }}>{e.channel}</td>
                <td style={{ padding: "0.4rem" }}>{e.from}</td>
                <td style={{ padding: "0.4rem" }}>{e.body}</td>
                <td
                  style={{
                    padding: "0.4rem",
                    fontWeight: 600,
                    color:
                      e.normalizedAction === "confirm"
                        ? "#0a7c2f"
                        : e.normalizedAction === "cancel"
                          ? "#b3261e"
                          : "#555"
                  }}
                >
                  {e.normalizedAction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#888" }}>
        Reset: <code>DELETE /api/messaging/log</code>
      </p>
    </main>
  );
}
