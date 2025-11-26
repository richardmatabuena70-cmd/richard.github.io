/* app.js
   Client-only multi-user system with localStorage and SHA-256 hashing.
   Note: for production, always use secure server-side auth.
*/

/* ---------- UTIL: crypto hash (SHA-256) ---------- */
async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // convert to hex
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}

/* ---------- STORAGE HELPERS ---------- */
const STORAGE_KEY = 'demoUsers_v1'; // stores array of user objects
const STATE_KEY = 'demoAuthState_v1'; // {currentUsername: string|null}

function loadAllUsers() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}
function saveAllUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}
function loadAuthState() {
  const raw = localStorage.getItem(STATE_KEY);
  return raw ? JSON.parse(raw) : {currentUsername: null};
}
function saveAuthState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/* ---------- UI elements ---------- */
const contentEl = document.getElementById('content');
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');
const usersContainer = document.getElementById('usersContainer');
const showRegisterBtn = document.getElementById('showRegister');
const currentUserDisplay = document.getElementById('currentUserDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const openProfileBtn = document.getElementById('openProfile');

/* ---------- initial wiring ---------- */
toggleBtn.addEventListener('click', ()=> sidebar.classList.toggle('collapsed'));
showRegisterBtn.addEventListener('click', renderRegister);
logoutBtn.addEventListener('click', () => {
  const st = loadAuthState(); st.currentUsername = null; saveAuthState(st); renderApp();
});
openProfileBtn.addEventListener('click', ()=> {
  const st = loadAuthState();
  if (st.currentUsername) renderProfileEditor(st.currentUsername);
  else renderLogin();
});

/* nav items */
document.querySelectorAll('.sidebar nav li[data-page]').forEach(li=>{
  li.addEventListener('click', ()=>{
    const page = li.dataset.page;
    renderPage(page);
  });
});

/* ---------- render functions ---------- */
function renderApp() {
  renderUserList();
  const st = loadAuthState();
  if (st.currentUsername) {
    currentUserDisplay.textContent = `Signed in: ${st.currentUsername}`;
    logoutBtn.hidden = false;
  } else {
    currentUserDisplay.textContent = 'Not signed in';
    logoutBtn.hidden = true;
  }
  renderHome();
}

function renderHome() {
  contentEl.innerHTML = `<h2>Welcome</h2><p>Content Page — choose a menu item.</p>`;
}

/* Render content pages */
function renderPage(name) {
  contentEl.innerHTML = `<h2>${capitalize(name)}</h2><p>This is the ${name} page.</p>`;
}

/* Users list UI */
function renderUserList() {
  const users = loadAllUsers();
  usersContainer.innerHTML = '';
  if (users.length === 0) {
    usersContainer.innerHTML = `<div class="hint">No accounts yet. Click "Register user".</div>`;
    return;
  }
  users.forEach(u=>{
    const card = document.createElement('div');
    card.className = 'user-card';
    card.innerHTML = `
      <img src="${u.avatar || getSampleAvatar()}" alt="a">
      <div class="meta">
        <div><b>${u.username}</b></div>
        <div class="hint">${u.email || ''}</div>
      </div>
    `;
    card.addEventListener('click', ()=> {
      // quick switch: attempt to sign in without password? we show login with username pre-filled.
      renderLogin(u.username);
    });
    usersContainer.appendChild(card);
  });
}

/* ---------- Register & Login UIs ---------- */

function renderRegister() {
  contentEl.innerHTML = `
    <h2>Register new user</h2>
    <div class="form-row">
      <label>Username</label>
      <input id="regUser" class="input" placeholder="username (unique)">
    </div>
    <div class="form-row">
      <label>Email</label>
      <input id="regEmail" class="input" placeholder="email (optional)">
    </div>
    <div class="form-row">
      <label>Password</label>
      <input id="regPass" type="password" class="input" placeholder="password">
    </div>
    <div class="form-row">
      <label>Avatar (optional)</label>
      <div class="row">
        <img id="regAvatarPreview" class="avatar-preview" src="${getSampleAvatar()}" alt="">
        <input id="regAvatarInput" type="file" accept="image/*">
      </div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn-primary" id="doRegister">Create account</button>
      <button class="btn-ghost" id="cancelRegister">Cancel</button>
    </div>
    <p class="hint">Tip: This demo stores accounts in localStorage. For real apps use a secure server backend.</p>
  `;

  // avatar input handler
  document.getElementById('regAvatarInput').addEventListener('change', async (e)=>{
    const f = e.target.files[0];
    if (!f) return;
    const data = await fileToDataURL(f);
    document.getElementById('regAvatarPreview').src = data;
  });

  document.getElementById('cancelRegister').addEventListener('click', renderApp);
  document.getElementById('doRegister').addEventListener('click', async ()=>{
    const username = document.getElementById('regUser').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const avatar = document.getElementById('regAvatarPreview').src || null;

    if (!username || !pass) { alert('Provide username and password'); return; }

    const users = loadAllUsers();
    if (users.some(u=>u.username.toLowerCase()===username.toLowerCase())) {
      alert('Username already exists. Choose another.');
      return;
    }

    const passHash = await hashPassword(pass);

    users.push({
      username,
      email,
      passwordHash: passHash,
      avatar
    });
    saveAllUsers(users);
    // auto sign-in
    saveAuthState({currentUsername: username});
    renderApp();
  });
}

function renderLogin(prefillUsername = '') {
  contentEl.innerHTML = `
    <h2>Login</h2>
    <div class="form-row"><label>Username</label><input id="loginUser" class="input" value="${escapeHtml(prefillUsername)}" placeholder="username"></div>
    <div class="form-row"><label>Password</label><input id="loginPass" type="password" class="input" placeholder="password"></div>
    <div style="display:flex;gap:10px">
      <button class="btn-primary" id="doLogin">Sign In</button>
      <button class="btn-ghost" id="toRegister">Register</button>
    </div>
    <p class="hint">If you forgot password, this demo cannot recover it — it's client-side only.</p>
  `;
  document.getElementById('toRegister').addEventListener('click', renderRegister);
  document.getElementById('doLogin').addEventListener('click', async ()=>{
    const username = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    if (!username || !pass) { alert('Enter both'); return; }
    const users = loadAllUsers();
    const user = users.find(u=>u.username.toLowerCase()===username.toLowerCase());
    if (!user) { alert('No such user'); return; }
    const passHash = await hashPassword(pass);
    if (passHash === user.passwordHash) {
      saveAuthState({currentUsername: user.username});
      renderApp();
    } else {
      alert('Incorrect password');
    }
  });
}

/* ---------- Profile editor (protected) ---------- */
function renderProfileEditor(username) {
  const users = loadAllUsers();
  const user = users.find(u=>u.username===username);
  if (!user) { alert('User not found'); renderApp(); return; }

  contentEl.innerHTML = `
    <h2>Edit Profile — ${escapeHtml(user.username)}</h2>
    <div class="row">
      <img id="profAvatar" class="avatar-preview" src="${user.avatar || getSampleAvatar()}" alt="avatar">
      <div style="flex:1">
        <div class="form-row">
          <label>Name (username)</label>
          <input id="profUsername" class="input" value="${escapeHtml(user.username)}" disabled>
        </div>
        <div class="form-row">
          <label>Email</label>
          <input id="profEmail" class="input" value="${escapeHtml(user.email||'')}">
        </div>
        <div class="form-row">
          <label>Change password (leave blank to keep)</label>
          <input id="profPass" type="password" class="input" placeholder="new password">
        </div>
        <div class="form-row">
          <label>Avatar</label>
          <input id="profAvatarInput" type="file" accept="image/*">
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn-primary" id="saveProfileBtn">Save</button>
          <button class="btn-ghost" id="deleteAccountBtn">Delete account</button>
        </div>
      </div>
    </div>
    <p class="hint">Avatar is stored as data URL in localStorage; this is fine for small images only.</p>
  `;

  // avatar input
  document.getElementById('profAvatarInput').addEventListener('change', async (e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const data = await fileToDataURL(file);
    document.getElementById('profAvatar').src = data;
  });

  document.getElementById('saveProfileBtn').addEventListener('click', async ()=>{
    const email = document.getElementById('profEmail').value.trim();
    const newPass = document.getElementById('profPass').value;
    const avatar = document.getElementById('profAvatar').src;

    if (!confirm('Save profile changes?')) return;

    // update store
    const all = loadAllUsers();
    const idx = all.findIndex(u=>u.username===user.username);
    if (idx<0) { alert('User not found'); return; }

    all[idx].email = email;
    if (newPass) {
      all[idx].passwordHash = await hashPassword(newPass);
    }
    all[idx].avatar = avatar;
    saveAllUsers(all);
    alert('Saved.');
    renderApp();
  });

  document.getElementById('deleteAccountBtn').addEventListener('click', ()=>{
    if (!confirm('Delete this account? This cannot be undone in this demo.')) return;
    let all = loadAllUsers();
    all = all.filter(u=>u.username !== user.username);
    saveAllUsers(all);
    saveAuthState({currentUsername: null});
    renderApp();
  });
}

/* ---------- helpers ---------- */
function capitalize(s){return s.charAt(0).toUpperCase() + s.slice(1)}
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function getSampleAvatar(){
  // default / sample image (replace with uploaded file path if you want)
  // Uploaded image path you provided: /mnt/data/cf82a3bb-ba0a-4609-8839-49e4e0a03804.jpg
  return '/mnt/data/cf82a3bb-ba0a-4609-8839-49e4e0a03804.jpg';
}
function fileToDataURL(file){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

/* ---------- kick off ---------- */
renderApp();
