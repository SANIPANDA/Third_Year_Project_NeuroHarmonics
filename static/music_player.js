class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentTrack = null;
        this.pauseRequested = false;
        this.init();
    }

    init() {
        // Auto-play ambient track on load (fallback to click if needed)
        this.loadTrack('/static/music/ambient-loop.mp3'); // Replace with your track path
        this.play();

        // Resume on user interaction (iOS/Safari requirement)
        document.addEventListener('click', () => this.resumeIfNeeded(), { once: true });
        document.addEventListener('touchstart', () => this.resumeIfNeeded(), { once: true });

        // Handle visibility change (mobile tab switching)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isPlaying) {
                this.audio.play().catch(e => console.log('Resume failed:', e));
            }
        });

        // Track ended - loop
        this.audio.addEventListener('ended', () => {
            if (this.currentTrack && !this.pauseRequested) {
                this.audio.currentTime = 0;
                this.audio.play();
            }
        });

        // Pause/resume coordination
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.pauseRequested = false;
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
        });
    }

    // PUBLIC API for other scripts
    pauseForOtherMusic() {
        console.log('BG music paused for other track');
        this.pauseRequested = true;
        this.audio.pause();
    }

    resumeAfterOtherMusic() {
        console.log('BG music resuming after other track');
        if (!this.pauseRequested) return;
        this.pauseRequested = false;
        if (this.currentTrack) {
            this.audio.play().catch(e => console.log('Resume failed:', e));
        }
    }

    resumeIfNeeded() {
        if (this.currentTrack && !this.isPlaying) {
            this.audio.play().catch(e => console.log('Autoplay failed:', e));
        }
    }

    loadTrack(src) {
        this.currentTrack = src;
        this.audio.src = src;
        this.audio.loop = true;
        this.audio.volume = 0.3; // Low volume ambient
    }

    play() {
        this.audio.play().then(() => {
            this.isPlaying = true;
        }).catch(e => {
            console.log('Play blocked:', e);
        });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
    }

    setVolume(vol) {
        this.audio.volume = Math.max(0, Math.min(1, vol));
    }
}

// Global singleton
window.musicPlayer = new MusicPlayer();

// Expose controls for UI buttons
window.toggleMusicPanel = function() {
    if (!window.musicPlayer) return;
    
    const panel = document.getElementById('music-panel');
    if (panel) panel.classList.toggle('open');
    
    const btn = document.getElementById('playPauseBtn');
    if (btn) {
        if (window.musicPlayer.isPlaying) {
            window.musicPlayer.pause();
            btn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            window.musicPlayer.play();
            btn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }
};

// Handle page visibility for mobile
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && window.musicPlayer && window.musicPlayer.currentTrack) {
        window.musicPlayer.audio.play().catch(() => {});
    }
});

// Auto-resume on any user gesture
['click', 'touchstart', 'keydown'].forEach(event => {
    document.addEventListener(event, () => {
        if (window.musicPlayer && window.musicPlayer.currentTrack && !window.musicPlayer.isPlaying) {
            window.musicPlayer.play();
        }
    }, { once: true, passive: true });
});

console.log('🎵 NeuroHarmonics MusicPlayer initialized - ambient track looping continuously');

