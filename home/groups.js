// ═══════════ Study Groups Page Scripts ═══════════

// ═══════════ Authentication & User Menu ═══════════
window.toggleUserMenu = () => {
    const menu = document.getElementById('user-menu');
    if (menu) {
        menu.classList.toggle('opacity-0');
        menu.classList.toggle('invisible');
    }
};

window.handleLogout = async () => {
    if (!window.supabase) {
        window.location.href = '../login/login.html';
        return;
    }
    try {
        await window.supabase.auth.signOut();
    } catch (e) {
        console.error('Logout error:', e);
    }
    window.location.href = '../login/login.html';
};

function loadUserInfo() {
    if (!window.supabase) return;
    window.supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
            const el = document.getElementById('user-email');
            if (el) el.textContent = user.email || 'User';
        }
    }).catch(() => {
        window.location.href = '../login/login.html';
    });
}

let currentUser = null;
let allCommunities = [];
let allPeerRequests = [];

// ═══════════ Initialize ═══════════
document.addEventListener('DOMContentLoaded', async () => {
    loadUserInfo();
    if (!window.supabase) {
        showEmpty('communities');
        showEmpty('peers');
        return;
    }

    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
        window.location.href = '../login/login.html';
        return;
    }

    currentUser = user;
    await Promise.all([loadCommunities(), loadPeerRequests()]);
});

// ═══════════ Tab Switching ═══════════
window.switchTab = (tabName) => {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    // Deactivate all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('text-slate-500');
    });

    // Show target tab
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.remove('hidden');

    // Activate button
    const btn = document.querySelector(`[data-tab="${tabName}"]`);
    if (btn) {
        btn.classList.add('active');
        btn.classList.remove('text-slate-500');
    }

    // Load my groups if switching to that tab
    if (tabName === 'my-groups') loadMyGroups();
};

// ═══════════ COMMUNITIES ═══════════
async function loadCommunities() {
    const grid = document.getElementById('communities-grid');
    const empty = document.getElementById('communities-empty');
    const searchInput = document.getElementById('community-search');

    try {
        const { data: communities, error } = await window.supabase
            .from('study_groups')
            .select(`*, group_members (id), created_by_profile:created_by (full_name)`)
            .eq('group_type', 'community')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allCommunities = communities || [];

        if (allCommunities.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        
        // Apply search filter if there's an existing query
        if (searchInput && searchInput.value.trim()) {
            filterCommunities(searchInput.value);
        } else {
            grid.innerHTML = allCommunities.map(renderCommunityCard).join('');
        }
    } catch (error) {
        console.error('Error loading communities:', error);
        // Fallback: try loading without group_type filter
        try {
            const { data: groups } = await window.supabase
                .from('study_groups')
                .select(`*, group_members (id), created_by_profile:created_by (full_name)`)
                .order('created_at', { ascending: false });

            allCommunities = groups || [];

            if (allCommunities.length === 0) {
                grid.innerHTML = '';
                empty.classList.remove('hidden');
                return;
            }

            empty.classList.add('hidden');
            grid.innerHTML = allCommunities.map(renderCommunityCard).join('');
        } catch (e2) {
            console.error('Fallback error:', e2);
            grid.innerHTML = '';
            empty.classList.remove('hidden');
        }
    }
}

window.filterCommunities = (query) => {
    const grid = document.getElementById('communities-grid');
    const empty = document.getElementById('communities-empty');
    
    if (!allCommunities || allCommunities.length === 0) return;

    const filtered = allCommunities.filter(group => {
        const name = (group.name || '').toLowerCase();
        const desc = (group.description || '').toLowerCase();
        const branch = (group.branch || '').toLowerCase().replace(/_/g, ' ');
        const subject = (group.subject || '').toLowerCase();
        const q = query.toLowerCase();

        return name.includes(q) || desc.includes(q) || branch.includes(q) || subject.includes(q);
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-12 flex flex-col items-center justify-center text-center">
                <div class="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
                    <span class="material-symbols-outlined text-slate-500" style="font-size: 32px;">search_off</span>
                </div>
                <h3 class="text-white font-bold text-lg">No matches found</h3>
                <p class="text-slate-500 text-[13px] mt-1">Try a different search term</p>
            </div>
        `;
    } else {
        grid.innerHTML = filtered.map(renderCommunityCard).join('');
    }
};

function renderCommunityCard(group) {
    const memberCount = group.member_count || group.group_members?.length || 1;
    const creator = group.created_by_profile?.full_name || 'Anonymous';
    const branchLabel = group.branch ? group.branch.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
    const isOwner = currentUser && group.created_by === currentUser.id;

    return `
        <div class="group-card bg-[#0e1015]/40 backdrop-blur-md border border-white/[0.06] rounded-[20px] p-5 cursor-pointer"
             onclick="joinGroup('${group.id}')">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-purple-400" style="font-size:22px;">communities</span>
                    </div>
                    <div>
                        <h3 class="text-[15px] font-bold text-white leading-snug">${escapeHtml(group.name)}</h3>
                        <p class="text-[11px] text-slate-500 mt-0.5">by ${escapeHtml(creator)}</p>
                    </div>
                </div>
                <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full ${group.is_public !== false ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}">
                    ${group.is_public !== false ? 'Public' : 'Private'}
                </span>
            </div>

            ${group.description ? `<p class="text-[13px] text-slate-400 mb-3 line-clamp-2">${escapeHtml(group.description)}</p>` : ''}

            <div class="flex flex-wrap gap-2 mb-3">
                ${branchLabel ? `<span class="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-400">${branchLabel}</span>` : ''}
                ${group.subject ? `<span class="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">${escapeHtml(group.subject)}</span>` : ''}
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                <span class="text-[12px] text-slate-500 flex items-center gap-1.5">
                    <span class="material-symbols-outlined" style="font-size:15px;">group</span>
                    ${memberCount} member${memberCount !== 1 ? 's' : ''}
                </span>
                <span class="text-purple-400 text-[12px] font-semibold flex items-center gap-1">
                    ${isOwner ? '✨ Owner' : 'Join →'}
                </span>
            </div>
        </div>
    `;
}

// ═══════════ STUDY PEERS ═══════════
async function loadPeerRequests() {
    const grid = document.getElementById('peers-grid');
    const empty = document.getElementById('peers-empty');

    try {
        const { data: requests, error } = await window.supabase
            .from('peer_requests')
            .select(`*, requester:user_id (full_name, email)`)
            .eq('status', 'open')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!requests || requests.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        allPeerRequests = requests;
        empty.classList.add('hidden');
        grid.innerHTML = requests.map(renderPeerCard).join('');
    } catch (error) {
        console.error('Error loading peer requests:', error);
        grid.innerHTML = '';
        empty.classList.remove('hidden');
    }
}

function renderPeerCard(req) {
    const name = req.requester?.full_name || req.requester?.email?.split('@')[0] || 'Anonymous';
    const isOwn = currentUser && req.user_id === currentUser.id;
    const scheduleLabels = {
        anytime: '🕐 Anytime',
        morning: '🌅 Morning',
        afternoon: '☀️ Afternoon',
        evening: '🌆 Evening',
        night: '🌙 Night'
    };

    return `
        <div class="peer-card bg-[#0e1015]/40 backdrop-blur-md border border-white/[0.06] rounded-[20px] p-5">
            <div class="flex items-start gap-3 mb-3">
                <div class="relative">
                    <div class="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-700/15 border border-emerald-500/30 flex items-center justify-center text-[15px] font-bold text-emerald-300">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                    <div class="online-dot absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-[#0e1015]"></div>
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-[14px] font-bold text-white truncate">${escapeHtml(name)}</h3>
                    <p class="text-[12px] text-emerald-400 font-medium mt-0.5">${escapeHtml(req.topic)}</p>
                </div>
            </div>

            ${req.message ? `<p class="text-[13px] text-slate-400 mb-3 line-clamp-2">${escapeHtml(req.message)}</p>` : ''}

            <div class="flex flex-wrap gap-2 mb-4">
                <span class="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-400">
                    ${scheduleLabels[req.schedule] || '🕐 Anytime'}
                </span>
                ${req.branch ? `<span class="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-400">${req.branch.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>` : ''}
            </div>

            ${isOwn ?
                `<button disabled class="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] text-slate-500 text-[13px] font-semibold">Your Request</button>` :
                `<button onclick="connectWithPeer('${req.id}', '${req.user_id}')" class="w-full px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-[13px] font-semibold transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined" style="font-size:16px;">handshake</span>
                    Study Together
                </button>`
            }
        </div>
    `;
}

// ═══════════ MY GROUPS ═══════════
async function loadMyGroups() {
    const grid = document.getElementById('my-groups-grid');
    const empty = document.getElementById('my-groups-empty');

    if (!currentUser) {
        empty.classList.remove('hidden');
        return;
    }

    try {
        const { data: memberships, error } = await window.supabase
            .from('group_members')
            .select(`group_id, study_groups (*)`)
            .eq('user_id', currentUser.id);

        if (error) throw error;

        const groups = memberships?.map(m => m.study_groups).filter(Boolean) || [];

        if (groups.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        grid.innerHTML = groups.map(renderCommunityCard).join('');
    } catch (error) {
        console.error('Error loading my groups:', error);
        grid.innerHTML = '';
        empty.classList.remove('hidden');
    }
}

// ═══════════ MODALS ═══════════
window.openCreateCommunityModal = () => {
    document.getElementById('create-community-modal').classList.remove('hidden');
};
window.closeCreateCommunityModal = () => {
    document.getElementById('create-community-modal').classList.add('hidden');
    document.getElementById('create-community-form').reset();
};
window.openFindPeerModal = () => {
    document.getElementById('find-peer-modal').classList.remove('hidden');
};
window.closeFindPeerModal = () => {
    document.getElementById('find-peer-modal').classList.add('hidden');
    document.getElementById('find-peer-form').reset();
};

// ═══════════ CREATE COMMUNITY ═══════════
window.handleCreateCommunity = async (e) => {
    e.preventDefault();

    const name = document.getElementById('community-name').value.trim();
    const description = document.getElementById('community-desc').value.trim() || null;
    const branch = document.getElementById('community-branch').value || null;
    const subject = document.getElementById('community-subject').value.trim() || null;
    const isPublic = document.getElementById('community-public').checked;

    if (!name) {
        showToast('Community name is required', 'error');
        return;
    }

    try {
        const { data: group, error } = await window.supabase
            .from('study_groups')
            .insert([{
                name,
                description,
                branch,
                subject,
                is_public: isPublic,
                group_type: 'community',
                created_by: currentUser.id,
                member_count: 1
            }])
            .select()
            .single();

        if (error) throw error;

        // Add creator as admin
        await window.supabase.from('group_members').insert({
            group_id: group.id,
            user_id: currentUser.id,
            role: 'admin'
        });

        showToast(`Community "${name}" created! 🎉`, 'success');
        closeCreateCommunityModal();
        await loadCommunities();
    } catch (error) {
        console.error('Error creating community:', error);
        showToast(error.message || 'Failed to create community', 'error');
    }
};

// ═══════════ CREATE PEER REQUEST ═══════════
window.handleCreatePeerRequest = async (e) => {
    e.preventDefault();

    const topic = document.getElementById('peer-topic').value.trim();
    const message = document.getElementById('peer-message').value.trim() || null;
    const schedule = document.getElementById('peer-schedule').value;
    const branch = document.getElementById('peer-branch').value || null;

    if (!topic) {
        showToast('Study topic is required', 'error');
        return;
    }

    try {
        const { error } = await window.supabase
            .from('peer_requests')
            .insert([{
                user_id: currentUser.id,
                topic,
                message,
                schedule,
                branch,
                status: 'open'
            }]);

        if (error) throw error;

        showToast('Peer request posted! 🤝', 'success');
        closeFindPeerModal();
        await loadPeerRequests();
        switchTab('peers');
    } catch (error) {
        console.error('Error creating peer request:', error);
        showToast(error.message || 'Failed to post request', 'error');
    }
};

// ═══════════ JOIN GROUP ═══════════
window.joinGroup = async (groupId) => {
    if (!currentUser) return;

    try {
        const { data: existing } = await window.supabase
            .from('group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', currentUser.id)
            .single();

        if (existing) {
            // Already a member — go straight to chat
            window.location.href = `group-chat.html?id=${groupId}`;
            return;
        }

        await window.supabase.from('group_members').insert({
            group_id: groupId,
            user_id: currentUser.id
        });

        // Increment member count
        const group = allCommunities.find(g => g.id === groupId);
        if (group) {
            await window.supabase
                .from('study_groups')
                .update({ member_count: (group.member_count || 1) + 1 })
                .eq('id', groupId);
        }

        showToast('Joined community! 🎉', 'success');
        // Navigate to chat after joining
        setTimeout(() => {
            window.location.href = `group-chat.html?id=${groupId}`;
        }, 800);
    } catch (error) {
        console.error('Error joining group:', error);
        showToast(error.message || 'Failed to join group', 'error');
    }
};

// ═══════════ CONNECT WITH PEER ═══════════
window.connectWithPeer = async (requestId, peerId) => {
    if (!currentUser) return;

    try {
        // Create a 1-on-1 study group
        const { data: group, error } = await window.supabase
            .from('study_groups')
            .insert([{
                name: `Study Session`,
                group_type: 'peer',
                created_by: currentUser.id,
                member_count: 2,
                is_public: false
            }])
            .select()
            .single();

        if (error) throw error;

        // Add both users as members
        await window.supabase.from('group_members').insert([
            { group_id: group.id, user_id: currentUser.id },
            { group_id: group.id, user_id: peerId }
        ]);

        // Mark peer request as matched
        await window.supabase
            .from('peer_requests')
            .update({ status: 'matched' })
            .eq('id', requestId);

        showToast('Connected! Entering study room... 🤝', 'success');
        // Get the peer request topic for the room
        const peerReq = allPeerRequests.find(r => r.id === requestId);
        const topic = peerReq?.topic || 'Study Session';
        // Navigate to study room
        setTimeout(() => {
            window.location.href = `study-room.html?id=${group.id}&topic=${encodeURIComponent(topic)}`;
        }, 800);
    } catch (error) {
        console.error('Error connecting with peer:', error);
        showToast(error.message || 'Failed to connect', 'error');
    }
};

// ═══════════ HELPERS ═══════════
function showEmpty(section) {
    const empty = document.getElementById(`${section}-empty`);
    if (empty) empty.classList.remove('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ═══════════ Toast Notification ═══════════
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = { success: 'check_circle', error: 'error', info: 'info' };

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
        }, 4000);
    } else {
        setTimeout(() => toast.remove(), 4000);
    }
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:12px;pointer-events:none;';
    document.body.appendChild(container);
    return container;
}
