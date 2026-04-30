import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Trash2, Copy, Pencil, CopyPlus, X, Check, Clock,
} from "lucide-react";
import ConfirmModal from "./ConfirmModal";

const API = "/api";

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

const panelVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function KeyViewer({
  keyData, loading, selectedKey,
  onDelete, onUpdateTtl, onSubOp, onRefresh, onRename, onClone, showToast,
}) {
  if (!selectedKey && !loading) {
    return (
      <main className="key-viewer empty-state">
        <motion.div
          className="empty-icon"
          animate={{ scale: [1, 1.06, 1], opacity: [0.07, 0.12, 0.07] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          ⬡
        </motion.div>
        <p>Select a key to inspect</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="key-viewer empty-state">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          style={{ display: "inline-flex", opacity: 0.35, color: "var(--accent)" }}
        >
          <RefreshCw size={22} />
        </motion.div>
        <p>Loading…</p>
      </main>
    );
  }

  if (!keyData) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={selectedKey}
        className="key-viewer"
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
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
      </motion.main>
    </AnimatePresence>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function KeyHeader({ keyData, onDelete, onUpdateTtl, onRefresh, onRename, onClone, showToast }) {
  const [editingTtl, setEditingTtl]           = useState(false);
  const [ttlVal, setTtlVal]                   = useState(keyData.ttl > 0 ? keyData.ttl : "");
  const [refreshing, setRefreshing]           = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renaming, setRenaming]               = useState(false);
  const [renameVal, setRenameVal]             = useState(keyData.key);
  const [cloning, setCloning]                 = useState(false);
  const [cloneVal, setCloneVal]               = useState(keyData.key + ":copy");
  const [copiedId, copy]                      = useCopy();

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
              <motion.button className="btn btn-primary btn-sm" onClick={saveRename} whileTap={{ scale: 0.95 }}>
                <Check size={13} /> Save
              </motion.button>
              <motion.button className="btn btn-ghost btn-sm" onClick={() => setRenaming(false)} whileTap={{ scale: 0.95 }}>
                <X size={13} />
              </motion.button>
            </div>
          ) : (
            <>
              <div className="viewer-key-name" title={keyData.key}>{keyData.key}</div>
              <div className="key-name-actions">
                <motion.button
                  className="btn btn-ghost btn-xs key-action-btn"
                  onClick={() => { copy(keyData.key, "keyname"); showToast("Key name copied"); }}
                  title="Copy key name"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {copiedId === "keyname" ? <Check size={12} /> : <Copy size={12} />}
                </motion.button>
                <motion.button
                  className="btn btn-ghost btn-xs key-action-btn"
                  onClick={() => { setRenameVal(keyData.key); setRenaming(true); }}
                  title="Rename key"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Pencil size={12} />
                </motion.button>
                <motion.button
                  className="btn btn-ghost btn-xs key-action-btn"
                  onClick={() => { setCloneVal(keyData.key + ":copy"); setCloning(true); }}
                  title="Duplicate key"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <CopyPlus size={12} />
                </motion.button>
              </div>
            </>
          )}
        </div>

        {/* Clone row */}
        <AnimatePresence>
          {cloning && (
            <motion.div
              className="rename-row clone-row"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span className="clone-label">Clone to:</span>
              <input
                className="rename-input"
                value={cloneVal}
                onChange={(e) => setCloneVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveClone(); if (e.key === "Escape") setCloning(false); }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={saveClone}><CopyPlus size={13} /> Clone</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setCloning(false)}><X size={13} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Meta row */}
        <div className="viewer-meta">
          <span className={`type-pill type-${keyData.type}`}>{keyData.type}</span>

          <span className="meta-item">
            <Clock size={12} style={{ opacity: 0.5 }} />
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
                <button className="btn btn-sm btn-primary" onClick={saveTtl}><Check size={12} /></button>
                <button className="btn btn-sm btn-ghost" onClick={() => setEditingTtl(false)}><X size={12} /></button>
              </>
            ) : (
              <button className="btn-link" onClick={() => setEditingTtl(true)}>
                {keyData.ttl === -1 ? "∞ persistent" : keyData.ttl === -2 ? "expired" : `${keyData.ttl}s`}
              </button>
            )}
          </span>

          <div className="meta-spacer" />

          <motion.button
            className="btn btn-ghost icon-btn"
            onClick={async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); }}
            title="Refresh"
            disabled={refreshing}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            <motion.span
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { repeat: Infinity, duration: 0.7, ease: "linear" } : {}}
              style={{ display: "inline-flex" }}
            >
              <RefreshCw size={14} />
            </motion.span>
          </motion.button>

          <motion.button
            className="btn btn-danger btn-sm"
            onClick={() => setShowDeleteConfirm(true)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Trash2 size={13} /> Delete
          </motion.button>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete this key?"
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
      key: keyData.key, type: "string", value: val,
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
          >{jsonMode ? "Raw" : "{ } JSON"}</button>
        )}
        <div className="spacer" />
        {!editing && (
          <>
            <motion.button
              className="btn btn-ghost btn-xs"
              onClick={() => { copy(keyData.value ?? "", "val"); showToast("Value copied"); }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              {copiedId === "val" ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
            </motion.button>
            <motion.button
              className="btn btn-ghost btn-sm"
              onClick={() => { setVal(keyData.value ?? ""); setEditing(true); }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Pencil size={12} /> Edit
            </motion.button>
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
            <button className="btn btn-primary btn-sm" onClick={save}><Check size={13} /> Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setVal(keyData.value ?? ""); setEditing(false); }}><X size={13} /> Cancel</button>
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
  const entries  = Object.entries(keyData.value ?? {});
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

  return (
    <div className="value-panel">
      <div className="panel-toolbar">
        <span className="panel-label">{entries.length} field{entries.length !== 1 ? "s" : ""}</span>
        <input className="panel-search" placeholder="Filter fields…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    <button className="btn btn-primary btn-xs" onClick={saveEdit}><Check size={11} /></button>
                    <button className="btn btn-ghost btn-xs" onClick={() => setEditRow(null)}><X size={11} /></button>
                  </>
                ) : (
                  <button className="btn btn-danger btn-xs" onClick={() => onSubOp("DELETE", `${API}/key/${apiKey}/hash/${encodeURIComponent(f)}`)}><Trash2 size={11} /></button>
                )}
              </td>
            </tr>
          ))}
          <tr className="add-row">
            <td><input className="inline-input" placeholder="field" value={newField} onChange={(e) => setNewField(e.target.value)} /></td>
            <td><input className="inline-input" placeholder="value" value={newVal} onChange={(e) => setNewVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addField()} /></td>
            <td><button className="btn btn-primary btn-xs" onClick={addField}><Plus size={11} /> Add</button></td>
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
            <button className="btn btn-danger btn-xs" onClick={() => onSubOp("DELETE", `${API}/key/${apiKey}/list`, { value: item })}><Trash2 size={11} /></button>
          </li>
        ))}
      </ul>
      <div className="add-row-inline">
        <select className="select-sm" value={pos} onChange={(e) => setPos(e.target.value)}>
          <option value="right">RPUSH →</option>
          <option value="left">← LPUSH</option>
        </select>
        <input className="inline-input" placeholder="new item…" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} />
        <button className="btn btn-primary btn-sm" onClick={addItem}><Plus size={13} /> Add</button>
      </div>
    </div>
  );
}

// ── Set ────────────────────────────────────────────────────────────────────────
function SetPanel({ keyData, onSubOp, apiKey }) {
  const [newMember, setNewMember] = useState("");
  const [search, setSearch]       = useState("");
  const members  = keyData.value ?? [];
  const filtered = search ? members.filter((m) => m.includes(search)) : members;

  const addMember = async () => {
    if (!newMember.trim()) return;
    await onSubOp("POST", `${API}/key/${apiKey}/set`, { member: newMember.trim() });
    setNewMember("");
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
            <button className="tag-del" onClick={() => onSubOp("DELETE", `${API}/key/${apiKey}/set`, { member: m })}><X size={10} /></button>
          </li>
        ))}
      </ul>
      <div className="add-row-inline">
        <input className="inline-input" placeholder="new member…" value={newMember} onChange={(e) => setNewMember(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMember()} />
        <button className="btn btn-primary btn-sm" onClick={addMember}><Plus size={13} /> Add</button>
      </div>
    </div>
  );
}

// ── Sorted Set ─────────────────────────────────────────────────────────────────
function ZsetPanel({ keyData, onSubOp, apiKey }) {
  const [newMember, setNewMember] = useState("");
  const [newScore, setNewScore]   = useState("");
  const [search, setSearch]       = useState("");
  const items    = keyData.value ?? [];
  const filtered = search ? items.filter(({ member }) => member.includes(search)) : items;

  const addMember = async () => {
    if (!newMember.trim() || newScore === "") return;
    await onSubOp("POST", `${API}/key/${apiKey}/zset`, { member: newMember.trim(), score: parseFloat(newScore) });
    setNewMember(""); setNewScore("");
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
                <button className="btn btn-danger btn-xs" onClick={() => onSubOp("DELETE", `${API}/key/${apiKey}/zset`, { member })}><Trash2 size={11} /></button>
              </td>
            </tr>
          ))}
          <tr className="add-row">
            <td></td>
            <td><input className="inline-input" type="number" placeholder="score" value={newScore} onChange={(e) => setNewScore(e.target.value)} /></td>
            <td><input className="inline-input" placeholder="member" value={newMember} onChange={(e) => setNewMember(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMember()} /></td>
            <td><button className="btn btn-primary btn-xs" onClick={addMember}><Plus size={11} /></button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
