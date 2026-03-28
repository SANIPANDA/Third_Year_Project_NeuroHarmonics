// Global persistent-like background player
// Plays one designated file in loop, pauses when other audio plays,
// saves position/state to localStorage and restores on next page load.

let musicPlayer = null;
let volume = 0.5;
const BG_SRC = 'https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461684/background_jldumw.mp3';
const LS_KEY_TIME = 'nh_bg_time';
const LS_KEY_PLAY = 'nh_bg_playing';
const LS_KEY_PAUSED_BY_OTHER = 'nh_bg_paused_by_other';
const LS_KEY_VOLUME = 'nh_bg_volume';

// Restore volume from localStorage
try {
    const savedVol = localStorage.getItem(LS_KEY_VOLUME);
    if (savedVol !== null) {
        volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
    }
} catch (e) {}

function createMusicPlayer() {
    if (musicPlayer) return musicPlayer;
    musicPlayer = new Audio(BG_SRC);
    musicPlayer.loop = true;
    musicPlayer.volume = volume;
    musicPlayer.preload = 'auto';
    syncVolumeSlider();

    // restore position if available
    try {
        const t = parseFloat(localStorage.getItem(LS_KEY_TIME) || '0');
        if (!isNaN(t) && t > 0) {
            musicPlayer.currentTime = Math.max(0, t - 0.5); // back up a little for continuity
        }
    } catch (e) {}

    // persist time periodically
    musicPlayer.addEventListener('timeupdate', () => {
        try { localStorage.setItem(LS_KEY_TIME, String(musicPlayer.currentTime)); } catch (e) {}
    });

    // save play/pause state
    musicPlayer.addEventListener('play', () => {
        try { localStorage.setItem(LS_KEY_PLAY, '1'); } catch (e) {}
        try { updateToggleButton(); } catch (e) {}
    });
    musicPlayer.addEventListener('pause', () => {
        try { localStorage.setItem(LS_KEY_PLAY, '0'); } catch (e) {}
        try { updateToggleButton(); } catch (e) {}
    });

    // Keep background playing when other audio plays (don't pause it)
    // Just keep it at background level; it will naturally be quieter if other audio is playing

    // when other audio pauses or ends, resume background if it was paused by other audio
    function _maybeResumeOnOtherStop(ev) {
        try {
            const tgt = ev.target;
            if (!(tgt instanceof HTMLAudioElement)) return;
            if (tgt === musicPlayer) return;
            const pausedByOther = localStorage.getItem(LS_KEY_PAUSED_BY_OTHER) === '1';
            if (pausedByOther) {
                // clear flag and attempt resume
                localStorage.removeItem(LS_KEY_PAUSED_BY_OTHER);
                // attempt play; may be blocked by autoplay policy until user interaction
                musicPlayer.play().catch(() => {});
            }
        } catch (e) {}
    }
    document.addEventListener('pause', _maybeResumeOnOtherStop, true);
    document.addEventListener('ended', _maybeResumeOnOtherStop, true);

    // before unload, persist current time and playing state
    window.addEventListener('beforeunload', () => {
        try { localStorage.setItem(LS_KEY_TIME, String(musicPlayer.currentTime)); } catch (e) {}
        try { localStorage.setItem(LS_KEY_PLAY, musicPlayer.paused ? '0' : '1'); } catch (e) {}
    });

    return musicPlayer;
}

function startBackgroundIfNeeded() {
    const player = createMusicPlayer();
    const shouldPlay = localStorage.getItem(LS_KEY_PLAY) === '1' || localStorage.getItem(LS_KEY_PLAY) === null;
    // If user preference unknown, try to play; modern browsers may block autplay.
    if (shouldPlay) {
        player.play().catch(() => {});
    }
}

function stopBackground() {
    if (!musicPlayer) return;
    musicPlayer.pause();
}

// Restore on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    // Ensure the background file is used
    startBackgroundIfNeeded();
});

// Expose API
window.musicPlayer = {
    play() { createMusicPlayer(); return musicPlayer.play().catch(() => {}); },
    pause() { stopBackground(); },
    isPlaying() { return musicPlayer && !musicPlayer.paused; },
    toggle() {
        try {
            createMusicPlayer();
            if (musicPlayer.paused) {
                musicPlayer.play().catch(() => {});
            } else {
                musicPlayer.pause();
            }
            updateToggleButton();
        } catch (e) {}
    },
    // Pause background when other audio plays, mark as paused-by-other
    pauseForOtherMusic() { 
        if (musicPlayer && !musicPlayer.paused) {
            musicPlayer.pause();
            try { localStorage.setItem(LS_KEY_PAUSED_BY_OTHER, '1'); } catch (e) {}
            updateToggleButton();
        }
    },
    // Resume after other music ends
    resumeAfterOtherMusic() { 
        if (musicPlayer && musicPlayer.paused) {
            try { localStorage.removeItem(LS_KEY_PAUSED_BY_OTHER); } catch (e) {}
            musicPlayer.play().catch(() => {});
            updateToggleButton();
        }
    }
};

// Update header button state if present
function updateToggleButton() {
    try {
        const btn = document.getElementById('nh-music-toggle');
        if (!btn) return;
        const playing = musicPlayer && !musicPlayer.paused;
        btn.textContent = playing ? '⏸️' : '🔊';
    } catch (e) {}
}

// Sync volume slider with player
function syncVolumeSlider() {
    try {
        const slider = document.getElementById('nh-volume-slider');
        if (slider && musicPlayer) {
            slider.value = Math.round(musicPlayer.volume * 100);
        }
    } catch (e) {}
}

// Set volume on music player
function setVolume(val) {
    try {
        volume = Math.max(0, Math.min(1, val / 100));
        if (musicPlayer) {
            musicPlayer.volume = volume;
        }
        localStorage.setItem(LS_KEY_VOLUME, String(volume));
    } catch (e) {}
}

// Attempt to resume if page becomes visible and background was paused by other audio
document.addEventListener('visibilitychange', () => {
    try {
        if (document.visibilityState === 'visible') {
            const pausedByOther = localStorage.getItem(LS_KEY_PAUSED_BY_OTHER) === '1';
            if (pausedByOther && musicPlayer && musicPlayer.paused) {
                musicPlayer.play().catch(() => {});
                localStorage.removeItem(LS_KEY_PAUSED_BY_OTHER);
            }
            updateToggleButton();
        }
    } catch (e) {}
});

// Wire up header controls and ensure background music keeps playing
window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('nh-music-toggle');
    const volSlider = document.getElementById('nh-volume-slider');
    
    if (btn) {
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            window.musicPlayer.toggle();
        });
    }
    
    if (volSlider) {
        volSlider.addEventListener('input', (ev) => {
            setVolume(parseInt(ev.target.value));
        });
    }
    
    // reflect initial state
    setTimeout(updateToggleButton, 250);
    setTimeout(syncVolumeSlider, 250);
    
    // Ensure background music plays continuously
    setTimeout(() => {
        if (musicPlayer && musicPlayer.paused) {
            musicPlayer.play().catch(() => {});
        }
    }, 500);
});