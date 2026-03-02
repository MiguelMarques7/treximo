// js/grupo.js
document.addEventListener('DOMContentLoaded', () => {
    const inButton = document.getElementById('inButton');
    const paceModal = document.getElementById('paceModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const paceButtons = document.querySelectorAll('.pace-btn');

    // Open Modal
    inButton.addEventListener('click', () => {
        if (!inButton.classList.contains('checked-in')) {
            paceModal.classList.remove('hidden');
            modalOverlay.classList.remove('hidden');
            
            // Allow browser paint before transition
            setTimeout(() => {
                paceModal.style.transform = 'translateY(0)';
            }, 10);
        }
    });

    const closeModal = () => {
        paceModal.style.transform = 'translateY(100%)';
        modalOverlay.classList.add('hidden');
        
        // Wait for transition to finish
        setTimeout(() => {
            paceModal.classList.add('hidden');
            paceModal.style.transform = ''; // Reset inline style
        }, 400); 
    };

    // Close Modal on Overlay Click
    modalOverlay.addEventListener('click', closeModal);

    // Handle Pace Selection
    paceButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal();

            // Update main button state
            inButton.textContent = 'DENTRO';
            inButton.classList.add('checked-in');
        });
    });
});
