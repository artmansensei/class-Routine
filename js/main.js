// ==========================================
// 1. Theme Toggle Logic (Dark/Light Mode)
// ==========================================
const themeBtn = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;

const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    htmlElement.setAttribute('data-theme', 'dark');
    if(themeBtn) themeBtn.innerText = '☀️ Light Mode';
}

if (themeBtn) {
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
}

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
const actualToday = currentSelectedDay;

function scrollTabIntoView(tabElement) {
    if (!tabElement || !dayTabsContainer) return;
    const containerWidth = dayTabsContainer.offsetWidth;
    const tabLeft = tabElement.offsetLeft;
    const tabWidth = tabElement.offsetWidth;
    
    dayTabsContainer.scrollTo({
        left: tabLeft - (containerWidth / 2) + (tabWidth / 2),
        behavior: 'smooth'
    });
}

dayTabs.forEach(tab => {
    const tabDay = tab.getAttribute('data-day');

    if (tabDay === actualToday) {
        if (!tab.querySelector('.tab-live-dot')) {
            const liveDot = document.createElement('span');
            liveDot.className = 'tab-live-dot';
            tab.appendChild(liveDot);
        }
    }

    if (tabDay === currentSelectedDay) {
        tab.classList.add('active');
        setTimeout(() => scrollTabIntoView(tab), 100);
    }
    
    tab.addEventListener('click', (e) => {
        dayTabs.forEach(t => t.classList.remove('active'));
        const clickedButton = e.target.closest('.day-tab');
        if (clickedButton) {
            clickedButton.classList.add('active');
            currentSelectedDay = clickedButton.getAttribute('data-day');
            scrollTabIntoView(clickedButton);
            displayRoutine();
        }
    });
});

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

    if (savedSemester && semesterSelect) semesterSelect.value = savedSemester;
    if (savedSection && sectionSelect) sectionSelect.value = savedSection;

    if (semesterSelect && sectionSelect && semesterSelect.value !== 'default' && sectionSelect.value !== 'default') {
        displayRoutine();
    }
}

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

function displayRoutine() {
    if (!semesterSelect || !sectionSelect || !routineContainer || !dayTabsContainer) return;
    
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
    
    const activeTab = Array.from(dayTabs).find(t => t.getAttribute('data-day') === currentSelectedDay);
    if (activeTab) {
        scrollTabIntoView(activeTab);
    }

    const fragment = document.createDocumentFragment();
    routineContainer.innerHTML = ''; 

    const sectionData = routineData[semester]?.[section];

    if (!sectionData) {
        routineContainer.innerHTML = '<p class="placeholder-text">Will be added soon....!!</p>';
        return;
    }

    const classesForToday = sectionData[currentSelectedDay];

    if (!classesForToday || classesForToday.length === 0) {
        routineContainer.innerHTML = '<p class="placeholder-text">OFF day</p>';
        return;
    }

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

        if (isNoClass) {
            card.style.opacity = '0.5';
            card.classList.add('no-class-card');
        }
        if (isBreak) {
            card.style.backgroundColor = 'var(--hover-bg)';
            card.style.borderStyle = 'dashed';
        }

        let liveBadge = '';
        if (isLiveNow && !isNoClass) {
            card.classList.add('live-card');
            liveBadge = isBreak ? `<span class="live-badge">☕ ON BREAK NOW</span>` : `<span class="live-badge">🔴 HAPPENING NOW</span>`;
        }

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
            const selectedText = window.getSelection().toString();
            if (selectedText.length > 0) return;
            openNoteModal(semester, section, currentSelectedDay, index, cls.course);
        });
        
        fragment.appendChild(card);
    });

    routineContainer.appendChild(fragment);
}

if (semesterSelect) semesterSelect.addEventListener('change', displayRoutine);
if (sectionSelect) sectionSelect.addEventListener('change', displayRoutine);

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

        // Feature: Premium PDF Download Logic (Main Page)
        const menuPrint = document.getElementById('menu-print');
        if (menuPrint) {
            menuPrint.addEventListener('click', async () => {
                closeMenu();

                const currentSem = semesterSelect ? semesterSelect.value : 'default';
                const currentSec = sectionSelect ? sectionSelect.value : 'default';

                if (currentSem === 'default' || currentSec === 'default') {
                    alert('⚠️ Please select a Semester and Section first!');
                    return;
                }

                try {
                    const response = await fetch('data/routine.json');
                    const data = await response.json();

                    if (!data[currentSem] || !data[currentSem][currentSec]) {
                        alert('⚠️ No routine data found for this semester and section.');
                        return;
                    }

                    const routineData = data[currentSem][currentSec];
                    
                    const pdfContainer = document.createElement('div');
                    pdfContainer.style.padding = '20px';
                    pdfContainer.style.fontFamily = 'Arial, sans-serif';
                    pdfContainer.style.color = '#111';
                    pdfContainer.style.background = '#fff';

                    let html = `
                        <div style="text-align: center; margin-bottom: 15px;">
                            <h2 style="color: #111; margin: 0; text-transform: uppercase; letter-spacing: 1px;">VU Routine</h2>
                            <h4 style="margin: 5px 0; color: #444;">Semester: ${currentSem} | Section: ${currentSec}</h4>
                            <p style="color: #555; font-size: 11px;">Generated on ${new Date().toLocaleDateString()}</p>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    `;

                    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    let hasClasses = false;

                    days.forEach(day => {
                        const classes = routineData[day] || [];
                        if (classes.length > 0) {
                            hasClasses = true;
                            
                            classes.sort((a, b) => {
                                const getMins = (timeStr) => {
                                    try {
                                        const t = timeStr.split('-')[0].trim();
                                        const [hm, p] = t.split(' ');
                                        let [h, m] = hm.split(':').map(Number);
                                        if(h === 12 && p === 'AM') h = 0;
                                        if(h !== 12 && p === 'PM') h += 12;
                                        return (h * 60) + m;
                                    } catch(e) { return 0; }
                                };
                                return getMins(a.time) - getMins(b.time);
                            });

                            html += `
                                <tr>
                                    <td colspan="4" style="background: #333; color: #fff; padding: 6px 10px; font-weight: bold; font-size: 12px; border: 1px solid #333;">
                                        ${day}
                                    </td>
                                </tr>
                                <tr style="background: #eee; font-weight: bold; color: #222;">
                                    <td style="padding: 5px 8px; border: 1px solid #ccc; width: 22%;">Time</td>
                                    <td style="padding: 5px 8px; border: 1px solid #ccc; width: 38%;">Course</td>
                                    <td style="padding: 5px 8px; border: 1px solid #ccc; width: 15%;">Room</td>
                                    <td style="padding: 5px 8px; border: 1px solid #ccc; width: 25%;">Teacher</td>
                                </tr>
                            `;
                            classes.forEach(cls => {
                                html += `
                                    <tr style="color: #222;">
                                        <td style="padding: 5px 8px; border: 1px solid #ccc;">${cls.time}</td>
                                        <td style="padding: 5px 8px; border: 1px solid #ccc;"><strong>${cls.course}</strong></td>
                                        <td style="padding: 5px 8px; border: 1px solid #ccc;">${cls.room}</td>
                                        <td style="padding: 5px 8px; border: 1px solid #ccc;">${cls.teacher || '-'}</td>
                                    </tr>
                                `;
                            });
                        }
                    });

                    html += `</table>`;
                    
                    if (!hasClasses) {
                        alert('⚠️ This routine is empty!');
                        return;
                    }

                    pdfContainer.innerHTML = html;

                    const opt = {
                        margin:       0.25, 
                        filename:     `VU_Routine_${currentSem}_Sec_${currentSec}.pdf`,
                        image:        { type: 'jpeg', quality: 1 },
                        html2canvas:  { scale: 2, useCORS: true },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                    };

                    html2pdf().set(opt).from(pdfContainer).save().then(() => {
                        console.log('✅ Main Routine PDF Downloaded Successfully!');
                    });

                } catch(e) {
                    console.error("PDF Fetch Error:", e);
                    alert("❌ Error loading routine data for PDF.");
                }
            });
        }

        // Navigate to Create Routine Page
        const menuCreate = document.getElementById('menu-create');
        if (menuCreate) {
            menuCreate.addEventListener('click', () => {
                window.location.href = 'create.html';
            });
        }

        // Feature: Academic Calendar / Student Login
        const menuCalendar = document.getElementById('menu-calendar');
        if (menuCalendar) {
            menuCalendar.addEventListener('click', () => {
                window.open("http://160.187.25.3:8083/front/student/login", "_blank");
            });
        }

        // Feature: About App
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
    const overlayBg = document.getElementById('menu-overlay');
    if(overlayBg) overlayBg.classList.add('active'); 
};

function closeNoteModal() {
    if (noteModal) noteModal.classList.remove('show');
    const overlayBg = document.getElementById('menu-overlay');
    if(overlayBg) overlayBg.classList.remove('active');
}

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

if (deleteNoteBtn) {
    deleteNoteBtn.addEventListener('click', () => {
        localStorage.removeItem(activeNoteKey);
        closeNoteModal();
        if (typeof displayRoutine === 'function') displayRoutine();
    });
}

if (closeNoteBtn) {
    closeNoteBtn.addEventListener('click', closeNoteModal);
}

// ==========================================
// Pull-to-Refresh Logic
// ==========================================
const pullIndicator = document.getElementById('pull-indicator');
let startY = 0;
let isPulling = false;

const handleStart = (clientY) => {
    if (window.scrollY <= 5) { 
        startY = clientY;
        isPulling = true;
    }
};

document.addEventListener('touchstart', (e) => handleStart(e.touches[0].clientY), { passive: true });
document.addEventListener('mousedown', (e) => handleStart(e.clientY));

const handleMove = (clientY) => {
    if (!isPulling || !pullIndicator) return;
    const distance = clientY - startY;

    if (distance > 40 && window.scrollY <= 5) {
        pullIndicator.style.height = '50px';
        pullIndicator.innerHTML = '⬇️ Release to refresh';
    } else {
        pullIndicator.style.height = '0px';
    }
};

document.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientY), { passive: true });
document.addEventListener('mousemove', (e) => handleMove(e.clientY));

const handleEnd = () => {
    if (!isPulling || !pullIndicator) return;
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
    const timeOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
    timeElement.innerText = now.toLocaleTimeString('en-US', timeOptions);

    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateElement.innerText = now.toLocaleDateString('en-US', dateOptions);
}

setInterval(updateDateTime, 1000);
updateDateTime();

// ==========================================
// 5. Install App & Hard Reset & Theme Modals
// ==========================================
let deferredPrompt;
const installMenuBtn = document.getElementById('menu-install');
const installModal = document.getElementById('install-modal');
const confirmInstallBtn = document.getElementById('confirm-install-btn');
const cancelInstallBtn = document.getElementById('cancel-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installMenuBtn) installMenuBtn.style.display = 'block';
});

if (installMenuBtn && installModal) {
    installMenuBtn.addEventListener('click', () => {
        const sidebarMenu = document.getElementById('sidebar-menu');
        const overlayBg = document.getElementById('menu-overlay');
        if (sidebarMenu) sidebarMenu.classList.remove('active');
        installModal.classList.add('show');
        if (overlayBg) overlayBg.classList.add('active');
    });
}

if (cancelInstallBtn) {
    cancelInstallBtn.addEventListener('click', () => {
        installModal.classList.remove('show');
        const overlayBg = document.getElementById('menu-overlay');
        if (overlayBg) overlayBg.classList.remove('active');
    });
}

if (confirmInstallBtn) {
    confirmInstallBtn.addEventListener('click', async () => {
        installModal.classList.remove('show');
        const overlayBg = document.getElementById('menu-overlay');
        if (overlayBg) overlayBg.classList.remove('active');

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                deferredPrompt = null;
                if (installMenuBtn) installMenuBtn.style.display = 'none';
            }
        }
    });
}

window.addEventListener('appinstalled', () => {
    if (installMenuBtn) installMenuBtn.style.display = 'none';
});

// Hard Reset Logic
const menuReset = document.getElementById('menu-reset');
const resetModal = document.getElementById('reset-modal');
const confirmResetBtn = document.getElementById('confirm-reset-btn');
const cancelResetBtn = document.getElementById('cancel-reset-btn');
const resetOverlay = document.getElementById('menu-overlay'); 

if (menuReset && resetModal) {
    menuReset.addEventListener('click', () => {
        const sidebarMenu = document.getElementById('sidebar-menu');
        if (sidebarMenu) sidebarMenu.classList.remove('active');
        resetModal.classList.add('show');
        if (resetOverlay) resetOverlay.classList.add('active');
    });

    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', () => {
            resetModal.classList.remove('show');
            if (resetOverlay) resetOverlay.classList.remove('active');
        });
    }

    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', async () => {
            confirmResetBtn.innerText = "Resetting...";
            confirmResetBtn.style.opacity = "0.7";
            
            localStorage.clear();
            
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    await caches.delete(name);
                }
            }
            
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }
            
            window.location.reload(true);
        });
    }
}

// Card Theme Logic
(function() {
    const savedCardTheme = localStorage.getItem('cardTheme') || 'default';
    document.documentElement.setAttribute('data-card-theme', savedCardTheme);

    const colorSwatches = document.querySelectorAll('.color-swatch');
    colorSwatches.forEach(swatch => {
        if (swatch.getAttribute('data-color') === savedCardTheme) {
            swatch.classList.add('active');
        }
        
        swatch.addEventListener('click', (e) => {
            colorSwatches.forEach(s => s.classList.remove('active'));
            e.target.classList.add('active');
            
            const selectedColor = e.target.getAttribute('data-color');
            document.documentElement.setAttribute('data-card-theme', selectedColor);
            localStorage.setItem('cardTheme', selectedColor);
        });
    });

    const menuCardTheme = document.getElementById('menu-card-theme');
    const themeModal = document.getElementById('theme-modal');
    const closeThemeBtn = document.getElementById('close-theme-btn');
    
    if (menuCardTheme && themeModal) {
        menuCardTheme.addEventListener('click', () => {
            const sidebarMenu = document.getElementById('sidebar-menu');
            const appOverlay = document.getElementById('menu-overlay');
            
            if (sidebarMenu) sidebarMenu.classList.remove('active');
            themeModal.classList.add('show');
            if (appOverlay) appOverlay.classList.add('active');
        });
        
        if (closeThemeBtn) {
            closeThemeBtn.addEventListener('click', () => {
                themeModal.classList.remove('show');
                const appOverlay = document.getElementById('menu-overlay');
                if (appOverlay) appOverlay.classList.remove('active');
            });
        }
    }
})();