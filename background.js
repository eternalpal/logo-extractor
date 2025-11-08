// 后台脚本，提供简化的下载备用功能
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('=== 后台收到下载请求 ===');
  
  if (message.action === 'downloadLogo') {
    const { url, filename, type } = message;
    const targetType = type.toLowerCase();
    
    // 直接使用Chrome的下载API进行下载
    // 这是一个简化的备用方案，主要处理逻辑已经移到前端
    chrome.downloads.download({
      url: url,
      filename: `${filename}.${targetType}`,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('下载失败:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('下载成功，ID:', downloadId);
        sendResponse({ success: true, downloadId });
      }
    });
    
    return true; // 保持消息通道开放以等待异步响应
  }
});

// 当插件被安装或更新时执行
chrome.runtime.onInstalled.addListener(() => {
  console.log('Logo Extractor installed');
});