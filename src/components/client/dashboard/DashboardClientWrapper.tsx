'use client';

import { DialogProvider } from '@/components/client/contexts/DialogContext';

export function DashboardClientWrapper({ children }: { children: React.ReactNode }) {
  return <DialogProvider>{children}</DialogProvider>;
}
