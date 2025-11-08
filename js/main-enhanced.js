// Main JS: hamburger, counters, small interactions

document.addEventListener('DOMContentLoaded', () => {
    // Hamburger mobile nav
    const hamburger = document.getElementById('hamburger');
    const body = document.body;
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            body.classList.toggle('nav-open');
            hamburger.classList.toggle('is-active');
        });
    }

    // Init AOS if present
    if (window.AOS) AOS.init({ duration: 800, once: true });

    // Crash impact effects for each title line - ENHANCED
    scheduleLineImpact('.from-crash', 900, 32);
    scheduleLineImpact('.to-cash', 1250, 32);

    // Animate stat counters
    const counters = document.querySelectorAll('.stat-value[data-count]');
    counters.forEach(el => {
        const target = parseInt(el.getAttribute('data-count'), 10);
        animateCount(el, target, 1500);
    });

    // Ticker pause on hover
    const ticker = document.querySelector('.ticker-content');
    if (ticker) {
        ticker.addEventListener('mouseenter', () => ticker.style.animationPlayState = 'paused');
        ticker.addEventListener('mouseleave', () => ticker.style.animationPlayState = 'running');
    }
});

function animateCount(el, to, duration = 1500) {
    const start = 0;
    const startTime = performance.now();

    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const value = Math.floor(progress * (to - start) + start);
        el.textContent = window.fryUtils ? window.fryUtils.formatNumber(value) : value;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ENHANCED - Now with particle count and dust clouds
function scheduleLineImpact(selector, delay, particleCount = 32) {
    const el = document.querySelector(selector);
    if (!el) return;
    setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Main debris burst
        for (let i = 0; i < particleCount; i++) {
            createDebrisParticle(centerX, centerY, i / particleCount);
        }
        
        // Dust cloud
        for (let i = 0; i < 12; i++) {
            createDustParticle(centerX, centerY);
        }
    }, delay);
}

// ENHANCED - Now with rotation and better distribution
function createDebrisParticle(x, y, normalizedIndex = 0) {
    const particle = document.createElement('div');
    particle.className = 'crash-debris';
    
    const angle = (Math.PI * 2 * normalizedIndex) + (Math.random() * 0.4 - 0.2);
    const velocity = 2.5 + Math.random() * 4.5;
    const size = 3 + Math.random() * 7;
    const isGold = Math.random() > 0.4;
    const color = isGold ? '#f8b400' : '#d92b2b';
    
    particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 0 ${size * 2}px ${color};
    `;
    
    document.body.appendChild(particle);
    
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    let posX = x;
    let posY = y;
    let opacity = 1;
    let velocityY = vy;
    let rotation = Math.random() * 360;
    let rotationSpeed = (Math.random() - 0.5) * 20;
    
    function animate() {
        posX += vx;
        posY += velocityY;
        velocityY += 0.25; // gravity
        rotation += rotationSpeed;
        opacity -= 0.018;
        
        particle.style.left = posX + 'px';
        particle.style.top = posY + 'px';
        particle.style.opacity = opacity;
        particle.style.transform = `rotate(${rotation}deg)`;
        
        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            particle.remove();
        }
    }
    
    requestAnimationFrame(animate);
}

// NEW - Dust cloud particles
function createDustParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'dust-particle';
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = 0.5 + Math.random() * 1.5;
    const size = 20 + Math.random() * 40;
    
    particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, rgba(248, 180, 0, 0.3) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9998;
    `;
    
    document.body.appendChild(particle);
    
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    let posX = x;
    let posY = y;
    let opacity = 0.6;
    let scale = 0.5;
    
    function animate() {
        posX += vx;
        posY += vy;
        opacity -= 0.012;
        scale += 0.03;
        
        particle.style.left = posX + 'px';
        particle.style.top = posY + 'px';
        particle.style.opacity = opacity;
        particle.style.transform = `scale(${scale})`;
        
        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            particle.remove();
        }
    }
    
    requestAnimationFrame(animate);
}
