document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease-out';
        observer.observe(card);
    });
});

function playMusicCard(musicSrc, cardElement) {
    const audio = document.getElementById('recommendationAudio');
    const playBtnIcon = cardElement.querySelector('.play-btn i');
    
    // 1. STOP PERSISTENT BACKGROUND MUSIC
    // We use the API you already built in music_player.js
    if (window.musicPlayer) {
        window.musicPlayer.pauseForOtherMusic();
    }

    // 2. Check if the clicked song is ALREADY playing (Toggle off)
    if (audio.src === musicSrc && !audio.paused) {
        audio.pause();
        resetMusicIcons();
        
        // Optional: Resume background music if we stop the recommendation
        if (window.musicPlayer) window.musicPlayer.resumeAfterOtherMusic();
        return;
    }

    // 3. Reset recommendation icons and play new track
    resetMusicIcons();
    audio.src = musicSrc;
    audio.play();

    // 4. Update the icon to pause
    playBtnIcon.classList.remove('fa-play');
    playBtnIcon.classList.add('fa-pause');

    // 5. When the recommendation ends, bring back the background music
    audio.onended = function() {
        resetMusicIcons();
        if (window.musicPlayer) {
            window.musicPlayer.resumeAfterOtherMusic();
        }
    };
}

// Helper function to make sure all buttons show 'play'
function resetMusicIcons() {
    const allIcons = document.querySelectorAll('.play-btn i');
    allIcons.forEach(icon => {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
    });
}

    // Video modal logic
function playVideo(src, title) {
      document.getElementById('modalVideo').src = src;
      document.getElementById('modalTitle').innerText = title;
      document.getElementById('videoModal').style.display = 'block';
    }

function playYogaVideo(src, title) {
    const videoElement = document.getElementById('modalVideo');
    const modal = document.getElementById('videoModal');
    const audio = document.getElementById('recommendationAudio');

    // 1. Stop any music currently playing in the recommendations section
    if (audio) {
        audio.pause();
    }

    // 2. Find all music play buttons and reset their icons to 'play'
    // This ensures no 'pause' icon stays visible while the video is active
    const allMusicIcons = document.querySelectorAll('.play-btn i');
    allMusicIcons.forEach(icon => {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
    });

    // 3. Set up the video modal with the Cloudinary link
    videoElement.src = src;
    document.getElementById('modalTitle').innerText = title;
    
    // 4. Show the modal and start the video
    modal.style.display = 'block';
    videoElement.load(); // Forces the browser to load the new Cloudinary source
    videoElement.play();
}

function closeModal() {
      document.getElementById('videoModal').style.display = 'none';
      document.getElementById('modalVideo').pause();
      document.getElementById('modalVideo').src = '';
    }
    window.onclick = function(event) {
      var modal = document.getElementById('videoModal');
      if (event.target == modal) closeModal();
    }

    // Subtle Three.js animated background (particles)
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    let renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('threejs-bg').appendChild(renderer.domElement);
    camera.position.z = 8;
    // Create particles
    let particles = new THREE.Group();
    let particleMaterial = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.25 });
    for (let i = 0; i < 80; i++) {
      let geo = new THREE.SphereGeometry(Math.random() * 0.18 + 0.08, 12, 12);
      let mesh = new THREE.Mesh(geo, particleMaterial.clone());
      mesh.position.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 8
      );
      mesh.material.opacity = Math.random() * 0.18 + 0.08;
      particles.add(mesh);
    }
    scene.add(particles);
    function animate() {
      requestAnimationFrame(animate);
      particles.rotation.y += 0.0008;
      particles.rotation.x += 0.0003;
      renderer.render(scene, camera);
    }
    animate();
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

function initThreeJS(container) {

    // 🔥 Prevent crash if THREE is not loaded
    if (typeof THREE === "undefined") {
        console.warn("Three.js not loaded — skipping background animation");
        return;
    }

    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    let renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (container) {
        container.appendChild(renderer.domElement);
    }

    camera.position.z = 8;

    let particles = new THREE.Group();

    let particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.25
    });

    for (let i = 0; i < 80; i++) {
        let geo = new THREE.SphereGeometry(
            Math.random() * 0.18 + 0.08,
            12,
            12
        );

        let mesh = new THREE.Mesh(geo, particleMaterial.clone());

        mesh.position.set(
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 8
        );

        particles.add(mesh);
    }

    scene.add(particles);

    function animate() {
        requestAnimationFrame(animate);
        particles.rotation.y += 0.0008;
        particles.rotation.x += 0.0003;
        renderer.render(scene, camera);
    }

    animate();
}
// ===== AI VIDEO SYSTEM =====

function playVideo(src, title) {
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('modalVideo');
  const titleEl = document.getElementById('modalTitle');

  if (!modal || !video) return;

  video.src = src;
  titleEl.innerText = title;
  modal.style.display = 'block';
}

function closeModal() {
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('modalVideo');

  if (modal) modal.style.display = 'none';
  if (video) {
    video.pause();
    video.src = "";
  }
}

/* 🔥 AI VIDEO SYSTEM FIXED */
document.addEventListener("DOMContentLoaded", function () {

  console.log("AI VIDEO SCRIPT RUNNING"); // DEBUG

  const container = document.getElementById("aiVideoContainer");

  if (!container) {
    console.error("Container NOT FOUND");
    return;
  }

  const videos = [
  {
    url: "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774462195/Create_a_new_morning_routine_kluj7i.mp4",
    title: "Morning Reset",
    tip: "Start your day with a structured routine to stabilize your mind."
  },
  {
    url: "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461866/finding_goal_gi2kgp.mp4",
    title: "Find Your Purpose",
    tip: "Clarity in goals reduces anxiety and improves focus."
  },
  {
    url: "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461854/spending_time_happily_ayopl1.mp4",
    title: "Joyful Living",
    tip: "Spend time doing things that genuinely make you happy."
  },
  {
    url: "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461797/relaxed_time_pxuqkz.mp4",
    title: "Relaxation Time",
    tip: "Take breaks to recharge your brain and reduce stress."
  },
  {
    url: "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461762/promise_to_a_friend_nxzjyg.mp4",
    title: "Connection Matters",
    tip: "Strong social bonds improve emotional resilience."
  },
  {
    url: "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461733/happy_activities_gnkq6o.mp4",
    title: "Stay Active",
    tip: "Engaging in activities boosts dopamine naturally."
  },
  {
    url: "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461730/body_movements_fsymqg.mp4",
    title: "Move Your Body",
    tip: "Physical movement enhances mental clarity."
  }
];

  // Shuffle
  const shuffled = videos.sort(() => 0.5 - Math.random()).slice(0, 4);

    shuffled.forEach((v, i) => {
        const card = document.createElement("div");
        card.className = "video-card ai-card";

        card.innerHTML = `
    <div class="video-thumb-container">
      <video muted loop class="video-thumb">
        <source src="${v.url}" type="video/mp4">
      </video>
      <button class="play-btn" onclick="playVideo('${v.url}', '${v.title}')">
        <i class="fas fa-play"></i>
      </button>
    </div>

    <div class="video-title">${v.title}</div>

    <div class="video-tip">${v.tip}</div>
  `;

        container.appendChild(card);

        const vid = card.querySelector("video");

        card.addEventListener("mouseenter", () => vid.play());
        card.addEventListener("mouseleave", () => vid.pause());
    });

});