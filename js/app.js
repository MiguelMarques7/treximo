document.addEventListener('DOMContentLoaded', () => {

    // --- SUPABASE CONFIG ---
    const supabaseUrl = 'https://uslkwgjhiokbveaegsbn.supabase.co';
    const supabaseKey = 'sb_publishable_o8KSgp6Ij2Ia3llmsXGwLQ_jA14M8jS';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // --- STATE MANAGEMENT / ROUTING ---
    const viewHome = document.getElementById('view-home');
    const viewCamera = document.getElementById('view-camera');
    const viewReveal = document.getElementById('view-reveal');
    const viewOnboarding = document.getElementById('view-onboarding');
    const viewCompleteProfile = document.getElementById('view-complete-profile');
    const viewReward = document.getElementById('view-reward');

    function showView(viewElement) {
        // Hide all
        viewHome.classList.add('hidden');
        if (viewCamera) viewCamera.classList.add('hidden');
        if (viewReveal) viewReveal.classList.add('hidden');
        const viewFeed = document.getElementById('view-feed');
        if (viewFeed) viewFeed.classList.add('hidden');
        const viewAdmin = document.getElementById('view-admin');
        if (viewAdmin) viewAdmin.classList.add('hidden');
        if (viewOnboarding) viewOnboarding.classList.add('hidden');
        if (viewCompleteProfile) viewCompleteProfile.classList.add('hidden');
        if (viewReward) viewReward.classList.add('hidden');

        // Show target
        setTimeout(() => {
            viewElement.classList.remove('hidden');
        }, 50); // slight delay for smooth transition setup
    }

    // --- AUTHENTICATION & ROUTING LOGIC ---
    let currentUser = null;
    let currentProfile = null;

    async function checkUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error("Profile fetch error:", error);
                return null;
            }
            return data;
        } catch (err) {
            console.error("Profile check failed:", err);
            return null;
        }
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (!session) {
            // No user logged in
            currentUser = null;
            currentProfile = null;
            localStorage.removeItem('userName');
            localStorage.removeItem('groupCode');
            showView(viewOnboarding);
            return;
        }

        currentUser = session.user;
        const profile = await checkUserProfile(currentUser.id);

        if (!profile || !profile.height_cm || !profile.current_group_code) {
            // Incomplete profile
            showView(viewCompleteProfile);
        } else {
            // Complete profile
            currentProfile = profile;

            // Reconnect Realtime Roulette Listener on Auth Success
            connectRouletteListener(profile.current_group_code, profile.full_name);
            showView(viewHome);
        }
    });

    // --- SUPABASE REALTIME (ROLETA) ---
    function connectRouletteListener(userGroup, userName) {
        const uName = userName || (currentUser?.user_metadata?.full_name) || "Atleta";
        const groupCode = userGroup || "NO_GROUP";

        // Avoid duplicate subscriptions
        supabase.removeAllChannels();

        supabase.channel('public:roulette_spins')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'roulette_spins' },
                (payload) => handleRoletaEvent(payload, uName, groupCode)
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'roulette_spins' },
                (payload) => handleRoletaEvent(payload, uName, groupCode)
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime ligado para a Roleta no grupo:', groupCode);
                }
            });
    }

    function handleRoletaEvent(payload, activeUserName, activeGroupCode) {
        const newRow = payload.new;

        // Ignore if it's for another group
        if (newRow.group_code !== activeGroupCode) return;

        // REWARD BROADCAST MATCH (IF PHOTO EXISTS)
        if (newRow.photo_url) {
            const rewardImg = document.getElementById('rewardImage');
            if (rewardImg) rewardImg.src = newRow.photo_url;

            showView(viewReward);
            return;
        }

        // SELECTION BROADCAST MATCH
        if (newRow.chosen_name === activeUserName) {
            // VICTIM FLOW
            showView(viewCamera);
            startCameraFeed(); // Mount the UserMedia feed

            // Show notification briefly without native alert for better UX
            const toast = document.getElementById('globalToast');
            if (toast) {
                toast.textContent = "FOSTE ESCOLHIDO! Tira a foto!";
                toast.classList.remove('hidden');
                toast.style.backgroundColor = 'var(--text-main)';
                toast.style.color = 'var(--bg-primary)';

                setTimeout(() => {
                    toast.classList.add('hidden');
                    toast.style.backgroundColor = '';
                    toast.style.color = '';
                }, 4000);
            }

            // Trigger camera start logic (mocked logic already exists, we start countdown)
            startCameraCountdown();
        } else {
            // OTHER USERS FLOW
            // Don't alert if we're just updating the photo_url payload (which starts the reward broadcast)
            if (!newRow.photo_url) {
                alert(`O Capitão escolheu: ${newRow.chosen_name}! Prepara-te para a foto de grupo.`);
            }
        }
    }

    // --- ONBOARDING & PROFILE EVENT LOGIC ---
    const loginGoogleBtn = document.getElementById('loginGoogleBtn');
    const loginEmailBtn = document.getElementById('loginEmailBtn');
    const registerEmailBtn = document.getElementById('registerEmailBtn');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');

    if (loginGoogleBtn) {
        loginGoogleBtn.addEventListener('click', async () => {
            console.log('Google button clicked');
            try {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google'
                });
                if (error) throw error;
            } catch (err) {
                console.error("Google Login failed:", err);
                alert(err.message || "Erro ao inciar sessão com o Google.");
            }
        });
    } else {
        console.error('Google Btn missing');
    }

    if (loginEmailBtn) {
        loginEmailBtn.addEventListener('click', async () => {
            console.log('Login Email button clicked');
            const email = authEmail?.value.trim();
            const password = authPassword?.value;
            if (!email || !password) return alert('Preenche o email e a password.');

            loginEmailBtn.textContent = 'A ENTRAR...';
            try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } catch (err) {
                console.error("Email Login failed:", err);
                alert(err.message);
            } finally {
                loginEmailBtn.textContent = 'ENTRAR';
            }
        });
    } else {
        console.error('Email Login Btn missing');
    }

    if (registerEmailBtn) {
        registerEmailBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Register Email button clicked');
            const email = authEmail?.value.trim();
            const password = authPassword?.value;
            if (!email || !password) return alert('Preenche o email e a password para registar.');

            try {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                alert('Registo com sucesso! Verifica o teu email.');
            } catch (err) {
                console.error("Registration failed:", err);
                alert(err.message);
            }
        });
    } else {
        console.error('Register Email Btn missing');
    }

    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            if (!currentUser) return;

            const height = document.getElementById('profileHeight').value;
            const weight = document.getElementById('profileWeight').value;
            const pace = document.getElementById('profilePace').value;
            const level = document.getElementById('profileLevel').value;
            let group = document.getElementById('profileGroup').value;

            if (!height || !weight || !pace || !level || !group) {
                alert('Preenche todos os campos corretamente.');
                return;
            }

            group = group.trim().toUpperCase();

            saveProfileBtn.textContent = 'A Guardar...';
            saveProfileBtn.disabled = true;

            try {
                // Determine full name from metadata if possible
                const uName = currentUser.user_metadata?.full_name || "Atleta";

                const { error } = await supabase
                    .from('profiles')
                    .update({
                        height_cm: parseInt(height),
                        weight_kg: parseFloat(weight),
                        pace_avg: pace,
                        athlete_level: level,
                        current_group_code: group
                    })
                    .eq('id', currentUser.id);

                if (error) throw error;

                // Update Local Storage
                localStorage.setItem('userName', uName);
                localStorage.setItem('groupCode', group);

                // Transition to Home
                showView(viewHome);

            } catch (err) {
                console.error("Profile save error:", err);
                alert("Erro ao guardar o perfil.");
            } finally {
                saveProfileBtn.textContent = 'Guardar e Entrar';
                saveProfileBtn.disabled = false;
            }
        });
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
                homePaceModal.style.transform = 'translate(-50%, 0)';
            }, 10);
        }
    });

    const closeHomeModal = () => {
        homePaceModal.style.transform = 'translate(-50%, 100%)';
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
                const uName = (currentProfile?.full_name) || (currentUser?.user_metadata?.full_name) || "Atleta Anonymous";
                const gCode = (currentProfile?.current_group_code) || "NO_GROUP";

                const { error } = await supabase.from('checkins').insert([
                    { pace: selectedPace, name: uName, group_code: gCode }
                ]);
                if (error) console.error("Error inserting check-in:", error);
            } catch (err) {
                console.error("Supabase insert error:", err);
            }
        });
    });


    // --- CAMERA & UPLOAD LOGIC ---
    const camVideoFeed = document.getElementById('camVideoFeed');
    const camCanvas = document.getElementById('camCanvas');
    const camCountdownEl = document.getElementById('camCountdown');
    const camShutterBtn = document.getElementById('camShutterBtn');
    const camFlashOverlay = document.getElementById('camFlashOverlay');
    const camLoadingOverlay = document.getElementById('camLoadingOverlay');
    let timerInterval;
    let cameraStream = null;

    async function startCameraFeed() {
        if (camLoadingOverlay) camLoadingOverlay.classList.add('hidden'); // Garante que a vista está limpa
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' } // Tenta usar a câmara traseira
                });
                if (camVideoFeed) camVideoFeed.srcObject = cameraStream;
            } catch (err) {
                console.error("Erro ao aceder à câmara:", err);
                alert("Permissão de câmara negada ou dispositivo indisponível.");
            }
        }
    }

    function stopCameraFeed() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
    }

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

    camShutterBtn.addEventListener('click', async () => {
        clearInterval(timerInterval); // Para o relógio

        // Efeito de Flash visual
        camFlashOverlay.classList.remove('hidden');
        camFlashOverlay.classList.add('active');

        setTimeout(async () => {
            camFlashOverlay.classList.remove('active');
            setTimeout(() => camFlashOverlay.classList.add('hidden'), 100);

            // Agora sim, o utilizador clicou, trancamos o ecrã!
            camLoadingOverlay.classList.remove('hidden');

            // --- INÍCIO DA CAPTURA E UPLOAD ---
            try {
                console.log("1. A iniciar o desenho no Canvas...");
                if (!camVideoFeed || !camCanvas) throw new Error("Falta a tag video ou canvas no HTML");

                // Desenha o frame do vídeo na folha invisível
                camCanvas.width = camVideoFeed.videoWidth || 1080;
                camCanvas.height = camVideoFeed.videoHeight || 1920;
                const ctx = camCanvas.getContext('2d');
                ctx.drawImage(camVideoFeed, 0, 0, camCanvas.width, camCanvas.height);

                console.log("2. Canvas desenhado. A converter para JPEG...");

                // Comprime a foto
                const imageBlob = await new Promise(resolve => camCanvas.toBlob(resolve, 'image/jpeg', 0.8));
                if (!imageBlob) throw new Error("Falha ao gerar a imagem no telemóvel");

                if (typeof stopCameraFeed === 'function') stopCameraFeed(); // Desliga a luz verde da câmara

                console.log("3. Imagem pronta. A enviar para o Supabase Storage...");

                const gCode = (currentProfile?.current_group_code) || "NO_GROUP";
                const uName = (currentProfile?.full_name) || (currentUser?.user_metadata?.full_name) || "Anonymous";
                const timeStr = new Date().getTime();
                const fileName = `${gCode}_${timeStr}.jpg`;

                // Faz o Upload para o cofre
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('treximo-photos')
                    .upload(fileName, imageBlob, { contentType: 'image/jpeg', upsert: true });

                if (uploadError) throw uploadError;

                console.log("4. Upload feito! A avisar a base de dados (Roleta)...");

                // Pede o Link Público da foto
                const { data: publicUrlData } = supabase.storage.from('treximo-photos').getPublicUrl(fileName);
                const publicUrl = publicUrlData.publicUrl;

                // Grava o link na tabela para os outros telemóveis ouvirem
                const { error: dbError } = await supabase
                    .from('roulette_spins')
                    .upsert(
                        { group_code: gCode, chosen_name: uName, photo_url: publicUrl },
                        { onConflict: 'group_code' }
                    );

                if (dbError) throw dbError;

                console.log("5. SUCESSO ABSOLUTO! O Realtime vai mudar os ecrãs agora.");

            } catch (err) {
                // SE ALGO FALHAR, CAI AQUI!
                console.error("ERRO FATAL NA CÂMARA:", err);
                camLoadingOverlay.classList.add('hidden'); // Tira o "A ENVIAR..." da frente
                alert("Erro ao processar a foto: " + err.message);
            }
        }, 100); // Fim da espera do flash
    });

    // --- REWARD EVENT LOGIC ---
    const rewardBackBtn = document.getElementById('rewardBackBtn');
    if (rewardBackBtn) {
        rewardBackBtn.addEventListener('click', () => {
            showView(viewHome);
        });
    }

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
            const gCode = (currentProfile?.current_group_code) || "NO_GROUP";
            const { data, error } = await supabase
                .from('checkins')
                .select('pace, name')
                .eq('group_code', gCode);
            if (error) throw error;

            let total = data.length;
            let coelho = 0, medio = 0, social = 0, caminhada = 0;
            let namesCoelho = [], namesMedio = [], namesSocial = [], namesCaminhada = [];

            data.forEach(row => {
                const pName = row.name || "Sem Nome";
                if (row.pace.includes('Coelho')) { coelho++; namesCoelho.push(pName); }
                else if (row.pace.includes('Médio')) { medio++; namesMedio.push(pName); }
                else if (row.pace.includes('Social')) { social++; namesSocial.push(pName); }
                else if (row.pace.includes('Caminhada')) { caminhada++; namesCaminhada.push(pName); }
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

            // Set Names Lists
            const namesCoelhoEl = document.getElementById('names-coelho');
            const namesMedioEl = document.getElementById('names-medio');
            const namesSocialEl = document.getElementById('names-social');
            const namesCaminhadaEl = document.getElementById('names-caminhada');

            if (namesCoelhoEl) namesCoelhoEl.textContent = namesCoelho.join(', ');
            if (namesMedioEl) namesMedioEl.textContent = namesMedio.join(', ');
            if (namesSocialEl) namesSocialEl.textContent = namesSocial.join(', ');
            if (namesCaminhadaEl) namesCaminhadaEl.textContent = namesCaminhada.join(', ');

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
        adminStartBtn.addEventListener('click', async () => {
            try {
                const gCode = (currentProfile?.current_group_code) || "NO_GROUP";

                // 1. Fetch all check-ins for the group
                const { data, error: fetchError } = await supabase
                    .from('checkins')
                    .select('name')
                    .eq('group_code', gCode);

                if (fetchError) throw fetchError;

                // 2. Validate list
                if (!data || data.length === 0) {
                    alert('Nenhum atleta registado neste grupo.');
                    return;
                }

                // 3. Pick random victim
                const randomIndex = Math.floor(Math.random() * data.length);
                const chosenName = data[randomIndex].name || "Atleta Anonymous";

                // 4. Update or Insert into roulette_spins (A verdadeira Roleta)
                const { error: insertError } = await supabase
                    .from('roulette_spins')
                    .upsert(
                        { group_code: gCode, chosen_name: chosenName, photo_url: null }, // IMPORTANT: Reset past photos!
                        { onConflict: 'group_code' }
                    );

                if (insertError) throw insertError;

                // 5. Alert success
                alert(`SISTEMA ARMADO. A vítima escolhida foi: ${chosenName}`);

                // 6. Navigate Home
                showView(viewHome);
            } catch (err) {
                console.error("Erro na Roleta:", err);
                alert("Erro ao rodar a roleta. Verifica a ligação à base de dados.");
            }
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
