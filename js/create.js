document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // Sidebar Menu & Theme Logic
    // ==========================================
    const menuBtn = document.getElementById('menu-btn');
    const closeBtn = document.getElementById('close-menu');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const mainOverlay = document.getElementById('menu-overlay');
    const themeBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
        if(themeBtn) themeBtn.innerText = '☀️ Light Mode';
    }
    const savedCardTheme = localStorage.getItem('cardTheme') || 'default';
    htmlElement.setAttribute('data-card-theme', savedCardTheme);

    if(themeBtn) {
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

    function closeSidebar() {
        if(sidebarMenu) sidebarMenu.classList.remove('active');
        if(mainOverlay) mainOverlay.classList.remove('active');
    }
    
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            if(sidebarMenu) sidebarMenu.classList.add('active');
            if(mainOverlay) mainOverlay.classList.add('active');
        });
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (mainOverlay) mainOverlay.addEventListener('click', closeSidebar);

    // ==========================================
    // Custom Toast Alert System
    // ==========================================
    function showToast(message) {
        const toast = document.getElementById('custom-toast');
        if(!toast) return;
        document.getElementById('toast-text').innerText = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ==========================================
    // Premium PDF Download Logic
    // ==========================================
    const menuPrint = document.getElementById('menu-print');
    if (menuPrint) {
        menuPrint.addEventListener('click', () => {
            closeSidebar();
            showToast('⏳ Generating PDF... Please wait');

            const routineData = JSON.parse(localStorage.getItem('myCustomRoutine'));
            if (!routineData) {
                showToast('⚠️ No routine data found to print!');
                return;
            }

            const pdfContainer = document.createElement('div');
            pdfContainer.style.padding = '20px';
            pdfContainer.style.fontFamily = 'Arial, sans-serif';
            pdfContainer.style.color = '#111';
            pdfContainer.style.background = '#fff';

            let html = `
                <div style="text-align: center; margin-bottom: 15px;">
                    <h2 style="color: #111; margin: 0; text-transform: uppercase; letter-spacing: 1px;">VU Custom Routine</h2>
                    <p style="color: #555; margin-top: 5px; font-size: 11px;">Generated on ${new Date().toLocaleDateString()}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            `;

            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            let hasClasses = false;

            days.forEach(day => {
                const classes = routineData[day] || [];
                if (classes.length > 0) {
                    hasClasses = true;
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
                                <td style="padding: 5px 8px; border: 1px solid #ccc;">${cls.teacher}</td>
                            </tr>
                        `;
                    });
                }
            });

            html += `</table>`;
            
            if (!hasClasses) {
                showToast('⚠️ Your routine is empty!');
                return;
            }

            pdfContainer.innerHTML = html;

            const opt = {
                margin:       0.25, 
                filename:     'My_VU_Routine.pdf',
                image:        { type: 'jpeg', quality: 1 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(pdfContainer).save().then(() => {
                showToast('✅ PDF Downloaded Successfully!');
            }).catch(err => {
                console.error("PDF Error: ", err);
                showToast('❌ Failed to generate PDF.');
            });
        });
    }

    // ==========================================
    // Custom Routine Builder & Import Logic
    // ==========================================
    const dayTabs = document.querySelectorAll('.day-tab');
    const container = document.getElementById('custom-routine-container');
    const addBtn = document.getElementById('add-class-btn');
    const addModal = document.getElementById('add-class-modal');
    const importModal = document.getElementById('import-modal');
    const customOverlay = document.getElementById('custom-overlay');
    
    let currentDay = 'Sunday';
    let customRoutine = JSON.parse(localStorage.getItem('myCustomRoutine')) || {
        "Sunday": [], "Monday": [], "Tuesday": [], "Wednesday": [], 
        "Thursday": [], "Friday": [], "Saturday": []
    };

    function closeAllModals() {
        if(addModal) addModal.classList.remove('show');
        if(importModal) importModal.classList.remove('show');
        if(customOverlay) {
            customOverlay.style.opacity = '0';
            setTimeout(() => customOverlay.style.visibility = 'hidden', 300);
        }
    }
    if(customOverlay) customOverlay.addEventListener('click', closeAllModals);

    // --- IMPORT ROUTINE ---
    const menuImport = document.getElementById('menu-import');
    if(menuImport) {
        menuImport.addEventListener('click', () => {
            closeSidebar();
            if(importModal) importModal.classList.add('show');
            if(customOverlay) {
                customOverlay.style.visibility = 'visible';
                customOverlay.style.opacity = '1';
            }
        });
    }

    const cancelImportBtn = document.getElementById('cancel-import-btn');
    if(cancelImportBtn) cancelImportBtn.addEventListener('click', closeAllModals);

    const confirmImportBtn = document.getElementById('confirm-import-btn');
    if(confirmImportBtn) {
        confirmImportBtn.addEventListener('click', async () => {
            const sem = document.getElementById('import-sem').value;
            const sec = document.getElementById('import-sec').value;

            try {
                const response = await fetch('data/routine.json');
                const data = await response.json();

                if(data[sem] && data[sem][sec]) {
                    const importedData = data[sem][sec];
                    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    
                    days.forEach(day => {
                        customRoutine[day] = []; 
                        if(importedData[day] && Array.isArray(importedData[day])) {
                            importedData[day].forEach(cls => {
                                let sortMins = 0;
                                try {
                                    const startTimeStr = cls.time.split('-')[0].trim();
                                    const [time, period] = startTimeStr.split(' ');
                                    let [hours, minutes] = time.split(':').map(Number);
                                    if (hours === 12 && period === 'AM') hours = 0;
                                    if (hours !== 12 && period === 'PM') hours += 12;
                                    sortMins = (hours * 60) + minutes;
                                } catch(e) {
                                    sortMins = 0;
                                }

                                customRoutine[day].push({
                                    time: cls.time,
                                    sortValue: sortMins,
                                    course: cls.course,
                                    room: cls.room,
                                    teacher: cls.teacher || '-'
                                });
                            });
                        }
                    });

                    localStorage.setItem('myCustomRoutine', JSON.stringify(customRoutine));
                    renderClasses();
                    closeAllModals();
                    showToast('✅ Routine imported successfully!');
                } else {
                    showToast('⚠️ No routine data found for this semester and section.');
                }
            } catch(e) {
                console.error("Fetch Error:", e);
                showToast('❌ Error loading data. Ensure you are on Live Server.');
            }
        });
    }

    // --- ADD CLASS ---
    dayTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            dayTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentDay = e.target.getAttribute('data-day');
            renderClasses();
        });
    });

    if(addBtn) {
        addBtn.addEventListener('click', () => {
            if(addModal) addModal.classList.add('show');
            if(customOverlay) {
                customOverlay.style.visibility = 'visible';
                customOverlay.style.opacity = '1';
            }
            
            document.getElementById('start-time').value = '';
            document.getElementById('end-time').value = '';
            document.getElementById('course-name').value = '';
            document.getElementById('room-num').value = '';
            document.getElementById('teacher-name').value = '';
        });
    }

    const cancelAddBtn = document.getElementById('cancel-add-btn');
    if(cancelAddBtn) cancelAddBtn.addEventListener('click', closeAllModals);

    function formatTime(time24) {
        let [hours, minutes] = time24.split(':');
        hours = parseInt(hours);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    }

    function getMinutes(time24) {
        let [hours, minutes] = time24.split(':').map(Number);
        return (hours * 60) + minutes;
    }

    const saveBtn = document.getElementById('save-class-btn');
    if(saveBtn) {
        saveBtn.addEventListener('click', () => {
            const startTime = document.getElementById('start-time').value;
            const endTime = document.getElementById('end-time').value;
            const course = document.getElementById('course-name').value.trim();
            const room = document.getElementById('room-num').value.trim();
            const teacher = document.getElementById('teacher-name').value.trim() || '-';

            if (!startTime || !endTime || !course || !room) {
                showToast("⚠️ Please fill out all required fields.");
                return;
            }

            const newClass = {
                time: `${formatTime(startTime)} - ${formatTime(endTime)}`,
                sortValue: getMinutes(startTime),
                course: course,
                room: room,
                teacher: teacher
            };

            customRoutine[currentDay].push(newClass);
            customRoutine[currentDay].sort((a, b) => a.sortValue - b.sortValue); 
            localStorage.setItem('myCustomRoutine', JSON.stringify(customRoutine));
            
            closeAllModals();
            renderClasses();
            showToast('✅ Class added successfully!');
        });
    }

    // --- RENDER CLASSES ---
    function renderClasses() {
        if(!container) return;
        container.innerHTML = '';
        const classes = customRoutine[currentDay] || [];

        if (classes.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No classes added for this day yet.</p>';
            return;
        }

        classes.forEach((cls, index) => {
            const card = document.createElement('div');
            card.className = 'routine-card';
            card.style.position = 'relative';

            card.innerHTML = `
                <button class="delete-btn" onclick="deleteClass('${currentDay}', ${index})" title="Delete Class">🗑️</button>
                <span class="time-slot">⏰ ${cls.time}</span>
                <div class="course-title">${cls.course}</div>
                <div class="card-details">
                    <p>👨‍🏫 Teacher: ${cls.teacher}</p>
                    <p>🚪 Room: ${cls.room}</p>
                </div>
            `;
            container.appendChild(card);
        });
    }

    window.deleteClass = function(day, index) {
        customRoutine[day].splice(index, 1);
        localStorage.setItem('myCustomRoutine', JSON.stringify(customRoutine));
        renderClasses();
        showToast('🗑️ Class deleted successfully!');
    };

    // Initial load
    renderClasses();
});