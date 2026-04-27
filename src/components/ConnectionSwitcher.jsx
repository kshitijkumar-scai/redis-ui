import { useState, useEffect, useRef } from "react";
import ConfirmModal from "./ConfirmModal";

export default function ConnectionSwitcher({ connections, onAdd, onSwitch, onRemove, onRename }) {
  const [open, setOpen]           = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName]   = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const ref = useRef(null);

  const active = connections.find((c) => c.active);

  // Close on outside click
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const startEdit = (c, e) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditName(c.name);
  };

  const saveEdit = async (id) => {
    if (editName.trim()) await onRename(id, editName.trim());
    setEditingId(null);
  };

  return (
    <>
      <div className="conn-switcher" ref={ref}>
        <button className="conn-switcher-trigger" onClick={() => setOpen((v) => !v)}>
          <span className={`sw-dot ${active?.status ?? "error"}`} />
          <span className="sw-name">{active?.name ?? "Not connected"}</span>
          <span className="sw-host">{active ? `${active.host}:${active.port}` : ""}</span>
          <span className="sw-caret">{open ? "▴" : "▾"}</span>
        </button>

        {open && (
          <div className="sw-menu">
            <div className="sw-menu-header">
              <span>Redis Connections</span>
              <span className="sw-menu-count">{connections.length}</span>
            </div>

            <div className="sw-entries">
              {connections.map((c) => (
                <div key={c.id} className={`sw-entry ${c.active ? "sw-active" : ""}`}>
                  <span className={`sw-dot ${c.status}`} title={c.status} />

                  <div className="sw-entry-info">
                    {editingId === c.id ? (
                      <input
                        className="sw-name-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(c.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => saveEdit(c.id)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="sw-entry-name" onDoubleClick={(e) => startEdit(c, e)} title="Double-click to rename">
                        {c.name}
                      </span>
                    )}
                    <span className="sw-entry-host">{c.host}:{c.port} · db{c.db}</span>
                  </div>

                  <div className="sw-entry-actions">
                    {c.active ? (
                      <span className="sw-active-tag">active</span>
                    ) : (
                      <button
                        className="btn btn-ghost btn-xs sw-switch-btn"
                        onClick={() => { onSwitch(c.id); setOpen(false); }}
                        title="Switch to this connection"
                      >
                        Use →
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-xs sw-edit-btn"
                      onClick={(e) => startEdit(c, e)}
                      title="Rename"
                    >✎</button>
                    {!c.active && (
                      <button
                        className="btn btn-danger btn-xs"
                        onClick={(e) => { e.stopPropagation(); setRemoveTarget(c); }}
                        title="Remove connection"
                      >✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="sw-menu-footer">
              <button
                className="btn btn-ghost btn-sm sw-add-btn"
                onClick={() => { onAdd(); setOpen(false); }}
              >
                + Add Connection
              </button>
            </div>
          </div>
        )}
      </div>

      {removeTarget && (
        <ConfirmModal
          title="Remove connection?"
          detail={`${removeTarget.name} — ${removeTarget.host}:${removeTarget.port}`}
          confirmLabel="Remove"
          onConfirm={() => { onRemove(removeTarget.id); setRemoveTarget(null); }}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </>
  );
}
