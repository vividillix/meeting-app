import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeedbackContext } from "./feedbackContext";

const TOAST_MS = 2400;
const ERROR_TOAST_MS = 3600;

function ConfirmDialog({ dialog, onClose }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onClick={() => onClose(false)}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title" className="dialog__title">
          {dialog.title}
        </h2>
        {dialog.message && <p className="dialog__message">{dialog.message}</p>}
        <div className="dialog__actions">
          {!dialog.alertOnly && (
            <button type="button" className="btn btn--ghost" onClick={() => onClose(false)}>
              {dialog.cancelText ?? "취소"}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${dialog.danger ? "btn--danger" : ""}`}
            onClick={() => onClose(true)}
          >
            {dialog.confirmText ?? "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);
  const idRef = useRef(0);

  const toast = useCallback((message, { type = "info" } = {}) => {
    idRef.current += 1;
    const id = idRef.current;
    // reason: 같은 알림이 연달아 쌓이지 않게 최근 2개만 유지
    setToasts((prev) => [...prev.slice(-1), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, type === "error" ? ERROR_TOAST_MS : TOAST_MS);
  }, []);

  const confirm = useCallback((options) => {
    resolverRef.current?.(false);
    setDialog(options);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const closeDialog = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === "error" ? "toast--error" : ""}`}>
            {t.message}
          </div>
        ))}
      </div>

      {dialog && <ConfirmDialog dialog={dialog} onClose={closeDialog} />}
    </FeedbackContext.Provider>
  );
}
