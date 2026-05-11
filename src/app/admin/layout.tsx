'use client';

import { DialogProvider } from '@/components/client/contexts/DialogContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DialogProvider>
      <div className="min-h-screen bg-surface text-on-surface antialiased font-body">
        {children}
      </div>
    </DialogProvider>
  );
}
