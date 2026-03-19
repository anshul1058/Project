// browse.js - Materials Browse Page

import { extractTextFromPDF } from './ai-service.js';
import { getRecommendations, getTrendingMaterials, clearRecommendationCache } from './recommendations.js';

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
        const { error } = await window.supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    // Redirect to login page
    window.location.href = '../login/login.html';
};

// Load user email into menu
function loadUserInfo() {
    if (!window.supabase) return;
    
    window.supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
            const emailElement = document.getElementById('user-email');
            if (emailElement) {
                emailElement.textContent = user.email || 'User';
            }
        }
    }).catch(error => {
        console.error('Error loading user:', error);
        // Redirect to login if not authenticated
        window.location.href = '../login/login.html';
    });
}

// State
let currentFilters = {
    stream: '',
    branch: '',
    semester: '',
    category: '',
    search: '',
    sort: 'newest'
};

let allMaterials = [];
let filteredMaterials = [];

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const sortSelect = document.getElementById('sort-select');
const streamFilter = document.getElementById('stream-filter');
const branchFilter = document.getElementById('branch-filter');
const semesterFilter = document.getElementById('semester-filter');
const categoryFilter = document.getElementById('category-filter');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const activeFiltersContainer = document.getElementById('active-filters');
const materialsGrid = document.getElementById('materials-grid');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const previewModal = document.getElementById('preview-modal');
const previewContainer = document.getElementById('preview-container');
const recommendationsGrid = document.getElementById('recommendations-grid');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    loadUserInfo();

    // Check URL params for initial search
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('q')) {
        currentFilters.search = urlParams.get('q').toLowerCase();
        searchInput.value = urlParams.get('q');
    }

    await loadMaterials();

    // Apply initial filters if any
    if(currentFilters.search) {
        applyFilters();
    }

    await loadRecommendations();
    setupEventListeners();
});

// Load materials from Supabase
async function loadMaterials() {
    if (!window.supabase) {
        showToast('Supabase not initialized', 'error');
        return;
    }

    loadingState.classList.remove('hidden');
    loadingState.classList.add('flex');
    materialsGrid.innerHTML = '';

    try {
        const { data, error } = await supabase
            .from('materials')
            .select(`
                *,
                profiles:uploader_id (full_name, avatar_url),
                reviews (rating)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allMaterials = data || [];
        filteredMaterials = allMaterials;
        renderMaterials();

    } catch (error) {
        console.error('Error loading materials:', error);
        showToast('Failed to load materials', 'error');
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
    } finally {
        loadingState.classList.add('hidden');
        loadingState.classList.remove('flex');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Search on typing
    searchInput.addEventListener('input', (e) => {
        currentFilters.search = e.target.value.toLowerCase();
        applyFilters();
    });

    // Search on Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            currentFilters.search = searchInput.value.toLowerCase();
            applyFilters();
        }
    });

    // Search button click
    searchBtn.addEventListener('click', () => {
        currentFilters.search = searchInput.value.toLowerCase();
        applyFilters();
    });

    // Sort
    sortSelect.addEventListener('change', (e) => {
        currentFilters.sort = e.target.value;
        applyFilters();
    });

    // Filter dropdowns (always visible)
    streamFilter.addEventListener('change', (e) => {
        currentFilters.stream = e.target.value;
        updateActiveFilters();
        applyFilters();
    });

    branchFilter.addEventListener('change', (e) => {
        currentFilters.branch = e.target.value;
        updateActiveFilters();
        applyFilters();
    });

    semesterFilter.addEventListener('change', (e) => {
        currentFilters.semester = e.target.value;
        updateActiveFilters();
        applyFilters();
    });

    categoryFilter.addEventListener('change', (e) => {
        currentFilters.category = e.target.value;
        updateActiveFilters();
        applyFilters();
    });

    // Clear filters button
    clearFiltersBtn.addEventListener('click', () => {
        clearFilters();
    });
}

// Clear all filters
function clearFilters() {
    currentFilters = { stream: '', branch: '', semester: '', category: '', search: '', sort: 'newest' };
    streamFilter.value = '';
    branchFilter.value = '';
    semesterFilter.value = '';
    categoryFilter.value = '';
    sortSelect.value = 'newest';
    searchInput.value = '';
    activeFiltersContainer.innerHTML = '';
    filteredMaterials = allMaterials;
    renderMaterials();
}

// Update active filters display
function updateActiveFilters() {
    activeFiltersContainer.innerHTML = '';

    const streamNames = { '10': '10th', '11': '11th', 'btech': 'B.Tech', 'jee': 'JEE', 'upsc': 'UPSC', 'neet': 'NEET' };
    if (currentFilters.stream) {
        activeFiltersContainer.innerHTML += createActiveFilterChip('Stream: ' + (streamNames[currentFilters.stream] || currentFilters.stream), 'stream');
    }
    if (currentFilters.branch) {
        activeFiltersContainer.innerHTML += createActiveFilterChip('Branch: ' + formatBranch(currentFilters.branch), 'branch');
    }
    if (currentFilters.semester) {
        activeFiltersContainer.innerHTML += createActiveFilterChip('Semester ' + currentFilters.semester, 'semester');
    }
    if (currentFilters.category) {
        activeFiltersContainer.innerHTML += createActiveFilterChip(formatCategory(currentFilters.category), 'category');
    }
}

function createActiveFilterChip(text, type) {
    return `
        <span class="inline-flex items-center gap-1.5 bg-primary/20 border border-primary/30 text-white px-3 py-1 rounded-full text-[12px] font-medium">
            ${text}
            <button onclick="removeFilter('${type}')" class="hover:text-red-400 transition-colors">
                <span class="material-symbols-outlined" style="font-size:16px;">close</span>
            </button>
        </span>
    `;
}

window.removeFilter = (type) => {
    if (type === 'stream') {
        currentFilters.stream = '';
        streamFilter.value = '';
    } else if (type === 'branch') {
        currentFilters.branch = '';
        branchFilter.value = '';
    } else if (type === 'semester') {
        currentFilters.semester = '';
        semesterFilter.value = '';
    } else if (type === 'category') {
        currentFilters.category = '';
        categoryFilter.value = '';
    }
    updateActiveFilters();
    applyFilters();
};

// Load recommendations
async function loadRecommendations() {
    try {
        const recommendations = await getRecommendations(6);
        
        if (!recommendations || recommendations.length === 0) {
            recommendationsGrid.innerHTML = '<p class="col-span-full text-slate-500 text-center py-8">No recommendations available.</p>';
            return;
        }

        recommendationsGrid.innerHTML = recommendations.map(material => `
            <div class="recommendation-card" onclick="openMaterialPreview('${material.id}')">
                <span class="recommendation-badge">Recommended for you</span>
                
                <h3>${material.title}</h3>
                
                <div class="recommendation-meta">
                    <span>
                        <span class="material-symbols-outlined" style="font-size: 14px;">school</span>
                        ${material.branch || 'N/A'}
                    </span>
                    <span>
                        <span class="material-symbols-outlined" style="font-size: 14px;">calendar_month</span>
                        Sem ${material.semester}
                    </span>
                </div>

                <div class="recommendation-badge-category ${material.category || 'other'}">
                    <span class="material-symbols-outlined" style="font-size: 12px;">label</span>
                    ${material.category ? material.category.replace(/_/g, ' ') : 'Other'}
                </div>

                <div class="recommendation-card-footer">
                    <div class="recommendation-rating">
                        ${renderStars(material.avg_rating || 0)}
                        <span style="color: #64748b; font-size: 12px;">${(material.avg_rating || 0).toFixed(1)}</span>
                    </div>
                    <div class="recommendation-stats">
                        <span>
                            <span class="material-symbols-outlined" style="font-size: 14px;">download</span>
                            ${material.downloads && material.downloads[0] ? material.downloads[0].count : 0}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading recommendations:', error);
        recommendationsGrid.innerHTML = '<p class="col-span-full text-slate-500 text-center py-8">Unable to load recommendations.</p>';
    }
}

// Helper function to render stars
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<span class="material-symbols-outlined star" style="font-size: 16px;">star</span>';
        } else if (i - rating < 1) {
            stars += '<span class="material-symbols-outlined star" style="font-size: 16px; color: rgba(251, 191, 36, 0.5);">star_half</span>';
        } else {
            stars += '<span class="material-symbols-outlined star" style="font-size: 16px; color: rgba(251, 191, 36, 0.3);">star</span>';
        }
    }
    return stars;
}

// Apply filters and sorting
function applyFilters() {
    filteredMaterials = allMaterials.filter(m => {
        const matchesSearch = !currentFilters.search ||
            m.title.toLowerCase().includes(currentFilters.search) ||
            m.subject.toLowerCase().includes(currentFilters.search) ||
            (m.description && m.description.toLowerCase().includes(currentFilters.search)) ||
            (m.stream && m.stream.toLowerCase().includes(currentFilters.search)) ||
            (m.university && m.university.toLowerCase().includes(currentFilters.search)) ||
            (m.college && m.college.toLowerCase().includes(currentFilters.search));

        const matchesBranch = !currentFilters.branch || m.branch === currentFilters.branch;
        const matchesSemester = !currentFilters.semester || m.semester === parseInt(currentFilters.semester);
        const matchesCategory = !currentFilters.category || m.category === currentFilters.category;
        const matchesStream = !currentFilters.stream || m.stream === currentFilters.stream;

        return matchesSearch && matchesBranch && matchesSemester && matchesCategory && matchesStream;
    });

    // Sort
    sortMaterials();
    renderMaterials();
}

function sortMaterials() {
    switch (currentFilters.sort) {
        case 'newest':
            filteredMaterials.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'popular':
            filteredMaterials.sort((a, b) => b.downloads - a.downloads);
            break;
        case 'rating':
            filteredMaterials.sort((a, b) => b.avg_rating - a.avg_rating);
            break;
        case 'downloads':
            filteredMaterials.sort((a, b) => b.downloads - a.downloads);
            break;
        case 'az':
            filteredMaterials.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
}

// Render materials grid
function renderMaterials() {
    if (filteredMaterials.length === 0) {
        materialsGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
        return;
    }

    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');

    materialsGrid.innerHTML = filteredMaterials.map(material => {
        const avgRating = material.avg_rating || 0;
        const reviewCount = material.reviews?.length || 0;
        const uploaderName = material.profiles?.full_name || 'Anonymous';

        return `
            <div class="material-card" onclick="openMaterialPreview('${material.id}')">
                <div class="flex items-start justify-between mb-3">
                    <span class="category-badge ${material.category}">
                        <span class="material-symbols-outlined" style="font-size:14px;">${getCategoryIcon(material.category)}</span>
                        ${material.category}
                    </span>
                    ${avgRating > 0 ? `
                        <div class="rating-stars">
                            ${renderStars(avgRating)}
                            <span class="text-[11px] text-slate-500 ml-1">(${reviewCount})</span>
                        </div>
                    ` : ''}
                </div>

                <h3 class="text-[15px] font-bold text-white mb-1 line-clamp-2">${material.title}</h3>
                <p class="text-[12px] text-slate-500 mb-3 line-clamp-2">${material.description || 'No description'}</p>

                <div class="flex flex-wrap gap-2 mb-3">
                    ${material.stream ? `
                        <span class="branch-tag">
                            <span class="material-symbols-outlined" style="font-size:14px;">category</span>
                            ${material.stream.toUpperCase()}
                        </span>
                    ` : ''}
                    ${material.branch ? `
                        <span class="branch-tag">
                            <span class="material-symbols-outlined" style="font-size:14px;">school</span>
                            ${formatBranch(material.branch)}
                        </span>
                    ` : ''}
                    ${material.semester ? `
                        <span class="branch-tag">
                            <span class="material-symbols-outlined" style="font-size:14px;">layers</span>
                            Sem ${material.semester}
                        </span>
                    ` : ''}
                    <span class="branch-tag">
                        <span class="material-symbols-outlined" style="font-size:14px;">menu_book</span>
                        ${material.subject}
                    </span>
                </div>

                <div class="stats-row">
                    <span class="stat">
                        <span class="material-symbols-outlined">download</span>
                        ${material.downloads}
                    </span>
                    <span class="stat">
                        <span class="material-symbols-outlined">visibility</span>
                        ${material.view_count || 0}
                    </span>
                    <span class="stat">
                        <span class="material-symbols-outlined">person</span>
                        ${uploaderName}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function getCategoryIcon(category) {
    const icons = {
        notes: 'sticky_note_2',
        pyqs: 'help_center',
        assignments: 'assignment',
        books: 'menu_book',
        presentations: 'presentation',
        other: 'folder'
    };
    return icons[category] || 'folder';
}

function formatBranch(branch) {
    if (!branch) return 'General';
    const names = {
        computer_science: 'CS',
        mechanical: 'Mech',
        electrical: 'EE',
        electronics: 'ECE',
        civil: 'Civil',
        entc: 'ENTC',
        it: 'IT',
        mathematics: 'Math',
        physics: 'Physics',
        chemistry: 'Chem',
        humanities: 'Humanities'
    };
    return names[branch] || branch.replace(/_/g, ' ');
}

function formatCategory(category) {
    const names = {
        notes: 'Notes',
        pyqs: 'PYQs',
        assignments: 'Assignments',
        books: 'Books',
        presentations: 'Presentations',
        other: 'Other'
    };
    return names[category] || category;
}

// Open material preview modal
window.openMaterialPreview = async (materialId) => {
    const material = allMaterials.find(m => m.id === materialId);
    if (!material) return;

    // Increment view count
    supabase.from('materials').update({ view_count: (material.view_count || 0) + 1 }).eq('id', materialId);

    previewModal.classList.remove('hidden');
    previewModal.classList.add('flex');

    const fileUrl = material.file_url;
    const fileType = material.file_type || '';
    const isPDF = fileType.includes('pdf') || fileUrl.toLowerCase().endsWith('.pdf');
    const isImage = fileType.startsWith('image/');

    let previewHTML = '';

    if (isPDF) {
        // Use iframe for PDF — works reliably, avoids CORS
        previewHTML = `
            <div class="flex flex-col items-center gap-4 w-full h-full">
                <div class="flex items-center gap-3 mb-2">
                    <h2 class="text-xl font-bold text-white">${material.title}</h2>
                </div>
                <iframe src="${fileUrl}" 
                    class="w-full rounded-xl border border-white/10" 
                    style="height: 75vh; max-width: 900px;"
                    frameborder="0">
                </iframe>
                <div class="flex gap-3 mt-2">
                    <button onclick="downloadMaterial('${materialId}')" class="rounded-xl bg-primary hover:bg-primary-dark px-6 py-2.5 text-[14px] font-semibold text-gray-900 transition-all">
                        <span class="material-symbols-outlined align-middle mr-1" style="font-size:18px;">download</span>
                        Download
                    </button>
                    <button onclick="setupRatingModal('${materialId}')" class="rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 px-6 py-2.5 text-[14px] font-semibold text-yellow-400 transition-all">
                        <span class="material-symbols-outlined align-middle mr-1" style="font-size:18px;">star</span>
                        Rate
                    </button>
                    <button onclick="closePreviewModal()" class="rounded-xl bg-white/[0.05] hover:bg-white/[0.1] px-6 py-2.5 text-[14px] font-semibold text-white transition-all">
                        Close
                    </button>
                </div>
            </div>
        `;
    } else if (isImage) {
        previewHTML = `
            <div class="flex flex-col items-center gap-4">
                <h2 class="text-xl font-bold text-white">${material.title}</h2>
                <div class="overflow-auto max-h-[70vh]">
                    <img src="${fileUrl}" alt="${material.title}" class="max-w-full rounded-xl border border-white/10" />
                </div>
                <div class="flex gap-3 mt-2">
                    <button onclick="downloadMaterial('${materialId}')" class="rounded-xl bg-primary hover:bg-primary-dark px-6 py-2.5 text-[14px] font-semibold text-gray-900 transition-all">
                        <span class="material-symbols-outlined align-middle mr-1" style="font-size:18px;">download</span>
                        Download
                    </button>
                    <button onclick="closePreviewModal()" class="rounded-xl bg-white/[0.05] hover:bg-white/[0.1] px-6 py-2.5 text-[14px] font-semibold text-white transition-all">
                        Close
                    </button>
                </div>
            </div>
        `;
    } else {
        // Non-previewable file
        previewHTML = `
            <div class="flex flex-col items-center gap-4">
                <span class="material-symbols-outlined text-primary" style="font-size:64px;">description</span>
                <h2 class="text-xl font-bold text-white">${material.title}</h2>
                <p class="text-slate-400 text-[14px]">${material.file_type || 'Unknown'} file — preview not available</p>
                <div class="flex gap-3 mt-4">
                    <button onclick="downloadMaterial('${materialId}')" class="rounded-xl bg-primary hover:bg-primary-dark px-6 py-2.5 text-[14px] font-semibold text-gray-900 transition-all">
                        <span class="material-symbols-outlined align-middle mr-1" style="font-size:18px;">download</span>
                        Download
                    </button>
                    <button onclick="setupRatingModal('${materialId}')" class="rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 px-6 py-2.5 text-[14px] font-semibold text-yellow-400 transition-all">
                        <span class="material-symbols-outlined align-middle mr-1" style="font-size:18px;">star</span>
                        Rate
                    </button>
                    <button onclick="closePreviewModal()" class="rounded-xl bg-white/[0.05] hover:bg-white/[0.1] px-6 py-2.5 text-[14px] font-semibold text-white transition-all">
                        Close
                    </button>
                </div>
            </div>
        `;
    }

    previewContainer.innerHTML = previewHTML;
};

window.closePreviewModal = () => {
    previewModal.classList.add('hidden');
    previewModal.classList.remove('flex');
    previewContainer.innerHTML = '';
};

// Download material
window.downloadMaterial = async (materialId) => {
    const material = allMaterials.find(m => m.id === materialId);
    if (!material || !material.file_url) return;

    // Track download
    if (window.supabase) {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (user) {
            await window.supabase.from('downloads').insert({ material_id: materialId, user_id: user.id });
            // Clear recommendation cache since user's interaction changed
            clearRecommendationCache();
        }
    }

    // Trigger download
    const a = document.createElement('a');
    a.href = material.file_url;
    a.download = material.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast('Download started!', 'success');
    closePreviewModal();
};

// ═══════════ Rating System ═══════════
let currentMaterialRating = null;
let currentRating = 0;

window.setupRatingModal = (materialId) => {
    currentMaterialRating = materialId;
    currentRating = 0;
    document.getElementById('rating-modal').classList.remove('hidden');
    document.getElementById('rating-comment').value = '';
    updateStarUI();

    // Setup star buttons
    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentRating = parseInt(btn.dataset.rating);
            updateStarUI();
        });
    });
};

window.closeRatingModal = () => {
    document.getElementById('rating-modal').classList.add('hidden');
    currentMaterialRating = null;
    currentRating = 0;
};

function updateStarUI() {
    document.querySelectorAll('.star-btn').forEach((btn, idx) => {
        const rating = idx + 1;
        const icon = btn.querySelector('span');
        if (rating <= currentRating) {
            icon.textContent = 'star';
            icon.style.color = 'var(--primary-color, #f2b90d)';
            btn.style.color = 'var(--primary-color, #f2b90d)';
        } else {
            icon.textContent = 'star';
            icon.style.color = 'rgba(100,116,139,0.5)';
            btn.style.color = 'rgba(100,116,139,0.5)';
        }
    });
}

window.handleRateSubmit = async (e) => {
    e.preventDefault();

    if (!currentRating) {
        showToast('Please select a rating', 'error');
        return;
    }

    if (!window.supabase || !currentMaterialRating) {
        showToast('Error: Not authenticated', 'error');
        return;
    }

    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) {
        showToast('Please log in to rate materials', 'error');
        return;
    }

    const comment = document.getElementById('rating-comment').value.trim();

    try {
        // Submit rating
        await window.supabase.from('reviews').upsert({
            material_id: currentMaterialRating,
            user_id: user.id,
            rating: currentRating,
            comment: comment || null
        });

        // Recalculate average rating
        const { data: reviews } = await window.supabase
            .from('reviews')
            .select('rating')
            .eq('material_id', currentMaterialRating);

        if (reviews && reviews.length > 0) {
            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            await window.supabase
                .from('materials')
                .update({ avg_rating: avgRating })
                .eq('id', currentMaterialRating);
        }

        showToast('Thank you for rating! 🙏', 'success');
        closeRatingModal();
        // Clear recommendation cache since user's interaction changed
        clearRecommendationCache();
        await loadMaterials(); // Reload to show updated ratings
        await loadRecommendations(); // Reload recommendations with new preferences

    } catch (error) {
        console.error('Rating error:', error);
        showToast(error.message || 'Failed to submit rating', 'error');
    }
};

// Toast notification
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.style.cssText = 'display:flex;align-items:gap-3;px-4;py-3;rounded-xl;backdrop-blur-xl;border;border-solid;shadow-lg;bg-white/10;border-white/20;text-white;';

    const icons = { success: 'check_circle', error: 'error', info: 'info' };

    toast.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:20px;">${icons[type] || icons.info}</span>
        <span class="text-[13px] font-medium">${message}</span>
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

// String prototype for title case
String.prototype.titleCase = function() {
    return this.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};
