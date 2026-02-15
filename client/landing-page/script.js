document.addEventListener('DOMContentLoaded', () => {
    // Generic Reveal on Scroll
    const revealItems = document.querySelectorAll('.feature-row, .pillar-card, .section-header');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, { threshold: 0.1 });

    revealItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'all 0.8s cubic-bezier(0.165, 0.84, 0.44, 1)';
        revealObserver.observe(item);
    });

    // Animate bars when in view
    const bars = document.querySelectorAll('.bar');
    const barObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const height = bar.getAttribute('data-height') || bar.style.height;
                bar.style.height = '0';
                setTimeout(() => {
                    bar.style.height = height;
                }, 100);
            }
        });
    }, { threshold: 0.5 });

    bars.forEach(bar => barObserver.observe(bar));

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.style.boxShadow = '0 5px 20px rgba(0,0,0,0.08)';
            navbar.style.background = 'var(--bg-white)';
        } else {
            navbar.style.boxShadow = 'none';
            navbar.style.background = 'var(--bg-white)';
        }
    });

    // Smooth scroll for anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            e.preventDefault();
            document.querySelector(targetId).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Hero Image Parallax
    const heroImg = document.querySelector('.hero-img-main');
    window.addEventListener('scroll', () => {
        if (heroImg) {
            const scrollVal = window.scrollY;
            heroImg.style.transform = `translateY(${scrollVal * 0.1}px)`;
        }
    });

    // Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Check for saved theme
    const savedTheme = localStorage.getItem('rayix-theme');
    if (savedTheme) {
        body.classList.add(savedTheme);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (body.classList.contains('t-theme')) {
                body.classList.remove('t-theme');
                localStorage.setItem('rayix-theme', '');
            } else {
                body.classList.add('t-theme');
                localStorage.setItem('rayix-theme', 't-theme');
            }

            // Re-render icons if needed
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });
    }
});
