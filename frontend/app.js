// MAROTHOLI LES-POT - app.js - FULL REPLACE
const SUPABASE_URL = "https://mmkxiniybctmgoozaecp.supabase.co";
const SUPABASE_KEY = "sb_publishable_wWhjXCZ4JWfGlCIG95kzPg_WXqzfVDP";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.sb = sb;

// ---------- LOGIN / REGISTER UI ----------
function showLogin(){
  const reg = document.getElementById('regCard');
  const log = document.getElementById('loginCard');
  if(reg) reg.classList.add('hidden');
  if(log) log.classList.remove('hidden');
}
function showReg(){
  const reg = document.getElementById('regCard');
  const log = document.getElementById('loginCard');
  if(log) log.classList.add('hidden');
  if(reg) reg.classList.remove('hidden');
}

// ---------- REGISTER ----------
async function doRegister(){
  const name = document.getElementById('rName')?.value.trim();
  const phone = document.getElementById('rPhone')?.value.trim();
  const country = document.getElementById('rCountry')?.value;
  const gender = document.getElementById('rGender')?.value;
  const email = document.getElementById('rEmail')?.value.trim();
  const pass = document.getElementById('rPass')?.value;
  const q = document.getElementById('rQ')?.value;
  const ans = document.getElementById('rA')?.value.trim();
  const msg = document.getElementById('rMsg');
  const say = (t)=>{ if(msg) msg.textContent = t; };

  if(!name || !phone || !gender || !email || !pass || !ans){ say("Fill ALL fields. Real info please."); return; }
  const clean = phone.replace(/\D/g, '');
  if(clean.length !== 8){ say("Lesotho number must be 8 digits, e.g. 59812345"); return; }

  say("Creating account...");
  const { data, error } = await sb.auth.signUp({ email, password: pass });
  if(error){ say(error.message); return; }

  const user = data.user;
  if(user){
    // Create profile row
    await sb.from('profiles').upsert({
      id: user.id,
      email: email,
      name: name,
      phone: clean,
      country: country,
      gender: gender,
      security_q: q,
      security_a: ans,
      is_admin: false
    });
  }
  say("✅ Account created! Now login.");
  showLogin();
}

// ---------- LOGIN ----------
async function doLogin(){
  const email = document.getElementById('lEmail')?.value.trim() || document.getElementById('loginEmail')?.value.trim();
  const pass = document.getElementById('lPass')?.value || document.getElementById('loginPass')?.value;
  const msg = document.getElementById('lMsg') || document.getElementById('loginMsg');
  const say = (t)=>{ if(msg) msg.textContent = t; };
  if(!email || !pass){ say("Enter email + password"); return; }
  say("Logging in...");
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if(error){ say(error.message); return; }
  say("✅ Logged in! Redirecting...");
  location.href = 'discover.html';
}

// ---------- LOGOUT ----------
async function doLogout(){
  await sb.auth.signOut();
  location.href = 'auth.html';
}

// ---------- HELPERS USED BY OTHER PAGES ----------
async function getCurrentUser(){
  const { data: { user } } = await sb.auth.getUser();
  return user;
}
async function isAdmin(){
  const user = await getCurrentUser();
  if(!user) return false;
  const { data } = await sb.from('profiles').select('is_admin').eq('id', user.id).single();
  return data?.is_admin === true;
}