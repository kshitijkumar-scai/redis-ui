import { useState } from "react";

export default function ConnectionModal({ onClose, onConnected }) {
  const [name, setName]           = useState("");
  const [host, setHost]           = useState("localhost");
  const [port, setPort]           = useState("6379");
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [db, setDb]               = useState("0");
  const [tls, setTls]             = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const handleConnect = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          host: host.trim(),
          port: parseInt(port) || 6379,
          username: username.trim(),
          password,
          db: parseInt(db) || 0,
          tls,
          activate: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Connection failed");
      onConnected(data.connections);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal conn-modal">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="header-icon-wrap" style={{ width: 26, height: 26, fontSize: 13 }}>⬡</div>
            <h2>New Connection</h2>
          </div>
          <button className="btn btn-ghost icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Name */}
          <div className="conn-field">
            <label className="field-label">Connection Name <span className="field-hint">(optional label)</span></label>
            <input
              className="modal-input"
              placeholder="e.g. Production, Staging, Local…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Host / Port / DB */}
          <div className="conn-row">
            <div className="conn-field" style={{ flex: 3 }}>
              <label className="field-label">Host</label>
              <input
                className="modal-input"
                placeholder="localhost"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </div>
            <div className="conn-field" style={{ flex: 1 }}>
              <label className="field-label">Port</label>
              <input
                className="modal-input"
                type="number"
                placeholder="6379"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
            <div className="conn-field" style={{ flex: 1 }}>
              <label className="field-label">Database</label>
              <input
                className="modal-input"
                type="number"
                min="0"
                max="15"
                placeholder="0"
                value={db}
                onChange={(e) => setDb(e.target.value)}
              />
            </div>
          </div>

          {/* Auth */}
          <div className="conn-row">
            <div className="conn-field" style={{ flex: 1 }}>
              <label className="field-label">Username <span className="field-hint">(optional)</span></label>
              <input
                className="modal-input"
                placeholder="default"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="conn-field" style={{ flex: 1 }}>
              <label className="field-label">Password <span className="field-hint">(optional)</span></label>
              <div style={{ position: "relative" }}>
                <input
                  className="modal-input"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  style={{ paddingRight: 36 }}
                />
                <button className="pass-toggle" onClick={() => setShowPass((v) => !v)} tabIndex={-1} type="button">
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>
          </div>

          {/* TLS */}
          <label className="tls-toggle">
            <input type="checkbox" checked={tls} onChange={(e) => setTls(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
            <span>Use TLS / SSL (<code>rediss://</code>)</span>
          </label>

          {/* URL Preview */}
          <div className="url-preview">
            <span className="url-preview-label">URL preview</span>
            <code className="url-preview-value">
              {tls ? "rediss" : "redis"}://
              {username ? `${username}${password ? ":••••" : ""}@` : ""}
              {host || "localhost"}:{port || "6379"}/{db || "0"}
            </code>
          </div>

          {error && <div className="field-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConnect} disabled={loading}>
            {loading ? "Connecting…" : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
