// The hat's little magic tricks, done with the browser's own Web Animations API.
// Both are skipped for people who asked their system for reduced motion.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const onScreen = (el) => {
  const r = el.getBoundingClientRect();
  return r.top >= 0 && r.bottom <= window.innerHeight;
};

// Smooth scrolling takes longer the further it goes: wait until the hat is on screen and the page
// has stood still for a moment (at most 3 seconds, so a page in a background tab never hangs here)
async function scrolledTo(el) {
  let last = -1;
  let still = 0;
  for (let i = 0; i < 60 && !(still >= 3 && onScreen(el)); i++) {
    await wait(50);
    still = window.scrollY === last ? still + 1 : 0;
    last = window.scrollY;
  }
}

// Where a book disappears into: the middle of the hat's opening, a third from its top
function hatMouth(hat) {
  const r = hat.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.32 };
}

function center(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function wobbleHat(hat) {
  hat.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.08, 0.92)" },
      { transform: "scale(0.96, 1.05)" },
      { transform: "scale(1)" },
    ],
    { duration: 500, easing: "ease-out", composite: "add" },
  );
}

// A copy of the cover leaves its card, arcs over and shrinks down into the hat
export async function flyIntoHat(coverEl, hat) {
  if (!coverEl || !hat || reducedMotion()) return;

  const start = coverEl.getBoundingClientRect();
  const flyer = coverEl.cloneNode(true);
  Object.assign(flyer.style, {
    position: "fixed",
    left: `${start.left}px`,
    top: `${start.top}px`,
    width: `${start.width}px`,
    height: `${start.height}px`,
    margin: "0",
    zIndex: "1000",
    pointerEvents: "none",
  });
  document.body.appendChild(flyer);

  // Bring the hat into view first if the list pushed it off screen
  if (!onScreen(hat)) {
    hat.scrollIntoView({ behavior: "smooth", block: "center" });
    await scrolledTo(hat);
  }

  const from = center(start);
  const to = hatMouth(hat);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const animation = flyer.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 120}px) scale(0.6) rotate(-200deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(-400deg)`, opacity: 0.9, offset: 0.9 },
      { transform: `translate(${dx}px, ${dy + 20}px) scale(0.05) rotate(-420deg)`, opacity: 0 },
    ],
    { duration: 1200, easing: "cubic-bezier(0.45, 0, 0.55, 1)" },
  );
  // Never wait longer than the animation should take, even if the browser pauses it in a hidden tab
  await Promise.race([animation.finished.catch(() => {}), wait(1600)]);
  flyer.remove();
  wobbleHat(hat);
}

// The picked book's cover grows out of the hat up to its place on the page
export async function riseFromHat(coverEl, hat) {
  if (!coverEl || !hat || reducedMotion()) return;

  const end = center(coverEl.getBoundingClientRect());
  const from = hatMouth(hat);
  wobbleHat(hat);
  const animation = coverEl.animate(
    [
      { transform: `translate(${from.x - end.x}px, ${from.y - end.y}px) scale(0.08) rotate(30deg)`, opacity: 0 },
      { transform: `translate(${(from.x - end.x) * 0.4}px, ${(from.y - end.y) * 0.5 - 60}px) scale(0.7) rotate(-8deg)`, opacity: 1, offset: 0.6 },
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
    ],
    { duration: 1100, easing: "cubic-bezier(0.2, 0.8, 0.3, 1.15)" },
  );
  // Never wait longer than the animation should take, even if the browser pauses it in a hidden tab
  await Promise.race([animation.finished.catch(() => {}), wait(1600)]);
}
