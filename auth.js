// =============================================
//  ORBIT — Auth Module
//  Login con Google via Supabase OAuth
// =============================================

import { supabase } from './supabase.js';

// ── ESTADO GLOBAL DE SESIÓN ──
export let currentUser = null;

// ── LOGIN CON GOOGLE ──
export async function loginConGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) {
    console.error('Error al iniciar sesión:', error.message);
    throw error;
  }
}

// ── CERRAR SESIÓN ──
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Error al cerrar sesión:', error.message);
  currentUser = null;
  showLoginScreen();
}

// ── ESCUCHAR CAMBIOS DE SESIÓN ──
// Llama a esto una sola vez al iniciar la app
export function initAuth(onLogin, onLogout) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      currentUser = session.user;
      console.log('✅ Usuario logueado:', currentUser.email);
      await onLogin(currentUser);
    } else {
      currentUser = null;
      onLogout();
    }
  });

  // Recuperar sesión existente al recargar la página
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      currentUser = session.user;
      onLogin(currentUser);
    } else {
      onLogout();
    }
  });
}

// ── OBTENER USUARIO ACTUAL ──
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── PANTALLA DE LOGIN ──
// Inyecta la pantalla de login en el DOM
export function showLoginScreen() {
  const existing = document.getElementById('login-screen');
  if (existing) return;

  const screen = document.createElement('div');
  screen.id = 'login-screen';
  screen.style.cssText = `
    position:fixed;inset:0;
    background:#06080f;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    z-index:9999;gap:24px;
    background-image:
      radial-gradient(ellipse at 20% 30%,rgba(26,108,255,.08) 0%,transparent 50%),
      radial-gradient(ellipse at 80% 70%,rgba(204,93,232,.05) 0%,transparent 50%);
  `;
  screen.innerHTML = `
    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px">
      <div style="width:10px;height:10px;border-radius:50%;background:#1a6cff;box-shadow:0 0 14px #1a6cff;margin-bottom:8px;animation:pulse 2.5s ease-in-out infinite"></div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:2rem;font-weight:700;letter-spacing:.16em;color:#e8edf5">ORBIT</div>
      <div style="font-size:.82rem;color:#3d5068;letter-spacing:.1em;text-transform:uppercase">Task Manager</div>
    </div>
    <div style="background:#0c1120;border:1px solid #1e2d45;border-radius:16px;padding:32px;width:100%;max-width:340px;display:flex;flex-direction:column;gap:16px;text-align:center">
      <div style="font-size:1rem;font-weight:600;color:#e8edf5">Bienvenido de vuelta</div>
      <div style="font-size:.82rem;color:#7a8fa8">Inicia sesión para acceder a tus tareas desde cualquier dispositivo.</div>
      <button id="google-login-btn" style="
        display:flex;align-items:center;justify-content:center;gap:10px;
        background:#ffffff;color:#1a1a1a;border:none;border-radius:10px;
        padding:12px 20px;font-size:.88rem;font-weight:600;cursor:pointer;
        transition:transform .15s,box-shadow .15s;font-family:'Inter',sans-serif;
      ">
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
          <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continuar con Google
      </button>
      <div style="font-size:.72rem;color:#3d5068">Al continuar, aceptas los términos de uso de ORBIT.</div>
    </div>
    <style>
      @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.6)}}
      #google-login-btn:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(255,255,255,.15)}
    </style>
  `;

  document.body.appendChild(screen);
  document.getElementById('google-login-btn').addEventListener('click', loginConGoogle);
}

export function hideLoginScreen() {
  const screen = document.getElementById('login-screen');
  if (screen) {
    screen.style.opacity = '0';
    screen.style.transition = 'opacity .3s ease';
    setTimeout(() => screen.remove(), 300);
  }
}
