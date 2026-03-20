// ═══════════ Vidyasetu.notes Sign-Up Page Scripts ═══════════

// ───── Floating Particles ─────
let particles = [];

function createParticles() {
    const container = document.getElementById('particles-container');
    const count = 25;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        const size = Math.random() * 3 + 1;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.backgroundColor = `color-mix(in srgb, var(--primary-color) ${Math.floor(Math.random() * 30 + 5)}%, transparent)`;
        container.appendChild(p);
        particles.push(p);
        animateParticle(p);
    }
}

function animateParticle(p) {
    const duration = Math.random() * 5 + 4;
    const delay = Math.random() * 3;
    gsap.to(p, {
        y: -(Math.random() * 200 + 80),
        x: (Math.random() - 0.5) * 60,
        opacity: Math.random() * 0.4 + 0.05,
        duration: duration,
        delay: delay,
        ease: "power1.inOut",
        repeat: -1,
        yoyo: true,
    });
}

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

// ───── Password Visibility Toggle ─────
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

// ───── Password Strength Checker ─────
function checkPasswordStrength(password) {
    const strengthDiv = document.getElementById('password-strength');
    const bars = strengthDiv.querySelectorAll('.strength-bar');
    const text = document.getElementById('strength-text');

    if (!password) {
        strengthDiv.classList.add('hidden');
        return;
    }

    strengthDiv.classList.remove('hidden');

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
        { color: '#ef4444', label: 'Weak' },
        { color: '#f97316', label: 'Fair' },
        { color: '#eab308', label: 'Good' },
        { color: '#22c55e', label: 'Strong' },
    ];

    bars.forEach((bar, i) => {
        if (i < score) {
            bar.style.backgroundColor = levels[score - 1].color;
        } else {
            bar.style.backgroundColor = 'rgba(255,255,255,0.06)';
        }
    });

    text.textContent = levels[score - 1]?.label || '';
    text.style.color = levels[score - 1]?.color || '#64748b';
}

// ───── Email/Password Sign-Up Handler ─────
async function handleEmailSignUp(e) {
    e.preventDefault();

    const fullName = document.getElementById('input-fullname').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const password = document.getElementById('input-password').value;

    // Validation
    if (!fullName) {
        showToast('Please enter your full name.', 'error');
        return;
    }
    if (!email) {
        showToast('Please enter your email address.', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
    }

    const btn = document.getElementById('signup-submit-btn');
    const btnText = document.getElementById('btn-text');
    const loader = document.getElementById('btn-loader');

    btnText.textContent = 'Creating account...';
    loader.classList.remove('hidden');
    btn.disabled = true;
    btn.style.opacity = '0.8';

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    });

    if (error) {
        console.error('❌ Sign-up error:', error);
        showToast(error.message || 'Sign-up failed. Please try again.', 'error', 5000);
        btnText.textContent = 'Create Account';
        loader.classList.add('hidden');
        btn.disabled = false;
        btn.style.opacity = '1';
        return;
    }

    console.log('✅ Sign-up successful:', data);

    // Check if email confirmation is required
    if (data.user && data.user.identities && data.user.identities.length === 0) {
        showToast('This email is already registered. Try signing in.', 'error', 5000);
        btnText.textContent = 'Create Account';
        loader.classList.add('hidden');
        btn.disabled = false;
        btn.style.opacity = '1';
        return;
    }

    showToast('Account created! Check your email to confirm. 📧', 'success', 5000);

    // Update button to success state
    btnText.textContent = '✓ Account Created';
    loader.classList.add('hidden');
    btn.classList.add('btn-success-primary');

    // Redirect to login after delay
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 3000);
}

// ───── Google Sign-Up via Supabase OAuth ─────
async function handleGoogleSignUp() {
    const googleBtn = document.getElementById('google-signup-btn');
    if (!googleBtn) return;

    if (googleBtn.dataset.loading === 'true') return;
    googleBtn.dataset.loading = 'true';

    const originalHTML = googleBtn.innerHTML;
    googleBtn.innerHTML = `
        <svg class="loader-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <span class="text-[13px] font-medium text-slate-400">Connecting to Google...</span>
    `;
    googleBtn.classList.add('btn-loading');

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: 'https://vidyasetu-notes.vercel.app/home/home.html',
        },
    });

    if (error) {
        console.error('❌ Google sign-up error:', error);
        showToast(error.message || 'Something went wrong. Please try again.', 'error', 5000);
        googleBtn.innerHTML = originalHTML;
        googleBtn.classList.remove('btn-loading');
        googleBtn.dataset.loading = 'false';
    }
}

// ───── Auth State Listener ─────
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        const user = session.user;
        const displayName = user.user_metadata?.full_name || user.email || 'User';
        console.log('🔐 User signed in:', displayName);

        showToast(`Welcome, ${displayName}! 🎉`, 'success', 3500);

        setTimeout(() => {
            window.location.href = '../home/home.html';
        }, 2000);
    }
});

// ───── Entrance Animations ─────
function playEntrance() {
    gsap.from('#signup-card', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        delay: 0.1,
    });

    gsap.from('#signup-card > *', {
        y: 15,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: "power3.out",
        delay: 0.25,
    });

    gsap.from('#main-header', {
        y: -20,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
    });
}

// ───── Init ─────
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    playEntrance();

    // Wire up Google button
    const googleBtn = document.getElementById('google-signup-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleSignUp);
    }

    // Wire up password strength checker
    const passwordInput = document.getElementById('input-password');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value);
        });
    }
});
