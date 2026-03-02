document.addEventListener('DOMContentLoaded', () => {

    // --- SUPABASE CONFIG ---
    const supabaseUrl = 'https://uslkwgjhiokbveaegsbn.supabase.co';
    const supabaseKey = 'sb_publishable_o8KSgp6Ij2Ia3llmsXGwLQ_jA14M8jS';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // --- STATE MANAGEMENT / ROUTING ---
    const viewHome = document.getElementById('view-home');
    const viewCamera = document.getElementById('view-camera');
    const viewReveal = document.getElementById('view-reveal');

    function showView(viewElement) {
        // Hide all
        viewHome.classList.add('hidden');
        viewCamera.classList.add('hidden');
        viewReveal.classList.add('hidden');

        // Show target
        setTimeout(() => {
            viewElement.classList.remove('hidden');
        }, 50); // slight delay for smooth transition setup
    }

    // --- DEV TRIGGER ROUTING ---
    const devTriggerBtn = document.getElementById('devTriggerAlarm');
    devTriggerBtn.addEventListener('click', () => {
        showView(viewCamera);
        startCameraCountdown();
    });


    // --- HOME EVENT LOGIC ---
    const homeInButton = document.getElementById('homeInButton');
    const homePaceModal = document.getElementById('homePaceModal');
    const homeModalOverlay = document.getElementById('homeModalOverlay');
    const homePaceBtns = document.querySelectorAll('.home-pace-btn');

    homeInButton.addEventListener('click', () => {
        if (!homeInButton.classList.contains('checked-in')) {
            homeModalOverlay.classList.remove('hidden');
            homePaceModal.classList.remove('hidden');
            // Allow browser paint
            setTimeout(() => {
                homePaceModal.style.transform = 'translateY(0)';
            }, 10);
        }
    });

    const closeHomeModal = () => {
        homePaceModal.style.transform = 'translateY(100%)';
        homeModalOverlay.style.opacity = '0';

        setTimeout(() => {
            homePaceModal.classList.add('hidden');
            homeModalOverlay.classList.add('hidden');
            homePaceModal.style.transform = '';
            homeModalOverlay.style.opacity = '';
        }, 400);
    };

    homeModalOverlay.addEventListener('click', closeHomeModal);

    homePaceBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const selectedPace = btn.textContent.trim();

            // optimistic UI update
            closeHomeModal();
            homeInButton.textContent = 'DENTRO';
            homeInButton.style.color = '#CCFF00';
            homeInButton.style.backgroundColor = '#333333';
            homeInButton.classList.add('checked-in');

            // Insert to Supabase Checkins Table
            try {
                const { error } = await supabase.from('checkins').insert([
                    { pace: selectedPace, name: "Atleta Anonymous" }
                ]);
                if (error) console.error("Error inserting check-in:", error);
            } catch (err) {
                console.error("Supabase insert error:", err);
            }
        });
    });


    // --- CAMERA EVENT LOGIC ---
    const camCountdownEl = document.getElementById('camCountdown');
    const camShutterBtn = document.getElementById('camShutterBtn');
    const camFlashOverlay = document.getElementById('camFlashOverlay');
    const camLoadingOverlay = document.getElementById('camLoadingOverlay');
    let timerInterval;

    function startCameraCountdown() {
        let timeLeft = 60;
        camCountdownEl.textContent = "01:00";
        camCountdownEl.style.color = '#FFFFFF';

        timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft >= 0) {
                const s = timeLeft.toString().padStart(2, '0');
                camCountdownEl.textContent = `00:${s}`;
                if (timeLeft <= 10) camCountdownEl.style.color = '#FF3333';
            } else {
                clearInterval(timerInterval);
            }
        }, 1000);
    }

    camShutterBtn.addEventListener('click', () => {
        clearInterval(timerInterval); // Stop clock

        // Flash
        camFlashOverlay.classList.remove('hidden');
        camFlashOverlay.classList.add('active');

        setTimeout(() => {
            camFlashOverlay.classList.remove('active');
            setTimeout(() => camFlashOverlay.classList.add('hidden'), 100);

            // Loading State
            camLoadingOverlay.classList.remove('hidden');

            // Route to Reveal after 1.5s
            setTimeout(() => {
                camLoadingOverlay.classList.add('hidden');
                showView(viewReveal);

                // Hide Dev Trigger on reveal since flow is done
                devTriggerBtn.style.display = 'none';
            }, 1500);

        }, 100);
    });


    // --- REVEAL EVENT LOGIC ---
    const revReactionBtns = document.querySelectorAll('.rev-reaction-btn');
    const revShareBtn = document.getElementById('revShareBtn');
    const globalToast = document.getElementById('globalToast');

    revReactionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.add('acted');
            setTimeout(() => btn.classList.remove('acted'), 300);

            const plusOne = btn.querySelector('.rev-plus-one');
            plusOne.classList.remove('hidden', 'animate');
            void plusOne.offsetWidth; // Reflow
            plusOne.classList.add('animate');

            setTimeout(() => {
                plusOne.classList.remove('animate');
                plusOne.classList.add('hidden');
            }, 800);
        });
    });

    revShareBtn.addEventListener('click', () => {
        globalToast.classList.remove('hidden');
        setTimeout(() => {
            globalToast.classList.add('hidden');
        }, 3000);
    });


    // --- FEED INTERACTIVITY ---
    const viewFeed = document.getElementById('view-feed');

    // Query the nav buttons from inside the Home view
    const homeNavFy = viewHome.querySelector('.home-top-nav button:first-child');
    const homeNavGrupo = viewHome.querySelector('.home-top-nav button:last-child');

    // Query the nav buttons from inside the Feed view
    const feedNavFy = document.getElementById('navFeedFy');
    const feedNavGrupo = document.getElementById('navFeedGrupo');

    function switchToFeed() {
        // Ensure correct visual states
        viewHome.classList.add('hidden');
        setTimeout(() => { viewFeed.classList.remove('hidden'); }, 50);
    }

    function switchToHome() {
        viewFeed.classList.add('hidden');
        setTimeout(() => { viewHome.classList.remove('hidden'); }, 50);
    }

    homeNavFy.addEventListener('click', switchToFeed);
    feedNavGrupo.addEventListener('click', switchToHome);

    // Liked Interaction
    const likeBtns = document.querySelectorAll('.btn-like');
    likeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const icon = btn.querySelector('.feed-icon');
            // Toggle liked class
            icon.classList.toggle('liked');

            // Simple animation effect logic is handled via CSS transform
        });
    });


    // --- ADMIN EVENT LOGIC (WITH SUPABASE) ---
    const viewAdmin = document.getElementById('view-admin');
    const adminTriggerBtn = document.getElementById('adminTriggerBtn');
    const adminBackBtn = document.getElementById('adminBackBtn');
    const adminStartBtn = viewAdmin.querySelector('.admin-massive-cta');

    // DOM Elements for Supabase Data Injection
    const adminOverviewNumber = viewAdmin.querySelector('.admin-card-number');
    const paceCounts = viewAdmin.querySelectorAll('.admin-pace-count'); // [0:Coelho, 1:Medio, 2:Social, 3:Caminhada]
    const fillCoelho = viewAdmin.querySelector('.fill-coelho');
    const fillMedio = viewAdmin.querySelector('.fill-medio');
    const fillSocial = viewAdmin.querySelector('.fill-social');
    const fillCaminhada = viewAdmin.querySelector('.fill-caminhada');

    async function loadAdminStats() {
        try {
            const { data, error } = await supabase.from('checkins').select('pace');
            if (error) throw error;

            let total = data.length;
            let coelho = 0, medio = 0, social = 0, caminhada = 0;

            data.forEach(row => {
                if (row.pace.includes('Coelho')) coelho++;
                else if (row.pace.includes('Médio')) medio++;
                else if (row.pace.includes('Social')) social++;
                else if (row.pace.includes('Caminhada')) caminhada++;
            });

            // Set text counters
            adminOverviewNumber.textContent = total;
            if (paceCounts.length >= 4) {
                paceCounts[0].textContent = coelho;
                paceCounts[1].textContent = medio;
                paceCounts[2].textContent = social;
                paceCounts[3].textContent = caminhada;
            }

            // Calculate and Apply Percentages
            fillCoelho.style.width = total > 0 ? `${(coelho / total) * 100}%` : '0%';
            fillMedio.style.width = total > 0 ? `${(medio / total) * 100}%` : '0%';
            fillSocial.style.width = total > 0 ? `${(social / total) * 100}%` : '0%';
            fillCaminhada.style.width = total > 0 ? `${(caminhada / total) * 100}%` : '0%';

        } catch (err) {
            console.error("Supabase fetch error:", err);
        }
    }

    adminTriggerBtn.addEventListener('click', () => {
        showView(viewAdmin);
        loadAdminStats(); // Fetch live Supabase stats when Admin opens
    });

    adminBackBtn.addEventListener('click', () => {
        showView(viewHome);
    });

    if (adminStartBtn) {
        adminStartBtn.addEventListener('click', () => {
            alert("SISTEMA ARMADO. A Roleta de coordenadas está ativa para todos os 45 corredores.");
            showView(viewHome);
        });
    }

    // --- NAVEGAÇÃO DO PAINEL DO CAPITÃO (FORÇADA) ---
    const btnVoltarAdmin = document.getElementById('adminBackBtn');
    const ecraAdmin = document.getElementById('view-admin');
    const ecraHome = document.getElementById('view-home');

    if (btnVoltarAdmin) {
        btnVoltarAdmin.addEventListener('click', function () {
            // 1. Esconde o Painel do Capitão
            ecraAdmin.classList.add('hidden');

            // 2. Revela o Ecrã Inicial (Grupo)
            ecraHome.classList.remove('hidden');
        });
    }

});
