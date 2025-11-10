// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
  // 获取所有需要的元素
  const mainContent = document.getElementById('main-content');
  const aboutSection = document.getElementById('about-section');
  const aboutLink = document.getElementById('about-link');
  const closeAboutLink = document.getElementById('close-about-link');
  
  const statusElement = document.getElementById('status');
  const logoListElement = document.getElementById('logo-list');
  const noLogosElement = document.getElementById('no-logos');

  // --- 新增：关于页面的交互逻辑 ---
  aboutLink.addEventListener('click', (e) => {
    e.preventDefault(); // 阻止链接默认跳转行为
    mainContent.style.display = 'none';
    aboutSection.style.display = 'block';
  });

  closeAboutLink.addEventListener('click', (e) => {
    e.preventDefault(); // 阻止链接默认跳转行为
    aboutSection.style.display = 'none';
    mainContent.style.display = 'block';
  });
  // --- 交互逻辑结束 ---

  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    try {
      if (tabs && tabs[0]) {
        const tab = tabs[0];
        
        // 向content script注入并请求提取logo
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            statusElement.textContent = '注入脚本时出错';
            statusElement.className = 'status error';
            console.error('Error executing script:', chrome.runtime.lastError);
            return;
          }
          
          // 设置超时机制
          let responseReceived = false;
          const timeoutId = setTimeout(() => {
            if (!responseReceived) {
              statusElement.textContent = '扫描超时，请刷新页面后重试';
              statusElement.className = 'status error';
              console.error('扫描超时：5秒内未收到响应');
            }
          }, 5000);
          
          // 发送消息给content script提取logo
          chrome.tabs.sendMessage(tab.id, { action: 'detect-logos' }, (response) => {
            if (chrome.runtime.lastError) {
              if (!chrome.runtime.lastError.message.includes('port closed')) {
                console.error('Error sending message:', chrome.runtime.lastError);
              }
            }
          });

          // 监听来自 content script 的最终 Logo 列表
          const logoListener = (message) => {
            if (message.action === 'final-logo-candidates') {
              responseReceived = true;
              clearTimeout(timeoutId);

              const logos = message.candidates || [];
              const uniqueLogos = Array.from(new Set(logos)).map(url => ({ url }));

              if (uniqueLogos.length === 0) {
                statusElement.style.display = 'none';
                noLogosElement.style.display = 'block';
                return;
              }
              
              statusElement.style.display = 'none';
              logoListElement.style.display = 'block';
              logoListElement.innerHTML = ''; 
              
              for (const logo of uniqueLogos) {
                const logoItem = createLogoItem(logo);
                logoListElement.appendChild(logoItem);
              }
              
              chrome.runtime.onMessage.removeListener(logoListener);
            }
          };
          chrome.runtime.onMessage.addListener(logoListener);
        });
      } else {
        statusElement.textContent = '无法获取当前页面信息';
        statusElement.className = 'status error';
        console.error('无法获取当前标签页');
      }
    } catch (error) {
      statusElement.textContent = '发生未知错误';
      statusElement.className = 'status error';
      console.error('未知错误:', error);
    }
  });
});

function createLogoItem(logo) {
  const logoItem = document.createElement('div');
  logoItem.className = 'logo-item';
  
  const previewContainer = document.createElement('div');
  previewContainer.className = 'logo-preview';
  
  const mediaElement = document.createElement('img');
  mediaElement.className = 'logo-image';
  mediaElement.src = logo.url;
  mediaElement.alt = 'Logo';
  
  previewContainer.appendChild(mediaElement);
  logoItem.appendChild(previewContainer);
  
  const downloadOptions = document.createElement('div');
  downloadOptions.className = 'download-options';
  
  const downloadButton = document.createElement('button');
  downloadButton.className = 'download-btn';
  downloadButton.textContent = '下载Logo';
  downloadButton.style.width = '100%';
  downloadButton.addEventListener('click', () => showSizeSelector(logoItem, logo));
  
  downloadOptions.appendChild(downloadButton);
  logoItem.appendChild(downloadOptions);
  
  const sizeSelector = createSizeSelector(logoItem, logo);
  logoItem.appendChild(sizeSelector);

  if (mediaElement instanceof HTMLImageElement) {
    mediaElement.onerror = () => {
      console.warn('Logo图片加载失败:', logo.url);
      logoItem.style.display = 'none';
    };
  }
  return logoItem;
}

function createSizeSelector(logoItem, logo) {
    const sizeSelector = document.createElement('div');
    sizeSelector.className = 'size-selector';

    // 格式选择
    const formatSection = document.createElement('div');
    formatSection.innerHTML = `<div style="text-align: center; margin-bottom: 4px;">选择格式:</div>`;
    const formatOptions = document.createElement('div');
    formatOptions.style.display = 'flex';
    formatOptions.style.justifyContent = 'center';
    formatOptions.style.gap = '8px';
    formatOptions.style.marginBottom = '8px';

    const formats = ['PNG', 'JPG'];
    formats.forEach((format, index) => {
        const option = document.createElement('button');
        option.className = 'format-option';
        option.textContent = format;
        option.dataset.format = format.toLowerCase();
        if (index === 0) option.classList.add('selected');

        option.addEventListener('click', () => {
            logoItem.querySelectorAll('.format-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
        formatOptions.appendChild(option);
    });
    formatSection.appendChild(formatOptions);

    // 尺寸选择
    const sizeSection = document.createElement('div');
    sizeSection.innerHTML = `<div style="text-align: center; margin-bottom: 4px;">选择尺寸:</div>`;
    const sizeOptions = document.createElement('div');
    sizeOptions.style.display = 'flex';
    sizeOptions.style.flexWrap = 'wrap';
    sizeOptions.style.justifyContent = 'center';
    sizeOptions.style.gap = '6px';
    
    const sizes = [
      { label: '原始尺寸', width: 'original', height: 'original' },
      { label: '128x128', width: 128, height: 128 },
      { label: '256x256', width: 256, height: 256 },
      { label: '512x512', width: 512, height: 512 }
    ];
    
    sizes.forEach(size => {
      const sizeBtn = document.createElement('button');
      sizeBtn.className = 'size-option';
      sizeBtn.textContent = size.label;
      
      sizeBtn.addEventListener('click', () => {
        const format = logoItem.querySelector('.format-option.selected').dataset.format;
        downloadLogo(logo, format, size.width, size.height);
        setTimeout(() => sizeSelector.classList.remove('active'), 500);
      });
      sizeOptions.appendChild(sizeBtn);
    });
    sizeSection.appendChild(sizeOptions);
    
    sizeSelector.appendChild(formatSection);
    sizeSelector.appendChild(sizeSection);
    return sizeSelector;
}


// 显示尺寸选择器
function showSizeSelector(logoItem, logo) {
  const sizeSelector = logoItem.querySelector('.size-selector');
  sizeSelector.classList.toggle('active');
}

// 下载Logo图片
function downloadLogo(logo, format, width, height) {
  try {
    let baseName = 'logo';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].title) {
        baseName = tabs[0].title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').substring(0, 50) || 'logo';
      }
      
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetWidth = (width === 'original') ? img.naturalWidth : parseInt(width, 10);
        const targetHeight = (height === 'original') ? img.naturalHeight : parseInt(height, 10);

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext('2d');
        if (format === 'jpg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        try {
          const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, 0.95);
          downloadFromDataUrl(dataUrl, baseName, format, width, height);
        } catch (e) {
          fallbackToBackgroundDownload(logo.url, baseName, format);
        }
      };
      
      img.onerror = () => {
        fallbackToBackgroundDownload(logo.url, baseName, format);
      };
      
      img.src = logo.url.startsWith('data:') ? logo.url : logo.url + (logo.url.includes('?') ? '&' : '?') + Date.now();
    });
    
  } catch (error) {
    showStatusMessage('下载失败: ' + error.message, 'error');
  }
}

function downloadFromDataUrl(dataUrl, baseName, format, width, height) {
  try {
    let fullFilename = `${baseName}.${format}`;
    if (width !== 'original') {
      fullFilename = `${baseName}-${width}x${height}.${format}`;
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fullFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showStatusMessage('下载已开始', 'success');
  } catch (error) {
    fallbackToBackgroundDownload(dataUrl, baseName, format);
  }
}

function fallbackToBackgroundDownload(url, filename, type) {
  chrome.runtime.sendMessage(
    { action: 'downloadLogo', url, filename, type },
    (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        showStatusMessage('下载失败: 无法获取图片数据', 'error');
      } else {
        showStatusMessage('下载已开始', 'success');
      }
    }
  );
}

function showStatusMessage(message, type) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}