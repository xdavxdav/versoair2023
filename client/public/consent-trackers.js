(function () {
  "use strict";

  var analyticsId = "G-V74QCY3MYD";
  var klaviyoUrl =
    "https://static.klaviyo.com/onsite/js/Ygrd6h/klaviyo.js?company_id=Ygrd6h";

  function hasConsent() {
    try {
      return window.localStorage.getItem("cookieConsent") === "accepted";
    } catch (error) {
      console.error("[Cookie consent] Could not read saved preference:", error);
      return false;
    }
  }

  function loadGoogleAnalytics() {
    if (document.getElementById("verso-google-analytics")) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
    window.gtag("js", new Date());
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("consent", "update", {
      analytics_storage: "granted",
    });
    window.gtag("config", analyticsId, { anonymize_ip: true });

    var script = document.createElement("script");
    script.id = "verso-google-analytics";
    script.async = true;
    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" + analyticsId;
    script.onerror = function () {
      console.error("[Cookie consent] Google Analytics failed to load.");
    };
    document.head.appendChild(script);
  }

  function loadKlaviyo() {
    if (document.getElementById("verso-klaviyo")) return;

    var script = document.createElement("script");
    script.id = "verso-klaviyo";
    script.async = true;
    script.src = klaviyoUrl;
    script.onerror = function () {
      console.error("[Cookie consent] Klaviyo failed to load.");
    };
    document.head.appendChild(script);
  }

  function applyConsent() {
    if (!hasConsent()) return;
    loadGoogleAnalytics();
    loadKlaviyo();
  }

  window.addEventListener("verso-cookie-consent-change", applyConsent);
  applyConsent();
})();
