'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { DotLoader } from './DotLoader';

export type StatusType = 'success' | 'pending' | 'error' | 'rejected' | null;

interface StatusModalProps {
  status: StatusType;
  title?: string;
  message?: string;
  onClose?: () => void;
  autoClose?: number; // ms, 0 = manual close only
}

const statusConfig = {
  success: {
    icon: 'check_circle',
    iconColor: 'text-emerald-500',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    defaultTitle: 'Success!',
    defaultMessage: 'Your action was completed successfully.',
  },
  pending: {
    icon: 'schedule',
    iconColor: 'text-amber-500',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    defaultTitle: 'Processing...',
    defaultMessage: 'Your request is being processed. Please wait.',
  },
  error: {
    icon: 'error',
    iconColor: 'text-red-500',
    bg: 'bg-red-50',
    ring: 'ring-red-200',
    defaultTitle: 'Something went wrong',
    defaultMessage: 'An error occurred. Please try again.',
  },
  rejected: {
    icon: 'cancel',
    iconColor: 'text-rose-500',
    bg: 'bg-rose-50',
    ring: 'ring-rose-200',
    defaultTitle: 'Request Rejected',
    defaultMessage: 'Your request could not be approved at this time.',
  },
};

export function StatusModal({ status, title, message, onClose, autoClose = 3000 }: StatusModalProps) {
  useEffect(() => {
    if (status && status !== 'pending' && autoClose > 0 && onClose) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [status, autoClose, onClose]);

  return (
    <AnimatePresence>
      {status && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]"
            onClick={status !== 'pending' ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div className={`w-full max-w-sm rounded-3xl ${statusConfig[status].bg} ring-1 ${statusConfig[status].ring} p-8 text-center shadow-2xl`}>
              {/* Animated Icon */}
              {status === 'pending' ? (
                <div className="mx-auto mb-5">
                  <DotLoader size="lg" />
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                >
                  <span
                    className={`material-symbols-outlined ${statusConfig[status].iconColor} text-6xl block mb-4`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {statusConfig[status].icon}
                  </span>
                </motion.div>
              )}

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-lg font-bold text-slate-900 mb-2"
              >
                {title || statusConfig[status].defaultTitle}
              </motion.h3>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-sm text-slate-600 leading-relaxed"
              >
                {message || statusConfig[status].defaultMessage}
              </motion.p>

              {/* Close button (not for pending) */}
              {status !== 'pending' && onClose && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="mt-6 w-full py-2.5 rounded-xl bg-white text-slate-700 font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  {status === 'success' ? 'Done' : 'Close'}
                </motion.button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
