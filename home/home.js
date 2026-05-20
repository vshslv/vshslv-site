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
      const [x, y] = [touch.clientX, touch.clientY];
      this.mousePos = { x, y };
      if (!this.heroHidden) {
        this.hideHeroContent();
      }
    }

    handleTouchMove(e) {
      if (!this.imageTrail || this.isHidingImages || this.animationPaused || this.isToggling) return;
      e.preventDefault();
      const touch = e.touches[0];
      const [x, y] = [touch.clientX, touch.clientY];
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
      const [x, y] = [e.clientX, e.clientY];
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

  // -------- COORD DISPLAY (X / Y in pixels, image-trail HUD) --------
  const coordsDisplay = document.querySelector(".coords");
  if (coordsDisplay) {
    coordsDisplay.innerHTML =
      '<span class="coords__group coords__group--x">' +
        '<span class="coords__label">&nbsp;</span>' +
        '<span class="coords__val">0</span>' +
      '</span>' +
      '<span class="coords__group coords__group--y">' +
        '<span class="coords__label">&nbsp;&nbsp;&nbsp;</span>' +
        '<span class="coords__val">0</span>' +
      '</span>';

    const xEl = coordsDisplay.querySelector('.coords__group--x .coords__val');
    const yEl = coordsDisplay.querySelector('.coords__group--y .coords__val');

    const updateCoords = throttle((event) => {
      const touch = event.touches ? event.touches[0] : event;
      xEl.textContent = touch.clientX;
      yEl.textContent = touch.clientY;
    }, 100);

    document.addEventListener("mousemove", updateCoords);
    document.addEventListener("touchmove", updateCoords);
  }

  // -------- IDLE: pause background video after 10s of no activity --------
  (function () {
    const bgVideo = document.querySelector('video:not(.stories-slide_media):not(.stories-preview_img)');
    if (!bgVideo) return;

    const IDLE_MS = 10000;
    let lastActivity = Date.now();
    let pausedByIdle = false;

    function markActivity() {
      lastActivity = Date.now();
      if (pausedByIdle && bgVideo.paused) {
        const p = bgVideo.play();
        if (p && p.catch) p.catch(function () {});
        pausedByIdle = false;
      }
    }

    ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'touchmove', 'wheel'].forEach(function (ev) {
      window.addEventListener(ev, markActivity, { passive: true });
    });

    setInterval(function () {
      if (document.hidden) return; // visibility handler in global.js owns the video here
      if (!bgVideo.paused && Date.now() - lastActivity > IDLE_MS) {
        bgVideo.pause();
        pausedByIdle = true;
      }
    }, 2000);
  })();

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

/* ============================================
   STORIES
   ============================================ */
(function(){
  if (window.VshStories) return;
  window.VshStories = { ready:false };

  var NS = 'vsh_stories_seen_v1';
  var POOFED_NS = 'vsh_stories_poofed_v1';
  var POOF_DELAY_MS = 1500;
  var POOF_DURATION_MS = 700; // matches the CSS animation window (vshPoofVanish + cloud)
  var IMAGE_DURATION = 5;

  function $(s,r){return (r||document).querySelector(s);}
  function $$(s,r){return Array.from((r||document).querySelectorAll(s));}
  function getSeen(){try{return JSON.parse(localStorage.getItem(NS)||'[]');}catch(e){return [];}}
  function setSeen(a){try{localStorage.setItem(NS,JSON.stringify(a));}catch(e){}}
  function markSeen(id){if(!id)return;var s=getSeen();if(s.indexOf(id)===-1){s.push(id);setSeen(s);}}
  function getPoofed(){try{return JSON.parse(localStorage.getItem(POOFED_NS)||'[]');}catch(e){return [];}}
  function setPoofedList(a){try{localStorage.setItem(POOFED_NS,JSON.stringify(a));}catch(e){}}
  function previewId(p){
    if(!p) return '';
    return p.getAttribute('data-stories-preview-id')
        || p.getAttribute('data-stories-id')
        || (p.querySelector('img,video')||{}).src
        || (p.textContent||'').trim();
  }
  function markPoofed(p){
    var id = previewId(p);
    if(!id) return;
    var d = getPoofed();
    if(d.indexOf(id) === -1){ d.push(id); setPoofedList(d); }
  }
  function applyPoofedState(previews){
    var d = getPoofed();
    if(!d.length) return;
    previews.forEach(function(p){
      if(d.indexOf(previewId(p)) !== -1) p.classList.add('is-poofed');
    });
  }
  function schedulePoof(trigger){
    if(!trigger || trigger.dataset.poofScheduled === '1') return;
    trigger.dataset.poofScheduled = '1';
    setTimeout(function(){
      trigger.classList.add('is-poofing');
      setTimeout(function(){
        markPoofed(trigger);
        trigger.classList.remove('is-poofing');
        trigger.classList.add('is-poofed');     // grayscale (persists across refresh via localStorage)
        trigger.classList.add('is-dismissed');  // display:none for the current page view only (in-memory)
        delete trigger.dataset.poofScheduled;
      }, POOF_DURATION_MS);
    }, POOF_DELAY_MS);
  }
  function slideId(s,i){return s.getAttribute('data-stories-id')||('idx-'+i);}
  function resolveImage(slide){
    var a=(slide.getAttribute('data-stories-image')||'').trim();
    if(a) return a;
    var p=slide.parentElement;
    while(p && p!==document.body){
      if(p.style && p.style.backgroundImage){
        var m=p.style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
        if(m) return m[1];
      }
      p=p.parentElement;
    }
    var existing=slide.querySelector('img');
    if(existing && existing.src) return existing.src;
    return '';
  }
  function resolveVideo(s){return (s.getAttribute('data-stories-video')||'').trim();}

  function injectMedia(slide){
    if(slide.dataset.injected==='1') return;
    var p=slide.parentElement;
    while(p && p!==document.body){
      if(p.style && p.style.backgroundImage){p.style.backgroundImage='';}
      p=p.parentElement;
    }
    var img=resolveImage(slide);
    var vid=resolveVideo(slide);
    if(vid){
      if(img){
        var po=document.createElement('img');
        po.className='stories-slide_media';po.alt='';po.src=img;po.style.zIndex='2';
        slide.appendChild(po);
      }
      var v=document.createElement('video');
      v.className='stories-slide_media';v.src=vid;v.muted=true;v.playsInline=true;
      v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.preload='auto';
      v.addEventListener('canplay',function(){slide.classList.add('is-loaded');});
      v.addEventListener('error',function(){console.warn('[VshStories] video failed:',vid);slide.classList.add('is-loaded');});
      slide.appendChild(v);
    } else if(img){
      var im=new Image();
      im.className='stories-slide_media';im.alt='';im.decoding='async';
      im.onload=function(){slide.classList.add('is-loaded');};
      im.onerror=function(){slide.classList.add('is-loaded');};
      im.src=img;slide.appendChild(im);
    } else {
      setTimeout(function(){slide.classList.add('is-loaded');},200);
    }
    slide.dataset.injected='1';
  }

  function ensureSlideMeta(slide){
    var cap = slide.querySelector('.stories-slide_caption');
    if (!cap) return;
    var meta = slide.querySelector('.stories-slide_meta');
    // Wrap caption in a meta container so date/status can sit above/below it.
    if (!meta){
      meta = document.createElement('div');
      meta.className = 'stories-slide_meta';
      cap.parentNode.insertBefore(meta, cap);
      meta.appendChild(cap);
    } else if (cap.parentNode !== meta){
      meta.appendChild(cap);
    }

    // Date: prefer existing CMS-bound element text, fall back to data-stories-date attribute.
    var dateAttr = (slide.getAttribute('data-stories-date')||'').trim();
    var dateEl = slide.querySelector('.stories-slide_date');
    if (dateAttr){
      if (!dateEl){ dateEl = document.createElement('div'); dateEl.className = 'stories-slide_date'; }
      if (dateEl.textContent !== dateAttr) dateEl.textContent = dateAttr;
    }
    if (dateEl){
      var hasDateText = (dateEl.textContent||'').trim().length > 0;
      if (hasDateText){
        if (dateEl.parentNode !== meta || meta.firstChild !== dateEl) meta.insertBefore(dateEl, meta.firstChild);
      } else if (!dateAttr){
        dateEl.remove();
      }
    }

    // Status: prefer existing CMS-bound element text, fall back to data-stories-status attribute.
    var statusAttr = (slide.getAttribute('data-stories-status')||'').trim();
    var statusEl = slide.querySelector('.stories-slide_status');
    if (statusAttr){
      if (!statusEl){ statusEl = document.createElement('div'); statusEl.className = 'stories-slide_status'; }
      if (statusEl.textContent !== statusAttr) statusEl.textContent = statusAttr;
    }
    if (statusEl){
      var hasStatusText = (statusEl.textContent||'').trim().length > 0;
      if (hasStatusText){
        if (statusEl.parentNode !== meta || meta.lastChild !== statusEl) meta.appendChild(statusEl);
      } else if (!statusAttr){
        statusEl.remove();
      }
    }
  }

  function checkCaption(slide){
    var cap=slide.querySelector('.stories-slide_caption');
    if(!cap){slide.classList.remove('has-caption');return;}
    ensureSlideMeta(slide);
    var capText  = (cap.textContent||'').trim();
    var dateText = (slide.getAttribute('data-stories-date')||'').trim();
    var statText = (slide.getAttribute('data-stories-status')||'').trim();
    var has = !!(capText || dateText || statText);
    slide.classList.toggle('has-caption',has);
  }

  function buildBars(el,n){
    if(!el) return;
    el.innerHTML='';
    for(var i=0;i<n;i++){
      var b=document.createElement('div');b.className='stories-modal_bar';
      var f=document.createElement('div');f.className='stories-modal_bar-fill';
      b.appendChild(f);el.appendChild(b);
    }
  }

  function updatePreview(slides){
    if(!slides.length) return;
    var ids=slides.map(slideId);var seen=getSeen();
    var all=ids.every(function(id){return seen.indexOf(id)>-1;});
    $$('.stories-preview_ring').forEach(function(r){r.classList.toggle('is-viewed',all);});
  }

  function injectPreviewVideo(){
    // Touch devices have no hover — keep the static CMS image so the preview is visible.
    if (matchMedia('(hover: none)').matches) return;
    $$('.stories-preview').forEach(function(p){
      var circle = p.querySelector('.stories-preview_circle');
      if (!circle) return;
      if (circle.querySelector('video')) return;
      var url = (p.getAttribute('data-stories-preview-video')||'').trim();
      if (!url){
        var firstSlide = document.querySelector('[data-stories-slide][data-stories-video], .stories-slide[data-stories-video]');
        if (firstSlide) url = (firstSlide.getAttribute('data-stories-video')||'').trim();
      }
      if (!url) return;
      var existingImg = circle.querySelector('img.stories-preview_img, img');
      var v = document.createElement('video');
      v.className = 'stories-preview_img';
      v.src = url;
      v.muted=true; v.playsInline=true; v.loop=true; v.preload='auto';
      v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');
      v.setAttribute('muted','');v.setAttribute('loop','');
      if (existingImg) existingImg.replaceWith(v);
      else circle.appendChild(v);

      // play on hover, pause + reset on leave (touch devices stay paused, no hover state)
      p.addEventListener('mouseenter', function(){
        var pp = v.play(); if (pp && pp.catch) pp.catch(function(){});
      });
      p.addEventListener('mouseleave', function(){
        v.pause();
        try { v.currentTime = 0; } catch(e){}
      });
    });
  }

  function loadSwiper(cb){
    if (window.Swiper) { cb(); return; }
    var existing = document.querySelector('script[src*="swiper-bundle.min.js"]');
    if (existing) {
      var n=0; var t = setInterval(function(){ if (window.Swiper || n++>200) { clearInterval(t); if (window.Swiper) cb(); } }, 50);
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
    s.onload = cb;
    s.onerror = function(){ console.warn('[VshStories] Swiper failed to load'); };
    document.head.appendChild(s);
  }

  function init(){
    var modal=$('[data-stories-modal]'); if(!modal){console.warn('[VshStories] no modal');return;}
    var inner=$('.stories-modal_inner',modal);
    var swEl=$('[data-stories-swiper]',modal);
    var wrEl=$('[data-stories-wrapper]',modal);
    var barsEl=$('[data-stories-bars]',modal);

    var swiper=null, slides=[], timer=null, activeIdx=0, paused=false, lastTrigger=null;
    function clearTimer(){ if(timer){clearTimeout(timer);timer=null;} }

    function flipRect(fromEl){
      if (!fromEl || !inner) return null;
      var s = fromEl.getBoundingClientRect();
      var t = inner.getBoundingClientRect();
      if (!s.width || !s.height || !t.width || !t.height) return null;
      return {
        dx: (s.left + s.width/2) - (t.left + t.width/2),
        dy: (s.top + s.height/2) - (t.top + t.height/2),
        sx: s.width / t.width,
        sy: s.height / t.height
      };
    }
    function openModal(){
      if(!slides.length){console.warn('[VshStories] no slides');return;}
      var trigger = lastTrigger || document.querySelector('.stories-preview');
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden','false');
      document.body.classList.add('stories-locked');
      if (barsEl) barsEl.classList.add('is-active');
      activeIdx=(swiper && swiper.activeIndex) || 0;
      paused=false;
      // FLIP: start from preview position/size, animate to natural
      var rect = flipRect(trigger);
      if (rect && inner){
        if (trigger) trigger.style.opacity = '0';
        inner.style.transition = 'none';
        inner.style.transform = 'translate('+rect.dx+'px,'+rect.dy+'px) scale('+rect.sx+','+rect.sy+')';
        void inner.offsetWidth;
        inner.style.transition = '';
        inner.style.transform = '';
      }
      startBar(activeIdx);
    }
    function closeModal(seenFully){
      var trigger = lastTrigger || document.querySelector('.stories-preview');
      var rect = flipRect(trigger);
      clearTimer();
      // Block pointer events immediately, but keep visual state (.is-open)
      modal.style.pointerEvents = 'none';
      slides.forEach(function(s){
        var v=s.querySelector('video.stories-slide_media');
        if(v){try{v.pause();}catch(e){}}
        if (typeof detachBarSync === 'function') detachBarSync(v);
      });
      if(seenFully) slides.forEach(function(s,i){markSeen(slideId(s,i));});
      if (barsEl) barsEl.classList.remove('is-active');
      if (rect && inner){
        // Switch easings to fast (close)
        modal.classList.add('is-closing');
        inner.style.transition = '';
        inner.style.transform = 'translate('+rect.dx+'px,'+rect.dy+'px) scale('+rect.sx+','+rect.sy+')';
        modal.style.backdropFilter = 'blur(0px)';
        modal.style.webkitBackdropFilter = 'blur(0px)';
        var fired = false;
        var finalize = function(){
          if (fired) return; fired = true;
          // One-frame snap: hide modal, reset inner transform, restore preview.
          modal.classList.remove('is-open');
          modal.classList.remove('is-closing');
          modal.setAttribute('aria-hidden','true');
          document.body.classList.remove('stories-locked');
          modal.style.pointerEvents = '';
          if (inner){
            inner.style.transition = 'none';
            inner.style.transform = '';
            void inner.offsetWidth;
            inner.style.transition = '';
          }
          modal.style.backdropFilter = '';
          modal.style.webkitBackdropFilter = '';
          if (trigger) trigger.style.opacity = '';
          updatePreview(slides);
          // After ~1.5s the preview puffs away (Mac-style poof) and stays dismissed for the session.
          if (trigger) schedulePoof(trigger);
          if(lastTrigger){try{lastTrigger.focus();}catch(e){}}
        };
        var onEnd = function(ev){
          if (ev && ev.propertyName && ev.propertyName.indexOf('transform') === -1) return;
          inner.removeEventListener('transitionend', onEnd);
          finalize();
        };
        inner.addEventListener('transitionend', onEnd);
        setTimeout(finalize, 450); // safety net (> 350ms close)
      } else {
        // No FLIP source — fall back to instant close
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden','true');
        document.body.classList.remove('stories-locked');
        modal.style.pointerEvents = '';
        if (trigger) trigger.style.opacity = '';
        updatePreview(slides);
        if(lastTrigger){try{lastTrigger.focus();}catch(e){}}
      }
    }
    function detachBarSync(v){
      if (v && v._barSync){
        v.removeEventListener('timeupdate', v._barSync);
        v.removeEventListener('ended', v._barEnd);
        v._barSync = null;
        v._barEnd = null;
      }
    }
    function startBar(idx){
      if(!slides.length || !barsEl) return;
      var bars=$$('.stories-modal_bar',barsEl);
      bars.forEach(function(b,i){
        b.classList.toggle('is-done',i<idx);
        var f=b.firstElementChild; if(!f) return;
        if(i!==idx){ f.style.transition='none'; f.style.width=(i<idx?'100%':'0%'); }
      });
      var slide=slides[idx]; if(!slide) return;
      var v=slide.querySelector('video.stories-slide_media');
      var fill=bars[idx] && bars[idx].firstElementChild; if(!fill) return;
      // detach any previous sync handler on every slide's video
      slides.forEach(function(s){ detachBarSync(s.querySelector('video.stories-slide_media')); });
      fill.style.transition='none'; fill.style.width='0%';
      clearTimer();
      if(resolveVideo(slide) && v){
        // video-driven progress — bar follows real currentTime
        if(!(v.readyState>=1 && v.duration && isFinite(v.duration))){
          v.addEventListener('loadedmetadata',function(){ if(activeIdx===idx) startBar(idx); },{once:true});
        }
        if (typeof window.__vshApplyStoriesSound === 'function') window.__vshApplyStoriesSound();
        try{ v.currentTime=0; var pp=v.play(); if(pp&&pp.catch)pp.catch(function(){}); }catch(e){}
        v._barSync = function(){
          if(!v.duration || !isFinite(v.duration)) return;
          var ratio = Math.min(1, Math.max(0, v.currentTime / v.duration));
          fill.style.width = (ratio * 100) + '%';
        };
        v._barEnd = function(){
          if(paused) return;
          if(idx+1<slides.length && swiper) swiper.slideNext();
          else closeModal(true);
        };
        v.addEventListener('timeupdate', v._barSync);
        v.addEventListener('ended', v._barEnd);
      } else {
        // image / no-video — transition-based timer fallback
        var duration=IMAGE_DURATION;
        requestAnimationFrame(function(){ fill.style.transition='width '+duration+'s linear'; fill.style.width='100%'; });
        timer=setTimeout(function(){
          if(paused) return;
          if(idx+1<slides.length && swiper) swiper.slideNext();
          else closeModal(true);
        }, duration*1000);
      }
      markSeen(slideId(slide,idx));
    }
    function togglePause(){
      paused=!paused;
      modal.classList.toggle('is-paused',paused);
      var slide=slides[activeIdx]; if(!slide) return;
      var vid=slide.querySelector('video.stories-slide_media');
      if(vid && resolveVideo(slide)){
        // Video — pause/play of <video> stops timeupdate naturally; bar pauses with it.
        if(paused){try{vid.pause();}catch(e){}}
        else {try{vid.play().catch(function(){});}catch(e){}}
        return;
      }
      // Image — manage width transition + setTimeout
      if(!barsEl) return;
      var fill=$$('.stories-modal_bar-fill',barsEl)[activeIdx]; if(!fill) return;
      if(paused){
        var cs=getComputedStyle(fill).width;
        fill.style.transition='none'; fill.style.width=cs; clearTimer();
      } else {
        var total=IMAGE_DURATION;
        var cur=parseFloat(getComputedStyle(fill).width);
        var p=fill.parentElement; if(!p) return;
        var parent=p.getBoundingClientRect().width;
        var remain=Math.max(.15,total*(1-(parent?cur/parent:0)));
        requestAnimationFrame(function(){ fill.style.transition='width '+remain+'s linear'; fill.style.width='100%'; });
        timer=setTimeout(function(){
          if(paused) return;
          if(activeIdx+1<slides.length && swiper) swiper.slideNext();
          else closeModal(true);
        }, remain*1000);
      }
    }

    var previews = $$('.stories-preview, [data-stories-trigger]');
    applyPoofedState(previews);
    previews.forEach(function(p){
      p.addEventListener('click',function(e){e.preventDefault();lastTrigger=p;openModal();});
      p.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();lastTrigger=p;openModal();}});
    });

    injectPreviewVideo();

    if(!wrEl){console.warn('[VshStories] wrapper missing');return;}

    var wfList = wrEl.querySelector('.w-dyn-list');
    var wfItemsCt = wrEl.querySelector('.w-dyn-items');
    var wfItems = wrEl.querySelectorAll('.w-dyn-item');
    var actualSwiperEl;
    if (wfList && wfItemsCt && wfItems.length){
      actualSwiperEl = wfList;
      wfList.classList.add('swiper');
      wfItemsCt.classList.add('swiper-wrapper');
      Array.prototype.forEach.call(wfItems,function(it){it.classList.add('swiper-slide');});
    } else {
      actualSwiperEl = swEl || wrEl;
      if(actualSwiperEl) actualSwiperEl.classList.add('swiper');
      wrEl.classList.add('swiper-wrapper');
      $$('.stories-slide',wrEl).forEach(function(s){s.classList.add('swiper-slide');});
    }

    slides=$$('.stories-slide',wrEl);
    console.log('[VshStories] slides found:',slides.length);
    if(!slides.length) return;

    slides.forEach(injectMedia);
    slides.forEach(checkCaption);
    buildBars(barsEl,slides.length);
    // Move bars out of .stories-modal so opacity:0 on modal doesn't hide them
    if (barsEl && barsEl.parentNode !== document.body){
      document.body.appendChild(barsEl);
    }

    if(actualSwiperEl){
      try{
        swiper=new Swiper(actualSwiperEl,{
          slidesPerView:1, spaceBetween:0, speed:280,
          keyboard:{enabled:true}, grabCursor:false,
          on:{
            slideChange:function(){
              activeIdx=swiper.activeIndex;
              slides.forEach(function(s,i){
                var v=s.querySelector('video.stories-slide_media');
                if(v && i!==activeIdx){
                  try{v.pause();v.currentTime=0;}catch(e){}
                  if (typeof detachBarSync === 'function') detachBarSync(v);
                }
              });
              startBar(activeIdx);
              if (typeof window.__vshApplyStoriesSound === 'function') window.__vshApplyStoriesSound();
            }
          }
        });
      }catch(err){
        console.error('[VshStories] Swiper init failed:',err);
      }
    }

    // === sound toggle button ===
    var SOUND_KEY = 'vsh_stories_sound_on';
    var soundOn = false;
    try { soundOn = localStorage.getItem(SOUND_KEY) === '1'; } catch(e){}
    var soundBtn = null;
    function applySoundToCurrent(){
      var v = slides[activeIdx] && slides[activeIdx].querySelector('video.stories-slide_media');
      if (v) { v.muted = !soundOn; }
    }
    function paintSoundIcon(){
      if (!soundBtn) return;
      soundBtn.textContent = soundOn ? 'Mute' : 'Sound';
    }
    if (inner){
      soundBtn = document.createElement('button');
      soundBtn.className = 'stories-sound-toggle';
      soundBtn.setAttribute('aria-label','Toggle sound');
      soundBtn.type = 'button';
      paintSoundIcon();
      soundBtn.addEventListener('click', function(e){
        e.stopPropagation();
        soundOn = !soundOn;
        try { localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0'); } catch(err){}
        paintSoundIcon();
        applySoundToCurrent();
      });
      inner.appendChild(soundBtn);
    }
    window.__vshApplyStoriesSound = applySoundToCurrent;

    // Click on a slide → toggle pause; anywhere else → close
    slides.forEach(function(s){
      s.addEventListener('click', function(e){
        if (e.target.closest('.stories-sound-toggle')) return;
        e.stopPropagation();
        togglePause();
      });
    });
    modal.addEventListener('click', function(e){
      if(!modal.classList.contains('is-open')) return;
      if (e.target.closest('.stories-sound-toggle')) return;
      if (e.target.closest('.stories-slide')) return;
      closeModal(false);
    });
    document.addEventListener('keydown',function(e){
      if(!modal.classList.contains('is-open')) return;
      if(e.key==='Escape') closeModal(false);
      else if(e.key==='ArrowLeft' && swiper) swiper.slidePrev();
      else if(e.key==='ArrowRight' && swiper) swiper.slideNext();
      else if(e.key===' '){e.preventDefault();togglePause();}
    });

    var tag=document.createElement('div');
    tag.className='stories-cursor-tag';
    var mask=document.createElement('span'); mask.className='stories-cursor-tag_mask';
    var layerA=document.createElement('span'); layerA.className='stories-cursor-tag_layer'; layerA.textContent='Close';
    var layerB=document.createElement('span'); layerB.className='stories-cursor-tag_layer is-below'; layerB.setAttribute('aria-hidden','true');
    mask.appendChild(layerA); mask.appendChild(layerB);
    tag.appendChild(mask);
    document.body.appendChild(tag);
    var activeLayer=layerA, hiddenLayer=layerB, currentLabel='Close', maskBusy=false, pendingLabel=null;
    function commitSwitch(next){
      maskBusy = true;
      currentLabel = next;
      hiddenLayer.textContent = next;
      var outgoing = activeLayer, incoming = hiddenLayer;
      // start transition
      outgoing.classList.add('is-out');
      incoming.classList.remove('is-below');
      activeLayer = incoming; hiddenLayer = outgoing;
      setTimeout(function(){
        outgoing.classList.add('no-tx');
        outgoing.classList.remove('is-out');
        outgoing.classList.add('is-below');
        void outgoing.offsetWidth;
        outgoing.classList.remove('no-tx');
        maskBusy = false;
        if (pendingLabel !== null && pendingLabel !== currentLabel){
          var p = pendingLabel; pendingLabel = null;
          commitSwitch(p);
        }
      }, 470); // > 450ms CSS transition
    }
    function switchLabel(next){
      if (next === currentLabel) { pendingLabel = null; return; }
      if (maskBusy){ pendingLabel = next; return; }
      commitSwitch(next);
    }
    function refreshLabel(overInner){
      switchLabel(overInner ? (paused ? 'Play' : 'Pause') : 'Close');
    }
    // Adaptive lerp matched to job-item-trail behaviour
    var LERP_NORMAL = 0.2;
    var LERP_FAST = 0.4;
    var FAST_DISTANCE_PX = 100;
    function getOffsetPx(){
      var rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return rem * 0.25;
    }
    var tX=-9999,tY=-9999,cX=-9999,cY=-9999,raf=null,ticking=false;
    function followLoop(){
      var dx = tX - cX, dy = tY - cY;
      var dist = Math.sqrt(dx*dx + dy*dy);
      var lerp = dist > FAST_DISTANCE_PX ? LERP_FAST : LERP_NORMAL;
      cX += dx * lerp;
      cY += dy * lerp;
      var off = getOffsetPx();
      tag.style.transform = 'translate3d(' + (cX + off) + 'px,' + (cY + off) + 'px,0)';
      if (Math.abs(tX - cX) > 0.1 || Math.abs(tY - cY) > 0.1) raf = requestAnimationFrame(followLoop);
      else { ticking = false; raf = null; }
    }
    function kickFollow(){ if(!ticking){ ticking=true; raf=requestAnimationFrame(followLoop); } }
    var lastMoveAt = 0, MOVE_THROTTLE_MS = 16;
    document.addEventListener('mousemove',function(e){
      var now = Date.now();
      if (now - lastMoveAt < MOVE_THROTTLE_MS) return;
      lastMoveAt = now;
      if(!modal.classList.contains('is-open')){
        tag.classList.remove('is-visible'); return;
      }
      var rect=inner.getBoundingClientRect();
      var overInner = e.clientX>=rect.left && e.clientX<=rect.right && e.clientY>=rect.top && e.clientY<=rect.bottom;
      tX = e.clientX; tY = e.clientY;
      if(cX<-1000){ cX=tX; cY=tY; }
      refreshLabel(overInner);
      tag.classList.add('is-visible');
      kickFollow();
    });
    document.addEventListener('mouseleave',function(){ tag.classList.remove('is-visible'); });

    updatePreview(slides);
    window.VshStories = { ready:true, swiper:swiper, open:openModal, close:closeModal, slides:slides, togglePause:togglePause };
  }

  loadSwiper(init);
})();

/* ============================================
   FEATURED DROPLIST
   Reveals items 10+ on wrapper hover, rotates the heading arrow 180°,
   and fades the .link-icon next to each general-link on per-link hover.
   .general-link text mask wrapping is handled by global/global.js's
   setupGeneralMasks(), so this module doesn't need wrapMask().
   ============================================ */
(function () {
  'use strict';

  if (!matchMedia('(hover: hover)').matches) return;

  function setupDroplist() {
    var g = window.gsap;
    var list = document.querySelector('[data-droplist="featured"]');
    if (!list) return;

    // Icon lives outside the list — sibling under .list-wrapper. Fall back to inside-list (legacy) too.
    var wrap = list.parentElement || list;
    var icon = wrap.querySelector('.dropdown-arrow-icon') || list.querySelector('.droplist-icon');
    // Hover on the whole wrapper so cursor over label/arrow also opens the list.
    var hoverEl = (icon && !list.contains(icon)) ? wrap : list;

    var items = [].slice.call(list.children).filter(function (n) { return n !== icon; });
    if (items.length <= 9) return;
    var extras = items.slice(9);

    // Per-link icon: fade in + draw the diagonal line, then the arrow head.
    // Falls back to plain opacity fade if the SVG isn't structured into .arrow-line / .arrow-head.
    list.querySelectorAll('.general-link').forEach(function (link) {
      var iconEl = link.nextElementSibling;
      if (iconEl && !iconEl.classList.contains('link-icon')) {
        iconEl = iconEl.querySelector ? iconEl.querySelector('.link-icon') : null;
      }
      if (!iconEl) return;

      var line = iconEl.querySelector('.arrow-line');
      var head = iconEl.querySelector('.arrow-head');
      var hasStroke = !!(line && head && g && typeof line.getTotalLength === 'function');

      if (hasStroke) {
        [line, head].forEach(function (p) {
          var len = p.getTotalLength();
          p.style.strokeDasharray = len;
          p.style.strokeDashoffset = len;
        });
      }

      link.addEventListener('mouseenter', function () {
        if (!g) { iconEl.style.opacity = '0.5'; return; }
        g.killTweensOf(iconEl);
        if (hasStroke) {
          g.killTweensOf([line, head]);
          g.set(line, { strokeDashoffset: line.getTotalLength() });
          g.set(head, { strokeDashoffset: head.getTotalLength() });
          g.timeline()
            .to(iconEl, { opacity: 0.5, duration: 0.12, ease: 'power2.out' }, 0)
            .to(line,   { strokeDashoffset: 0, duration: 0.18, ease: 'none' }, 0.04)
            .to(head,   { strokeDashoffset: 0, duration: 0.10, ease: 'none' }, '>');
        } else {
          g.to(iconEl, { opacity: 0.5, duration: 0.2, ease: 'power2.out' });
        }
      });
      link.addEventListener('mouseleave', function () {
        if (!g) { iconEl.style.opacity = ''; return; }
        g.killTweensOf(iconEl);
        if (hasStroke) {
          g.killTweensOf([line, head]);
          // Mirror the hover-in: un-draw head, then un-draw line, then fade opacity.
          g.timeline()
            .to(head,   { strokeDashoffset: head.getTotalLength(), duration: 0.10, ease: 'none' }, 0)
            .to(line,   { strokeDashoffset: line.getTotalLength(), duration: 0.18, ease: 'none' }, '>')
            .to(iconEl, { opacity: 0, duration: 0.12, ease: 'power2.in' }, '>-0.04');
        } else {
          g.to(iconEl, { opacity: 0, duration: 0.3, ease: 'power2.inOut' });
        }
      });
    });

    if (!g) {
      if (icon) {
        icon.style.transition = 'transform .35s ease';
        icon.style.transformOrigin = '50% 50%';
      }
      hoverEl.addEventListener('mouseenter', function () {
        extras.forEach(function (n) {
          n.style.cssText = 'opacity:1;transform:none;pointer-events:auto;transition:opacity .35s,transform .35s';
        });
        if (icon) icon.style.transform = 'rotate(180deg)';
      });
      hoverEl.addEventListener('mouseleave', function () {
        extras.forEach(function (n) { n.style.cssText = ''; });
        if (icon) icon.style.transform = 'rotate(0deg)';
      });
      return;
    }

    g.set(extras, { y: -8, opacity: 0, pointerEvents: 'none' });
    if (icon) g.set(icon, { rotation: 0, transformOrigin: '50% 50%' });
    var open = false;
    function go(v) {
      if (v === open) return;
      open = v;
      g.to(extras, v
        ? { y: 0,  opacity: 1, pointerEvents: 'auto', duration: .45, ease: 'power3.out', stagger: .05, overwrite: true }
        : { y: -8, opacity: 0, pointerEvents: 'none', duration: .35, ease: 'power3.in',  stagger: { each: .04, from: 'end' }, overwrite: true }
      );
      if (icon) {
        g.to(icon, {
          rotation: v ? 180 : 0,
          duration: v ? .45 : .35,
          ease: v ? 'power3.out' : 'power3.in',
          overwrite: true
        });
      }
    }
    hoverEl.addEventListener('mouseenter', function () { go(true); });
    hoverEl.addEventListener('mouseleave', function () { go(false); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDroplist);
  } else {
    setupDroplist();
  }
})();
