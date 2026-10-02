import { useState } from "react";

export default function ImpersonatePanel() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleImpersonate() {
    if (!userId.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/impersonate/${userId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessage(`Impersonation active pour ${data.email || userId}`);
      window.location.reload();
    } catch (err: any) {
      setMessage(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    try {
      await fetch("/api/admin/stop-impersonation", {
        method: "POST",
        credentials: "include",
      });
      window.location.reload();
    } catch (err: any) {
      setMessage(`Erreur: ${err.message}`);
    }
  }

  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #ccc",
        borderRadius: 8,
        marginTop: "1rem",
      }}
    >
      <h3>Impersonation utilisateur</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          placeholder="ID ou email utilisateur"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ flex: 1, padding: "0.5rem" }}
        />
        <button onClick={handleImpersonate} disabled={loading}>
          {loading ? "..." : "Impersonate"}
        </button>
        <button onClick={handleStop} disabled={loading}>
          Stop
        </button>
      </div>
      {message && (
        <p style={{ color: message.startsWith("Erreur") ? "red" : "green" }}>
          {message}
        </p>
      )}
    </div>
  );
}
