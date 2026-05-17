// About page JS — Webflow About Page Settings → Footer Code
(function(){
  if (window.VshAbout) return;
  window.VshAbout = { ready: false };

  // -------- UTILITIES --------
  const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
  };

  const isMobileDevice = () => {
    return window.innerWidth <= 768 || isTouchDevice();
  };

  // -------- TYPED.JS LOADER (dynamic) --------
  function loadTypedJs(cb){
    if (window.Typed) { cb(); return; }
    if (document.querySelector('script[src*="typed.umd"]')) {
      var n=0; var t=setInterval(function(){
        if (window.Typed || n++>200){ clearInterval(t); if (window.Typed) cb(); }
      }, 50);
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/typed.js@2.1.0/dist/typed.umd.js';
    s.onload = cb;
    s.onerror = function(){ console.warn('[VshAbout] Typed.js failed to load'); };
    document.head.appendChild(s);
  }

  // -------- LOADER --------
  let customEase = 'M0,0,C0,0,0.13,0.34,0.238,0.442,0.305,0.506,0.322,0.514,0.396,0.54,0.478,0.568,0.468,0.56,0.522,0.584,0.572,0.606,0.61,0.719,0.714,0.826,0.798,0.912,1,1,1,1';
  let counter = { value: 0 };
  let imagesLoaded = 0;
  let totalImages = 0;
  let isLoaderVisible = false;
  let lenis = null;

  // -------- JOB ITEM TRAIL EFFECT (REM-BASED, OPTIMIZED FOR PROD) --------
  class JobItemTrail {
    constructor() {
      if (isMobileDevice()) return;

      this.jobItems = document.querySelectorAll('.job-item');
      this.jobContainer = this.findJobContainer();
      this.activeItem = null;
      this.activeLogo = null;
      this.currentLogoType = null;
      this.mousePos = { x: 0, y: 0 };
      this.targetPos = { x: 0, y: 0 };
      this.isLogoVisible = false;
      this.isAnimating = false;
      this.hideTimeout = null;
      this.rafId = null;
      this.lastUpdateTime = 0;
      this.smoothFactor = 0.2;

      this.rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

      this.logoConfig = {
        sizeRem: 6,
        offsetXRem: 0.625,
        offsetYRem: 0.625,
        images: {
          admiral: 'https://cdn.prod.website-files.com/66008e255cca5ad234a2392e/69d7a2befc87c8fa446f279d_1.svg',
          muse: 'https://cdn.prod.website-files.com/66008e255cca5ad234a2392e/69d7a2beb0418f9b2960c409_2.svg',
          uchi: 'https://cdn.prod.website-files.com/66008e255cca5ad234a2392e/69d7a2be7260693c0746f74d_3.svg',
          strelka: 'https://cdn.prod.website-files.com/66008e255cca5ad234a2392e/69d7a2bedaba5549b736b29c_4.svg',
        },
      };

      this.updatePixelValues();
      this.init();
    }

    findJobContainer() {
      return document.querySelector('.job-items-container') || document.querySelector('.jobs-container') || this.jobItems[0]?.closest('div, section');
    }

    updatePixelValues() {
      this.rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      this.logoConfig.sizePx = this.logoConfig.sizeRem * this.rootFontSize;
      this.logoConfig.offsetXPx = this.logoConfig.offsetXRem * this.rootFontSize;
      this.logoConfig.offsetYPx = this.logoConfig.offsetYRem * this.rootFontSize;
    }

    init() {
      if (this.jobItems.length === 0) return;
      this.createLogoContainer();
      this.setupEventListeners();
      this.preloadImages();
      this.startAnimationLoop();
    }

    preloadImages() {
      for (const key in this.logoConfig.images) {
        const img = new Image();
        img.src = this.logoConfig.images[key];
      }
    }

    createLogoContainer() {
      this.logoContainer = document.createElement('div');
      this.logoContainer.className = 'job-logo-trail';
      this.logoContainer.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 1000;
        opacity: 0;
        width: ${this.logoConfig.sizeRem}rem;
        height: ${this.logoConfig.sizeRem}rem;
        transform-origin: center center;
        will-change: transform, opacity;
        display: none;
        transition: opacity 0.15s ease;
      `;
      document.body.appendChild(this.logoContainer);
    }

    setupEventListeners() {
      let lastMoveTime = 0;
      const throttleDelay = 16;

      document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastMoveTime < throttleDelay) return;
        lastMoveTime = now;
        this.handleMouseMove(e);
      });

      document.addEventListener('mouseleave', () => {
        this.hideLogo();
      });

      window.addEventListener('resize', () => {
        this.updatePixelValues();
      });

      if (this.jobContainer) {
        this.jobContainer.addEventListener('mouseleave', (e) => {
          this.handleContainerMouseLeave(e);
        });

        this.jobContainer.addEventListener('mouseenter', () => {
          if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
          }
        });
      }

      this.jobItems.forEach((item) => {
        item.addEventListener('mouseenter', (e) => {
          this.handleItemEnter(e, item);
        });
        item.addEventListener('mouseleave', (e) => {
          this.handleItemLeave(e, item);
        });
      });
    }

    startAnimationLoop() {
      const animate = (timestamp) => {
        if (!this.lastUpdateTime) this.lastUpdateTime = timestamp;
        const deltaTime = Math.min(timestamp - this.lastUpdateTime, 100) / 1000;
        this.lastUpdateTime = timestamp;

        if (this.isLogoVisible && this.logoContainer && !this.isAnimating) {
          const currentX = parseFloat(this.logoContainer.style.left) || this.targetPos.x;
          const currentY = parseFloat(this.logoContainer.style.top) || this.targetPos.y;

          const distance = Math.sqrt(Math.pow(this.targetPos.x - currentX, 2) + Math.pow(this.targetPos.y - currentY, 2));

          let adaptiveSmooth = this.smoothFactor;
          if (distance > 100) {
            adaptiveSmooth = 0.4;
          }

          const newX = currentX + (this.targetPos.x - currentX) * adaptiveSmooth;
          const newY = currentY + (this.targetPos.y - currentY) * adaptiveSmooth;

          if (Math.abs(newX - currentX) > 0.1 || Math.abs(newY - currentY) > 0.1) {
            this.logoContainer.style.left = `${newX}px`;
            this.logoContainer.style.top = `${newY}px`;
          }
        }

        this.rafId = requestAnimationFrame(animate);
      };

      this.rafId = requestAnimationFrame(animate);
    }

    handleMouseMove(e) {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
      this.updateTargetPosition();

      if (this.isLogoVisible && !this.isAnimating) {
        if (this.jobContainer) {
          const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
          const isOverJobItem = elementAtPoint?.closest('.job-item');
          const isOverContainer = this.jobContainer.contains(elementAtPoint);

          if (!isOverContainer && !isOverJobItem) {
            this.scheduleHideLogo();
          } else if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
          }
        }
      }
    }

    updateTargetPosition() {
      this.targetPos.x = this.mousePos.x + this.logoConfig.offsetXPx;
      this.targetPos.y = this.mousePos.y - this.logoConfig.offsetYPx - this.logoConfig.sizePx;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      this.targetPos.x = Math.max(0, Math.min(this.targetPos.x, viewportWidth - this.logoConfig.sizePx));
      this.targetPos.y = Math.max(0, Math.min(this.targetPos.y, viewportHeight - this.logoConfig.sizePx));
    }

    handleContainerMouseLeave(e) {
      const relatedTarget = e.relatedTarget;
      const isMovingToJobItem = relatedTarget?.closest('.job-item');
      const isMovingToContainer = relatedTarget && this.jobContainer?.contains(relatedTarget);

      if (!isMovingToJobItem && !isMovingToContainer) {
        this.scheduleHideLogo();
      }
    }

    scheduleHideLogo() {
      if (this.hideTimeout) clearTimeout(this.hideTimeout);

      this.hideTimeout = setTimeout(() => {
        if (this.isLogoVisible && !this.isAnimating) {
          this.hideLogo();
        }
      }, 150);
    }

    handleItemEnter(e, item) {
      if (this.isAnimating) return;

      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }

      let logoType = 'admiral';
      if (item.classList.contains('muse')) logoType = 'muse';
      else if (item.classList.contains('uchi')) logoType = 'uchi';
      else if (item.classList.contains('strelka')) logoType = 'strelka';

      if (this.activeItem === item && this.currentLogoType === logoType) return;

      this.activeItem = item;
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
      this.updateTargetPosition();

      if (logoType !== this.currentLogoType || !this.isLogoVisible) {
        this.showLogo(logoType);
      } else {
        this.logoContainer.style.left = `${this.targetPos.x}px`;
        this.logoContainer.style.top = `${this.targetPos.y}px`;
      }
    }

    handleItemLeave(e, item) {
      if (this.isAnimating || this.activeItem !== item) return;

      const relatedTarget = e.relatedTarget;
      const isMovingToJobItem = relatedTarget?.closest('.job-item');
      const isMovingToContainer = this.jobContainer && relatedTarget && this.jobContainer.contains(relatedTarget);

      if (isMovingToJobItem || isMovingToContainer) return;

      this.scheduleHideLogo();
    }

    showLogo(logoType) {
      if (this.isAnimating) return;
      this.isAnimating = true;

      this.updateLogoImage(logoType);

      this.logoContainer.style.display = 'block';
      this.logoContainer.style.left = `${this.targetPos.x}px`;
      this.logoContainer.style.top = `${this.targetPos.y}px`;

      gsap.killTweensOf(this.logoContainer);

      gsap.fromTo(
        this.logoContainer,
        { opacity: 0, scale: 0.85 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.18,
          ease: 'power2.out',
          onComplete: () => {
            this.isLogoVisible = true;
            this.isAnimating = false;
            this.currentLogoType = logoType;
          },
        },
      );
    }

    updateLogoImage(logoType) {
      const imageUrl = this.logoConfig.images[logoType];

      if (this.activeLogo && this.activeLogo.parentNode) {
        this.activeLogo.parentNode.removeChild(this.activeLogo);
      }

      this.activeLogo = document.createElement('img');
      this.activeLogo.className = 'job-logo-image';
      this.activeLogo.src = imageUrl;
      this.activeLogo.alt = `${logoType} logo`;
      this.activeLogo.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        opacity: 1;
      `;

      if (this.logoContainer) {
        this.logoContainer.appendChild(this.activeLogo);
      }
    }

    hideLogo() {
      if (this.isAnimating || !this.isLogoVisible) return;
      this.isAnimating = true;

      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }

      gsap.killTweensOf(this.logoContainer);

      gsap.to(this.logoContainer, {
        opacity: 0,
        scale: 0.85,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => {
          this.logoContainer.style.display = 'none';
          this.isLogoVisible = false;
          this.activeItem = null;
          this.isAnimating = false;
          this.currentLogoType = null;

          if (this.activeLogo && this.activeLogo.parentNode) {
            this.activeLogo.parentNode.removeChild(this.activeLogo);
          }
          this.activeLogo = null;
        },
      });
    }

    forceKill() {
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
      gsap.killTweensOf(this.logoContainer);
      if (this.logoContainer) {
        this.logoContainer.style.opacity = '0';
        this.logoContainer.style.display = 'none';
      }
      this.isLogoVisible = false;
      this.isAnimating = false;
      this.activeItem = null;
      this.currentLogoType = null;
    }

    destroy() {
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }

      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }

      window.removeEventListener('resize', this.updatePixelValues);

      gsap.killTweensOf(this.logoContainer);

      if (this.logoContainer && this.logoContainer.parentNode) {
        this.logoContainer.parentNode.removeChild(this.logoContainer);
      }
    }
  }

  // -------- MAIN INITIALIZATION --------
  let jobItemTrail = null;
  let resizeTimeout;

  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const isNowMobile = isMobileDevice();
      const hasJobItems = document.querySelector('.job-item');

      if (jobItemTrail && isNowMobile) {
        jobItemTrail.destroy();
        jobItemTrail = null;
        window.jobItemTrail = null;
      } else if (!jobItemTrail && !isNowMobile && hasJobItems) {
        jobItemTrail = window.jobItemTrail = new JobItemTrail();
      }
    }, 250);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const loader = document.querySelector('.loader');
    const loaderProgress = document.querySelector('.loader_progress');
    const trigger = document.querySelector('.trigger');

    if (!loader || !loaderProgress || !trigger) {
      console.warn('Loader elements not found');
      initMainContent();
      return;
    }

    loaderProgress.style.opacity = '1';
    loaderProgress.style.visibility = 'visible';
    loaderProgress.style.width = '0%';

    function showLoaderAnimation() {
      gsap.set(loader, { y: '100%', opacity: 1 });
      gsap.set(loaderProgress, { width: '0%', opacity: 1 });

      loader.classList.remove('loader--done');

      gsap.to(loader, {
        y: '0%',
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          isLoaderVisible = true;
          gsap.to(loaderProgress, {
            width: '75%',
            duration: 2,
            ease: CustomEase.create('custom', customEase),
          });
        },
      });
    }

    function endLoaderAnimation() {
      window.loaderFinished = true;
      trigger.click();

      gsap.to(loaderProgress, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
          gsap.to(loader, {
            y: '100%',
            duration: 0.8,
            ease: 'power2.inOut',
            onComplete: () => {
              loader.classList.add('loader--done');
              isLoaderVisible = false;
              window.dispatchEvent(new Event('loaderFinished'));
            },
          });
        },
      });
    }

    function handleImageLoad() {
      imagesLoaded++;
      counter.value = Math.min(75 + (imagesLoaded / totalImages) * 25, 100);

      if (imagesLoaded === totalImages) {
        setTimeout(() => {
          gsap.to(loaderProgress, {
            width: '100%',
            duration: 0.5,
            ease: 'power2.out',
            onComplete: endLoaderAnimation,
          });
        }, 100);
      }
    }

    function setupLoader() {
      const images = document.querySelectorAll('.project-images img');
      totalImages = images.length;

      if (totalImages === 0) {
        gsap.to(loaderProgress, {
          width: '75%',
          duration: 2,
          ease: CustomEase.create('custom', customEase),
          onComplete: () => {
            setTimeout(endLoaderAnimation, 1000);
          },
        });
        return;
      }

      counter.value = 75;

      images.forEach((img) => {
        if (img.complete && img.naturalWidth !== 0) {
          handleImageLoad();
        } else {
          img.addEventListener('load', handleImageLoad);
          img.addEventListener('error', handleImageLoad);
        }
      });

      gsap.to(loaderProgress, {
        width: '75%',
        duration: 2,
        ease: CustomEase.create('custom', customEase),
      });

      setTimeout(() => {
        if (!window.loaderFinished) {
          endLoaderAnimation();
        }
      }, 10000);
    }

    const menuLinks = document.querySelectorAll('.menu-link');
    menuLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (isLoaderVisible) return;

        showLoaderAnimation();
        setTimeout(() => {
          window.location.href = link.getAttribute('href');
        }, 1000);
      });
    });

    function initLenis() {
      if (lenis) {
        try {
          lenis.destroy();
        } catch (e) {
          console.warn('Error destroying Lenis:', e);
        }
      }

      try {
        lenis = window.lenis = new Lenis({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          direction: 'vertical',
          gestureDirection: 'vertical',
          smooth: true,
          smoothTouch: false,
          touchMultiplier: 2,
        });

        function raf(time) {
          try {
            lenis.raf(time);
            requestAnimationFrame(raf);
          } catch (error) {
            console.error('Lenis RAF error:', error);
          }
        }

        requestAnimationFrame(raf);

        window.addEventListener('resize', () => {
          try {
            lenis.resize();
          } catch (error) {
            console.error('Lenis resize error:', error);
          }
        });

        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            lenis.stop();
          } else {
            lenis.start();
          }
        });
      } catch (error) {
        console.error('Lenis initialization error:', error);
      }
    }

    function initTyped() {
      loadTypedJs(function(){
        try {
          var typed = new Typed('.typed-words', {
            strings: ['<p>Viacheslav Novoseltsev. Senior Designer and Creative Developer. Based in Tbilisi. Designs brand websites and builds them end-to-end — visual system, motion, and production code under one craft, without the usual handoff between design and engineering.</p> <p>8 years across corporate, cultural, and edtech sectors. Projects include marketing sites, digital magazines, CMS interfaces, and educational platforms. Currently working on The Datum AI.</p>'],
            typeSpeed: 3,
            backSpeed: 10,
            backDelay: 10,
            startDelay: 10,
            loop: false,
            showCursor: false,
            cursorChar: '|',
            attr: null,
          });
        } catch (error) {
          console.error('Typed.js initialization error:', error);
        }
      });
    }

    function initSoundEffects() {
      try {
        const hoverSound = new Audio('https://lphfulotzguupkygfvkp.supabase.co/storage/v1/object/public/webflow-showcase/hover_cropped.mp3');
        const clickSound = new Audio('https://lphfulotzguupkygfvkp.supabase.co/storage/v1/object/public/webflow-showcase/click%20sound.mp3');

        const jobItems = document.querySelectorAll('.job-item');
        jobItems.forEach((item) => {
          item.addEventListener('mouseenter', () => {
            hoverSound.currentTime = 0;
            hoverSound.play().catch((e) => console.log('Audio play error:', e));
          });

          item.addEventListener('click', () => {
            clickSound.currentTime = 0;
            clickSound.play().catch((e) => console.log('Audio play error:', e));
          });
        });
      } catch (error) {
        console.error('Sound effects initialization error:', error);
      }
    }

    // -------- JOB ITEM HOVER (GSAP REPLACEMENT FOR WEBFLOW IX) --------
    function initJobItemHover() {
      if (isMobileDevice()) return;

      const jobItems = document.querySelectorAll('.job-item');
      if (!jobItems.length) return;

      const HOVER_OFFSET_REM = -0.63;

      const getOffsetPx = () => {
        const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        return HOVER_OFFSET_REM * rootFontSize;
      };

      jobItems.forEach((item) => {
        gsap.set(item, { willChange: 'transform' });

        item.addEventListener('mouseenter', () => {
          gsap.to(item, {
            y: getOffsetPx(),
            duration: 0.5,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        });

        item.addEventListener('mouseleave', () => {
          gsap.to(item, {
            y: 0,
            duration: 0.32,
            ease: 'power2.in',
            overwrite: 'auto',
          });
        });
      });
    }

    function initMainContent() {
      initLenis();
      initTyped();
      initSoundEffects();
      initJobItemHover();

      setTimeout(() => {
        if (!isMobileDevice() && document.querySelector('.job-item')) {
          jobItemTrail = window.jobItemTrail = new JobItemTrail();
        }
      }, 50);
    }

    setTimeout(setupLoader, 100);
    initLenis();

    window.addEventListener('loaderFinished', initMainContent);

    window.addEventListener('resize', handleResize);
  });

  window.VshAbout.ready = true;
})();
