const scene=document.querySelector('#arScene');
const startButton=document.querySelector('#startButton');
const loading=document.querySelector('#loading');
const scanHint=document.querySelector('#scanHint');
const captureButton=document.querySelector('#captureButton');
const modal=document.querySelector('#photoModal');
const preview=document.querySelector('#photoPreview');
const downloadButton=document.querySelector('#downloadButton');
const closeButton=document.querySelector('#closeButton');
const captureCanvas=document.querySelector('#captureCanvas');
const target=document.querySelector('#target');
let latestPhoto=null;

function waitForMindAR(){
  return new Promise(resolve=>{
    if(scene.systems?.['mindar-image-system']) return resolve();
    scene.addEventListener('loaded',resolve,{once:true});
  });
}

startButton.addEventListener('click',async()=>{
  startButton.disabled=true;
  startButton.textContent='Opening camera…';
  try{
    await waitForMindAR();
    await scene.systems['mindar-image-system'].start();
    loading.classList.add('hidden');
    scanHint.classList.remove('hidden');
    captureButton.classList.remove('hidden');
  }catch(error){
    console.error(error);
    startButton.disabled=false;
    startButton.textContent='Try Again';
    alert('Camera could not start. Use HTTPS, allow camera permission, and try again.');
  }
});

target.addEventListener('targetFound',()=>scanHint.textContent='Postcard found — frame your AR photo');
target.addEventListener('targetLost',()=>scanHint.textContent='Point the camera at the postcard');

function drawCover(ctx,video,w,h){
  const vw=video.videoWidth,vh=video.videoHeight;
  if(!vw||!vh) throw new Error('Camera video is not ready.');
  const vr=vw/vh,cr=w/h;
  let sx=0,sy=0,sw=vw,sh=vh;
  if(vr>cr){sw=vh*cr;sx=(vw-sw)/2}else{sh=vw/cr;sy=(vh-sh)/2}
  ctx.drawImage(video,sx,sy,sw,sh,0,0,w,h);
}

captureButton.addEventListener('click',()=>{
  try{
    const video=document.querySelector('video');
    const arCanvas=scene.canvas||document.querySelector('.a-canvas');
    if(!video||!arCanvas) throw new Error('AR camera is not ready.');
    const ratio=Math.min(window.devicePixelRatio||1,2);
    const w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);
    captureCanvas.width=w;captureCanvas.height=h;
    const ctx=captureCanvas.getContext('2d');
    drawCover(ctx,video,w,h);
    ctx.drawImage(arCanvas,0,0,w,h);
    latestPhoto=captureCanvas.toDataURL('image/jpeg',.94);
    preview.src=latestPhoto;
    modal.classList.remove('hidden');
  }catch(error){
    console.error(error);
    alert('The photo could not be captured. Keep the postcard visible and try again.');
  }
});

downloadButton.addEventListener('click',()=>{
  if(!latestPhoto)return;
  const a=document.createElement('a');
  a.href=latestPhoto;
  a.download=`bang-kruai-ar-${Date.now()}.jpg`;
  document.body.appendChild(a);a.click();a.remove();
});
closeButton.addEventListener('click',()=>modal.classList.add('hidden'));
