// Portfolio page JS — Webflow Portfolio Page Settings → Footer Code
(function(){
  if (window.VshPortfolio) return;
  window.VshPortfolio = { ready: false };

  // -------- CONFIGURATION --------
  const config = {
    customEase: "M0,0,C0,0,0.13,0.34,0.238,0.442,0.305,0.506,0.322,0.514,0.396,0.54,0.478,0.568,0.468,0.56,0.522,0.584,0.572,0.606,0.61,0.719,0.714,0.826,0.798,0.912,1,1,1,1",
    loaderDuration: 10,
    maxLoaderTime: 10000,
    desktopBreakpoint: 991,
    // Above-the-fold buffer: images whose top is within this multiple of the
    // viewport height are forced to load eagerly and gate the loader.
    atfViewportBuffer: 1.25,
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
    state.counter.value = Math.min(75 + (state.imagesLoaded / denom) * 25, 100);

    if (state.imagesLoaded >= state.totalImages) {
      setTimeout(() => {
        gsap.to(loaderProgress, {
          width: "100%",
          duration: 0.5,
          ease: "power2.out",
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
    const images = Array.from(document.querySelectorAll('.project-images img'));
    if (images.length === 0) {
      endLoaderAnimation(
        document.querySelector('.loader'),
        loaderProgress,
        document.querySelector('.trigger')
      );
      return;
    }

    // Mark every image with a skeleton state up-front so CSS can paint the
    // placeholder immediately (before any image fires `load`).
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const atfCutoff = viewportH * config.atfViewportBuffer;
    const atfImages = [];

    images.forEach(img => {
      img.dataset.loaded = (img.complete && img.naturalWidth !== 0) ? 'true' : 'false';

      // Decide which images are "above the fold" and need eager loading.
      // The rest stay on Webflow's default loading="lazy".
      const top = img.getBoundingClientRect().top;
      if (top < atfCutoff) {
        img.loading = 'eager';
        if ('fetchPriority' in img) img.fetchPriority = 'high';
        atfImages.push(img);
      }
    });

    // Loader counter is gated on ATF images only — the rest stream in
    // lazily as the user scrolls and never block the loader from closing.
    state.totalImages = atfImages.length;

    if (state.totalImages === 0) {
      // Nothing visible above the fold (unlikely) — close loader now.
      endLoaderAnimation(
        document.querySelector('.loader'),
        loaderProgress,
        document.querySelector('.trigger')
      );
    } else {
      state.counter.value = 75;
      atfImages.forEach(img => watchImage(img, () => handleImageLoad(loaderProgress)));

      gsap.to(loaderProgress, {
        width: "75%",
        duration: 2,
        ease: CustomEase.create("custom", config.customEase)
      });
    }

    // Below-the-fold images: still watch their `load` to remove skeleton,
    // but don't gate the loader on them.
    images.forEach(img => {
      if (atfImages.includes(img)) return;
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

      images.forEach(img => {
        if (img.dataset.loaded === 'true') return;
        if (atfImages.includes(img)) return;
        io.observe(img);
      });
    }

    // Safety net — if anything stalls, still close the loader.
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
