// Firebase SDK v9 modular
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, get, push, set, onValue } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyDummyPlaceholderForDemo123", // ← REPLACE WITH YOUR ACTUAL API KEY
    authDomain: "luxora-pk.firebaseapp.com",
    databaseURL: "https://luxora-pk-default-rtdb.firebaseio.com",
    projectId: "luxora-pk",
    storageBucket: "luxora-pk.appspot.com",
    messagingSenderId: "000000000000", // ← REPLACE
    appId: "1:000000000000:web:0000000000000000" // ← REPLACE
};

// Initialize Firebase
let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization failed:', error);
}

// Toast notification function
function showToast(type, title, message, duration = 5000) {
    // Remove existing toast container if not present
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    const timeout = setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, duration);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(timeout);
        toast.remove();
    });
}

// ========== 1. TRACK VISITOR (with fallback IP APIs) ==========
async function trackVisitor() {
    if (!db) return;
    
    let ip = 'unknown';
    let country = 'unknown';
    
    // Try multiple IP APIs in sequence
    const apis = [
        { url: 'https://api.ipify.org?format=json', ipField: 'ip' },
        { url: 'https://ipapi.co/json/', ipField: 'ip', countryField: 'country_name' },
        { url: 'https://ipinfo.io/json', ipField: 'ip', countryField: 'country' }
    ];

    for (const api of apis) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(api.url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                ip = data[api.ipField] || ip;
                if (api.countryField && data[api.countryField]) {
                    country = data[api.countryField];
                }
                if (ip !== 'unknown') break;
            }
        } catch (e) {
            console.warn(`IP API ${api.url} failed:`, e);
        }
    }

    // Always record visitor, even with unknown IP
    try {
        const visitorRef = ref(db, 'visitors');
        const newVisitorRef = push(visitorRef);
        await set(newVisitorRef, {
            ip: ip,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            device: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
            country: country
        });
        console.log('Visitor tracked');
    } catch (e) {
        console.warn('Failed to save visitor to Firebase:', e);
    }
}

// ========== 2. LOAD COURSES ==========
function loadCourses() {
    if (!db) {
        document.getElementById('pricingGrid').innerHTML = '<div style="grid-column:1/-1; text-align:center; color:rgba(255,255,255,0.3);">Firebase not initialized. Check config.</div>';
        return;
    }
    const coursesRef = ref(db, 'courses');
    get(coursesRef).then((snapshot) => {
        const grid = document.getElementById('pricingGrid');
        grid.innerHTML = '';
        if (snapshot.exists()) {
            const courses = snapshot.val();
            if (Object.keys(courses).length === 0) {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:rgba(255,255,255,0.3);">No courses available. Check back later.</div>';
                return;
            }
            Object.entries(courses).forEach(([id, course]) => {
                const card = document.createElement('div');
                card.className = `pricing-card scroll-reveal ${course.featured ? 'featured' : ''}`;
                
                let priceClass = 'price-gold';
                if (course.priceClass) priceClass = course.priceClass;
                else if (course.discountPrice < 30) priceClass = 'price-green';
                else if (course.discountPrice > 70) priceClass = 'price-red';
                
                const featuresHtml = course.features && Array.isArray(course.features) 
                    ? course.features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('')
                    : '<li><i class="fas fa-check"></i> Premium feature</li>';

                card.innerHTML = `
                    <div class="card-image-wrapper">
                        <img src="${course.image || 'https://i.postimg.cc/wMtwN1cB/images-(28).jpg'}" alt="${course.name}" class="card-image">
                        <div class="card-image-overlay">
                            <button class="quick-view">Quick Preview</button>
                        </div>
                    </div>
                    <div class="pack-category">${course.category || 'Premium'}</div>
                    <h3 class="pack-name">${course.name}</h3>
                    <p class="pack-description">${course.description || ''}</p>
                    
                    <div class="price-container">
                        <div class="price ${priceClass}">
                            ${course.originalPrice ? `<span class="price-original">$${course.originalPrice}</span>` : ''}
                            $${course.discountPrice}
                        </div>
                        <span class="price-period">One-time payment</span>
                    </div>

                    <ul class="features-list">
                        ${featuresHtml}
                    </ul>

                    <a href="${course.redirect || '#'}" class="get-btn">
                        <i class="fas fa-bolt"></i> Get Started
                    </a>
                `;
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:rgba(255,255,255,0.3);">No courses found in database.</div>';
        }
        scrollReveal();
    }).catch(err => {
        console.error('Failed to load courses:', err);
        document.getElementById('pricingGrid').innerHTML = '<div style="grid-column:1/-1; text-align:center; color:rgba(255,255,255,0.3);">Error loading courses. Check console.</div>';
    });
}

// ========== 3. LOAD SOCIAL LINKS ==========
function loadSocialLinks() {
    if (!db) return;
    const socialRef = ref(db, 'socialLinks');
    get(socialRef).then((snapshot) => {
        const container = document.getElementById('socialLinksContainer');
        container.innerHTML = '';
        if (snapshot.exists()) {
            const links = snapshot.val();
            Object.values(links).forEach(link => {
                if (link.url && link.icon) {
                    const a = document.createElement('a');
                    a.href = link.url;
                    a.target = '_blank';
                    a.innerHTML = `<i class="${link.icon}"></i>`;
                    container.appendChild(a);
                }
            });
        }
    }).catch(err => console.warn('Failed to load social links', err));
}

// ========== 4. CHECK POPUP ==========
function checkPopup() {
    if (!db) return;
    const popupRef = ref(db, 'popup');
    get(popupRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.enabled) {
                document.getElementById('popupTitle').innerText = data.title || 'Announcement';
                document.getElementById('popupMessage').innerText = data.message || '';
                document.getElementById('popupMoreLink').href = data.moreLink || '#';
                document.getElementById('popupModal').style.display = 'flex';
            }
        }
    }).catch(err => console.warn('Popup check failed', err));
}

// ========== 5. CONTACT FORM SUBMISSION (NEW) ==========
function setupContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm || !db) return;
    
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const subject = document.getElementById('contactSubject').value.trim();
        const message = document.getElementById('contactMessage').value.trim();
        
        if (!name || !email || !subject || !message) {
            showToast('error', 'Error', 'Please fill in all fields');
            return;
        }
        
        // Save to Firebase
        const messagesRef = ref(db, 'messages');
        const newMessageRef = push(messagesRef);
        
        set(newMessageRef, {
            name: name,
            email: email,
            subject: subject,
            message: message,
            timestamp: Date.now(),
            read: false,
            replied: false
        }).then(() => {
            // Clear form
            contactForm.reset();
            showToast('success', 'Message Sent', 'Thank you for contacting us! We will get back to you soon.');
        }).catch((error) => {
            console.error('Error saving message:', error);
            showToast('error', 'Error', 'Failed to send message. Please try again.');
        });
    });
}

// ========== 6. SCROLL REVEAL ==========
function scrollReveal() {
    const reveals = document.querySelectorAll('.scroll-reveal');
    reveals.forEach(el => {
        const elementTop = el.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        if (elementTop < windowHeight - 100) {
            el.classList.add('active');
        }
    });
}

// ========== 7. SMOOTH SCROLL ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
});

// ========== 8. CLOSE POPUP ==========
document.getElementById('popupClose')?.addEventListener('click', () => {
    document.getElementById('popupModal').style.display = 'none';
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('popupModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// ========== 9. INIT FLOATING ITEMS ==========
function initFloatingItems() {
    const items = document.querySelectorAll('.floating-item');
    items.forEach((item, index) => {
        item.style.animationDelay = `${index * 2}s`;
        item.style.animationDuration = `${20 + Math.random() * 15}s`;
    });
}

// ========== 10. PARALLAX EFFECT ==========
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelectorAll('.floating-item');
    parallax.forEach((item, index) => {
        const speed = 0.5 + (index * 0.1);
        item.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// ========== 11. INITIALIZE ==========
window.addEventListener('load', () => {
    if (db) {
        trackVisitor();
        loadCourses();
        loadSocialLinks();
        checkPopup();
        setupContactForm();
    } else {
        console.error('Firebase not available. Check your config.');
        document.getElementById('pricingGrid').innerHTML = '<div style="grid-column:1/-1; text-align:center; color:rgba(255,255,255,0.3);">Firebase configuration error. Please check console.</div>';
    }
    initFloatingItems();
    scrollReveal();
});

window.addEventListener('scroll', scrollReveal);