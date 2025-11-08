// Animation control and particle effects for hero

(function () {
    // Utility: read CSS variable
    function cssVar(name, fallback) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    // Particle system for hero section
    class ParticleField {
        constructor(container) {
            this.container = container;
            this.canvas = document.createElement('canvas');
            this.canvas.setAttribute('aria-hidden', 'true');
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.display = 'block';
            this.ctx = this.canvas.getContext('2d');
            this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            this.particles = [];
            this.running = false;
            this.lastTime = 0;
            this.time = 0;
            this.sparks = [];
            this.splats = [];
            this.fumes = [];

            // Theme colors from CSS vars
            this.colors = {
                gold: cssVar('--greasy-gold', '#f8b400'),
                red: cssVar('--fry-red', '#d92b2b'),
                white: cssVar('--white', '#ffffff')
            };

            // Load sprite images for fries
            this.images = [];
            this.imagesReady = false;
            this.loadImages([
                'images/particles/fry1.png',
                'images/particles/fry2.png'
            ]).then(imgs => {
                this.images = imgs.filter(img => img && img.complete);
                this.imagesReady = this.images.length > 0;
                // assign images to any existing particles without image
                if (this.imagesReady) {
                    for (const p of this.particles) if (!p.img) p.img = this.randomImage();
                }
            }).catch(() => {
                // keep fallback vector fry rendering
                this.imagesReady = false;
            });

            container.appendChild(this.canvas);
            this.resize();
            window.addEventListener('resize', () => this.resize());

            // Wind parameters (gentle kitchen draft)
            this.windAmp = 18; // px/s horizontal influence
            this.windAmp2 = 9;  // secondary component
            this.windFreq = 0.25; // Hz
            this.windFreq2 = 0.61; // Hz
            this.windPhase = Math.random() * Math.PI * 2;

            // Respect reduced motion
            const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.reduced = mq.matches;
            mq.addEventListener?.('change', (e) => {
                this.reduced = e.matches;
                if (this.reduced) this.stop(); else this.start();
            });

            // Start/stop when hero is visible
            if ('IntersectionObserver' in window) {
                const io = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) this.start();
                        else this.stop();
                    });
                }, { root: null, threshold: 0.05 });
                io.observe(container.closest('.hero') || container);
            } else {
                this.start();
            }
        }

        resize() {
            const rect = this.container.getBoundingClientRect();
            this.width = Math.max(1, rect.width);
            this.height = Math.max(1, rect.height);
            this.canvas.width = Math.floor(this.width * this.dpr);
            this.canvas.height = Math.floor(this.height * this.dpr);
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

            // Reset particle count based on size
            this.baseCount = Math.round(Math.min(140, Math.max(40, (this.width * this.height) / 15000)));
            this.ensureParticles(this.baseCount);
        }

        ensureParticles(n) {
            // Add
            while (this.particles.length < n) this.particles.push(this.spawnParticle());
            // Remove
            while (this.particles.length > n) this.particles.pop();
        }

        spawnParticle(overrides = {}) {
            // Fry particle (image sprite if available; vector fallback)
            const kind = 'fry';
            let x, y, vx, vy;
            // Randomize spawn edge: top (60%), left (20%), right (20%)
            const spawnR = Math.random();
            const speedBase = 26; // px/s base for falling
            if (spawnR < 0.6) {
                // Top spawn
                x = Math.random() * this.width;
                y = -20 - Math.random() * 60;
                vx = (Math.random() - 0.5) * 30;
                vy = (speedBase + Math.random() * speedBase);
            } else if (spawnR < 0.8) {
                // Left spawn
                x = -20 - Math.random() * 60;
                y = Math.random() * this.height * 0.8;
                vx = (30 + Math.random() * 70);
                vy = (14 + Math.random() * 46);
            } else {
                // Right spawn
                x = this.width + 20 + Math.random() * 60;
                y = Math.random() * this.height * 0.8;
                vx = -(30 + Math.random() * 70);
                vy = (14 + Math.random() * 46);
            }
            const rotation = Math.random() * Math.PI * 2;
            const rotSpeed = (Math.random() - 0.5) * 1.2; // wider tumble range
            const depth = 0.55 + Math.random() * 0.95; // parallax depth (0.55..1.5)
            vy *= depth; // scale with depth
            const scale = (0.55 + Math.random() * 1.1) * depth; // larger if closer
            const alpha = 0.28 + Math.random() * 0.45; // slight variation
            const img = this.imagesReady ? this.randomImage() : null;
            // Per-particle sway and gust parameters
            const sway = Math.random() * Math.PI * 2;
            const swayAmp = (10 + Math.random() * 25) * scale; // px amplitude
            const swaySpeed = 0.8 + Math.random() * 2.0; // Hz-ish
            const gustAmp = 10 + Math.random() * 25; // px/s, horizontal gust strength
            const gustFreq = 0.2 + Math.random() * 0.8; // Hz
            const gustPhase = Math.random() * Math.PI * 2;
            const gravity = 2 + Math.random() * 10; // px/s^2, slight acceleration
            return { kind, x, y, vx, vy, t: 0, rotation, rotSpeed, scale, alpha, depth, sway, swayAmp, swaySpeed, gustAmp, gustFreq, gustPhase, gravity, img, ephemeral: false, ...overrides };
        }

        start() {
            if (this.running || this.reduced) return;
            this.running = true;
            this.lastTime = performance.now();
            this.loop(this.lastTime);
        }

        stop() {
            this.running = false;
        }

        loop(now) {
            if (!this.running) return;
            const dt = Math.min(0.05, (now - this.lastTime) / 1000); // clamp delta
            this.lastTime = now;
            this.time += dt;
            this.update(dt);
            this.render();
            requestAnimationFrame((t) => this.loop(t));
        }

        update(dt) {
            const w = this.width, h = this.height;

            // Update fries
            // Compute wind once per frame
            const wind = Math.sin((this.time + this.windPhase) * Math.PI * 2 * this.windFreq) * this.windAmp
                       + Math.sin((this.time + this.windPhase * 0.7) * Math.PI * 2 * this.windFreq2) * this.windAmp2;

            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                p.t += dt;
                // gentle horizontal sway (per-particle)
                p.sway += dt * p.swaySpeed * 2.0;
                const swayX = Math.sin(p.sway) * p.swayAmp * dt;
                // local gust component
                const gust = Math.sin((this.time + p.gustPhase) * Math.PI * 2 * p.gustFreq) * p.gustAmp;
                p.x += (p.vx + gust + (wind * p.depth)) * dt + swayX;
                p.y += p.vy * dt;
                // slight acceleration to add variety
                p.vy += p.gravity * dt * 0.3;
                p.rotation += p.rotSpeed * dt;

                // Occasionally emit a sparkle slightly above the fry (grease glint)
                if (Math.random() < 0.05) {
                    this.emitSpark(p.x, p.y - (10 * p.scale));
                }

                // Recycle only when fully out of the view bounds (for falling)
                const outOfView = (p.y > h + 60) || (p.x < -80) || (p.x > w + 80);
                if (outOfView) {
                    if (p.ephemeral) {
                        this.particles.splice(i, 1);
                        i--; // adjust index
                    } else {
                        // fume steam on hit at bottom
                        if (p.y > h && Math.abs(p.vy) > 5) {
                            this.emitFume(p.x, h - 4); // fume steam on hit
                        }
                        // respawn at top for natural falling flow
                        const newP = this.spawnParticle();
                        newP.y = -20 - Math.random() * 40;
                        newP.x = Math.random() * w;
                        this.particles[i] = newP;
                    }
                }
            }

            // Update sparkles
            for (let i = 0; i < this.sparks.length; i++) {
                const s = this.sparks[i];
                s.t += dt;
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                // fade out over life
                const lifeRatio = s.t / s.life;
                s.alpha = Math.max(0, s.startAlpha * (1 - lifeRatio));
                s.size *= (1 - 0.6 * dt);
                if (lifeRatio >= 1 || s.alpha <= 0) {
                    this.sparks.splice(i, 1);
                    i--;
                }
            }

            // Update fumes (rising steam)
            for (let i = 0; i < this.fumes.length; i++) {
                const f = this.fumes[i];
                f.t += dt;
                const pr = f.t / f.life;
                f.x += f.vx * dt + Math.sin((f.t + f.phase) * 3) * 5 * dt; // wavy drift
                f.y += f.vy * dt; // vy negative (rise)
                f.alpha = Math.max(0, f.startAlpha * (1 - pr));
                f.size *= (1 + 0.4 * dt); // expand slightly
                if (pr >= 1 || f.alpha <= 0) {
                    this.fumes.splice(i, 1);
                    i--;
                }
            }

            // (sauce ripple removed)

            // Keep base particle count (ephemeral may have been removed)
            if (this.baseCount) this.ensureParticles(this.baseCount);
        }

        render() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.width, this.height);

            // (sauce ripple removed)

            for (let p of this.particles) {
                ctx.save();
                ctx.translate(p.x, p.y);

                // Draw main fry with its tumbling rotation
                ctx.rotate(p.rotation);
                ctx.globalAlpha = p.alpha;
                if (!p.img && this.imagesReady) p.img = this.randomImage();
                if (p.img && p.img.complete) this.drawFryImage(ctx, p.img, p.scale);
                else this.drawFry(ctx, p.scale);

                ctx.restore();
            }

            // Render sparkles with additive blending for a greasy shimmer
            if (this.sparks && this.sparks.length) {
                const prevComp = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = 'lighter';
                for (let s of this.sparks) {
                    ctx.save();
                    ctx.globalAlpha = s.alpha;
                    ctx.translate(s.x, s.y);
                    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, s.size);
                    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
                    grd.addColorStop(0.5, this.colors.gold + 'cc');
                    grd.addColorStop(1, 'rgba(248,180,0,0)');
                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    ctx.arc(0, 0, s.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                ctx.globalCompositeOperation = prevComp;
            }

            // Render fumes (soft smoke puffs) behind fries but above splats
            if (this.fumes && this.fumes.length) {
                const prevComp = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = 'lighter';
                for (let f of this.fumes) {
                    ctx.save();
                    ctx.globalAlpha = f.alpha * 0.8;
                    ctx.translate(f.x, f.y);
                    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, f.size);
                    grd.addColorStop(0, 'rgba(255,255,255,0.35)');
                    grd.addColorStop(0.7, 'rgba(255,255,255,0.12)');
                    grd.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    ctx.arc(0, 0, f.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                ctx.globalCompositeOperation = prevComp;
            }
        }

        drawFryImage(ctx, img, scale) {
            const baseH = 28; // align with vector fry height
            const h = baseH * scale;
            const aspect = img.naturalWidth && img.naturalHeight ? (img.naturalWidth / img.naturalHeight) : (6 / 28);
            const w = h * aspect;
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }

        drawFry(ctx, scale) {
            // Fry as a golden stick with a subtle red tip accent
            const width = 6 * scale;
            const height = 28 * scale;
            const radius = 2 * scale;

            // Body
            ctx.fillStyle = this.colors.gold;
            this.roundRect(ctx, -width/2, -height/2, width, height, radius);
            ctx.fill();

            // Tip accent
            ctx.fillStyle = this.colors.red;
            this.roundRect(ctx, -width/2, -height/2, width, Math.min(4 * scale, height * 0.2), radius);
            ctx.fill();
        }

        roundRect(ctx, x, y, w, h, r) {
            const rr = Math.min(r, w/2, h/2);
            ctx.beginPath();
            ctx.moveTo(x + rr, y);
            ctx.arcTo(x + w, y, x + w, y + h, rr);
            ctx.arcTo(x + w, y + h, x, y + h, rr);
            ctx.arcTo(x, y + h, x, y, rr);
            ctx.arcTo(x, y, x + w, y, rr);
            ctx.closePath();
        }

        loadImages(srcList) {
            const loaders = srcList.map(src => new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = src;
            }));
            return Promise.all(loaders);
        }

        randomImage() {
            if (!this.images || !this.images.length) return null;
            const idx = Math.floor(Math.random() * this.images.length);
            return this.images[idx];
        }

        // Sparkle emission
        emitSpark(x, y) {
            if (!this.sparks) this.sparks = [];
            const speed = 15 + Math.random() * 30;
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8; // mostly upward, slight spread
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const life = 0.6 + Math.random() * 0.5;
            const size = 2 + Math.random() * 3;
            const startAlpha = 0.6 + Math.random() * 0.3;
            this.sparks.push({ x, y, vx, vy, life, t: 0, size, alpha: startAlpha, startAlpha });
            // Cap sparks to avoid buildup
            if (this.sparks.length > 200) this.sparks.splice(0, this.sparks.length - 200);
        }

        // (sauce ripple removed)

        // Fume/steam puffs rising from bottom when fries land
        emitFume(x, y) {
            if (!this.fumes) this.fumes = [];
            const count = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                const life = 0.8 + Math.random() * 0.9;
                this.fumes.push({
                    x: x + (Math.random() - 0.5) * 20,
                    y: y + (Math.random() - 0.5) * 6,
                    vx: (Math.random() - 0.5) * 20,
                    vy: - (20 + Math.random() * 30), // rise up
                    size: 10 + Math.random() * 18,
                    startAlpha: 0.35 + Math.random() * 0.25,
                    alpha: 0.6,
                    life,
                    t: 0,
                    phase: Math.random() * Math.PI * 2
                });
            }
            if (this.fumes.length > 120) this.fumes.splice(0, this.fumes.length - 120);
        }

        emitBurst(x, y) {
            // Spawn a quick burst of fries and sparkles
            const count = 12;
            for (let i = 0; i < count; i++) {
                const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.9; // mostly downward
                const speed = 120 + Math.random() * 160;
                const vx = Math.cos(angle) * (speed * 0.25);
                const vy = Math.sin(angle) * speed; // positive mostly (down)
                const scale = 0.7 + Math.random() * 0.9;
                const rotSpeed = (Math.random() - 0.5) * 1.5;
                const p = this.spawnParticle({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20, vx, vy, scale, rotSpeed, alpha: 0.7, ephemeral: true });
                this.particles.push(p);
                // Add a couple of sparks for each fry
                this.emitSpark(x, y);
                if (Math.random() < 0.7) this.emitSpark(x, y);
            }
            // (sauce ripple on click near bottom removed)
        }
    }

    function initParticles() {
        const container = document.getElementById('particles');
        if (!container) return;
        if (!container.querySelector('canvas')) {
            container._pf = new ParticleField(container);
        }
        // Click/touch burst on hero (particles layer has pointer-events none)
        const hero = container.closest('.hero') || document.body;
        if (hero && container._pf && !hero._fryBurstBound) {
            hero._fryBurstBound = true;
            const handler = (ev) => {
                const rect = container.getBoundingClientRect();
                let clientX, clientY;
                if ('touches' in ev && ev.touches.length) {
                    clientX = ev.touches[0].clientX; clientY = ev.touches[0].clientY;
                } else {
                    clientX = ev.clientX; clientY = ev.clientY;
                }
                const x = clientX - rect.left;
                const y = clientY - rect.top;
                container._pf.emitBurst(x, y);
            };
            hero.addEventListener('pointerdown', handler);
            hero.addEventListener('touchstart', handler, { passive: true });

            // Continuous mouse sparkle trail (no mini-fries)
            let mouseX = null, mouseY = null, lastEmit = 0;
            hero.addEventListener('pointermove', (ev) => {
                const rect = container.getBoundingClientRect();
                mouseX = ev.clientX - rect.left;
                mouseY = ev.clientY - rect.top;
            });
            hero.addEventListener('pointerleave', () => { mouseX = null; mouseY = null; });
            // Hook into particle field update via a wrapped original update
            const pf = container._pf;
            const originalUpdate = pf.update.bind(pf);
            pf.update = function(dt) {
                originalUpdate(dt);
                if (mouseX != null && mouseY != null && !this.reduced) {
                    lastEmit += dt;
                    const interval = 0.04; // ~25/sec
                    while (lastEmit >= interval) {
                        lastEmit -= interval;
                        // emit only sparkles for a subtle cursor grease shimmer
                        this.emitSpark(mouseX + (Math.random()-0.5)*6, mouseY - 4 + (Math.random()-0.5)*6);
                    }
                }
            };
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        // AOS init (if available)
        if (window.AOS) {
            AOS.init({ duration: 800, once: true });
        }

        initParticles();
    });
})();
