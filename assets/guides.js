/* ══════════════════════════════════════════════
   Deb8er Guides — Scroll-spy + Mobile TOC
   ══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── Sidebar scroll-spy ─── */
  const sidebarLinks = document.querySelectorAll('.guide-toc-sidebar a');
  const drawerLinks = document.querySelectorAll('.toc-drawer a');
  const sections = [];

  sidebarLinks.forEach(link => {
    const id = link.getAttribute('href')?.replace('#', '');
    const section = id && document.getElementById(id);
    if (section) sections.push({ id, section, sidebarLink: link, drawerLink: link });
  });

  if (sections.length === 0) return;

  let ticking = false;

  function updateActive() {
    const scrollY = window.scrollY + 140;
    let current = sections[0];

    for (const s of sections) {
      if (s.section.offsetTop <= scrollY) {
        current = s;
      }
    }

    sidebarLinks.forEach(l => l.classList.remove('active'));
    drawerLinks.forEach(l => l.classList.remove('active'));

    if (current.sidebarLink) current.sidebarLink.classList.add('active');
    if (current.drawerLink) current.drawerLink.classList.add('active');

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateActive);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateActive();

  /* ─── Mobile TOC pill + drawer ─── */
  const pill = document.querySelector('.toc-pill');
  const overlay = document.querySelector('.toc-overlay');
  const drawer = document.querySelector('.toc-drawer');

  if (!pill || !overlay || !drawer) return;

  let open = false;

  function toggleDrawer() {
    open = !open;
    pill.classList.toggle('toc-pill-open', open);
    overlay.classList.toggle('open', open);
    drawer.classList.toggle('open', open);
    overlay.style.display = open ? 'block' : 'none';
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function closeDrawer() {
    if (!open) return;
    open = false;
    pill.classList.remove('toc-pill-open');
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  pill.addEventListener('click', toggleDrawer);
  overlay.addEventListener('click', closeDrawer);

  drawerLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });
})();
