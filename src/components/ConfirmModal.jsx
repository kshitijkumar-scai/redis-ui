import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({ title, detail, confirmLabel = "Delete", onConfirm, onClose }) {
  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="modal confirm-modal"
        initial={{ scale: 0.9, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="confirm-icon-ring">
          <AlertTriangle size={24} />
        </div>
        <h3 className="confirm-title">{title}</h3>
        {detail && <code className="confirm-detail">{detail}</code>}
        <p className="confirm-hint">This action cannot be undone.</p>
        <div className="confirm-actions">
          <motion.button
            className="btn btn-ghost confirm-btn"
            onClick={onClose}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <X size={13} /> Cancel
          </motion.button>
          <motion.button
            className="btn btn-danger confirm-btn"
            onClick={() => { onConfirm(); onClose(); }}
            autoFocus
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {confirmLabel}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
