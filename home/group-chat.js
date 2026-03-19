// ═══════════ Community Chat Scripts ═══════════

let currentUser = null;
let groupId = null;
let groupData = null;
let messageSubscription = null;
let attachedFile = null;

// ═══════════ Init ═══════════
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) { window.location.href = 'groups.html'; return; }

    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) { window.location.href = '../login/login.html'; return; }
    currentUser = user;

    // Get group ID from URL
    const params = new URLSearchParams(window.location.search);
    groupId = params.get('id');
    if (!groupId) { window.location.href = 'groups.html'; return; }

    await loadGroupInfo();
    await loadMessages();
    subscribeToMessages();
    loadMembers();
});

// ═══════════ Load Group Info ═══════════
async function loadGroupInfo() {
    try {
        const { data, error } = await window.supabase
            .from('study_groups')
            .select('*')
            .eq('id', groupId)
            .single();

        if (error || !data) { window.location.href = 'groups.html'; return; }
        groupData = data;

        document.getElementById('chat-group-name').textContent = data.name;
        document.getElementById('chat-member-count').textContent = `${data.member_count || 1} members`;
        document.getElementById('sidebar-desc').textContent = data.description || 'No description';

        // Tags
        const tagsEl = document.getElementById('sidebar-tags');
        let tags = '';
        if (data.branch) {
            const label = data.branch.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            tags += `<span class="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-400">${label}</span>`;
        }
        if (data.subject) {
            tags += `<span class="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">${esc(data.subject)}</span>`;
        }
        tagsEl.innerHTML = tags || '<span class="text-[11px] text-slate-600">No tags</span>';

        document.title = `${data.name} — Chat — StudyPlatform`;
    } catch (e) {
        console.error('Error loading group:', e);
    }
}

// ═══════════ Load Messages ═══════════
async function loadMessages() {
    try {
        const { data: messages, error } = await window.supabase
            .from('group_messages')
            .select('*, sender:sender_id (full_name, email)')
            .eq('group_id', groupId)
            .order('created_at', { ascending: true })
            .limit(200);

        if (error) throw error;

        const area = document.getElementById('messages-area');
        const welcome = document.getElementById('welcome-msg');

        if (!messages || messages.length === 0) {
            welcome.classList.remove('hidden');
            return;
        }

        welcome.classList.add('hidden');

        // Group messages by date
        let lastDate = '';
        let html = '';
        messages.forEach(msg => {
            const date = new Date(msg.created_at).toLocaleDateString();
            if (date !== lastDate) {
                html += renderDateDivider(date);
                lastDate = date;
            }
            html += renderMessage(msg);
        });

        area.innerHTML = html;
        scrollToBottom();
    } catch (e) {
        console.error('Error loading messages:', e);
    }
}

// ═══════════ Render Message ═══════════
function renderMessage(msg) {
    const isOwn = msg.sender_id === currentUser.id;
    const name = msg.sender?.full_name || msg.sender?.email?.split('@')[0] || 'User';
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initial = name.charAt(0).toUpperCase();

    // Check if message has file attachment
    const fileMatch = msg.message?.match(/\[FILE:(.+?)\]\((.+?)\)/);
    let fileHtml = '';
    let textContent = msg.message || '';

    if (fileMatch) {
        const fileName = fileMatch[1];
        const fileUrl = fileMatch[2];
        textContent = textContent.replace(fileMatch[0], '').trim();
        fileHtml = `
            <a href="${esc(fileUrl)}" target="_blank" class="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all group/file">
                <span class="material-symbols-outlined text-primary" style="font-size:18px;">description</span>
                <span class="text-[12px] text-slate-300 truncate flex-1">${esc(fileName)}</span>
                <span class="material-symbols-outlined text-slate-500 group-hover/file:text-primary" style="font-size:16px;">download</span>
            </a>
        `;
    }

    if (isOwn) {
        return `
            <div class="msg-bubble msg-own flex flex-col items-end max-w-[75%] mb-1">
                <div class="bg-primary/20 border border-primary/15 rounded-2xl rounded-br-md px-4 py-2.5">
                    ${textContent ? `<p class="text-[13px] text-white leading-relaxed whitespace-pre-wrap">${esc(textContent)}</p>` : ''}
                    ${fileHtml}
                </div>
                <span class="text-[10px] text-slate-600 mt-1 mr-1">${time}</span>
            </div>
        `;
    } else {
        return `
            <div class="msg-bubble msg-other flex gap-2.5 max-w-[75%] mb-1">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-700/15 border border-purple-500/20 flex items-center justify-center text-[12px] font-bold text-purple-300 shrink-0 mt-1">
                    ${initial}
                </div>
                <div class="flex flex-col">
                    <span class="text-[11px] font-semibold text-purple-400 mb-0.5">${esc(name)}</span>
                    <div class="bg-white/[0.05] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-2.5">
                        ${textContent ? `<p class="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap">${esc(textContent)}</p>` : ''}
                        ${fileHtml}
                    </div>
                    <span class="text-[10px] text-slate-600 mt-1 ml-1">${time}</span>
                </div>
            </div>
        `;
    }
}

function renderDateDivider(dateStr) {
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    let label = dateStr;
    if (dateStr === today) label = 'Today';
    else if (dateStr === yesterday) label = 'Yesterday';

    return `
        <div class="flex items-center gap-4 py-4">
            <div class="flex-1 h-px bg-white/[0.06]"></div>
            <span class="text-[11px] text-slate-600 font-medium">${label}</span>
            <div class="flex-1 h-px bg-white/[0.06]"></div>
        </div>
    `;
}

// ═══════════ Real-time Subscription ═══════════
function subscribeToMessages() {
    messageSubscription = window.supabase
        .channel(`group-${groupId}`)
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
            async (payload) => {
                const msg = payload.new;
                // Don't duplicate our own messages (already added optimistically)
                if (msg.sender_id === currentUser.id) return;

                // Fetch sender info
                const { data: sender } = await window.supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', msg.sender_id)
                    .single();

                msg.sender = sender;

                const area = document.getElementById('messages-area');
                document.getElementById('welcome-msg')?.classList.add('hidden');
                area.insertAdjacentHTML('beforeend', renderMessage(msg));
                scrollToBottom();
            }
        )
        .subscribe();
}

// ═══════════ Send Message ═══════════
window.sendMessage = async () => {
    const input = document.getElementById('msg-input');
    let text = input.value.trim();

    if (!text && !attachedFile) return;

    // Handle file upload first
    let fileRef = '';
    if (attachedFile) {
        try {
            const fileName = `${Date.now()}_${attachedFile.name}`;
            const filePath = `group-files/${groupId}/${fileName}`;
            const { error } = await window.supabase.storage
                .from('materials')
                .upload(filePath, attachedFile);

            if (error) throw error;

            const { data: urlData } = window.supabase.storage
                .from('materials')
                .getPublicUrl(filePath);

            fileRef = `[FILE:${attachedFile.name}](${urlData.publicUrl})`;
        } catch (e) {
            console.error('File upload error:', e);
            showToast('Failed to upload file', 'error');
        }
        clearFileAttachment();
    }

    const fullMessage = [text, fileRef].filter(Boolean).join('\n');
    if (!fullMessage) return;

    // Optimistic UI
    input.value = '';
    input.style.height = 'auto';

    const optimisticMsg = {
        sender_id: currentUser.id,
        message: fullMessage,
        created_at: new Date().toISOString(),
        sender: { full_name: 'You', email: currentUser.email }
    };

    const area = document.getElementById('messages-area');
    document.getElementById('welcome-msg')?.classList.add('hidden');
    area.insertAdjacentHTML('beforeend', renderMessage(optimisticMsg));
    scrollToBottom();

    // Send to Supabase
    try {
        const { error } = await window.supabase
            .from('group_messages')
            .insert({
                group_id: groupId,
                sender_id: currentUser.id,
                message: fullMessage
            });

        if (error) throw error;
    } catch (e) {
        console.error('Send error:', e);
        showToast('Failed to send message', 'error');
    }
};

// ═══════════ File Attachment ═══════════
window.handleFileAttach = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    attachedFile = file;
    document.getElementById('file-preview').classList.remove('hidden');
    document.getElementById('file-preview-name').textContent = file.name;
};

window.clearFileAttachment = () => {
    attachedFile = null;
    document.getElementById('file-preview').classList.add('hidden');
    document.getElementById('file-attach').value = '';
};

// ═══════════ Input Handling ═══════════
window.handleInputKeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

window.autoResizeInput = (el) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 128) + 'px';
};

// ═══════════ Load Members ═══════════
async function loadMembers() {
    try {
        const { data: members } = await window.supabase
            .from('group_members')
            .select('*, profile:user_id (full_name, email)')
            .eq('group_id', groupId);

        const list = document.getElementById('members-list');
        if (!members || members.length === 0) {
            list.innerHTML = '<p class="text-[12px] text-slate-600">No members</p>';
            return;
        }

        list.innerHTML = members.map(m => {
            const name = m.profile?.full_name || m.profile?.email?.split('@')[0] || 'User';
            const isAdmin = m.role === 'admin';
            const initial = name.charAt(0).toUpperCase();
            return `
                <div class="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <div class="relative">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/25 to-purple-700/10 border border-purple-500/20 flex items-center justify-center text-[11px] font-bold text-purple-300">
                            ${initial}
                        </div>
                        <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-[#0e1015]"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[13px] font-medium text-slate-300 truncate">${esc(name)}</p>
                        ${isAdmin ? '<p class="text-[10px] text-purple-400 font-semibold">Admin</p>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Error loading members:', e);
    }
}

// ═══════════ Sidebar Toggle ═══════════
window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
    sidebar.classList.toggle('hidden');
};

// ═══════════ Helpers ═══════════
function scrollToBottom() {
    const area = document.getElementById('messages-area');
    setTimeout(() => { area.scrollTop = area.scrollHeight; }, 50);
}

function esc(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

// Cleanup on leave
window.addEventListener('beforeunload', () => {
    if (messageSubscription) messageSubscription.unsubscribe();
});
