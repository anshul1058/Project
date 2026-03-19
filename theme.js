// ───── Global Theme Manager ─────

const THEMES = {
    yellow: { primary: '#f2b90d', dark: '#c9990a', label: 'Yellow' },
    purple: { primary: '#a855f7', dark: '#9333ea', label: 'Purple' },
    white: { primary: '#f8fafc', dark: '#cbd5e1', label: 'White' },
    blue: { primary: '#3b82f6', dark: '#2563eb', label: 'Blue' },
    green: { primary: '#10b981', dark: '#059669', label: 'Green' },
    pink: { primary: '#ec4899', dark: '#db2777', label: 'Pink' },
    red: { primary: '#ef4444', dark: '#dc2626', label: 'Red' },
    orange: { primary: '#f97316', dark: '#ea580c', label: 'Orange' },
};

// 1. Get saved theme or default to yellow
const savedTheme = localStorage.getItem('study_platform_theme') || 'yellow';
const savedDarkMode = localStorage.getItem('study_platform_dark_mode') !== 'false'; // Default to dark

// Utility to convert Hex to RGB string for Tailwind
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r} ${g} ${b}`;
}

// 2. Set Tailwind Config dynamically using CSS Variables
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "rgb(var(--primary-color-rgb) / <alpha-value>)",
                "primary-dark": "rgb(var(--primary-dark-rgb) / <alpha-value>)",
                "bg-dark": "#0e1015",
                "bg-dark-elevated": "#161a21",
                "bg-card": "#1a1e27",
                "surface": "#21262f",
            },
            fontFamily: {
                "display": ["Lexend", "sans-serif"]
            },
        },
    },
};

// 3. Apply Theme CSS Variables
function applyTheme(themeName) {
    const theme = THEMES[themeName] || THEMES.yellow;

    // Set standard hex for custom CSS that uses color-mix()
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    document.documentElement.style.setProperty('--primary-dark-color', theme.dark);

    // Set RGB channels for Tailwind opacity modifiers (e.g. bg-primary/80)
    document.documentElement.style.setProperty('--primary-color-rgb', hexToRgb(theme.primary));
    document.documentElement.style.setProperty('--primary-dark-rgb', hexToRgb(theme.dark));

    localStorage.setItem('study_platform_theme', themeName);

    // Update active state in switcher UI
    document.querySelectorAll('.theme-option').forEach(btn => {
        if (btn.dataset.theme === themeName) {
            btn.classList.add('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-bg-dark');
        } else {
            btn.classList.remove('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-bg-dark');
        }
    });
}

// Ensure first apply happens immediately before page renders
applyTheme(savedTheme);

// ═════════════════ DARK MODE TOGGLE ═════════════════
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('study_platform_dark_mode', isDark);
    
    // Update theme icon if present
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }
}

// Initialize dark mode on page load
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved dark mode preference
    if (savedDarkMode) {
        document.body.classList.add('dark');
    }

    // Update theme icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.textContent = savedDarkMode ? 'light_mode' : 'dark_mode';
    }
});

// 4. Inject Theme Switcher UI after DOM load — ONLY on homepage
document.addEventListener('DOMContentLoaded', () => {
    // Only show theme switcher on the homepage
    if (!window.location.pathname.includes('home.html') && !window.location.pathname.endsWith('/home/')) return;

    const switcher = document.createElement('div');
    switcher.className = 'fixed left-5 bottom-6 z-[9999] group';

    // The toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'w-12 h-12 rounded-full bg-bg-card border border-white/10 flex items-center justify-center shadow-lg hover:border-primary transition-all cursor-pointer';
    toggleBtn.innerHTML = `<span class="material-symbols-outlined text-slate-300 pointer-events-none group-hover:text-primary transition-colors">palette</span>`;

    // The palette menu wrapper (hidden by default, expands upward on hover)
    const menuWrapper = document.createElement('div');
    // Using pb-3 (padding base) to bridge the 12px gap so hover doesn't drop
    menuWrapper.className = 'absolute bottom-full left-0 pb-3 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 w-[180px] origin-bottom-left';

    // The actual visible card
    const menuCard = document.createElement('div');
    menuCard.className = 'bg-bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl';

    let menuHTML = `<div class="text-[12px] font-bold text-slate-400 mb-3 px-1 uppercase tracking-wider">Theme Color</div><div class="grid grid-cols-4 gap-2">`;

    Object.keys(THEMES).forEach(key => {
        const t = THEMES[key];
        const isActive = key === savedTheme;
        const ringClasses = isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-dark' : '';
        menuHTML += `
            <button 
                data-theme="${key}"
                class="theme-option w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 ${ringClasses}"
                style="background-color: ${t.primary}"
                title="${t.label}"
                onclick="applyTheme('${key}')"
            ></button>
        `;
    });

    menuHTML += `</div>`;
    menuCard.innerHTML = menuHTML;
    menuWrapper.appendChild(menuCard);

    switcher.appendChild(menuWrapper);
    switcher.appendChild(toggleBtn);
    document.body.appendChild(switcher);
});
