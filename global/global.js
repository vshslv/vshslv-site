// Global JS — applied site-wide via Webflow Site Settings → Footer Code
(function(){
  if (window.VshGlobal) return;
  window.VshGlobal = { ready: false };

  // Add your site-wide logic here
  // Keep everything under window.VshGlobal namespace to avoid collisions

  window.VshGlobal.ready = true;
})();
