// ==========================================
// 1. Theme Toggle Logic (Dark/Light Mode)
// ==========================================
const themeBtn = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;

const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    htmlElement.setAttribute('data-theme', 'dark');
    themeBtn.innerText = '☀️ Light Mode';
}

themeBtn.addEventListener('click', () => {
    const isDark = htmlElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        htmlElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeBtn.innerText = '🌙 Dark Mode';
    } else {
        htmlElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeBtn.innerText = '☀️ Light Mode';
    }
});

// ==========================================
// 2. Data Fetching & Rendering Logic
// ==========================================
const semesterSelect = document.getElementById('semester-select');
const sectionSelect = document.getElementById('section-select');
const routineContainer = document.getElementById('routine-container');
const dayTabsContainer = document.getElementById('day-tabs-container');
const dayTabs = document.querySelectorAll('.day-tab');

let routineData = {};
let currentSelectedDay = new Date().toLocaleString('en-us', { weekday: 'long' });

// Day Tab active class setup
dayTabs.forEach(tab => {
    if (tab.getAttribute('data-day') === currentSelectedDay) {
        tab.classList.add('active');
    }
    
    tab.addEventListener('click', (e) => {
        dayTabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentSelectedDay = e.target.getAttribute('data-day');
        displayRoutine();
    });
});

// JSON theke directly data load kora (Swap logic removed)
fetch('data/routine.json')
    .then(response => response.json())
    .then(data => {
        routineData = data;
        restoreSelectionAndDisplay();
    })
    .catch(error => console.error("Data load error:", error));

function restoreSelectionAndDisplay() {
    const savedSemester = localStorage.getItem('savedSemester');
    const savedSection = localStorage.getItem('savedSection');

    if (savedSemester) semesterSelect.value = savedSemester;
    if (savedSection) sectionSelect.value = savedSection;

    if (semesterSelect.value !== 'default' && sectionSelect.value !== 'default') {
        displayRoutine();
    }
}

// Time check korar helper function
function checkIsLive(timeString) {
    try {
        const parts = timeString.split('-');
        if (parts.length !== 2) return false;

        const parseMinutes = (timeStr) => {
            const [time, period] = timeStr.trim().split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (hours === 12 && period === 'AM') hours = 0;
            if (hours !== 12 && period === 'PM') hours += 12;
            return hours * 60 + minutes;
        };

        const startMins = parseMinutes(parts[0]);
        const endMins = parseMinutes(parts[1]);
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        return currentMins >= startMins && currentMins < endMins;
    } catch (e) {
        return false;
    }
}

// Routine Show korar function
function displayRoutine() {
    const semester = semesterSelect.value;
    const section = sectionSelect.value;

    if (semester !== 'default') localStorage.setItem('savedSemester', semester);
    if (section !== 'default') localStorage.setItem('savedSection', section);

    if (semester === 'default' || section === 'default') {
        dayTabsContainer.style.display = 'none';
        routineContainer.innerHTML = '<p class="placeholder-text">Please select your semester and section to view the routine.</p>';
        return;
    }

    dayTabsContainer.style.display = 'flex';
    routineContainer.innerHTML = ''; 

    const sectionData = routineData[semester]?.[section];

    if (!sectionData) {
        routineContainer.innerHTML = '<p class="placeholder-text">Ei section er kono routine paoa jayni.</p>';
        return;
    }

    const classesForToday = sectionData[currentSelectedDay];

    if (!classesForToday || classesForToday.length === 0) {
        routineContainer.innerHTML = '<p class="placeholder-text">Ei dine kono class nei.</p>';
        return;
    }

    const actualToday = new Date().toLocaleString('en-us', { weekday: 'long' });

    classesForToday.forEach((cls, index) => {
        const card = document.createElement('div');
        card.className = 'routine-card';

        const isNoClass = cls.course === 'No class';
        const isBreak = cls.course.includes('Break Time');
        const isLiveNow = (actualToday === currentSelectedDay) && checkIsLive(cls.time);

        let detailsHTML = '';
        if (!isNoClass && !isBreak) {
            detailsHTML = `
                <div class="card-details">
                    <p>👨‍🏫 Teacher: ${cls.teacher}</p>
                    <p>🚪 Room: ${cls.room}</p>
                </div>
            `;
        }

        if (isNoClass) card.style.opacity = '0.5';
        if (isBreak) {
            card.style.backgroundColor = 'var(--hover-bg)';
            card.style.borderStyle = 'dashed';
        }

        let liveBadge = '';
        if (isLiveNow && !isNoClass) {
            card.classList.add('live-card');
            liveBadge = isBreak ? `<span class="live-badge">☕ ON BREAK NOW</span>` : `<span class="live-badge">🔴 HAPPENING NOW</span>`;
        }

        // Notes and Deadline Logic
        const noteKey = `note_${semester}_${section}_${currentSelectedDay}_${index}`;
        const savedNoteData = JSON.parse(localStorage.getItem(noteKey));
        
        let noteHTML = '';
        if (savedNoteData) {
            let noteContent = '';
            let displayDate = '';

            if (savedNoteData.rawDate) {
                const dateObj = new Date(savedNoteData.rawDate);
                displayDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            }

            if (displayDate && savedNoteData.text) {
                noteContent = `📅 Due: ${displayDate} | 📝 ${savedNoteData.text}`;
            } else if (displayDate) {
                noteContent = `📅 Due: ${displayDate}`;
            } else if (savedNoteData.text) {
                noteContent = `📝 ${savedNoteData.text}`;
            }
            
            if (noteContent) {
                noteHTML = `<div class="card-note-display">${noteContent}</div>`;
            }
        }

        card.innerHTML = `
            ${liveBadge}
            <span class="time-slot" style="${isLiveNow ? 'color: #16a34a;' : ''}">⏰ ${cls.time}</span>
            <div class="course-title">${cls.course}</div>
            ${detailsHTML}
            ${noteHTML}
        `;

        card.addEventListener('click', () => {
            // চেক করা হচ্ছে ইউজার কোনো টেক্সট সিলেক্ট করেছে কি না
            const selectedText = window.getSelection().toString();
            
            if (selectedText.length > 0) {
                return; // টেক্সট সিলেক্ট করলে এখানেই থেমে যাবে, পপআপ আসবে না
            }
            
            openNoteModal(semester, section, currentSelectedDay, index, cls.course);
        });
        
        routineContainer.appendChild(card);
    });
}

semesterSelect.addEventListener('change', displayRoutine);
sectionSelect.addEventListener('change', displayRoutine);

// ==========================================
// 3. Sidebar Menu & Features Logic
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-btn');
    const closeBtn = document.getElementById('close-menu');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('menu-overlay');

    if (menuBtn && sidebarMenu && overlay) {
        function openMenu() {
            sidebarMenu.classList.add('active');
            overlay.classList.add('active');
        }

        function closeMenu() {
            sidebarMenu.classList.remove('active');
            overlay.classList.remove('active');
        }

        menuBtn.addEventListener('click', openMenu);
        if (closeBtn) closeBtn.addEventListener('click', closeMenu);
        overlay.addEventListener('click', closeMenu);

        // Feature: Print Routine
        const menuPrint = document.getElementById('menu-print');
        if (menuPrint) {
            menuPrint.addEventListener('click', () => {
                closeMenu();
                if (semesterSelect.value === 'default') {
                    alert("Please select a routine to print.");
                    return;
                }
                window.print();
            });
        }

        // Feature: Academic Calendar / Student Login
        const menuCalendar = document.getElementById('menu-calendar');
        if (menuCalendar) {
            menuCalendar.addEventListener('click', () => {
                window.open("https://vu.edu.bd/", "_blank");
            });
        }

       // Feature: About App (Modern Modal Trigger)
        const menuAbout = document.getElementById('menu-about');
        const aboutModal = document.getElementById('about-modal');
        const closeAboutBtn = document.getElementById('close-about-btn');

        if (menuAbout && aboutModal) {
            menuAbout.addEventListener('click', () => {
                closeMenu(); 
                aboutModal.classList.add('show');
                overlay.classList.add('active'); 
            });

            if (closeAboutBtn) {
                closeAboutBtn.addEventListener('click', () => {
                    aboutModal.classList.remove('show');
                    overlay.classList.remove('active');
                });
            }

            overlay.addEventListener('click', () => {
                aboutModal.classList.remove('show');
            });
        }
    }
});

function showCustomAlert() {
    const alertBox = document.getElementById('custom-alert');
    if(alertBox) {
        alertBox.classList.add('show');
        setTimeout(() => {
            alertBox.classList.remove('show');
        }, 2500);
    }
}

// ==========================================
// 4. Class Notes & Assignment Tracker Logic
// ==========================================
const noteModal = document.getElementById('note-modal');
const noteModalCourse = document.getElementById('note-modal-course');
const noteDeadlineInput = document.getElementById('note-deadline');
const noteTextInput = document.getElementById('note-text');
const saveNoteBtn = document.getElementById('save-note-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const closeNoteBtn = document.getElementById('close-note-btn');

let activeNoteKey = '';

// Modal open korar function
window.openNoteModal = function(semester, section, day, index, courseName) {
    if (!noteModal) return; 
    
    activeNoteKey = `note_${semester}_${section}_${day}_${index}`;
    if (noteModalCourse) noteModalCourse.textContent = `Course: ${courseName}`;
    
    const existingData = JSON.parse(localStorage.getItem(activeNoteKey));
    if (existingData) {
        if (noteDeadlineInput) noteDeadlineInput.value = existingData.rawDate || '';
        if (noteTextInput) noteTextInput.value = existingData.text || '';
        if (deleteNoteBtn) deleteNoteBtn.style.display = 'block'; 
    } else {
        if (noteDeadlineInput) noteDeadlineInput.value = '';
        if (noteTextInput) noteTextInput.value = '';
        if (deleteNoteBtn) deleteNoteBtn.style.display = 'none'; 
    }

    noteModal.classList.add('show');
    document.getElementById('menu-overlay').classList.add('active'); 
};

// Modal close korar function
function closeNoteModal() {
    if (noteModal) noteModal.classList.remove('show');
    document.getElementById('menu-overlay').classList.remove('active');
}

// Save Button Logic
if (saveNoteBtn) {
    saveNoteBtn.addEventListener('click', () => {
        const dataToSave = {
            rawDate: noteDeadlineInput ? noteDeadlineInput.value : '', 
            text: noteTextInput ? noteTextInput.value.trim() : ''
        };

        if (dataToSave.rawDate === '' && dataToSave.text === '') {
            localStorage.removeItem(activeNoteKey);
        } else {
            localStorage.setItem(activeNoteKey, JSON.stringify(dataToSave));
        }

        closeNoteModal();
        if (typeof displayRoutine === 'function') displayRoutine();
    });
}

// Delete Button Logic
if (deleteNoteBtn) {
    deleteNoteBtn.addEventListener('click', () => {
        localStorage.removeItem(activeNoteKey);
        closeNoteModal();
        if (typeof displayRoutine === 'function') displayRoutine();
    });
}

// Close Button Logic
if (closeNoteBtn) {
    closeNoteBtn.addEventListener('click', closeNoteModal);
}

document.getElementById('reset-btn').addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});

// ==========================================
// Pull-to-Refresh (Touch + Mouse Support)
// ==========================================
const pullIndicator = document.getElementById('pull-indicator');
let startY = 0;
let isPulling = false;

// ১. স্ক্রিনে টাচ বা মাউস ক্লিক করার সময়
const handleStart = (clientY) => {
    // পেজ একদম উপরে থাকলেই কেবল ফিচারটি চালু হবে
    if (window.scrollY <= 5) { 
        startY = clientY;
        isPulling = true;
    }
};

document.addEventListener('touchstart', (e) => handleStart(e.touches[0].clientY), { passive: true });
document.addEventListener('mousedown', (e) => handleStart(e.clientY));

// ২. নিচের দিকে টানার সময়
const handleMove = (clientY) => {
    if (!isPulling) return;

    const distance = clientY - startY;

    // যদি নিচের দিকে 40px এর বেশি টানা হয়
    if (distance > 40 && window.scrollY <= 5) {
        pullIndicator.style.height = '50px';
        pullIndicator.innerHTML = '⬇️ Release to refresh';
    } else {
        pullIndicator.style.height = '0px';
    }
};

document.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientY), { passive: true });
document.addEventListener('mousemove', (e) => handleMove(e.clientY));

// ৩. টাচ বা মাউস ছেড়ে দেওয়ার সময়
const handleEnd = () => {
    if (!isPulling) return;
    isPulling = false;

    if (pullIndicator.style.height === '50px') {
        pullIndicator.innerHTML = '🔄 Refreshing...';
        
        setTimeout(() => {
            location.reload();
        }, 400);
    } else {
        pullIndicator.style.height = '0px'; 
    }
    startY = 0;
};

document.addEventListener('touchend', handleEnd);
document.addEventListener('mouseup', handleEnd);


// ==========================================
// Live Clock & Date Logic
// ==========================================
function updateDateTime() {
    const timeElement = document.getElementById('live-time');
    const dateElement = document.getElementById('live-date');
    
    if (!timeElement || !dateElement) return;

    const now = new Date();
    
    // Time Format (e.g., 10:35:11 AM)
    const timeOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
    timeElement.innerText = now.toLocaleTimeString('en-US', timeOptions);

    // Date Format (e.g., Sunday, 26 July, 2026)
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateElement.innerText = now.toLocaleDateString('en-US', dateOptions);
}

// প্রতি ১ সেকেন্ড পরপর টাইম আপডেট হবে
setInterval(updateDateTime, 1000);
updateDateTime(); // পেজ লোড হওয়ামাত্রই একবার কল করা হলো