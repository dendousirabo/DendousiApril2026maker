  const CANVAS_WIDTH = 1920;
  const CANVAS_HEIGHT = 1080;
  
  /**
   * @param {string} url 
   * @returns {string} 
   */
  function getDriveDirectLink(url) {
      const fileId = url.match(/[-\w]{25,}/);
      if (fileId) {
          return `https://lh3.googleusercontent.com/d/${fileId[0]}=s2000`;
      }
      return url;
  }

  const frames = [
      {
          id: 1,
          src: getDriveDirectLink("https://drive.google.com/file/d/1cTsyEmr3003Rkru9-NZY6Rh5lgVspMrB/view?usp=drive_link"),
          name: 'Paper1'
      },
      {
          id: 2,
          src: getDriveDirectLink("https://drive.google.com/file/d/1APrjLTAzXiVC0VgG8cYiE2yOERiNLMRG/view?usp=drive_link"),
          name: 'Paper2'
      },
      {
          id: 3,
          src: getDriveDirectLink("https://drive.google.com/file/d/17JrznOJreQuInqMiIyLEs5d4DBODFu1A/view?usp=drive_link"),
          name: 'Paper3'
      }
  ];
  
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const frameSelector = document.getElementById('frameSelector');
  const imageInput = document.getElementById('imageInput');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const nameInput = document.getElementById('nameInput');
  const ImageOutput = document.getElementById('ImageOutput');
  const Howto = document.getElementById('howto');
  const HowtoBtn = document.getElementById('howtoBtn');
  const HowtoCloseBtn = document.getElementById('howtoCloseBtn');

  const tabs=document.querySelectorAll('.tab-btn');
  const tools=document.querySelectorAll('.tool-container');
  const uploadArea=document.querySelectorAll('.upload-area')[0].children[2];

  const slider = document.getElementById('size-slider');
  const sizeValue = document.getElementById('size-value');

  let currentFrameImage = null;
  let currentUserImage = null;
  let currentUserName = '';

  let currentFrameImageID = 0;

  let userImageX = 0;
  let userImageY = 0;
  let userImageW = 0;
  let userImageH = 0;
  let userImageS = 1;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let lastDist = 0;
  let fontSize = 62;

  function init() {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      frames.forEach((frame, index) => {
          const frameImg=document.createElement('div');
          const img = document.createElement('img');
          frameImg.className = 'frame-option';
          frameImg.onclick = () => selectFrame(index);
          img.crossOrigin = "Anonymous"; // Canvas読み込みと共通の設定にすることでキャッシュの衝突を防ぎます
          img.src = frame.src;
          img.classList.add(`frameNo-${index+1}`);
          if (index === 0) frameImg.classList.add('selected');
          frameImg.appendChild(img);
          frameSelector.appendChild(frameImg);
      });
      ImageOutput.style.display = 'none';

      loadFrame(frames[0].src);
  }

  function loadFrame(src) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
          currentFrameImage = img;
          drawComposite();
      };
      img.onerror = () => {
          console.error("画像の読み込みに失敗しました。ファイルが「リンクを知っている全員」に公開されているか確認してください。 URL:", src);
          drawComposite();
      };
      img.src = src;
  }

  function selectFrame(index) {
      document.querySelectorAll('.frame-option').forEach((el, i) => {
          if (i === index) el.classList.add('selected');
          else el.classList.remove('selected');
      });
      loadFrame(frames[index].src);
  }

  imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
              img.crossOrigin = "Anonymous";
              currentUserImage = img;
              
              const TARGET_SIZE = 720;
              const imgRatio = img.width / img.height;

              if (img.width >= img.height) {
                  userImageW = TARGET_SIZE;
                  userImageH = TARGET_SIZE / imgRatio;
              } else {
                  userImageH = TARGET_SIZE;
                  userImageW = TARGET_SIZE * imgRatio;
              }
              userImageX = (430 + userImageW / 6) - userImageW / 2;
              userImageY = (420 + userImageH / 6) - userImageH / 2;

              downloadBtn.disabled = false;
              drawComposite();
          };
          img.src = event.target.result;
      };
      reader.readAsDataURL(file);
      uploadArea.innerText="◎選択中◎";
  });

  nameInput.addEventListener('input', (e) => {
      currentUserName = e.target.value;
      drawComposite();
  });

  function drawComposite() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (currentFrameImage) {
          drawImageCover(ctx, currentFrameImage, 0, 0, canvas.width, canvas.height);
      }

      if (currentUserImage) {
          ctx.drawImage(currentUserImage, userImageX, userImageY, userImageW*userImageS, userImageH*userImageS);
      } else {
          if (!currentFrameImage) {
              ctx.fillStyle = '#1c5e4f';
              ctx.fillRect(0, 0, 200, 100);
          }
          ctx.fillStyle = currentFrameImage ? 'rgba(28, 94, 79, 0.8)' : '#ccc';
          if (currentFrameImage) ctx.fillRect(canvas.width/2-675, canvas.height/2 - 40, 500, 80);
          
          ctx.fillStyle = '#eeeeee';
          ctx.font = 'bold 40px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('ここに写真が入ります', canvas.width/2-420, canvas.height/2+15);
      }

      if (currentUserName) {
          ctx.font=`bold ${fontSize}px "Zen Kurenaido"`;
          ctx.fillStyle = '#224320';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          const isAlphaNumeric = str => {
            return /^[a-z\-,/.=~_<>\x20]+$/g.test(str)
          }
          
          if(isAlphaNumeric(currentUserName)){
            ctx.fillText(currentUserName,1230,750);
          } else {
            ctx.fillText(currentUserName,1230,755);
          }
      }
  }

  function drawImageCover(ctx, img, x, y, w, h) {
      const imgRatio = img.width / img.height;
      const canvasRatio = w / h;
      let renderW, renderH, renderX, renderY;

      if (imgRatio > canvasRatio) {
          renderH = h;
          renderW = h * imgRatio;
          renderX = x - (renderW - w) / 2;
          renderY = y;
      } else {
          renderW = w;
          renderH = w / imgRatio;
          renderX = x;
          renderY = y - (renderH - h) / 2;
      }
      ctx.drawImage(img, renderX, renderY, renderW, renderH);
  }

  function getCanvasCoordinates(e) {
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;
      
      if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = e.clientX;
          clientY = e.clientY;
      }

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
      };
  }

  function handleStart(e) {
      if (!currentUserImage) return;
      const pos = getCanvasCoordinates(e);
      
      let areaX = userImageW*userImageS;
      let areaY = userImageH*userImageS;
      if (pos.x >= userImageX && pos.x <= userImageX + areaX &&
          pos.y >= userImageY && pos.y <= userImageY + areaY) {
          isDragging = true;
          dragOffsetX = pos.x - userImageX;
          dragOffsetY = pos.y - userImageY;
          if (e.type === 'touchstart') e.preventDefault();
          if (e.type === 'touchstart' && e.touches.length === 2) {
              lastDist = Math.hypot(
              e.touches[0].pageX - e.touches[1].pageX,
              e.touches[0].pageY - e.touches[1].pageY
              );
          }
      }
  }

  function handleMove(e) {
      if (!isDragging || !currentUserImage) return;
      e.preventDefault(); 
      const pos = getCanvasCoordinates(e);
      if(e.type === 'mousemove'){
          userImageX = pos.x - dragOffsetX;
          userImageY = pos.y - dragOffsetY;
      }
      else if (e.type === 'touchmove' && e.touches.length === 1) {
          userImageX = pos.x - dragOffsetX;
          userImageY = pos.y - dragOffsetY;
      }
      else if (e.type === 'touchmove' && e.touches.length === 2) {
          handleScale(e);
      }
      drawComposite();
  }

  function handleScale(e) {
      if(e.type === 'wheel'){
          e.preventDefault();
          const zoomSpeed = 0.1;
          if (e.deltaY < 0) {
              userImageS += zoomSpeed;
              userImageX -= userImageW*zoomSpeed/2;
              userImageY -= userImageH*zoomSpeed/2;
          } else {
              userImageS -= zoomSpeed;
              userImageX += userImageW*zoomSpeed/2;
              userImageY += userImageH*zoomSpeed/2;
          }
      }
      else if (e.type === 'touchmove' && e.touches.length === 2) {
          e.preventDefault();
          let dist = Math.hypot(
              e.touches[0].pageX - e.touches[1].pageX,
              e.touches[0].pageY - e.touches[1].pageY
          );
          let zoomFactor = dist / lastDist;

          let centerAdjust = userImageS * (1 - zoomFactor);
          userImageX += userImageW*centerAdjust/4;
          userImageY += userImageH*centerAdjust/4;

          userImageS *= zoomFactor;
          lastDist = dist;
      }
      drawComposite();
  }

  function handleEnd() {
      isDragging = false;
  }

  function fontSizeResize(e){
    const val = e.target.value;
    fontSize = val;
    sizeValue.textContent = val;
    drawComposite();
  }
  function closeHowto(e){
    Howto.setAttribute('aria-hidden','true');
  }
  function openHowto(e){
    Howto.setAttribute('aria-hidden','false');
  }

  canvas.addEventListener('mousedown', handleStart);
  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('wheel', handleScale);
  canvas.addEventListener('mouseup', handleEnd);
  canvas.addEventListener('mouseleave', handleEnd);

  canvas.addEventListener('touchstart', handleStart, { passive: false });
  canvas.addEventListener('touchmove', handleMove, { passive: false });
  canvas.addEventListener('touchend', handleEnd);

  HowtoCloseBtn.addEventListener('click', closeHowto);
  HowtoCloseBtn.addEventListener('touchstart', closeHowto);
  HowtoBtn.addEventListener('click', openHowto);
  HowtoBtn.addEventListener('touchstart', openHowto);

  slider.addEventListener('input',fontSizeResize)

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId=tab.dataset.id;
      tabs.forEach(tb => tb.setAttribute('aria-pressed', 'false'));
      tools.forEach(tls => tls.setAttribute('aria-hidden', 'true'));
      tab.setAttribute('aria-pressed', 'true');
      Array.from(tools).find(tab => tab.dataset.id==targetId).setAttribute('aria-hidden','false');
    });
  });

  downloadBtn.addEventListener('click', () =>{
      const base64 = canvas.toDataURL('image/png');
      const blob = base64ToBlob(base64);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      ImageOutput.style.webkitTouchCallout = 'default';
  })

  function base64ToBlob(base64) {
    const bin = atob(base64.replace(/^.*,/, ''));
    const buffer = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      buffer[i] = bin.charCodeAt(i);
    }
    return new Blob([buffer.buffer], { type: 'image/png' });
  }

  resetBtn.addEventListener('click', () => {
      currentUserImage = null;
      currentUserName = '';
      imageInput.value = '';
      nameInput.value = '';
      downloadBtn.disabled = true;
      ImageOutput.style.display = 'none';
      drawComposite();
      uploadArea.innerText="未選択";
  });

  init();