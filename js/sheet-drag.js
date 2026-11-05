/* Drag a phone bottom sheet down by its handle to dismiss it. Pointer events + transform, rAF-batched, no layout reads while moving. */
const SheetDrag = {
  DISMISS_PX: 90,

  attach(sheet, onDismiss) {
    const grabber = U.$('.sheet-grabber', sheet);
    if (!grabber) { U.warn('Bottom sheet has no handle; drag-to-dismiss is off.'); return; }
    let startY = null;
    let offset = 0;
    let frame = 0;
    const paint = () => { frame = 0; sheet.style.transform = `translate3d(0, ${offset}px, 0)`; };

    grabber.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      startY = event.clientY;
      offset = 0;
      sheet.style.transition = 'none';
      sheet.style.willChange = 'transform';
      try { grabber.setPointerCapture(event.pointerId); } catch (error) { U.warn('Pointer capture unavailable; sheet drag still works.', error); }
    });
    grabber.addEventListener('pointermove', (event) => {
      if (startY === null) return;
      offset = Math.max(0, event.clientY - startY);
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });
    const end = (cancelled) => {
      if (startY === null) return;
      startY = null;
      cancelAnimationFrame(frame); frame = 0;
      sheet.style.willChange = '';
      sheet.style.transition = 'transform .2s ease-out';
      if (!cancelled && offset >= SheetDrag.DISMISS_PX) {
        sheet.style.transform = 'translate3d(0, 100%, 0)';
        setTimeout(onDismiss, 180);
      } else {
        sheet.style.transform = '';
      }
    };
    grabber.addEventListener('pointerup', () => end(false));
    grabber.addEventListener('pointercancel', () => end(true));
  },
};
