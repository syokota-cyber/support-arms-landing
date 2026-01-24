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
const modal = document.getElementById('contactModal');
const openFormBtn = document.getElementById('openFormBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalOverlay = document.getElementById('modalOverlay');
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

// ====================================
// Modal Functionality
// ====================================
const openModal = () => {
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // Focus first input
  const firstInput = modal.querySelector('input');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
};

const closeModal = () => {
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
};

// Open modal
if (openFormBtn) {
  openFormBtn.addEventListener('click', openModal);
}

// Close modal
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeModal);
}

if (modalOverlay) {
  modalOverlay.addEventListener('click', closeModal);
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modal.classList.contains('is-open')) {
      closeModal();
    }
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

// FAQ modal contact button - close FAQ modal and open contact modal
if (faqModalContactBtn) {
  faqModalContactBtn.addEventListener('click', () => {
    closeFaqModal();
    setTimeout(() => {
      openModal();
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
// Form Handling
// ====================================
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get form data
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());

    // Simple validation
    if (!data.name || !data.email || !data.message) {
      alert('必須項目を入力してください。');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      alert('有効なメールアドレスを入力してください。');
      return;
    }

    // Disable submit button
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';

    try {
      // Google Formsへリダイレクト
      const googleFormsUrl = 'https://forms.gle/mbuk9fu35Hn8gRtMA';
      
      // モーダルを閉じてGoogle Formsを開く
      closeModal();
      window.open(googleFormsUrl, '_blank');
      
      // フォームをリセット
      contactForm.reset();
      
    } catch (error) {
      // Error
      alert('送信に失敗しました。\nもう一度お試しください。');

    } finally {
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
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
  // Trap focus in contact modal when open
  if (modal.classList.contains('is-open')) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
  // Track contact form button clicks
  document.querySelectorAll('a[href*="forms.gle"], a[href*="contact"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      const linkText = link.textContent.trim();
      
      gtag('event', 'contact_click', {
        'event_category': 'Contact',
        'event_label': linkText,
        'link_url': href
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

  if (filterButtons.length === 0 || galleryItems.length === 0) return;

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
