/* Drag-to-swipe for cards (touch and mouse via pointer events). Shows direction cues while dragging.
   Smoothness: transform/opacity only, one rAF-batched write per frame, no layout reads in move handlers,
   will-change only while a finger is down, touch-action: none on the card (also set in CSS). */
const Swipe = {
  /**
   * card: the element to drag. stage: ancestor receiving --cue-<dir> (0..1) variables for the cue labels.
   * options: {dirs: ['left','right','up','down'], threshold, onCommit(dir, {restore})}
   */
  attach(card, stage, { dirs, threshold = 90, onCommit }) {
    let start = null;
    let delta = { x: 0, y: 0 };
    let frame = 0;
    const cue = (active, strength) => ['left', 'right', 'up', 'down'].forEach((d) => stage.style.setProperty(`--cue-${d}`, d === active ? strength : 0));

    const directionOf = (dx, dy) => {
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      const dir = horizontal ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      return dirs.includes(dir) ? dir : null;
    };

    const paint = () => {
      frame = 0;
      const { x, y } = delta;
      card.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${x / 25}deg)`;
      const dir = directionOf(x, y);
      cue(dir, dir ? Math.min(1, Math.hypot(x, y) / threshold) : 0);
    };

    const settle = () => { cancelAnimationFrame(frame); frame = 0; card.style.willChange = ''; };

    const restore = () => {
      settle();
      card.style.transition = 'transform .25s ease';
      card.style.transform = '';
      card.style.opacity = '';
      cue(null, 0);
    };

    const fling = (dir) => {
      settle();
      const far = { left: [-520, 0], right: [520, 0], up: [0, -620], down: [0, 620] }[dir];
      card.style.transition = 'transform .28s ease-in, opacity .28s';
      card.style.transform = `translate3d(${far[0]}px, ${far[1]}px, 0) rotate(${far[0] / 25}deg)`;
      card.style.opacity = '0';
      cue(dir, 1);
      setTimeout(() => {
        try { onCommit(dir, { restore }); } catch (error) { U.fail('That swipe could not be completed.', error); restore(); }
      }, 260);
    };

    card.style.touchAction = 'none';
    card.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button, a') || event.button !== 0) return;
      start = { x: event.clientX, y: event.clientY };
      delta = { x: 0, y: 0 };
      card.style.transition = 'none';
      card.style.willChange = 'transform';
      try { card.setPointerCapture(event.pointerId); } catch (error) { U.warn('Pointer capture unavailable; drag still works.', error); }
    });
    card.addEventListener('pointermove', (event) => {
      if (!start) return;
      delta = { x: event.clientX - start.x, y: event.clientY - start.y };
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });
    const end = (event) => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      start = null;
      const dir = directionOf(dx, dy);
      if (dir && Math.hypot(dx, dy) >= threshold) fling(dir); else restore();
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', () => { start = null; restore(); });
    return { fling };
  },
};
