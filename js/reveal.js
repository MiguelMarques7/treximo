// js/reveal.js
document.addEventListener('DOMContentLoaded', () => {
    const reactionBtns = document.querySelectorAll('.reaction-btn');
    const shareButton = document.getElementById('shareButton');
    const toastNotification = document.getElementById('toastNotification');

    // Reaction Logic
    reactionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Visual feedback on button
            btn.classList.add('reacted');

            // Remove state after a short delay
            setTimeout(() => {
                btn.classList.remove('reacted');
            }, 300);

            // Animate +1
            const plusOne = btn.querySelector('.plus-one');

            // Reset animation state cleanly if clicked rapidly
            plusOne.classList.remove('hidden', 'animate');
            void plusOne.offsetWidth; // trigger reflow

            plusOne.classList.add('animate');

            setTimeout(() => {
                plusOne.classList.remove('animate');
                plusOne.classList.add('hidden');
            }, 800);
        });
    });

    // Share Logic
    shareButton.addEventListener('click', async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'tréximo',
                    text: 'Apanhei o tréximo de hoje! 🔥',
                    url: window.location.href
                });
            } catch (err) {
                console.log('Error sharing:', err);
                showToast();
            }
        } else {
            // Fallback
            showToast();
        }
    });

    function showToast() {
        toastNotification.classList.remove('hidden');
        setTimeout(() => {
            toastNotification.classList.add('hidden');
        }, 3000);
    }
});
