import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type DialogType = 'alert' | 'confirm';

interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface DialogContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions | null>(null);

  const showAlert = (message: string, title: string = 'Notice') => {
    return new Promise<void>((resolve) => {
      setOptions({
        title,
        message,
        type: 'alert',
        onConfirm: () => {
          setIsOpen(false);
          resolve();
        }
      });
      setIsOpen(true);
    });
  };

  const showConfirm = (message: string, title: string = 'Confirm Action') => {
    return new Promise<boolean>((resolve) => {
      setOptions({
        title,
        message,
        type: 'confirm',
        onConfirm: () => {
          setIsOpen(false);
          resolve(true);
        },
        onCancel: () => {
          setIsOpen(false);
          resolve(false);
        }
      });
      setIsOpen(true);
    });
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 transition-opacity">
          <div className="bg-surface-container-lowest text-on-surface w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-surface-container-highest/20 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold font-headline mb-3 text-emerald-950 dark:text-emerald-50">
              {options.title}
            </h3>
            <p className="text-sm font-medium text-on-surface-variant mb-6 leading-relaxed">
              {options.message}
            </p>
            <div className="flex justify-end gap-3 font-semibold">
              {options.type === 'confirm' && (
                <button 
                  onClick={options.onCancel}
                  className="px-5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-highest transition-colors text-on-surface-variant active:scale-95 text-sm"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={options.onConfirm}
                className="px-5 py-2.5 rounded-xl font-bold bg-primary text-white shadow-md active:scale-95 transition-all outline-none focus:ring-4 focus:ring-primary/20 hover:bg-emerald-700 text-sm"
              >
                {options.type === 'confirm' ? 'Confirm' : 'Okay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
