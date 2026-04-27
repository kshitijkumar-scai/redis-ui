import { useEffect } from "react";

export default function ConfirmModal({ title, detail, confirmLabel = "Delete", onConfirm, onClose }) {
  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal">
        <div className="confirm-icon-ring">⚠</div>
        <h3 className="confirm-title">{title}</h3>
        {detail && <code className="confirm-detail">{detail}</code>}
        <p className="confirm-hint">This action cannot be undone.</p>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-danger confirm-btn"
            onClick={() => { onConfirm(); onClose(); }}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
