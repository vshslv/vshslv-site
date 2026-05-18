(function(){
  if (window.VshStories) return;
  window.VshStories = { ready:false };

  var NS = 'vsh_stories_seen_v1';
  var IMAGE_DURATION = 5;

  function $(s,r){return (r||document).querySelector(s);}
  function $$(s,r){return Array.from((r||document).querySelectorAll(s));}
  function getSeen(){try{return JSON.parse(localStorage.getItem(NS)||'[]');}catch(e){return [];}}
  function setSeen(a){try{localStorage.setItem(NS,JSON.stringify(a));}catch(e){}}
  function markSeen(id){if(!id)return;var s=getSeen();if(s.indexOf(id)===-1){s.push(id);setSeen(s);}}
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

  function checkCaption(slide){
    var cap=slide.querySelector('.stories-slide_caption');
    if(!cap){slide.classList.remove('has-caption');return;}
    var has=(cap.textContent||'').trim().length>0;
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
          // One-frame snap: hide modal, reset inner transform, restore preview
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

    $$('.stories-preview, [data-stories-trigger]').forEach(function(p){
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
