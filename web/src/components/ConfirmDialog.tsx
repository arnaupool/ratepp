import Sheet from './Sheet';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Destructive-action confirmation, as a bottom sheet like mobile/
// (docs/webapp-rewrite/05-decisiones.md).
export default function ConfirmDialog({ visible, title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }: Props) {
  return (
    <Sheet visible={visible} onClose={onCancel} label={title}>
      <h2 className="sheet-title">{title}</h2>
      {!!message && <p className="sheet-message">{message}</p>}
      <div className="sheet-actions">
        <button type="button" className="sheet-btn-text" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="sheet-btn-main danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
