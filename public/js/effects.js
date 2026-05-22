/**
 * Premium Effects JS for Casa Decor
 */

document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Scroll Reveal Animation ---
    const revealElements = document.querySelectorAll('[data-reveal]');
    let revealObserver = null;

    if (reduceMotion) {
        revealElements.forEach(el => el.classList.add('revealed'));
    } else if (revealElements.length) {
        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    entry.target.style.willChange = 'auto';
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.08,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    }

    // --- Subtle Hero Parallax ---
    const heroImage = document.querySelector('.hero .hbg');
    if (heroImage && !reduceMotion && window.innerWidth > 768) {
        let ticking = false;
        const updateParallax = () => {
            heroImage.style.transform = `translate3d(0, ${window.scrollY * 0.18}px, 0)`;
            ticking = false;
        };
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(updateParallax);
                ticking = true;
            }
        }, { passive: true });
    }

    // --- Page Transitions ---
    const overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    document.body.appendChild(overlay);

    // Handle back/forward cache
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            overlay.classList.remove('active');
        }
    });

    // Initialize reveal on elements added dynamically (if any)
    window.refreshReveal = () => {
        const dynamicElements = document.querySelectorAll('[data-reveal]:not(.revealed)');
        if (reduceMotion || !revealObserver) {
            dynamicElements.forEach(el => el.classList.add('revealed'));
            return;
        }
        dynamicElements.forEach(el => revealObserver.observe(el));
    };
});
