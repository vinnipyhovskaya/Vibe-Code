// ========================================
// COMMON UTILITIES
// ========================================
function escapeHtml(t) { 
    const d = document.createElement('div'); 
    d.textContent = t; 
    return d.innerHTML; 
}

function renderMarkdown(text) { 
    let h = escapeHtml(text); 
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
         .replace(/\*(.+?)\*/g, '<em>$1</em>')
         .replace(/`([^`]+)`/g, '<code>$1</code>')
         .replace(/\n/g, '<br>'); 
    return h; 
}

function scrollToBottom(containerId = 'chat-container') { 
    const c = document.getElementById(containerId); 
    if(c) setTimeout(() => c.scrollTop = c.scrollHeight, 50); 
}

// ========================================
// THEME FUNCTIONS
// ========================================
function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch(e) {}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'light' || (!saved && !prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'light');
        const toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        const toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch(e) {}
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.innerHTML = next === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    }
    if (typeof checkAndUnlockAchievements === 'function') checkAndUnlockAchievements();
}

// ========================================
// AUTH FUNCTIONS (для index.html и login.html)
// ========================================

const API = '/api';

// Регистрация
const registerForm = document.getElementById('register-form');
if (registerForm) {
    const errorMsg = document.getElementById('error-msg');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorMsg) errorMsg.style.display = 'none';
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const res = await fetch(`${API}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (!res.ok) {
                if (errorMsg) {
                    errorMsg.textContent = data.detail || 'Ошибка регистрации';
                    errorMsg.style.display = 'block';
                }
                return;
            }
            localStorage.setItem('token', data.access_token);
            window.location.href = '/dashboard';
        } catch (err) {
            if (errorMsg) {
                errorMsg.textContent = 'Ошибка подключения к серверу';
                errorMsg.style.display = 'block';
            }
        }
    });
}

// Вход
const loginForm = document.getElementById('login-form');
if (loginForm) {
    const errorMsg = document.getElementById('error-msg');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorMsg) errorMsg.style.display = 'none';
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const res = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) {
                if (errorMsg) {
                    errorMsg.textContent = data.detail || 'Ошибка входа';
                    errorMsg.style.display = 'block';
                }
                return;
            }
            localStorage.setItem('token', data.access_token);
            window.location.href = '/dashboard';
        } catch (err) {
            if (errorMsg) {
                errorMsg.textContent = 'Ошибка подключения к серверу';
                errorMsg.style.display = 'block';
            }
        }
    });
}

// ========================================
// DASHBOARD FUNCTIONS (только если страница dashboard)
// ========================================
if (document.getElementById('dashboard-layout') || document.getElementById('chat-container')) {
    
    // Данные (с нуля)
    let currentScore = 0;
    let currentLevel = 'novice';
    let completedModules = [];
    let isLoading = false;
    let achievementsExpanded = false;
    window.messageCount = 0;
    window.statsOpenedCount = 0;
    window.currentModuleId = null;

    const modules = [
        { id: 1, name: 'Структура промпта', icon: 'fas fa-cube', completedIcon: 'fas fa-check-circle' },
        { id: 2, name: 'Улучшение промптов', icon: 'fas fa-wrench', completedIcon: 'fas fa-check-circle' },
        { id: 3, name: 'Few-shot', icon: 'fas fa-bullseye', completedIcon: 'fas fa-check-circle' },
        { id: 4, name: 'Chain-of-thought', icon: 'fas fa-link', completedIcon: 'fas fa-check-circle' },
        { id: 5, name: 'Мастер контекста', icon: 'fas fa-paintbrush', completedIcon: 'fas fa-check-circle' },
        { id: 6, name: 'Комплексный промпт', icon: 'fas fa-layer-group', completedIcon: 'fas fa-check-circle' }
    ];

    let progressData = [
        { module_name: 'Структура промпта', score: 0, max_score: 30, completed: false },
        { module_name: 'Улучшение промптов', score: 0, max_score: 30, completed: false },
        { module_name: 'Few-shot', score: 0, max_score: 30, completed: false },
        { module_name: 'Chain-of-thought', score: 0, max_score: 30, completed: false },
        { module_name: 'Мастер контекста', score: 0, max_score: 30, completed: false },
        { module_name: 'Комплексный промпт', score: 0, max_score: 30, completed: false }
    ];

let achievements = [
    { id: 1, name: 'Первый шаг', icon: 'fas fa-flag-checkered', desc: 'Начать обучение', rarity: 'common', unlocked: false },
    { id: 2, name: 'Новичок', icon: 'fas fa-seedling', desc: 'Достичь уровня novice', rarity: 'common', unlocked: true },
    { id: 3, name: 'Любопытный', icon: 'fas fa-comments', desc: 'Отправить 10 сообщений', rarity: 'common', unlocked: false },
    { id: 4, name: 'Исследователь', icon: 'fas fa-brain', desc: 'Отправить 25 сообщений', rarity: 'rare', unlocked: false },
    { id: 5, name: 'Эрудит', icon: 'fas fa-book', desc: 'Отправить 50 сообщений', rarity: 'epic', unlocked: false },
    { id: 6, name: 'В зоне темпа', icon: 'fas fa-fire', desc: 'Достичь уровня intermediate', rarity: 'rare', unlocked: false },
    { id: 7, name: 'Мастер промптов', icon: 'fas fa-gem', desc: 'Достичь уровня expert', rarity: 'epic', unlocked: false },
    { id: 8, name: 'Первая ступень', icon: 'fas fa-layer-group', desc: 'Пройти 1 модуль', rarity: 'common', unlocked: false },
    { id: 9, name: 'Середина пути', icon: 'fas fa-chart-line', desc: 'Пройти 3 модуля', rarity: 'rare', unlocked: false },
    { id: 10, name: 'Инженер промптов', icon: 'fas fa-microchip', desc: 'Пройти 6 модулей', rarity: 'epic', unlocked: false },
    { id: 11, name: 'Выпускник', icon: 'fas fa-graduation-cap', desc: 'Пройти все модули и набрать 150+ очков', rarity: 'legendary', unlocked: false },
    { id: 12, name: 'Мастер контекста', icon: 'fas fa-paintbrush', desc: 'Пройти модуль «Мастер контекста»', rarity: 'epic', unlocked: false },
    { id: 13, name: 'Цепной пёс', icon: 'fas fa-link', desc: 'Пройти модуль Chain-of-thought', rarity: 'rare', unlocked: false },
    { id: 14, name: 'Правило 80/20', icon: 'fas fa-chart-simple', desc: 'Набрать 80 очков', rarity: 'rare', unlocked: false },
    { id: 15, name: 'Стабильность', icon: 'fas fa-shield', desc: 'Набрать 200 очков', rarity: 'epic', unlocked: false },
    { id: 16, name: 'Легенда', icon: 'fas fa-trophy', desc: 'Набрать 500 очков', rarity: 'legendary', unlocked: false },
    { id: 17, name: 'Статистик', icon: 'fas fa-chart-pie', desc: 'Открыть статистику 1 раз', rarity: 'common', unlocked: false },
    { id: 18, name: 'Аналитик', icon: 'fas fa-chart-column', desc: 'Открыть статистику 5 раз', rarity: 'rare', unlocked: false },
    { id: 19, name: 'Тёмная сторона', icon: 'fas fa-moon', desc: 'Переключиться на тёмную тему', rarity: 'common', unlocked: false },
    { id: 20, name: 'Светлая сторона', icon: 'fas fa-sun', desc: 'Переключиться на светлую тему', rarity: 'common', unlocked: false }
];

    // Уведомление
    function showAchievementUnlock(name, desc) {
        const notif = document.createElement('div');
        notif.className = 'achievement-unlock-notification';
        notif.innerHTML = `
            <i class="fas fa-trophy" style="color: #FFC800; font-size: 24px;"></i>
            <div class="achievement-unlock-content">
                <div class="achievement-unlock-title">🏆 Достижение получено!</div>
                <div class="achievement-unlock-name">${name}</div>
                <div class="achievement-unlock-desc">${desc}</div>
            </div>
        `;
        notif.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: var(--bg-secondary);
            border-left: 4px solid #FFC800;
            border-radius: 12px;
            padding: 14px 20px;
            display: flex;
            align-items: center;
            gap: 14px;
            z-index: 1001;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
            border: 1px solid var(--border-color);
            max-width: 350px;
        `;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 4000);
    }

    // Проверка и разблокировка всех достижений
    function checkAndUnlockAchievements() {
        let changed = false;
        
        const messagesSent = window.messageCount || 0;
        const completedCount = completedModules.length;
        const statsOpened = window.statsOpenedCount || 0;
        const currentTheme = document.documentElement.getAttribute('data-theme');
        
        // 1. Первый шаг - начать обучение
        if (!achievements[0].unlocked && messagesSent > 0) {
            achievements[0].unlocked = true;
    	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Первый шаг', 'Вы начали обучение! 🎯');
        }
        
        // 2. Новичок (уже разблокировано)
        if (!achievements[1].unlocked) {
            achievements[1].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
        }
        
        // 3. Любопытный - 10 сообщений
        if (!achievements[2].unlocked && messagesSent >= 10) {
            achievements[2].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Любопытный', 'Отправлено 10 сообщений! 💬');
        }
        
        // 4. Исследователь - 25 сообщений
        if (!achievements[3].unlocked && messagesSent >= 25) {
            achievements[3].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Исследователь', 'Отправлено 25 сообщений! 🔍');
        }
        
        // 5. Эрудит - 50 сообщений
        if (!achievements[4].unlocked && messagesSent >= 50) {
            achievements[4].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Эрудит', 'Отправлено 50 сообщений! 📚');
        }
        
        // 6. В зоне темпа - уровень intermediate
        if (!achievements[5].unlocked && currentLevel === 'intermediate') {
            achievements[5].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('В зоне темпа', 'Достигнут уровень Intermediate! 🔥');
        }
        
        // 7. Мастер промптов - уровень expert
        if (!achievements[6].unlocked && currentLevel === 'expert') {
            achievements[6].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Мастер промптов', 'Достигнут уровень Expert! 💎');
        }
        
        // 8. Первая ступень - 1 модуль
        if (!achievements[7].unlocked && completedCount >= 1) {
            achievements[7].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Первая ступень', 'Пройден 1 модуль! 🎓');
        }
        
        // 9. Середина пути - 3 модуля
        if (!achievements[8].unlocked && completedCount >= 3) {
            achievements[8].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Середина пути', 'Пройдено 3 модуля! 📊');
        }
        
        // 10. Инженер промптов - 6 модулей
        if (!achievements[9].unlocked && completedCount >= 6) {
            achievements[9].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Инженер промптов', 'Пройдены все модули! 🎯');
        }
        
        // 11. Выпускник - все модули + 150+ очков
        if (!achievements[10].unlocked && completedCount >= 6 && currentScore >= 150) {
            achievements[10].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Выпускник', 'Курс пройден на отлично! 🎓✨');
        }
        
        // 12. Мастер контекста - модуль 5
        if (!achievements[11].unlocked && completedModules.includes(5)) {
            achievements[11].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Мастер контекста', 'Модуль «Мастер контекста» пройден! 🎨');
        }
        
        // 13. Цепной пёс - модуль 4 (Chain-of-thought)
        if (!achievements[12].unlocked && completedModules.includes(4)) {
            achievements[12].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Цепной пёс', 'Модуль Chain-of-thought пройден! 🔗');
        }
        
        // 14. Правило 80/20 - 80 очков
        if (!achievements[13].unlocked && currentScore >= 80) {
            achievements[13].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Правило 80/20', 'Набрано 80 очков! 📈');
        }
        
        // 15. Стабильность - 200 очков
        if (!achievements[14].unlocked && currentScore >= 200) {
            achievements[14].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Стабильность', 'Набрано 200 очков! 🛡️');
        }
        
        // 16. Легенда - 500 очков
        if (!achievements[15].unlocked && currentScore >= 500) {
            achievements[15].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Легенда', 'Набрано 500 очков! 🏆');
        }
        
        // 17. Статистик - открыть статистику 1 раз
        if (!achievements[16].unlocked && statsOpened >= 1) {
            achievements[16].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Статистик', 'Статистика открыта! 📊');
        }
        
        // 18. Аналитик - открыть статистику 5 раз
        if (!achievements[17].unlocked && statsOpened >= 5) {
            achievements[17].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Аналитик', 'Статистика открыта 5 раз! 📈');
        }
        
        // 19. Тёмная сторона - тёмная тема
        if (!achievements[18].unlocked && currentTheme === 'dark') {
            achievements[18].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Тёмная сторона', 'Включена тёмная тема! 🌙');
        }
        
        // 20. Светлая сторона - светлая тема
        if (!achievements[19].unlocked && currentTheme === 'light') {
            achievements[19].unlocked = true;
   	    achievements[0].unlockedAt = Date.now();
            changed = true;
            showAchievementUnlock('Светлая сторона', 'Включена светлая тема! ☀️');
        }
        
        if (changed) {
            updateDashboardUI();
            saveProgressToLocalStorage(); // сохраняем прогресс
        }
    }

    // Функция сохранения прогресса
    function saveProgressToLocalStorage() {
        try {
            localStorage.setItem('user_score', currentScore);
            localStorage.setItem('user_level', currentLevel);
            localStorage.setItem('completed_modules', JSON.stringify(completedModules));
            localStorage.setItem('achievements', JSON.stringify(achievements));
            localStorage.setItem('progress_data', JSON.stringify(progressData));
            localStorage.setItem('message_count', window.messageCount);
            localStorage.setItem('stats_opened_count', window.statsOpenedCount);
        } catch(e) {}
    }
    
    // Функция загрузки прогресса
    function loadProgressFromLocalStorage() {
        try {
            const savedScore = localStorage.getItem('user_score');
            if (savedScore) currentScore = parseInt(savedScore);
            
            const savedLevel = localStorage.getItem('user_level');
            if (savedLevel) currentLevel = savedLevel;
            
            const savedModules = localStorage.getItem('completed_modules');
            if (savedModules) completedModules = JSON.parse(savedModules);
            
            const savedAchievements = localStorage.getItem('achievements');
            if (savedAchievements) achievements = JSON.parse(savedAchievements);
            
            const savedProgress = localStorage.getItem('progress_data');
            if (savedProgress) progressData = JSON.parse(savedProgress);
            
            const savedMsgCount = localStorage.getItem('message_count');
            if (savedMsgCount) window.messageCount = parseInt(savedMsgCount);
            
            const savedStatsCount = localStorage.getItem('stats_opened_count');
            if (savedStatsCount) window.statsOpenedCount = parseInt(savedStatsCount);
        } catch(e) {}
    }

    function showScoreNotification(points, totalScore) {
        const notif = document.createElement('div');
        notif.className = 'score-notification';
        notif.innerHTML = `<i class="fas fa-star"></i> +${points} баллов<div class="score-notification-total">Всего: ${totalScore}</div>`;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.classList.add('score-notification-hide');
            setTimeout(() => notif.remove(), 400);
        }, 3000);
    }

    // Обновление модалки статистики
    function updateStatsModal() {
        window.statsOpenedCount = (window.statsOpenedCount || 0) + 1;
        checkAndUnlockAchievements();
        const userName = document.getElementById('user-name');
        if (userName) document.getElementById('stats-username').textContent = userName.textContent;
        const daysCount = Math.floor(Math.random() * 5) + 1;
document.getElementById('stat-days').textContent = daysCount + (daysCount === 1 ? ' день' : (daysCount < 5 ? ' дня' : ' дней'));
        const tasksDone = progressData.filter(p => p.completed).length;
        document.getElementById('stat-tasks').textContent = tasksDone;
        document.getElementById('stat-modules').textContent = `${completedModules.length}/${modules.length}`;
        document.getElementById('stats-total-score').textContent = currentScore;
        const statsList = document.getElementById('stats-progress-list');
        if (statsList) {
            statsList.innerHTML = progressData.map(p => `
                <div class="stats-progress-item">
                    <div class="stats-progress-header"><span>${p.module_name}</span><span>${p.score}/${p.max_score}</span></div>
                    <div class="stats-progress-bar"><div class="stats-progress-fill" style="width: ${(p.score/p.max_score)*100}%"></div></div>
                </div>
            `).join('');
        }
    }

    // Достижения
    function getRarityClass(r) {
        if(r === 'legendary') return 'achievement-legendary';
        if(r === 'epic') return 'achievement-epic';
        if(r === 'rare') return 'achievement-rare';
        return 'achievement-common';
    }

    function renderAchievements() {
     const container = document.getElementById('achievements-container');
    if (!container) return;
    
    
    const unlocked = achievements.filter(a => a.unlocked);
    const locked = achievements.filter(a => !a.unlocked);
    
    
    const unlockedSorted = [...unlocked].sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0));
    
   
    const lockedSorted = [...locked].sort((a, b) => a.id - b.id);
    
    let levelClass = 'level-novice';
    if (currentLevel === 'intermediate') levelClass = 'level-intermediate';
    if (currentLevel === 'expert') levelClass = 'level-expert';
    
    if (achievementsExpanded) {
        
        const allAchievementsHtml = [...unlockedSorted, ...lockedSorted].map(a => {
            const rc = getRarityClass(a.rarity);
            if (a.unlocked) {
                return `<span class="achievement-item ${rc} ${levelClass}" title="${a.desc}"><i class="${a.icon}"></i> ${a.name}</span>`;
            } else {
                return `<span class="achievement-item ${rc} ${levelClass}" style="opacity:0.6;" title="🔒 ${a.desc}"><i class="fas fa-lock"></i> ${a.name}</span>`;
            }
        }).join('');
        
        container.innerHTML = `<div class="achievements-content open"><div class="achievements-section">${allAchievementsHtml}</div></div>`;
    } else {
       
        if (unlockedSorted.length === 0) {
            container.innerHTML = `<div class="achievements-collapsed"><span style="color: var(--text-muted); font-size: 12px;">Нет достижений</span></div>`;
        } else {
            container.innerHTML = `<div class="achievements-collapsed">${unlockedSorted.map(a => 
                `<div class="achievement-icon-only ${levelClass}" title="${a.name} — ${a.desc}"><i class="${a.icon}"></i></div>`
            ).join('')}</div>`;
        }
    }
}


    // Обновление UI дашборда
    function updateDashboardUI() {
        document.getElementById('user-score').textContent = currentScore;
        document.getElementById('sidebar-score').textContent = currentScore;
        
        const levels = { novice: { label: 'novice', cls: 'level-novice' }, intermediate: { label: 'intermediate', cls: 'level-intermediate' }, expert: { label: 'expert', cls: 'level-expert' } };
        const lvl = levels[currentLevel] || levels.novice;
        const lb = document.getElementById('level-badge');
        if (lb) {
            lb.className = `level-badge ${lvl.cls}`;
    	    lb.textContent = lvl.label.toUpperCase();
        }
        
        renderAchievements();
        
        const modulesList = document.getElementById('modules-list');
        if (modulesList) {
            modulesList.innerHTML = modules.map(m => `<div class="module-item ${completedModules.includes(m.id) ? 'completed' : ''}" data-module-id="${m.id}"><div class="module-icon">${completedModules.includes(m.id) ? `<i class="${m.completedIcon}" style="color: var(--accent-teal);"></i>` : `<i class="${m.icon}"></i>`}</div><span>${m.name}</span></div>`).join('');
            document.querySelectorAll('.module-item').forEach(item => {
                item.addEventListener('click', () => { 
                    const mid = parseInt(item.dataset.moduleId); 
                    const mod = modules.find(m => m.id === mid); 
                    if(mod) sendMessage(`Хочу пройти модуль: ${mod.name}`); 
                });
            });
        }
        
        updateStatsModal();
    }

    // Сообщения
    function addMessage(role, content, agent = 'TUTOR') {
        const messages = document.getElementById('chat-messages');
        const welcome = document.getElementById('welcome-screen');
        if(welcome) welcome.style.display = 'none';
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `message message-${role}`;
        
        if(role === 'user') {
            msgDiv.innerHTML = `<div class="message-bubble">${escapeHtml(content)}</div>`;
        } else {
            const cfg = { 
                TUTOR: { avatarClass: 'avatar-tutor', icon: 'fas fa-chalkboard-user', label: 'Тьютор', labelClass: 'agent-label-tutor' },
                PROFILER: { avatarClass: 'avatar-profiler', icon: 'fas fa-user-secret', label: 'Профайлер', labelClass: 'agent-label-profiler' },
                EVALUATOR: { avatarClass: 'avatar-evaluator', icon: 'fas fa-star', label: 'Оценщик', labelClass: 'agent-label-evaluator' } 
            }[agent];
            msgDiv.innerHTML = `<div class="agent-avatar ${cfg.avatarClass}"><i class="${cfg.icon}"></i></div><div><div class="agent-label ${cfg.labelClass}">${cfg.label}</div><div class="message-bubble">${renderMarkdown(content)}</div></div>`;
        }
        messages.appendChild(msgDiv);
        scrollToBottom('chat-container');
    }

    function addStreamingMessage() {
        const messages = document.getElementById('chat-messages');
        const welcome = document.getElementById('welcome-screen');
        if(welcome) welcome.style.display = 'none';
        const old = document.getElementById('streaming-msg');
        if(old) old.remove();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message message-assistant';
        msgDiv.id = 'streaming-msg';
        msgDiv.innerHTML = `<div class="agent-avatar avatar-tutor"><i class="fas fa-chalkboard-user"></i></div><div><div class="agent-label agent-label-tutor">Тьютор</div><div class="message-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div></div>`;
        messages.appendChild(msgDiv);
        scrollToBottom('chat-container');
    }

    function updateStreamingMessage(content, agent = 'TUTOR') {
        const msgDiv = document.getElementById('streaming-msg');
        if(!msgDiv) return;
        const cfg = { 
            TUTOR: { avatarClass: 'avatar-tutor', icon: 'fas fa-chalkboard-user', label: 'Тьютор', labelClass: 'agent-label-tutor' },
            PROFILER: { avatarClass: 'avatar-profiler', icon: 'fas fa-user-secret', label: 'Профайлер', labelClass: 'agent-label-profiler' },
            EVALUATOR: { avatarClass: 'avatar-evaluator', icon: 'fas fa-star', label: 'Оценщик', labelClass: 'agent-label-evaluator' } 
        }[agent];
        const avatar = msgDiv.querySelector('.agent-avatar');
        const label = msgDiv.querySelector('.agent-label');
        if(avatar) { avatar.className = `agent-avatar ${cfg.avatarClass}`; avatar.innerHTML = `<i class="${cfg.icon}"></i>`; }
        if(label) { label.className = `agent-label ${cfg.labelClass}`; label.textContent = cfg.label; }
        const bubble = msgDiv.querySelector('.message-bubble');
        if(bubble) bubble.innerHTML = renderMarkdown(content);
        scrollToBottom('chat-container');
    }

    function finishStreamingMessage() { 
        const msgDiv = document.getElementById('streaming-msg'); 
        if(msgDiv) msgDiv.removeAttribute('id'); 
    }

    // Отправка сообщения
    function sendMessage(text) {
        if(!text.trim() || isLoading) return;
        window.messageCount = (window.messageCount || 0) + 1;
        isLoading = true;
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');
        if(sendBtn) sendBtn.disabled = true;
        if(chatInput) chatInput.value = '';
        
        addMessage('user', text);
        addStreamingMessage();
        
        setTimeout(() => {
            let response = '';
            const lower = text.toLowerCase();
            if(lower.includes('привет') || lower.includes('начать')) {
                response = 'Привет! 👋 Рад тебя видеть! Давай начнём изучать промпт-инжиниринг.\n\n**Промпт-инжиниринг** — это искусство составления правильных запросов к AI. От качества промпта напрямую зависит качество ответа.\n\nЧто хочешь изучить? Могу рассказать о:\n• Структуре промпта\n• Техниках улучшения\n• Few-shot и Chain-of-thought';
            } else if(lower.includes('модуль') || lower.includes('пройти')) {
                response = 'Отличный выбор! 📚 Этот модуль поможет тебе освоить важные навыки.\n\n**План обучения:**\n1. Сначала я расскажу теорию\n2. Затем покажу примеры\n3. В конце будет практическое задание\n\nГотов начать?';
            } else if(lower.includes('задание') || lower.includes('список заданий')) {
                response = '📋 **Список заданий:**\n\n1. **Структура промпта** — 30 баллов\n2. **Улучшение промптов** — 30 баллов\n3. **Few-shot** — 30 баллов\n4. **Chain-of-thought** — 30 баллов\n5. **Мастер контекста** — 30 баллов\n6. **Комплексный промпт** — 30 баллов\n\nВыбери задание, чтобы продолжить!';
            } else if(lower.includes('оцен') || lower.includes('прогресс')) {
                response = `📊 **Твой прогресс:**\n\nВсего очков: ${currentScore}\nУровень: ${currentLevel}\n\nВыполнено модулей: ${completedModules.length}/6\n\nПродолжай в том же духе! 🚀`;
            } else {
                response = 'Интересный вопрос! 👍\n\n**Промпт-инжиниринг** — это искусство составления правильных запросов к AI. Хороший промпт должен быть:\n• **Конкретным** — чётко указывай, что нужно\n• **Контекстным** — давай достаточно информации\n• **Структурированным** — используй форматирование\n\nЧто именно тебя интересует? Могу рассказать про структуру, привести примеры или дать задание!';
            }
            
        if (lower.includes('завершить модуль') || lower.includes('закончить модуль') || lower.includes('пройти модуль')) {
            let moduleToComplete = null;
            for (let i = 0; i < modules.length; i++) {
                if (lower.includes(modules[i].name.toLowerCase())) {
                    moduleToComplete = modules[i].id;
                    break;
                }
            }
            
            if (moduleToComplete && !completedModules.includes(moduleToComplete)) {
                completedModules.push(moduleToComplete);
                const moduleIndex = moduleToComplete - 1;
                if (progressData[moduleIndex]) {
                    progressData[moduleIndex].completed = true;
                    progressData[moduleIndex].score = progressData[moduleIndex].max_score;
                }
                checkAndUnlockAchievements();
                saveProgressToLocalStorage();
                response += '\n\n✅ Модуль успешно пройден! Ты получаешь максимальные баллы!';
            }
        }
            const points = Math.floor(Math.random() * 15) + 5;
            updateStreamingMessage(response, 'TUTOR');
            
            setTimeout(() => {
                finishStreamingMessage();
                currentScore += points;
                if(currentScore >= 100) currentLevel = 'expert';
                else if(currentScore >= 50) currentLevel = 'intermediate';
                else currentLevel = 'novice';
                
                achievements[0].unlocked = true;
                achievements[3].unlocked = currentScore >= 50;
                achievements[4].unlocked = currentScore >= 100;
                achievements[5].unlocked = currentScore >= 200;
                
                updateDashboardUI();
                showScoreNotification(points, currentScore);
                checkAndUnlockAchievements();
                saveProgressToLocalStorage();

                isLoading = false;
                if(sendBtn) sendBtn.disabled = false;
                if(chatInput) chatInput.focus();
            }, 500);
        }, 800);
    }

    // Инициализация дашборда
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        loadProgressFromLocalStorage();
        updateDashboardUI();
        
        const themeToggle = document.getElementById('theme-toggle');
        if(themeToggle) themeToggle.addEventListener('click', toggleTheme);
        
        const achievementsHeader = document.getElementById('achievements-header');
        if(achievementsHeader) {
            achievementsHeader.addEventListener('click', () => {
                achievementsExpanded = !achievementsExpanded;
                const icon = document.getElementById('toggle-icon');
                if(icon) icon.classList.toggle('open', achievementsExpanded);
                renderAchievements();
            });
        }
        
        const startBtn = document.getElementById('start-btn');
        if(startBtn) startBtn.addEventListener('click', () => sendMessage('Привет! Я хочу научиться писать хорошие промпты для AI.'));
        
        const logoutBtn = document.getElementById('logout-btn');
        if(logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if(confirm('Выйти из аккаунта?')) {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                }
            });
        }
        
	const navLearning = document.getElementById('nav-learning');
	const navAssignments = document.getElementById('nav-assignments');
	const navStats = document.getElementById('nav-stats');
	const modal = document.getElementById('stats-modal');
	const closeModal = document.getElementById('stats-modal-close');

	function setActiveTab(activeElement) {
            if (navLearning) navLearning.classList.remove('active');
            if (navAssignments) navAssignments.classList.remove('active')
            if (activeElement === navStats) {
                return;
            }
            if (activeElement) activeElement.classList.add('active');
	}

	if (navLearning) {
    		navLearning.addEventListener('click', (e) => {
        		setActiveTab(navLearning);
    		});
	}


	if (navAssignments) {
    		navAssignments.addEventListener('click', (e) => {
        		e.preventDefault();
        		setActiveTab(navAssignments);  // Теперь Prompt Up становится активной
        		sendMessage('Покажи мне список заданий');
    		});
	}

	if (navStats && modal) {
    		navStats.addEventListener('click', (e) => {
                	e.preventDefault();
                	updateStatsModal();
                	modal.classList.add('active');
    		});
	}


	if (closeModal && modal) {
    		closeModal.addEventListener('click', () => modal.classList.remove('active'));
    		modal.addEventListener('click', (e) => { 
			if(e.target === modal) modal.classList.remove('active'); 
		});
	}
        
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        if(chatInput && sendBtn) {
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight,150)+'px';
                sendBtn.disabled = !chatInput.value.trim();
            });
            chatInput.addEventListener('keydown', (e) => { 
                if(e.key === 'Enter' && !e.shiftKey && chatInput.value.trim()) { 
                    e.preventDefault(); 
                    sendMessage(chatInput.value); 
                } 
            });
            sendBtn.addEventListener('click', () => chatInput.value.trim() && sendMessage(chatInput.value));
            chatInput.focus();
        }

    });
}
if (!document.getElementById('dashboard-layout') && !document.getElementById('chat-container')) {
    document.addEventListener('DOMContentLoaded', initTheme);
}


// ========================================
// ONBOARDING TOUR
// ========================================

class OnboardingTour {
    constructor() {
        this.steps = [
            {
                element: '.logo',
                title: '<i class="fas fa-house" style="margin-right: 8px;"></i> Домой',
                description: 'Логотип платформы. Нажмите, чтобы вернуться на главную страницу.',
                position: 'bottom'
            },
            {
                element: '#nav-learning',
                title: '<i class="fas fa-graduation-cap" style="margin-right: 8px;"></i> Обучение',
                description: 'Основной раздел обучения. Здесь вы будете общаться с AI-тьютором и изучать теорию промпт-инжиниринга.',
                position: 'bottom'
            },
            {
                element: '#nav-assignments',
                title: '<i class="fas fa-pen-fancy" style="margin-right: 8px;"></i> Prompt Up',
                description: 'Раздел свободной практики',
                position: 'bottom'
            },
            {
                element: '#nav-stats',
                title: '<i class="fas fa-chart-line" style="margin-right: 8px;"></i> Статистика',
                description: 'Ваш прогресс обучения: сколько баллов набрали, какие модули прошли и сколько заданий сделали.',
                position: 'bottom'
            },
            {
                element: '#user-badge',
                title: '<i class="fas fa-star" style="margin-right: 8px; color: #FFC800;"></i> Ваши баллы',
                description: 'Общее количество набранных баллов. Чем больше баллов, тем выше ваш уровень!',
                position: 'bottom'
            },
            {
                element: '#theme-toggle',
                title: '<i class="fas fa-palette" style="margin-right: 8px;"></i> Тема оформления',
                description: 'Переключатель светлой и тёмной темы. Выберите ту, которая комфортнее для глаз.',
                position: 'bottom'
            },
            {
                element: '.sidebar .user-name',
                title: '<i class="fas fa-user-astronaut" style="margin-right: 8px;"></i> Ваш профиль',
                description: 'Имя пользователя',
                position: 'right'
            },
            {
                element: '.score-display',
                title: '<i class="fas fa-trophy" style="margin-right: 8px; color: #FFC800;"></i> Счёт и уровень',
                description: 'Ваши очки и текущий уровень мастерства (новичок → средний → эксперт).',
                position: 'right'
            },
            {
                element: '#modules-list',
                title: '<i class="fas fa-layer-group" style="margin-right: 8px;"></i> Модули обучения',
                description: '6 модулей курса. Нажимайте на любой модуль, чтобы начать обучение. Пройденные модули отмечены галочкой.',
                position: 'right'
            },
            {
                element: '#achievements-header',
                title: '<i class="fas fa-medal" style="margin-right: 8px; color: #FFC800;"></i> Достижения',
                description: 'Ваши награды и ачивки. Нажмите, чтобы развернуть и увидеть все достижения.',
                position: 'right'
            },
            {
                element: '.chat-input-area',
                title: '<i class="fas fa-keyboard" style="margin-right: 8px;"></i> Поле ввода',
                description: 'Пишите свои вопросы и ответы здесь. Нажмите Enter для отправки или используйте кнопку с самолётиком.',
                position: 'top'
            }
        ];
        
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.tooltip = null;
        this.currentHighlight = null;
        this.hasSeenTour = false;
    }
    
    init() {
        try {
            this.hasSeenTour = localStorage.getItem('onboarding_completed') === 'true';
        } catch(e) {}
        if (!this.hasSeenTour) {
        	setTimeout(() => this.start(), 800);
	}
    }
    
    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.currentStep = 0;
        this.createOverlay();
        this.showStep();
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'onboarding-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            pointer-events: auto;
        `;
        
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'onboarding-tooltip';
        this.tooltip.style.cssText = `
            position: fixed;
            background: var(--bg-secondary);
            border-radius: 16px;
            padding: 20px;
            max-width: 400px;
            z-index: 10002;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            border: 1px solid var(--border-color);
            pointer-events: auto;
        `;
        
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.tooltip);
        
        const skipBtn = document.createElement('button');
        skipBtn.className = 'onboarding-skip';
        skipBtn.textContent = 'Пропустить гайд';
        skipBtn.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(26, 26, 26, 0.9);
            border: 1px solid var(--border-color);
            padding: 10px 20px;
            border-radius: 25px;
            color: var(--text-secondary);
            cursor: pointer;
            z-index: 10003;
            font-family: inherit;
            font-size: 14px;
            font-weight: 500;
            backdrop-filter: blur(10px);
            transition: all 0.2s ease;
        `;
        skipBtn.addEventListener('mouseenter', () => {
            skipBtn.style.background = 'rgba(255, 200, 0, 0.9)';
            skipBtn.style.color = '#1A1A1A';
        });
        skipBtn.addEventListener('mouseleave', () => {
            skipBtn.style.background = 'rgba(26, 26, 26, 0.9)';
            skipBtn.style.color = 'var(--text-secondary)';
        });
        skipBtn.addEventListener('click', () => this.finish());
        document.body.appendChild(skipBtn);
        this.skipBtn = skipBtn;
    }
    
    createCutout(rect) {
        const oldClip = document.querySelector('.onboarding-clip-svg');
        if (oldClip) oldClip.remove();
        
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("class", "onboarding-clip-svg");
        svg.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10001;
            pointer-events: none;
        `;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const padding = 12;
        const x = Math.max(0, rect.left - padding);
        const y = Math.max(0, rect.top - padding);
        const w = rect.width + padding * 2;
        const h = rect.height + padding * 2;
        
        const mask = document.createElementNS(svgNS, "mask");
        mask.setAttribute("id", "onboarding-mask");
        
        const whiteRect = document.createElementNS(svgNS, "rect");
        whiteRect.setAttribute("x", "0");
        whiteRect.setAttribute("y", "0");
        whiteRect.setAttribute("width", width);
        whiteRect.setAttribute("height", height);
        whiteRect.setAttribute("fill", "white");
        mask.appendChild(whiteRect);
        
        const blackRect = document.createElementNS(svgNS, "rect");
        blackRect.setAttribute("x", x);
        blackRect.setAttribute("y", y);
        blackRect.setAttribute("width", w);
        blackRect.setAttribute("height", h);
        blackRect.setAttribute("fill", "black");
        blackRect.setAttribute("rx", "16");
        mask.appendChild(blackRect);
        
        svg.appendChild(mask);
        
        const overlayRect = document.createElementNS(svgNS, "rect");
        overlayRect.setAttribute("x", "0");
        overlayRect.setAttribute("y", "0");
        overlayRect.setAttribute("width", width);
        overlayRect.setAttribute("height", height);
        overlayRect.setAttribute("fill", "rgba(0, 0, 0, 0.85)");
        overlayRect.setAttribute("mask", "url(#onboarding-mask)");
        svg.appendChild(overlayRect);
        
        document.body.appendChild(svg);
        
        const glow = document.createElement('div');
        glow.className = 'onboarding-glow';
        glow.style.cssText = `
            position: fixed;
            top: ${y - 4}px;
            left: ${x - 4}px;
            width: ${w + 8}px;
            height: ${h + 8}px;
            border-radius: 20px;
            pointer-events: none;
            z-index: 10002;
            animation: onboardingGlow 1.5s infinite;
            box-shadow: 0 0 0 2px var(--accent-bee), 0 0 0 6px rgba(255, 200, 0, 0.3);
            background: rgba(255, 200, 0, 0.05);
        `;
        document.body.appendChild(glow);
        this.currentGlow = glow;
        
        this.currentSvg = svg;
    }
    
    removeCutout() {
        if (this.currentSvg) this.currentSvg.remove();
        if (this.currentGlow) this.currentGlow.remove();
    }
    
    showStep() {
        if (this.currentStep >= this.steps.length) {
            this.finish();
            return;
        }
        
        const step = this.steps[this.currentStep];
        const element = document.querySelector(step.element);
        
        if (!element) {
            this.currentStep++;
            this.showStep();
            return;
        }
        
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            const rect = element.getBoundingClientRect();
            this.createCutout(rect);
            this.showTooltip(element, rect, step);
        }, 300);
    }
    
    showTooltip(element, rect, step) {
        const tooltipWidth = 400;
        const tooltipHeight = 260;
    	const offset =35;
        let tooltipTop, tooltipLeft;
        
    switch(step.position) {
        case 'top':
            tooltipTop = rect.top - tooltipHeight - offset;
            tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            break;
        case 'bottom':
            tooltipTop = rect.bottom + offset;
            tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            break;
        case 'left':
            tooltipTop = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            tooltipLeft = rect.left - tooltipWidth - offset;
            break;
        case 'right':
            tooltipTop = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            tooltipLeft = rect.right + offset;
            break;
        default:
            tooltipTop = rect.bottom + offset;
            tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    }
    const minLeft = 16;
    const maxLeft = window.innerWidth - tooltipWidth - 16;
    
    if (tooltipLeft < minLeft) {
        tooltipLeft = minLeft;
    }
    if (tooltipLeft > maxLeft) {
        tooltipLeft = maxLeft;
    }
    const minTop = 16;
    const maxTop = window.innerHeight - tooltipHeight - 16;
    
    if (tooltipTop < minTop) {
        tooltipTop = minTop;
    }
    if (tooltipTop > maxTop) {
        tooltipTop = maxTop;
    }
     
    this.tooltip.style.top = `${tooltipTop}px`;
    this.tooltip.style.left = `${tooltipLeft}px`;

    const tooltipRect = {
        top: tooltipTop,
        left: tooltipLeft,
        bottom: tooltipTop + tooltipHeight,
        right: tooltipLeft + tooltipWidth
    };
        
    let arrowDirection = 'top';
    if (tooltipRect.bottom < rect.top) arrowDirection = 'bottom';
    else if (tooltipRect.top > rect.bottom) arrowDirection = 'top';
    else if (tooltipRect.right < rect.left) arrowDirection = 'right';
    else if (tooltipRect.left > rect.right) arrowDirection = 'left'; 
        
    this.tooltip.innerHTML = `
        <div style="position: relative;">
            <div class="onboarding-arrow ${arrowDirection}" style="
                position: absolute;
                ${arrowDirection === 'top' ? 'bottom: 100%; left: 50%; transform: translateX(-50%); border-width: 0 10px 10px 10px; border-color: transparent transparent var(--bg-secondary) transparent;' : ''}
                ${arrowDirection === 'bottom' ? 'top: 100%; left: 50%; transform: translateX(-50%); border-width: 10px 10px 0 10px; border-color: var(--bg-secondary) transparent transparent transparent;' : ''}
                ${arrowDirection === 'left' ? 'right: 100%; top: 50%; transform: translateY(-50%); border-width: 10px 10px 10px 0; border-color: transparent var(--bg-secondary) transparent transparent;' : ''}
                ${arrowDirection === 'right' ? 'left: 100%; top: 50%; transform: translateY(-50%); border-width: 10px 0 10px 10px; border-color: transparent transparent transparent var(--bg-secondary);' : ''}
                width: 0;
                height: 0;
                border-style: solid;
            "></div>
            <h3 style="font-size: 18px; margin-bottom: 12px; color: var(--accent-bee); display: flex; align-items: center;">
                ${step.title}
            </h3>
            <p style="font-size: 14px; line-height: 1.5; color: var(--text-secondary); margin-bottom: 20px;">${step.description}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 6px;">
                    ${Array(this.steps.length).fill(0).map((_, i) => `
                        <div style="
                            width: ${i === this.currentStep ? '20px' : '6px'};
                            height: 6px;
                            border-radius: ${i === this.currentStep ? '3px' : '50%'};
                            background: ${i === this.currentStep ? 'var(--accent-bee)' : 'var(--text-muted)'};
                            transition: all 0.3s ease;
                        "></div>
                    `).join('')}
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="onboarding-prev" style="background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 8px 16px; border-radius: 8px; font-family: inherit; font-size: 14px; transition: all 0.2s ease;">← Назад</button>
                    <button class="onboarding-next" style="background: var(--accent-bee); border: none; color: #1A1A1A; padding: 8px 24px; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: inherit; font-size: 14px; transition: all 0.2s ease; white-space: nowrap;">${this.currentStep === this.steps.length - 1 ? '✨ Готово!' : 'Далее →'}</button>
                </div>
            </div>
        </div>
    `;

        const nextBtn = this.tooltip.querySelector('.onboarding-next');
        const prevBtn = this.tooltip.querySelector('.onboarding-prev');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.removeCutout();
                this.currentStep++;
                this.showStep();
            });
            
            nextBtn.addEventListener('mouseenter', () => {
                nextBtn.style.transform = 'translateY(-1px)';
                nextBtn.style.boxShadow = '0 4px 12px rgba(255, 200, 0, 0.4)';
            });
            nextBtn.addEventListener('mouseleave', () => {
                nextBtn.style.transform = 'translateY(0)';
                nextBtn.style.boxShadow = 'none';
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentStep > 0) {
                    this.removeCutout();
                    this.currentStep--;
                    this.showStep();
                }
            });
            
            prevBtn.addEventListener('mouseenter', () => {
                prevBtn.style.background = 'var(--bg-card)';
                prevBtn.style.color = 'var(--text-primary)';
            });
            prevBtn.addEventListener('mouseleave', () => {
                prevBtn.style.background = 'transparent';
                prevBtn.style.color = 'var(--text-secondary)';
            });
        }
    }
    
    finish() {
        this.isActive = false;
        this.removeCutout();
        if (this.overlay) this.overlay.remove();
        if (this.tooltip) this.tooltip.remove();
        if (this.skipBtn) this.skipBtn.remove();
        
        try {
            localStorage.setItem('onboarding_completed', 'true');
        } catch(e) {}
        
        this.showWelcomeMessage();
    }
    
    showWelcomeMessage() {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'onboarding-welcome';
 	const rightOffset = 75;
        welcomeDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(calc(-50% + ${rightOffset}px), -50%);
            background: linear-gradient(135deg, var(--accent-bee), var(--accent-amber));
            color: #1A1A1A;
        padding: 16px 32px;
        border-radius: 50px;
        font-weight: 600;
        z-index: 10001;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        white-space: nowrap;
        animation: fadeInScale 0.4s ease;
    `;
    welcomeDiv.innerHTML = '<i class="fas fa-party-horn"></i> Отлично! Гайд пройден. Начинайте обучение! <i class="fas fa-sparkles"></i>';
    
    document.body.appendChild(welcomeDiv);
    
    setTimeout(() => {
        welcomeDiv.style.opacity = '1';
    }, 10);
    setTimeout(() => {
        welcomeDiv.style.opacity = '0';
        setTimeout(() => welcomeDiv.remove(), 400);
    }, 2000);
}
}

// Инициализация гайда
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('dashboard-layout') || document.getElementById('chat-container')) {
        const tour = new OnboardingTour();
        tour.init();
    }
});

if (!document.querySelector('#achievement-animations')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'achievement-animations';
    styleSheet.textContent = `
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(100px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutRight {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(100px); }
        }
        .achievement-unlock-title {
            font-size: 11px;
            color: var(--text-muted);
            letter-spacing: 0.5px;
        }
        .achievement-unlock-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--accent-bee);
        }
        .achievement-unlock-desc {
            font-size: 12px;
            color: var(--text-secondary);
        }
        .achievement-unlock-content {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
    `;
    document.head.appendChild(styleSheet);
}
