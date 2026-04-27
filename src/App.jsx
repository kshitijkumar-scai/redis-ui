import { useState, useEffect, useCallback } from "react";
import KeyList from "./components/KeyList";
import KeyViewer from "./components/KeyViewer";
import AddKeyModal from "./components/AddKeyModal";
import ConnectionModal from "./components/ConnectionModal";
import ConnectionSwitcher from "./components/ConnectionSwitcher";
import "./App.css";

const API = "/api";

export default function App() {
  const [serverInfo, setServerInfo]   = useState(null);
  const [connected, setConnected]     = useState(null);
  const [checkingConn, setCheckingConn] = useState(false);
  const [connections, setConnections] = useState([]);
  const [keys, setKeys]               = useState([]);
  const [cursor, setCursor]           = useState("0");
  const [hasMore, setHasMore]         = useState(false);
  const [pattern, setPattern]         = useState("*");
  const [selectedKey, setSelectedKey] = useState(null);
  const [keyData, setKeyData]         = useState(null);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingKey, setLoadingKey]   = useState(false);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showConnModal, setShowConnModal] = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Connections ───────────────────────────────────────────────────────────
  const loadConnections = useCallback(async () => {
    try {
      const data = await fetch(`${API}/connections`).then((r) => r.json());
      setConnections(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const switchConnection = async (id) => {
    try {
      const data = await fetch(`${API}/connections/${id}/activate`, { method: "PUT" }).then((r) => r.json());
      if (data.connections) setConnections(data.connections);
      setSelectedKey(null);
      setKeyData(null);
      setKeys([]);
      await checkConnection();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const removeConnection = async (id) => {
    try {
      const data = await fetch(`${API}/connections/${id}`, { method: "DELETE" }).then((r) => r.json());
      if (data.connections) setConnections(data.connections);
      showToast("Connection removed");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const renameConnection = async (id, name) => {
    try {
      const data = await fetch(`${API}/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((r) => r.json());
      if (data.connections) setConnections(data.connections);
    } catch {}
  };

  // ── Connection check ──────────────────────────────────────────────────────
  const checkConnection = useCallback(async () => {
    setCheckingConn(true);
    try {
      const [pingRes, infoRes] = await Promise.all([
        fetch(`${API}/ping`).then((r) => r.json()),
        fetch(`${API}/info`).then((r) => r.json()),
      ]);
      setConnected(pingRes.ok);
      if (pingRes.ok) setServerInfo(infoRes);
      await loadConnections();
    } catch {
      setConnected(false);
    } finally {
      setCheckingConn(false);
    }
  }, [loadConnections]);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  // ── Load keys ─────────────────────────────────────────────────────────────
  const loadKeys = useCallback(async (pat = pattern, reset = true) => {
    setLoadingKeys(true);
    try {
      const startCursor = reset ? "0" : cursor;
      const res = await fetch(`${API}/keys?pattern=${encodeURIComponent(pat)}&cursor=${startCursor}&count=200`);
      const data = await res.json();
      setKeys((prev) => reset ? data.keys : [...prev, ...data.keys]);
      setCursor(data.cursor);
      setHasMore(data.cursor !== "0");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoadingKeys(false);
    }
  }, [pattern, cursor]);

  useEffect(() => { if (connected) loadKeys(pattern, true); }, [connected]); // eslint-disable-line

  // ── Load single key ───────────────────────────────────────────────────────
  const loadKey = useCallback(async (key) => {
    setSelectedKey(key);
    setLoadingKey(true);
    setKeyData(null);
    try {
      const res = await fetch(`${API}/key/${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKeyData(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoadingKey(false);
    }
  }, []);

  // ── Key ops ───────────────────────────────────────────────────────────────
  const deleteKey = async (key) => {
    await fetch(`${API}/key/${encodeURIComponent(key)}`, { method: "DELETE" });
    showToast(`Deleted "${key}"`);
    setSelectedKey(null);
    setKeyData(null);
    loadKeys(pattern, true);
  };

  const deleteSelected = async (keyArr) => {
    await fetch(`${API}/keys`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: keyArr }),
    });
    showToast(`Deleted ${keyArr.length} key(s)`);
    if (keyArr.includes(selectedKey)) { setSelectedKey(null); setKeyData(null); }
    loadKeys(pattern, true);
  };

  const addKey = async (payload) => {
    const res = await fetch(`${API}/key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(`Saved "${payload.key}"`);
    setShowAddModal(false);
    loadKeys(pattern, true);
    loadKey(payload.key);
  };

  const updateTtl = async (key, newTtl) => {
    await fetch(`${API}/key/${encodeURIComponent(key)}/ttl`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: newTtl }),
    });
    showToast("TTL updated");
    loadKey(key);
  };

  const renameKey = async (oldKey, newKey) => {
    const res = await fetch(`${API}/key/${encodeURIComponent(oldKey)}/rename`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newKey }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(`Renamed to "${newKey}"`);
    setSelectedKey(newKey);
    loadKeys(pattern, true);
    loadKey(newKey);
  };

  const cloneKey = async (key, newKey) => {
    const res = await fetch(`${API}/key/${encodeURIComponent(key)}/clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newKey }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(`Cloned to "${newKey}"`);
    loadKeys(pattern, true);
  };

  const subOp = async (method, url, body) => {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    loadKey(selectedKey);
  };

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-brand">
          <div className="header-icon-wrap">⬡</div>
          <div>
            <div className="header-title">Redis Manager</div>
            <div className="header-subtitle">Key inspector &amp; editor</div>
          </div>
        </div>

        <div className="header-meta">
          {serverInfo && (
            <span className="header-stat">
              v{serverInfo.version} · {serverInfo.dbsize} keys
            </span>
          )}

          <ConnectionSwitcher
            connections={connections}
            onAdd={() => setShowConnModal(true)}
            onSwitch={switchConnection}
            onRemove={removeConnection}
            onRename={renameConnection}
          />

          <button
            className="btn btn-ghost icon-btn"
            onClick={checkConnection}
            title="Refresh"
            disabled={checkingConn}
          >
            <span className={checkingConn ? "is-spinning" : ""}>↻</span>
          </button>
        </div>
      </header>

      <div className="workspace">
        <KeyList
          keys={keys}
          loading={loadingKeys}
          pattern={pattern}
          hasMore={hasMore}
          selectedKey={selectedKey}
          onPatternChange={(p) => { setPattern(p); loadKeys(p, true); }}
          onSelect={loadKey}
          onRefresh={() => loadKeys(pattern, true)}
          onLoadMore={() => loadKeys(pattern, false)}
          onDelete={deleteSelected}
          onAddKey={() => setShowAddModal(true)}
        />

        <KeyViewer
          keyData={keyData}
          loading={loadingKey}
          selectedKey={selectedKey}
          onDelete={deleteKey}
          onUpdateTtl={updateTtl}
          onSubOp={subOp}
          onRefresh={() => selectedKey && loadKey(selectedKey)}
          onRename={renameKey}
          onClone={cloneKey}
          showToast={showToast}
        />
      </div>

      {showAddModal && (
        <AddKeyModal onSave={addKey} onClose={() => setShowAddModal(false)} />
      )}

      {showConnModal && (
        <ConnectionModal
          onClose={() => setShowConnModal(false)}
          onConnected={(conns) => {
            if (conns) setConnections(conns);
            showToast("Connected!");
            checkConnection();
            loadKeys("*", true);
          }}
        />
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
