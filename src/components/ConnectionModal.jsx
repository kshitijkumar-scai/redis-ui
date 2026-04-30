import { useState } from "react";
import { motion } from "framer-motion";
import { Server, Eye, EyeOff, X, Plug } from "lucide-react";

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
      <motion.div
        className="modal conn-modal"
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="header-icon-wrap" style={{ width: 26, height: 26, fontSize: 12 }}>⬡</div>
            <h2>New Connection</h2>
          </div>
          <motion.button className="btn btn-ghost icon-btn" onClick={onClose} whileTap={{ scale: 0.9 }}>
            <X size={15} />
          </motion.button>
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
              <input className="modal-input" placeholder="localhost" value={host} onChange={(e) => setHost(e.target.value)} />
            </div>
            <div className="conn-field" style={{ flex: 1 }}>
              <label className="field-label">Port</label>
              <input className="modal-input" type="number" placeholder="6379" value={port} onChange={(e) => setPort(e.target.value)} />
            </div>
            <div className="conn-field" style={{ flex: 1 }}>
              <label className="field-label">Database</label>
              <input className="modal-input" type="number" min="0" max="15" placeholder="0" value={db} onChange={(e) => setDb(e.target.value)} />
            </div>
          </div>

          {/* Auth */}
          <div className="conn-row">
            <div className="conn-field" style={{ flex: 1 }}>
              <label className="field-label">Username <span className="field-hint">(optional)</span></label>
              <input className="modal-input" placeholder="default" value={username} onChange={(e) => setUsername(e.target.value)} />
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
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* TLS */}
          <label className="tls-toggle">
            <input type="checkbox" checked={tls} onChange={(e) => setTls(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
            <span>Use TLS / SSL (<code>rediss://</code>)</span>
          </label>

          {/* URL preview */}
          <div className="url-preview">
            <span className="url-preview-label">URL preview</span>
            <code className="url-preview-value">
              {tls ? "rediss" : "redis"}://
              {username ? `${username}${password ? ":••••" : ""}@` : ""}
              {host || "localhost"}:{port || "6379"}/{db || "0"}
            </code>
          </div>

          {error && (
            <div className="field-error">
              <Server size={13} /> {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <motion.button className="btn btn-ghost" onClick={onClose} whileTap={{ scale: 0.97 }}>
            <X size={13} /> Cancel
          </motion.button>
          <motion.button className="btn btn-primary" onClick={handleConnect} disabled={loading} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Plug size={13} /> {loading ? "Connecting…" : "Connect"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
