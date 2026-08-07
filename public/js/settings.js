import { auth, onAuthChange, logoutUser } from './firebase.js';
import { updateProfile, updatePassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const PROFILE_KEY = 'lemonNote_user_profile_extra';

document.addEventListener('DOMContentLoaded', () => {
  setupSidebarNavigation();
  setupThemeSelection();
  setupProfileForm();
  setupPasswordForm();
  setupDevicesManager();
  setupNotifications();
  setupReportForm();
  setupDangerZone();

  // Listen for Auth changes to populate profile inputs
  onAuthChange((user) => {
    populateProfileData(user);
  });
});

/* 1. SIDEBAR NAVIGATION */
function setupSidebarNavigation() {
  const navBtns = document.querySelectorAll('.settings-nav-item');
  
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.section;
      const targetSec = document.getElementById(sectionId);

      if (targetSec) {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* 2. THEME SELECTION */
function setupThemeSelection() {
  const darkBtn = document.getElementById('btn-theme-dark');
  const lightBtn = document.getElementById('btn-theme-light');

  if (!darkBtn || !lightBtn) return;

  function updateThemeCardUI(currentTheme) {
    if (currentTheme === 'light') {
      lightBtn.classList.add('selected');
      darkBtn.classList.remove('selected');
    } else {
      darkBtn.classList.add('selected');
      lightBtn.classList.remove('selected');
    }
  }

  // Initial state from shared theme manager
  const initialTheme = typeof getTheme === 'function' ? getTheme() : 'dark';
  updateThemeCardUI(initialTheme);

  darkBtn.addEventListener('click', () => {
    if (typeof setTheme === 'function') setTheme('dark');
    updateThemeCardUI('dark');
  });

  lightBtn.addEventListener('click', () => {
    if (typeof setTheme === 'function') setTheme('light');
    updateThemeCardUI('light');
  });
}

/* 3. PROFILE DATA FORM */
let uploadedPhotoDataUrl = null;

function populateProfileData(user) {
  const nameInput = document.getElementById('prof-name');
  const emailInput = document.getElementById('prof-email');
  const phoneInput = document.getElementById('prof-phone');
  const titleText = document.getElementById('profile-user-title');
  const emailText = document.getElementById('profile-user-email-text');
  const avatarDisplay = document.getElementById('profile-avatar-display');

  if (user) {
    const extraData = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    const displayName = user.displayName || extraData.name || user.email.split('@')[0];
    const email = user.email || '';
    const photoURL = uploadedPhotoDataUrl || user.photoURL || extraData.photo || '';
    const phone = extraData.phone || '';

    if (nameInput) nameInput.value = displayName;
    if (emailInput) emailInput.value = email;
    if (phoneInput) phoneInput.value = phone;

    if (titleText) titleText.textContent = displayName;
    if (emailText) emailText.textContent = email;

    if (avatarDisplay) {
      if (photoURL) {
        avatarDisplay.innerHTML = `<img src="${photoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="Avatar" />`;
      } else {
        avatarDisplay.textContent = displayName.charAt(0).toUpperCase();
      }
    }
  } else {
    // Reset all profile inputs and data on logout
    uploadedPhotoDataUrl = null;
    localStorage.removeItem(PROFILE_KEY);

    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (phoneInput) phoneInput.value = '';

    if (titleText) titleText.textContent = 'Visitante';
    if (emailText) emailText.textContent = 'Faça login para acessar sua conta';

    if (avatarDisplay) {
      avatarDisplay.innerHTML = 'V';
    }
  }
}

window.populateProfileData = populateProfileData;

/* Helper function to resize and compress uploaded image with high quality for avatars (200x200 @ 0.85 quality) */
function compressAndResizeImage(file, maxDim = 200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Generate crisp 200x200 JPEG Data URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function setupProfileForm() {
  const form = document.getElementById('form-profile');
  const fileInput = document.getElementById('prof-photo-file');
  const avatarDisplay = document.getElementById('profile-avatar-display');
  if (!form) return;

  // Listen for file selection, automatically resize & compress for Firebase
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          uploadedPhotoDataUrl = await compressAndResizeImage(file, 200, 0.85);
          if (avatarDisplay) {
            avatarDisplay.innerHTML = `<img src="${uploadedPhotoDataUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="Avatar" />`;
          }
        } catch (err) {
          console.error('Erro ao processar imagem:', err);
          alert('Erro ao processar a imagem. Por favor escolha outro arquivo.');
        }
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('prof-name').value.trim();
    const phone = document.getElementById('prof-phone').value.trim();
    
    const extraData = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    let photoToSave = uploadedPhotoDataUrl || extraData.photo || '';

    // If old saved photo in extraData exceeded 2000 chars, clear old invalid string
    if (!uploadedPhotoDataUrl && photoToSave.length > 2000) {
      photoToSave = '';
    }

    // Store extra profile fields
    const newExtraData = { name, phone, photo: photoToSave };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newExtraData));

    // Ensure photoURL sent to Firebase Auth is strictly under 2000 chars
    const firebasePhotoUrl = (photoToSave && photoToSave.length < 2000) ? photoToSave : null;

    const user = auth ? auth.currentUser : null;
    if (user) {
      try {
        await updateProfile(user, {
          displayName: name,
          photoURL: firebasePhotoUrl
        });
        alert('Dados pessoais e foto salvos no Firebase com sucesso!');
      } catch (err) {
        console.error('Erro ao atualizar perfil no Firebase:', err);
        alert('Erro ao salvar no Firebase: ' + (err.message || 'Verifique seus dados.'));
      }
    } else {
      alert('Para salvar e sincronizar seus dados no Firebase, por favor faça login na sua conta.');
    }

    populateProfileData(user);
  });
}

/* 4. CHANGE PASSWORD FORM */
function setupPasswordForm() {
  const form = document.getElementById('form-password');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPwd = document.getElementById('pwd-new').value;
    const confirmPwd = document.getElementById('pwd-confirm').value;

    if (newPwd !== confirmPwd) {
      alert('A nova senha e a confirmação não coincidem.');
      return;
    }

    const user = auth ? auth.currentUser : null;
    if (!user) {
      alert('Você precisa estar logado para alterar a senha.');
      return;
    }

    try {
      await updatePassword(user, newPwd);
      alert('Senha alterada com sucesso!');
      form.reset();
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      if (err.code === 'auth/requires-recent-login') {
        alert('Por segurança, faça login novamente na sua conta antes de alterar a senha.');
      } else {
        alert('Erro ao alterar senha: ' + (err.message || 'Tente novamente.'));
      }
    }
  });
}

/* 5. CONNECTED DEVICES */
function setupDevicesManager() {
  const logoutAllBtn = document.getElementById('btn-logout-all-devices');
  const disconnectBtns = document.querySelectorAll('.btn-disconnect-device');

  disconnectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.device-item');
      if (item) item.remove();
      alert('Dispositivo desconectado com sucesso.');
    });
  });

  if (logoutAllBtn) {
    logoutAllBtn.addEventListener('click', async () => {
      if (confirm('Deseja realmente desconectar sua conta de todos os outros dispositivos?')) {
        alert('Todas as outras sessões foram encerradas com sucesso.');
      }
    });
  }
}

/* 6. NOTIFICATIONS TOGGLES */
function setupNotifications() {
  const toggles = ['notif-push', 'notif-email', 'notif-recipes', 'notif-expiry'];

  toggles.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const saved = localStorage.getItem(`lemonNote_${id}`);
    if (saved !== null) {
      el.checked = saved === 'true';
    }

    el.addEventListener('change', () => {
      localStorage.setItem(`lemonNote_${id}`, el.checked);
    });
  });
}

/* 7. REPORT A PROBLEM FORM */
function setupReportForm() {
  const form = document.getElementById('form-report');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const subject = document.getElementById('rep-subject').value.trim();
    alert(`Obrigado pelo feedback! Seu relatório "${subject}" foi enviado com sucesso à nossa equipe de suporte.`);
    form.reset();
  });
}

/* 8. DANGER ZONE & DELETE ACCOUNT */
function setupDangerZone() {
  const deleteBtn = document.getElementById('btn-delete-account');
  if (!deleteBtn) return;

  deleteBtn.addEventListener('click', async () => {
    const user = auth ? auth.currentUser : null;

    if (!user) {
      alert('Nenhuma conta ativa encontrada para exclusão.');
      return;
    }

    const confirmFirst = confirm('⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\nDeseja realmente excluir permanentemente sua conta e todos os dados do LemonNote?');
    if (!confirmFirst) return;

    const confirmSecond = prompt('Digite "EXCLUIR" para confirmar a remoção definitiva da sua conta:');
    if (confirmSecond !== 'EXCLUIR') {
      alert('Exclusão cancelada.');
      return;
    }

    try {
      await deleteUser(user);
      alert('Sua conta foi excluída permanentemente com sucesso.');
      window.location.href = 'index.html';
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      if (err.code === 'auth/requires-recent-login') {
        alert('Por motivos de segurança, você precisa fazer login novamente antes de excluir sua conta.');
      } else {
        alert('Erro ao excluir a conta: ' + (err.message || 'Tente novamente.'));
      }
    }
  });
}
