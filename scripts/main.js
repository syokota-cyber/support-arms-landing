/**
 * Main JavaScript for Support Arm Landing Page
 * Features: Navigation, Scroll Animations, Modal, Smooth Scroll
 */

// ====================================
// DOM Elements
// ====================================
const header = document.getElementById('header');
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');
const contactForm = document.getElementById('contactForm');
const faqModal = document.getElementById('faqModal');
const openFaqModalBtn = document.getElementById('openFaqModalBtn');
const closeFaqModalBtn = document.getElementById('closeFaqModalBtn');
const faqModalOverlay = document.getElementById('faqModalOverlay');
const faqModalContactBtn = document.getElementById('faqModalContactBtn');

// ====================================
// Header Scroll Behavior
// ====================================
let lastScroll = 0;
const scrollThreshold = 100;

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;

  // Hide header on scroll down, show on scroll up
  if (currentScroll > scrollThreshold) {
    if (currentScroll > lastScroll) {
      header.classList.add('header--hidden');
    } else {
      header.classList.remove('header--hidden');
    }
  } else {
    header.classList.remove('header--hidden');
  }

  lastScroll = currentScroll;
});

// ====================================
// Mobile Navigation Toggle
// ====================================
if (navToggle) {
  navToggle.addEventListener('click', () => {
    nav.classList.toggle('is-open');
    navToggle.classList.toggle('is-active');
  });
}

// ====================================
// Smooth Scroll for Anchor Links
// ====================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');

    // Skip if href is just "#"
    if (href === '#') return;

    e.preventDefault();

    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      const headerHeight = header.offsetHeight;
      const targetPosition = targetElement.offsetTop - headerHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      // Close mobile menu if open
      if (nav && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        navToggle.classList.remove('is-active');
      }
    }
  });
});

// ====================================
// Scroll Animations with Intersection Observer
// ====================================
const animateOnScroll = () => {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all elements with data-animate attribute
  document.querySelectorAll('[data-animate]').forEach(el => {
    observer.observe(el);
  });
};

// Initialize scroll animations
animateOnScroll();

// Close FAQ modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (faqModal && faqModal.classList.contains('is-open')) {
      closeFaqModal();
    }
  }
});

// ====================================
// FAQ Modal Functionality
// ====================================
const openFaqModal = () => {
  if (!faqModal) return;
  
  faqModal.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // Scroll to top of modal content
  const modalContent = faqModal.querySelector('.faq-modal__content');
  if (modalContent) {
    setTimeout(() => {
      modalContent.scrollTop = 0;
    }, 100);
  }
};

const closeFaqModal = () => {
  if (!faqModal) return;
  
  faqModal.classList.remove('is-open');
  document.body.style.overflow = '';
};

// Open FAQ modal
if (openFaqModalBtn) {
  openFaqModalBtn.addEventListener('click', openFaqModal);
}

// Close FAQ modal
if (closeFaqModalBtn) {
  closeFaqModalBtn.addEventListener('click', closeFaqModal);
}

if (faqModalOverlay) {
  faqModalOverlay.addEventListener('click', closeFaqModal);
}

// FAQ modal contact button - close FAQ modal and scroll to contact form
if (faqModalContactBtn) {
  faqModalContactBtn.addEventListener('click', () => {
    closeFaqModal();
    setTimeout(() => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        const headerHeight = header ? header.offsetHeight : 80;
        window.scrollTo({
          top: contactSection.offsetTop - headerHeight,
          behavior: 'smooth'
        });
      }
    }, 300);
  });
}

// ====================================
// FAQ Category Navigation
// ====================================
const scrollToFaqCategory = (categoryId) => {
  if (!faqModal || !categoryId) return;

  // Open modal first if not already open
  if (!faqModal.classList.contains('is-open')) {
    openFaqModal();
  }

  // Wait for modal to be fully rendered
  setTimeout(() => {
    const categoryElement = document.getElementById(categoryId);
    const modalContent = faqModal.querySelector('.faq-modal__content');

    if (categoryElement && modalContent) {
      // Calculate scroll position (account for modal header)
      const headerHeight = faqModal.querySelector('.faq-modal__header')?.offsetHeight || 0;
      const categoryTop = categoryElement.offsetTop;
      const scrollPosition = categoryTop - headerHeight - 20;

      // Scroll to category
      modalContent.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });

      // Highlight category briefly
      categoryElement.style.transition = 'background-color 0.3s ease';
      categoryElement.style.backgroundColor = 'rgba(139, 35, 53, 0.1)';
      setTimeout(() => {
        categoryElement.style.backgroundColor = '';
      }, 2000);
    }
  }, 100);
};

// Add click handlers to category buttons
document.querySelectorAll('.faq-intro__category-item[data-faq-category]').forEach(button => {
  button.addEventListener('click', (e) => {
    const categoryId = button.getAttribute('data-faq-category');
    if (categoryId) {
      scrollToFaqCategory(categoryId);
    }
  });
});

// ====================================
// Form Handling (sends to /api/contact)
// ====================================
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formResult = document.getElementById('formResult');
    const submitBtn = document.getElementById('contactSubmitBtn');

    // Get form data
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());

    // Validation
    if (!data.name || !data.email) {
      showFormResult(formResult, 'error', '必須項目（お名前、メールアドレス）を入力してください。');
      return;
    }

    if (!data.inquiry_type) {
      showFormResult(formResult, 'error', 'ご相談内容を選択してください。');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      showFormResult(formResult, 'error', '有効なメールアドレスを入力してください。');
      return;
    }

    // Disable submit button
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';
    formResult.className = 'form-result';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showFormResult(formResult, 'success', '送信が完了しました。3営業日以内にご回答いたします。');
        contactForm.reset();

        // Track with GA
        if (typeof gtag !== 'undefined') {
          gtag('event', 'form_submit', {
            'event_category': 'Contact',
            'event_label': data.inquiry_type
          });
        }
      } else {
        showFormResult(formResult, 'error', result.error || '送信に失敗しました。お手数ですがお電話（03-3756-1511）にてお問い合わせください。');
      }
    } catch (error) {
      showFormResult(formResult, 'error', '送信に失敗しました。お手数ですがお電話（03-3756-1511）にてお問い合わせください。');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

function showFormResult(el, type, message) {
  if (!el) return;
  el.className = 'form-result';
  el.classList.add(type === 'success' ? 'is-success' : 'is-error');
  el.textContent = message;
}

// ====================================
// 3D Model Viewer Enhancement
// ====================================
const modelViewer = document.getElementById('product-viewer');

if (modelViewer) {
  // Model toggle buttons (ダクトあり/なし切り替え)
  const toggleButtons = document.querySelectorAll('.model-toggle-btn');

  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const modelSrc = btn.getAttribute('data-model');
      if (!modelSrc) return;

      // Update active state
      toggleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Change model source
      modelViewer.setAttribute('src', modelSrc);
    });
  });
}

// ====================================
// Video Background Optimization
// ====================================
const heroVideo = document.querySelector('.hero__video');

if (heroVideo) {
  // Pause video if tab is not visible (save resources)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      heroVideo.pause();
    } else {
      heroVideo.play();
    }
  });

  // Reduce video playback on mobile to save data
  if (window.matchMedia('(max-width: 768px)').matches) {
    // Optionally reduce playback rate on mobile
    heroVideo.playbackRate = 0.8;
  }
}

// ====================================
// Lazy Loading Images (if any)
// ====================================
if ('loading' in HTMLImageElement.prototype) {
  // Browser supports lazy loading
  const images = document.querySelectorAll('img[loading="lazy"]');
  images.forEach(img => {
    img.src = img.dataset.src || img.src;
  });
} else {
  // Fallback for browsers that don't support lazy loading
  const lazyImages = document.querySelectorAll('img[data-src]');

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  });

  lazyImages.forEach(img => imageObserver.observe(img));
}

// ====================================
// Keyboard Navigation Enhancement
// ====================================
document.addEventListener('keydown', (e) => {
  // Trap focus in FAQ modal when open
  if (faqModal && faqModal.classList.contains('is-open')) {
    const focusableElements = faqModal.querySelectorAll(
      'button, [href], details summary, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }
});

// ====================================
// Initialize Everything on DOM Ready
// ====================================
document.addEventListener('DOMContentLoaded', () => {
  // Announce to screen readers that page is loaded
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = 'ページの読み込みが完了しました';
  document.body.appendChild(announcement);

  setTimeout(() => announcement.remove(), 1000);
});

// ====================================
// FAQ Accordion Functionality
// ====================================
const initFaqAccordion = () => {
  const faqItems = document.querySelectorAll('.faq-item');

  if (faqItems.length === 0) return;

  faqItems.forEach(item => {
    // Add smooth scroll when item opens
    item.addEventListener('toggle', (e) => {
      if (item.open) {
        // Wait for animation to complete
        setTimeout(() => {
          // Calculate position with header offset
          const headerHeight = header ? header.offsetHeight : 80;
          const itemTop = item.getBoundingClientRect().top + window.pageYOffset;
          const scrollToPosition = itemTop - headerHeight - 20;

          // Only scroll if item is not fully in view
          if (window.pageYOffset > scrollToPosition) {
            window.scrollTo({
              top: scrollToPosition,
              behavior: 'smooth'
            });
          }
        }, 150);
      }
    });

    // Add keyboard accessibility
    const summary = item.querySelector('.faq-question');
    if (summary) {
      summary.addEventListener('keydown', (e) => {
        // Toggle on Enter or Space
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.open = !item.open;
        }
      });
    }
  });

  // Track FAQ interactions for analytics (optional)
  document.querySelectorAll('.faq-question').forEach((question, index) => {
    question.addEventListener('click', () => {
      const categoryTitle = question.closest('.faq-category')?.querySelector('.faq-category__title')?.textContent;
      const questionText = question.textContent;

      // Send to Google Analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'faq_click', {
          'event_category': 'FAQ',
          'event_label': questionText,
          'category': categoryTitle || 'Unknown'
        });
      }
    });
  });
};

// Initialize FAQ accordion
initFaqAccordion();

// ====================================
// 360 Viewer (Swap Models)
// ====================================
const initViewer360 = () => {
  const model = document.getElementById('viewer360Model');
  const btnArm = document.getElementById('viewer360BtnArm');
  const btnDuct = document.getElementById('viewer360BtnDuct');

  if (!model || !btnArm || !btnDuct) return;

  const setActive = (activeBtn, inactiveBtn) => {
    activeBtn.classList.add('is-active');
    inactiveBtn.classList.remove('is-active');
    activeBtn.setAttribute('aria-pressed', 'true');
    inactiveBtn.setAttribute('aria-pressed', 'false');
  };

  const swapModel = (btnToActivate, btnToDeactivate) => {
    const nextSrc = btnToActivate.getAttribute('data-model-src');
    if (!nextSrc) return;

    // Swap model
    model.setAttribute('src', nextSrc);
    setActive(btnToActivate, btnToDeactivate);
  };

  btnArm.addEventListener('click', () => swapModel(btnArm, btnDuct));
  btnDuct.addEventListener('click', () => swapModel(btnDuct, btnArm));
};

initViewer360();

// ====================================
// Application Detail Modal Functionality
// ====================================
const initAppModals = () => {
  const appCards = document.querySelectorAll('[data-app-modal]');
  const appModals = document.querySelectorAll('.app-modal');

  if (appCards.length === 0 || appModals.length === 0) return;

  // Open modal function
  const openAppModal = (modalId) => {
    const targetModal = document.getElementById(modalId);
    if (!targetModal) return;

    targetModal.classList.add('is-open');
    targetModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus close button for accessibility
    const closeBtn = targetModal.querySelector('.app-modal__close');
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 100);
    }
  };

  // Close modal function
  const closeAppModal = (modal) => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // Close all modals
  const closeAllAppModals = () => {
    appModals.forEach(modal => closeAppModal(modal));
  };

  // Card click events
  appCards.forEach(card => {
    card.addEventListener('click', () => {
      const modalId = card.getAttribute('data-app-modal');
      openAppModal(modalId);
    });
  });

  // Close button and overlay click events
  appModals.forEach(modal => {
    const closeElements = modal.querySelectorAll('[data-close-modal]');
    closeElements.forEach(el => {
      el.addEventListener('click', (e) => {
        // If it's a link, handle differently based on href
        if (el.tagName === 'A') {
          const href = el.getAttribute('href');
          // External links (http/https) - let them navigate, then close modal
          if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            // Open link in new tab (if target="_blank") or same tab
            // Don't prevent default, let the link work normally
            setTimeout(() => closeAppModal(modal), 100);
          } 
          // Internal links (#) - navigate then close
          else if (href && href.startsWith('#')) {
            setTimeout(() => closeAppModal(modal), 100);
          } 
          // Other cases - prevent default and close
          else {
            e.preventDefault();
            closeAppModal(modal);
          }
        } else {
          // Not a link - prevent default and close
          e.preventDefault();
          closeAppModal(modal);
        }
      });
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllAppModals();
    }
  });
};

initAppModals();

// ====================================
// Google Analytics Event Tracking
// ====================================
if (typeof gtag !== 'undefined') {
  // Track contact CTA clicks
  document.querySelectorAll('a[href="#contact"]').forEach(link => {
    link.addEventListener('click', () => {
      gtag('event', 'contact_click', {
        'event_category': 'Contact',
        'event_label': link.textContent.trim()
      });
    });
  });

  // Track external link clicks (YouTube, etc.)
  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        gtag('event', 'external_link_click', {
          'event_category': 'Outbound',
          'event_label': link.textContent.trim(),
          'link_url': href
        });
      }
    });
  });

  // Track application modal opens
  document.querySelectorAll('[data-app-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-app-modal');
      const appName = btn.closest('.application-card')?.querySelector('.application-card__title')?.textContent || 'Unknown';
      
      gtag('event', 'application_modal_open', {
        'event_category': 'Application',
        'event_label': appName,
        'modal_id': modalId
      });
    });
  });

  // Track scroll depth (25%, 50%, 75%, 100%)
  let scrollDepthTracked = {
    25: false,
    50: false,
    75: false,
    100: false
  };

  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    Object.keys(scrollDepthTracked).forEach(depth => {
      if (scrollPercent >= parseInt(depth) && !scrollDepthTracked[depth]) {
        scrollDepthTracked[depth] = true;
        gtag('event', 'scroll_depth', {
          'event_category': 'Engagement',
          'event_label': `${depth}%`,
          'value': parseInt(depth)
        });
      }
    });
  });

  // Track video interactions
  document.querySelectorAll('.video-card iframe').forEach(iframe => {
    iframe.addEventListener('load', () => {
      gtag('event', 'video_load', {
        'event_category': 'Video',
        'event_label': 'YouTube Video'
      });
    });
  });

  // Track 3D model interactions
  const modelViewer = document.getElementById('product-viewer');
  if (modelViewer) {
    modelViewer.addEventListener('load', () => {
      gtag('event', '3d_model_load', {
        'event_category': '3D Model',
        'event_label': 'Product Viewer'
      });
    });

    // Track model toggle button clicks
    document.querySelectorAll('.model-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modelType = btn.textContent.trim();
        gtag('event', '3d_model_toggle', {
          'event_category': '3D Model',
          'event_label': modelType
        });
      });
    });
  }
}

// ====================================
// Parts Gallery - Filter & Lightbox
// ====================================
const initPartsGallery = () => {
  const filterButtons = document.querySelectorAll('.gallery-filter');
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('galleryLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  if (galleryItems.length === 0) return;

  let currentIndex = 0;
  let visibleItems = [...galleryItems];

  // Filter functionality
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      galleryItems.forEach(item => {
        const category = item.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });

      visibleItems = [...document.querySelectorAll('.gallery-item:not(.hidden)')];
    });
  });

  // Lightbox functionality
  const openLightbox = (index) => {
    if (!lightbox || !lightboxImg) return;
    currentIndex = index;
    const item = visibleItems[currentIndex];
    const img = item.querySelector('img');
    const label = item.querySelector('.gallery-item__label');

    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = label ? label.textContent : '';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };

  const showPrev = () => {
    currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
    const item = visibleItems[currentIndex];
    const img = item.querySelector('img');
    const label = item.querySelector('.gallery-item__label');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = label ? label.textContent : '';
  };

  const showNext = () => {
    currentIndex = (currentIndex + 1) % visibleItems.length;
    const item = visibleItems[currentIndex];
    const img = item.querySelector('img');
    const label = item.querySelector('.gallery-item__label');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = label ? label.textContent : '';
  };

  // Click on gallery items
  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const index = visibleItems.indexOf(item);
      if (index !== -1) {
        openLightbox(index);
      }
    });
  });

  // Close lightbox
  if (lightbox) {
    lightbox.querySelectorAll('[data-close-lightbox]').forEach(el => {
      el.addEventListener('click', closeLightbox);
    });
  }

  // Navigation
  if (lightboxPrev) lightboxPrev.addEventListener('click', showPrev);
  if (lightboxNext) lightboxNext.addEventListener('click', showNext);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
  });
};

initPartsGallery();

// ====================================
// Features Carousel
// ====================================
(() => {
  const track = document.querySelector('.features-carousel__track');
  const slides = document.querySelectorAll('.features-carousel__slide');
  const indicators = document.querySelectorAll('.features-carousel__indicator');
  const prevBtn = document.querySelector('.features-carousel__btn--prev');
  const nextBtn = document.querySelector('.features-carousel__btn--next');
  if (!track || slides.length === 0) return;

  let current = 0;
  const total = slides.length;
  let autoplayTimer = null;
  const AUTOPLAY_INTERVAL = 5000;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    indicators.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function stopAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  prevBtn.addEventListener('click', () => { stopAutoplay(); goTo(current - 1); });
  nextBtn.addEventListener('click', () => { stopAutoplay(); goTo(current + 1); });
  indicators.forEach(ind => {
    ind.addEventListener('click', () => { stopAutoplay(); goTo(Number(ind.dataset.slide)); });
  });

  autoplayTimer = setInterval(() => goTo(current + 1), AUTOPLAY_INTERVAL);
})();

// ====================================
// Display-toggle Carousel (Regulation / Knowledge)
// ====================================
function initDisplayCarousel(root) {
  var trackEl = root.querySelector('[data-carousel-track]');
  if (!trackEl) return;
  var slideEls = trackEl.querySelectorAll('[data-carousel-slide]');
  var indicatorEls = root.querySelectorAll('[data-carousel-indicator]');
  var prevEl = root.querySelector('[data-carousel-prev]');
  var nextEl = root.querySelector('[data-carousel-next]');
  if (slideEls.length === 0) return;

  var cur = 0;
  var len = slideEls.length;

  function show(i) {
    cur = ((i % len) + len) % len;
    for (var j = 0; j < slideEls.length; j++) {
      slideEls[j].classList.toggle('active', j === cur);
    }
    for (var k = 0; k < indicatorEls.length; k++) {
      indicatorEls[k].classList.toggle('active', k === cur);
    }
  }

  if (prevEl) prevEl.onclick = function() { show(cur - 1); };
  if (nextEl) nextEl.onclick = function() { show(cur + 1); };
  for (var m = 0; m < indicatorEls.length; m++) {
    (function(idx) {
      indicatorEls[idx].onclick = function() { show(idx); };
    })(m);
  }
}

// Init all display carousels
document.querySelectorAll('[data-display-carousel]').forEach(function(el) {
  initDisplayCarousel(el);
});

// ====================================
// Knowledge Tabs
// ====================================
(() => {
  const tabs = document.querySelectorAll('[data-knowledge-tab]');
  const articles = document.querySelectorAll('[data-knowledge-panel]');
  if (!tabs.length || !articles.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const idx = Number(tab.dataset.knowledgeTab);
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      articles.forEach(a => a.classList.toggle('active', Number(a.dataset.knowledgePanel) === idx));
    });
  });
})();

// ====================================
// Download Guide Modal
// ====================================
(() => {
  const modal = document.getElementById('downloadGuideModal');
  const openBtns = document.querySelectorAll('[data-open-download-modal]');
  const closeBtn = modal ? modal.querySelector('[data-close-download-modal]') : null;
  const overlay = modal ? modal.querySelector('.download-modal__overlay') : null;

  if (!modal) return;

  const openModal = () => {
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    const content = modal.querySelector('.download-modal__content');
    if (content) setTimeout(() => { content.scrollTop = 0; }, 100);
  };
  const closeModal = () => {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  openBtns.forEach(btn => btn.addEventListener('click', openModal));
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
})();

// ====================================
// Survey Form & PDF Download
// ====================================
(() => {
  const surveyForm = document.getElementById('surveyForm');
  const downloadBtn = document.getElementById('surveyDownloadBtn');
  if (!surveyForm || !downloadBtn) return;

  const requiredQuestions = ['employee_count', 'lev_status', 'introduction_scale'];

  // Check if all required questions are answered
  const checkFormCompletion = () => {
    const radiosComplete = requiredQuestions.every(name => {
      return surveyForm.querySelector(`input[name="${name}"]:checked`);
    });

    // Check at least one checkbox for welding_types
    const checkboxComplete = surveyForm.querySelectorAll('input[name="welding_types"]:checked').length > 0;

    const allComplete = radiosComplete && checkboxComplete;

    downloadBtn.disabled = !allComplete;
    if (allComplete) {
      downloadBtn.innerHTML = `
        <svg class="btn__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        無料PDFをダウンロードする
      `;
    }
  };

  // Listen for input changes
  surveyForm.addEventListener('change', checkFormCompletion);

  // Handle form submit (download)
  surveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (downloadBtn.disabled) return;

    // Collect form data
    const formData = new FormData(surveyForm);
    const data = {
      employee_count: formData.get('employee_count'),
      welding_types: formData.getAll('welding_types'),
      lev_status: formData.get('lev_status'),
      introduction_scale: formData.get('introduction_scale'),
      free_text: formData.get('free_text') || '',
      downloaded_at: new Date().toLocaleString('ja-JP'),
    };

    // Send survey data to backend (fire-and-forget, don't block download)
    fetch('/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});

    // Track with GA
    if (typeof gtag !== 'undefined') {
      gtag('event', 'guide_download', {
        'event_category': 'Download',
        'event_label': 'welding_fume_guide',
        'employee_count': data.employee_count,
        'lev_status': data.lev_status,
      });
    }

    // Download pre-generated PDF
    const link = document.createElement('a');
    link.href = '/assets/溶接ヒューム法規制_完全対応ガイド_岩代工業.pdf';
    link.download = '溶接ヒューム法規制_完全対応ガイド_岩代工業.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
})();

// ====================================
// Gallery Carousel
// ====================================
(() => {
  const track = document.querySelector('.gallery-carousel__track');
  const slides = document.querySelectorAll('.gallery-carousel__slide');
  const indicators = document.querySelectorAll('.gallery-carousel__indicator');
  const prevBtn = document.querySelector('.gallery-carousel__btn--prev');
  const nextBtn = document.querySelector('.gallery-carousel__btn--next');
  if (!track || slides.length === 0) return;

  let current = 0;
  const total = slides.length;
  let autoplayTimer = null;
  const AUTOPLAY_INTERVAL = 5000;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    indicators.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function stopAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  prevBtn.addEventListener('click', () => { stopAutoplay(); goTo(current - 1); });
  nextBtn.addEventListener('click', () => { stopAutoplay(); goTo(current + 1); });
  indicators.forEach(ind => {
    ind.addEventListener('click', () => { stopAutoplay(); goTo(Number(ind.dataset.slide)); });
  });

  autoplayTimer = setInterval(() => goTo(current + 1), AUTOPLAY_INTERVAL);
})();

