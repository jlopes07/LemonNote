import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logoutUser,
  onAuthChange
} from './firebase.js';

let activeTab = 'login'; // 'login' | 'register'

function injectAuthModal() {
  if (document.getElementById('auth-modal-overlay')) return;

  const modalHtml = `
    <div id="auth-modal-overlay" class="auth-modal-overlay">
      <div class="auth-modal">
        <button type="button" class="auth-modal-close" id="auth-modal-close">&times;</button>
        
        <div class="auth-modal-tabs">
          <button type="button" class="auth-modal-tab active" id="tab-btn-login">Entrar</button>
          <button type="button" class="auth-modal-tab" id="tab-btn-register">Cadastrar</button>
        </div>

        <div id="auth-error-msg" class="auth-error-msg"></div>

        <form id="auth-form" class="auth-form">
          <div class="auth-form-group">
            <label for="auth-email">E-mail</label>
            <input type="email" id="auth-email" class="auth-input" placeholder="seu@email.com" required />
          </div>

          <div class="auth-form-group">
            <label for="auth-password">Senha</label>
            <input type="password" id="auth-password" class="auth-input" placeholder="••••••••" required minlength="6" />
          </div>

          <button type="submit" id="auth-submit-btn" class="btn-primary" style="width:100%; justify-content:center;">
            Entrar na Conta
          </button>
        </form>

        <div class="auth-divider">
          <span>OU</span>
        </div>

        <button type="button" id="btn-auth-google" class="btn-google">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Entrar com o Google
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  setupModalEventListeners();
}

function setupModalEventListeners() {
  const overlay = document.getElementById('auth-modal-overlay');
  const closeBtn = document.getElementById('auth-modal-close');
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');
  const form = document.getElementById('auth-form');
  const submitBtn = document.getElementById('auth-submit-btn');
  const googleBtn = document.getElementById('btn-auth-google');
  const errorMsg = document.getElementById('auth-error-msg');

  // Open & Close
  closeBtn.addEventListener('click', closeAuthModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthModal();
  });

  // Switch tabs
  tabLogin.addEventListener('click', () => {
    activeTab = 'login';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    submitBtn.textContent = 'Entrar na Conta';
    clearError();
  });

  tabRegister.addEventListener('click', () => {
    activeTab = 'register';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    submitBtn.textContent = 'Criar Nova Conta';
    clearError();
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Aguarde...';

    try {
      if (activeTab === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      closeAuthModal();
      form.reset();
    } catch (err) {
      console.error('Erro Auth:', err);
      showError(translateAuthError(err.code || err.message));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = activeTab === 'login' ? 'Entrar na Conta' : 'Criar Nova Conta';
    }
  });

  // Google Login
  googleBtn.addEventListener('click', async () => {
    clearError();
    try {
      await loginWithGoogle();
      closeAuthModal();
    } catch (err) {
      console.error('Erro Google Auth:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        showError(translateAuthError(err.code || err.message));
      }
    }
  });
}

let isAuthMandatory = false;

function openAuthModal(mandatory = false) {
  injectAuthModal();
  isAuthMandatory = mandatory;

  const overlay = document.getElementById('auth-modal-overlay');
  const closeBtn = document.getElementById('auth-modal-close');

  if (overlay) {
    overlay.classList.add('open');
  }

  if (mandatory) {
    document.body.classList.add('auth-locked');
  }

  if (closeBtn) {
    closeBtn.style.display = mandatory ? 'none' : 'block';
  }
}

function closeAuthModal() {
  if (isAuthMandatory && !auth?.currentUser) return; // Block closing if mandatory login is active

  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.classList.remove('auth-locked');
  clearError();
}

function setupModalEventListeners() {
  const overlay = document.getElementById('auth-modal-overlay');
  const closeBtn = document.getElementById('auth-modal-close');
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');
  const form = document.getElementById('auth-form');
  const submitBtn = document.getElementById('auth-submit-btn');
  const googleBtn = document.getElementById('btn-auth-google');

  // Open & Close
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (!isAuthMandatory) closeAuthModal();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !isAuthMandatory) {
        closeAuthModal();
      }
    });
  }

  // Switch tabs
  tabLogin.addEventListener('click', () => {
    activeTab = 'login';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    submitBtn.textContent = 'Entrar na Conta';
    clearError();
  });

  tabRegister.addEventListener('click', () => {
    activeTab = 'register';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    submitBtn.textContent = 'Criar Nova Conta';
    clearError();
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Aguarde...';

    try {
      if (activeTab === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      isAuthMandatory = false;
      closeAuthModal();
      form.reset();
    } catch (err) {
      console.error('Erro Auth:', err);
      showError(translateAuthError(err.code || err.message));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = activeTab === 'login' ? 'Entrar na Conta' : 'Criar Nova Conta';
    }
  });

  // Google Login
  googleBtn.addEventListener('click', async () => {
    clearError();
    try {
      await loginWithGoogle();
      isAuthMandatory = false;
      closeAuthModal();
    } catch (err) {
      console.error('Erro Google Auth:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        showError(translateAuthError(err.code || err.message));
      }
    }
  });
}

function showError(msg) {
  const errorMsg = document.getElementById('auth-error-msg');
  if (errorMsg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
  }
}

function clearError() {
  const errorMsg = document.getElementById('auth-error-msg');
  if (errorMsg) {
    errorMsg.textContent = '';
    errorMsg.style.display = 'none';
  }
}

function translateAuthError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso por outra conta.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/popup-closed-by-user':
      return 'A janela de autenticação foi fechada.';
    default:
      return 'Erro na autenticação. Por favor, tente novamente.';
  }
}

// Update Header User UI & Dropdown Footer
function renderHeaderUserArea(user) {
  const headerStats = document.querySelector('.header-stats');
  const dropdownMenu = document.querySelector('.nav-dropdown-menu');

  // 1. Update Header Badge
  if (headerStats) {
    let userArea = document.getElementById('user-auth-area');
    if (!userArea) {
      userArea = document.createElement('div');
      userArea.id = 'user-auth-area';
      userArea.className = 'user-auth-area';
      headerStats.appendChild(userArea);
    }

    if (user) {
      userArea.innerHTML = '';
    } else {
      userArea.innerHTML = `
        <button type="button" id="btn-header-login" class="btn-auth-login">
          Entrar
        </button>
      `;

      const loginBtn = document.getElementById('btn-header-login');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          openAuthModal(true);
        });
      }
    }
  }

  // 2. Update Dropdown Menu Footer (Logoff at the end of dropdown)
  if (dropdownMenu) {
    let dropdownAuthFooter = document.getElementById('dropdown-auth-footer');
    if (!dropdownAuthFooter) {
      dropdownAuthFooter = document.createElement('div');
      dropdownAuthFooter.id = 'dropdown-auth-footer';
      dropdownAuthFooter.className = 'dropdown-auth-footer';
      dropdownMenu.appendChild(dropdownAuthFooter);
    }

    if (user) {
      const displayName = user.displayName || user.email.split('@')[0];
      const initial = displayName.charAt(0).toUpperCase();
      const photoUrl = user.photoURL;

      dropdownAuthFooter.innerHTML = `
        <div style="padding: 10px 14px; border-top: 1px solid var(--border-color); margin-top: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
            ${
              photoUrl
                ? `<img src="${photoUrl}" style="width:26px; height:26px; border-radius:50%; object-fit:cover;">`
                : `<div style="width:26px; height:26px; border-radius:50%; background:var(--accent); color:var(--bg-app); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;">${initial}</div>`
            }
            <span style="font-size:13px; font-weight:600; color:var(--text-main); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${displayName}</span>
          </div>
          <button type="button" id="btn-auth-logout-dropdown" title="Sair da conta" style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:5px 12px; border-radius:var(--radius-sm); font-size:12px; font-weight:600; cursor:pointer; flex-shrink:0;">
            Sair
          </button>
        </div>
      `;

      const logoutBtn = document.getElementById('btn-auth-logout-dropdown');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await logoutUser();
        });
      }
    } else {
      dropdownAuthFooter.innerHTML = `
        <div style="padding: 10px 14px; border-top: 1px solid var(--border-color); margin-top: 6px;">
          <button type="button" id="btn-dropdown-login" class="btn-auth-login" style="width: 100%; text-align: center;">
            Fazer Login / Criar Conta
          </button>
        </div>
      `;

      const dropLoginBtn = document.getElementById('btn-dropdown-login');
      if (dropLoginBtn) {
        dropLoginBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openAuthModal(true);
        });
      }
    }
  }
}

// Expose renderHeaderUserArea for components re-rendering
window.renderHeaderUserArea = renderHeaderUserArea;

// Subscribe to auth state changes and enforce login route guard
document.addEventListener('DOMContentLoaded', () => {
  injectAuthModal();
  
  // Immediately lock app body and show mandatory login modal by default
  document.body.classList.add('auth-locked');
  openAuthModal(true);

  onAuthChange((user) => {
    window._currentUser = user;
    renderHeaderUserArea(user);
    
    if (typeof window.populateProfileData === 'function') {
      window.populateProfileData(user);
    }

    if (!user) {
      // Require authentication to access the app
      document.body.classList.add('auth-locked');
      openAuthModal(true);
    } else {
      isAuthMandatory = false;
      document.body.classList.remove('auth-locked');
      closeAuthModal();
    }
  });
});
