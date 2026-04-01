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
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    let renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    camera.position.z = 8;

    let particles = new THREE.Group();
    let particleMaterial = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.25 });
    for (let i = 0; i < 80; i++) {
        let geo = new THREE.SphereGeometry(Math.random() * 0.18 + 0.08, 12, 12);
        let mesh = new THREE.Mesh(geo, particleMaterial.clone());
        mesh.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8);
        particles.add(mesh);
    }
    scene.add(particles);
}
