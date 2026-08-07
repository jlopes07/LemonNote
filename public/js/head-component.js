// Componentized Head Elements Injector & Theme Initializer
(function initHead() {
  const scriptTag = document.currentScript;
  const title = scriptTag ? scriptTag.getAttribute('data-title') : 'LemonNote';

  // 1. Update document title
  if (title) {
    document.title = title;
  }

  // 2. Pre-apply theme early to prevent Flash of Unstyled Content (FOUC)
  const savedTheme = localStorage.getItem('lemonNote_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedTheme === 'light') {
    document.body ? document.body.classList.add('light-theme') : document.addEventListener('DOMContentLoaded', () => document.body.classList.add('light-theme'));
  } else {
    document.body ? document.body.classList.add('dark-theme') : document.addEventListener('DOMContentLoaded', () => document.body.classList.add('dark-theme'));
  }

  // 3. Pre-apply auth state early to eliminate login modal flash on page transitions
  const isAuthKnown = localStorage.getItem('lemonNote_is_authenticated') === 'true';
  if (isAuthKnown) {
    document.documentElement.classList.add('authenticated');
    if (document.body) {
      document.body.classList.add('authenticated');
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.classList.add('authenticated'));
    }
  }

  // 3. Inject Componentized Head Elements (Favicon, Fonts & Shared style.css)
  const headElementsHTML = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    
    <!-- Fonts & Typography Links: Send Flowers & Elms Sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Elms+Sans:ital,wght@0,100..900;1,100..900&family=Indie+Flower&display=swap" rel="stylesheet">


    `;

  document.head.insertAdjacentHTML('afterbegin', headElementsHTML);
})();
