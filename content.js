// 【关键修复】注入守卫，防止脚本重复执行
if (typeof window.logoExtractorScriptInjected === 'undefined') {
  window.logoExtractorScriptInjected = true;

  // 存储检测到的 Logo 候选
  const logoCandidates = new Set();
  // 发送消息的节流计时器
  let sendThrottleTimer = null;
  // 避免重复处理的元素集合
  let processedElements = new Set();

  // 常见 Logo 选择器（包含空元素和容器选择器）
  const commonLogoSelectors = [
    '.logo', '#logo', '.site-logo', '#site-logo',
    '.logo-container', '#logo-container', '.brand', '#brand',
    '.header-logo', '#header-logo', '.main-logo', '#main-logo',
    '.logo-img', '#logo-img', '.logo-icon', '#logo-icon',
    '[class*="logo"]', '[id*="logo"]', '[class*="brand"]', '[id*="brand"]',
    'a[href="/"][title*="logo"]', 'a[href="/"][aria-label*="logo"]',
    'img[alt*="logo"]', 'img[src*="logo"]'
  ];

  // 添加 Logo 候选并节流发送给后台
  function addLogoCandidate(url) {
    if (!url || typeof url !== 'string') return;
    
    // 过滤无效或可疑的URL
    if (url.startsWith('data:image/') && url.length < 150) return;
    if (url.includes('placeholder') || url.includes('blank') || url.includes('transparent') || url.includes('spinner') || url.includes('loader')) return;
    
    logoCandidates.add(url);
  }

  // 提取元素的背景图片（支持多倍图和各种 URL 格式）
  function extractBackgroundImages(element, source) {
    try {
      const computedStyle = window.getComputedStyle(element);
      const backgroundImage = computedStyle.backgroundImage;
      
      if (!backgroundImage || backgroundImage === 'none') return;
      
      // 匹配所有 URL 格式：url("xxx")、url('xxx')、url(xxx)
      const urlRegex = /url\(\s*['"]?([^'"\)]+)['"]?\s*\)/gi;
      let match;
      
      while ((match = urlRegex.exec(backgroundImage)) !== null) {
        if (match[1]) {
          let imageUrl = match[1].trim();
          
          // 解析URL，处理相对路径
          try {
            imageUrl = new URL(imageUrl, window.location.href).href;
          } catch (urlError) {
            console.debug('[LogoExtractor] URL 处理失败:', imageUrl, urlError);
            continue;
          }
          
          addLogoCandidate(imageUrl);
        }
      }
    } catch (e) {
      console.debug('[LogoExtractor] 提取背景图失败:', e);
    }
  }

  // 检查元素的 img 标签属性
  function checkImageElements(element) {
    try {
      const checkImg = (img) => {
        if (processedElements.has(img)) return;
        const src = img.src || img.dataset.src || img.dataset.original;
        if (src) {
          addLogoCandidate(src);
        }
        processedElements.add(img);
      };

      if (element.tagName === 'IMG') {
        checkImg(element);
      }
      
      element.querySelectorAll('img').forEach(checkImg);
    } catch (e) {
      console.debug('[LogoExtractor] 检查图片元素失败:', e);
    }
  }

  // 检查 SVG 元素（可能包含 Logo）
  function checkSvgElements(element) {
    try {
      const checkSvg = (svg) => {
         if (processedElements.has(svg)) return;
         try {
          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(svg);
          if (!svgString.includes('<svg')) return;
          const base64 = btoa(unescape(encodeURIComponent(svgString)));
          const svgDataUrl = `data:image/svg+xml;base64,${base64}`;
          addLogoCandidate(svgDataUrl);
        } catch (svgError) {
          // 忽略 SVG 转换错误
        }
        processedElements.add(svg);
      };

      if (element.tagName === 'SVG') {
        checkSvg(element);
      }
      element.querySelectorAll('svg').forEach(checkSvg);

    } catch (e) {
      console.debug('[LogoExtractor] 检查 SVG 元素失败:', e);
    }
  }

  // 主检测函数
  function detectLogos() {
    logoCandidates.clear();
    processedElements.clear();
    
    // 1. 统一收集所有可能的 logo 元素和容器
    const potentialElements = new Set();
    const uniqueSelectors = [...new Set(commonLogoSelectors)];

    uniqueSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => potentialElements.add(el));
      } catch (e) {
        console.debug('[LogoExtractor] 选择器检测失败:', selector, e);
      }
    });

    // 2. 对每个潜在元素及其所有子孙元素进行深度扫描
    potentialElements.forEach(element => {
      const elementsToCheck = [element, ...element.querySelectorAll('*')];
      elementsToCheck.forEach(el => {
        if (processedElements.has(el)) return;
        
        extractBackgroundImages(el);
        checkImageElements(el);
        checkSvgElements(el);
        
        processedElements.add(el);
      });
    });

    // 3. 检测 meta 标签中的图标
    try {
      document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"]').forEach(meta => {
        if (meta.href) {
          addLogoCandidate(meta.href);
        }
      });
    } catch (e) {
      console.debug('[LogoExtractor] Meta 图标检测失败:', e);
    }
    
    // 4. 发送最终结果
    clearTimeout(sendThrottleTimer);
    sendThrottleTimer = setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'final-logo-candidates',
        candidates: Array.from(logoCandidates)
      });
    }, 500);
  }

  // 监听来自 popup 的检测请求
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detect-logos') {
      detectLogos();
      // 异步发送结果，这里可以简单响应表示已收到请求
      sendResponse({ status: 'detection-started' });
    }
    return true; // 保持通道开放以进行异步响应
  });

  // 页面加载完成后自动检测一次
  window.addEventListener('load', () => {
    setTimeout(detectLogos, 1000);
  });

} // 【关键修复】注入守卫的结束括号