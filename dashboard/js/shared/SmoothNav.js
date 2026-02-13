/**
 * SmoothNav.js - Smooth mouse-driven page navigation
 * Adds click-and-drag panning with kinetic deceleration to scrollable areas.
 * Middle-click or hold-and-drag to pan the main content area.
 * Mouse wheel enhanced with smooth easing.
 */

export class SmoothNav {
    /**
     * Attach smooth navigation to a scrollable element
     * @param {HTMLElement} el - The scrollable container (.dash-main)
     * @param {object} opts - { friction, sensitivity, wheelMultiplier }
     */
    static attach(el, opts = {}) {
        const friction = opts.friction || 0.92;
        const sensitivity = opts.sensitivity || 1.5;
        const wheelMultiplier = opts.wheelMultiplier || 1.2;

        let isDragging = false;
        let startY = 0;
        let startX = 0;
        let scrollTop = 0;
        let scrollLeft = 0;
        let velocityY = 0;
        let lastY = 0;
        let lastTime = 0;
        let animFrame = null;

        // --- Middle-click or Shift+click drag to pan ---
        el.addEventListener('mousedown', (e) => {
            // Middle button (1) or shift+left-click
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                e.preventDefault();
                isDragging = true;
                startY = e.clientY;
                startX = e.clientX;
                scrollTop = el.scrollTop;
                scrollLeft = el.scrollLeft;
                lastY = e.clientY;
                lastTime = Date.now();
                velocityY = 0;
                el.classList.add('dash-grabbing');

                if (animFrame) {
                    cancelAnimationFrame(animFrame);
                    animFrame = null;
                }
            }
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const dy = (e.clientY - startY) * sensitivity;
            const dx = (e.clientX - startX) * sensitivity;

            el.scrollTop = scrollTop - dy;
            if (el.scrollWidth > el.clientWidth) {
                el.scrollLeft = scrollLeft - dx;
            }

            // Track velocity for kinetic scroll
            const now = Date.now();
            const dt = now - lastTime;
            if (dt > 0) {
                velocityY = (lastY - e.clientY) / dt * 16; // normalize to ~60fps
            }
            lastY = e.clientY;
            lastTime = now;
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            el.classList.remove('dash-grabbing');

            // Kinetic scroll - apply remaining velocity
            if (Math.abs(velocityY) > 0.5) {
                const kineticScroll = () => {
                    velocityY *= friction;
                    if (Math.abs(velocityY) < 0.3) return;
                    el.scrollTop += velocityY;
                    animFrame = requestAnimationFrame(kineticScroll);
                };
                animFrame = requestAnimationFrame(kineticScroll);
            }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // --- Enhanced mouse wheel with smooth easing ---
        let wheelTarget = el.scrollTop;
        let wheelAnimFrame = null;

        el.addEventListener('wheel', (e) => {
            // Only enhance vertical scroll on the main panel
            if (el.scrollHeight <= el.clientHeight) return;

            e.preventDefault();

            const delta = e.deltaY * wheelMultiplier;
            wheelTarget = Math.max(0,
                Math.min(el.scrollHeight - el.clientHeight, (wheelAnimFrame ? wheelTarget : el.scrollTop) + delta)
            );

            if (wheelAnimFrame) cancelAnimationFrame(wheelAnimFrame);

            const smoothWheel = () => {
                const diff = wheelTarget - el.scrollTop;
                if (Math.abs(diff) < 0.5) {
                    el.scrollTop = wheelTarget;
                    wheelAnimFrame = null;
                    return;
                }
                el.scrollTop += diff * 0.15;
                wheelAnimFrame = requestAnimationFrame(smoothWheel);
            };
            wheelAnimFrame = requestAnimationFrame(smoothWheel);
        }, { passive: false });

        // --- Scroll-to-top on route change ---
        const scrollToTop = () => {
            wheelTarget = 0;
            el.scrollTo({ top: 0, behavior: 'smooth' });
        };

        // Return cleanup function + scrollToTop utility
        return {
            scrollToTop,
            destroy() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (animFrame) cancelAnimationFrame(animFrame);
                if (wheelAnimFrame) cancelAnimationFrame(wheelAnimFrame);
            }
        };
    }
}
