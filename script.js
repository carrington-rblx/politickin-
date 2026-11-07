const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
  });
});

const newsletterForm = document.querySelector('#newsletter-form');
const formStatus = document.querySelector('.form-status');
newsletterForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.querySelector('#email');
  if (!email?.checkValidity()) {
    email?.reportValidity();
    return;
  }
  if (formStatus) {
    formStatus.textContent = 'Thanks for your interest! Newsletter delivery will be connected when an email platform is configured.';
  }
  newsletterForm.reset();
});

document.querySelectorAll('a[href="#support"], a[href="#shop"], a[href="#voter-guide"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = link.getAttribute('href');
    if (target === '#support' && link.classList.contains('btn')) return;
    if (target === '#shop' || target === '#voter-guide') {
      event.preventDefault();
      const toast = document.querySelector('.toast');
      if (toast) {
        toast.textContent = 'This section is coming soon.';
        toast.classList.add('show');
        window.setTimeout(() => toast.classList.remove('show'), 2200);
      }
    }
  });
});