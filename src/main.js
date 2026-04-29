import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createClient } from '@supabase/supabase-js';

gsap.registerPlugin(ScrollTrigger);

// ───── Supabase client ─────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

// ───── Smooth Scroll (Lenis) ─────
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

let lenis = null;

if (!isTouchDevice) {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// On touch devices, disable Lenis but keep native scroll. ignoreMobileResize
// prevents address-bar show/hide from triggering ScrollTrigger refreshes.
if (isTouchDevice) {
  ScrollTrigger.config({ ignoreMobileResize: true });
}

// ───── Heading text swap animation ─────
// "Dear Darla" stays put; the single trailing tail span fades out, has its
// content swapped, and fades back in. Using one inline span (instead of two
// stacked spans) means wrapped lines of the reveal text flow back to the
// parent's left edge — i.e. they line up under "Dear Darla".
const headingTail = document.querySelector('.heading-anim__tail');
const revealTemplate = document.getElementById('heading-tail-reveal');

if (headingTail && revealTemplate) {
  const swapTl = gsap.timeline({ delay: 2 });
  swapTl
    .to(headingTail, {
      opacity: 0,
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => {
        headingTail.innerHTML = revealTemplate.innerHTML;
      },
    })
    .to(headingTail, {
      opacity: 1,
      duration: 0.8,
      ease: 'power2.inOut',
    });
}

// ───── Scroll-driven envelope animation ─────
const envelopeSection = document.querySelector('.envelope-section');

// On mobile, lock section height to window.innerHeight so it matches
// what ScrollTrigger uses for its calculations. This prevents the
// mismatch between CSS vh (which includes browser chrome) and the
// actual visible viewport that ScrollTrigger measures.
if (isTouchDevice && envelopeSection) {
  envelopeSection.style.height = `${window.innerHeight}px`;
  window.scrollTo(0, 0);
}
const envelopeHeading = document.querySelector('.envelope-heading');
const envelopeWrapper = document.querySelector('.envelope-wrapper');
const envelopeClosed = document.querySelector('.envelope__closed');
const envelopeBack = document.querySelector('.envelope__back');
const envelopeFront = document.querySelector('.envelope__front');
const card = document.querySelector('.card');
const cardInner = document.querySelector('.card__inner');

// Set card initial position
gsap.set(card, { xPercent: -50, opacity: 0, visibility: 'hidden' });

// Helper getters so ScrollTrigger can re-evaluate responsive values on refresh
const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches;
const getEnvelopeRestTop = () => (isMobileViewport() ? '62%' : '74%');
const getEnvelopeRestY = () => '0%';
const getCardScaleUp = () => (isMobileViewport() ? 1.2 : 1.8);
const getCardSlideUpBottom = () => (isMobileViewport() ? '80%' : '95%');
const getCardSlideUpYPercent = () => (isMobileViewport() ? 0 : 0);

// Entrance animation: envelope slides up from below
gsap.fromTo(envelopeWrapper,
  { top: '110%' },
  { top: getEnvelopeRestTop(), y: getEnvelopeRestY(), duration: 1.2, ease: 'power2.out', delay: 0.3 }
);

let hasClampedHeroMomentum = false;

const scrollTl = gsap.timeline({
  scrollTrigger: {
    trigger: envelopeSection,
    start: 'top top',
    end: '+=500%',
    pin: true,
    scrub: isTouchDevice ? 0.2 : 1,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    snap: {
      snapTo: [0, 0.267, 0.333, 0.6, 0.8, 1],
      duration: { min: 0.3, max: 0.8 },
      ease: 'power2.inOut',
    },
    onUpdate: (self) => {
      if (self.progress > 0.98 && !hasClampedHeroMomentum) {
        hasClampedHeroMomentum = true;
        if (lenis) lenis.scrollTo(window.scrollY, { immediate: true });
      } else if (self.progress < 0.9 && hasClampedHeroMomentum) {
        hasClampedHeroMomentum = false;
      }
    },
  },
});

// Phase 1: Envelope rises from bottom to center, heading fades up and out.
scrollTl
  .fromTo(envelopeWrapper, {
    top: () => getEnvelopeRestTop(),
    y: () => getEnvelopeRestY(),
  }, {
    top: () => '50%',
    y: '-50%',
    duration: 2,
    ease: 'none',
  })
  .to(envelopeHeading, {
    opacity: 0,
    y: -80,
    duration: 1,
    ease: 'none',
  }, 0)

  // Phase 2: Envelope opens (swap closed → open)
  .to(envelopeWrapper, {
    scale: 1.05,
    duration: 0.3,
    ease: 'none',
    onUpdate: function () {
      if (this.progress() > 0.5) {
        envelopeClosed.style.display = 'none';
        envelopeBack.style.display = 'block';
        envelopeFront.style.display = 'block';
        gsap.set(card, { opacity: 1, visibility: 'visible' });
      } else {
        envelopeClosed.style.display = 'block';
        envelopeBack.style.display = 'none';
        envelopeFront.style.display = 'none';
        gsap.set(card, { opacity: 0, visibility: 'hidden' });
      }
    },
  })
  .to(envelopeWrapper, {
    scale: 1,
    duration: 0.2,
    ease: 'none',
  })

  // Phase 3: Card slides up out of envelope (mobile centers; desktop rises higher)
  .to(card, {
    bottom: () => getCardSlideUpBottom(),
    yPercent: () => getCardSlideUpYPercent(),
    duration: 2,
    ease: 'none',
  })

  // Phase 4: Card scales up and covers the envelope
  .to(card, {
    scale: () => getCardScaleUp(),
    bottom: '50%',
    xPercent: -50,
    yPercent: 50,
    duration: 1.5,
    ease: 'none',
    zIndex: 10,
  })

  // Phase 5: Card flips to show message
  .to(cardInner, {
    rotateY: 180,
    duration: 1.5,
    ease: 'none',
  });

// ───── Nav color change on dark/colored sections ─────
const nav = document.querySelector('.nav');
const navLinks = nav.querySelectorAll('.nav__links a');
const navLogoImg = nav.querySelector('.nav__logo-img');
const coloredSections = document.querySelectorAll('.about');

function setNavLight() {
  gsap.to(navLinks, { color: '#ffffff', duration: 0.3 });
  gsap.to(navLogoImg, { filter: 'brightness(0) invert(1)', duration: 0.3 });
}

function setNavDark() {
  gsap.to(navLinks, { color: '#1a1a1a', duration: 0.3 });
  gsap.to(navLogoImg, { filter: 'none', duration: 0.3 });
}

coloredSections.forEach((section) => {
  ScrollTrigger.create({
    trigger: section,
    start: 'top 100px',
    end: 'bottom 100px',
    onEnter: setNavLight,
    onLeave: setNavDark,
    onEnterBack: setNavLight,
    onLeaveBack: setNavDark,
  });
});

// ───── Box hover + trinkets ─────
const boxHover = document.querySelector('.box-hover');
const boxLid = document.querySelector('.box-hover__lid');
const trinkets = document.querySelectorAll('.trinket');
const closeAllTrinkets = () => {
  trinkets.forEach((t) => {
    if (t.classList.contains('is-open')) {
      t.classList.remove('is-open');
      t.style.zIndex = '';
    }
  });
};

if (boxHover) {
  // Preload all trinket images
  trinkets.forEach((trinket) => {
    trinket.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
      if (img.decode) img.decode().catch(() => { });
    });
    // Populate bubble text
    const bubble = trinket.querySelector('.trinket__bubble p');
    if (bubble) bubble.textContent = trinket.getAttribute('data-note');
  });

  let isOpen = true; // trinkets always visible for now
  gsap.set(boxLid, { opacity: 0 }); // hide lid for now

  // Mobile detection + vertical cascade positions (matches reference image)
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const mobilePositions = {
    '5': { x: '-35%', y: '-290%', r: -20 },   // Top-left: Bombay Dreams
    '2': { x: '40%', y: '-270%', r: 10 },   // Top-right: Santra bottle
    '4': { x: '5%', y: '-225%', r: -5 },   // Mid-left: Bombay coaster
    '3': { x: '40%', y: '-175%', r: 5 },    // Mid-right: Yellow notebook
    '1': { x: '-40%', y: '-195%', r: -12 },  // Left: Christmas notebook
    '7': { x: '5%', y: '-115%', r: -20 },   // Center-right: Yam Sai
    '6': { x: '-35%', y: '-70%', r: -8 },   // Lower-left: Tiger cards
    '8': { x: '40%', y: '-75%', r: 35 },   // Lower-right: BOJEE menu
  };

  // Helper: get position for a trinket (mobile or desktop)
  function getTrinketPos(trinket) {
    const id = trinket.getAttribute('data-id');
    if (isMobile && mobilePositions[id]) {
      return mobilePositions[id];
    }
    return {
      x: trinket.getAttribute('data-x'),
      y: trinket.getAttribute('data-y'),
      r: parseFloat(trinket.getAttribute('data-r')),
    };
  }

  // Set initial state — show all trinkets at their scatter positions
  trinkets.forEach((trinket) => {
    const { x, y, r } = getTrinketPos(trinket);
    gsap.set(trinket, { xPercent: -50, yPercent: -50, x, y, rotation: r, scale: 1, opacity: 1, force3D: true });

    // Counter-rotate bubble to keep text perfectly horizontal (x-axis)
    const bubble = trinket.querySelector('.trinket__bubble');
    if (bubble) {
      gsap.set(bubble, { xPercent: -50, rotation: -r });
    }

    trinket.style.pointerEvents = 'auto';
  });

  const openBox = () => {
    if (isOpen) return;
    isOpen = true;

    gsap.killTweensOf(trinkets);
    gsap.killTweensOf(boxLid);

    const tl = gsap.timeline();

    // Phase 1: Lid slides right and fades away
    tl.to(boxLid, {
      x: '100%',
      opacity: 0,
      duration: 0.6,
      ease: 'power2.inOut',
      force3D: true,
    });

    // Phase 2: Trinkets scatter to their positions
    trinkets.forEach((trinket, i) => {
      const { x, y, r } = getTrinketPos(trinket);

      tl.to(trinket, {
        x: x,
        y: y,
        rotation: r,
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: 'back.out(1.2)',
        force3D: true,
        onStart: () => { trinket.style.pointerEvents = 'auto'; },
      }, 0.5 + i * 0.04);
    });
  };

  const closeBox = () => {
    if (!isOpen) return;
    isOpen = false;
    closeAllTrinkets();

    gsap.killTweensOf(trinkets);
    gsap.killTweensOf(boxLid);

    const tl = gsap.timeline();

    // Phase 1: Trinkets retract to center
    tl.to(trinkets, {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 0,
      opacity: 0,
      duration: 0.35,
      stagger: 0.02,
      ease: 'power2.inOut',
      force3D: true,
      onComplete: function () {
        this.targets().forEach((t) => { t.style.pointerEvents = 'none'; });
      },
    });

    // Phase 2: Lid slides back in
    tl.to(boxLid, {
      x: 0,
      opacity: 1,
      duration: 0.5,
      ease: 'power2.inOut',
      force3D: true,
    });
  };

  let closeTimer = null;

  // Hover disabled for now
  // boxHover.addEventListener('mouseenter', () => {
  //   if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  //   openBox();
  // });
  // boxHover.addEventListener('mouseleave', () => {
  //   closeTimer = setTimeout(() => { closeBox(); closeTimer = null; }, 200);
  // });

  // Helper to check pixel transparency
  function isClickOnTransparentPixel(e, img) {
    if (e.offsetX === undefined || e.offsetY === undefined) return false;
    try {
      if (!img.__hitCanvas) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 1;
        canvas.height = img.naturalHeight || img.height || 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        img.__hitCanvas = ctx;
      }
      const ctx = img.__hitCanvas;
      const scaleX = ctx.canvas.width / img.offsetWidth;
      const scaleY = ctx.canvas.height / img.offsetHeight;
      const x = Math.floor(e.offsetX * scaleX);
      const y = Math.floor(e.offsetY * scaleY);
      if (x < 0 || y < 0 || x >= ctx.canvas.width || y >= ctx.canvas.height) return true;
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      return pixel[3] < 10;
    } catch (err) {
      return false; // Fallback
    }
  }

  // Nudge the bubble back into the viewport after a trinket opens. We push
  // the offset through gsap.set (preserving the existing xPercent/rotation
  // counter-rotate) because a CSS transform on .trinket__bubble would be
  // overwritten by GSAP's own transform on each .set() call.
  // Shrink the bubble to its actual longest rendered line so short notes
  // don't sit in a needlessly wide pill.
  function tightenBubbleWidth(bubble) {
    const p = bubble.querySelector('p');
    if (!p) return;
    bubble.style.width = '';
    const range = document.createRange();
    range.selectNodeContents(p);
    const rects = Array.from(range.getClientRects());
    if (!rects.length) return;
    const widest = Math.max(...rects.map((r) => r.width));
    const cs = getComputedStyle(bubble);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    bubble.style.width = `${Math.ceil(widest + padX)}px`;
  }

  function nudgeBubbleIntoView(trinket) {
    const bubble = trinket.querySelector('.trinket__bubble');
    if (!bubble) return;
    gsap.set(bubble, { x: 0, y: 0 });
    requestAnimationFrame(() => {
      tightenBubbleWidth(bubble);
      const r = bubble.getBoundingClientRect();
      const margin = 24;
      let dx = 0, dy = 0;
      if (r.left < margin) dx = margin - r.left;
      else if (r.right > window.innerWidth - margin) dx = window.innerWidth - margin - r.right;
      if (r.top < margin) dy = margin - r.top;
      else if (r.bottom > window.innerHeight - margin) dy = window.innerHeight - margin - r.bottom;
      gsap.set(bubble, { x: dx, y: dy });
    });
  }

  // Delegated click handler: pixel-test all trinkets in z-order and open
  // the first one whose visible image is opaque at the tap point. Attached
  // at the section level (not .box-hover) because trinkets visually extend
  // far outside the box's bounding rect — taps on those would otherwise
  // miss the .box-hover hit area entirely.
  const trinketScope = document.querySelector('.about') || document;
  trinketScope.addEventListener('click', (e) => {
    if (!isOpen) return;

    const ordered = Array.from(trinkets).sort((a, b) => {
      const za = parseInt(getComputedStyle(a).zIndex, 10) || 0;
      const zb = parseInt(getComputedStyle(b).zIndex, 10) || 0;
      if (zb !== za) return zb - za;
      return Array.prototype.indexOf.call(trinkets, b)
        - Array.prototype.indexOf.call(trinkets, a);
    });

    const hit = ordered.find((trinket) => {
      const img = trinket.classList.contains('is-open')
        ? trinket.querySelector('.trinket__open')
        : trinket.querySelector('.trinket__closed');
      if (!img) return false;
      const rect = img.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom) return false;

      // For rotated trinkets (e.g. id 8 at 25°) the rect is the AABB of the
      // rotated image. Inverse-rotate the click around the image center so
      // we sample the correct pixel in the un-rotated image space.
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rDeg = parseFloat(gsap.getProperty(trinket, 'rotation')) || 0;
      const rad = -rDeg * Math.PI / 180;
      const lx = (e.clientX - cx) * Math.cos(rad) - (e.clientY - cy) * Math.sin(rad);
      const ly = (e.clientX - cx) * Math.sin(rad) + (e.clientY - cy) * Math.cos(rad);
      const ox = lx + img.offsetWidth / 2;
      const oy = ly + img.offsetHeight / 2;
      if (ox < 0 || ox > img.offsetWidth || oy < 0 || oy > img.offsetHeight) return false;

      return !isClickOnTransparentPixel({ offsetX: ox, offsetY: oy }, img);
    });

    // Tap outside any trinket → close any open one.
    if (!hit) {
      closeAllTrinkets();
      return;
    }

    if (hit.classList.contains('is-open')) {
      hit.classList.remove('is-open');
      hit.style.zIndex = '';
    } else {
      closeAllTrinkets();
      hit.classList.add('is-open');
      hit.style.zIndex = '50';
      nudgeBubbleIntoView(hit);
    }
  });
}

// ───── Scroll-triggered reveals ─────
const reveals = document.querySelectorAll('.reveal');

reveals.forEach((el) => {
  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    onEnter: () => el.classList.add('is-visible'),
  });
});

// ───── Parallax on about image ─────
const aboutImage = document.querySelector('.about__image-placeholder');
if (aboutImage) {
  gsap.to(aboutImage, {
    yPercent: -15,
    ease: 'none',
    scrollTrigger: {
      trigger: aboutImage,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
}

// ───── Postcard entrance ─────
const postcard = document.querySelector('.postcard__paper');
if (postcard) {
  gsap.from(postcard, {
    y: 60,
    opacity: 0,
    rotation: 4,
    duration: 1.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: postcard,
      start: 'top 85%',
    },
  });
}

// ───── Postcard signup → Supabase ─────
const signupForm = document.querySelector('.postcard__form');
if (signupForm) {
  const input = signupForm.querySelector('input[type="email"]');
  const button = signupForm.querySelector('.postcard__send');
  const sendText = signupForm.querySelector('.postcard__send-text');
  const postcardPaper = document.querySelector('.postcard__paper');

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email) return;

    button.disabled = true;
    sendText.textContent = 'Sending…';
    signupForm.classList.remove('is-success', 'is-error');

    const { error } = await supabase
      .from('subscribers')
      .insert({ email });

    // 23505 = unique violation; treat already-subscribed as success
    if (!error || error.code === '23505') {
      signupForm.classList.add('is-success');
      sendText.textContent = 'In the mail';
      input.value = '';
      input.placeholder = 'see you soon ✉';
      launchPaperPlane(button, postcardPaper);
    } else {
      console.error(error);
      signupForm.classList.add('is-error');
      sendText.textContent = 'Try again';
      button.disabled = false;
    }
  });
}

// ───── Paper plane launch animation ─────
function launchPaperPlane(originEl, postcardEl) {
  const rect = originEl.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;

  // Postcard reaction — quick recoil + settle
  if (postcardEl) {
    gsap.timeline()
      .to(postcardEl, { y: 6, rotation: -2.4, duration: 0.18, ease: 'power2.out' })
      .to(postcardEl, { y: 0, rotation: -1.2, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
  }

  // Plane element
  const plane = document.createElement('div');
  plane.className = 'paper-plane';
  plane.innerHTML = `
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="planeShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#1a1a1a" flood-opacity="0.25"/>
        </filter>
      </defs>
      <g filter="url(#planeShadow)">
        <path d="M2 30 L62 6 L52 58 Z" fill="#fbf6ee" stroke="#1a1a1a" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M2 30 L32 38 L52 58" fill="#ece6df" stroke="#1a1a1a" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M32 38 L62 6" fill="none" stroke="#1a1a1a" stroke-width="1" stroke-linejoin="round" stroke-dasharray="2 2" opacity="0.6"/>
      </g>
    </svg>
  `;
  document.body.appendChild(plane);

  gsap.set(plane, {
    position: 'fixed',
    left: startX,
    top: startY,
    xPercent: -50,
    yPercent: -50,
    rotation: 0,
    scale: 0.4,
    opacity: 0,
    zIndex: 9999,
    pointerEvents: 'none',
  });

  // Trail emitter
  const trailInterval = setInterval(() => {
    const r = plane.getBoundingClientRect();
    spawnTrailDot(r.left + r.width / 2, r.top + r.height / 2);
  }, 55);

  // Flight: pop, then arc up and to the right
  const tl = gsap.timeline({
    onComplete: () => {
      clearInterval(trailInterval);
      plane.remove();
    },
  });

  const flightX = window.innerWidth - startX + 160;
  const flightY = -startY - 120;

  tl.to(plane, {
    opacity: 1,
    scale: 1,
    rotation: -8,
    duration: 0.32,
    ease: 'back.out(2)',
  })
    .to(plane, {
      duration: 0.18,
      scale: 1.05,
      rotation: -14,
      ease: 'power2.out',
    })
    .to(plane, {
      duration: 1.7,
      x: flightX,
      y: flightY,
      rotation: -42,
      scale: 0.28,
      ease: 'power2.in',
    });
}

function spawnTrailDot(x, y) {
  const dot = document.createElement('span');
  dot.className = 'paper-plane-trail';
  dot.style.left = x + 'px';
  dot.style.top = y + 'px';
  document.body.appendChild(dot);
  gsap.fromTo(
    dot,
    { scale: 1, opacity: 0.7 },
    {
      scale: 0,
      opacity: 0,
      duration: 1.4,
      ease: 'power2.out',
      onComplete: () => dot.remove(),
    }
  );
}
