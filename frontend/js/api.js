/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: API Client & Session Manager (frontend/js/api.js)
 */

const MedShelfAPI = (function () {
  'use strict';

  const TOKEN_KEY = 'medshelf_jwt_token';
  const USER_KEY = 'medshelf_user_data';
  const API_OVERRIDE_KEY = 'medshelf_custom_api_url';

  /**
   * Determine the API Base URL dynamically:
   * 1. If user configured a custom backend URL in settings, use that.
   * 2. If opened via file:// protocol, default to http://localhost:5000/api.
   * 3. If hosted on a server, use relative path '/api'.
   */
  function getBaseUrl() {
    const override = localStorage.getItem(API_OVERRIDE_KEY);
    if (override) return override.replace(/\/+$/, '');

    if (window.location.protocol === 'file:') {
      return 'http://localhost:5000/api';
    }

    return window.location.origin + '/api';
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  }

  function getUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isAuthenticated() {
    return !!getToken();
  }

  /**
   * Guard for protected pages (dashboard.html, medicines.html)
   * Redirects to login.html if not logged in
   */
  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  /**
   * Guard for guest pages (login.html, register.html)
   * Redirects to dashboard.html if already logged in
   */
  function requireGuest() {
    if (isAuthenticated()) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }

  /**
   * Universal fetch wrapper with automatic JWT authorization header
   */
  async function request(endpoint, options = {}) {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized (Expired or invalid token)
      if (response.status === 401) {
        clearSession();
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html')) {
          window.location.href = 'login.html?expired=1';
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Session expired. Please log in again.');
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      // If server is unreachable
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        throw new Error('Cannot connect to MedShelf server. Make sure the backend server is running on http://localhost:5000.');
      }
      throw err;
    }
  }

  return {
    getBaseUrl,
    getToken,
    getUser,
    setSession,
    clearSession,
    isAuthenticated,
    requireAuth,
    requireGuest,
    request
  };
})();
