"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import {
  getClarityProjectId,
  getGaMeasurementId,
  isAnalyticsEnabled,
  isClarityEnabled,
  normalizeAnalyticsPath,
} from "@/lib/analytics";

export default function Analytics() {
  const pathname = usePathname();
  const gaId = getGaMeasurementId();
  const clarityId = getClarityProjectId();

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    if (typeof window === "undefined") return;
    const sendPageView = () => {
      if (typeof window.gtag !== "function") return;
      const pagePath = normalizeAnalyticsPath(pathname);
      const pageLocation = `${window.location.origin}${pagePath}`;
      window.gtag("config", gaId, {
        page_path: pagePath,
        page_location: pageLocation,
      });
    };

    if (typeof window.gtag === "function") {
      sendPageView();
      return;
    }

    window.addEventListener("opla-ga-ready", sendPageView, { once: true });
    return () => window.removeEventListener("opla-ga-ready", sendPageView);
  }, [gaId, pathname]);

  if (!isAnalyticsEnabled() && !isClarityEnabled()) {
    return null;
  }

  return (
    <>
      {isAnalyticsEnabled() ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${gaId}', { send_page_view: false });
              window.dispatchEvent(new Event('opla-ga-ready'));
            `}
          </Script>
        </>
      ) : null}
      {isClarityEnabled() ? (
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);
              t.async=1;
              t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];
              y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}
        </Script>
      ) : null}
    </>
  );
}
