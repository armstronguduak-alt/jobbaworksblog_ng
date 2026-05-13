import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type DialogType = 'alert' | 'confirm';
type DialogVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  variant?: DialogVariant;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface DialogContextType {
  showAlert: (message: string, title?: string, variant?: DialogVariant) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showSuccess: (message: string, title?: string) => Promise<void>;
  showError: (message: string, title?: string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

const variantConfig: Record<DialogVariant, { icon: string; iconBg: string; iconColor: string; btnClass: string }> = {
  default: {
    icon: 'info',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    btnClass: 'bg-primary text-white hover:bg-emerald-700 shadow-primary/20',
  },
  success: {
    icon: 'check_circle',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    btnClass: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20',
  },
  error: {
    icon: 'error',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    btnClass: 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20',
  },
  warning: {
    icon: 'warning',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    btnClass: 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-600/20',
  },
  info: {
    icon: 'help',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    btnClass: 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20',
  },
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions | null>(null);

  const resolveVariant = (title?: string): DialogVariant => {
    if (!title) return 'default';
    const t = title.toLowerCase();
    if (t.includes('success') || t.includes('done') || t.includes('complete')) return 'success';
    if (t.includes('error') || t.includes('fail') || t.includes('denied')) return 'error';
    if (t.includes('warning') || t.includes('caution')) return 'warning';
    return 'default';
  };

  const showAlert = useCallback((message: string, title: string = 'Notice', variant?: DialogVariant) => {
    return new Promise<void>((resolve) => {
      setOptions({
        title,
        message,
        type: 'alert',
        variant: variant ?? resolveVariant(title),
        onConfirm: () => {
          setIsOpen(false);
          resolve();
        }
      });
      setIsOpen(true);
    });
  }, []);

  const showConfirm = useCallback((message: string, title: string = 'Confirm Action') => {
    return new Promise<boolean>((resolve) => {
      setOptions({
        title,
        message,
        type: 'confirm',
        variant: 'info',
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
  }, []);

  const showSuccess = useCallback((message: string, title: string = 'Success') => {
    return showAlert(message, title, 'success');
  }, [showAlert]);

  const showError = useCallback((message: string, title: string = 'Error') => {
    return showAlert(message, title, 'error');
  }, [showAlert]);

  const v = options?.variant ?? 'default';
  const config = variantConfig[v];

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showSuccess, showError }}>
      {children}
      <AnimatePresence>
        {isOpen && options && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={options.type === 'confirm' ? options.onCancel : options.onConfirm}
            />

            {/* Dialog Card */}
            <motion.div
              className="relative bg-surface-container-lowest text-on-surface w-full max-w-sm rounded-3xl shadow-2xl border border-surface-container-highest/20 overflow-hidden"
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            >
              {/* Top accent bar */}
              <motion.div
                className={`h-1 w-full ${
                  v === 'success' ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                  v === 'error' ? 'bg-gradient-to-r from-rose-400 to-red-500' :
                  v === 'warning' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                  v === 'info' ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                  'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
                style={{ transformOrigin: 'left' }}
              />

              <div className="p-6 pt-5">
                {/* Icon */}
                <motion.div
                  className="flex justify-center mb-4"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                >
                  <div className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center`}>
                    <span
                      className={`material-symbols-outlined text-3xl ${config.iconColor}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {config.icon}
                    </span>
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h3
                  className="text-xl font-bold font-headline text-center mb-2 text-emerald-950 dark:text-emerald-50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {options.title}
                </motion.h3>

                {/* Message */}
                <motion.p
                  className="text-sm font-medium text-on-surface-variant text-center mb-6 leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {options.message}
                </motion.p>

                {/* Buttons */}
                <motion.div
                  className={`flex gap-3 font-semibold ${options.type === 'confirm' ? 'justify-end' : 'justify-center'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {options.type === 'confirm' && (
                    <button 
                      onClick={options.onCancel}
                      className="px-5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-highest transition-all text-on-surface-variant active:scale-95 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={options.onConfirm}
                    className={`px-6 py-2.5 rounded-xl font-bold shadow-lg active:scale-95 transition-all outline-none focus:ring-4 focus:ring-primary/20 text-sm ${config.btnClass}`}
                  >
                    {options.type === 'confirm' ? 'Confirm' : 'Okay'}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
