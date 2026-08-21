// Shared Reusable UI Components (Header & Footer)

function getActivePageKey() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes('pantry.html')) return 'pantry';
  if (path.includes('recipes.html')) return 'recipes';
  if (path.includes('recipe-detail.html')) return 'recipes';
  if (path.includes('register.html')) return 'register';
  if (path.includes('settings.html')) return 'settings';
  if (path.includes('diary.html')) return 'diary';
  if (path.includes('reports.html')) return 'reports';
  return 'home';
}

function renderHeaderComponent() {
  const headerContainer = document.getElementById('app-header-container') || document.querySelector('header.app-header');
  if (!headerContainer) return;

  const activePage = getActivePageKey();

  const headerHTML = `
    <div class="logo-area">
      <a href="index.html" class="logo-link">
        <div class="logo-icon" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <img src="assets/lemon-logo.svg" alt="LemonNote Logo" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
        <div class="logo-text">
          <h1>Lemon<span>Note</span></h1>
          <p>Receitas Inteligentes</p>
        </div>
      </a>
    </div>
    
    <div class="header-stats" style="display: flex; gap: 12px; align-items: center;">
      <div id="user-auth-area" class="user-auth-area"></div>
      
      <!-- Navigation Dropdown Menu -->
      <div class="nav-dropdown" id="global-nav-dropdown">
        <button class="nav-dropdown-btn" id="global-nav-btn" type="button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round">

            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />

          </svg>
        </button>
        <div class="nav-dropdown-menu">
          <a href="index.html" class="nav-dropdown-item ${activePage === 'home' ? 'active' : ''}">
            Início
          </a>
          <a href="pantry.html" class="nav-dropdown-item ${activePage === 'pantry' ? 'active' : ''}">
            Minha Despensa
          </a>
          <a href="recipes.html" class="nav-dropdown-item ${activePage === 'recipes' ? 'active' : ''}">
            Receitas Sugeridas
          </a>
          <a href="diary.html" class="nav-dropdown-item ${activePage === 'diary' ? 'active' : ''}">
            Saúde & Metas
          </a>
          <a href="reports.html" class="nav-dropdown-item ${activePage === 'reports' ? 'active' : ''}">
            Relatórios
          </a>
          <a href="register.html" class="nav-dropdown-item ${activePage === 'register' ? 'active' : ''}">
            Painel de Cadastro
          </a>
          <a href="settings.html" class="nav-dropdown-item ${activePage === 'settings' ? 'active' : ''}">
            Configurações
          </a>
        </div>
      </div>
    </div>
  `;

  headerContainer.innerHTML = headerHTML;
  setupDropdownListener();
  if (typeof window.updateGlobalPantryBadge === 'function') {
    window.updateGlobalPantryBadge();
  }
  setTimeout(() => {
    if (typeof window.updateGlobalPantryBadge === 'function') {
      window.updateGlobalPantryBadge();
    }
  }, 100);
  if (typeof window.renderHeaderUserArea === 'function') {
    window.renderHeaderUserArea(window._currentUser || null);
  }
}

function setupDropdownListener() {
  if (window._navDropdownListenerBound) return;
  window._navDropdownListenerBound = true;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-dropdown-btn');
    if (btn) {
      const dropdown = btn.closest('.nav-dropdown');
      if (dropdown) {
        dropdown.classList.toggle('open');
        return;
      }
    }

    // Close open dropdowns when clicking outside
    document.querySelectorAll('.nav-dropdown.open').forEach(d => {
      if (!d.contains(e.target)) {
        d.classList.remove('open');
      }
    });
  });
}

function renderFooterComponent() {
  const footerContainer = document.getElementById('app-footer-container') || document.querySelector('footer.app-footer');
  if (!footerContainer) return;

  footerContainer.innerHTML = `
    <p>&copy; 2026 LemonNote. Desenvolvido para facilitar sua alimentação saudável.</p>
  `;
}

// Auto render components on load
function initUIComponents() {
  renderHeaderComponent();
  renderFooterComponent();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUIComponents);
} else {
  initUIComponents();
}

export { renderHeaderComponent, renderFooterComponent };
