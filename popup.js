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
          
          // 发送消息给content script提取logo
          chrome.tabs.sendMessage(tab.id, { action: 'extractLogos' }, (response) => {
            responseReceived = true;
            clearTimeout(timeoutId);
            
            console.log('收到content script响应:', response);
            console.log('chrome.runtime.lastError:', chrome.runtime.lastError);
            
            if (chrome.runtime.lastError) {
              statusElement.textContent = '提取Logo时出错';
              statusElement.className = 'status error';
              console.error('Error sending message:', chrome.runtime.lastError);
              return;
            }
            
            if (!response) {
              statusElement.textContent = '未收到响应，请刷新页面后重试';
              statusElement.className = 'status error';
              console.error('未收到content script响应');
              return;
            }
            
            const logos = response && response.logos ? response.logos : [];
            
            if (logos.length === 0) {
              statusElement.style.display = 'none';
              noLogosElement.style.display = 'block';
              return;
            }
            
            // 隐藏状态信息，显示logo列表
            statusElement.style.display = 'none';
            logoListElement.style.display = 'block';
            
            // 处理每个logo
            for (const logo of logos) {
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
                  document.querySelectorAll('.format-option').forEach(opt => {
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
                sizeBtn.className = 'size-btn';
                sizeBtn.textContent = size.label;
                sizeBtn.dataset.width = size.width;
                sizeBtn.dataset.height = size.height;
                
                sizeBtn.addEventListener('click', () => {
                  // 取消其他选中状态
                  document.querySelectorAll('.size-btn').forEach(btn => {
                    btn.classList.remove('selected');
                  });
                  sizeBtn.classList.add('selected');
                  
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
                  // 尺寸信息已保存到logo对象中，供后续下载时使用
                };
                
                mediaElement.onerror = () => {
                  // 如果图片加载失败，可以尝试隐藏这个logo项
                  console.warn('Logo图片加载失败:', logo.url);
                };
              }
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
  sizeSelector.classList.add('active');
  
  // 默认选中第一个尺寸按钮（原始尺寸）
  const firstSizeBtn = sizeSelector.querySelector('.size-btn');
  if (firstSizeBtn) {
    firstSizeBtn.classList.add('selected');
  }
  
  // 默认选中PNG格式
  const pngOption = sizeSelector.querySelector('.format-option[data-format="png"]');
  if (pngOption) {
    // 清除其他选中状态
    document.querySelectorAll('.format-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    pngOption.classList.add('selected');
  }
}

// 下载Logo图片
function downloadLogo(logo, format, width, height) {
  try {
    console.log('开始下载Logo:', { logo, format, width, height });
    
    // 生成基础文件名（使用页面标题或域名）
    let baseName = 'logo';
    try {
      // 尝试获取页面标题
      baseName = document.title || 'logo';
      // 移除文件名中的非法字符
      baseName = baseName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').substring(0, 50);
      // 如果处理后为空，则使用默认名称
      if (!baseName) baseName = 'logo';
    } catch (e) {
      console.warn('无法获取页面标题，使用默认名称');
    }
    
    // 创建图片对象
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // 尝试解决跨域问题
    
    img.onload = () => {
      console.log('图片加载成功:', { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      
      // 创建Canvas并设置尺寸
      const canvas = document.createElement('canvas');
      if (width === 'original' && height === 'original') {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      } else {
        canvas.width = parseInt(width);
        canvas.height = parseInt(height);
      }
      
      const ctx = canvas.getContext('2d');
      
      // 对于JPG格式，设置白色背景（因为JPG不支持透明）
      if (format === 'jpg') {
        console.log('JPG格式处理：设置白色背景');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // 绘制图片
      if (width === 'original' && height === 'original') {
        ctx.drawImage(img, 0, 0);
      } else {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      
      // 根据目标格式生成数据URL
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpg' ? 0.95 : 1.0;
      console.log('生成数据URL:', { mimeType, quality });
      
      try {
        // 尝试转换为数据URL
        const dataUrl = canvas.toDataURL(mimeType, quality);
        
        // 使用HTML5的下载功能直接在前端下载
        downloadFromDataUrl(dataUrl, baseName, format, width, height);
      } catch (e) {
        console.error('Canvas转换错误:', e);
        // 如果前端转换失败，尝试使用后台下载
        fallbackToBackgroundDownload(logo.url, baseName, format);
      }
    };
    
    img.onerror = (errorEvent) => {
      console.error('图片加载失败:', errorEvent);
      // 尝试使用fetch获取图片数据作为备用方案
      fetchAndDownloadImage(logo.url, baseName, format, width, height);
    };
    
    // 开始加载图片
    img.src = logo.url;
    
    // 添加超时处理
    setTimeout(() => {
      if (!img.complete) {
        console.error('图片加载超时，尝试备用方案');
        fetchAndDownloadImage(logo.url, baseName, format, width, height);
      }
    }, 5000);
    
  } catch (error) {
    console.error('下载过程中出错:', error);
    showStatusMessage('下载失败: ' + error.message, 'error');
  }
}

// 使用数据URL直接下载图片
function downloadFromDataUrl(dataUrl, baseName, format, width, height) {
  try {
    // 生成完整文件名
    let fullFilename;
    if (width === 'original' && height === 'original') {
      fullFilename = `${baseName}.${format}`;
    } else {
      fullFilename = `${baseName}-${width}x${height}.${format}`;
    }
    
    console.log('准备下载文件:', fullFilename);
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fullFilename;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(link);
      // 释放内存
      URL.revokeObjectURL(dataUrl);
    }, 100);
    
    console.log('下载成功启动');
    showStatusMessage('下载已开始', 'success');
    
  } catch (error) {
    console.error('前端下载失败:', error);
    // 备用方案：使用后台下载
    fallbackToBackgroundDownload(dataUrl, baseName, format);
  }
}

// 使用fetch API获取图片数据并下载
function fetchAndDownloadImage(url, baseName, format, width, height) {
  console.log('尝试使用fetch获取图片数据');
  
  fetch(url, {
    mode: 'cors',
    cache: 'no-cache'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`网络响应错误: ${response.status}`);
    }
    return response.blob();
  })
  .then(blob => {
    console.log('成功获取blob数据，大小:', blob.size);
    const objectUrl = URL.createObjectURL(blob);
    
    // 创建图片对象处理blob数据
    const img = new Image();
    img.onload = () => {
      // 创建Canvas并设置尺寸
      const canvas = document.createElement('canvas');
      if (width === 'original' && height === 'original') {
        canvas.width = img.width;
        canvas.height = img.height;
      } else {
        canvas.width = parseInt(width);
        canvas.height = parseInt(height);
      }
      
      const ctx = canvas.getContext('2d');
      
      // 对于JPG格式，设置白色背景
      if (format === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // 绘制图片
      if (width === 'original' && height === 'original') {
        ctx.drawImage(img, 0, 0);
      } else {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      
      // 生成数据URL
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpg' ? 0.95 : 1.0;
      const dataUrl = canvas.toDataURL(mimeType, quality);
      
      // 下载图片
      downloadFromDataUrl(dataUrl, baseName, format, width, height);
      
      // 清理
      URL.revokeObjectURL(objectUrl);
    };
    
    img.onerror = () => {
      console.error('无法处理blob数据');
      fallbackToBackgroundDownload(url, baseName, format);
      URL.revokeObjectURL(objectUrl);
    };
    
    img.src = objectUrl;
  })
  .catch(error => {
    console.error('fetch获取图片失败:', error);
    fallbackToBackgroundDownload(url, baseName, format);
  });
}

// 备用方案：使用后台下载
function fallbackToBackgroundDownload(url, filename, type) {
  console.log('使用后台下载作为备用方案');
  try {
    chrome.runtime.sendMessage(
      { action: 'downloadLogo', url, filename, type },
      (response) => {
        console.log('收到后台响应:', response);
        if (!response || !response.success) {
          console.error('后台下载也失败了');
          showStatusMessage('下载失败: 无法获取图片数据', 'error');
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
    
    // 3秒后隐藏消息
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}