"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  getClarityProjectId,
  getGaMeasurementId,
  isAnalyticsEnabled,
  isClarityEnabled,
} from "@/lib/analytics";

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gaId = getGaMeasurementId();
  const clarityId = getClarityProjectId();

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    if (typeof window === "undefined") return;
    if (typeof window.gtag !== "function") return;

    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    window.gtag("config", gaId, {
      page_path: pagePath,
    });
  }, [gaId, pathname, searchParams]);

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
              gtag('config', '${gaId}');
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
