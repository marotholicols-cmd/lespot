// MAROTHOLI LES-POT - app.js - FULL REPLACE - FIXED
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
window.showLogin = showLogin;
window.showReg = showReg;

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
    // Try to create profile - trigger also does this, upsert is safe
    const { error: pErr } = await sb.from('profiles').upsert({
      id: user.id,
      email: email,
      name: name,
      phone: clean,
      country: country,
      gender: gender,
      security_q: q,
      security_a: ans,
      is_admin: false,
      balance_grind: 0
    }, { onConflict: 'id' });
    if(pErr) console.log('profile upsert (trigger will handle):', pErr.message);
  }
  say("✅ Account created! Check Spam for confirmation, then login.");
  showLogin();
}
window.doRegister = doRegister;

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
window.doLogin = doLogin;

// ---------- LOGOUT ----------
async function doLogout(){
  await sb.auth.signOut();
  location.href = 'auth.html';
}
window.doLogout = doLogout;

// ---------- HELPERS ----------
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
async function getMyProfile(){
  const user = await getCurrentUser();
  if(!user) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
  return data;
}
window.getCurrentUser = getCurrentUser;
window.isAdmin = isAdmin;
window.getMyProfile = getMyProfile;

// ---------- WALLET ----------
async function loadWallet(){
  const balEl = document.getElementById('walletBalance') || document.getElementById('balance') || document.getElementById('balanceGrind');
  const user = await getCurrentUser();
  if(!user){
    if(balEl) balEl.textContent = '0.00 G';
    return;
  }
  const { data } = await sb.from('profiles').select('balance_grind').eq('id', user.id).single();
  const bal = data?.balance_grind ?? 0;
  if(balEl) balEl.textContent = Number(bal).toFixed(2) + ' G';
  // Also update any other balance labels
  document.querySelectorAll('[data-balance]').forEach(el => el.textContent = Number(bal).toFixed(2) + ' G');
  return bal;
}
window.loadWallet = loadWallet;

async function submitDeposit(){
  const amountEl = document.getElementById('depAmount') || document.getElementById('depositAmount');
  const refEl = document.getElementById('depRef') || document.getElementById('depositRef') || document.getElementById('depReference');
  const methodEl = document.getElementById('depMethod') || document.getElementById('depositMethod');
  const msgEl = document.getElementById('depMsg') || document.getElementById('depositMsg');
  const say = (t)=>{ if(msgEl) msgEl.textContent = t; };

  const user = await getCurrentUser();
  if(!user){ say('Please login first'); return; }

  const amount = Number(amountEl?.value);
  const ref = refEl?.value.trim();
  const method = methodEl?.value || 'EcoCash';

  if(!amount || amount <= 0){ say('Enter amount > 0'); return; }
  if(!ref){ say('Enter EcoCash / M-Pesa reference'); return; }

  say('Sending deposit...');
  const { error } = await sb.from('deposits').insert({
    user_id: user.id,
    amount: amount,
    amount_grind: amount,
    reference: ref,
    method: method,
    status: 'pending'
  });
  if(error){ say('Error: ' + error.message); console.log(error); return; }
  say('✅ Deposit sent! Status: PENDING. Admin will approve.');
  if(amountEl) amountEl.value = '';
  if(refEl) refEl.value = '';
  loadWallet();
}
window.submitDeposit = submitDeposit;

async function submitWithdrawal(){
  const amountEl = document.getElementById('withAmount');
  const phoneEl = document.getElementById('withPhone');
  const msgEl = document.getElementById('withMsg');
  const say = (t)=>{ if(msgEl) msgEl.textContent = t; };
  const user = await getCurrentUser();
  if(!user){ say('Login first'); return; }
  const amount = Number(amountEl?.value);
  const phone = phoneEl?.value.trim();
  if(!amount || amount <= 0){ say('Enter amount'); return; }
  const bal = await loadWallet();
  if(amount > bal){ say('Not enough balance'); return; }
  const { error } = await sb.from('withdrawals').insert({
    user_id: user.id,
    amount: amount,
    amount_grind: amount,
    phone: phone,
    status: 'pending'
  });
  if(error){ say(error.message); return; }
  say('✅ Withdrawal requested. Admin will approve.');
}
window.submitWithdrawal = submitWithdrawal;

// ---------- ADMIN - THE FIX ----------
async function approveDeposit(id){
  if(!await isAdmin()){ alert('Admin only'); return; }
  // 1. Get deposit
  const { data: dep, error: getErr } = await sb.from('deposits').select('*').eq('id', id).single();
  if(getErr || !dep){ alert('Deposit not found: ' + (getErr?.message || '')); return; }
  if(dep.status === 'approved'){ alert('Already approved'); return; }

  // Handle both column names: amount_grind OR amount
  const amt = Number(dep.amount_grind ?? dep.amount ?? 0);
  if(!amt){ alert('Deposit amount is 0, cannot credit'); return; }

  // 2. Mark approved FIRST
  const { error: updErr } = await sb.from('deposits').update({ status: 'approved' }).eq('id', id);
  if(updErr){ alert('Could not approve: ' + updErr.message); return; }

  // 3. CREDIT BALANCE - THIS WAS MISSING BEFORE
  const { data: prof, error: profErr } = await sb.from('profiles').select('balance_grind').eq('id', dep.user_id).single();
  if(profErr){ alert('Deposit approved but profile not found: ' + profErr.message); return; }

  const newBal = Number(prof.balance_grind || 0) + amt;
  const { error: balErr } = await sb.from('profiles').update({ balance_grind: newBal }).eq('id', dep.user_id);
  if(balErr){
    alert('Approved but balance failed: ' + balErr.message + ' - Run SQL fix in Supabase');
    return;
  }

  alert(`✅ Approved + Credited ${amt} G to user`);
  if(typeof loadAdmin === 'function') loadAdmin();
  loadWallet();
}
window.approveDeposit = approveDeposit;

async function rejectDeposit(id){
  if(!await isAdmin()) return;
  await sb.from('deposits').update({ status: 'rejected' }).eq('id', id);
  alert('Deposit rejected');
  if(typeof loadAdmin === 'function') loadAdmin();
}
window.rejectDeposit = rejectDeposit;

async function approveWithdrawal(id){
  if(!await isAdmin()) return;
  const { data: w } = await sb.from('withdrawals').select('*').eq('id', id).single();
  if(!w) return;
  const amt = Number(w.amount_grind ?? w.amount ?? 0);
  // Deduct balance on approval
  const { data: prof } = await sb.from('profiles').select('balance_grind').eq('id', w.user_id).single();
  const newBal = Number(prof?.balance_grind || 0) - amt;
  await sb.from('profiles').update({ balance_grind: newBal }).eq('id', w.user_id);
  await sb.from('withdrawals').update({ status: 'approved' }).eq('id', id);
  alert('Withdrawal approved + deducted');
  if(typeof loadAdmin === 'function') loadAdmin();
}
window.approveWithdrawal = approveWithdrawal;

async function loadAdmin(){
  if(!await isAdmin()){
    const el = document.getElementById('adminContent');
    if(el) el.innerHTML = '<p>Admin only. Login as admin.</p>';
    return;
  }
  // Load pending deposits
  const { data: deps } = await sb.from('deposits').select('*, profiles(email)').eq('status', 'pending').order('created_at', { ascending: false });
  const depEl = document.getElementById('pendingDeposits') || document.getElementById('adminDeposits');
  if(depEl){
    if(!deps || deps.length === 0) depEl.innerHTML = '<p>No pending deposits</p>';
    else depEl.innerHTML = deps.map(d => `
      <div style="border:1px solid #333;padding:10px;margin:8px 0;border-radius:8px">
        <b>${d.profiles?.email || d.user_id}</b> — ${d.amount_grind ?? d.amount} G — ${d.method} — Ref: ${d.reference}<br>
        <button onclick="approveDeposit('${d.id}')">Approve + Credit</button>
        <button onclick="rejectDeposit('${d.id}')">Reject</button>
      </div>
    `).join('');
  }
  // Load pending withdrawals
  const { data: withs } = await sb.from('withdrawals').select('*, profiles(email)').eq('status', 'pending').order('created_at', { ascending: false });
  const withEl = document.getElementById('pendingWithdrawals');
  if(withEl){
    if(!withs || withs.length === 0) withEl.innerHTML = '<p>No pending withdrawals</p>';
    else withEl.innerHTML = withs.map(w => `
      <div style="border:1px solid #333;padding:10px;margin:8px 0;border-radius:8px">
        <b>${w.profiles?.email || w.user_id}</b> — ${w.amount_grind ?? w.amount} G — Phone: ${w.phone}<br>
        <button onclick="approveWithdrawal('${w.id}')">Approve</button>
      </div>
    `).join('');
  }
}
window.loadAdmin = loadAdmin;

// ---------- AUTO LOAD ----------
document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('walletBalance') || document.getElementById('balanceGrind') || document.getElementById('balance')) loadWallet();
  if(document.getElementById('pendingDeposits') || document.getElementById('adminDeposits') || document.getElementById('adminContent')) loadAdmin();
});