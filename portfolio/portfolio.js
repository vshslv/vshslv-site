// Portfolio page JS — Webflow Portfolio Page Settings → Footer Code
(function(){
  if (window.VshPortfolio) return;
  window.VshPortfolio = { ready: false };

  // -------- CONFIGURATION --------
  const config = {
    customEase: "M0,0,C0,0,0.13,0.34,0.238,0.442,0.305,0.506,0.322,0.514,0.396,0.54,0.478,0.568,0.468,0.56,0.522,0.584,0.572,0.606,0.61,0.719,0.714,0.826,0.798,0.912,1,1,1,1",
    loaderDuration: 10,
    maxLoaderTime: 15000,
    desktopBreakpoint: 991,
    // IntersectionObserver pre-fetch margin: how far ahead (in viewport heights)
    // we promote lazy images to eager. Lenis smooth scroll needs head-room.
    prefetchRootMargin: "200% 0px"
  };

  // -------- STATE --------
  const state = {
    counter: { value: 0 },
    imagesLoaded: 0,
    totalImages: 0,
    isLoaderVisible: false,
    lenis: null,
    isLoaderReady: false,
    isDesktop: window.innerWidth > config.desktopBreakpoint
  };

  // -------- UTILITIES --------
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  };

  const lenisResizeDebounced = debounce(() => {
    try { state.lenis?.resize(); } catch (e) {}
  }, 120);

  // -------- LOADER FUNCTIONS --------
  function showLoaderAnimation(loader, loaderProgress) {
    if (!loader || !loaderProgress) return;

    loader.classList.remove("loader--done");
    gsap.set(loader, { y: '100%', opacity: 1 });
    gsap.set(loaderProgress, { width: '0%', opacity: 1 });

    gsap.to(loader, {
      y: '0%',
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => {
        state.isLoaderVisible = true;
        gsap.to(loaderProgress, {
          width: "75%",
          duration: 2,
          ease: CustomEase.create("custom", config.customEase)
        });
      }
    });
  }

  function endLoaderAnimation(loader, loaderProgress, trigger) {
    if (window.loaderFinished) return;
    window.loaderFinished = true;
    trigger?.click();
    state.isLoaderReady = true;

    const hideLoader = () => {
      gsap.to(loader, {
        y: '100%',
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
          loader.classList.add("loader--done");
          state.isLoaderVisible = false;
        }
      });
    };

    if (loaderProgress) {
      gsap.to(loaderProgress, {
        opacity: 0,
        duration: 0.2,
        onComplete: hideLoader
      });
    } else {
      hideLoader();
    }

    window.dispatchEvent(new Event('loaderFinished'));
  }

  function handleImageLoad(loaderProgress) {
    state.imagesLoaded++;
    const denom = state.totalImages || 1;
    state.counter.value = Math.min(70 + (state.imagesLoaded / denom) * 30, 100);

    if (state.imagesLoaded >= state.totalImages) {
      // First project finished loading — animate the bar the rest of the way
      // (overwriting the in-flight 0→70% drift) and close the loader.
      setTimeout(() => {
        gsap.to(loaderProgress, {
          width: "100%",
          duration: 0.5,
          ease: "power2.out",
          overwrite: "auto",
          onComplete: () => endLoaderAnimation(
            document.querySelector('.loader'),
            loaderProgress,
            document.querySelector('.trigger')
          )
        });
      }, 100);
    }
  }

  // -------- IMAGE LAZY-LOAD + SKELETON --------
  // Derive a sensible alt label from a Webflow asset URL, e.g.
  //   ".../688f74f03032819fa890de64_muse-1.webp" → "Muse 1"
  // Returns empty string if nothing usable can be parsed.
  function altFromSrc(src) {
    try {
      const url = new URL(src, location.href);
      const file = url.pathname.split('/').pop() || '';
      const noExt = file.replace(/\.[a-z0-9]+$/i, '');
      // Strip leading 24-char hex hash + underscore (Webflow asset prefix).
      const slug = noExt.replace(/^[a-f0-9]{20,32}_/i, '');
      if (!slug) return '';
      const words = slug.replace(/[-_]+/g, ' ').trim();
      if (!words) return '';
      return words.charAt(0).toUpperCase() + words.slice(1);
    } catch (e) {
      return '';
    }
  }

  function polishImage(img) {
    if (img.dataset.vshPolished === '1') return;
    img.dataset.vshPolished = '1';
    if (!img.classList.contains('project-image')) {
      img.classList.add('project-image');
    }
    const currentAlt = (img.getAttribute('alt') || '').trim();
    if (!currentAlt) {
      const guess = altFromSrc(img.currentSrc || img.src || '');
      if (guess) img.setAttribute('alt', guess);
    }
  }

  function markImageLoaded(img) {
    if (img.dataset.loaded === 'true') return;
    img.dataset.loaded = 'true';
    lenisResizeDebounced();
  }

  function watchImage(img, onResolve) {
    if (img.complete && img.naturalWidth !== 0) {
      markImageLoaded(img);
      onResolve?.();
      return;
    }
    const handler = () => {
      markImageLoaded(img);
      onResolve?.();
    };
    img.addEventListener('load',  handler, { once: true });
    img.addEventListener('error', handler, { once: true });
  }

  function setupImages(loaderProgress) {
    const allImages = Array.from(document.querySelectorAll('.project-images img'));
    if (allImages.length === 0) {
      endLoaderAnimation(
        document.querySelector('.loader'),
        loaderProgress,
        document.querySelector('.trigger')
      );
      return;
    }

    // The first .project-images block in DOM order is the first project
    // (Muse Group). Force-load all its images eagerly with high priority,
    // but gate the loader only on the FIRST image — on slow networks this
    // gives the loader a realistic chance to close while the rest of the
    // first project fills in via skeletons over the next second or two.
    const firstProject = document.querySelector('.project-images');
    const firstProjectImages = firstProject
      ? Array.from(firstProject.querySelectorAll('img'))
      : [];
    const loaderGateImage = firstProjectImages[0] || null;

    // Mark every image with a skeleton state up-front so CSS can paint the
    // placeholder immediately (before any image fires `load`). Also tag a
    // consistent class and back-fill alt text from filename when missing.
    allImages.forEach(img => {
      polishImage(img);
      img.dataset.loaded = (img.complete && img.naturalWidth !== 0) ? 'true' : 'false';
    });

    // Force the first project's images to load eagerly with high priority
    // so they don't wait on Webflow's native lazy-loading deferral.
    firstProjectImages.forEach(img => {
      img.loading = 'eager';
      if ('fetchPriority' in img) img.fetchPriority = 'high';
    });

    if (!loaderGateImage) {
      // No first image to wait on (unlikely) — close loader now.
      endLoaderAnimation(
        document.querySelector('.loader'),
        loaderProgress,
        document.querySelector('.trigger')
      );
    } else {
      state.totalImages = 1;
      state.counter.value = 0;
      watchImage(loaderGateImage, () => handleImageLoad(loaderProgress));

      // Soft 2s drift from 0 to 70% — visual "we're working" indicator.
      // The remaining 70 → 100% is driven by real load completion in
      // handleImageLoad, which also overwrites this tween if needed.
      gsap.to(loaderProgress, {
        width: "70%",
        duration: 2,
        ease: CustomEase.create("custom", config.customEase)
      });
    }

    // Remaining images (including other first-project images): watch for
    // `load` to drop their skeleton, but don't block the loader on them.
    allImages.forEach(img => {
      if (img === loaderGateImage) return;
      watchImage(img);
    });

    // Promote images to eager a bit before they enter the viewport so the
    // skeleton has time to swap to the real image during smooth scroll.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          if (img.loading !== 'eager') img.loading = 'eager';
          observer.unobserve(img);
        });
      }, { rootMargin: config.prefetchRootMargin });

      allImages.forEach(img => {
        if (img.dataset.loaded === 'true') return;
        if (firstProjectImages.includes(img)) return;
        io.observe(img);
      });
    }

    // Safety net — if the first project stalls (slow CDN, broken asset),
    // still close the loader after a hard cap so users aren't stuck.
    setTimeout(() => {
      if (!window.loaderFinished) {
        endLoaderAnimation(
          document.querySelector('.loader'),
          loaderProgress,
          document.querySelector('.trigger')
        );
      }
    }, config.maxLoaderTime);
  }

  // -------- LENIS FUNCTIONS --------
  function initLenis() {
    if (state.lenis) {
      try {
        state.lenis.destroy();
      } catch (e) {
        console.warn('Error destroying Lenis:', e);
      }
    }

    try {
      state.lenis = window.lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: false,
        touchMultiplier: 2,
        wrapper: window,
        content: document.documentElement,
        wheelEventsTarget: window,
        normalizeWheel: true,
      });

      function raf(time) {
        try {
          state.lenis.raf(time);
          requestAnimationFrame(raf);
        } catch (error) {
          console.error('Lenis RAF error:', error);
        }
      }

      requestAnimationFrame(raf);

      window.addEventListener('resize', debounce(() => {
        try {
          state.lenis.resize();
        } catch (error) {
          console.error('Lenis resize error:', error);
        }
      }, 100));

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          state.lenis.stop();
        } else {
          state.lenis.start();
        }
      });
    } catch (error) {
      console.error('Lenis initialization error:', error);
    }
  }

  // -------- INITIALIZATION --------
  document.addEventListener('DOMContentLoaded', () => {
    const loader = document.querySelector('.loader');
    const loaderProgress = document.querySelector('.loader_progress');
    const trigger = document.querySelector('.trigger');

    if (!loader || !loaderProgress || !trigger) {
      console.warn('Loader elements not found');
      return;
    }

    loaderProgress.style.opacity = '1';
    loaderProgress.style.visibility = 'visible';
    loaderProgress.style.width = '0%';

    // Menu link click handlers
    document.querySelectorAll('.menu-link').forEach(link => {
      link.addEventListener('click', (e) => {
        if (state.isLoaderVisible) return;
        e.preventDefault();

        showLoaderAnimation(loader, loaderProgress);

        setTimeout(() => {
          window.location.href = link.getAttribute('href');
        }, 1000);
      });
    });

    // Initialize components
    setTimeout(() => setupImages(loaderProgress), 100);
    initLenis();

    // Handle window resize for desktop detection
    window.addEventListener('resize', debounce(() => {
      state.isDesktop = window.innerWidth > config.desktopBreakpoint;
    }, 100));

    // Lenis refresh after loader
    window.addEventListener('loaderFinished', () => {
      setTimeout(() => {
        state.lenis?.resize();
      }, 500);
    });
  });

  window.VshPortfolio.ready = true;
})();

/* ============================================
   PORTFOLIO GRID SWITCHER
   Three modes — default (1-col full-width, current),
   2-col, 4-col — toggled by clicking empty space on
   the left or right of the top section. Desktop only.

   LEFT zone  →  toggles 2-col   (cursor: "Grid: 2 column" ↔ "Grid: Default")
   RIGHT zone →  toggles 4-col   (cursor: "Grid: 4 column" ↔ "Grid: Default")

   Mode persists in localStorage under vsh_portfolio_grid_v1.
   ============================================ */
(function () {
  if (window.VshPortfolioGrid) return;
  window.VshPortfolioGrid = { ready: false };

  var STORAGE_KEY = 'vsh_portfolio_grid_v1';
  var DESKTOP_MIN_PX = 992;          // matches @media (min-width: 62em) in CSS
  var ZONE_FALLBACK_VH = 30;         // initial zone height before measurement

  function isDesktop() { return window.innerWidth >= DESKTOP_MIN_PX; }
  function prefersNoHover() { return matchMedia('(hover: none)').matches; }

  function readMode() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (v === '2' || v === '4') return v;
    } catch (e) {}
    return 'default';
  }
  function writeMode(m) {
    try { localStorage.setItem(STORAGE_KEY, m); } catch (e) {}
  }

  function applyMode(m) {
    var b = document.body;
    if (m === 'default') b.removeAttribute('data-grid');
    else b.setAttribute('data-grid', m);
    writeMode(m);
    // Lenis tracks document height — kick it after layout settles.
    if (window.lenis && typeof window.lenis.resize === 'function') {
      requestAnimationFrame(function () {
        try { window.lenis.resize(); } catch (e) {}
      });
    }
  }

  function init() {
    if (!isDesktop() || prefersNoHover()) return;

    var pageWrapper = document.querySelector('.page-wrapper');
    var firstProject = document.querySelector('.project-item');
    if (!pageWrapper || !firstProject) return;

    // Need a positioned ancestor for the absolute zones.
    var cs = getComputedStyle(pageWrapper);
    if (cs.position === 'static') pageWrapper.style.position = 'relative';

    // -------- zones --------
    var leftZone  = document.createElement('div');
    var rightZone = document.createElement('div');
    leftZone.className  = 'vsh-grid-zone is-left';
    rightZone.className = 'vsh-grid-zone is-right';
    leftZone.setAttribute('role', 'button');
    rightZone.setAttribute('role', 'button');
    leftZone.setAttribute('aria-label',  'Toggle 2-column grid');
    rightZone.setAttribute('aria-label', 'Toggle 4-column grid');
    pageWrapper.appendChild(leftZone);
    pageWrapper.appendChild(rightZone);

    function measureZoneHeight() {
      // Distance from top of page-wrapper to top of first project.
      var pageTop = pageWrapper.getBoundingClientRect().top + window.scrollY;
      var projTop = firstProject.getBoundingClientRect().top + window.scrollY;
      var h = Math.max(0, projTop - pageTop);
      pageWrapper.style.setProperty('--vsh-grid-zone-h', h + 'px');
    }
    measureZoneHeight();
    window.addEventListener('resize', measureZoneHeight);
    if ('ResizeObserver' in window) {
      try {
        new ResizeObserver(measureZoneHeight).observe(firstProject);
      } catch (e) {}
    }
    // Loader-driven late layout: recompute after loader closes + a tick later.
    window.addEventListener('loaderFinished', function () {
      requestAnimationFrame(measureZoneHeight);
      setTimeout(measureZoneHeight, 600);
    });

    // -------- magnetic cursor pill --------
    var tag    = document.createElement('div');
    var mask   = document.createElement('span');
    var layerA = document.createElement('span');
    var layerB = document.createElement('span');
    tag.className    = 'vsh-grid-cursor';
    mask.className   = 'vsh-grid-cursor_mask';
    layerA.className = 'vsh-grid-cursor_layer';
    layerB.className = 'vsh-grid-cursor_layer is-below';
    layerA.textContent = '';
    layerB.setAttribute('aria-hidden', 'true');
    mask.appendChild(layerA);
    mask.appendChild(layerB);
    tag.appendChild(mask);
    document.body.appendChild(tag);

    var activeLayer = layerA, hiddenLayer = layerB;
    var currentLabel = '', maskBusy = false, pendingLabel = null;

    function commitSwitch(next) {
      maskBusy = true;
      currentLabel = next;
      hiddenLayer.textContent = next;
      var outgoing = activeLayer, incoming = hiddenLayer;
      outgoing.classList.add('is-out');
      incoming.classList.remove('is-below');
      activeLayer = incoming;
      hiddenLayer = outgoing;
      setTimeout(function () {
        outgoing.classList.add('no-tx');
        outgoing.classList.remove('is-out');
        outgoing.classList.add('is-below');
        void outgoing.offsetWidth;
        outgoing.classList.remove('no-tx');
        maskBusy = false;
        if (pendingLabel !== null && pendingLabel !== currentLabel) {
          var p = pendingLabel; pendingLabel = null;
          commitSwitch(p);
        }
      }, 470); // > 450ms CSS transition
    }
    function switchLabel(next) {
      if (!next) return;
      if (next === currentLabel) { pendingLabel = null; return; }
      if (maskBusy) { pendingLabel = next; return; }
      commitSwitch(next);
    }
    function labelForZone(zone) {
      var mode = readMode();
      if (zone === 'left')  return mode === '2' ? 'Grid: Default' : 'Grid: 2 column';
      if (zone === 'right') return mode === '4' ? 'Grid: Default' : 'Grid: 4 column';
      return '';
    }

    // -------- adaptive lerp follower (matches stories pattern) --------
    var LERP_NORMAL = 0.2;
    var LERP_FAST = 0.4;
    var FAST_DISTANCE_PX = 100;
    function getOffsetPx() {
      var rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return rem * 0.25;
    }
    var tX = -9999, tY = -9999, cX = -9999, cY = -9999;
    var raf = null, ticking = false;
    function followLoop() {
      var dx = tX - cX, dy = tY - cY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var lerp = dist > FAST_DISTANCE_PX ? LERP_FAST : LERP_NORMAL;
      cX += dx * lerp;
      cY += dy * lerp;
      var off = getOffsetPx();
      tag.style.transform = 'translate3d(' + (cX + off) + 'px,' + (cY + off) + 'px,0)';
      if (Math.abs(tX - cX) > 0.1 || Math.abs(tY - cY) > 0.1) {
        raf = requestAnimationFrame(followLoop);
      } else {
        ticking = false; raf = null;
      }
    }
    function kickFollow() { if (!ticking) { ticking = true; raf = requestAnimationFrame(followLoop); } }

    var hoveredZone = null;
    function setHoveredZone(zone) {
      hoveredZone = zone;
      if (!zone) {
        tag.classList.remove('is-visible');
        return;
      }
      switchLabel(labelForZone(zone));
      tag.classList.add('is-visible');
    }

    leftZone.addEventListener('mouseenter',  function () { setHoveredZone('left');  });
    leftZone.addEventListener('mouseleave',  function () { setHoveredZone(null);    });
    rightZone.addEventListener('mouseenter', function () { setHoveredZone('right'); });
    rightZone.addEventListener('mouseleave', function () { setHoveredZone(null);    });

    var lastMoveAt = 0, MOVE_THROTTLE_MS = 16;
    document.addEventListener('mousemove', function (e) {
      if (!hoveredZone) return;
      var now = Date.now();
      if (now - lastMoveAt < MOVE_THROTTLE_MS) return;
      lastMoveAt = now;
      tX = e.clientX; tY = e.clientY;
      if (cX < -1000) { cX = tX; cY = tY; }
      kickFollow();
    });

    // -------- click handlers --------
    leftZone.addEventListener('click', function () {
      var m = readMode();
      applyMode(m === '2' ? 'default' : '2');
      // Refresh label immediately to reflect the new active state.
      switchLabel(labelForZone('left'));
    });
    rightZone.addEventListener('click', function () {
      var m = readMode();
      applyMode(m === '4' ? 'default' : '4');
      switchLabel(labelForZone('right'));
    });

    // -------- viewport changes --------
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!isDesktop()) {
          // Collapse back to default on mobile so layout never shows a stale grid.
          if (document.body.getAttribute('data-grid')) {
            document.body.removeAttribute('data-grid');
          }
          tag.classList.remove('is-visible');
          hoveredZone = null;
        } else {
          // Re-apply stored mode when returning to desktop.
          var m = readMode();
          if (m !== 'default') document.body.setAttribute('data-grid', m);
        }
      }, 120);
    });

    // -------- initial state --------
    applyMode(readMode());

    window.VshPortfolioGrid.ready = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
