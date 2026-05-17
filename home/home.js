// Home page JS — Webflow Home Page Settings → Footer Code
(function(){
  if (window.VshHome) return;
  window.VshHome = { ready: false };

  // -------- UTILITIES --------
  const isSafari = () => {
    const ua = navigator.userAgent.toLowerCase();
    return (
      ua.includes('safari') &&
      !ua.includes('chrome') &&
      !ua.includes('crios') &&
      !ua.includes('edg')
    );
  };

  const isMobile = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileUserAgent = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isMobileSize = window.innerWidth <= 768;
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    return isMobileUserAgent || (isMobileSize && isTouchDevice);
  };

  const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  };

  // -------- TOUCH DEVICE DETECTION --------
  const isTouchDevice = () => {
    return ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0) ||
           (navigator.msMaxTouchPoints > 0);
  };

  // -------- LOADER --------
  let customEase = "M0,0,C0,0,0.13,0.34,0.238,0.442,0.305,0.506,0.322,0.514,0.396,0.54,0.478,0.568,0.468,0.56,0.522,0.584,0.572,0.606,0.61,0.719,0.714,0.826,0.798,0.912,1,1,1,1";
  let counter = { value: 0 };
  let loaderDuration = 10;
  let imagesLoaded = 0;
  let totalImages = 0;
  let isLoaderVisible = false;
  let imageTrailInstance = null;

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

    function showLoaderAnimation() {
      const loader = document.querySelector('.loader');
      const loaderProgress = document.querySelector('.loader_progress');
      if (!loader || !loaderProgress) return;

      loader.classList.remove("loader--done");
      gsap.set(loader, { y: '100%', opacity: 1 });
      gsap.set(loaderProgress, { width: '0%', opacity: 1 });

      gsap.to(loader, {
        y: '0%',
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
          isLoaderVisible = true;
          gsap.to(loaderProgress, {
            width: "75%",
            duration: 2,
            ease: CustomEase.create("custom", customEase)
          });
        }
      });
    }

    function endLoaderAnimation() {
      window.loaderFinished = true;
      trigger.click();

      const loaderProgress = document.querySelector('.loader_progress');
      if (loaderProgress) {
        gsap.to(loaderProgress, {
          opacity: 0,
          duration: 0.2,
          onComplete: () => {
            gsap.to(loader, {
              y: '100%',
              duration: 0.8,
              ease: "power2.inOut",
              onComplete: () => {
                loader.classList.add("loader--done");
                isLoaderVisible = false;
              }
            });
          }
        });
      } else {
        gsap.to(loader, {
          y: '100%',
          duration: 0.8,
          ease: "power2.inOut",
          onComplete: () => {
            loader.classList.add("loader--done");
            isLoaderVisible = false;
          }
        });
      }

      window.dispatchEvent(new Event('loaderFinished'));
    }

    function handleImageLoad() {
      imagesLoaded++;
      counter.value = Math.min(75 + (imagesLoaded / totalImages) * 25, 100);

      if (imagesLoaded === totalImages) {
        setTimeout(() => {
          gsap.to(loaderProgress, {
            width: "100%",
            duration: 0.5,
            ease: "power2.out",
            onComplete: endLoaderAnimation
          });
        }, 100);
      }
    }

    function setupLoader() {
      const desktopImages = document.querySelectorAll('.content__img-inner');
      const mobileImages = document.querySelectorAll('.thumbnail-inner img');

      const existingVideo = document.querySelector('video:not(.stories-slide_media):not(.stories-preview_img)');
      const videoElements = existingVideo ? [existingVideo] : [];

      const images = isMobile() ? mobileImages : desktopImages;
      const allMedia = [...images, ...videoElements];

      totalImages = allMedia.length;

      if (totalImages === 0) {
        const fallbackImages = isMobile() ? desktopImages : mobileImages;
        totalImages = fallbackImages.length;

        if (totalImages === 0) {
          endLoaderAnimation();
          return;
        }
      }

      counter.value = 75;

      images.forEach(img => {
        if (img.complete && img.naturalWidth !== 0) {
          handleImageLoad();
        } else {
          img.addEventListener('load', handleImageLoad);
          img.addEventListener('error', handleImageLoad);
        }
      });

      gsap.to(loaderProgress, {
        width: "75%",
        duration: 2,
        ease: CustomEase.create("custom", customEase)
      });

      setTimeout(() => {
        if (!window.loaderFinished) {
          endLoaderAnimation();
        }
      }, 10000);
    }

    const menuLinks = document.querySelectorAll('.menu-link');
    menuLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (isLoaderVisible) return;
        showLoaderAnimation();
        setTimeout(() => {
          window.location.href = link.getAttribute('href');
        }, 1000);
      });
    });

    setTimeout(setupLoader, 100);
  });

  window.addEventListener('loaderFinished', () => {
    if (typeof ImageTrail !== 'undefined') {
      imageTrailInstance = new ImageTrail();
      if (isMobile()) {
        runThumbnailAnimation();
      }
    }
  });

  // -------- IMAGE TRAIL COMPONENT --------

  class ImageEl {
    constructor(el) {
      this.DOM = {
        el: el,
        inner: el.querySelector('.content__img-inner')
      };
      this.rect = this.DOM.el.getBoundingClientRect();
    }
  }

  class ImageTrailInstance {
    constructor(DOM_el) {
      this.DOM = { el: DOM_el };
      this.images = [...this.DOM.el.querySelectorAll('.content__img')].map(img => new ImageEl(img));
      this.imagesTotal = this.images.length;
      this.imgPosition = 0;
      this.zIndexVal = 1;
    }

    showNextImage(position) {
      ++this.zIndexVal;
      this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
      const img = this.images[this.imgPosition];

      if (!isSafari()) {
        const hoverSound = new Audio("https://lphfulotzguupkygfvkp.supabase.co/storage/v1/object/public/webflow-showcase/hover_cropped.mp3");
        hoverSound.play().catch(e => console.log("Audio play error:", e));
      }

      gsap.killTweensOf(img.DOM.el);
      gsap.set(img.DOM.el, {
        opacity: 1,
        scale: 0.8,
        zIndex: this.zIndexVal,
        x: Math.round(position.x - img.rect.width / 2),
        y: Math.round(position.y - img.rect.height / 2 + 30)
      });

      gsap.to(img.DOM.el, {
        scale: 1,
        y: `-=30`,
        duration: 0.8,
        ease: "power2.out"
      });
    }
  }

  class ImageTrail {
    constructor() {
      this.body = document.body;
      this.mousePos = { x: 0, y: 0 };
      this.lastMousePos = { x: 0, y: 0 };
      this.isIdle = false;
      this.idleTimer = null;
      this.heroContent = document.querySelector('.hero-content');
      this.blurBackground = document.querySelector('.blur-background');
      this.imageTrail = null;
      this.heroHidden = false;
      this.hideQuickly = false;
      this.isHidingImages = false;
      this.animationPaused = false;
      this.isToggling = false;
      this.boundMouseMove = this.handleMouseMove.bind(this);
      this.boundTouchMove = this.handleTouchMove.bind(this);
      this.boundTouchStart = this.handleTouchStart.bind(this);
      this.boundTouchEnd = this.handleTouchEnd.bind(this);

      // [TOGGLE-ANIM] cached ref to .toggle_inner. We don't pre-build a timeline
      // because IN and OUT have different shapes (sequential 0.4s vs parallel 0.2s),
      // so each tween is built on demand inside handleToggle().
      this.toggleInner = null;

      if (isMobile() && window.innerWidth <= 768) {
        return;
      }

      this.init();
    }

    init() {
      const contentElement = document.querySelector('.image-wrap');
      if (!contentElement) return;

      const images = document.querySelectorAll('.content__img-inner');
      let loadedImages = 0;

      const onImagesLoaded = () => {
        loadedImages++;
        if (loadedImages === images.length) {
          this.imageTrail = new ImageTrailInstance(contentElement);
          this.bindEvents();
        }
      };

      if (images.length === 0) {
        this.imageTrail = new ImageTrailInstance(contentElement);
        this.bindEvents();
        return;
      }

      images.forEach((img) => {
        if (img.complete) {
          onImagesLoaded();
        } else {
          img.addEventListener('load', onImagesLoaded);
          img.addEventListener('error', onImagesLoaded);
        }
      });
    }

    bindEvents() {
      if (isTouchDevice()) {
        document.body.addEventListener('touchstart', this.boundTouchStart, { passive: false });
        document.body.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        document.body.addEventListener('touchend', this.boundTouchEnd, { passive: true });
      } else {
        document.body.addEventListener('mousemove', this.boundMouseMove);
      }

      const toggleWrap = document.querySelector('.toggle_wrap');
      if (toggleWrap) {
        // [TOGGLE-ANIM] Initial state matches what Webflow IX2 used to apply
        // via "Set as initial state" on the toggle-anim interaction.
        this.toggleInner = toggleWrap.querySelector('.toggle_inner');
        if (this.toggleInner) {
          gsap.set(this.toggleInner, { x: "0.9rem", opacity: 1 });
        }

        toggleWrap.addEventListener('click', this.handleToggle.bind(this));
      }
    }

    cleanup() {
      document.body.removeEventListener('mousemove', this.boundMouseMove);
      document.body.removeEventListener('touchstart', this.boundTouchStart);
      document.body.removeEventListener('touchmove', this.boundTouchMove);
      document.body.removeEventListener('touchend', this.boundTouchEnd);

      // [TOGGLE-ANIM] stop any in-flight toggle tween
      if (this.toggleInner) gsap.killTweensOf(this.toggleInner);

      if (this.idleTimer) clearTimeout(this.idleTimer);
      gsap.killTweensOf('.content__img');
      gsap.killTweensOf(this.heroContent);
      gsap.killTweensOf(this.blurBackground);
    }

    handleTouchStart(e) {
      if (!this.imageTrail || this.isHidingImages || this.animationPaused || this.isToggling) return;
      const touch = e.touches[0];
      const [x, y] = [touch.clientX + window.scrollX, touch.clientY + window.scrollY];
      this.mousePos = { x, y };
      if (!this.heroHidden) {
        this.hideHeroContent();
      }
    }

    handleTouchMove(e) {
      if (!this.imageTrail || this.isHidingImages || this.animationPaused || this.isToggling) return;
      e.preventDefault();
      const touch = e.touches[0];
      const [x, y] = [touch.clientX + window.scrollX, touch.clientY + window.scrollY];
      this.mousePos = { x, y };
      this.processMovement(x, y);
    }

    handleTouchEnd(e) {
      if (this.isToggling) return;
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        this.hideQuickly = false;
        this.hideImagesSequentially();
        this.isIdle = true;
      }, 800);
    }

    handleMouseMove(e) {
      if (!this.imageTrail || this.isHidingImages || this.animationPaused || this.isToggling) return;
      const [x, y] = [e.clientX + window.scrollX, e.clientY + window.scrollY];
      this.mousePos = { x, y };
      this.processMovement(x, y);
    }

    processMovement(x, y) {
      if (!this.heroHidden) {
        this.hideHeroContent();
      }

      if (this.heroHidden) {
        clearTimeout(this.idleTimer);
        this.isIdle = false;

        const distance = Math.hypot(
          x - this.lastMousePos.x,
          y - this.lastMousePos.y
        );

        if (distance > 200) {
          this.imageTrail.showNextImage(this.mousePos);
          this.lastMousePos = { x, y };
        }

        this.idleTimer = setTimeout(() => {
          this.hideQuickly = false;
          this.hideImagesSequentially();
          this.isIdle = true;
        }, 800);
      }
    }

    hideHeroContent() {
      gsap.to(this.heroContent, {
        y: "103%",
        opacity: 0,
        duration: 0.6,
        ease: "power4.in",
        onComplete: () => {
          this.heroHidden = true;
        }
      });

      gsap.to(this.blurBackground, {
        opacity: 1,
        filter: "blur(10px)",
        duration: 0.6,
        ease: "power4.in"
      });
    }

    handleToggle() {
      if (this.isToggling) return;
      this.isToggling = true;

      this.animationPaused = !this.animationPaused;

      const toggleBtn = document.querySelector('.toggle_wrap');
      if (toggleBtn) {
        toggleBtn.title = this.animationPaused
          ? 'Turn on Magic'
          : 'Turn off Magic';
        toggleBtn.setAttribute('aria-label', toggleBtn.title);
      }

      // [TOGGLE-ANIM] Two distinct animations — NOT a reversible timeline.
      //   OFF (toggle-anim):     Move (0→0.2s) THEN Opacity (0.2→0.4s)  — sequential, 0.4s
      //   ON  (toggle-anim-out): Move + Opacity, both 0→0.2s            — parallel,   0.2s
      // killTweensOf clears any in-flight tween so rapid clicks don't queue up.
      if (this.toggleInner) {
        gsap.killTweensOf(this.toggleInner);
        if (this.animationPaused) {
          // Magic OFF — slide in, then dim
          gsap.timeline()
            .to(this.toggleInner, { x: 0,         duration: 0.2, ease: "power2.out" })
            .to(this.toggleInner, { opacity: 0.4, duration: 0.2, ease: "power2.out" });
        } else {
          // Magic ON — pop back out and brighten together
          gsap.to(this.toggleInner, {
            x: "0.9rem",
            opacity: 1,
            duration: 0.2,
            ease: "power2.out"
          });
        }
      }

      if (this.animationPaused) {
        // Magic OFF: pause animations, restore hero, and start video scrub mode
        gsap.killTweensOf('.content__img');
        gsap.killTweensOf(this.heroContent);
        gsap.killTweensOf(this.blurBackground);

        document.querySelectorAll('.content__img').forEach((img) => {
          gsap.to(img, {
            opacity: 0,
            scale: 0.8,
            duration: 0.5,
            ease: "power2.out"
          });
        });

        gsap.to(this.heroContent, {
          y: "0%",
          opacity: 1,
          duration: 0.4,
          ease: "power2.out"
        });

        gsap.to(this.blurBackground, {
          opacity: 0,
          filter: "blur(0px)",
          duration: 0.4,
          ease: "power2.out"
        });

        this.heroHidden = false;
      } else {
        // Magic ON: reset state, and let the FIRST mousemove
        // trigger hideHeroContent the same way it does on initial page load.
        this.lastMousePos = { ...this.mousePos };
        this.isHidingImages = false;
        this.hideQuickly = false;
        this.heroHidden = false;

        if (this.idleTimer) {
          clearTimeout(this.idleTimer);
          this.idleTimer = null;
        }
      }

      setTimeout(() => {
        this.isToggling = false;
      }, 600);
    }

    hideImagesSequentially() {
      if (this.isToggling) return;

      this.isHidingImages = true;
      const images = document.querySelectorAll('.content__img');
      let hiddenImages = 0;
      const heroDuration = this.hideQuickly ? 0.3 : 0.6;

      images.forEach((img, index) => {
        setTimeout(() => {
          if (this.isToggling) return;

          gsap.to(img, {
            opacity: 0,
            scale: 0.8,
            duration: 0.3,
            ease: "power2.in"
          });

          hiddenImages++;
          if (hiddenImages === images.length) {
            gsap.to(this.heroContent, {
              y: "0%",
              opacity: 1,
              duration: heroDuration,
              ease: "power4.out"
            });
            gsap.to(this.blurBackground, {
              opacity: 0,
              filter: "blur(0px)",
              duration: heroDuration,
              ease: "power4.out"
            });
            this.heroHidden = false;
            this.isHidingImages = false;
          }
        }, index * 100);
      });
    }
  }

  // -------- MOBILE THUMBNAIL ANIMATION (SWIPE VERSION) --------
  function runThumbnailAnimation() {
    if (!isMobile()) return;

    const items = [...document.querySelectorAll(".thumbnail-mob-item")];
    const images = [...document.querySelectorAll(".thumbnail-inner img")];
    const total = items.length;
    if (total === 0) return;

    let loaded = 0;
    let currentIndex = -1;
    let isAnimating = false;
    let randomOrder = [];
    let touchStartY = 0;
    let lastSwipeProgress = 0;
    const threshold = 6;

    function shuffleImages() {
      randomOrder = [...Array(total).keys()].sort(() => Math.random() - 0.5);
    }

    function getNextIndex() {
      return (currentIndex + 1) % total;
    }

    function getPrevIndex() {
      return (currentIndex - 1 + total) % total;
    }

    function initAnimation() {
      shuffleImages();
      items.forEach(item => {
        item.style.opacity = "0";
        item.style.position = "absolute";
        item.style.top = "0";
        item.style.left = "0";
        item.style.width = "100%";
        item.style.willChange = "opacity, transform";
        item.style.pointerEvents = "none";
        item.style.transform = "translateY(0)";
      });
      currentIndex = -1;
    }

    function showNextImage() {
      if (isAnimating) return;
      isAnimating = true;

      if (currentIndex >= 0) {
        const prevReal = randomOrder[currentIndex];
        gsap.to(items[prevReal], {
          opacity: 0,
          y: -4,
          duration: 0.08,
          ease: "power1.out"
        });
      }

      const nextIndex = getNextIndex();
      const nextReal = randomOrder[nextIndex];

      gsap.fromTo(
        items[nextReal],
        { opacity: 0, y: 4 },
        {
          opacity: 1,
          y: 0,
          duration: 0.08,
          ease: "power1.out",
          onComplete: () => {
            currentIndex = nextIndex;
            isAnimating = false;
          }
        }
      );
    }

    function showPreviousImage() {
      if (isAnimating) return;
      isAnimating = true;

      if (currentIndex >= 0) {
        const currentReal = randomOrder[currentIndex];
        gsap.to(items[currentReal], {
          opacity: 0,
          y: 4,
          duration: 0.08,
          ease: "power1.out"
        });
      }

      const prevIndex = getPrevIndex();
      const prevReal = randomOrder[prevIndex];

      gsap.fromTo(
        items[prevReal],
        { opacity: 0, y: -4 },
        {
          opacity: 1,
          y: 0,
          duration: 0.08,
          ease: "power1.out",
          onComplete: () => {
            currentIndex = prevIndex;
            isAnimating = false;
          }
        }
      );
    }

    function handleTouchStart(e) {
      touchStartY = e.touches[0].clientY;
      lastSwipeProgress = 0;
    }

    function handleTouchMove(e) {
      const currentY = e.touches[0].clientY;
      const delta = touchStartY - currentY;
      const swipeMove = delta - lastSwipeProgress;

      if (swipeMove > threshold) {
        showNextImage();
        lastSwipeProgress = delta;
      }

      if (swipeMove < -threshold) {
        showPreviousImage();
        lastSwipeProgress = delta;
      }

      if (document.body.scrollHeight <= window.innerHeight + 1) {
        e.preventDefault();
      }
    }

    function handleTouchEnd() {
      lastSwipeProgress = 0;
    }

    images.forEach(img => {
      if (img.complete) {
        loaded++;
      } else {
        img.addEventListener("load", () => {
          if (++loaded === images.length) start();
        });
        img.addEventListener("error", () => {
          if (++loaded === images.length) start();
        });
      }
    });

    if (loaded === images.length) start();

    function start() {
      initAnimation();
      window.addEventListener("touchstart", handleTouchStart, { passive: false });
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd, { passive: true });
    }

    return {
      reset() {
        currentIndex = -1;
        initAnimation();
      }
    };
  }

  window.VshHome.ready = true;
})();
