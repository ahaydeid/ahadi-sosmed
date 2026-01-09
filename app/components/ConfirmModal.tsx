"use client";

import { X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  isDanger = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            {message}
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all active:scale-[0.98] ${
                isDanger 
                  ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200" 
                  : "bg-black hover:bg-gray-800 shadow-lg shadow-gray-200"
              }`}
            >
              {confirmLabel}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
