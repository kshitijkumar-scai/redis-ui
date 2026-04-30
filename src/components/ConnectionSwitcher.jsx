import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Plus, Pencil, X, RefreshCw, Database } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

export default function ConnectionSwitcher({ connections, switching, onAdd, onSwitch, onRemove, onRename }) {
  const [open, setOpen]           = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName]   = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const ref = useRef(null);

  const active = connections.find((c) => c.active);

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
        <button
          className="conn-switcher-trigger"
          onClick={() => !switching && setOpen((v) => !v)}
          disabled={switching}
        >
          {switching ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
              style={{ display: "inline-flex" }}
            >
              <RefreshCw size={12} />
            </motion.span>
          ) : (
            <span className={`sw-dot ${active?.status ?? "error"}`} />
          )}

          <span className="sw-name">
            {switching ? "Switching…" : (active?.name ?? "Not connected")}
          </span>

          {!switching && (
            <span className="sw-host">
              {active ? `${active.host}:${active.port}` : ""}
            </span>
          )}

          <span className="sw-caret">
            {switching ? null : open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              className="sw-menu"
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="sw-menu-header">
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Database size={11} /> Redis Connections
                </span>
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
                        <motion.button
                          className="btn btn-ghost btn-xs sw-switch-btn"
                          onClick={() => { onSwitch(c.id); setOpen(false); }}
                          title="Switch to this connection"
                          disabled={switching}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Use →
                        </motion.button>
                      )}
                      <motion.button
                        className="btn btn-ghost btn-xs sw-edit-btn"
                        onClick={(e) => startEdit(c, e)}
                        title="Rename"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Pencil size={11} />
                      </motion.button>
                      {!c.active && (
                        <motion.button
                          className="btn btn-danger btn-xs"
                          onClick={(e) => { e.stopPropagation(); setRemoveTarget(c); }}
                          title="Remove connection"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <X size={11} />
                        </motion.button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sw-menu-footer">
                <motion.button
                  className="btn btn-ghost btn-sm sw-add-btn"
                  onClick={() => { onAdd(); setOpen(false); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus size={13} /> Add Connection
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
