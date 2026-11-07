// ============================================
// LES-POT - MAROTHOLI GRINDERS - app.js FULL
// FIXED FOR REAL COLUMNS: profiles.grind_balance, profiles.full_name
// USES SUPABASE PUBLISHABLE KEY
// ============================================
const SUPABASE_URL = "https://mmkxiniybctmgoozaecp.supabase.co";
const SUPABASE_KEY = "sb_publishable_wWhjXCZ4JWfGlCIG95kzPg_WXqzfVDP";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// ---------- AUTH / USER ----------
async function getCurrentUser(){
  const { data } = await sb.auth.getUser();
  return data?.user || null;
}
async function getMyProfile(){
  const user = await getCurrentUser();
  if(!user) return { user:null, profile:null };
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
  return { user, profile: data };
}
async function loadBalanceBadge(){
  const el = document.getElementById('bal');
  if(!el) return;
  const { user, profile } = await getMyProfile();
  if(!user){ el.textContent = 'G 0.00'; return; }
  el.textContent = Number(profile?.grind_balance || 0).toFixed(2) + ' G';
}
async function loadWallet(){
  const { user, profile } = await getMyProfile();
  const balEl = document.getElementById('walletBalance') || document.getElementById('bal');
  if(balEl && profile) balEl.textContent = Number(profile.grind_balance || 0).toFixed(2) + ' G';
  if(user) loadMyDeposits(user.id);
  if(user) loadMyWithdrawals(user.id);
}

// ---------- HELPERS ----------
function getUserIdFromRow(row){
  return row.user_id || row.fan_id || null;
}
function getAmountFromRow(row){
  return Number(row.amount_grind || row.price_grind || 0);
}

// ---------- DEPOSITS ----------
async function submitDeposit(amount, method, reference){
  const user = await getCurrentUser();
  if(!user){ alert('Login first'); location.href='auth.html'; return; }
  amount = Number(amount);
  if(!amount || amount <= 0){ alert('Enter amount'); return; }
  if(!reference){ alert('Paste OTP / Reference'); return; }
  const { error } = await sb.from('deposits').insert({
    user_id: user.id,
    amount_grind: amount,
    pay_method: method,
    pay_reference: reference,
    status: 'pending'
  });
  if(error){ alert('Deposit failed: '+error.message); return; }
  alert('✅ Deposit sent! Wait for Admin approval.');
  location.reload();
}
window.submitDeposit = submitDeposit;

async function approveDeposit(depositId){
  const { data: dep, error } = await sb.from('deposits').select('*').eq('id', depositId).single();
  if(error || !dep){ alert('Deposit not found'); return; }
  if(dep.status === 'approved'){ alert('Already approved'); return; }
  const userId = getUserIdFromRow(dep);
  const amount = getAmountFromRow(dep);
  if(!userId || !amount){ alert('Deposit missing user/amount'); return; }
  const { data: prof } = await sb.from('profiles').select('grind_balance').eq('id', userId).single();
  const bal = Number(prof?.grind_balance || 0);
  const { error: updErr } = await sb.from('profiles').update({ grind_balance: bal + amount }).eq('id', userId);
  if(updErr){ alert('Credit failed: '+updErr.message); return; }
  await sb.from('deposits').update({ status: 'approved' }).eq('id', depositId);
  alert(`✅ Deposit APPROVED. +${amount} G credited. New balance: ${(bal+amount).toFixed(2)} G`);
  location.reload();
}
window.approveDeposit = approveDeposit;

async function rejectDeposit(depositId){
  await sb.from('deposits').update({ status: 'rejected' }).eq('id', depositId);
  alert('Deposit rejected. Balance NOT credited.');
  location.reload();
}
window.rejectDeposit = rejectDeposit;

async function loadMyDeposits(userId){
  const el = document.getElementById('myDeposits');
  if(!el) return;
  const { data } = await sb.from('deposits').select('*').eq('user_id', userId).order('created_at',{ascending:false}).limit(20);
  if(!data || data.length===0){ el.innerHTML='<p class="small">No deposits yet.</p>'; return; }
  el.innerHTML = data.map(d=>`<div class="card" style="padding:10px"><b>+${getAmountFromRow(d)} G</b> • ${d.pay_method||''} • ${d.pay_reference||''} • <span>${d.status}</span></div>`).join('');
}

// ---------- WITHDRAWALS ----------
async function submitWithdrawal(amount, method, number){
  const user = await getCurrentUser();
  if(!user){ alert('Login first'); return; }
  amount = Number(amount);
  if(!amount || amount < 2.5){ alert('Minimum withdrawal is 2.5 G (M25)'); return; }
  if(!number){ alert('Enter Mpesa / EcoCash number'); return; }
  const { data: prof } = await sb.from('profiles').select('grind_balance').eq('id', user.id).single();
  const bal = Number(prof?.grind_balance || 0);
  if(bal < amount){ alert(`Not enough balance. You have ${bal.toFixed(2)} G, need ${amount} G`); return; }
  const { error } = await sb.from('withdrawals').insert({
    user_id: user.id,
    amount_grind: amount,
    pay_method: method,
    phone: number,
    status: 'pending'
  });
  if(error){ alert('Withdrawal failed: '+error.message); return; }
  alert('✅ Withdrawal sent! Wait for Admin approval. Balance will drop after approval.');
  location.reload();
}
window.submitWithdrawal = submitWithdrawal;
window.requestWithdrawal = submitWithdrawal;

async function approveWithdrawal(withdrawalId){
  const { data: wd, error } = await sb.from('withdrawals').select('*').eq('id', withdrawalId).single();
  if(error || !wd){ alert('Withdrawal not found: '+(error?.message||'')); return; }
  if(wd.status === 'approved'){ alert('Already approved'); return; }
  if(wd.status === 'rejected'){ alert('Already rejected'); return; }
  const userId = getUserIdFromRow(wd);
  const amount = getAmountFromRow(wd);
  if(!userId || !amount){ alert('Withdrawal missing user/amount'); return; }
  const { data: prof } = await sb.from('profiles').select('grind_balance').eq('id', userId).single();
  const bal = Number(prof?.grind_balance || 0);
  if(bal < amount){ alert(`Cannot approve. User has ${bal} G but wants ${amount} G`); return; }
  const { error: dErr } = await sb.from('profiles').update({ grind_balance: bal - amount }).eq('id', userId);
  if(dErr){ alert('Deduct failed: '+dErr.message); return; }
  await sb.from('withdrawals').update({ status: 'approved' }).eq('id', withdrawalId);
  alert(`✅ Withdrawal APPROVED. -${amount} G deducted. New balance: ${(bal-amount).toFixed(2)} G. Now pay them M${(amount*10).toFixed(0)} via ${wd.pay_method||'Mpesa'}`);
  location.reload();
}
window.approveWithdrawal = approveWithdrawal;
window.approveWithdraw = approveWithdrawal;
window.approveWithdrawalRequest = approveWithdrawal;

async function rejectWithdrawal(withdrawalId){
  await sb.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawalId);
  alert('Withdrawal rejected. Balance NOT deducted.');
  location.reload();
}
window.rejectWithdrawal = rejectWithdrawal;
window.rejectWithdraw = rejectWithdrawal;

async function loadMyWithdrawals(userId){
  const el = document.getElementById('myWithdrawals');
  if(!el) return;
  const { data } = await sb.from('withdrawals').select('*').eq('user_id', userId).order('created_at',{ascending:false}).limit(20);
  if(!data || data.length===0){ el.innerHTML='<p class="small">No withdrawals yet.</p>'; return; }
  el.innerHTML = data.map(w=>`<div class="card" style="padding:10px"><b>-${getAmountFromRow(w)} G</b> • ${w.pay_method||''} • ${w.phone||''} • <span>${w.status}</span></div>`).join('');
}

// ---------- BUY SONG - WALLET ----------
async function buySongWithWallet(songId, price, artistId){
  const user = await getCurrentUser();
  if(!user){ alert('Login first'); location.href='auth.html'; return; }
  price = Number(price);
  const { data: me } = await sb.from('profiles').select('grind_balance').eq('id', user.id).single();
  const bal = Number(me?.grind_balance || 0);
  if(bal < price){ alert(`Not enough balance. You have ${bal} G, need ${price} G`); return; }
  const { data: already } = await sb.from('purchases').select('id').eq('fan_id', user.id).eq('song_id', songId).maybeSingle();
  if(already){ alert('You already own this. Go to Library.'); return; }
  const { error: dErr } = await sb.from('profiles').update({ grind_balance: bal - price }).eq('id', user.id);
  if(dErr){ alert('Deduct failed: '+dErr.message); return; }
  if(artistId && artistId !== user.id){
    const { data: artist } = await sb.from('profiles').select('grind_balance').eq('id', artistId).single();
    const royalty = price * 0.63;
    await sb.from('profiles').update({ grind_balance: Number(artist?.grind_balance||0) + royalty }).eq('id', artistId);
  }
  const { error: pErr } = await sb.from('purchases').insert({
    fan_id: user.id,
    song_id: songId,
    price_grind: price,
    pay_method: 'Wallet',
    pay_reference: 'WALLET-'+Date.now(),
    status: 'approved'
  });
  if(pErr){ alert('Purchase save failed: '+pErr.message); return; }
  const { data: s } = await sb.from('songs').select('total_buys').eq('id', songId).single();
  if(s) await sb.from('songs').update({ total_buys: Number(s.total_buys||0)+1 }).eq('id', songId);
  alert(`✅ Bought! -${price} G. New balance: ${(bal-price).toFixed(2)} G`);
  location.href='library.html';
}
window.buySongWithWallet = buySongWithWallet;
window.buySong = buySongWithWallet;

// ---------- LIBRARY ----------
async function loadLibrary(){
  const el = document.getElementById('librarySongs');
  if(!el) return;
  const user = await getCurrentUser();
  if(!user){ el.innerHTML='<p>Login to see Library</p>'; return; }
  const { data: purchases } = await sb.from('purchases').select('song_id,status').eq('fan_id', user.id).eq('status','approved');
  const ids = (purchases||[]).map(p=>p.song_id);
  if(ids.length===0){ el.innerHTML='<p class="small">No songs yet. Go to Discover and Buy.</p>'; return; }
  const { data: songs } = await sb.from('songs').select('*').in('id', ids);
  el.innerHTML = (songs||[]).map(s=>`<div class="card song"><img src="${s.cover_url||''}"><div class="meta"><b>${s.title}</b><small>${s.artist_name}</small></div><audio controls src="${s.audio_url||s.file_url||''}" style="width:100%"></audio></div>`).join('');
}

// ---------- ADMIN ----------
async function loadAdmin(){
  const pendingDepositsEl = document.getElementById('pendingDeposits');
  const pendingWithdrawalsEl = document.getElementById('pendingWithdrawals');
  const pendingPurchasesEl = document.getElementById('pendingPurchases');
  const pendingSongsEl = document.getElementById('pendingSongs');

  async function getUserLabels(rows){
    const ids = [...new Set(rows.map(r => getUserIdFromRow(r)).filter(Boolean))];
    if(ids.length === 0) return {};
    const { data: profiles } = await sb.from('profiles').select('id, full_name, email').in('id', ids);
    const map = {};
    (profiles||[]).forEach(p=>{
      const name = p.full_name || 'No Name';
      map[p.id] = `${name} - ${p.email || 'no email'}`;
    });
    return map;
  }

  if(pendingDepositsEl){
    const { data } = await sb.from('deposits').select('*').eq('status','pending').order('created_at',{ascending:false});
    if(!data || data.length===0){
      pendingDepositsEl.innerHTML = '<p class="small">No pending deposits</p>';
    } else {
      const labels = await getUserLabels(data);
      pendingDepositsEl.innerHTML = data.map(d=>{
        const userLabel = labels[getUserIdFromRow(d)] || getUserIdFromRow(d);
        return `<div class="card" style="padding:12px">
          <b style="font-size:18px">+${getAmountFromRow(d)} G</b><br>
          <b>👤 ${userLabel}</b><br>
          <span class="small">${d.pay_method||''} • Ref: ${d.pay_reference||''} • ${new Date(d.created_at).toLocaleString()}</span><br><br>
          <button onclick="approveDeposit('${d.id}')">✅ Approve + Credit</button> 
          <button class="ghost" onclick="rejectDeposit('${d.id}')">Reject</button>
        </div>`;
      }).join('');
    }
  }

  if(pendingWithdrawalsEl){
    const { data } = await sb.from('withdrawals').select('*').eq('status','pending').order('created_at',{ascending:false});
    if(!data || data.length===0){
      pendingWithdrawalsEl.innerHTML = '<p class="small">No pending withdrawals</p>';
    } else {
      const labels = await getUserLabels(data);
      pendingWithdrawalsEl.innerHTML = data.map(w=>{
        const userLabel = labels[getUserIdFromRow(w)] || getUserIdFromRow(w);
        return `<div class="card" style="padding:12px">
          <b style="font-size:18px">-${getAmountFromRow(w)} G (M${(getAmountFromRow(w)*10).toFixed(0)})</b><br>
          <b>👤 ${userLabel}</b><br>
          <span class="small">${w.pay_method||''} • Pay to: ${w.phone||''} • ${new Date(w.created_at).toLocaleString()}</span><br><br>
          <button onclick="approveWithdrawal('${w.id}')">✅ Approve + Deduct</button> 
          <button class="ghost" onclick="rejectWithdrawal('${w.id}')">Reject</button>
        </div>`;
      }).join('');
    }
  }

  if(pendingPurchasesEl){
    const { data } = await sb.from('purchases').select('*').eq('status','pending').order('created_at',{ascending:false});
    if(!data || data.length===0){
      pendingPurchasesEl.innerHTML = '<p class="small">No pending purchases</p>';
    } else {
      const labels = await getUserLabels(data);
      pendingPurchasesEl.innerHTML = data.map(p=>{
        const userLabel = labels[getUserIdFromRow(p)] || getUserIdFromRow(p);
        return `<div class="card" style="padding:12px">
          <b>${p.price_grind} G</b><br>
          <b>👤 ${userLabel}</b><br>
          <span class="small">${p.pay_method} • Ref: ${p.pay_reference} • Song: ${p.song_id?.slice(0,8)}</span><br><br>
          <button onclick="approvePurchase('${p.id}')">Approve Unlock</button> 
          <button class="ghost" onclick="rejectPurchase('${p.id}')">Reject</button>
        </div>`;
      }).join('');
    }
  }

  if(pendingSongsEl){
    const { data } = await sb.from('songs').select('*').eq('status','pending').order('created_at',{ascending:false});
    pendingSongsEl.innerHTML = (!data||data.length===0) ? '<p class="small">No pending songs</p>' : data.map(s=>`<div class="card" style="padding:10px"><b>${s.title}</b> • ${s.artist_name}<br><button onclick="approveSong('${s.id}')">Approve Song</button> <button class="ghost" onclick="rejectSong('${s.id}')">Reject</button></div>`).join('');
  }
}
window.loadAdmin = loadAdmin;

async function approvePurchase(purchaseId){
  const { data: p } = await sb.from('purchases').select('*').eq('id', purchaseId).single();
  if(!p) return;
  await sb.from('purchases').update({ status: 'approved' }).eq('id', purchaseId);
  const { data: song } = await sb.from('songs').select('*').eq('id', p.song_id).single();
  if(song){
    const artistId = song.artist_id || song.user_id || song.owner_id;
    const fanId = getUserIdFromRow(p);
    if(artistId && artistId !== fanId){
      const { data: artist } = await sb.from('profiles').select('grind_balance').eq('id', artistId).single();
      await sb.from('profiles').update({ grind_balance: Number(artist?.grind_balance||0) + Number(p.price_grind||0)*0.63 }).eq('id', artistId);
    }
    await sb.from('songs').update({ total_buys: Number(song.total_buys||0)+1 }).eq('id', song.id);
  }
  alert('Purchase approved, song unlocked, artist paid 63%');
  location.reload();
}
window.approvePurchase = approvePurchase;
async function rejectPurchase(id){ await sb.from('purchases').update({status:'rejected'}).eq('id',id); location.reload(); }
window.rejectPurchase = rejectPurchase;
async function approveSong(id){ await sb.from('songs').update({status:'approved'}).eq('id',id); alert('Song approved'); location.reload(); }
window.approveSong = approveSong;
async function rejectSong(id){ await sb.from('songs').update({status:'rejected'}).eq('id',id); location.reload(); }
window.rejectSong = rejectSong;

// ---------- AUTO LOAD ----------
document.addEventListener('DOMContentLoaded', ()=>{
  loadBalanceBadge();
  if(document.getElementById('walletBalance')) loadWallet();
  if(document.getElementById('pendingDeposits') || document.getElementById('pendingWithdrawals')) loadAdmin();
  if(document.getElementById('librarySongs')) loadLibrary();
});