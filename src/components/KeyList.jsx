import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, RefreshCw, Plus, X, Trash2 } from "lucide-react";

const TYPE_COLORS = {
  string: "#3ecf8e",
  hash:   "#4f8ef7",
  list:   "#f0944d",
  set:    "#9b8afb",
  zset:   "#e879a0",
};

const listVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.025, delayChildren: 0.03 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

const MIN_WIDTH = 180;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 280;

export default function KeyList({
  keys, listKey, loading, pattern, hasMore, selectedKey,
  onPatternChange, onSelect, onRefresh, onLoadMore, onDelete, onAddKey,
}) {
  const [search, setSearch]         = useState(pattern === "*" ? "" : pattern);
  const [selected, setSelected]     = useState(new Set());
  const [typeFilter, setTypeFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging]     = useState(false);
  const [width, setWidth]           = useState(
    () => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parseInt(localStorage.getItem("rdm-sw") || DEFAULT_WIDTH)))
  );
  const shouldReduce = useReducedMotion();
  const widthRef     = useRef(width);
  widthRef.current   = width;

  const filtered = typeFilter === "all" ? keys : keys.filter((k) => k.type === typeFilter);

  const handleSearch = (val) => {
    setSearch(val);
    onPatternChange(val.trim() ? `*${val.trim()}*` : "*");
  };

  const toggleSelect = (key, e) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((k) => k.key)));
  };

  const handleDelete = () => {
    if (!selected.size) return;
    onDelete([...selected]);
    setSelected(new Set());
  };

  const doRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  // ── Drag-to-resize ────────────────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widthRef.current;
    setDragging(true);

    const onMove = (e) => {
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + (e.clientX - startX)));
      setWidth(newW);
    };

    const onUp = () => {
      setDragging(false);
      localStorage.setItem("rdm-sw", widthRef.current);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return (
    <aside
      className="key-list"
      style={{ width, minWidth: width, maxWidth: width, position: "relative" }}
    >
      {/* Resize handle */}
      <div
        className={`sidebar-resize-handle${dragging ? " is-dragging" : ""}`}
        onMouseDown={handleResizeMouseDown}
      />

      {/* Toolbar */}
      <div className="key-list-toolbar">
        <div className="search-wrap">
          <span className="search-icon"><Search size={13} /></span>
          <input
            className="search-input"
            placeholder="Search keys…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => handleSearch("")} title="Clear">
              <X size={11} />
            </button>
          )}
        </div>
        <motion.button
          className="btn btn-ghost icon-btn"
          onClick={doRefresh}
          title="Refresh keys"
          disabled={refreshing}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <motion.span
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={refreshing ? { repeat: Infinity, duration: 0.7, ease: "linear" } : {}}
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            <RefreshCw size={14} />
          </motion.span>
        </motion.button>
        <motion.button
          className="btn btn-primary icon-btn"
          onClick={onAddKey}
          title="New key"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <Plus size={16} />
        </motion.button>
      </div>

      {/* Type filters */}
      <div className="type-filters">
        {["all", "string", "hash", "list", "set", "zset"].map((t) => (
          <motion.button
            key={t}
            className={`type-chip ${typeFilter === t ? "active" : ""}`}
            style={t !== "all" ? { "--chip-color": TYPE_COLORS[t] } : {}}
            onClick={() => setTypeFilter(t)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
          >
            {t}
          </motion.button>
        ))}
      </div>

      {/* Bulk bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            className="bulk-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
            style={{ overflow: "hidden" }}
          >
            <span>{selected.size} selected</span>
            <motion.button
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 size={11} /> Delete
            </motion.button>
            <motion.button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelected(new Set())}
              whileTap={{ scale: 0.95 }}
            >
              <X size={11} /> Clear
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List header */}
      <div className="key-list-header">
        <label className="checkbox-wrap">
          <input
            type="checkbox"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={toggleAll}
          />
        </label>
        <span className="key-count">
          {loading && keys.length === 0
            ? "Loading…"
            : `${filtered.length} key${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Key items */}
      <motion.ul
        key={`${listKey}-${typeFilter}`}
        className="key-items"
        variants={shouldReduce ? {} : listVariants}
        initial="hidden"
        animate="show"
      >
        {/* Skeletons */}
        {loading && keys.length === 0 &&
          Array.from({ length: 10 }).map((_, i) => (
            <motion.li
              key={`sk-${i}`}
              className="key-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            />
          ))
        }

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <motion.li
            className="key-empty"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span style={{ fontSize: 28, opacity: 0.1 }}>⬡</span>
            <span>No keys found</span>
          </motion.li>
        )}

        {/* Items */}
        {filtered.map((k, idx) => (
          <motion.li
            key={k.key}
            className={`key-item ${selectedKey === k.key ? "active" : ""}`}
            variants={!shouldReduce && idx < 80 ? itemVariants : {}}
            onClick={() => onSelect(k.key)}
            whileHover={selectedKey !== k.key ? { x: 2 } : {}}
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
          </motion.li>
        ))}
      </motion.ul>

      {hasMore && (
        <button className="btn btn-ghost load-more" onClick={onLoadMore} disabled={loading}>
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </aside>
  );
}

function formatTtl(sec) {
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}
