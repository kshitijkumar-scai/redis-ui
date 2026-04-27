import { useState } from "react";

const TYPES = ["string", "hash", "list", "set", "zset"];

const PLACEHOLDERS = {
  string: "Hello, World!",
  hash:   '{"name": "Alice", "age": "30"}',
  list:   '["item1", "item2", "item3"]',
  set:    '["member1", "member2"]',
  zset:   '[{"score": 1, "member": "a"}, {"score": 2, "member": "b"}]',
};

export default function AddKeyModal({ onSave, onClose }) {
  const [key, setKey] = useState("");
  const [type, setType] = useState("string");
  const [rawValue, setRawValue] = useState("");
  const [ttl, setTtl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError("");
    if (!key.trim()) return setError("Key name is required");

    let value;
    try {
      if (type === "string") {
        value = rawValue;
      } else {
        value = JSON.parse(rawValue || (type === "hash" ? "{}" : "[]"));
      }
    } catch {
      return setError("Invalid JSON — check the format hint below");
    }

    setSaving(true);
    try {
      await onSave({
        key: key.trim(),
        type,
        value,
        ttl: ttl ? parseInt(ttl) : undefined,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>New Key</h2>
          <button className="btn btn-ghost icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="field-label">Key name</label>
          <input
            className="modal-input"
            placeholder="e.g. user:123"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoFocus
          />

          <label className="field-label">Type</label>
          <div className="type-select-row">
            {TYPES.map((t) => (
              <button
                key={t}
                className={`type-select-btn ${type === t ? "active" : ""}`}
                onClick={() => { setType(t); setRawValue(""); }}
              >
                {t}
              </button>
            ))}
          </div>

          <label className="field-label">
            Value
            <span className="field-hint"> — JSON for hash/list/set/zset</span>
          </label>
          <textarea
            className="modal-textarea"
            placeholder={PLACEHOLDERS[type]}
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            rows={6}
          />

          <label className="field-label">
            TTL <span className="field-hint">(seconds, leave blank for persistent)</span>
          </label>
          <input
            className="modal-input"
            type="number"
            min="1"
            placeholder="e.g. 3600"
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
          />

          {error && <div className="field-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Key"}
          </button>
        </div>
      </div>
    </div>
  );
}
