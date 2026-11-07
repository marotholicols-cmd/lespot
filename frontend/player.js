// LES-POT Player - Background + Lock Screen + Notification
let audio = new Audio();
let currentSong = null;

function playSong(url, title, artist, cover){
  audio.src = url; audio.play();
  currentSong = {title, artist, cover};
  if('mediaSession' in navigator){
    navigator.mediaSession.metadata = new MediaMetadata({title, artist, artwork:[{src:cover||'', sizes:'512x512', type:'image/png'}]});
    navigator.mediaSession.setActionHandler('play', ()=>audio.play());
    navigator.mediaSession.setActionHandler('pause', ()=>audio.pause());
    navigator.mediaSession.setActionHandler('nexttrack', ()=>audio.currentTime+=10);
    navigator.mediaSession.setActionHandler('previoustrack', ()=>audio.currentTime-=10);
  }
  const p=document.getElementById('miniPlayer');
  if(p){p.classList.remove('hidden');document.getElementById('pTitle').textContent=title;document.getElementById('pArtist').textContent=artist}
}
function togglePlay(){ audio.paused ? audio.play() : audio.pause() }