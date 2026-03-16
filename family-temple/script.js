document.addEventListener('DOMContentLoaded', () => {
    const enterBtn = document.getElementById('enter-btn');
    const entryScreen = document.getElementById('entry-screen');
    const mainContent = document.getElementById('main-content');
    // YouTube IFrame API Logic
    let ytPlayer;
    const LOOP_START = 504; // 8:24
    const LOOP_END = 548;   // 9:08

    // The YouTube API will call this function when the script is loaded
    window.onYouTubeIframeAPIReady = function () {
        ytPlayer = new YT.Player('yt-player', {
            height: '0',
            width: '0',
            videoId: 'xLwtsvL1EEc',
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'start': LOOP_START,
                'end': LOOP_END
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    };

    function onPlayerReady(event) {
        // Player is ready, but we wait for user click to play
        // Setup volume
        event.target.setVolume(60);
    }

    function onPlayerStateChange(event) {
        // Loop the song between START and END
        if (event.data === YT.PlayerState.ENDED) {
            ytPlayer.seekTo(LOOP_START);
            ytPlayer.playVideo();
        }

        if (event.data === YT.PlayerState.PLAYING) {
            // Video is playing
        }
    }

    // Handle Entry & Audio Playback
    enterBtn.addEventListener('click', () => {
        // Play the YouTube Video
        if (ytPlayer && ytPlayer.playVideo) {
            ytPlayer.playVideo();
        }

        // Fade out entry screen
        entryScreen.style.opacity = '0';
        entryScreen.style.transform = 'scale(1.2)';

        // Show main content and navbar
        mainContent.style.opacity = '1';
        document.getElementById('navbar').classList.add('visible');

        setTimeout(() => {
            entryScreen.style.display = 'none';
        }, 1500);
    });

    // Vazhipad Booking Modal Logic
    const bookingModal = document.getElementById('booking-modal');
    const bookBtns = document.querySelectorAll('.book-btn, #nav-book-btn');
    const bookingClose = document.getElementById('booking-close');
    const bookingSteps = document.querySelectorAll('.booking-step');

    function showStep(stepId) {
        bookingSteps.forEach(step => step.classList.remove('active'));
        document.getElementById(stepId).classList.add('active');
    }

    bookBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.id === 'enter-btn') return; // Skip the entry button
            bookingModal.classList.add('active');
            showStep('step-login');
        });
    });

    if (bookingClose) {
        bookingClose.addEventListener('click', () => {
            bookingModal.classList.remove('active');
        });
    }

    // Navigating Steps
    let currentUserPhone = null;

    document.getElementById('login-btn').addEventListener('click', async () => {
        const phone = document.getElementById('user-phone').value;
        const password = document.getElementById('user-password').value;

        if (!phone || !password) {
            alert('Please enter both phone number and password.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Login failed');
                return;
            }

            currentUserPhone = phone; // Store for profile/booking

            if (data.user.name && data.user.address) {
                // Existing user with profile -> skip to booking
                showStep('step-vazhipad');
                const dateSpan = document.getElementById('receipt-date');
                dateSpan.textContent = `Date: ${new Date().toLocaleDateString('en-GB')}`;
            } else {
                // New user -> show profile setup
                showStep('step-profile');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Failed to connect to the server.');
        }
    });

    document.getElementById('save-profile-btn').addEventListener('click', async () => {
        const name = document.getElementById('user-name').value;
        const address = document.getElementById('user-address').value;

        if (!name || !address) {
            alert('Please fill in both name and address.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: currentUserPhone, name, address })
            });

            if (!response.ok) {
                alert('Failed to save profile');
                return;
            }

            showStep('step-vazhipad');
            const dateSpan = document.getElementById('receipt-date');
            dateSpan.textContent = `Date: ${new Date().toLocaleDateString('en-GB')}`;

        } catch (error) {
            console.error(error);
            alert('Error saving profile');
        }
    });
    document.getElementById('go-payment-btn').addEventListener('click', () => showStep('step-payment'));
    let selectedPayment = 'upi';
    document.querySelectorAll('.pay-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.pay-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            selectedPayment = item.getAttribute('data-pay');
        });
    });

    document.getElementById('confirm-booking-btn').addEventListener('click', async () => {
        // Collect Devotees
        const devotees = [];
        document.querySelectorAll('.devotee-entry').forEach(entry => {
            const name = entry.querySelector('.devotee-name').value;
            const nakshathram = entry.querySelector('.devotee-star').value;
            if (name && nakshathram) {
                devotees.push({ name, nakshathram });
            }
        });

        const houseName = document.getElementById('vazhipad-house').value;

        // Collect Vazhipads
        const vazhipads = [];
        let total = 0;
        document.querySelectorAll('.v-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                const name = item.querySelector('span').textContent;
                const price = parseInt(checkbox.getAttribute('data-price'));
                vazhipads.push({ name, price });
                total += price;
            }
        });

        const totalAmount = total * devotees.length;

        if (devotees.length === 0 || !houseName || vazhipads.length === 0) {
            alert('Please complete all booking details and select at least one Vazhipad and Devotee.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: currentUserPhone,
                    houseName,
                    devotees,
                    vazhipads,
                    totalAmount,
                    paymentMethod: selectedPayment
                })
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || 'Booking failed');
                return;
            }

            alert("Divine Vazhipad Booked Successfully! You will receive a WhatsApp receipt shortly.");
            bookingModal.classList.remove('active');

            // The backend API handles sending the WhatsApp receipt via UltraMsg automatically.
            // Reload page to clear form fields nicely after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Booking Error:', error);
            alert('Error processing booking.');
        }
    });

    // Add Family Member Logic
    const devoteesList = document.getElementById('devotees-list');
    const addDevoteeBtn = document.getElementById('add-devotee-btn');

    const updateTotalPrice = () => {
        let total = 0;
        const vazhipadSwitches = document.querySelectorAll('.v-item input[type="checkbox"]');
        vazhipadSwitches.forEach(s => {
            if (s.checked) total += parseInt(s.getAttribute('data-price'));
        });
        const numDevotees = document.querySelectorAll('.devotee-entry').length;
        document.getElementById('total-price').textContent = `₹${total * numDevotees}`;
    };

    if (addDevoteeBtn) {
        addDevoteeBtn.addEventListener('click', () => {
            const newEntry = document.createElement('div');
            newEntry.className = 'devotee-entry';
            newEntry.innerHTML = `
                <button type="button" class="remove-devotee">&times;</button>
                <input type="text" class="devotee-name" placeholder="Devotee Name">
                <select class="devotee-star">
                    <option value="" disabled selected>Select Nakshathram (Star)</option>
                    <option>अश्विनी (Ashwini)</option>
                    <option>भरणी (Bharani)</option>
                    <option>कृत्तिका (Krittika)</option>
                    <option>रोहिणी (Rohini)</option>
                    <option>मृगशिरा (Mrigashirsha)</option>
                    <option>आर्द्रा (Ardra)</option>
                    <option>पुनर्वसु (Punarvasu)</option>
                    <option>पुष्य (Pushya)</option>
                    <option>आश्लेषा (Ashlesha)</option>
                    <option>मघा (Magha)</option>
                    <option>पूर्वा फाल्गुनी (Purva Phalguni)</option>
                    <option>उत्तरा फाल्गुनी (Uttara Phalguni)</option>
                    <option>हस्त (Hasta)</option>
                    <option>चित्रा (Chitra)</option>
                    <option>स्वाती (Swati)</option>
                    <option>विशाखा (Vishakha)</option>
                    <option>अनुराधा (Anuradha)</option>
                    <option>ज्येष्ठा (Jyeshtha)</option>
                    <option>मूल (Mula)</option>
                    <option>पूर्वाषाढा (Purvashada)</option>
                    <option>उत्तराषाढा (Uttarashada)</option>
                    <option>श्रवण (Shravana)</option>
                    <option>धनिष्ठा (Dhanishta)</option>
                    <option>शतभिषा (Shatabhisha)</option>
                    <option>पूर्व भाद्रपदा (Purva Bhadrapada)</option>
                    <option>उत्तर भाद्रपदा (Uttara Bhadrapada)</option>
                    <option>रेवती (Revati)</option>
                </select>
            `;
            devoteesList.appendChild(newEntry);

            newEntry.querySelector('.remove-devotee').addEventListener('click', () => {
                newEntry.remove();
                updateTotalPrice();
            });

            updateTotalPrice();
        });
    }

    // Dynamic Price Calculation
    const vazhipadSwitches = document.querySelectorAll('.v-item input[type="checkbox"]');
    vazhipadSwitches.forEach(sw => {
        sw.addEventListener('change', updateTotalPrice);
    });

    // Modal Logic for Family Tree
    const modal = document.getElementById('family-modal');
    const modalClose = document.querySelector('.modal-close');
    const modalName = document.getElementById('modal-name');
    const modalDesc = document.getElementById('modal-desc');
    const modalImg = document.getElementById('modal-img');

    document.querySelectorAll('.family-node').forEach(node => {
        node.addEventListener('click', (e) => {
            e.preventDefault();

            const name = node.getAttribute('data-name');
            const desc = node.getAttribute('data-desc');
            const imgSrc = node.querySelector('img').src;

            modalName.textContent = name;
            modalDesc.textContent = desc;
            modalImg.src = imgSrc;

            modal.classList.add('active');
        });
    });

    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    // Audio fading and management on scroll
    window.addEventListener('scroll', () => {
        if (!ytPlayer || !ytPlayer.setVolume || !ytPlayer.getPlayerState) return;

        const scrollY = window.scrollY;
        const heroHeight = window.innerHeight;
        const fadeStart = heroHeight * 0.1; // Start fading after 10% scroll
        const fadeEnd = heroHeight * 0.9;   // Fully silent by 90% scroll

        let volume = 60; // Initial volume

        if (scrollY > fadeStart) {
            const progress = (scrollY - fadeStart) / (fadeEnd - fadeStart);
            volume = 60 * (1 - progress);
        }

        if (volume < 0) volume = 0;
        if (volume > 60) volume = 60;

        ytPlayer.setVolume(volume);

        // Pause when silent to save resources, resume when coming back
        const playerState = ytPlayer.getPlayerState();
        if (volume === 0 && playerState === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
        } else if (volume > 0 && (playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.BUFFERING)) {
            // Only resume if we have already entered (entryScreen is gone)
            if (entryScreen.style.display === 'none') {
                ytPlayer.playVideo();
            }
        }
    });

    // Reveal animations on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.text-box, .img-box, .tree').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(40px)';
        el.style.transition = 'all 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        observer.observe(el);
    });
});
