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
    document.querySelectorAll('section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
}