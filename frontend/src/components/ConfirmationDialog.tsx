/**
 * Confirmation Dialog component
 * Modal for confirming destructive actions
 */

import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmClass?: string;
}

const ConfirmationDialog = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmClass = 'btn-danger',
}: ConfirmationDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-error-500/20 rounded-full">
              <AlertTriangle className="w-6 h-6 text-error-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-neutral-400">{message}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex space-x-3">
          <button onClick={onCancel} className="btn btn-secondary flex-1">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`btn ${confirmClass} flex-1`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
