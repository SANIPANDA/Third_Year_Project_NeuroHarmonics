function show(sectionId) {
    // Hide all sections
    document.querySelectorAll('main section').forEach(sec => {
        sec.classList.remove('active');
    });
    // Show the selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update sidebar button styles
    document.querySelectorAll('aside button').forEach(btn => {
        btn.classList.remove('btn-active');
    });
    event.currentTarget.classList.add('btn-active');
}

// 3D Visualization for Dashboard
const container = document.getElementById('three-performance-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
// (Insert the Three.js animate logic here to visualize server load)

async function loginAsAdmin() {
    const username = prompt("Enter Admin Username:");
    const password = prompt("Enter Admin Password:");

    const response = await fetch('/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    if (result.success) {
        window.location.href = result.redirect;
    } else {
        alert("Access Denied: Admin not found.");
    }
}

// Function to save new AI recommendations
async function saveRecommendation() {
    const emotion = document.getElementById('emotion').value;
    const tipContent = document.getElementById('content').value;

    if (!tipContent) {
        alert("Please enter a tip before saving.");
        return;
    }

    const response = await fetch('/update-wellness-logic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            emotion: emotion,
            tip: tipContent
        })
    });

    const result = await response.json();
    if (result.success) {
        alert("Supabase Updated: Logic for " + emotion + " is now live.");
        document.getElementById('content').value = ''; // Clear textarea
    } else {
        alert("Error updating logic: " + result.message);
    }
}

// Function to handle tab switching (if you add tabs later)
function showSection(sectionId) {
    // Your existing logic to show sections...
    
    // Add this to close the sidebar after selection
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth < 1100) { // Only auto-close on smaller screens if desired
        sidebar.classList.remove('active');
        document.querySelector('.menu-toggle i').className = 'fas fa-bars';
    }
}

// Function to open the modal and set the context
function replyTo(msgId) {
    const modal = document.getElementById('replyModal');
    const msgIdInput = document.getElementById('replyMsgId'); // Line 87 target
    const replyTextarea = document.getElementById('adminReplyText');

    // Safety Check: If any element is missing, stop and show a clear error
    if (!modal || !msgIdInput || !replyTextarea) {
        console.error("Missing Elements:", { modal, msgIdInput, replyTextarea });
        alert("System Error: Modal elements are missing from the page.");
        return;
    }

    // Now it's safe to set the value
    msgIdInput.value = msgId;
    replyTextarea.value = ""; // Clear old text
    
    modal.style.display = "flex";
    replyTextarea.focus();
}


// Function to close the modal
function closeModal() {
    document.getElementById('replyModal').style.display = "none";
}

// Function to send the reply to the database
async function submitReply() {
    const msgId = document.getElementById('replyMsgId').value;
    const replyText = document.getElementById('adminReplyText').value;
    const btn = document.getElementById('sendReplyBtn');

    if (!replyText.trim()) {
        alert("Please type a message before sending.");
        return;
    }

    // UI Feedback
    btn.disabled = true;
    btn.innerText = "Sending...";

    try {
        const response = await fetch('/admin/reply-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: msgId,
                reply: replyText
            })
        });

        const result = await response.json();

        if (result.success) {
            alert("Reply sent successfully!");
            closeModal();
            // Optional: Refresh page or remove the log item from UI
            location.reload(); 
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        console.error("Reply Error:", error);
        alert("Failed to reach server.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Send Message";
    }
}