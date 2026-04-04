window.generateNewAIRecommendation = async function() {
    const btn = document.getElementById('gen-rec-btn');
    const quoteEl = document.getElementById('ai-quote');
    const imageEl = document.getElementById('ai-image');
    const audioEl = document.getElementById('ai-music');
    const taskContainer = document.getElementById('ai-tasks');
    const emotionTag = document.getElementById('emotion-tag');

    // 1. STOP PERSISTENT BACKGROUND MUSIC
    if (window.musicPlayer) {
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
            // Update UI Sub-sections
            quoteEl.innerText = `"${result.quote}"`;
            imageEl.src = result.image_url;
            imageEl.style.display = 'block';
            
            if(emotionTag) {
                emotionTag.innerText = `STATE: ${result.emotion.toUpperCase()}`;
            }

            // --- FIXED AUDIO LOGIC START ---
            // 1. Set the source
            audioEl.src = result.music_url;
            
            // 2. Define what happens when it's ready
            const playWhenReady = () => {
                audioEl.play().catch(e => console.warn("Playback blocked:", e));
                // Remove the listener so it doesn't fire again randomly
                audioEl.removeEventListener('canplaythrough', playWhenReady);
            };

            // 3. Add the listener and THEN load
            audioEl.addEventListener('canplaythrough', playWhenReady);
            audioEl.load(); 
            // --- FIXED AUDIO LOGIC END ---

            // Auto-resume background when wellness track ends
            audioEl.onended = function() {
                if (window.musicPlayer) {
                    window.musicPlayer.resumeAfterOtherMusic();
                }
            };

            // Update Tasks
            taskContainer.innerHTML = result.tasks.map((task, index) => `
                <div class="task-item" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; border-left: 4px solid #9d4edd;">
                    <div style="font-size: 0.7rem; color: #9d4edd; font-weight: 800; margin-bottom: 5px;">STEP 0${index + 1}</div>
                    <div style="color: #e0aaff; font-size: 0.95rem;">${task}</div>
                </div>
            `).join('');

            if (typeof window.loadRecommendations === "function") {
                await window.loadRecommendations(); 
            }
        }
    } catch (error) {
        console.error("Wellness Hub Error:", error);
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Recommendations';
        }
    }
};