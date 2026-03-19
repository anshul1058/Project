// home.js - AI Chatbot for Vidyasetu.notes
import * as aiService from './ai-service.js';

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

// Initialize user info when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();

    // Typing effect for Home Title
    const typingTextElement = document.getElementById('typing-text');
    if(typingTextElement) {
        const words = ["Vidyasetu.notes", "Smart Learning", "Better Grades"];
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        const typingSpeed = 100;
        const erasingSpeed = 50;
        const newWordDelay = 2000;

        function typeEffect() {
            const currentWord = words[wordIndex];
            
            if (isDeleting) {
                typingTextElement.textContent = currentWord.substring(0, charIndex - 1);
                charIndex--;
            } else {
                typingTextElement.textContent = currentWord.substring(0, charIndex + 1);
                charIndex++;
            }

            let typeSpeedDelay = isDeleting ? erasingSpeed : typingSpeed;

            if (!isDeleting && charIndex === currentWord.length) {
                typeSpeedDelay = newWordDelay;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                typeSpeedDelay = 500;
            }

            setTimeout(typeEffect, typeSpeedDelay);
        }

        setTimeout(typeEffect, 500);
    }
});

// ==========================================
// Rotating Study Tips Typewriter
// ==========================================
(function () {
    const el = document.getElementById('tip-text');
    const cursor = document.getElementById('tip-cursor');
    if (!el) return;

    const tips = [
        'Tip: Use spaced repetition to retain information longer.',
        'Tip: Take a 5-min break every 25 mins — try the Pomodoro technique!',
        'Tip: Teaching a concept to someone else is the best way to learn it.',
        'Tip: Handwriting notes improves memory retention over typing.',
        'Tip: Sleep consolidates memory — study before bed for better recall.',
        'Tip: Active recall beats re-reading every time.',
        'Tip: Break big topics into smaller chunks to avoid overwhelm.',
        'Tip: Mind maps help connect concepts visually for deeper understanding.',
        'Tip: Stay hydrated — even mild dehydration affects concentration.',
        'Tip: Review your notes within 24 hours to boost long-term retention.',
    ];

    let tipIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function shuffle() {
        tipIndex = Math.floor(Math.random() * tips.length);
    }

    function typeTip() {
        const current = tips[tipIndex];

        if (!isDeleting) {
            el.textContent = current.slice(0, charIndex + 1);
            charIndex++;
            if (charIndex === current.length) {
                setTimeout(() => { isDeleting = true; typeTip(); }, 2800);
                return;
            }
        } else {
            el.textContent = current.slice(0, charIndex - 1);
            charIndex--;
            if (charIndex === 0) {
                isDeleting = false;
                shuffle();
                setTimeout(typeTip, 400);
                return;
            }
        }

        setTimeout(typeTip, isDeleting ? 25 : 45);
    }

    // Start after heading animation finishes
    setTimeout(() => { shuffle(); typeTip(); }, tips[0].length * 60 + 1500);
})();

// Global state
let currentPdfFile = null;
let currentPdfText = ""; // Holds extracted text
let isChatbotOpen = false;

// DOM Elements
const chatbotToggle = document.getElementById('cat-wrapper') || document.getElementById('chatbot-toggle');
const chatbotPanel = document.getElementById('chatbot-panel');
const iconOpen = document.getElementById('chatbot-icon-open');
const iconClose = document.getElementById('chatbot-icon-close');
const dropZone = document.getElementById('drop-zone');
const pdfInput = document.getElementById('pdf-input');
const uploadZone = document.getElementById('upload-zone');
const pdfLoadedSection = document.getElementById('pdf-loaded');
const pdfFilename = document.getElementById('pdf-filename');
const resultsArea = document.getElementById('results-area');
const toastContainer = document.getElementById('toast-container');
const mindmapModal = document.getElementById('mindmap-modal');
const mindmapContainer = document.getElementById('mindmap-fullscreen-container');

// Initialize Mermaid if available
if (typeof mermaid !== 'undefined') {
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
}

// ==========================================
// Chatbot Toggle Logic
// ==========================================
window.toggleChatbot = () => {
    isChatbotOpen = !isChatbotOpen;
    
    if (isChatbotOpen) {
        chatbotPanel.classList.remove('hidden');
        chatbotPanel.classList.add('flex');
        if (iconOpen) iconOpen.classList.add('hidden');
        if (iconClose) iconClose.classList.remove('hidden');
        
        // GSAP animate in
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(chatbotPanel, 
                { autoAlpha: 0, y: 20, scale: 0.95 },
                { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.2)" }
            );
        }
    } else {
        // GSAP animate out
        if (typeof gsap !== 'undefined') {
            gsap.to(chatbotPanel, {
                autoAlpha: 0, y: 20, scale: 0.95, duration: 0.3, ease: "power2.inOut",
                onComplete: () => {
                    chatbotPanel.classList.add('hidden');
                    chatbotPanel.classList.remove('flex');
                    if (iconOpen) iconOpen.classList.remove('hidden');
                    if (iconClose) iconClose.classList.add('hidden');
                }
            });
        } else {
            chatbotPanel.classList.add('hidden');
            chatbotPanel.classList.remove('flex');
            if (iconOpen) iconOpen.classList.remove('hidden');
            if (iconClose) iconClose.classList.add('hidden');
        }
    }
};

// ==========================================
// Drag & Drop & File Selection
// ==========================================
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    if (dropZone) dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    if (dropZone) dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('border-primary', 'bg-primary/[0.05]');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    if (dropZone) dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('border-primary', 'bg-primary/[0.05]');
    }, false);
});

if (dropZone) {
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            pdfInput.files = files;
            handleFile(files[0]);
        }
    }, false);
}

window.handleFileSelect = (event) => {
    if (event.target.files.length) {
        handleFile(event.target.files[0]);
    }
};

function handleFile(file) {
    if (file.type !== 'application/pdf') {
        showToast('Please upload a valid PDF file.', 'error');
        return;
    }
    
    currentPdfFile = file;
    pdfFilename.textContent = file.name;
    
    // Switch views
    uploadZone.classList.add('hidden');
    pdfLoadedSection.classList.remove('hidden');
    pdfLoadedSection.classList.add('flex');
    
    showToast('Extracting text from PDF...', 'info');
    
    // Extract Text immediately so it's ready for AI
    if (aiService) {
        aiService.extractTextFromPDF(file).then(text => {
            currentPdfText = text;
            showToast('PDF loaded successfully! You can now generate AI insights.', 'success');
        }).catch(err => {
            console.error(err);
            showToast('Failed to extract text from PDF.', 'error');
        });
    }
}

// ==========================================
// Reset State
// ==========================================
window.resetChatbot = () => {
    currentPdfFile = null;
    currentPdfText = "";
    if (pdfInput) pdfInput.value = '';
    
    uploadZone.classList.remove('hidden');
    uploadZone.classList.add('flex');
    pdfLoadedSection.classList.add('hidden');
    pdfLoadedSection.classList.remove('flex');
    
    if (resultsArea) resultsArea.innerHTML = '';
};

// ==========================================
// AI Generation Execution
// ==========================================
window.generateAI = async (type) => {
    if (!aiService) {
        showToast("AI service module not loaded. Please refresh the page.", "error");
        return;
    }
    
    if (!currentPdfFile || !currentPdfText) {
        showToast("Please upload a PDF first", "error");
        return;
    }
    
    if (currentPdfText.trim().length < 5) {
        showToast("PDF text is too short to process.", "error");
        return;
    }
    
    const resultId = 'result-' + Date.now();
    
    // Add loading placeholder
    const loadingHtml = `
        <div id="${resultId}" class="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div class="flex items-center gap-3 mb-2">
                <span class="material-symbols-outlined text-primary animate-spin" style="font-size:18px;">sync</span>
                <span class="text-[12px] font-medium text-slate-300">Generating ${type} using AI...</span>
            </div>
            <div class="space-y-2 mt-3 cursor-wait">
                <div class="h-2 bg-white/5 rounded w-3/4 animate-pulse"></div>
                <div class="h-2 bg-white/5 rounded w-full animate-pulse"></div>
                <div class="h-2 bg-white/5 rounded w-5/6 animate-pulse"></div>
            </div>
        </div>
    `;
    
    resultsArea.insertAdjacentHTML('afterbegin', loadingHtml);
    resultsArea.scrollTop = 0;
    
    const resultEl = document.getElementById(resultId);
    if (!resultEl) return;
    
    let content = '';
    
    try {
        if (type === 'summary') {
            const sumText = await aiService.generateSummary(currentPdfText);
            content = typeof marked !== 'undefined' ? marked.parse(sumText) : sumText;
        } else if (type === 'notes') {
            const notesText = await aiService.generateNotes(currentPdfText);
            content = typeof marked !== 'undefined' ? marked.parse(notesText) : notesText;
        } else if (type === 'questions') {
            const questionsText = await aiService.generateQuestions(currentPdfText);
            content = typeof marked !== 'undefined' ? marked.parse(questionsText) : questionsText;
        } else if (type === 'mindmap') {
            const mindmapData = await aiService.generateMindMapData(currentPdfText);

            const renderNode = (node, isRight) => `
            <div class="relative mt-4 z-10 w-full mb-4 group/node">
               <div class="absolute -top-[18px] ${isRight ? 'right-4' : 'left-4'} bg-[#93c5fd] px-3 py-1 border-2 border-b-0 border-gray-900 rounded-t-xl font-bold text-gray-900 text-[9px] uppercase tracking-wide z-20">
                    ${node.title || 'Concept'}
               </div>
               <div class="bg-white border-2 border-gray-900 rounded-2xl ${isRight ? 'rounded-tr-none' : 'rounded-tl-none'} p-2.5 text-gray-900 text-[10px] font-medium leading-tight relative z-10 shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-transform group-hover/node:-translate-y-1">
                    ${node.desc || ''}
               </div>
            </div>
            `;

            const svgLines = `
            <svg class="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible" style="filter: drop-shadow(1px 1px 0px rgba(0,0,0,1));">
                <defs>
                    <marker id="arrowhead-white" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
                        <polygon points="0 0, 6 2.5, 0 5" fill="#ffffff" />
                    </marker>
                </defs>
                <path d="M 40% 45% Q 35% 20% 30% 18%" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" marker-end="url(#arrowhead-white)"/>
                <path d="M 38% 50% Q 34% 50% 30% 50%" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" marker-end="url(#arrowhead-white)"/>
                <path d="M 40% 55% Q 35% 80% 30% 82%" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" marker-end="url(#arrowhead-white)"/>
                
                <path d="M 60% 45% Q 65% 20% 70% 18%" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" marker-end="url(#arrowhead-white)"/>
                <path d="M 62% 50% Q 66% 50% 70% 50%" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" marker-end="url(#arrowhead-white)"/>
                <path d="M 60% 55% Q 65% 80% 70% 82%" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" marker-end="url(#arrowhead-white)"/>
            </svg>
            `;

            content = `
                <div class="mindmap-custom-wrap bg-[#1e293b]/80 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden cursor-zoom-in hover:bg-[#1e293b] transition-all duration-300 group" onclick="openMindMapFullscreen()">
                    <div class="relative w-full py-6 px-1 flex items-center justify-between mindmap-render-area min-h-[300px]">
                        ${svgLines}
                        
                        <div class="flex flex-col justify-between h-full w-[36%] z-10">
                            ${(mindmapData.left || []).map(n => renderNode(n, false)).join('')}
                        </div>
                        
                        <div class="w-[26%] flex flex-col items-center justify-center z-20">
                            <div class="w-12 h-12 bg-white border-2 border-gray-900 rounded-full flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,1)] mb-2 relative">
                                <span class="material-symbols-outlined text-yellow-500 group-hover:animate-pulse" style="font-size: 28px;">lightbulb</span>
                            </div>
                            <h2 class="text-[16px] font-black text-white text-center leading-tight tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,1)] uppercase">
                                ${mindmapData.title || 'Mind Map'}
                            </h2>
                        </div>
                        
                        <div class="flex flex-col justify-between h-full w-[36%] z-10">
                            ${(mindmapData.right || []).map(n => renderNode(n, true)).join('')}
                        </div>
                    </div>
                    <div class="bg-gray-900/80 text-[10px] text-yellow-400/80 group-hover:text-yellow-400 py-1.5 text-center w-full block border-t border-white/5 uppercase tracking-widest font-bold transition-colors">
                        Click to expand fullscreen
                    </div>
                </div>
            `;
        }
        
        // Render successful response
        resultEl.innerHTML = `
            <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-green-400" style="font-size:16px;">check_circle</span>
                <span class="text-[12px] font-bold text-white capitalize">${type} Generated</span>
            </div>
            <div class="prose text-[13px] text-slate-300 w-full overflow-hidden">
                ${content}
            </div>
        `;

    } catch (error) {
        console.error("AI Generation Error:", error);
        
        let errorMessage = error.message || "An error occurred while contacting the AI service.";
        let helpText = "";
        
        // Provide helpful context based on error type
        if (errorMessage.includes("API key") || errorMessage.includes("GEMINI_API_KEY") || errorMessage.includes("GROQ_API_KEY")) {
            helpText = "Make sure your AI API key is valid and has quota remaining.";
        } else if (errorMessage.includes("not initialized")) {
            helpText = "Supabase is not properly initialized. Check your configuration.";
        } else if (errorMessage.includes("PDF") || errorMessage.includes("file")) {
            helpText = "There was an issue reading your PDF file. Try uploading again.";
        } else if (errorMessage.includes("JSON")) {
            helpText = "The AI returned an unexpected format. Try again with different content.";
        } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
            helpText = "Network error. Check your connection and try again.";
        } else {
            helpText = "Check the browser console for more details.";
        }
        
        resultEl.innerHTML = `
            <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-red-400" style="font-size:16px;">error</span>
                <span class="text-[12px] font-bold text-red-400 capitalize">Generation Failed</span>
            </div>
            <div class="text-[12px] text-slate-400">
                <p class="mb-2"><strong>Error:</strong> ${errorMessage}</p>
                <p><strong>Troubleshooting:</strong> ${helpText}</p>
            </div>
        `;
    }
};

// ==========================================
// Fullscreen Mindmap Logic
// ==========================================
window.openMindMapFullscreen = () => {
    if (!mindmapModal || !mindmapContainer) return;
    
    mindmapModal.classList.remove('hidden');
    mindmapModal.classList.add('flex');
    setTimeout(() => mindmapModal.classList.remove('opacity-0'), 10);
    
    // Copy the custom mindmap area into the modal
    const wrap = resultsArea.querySelector('.mindmap-render-area');
    if (wrap) {
        mindmapContainer.innerHTML = '';
        const clone = wrap.cloneNode(true);
        // Make it large and impressive for fullscreen
        clone.classList.add('w-full', 'max-w-4xl', 'aspect-video', 'scale-110', 'origin-center');
        
        // Scale up the fonts and spacing just for fullscreen
        const h2 = clone.querySelector('h2');
        if (h2) {
            h2.classList.remove('text-[16px]');
            h2.classList.add('text-4xl');
        }
        
        const nodes = clone.querySelectorAll('.group\\/node > div:nth-child(2)');
        nodes.forEach(n => {
            n.classList.remove('text-[10px]', 'p-2.5');
            n.classList.add('text-[14px]', 'p-5');
        });
        
        const titles = clone.querySelectorAll('.group\\/node > div:nth-child(1)');
        titles.forEach(t => {
            t.classList.remove('text-[9px]', '-top-[18px]', 'px-3');
            t.classList.add('text-[14px]', '-top-[28px]', 'px-5', 'py-2');
        });
        
        const lightbulb = clone.querySelector('.material-symbols-outlined');
        if (lightbulb) lightbulb.style.fontSize = '64px';
        const lightbulbContainer = lightbulb.parentElement;
        if (lightbulbContainer) {
            lightbulbContainer.classList.remove('w-12', 'h-12');
            lightbulbContainer.classList.add('w-28', 'h-28');
        }

        mindmapContainer.appendChild(clone);
    }
};

window.closeMindMapModal = () => {
    if (!mindmapModal) return;
    
    mindmapModal.classList.add('opacity-0');
    setTimeout(() => {
        mindmapModal.classList.add('hidden');
        mindmapModal.classList.remove('flex');
    }, 300);
};

// ==========================================
// Toast Notification System
// ==========================================
function showToast(message, type = 'info') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    
    // Define styles based on toast type
    let colorClasses = 'bg-white/10 border-white/20 text-white';
    let iconName = 'info';
    
    if (type === 'error') {
        colorClasses = 'bg-red-500/10 border-red-500/20 text-red-200';
        iconName = 'error';
    } else if (type === 'success') {
        colorClasses = 'bg-green-500/10 border-green-500/20 text-green-200';
        iconName = 'check_circle';
    }
    
    toast.className = `toast-enter flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-xl border border-solid shadow-lg ${colorClasses}`;
    
    toast.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 20px;">${iconName}</span>
        <span class="text-[13px] font-medium leading-tight">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Automatically remove the toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// Follow-up Question Handler
// ==========================================
window.askFollowUp = async () => {
    const input = document.getElementById('followup-input');
    if (!input) return;
    
    const question = input.value.trim();
    if (!question) {
        showToast('Please type a question first.', 'info');
        return;
    }
    
    if (!currentPdfText) {
        showToast('Please upload a PDF first.', 'error');
        return;
    }
    
    input.value = '';
    
    const resultId = 'result-' + Date.now();
    const loadingHtml = `
        <div id="${resultId}" class="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div class="flex items-center gap-3 mb-2">
                <span class="material-symbols-outlined text-primary animate-spin" style="font-size:18px;">sync</span>
                <span class="text-[12px] font-medium text-slate-300">Thinking...</span>
            </div>
            <div class="space-y-2 mt-3 cursor-wait">
                <div class="h-2 bg-white/5 rounded w-3/4 animate-pulse"></div>
                <div class="h-2 bg-white/5 rounded w-full animate-pulse"></div>
            </div>
        </div>
    `;
    
    resultsArea.insertAdjacentHTML('afterbegin', loadingHtml);
    const resultEl = document.getElementById(resultId);
    if (!resultEl) return;
    
    // Also show the question
    const questionHtml = `
        <div class="flex items-start gap-2 mb-1">
            <span class="material-symbols-outlined text-primary shrink-0" style="font-size:16px;">person</span>
            <span class="text-[12px] text-slate-400 italic">${question}</span>
        </div>
    `;
    resultEl.insertAdjacentHTML('afterbegin', questionHtml);
    
    try {
        const answer = await aiService.askFollowUpQuestion(currentPdfText, question);
        const content = typeof marked !== 'undefined' ? marked.parse(answer) : answer;
        resultEl.innerHTML = `
            <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-primary" style="font-size:16px;">auto_awesome</span>
                <span class="text-[12px] font-bold text-white capitalize">AI Response</span>
            </div>
            <div class="prose text-[13px] text-slate-300 w-full overflow-hidden">
                ${content}
            </div>
        `;
    } catch (error) {
        console.error("AI Follow-up Error:", error);
        resultEl.innerHTML = `
            <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-red-400" style="font-size:16px;">error</span>
                <span class="text-[12px] font-bold text-red-400 capitalize">Response Failed</span>
            </div>
            <div class="text-[12px] text-slate-400">
                ${error.message || "Could not get a response."}
            </div>
        `;
    }
    
    resultsArea.scrollTop = 0;
};
