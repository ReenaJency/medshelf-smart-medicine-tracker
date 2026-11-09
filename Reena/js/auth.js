/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Authentication Client Logic (frontend/js/auth.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check URL parameters for flash messages and pre-filled email
  const urlParams = new URLSearchParams(window.location.search);
  const alertBox = document.getElementById('auth-alert');
  const emailInput = document.getElementById('email');

  if (urlParams.get('registered') === '1' && alertBox) {
    showAlert('Account created successfully! Your shelf is initialized (0 items). Please sign in.', 'success');
  } else if (urlParams.get('expired') === '1' && alertBox) {
    showAlert('Your session has expired. Please sign in again.', 'error');
  }

  // Pre-fill email if passed in query string (e.g. from registration redirect)
  if (urlParams.get('email') && emailInput) {
    emailInput.value = urlParams.get('email');
    const pwdInput = document.getElementById('password');
    if (pwdInput) pwdInput.focus();
  }

  // Show status banner if an active session exists
  const currentUser = MedShelfAPI.getUser();
  const loggedInBanner = document.getElementById('logged-in-banner');
  const loggedInUserName = document.getElementById('logged-in-user-name');

  if (currentUser && loggedInBanner) {
    if (loggedInUserName) {
      loggedInUserName.textContent = currentUser.fullName || 'Reena';
    }
    loggedInBanner.style.display = 'block';

    // If no email was pre-filled, prefill with current user's email
    if (emailInput && !emailInput.value) {
      emailInput.value = currentUser.email || 'reena@medshelf.com';
    }
  }

  // Handle Switch Account / Sign Out from Login Screen
  const btnSwitchAccount = document.getElementById('btn-switch-account');
  if (btnSwitchAccount) {
    btnSwitchAccount.addEventListener('click', (e) => {
      e.preventDefault();
      MedShelfAPI.clearSession();
      if (loggedInBanner) loggedInBanner.style.display = 'none';
      if (emailInput) emailInput.value = '';
      const pwdInput = document.getElementById('password');
      if (pwdInput) pwdInput.value = '';
      showAlert('Signed out of previous session. Please sign in or register below.', 'info');
    });
  }

  // Bind Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Bind Registration Form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Password Visibility Toggles
  document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🙈';
        } else {
          input.type = 'password';
          btn.textContent = '👁️';
        }
      }
    });
  });

  // Demo Account Quick Fill Button
  const btnDemoLogin = document.getElementById('btn-demo-login');
  if (btnDemoLogin) {
    btnDemoLogin.addEventListener('click', handleDemoLogin);
  }

  // Forgot Password Modal
  const forgotLink = document.getElementById('link-forgot-password');
  const forgotModal = document.getElementById('forgot-modal');
  const forgotForm = document.getElementById('forgot-form');

  if (forgotLink && forgotModal) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      forgotModal.classList.add('modal-open');
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('modal-open'));
    });
  });

  if (forgotForm) {
    forgotForm.addEventListener('submit', handlePasswordReset);
  }
});

/**
 * Display Alert Message
 */
function showAlert(message, type = 'error') {
  const alertBox = document.getElementById('auth-alert');
  if (!alertBox) return;

  alertBox.className = `alert-box alert-${type}`;
  alertBox.textContent = message;
  alertBox.style.display = 'block';
}

function clearAlert() {
  const alertBox = document.getElementById('auth-alert');
  if (alertBox) {
    alertBox.style.display = 'none';
    alertBox.textContent = '';
  }
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.form-input').forEach(el => el.classList.remove('is-invalid'));
}

/**
 * Handle Login Submission
 */
async function handleLogin(e) {
  e.preventDefault();
  clearAlert();

  const emailInput = document.getElementById('email');
  const pwdInput = document.getElementById('password');
  const submitBtn = document.getElementById('btn-submit-login');

  const email = emailInput.value.trim();
  const password = pwdInput.value;

  if (!email) {
    showFieldError('email', 'Email address is required.');
    return;
  }
  if (!password) {
    showFieldError('password', 'Password is required.');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    const data = await MedShelfAPI.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.success) {
      MedShelfAPI.setSession(data.token, data.user);
      showAlert('Login successful! Redirecting to your dashboard...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);
    } else {
      showAlert(data.message || 'Login failed. Please check your credentials.');
    }
  } catch (err) {
    showAlert(err.message || 'Login failed.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
}

/**
 * Handle Registration Submission
 */
async function handleRegister(e) {
  e.preventDefault();
  clearAlert();

  const nameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const pwdInput = document.getElementById('password');
  const confirmPwdInput = document.getElementById('confirmPassword');
  const submitBtn = document.getElementById('btn-submit-register');

  const fullName = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = pwdInput.value;
  const confirmPassword = confirmPwdInput.value;

  let isValid = true;

  if (!fullName || fullName.length < 2) {
    showFieldError('fullName', 'Full name is required (minimum 2 characters).');
    isValid = false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showFieldError('email', 'Please enter a valid email address.');
    isValid = false;
  }

  if (!password || password.length < 6) {
    showFieldError('password', 'Password must be at least 6 characters.');
    isValid = false;
  }

  if (password !== confirmPassword) {
    showFieldError('confirmPassword', 'Passwords do not match.');
    isValid = false;
  }

  if (!isValid) return;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    const data = await MedShelfAPI.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName,
        email,
        password,
        confirmPassword
      })
    });

    if (data.success) {
      showAlert('Registration successful! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = `login.html?registered=1&email=${encodeURIComponent(email)}`;
      }, 800);
    } else {
      showAlert(data.message || 'Registration failed.');
    }
  } catch (err) {
    showAlert(err.message || 'Registration failed.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
}

/**
 * Handle Password Reset
 */
async function handlePasswordReset(e) {
  e.preventDefault();
  const emailInput = document.getElementById('reset-email');
  const pwdInput = document.getElementById('reset-password');
  const confirmInput = document.getElementById('reset-confirm');
  const alertSpan = document.getElementById('reset-alert');

  const email = emailInput.value.trim();
  const newPassword = pwdInput.value;
  const confirmPassword = confirmInput.value;

  if (!email || !newPassword) {
    alertSpan.textContent = 'Please fill out all fields.';
    return;
  }
  if (newPassword.length < 6) {
    alertSpan.textContent = 'Password must be at least 6 characters.';
    return;
  }
  if (newPassword !== confirmPassword) {
    alertSpan.textContent = 'Passwords do not match.';
    return;
  }

  try {
    alertSpan.textContent = 'Resetting password...';
    const data = await MedShelfAPI.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword, confirmPassword })
    });

    if (data.success) {
      alert(data.message);
      document.getElementById('forgot-modal').classList.remove('modal-open');
    }
  } catch (err) {
    alertSpan.textContent = err.message;
  }
}

/**
 * Quick Demo Account Handler
 * Automatically logs into or provisions a demo account for review
 */
async function handleDemoLogin() {
  clearAlert();
  const emailInput = document.getElementById('email');
  const pwdInput = document.getElementById('password');

  const demoEmail = 'reena@medshelf.com';
  const demoPass = 'password123';

  emailInput.value = demoEmail;
  pwdInput.value = demoPass;

  try {
    // Attempt login first
    const data = await MedShelfAPI.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: demoEmail, password: demoPass })
    });

    if (data.success) {
      MedShelfAPI.setSession(data.token, data.user);
      showAlert('Welcome Reena! Loading your medicine shelf...', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 400);
      return;
    }
  } catch (loginErr) {
    // If user does not exist yet, register Reena automatically!
    try {
      await MedShelfAPI.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Reena',
          email: demoEmail,
          password: demoPass,
          confirmPassword: demoPass
        })
      });

      // Now log in
      const data = await MedShelfAPI.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: demoEmail, password: demoPass })
      });

      if (data.success) {
        MedShelfAPI.setSession(data.token, data.user);
        showAlert('Welcome Reena! Shelf initialized. Redirecting...', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 400);
      }
    } catch (regErr) {
      showAlert('Failed to sign in as Reena: ' + regErr.message);
    }
  }
}

function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errSpan = document.getElementById(`${fieldId}-error`);
  if (input) input.classList.add('is-invalid');
  if (errSpan) errSpan.textContent = message;
}
