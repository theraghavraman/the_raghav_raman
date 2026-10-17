/* Small, dependency-free soundtrack controller. Audio is never autoplayed. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dock=$('musicDock'), audio=$('portfolioAudio'), toggle=$('musicToggle'), panel=$('musicPanel');
  if(!dock||!audio||!toggle||!panel)return;
  const play=$('musicPlay'), status=$('musicStatus'), progress=$('musicProgress');
  const volume=$('musicVolume'), mute=$('musicMute'), track=$('musicTrack');
  const timeLabel=n=>{if(!Number.isFinite(n))return '--:--';const m=Math.floor(n/60),s=Math.floor(n%60);return m+':'+String(s).padStart(2,'0');};
  audio.volume=Number(volume.value)||.28;
  audio.src=track.value;
  function setStatus(message){status.textContent=message;}
  function open(){panel.hidden=false;dock.classList.add('is-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close music player');}
  function close(){panel.hidden=true;dock.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open music player');toggle.focus({preventScroll:true});}
  toggle.addEventListener('click',()=>panel.hidden?open():close());
  $('musicClose').addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close();});
  async function start(){
    try{await audio.play();dock.classList.add('is-playing');play.innerHTML='<span aria-hidden="true">Ⅱ</span>';play.setAttribute('aria-label','Pause soundtrack');$('musicToggleStatus').textContent='PLAYING · AMBIENT';setStatus('Soundtrack playing.');}
    catch{dock.classList.remove('is-playing');$('musicToggleStatus').textContent='OFF · YOUR CHOICE';play.innerHTML='<span aria-hidden="true">▶</span>';play.setAttribute('aria-label','Play soundtrack');setStatus('Audio could not start. Add the licensed MP3 file and check that it loads.');}
  }
  function pause(){audio.pause();dock.classList.remove('is-playing');play.innerHTML='<span aria-hidden="true">▶</span>';play.setAttribute('aria-label','Play soundtrack');$('musicToggleStatus').textContent='PAUSED';setStatus('Playback paused.');}
  play.addEventListener('click',()=>audio.paused?start():pause());
  track.addEventListener('change',()=>{const wasPlaying=!audio.paused;audio.pause();audio.src=track.value;audio.load();$('musicTrackName').textContent=track.selectedOptions[0].textContent.split(' · ')[0];progress.value=0;if(wasPlaying)start();else setStatus('Ready when you are.');});
  audio.addEventListener('loadedmetadata',()=>{$('musicDuration').textContent=timeLabel(audio.duration);});
  audio.addEventListener('timeupdate',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)progress.value=audio.currentTime/audio.duration*100;$('musicElapsed').textContent=timeLabel(audio.currentTime);});
  progress.addEventListener('input',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Number(progress.value)/100*audio.duration;});
  volume.addEventListener('input',()=>{audio.volume=Number(volume.value);audio.muted=false;mute.setAttribute('aria-label','Mute soundtrack');mute.textContent='♪';});
  mute.addEventListener('click',()=>{audio.muted=!audio.muted;mute.setAttribute('aria-label',audio.muted?'Unmute soundtrack':'Mute soundtrack');mute.textContent=audio.muted?'×':'♪';});
  $('musicBack').addEventListener('click',()=>{audio.currentTime=0;if(audio.paused)start();});
  audio.addEventListener('error',()=>{dock.classList.remove('is-playing');$('musicToggleStatus').textContent='TRACK NOT INSTALLED';play.innerHTML='<span aria-hidden="true">▶</span>';play.setAttribute('aria-label','Play soundtrack');setStatus('Track file not found yet. Add assets/music/observatory-ambient.mp3 after verifying its licence. No external audio is loaded.');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!audio.paused)pause();});
  window.addEventListener('pagehide',()=>audio.pause());
})();
