(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

  // Accessible mobile navigation
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav-links');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation menu');
      });
    });
  }

  // Project filters + scroll-snap carousel
  const filterButtons = [...document.querySelectorAll('.filter-button')];
  const track = document.querySelector('#projects-grid');
  const allCards = track ? [...track.querySelectorAll('.project-card')] : [];
  const previousButton = document.querySelector('[data-carousel-prev]');
  const nextButton = document.querySelector('[data-carousel-next]');
  const currentLabel = document.querySelector('[data-carousel-current]');
  const totalLabel = document.querySelector('[data-carousel-total]');
  const dotsContainer = document.querySelector('[data-carousel-dots]');
  let pageCount = 1;
  let activePage = 0;
  let scrollFrame = null;

  const getVisibleCards = () => allCards.filter((card) => !card.hidden);

  const getVisibleSlots = (cards) => {
    if (!track || !cards.length) return 1;
    const firstCard = cards[0];
    const cardWidth = firstCard.getBoundingClientRect().width;
    const trackStyle = window.getComputedStyle(track);
    const gap = Number.parseFloat(trackStyle.columnGap || trackStyle.gap || '0') || 0;
    if (!cardWidth) return 1;
    return Math.max(1, Math.floor((track.clientWidth + gap + 1) / (cardWidth + gap)));
  };

  const scrollToCard = (card) => {
    if (!track || !card) return;
    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const target = track.scrollLeft + cardRect.left - trackRect.left;
    track.scrollTo({ left: Math.max(0, target), behavior: scrollBehavior });
  };

  const getPageIndex = (cards) => {
    if (!track || !cards.length) return 0;
    const trackLeft = track.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    return Math.min(closestIndex, Math.max(0, cards.length - getVisibleSlots(cards)));
  };

  const setActiveDot = (index) => {
    if (!dotsContainer) return;
    [...dotsContainer.querySelectorAll('.carousel-dot')].forEach((dot, dotIndex) => {
      const isActive = dotIndex === index;
      dot.setAttribute('aria-pressed', String(isActive));
      dot.classList.toggle('is-active', isActive);
    });
  };

  const updateCarousel = () => {
    if (!track) return;
    const cards = getVisibleCards();
    if (!cards.length) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    activePage = getPageIndex(cards);
    pageCount = Math.max(1, cards.length - getVisibleSlots(cards) + 1);
    activePage = Math.min(activePage, pageCount - 1);
    if (currentLabel) currentLabel.textContent = String(activePage + 1).padStart(2, '0');
    if (totalLabel) totalLabel.textContent = String(pageCount).padStart(2, '0');
    if (previousButton) previousButton.disabled = track.scrollLeft <= 2;
    if (nextButton) nextButton.disabled = track.scrollLeft >= maxScroll - 2;
    setActiveDot(activePage);
  };

  const renderDots = () => {
    if (!track || !dotsContainer) return;
    const cards = getVisibleCards();
    const slots = getVisibleSlots(cards);
    pageCount = Math.max(1, cards.length - slots + 1);
    dotsContainer.replaceChildren();
    for (let index = 0; index < pageCount; index += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-pressed', String(index === 0));
      dot.setAttribute('aria-label', `Go to project view ${index + 1}`);
      dot.addEventListener('click', () => {
        const targetCard = cards[index];
        scrollToCard(targetCard);
        activePage = index;
        setActiveDot(index);
      });
      dotsContainer.append(dot);
    }
    updateCarousel();
  };

  const moveCarousel = (direction) => {
    const cards = getVisibleCards();
    if (!cards.length || !track) return;
    const nextPage = Math.max(0, Math.min(pageCount - 1, activePage + direction));
    if (nextPage === activePage) return;
    scrollToCard(cards[nextPage]);
    activePage = nextPage;
    setActiveDot(activePage);
    if (currentLabel) currentLabel.textContent = String(activePage + 1).padStart(2, '0');
  };

  if (track) {
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter || 'all';
        filterButtons.forEach((item) => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        allCards.forEach((card) => {
          card.hidden = filter !== 'all' && card.dataset.category !== filter;
        });
        track.scrollTo({ left: 0, behavior: scrollBehavior });
        activePage = 0;
        renderDots();
      });
    });

    if (previousButton) previousButton.addEventListener('click', () => moveCarousel(-1));
    if (nextButton) nextButton.addEventListener('click', () => moveCarousel(1));

    track.addEventListener('scroll', () => {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        updateCarousel();
        scrollFrame = null;
      });
    }, { passive: true });

    track.addEventListener('keydown', (event) => {
      if (event.target !== track) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveCarousel(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveCarousel(-1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        track.scrollTo({ left: 0, behavior: scrollBehavior });
      } else if (event.key === 'End') {
        event.preventDefault();
        track.scrollTo({ left: track.scrollWidth, behavior: scrollBehavior });
      }
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        renderDots();
        updateCarousel();
      }, 120);
    }, { passive: true });

    renderDots();
  }

  // Scroll progress and back-to-top control
  const progressBar = document.querySelector('#reading-progress-bar');
  const backToTop = document.querySelector('#back-to-top');
  let isTicking = false;
  const updateScrollUI = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollableHeight)) : 0;
    if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
    if (backToTop) backToTop.hidden = scrollTop < 700;
    isTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (!isTicking) {
      window.requestAnimationFrame(updateScrollUI);
      isTicking = true;
    }
  }, { passive: true });
  updateScrollUI();
  if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: scrollBehavior }));

  // Highlight the section currently being viewed in the sticky navigation
  if ('IntersectionObserver' in window && nav) {
    const navItems = [...nav.querySelectorAll('a[href^="#"]')];
    const sectionMap = new Map(navItems.map((link) => [link.getAttribute('href').slice(1), link]));
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navItems.forEach((link) => link.classList.remove('is-active'));
        const activeLink = sectionMap.get(entry.target.id);
        if (activeLink) activeLink.classList.add('is-active');
      });
    }, { rootMargin: '-22% 0px -68% 0px', threshold: 0 });
    sectionMap.forEach((link, id) => {
      const section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });
  }

  // Subtle reveal-on-scroll, progressively enhanced and disabled for reduced-motion users
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const revealTargets = document.querySelectorAll('.section-heading, .focus-card, .project-card, .experience-item, .skill-group, .credential-list article, .research-panel, .about-content');
    if (revealTargets.length) {
      document.body.classList.add('reveal-enabled');
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
      revealTargets.forEach((target) => {
        target.classList.add('reveal-target');
        revealObserver.observe(target);
      });
    }
  }

  const year = document.getElementById('current-year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
