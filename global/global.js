// Global JS — Webflow Site Settings → Footer Code
// Contains two independent IIFEs: footer curtain overlay, and copy email + droplist + link masks.

/* ============================================
   FOOTER CURTAIN OVERLAY
   ============================================ */
(function () {
  // -------- IMMEDIATE FOOTER HIDE (parse time) --------
  function hideFooterEarly() {
    var f = document.querySelector('.footer-overlay');
    if (f) {
      f.style.transform = 'translate(0%, 100%)';
      f.style.pointerEvents = 'none';
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideFooterEarly);
  } else {
    hideFooterEarly();
  }

  // -------- LOAD GSAP IF NOT PRESENT (defensive fallback) --------
  function ensureGsap(callback) {
    if (typeof window.gsap !== 'undefined') {
      callback();
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
    s.onload = callback;
    s.onerror = function () {
      console.warn('[Curtain] Failed to load GSAP');
    };
    document.head.appendChild(s);
  }

  // -------- CURTAIN INIT --------
  function initFooterCurtain() {
    var footerOverlay = document.querySelector('.footer-overlay');
    if (!footerOverlay) return;
    if (typeof window.gsap === 'undefined') return;

    var gsap = window.gsap;

    // ---- Curtain timing ----
    var SHOW_DURATION = 0.7;
    var SHOW_EASE = 'power3.out';
    var HIDE_DURATION = 0.4;
    var HIDE_EASE = 'power2.in';
    var DISMISS_OFFSET = 80;

    // ---- Pull-to-trigger config ----
    var OVERSCROLL_THRESHOLD = 500;
    var TOUCH_SENSITIVITY = 3.3;
    var DECAY_DELAY = 350;
    var DECAY_RATE = 12;

    // ---- Progress bar drain (when curtain dismisses) ----
    var BAR_FADE_DURATION = 0.25;
    var BAR_FADE_EASE = 'power2.out';

    // ---- Inertia bar (plays once when footer arrives) ----
    var INERTIA_DELAY = SHOW_DURATION * 0.5;
    var INERTIA_GROW_DURATION = 0.4;
    var INERTIA_GROW_EASE = 'power2.out';
    var INERTIA_FLY_DURATION = 0.45;
    var INERTIA_FLY_EASE = 'power2.in';

    var isShown = false;
    var isAnimating = false;
    var scrollLocked = false;
    var savedScrollY = 0;
    var touchStartY = 0;

    var overscrollAmount = 0;
    var lastInputTime = 0;
    var touchIntentStartY = 0;
    var touchAtBottom = false;

    function getScrollY() {
      return window.scrollY || document.documentElement.scrollTop || 0;
    }
    function getMaxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }
    function getTriggerY() {
      return Math.max(0, getMaxScroll() - 5);
    }
    function isAtBottom() {
      return getScrollY() >= getTriggerY();
    }

    // ---- Progress bar ----
    var progressOverlay = document.createElement('div');
    progressOverlay.setAttribute('aria-hidden', 'true');
    progressOverlay.style.cssText =
      'position:fixed;left:50%;bottom:0.625rem;' +
      'transform:translateX(-50%) scaleY(0);transform-origin:top center;' +
      'width:0.0625rem;height:22.5vh;background:#000000;z-index:49;' +
      'pointer-events:none;opacity:0;transition:opacity 0.2s ease;' +
      'will-change:transform,opacity;';
    document.body.appendChild(progressOverlay);

    function setProgress(amount) {
      overscrollAmount = Math.max(0, Math.min(amount, OVERSCROLL_THRESHOLD));
      var pct = overscrollAmount / OVERSCROLL_THRESHOLD;
      progressOverlay.style.transform = 'translateX(-50%) scaleY(' + pct + ')';
      progressOverlay.style.opacity = pct > 0.01 ? '1' : '0';

      if (overscrollAmount >= OVERSCROLL_THRESHOLD) {
        progressOverlay.style.transform = 'translateX(-50%) scaleY(1)';
        progressOverlay.style.opacity = '1';
        overscrollAmount = 0;
        showCurtain();
      }
    }

    function clearProgress() {
      if (overscrollAmount !== 0) setProgress(0);
    }

    // ---- Inertia bar ----
    var inertiaBar = document.createElement('div');
    inertiaBar.setAttribute('aria-hidden', 'true');
    inertiaBar.style.cssText =
      'position:fixed;left:50%;bottom:0.625rem;' +
      'width:0.0625rem;height:22.5vh;background:#000000;z-index:51;' +
      'pointer-events:none;will-change:transform,opacity;';
    document.body.appendChild(inertiaBar);

    gsap.set(inertiaBar, {
      xPercent: -50, scaleY: 0,
      transformOrigin: 'bottom center', opacity: 0
    });

    function playInertiaBar() {
      gsap.killTweensOf(inertiaBar);
      gsap.set(inertiaBar, {
        xPercent: -50, scaleY: 0,
        transformOrigin: 'bottom center', opacity: 1
      });

      var tl = gsap.timeline({ delay: INERTIA_DELAY });
      tl.to(inertiaBar, {
        scaleY: 1, duration: INERTIA_GROW_DURATION, ease: INERTIA_GROW_EASE
      });
      tl.set(inertiaBar, { transformOrigin: 'top center' });
      tl.to(inertiaBar, {
        scaleY: 0, duration: INERTIA_FLY_DURATION, ease: INERTIA_FLY_EASE
      });
      tl.set(inertiaBar, { opacity: 0, transformOrigin: 'bottom center' });
    }

    function resetInertiaBar() {
      gsap.killTweensOf(inertiaBar);
      gsap.set(inertiaBar, {
        xPercent: -50, scaleY: 0,
        transformOrigin: 'bottom center', opacity: 0
      });
    }

    function lockScroll() {
      if (scrollLocked) return;
      scrollLocked = true;
      savedScrollY = getScrollY();
      document.documentElement.style.overflow = 'hidden';

      var localLenis = window.lenis || (window.state && window.state.lenis);
      if (localLenis && typeof localLenis.stop === 'function') localLenis.stop();

      window.addEventListener('wheel', onWheelLocked, { passive: false });
      window.addEventListener('touchstart', onTouchStartLocked, { passive: true });
      window.addEventListener('touchmove', onTouchMoveLocked, { passive: false });
    }

    function unlockScroll() {
      if (!scrollLocked) return;
      scrollLocked = false;
      document.documentElement.style.overflow = '';

      var localLenis = window.lenis || (window.state && window.state.lenis);
      if (localLenis && typeof localLenis.start === 'function') localLenis.start();

      window.removeEventListener('wheel', onWheelLocked);
      window.removeEventListener('touchstart', onTouchStartLocked);
      window.removeEventListener('touchmove', onTouchMoveLocked);
    }

    function onWheelLocked(e) {
      e.preventDefault();
      if (e.deltaY < -10) hideCurtain();
    }
    function onTouchStartLocked(e) {
      touchStartY = e.touches[0].clientY;
    }
    function onTouchMoveLocked(e) {
      e.preventDefault();
      if (e.touches[0].clientY > touchStartY + 30) hideCurtain();
    }

    function smoothScrollTo(targetY, duration) {
      var obj = { y: getScrollY() };
      gsap.to(obj, {
        y: targetY, duration: duration, ease: 'power2.out',
        onUpdate: function () { window.scrollTo(0, obj.y); }
      });
    }

    // ---- Footer reveal ----
    var REVEAL_DURATION = 0.6;
    var REVEAL_EASE = 'power3.out';
    var REVEAL_DELAY_PRIMARY = SHOW_DURATION;
    var REVEAL_DELAY_REST = REVEAL_DELAY_PRIMARY + 0.15;

    function getFooterMaskGroups() {
      var primary = [];
      var rest = [];
      // Programmatic .ftd-m wrappers (created by setupGeneralMasks)
      var primaryAnchor =
        footerOverlay.querySelector('.menu-link-download .ftd-m') ||
        footerOverlay.querySelector('.menu-link-dwnld .ftd-m') ||
        footerOverlay.querySelector('a[href*="cv" i] .ftd-m') ||
        footerOverlay.querySelector('a[href*="resume" i] .ftd-m');

      var allMasks = footerOverlay.querySelectorAll('.ftd-m');
      allMasks.forEach(function (mask) {
        if (mask.children.length < 2) return;
        if (primaryAnchor && mask === primaryAnchor) primary.push(mask);
        else rest.push(mask);
      });
      if (primary.length === 0 && rest.length > 0) primary.push(rest.shift());
      return { primary: primary, rest: rest };
    }

    function prepareFooterReveal() {
      var groups = getFooterMaskGroups();
      var all = groups.primary.concat(groups.rest);
      all.forEach(function (mask) {
        if (mask.children.length < 2) return;
        gsap.killTweensOf([mask.children[0], mask.children[1]]);
        gsap.set(mask.children[0], {
          transition: 'none',
          opacity: 0,
          yPercent: 100
        });
      });
    }

    function playFooterReveal() {
      var groups = getFooterMaskGroups();
      function tweenIn(mask, delay) {
        if (mask.children.length < 2) return;
        gsap.set(mask.children[0], { opacity: 1, delay: delay });
        gsap.to(mask.children[0], {
          yPercent: 0, duration: REVEAL_DURATION, ease: REVEAL_EASE, delay: delay,
          onComplete: function () {
            gsap.set(mask.children[0], { clearProps: 'transition,transform,opacity' });
          }
        });
      }
      groups.primary.forEach(function (mask) { tweenIn(mask, REVEAL_DELAY_PRIMARY); });
      groups.rest.forEach(function (mask)    { tweenIn(mask, REVEAL_DELAY_REST); });
    }

    function resetFooterReveal() {
      var groups = getFooterMaskGroups();
      var all = groups.primary.concat(groups.rest);
      all.forEach(function (mask) {
        if (mask.children.length < 2) return;
        gsap.killTweensOf([mask.children[0], mask.children[1]]);
        gsap.set(mask.children[0], { clearProps: 'transition,transform,opacity' });
      });
    }

    // ---- Show / Hide ----
    function showCurtain() {
      if (isShown || isAnimating) return;
      isAnimating = true;
      isShown = true;

      if (window.jobItemTrail && typeof window.jobItemTrail.forceKill === 'function') {
        window.jobItemTrail.forceKill();
      }

      lockScroll();

      prepareFooterReveal();
      playFooterReveal();
      playInertiaBar();

      gsap.to(footerOverlay, {
        y: '0%', duration: SHOW_DURATION, ease: SHOW_EASE,
        onStart: function () { footerOverlay.style.pointerEvents = 'auto'; },
        onComplete: function () { isAnimating = false; }
      });
    }

    function hideCurtain() {
      if (!isShown || isAnimating) return;
      isAnimating = true;
      isShown = false;

      unlockScroll();

      var targetY = Math.max(0, savedScrollY - DISMISS_OFFSET);
      smoothScrollTo(targetY, HIDE_DURATION);

      resetInertiaBar();

      gsap.to(progressOverlay, {
        opacity: 0, duration: BAR_FADE_DURATION, ease: BAR_FADE_EASE,
        onComplete: function () {
          progressOverlay.style.transform = 'translateX(-50%) scaleY(0)';
        }
      });

      gsap.to(footerOverlay, {
        y: '100%', duration: HIDE_DURATION, ease: HIDE_EASE,
        onComplete: function () {
          footerOverlay.style.pointerEvents = 'none';
          isAnimating = false;
          resetFooterReveal();
        }
      });
    }

    // ---- Pull-to-trigger: WHEEL ----
    window.addEventListener('wheel', function (e) {
      if (isShown || isAnimating || scrollLocked) return;
      if (!isAtBottom()) { clearProgress(); return; }
      if (e.deltaY > 0) {
        setProgress(overscrollAmount + e.deltaY);
        lastInputTime = Date.now();
      } else if (e.deltaY < 0) {
        clearProgress();
      }
    }, { passive: true });

    // ---- Pull-to-trigger: TOUCH ----
    window.addEventListener('touchstart', function (e) {
      if (isShown || isAnimating || scrollLocked) return;
      touchIntentStartY = e.touches[0].clientY;
      touchAtBottom = isAtBottom();
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (isShown || isAnimating || scrollLocked) return;
      if (!touchAtBottom) {
        if (isAtBottom()) {
          touchIntentStartY = e.touches[0].clientY;
          touchAtBottom = true;
        } else return;
      }
      var swipedUp = touchIntentStartY - e.touches[0].clientY;
      if (swipedUp > 0) {
        setProgress(swipedUp * TOUCH_SENSITIVITY);
        lastInputTime = Date.now();
      }
    }, { passive: true });

    window.addEventListener('touchend', function () {
      touchAtBottom = false;
    }, { passive: true });

    // ---- Initial state ----
    gsap.set(footerOverlay, { y: '100%' });
    footerOverlay.style.pointerEvents = 'none';

    // ---- Decay loop ----
    function decayLoop() {
      if (overscrollAmount > 0 && !isAnimating && !scrollLocked && !isShown) {
        var elapsed = Date.now() - lastInputTime;
        if (elapsed > DECAY_DELAY) {
          setProgress(overscrollAmount - DECAY_RATE);
        }
      }
      requestAnimationFrame(decayLoop);
    }
    requestAnimationFrame(decayLoop);
  }

  function boot() {
    ensureGsap(function () {
      setTimeout(initFooterCurtain, 100);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* ============================================
   COPY EMAIL + UNIFIED LINK MASKS
   ============================================ */
(function () {
  'use strict';
  var EMAIL = 'viacheslavnovoseltsev@gmail.com';
  var COPIED = 'is-copied';
  var RESET = 1800;
  var HOVER = '(hover: hover)';

  // Single source of truth: every link class that should get a programmatic mask.
  var MASK_SELECTOR = '.all-link, .link, .general-link, .job-item, .menu-link, .menu-link-dwnld, .social-link, .cv-items';

  // Build hover rules for both .ftd-mt (initial text) and .ftd-mc (clone) from MASK_SELECTOR.
  function buildHoverRules() {
    var classes = MASK_SELECTOR.split(',').map(function (s) { return s.trim(); });
    var upRules = classes.map(function (c) { return c + ':hover .ftd-mt'; }).join(',');
    var downRules = classes.map(function (c) { return c + ':hover .ftd-mc'; }).join(',');
    return upRules + '{transform:translateY(-110%)}' + downRules + '{transform:translateY(0)}';
  }

  /* ---------- styles ---------- */
  var css = ''
    + '.ftd-m{display:inline-block;position:relative;overflow:hidden;vertical-align:top;line-height:inherit}'
    + '.ftd-mt,.ftd-mc{display:block;transition:transform .45s cubic-bezier(.65,.05,.2,1);will-change:transform}'
    + '.ftd-mc{position:absolute;left:0;top:0;transform:translateY(110%)}'
    + '@media ' + HOVER + '{'
    +   buildHoverRules()
    + '}';
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ---------- helpers ---------- */
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) {
      try {
        var a = document.createElement('textarea');
        a.value = t; a.setAttribute('readonly', '');
        a.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(a); a.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(a);
        ok ? res() : rej();
      } catch (e) { rej(e); }
    });
  }

  function wrapMask(el) {
    if (el.querySelector('.ftd-m')) return;
    if (el.children.length > 0) return;
    var txt = el.textContent.trim();
    if (!txt) return;
    el.innerHTML = '<span class="ftd-m"><span class="ftd-mt">' + txt
                 + '</span><span class="ftd-mc" aria-hidden="true">' + txt + '</span></span>';
  }

  function playMask(a, b) {
    if (!window.gsap) return;
    window.gsap.timeline()
      .to(a, { yPercent: -100, duration: 0.2, ease: 'power1.in' }, 0)
      .to(b, { yPercent: -100, duration: 0.2, ease: 'power1.out' }, 0.2);
  }
  function reverseMask(a, b) {
    if (!window.gsap) return;
    window.gsap.timeline()
      .to(b, { yPercent: 0, duration: 0.1, ease: 'power1.out' }, 0)
      .to(a, { yPercent: 0, duration: 0.1, ease: 'power1.out' }, 0.1);
  }

  function syncCopyColor(btn) {
    var m = btn.querySelector('.link-mask');
    if (!m || m.children.length < 2) return;
    m.children[1].style.color = getComputedStyle(m.children[0]).color;
  }

  /* ---------- copy buttons (kept on legacy .link-mask + _01/_02 markup) ---------- */
  function setupCopy(btn) {
    if (btn.dataset.copyInit === '1') return;
    btn.dataset.copyInit = '1';
    btn.dataset.hoverInit = '1';
    function stop(e) { e.stopImmediatePropagation(); }
    btn.addEventListener('mouseenter', stop, true);
    btn.addEventListener('mouseleave', stop, true);
    syncCopyColor(btn);
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (btn.dataset.copied === '1') return;
      var m = btn.querySelector('.link-mask');
      if (!m || m.children.length < 2) return;
      var t1 = m.children[0], t2 = m.children[1];
      copyText(EMAIL).then(function () {
        btn.dataset.copied = '1';
        btn.classList.add(COPIED);
        playMask(t1, t2);
        setTimeout(function () {
          btn.classList.remove(COPIED);
          delete btn.dataset.copied;
          reverseMask(t1, t2);
        }, RESET);
      }).catch(function () { console.warn('Copy failed'); });
    });
  }

  /* ---------- unified link masks ---------- */
  function setupGeneralMasks() {
    document.querySelectorAll(MASK_SELECTOR).forEach(wrapMask);
  }

  /* ---------- init ---------- */
  function init() {
    document.querySelectorAll('.copy-button').forEach(setupCopy);
    setTimeout(function () {
      document.querySelectorAll('.copy-button').forEach(syncCopyColor);
    }, 300);
    setupGeneralMasks();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================
   MAGNETIC DOWNLOAD CV
   Desktop only. When the pointer enters a soft radius
   around the "Download CV" .general-link (in .bottom-bar
   on home, .footer-overlay on portfolio/about), the link
   translates toward the cursor by a fraction of the offset.
   Easing back to (0, 0) the moment the pointer steps
   outside the radius. Composes cleanly with the existing
   .ftd-m hover text-swap because we move the parent <a>
   while the mask spans translate inside it.
   ============================================ */
(function () {
  if (!matchMedia('(hover: hover)').matches) return;

  var TRIGGER_RADIUS = 140;     // px from link centre
  var STRENGTH = 0.4;           // 0..1 — how much the link follows
  var FOLLOW_DUR = 0.4;
  var RELEASE_DUR = 0.6;
  var EASE_FOLLOW = 'power3.out';
  var EASE_RELEASE = 'power3.out';
  var THROTTLE_MS = 16;         // ~60fps cap on the rect math

  // Mirror the :hover text-swap (driven by buildHoverRules in the masks
  // IIFE) for our magnet-active proximity state — :hover only fires when
  // the cursor is over the link's box, but the magnet engages 140px out,
  // so without this rule the swap lags behind the magnetic pull.
  var style = document.createElement('style');
  style.textContent =
    '.vsh-magnet-active .ftd-mt{transform:translateY(-110%)}' +
    '.vsh-magnet-active .ftd-mc{transform:translateY(0)}';
  (document.head || document.documentElement).appendChild(style);

  function findCvLinks() {
    // Match by visible text only — the CV anchor uses .general-link on
    // home but .menu-link-dwnld on portfolio/about, so a class-based
    // selector would miss two of the three pages. Text is the stable
    // identifier (and still single-link per page).
    return Array.from(document.querySelectorAll('a')).filter(function (a) {
      return /download\s*cv/i.test(a.textContent || '');
    });
  }

  function bindLink(link) {
    if (link.dataset.vshMagnetInit === '1') return;
    link.dataset.vshMagnetInit = '1';
    var gsap = window.gsap;
    if (!gsap) return;

    var xTo = gsap.quickTo(link, 'x', { duration: FOLLOW_DUR, ease: EASE_FOLLOW });
    var yTo = gsap.quickTo(link, 'y', { duration: FOLLOW_DUR, ease: EASE_FOLLOW });
    var isActive = false;
    var lastMoveAt = 0;

    function activate() {
      if (isActive) return;
      isActive = true;
      link.classList.add('vsh-magnet-active');
    }
    function release() {
      if (!isActive) return;
      isActive = false;
      link.classList.remove('vsh-magnet-active');
      gsap.to(link, { x: 0, y: 0, duration: RELEASE_DUR, ease: EASE_RELEASE });
    }

    window.addEventListener('mousemove', function (e) {
      var now = Date.now();
      if (now - lastMoveAt < THROTTLE_MS) return;
      lastMoveAt = now;

      var rect = link.getBoundingClientRect();
      // Link hidden (e.g. footer-overlay still translated off-screen) —
      // make sure we don't lock into an active state we can't release.
      if (rect.width === 0 || rect.height === 0) {
        release();
        return;
      }

      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      // Squared distance vs squared radius — avoids the sqrt every move.
      var distSq = dx * dx + dy * dy;
      var radiusSq = TRIGGER_RADIUS * TRIGGER_RADIUS;

      if (distSq < radiusSq) {
        activate();
        xTo(dx * STRENGTH);
        yTo(dy * STRENGTH);
      } else {
        release();
      }
    }, { passive: true });
  }

  function initWhenGsapReady(cb) {
    if (typeof window.gsap !== 'undefined') { cb(); return; }
    // Curtain IIFE loads GSAP defensively if Webflow's CDN bundle is
    // missing — poll briefly so we don't race it on first paint.
    var tries = 0;
    var iv = setInterval(function () {
      if (typeof window.gsap !== 'undefined' || ++tries > 100) {
        clearInterval(iv);
        if (typeof window.gsap !== 'undefined') cb();
      }
    }, 50);
  }

  function init() {
    initWhenGsapReady(function () {
      findCvLinks().forEach(bindLink);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================
   PAUSE VIDEOS WHEN TAB IS HIDDEN
   ============================================ */
(function () {
  var pausedByVisibility = [];
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      pausedByVisibility = [];
      document.querySelectorAll('video').forEach(function (v) {
        if (!v.paused) {
          pausedByVisibility.push(v);
          v.pause();
        }
      });
    } else {
      pausedByVisibility.forEach(function (v) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
      pausedByVisibility = [];
    }
  });
})();
