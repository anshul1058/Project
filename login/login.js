// ═══════════ Vidyasetu.notes Login Page Scripts ═══════════

// ───── State ─────
let isLampOn = false;
let particles = [];
let fireflies = [];

// ───── DOM References ─────
const body = document.body;
const chainContainer = document.getElementById('pull-chain-container');
const header = document.getElementById('main-header');
const loginCard = document.getElementById('login-card');
const lampStatusText = document.getElementById('lamp-status-text');

// ───── Create floating particles ─────
function createParticles() {
    const container = document.getElementById('particles-container');
    const count = 35;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        const size = Math.random() * 3 + 1;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 45 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.backgroundColor = `color-mix(in srgb, var(--primary-color) ${Math.floor(Math.random() * 40 + 10)}%, transparent)`;
        container.appendChild(p);
        particles.push(p);

        // Animate each particle
        animateParticle(p);
    }
}

function animateParticle(p) {
    const duration = Math.random() * 5 + 4;
    const delay = Math.random() * 3;
    gsap.to(p, {
        y: -(Math.random() * 200 + 80),
        x: (Math.random() - 0.5) * 60,
        opacity: Math.random() * 0.5 + 0.1,
        duration: duration,
        delay: delay,
        ease: "power1.inOut",
        repeat: -1,
        yoyo: true,
    });
}

// ───── Lamp Toggle ─────
function toggleLamp() {
    // Chain pull animation
    chainContainer.classList.remove('chain-pull');
    void chainContainer.offsetWidth;
    chainContainer.classList.add('chain-pull');

    isLampOn = !isLampOn;

    if (isLampOn) {
        // Turn ON
        body.classList.remove('lamp-off');

        // Instant card reveal — no heavy filters
        gsap.to(loginCard, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.3,
            ease: "power2.out",
            clearProps: "filter"
        });

        gsap.to(header, { opacity: 1, duration: 0.2, ease: "power2.out" });

        // Show particles
        particles.forEach((p) => {
            gsap.to(p, {
                opacity: Math.random() * 0.5 + 0.1,
                duration: 0.3,
            });
        });

        // Show fireflies
        fireflies.forEach((f) => {
            gsap.to(f, { opacity: 1, duration: 0.4 });
        });

    } else {
        // Turn OFF
        body.classList.add('lamp-off');

        // Hide the card with GSAP (overrides any inline styles from ON animation)
        gsap.to(loginCard, {
            opacity: 0,
            y: 6,
            scale: 0.99,
            duration: 0.25,
            ease: "power2.in"
        });

        gsap.to(header, { opacity: 0.25, duration: 0.2, ease: "power2.in" });

        // Hide particles
        particles.forEach((p, i) => {
            gsap.to(p, { opacity: 0, duration: 0.25, delay: i * 0.005 });
        });

        // Hide fireflies
        fireflies.forEach((f) => {
            gsap.to(f, { opacity: 0, duration: 0.25 });
        });
    }
}

// ───── Password Toggle ─────
function togglePasswordVisibility() {
    const input = document.getElementById('input-password');
    const icon = document.getElementById('pw-icon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility_off';
    }
}

// ───── Toast Notification System ─────
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
    };

    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon" style="font-size:20px;">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    if (typeof gsap !== 'undefined') {
        gsap.fromTo(toast,
            { opacity: 0, x: 40, scale: 0.95 },
            { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: "back.out(1.4)" }
        );

        setTimeout(() => {
            gsap.to(toast, {
                opacity: 0, x: 40, scale: 0.9,
                duration: 0.3, ease: "power2.in",
                onComplete: () => toast.remove()
            });
        }, duration);
    } else {
        setTimeout(() => toast.remove(), duration);
    }
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:12px;pointer-events:none;';
    document.body.appendChild(container);
    return container;
}

// ───── Login Handler ─────
async function handleLogin(e) {
    e.preventDefault();
    if (!window.supabase) {
        showToast('Supabase not initialized', 'error');
        return;
    }

    const emailInput = document.getElementById('input-username');
    const passwordInput = document.getElementById('input-password');
    const btn = document.getElementById('signin-btn');
    const btnText = document.getElementById('btn-text');
    const loader = document.getElementById('btn-loader');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    btnText.textContent = 'Signing in...';
    loader.classList.remove('hidden');
    btn.disabled = true;
    btn.style.opacity = '0.8';

    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (data.user) {
            showToast('Login successful!', 'success');
            // Redirect to home page after short delay
            setTimeout(() => {
                window.location.href = '../home/home.html';
            }, 500);
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message || 'Login failed', 'error');
    } finally {
        btnText.textContent = 'Sign In to Platform';
        loader.classList.add('hidden');
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

// ───── Entrance Animations ─────
function playEntrance() {
    // Stagger in the card children
    gsap.from('#login-card > *', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
        delay: 0.3,
    });

    // Lamp entrance
    gsap.from('#lamp-shade', {
        y: -40,
        opacity: 0,
        duration: 0.7,
        ease: "elastic.out(1, 0.6)",
        delay: 0.1,
    });

    gsap.from('#lamp-glow', {
        scale: 0,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        delay: 0.3,
    });

    // Header
    gsap.from('#main-header', {
        y: -20,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
    });
}

// ───── Fireflies ─────
function createFireflySVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 30 28');
    svg.innerHTML = `
        <!-- Left Wing -->
        <ellipse class="wing-left" cx="9" cy="10" rx="7" ry="4"
            fill="rgba(200,200,255,0.15)" stroke="rgba(200,200,255,0.25)" stroke-width="0.5"/>
        <!-- Right Wing -->
        <ellipse class="wing-right" cx="21" cy="10" rx="7" ry="4"
            fill="rgba(200,200,255,0.15)" stroke="rgba(200,200,255,0.25)" stroke-width="0.5"/>
        <!-- Antennae -->
        <line x1="13" y1="8" x2="9" y2="3" stroke="rgba(200,200,200,0.4)" stroke-width="0.6" stroke-linecap="round"/>
        <line x1="17" y1="8" x2="21" y2="3" stroke="rgba(200,200,200,0.4)" stroke-width="0.6" stroke-linecap="round"/>
        <circle cx="9" cy="2.5" r="0.8" fill="rgba(200,200,200,0.35)"/>
        <circle cx="21" cy="2.5" r="0.8" fill="rgba(200,200,200,0.35)"/>
        <!-- Head -->
        <ellipse cx="15" cy="9" rx="2.5" ry="2" fill="#2a2520"/>
        <!-- Thorax -->
        <ellipse cx="15" cy="13" rx="2.8" ry="2.5" fill="#332d25"/>
        <!-- Abdomen (glowing) -->
        <g class="glow-abdomen">
            <ellipse cx="15" cy="19" rx="3" ry="4.5" fill="var(--primary-color)"/>
            <ellipse cx="15" cy="19" rx="2" ry="3" fill="color-mix(in srgb, var(--primary-color) 80%, white 20%)" opacity="0.6"/>
        </g>
        <!-- Legs -->
        <line x1="13" y1="12" x2="9" y2="16" stroke="rgba(150,130,100,0.4)" stroke-width="0.5"/>
        <line x1="17" y1="12" x2="21" y2="16" stroke="rgba(150,130,100,0.4)" stroke-width="0.5"/>
        <line x1="12.5" y1="14" x2="8.5" y2="18" stroke="rgba(150,130,100,0.4)" stroke-width="0.5"/>
        <line x1="17.5" y1="14" x2="21.5" y2="18" stroke="rgba(150,130,100,0.4)" stroke-width="0.5"/>
    `;
    return svg;
}

function createFireflies() {
    const container = document.getElementById('particles-container');
    const count = 10;

    for (let i = 0; i < count; i++) {
        const fly = document.createElement('div');
        fly.classList.add('firefly');

        // Randomize animation speeds per firefly
        const flapSpeed = (0.1 + Math.random() * 0.12).toFixed(2) + 's';
        const glowSpeed = (1.2 + Math.random() * 2).toFixed(1) + 's';
        fly.style.setProperty('--flap-speed', flapSpeed);
        fly.style.setProperty('--glow-speed', glowSpeed);

        // Random size variation
        const scale = 0.7 + Math.random() * 0.8;
        fly.style.transform = `scale(${scale})`;

        const svg = createFireflySVG();
        fly.appendChild(svg);

        // Random starting position
        fly.style.left = (Math.random() * 80 + 5) + '%';
        fly.style.top = (Math.random() * 70 + 10) + '%';

        container.appendChild(fly);
        fireflies.push(fly);

        animateFirefly(fly, scale);
    }
}

function animateFirefly(fly, scale) {
    let lastX = 0;

    function wander() {
        const xMove = (Math.random() - 0.5) * 220;
        const yMove = (Math.random() - 0.5) * 160;
        const duration = 3 + Math.random() * 4;

        // Rotate to face movement direction
        const angle = Math.atan2(yMove, xMove) * (180 / Math.PI) + 90;
        // Flip horizontally based on direction
        const flipX = xMove < 0 ? -1 : 1;

        gsap.to(fly, {
            x: '+=' + xMove,
            y: '+=' + yMove,
            rotation: angle,
            scaleX: scale * flipX,
            scaleY: scale,
            duration: duration,
            ease: "sine.inOut",
            onComplete: wander
        });

        lastX = xMove;
    }

    gsap.delayedCall(Math.random() * 2, wander);
}

// ───── Init ─────
document.addEventListener('DOMContentLoaded', () => {
    // Create toast container
    if (!document.getElementById('toast-container')) {
        createToastContainer();
    }

    // Start with lamp OFF
    document.body.classList.add('lamp-off');
    if (loginCard) {
        loginCard.style.opacity = '0';
        loginCard.style.transform = 'translateY(6px) scale(0.99)';
    }
    if (header) header.style.opacity = '0.25';

    createParticles();
    createFireflies();
    initCursorRepulsion();
    playEntrance();
    
    // Wire up Google button
    const googleBtn = document.getElementById('google-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleSignIn);
    }
});

// ───── Cursor Repulsion for Fireflies ─────
let mouseX = -1000;
let mouseY = -1000;
const REPEL_RADIUS = 120;  // How close the cursor needs to be
const REPEL_FORCE = 80;    // How far they flee

function initCursorRepulsion() {
    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Reset when mouse leaves the window
    document.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    // Check proximity every frame
    function checkProximity() {
        if (!isLampOn) {
            requestAnimationFrame(checkProximity);
            return;
        }

        fireflies.forEach((fly) => {
            const rect = fly.getBoundingClientRect();
            const flyX = rect.left + rect.width / 2;
            const flyY = rect.top + rect.height / 2;

            const dx = flyX - mouseX;
            const dy = flyY - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < REPEL_RADIUS && dist > 0) {
                // Calculate repulsion direction (away from cursor)
                const angle = Math.atan2(dy, dx);
                const force = (1 - dist / REPEL_RADIUS) * REPEL_FORCE;
                const pushX = Math.cos(angle) * force;
                const pushY = Math.sin(angle) * force;

                // Quick flee animation
                gsap.to(fly, {
                    x: '+=' + pushX,
                    y: '+=' + pushY,
                    duration: 0.3,
                    ease: "power2.out",
                    overwrite: "auto"
                });
            }
        });

        requestAnimationFrame(checkProximity);
    }

    requestAnimationFrame(checkProximity);
}

// ═══════════ Supabase Google Authentication ═══════════

// ───── Toast Notification System ─────
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
    };

    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon" style="font-size:20px;">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    gsap.fromTo(toast,
        { opacity: 0, x: 40, scale: 0.95 },
        { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: "back.out(1.4)" }
    );

    setTimeout(() => {
        gsap.to(toast, {
            opacity: 0, x: 40, scale: 0.9,
            duration: 0.3, ease: "power2.in",
            onComplete: () => toast.remove()
        });
    }, duration);
}

// ───── Google Sign-In via Supabase OAuth ─────
async function handleGoogleSignIn() {
    const googleBtn = document.getElementById('google-btn');
    if (!googleBtn) return;

    // Prevent double-clicks
    if (googleBtn.dataset.loading === 'true') return;
    googleBtn.dataset.loading = 'true';

    // Save original content & show loading state
    const originalHTML = googleBtn.innerHTML;
    googleBtn.innerHTML = `
        <svg class="loader-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <span class="text-[12px] font-medium text-slate-400">Signing in...</span>
    `;
    googleBtn.classList.add('btn-loading');

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: 'https://vidyasetu-notes.vercel.app/login/login.html',
        },
    });

    if (error) {
        console.error('❌ Google sign-in error:', error);

        let errorMessage = 'Something went wrong. Please try again.';
        if (error.message.includes('popup')) {
            errorMessage = 'Pop-up blocked! Please allow pop-ups and retry.';
        } else if (error.message.includes('network')) {
            errorMessage = 'Network error. Check your connection.';
        }

        showToast(errorMessage, 'error', 5000);

        // Restore button
        googleBtn.innerHTML = originalHTML;
        googleBtn.classList.remove('btn-loading');
        googleBtn.dataset.loading = 'false';
    }

    // If no error, Supabase will redirect the user to Google's consent screen.
    // On return, the auth state listener below will detect the session.
}

// ───── Auth State Listener ─────
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        const user = session.user;
        const displayName = user.user_metadata?.full_name || user.email || 'User';
        console.log('🔐 User signed in:', displayName, user.email);

        showToast(`Welcome, ${displayName}! 🎉`, 'success', 3500);

        // Update Google button to show success
        const googleBtn = document.getElementById('google-btn');
        if (googleBtn) {
            googleBtn.innerHTML = `
                <span class="material-symbols-outlined text-green-400" style="font-size:20px;">check_circle</span>
                <span class="text-[12px] font-medium text-green-400">Signed in as ${displayName}</span>
            `;
            googleBtn.classList.remove('btn-loading');
            googleBtn.classList.add('btn-success');
        }

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = '../home/home.html';
        }, 2000);

    } else if (event === 'SIGNED_OUT') {
        console.log('🔓 User signed out.');
    }
});

// ───── Wire up Google Button ─────
document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleSignIn);
    }
});
