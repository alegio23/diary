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

showScreen(screenCover);
