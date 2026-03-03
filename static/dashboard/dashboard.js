

function showSection(sectionId, el) {
    // 1. Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // 2. Show the selected section
    document.getElementById(sectionId).style.display = 'block';

    // 3. Update active button state
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    if (el) {
        el.classList.add('active');
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('open');
}

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
}

function saveProfile(event) {
    if (event) event.preventDefault();
    const form = document.getElementById('profile-form');
    if (!form) return;
    const formData = new FormData(form);

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
        .catch(() => alert('Server error.'));
}

function initProfileModal() {
    const form = document.getElementById('profile-form');
    const photoInput = document.getElementById('profile-photo');
    const uploadBtn = document.querySelector('.upload-btn');
    const dropArea = document.getElementById('photo-drop-area');

    if (form) {
        form.addEventListener('submit', saveProfile);
    }

    if (uploadBtn && photoInput) {
        uploadBtn.addEventListener('click', () => photoInput.click());
    }

    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (ev) {
                const img = document.getElementById('preview-photo');
                if (img) img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (dropArea && photoInput) {
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('drag-over');
        });
        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('drag-over');
        });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (!file) return;
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            photoInput.files = dataTransfer.files;
            const reader = new FileReader();
            reader.onload = function (ev) {
                const img = document.getElementById('preview-photo');
                if (img) img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
}

document.addEventListener('DOMContentLoaded', initProfileModal);



async function analyzeData() {
    const fileInput = document.getElementById("eegFile");
    const resultBox = document.getElementById("result");

    if (!fileInput.files.length) {
        alert("Please upload an EEG file first");
        return;
        }

const file = fileInput.files[0];

const formData = new FormData();
formData.append("eeg", file);

resultBox.innerText = "Analyzing...";

try {
    const response = await fetch("http://127.0.0.1:5000/analyze", {
    method: "POST",
    body: formData
    });

const data = await response.json();

if (data.error) {
    resultBox.innerText = data.error;
    return;
    }

resultBox.innerHTML =
`<b style="color:green">
${data.emotion} (${Math.round(data.confidence * 100)}%)
</b>`;

} catch (error) {
    console.error(error);
    resultBox.innerText = "Server error";
    }
}


function logout() {
    localStorage.removeItem("loggedIn");
    window.location.href = "/";
}


function handleEEGFile() {
    const input = document.getElementById("eegFile");
    const file = input.files[0];
    const fileNameEl = document.getElementById("file-name");

    if (!file) {
        fileNameEl.innerText = "";
        return;
        }

    const allowedTypes = ["edf", "csv", "txt"];
    const fileExt = file.name.split(".").pop().toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
        alert("Invalid file type! Only .edf, .csv, .txt allowed.");
        input.value = "";
        fileNameEl.innerText = "";
        return;
        }

fileNameEl.innerText = "Selected: " + file.name;
}

// --- NEW: Handle Feedback Submission ---
async function submitFeedback(event) {
    event.preventDefault(); // Stop the page from refreshing
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('.submit-btn');

    submitBtn.innerText = "Sending...";
    submitBtn.disabled = true;

    try {
        const response = await fetch("/submit-feedback", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            alert("Thank you for your feedback!");
            form.reset(); // Clear the form
        } else {
            alert("Failed to send feedback. Please try again.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Server error. Check your connection.");
    } finally {
        submitBtn.innerText = "Send Feedback";
        submitBtn.disabled = false;
    }
}

// --- NEW: Handle Support Message Submission ---
async function sendSupportMessage(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('.submit-btn');

    submitBtn.innerText = "Sending Message...";
    submitBtn.disabled = true;

    try {
        const response = await fetch("/send-message", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            alert("Message sent! Our team will get back to you soon.");
            form.reset();
        } else {
            alert("Failed to send message.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Connection error.");
    } finally {
        submitBtn.innerText = "Send Message";
        submitBtn.disabled = false;
    }
}

async function postToCommunity() {
    const input = document.getElementById("community-input");
    const chatBox = document.getElementById("chat-box");
    const content = input.value;

    if (!content.trim()) return;

    try {
        const response = await fetch("/post-community", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: content })
        });

        const data = await response.json();

        if (response.ok) {
            // OPTION A: Add the message to the screen immediately without reloading
            const newMsg = document.createElement('div');
            newMsg.className = 'message';
            newMsg.innerHTML = `
                <span class="msg-user"><strong>You:</strong></span>
                <span class="msg-content">${content}</span>
                <small class="msg-time">Just now</small>
            `;
            chatBox.appendChild(newMsg);
            
            // Auto-scroll to the bottom
            chatBox.scrollTop = chatBox.scrollHeight;
            
            input.value = ""; // Clear the input field
        }
    } catch (error) {
        console.error("Chat error:", error);
    }
}

function launchGame(gameName) {
    if (gameName === 'space_invaders') {
        fetch('/launch-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: 'space_invaders' })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Launching Space Invaders... Enjoy the game!');
            } else {
                alert('Error: ' + (data.error || 'Could not launch game'));
            }
        })
        .catch(error => {
            console.error('Error launching game:', error);
            alert('Error launching game. Please try again.');
        });
    }
}
