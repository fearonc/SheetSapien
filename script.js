/* script.js
   Handles:
   - Intercepting navigation and loading pages via fetch
   - Smooth horizontal slide animation between pages
   - Mobile nav toggle
   - Contact form frontend behavior
   - Active nav highlighting
*/

(() => {
  const containerSelector = '#main-content';
  const navSelector = '[data-link]';
  const headerSelector = '.site-header';
  const navToggleSelector = '.nav-toggle';
  const siteNavSelector = '.site-nav';

  // Utility: fetch page and return the #main-content element HTML
  async function fetchPageContent(url) {
    const res = await fetch(url, {cache: 'no-store'});
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const main = doc.querySelector(containerSelector);
    return {
      title: doc.title || '',
      content: main ? main.innerHTML : '',
      url: url
    };
  }

  // Replace current view with new content using slide animation
  async function transitionTo(url, push = true) {
    try {
      const wrapper = document.createElement('div');
      wrapper.className = 'view-wrapper container';
      const currentMain = document.querySelector(containerSelector);
      const parent = currentMain.parentNode;

      // Prepare current view element
      const currentView = document.createElement('div');
      currentView.className = 'view current-view';
      currentView.innerHTML = currentMain.innerHTML;

      // Fetch new content
      const {title, content} = await fetchPageContent(url);

      // Prepare next view
      const nextView = document.createElement('div');
      nextView.className = 'view next-view enter-from-right';
      nextView.innerHTML = content;

      // Replace main with wrapper that contains both views
      wrapper.appendChild(currentView);
      wrapper.appendChild(nextView);
      parent.replaceChild(wrapper, currentMain);

      // trigger reflow
      void nextView.offsetWidth;

      // animate
      currentView.classList.add('to-left');
      nextView.classList.remove('enter-from-right');
      nextView.classList.add('enter-active');

      // After animation, swap back to simple main-content
      setTimeout(() => {
        const newMain = document.createElement('main');
        newMain.id = 'main-content';
        newMain.className = 'page'; // preserve page class if needed
        // transfer nextView content
        newMain.innerHTML = nextView.innerHTML;
        parent.replaceChild(newMain, wrapper);

        // Update document title & URL
        if (title) document.title = title;
        if (push) history.pushState({url}, title, url);

        // run small init for newly inserted elements
        postTransitionInit();

        // update active nav
        updateActiveNav(url);
        // close mobile nav if open
        closeMobileNav();
      }, 420);
    } catch (err) {
      console.error('Navigation error:', err);
      // fallback to full navigation
      window.location.href = url;
    }
  }

  // Initialization tasks after content is placed into DOM
  function postTransitionInit() {
    // update year in footer
    const yearEls = document.querySelectorAll('#year');
    yearEls.forEach(el => el.textContent = new Date().getFullYear());

    // wire contact form handler if on contact page
    const form = document.getElementById('contact-form');
    if (form) {
      form.addEventListener('submit', handleContactSubmit);
    }
  }

  // Contact form (frontend only)
  function handleContactSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();
    const msgNode = document.getElementById('form-msg');

    // simple validation
    if (!name || !email || !message) {
      msgNode.textContent = 'Please fill all required fields.';
      msgNode.style.color = 'crimson';
      return;
    }
    // fake send
    msgNode.style.color = '';
    msgNode.textContent = 'Sending…';

    setTimeout(() => {
      msgNode.style.color = 'green';
      msgNode.textContent = 'Thanks — your message is ready. (This demo form does not actually send messages.)';
      form.reset();
    }, 800);
  }

  // Update active nav link
  function updateActiveNav(url) {
    // Normalize url to filename
    const path = new URL(url, location.origin).pathname.split('/').pop() || 'index.html';
    document.querySelectorAll(navSelector).forEach(a => {
      const href = a.getAttribute('href').split('/').pop();
      if (href === path) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  }

  // Mobile nav helpers
  function toggleMobileNav() {
    const nav = document.querySelector(siteNavSelector);
    if (!nav) return;
    nav.classList.toggle('open');
    const btn = document.querySelector(navToggleSelector);
    if (btn) btn.setAttribute('aria-expanded', nav.classList.contains('open'));
  }
  function closeMobileNav() {
    const nav = document.querySelector(siteNavSelector);
    if (!nav) return;
    nav.classList.remove('open');
    const btn = document.querySelector(navToggleSelector);
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  // Link click handler
  function handleLinkClick(e) {
    const a = e.currentTarget;
    const href = a.getAttribute('href');
    // Only intercept same-origin HTML pages
    if (!href || href.startsWith('mailto:') || href.startsWith('http')) {
      return;
    }
    // let links to anchors behave normally
    if (href.startsWith('#')) return;
    e.preventDefault();
    // if same page, do nothing
    const current = location.pathname.split('/').pop() || 'index.html';
    const dest = href.split('/').pop();
    if (current === dest) {
      // scroll to top
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }
    transitionTo(href, true);
  }

  // On popstate (back/forward)
  window.addEventListener('popstate', (ev) => {
    const path = location.pathname.split('/').pop() || 'index.html';
    transitionTo(path, false);
  });

  // Wire up events on initial load
  function init() {
    // set year
    document.querySelectorAll('#year').forEach(el => el.textContent = new Date().getFullYear());

    // nav links
 //   document.querySelectorAll(navSelector).forEach(a => {
 //     a.addEventListener('click', handleLinkClick);
 //   });


     // nav links — disable SPA transition for now
document.querySelectorAll(navSelector).forEach(a => {
  a.removeEventListener('click', handleLinkClick);
});


    // active nav
    updateActiveNav(location.pathname);

    // mobile toggle
    const togg = document.querySelector(navToggleSelector);
    if (togg) togg.addEventListener('click', toggleMobileNav);

    // contact form if present
    const form = document.getElementById('contact-form');
    if (form) {
      form.addEventListener('submit', handleContactSubmit);
    }

    // accessibility: close nav when clicking outside
    document.addEventListener('click', (ev) => {
      const nav = document.querySelector(siteNavSelector);
      const toggle = document.querySelector(navToggleSelector);
      if (!nav || !toggle) return;
      if (!nav.contains(ev.target) && !toggle.contains(ev.target)) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded','false');
      }
    });

    // highlight active nav on load
    updateActiveNav(location.pathname);
  }

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
