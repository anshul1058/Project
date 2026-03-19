// ═══════════ Study Room (Peer Video Call) ═══════════

let currentUser = null;
let roomId = null;
let jitsiApi = null;
let timerInterval = null;
let startTime = null;

// ═══════════ Init ═══════════
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) { window.location.href = 'groups.html'; return; }

    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) { window.location.href = '../login/login.html'; return; }
    currentUser = user;

    // Get room ID from URL
    const params = new URLSearchParams(window.location.search);
    roomId = params.get('id');
    const topic = params.get('topic');

    if (topic) {
        document.getElementById('room-topic').textContent = topic;
        document.getElementById('pre-join-topic').textContent = `Topic: ${topic}`;
        document.title = `${topic} — Study Room — Vidyasetu.notes`;
    }

    // Generate a room ID if not provided
    if (!roomId) {
        roomId = 'vidyasetu-' + Math.random().toString(36).substr(2, 9);
    }
});

// ═══════════ Join Meeting ═══════════
window.joinMeeting = () => {
    const cameraOn = document.getElementById('toggle-camera').checked;
    const micOn = document.getElementById('toggle-mic').checked;

    // Hide pre-join, show meeting area
    document.getElementById('pre-join').classList.add('hidden');
    document.getElementById('meeting-area').classList.remove('hidden');
    document.getElementById('meeting-area').classList.add('flex');

    // Start timer
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);

    // Get user display name
    const displayName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Student';

    // Initialize Jitsi Meet
    const domain = 'meet.jit.si';
    const options = {
        roomName: roomId,
        parentNode: document.getElementById('jitsi-container'),
        width: '100%',
        height: '100%',
        configOverwrite: {
            startWithAudioMuted: !micOn,
            startWithVideoMuted: !cameraOn,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            toolbarButtons: [
                'microphone', 'camera', 'closedcaptions', 'desktop',
                'chat', 'raisehand', 'tileview', 'select-background',
                'settings', 'filmstrip'
            ],
            hideConferenceSubject: true,
            hideConferenceTimer: false,
            disableModeratorIndicator: true,
            enableWelcomePage: false,
            enableClosePage: false,
            defaultLocalDisplayName: displayName,
            resolution: 720,
            constraints: {
                video: { height: { ideal: 720, max: 720, min: 360 } }
            },
            // Modern dark theme
            BRAND_WATERMARK_LINK: '',
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
        },
        interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'closedcaptions', 'desktop',
                'chat', 'raisehand', 'tileview', 'settings', 'filmstrip'
            ],
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            DEFAULT_BACKGROUND: '#0e1015',
            TOOLBAR_ALWAYS_VISIBLE: false,
            FILM_STRIP_MAX_HEIGHT: 120,
            DISPLAY_WELCOME_FOOTER: false,
            DISPLAY_WELCOME_PAGE_ADDITIONAL_CARD: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
            GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
            HIDE_INVITE_MORE_HEADER: true,
        },
        userInfo: {
            displayName: displayName,
            email: currentUser.email
        }
    };

    try {
        jitsiApi = new JitsiMeetExternalAPI(domain, options);

        jitsiApi.addEventListener('readyToClose', () => {
            leaveRoom();
        });

        jitsiApi.addEventListener('participantJoined', () => {
            showToast('A peer joined the room! 👋', 'success');
        });

        jitsiApi.addEventListener('participantLeft', () => {
            showToast('A peer left the room', 'info');
        });

    } catch (e) {
        console.error('Jitsi init error:', e);
        showToast('Failed to start video call. Please try again.', 'error');
    }
};

// ═══════════ Leave Room ═══════════
window.leaveRoom = () => {
    if (jitsiApi) {
        jitsiApi.dispose();
        jitsiApi = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    window.location.href = 'groups.html';
};

// ═══════════ Timer ═══════════
function updateTimer() {
    if (!startTime) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    document.getElementById('room-timer').textContent = `${h}:${m}:${s}`;
}

// ═══════════ Toast ═══════════
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon" style="font-size:20px;">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    if (typeof gsap !== 'undefined') {
        gsap.fromTo(toast, { opacity: 0, x: 40, scale: 0.95 }, { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: "back.out(1.4)" });
        setTimeout(() => {
            gsap.to(toast, { opacity: 0, x: 40, scale: 0.9, duration: 0.3, ease: "power2.in", onComplete: () => toast.remove() });
        }, 4000);
    } else {
        setTimeout(() => toast.remove(), 4000);
    }
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (jitsiApi) jitsiApi.dispose();
    if (timerInterval) clearInterval(timerInterval);
});
