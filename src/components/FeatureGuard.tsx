import { ReactNode } from 'react';
import { useAppSettings, PageToggles } from '../hooks/useAppSettings';
import { FeatureDisabled } from './FeatureDisabled';

interface FeatureGuardProps {
  feature: keyof PageToggles;
  children: ReactNode;
}

export function FeatureGuard({ feature, children }: FeatureGuardProps) {
  const { pageToggles, isLoadingToggles } = useAppSettings();

  if (isLoadingToggles) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (pageToggles[feature] === false) {
    return <FeatureDisabled />;
  }

  return <>{children}</>;
}
