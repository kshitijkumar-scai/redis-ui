import { useState } from "react";
import ConfirmModal from "./ConfirmModal";

const API = "/api";

// ── Clipboard helper ───────────────────────────────────────────────────────────
function useCopy() {
  const [copiedId, setCopiedId] = useState(null);
  const copy = (text, id = "default") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };
  return [copiedId, copy];
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function KeyViewer({
  keyData, loading, selectedKey,
  onDelete, onUpdateTtl, onSubOp, onRefresh, onRename, onClone, showToast,
}) {
  if (!selectedKey && !loading) {
    return (
      <main className="key-viewer empty-state">
        <div className="empty-icon">⬡</div>
        <p>Select a key to inspect its value</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="key-viewer empty-state">
        <span className="is-spinning" style={{ fontSize: 22, opacity: 0.4 }}>↻</span>
        <p>Loading…</p>
      </main>
    );
  }

  if (!keyData) return null;

  return (
    <main className="key-viewer">
      <KeyHeader
        keyData={keyData}
        onDelete={onDelete}
        onUpdateTtl={onUpdateTtl}
        onRefresh={onRefresh}
        onRename={onRename}
        onClone={onClone}
        showToast={showToast}
      />
      <ValuePanel keyData={keyData} onSubOp={onSubOp} showToast={showToast} />
    </main>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function KeyHeader({ keyData, onDelete, onUpdateTtl, onRefresh, onRename, onClone, showToast }) {
  const [editingTtl, setEditingTtl]       = useState(false);
  const [ttlVal, setTtlVal]               = useState(keyData.ttl > 0 ? keyData.ttl : "");
  const [refreshing, setRefreshing]       = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renaming, setRenaming]           = useState(false);
  const [renameVal, setRenameVal]         = useState(keyData.key);
  const [cloning, setCloning]             = useState(false);
  const [cloneVal, setCloneVal]           = useState(keyData.key + ":copy");
  const [copiedId, copy]                  = useCopy();

  const saveTtl = () => {
    const v = parseInt(ttlVal);
    onUpdateTtl(keyData.key, isNaN(v) || v <= 0 ? -1 : v);
    setEditingTtl(false);
  };

  const saveRename = async () => {
    if (!renameVal.trim() || renameVal === keyData.key) { setRenaming(false); return; }
    try { await onRename(keyData.key, renameVal.trim()); }
    catch (err) { showToast(err.message, "error"); }
    setRenaming(false);
  };

  const saveClone = async () => {
    if (!cloneVal.trim()) return;
    try { await onClone(keyData.key, cloneVal.trim()); setCloning(false); }
    catch (err) { showToast(err.message, "error"); }
  };

  return (
    <>
      <div className="viewer-header">
        {/* Key name row */}
        <div className="viewer-key-row">
          {renaming ? (
            <div className="rename-row">
              <input
                className="rename-input"
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenaming(false); }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={saveRename}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRenaming(false)}>✕</button>
            </div>
          ) : (
            <>
              <div className="viewer-key-name" title={keyData.key}>{keyData.key}</div>
              <div className="key-name-actions">
                <button
                  className="btn btn-ghost btn-xs key-action-btn"
                  onClick={() => { copy(keyData.key, "keyname"); showToast("Key name copied", "success"); }}
                  title="Copy key name"
                >{copiedId === "keyname" ? "✓" : "⎘"}</button>
                <button
                  className="btn btn-ghost btn-xs key-action-btn"
                  onClick={() => { setRenameVal(keyData.key); setRenaming(true); }}
                  title="Rename key"
                >✎</button>
                <button
                  className="btn btn-ghost btn-xs key-action-btn"
                  onClick={() => { setCloneVal(keyData.key + ":copy"); setCloning(true); }}
                  title="Duplicate key"
                >⧉</button>
              </div>
            </>
          )}
        </div>

        {/* Clone row */}
        {cloning && (
          <div className="rename-row clone-row">
            <span className="clone-label">Clone to:</span>
            <input
              className="rename-input"
              value={cloneVal}
              onChange={(e) => setCloneVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveClone(); if (e.key === "Escape") setCloning(false); }}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={saveClone}>Clone</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCloning(false)}>✕</button>
          </div>
        )}

        {/* Meta row */}
        <div className="viewer-meta">
          <span className={`type-pill type-${keyData.type}`}>{keyData.type}</span>

          <span className="meta-item">
            TTL:{" "}
            {editingTtl ? (
              <>
                <input
                  className="ttl-input"
                  type="number"
                  min="-1"
                  placeholder="-1 = forever"
                  value={ttlVal}
                  onChange={(e) => setTtlVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveTtl()}
                  autoFocus
                />
                <button className="btn btn-sm btn-primary" onClick={saveTtl}>Save</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setEditingTtl(false)}>✕</button>
              </>
            ) : (
              <button className="btn-link" onClick={() => setEditingTtl(true)}>
                {keyData.ttl === -1 ? "∞ persistent" : keyData.ttl === -2 ? "expired" : `${keyData.ttl}s`}
              </button>
            )}
          </span>

          <div className="meta-spacer" />

          <button
            className="btn btn-ghost icon-btn"
            onClick={async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); }}
            title="Refresh key"
            disabled={refreshing}
          >
            <span className={refreshing ? "is-spinning" : ""}>↻</span>
          </button>

          <button
            className="btn btn-danger btn-sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            ✕ Delete
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title={`Delete this key?`}
          detail={keyData.key}
          confirmLabel="Delete key"
          onConfirm={() => onDelete(keyData.key)}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}

// ── Value panels ───────────────────────────────────────────────────────────────
function ValuePanel({ keyData, onSubOp, showToast }) {
  const key = encodeURIComponent(keyData.key);
  switch (keyData.type) {
    case "string": return <StringPanel keyData={keyData} onSubOp={onSubOp} showToast={showToast} />;
    case "hash":   return <HashPanel   keyData={keyData} onSubOp={onSubOp} apiKey={key} />;
    case "list":   return <ListPanel   keyData={keyData} onSubOp={onSubOp} apiKey={key} />;
    case "set":    return <SetPanel    keyData={keyData} onSubOp={onSubOp} apiKey={key} />;
    case "zset":   return <ZsetPanel   keyData={keyData} onSubOp={onSubOp} apiKey={key} />;
    default: return <pre className="string-value">{JSON.stringify(keyData.value, null, 2)}</pre>;
  }
}

// ── String ─────────────────────────────────────────────────────────────────────
function StringPanel({ keyData, onSubOp, showToast }) {
  const [editing, setEditing]   = useState(false);
  const [val, setVal]           = useState(keyData.value ?? "");
  const [jsonMode, setJsonMode] = useState(false);
  const [copiedId, copy]        = useCopy();

  const isJson = (() => { try { JSON.parse(keyData.value); return true; } catch { return false; } })();
  const jsonFormatted = isJson ? JSON.stringify(JSON.parse(keyData.value), null, 2) : null;
  const byteSize = new Blob([keyData.value ?? ""]).size;

  const save = async () => {
    await onSubOp("POST", `${API}/key`, {
      key: keyData.key,
      type: "string",
      value: val,
      ttl: keyData.ttl > 0 ? keyData.ttl : undefined,
    });
    setEditing(false);
  };

  return (
    <div className="value-panel">
      <div className="panel-toolbar">
        <span className="panel-label">String value</span>
        <span className="panel-meta">{byteSize} bytes</span>
        {isJson && !editing && (
          <button
            className={`btn btn-ghost btn-xs ${jsonMode ? "active-toggle" : ""}`}
            onClick={() => setJsonMode((v) => !v)}
            title="Toggle JSON format"
          >{jsonMode ? "Raw" : "{ } JSON"}</button>
        )}
        <div className="spacer" />
        {!editing && (
          <>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => { copy(keyData.value ?? "", "val"); showToast("Value copied", "success"); }}
            >{copiedId === "val" ? "✓ Copied" : "⎘ Copy"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setVal(keyData.value ?? ""); setEditing(true); }}>✎ Edit</button>
          </>
        )}
      </div>

      {editing ? (
        <div className="edit-area">
          <textarea
            className="value-textarea"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            rows={10}
            autoFocus
          />
          <div className="edit-actions">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setVal(keyData.value ?? ""); setEditing(false); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <pre className={`string-value ${jsonMode ? "json-mode" : ""}`}>
          {jsonMode ? jsonFormatted : keyData.value}
        </pre>
      )}
    </div>
  );
}

// ── Hash ───────────────────────────────────────────────────────────────────────
function HashPanel({ keyData, onSubOp, apiKey }) {
  const [newField, setNewField] = useState("");
  const [newVal, setNewVal]     = useState("");
  const [editRow, setEditRow]   = useState(null);
  const [search, setSearch]     = useState("");
  const entries = Object.entries(keyData.value ?? {});
  const filtered = search ? entries.filter(([f, v]) => f.includes(search) || v.includes(search)) : entries;

  const addField = async () => {
    if (!newField.trim()) return;
    await onSubOp("POST", `${API}/key/${apiKey}/hash`, { field: newField.trim(), value: newVal });
    setNewField(""); setNewVal("");
  };
  const saveEdit = async () => {
    await onSubOp("POST", `${API}/key/${apiKey}/hash`, { field: editRow.field, value: editRow.value });
    setEditRow(null);
  };
  const delField = async (field) => {
    await onSubOp("DELETE", `${API}/key/${apiKey}/hash/${encodeURIComponent(field)}`);
  };

  return (
    <div className="value-panel">
      <div className="panel-toolbar">
        <span className="panel-label">{entries.length} field{entries.length !== 1 ? "s" : ""}</span>
        <input
          className="panel-search"
          placeholder="Filter fields…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <table className="data-table">
        <thead><tr><th>Field</th><th>Value</th><th></th></tr></thead>
        <tbody>
          {filtered.map(([f, v]) => (
            <tr key={f}>
              <td className="field-cell"><code>{f}</code></td>
              <td className="value-cell">
                {editRow?.field === f ? (
                  <input className="inline-input" value={editRow.value} onChange={(e) => setEditRow({ ...editRow, value: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveEdit()} autoFocus />
                ) : (
                  <span onClick={() => setEditRow({ field: f, value: v })} className="editable-val" title="Click to edit">{v}</span>
                )}
              </td>
              <td className="action-cell">
                {editRow?.field === f ? (
                  <>
                    <button className="btn btn-primary btn-xs" onClick={saveEdit}>✓</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => setEditRow(null)}>✕</button>
                  </>
                ) : (
                  <button className="btn btn-danger btn-xs" onClick={() => delField(f)}>✕</button>
                )}
              </td>
            </tr>
          ))}
          <tr className="add-row">
            <td><input className="inline-input" placeholder="field" value={newField} onChange={(e) => setNewField(e.target.value)} /></td>
            <td><input className="inline-input" placeholder="value" value={newVal} onChange={(e) => setNewVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addField()} /></td>
            <td><button className="btn btn-primary btn-xs" onClick={addField}>+ Add</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── List ───────────────────────────────────────────────────────────────────────
function ListPanel({ keyData, onSubOp, apiKey }) {
  const [newItem, setNewItem] = useState("");
  const [pos, setPos]         = useState("right");
  const items = keyData.value ?? [];

  const addItem = async () => {
    if (!newItem.trim()) return;
    await onSubOp("POST", `${API}/key/${apiKey}/list`, { value: newItem.trim(), position: pos });
    setNewItem("");
  };
  const delItem = async (val) => {
    await onSubOp("DELETE", `${API}/key/${apiKey}/list`, { value: val });
  };

  return (
    <div className="value-panel">
      <div className="panel-toolbar">
        <span className="panel-label">{items.length} item{items.length !== 1 ? "s" : ""}</span>
        <span className="panel-meta">ordered list</span>
      </div>
      <ul className="list-items">
        {items.map((item, i) => (
          <li key={i} className="list-item">
            <span className="list-index">{i}</span>
            <span className="list-val">{item}</span>
            <button className="btn btn-danger btn-xs" onClick={() => delItem(item)}>✕</button>
          </li>
        ))}
      </ul>
      <div className="add-row-inline">
        <select className="select-sm" value={pos} onChange={(e) => setPos(e.target.value)}>
          <option value="right">RPUSH →</option>
          <option value="left">← LPUSH</option>
        </select>
        <input
          className="inline-input"
          placeholder="new item…"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <button className="btn btn-primary btn-sm" onClick={addItem}>Add</button>
      </div>
    </div>
  );
}

// ── Set ────────────────────────────────────────────────────────────────────────
function SetPanel({ keyData, onSubOp, apiKey }) {
  const [newMember, setNewMember] = useState("");
  const [search, setSearch]       = useState("");
  const members = keyData.value ?? [];
  const filtered = search ? members.filter((m) => m.includes(search)) : members;

  const addMember = async () => {
    if (!newMember.trim()) return;
    await onSubOp("POST", `${API}/key/${apiKey}/set`, { member: newMember.trim() });
    setNewMember("");
  };
  const delMember = async (m) => {
    await onSubOp("DELETE", `${API}/key/${apiKey}/set`, { member: m });
  };

  return (
    <div className="value-panel">
      <div className="panel-toolbar">
        <span className="panel-label">{members.length} member{members.length !== 1 ? "s" : ""}</span>
        <input className="panel-search" placeholder="Filter members…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <ul className="tag-list">
        {filtered.map((m, i) => (
          <li key={i} className="tag-item">
            <span>{m}</span>
            <button className="tag-del" onClick={() => delMember(m)}>✕</button>
          </li>
        ))}
      </ul>
      <div className="add-row-inline">
        <input
          className="inline-input"
          placeholder="new member…"
          value={newMember}
          onChange={(e) => setNewMember(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addMember()}
        />
        <button className="btn btn-primary btn-sm" onClick={addMember}>Add</button>
      </div>
    </div>
  );
}

// ── Sorted Set ─────────────────────────────────────────────────────────────────
function ZsetPanel({ keyData, onSubOp, apiKey }) {
  const [newMember, setNewMember] = useState("");
  const [newScore, setNewScore]   = useState("");
  const [search, setSearch]       = useState("");
  const items = keyData.value ?? [];
  const filtered = search ? items.filter(({ member }) => member.includes(search)) : items;

  const addMember = async () => {
    if (!newMember.trim() || newScore === "") return;
    await onSubOp("POST", `${API}/key/${apiKey}/zset`, { member: newMember.trim(), score: parseFloat(newScore) });
    setNewMember(""); setNewScore("");
  };
  const delMember = async (m) => {
    await onSubOp("DELETE", `${API}/key/${apiKey}/zset`, { member: m });
  };

  return (
    <div className="value-panel">
      <div className="panel-toolbar">
        <span className="panel-label">{items.length} member{items.length !== 1 ? "s" : ""}</span>
        <input className="panel-search" placeholder="Filter members…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <table className="data-table">
        <thead><tr><th>Rank</th><th>Score</th><th>Member</th><th></th></tr></thead>
        <tbody>
          {filtered.map(({ member, score }, i) => (
            <tr key={i}>
              <td className="rank-cell">{i}</td>
              <td className="score-cell">{score}</td>
              <td className="value-cell">{member}</td>
              <td className="action-cell">
                <button className="btn btn-danger btn-xs" onClick={() => delMember(member)}>✕</button>
              </td>
            </tr>
          ))}
          <tr className="add-row">
            <td></td>
            <td><input className="inline-input" type="number" placeholder="score" value={newScore} onChange={(e) => setNewScore(e.target.value)} /></td>
            <td><input className="inline-input" placeholder="member" value={newMember} onChange={(e) => setNewMember(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMember()} /></td>
            <td><button className="btn btn-primary btn-xs" onClick={addMember}>+ Add</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
