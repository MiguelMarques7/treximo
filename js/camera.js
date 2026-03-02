// js/camera.js
document.addEventListener('DOMContentLoaded', () => {
    const countdownEl = document.getElementById('countdown');
    const shutterButton = document.getElementById('shutterButton');
    const flashOverlay = document.getElementById('flashOverlay');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const successOverlay = document.getElementById('successOverlay');
    const timeoutOverlay = document.getElementById('timeoutOverlay');

    let timeLeft = 60; // 01:00
    let timerInterval;

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function updateTimer() {
        if (timeLeft > 0) {
            timeLeft--;
            countdownEl.textContent = formatTime(timeLeft);
            if (timeLeft <= 10) {
                // Intense warning visually
                countdownEl.style.color = '#FF3333';
            }
        } else {
            clearInterval(timerInterval);
            triggerTimeout();
        }
    }

    timerInterval = setInterval(updateTimer, 1000);

    function triggerTimeout() {
        timeoutOverlay.classList.remove('hidden');
        shutterButton.disabled = true;
    }

    shutterButton.addEventListener('click', () => {
        if (timeLeft === 0) return;

        clearInterval(timerInterval); // Stop timer

        // 1. Flash effect
        flashOverlay.classList.remove('hidden');
        flashOverlay.classList.add('active');

        setTimeout(() => {
            flashOverlay.classList.remove('active');
            setTimeout(() => {
                flashOverlay.classList.add('hidden');
            }, 100);

            // 2. Loading State
            loadingOverlay.classList.remove('hidden');

            // 3. Success State
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                successOverlay.classList.remove('hidden');
            }, 2000);

        }, 100);
    });
});
