/* Self Directed 401k Dallas — lightweight site behaviour (no dependencies). */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initNav();
    initReveal();
    initDialogs();
    initForm();
    initVideos();
    var year = document.querySelector('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
  });

  /* Sticky header: solid background once the page scrolls. */
  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;
    var update = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
    update();
    window.addEventListener('scroll', update, { passive: true });

    // Highlight the nav link for the section in view.
    var links = Array.prototype.slice.call(document.querySelectorAll('.primary-nav ul a'));
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('href') === '#' + entry.target.id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) io.observe(target);
    });
  }

  /* Mobile navigation with visible close control, Escape and focus handling. */
  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.querySelector('[data-nav]');
    var close = document.querySelector('[data-nav-close]');
    if (!toggle || !nav) return;
    var label = toggle.querySelector('.visually-hidden');
    var mq = window.matchMedia('(max-width: 900px)');

    function setOpen(open, returnFocus) {
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Close menu' : 'Open menu';
      if (open) {
        nav.setAttribute('role', 'dialog');
        nav.setAttribute('aria-modal', 'true');
        (close || nav.querySelector('a')).focus();
      } else {
        nav.removeAttribute('role');
        nav.removeAttribute('aria-modal');
        if (returnFocus) toggle.focus();
      }
    }

    toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open'), false); });
    if (close) close.addEventListener('click', function () { setOpen(false, true); });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && nav.classList.contains('is-open')) setOpen(false, false);
    });
    document.addEventListener('keydown', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.key === 'Escape') setOpen(false, true);
      if (e.key === 'Tab') trapFocus(e, nav);
    });
    mq.addEventListener('change', function () { if (!mq.matches) setOpen(false, false); });
  }

  function trapFocus(e, container) {
    var items = container.querySelectorAll('a[href], button:not([disabled])');
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* Fade-up entrances. Skipped entirely when reduced motion is preferred. */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* "Learn More" service detail panels using native <dialog>. */
  function initDialogs() {
    document.querySelectorAll('[data-dialog-open]').forEach(function (btn) {
      var dialog = document.getElementById(btn.getAttribute('data-dialog-open'));
      if (!dialog || typeof dialog.showModal !== 'function') {
        // Older browsers: fall back to the contact section.
        btn.addEventListener('click', function () { location.hash = '#contact'; });
        return;
      }
      btn.addEventListener('click', function () {
        dialog.showModal();
        document.body.classList.add('has-dialog');
      });
      dialog.addEventListener('close', function () {
        document.body.classList.remove('has-dialog');
        btn.focus();
      });
      // Click on the backdrop closes the panel.
      dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
      dialog.querySelectorAll('[data-dialog-close]').forEach(function (el) {
        el.addEventListener('click', function () {
          dialog.close();
          if (el.getAttribute('href') === '#contact') {
            document.getElementById('contact').scrollIntoView();
            document.getElementById('cf-name').focus({ preventScroll: true });
          }
        });
      });
    });
  }

  /* Contact form: client-side validation and JSON submission to /api/contact. */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[+()\-.\s\d]{7,30}$/;
  var SSN_RE = /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/;

  function validate(data) {
    var errors = {};
    if (!data.name || data.name.trim().length < 2) errors.name = 'Please enter your full name.';
    if (!data.email || !EMAIL_RE.test(data.email.trim())) errors.email = 'Please enter a valid email address.';
    if (data.phone && !PHONE_RE.test(data.phone.trim())) errors.phone = 'Please enter a valid phone number, or leave this blank.';
    if (data.message && SSN_RE.test(data.message)) errors.message = 'Please remove any Social Security or account numbers from your message.';
    if (!data.consent) errors.consent = 'Please confirm we may contact you about your inquiry.';
    return errors;
  }

  function initForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;
    var status = form.querySelector('[data-form-status]');
    var submit = form.querySelector('[data-submit]');
    var started = form.querySelector('[data-started]');
    if (started) started.value = String(Date.now());

    function showErrors(errors) {
      form.querySelectorAll('[data-error-for]').forEach(function (p) {
        var key = p.getAttribute('data-error-for');
        var input = form.elements[key];
        p.textContent = errors[key] || '';
        if (input) input.setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var data = {
        name: fd.get('name') || '',
        email: fd.get('email') || '',
        phone: fd.get('phone') || '',
        interest: fd.get('interest') || '',
        message: fd.get('message') || '',
        consent: fd.get('consent') === 'yes',
        website: fd.get('website') || '',
        started: fd.get('started') || ''
      };
      var errors = validate(data);
      showErrors(errors);
      status.className = 'form-status';
      status.textContent = '';
      var firstKey = Object.keys(errors)[0];
      if (firstKey) {
        status.classList.add('is-error');
        status.textContent = 'Please review the highlighted fields.';
        form.elements[firstKey].focus();
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Sending…';
      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, body: body }; });
        })
        .then(function (r) {
          if (r.ok) {
            form.reset();
            showErrors({});
            if (started) started.value = String(Date.now());
            status.classList.add('is-success');
            status.textContent = 'Thank you for reaching out. Your inquiry has been received.';
          } else {
            if (r.body && r.body.errors) showErrors(r.body.errors);
            status.classList.add('is-error');
            status.textContent = (r.body && r.body.message) || 'We couldn’t send your inquiry. Please try again.';
          }
        })
        .catch(function () {
          status.classList.add('is-error');
          status.textContent = 'We couldn’t reach our server. Please check your connection and try again.';
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = 'Send My Inquiry';
          status.setAttribute('tabindex', '-1');
          status.focus();
        });
    });
  }

  /* Background videos: loaded after the page (protects LCP), played only while
     visible, skipped for reduced motion or Save-Data, and pausable by the user. */
  function initVideos() {
    var videos = Array.prototype.slice.call(document.querySelectorAll('[data-bg-video]'));
    var toggles = Array.prototype.slice.call(document.querySelectorAll('[data-video-toggle]'));
    if (!videos.length) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (reduce || saveData || !('IntersectionObserver' in window)) return;

    var paused = false;
    try { paused = localStorage.getItem('bgVideoPaused') === '1'; } catch (e) {}
    var visible = new Map();

    function sync(video) {
      if (!paused && visible.get(video)) {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        video.pause();
      }
    }
    function updateToggles() {
      toggles.forEach(function (t) {
        t.setAttribute('aria-pressed', String(paused));
        var label = t.querySelector('[data-video-label]');
        if (label) label.textContent = paused ? 'Play background video' : 'Pause background video';
      });
    }

    function load(video) {
      if (video.dataset.loaded) return;
      video.dataset.loaded = '1';
      [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(function (f) {
        var src = document.createElement('source');
        src.src = video.dataset[f[0]];
        src.type = f[1];
        video.appendChild(src);
      });
      video.addEventListener('playing', function () { video.classList.add('is-playing'); });
      video.load();
    }

    function start() {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          visible.set(entry.target, entry.isIntersecting);
          if (entry.isIntersecting) load(entry.target);
          sync(entry.target);
        });
      }, { rootMargin: '200px 0px' });
      videos.forEach(function (v) { io.observe(v); });
      toggles.forEach(function (t) {
        t.classList.add('is-ready');
        t.addEventListener('click', function () {
          paused = !paused;
          try { localStorage.setItem('bgVideoPaused', paused ? '1' : '0'); } catch (e) {}
          updateToggles();
          videos.forEach(sync);
        });
      });
      updateToggles();
    }

    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);
  }
})();
