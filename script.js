  // 設定: 合成画像の基本サイズ（フレーム画像のサイズに合わせるのが一般的）
  const CANVAS_WIDTH = 1920;
  const CANVAS_HEIGHT = 1080;
  
  /**
   * Google Driveの共有リンクを直接画像URLに変換する関数
   * @param {string} url Google Driveの共有リンク
   * @returns {string} 直接参照用URL
   */
  function getDriveDirectLink(url) {
      const fileId = url.match(/[-\w]{25,}/);
      if (fileId) {
          // lh3.googleusercontent.com はリダイレクトを挟まず直接画像データにアクセスするため、302エラーとCORS問題を回避しやすい形式です
          // =s2000 を付与して高解像度を指定します
          return `https://lh3.googleusercontent.com/d/${fileId[0]}=s2000`;
      }
      return url;
  }

  // フレーム画像の設定
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
  
  // DOM要素
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

  // 状態管理
  let currentFrameImage = null;
  let currentUserImage = null;
  let currentUserName = '';

  let currentFrameImageID = 0;

  // 画像操作用の状態変数
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

  // 初期化
  function init() {
      // Canvasサイズ設定
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      // フレーム選択肢の生成
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

      // 最初のフレームをロード
      loadFrame(frames[0].src);
  }

  // フレーム画像のロード処理
  function loadFrame(src) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
          currentFrameImage = img;
          drawComposite();
      };
      img.onerror = () => {
          console.error("画像の読み込みに失敗しました。ファイルが「リンクを知っている全員」に公開されているか確認してください。 URL:", src);
          // 読み込み失敗時でもキャンバスを再描画してエラー状態を視覚的に確認できるようにする
          drawComposite();
      };
      img.src = src;
  }

  // フレーム選択処理
  function selectFrame(index) {
      // UI更新
      document.querySelectorAll('.frame-option').forEach((el, i) => {
          if (i === index) el.classList.add('selected');
          else el.classList.remove('selected');
      });
      // 画像ロード
      loadFrame(frames[index].src);
  }

  // ユーザー画像のアップロード処理
  imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
              img.crossOrigin = "Anonymous";
              currentUserImage = img;
              
              // 初期サイズと位置の計算 (長辺1200px基準に変更)
              const TARGET_SIZE = 720;
              const imgRatio = img.width / img.height;

              if (img.width >= img.height) {
                  // 横長または正方形の場合、幅を基準にする
                  userImageW = TARGET_SIZE;
                  userImageH = TARGET_SIZE / imgRatio;
              } else {
                  // 縦長の場合、高さを基準にする
                  userImageH = TARGET_SIZE;
                  userImageW = TARGET_SIZE * imgRatio;
              }
              // 指定座標（X:430, Y:420）に画像の中心を配置：form1
              userImageX = (430 + userImageW / 6) - userImageW / 2;
              userImageY = (420 + userImageH / 6) - userImageH / 2;

              downloadBtn.disabled = false; // ダウンロード有効化
              drawComposite();
          };
          img.src = event.target.result;
      };
      reader.readAsDataURL(file);
      uploadArea.innerText="◎選択中◎";
  });

  // 名前入力処理
  nameInput.addEventListener('input', (e) => {
      currentUserName = e.target.value;
      drawComposite();
  });

  // 合成描画処理 (Core Logic)
  function drawComposite() {
      // 1. キャンバスをクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 2. 背景画像（選択した画像）を描画 - 最下層
      if (currentFrameImage) {
          drawImageCover(ctx, currentFrameImage, 0, 0, canvas.width, canvas.height);
      }

      // 3. ユーザー画像を描画 - 上層
      if (currentUserImage) {
          ctx.drawImage(currentUserImage, userImageX, userImageY, userImageW*userImageS, userImageH*userImageS);
      } else {
          // 画像がない場合のプレースホルダーテキスト
          if (!currentFrameImage) {
              ctx.fillStyle = '#1c5e4f';
              ctx.fillRect(0, 0, 200, 100);
          }
          // 文字が見やすいように調整
          ctx.fillStyle = currentFrameImage ? 'rgba(28, 94, 79, 0.8)' : '#ccc';
          if (currentFrameImage) ctx.fillRect(canvas.width/2-675, canvas.height/2 - 40, 500, 80);
          
          ctx.fillStyle = '#eeeeee';
          ctx.font = 'bold 40px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('ここに写真が入ります', canvas.width/2-420, canvas.height/2+15);
      }

      // 4．名前の挿入
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

  // 画像を「object-fit: cover」のように中央トリミングして描画する関数
  function drawImageCover(ctx, img, x, y, w, h) {
      const imgRatio = img.width / img.height;
      const canvasRatio = w / h;
      let renderW, renderH, renderX, renderY;

      if (imgRatio > canvasRatio) {
          // 画像の方が横長 -> 高さを合わせて横をトリミング
          renderH = h;
          renderW = h * imgRatio;
          renderX = x - (renderW - w) / 2;
          renderY = y;
      } else {
          // 画像の方が縦長 -> 幅を合わせて縦をトリミング
          renderW = w;
          renderH = w / imgRatio;
          renderX = x;
          renderY = y - (renderH - h) / 2;
      }
      ctx.drawImage(img, renderX, renderY, renderW, renderH);
  }

  // ドラッグ操作のイベントハンドラ
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
      
      // 画像内をクリックしたか判定
      let areaX = userImageW*userImageS;
      let areaY = userImageH*userImageS;
      if (pos.x >= userImageX && pos.x <= userImageX + areaX &&
          pos.y >= userImageY && pos.y <= userImageY + areaY) {
          isDragging = true;
          dragOffsetX = pos.x - userImageX;
          dragOffsetY = pos.y - userImageY;
          // スマホでのスクロール防止
          if (e.type === 'touchstart') e.preventDefault();
          // スマホの場合、2本指の操作を検知
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
      e.preventDefault(); // スクロール防止
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
              userImageS += zoomSpeed; // 上に回すと拡大
              userImageX -= userImageW*zoomSpeed/2;
              userImageY -= userImageH*zoomSpeed/2;
          } else {
              userImageS -= zoomSpeed; // 下に回すと縮小
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
          // 拡大率の計算
          let zoomFactor = dist / lastDist;

          let centerAdjust = userImageS * (1 - zoomFactor);
          userImageX += userImageW*centerAdjust/4;
          userImageY += userImageH*centerAdjust/4;

          userImageS *= zoomFactor;
          // 拡大に合わせて位置も微調整すると、より自然になります
          lastDist = dist;
      }
      drawComposite();
  }

  function handleEnd() {
      isDragging = false;
  }

  //名前のフォントサイズ調整
  function fontSizeResize(e){
    const val = e.target.value; // スライダーの現在の値を取得
    fontSize = val;
    sizeValue.textContent = val;
    drawComposite();
  }
  //遊び方解説の表示処理
  function closeHowto(e){
    Howto.setAttribute('aria-hidden','true');
  }
  function openHowto(e){
    Howto.setAttribute('aria-hidden','false');
  }

  // イベントリスナー登録
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
      // タブのdata-idを取得
      const targetId=tab.dataset.id;
      // すべてのタブを一旦リセット
      tabs.forEach(tb => tb.setAttribute('aria-pressed', 'false'));
      tools.forEach(tls => tls.setAttribute('aria-hidden', 'true'));
      // クリックされたタブだけをアクティブにする
      tab.setAttribute('aria-pressed', 'true');
      Array.from(tools).find(tab => tab.dataset.id==targetId).setAttribute('aria-hidden','false');
    });
  });

  // 完成画像表示処理
  downloadBtn.addEventListener('click', () =>{
      const base64 = canvas.toDataURL('image/png');
      const blob = base64ToBlob(base64);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      // (任意) iOS対策として長押しを明示的に許可するスタイルを当てる
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

  // リセット処理
  resetBtn.addEventListener('click', () => {
      currentUserImage = null;
      currentUserName = '';
      imageInput.value = ''; // inputをクリア
      nameInput.value = '';
      downloadBtn.disabled = true;
      ImageOutput.style.display = 'none';
      drawComposite();
      uploadArea.innerText="未選択";
  });

  // アプリ起動
  init();