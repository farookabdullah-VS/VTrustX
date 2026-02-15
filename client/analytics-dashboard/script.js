document.addEventListener('DOMContentLoaded', () => {
    // Simulated live data updates
    const statValues = document.querySelectorAll('.stat-value');

    // Function to simulate real-time number ticking
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const val = progress * (end - start) + start;

            if (obj.innerText.includes('%')) {
                obj.innerText = val.toFixed(1) + '%';
            } else if (obj.innerText.includes('+')) {
                obj.innerText = '+' + val.toFixed(1);
            }

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Trigger initial animations
    setTimeout(() => {
        // Animate NPS
        const nps = document.querySelector('.stat-card:nth-child(1) .stat-value');
        animateValue(nps, 75, 82.4, 2000);

        // Animate Prediction confidence
        const ai = document.querySelector('.stat-card:nth-child(4) .stat-value');
        animateValue(ai, 90, 98.2, 2500);
    }, 500);

    // Sidebar hover micro-interactions
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            if (!item.classList.contains('active')) {
                item.style.transform = 'translateX(5px)';
            }
        });
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateX(0)';
        });
    });

    // Handle Time Filter Clicks
    const filters = document.querySelectorAll('.time-filters button');
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Re-trigger chart animation
            const line = document.querySelector('.line-path');
            line.style.animation = 'none';
            line.offsetHeight; // trigger reflow
            line.style.animation = 'drawLine 2s forwards ease-in-out';
        });
    });
});
