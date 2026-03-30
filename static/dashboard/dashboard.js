console.log("Dashboard JS Loaded");
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

// Run on page load
document.addEventListener('DOMContentLoaded', initRealtimeInbox);

async function sendSupportMessage(event) {
    event.preventDefault();

    const btn = document.getElementById('submitBtn');
    const btnText = btn?.querySelector('.btn-text'); // Added ?.
    const loader = btn?.querySelector('.loader');   // Added ?.
    const responseDiv = document.getElementById('formResponse');

    // UI Feedback: Loading (Now safe from null errors)
    if (btn) btn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (loader) loader.style.display = 'inline-block';

    const subjectEl = document.getElementById('supportSubject');
    const messageEl = document.getElementById('supportMessage');

    if (!subjectEl || !messageEl) {
        console.error("Input fields missing");
        return;
    }

    const formData = {
        subject: subjectEl.value,
        message: messageEl.value
    };

    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            if (responseDiv) {
                responseDiv.style.color = "#2ecc71";
                responseDiv.innerText = "Message sent successfully!";
            }
            document.getElementById('supportForm').reset();
        } else {
            throw new Error(result.error || "Failed to send message");
        }
    } catch (error) {
        if (responseDiv) {
            responseDiv.style.color = "#e74c3c";
            responseDiv.innerText = "Error: " + error.message;
        }
    } finally {
        // UI Feedback: Reset
        if (btn) btn.disabled = false;
        if (btnText) btnText.style.display = 'inline-block';
        if (loader) loader.style.display = 'none';
    }
}

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
    // CHANGED: Key 'file' must match request.files['file'] in Python
    formData.append("file", fileInput.files[0]); 
    
    resultBox.innerText = "Processing Neural Waves...";

    try {
        // CHANGED: URL points to /predict to match your @app.route
        const response = await fetch("http://127.0.0.1:5000/predict", { 
            method: "POST", 
            body: formData 
        });
        
        // We expect a JSON response now for the dashboard
        const data = await response.json();
        
        if (data.error) {
            resultBox.innerText = "Error: " + data.error;
        } else {
            // Update the UI with the Emotion and the AI Recommendation
            resultBox.innerHTML = `
                <b style="color:var(--primary-color)">Detected: ${data.emotion}</b><br>
                <small>Dominant Wave: ${data.wave}</small><hr>
                <p>AI Rec: ${data.recommendation.name}</p>
            `;
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        resultBox.innerText = "Server connection failed.";
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

async function submitFeedback(event) {
    event.preventDefault(); // Prevents page reload
    
    const form = event.target;
    const formData = new FormData(form);

    // 1. Get the submit button to show loading state
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Sending...";
    submitBtn.disabled = true;

    try {
        // 2. Send the data to your Flask route
        const response = await fetch('/submit-feedback', {
            method: 'POST',
            body: formData
        });

        // 3. Parse the JSON response
        const result = await response.json();

        if (result.success) {
            alert("Thank you! Feedback received successfully.");
            form.reset(); // Clears the form
        } else {
            alert("Error: " + (result.error || "Something went wrong."));
        }
    } catch (error) {
        console.error("Submission error:", error);
        alert("Failed to connect to the server. Please try again.");
    } finally {
        // 4. Reset the button state
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

// Function to update the UI label when a file is picked
function updateFileLabel() {
    const input = document.getElementById('eegFile');
    const status = document.getElementById('file-status');
    if (input.files.length > 0) {
        status.innerHTML = `<i class="fas fa-file-csv"></i> Selected: <b>${input.files[0].name}</b>`;
    }
}

const eegFileInput = document.getElementById('eegFile');
const fileStatus = document.getElementById('file-status');
const fileNameDisplay = document.getElementById('file-name-display');

// Function to update the UI when a file is picked
function handleFileChange(file) {
    if (file) {
        const extension = file.name.split('.').pop().toLowerCase();
        const allowed = ['csv', 'edf', 'txt'];

        if (allowed.includes(extension)) {
            // Update the UI to show the file is selected
            fileStatus.innerHTML = `<i class="fas fa-file-csv" style="color:#4f46e5; font-size:2rem;"></i><br>
                                    <span style="color:#4f46e5;">${file.name}</span>`;
            console.log("File selected successfully:", file.name);
        } else {
            alert("Please upload a valid .csv, .edf, or .txt file.");
            eegFileInput.value = ""; // Reset if invalid
        }
    }
}

// Listen for the standard click/select
eegFileInput.addEventListener('change', (e) => {
    handleFileChange(e.target.files[0]);
});

// Update your existing Drag & Drop 'drop' listener to use this function too
const eegDropArea = document.getElementById('eeg-drop-area');
eegDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    eegDropArea.classList.remove('drag-over');
    
    const droppedFile = e.dataTransfer.files[0];
    // This part is critical: it attaches the dropped file to the hidden input
    eegFileInput.files = e.dataTransfer.files; 
    handleFileChange(droppedFile);
});

async function analyzeEEGFile() {
    const fileInput = document.getElementById("eegFile");
    const resultBox = document.getElementById("eeg-emotion-result");
    const recSection = document.getElementById("ai-wellness-recommendation");
    const recText = document.getElementById("rec-text");
    const recMusic = document.getElementById("rec-music");
    
    // Add an ID to your image tag in HTML to show the graph
    const graphImg = document.getElementById("eeg-graph-display"); 

    if (!fileInput.files.length) {
        alert("Please select an EEG file (CSV, EDF, or TXT) first.");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    // UI Feedback: Show analyzing state
    resultBox.innerHTML = "🔍 <span style='color:#a855f7;'>Analyzing Brainwaves... Please wait.</span>";
    recSection.style.display = "none";

    try {
        const response = await fetch("/predict", { 
            method: "POST", 
            body: formData 
        });
        
        const data = await response.json();

        if (data.error) {
            resultBox.innerHTML = `<span style="color:red">Error: ${data.error}</span>`;
        } else {
            // 1. Show Emotion Result and Confidence
            resultBox.innerHTML = `State: <b style="color:#4f46e5">${data.emotion}</b> (${data.confidence} confidence)`;
            
            // 2. Display the Matplotlib Bar Graph
            if (graphImg && data.graph) {
                graphImg.src = "data:image/png;base64," + data.graph;
                graphImg.style.display = "block";
            }

            // 3. Show AI Recommendation (Exercise + Music)
            recText.innerText = `${data.recommendation.name}: ${data.recommendation.benefit}`;
            
            // Note: If your Python Gemini function returns 'keyword', we use it here
            recMusic.innerHTML = `🎵 Suggested Sound: <b>${data.recommendation.keyword || 'Ambient Flow'}</b>`;
            
            // 4. Reveal the recommendation section
            recSection.style.display = "block";
            
            // Trigger music player if you have one
            if(typeof playSuggestedMusic === "function") {
                playSuggestedMusic(data.recommendation.keyword);
            }
        }
    } catch (error) {
        resultBox.innerHTML = "<span style='color:red;'>❌ Connection failed. Ensure Flask is running.</span>";
        console.error("Error:", error);
    }
}

function resetEEGDisplay() {
    document.getElementById("eegFile").value = "";
    document.getElementById("eeg-emotion-result").innerText = "";
    document.getElementById("ai-wellness-recommendation").style.display = "none";
    document.getElementById("file-status").innerHTML = `<i class="fas fa-upload"></i> Drag & drop EEG file here<br>or click to select (.csv, .edf, .txt)`;
}

// Initialize Supabase Client (Ensure these vars are available)
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function initRealtimeInbox() {
    const statusEl = document.getElementById('connection-status');

    const channel = supabase
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'contact_message'
            },
            (payload) => {
                const updatedMsg = payload.new;
                
                // Find the specific message group in the DOM
                const slot = document.querySelector(`[data-id="${updatedMsg.id}"] .admin-reply-slot`);
                
                if (slot && updatedMsg.admin_reply) {
                    slot.innerHTML = `
                        <div class="message admin slide-in">
                            <div class="bubble">
                                <small>Support Team</small>
                                <p>${updatedMsg.admin_reply}</p>
                            </div>
                        </div>
                    `;
                    // Optional: Play a subtle notification sound here
                }
            }
        )
        .subscribe((status) => {
            const statusEl = document.getElementById('connection-status');
            const dot = statusEl.querySelector('.status-dot');
            if (status === 'SUBSCRIBED') {
                statusEl.innerHTML = '<i class="fas fa-circle status-dot" style="color: #2ecc71"></i> Live Sync Active';
            }
        });
}

// dashboard.js

async function fetchAdminMessages() {
    const container = document.getElementById('message-container');
    const refreshBtn = document.getElementById('refreshInbox');
    const icon = refreshBtn?.querySelector('i');

    // 1. UI Feedback: Spin the refresh icon
    if (icon) icon.classList.add('fa-spin');
    
    try {
        // 2. Call the API route we created in app.py
        const response = await fetch('/api/get_inquiries');
        const data = await response.json();

        if (data.success) {
            // 3. Clear current messages
            container.innerHTML = "";

            if (data.inquiries.length === 0) {
                container.innerHTML = `
                    <div class="empty-inbox">
                        <i class="fas fa-comment-slash"></i>
                        <p>No neural inquiries yet.</p>
                    </div>`;
                return;
            }

            // 4. Loop through and build the HTML for each message
            data.inquiries.forEach(msg => {
                const chatGroup = document.createElement('div');
                chatGroup.className = 'chat-group';
                chatGroup.setAttribute('data-id', msg.id);

                // Build the Admin Reply HTML or the Pending state
                const adminReplyHTML = msg.admin_reply 
                    ? `<div class="message admin slide-in">
                            <div class="bubble admin-bubble">
                                <small><i class="fas fa-robot"></i> Neuro-Support</small>
                                <p>${msg.admin_reply}</p>
                            </div>
                       </div>`
                    : `<div class="message pending">
                            <div class="bubble pending-bubble">
                                <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span> 
                                Waiting for neural review
                            </div>
                       </div>`;

                chatGroup.innerHTML = `
                    <div class="message user">
                        <div class="bubble user-bubble">
                            <p>${msg.message}</p>
                            <span class="time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                    <div class="admin-reply-slot">
                        ${adminReplyHTML}
                    </div>
                `;
                container.appendChild(chatGroup);
            });
        }
    } catch (error) {
        console.error("Refresh Error:", error);
    } finally {
        // 5. Stop the spin icon after a short delay
        setTimeout(() => {
            if (icon) icon.classList.remove('fa-spin');
        }, 500);
    }
}