const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) gsap.globalTimeline.timeScale(20);

const screenCover = document.getElementById('screen-cover');
const screenTimeline = document.getElementById('screen-timeline');
const screenMessage = document.getElementById('screen-message');
const screenReveal = document.getElementById('screen-reveal');
const book = document.getElementById('book');
const bookCover = document.getElementById('book-cover');
const timelineFill = document.getElementById('timeline-fill');
const timelineMarker = document.getElementById('timeline-marker');
const btnContinue = document.getElementById('btn-continue');
const btnReplay = document.getElementById('btn-replay');
const btnRead = document.getElementById('btn-read');

function createStars(count) {
  const container = document.getElementById('stars');
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = (Math.random() * 3.5).toFixed(2) + 's';
    frag.appendChild(star);
  }
  container.appendChild(frag);
}
createStars(28);

function showScreen(screen) {
  [screenCover, screenTimeline, screenMessage, screenReveal].forEach(s => s.classList.add('hidden'));
  screen.classList.remove('hidden');
}

function playOpening() {
  book.removeEventListener('click', playOpening);

  gsap.timeline()
    .to(bookCover, {
      duration: 0.25,
      scale: 1.03,
      ease: 'power1.inOut'
    })
    .to(bookCover, {
      duration: 1.1,
      rotateY: -140,
      scale: 1,
      ease: 'power2.inOut'
    })
    .to(book, {
      duration: 0.5,
      opacity: 0,
      ease: 'power1.in'
    }, '-=0.15')
    .call(() => goToTimeline());
}

function goToTimeline() {
  showScreen(screenTimeline);

  const dateStart = screenTimeline.querySelector('.timeline-date-start');
  const dateEnd = screenTimeline.querySelector('.timeline-date-end');

  gsap.set(timelineFill, { scaleX: 0 });
  gsap.set(timelineMarker, { left: '0%' });
  gsap.set([dateStart, dateEnd], { opacity: 0, y: 6 });

  gsap.timeline()
    .to(dateStart, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
    .to(timelineFill, { scaleX: 1, duration: 1.8, ease: 'power2.inOut' }, '+=0.1')
    .to(timelineMarker, { left: '100%', duration: 1.8, ease: 'power2.inOut' }, '<')
    .to(dateEnd, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.3')
    .call(() => goToMessage(), null, '+=0.6');
}

function goToMessage() {
  showScreen(screenMessage);
  const lines = screenMessage.querySelectorAll('.message-line');
  const photos = screenMessage.querySelectorAll('.polaroid');

  gsap.timeline()
    .from(photos, {
      duration: 0.6,
      y: 20,
      opacity: 0,
      stagger: 0.15,
      ease: 'power2.out'
    })
    .to(lines, {
      duration: 0.7,
      y: 0,
      opacity: 1,
      stagger: 0.35,
      ease: 'power2.out'
    }, '+=0.1')
    .fromTo(btnContinue,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.5 },
      '+=0.1'
    );
}

function goToReveal({ animate = true } = {}) {
  showScreen(screenReveal);
  btnReplay.classList.remove('hidden');

  if (animate) {
    gsap.from(screenReveal.querySelector('.page-content'), {
      duration: 0.7,
      y: 20,
      opacity: 0,
      ease: 'power2.out'
    });
  }
}

function resetToCover() {
  gsap.set(bookCover, { rotateY: 0, scale: 1 });
  gsap.set(book, { opacity: 1 });
  showScreen(screenCover);
  book.addEventListener('click', playOpening);
}

book.addEventListener('click', playOpening);
book.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    playOpening();
  }
});
btnContinue.addEventListener('click', () => goToReveal());
btnReplay.addEventListener('click', resetToCover);
btnRead.addEventListener('click', () => pdfReader.open());

showScreen(screenCover);

/* ===================== Lettore PDF interattivo ===================== */

const PDF_URL = 'assets/pdf/diario.pdf';

const pdfReader = (() => {
  const overlay = document.getElementById('pdf-reader');
  const stage = document.getElementById('pdf-stage');
  const wrap = document.getElementById('pdf-page-wrap');
  const leafA = document.getElementById('pdf-leaf-a');
  const leafB = document.getElementById('pdf-leaf-b');
  const zoomWrapA = document.getElementById('pdf-zoom-a');
  const zoomWrapB = document.getElementById('pdf-zoom-b');
  const canvasA = document.getElementById('pdf-canvas-a');
  const canvasB = document.getElementById('pdf-canvas-b');
  const loading = document.getElementById('pdf-loading');
  const zoomHint = document.getElementById('pdf-zoom-hint');
  const btnPrev = document.getElementById('pdf-prev');
  const btnNext = document.getElementById('pdf-next');
  const btnClose = document.getElementById('pdf-close');
  const indicator = document.getElementById('pdf-page-indicator');

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3.2;
  const DOUBLE_TAP_ZOOM = 2.3;

  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 0;
  let activeLeaf = leafA;
  let activeCanvas = canvasA;
  let idleLeaf = leafB;
  let idleCanvas = canvasB;
  let isBusy = false;

  let zoomScale = 1;
  let zoomX = 0;
  let zoomY = 0;

  function activeZoomWrap() {
    return activeLeaf === leafA ? zoomWrapA : zoomWrapB;
  }

  function applyZoom(withTransition) {
    const el = activeZoomWrap();
    el.style.transition = withTransition ? 'transform 0.25s ease-out' : 'none';
    el.style.transform = 'translate(' + zoomX + 'px, ' + zoomY + 'px) scale(' + zoomScale + ')';
  }

  function clampPan() {
    const maxX = Math.max(0, (wrap.clientWidth * (zoomScale - 1)) / 2);
    const maxY = Math.max(0, (wrap.clientHeight * (zoomScale - 1)) / 2);
    zoomX = Math.min(maxX, Math.max(-maxX, zoomX));
    zoomY = Math.min(maxY, Math.max(-maxY, zoomY));
  }

  function resetZoom(withTransition) {
    zoomScale = 1;
    zoomX = 0;
    zoomY = 0;
    applyZoom(!!withTransition);
  }

  async function renderPageToCanvas(num, canvas) {
    const page = await pdfDoc.getPage(num);
    const baseViewport = page.getViewport({ scale: 1 });

    const availW = wrap.clientWidth || 320;
    const availH = wrap.clientHeight || 480;
    const fitScale = Math.min(availW / baseViewport.width, availH / baseViewport.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const renderScale = fitScale * dpr;

    const viewport = page.getViewport({ scale: renderScale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = (viewport.width / dpr) + 'px';
    canvas.style.height = (viewport.height / dpr) + 'px';

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
  }

  function updateIndicator() {
    indicator.textContent = currentPage + ' / ' + totalPages;
    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= totalPages;
  }

  async function goTo(num, direction) {
    if (isBusy || !pdfDoc || num < 1 || num > totalPages || num === currentPage) return;
    isBusy = true;
    btnPrev.disabled = true;
    btnNext.disabled = true;

    await renderPageToCanvas(num, idleCanvas);

    const outgoing = activeLeaf;
    const incoming = idleLeaf;
    const incomingZoomWrap = incoming === leafA ? zoomWrapA : zoomWrapB;
    incomingZoomWrap.style.transition = 'none';
    incomingZoomWrap.style.transform = 'translate(0px, 0px) scale(1)';

    const hingeOrigin = direction === 'next' ? 'left center' : 'right center';
    const outRotation = direction === 'next' ? -150 : 150;

    gsap.set(incoming, { rotateY: 0, transformOrigin: hingeOrigin, zIndex: 1 });
    gsap.set(outgoing, { zIndex: 2 });

    await gsap.timeline()
      .to(outgoing, {
        duration: 0.85,
        rotateY: outRotation,
        transformOrigin: hingeOrigin,
        ease: 'power2.inOut'
      })
      .call(() => {
        gsap.set(outgoing, { rotateY: 0, zIndex: 0 });
      });

    activeLeaf = incoming;
    activeCanvas = incoming === leafA ? canvasA : canvasB;
    idleLeaf = outgoing;
    idleCanvas = idleLeaf === leafA ? canvasA : canvasB;

    zoomScale = 1;
    zoomX = 0;
    zoomY = 0;

    currentPage = num;
    updateIndicator();
    isBusy = false;
    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= totalPages;
  }

  async function open() {
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (!pdfDoc) {
      loading.classList.remove('hidden');
      try {
        pdfDoc = await pdfjsLib.getDocument(PDF_URL).promise;
        totalPages = pdfDoc.numPages;
        currentPage = 1;
        await renderPageToCanvas(1, canvasA);
        gsap.set(leafA, { rotateY: 0, zIndex: 2 });
        gsap.set(leafB, { rotateY: 0, zIndex: 1 });
        resetZoom(false);
        updateIndicator();
        zoomHint.classList.add('visible');
        setTimeout(() => zoomHint.classList.remove('visible'), 3200);
      } catch (err) {
        loading.textContent = 'Impossibile caricare il diario.';
        return;
      } finally {
        loading.classList.add('hidden');
      }
    }
  }

  function close() {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    resetZoom(false);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (overlay.classList.contains('hidden') || !pdfDoc || isBusy) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resetZoom(false);
      renderPageToCanvas(currentPage, activeCanvas);
    }, 200);
  });

  /* ---- Gesti: swipe per cambiare pagina, pinch/doppio tocco per zoomare ---- */

  function dist(t0, t1) {
    return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
  }

  let touchMode = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let lastTapTime = 0;
  let lastTapPos = null;

  function handleTap(x, y) {
    const now = Date.now();
    if (lastTapPos && now - lastTapTime < 320 && Math.hypot(x - lastTapPos.x, y - lastTapPos.y) < 30) {
      lastTapTime = 0;
      lastTapPos = null;
      toggleZoomAt(x, y);
    } else {
      lastTapTime = now;
      lastTapPos = { x, y };
    }
  }

  function toggleZoomAt(x, y) {
    if (zoomScale > 1.02) {
      resetZoom(true);
    } else {
      const rect = wrap.getBoundingClientRect();
      const offsetX = (rect.left + rect.width / 2) - x;
      const offsetY = (rect.top + rect.height / 2) - y;
      zoomScale = DOUBLE_TAP_ZOOM;
      zoomX = offsetX * (DOUBLE_TAP_ZOOM - 1);
      zoomY = offsetY * (DOUBLE_TAP_ZOOM - 1);
      clampPan();
      applyZoom(true);
    }
  }

  stage.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      touchMode = 'pinch';
      pinchStartDist = dist(e.touches[0], e.touches[1]);
      pinchStartScale = zoomScale;
      panOriginX = zoomX;
      panOriginY = zoomY;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      if (zoomScale > 1.02) {
        touchMode = 'pan';
        panOriginX = zoomX;
        panOriginY = zoomY;
      } else {
        touchMode = 'swipe';
      }
    }
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    if (touchMode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      zoomScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartScale * (d / pinchStartDist)));
      clampPan();
      applyZoom(false);
    } else if (touchMode === 'pan' && e.touches.length === 1) {
      e.preventDefault();
      const t = e.touches[0];
      zoomX = panOriginX + (t.clientX - touchStartX);
      zoomY = panOriginY + (t.clientY - touchStartY);
      clampPan();
      applyZoom(false);
    }
  }, { passive: false });

  stage.addEventListener('touchend', (e) => {
    if (touchMode === 'swipe') {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) goTo(currentPage + 1, 'next');
        else goTo(currentPage - 1, 'prev');
      } else {
        handleTap(t.clientX, t.clientY);
      }
    } else if (touchMode === 'pinch' || touchMode === 'pan') {
      if (zoomScale <= 1.02) resetZoom(true);
    }
    touchMode = null;
  }, { passive: true });

  wrap.addEventListener('dblclick', (e) => {
    toggleZoomAt(e.clientX, e.clientY);
  });

  document.addEventListener('keydown', (e) => {
    if (overlay.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') goTo(currentPage + 1, 'next');
    if (e.key === 'ArrowLeft') goTo(currentPage - 1, 'prev');
    if (e.key === 'Escape') close();
  });

  btnNext.addEventListener('click', () => goTo(currentPage + 1, 'next'));
  btnPrev.addEventListener('click', () => goTo(currentPage - 1, 'prev'));
  btnClose.addEventListener('click', close);

  return { open, close };
})();
