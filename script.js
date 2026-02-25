
// ChibiTheme Studio - script.js
// Main UI State/Refs
let currentTab = 'iconpack'; // 'iconpack' or 'wallpaper'
const $ = (sel, node=document) => node.querySelector(sel);
const $$ = (sel, node=document) => Array.from(node.querySelectorAll(sel));
const fonts = [
  { name: 'Poppins', css: 'Poppins, sans-serif' },
  { name: 'Roboto', css: 'Roboto, sans-serif' },
  { name: 'Fira Code', css: '"Fira Code", monospace' },
  { name: 'Inter', css: 'Inter, sans-serif' },
  { name: 'Monospace', css: 'monospace' },
];
// --- UI Assist ---
function notify(msg,type='') {
  let n = document.createElement('div');
  n.className = 'notif'+(type?' '+type:'');
  n.textContent = msg;
  $('#notifier').appendChild(n);
  setTimeout(()=>{ n.style.opacity='0';setTimeout(()=>n.remove(),900); },2500);
}
function showLoading(msg) {
  $('#loading-overlay').classList.remove('hidden'); $('#loading-msg').textContent = msg||'Processing...';
}
function hideLoading() { $('#loading-overlay').classList.add('hidden'); }
function debounce(f, t=220){ let to; return function(...a){clearTimeout(to);to=setTimeout(()=>f.apply(this,a),t);} }
function formatNum(n) {return n<10?'0'+n:n;}
function clamp(n,min,max) {return Math.max(min,Math.min(n,max));}
// --- Tab Nav Logic ---
$$('.tab-link').forEach(btn => {
  btn.onclick = ()=> {
    if(btn.classList.contains('active'))return;
    $$('.tab-link').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    $$('.tab-content').forEach(tc=>tc.classList.remove('active'));
    $('#tab-'+btn.dataset.tab).classList.add('active');
    currentTab=btn.dataset.tab;
  };
});

// ============================
// MODULE 1: ICON PACK GENERATOR
// ============================
let iconFiles = [], iconEntries = [];
const grid = $('#icon-preview-grid');
const iconCount = $('#icon-count');
const iconExportBtn = $('#icon-export-btn');
const iconProgress = $('#icon-progress');
const manifestChk = $('#include-manifest');
const dropIconArea = $('#icon-upload-area');
const iconInput = $('#icon-multi-upload');
const iconUploadBtn = $('#icon-upload-btn');
// -- Drag & Drop Upload UI --
['dragover','dragenter'].forEach(evt=>dropIconArea.addEventListener(evt,e=>{e.preventDefault();dropIconArea.classList.add('dropping');},false));
['dragleave','dragend','drop'].forEach(evt=>dropIconArea.addEventListener(evt,e=>{e.preventDefault();dropIconArea.classList.remove('dropping');},false));
dropIconArea.addEventListener('drop',e=>{
  if(e.dataTransfer?.files) handleIconUpload(e.dataTransfer.files);
});
// -- File Picker Upload --
iconUploadBtn.onclick = ()=> iconInput.click();
iconInput.addEventListener('change',(e)=>handleIconUpload(e.target.files));
// --- Process Uploaded Files ---
async function handleIconUpload(fileList) {
  showLoading('Loading icons...');
  let validImages = Array.from(fileList).filter(f=>
    f.type.startsWith('image/'));
  for (let file of validImages) {
    let url = URL.createObjectURL(file);
    let img = await loadImage(url);
    let canvas = document.createElement('canvas');
    let size=512;
    canvas.width=canvas.height=size;
    let ctx = canvas.getContext('2d');
    // Fill BG Transparent
    ctx.clearRect(0,0,size,size);
    // Calculate aspect ratio fit and center
    let { sx, sy, sw, sh, dx, dy, dw, dh } = fitToCanvas(img, size, size);
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    // Canvas => PNG Blob
    let pngBlob = await new Promise(res=>canvas.toBlob(res,'image/png',0.98));
    // Generate default name
    let origName = file.name.replace(/\.[^/.]+$/,"");
    let defName = getUniqueIconName(origName || 'icon');
    iconEntries.push({
      name: defName,
      blob: pngBlob,
      url: URL.createObjectURL(pngBlob)
    });
    URL.revokeObjectURL(url);
  }
  updateIconGrid();
  hideLoading();
  notify('Icons loaded!','success');
}
// -- Icon Grid Rendering & Interactive Rename/Delete
function updateIconGrid() {
  grid.innerHTML = '';
  iconCount.textContent = iconEntries.length + (iconEntries.length===1?' icon':' icons');
  if(iconEntries.length==0) {
    iconExportBtn.disabled = true;
    return;
  }
  iconExportBtn.disabled = false;
  iconEntries.forEach((entry,i)=>{
    const wrap = document.createElement('div');
    wrap.className = 'icon-preview';
    wrap.innerHTML = `
      <img class="icon-img" src="${entry.url}" alt="">
      <input class="icon-rename" value="${entry.name}" maxlength="40" />
      <button class="icon-del" title="Remove">&#10005;</button>
    `;
    const rename = $('.icon-rename',wrap);
    rename.oninput = debounce(e=>{
      entry.name = getUniqueIconName(rename.value.trim()||'icon',i);
      rename.value = entry.name;
    }, 90);
    $('.icon-del',wrap).onclick=()=>{
      iconEntries.splice(i,1); updateIconGrid();
    };
    grid.appendChild(wrap);
  });
}
// -- Unique Icon Name Helper
function getUniqueIconName(base,i=-1) {
  base = base.replace(/[^a-zA-Z0-9._-]+/g,'_');
  let proposed = base;
  let n=1;
  while(iconEntries.some((e,idx)=>e.name===proposed && idx!==i)){
    proposed = base+"_"+(n++);
  }
  return (proposed||'icon');
}
// -- Download ZIP logic
iconExportBtn.onclick = async ()=>{
  iconExportBtn.classList.add('loading');
  showLoading('Packing icon ZIP...');
  iconProgress.style.opacity=1;
  const zip = new JSZip();
  let folder = zip.folder('icon-pack');
  // Add icons
  let manifest = [];
  for(let i=0;i<iconEntries.length;i++){
    let entry=iconEntries[i];
    folder.file(entry.name+'.png', entry.blob);
    manifest.push({file:entry.name+'.png',name:entry.name});
  }
  // Manifest
  if(manifestChk.checked){
    folder.file('manifest.json',JSON.stringify(manifest,null,2));
  }
  // Generate ZIP!
  const blob = await zip.generateAsync({type:"blob"},({percent})=>{
    iconExportBtn.style.setProperty('--progress',percent);
  });
  iconExportBtn.classList.remove('loading');
  iconProgress.style.opacity=0;
  hideLoading();
  triggerDownload(blob,"icon-pack.zip");
  notify('ZIP successfully generated!','success');
}
// --- Clean up object URLs on window close ---
window.addEventListener('beforeunload',()=>{
  iconEntries.forEach(i=>URL.revokeObjectURL(i.url));
});
// ============ Canvas image helpers ============
function loadImage(url){
  return new Promise((res,rej)=>{
    let img = new window.Image();
    img.onload=()=>res(img); img.onerror=rej;
    img.src=url;
  });
}
// Aspect ratio center fit (crop)
function fitToCanvas(img, cW, cH) {
  let iW=img.width, iH=img.height;
  let r = Math.max(cW/iW, cH/iH);
  let sw = cW/r, sh = cH/r;
  let sx = (iW-sw)/2, sy=(iH-sh)/2;
  return {sx:Math.max(sx,0),sy:Math.max(sy,0),sw:Math.min(sw,iW),sh:Math.min(sh,iH),dx:0,dy:0,dw:cW,dh:cH};
}
function triggerDownload(blob,filename) {
  let a = document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},100);
}
// Clear grid for new icons
function clearIcons() { iconEntries.forEach(i=>URL.revokeObjectURL(i.url)); iconEntries = []; updateIconGrid(); }
// ============================
// MODULE 2: WALLPAPER + CUSTOM CLOCK
// ============================
let wallpaperBG = null, wallpaperURL = null, wallpaperImg = null, wallpaperReady = false;
const wallpaperInput = $('#wallpaper-upload');
const wallpaperUploadBtn = $('#wallpaper-upload-btn');
const wallpaperDropArea = $('#wallpaper-upload-area');
const wallCanvas = $('#wallpaper-canvas');
const wallCtx = wallCanvas.getContext('2d');
const wallExportBtn = $('#wallpaper-export-btn');
const wallProgress = $('#wallpaper-progress');
// Wallpaper drag+drop
['dragover','dragenter'].forEach(evt=>wallpaperDropArea.addEventListener(evt,e=>{e.preventDefault();wallpaperDropArea.classList.add('dropping');},false));
['dragleave','dragend','drop'].forEach(evt=>wallpaperDropArea.addEventListener(evt,e=>{e.preventDefault();wallpaperDropArea.classList.remove('dropping');},false));
wallpaperDropArea.addEventListener('drop',async (e)=>{
  if(e.dataTransfer?.files){
    await handleWallpaperUpload(e.dataTransfer.files[0]);
  }
});
// File picker
wallpaperUploadBtn.onclick = ()=>wallpaperInput.click();
wallpaperInput.addEventListener('change',e=>{if(e.target.files[0])handleWallpaperUpload(e.target.files[0]);});
async function handleWallpaperUpload(f) {
  if(!f.type.startsWith('image/'))return;
  showLoading('Loading wallpaper...');
  if(wallpaperURL) URL.revokeObjectURL(wallpaperURL);
  wallpaperURL = URL.createObjectURL(f);
  wallpaperImg = await loadImage(wallpaperURL);
  wallpaperReady = true;
  updateWallpaperPreview();
  hideLoading();
  wallExportBtn.disabled=false;
  notify('Wallpaper loaded!','success');
}
function getWallpaperSettings(){
  return {
    format: $('#clock-format').value,
    font: $('#clock-font').value,
    fontsize: parseInt($('#clock-fontsize').value),
    color: $('#clock-color').value,
    shadow: $('#clock-shadow').checked,
    pos: $('#clock-pos').value,
    blur: $('#wallpaper-blur').checked,
    darkness: Number($('#wallpaper-darkness').value),
    resolutions: getResolutions()
  };
}
function getResolutions(){
  let res = [];
  $$('.wallpaper-res-chk').forEach(i=>{
    if(i.checked){
      let [w,h]=i.value.split('x'); res.push({w:+w,h:+h});
    }
  });
  if($('#custom-res-chk').checked){
    let w = parseInt($('#res-custom-width').value);
    let h = parseInt($('#res-custom-height').value);
    if(w>=320 && h>=320 && w<8192 && h<8192) res.push({w,h});
  }
  $('#wallpaper-res-count').textContent = res.length+' size'+(res.length===1?'':'s')+' selected';
  return res;
}
$$('.wallpaper-res-chk').forEach(i=>i.onchange=getResolutions);
$('#custom-res-chk').onchange=getResolutions;
$('#res-custom-width').oninput = debounce(getResolutions,80);
$('#res-custom-height').oninput = debounce(getResolutions,80);

// -- Controls events (format, color etc)
[
  'clock-format','clock-font','clock-fontsize','clock-color','clock-shadow',
  'clock-pos','wallpaper-blur','wallpaper-darkness','wallpaper-res-chk',
  'custom-res-chk','res-custom-width','res-custom-height'
].forEach(id=>{ $(`#${id}`)?.addEventListener('change',updateWallpaperPreview); });
$('#clock-fontsize').addEventListener('input',updateWallpaperPreview);
$('#wallpaper-darkness').addEventListener('input',e=>{
  $('#wallpaper-darkness-val').textContent = e.target.value+'%';
  updateWallpaperPreview();
});
$('#wallpaper-blur').addEventListener('change',updateWallpaperPreview);
$('#clock-shadow').addEventListener('change',updateWallpaperPreview);
// ---- Animation helpers for clock preview
function updateWallpaperPreview(){
  // Show sample wallpaper preview
  const {font,fontsize,color,shadow,pos,format,blur,darkness} = getWallpaperSettings();
  let W=360,H=720;
  wallCanvas.width=W; wallCanvas.height=H;
  if(wallpaperReady && wallpaperImg){
    // Draw BG image to fit
    drawBGToCanvas(wallCtx,wallpaperImg,W,H,blur,darkness);
  }else{
    wallCtx.clearRect(0,0,W,H);
    wallCtx.fillStyle="#1c2533";
    wallCtx.fillRect(0,0,W,H);
  }
  // Draw clock overlay (simulated time)
  let now = new Date();
  let txt = getClockText(now,format);
  wallCtx.save();
  wallCtx.font = `600 ${fontsize}px `+fonts.find(f=>f.name===font)?.css||'sans-serif';
  wallCtx.textBaseline='middle';
  wallCtx.textAlign='center';
  wallCtx.fillStyle = color;
  let y = H/2;
  if(pos==='top') y=H*0.20;
  else if(pos==='bottom') y=H*0.82;
  if(shadow) wallCtx.shadowColor='rgba(45,255,240,0.53)', wallCtx.shadowBlur=18;
  wallCtx.fillText(txt,W/2, y);
  wallCtx.restore();
}
function getClockText(date, fmt){
  let h24=date.getHours(), h= h24%12||12, m=date.getMinutes(), s=date.getSeconds();
  switch(fmt){
    case '24-hm': return `${formatNum(h24)}:${formatNum(m)}`;
    case '24-hms': return `${formatNum(h24)}:${formatNum(m)}:${formatNum(s)}`;
    case '12-hm': return `${formatNum(h)}:${formatNum(m)} ${h24<12?'AM':'PM'}`;
    case '12-hms': return `${formatNum(h)}:${formatNum(m)}:${formatNum(s)} ${h24<12?'AM':'PM'}`;
  }
}
// -- Redraw clock every second
setInterval(()=>{ if(currentTab==='wallpaper') updateWallpaperPreview(); },1000);
// -- Canvas drawBG helper
function drawBGToCanvas(ctx,bgImg,cw,ch,blur,darkness){
  // fit bg to cover
  let r = Math.max(cw/bgImg.width, ch/bgImg.height);
  let dw = bgImg.width*r, dh = bgImg.height*r;
  let dx = (cw-dw)/2, dy = (ch-dh)/2;
  if(blur){
    // Draw to temp canvas, apply blur
    let tmp=document.createElement('canvas');tmp.width=cw;tmp.height=ch;
    let tctx=tmp.getContext('2d');
    tctx.drawImage(bgImg,dx,dy,dw,dh);
    // Manual fast blur: stack box blur 1--2 px
    stackBlurCanvasRGBA(tmp,tctx,cw,ch,4);
    ctx.drawImage(tmp,0,0,cw,ch);
  }else{
    ctx.drawImage(bgImg,dx,dy,dw,dh);
  }
  if(darkness>0){
    ctx.save();
    ctx.globalAlpha=clamp(darkness/100,0,0.8);
    ctx.fillStyle="#161625";
    ctx.fillRect(0,0,cw,ch);
    ctx.restore();
  }
}
// Fast blur using stack blur
function stackBlurCanvasRGBA(canvas,ctx,W,H,rad=4){
  // https://github.com/flozz/StackBlur
  // For brevity, a simple fast box-blur here:
  let imgData = ctx.getImageData(0,0,W,H);
  for(let k=0;k<rad;k++){
    let d = imgData.data;
    // Horizontal blur
    for(let y=0;y<H;y++){
      let prev=[0,0,0,0];
      for(let x=0;x<W;x++){
        let idx=(y*W+x)*4;
        for(let i=0;i<4;i++){
          d[idx+i]=(d[idx+i]+prev[i])/2;
          prev[i]=d[idx+i];
        }
      }
    }
    // Vertical blur
    for(let x=0;x<W;x++){
      let prev=[0,0,0,0];
      for(let y=0;y<H;y++){
        let idx=(y*W+x)*4;
        for(let i=0;i<4;i++){
          d[idx+i]=(d[idx+i]+prev[i])/2;
          prev[i]=d[idx+i];
        }
      }
    }
  }
  ctx.putImageData(imgData,0,0);
}
// --- Wallpaper Export Main ---
wallExportBtn.onclick=async()=>{
  if(!wallpaperReady)return;
  let {format,font,fontsize,color,shadow,pos,blur,darkness,resolutions} = getWallpaperSettings();
  if(!resolutions.length){notify('No resolution selected');return;}
  wallExportBtn.classList.add('loading');
  showLoading('Exporting wallpaper...');
  wallProgress.style.opacity=1;
  let zip = null;
  let outFiles = [];
  // Per resolution: draw and export
  for(let i=0;i<resolutions.length;i++){
    let {w,h} = resolutions[i];
    let cv = document.createElement('canvas');
    cv.width=w; cv.height=h;
    let ctx = cv.getContext('2d');
    if(wallpaperImg){
      drawBGToCanvas(ctx,wallpaperImg,w,h,blur,darkness);
    }else{
      ctx.fillStyle="#1c2533";
      ctx.fillRect(0,0,w,h);
    }
    // Overlay clock (current time)
    let now = new Date();
    let txt = getClockText(now,format);
    ctx.save();
    ctx.font = `600 ${fontsize*(w/360)}px `+fonts.find(f=>f.name===font)?.css||'sans-serif';
    ctx.textBaseline='middle';
    ctx.textAlign='center';
    ctx.fillStyle = color;
    let y = h/2;
    if(pos==='top') y=h*0.18;
    else if(pos==='bottom') y=h*0.84;
    if(shadow) ctx.shadowColor='rgba(45,255,240,0.41)', ctx.shadowBlur=28*(w/360);
    ctx.fillText(txt,w/2, y);
    ctx.restore();
    let blob=await new Promise(res=>cv.toBlob(res,'image/png',.97));
    outFiles.push({blob,filename:`wallpaper_${w}x${h}.png`});
  }
  wallExportBtn.classList.remove('loading');
  wallProgress.style.opacity=0;
  hideLoading();
  if(outFiles.length>1){
    zip = new JSZip();
    let folder=zip.folder('wallpapers');
    outFiles.forEach(img=>folder.file(img.filename,img.blob));
    let blob=await zip.generateAsync({type:'blob'});
    triggerDownload(blob,'wallpapers.zip');
  }else{
    triggerDownload(outFiles[0].blob, outFiles[0].filename);
  }
  notify('Wallpaper exported!','success');
};
// Fast preview-enabled on param changes:
updateWallpaperPreview();
// ========== Exit cleanup ==========
window.addEventListener('beforeunload',()=>{
  if(wallpaperURL)URL.revokeObjectURL(wallpaperURL);
});
// ChibiTheme Studio - script.js
// Floating sakura petal anime effect
function createSakuraPetal() {
  const petal = document.createElement('img');
  petal.src = "data:image/svg+xml;utf8,<svg width='26' height='22' xmlns='http://www.w3.org/2000/svg'><ellipse cx='13' cy='11' rx='11' ry='8' fill='%23fdcdf3'/><ellipse cx='13' cy='6' rx='7' ry='5' fill='%23fbb1e5'/></svg>";
  petal.className = "sakura-petal";
  petal.style.left = Math.random() * (window.innerWidth - 32) + 'px';
  petal.style.top = '-60px';
  petal.style.setProperty('--spd', (7 + Math.random()*5) + 's');
  document.body.appendChild(petal);
  setTimeout(()=>petal.remove(), 9000);
}
setInterval(() => { if(Math.random()<.45) createSakuraPetal(); }, 1400);
// rest of your JS as before...
// Place this at the top. The rest of the JS is unchanged, just be sure the cosmetic JS sakura effect runs first.

// ... (The rest of the original script.js – unchanged) ...