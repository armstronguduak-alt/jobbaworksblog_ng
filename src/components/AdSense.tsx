import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdSenseProps {
  adSlot: string;
  adFormat?: 'auto' | 'fluid';
  adLayout?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Reusable Google AdSense component.
 * Only renders on public blog/article pages — never on the dashboard.
 */
export function AdSense({ adSlot, adFormat = 'auto', adLayout, style, className = '' }: AdSenseProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      // AdSense may not be loaded yet or ad blocker is active
    }
  }, []);

  return (
    <div ref={adRef} className={`adsense-container ${className}`} style={{ overflow: 'hidden', ...style }}>
      <ins
        className="adsbygoogle"
        style={
          adLayout === 'in-article'
            ? { display: 'block', textAlign: 'center' as const }
            : { display: 'block' }
        }
        data-ad-client="ca-pub-3589948805415388"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        {...(adLayout ? { 'data-ad-layout': adLayout } : {})}
        {...(adFormat === 'auto' ? { 'data-full-width-responsive': 'true' } : {})}
      />
    </div>
  );
}

/** Display ad — responsive block ad */
export function DisplayAd({ className = '' }: { className?: string }) {
  return <AdSense adSlot="8495067728" adFormat="auto" className={className} />;
}

/** In-Article ad — fluid format for within article content */
export function InArticleAd({ className = '' }: { className?: string }) {
  return <AdSense adSlot="8032033297" adFormat="fluid" adLayout="in-article" className={className} />;
}
