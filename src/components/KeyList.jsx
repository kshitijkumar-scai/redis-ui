import { useState } from "react";

const TYPE_COLORS = {
  string: "#4ade80",
  hash:   "#60a5fa",
  list:   "#f97316",
  set:    "#a78bfa",
  zset:   "#f472b6",
};

export default function KeyList({
  keys, loading, pattern, hasMore, selectedKey,
  onPatternChange, onSelect, onRefresh, onLoadMore, onDelete, onAddKey,
}) {
  const [search, setSearch] = useState(pattern === "*" ? "" : pattern);
  const [selected, setSelected] = useState(new Set());
  const [typeFilter, setTypeFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = typeFilter === "all" ? keys : keys.filter((k) => k.type === typeFilter);

  const handleSearch = (val) => {
    setSearch(val);
    const pat = val.trim() ? `*${val.trim()}*` : "*";
    onPatternChange(pat);
  };

  const toggleSelect = (key, e) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((k) => k.key)));
  };

  const handleDelete = () => {
    if (selected.size === 0) return;
    onDelete([...selected]);
    setSelected(new Set());
  };

  return (
    <aside className="key-list">
      <div className="key-list-toolbar">
        <input
          className="search-input"
          placeholder="Search keys…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <button
          className="btn btn-ghost icon-btn"
          onClick={async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); }}
          title="Refresh"
          disabled={refreshing}
        >
          <span className={refreshing ? "is-spinning" : ""}>↻</span>
        </button>
        <button className="btn btn-primary icon-btn" onClick={onAddKey} title="New key">+</button>
      </div>

      <div className="type-filters">
        {["all", "string", "hash", "list", "set", "zset"].map((t) => (
          <button
            key={t}
            className={`type-chip ${typeFilter === t ? "active" : ""}`}
            style={t !== "all" ? { "--chip-color": TYPE_COLORS[t] } : {}}
            onClick={() => setTypeFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="bulk-bar">
          <span>{selected.size} selected</span>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      <div className="key-list-header">
        <label className="checkbox-wrap">
          <input
            type="checkbox"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={toggleSelectAll}
          />
        </label>
        <span className="key-count">{filtered.length} key{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <ul className="key-items">
        {loading && keys.length === 0 && (
          <li className="key-empty">Loading…</li>
        )}
        {!loading && filtered.length === 0 && (
          <li className="key-empty">No keys found</li>
        )}
        {filtered.map((k) => (
          <li
            key={k.key}
            className={`key-item ${selectedKey === k.key ? "active" : ""}`}
            onClick={() => onSelect(k.key)}
          >
            <label className="checkbox-wrap" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selected.has(k.key)}
                onChange={(e) => toggleSelect(k.key, e)}
              />
            </label>
            <span
              className="type-badge"
              style={{ background: TYPE_COLORS[k.type] ?? "#6b7280" }}
            >
              {k.type === "string" ? "str" : k.type}
            </span>
            <span className="key-name" title={k.key}>{k.key}</span>
            {k.ttl > 0 && <span className="ttl-badge">{formatTtl(k.ttl)}</span>}
          </li>
        ))}
      </ul>

      {hasMore && (
        <button className="btn btn-ghost load-more" onClick={onLoadMore} disabled={loading}>
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </aside>
  );
}

function formatTtl(sec) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}
