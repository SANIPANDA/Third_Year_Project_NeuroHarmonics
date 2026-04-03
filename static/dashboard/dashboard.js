// --- 1. CORE NAVIGATION & UI TOGGLES ---

document.addEventListener('DOMContentLoaded', () => {
    // This ensures the button is found only after the HTML is ready
    const menuToggle = document.querySelector('#menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Initialize the profile modal logic
    initProfileModal();
});

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const icon = document.querySelector('.menu-toggle i');
    if (!sidebar) return;

    sidebar.classList.toggle('active');
    
    // Switch between bars and X icon
    if (icon) {
        if (sidebar.classList.contains('active')) {
            icon.classList.replace('fa-bars', 'fa-times');
        } else {
            icon.classList.replace('fa-times', 'fa-bars');
        }
    }
}

function showSection(sectionId, el) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const target = document.getElementById(sectionId);
    if (target) target.style.display = 'block';

    // Update active tab styling
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    if (el) el.classList.add('active');
}

// --- 2. SETTINGS & PROFILE MANAGEMENT ---

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

function saveProfile(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation(); // Prevents clicking "through" the modal
    }

    const form = document.getElementById('profile-form');
    if (!form) return;

    const formData = new FormData(form);
    
    // Debug: Check if 'username' is actually caught
    console.log("Name being sent:", formData.get('username'));

    fetch('/update-profile', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closeSettingsModal();
            window.location.reload();
        } else {
            alert(data.error || 'Failed to update profile.');
        }
    })
    .catch(err => {
        console.error("Save error:", err);
        alert('Server error.');
    });
}

function initProfileModal() {
    const form = document.getElementById('profile-form');
    const photoInput = document.getElementById('profile-photo');
    const uploadBtn = document.querySelector('.upload-btn');
    const dropArea = document.getElementById('photo-drop-area');
    const previewImg = document.getElementById('preview-photo');

    if (form) {
        // Safe removal and addition
        form.removeEventListener('submit', saveProfile); 
        form.addEventListener('submit', saveProfile);
    }

    if (uploadBtn && photoInput) {
        uploadBtn.onclick = () => photoInput.click(); // Using .onclick avoids duplicate listeners
    }

    if (photoInput) {
        photoInput.onchange = (e) => handleFilePreview(e.target.files[0]);
    }

    // Drag and Drop (kept your good logic)
    if (dropArea && photoInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => e.preventDefault());
        });

        dropArea.addEventListener('dragover', () => dropArea.classList.add('drag-over'));
        dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));

        dropArea.addEventListener('drop', (e) => {
            dropArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                photoInput.files = dataTransfer.files;
                handleFilePreview(file);
            }
        });
    }

    function handleFilePreview(file) {
        if (!file || !previewImg) return;
        const reader = new FileReader();
        reader.onload = (ev) => { previewImg.src = ev.target.result; };
        reader.readAsDataURL(file);
    }
}
// --- 3. ANALYSIS & UTILITIES ---

async function analyzeData() {
    const fileInput = document.getElementById("eegFile");
    const resultBox = document.getElementById("result");
    if (!fileInput || !fileInput.files.length) {
        alert("Please upload an EEG file first");
        return;
    }

    const formData = new FormData();
    formData.append("eeg", fileInput.files[0]);
    resultBox.innerText = "Analyzing...";

    try {
        const response = await fetch("http://127.0.0.1:5000/analyze", { method: "POST", body: formData });
        const data = await response.json();
        if (data.error) resultBox.innerText = data.error;
        else resultBox.innerHTML = `<b style="color:green">${data.emotion} (${Math.round(data.confidence * 100)}%)</b>`;
    } catch (error) {
        resultBox.innerText = "Server error";
    }
}

function handleEEGFile() {
    const input = document.getElementById("eegFile");
    const fileNameEl = document.getElementById("file-name");
    if (!input || !input.files[0]) return;

    const file = input.files[0];
    const allowedTypes = ["edf", "csv", "txt"];
    const fileExt = file.name.split(".").pop().toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
        alert("Invalid file type!");
        input.value = "";
        return;
    }
    fileNameEl.innerText = "Selected: " + file.name;
}

function logout() {
    localStorage.removeItem("loggedIn");
    window.location.href = "/";
}

// --- 4. COMMUNITY & FEEDBACK ---

async function postToCommunity() {
    const input = document.getElementById("community-input");
    const chatBox = document.getElementById("chat-box");
    if (!input || !input.value.trim()) return;

    const content = input.value;
    try {
        const response = await fetch("/post-community", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: content })
        });

        if (response.ok) {
            const newMsg = document.createElement('div');
            newMsg.className = 'message';
            newMsg.innerHTML = `<span class="msg-user"><strong>You:</strong></span> <span class="msg-content">${content}</span>`;
            chatBox.appendChild(newMsg);
            chatBox.scrollTop = chatBox.scrollHeight;
            input.value = "";
        }
    } catch (error) { console.error("Chat error:", error); }
}

// --- 5. GAME LAUNCHER ---

async function launchGame(gameName) {
    console.log(`Launching game: ${gameName}`);
    try {
        const response = await fetch('/launch-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: gameName })
        });

        console.log(`Response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (gameName === 'space_invaders') {
                alert('🚀 Space Invaders launching!');
            } else {
                alert(`🎮 ${gameName.replace('_', ' ').toUpperCase()} requested! (Backend support coming)`);
            }
            console.log(`${gameName} success`);
        } else {
            alert(`Server: ${data.error || 'Launch failed'}`);
        }
    } catch (error) {
        console.error('Launch error:', error);
        if (gameName !== 'space_invaders') {
            alert(`${gameName.replace('_', ' ').toUpperCase()} support coming soon! Space Invaders ready.`);
        } else {
            alert('Launch failed. Ensure logged in & backend /launch-game works (test: cd games/space && python test_game_launch.py)');
        }
    }
}

