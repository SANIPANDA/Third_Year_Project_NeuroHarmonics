console.log("Dashboard JS Loaded");

// Reference to your main background music element
const bgMusic = document.getElementById('bg-music-player');

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
        const response = await fetch("http://127.0.0.1:5000/predict_eeg", { 
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

eegFileInput = document.getElementById('eegFile');
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
eegDropArea = document.getElementById('eeg-drop-area');
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
    const graphImg = document.getElementById("eeg-graph-display"); 

    if (!fileInput.files.length) {
        alert("Please select an EEG file (CSV, EDF, or TXT) first.");
        return;
    }

    // Capture the file object to get the name
    const selectedFile = fileInput.files[0];

    const formData = new FormData();
    formData.append("file", selectedFile);

    // UI Feedback
    resultBox.innerHTML = "🔍 <span style='color:#a855f7;'>Analyzing Brainwaves... Please wait.</span>";
    recSection.style.display = "none";

    try {
        // 1. Get Prediction from ML Model
        const response = await fetch("http://127.0.0.1:5000/predict_eeg", { 
            method: "POST", 
            body: formData 
        });
        
        const data = await response.json();

        if (data.error) {
            resultBox.innerHTML = `<span style="color:red">Error: ${data.error}</span>`;
        } else {
            // 2. Show Emotion Result
            resultBox.innerHTML = `State: <b style="color:#4f46e5">${data.emotion}</b> (${data.confidence} confidence)`;
            
            // 3. Display Graph
            if (data.graph) {
                const graphImg = document.getElementById("eeg-graph-display");
                if (graphImg) {
                    // Essential: Add the data prefix so the browser recognizes it as an image
                    graphImg.src = "data:image/png;base64," + data.graph;
                    
                    // Essential: Overwrite "display: none" from your CSS
                    graphImg.style.display = "block"; 
                    graphImg.style.visibility = "visible";
                    graphImg.style.opacity = "1";
                    
                    console.log("Graph rendered successfully.");
                }
            }

            // 4. Show AI Recommendation
            recText.innerText = `${data.recommendation.name}: ${data.recommendation.benefit}`;
            recMusic.innerHTML = `🎵 Suggested Sound: <b>${data.recommendation.keyword || 'Ambient Flow'}</b>`;
            recSection.style.display = "block";

            // --- STEP 5: Save to Supabase via Backend ---
            try {
                const saveResponse = await fetch("/api/save_eeg_result", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: typeof currentUserId !== 'undefined' ? currentUserId : null,
                        filename: selectedFile.name, // Explicitly sending the filename
                        emotion: data.emotion,
                        confidence: data.confidence,
                        dominant_wave: data.wave || "N/A", // Added based on your schema
                        recommendation_name: data.recommendation.name,
                        recommendation_benefit: data.recommendation.benefit,
                        graph: data.graph // Sending base64 for graph_base64 column
                    })
                });

                if (saveResponse.ok) {
                    console.log("✅ EEG Report saved to Supabase successfully.");
                } else {
                    const errorDetails = await saveResponse.json();
                    console.error("❌ DB Save Error:", errorDetails.error);
                }
            } catch (saveError) {
                console.error("❌ Network error during DB save:", saveError);
            }
            // --------------------------------------------

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
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

function initRealtimeInbox() {
    const statusEl = document.getElementById('connection-status');

    const channel = supabaseClient
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

async function fetchMonthlyReports(year, month) {
    try {
        // 1. Create the date object first (using current date if not provided)
        const date = new Date(year, month); 

        // 2. Now you can safely use the 'date' variable
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthStr = `${year}-${month}`;

        // 3. Perform the fetch
        const response = await fetch(`/api/get_reports?month=${monthStr}`);
        const reports = await response.json();
        
        // ... rest of your calendar logic
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Grab the elements by their correct IDs from your HTML
    const dropArea = document.getElementById('eeg-drop-area');
    const fileInput = document.getElementById('eegFile');

    // 2. Check if they exist to avoid the "null" error
    if (dropArea && fileInput) {
        // 3. Add the click listener to the container
        dropArea.addEventListener('click', () => {
            fileInput.click();
        });
    }
});

// Global state for navigation
let navDate = new Date(); 

async function renderCalendar() {
    const grid = document.getElementById("calendarGrid");
    const monthDisplay = document.getElementById("monthDisplay");
    
    // 1. Setup Dates
    year = navDate.getFullYear();
    month = navDate.getMonth();
    
    // Display Month Name and Year
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(navDate);
    monthDisplay.innerText = `${monthName} ${year}`;

    // 2. Calculate Grid
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();
    
    grid.innerHTML = ""; // Clear current view

    // 3. Fetch Data for this specific Month from Supabase
    // Format: YYYY-MM
    const monthQuery = `${year}-${String(month + 1).padStart(2, '0')}`;
    const reports = await fetchReportsForMonth(monthQuery);

    // 4. Create Day Squares
    // Previous Month's trailing days (faded)
    for (let x = firstDayIndex; x > 0; x--) {
        grid.innerHTML += `<div class="day prev-date">${prevLastDay - x + 1}</div>`;
    }

    // Current Month's days
    for (let i = 1; i <= lastDay; i++) {
        const fullDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // Filter reports that match this day
        const dayData = reports.filter(r => String(r.created_at).startsWith(fullDateStr));
        
        // Determine Mood color class
        let moodClass = "";
        if (dayData.length > 0) {
            moodClass = `mood-${dayData[0].emotion_detected.toLowerCase()}`;
        }

        const daySquare = document.createElement('div');
        daySquare.className = `day ${moodClass} ${isToday(i, month, year) ? 'today' : ''}`;
        daySquare.innerHTML = `<span>${i}</span>`;
        
        // Click event to open the Detailed Analysis Popup
        daySquare.onclick = () => openAnalysisModal(dayData, fullDateStr);
        grid.appendChild(daySquare);
    }
}

// Helper: Navigation Buttons
document.getElementById('prevMonth').addEventListener('click', () => {
    navDate.setMonth(navDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    navDate.setMonth(navDate.getMonth() + 1);
    renderCalendar();
});


// Helper: Fetch from Backend
async function fetchReportsForMonth(monthStr) {
    try {
        const response = await fetch(`/api/get_reports?month=${monthStr}`);
        return await response.json();
    } catch (e) {
        console.error("Calendar fetch error:", e);
        return [];
    }
}

function isToday(day, month, year) {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
}

// Initialize on load
// This ensures the calendar renders as soon as the dashboard loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard loaded, initializing calendar...");
    renderCalendar(); 
});

// Make sure this is NOT inside renderCalendar()
function openAnalysisModal(reports, date) {
    const modal = document.getElementById("analysisModal");
    const body = document.getElementById("modalBody");
    
    if (!modal || !body) return;

    modal.style.display = "flex";
    modal.style.opacity = "1";

    if (!reports || reports.length === 0) {
        body.innerHTML = `<div class="no-data">No neural data recorded for ${date}.</div>`;
        return;
    }

    body.innerHTML = reports.map(r => `
        <div class="report-entry glass">
            <h4>File: ${r.filename}</h4>
            <div class="report-stats">
                <p>🧠 <b>Mood:</b> ${r.emotion_detected}</p>
                <p>📉 <b>Confidence:</b> ${r.confidence}</p>
                <p>🌊 <b>Wave:</b> ${r.dominant_wave}</p>
            </div>
            <img src="data:image/png;base64,${r.graph_base64}" class="modal-graph-img">
            <p class="rec-note"><b>AI Suggestion:</b> ${r.recommendation_name}</p>
        </div>
        <hr class="modal-divider">
    `).join("");
}

function closeModal() {
    document.getElementById("analysisModal").style.display = "none";
}

async function triggerAiGen() {
    const container = document.getElementById('ai-cards-container');
    const currentEmotion = document.getElementById('eeg-emotion-result').innerText || "Calm";
    
    container.innerHTML = '<div class="glass-card">✨ Gemini is crafting your neural wellness plan...</div>';

    try {
        const response = await fetch('/generate_ai_recommendation', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ emotion: currentEmotion, wave: "Alpha" })
        });

        const result = await response.json();
        if (result.success) {
            loadRecommendations(); // Refresh the list
        }
    } catch (err) {
        console.error("AI Generation failed:", err);
    }
}

async function loadRecommendations() {
    const container = document.getElementById('ai-cards-container');
    const { data, error } = await supabaseClient
        .from('recommendation')
        .select('*')
        .order('id', { ascending: false });

    if (data) {
        container.innerHTML = data.map(rec => `
            <div class="glass-card" style="padding:0; overflow:hidden;">
                <img src="${rec.image_url || 'https://via.placeholder.com/300x150'}" style="width:100%; height:150px; object-fit:cover;">
                <div style="padding:15px;">
                    <span class="badge" style="background:#a855f7; font-size:0.7em;">${rec.emotion}</span>
                    <p style="margin-top:10px; font-size:0.9em;">${rec.content}</p>
                </div>
            </div>
        `).join('');
    }
}

// Example of how the JS will inject the content
function createCardHTML(rec) {
    return `
        <div class="ai-card glass">
            <img src="${rec.image_url}" class="ai-card-image" alt="Neural Wellness Vision">
            <div class="ai-card-body">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <span class="emotion-tag">${rec.emotion}</span>
                    <small style="color:#888;"><i class="far fa-calendar-alt"></i> ${new Date().toLocaleDateString()}</small>
                </div>
                <p style="color: #333; line-height: 1.6; font-size: 0.95rem; margin-bottom: 20px;">
                    ${rec.content}
                </p>
                <div style="display: flex; gap: 10px;">
                    <button class="action-btn" style="padding: 8px 15px; font-size: 0.8rem; background: #4f46e5;">
                        <i class="fas fa-play"></i> Suggested Track
                    </button>
                </div>
            </div>
        </div>
    `;
}

// --- AI RECOMMENDATION SYSTEM ---

let recIndex = 0;
let allRecommendations = [];

window.generateNewAIRecommendation = async function() {
    const btn = document.getElementById('gen-rec-btn');
    const quoteEl = document.getElementById('ai-quote');
    const imageEl = document.getElementById('ai-image');
    
    const audio1 = document.getElementById('ai-music-1');
    const audio2 = document.getElementById('ai-music-2');
    
    const taskContainer = document.getElementById('ai-tasks');
    const emotionTag = document.getElementById('emotion-tag');

    if (window.musicPlayer) {
        console.log("Pausing background music...");
        window.musicPlayer.pauseForOtherMusic();
    }

    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing EEG...';
    }

    try {
        const response = await fetch('/generate_ai_recommendation', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        
        if (result.success) {
            // 1. Update Quote
            if(quoteEl) quoteEl.innerText = `"${result.quote}"`;

            // 2. Updated Thumbnail Logic
            if (result.track1 && result.track1.thumb && imageEl) {
                imageEl.src = result.track1.thumb;
                imageEl.style.display = 'block';
                imageEl.style.opacity = '1'; // Ensure it fades in/shows up
            }
            
            if(emotionTag) {
                emotionTag.innerText = `STATE: ${result.emotion.toUpperCase()}`;
            }

            // 3. Load both tracks from the result object
            if (audio1 && result.track1) {
                audio1.src = result.track1.music;
                audio1.load(); 
            }

            if (audio2 && result.track2) {
                audio2.src = result.track2.music;
                audio2.load();
            }

            // 4. Prevent Overlap & Resume Background
            const resumeBG = () => {
                if (window.musicPlayer) {
                    window.musicPlayer.resumeAfterOtherMusic();
                }
            };

            if (audio1 && audio2) {
                audio1.onplay = () => audio2.pause();
                audio2.onplay = () => audio1.pause();
                
                audio1.onended = resumeBG;
                audio2.onended = resumeBG;
            }

            // 5. Update Task List
            if(taskContainer) {
                taskContainer.innerHTML = result.tasks.map((task, index) => `
                    <div class="task-item" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; border-left: 4px solid #9d4edd;">
                        <div style="font-size: 0.7rem; color: #9d4edd; font-weight: 800; margin-bottom: 5px;">STEP 0${index + 1}</div>
                        <div style="color: #e0aaff; font-size: 0.95rem;">${task}</div>
                    </div>
                `).join('');
            }

            if (typeof window.loadRecommendations === "function") {
                await window.loadRecommendations(); 
            }

        } else {
            alert(result.error || "Generation failed");
        }
    } catch (error) {
        console.error("Wellness Hub Error:", error);
        alert("Connection error. Check Flask console.");
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Recommendations';
        }
    }
};

window.loadRecommendations = async function() {
    const container = document.getElementById('ai-rec-container');
    
    const { data, error } = await supabaseClient
        .from('recommendation')
        .select('*')
        .order('id', { ascending: false });

    if (data && data.length > 0) {
        allRecommendations = data;
        recIndex = 0; // Show the latest one
        updateCarouselUI();
    }
};

window.moveCarousel = function(direction) {
    recIndex += direction;
    // Loop around logic
    if (recIndex < 0) recIndex = allRecommendations.length - 1;
    if (recIndex >= allRecommendations.length) recIndex = 0;
    
    updateCarouselUI();
};

function updateCarouselUI() {
    // 1. Get references to the specific grid elements
    const quoteEl = document.getElementById('ai-quote');
    const imageEl = document.getElementById('ai-image');
    const audio1 = document.getElementById('ai-music-1');
    const audio2 = document.getElementById('ai-music-2');
    const taskEl = document.getElementById('ai-tasks');
    const emotionTag = document.getElementById('emotion-tag');

    // 2. Safety Check: If the section is hidden/missing, don't crash
    if (!quoteEl || !taskEl) return;

    // 3. Get the current recommendation from your global array
    const rec = allRecommendations[recIndex];
    if (!rec) return;

    // 4. Update the Text and Media
    quoteEl.innerText = `"${rec.quote || rec.content}"`;
    
    if (rec.image_url) {
        imageEl.src = rec.image_url;
        imageEl.style.display = 'block';
    }

    if (emotionTag) {
        emotionTag.innerText = `STATE: ${rec.emotion.toUpperCase()}`;
    }

    // 5. Update Audio
    if (rec.music_url) {
        audio1.src = rec.music_url;
        audio1.load();
    }

    if (rec.music_url_2 && audio2) {
        audio2.src = rec.music_url_2;
        audio2.load();
    }

    // 6. Update Tasks (The Grid inside the Card)
    // We target 'ai-tasks' which exists in your HTML
    taskEl.innerHTML = (rec.tasks || []).map((task, index) => `
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; border-left: 4px solid #9d4edd;">
            <div style="font-size: 0.7rem; color: #9d4edd; font-weight: 800; margin-bottom: 5px;">TASK 0${index + 1}</div>
            <div style="color: #e0aaff; font-size: 0.95rem;">${task}</div>
        </div>
    `).join('');
}


document.addEventListener('DOMContentLoaded', () => {
    window.loadRecommendations();
});

console.log("js ended");

// Games launcher
function launchGame(gameId) {
    const endpoint = `/play_${gameId.replace('-', '_')}`;
    fetch(endpoint)
        .then(response => {
            if (response.ok) {
                console.log(`${gameId} launched successfully`);
            } else {
                console.error(`Failed to launch ${gameId}`);
            }
        })
        .catch(err => {
            console.error('Game launch error:', err);
        });
}
