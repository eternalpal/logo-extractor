// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
  const statusElement = document.getElementById('status');
  const logoListElement = document.getElementById('logo-list');
  const noLogosElement = document.getElementById('no-logos');
  
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
          
          // 发送消息给content script提取logo - 【关键修复】修正action名称
          chrome.tabs.sendMessage(tab.id, { action: 'detect-logos' }, (response) => {
            responseReceived = true;
            clearTimeout(timeoutId);
            
            console.log('收到content script响应:', response);
            console.log('chrome.runtime.lastError:', chrome.runtime.lastError);
            
            if (chrome.runtime.lastError) {
              // 忽略 "The message port closed before a response was received" 错误，
              // 因为 content.js 可能不会立即响应
              if (!chrome.runtime.lastError.message.includes('port closed')) {
                statusElement.textContent = '提取Logo时出错';
                statusElement.className = 'status error';
                console.error('Error sending message:', chrome.runtime.lastError);
                return;
              }
            }
            
            // 后续逻辑依赖于 content.js 主动发送的候选列表，这里不再处理 logos
            // 此处可以留空，或等待最终的候选列表消息
          });

          // 监听来自 content script 的最终 Logo 列表
          chrome.runtime.onMessage.addListener(function logoListener(message) {
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
              
              // 隐藏状态信息，显示logo列表
              statusElement.style.display = 'none';
              logoListElement.style.display = 'block';
              logoListElement.innerHTML = ''; // 清空旧列表
              
              // 处理每个logo
              for (const logo of uniqueLogos) {
                // 创建logo项目元素
                const logoItem = document.createElement('div');
                logoItem.className = 'logo-item';
                
                // 创建预览部分
                const previewContainer = document.createElement('div');
                previewContainer.className = 'logo-preview';
                
                // 直接创建图片元素
                const mediaElement = document.createElement('img');
                mediaElement.className = 'logo-image';
                mediaElement.src = logo.url;
                mediaElement.alt = logo.alt || 'Logo';
                
                // 只添加logo图片，不显示任何文字信息
                previewContainer.appendChild(mediaElement);
                logoItem.appendChild(previewContainer);
                
                // 创建下载选项
                const downloadOptions = document.createElement('div');
                downloadOptions.className = 'download-options';
                
                // 只创建一个下载按钮
                const downloadButton = document.createElement('button');
                downloadButton.className = 'download-btn';
                downloadButton.textContent = '下载Logo';
                downloadButton.style.width = '100%'; // 让按钮占满宽度
                downloadButton.addEventListener('click', () => showSizeSelector(logoItem, logo));
                
                downloadOptions.appendChild(downloadButton);
                logoItem.appendChild(downloadOptions);
                
                // 创建尺寸和格式选择器
                const sizeSelector = document.createElement('div');
                sizeSelector.className = 'size-selector';
                sizeSelector.style.width = '90%';
                sizeSelector.style.margin = '0 auto';
                
                // 创建格式选择
                const formatSection = document.createElement('div');
                formatSection.className = 'format-section';
                formatSection.style.marginBottom = '8px';
                
                const formatLabel = document.createElement('div');
                formatLabel.textContent = '选择格式:';
                formatLabel.style.textAlign = 'center';
                formatLabel.style.marginBottom = '4px';
                
                const formatOptions = document.createElement('div');
                formatOptions.className = 'format-options';
                formatOptions.style.display = 'flex';
                formatOptions.style.justifyContent = 'center';
                formatOptions.style.gap = '8px';
                
                // PNG格式选项
                const pngOption = document.createElement('button');
                pngOption.className = 'format-option';
                pngOption.textContent = 'PNG';
                pngOption.dataset.format = 'png';
                pngOption.classList.add('selected'); // 默认选中PNG
                
                // JPG格式选项
                const jpgOption = document.createElement('button');
                jpgOption.className = 'format-option';
                jpgOption.textContent = 'JPG';
                jpgOption.dataset.format = 'jpg';
                
                // 添加格式选择事件监听
                [pngOption, jpgOption].forEach(option => {
                  option.addEventListener('click', () => {
                    // 取消其他选中状态
                    logoItem.querySelectorAll('.format-option').forEach(opt => {
                      opt.classList.remove('selected');
                    });
                    option.classList.add('selected');
                  });
                  formatOptions.appendChild(option);
                });
                
                formatSection.appendChild(formatLabel);
                formatSection.appendChild(formatOptions);
                
                // 创建尺寸选择
                const sizeSection = document.createElement('div');
                sizeSection.className = 'size-section';
                
                const sizeLabel = document.createElement('div');
                sizeLabel.textContent = '选择尺寸:';
                sizeLabel.style.textAlign = 'center';
                sizeLabel.style.marginBottom = '4px';
                
                const sizeOptions = document.createElement('div');
                sizeOptions.className = 'size-options';
                sizeOptions.style.display = 'flex';
                sizeOptions.style.flexWrap = 'wrap';
                sizeOptions.style.justifyContent = 'center';
                sizeOptions.style.gap = '6px';
                
                // 预设尺寸选项
                const sizes = [
                  { label: '原始尺寸', width: 'original', height: 'original' },
                  { label: '128x128', width: 128, height: 128 },
                  { label: '256x256', width: 256, height: 256 },
                  { label: '512x512', width: 512, height: 512 }
                ];
                
                sizes.forEach(size => {
                  const sizeBtn = document.createElement('button');
                  sizeBtn.className = 'size-option'; // 修正类名以匹配CSS
                  sizeBtn.textContent = size.label;
                  sizeBtn.dataset.width = size.width;
                  sizeBtn.dataset.height = size.height;
                  
                  sizeBtn.addEventListener('click', () => {
                    // 获取当前选择的格式
                    const format = logoItem.querySelector('.format-option.selected').dataset.format;
                    
                    // 执行下载
                    downloadLogo(logo, format, size.width, size.height);
                    
                    // 隐藏尺寸选择器
                    setTimeout(() => {
                      sizeSelector.classList.remove('active');
                    }, 500);
                  });
                  
                  sizeOptions.appendChild(sizeBtn);
                });
                
                sizeSection.appendChild(sizeLabel);
                sizeSection.appendChild(sizeOptions);
                
                sizeSelector.appendChild(formatSection);
                sizeSelector.appendChild(sizeSection);
                logoItem.appendChild(sizeSelector);
                
                // 将logo项目添加到列表
                logoListElement.appendChild(logoItem);
                
                // 只有当是img元素时才添加加载逻辑
                if (mediaElement instanceof HTMLImageElement) {
                  mediaElement.onload = () => {
                    logo.width = mediaElement.naturalWidth;
                    logo.height = mediaElement.naturalHeight;
                  };
                  
                  mediaElement.onerror = () => {
                    console.warn('Logo图片加载失败:', logo.url);
                  };
                }
              }
              // 移除监听器，避免重复执行
              chrome.runtime.onMessage.removeListener(logoListener);
            }
          });
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

// 显示尺寸选择器
function showSizeSelector(logoItem, logo) {
  const sizeSelector = logoItem.querySelector('.size-selector');
  // Toggle a classe 'active'
  sizeSelector.classList.toggle('active');
}

// 下载Logo图片
function downloadLogo(logo, format, width, height) {
  try {
    console.log('开始下载Logo:', { logo, format, width, height });
    
    // 生成基础文件名（使用页面标题或域名）
    let baseName = 'logo';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        try {
          let title = tabs[0].title;
          if (title) {
            baseName = title.split(' ')[0].split('-')[0].split('|')[0].trim();
          }
          // 移除文件名中的非法字符
          baseName = baseName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').substring(0, 50);
          if (!baseName) baseName = 'logo';
        } catch(e) {
          baseName = 'logo';
        }
      }
      
      // 创建图片对象
      const img = new Image();
      img.crossOrigin = 'Anonymous'; // 尝试解决跨域问题
      
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
        
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'jpg' ? 0.95 : 1.0;
        
        try {
          const dataUrl = canvas.toDataURL(mimeType, quality);
          downloadFromDataUrl(dataUrl, baseName, format, width, height);
        } catch (e) {
          console.error('Canvas转换错误:', e);
          fallbackToBackgroundDownload(logo.url, baseName, format);
        }
      };
      
      img.onerror = () => {
        console.error('图片加载失败，直接使用后台下载');
        fallbackToBackgroundDownload(logo.url, baseName, format);
      };
      
      // 对于SVG的data URL，需要特殊处理
      if (logo.url.startsWith('data:image/svg+xml')) {
        img.src = logo.url;
      } else {
        // 对于普通URL，添加时间戳避免缓存问题
        img.src = logo.url + (logo.url.includes('?') ? '&' : '?') + new Date().getTime();
      }
    });
    
  } catch (error) {
    console.error('下载过程中出错:', error);
    showStatusMessage('下载失败: ' + error.message, 'error');
  }
}

// 使用数据URL直接下载图片
function downloadFromDataUrl(dataUrl, baseName, format, width, height) {
  try {
    let fullFilename = `${baseName}.${format}`;
    if (width !== 'original' && height !== 'original') {
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
    console.error('前端下载失败:', error);
    fallbackToBackgroundDownload(dataUrl, baseName, format);
  }
}

// 备用方案：使用后台下载
function fallbackToBackgroundDownload(url, filename, type) {
  console.log('使用后台下载作为备用方案');
  try {
    chrome.runtime.sendMessage(
      { action: 'downloadLogo', url, filename, type },
      (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          console.error('后台下载也失败了:', chrome.runtime.lastError || response.error);
          showStatusMessage('下载失败: 无法获取图片数据', 'error');
        } else {
          showStatusMessage('下载已开始', 'success');
        }
      }
    );
  } catch (e) {
    console.error('发送后台消息失败:', e);
    showStatusMessage('下载失败: 无法连接到扩展后台', 'error');
  }
}

// 显示状态消息
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