// 🔷 SECTION SWITCHING
function show(sectionId, event) {
    document.querySelectorAll('main section').forEach(sec => {
        sec.classList.remove('active');
    });

    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.sidebar button').forEach(btn => {
        btn.classList.remove('btn-active');
    });

    if (event) {
        event.currentTarget.classList.add('btn-active');
    }
}

// 🔷 THREE.JS DASHBOARD (SAFE LOAD)
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('three-performance-container');
    if (!container || typeof THREE === "undefined") return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x9d4edd });
    const cube = new THREE.Mesh(geometry, material);

    scene.add(cube);
    camera.position.z = 5;

    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }

    animate();
});

// 🔷 SAVE RECOMMENDATION LOGIC
async function saveRecommendation() {
    const emotion = document.getElementById('emotion').value;
    const tipContent = document.getElementById('content').value;

    if (!tipContent.trim()) {
        alert("Please enter a tip before saving.");
        return;
    }

    const response = await fetch('/update-wellness-logic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion, tip: tipContent })
    });

    const result = await response.json();

    if (result.success) {
        alert("Recommendation updated for " + emotion);
        document.getElementById('content').value = '';
    } else {
        alert("Error: " + result.message);
    }
}

// 🔴 REPORT USER
async function sendReport(userId) {
    const response = await fetch('/admin/report-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    });

    const result = await response.json();
    if (result.success) {
        alert("User reported successfully!");
    }
}

// 🟢 OPEN NOTIFY MODAL
function openNotifyModal(userId) {
    document.getElementById('notifyModal').style.display = "flex";
    document.getElementById('notifyUserId').value = userId;
    document.getElementById('notifyText').value = "";
}

// 🟢 CLOSE NOTIFY MODAL
function closeNotifyModal() {
    document.getElementById('notifyModal').style.display = "none";
}

// 🟢 SEND NOTIFICATION (SINGLE USER)
async function sendNotification() {
    const userId = document.getElementById('notifyUserId').value;
    const message = document.getElementById('notifyText').value;

    if (!message.trim()) {
        alert("Enter a message!");
        return;
    }

    const response = await fetch('/admin/notify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, message })
    });

    const result = await response.json();

    if (result.success) {
        alert("Notification sent!");
        closeNotifyModal();
    }
}

// 🟣 NOTIFY ALL USERS
async function notifyAll() {
    const message = document.getElementById('notifyText').value;

    if (!message.trim()) {
        alert("Enter a message!");
        return;
    }

    const response = await fetch('/admin/notify-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });

    const result = await response.json();

    if (result.success) {
        alert("Notification sent to all users!");
        closeNotifyModal();
    }
}

// 🔵 SEND RECOMMENDATION FROM EEG
async function sendRecommendation(userId, emotion) {
    const response = await fetch('/admin/send-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, emotion })
    });

    const result = await response.json();

    if (result.success) {
        alert("Recommendation sent!");
    } else {
        alert("Error: " + result.message);
    }
}

// 🔷 REPLY MODAL OPEN
function replyTo(msgId) {
    const modal = document.getElementById('replyModal');
    const msgIdInput = document.getElementById('replyMsgId');
    const replyTextarea = document.getElementById('adminReplyText');

    if (!modal || !msgIdInput || !replyTextarea) {
        alert("Modal error");
        return;
    }

    msgIdInput.value = msgId;
    replyTextarea.value = "";

    modal.style.display = "flex";
    replyTextarea.focus();
}

// 🔷 CLOSE REPLY MODAL
function closeModal() {
    document.getElementById('replyModal').style.display = "none";
}

// 🔷 SUBMIT REPLY
async function submitReply() {
    const msgId = document.getElementById('replyMsgId').value;
    const replyText = document.getElementById('adminReplyText').value;
    const btn = document.getElementById('sendReplyBtn');

    if (!replyText.trim()) {
        alert("Please type a message.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Sending...";

    try {
        const response = await fetch('/admin/reply-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: msgId, reply: replyText })
        });

        const result = await response.json();

        if (result.success) {
            alert("Reply sent!");
            closeModal();
            location.reload();
        } else {
            alert("Error: " + result.message);
        }
    } catch (err) {
        alert("Server error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Send Message";
    }
}

// 🔷 CLOSE MODALS ON OUTSIDE CLICK
window.onclick = function (e) {
    const replyModal = document.getElementById('replyModal');
    const notifyModal = document.getElementById('notifyModal');

    if (e.target === replyModal) replyModal.style.display = "none";
    if (e.target === notifyModal) notifyModal.style.display = "none";
};

// 🔷 LOGOUT
function logout() {
    fetch('/logout').then(() => {
        window.location.href = "/login";
    });
}

async function checkNotifications(userId) {
    const res = await fetch(`/get-notifications/${userId}`);
    const data = await res.json();

    if (data.length > 0) {
        let messageText = "";

        data.forEach(n => {
            messageText += "🔔 " + n.message + "\n\n";
        });

        alert(messageText); // 🔥 SIMPLE POPUP
    }
}

function showNotificationPopup(messages) {
    const box = document.createElement("div");
    box.className = "notification-popup";

    messages.forEach(msg => {
        const p = document.createElement("p");
        p.innerText = "🔔 " + msg;
        box.appendChild(p);
    });

    document.body.appendChild(box);

    setTimeout(() => box.remove(), 5000);
}