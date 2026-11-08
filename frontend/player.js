// LES-POT Player - Background + Lock Screen + Notification - FIXED
let audio = new Audio();
let currentSong = null;
let isPreview = false;
let previewTimer = null;

function playSong(url, title, artist, cover, preview = false){
  // Stop old song + clear old preview timer
  if(previewTimer) clearTimeout(previewTimer);
  audio.pause();
  audio.currentTime = 0;

  isPreview = preview;
  audio.src = url;
  audio.play().catch(()=>{ /* user needs to tap play */ });
  currentSong = {title, artist, cover, url};

  // 30s preview lock - same as index.html
  if(preview){
    previewTimer = setTimeout(()=>{
      audio.pause();
      audio.currentTime = 0;
      alert('Preview ended - Buy to hear full song');
    }, 30000);
  }

  // Lock screen / notification controls
  if('mediaSession' in navigator){
    try{
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Les-Pot Song',
        artist: artist || 'Marotholi',
        album: 'Marotholi Les-Pot',
        artwork: [{src: cover || 'icon-192.png', sizes:'512x512', type:'image/png'}]
      });
      navigator.mediaSession.setActionHandler('play', ()=>audio.play());
      navigator.mediaSession.setActionHandler('pause', ()=>audio.pause());
      navigator.mediaSession.setActionHandler('nexttrack', ()=>{ audio.currentTime = Math.min(audio.duration||0, audio.currentTime+10); });
      navigator.mediaSession.setActionHandler('previoustrack', ()=>{ audio.currentTime = Math.max(0, audio.currentTime-10); });
      navigator.mediaSession.setActionHandler('seekto', (e)=>{ if(e.seekTime!=null) audio.currentTime = e.seekTime; });
    }catch(e){}
  }

  const p = document.getElementById('miniPlayer');
  if(p){
    p.classList.remove('hidden');
    const t = document.getElementById('pTitle'); if(t) t.textContent = title;
    const a = document.getElementById('pArtist'); if(a) a.textContent = artist;
    const c = document.getElementById('pCover'); if(c && cover) c.src = cover;
    const btn = document.getElementById('pPlayBtn'); if(btn) btn.textContent = '⏸';
  }
  const np = document.getElementById('nowPlaying');
  if(np) np.textContent = '🎵 ' + title + ' — ' + artist;
}

function togglePlay(){
  if(!audio.src) return;
  if(audio.paused){ audio.play(); } else { audio.pause(); }
  const btn = document.getElementById('pPlayBtn'); if(btn) btn.textContent = audio.paused ? '▶' : '⏸';
  const btn2 = document.getElementById('miniPlayBtn'); if(btn2) btn2.textContent = audio.paused ? '▶' : '⏸';
}

function stopSong(){
  if(previewTimer) clearTimeout(previewTimer);
  audio.pause();
  audio.currentTime = 0;
  currentSong = null;
  const p = document.getElementById('miniPlayer'); if(p) p.classList.add('hidden');
}

function seekSong(sec){
  if(!audio.src) return;
  audio.currentTime = Math.max(0, Math.min(audio.duration||0, audio.currentTime + sec));
}

// Keep mini player button in sync when song ends
audio.addEventListener('ended', ()=>{
  const btn = document.getElementById('pPlayBtn'); if(btn) btn.textContent = '▶';
});

window.playSong = playSong;
window.togglePlay = togglePlay;
window.stopSong = stopSong;
window.seekSong = seekSong;
window.lespotAudio = audio;