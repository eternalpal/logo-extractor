// 从当前页面提取潜在的logo图片 - 仅在页面起始位置查找
function extractLogos() {
  const logoCandidates = [];
  const seenUrls = new Set();
  const seenCode = new Set();
  
  // 定义页面起始区域 - 只在这个范围内查找logo
  function getStartRegionElements() {
    // 1. 先获取header元素
    const header = document.querySelector('header, .header, #header, .top-header');
    if (header) {
      return [header];
    }
    
    // 2. 如果没有header，获取页面顶部500px范围内的元素
    const startElements = [];
    const startHeight = 500;
    
    // 获取页面顶部的直接子元素（限制在body的前几个主要子元素）
    const bodyChildren = Array.from(document.body.children).slice(0, 5);
    bodyChildren.forEach(child => {
      const rect = child.getBoundingClientRect();
      if (rect.top < startHeight) {
        startElements.push(child);
      }
    });
    
    // 3. 如果还是没有足够元素，获取页面顶部的一些主要容器
    if (startElements.length === 0) {
      const commonTopContainers = document.querySelectorAll('.container, .wrapper, .site-wrapper, .page-wrapper');
      commonTopContainers.forEach(container => {
        const rect = container.getBoundingClientRect();
        if (rect.top < startHeight) {
          startElements.push(container);
        }
      });
    }
    
    return startElements.length > 0 ? startElements : [document.body];
  }
  
  // 获取起始区域元素
  const startRegionElements = getStartRegionElements();
  
  // 方法1：查找常见的logo类名和ID - 移除SVG相关选择器
  const commonLogoSelectors = [
    '.logo',
    '#logo',
    '.site-logo',
    '#site-logo',
    '.header-logo',
    '#header-logo',
    '.company-logo',
    '#company-logo',
    '.brand-logo',
    '#brand-logo',
    '[alt*="logo"]',
    '[src*="logo"]',
    '[alt*="Logo"]',
    '[src*="Logo"]',
    '[src*="LOGO"]',
    '.navbar-brand img',
    '.header img[alt*=""]',
    '.footer img',
    '[itemprop="logo"]',
    // 新增选择器
    '.main-logo',
    '#main-logo',
    '.logo-image',
    '.logo-container img',
    '.logo-wrapper img',
    '.site-branding img',
    '.logo-link img',
    '.header__logo img',
    '.nav-logo img',
    '.logo__img',
    '[aria-label*="logo"]',
    '[class*="logo"][class*="img"]',
    '[id*="logo"][id*="img"]',
    // 检查header和banner区域
    'header img:not([alt*="sponsor"]):not([alt*="ad"])'
  ];
  
  // 只在起始区域元素内查找常见logo选择器
  startRegionElements.forEach(container => {
    commonLogoSelectors.forEach(selector => {
      try {
        const elements = container.querySelectorAll(selector);
        elements.forEach(element => {
          if (element.tagName === 'IMG') {
            // 对于itemprop="logo"的特殊处理
            const source = selector === '[itemprop="logo"]' ? 'itemprop' : 'default';
            addLogoCandidate(element.src, element.alt || 'logo', source);
          } else if (element.tagName === 'SVG') {
            // 使用增强版SVG处理函数
            const source = selector.includes('svg[') ? 'svg-selector' : 'default';
            processSvgElement(element, source);
          } else {
            // 检查元素内的img标签
            const img = element.querySelector('img');
            if (img) {
              addLogoCandidate(img.src, img.alt || 'logo', 'default');
            }
            // 增强背景图片检测逻辑
            const backgroundImage = window.getComputedStyle(element).backgroundImage;
            if (backgroundImage && backgroundImage !== 'none') {
              // 改进正则表达式以更好地匹配各种URL格式
              const matches = backgroundImage.match(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/i);
              if (matches && matches[1]) {
                let imageUrl = matches[1];
                // 处理相对URL
                try {
                  if (imageUrl.startsWith('//')) {
                    imageUrl = window.location.protocol + imageUrl;
                  } else if (imageUrl.startsWith('/')) {
                    imageUrl = window.location.origin + imageUrl;
                  } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                    // 处理相对路径
                    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
                    imageUrl = new URL(imageUrl, baseUrl).href;
                  }
                } catch (urlError) {
                  // URL处理失败时保持原样
                  console.debug('URL处理失败:', urlError);
                }
                addLogoCandidate(imageUrl, 'background-logo', 'background');
              }
            }
          }
        });
      } catch (e) {
        // 忽略可能的查询错误
      }
    });
  });
  
  // 新增：专门检查所有包含'logo'关键字的属性
  try {
    // 获取页面所有元素
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      // 检查元素的所有属性
      const attributes = element.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        const attrName = attr.name.toLowerCase();
        const attrValue = attr.value;
        
        // 如果属性名包含'logo'关键字
        if (attrName.includes('logo')) {
          // 如果是src属性，直接添加图片
          if (attrName === 'src' && attrValue) {
            addLogoCandidate(attrValue, element.alt || 'logo-from-attr', 'attribute-src');
          }
          // 如果是data-*属性且值是图片URL
          else if (attrName.startsWith('data-') && attrValue && 
                  (attrValue.endsWith('.png') || attrValue.endsWith('.jpg') || 
                   attrValue.endsWith('.jpeg') || attrValue.endsWith('.svg') || 
                   attrValue.endsWith('.webp') || attrValue.startsWith('//') || 
                   attrValue.startsWith('/'))) {
            // 处理相对URL
            let imageUrl = attrValue;
            try {
              if (imageUrl.startsWith('//')) {
                imageUrl = window.location.protocol + imageUrl;
              } else if (imageUrl.startsWith('/')) {
                imageUrl = window.location.origin + imageUrl;
              } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                // 处理相对路径
                const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
                imageUrl = new URL(imageUrl, baseUrl).href;
              }
            } catch (urlError) {
              // URL处理失败时保持原样
              console.debug('URL处理失败:', urlError);
            }
            addLogoCandidate(imageUrl, 'logo-from-data-attr', 'attribute-data');
          }
          // 检查是否有背景图片
          else {
            const backgroundImage = window.getComputedStyle(element).backgroundImage;
            if (backgroundImage && backgroundImage !== 'none') {
              const matches = backgroundImage.match(/url\(['"]?([^'"]*(?:\.[^'")]+))['"]?\)/);
              if (matches && matches[1]) {
                // 解码URL并处理相对路径
                let imageUrl = matches[1];
                try {
                  // 如果是相对路径，转换为绝对路径
                  if (imageUrl.startsWith('//')) {
                    imageUrl = window.location.protocol + imageUrl;
                  } else if (imageUrl.startsWith('/')) {
                    imageUrl = window.location.origin + imageUrl;
                  } else if (!imageUrl.startsWith('http')) {
                    // 处理相对路径
                    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
                    imageUrl = baseUrl + imageUrl;
                  }
                } catch (e) {
                  // 如果URL处理失败，仍然尝试添加原始URL
                  addLogoCandidate(matches[1], 'background-from-attr', 'attribute-background');
                  return;
                }
                addLogoCandidate(imageUrl, 'background-from-attr', 'attribute-background');
              }
            }
          }
        }
      }
    });
  } catch (e) {
    // 忽略可能的查询错误
    console.debug('属性检查错误:', e);
  }
  
  // 新增：检查所有标签的class和id中包含'logo'的元素
  try {
    const logoElements = document.querySelectorAll('[class*="logo"], [id*="logo"]');
    logoElements.forEach(element => {
      // 如果是img标签且有src属性
      if (element.tagName === 'IMG' && element.src) {
        addLogoCandidate(element.src, element.alt || 'logo-from-class-id', 'class-id');
      }
      // 检查元素内的img子元素
      else {
        const imgChildren = element.querySelectorAll('img');
        imgChildren.forEach(img => {
          if (img.src) {
            addLogoCandidate(img.src, img.alt || 'logo-from-class-id', 'class-id');
          }
        });
      }
      
      // 检查背景图片
      const backgroundImage = window.getComputedStyle(element).backgroundImage;
      if (backgroundImage && backgroundImage !== 'none') {
        const matches = backgroundImage.match(/url\(['"]?([^'"]*(?:\.[^'")]+))['"]?\)/);
        if (matches && matches[1]) {
          // 解码URL并处理相对路径
          let imageUrl = matches[1];
          try {
            // 如果是相对路径，转换为绝对路径
            if (imageUrl.startsWith('//')) {
              imageUrl = window.location.protocol + imageUrl;
            } else if (imageUrl.startsWith('/')) {
              imageUrl = window.location.origin + imageUrl;
            } else if (!imageUrl.startsWith('http')) {
              // 处理相对路径
              const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
              imageUrl = baseUrl + imageUrl;
            }
          } catch (e) {
            // 如果URL处理失败，仍然尝试添加原始URL
            addLogoCandidate(matches[1], 'background-from-class-id', 'class-id-background');
            return;
          }
          addLogoCandidate(imageUrl, 'background-from-class-id', 'class-id-background');
        }
      }
    });
  } catch (e) {
    // 忽略可能的查询错误
    console.debug('Class/ID检查错误:', e);
  }
  
  // 新增：专门检查具有data-spm="top-logo"属性的元素及其子元素的背景图片
  try {
    const topLogoElements = document.querySelectorAll('[data-spm="top-logo"], [data-spm="top-logo"] *');
    topLogoElements.forEach(element => {
      const backgroundImage = window.getComputedStyle(element).backgroundImage;
      if (backgroundImage && backgroundImage !== 'none') {
        const matches = backgroundImage.match(/url\(['"]?([^'"]*(?:\.[^'")]+))['"]?\)/);
        if (matches && matches[1]) {
          // 解码URL并处理相对路径
          let imageUrl = matches[1];
          try {
            // 如果是相对路径，转换为绝对路径
            if (imageUrl.startsWith('//')) {
              imageUrl = window.location.protocol + imageUrl;
            } else if (imageUrl.startsWith('/')) {
              imageUrl = window.location.origin + imageUrl;
            } else if (!imageUrl.startsWith('http')) {
              // 处理相对路径
              const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
              imageUrl = baseUrl + imageUrl;
            }
          } catch (e) {
            // 如果URL处理失败，仍然尝试添加原始URL
            addLogoCandidate(matches[1], 'top-logo-background', 'data-spm');
            return;
          }
          addLogoCandidate(imageUrl, 'top-logo-background', 'data-spm');
        }
      }
    });
  } catch (e) {
    // 忽略可能的查询错误
  }
  
  // 方法2：查找可能的favicon - 这个可以在整个文档中查找，因为favicon通常在head中
  const favicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  favicons.forEach(favicon => {
    addLogoCandidate(favicon.href, 'favicon', 'favicon');
  });
  
  // 方法3：查找meta标签中的图片 - 这个可以在整个文档中查找，因为meta通常在head中
  const metaImages = document.querySelectorAll('meta[property="og:image"], meta[name="image"]');
  metaImages.forEach(meta => {
    addLogoCandidate(meta.content, 'meta-image', 'meta-image');
  });
  
  // 方法4：查找起始区域中可能的logo图片 - 只在起始区域查找
  startRegionElements.forEach(container => {
    try {
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        // 过滤掉已经添加的图片，避免重复
        const isAlreadyAdded = logoCandidates.some(candidate => candidate.url === img.src);
        if (!isAlreadyAdded) {
          // 检查URL中是否包含logo相关关键词
          const srcLower = img.src.toLowerCase();
          const isLogoInSrc = srcLower.includes('logo') || srcLower.includes('brand') || 
                             srcLower.includes('icon') || srcLower.includes('symbol') ||
                             srcLower.includes('emblem') || srcLower.includes('mark');
          
          // 检查alt属性中是否包含logo相关关键词
          const altLower = (img.alt || '').toLowerCase();
          const isLogoInAlt = altLower.includes('logo') || altLower.includes('brand') || 
                             altLower.includes('icon') || altLower.includes('symbol') ||
                             altLower.includes('emblem') || altLower.includes('mark');
          
          // 检查图片是否在header或导航区域
          let isInHeader = false;
          let parent = img.closest('header, nav, .header, .navbar, .nav, .topbar, .branding');
          if (parent) {
            isInHeader = true;
          }
          
          // 更新尺寸检查逻辑，支持更多合理的logo尺寸
          const hasReasonableSize = (img.width > 24 && img.height > 24 && 
                                   img.width <= 800 && img.height <= 800);
          const hasReasonableRatio = img.width > 0 && img.height > 0 && 
                                   (img.width / img.height > 0.2 && img.width / img.height < 5);
          
          // 检查图片是否为透明背景（通常logo会使用透明背景）
          const isLikelyTransparent = srcLower.includes('transparent') || 
                                     srcLower.includes('alpha') ||
                                     srcLower.endsWith('.png') ||
                                     srcLower.endsWith('.svg') ||
                                     srcLower.endsWith('.webp');
          
          // 优先级判断：URL或alt中明确包含logo，或者在header区域的图片优先级高
          if (((isLogoInSrc || isLogoInAlt || isInHeader) && hasReasonableSize && hasReasonableRatio) ||
              (isLikelyTransparent && isInHeader && hasReasonableSize)) {
            addLogoCandidate(img.src, img.alt || 'potential-logo');
          }
        }
      });
    } catch (e) {
      // 忽略可能的查询错误
    }
  });
  
  // 方法5：查找起始区域中URL明确包含logo的图片 - 只在起始区域查找
  startRegionElements.forEach(container => {
    try {
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        const srcLower = img.src.toLowerCase();
        // 检查是否已经添加
        const isAlreadyAdded = logoCandidates.some(candidate => candidate.url === img.src);
        if (!isAlreadyAdded && (srcLower.includes('logo') || 
            srcLower.includes('brand') || 
            srcLower.includes('symbol') ||
            srcLower.includes('emblem') ||
            srcLower.includes('mark'))) {
          // 这种情况下我们更宽容一些，因为URL明确包含相关关键词
          addLogoCandidate(img.src, img.alt || 'logo-from-url', 'logo-url');
        }
      });
    } catch (e) {
      // 忽略可能的查询错误
    }
  });
  
  // 方法8：专门查找起始区域中文件名包含logo字样的图片 - 只在起始区域查找
  startRegionElements.forEach(container => {
    try {
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        const srcLower = img.src.toLowerCase();
        const fileName = srcLower.split('/').pop();
        
        // 检查文件名是否包含logo，且不是已经添加的图片
        const isAlreadyAdded = logoCandidates.some(candidate => candidate.url === img.src);
        
        // 只要文件名包含logo，就应该考虑添加
        if (!isAlreadyAdded && fileName.includes('logo') && 
            (fileName.endsWith('.png') || fileName.endsWith('.jpg') || 
             fileName.endsWith('.jpeg') || fileName.endsWith('.svg') || 
             fileName.endsWith('.webp'))) {
          // 使用特殊source标记这些图片
          addLogoCandidate(img.src, img.alt || 'logo-filename', 'logo-filename');
        }
      });
    } catch (e) {
      // 忽略可能的查询错误
    }
  });
  
  // 方法6：检查页面中使用的CSS变量或自定义属性中可能的logo - 只检查起始区域相关的CSS
  try {
    // 获取计算样式中的所有属性
    const styleSheets = Array.from(document.styleSheets);
    
    // 定义常见的header/logo相关的CSS类名模式
    const headerRelatedPatterns = [
      'header', 'logo', 'brand', 'site-', 'top-',
      'navbar', 'nav', 'banner', 'hero'
    ];
    
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.rules || sheet.cssRules || []);
        rules.forEach(rule => {
          if (rule.cssText) {
            const cssTextLower = rule.cssText.toLowerCase();
            
            // 检查是否与header或起始区域相关
            const isHeaderRelated = headerRelatedPatterns.some(pattern => 
              cssTextLower.includes('.' + pattern) || 
              cssTextLower.includes('#' + pattern)
            );
            
            // 只有与header相关或包含logo关键词的CSS规则才处理
            if (isHeaderRelated || 
                cssTextLower.includes('logo') || 
                cssTextLower.includes('brand')) {
              
              // 扩展关键词匹配
              const hasLogoKeywords = cssTextLower.includes('logo') || 
                                    cssTextLower.includes('brand') ||
                                    cssTextLower.includes('symbol') ||
                                    cssTextLower.includes('emblem') ||
                                    cssTextLower.includes('mark');
              
              if (hasLogoKeywords) {
                const urlMatches = rule.cssText.match(/url\(['"]?([^'"]*)['"]?\)/gi);
                if (urlMatches) {
                  urlMatches.forEach(match => {
                    const url = match.replace(/url\(['"]?|['"]?\)/gi, '');
                    if (url && !seenUrls.has(url)) {
                      seenUrls.add(url);
                      addLogoCandidate(url, 'css-logo', 'background');
                    }
                  });
                }
              }
              
              // 特殊处理SVG数据URI
              if (cssTextLower.includes('data:image/svg+xml')) {
                const svgDataMatches = cssTextLower.match(/data:image\/svg\+xml[^\)]+/gi);
                if (svgDataMatches) {
                  svgDataMatches.forEach(svgData => {
                    // 检查SVG数据是否包含logo相关元素
                    const decodedSvg = decodeURIComponent(svgData.replace(/^data:image\/svg\+xml[^,]+,/, ''));
                    const hasLogoElements = decodedSvg.toLowerCase().includes('logo') ||
                                          (decodedSvg.match(/<path/g) || []).length > 0;
                    
                    if (hasLogoElements && !seenCode.has(decodedSvg)) {
                      seenCode.add(decodedSvg);
                      addLogoCandidate(svgData, 'css-inline-svg', 'background');
                    }
                  });
                }
              }
            }
          }
        });
      } catch (e) {
        // 忽略跨域样式表的访问错误
      }
    });
  } catch (e) {
    // 忽略CSS检查错误
  }
  
  // 方法7：专门查找起始区域中的SVG元素 - 只在起始区域查找
  try {
    startRegionElements.forEach(container => {
      try {
        const allSvgs = container.querySelectorAll('svg');
        allSvgs.forEach(svg => {
          // 获取SVG尺寸
          const computedStyle = window.getComputedStyle(svg);
          const width = parseInt(computedStyle.width) || 0;
          const height = parseInt(computedStyle.height) || 0;
          
          // 检查SVG是否有有效的边界框
          let hasValidBBox = false;
          try {
            const bbox = svg.getBBox();
            hasValidBBox = bbox.width > 0 && bbox.height > 0;
          } catch (e) {
            // 某些SVG可能不支持getBBox
          }
          
          // 检查父元素链，向上检查3层
          let hasSpecialContainer = false;
          let parent = svg.parentElement;
          let depth = 0;
          
          while (parent && depth < 3) {
            const parentClass = parent.className || '';
            // 添加更多特殊类名检查
            if (parentClass.toLowerCase().includes('logo') || 
                parentClass.toLowerCase().includes('brand') || 
                parentClass.toLowerCase().includes('icon') || 
                parentClass.toLowerCase().includes('header') ||
                parentClass.toLowerCase().includes('desktop-logo') ||
                parentClass.toLowerCase().includes('desktop-logo-pc') ||
                parentClass.toLowerCase().includes('desktop-logo-text') ||
                parentClass.toLowerCase().includes('logo-container') ||
                parentClass.toLowerCase().includes('header-logo') ||
                parentClass.toLowerCase().includes('site-logo') ||
                parentClass.toLowerCase().includes('brand-logo') ||
                parentClass.toLowerCase().includes('main-logo') ||
                parentClass.toLowerCase().includes('top-logo')) {
              hasSpecialContainer = true;
              break;
            }
            parent = parent.parentElement;
            depth++;
          }
          
          // 检查SVG内容复杂度
          const pathCount = svg.querySelectorAll('path').length;
          const hasPathElements = pathCount > 0;
          const hasTextElements = svg.querySelector('text') !== null;
          const hasImageElements = svg.querySelector('image') !== null;
          const hasUseElements = svg.querySelector('use') !== null;
          
          // 检查SVG自身是否有logo相关属性
          const hasLogoInIdOrClass = (svg.id && svg.id.toLowerCase().includes('logo')) || 
                                   (svg.className && svg.className.toLowerCase().includes('logo'));
          
          // 放宽尺寸阈值，接受更多可能的SVG
          const isValidSize = (width >= 10 && height >= 10) || 
                             hasValidBBox ||
                             (svg.getAttribute('width') && svg.getAttribute('height'));
          
          // 检查是否包含desktop-logo-text类名的元素
          const containsDesktopLogoText = svg.querySelector('.desktop-logo-text') !== null ||
                                        svg.querySelector('[class*="desktop-logo-text"]') !== null;
          
          // 增强的触发条件：多个条件中满足一个即可
          // 大幅放宽识别条件，确保捕获更多可能的SVG logo
          if (hasSpecialContainer || 
              hasLogoInIdOrClass ||
              containsDesktopLogoText || // 特别处理含有desktop-logo-text的SVG
              (isValidSize && hasPathElements) || 
              (isValidSize && (hasTextElements || hasImageElements || hasUseElements)) ||
              pathCount > 1) {
            // 根据来源设置不同的source
            let source = 'svg-selector';
            if (containsDesktopLogoText) {
              source = 'svg-special'; // 含有desktop-logo-text的SVG给予最高优先级
            } else if (hasSpecialContainer) {
              source = 'svg-special'; // 特殊容器中的SVG也给予高优先级
            } else if (hasLogoInIdOrClass) {
              source = 'svg-special';
            }
            processSvgElement(svg, source);
          }
        });
      } catch (e) {
        // 忽略可能的查询错误
      }
    });
  } catch (e) {
    console.error('SVG scanning error:', e);
  }
  
  // 辅助函数：添加logo候选，确保URL完整且去重
  function addLogoCandidate(url, alt, source = 'default') {
    // 确保URL是完整的
    let fullUrl = url;
    if (!url.startsWith('http') && !url.startsWith('data:image')) {
      // 处理相对URL
      const baseUrl = window.location.origin;
      try {
        fullUrl = new URL(url, baseUrl).href;
      } catch (e) {
        // 忽略无效的URL
        return;
      }
    }
    
    // 避免重复
    if (seenUrls.has(fullUrl)) return;
    seenUrls.add(fullUrl);
    
    // 支持更多图片格式
    const isSupportedFormat = fullUrl.includes('.png') || 
                             fullUrl.includes('.jpg') || 
                             fullUrl.includes('.jpeg') || 
                             fullUrl.includes('.svg') || 
                             fullUrl.includes('.gif') ||
                             fullUrl.includes('.webp') ||
                             fullUrl.startsWith('data:image');
    
    // 增强的非logo过滤规则
    const urlLower = fullUrl.toLowerCase();
    // 如果URL中包含logo，则放宽过滤规则
    const hasLogoInUrl = urlLower.includes('logo');
    
    // 基础过滤规则
    let isLikelyNotLogo = false;
    
    if (!hasLogoInUrl) {
      // 对于不包含logo的URL，使用标准过滤规则
      isLikelyNotLogo = urlLower.includes('ad') ||
                       urlLower.includes('banner') ||
                       urlLower.includes('button') ||
                       urlLower.includes('sprite') ||
                       urlLower.includes('pixel') ||
                       urlLower.includes('stat') ||
                       urlLower.includes('track') ||
                       urlLower.includes('analytics') ||
                       urlLower.includes('avatar') ||
                       urlLower.includes('profile') ||
                       urlLower.includes('user') ||
                       urlLower.includes('icon-') ||
                       urlLower.includes('social-') ||
                       urlLower.includes('share-') ||
                       urlLower.includes('placeholder') ||
                       urlLower.includes('background') ||
                       urlLower.includes('bg-') ||
                       urlLower.includes('pattern') ||
                       urlLower.includes('texture') ||
                       urlLower.includes('illustration') ||
                       urlLower.includes('decor') ||
                       urlLower.includes('footer-') ||
                       urlLower.includes('menu-') ||
                       urlLower.includes('arrow') ||
                       urlLower.includes('close') ||
                       urlLower.includes('open') ||
                       urlLower.includes('toggle') ||
                       urlLower.includes('search') ||
                       urlLower.includes('loading') ||
                       urlLower.includes('loader') ||
                       urlLower.includes('progress');
    } else {
      // 对于包含logo的URL，只过滤最明确不是logo的情况
      isLikelyNotLogo = urlLower.includes('ad') && urlLower.includes('logo-ad') ||
                       urlLower.includes('banner') && urlLower.includes('banner-logo') && urlLower.includes('ad') ||
                       urlLower.includes('pixel') ||
                       urlLower.includes('stat') && !urlLower.includes('logo-stat') ||
                       urlLower.includes('track') && !urlLower.includes('logo-track') ||
                       urlLower.includes('analytics') && !urlLower.includes('logo-analytics') ||
                       urlLower.includes('loading') && urlLower.includes('logo-loading');
    }
    
    // 排除特定文件名格式的图片
    const fileName = urlLower.split('/').pop();
    // 如果文件名包含logo，则不过滤
    const isLikelyNotLogoFile = !fileName.includes('logo') && (
                              /^[0-9]{1,4}x[0-9]{1,4}\.(jpg|png|webp)$/.test(fileName) ||
                              /^image[0-9]+\.(jpg|png|webp|gif)$/.test(fileName) ||
                              /^img[0-9]+\.(jpg|png|webp|gif)$/.test(fileName)
                              );
    
    // 特殊处理SVG数据URL
    let isSvgDataUrl = false;
    let svgComplexity = 0;
    if (fullUrl.startsWith('data:image/svg+xml')) {
      isSvgDataUrl = true;
      try {
        // 尝试解码SVG数据以分析复杂度
        const encodedSvg = fullUrl.split(',')[1];
        const decodedSvg = decodeURIComponent(encodedSvg);
        svgComplexity = (decodedSvg.match(/<path/g) || []).length +
                       (decodedSvg.match(/<circle/g) || []).length +
                       (decodedSvg.match(/<rect/g) || []).length;
      } catch (e) {
        // 忽略解码错误
      }
    }
    
    // 分析URL中的品牌标识
    const domainParts = window.location.hostname.split('.');
    const domainBrand = domainParts.length > 1 ? domainParts[domainParts.length - 2].toLowerCase() : '';
    const hasDomainBrandInUrl = urlLower.includes(domainBrand) && domainBrand.length > 3;
    
    // 增强的优先级计算
    let priority = 3; // 默认中等优先级
    const altLower = (alt || '').toLowerCase();
    
    // 高优先级情况 - 增强header区域元素的权重
    if (source === 'favicon' || 
        source === 'meta-image' ||
        source === 'itemprop' ||
        source === 'logo-filename' || // 文件名包含logo的图片给予最高优先级
        source === 'logo-url' ||     // URL包含logo的图片给予最高优先级
        altLower.includes('logo') || 
        urlLower.includes('logo') ||
        (hasDomainBrandInUrl && urlLower.includes('logo'))) {
      priority = 1;
    }
    // 起始区域内的图片优先级提升
    if (priority > 1) {
      // 检查图片是否在起始区域
      try {
        const imgElement = document.querySelector(`img[src="${url}"]`);
        if (imgElement) {
          const imgRect = imgElement.getBoundingClientRect();
          // 如果图片在页面顶部300px内，提升优先级
          if (imgRect.top < 300) {
            priority = Math.max(1, priority - 1);
          }
        }
      } catch (e) {
        // 忽略可能的错误
      }
    }
    // 中高优先级情况
    else if (altLower.includes('brand') || 
             urlLower.includes('brand') ||
             altLower.includes('icon') && !altLower.includes('icon-') ||
             urlLower.includes('icon') && !urlLower.includes('icon-')) {
      priority = 2;
    }
    // 低优先级情况
    else if (source === 'background' ||
             urlLower.includes('footer')) {
      priority = 4;
    }
    
    // 确定文件类型
    let type = 'unknown';
    if (urlLower.includes('.svg')) type = 'svg';
    else if (urlLower.includes('.png')) type = 'png';
    else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) type = 'jpg';
    else if (urlLower.includes('.gif')) type = 'gif';
    else if (urlLower.includes('.webp')) type = 'webp';
    else if (urlLower.startsWith('data:image/svg+xml')) type = 'svg';
    else if (urlLower.startsWith('data:image/png')) type = 'png';
    else if (urlLower.startsWith('data:image/jpeg')) type = 'jpg';
    else if (urlLower.startsWith('data:image/gif')) type = 'gif';
    else if (urlLower.startsWith('data:image/webp')) type = 'webp';
    
    // 为SVG数据URL添加特殊检查：允许更简单的SVG（logo通常较简单）
    if (isSvgDataUrl) {
      // 对于SVG数据URL，如果复杂度太低可能是图标，太高可能是复杂插图
      const isGoodSvgComplexity = svgComplexity >= 0 && svgComplexity < 100;
      if (isSupportedFormat && (!isLikelyNotLogo || (urlLower.includes('logo') || urlLower.includes('brand'))) && !isLikelyNotLogoFile && isGoodSvgComplexity) {
        logoCandidates.push({
          url: fullUrl,
          alt: alt,
          source: source,
          type: type,
          size: 'unknown', // 将在popup中通过image对象获取
          priority: priority,
          hasDomainBrand: hasDomainBrandInUrl
        });
      }
    } else if (isSupportedFormat && !isLikelyNotLogo && !isLikelyNotLogoFile) {
      logoCandidates.push({
        url: fullUrl,
        alt: alt,
        source: source,
        type: type,
        size: 'unknown', // 将在popup中通过image对象获取
        priority: priority,
        hasDomainBrand: hasDomainBrandInUrl
      });
    }
  }
  
  // 增强的排序逻辑 - 特别优化SVG处理
  logoCandidates.sort((a, b) => {
    // 首先按优先级排序
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    
    // 相同优先级下，有域名品牌标识的排前面
    if (a.hasDomainBrand !== b.hasDomainBrand) {
      return a.hasDomainBrand ? -1 : 1;
    }
    
    // 增强：SVG格式优先于其他格式 - 提高优先级
    if (a.type === 'svg' && b.type !== 'svg') return -1;
    if (a.type !== 'svg' && b.type === 'svg') return 1;
    
    // 相同优先级下，透明格式优先
    const transparentFormats = ['svg', 'png', 'webp'];
    const aIsTransparent = transparentFormats.includes(a.type);
    const bIsTransparent = transparentFormats.includes(b.type);
    if (aIsTransparent !== bIsTransparent) {
      return aIsTransparent ? -1 : 1;
    }
    
    // 其他情况按来源排序 - 增强SVG来源优先级和logo文件优先级
    const sourcePriority = {
      'itemprop': 1,
      'svg-special': 2,   // 特殊SVG优先（包括desktop-logo-text）
      'logo-filename': 3, // 文件名包含logo的图片优先
      'logo-url': 4,      // URL包含logo的图片优先
      'svg-selector': 5,  // SVG特定选择器发现的优先
      'svg-header': 6,    // header中的SVG优先
      'favicon': 7,
      'meta-image': 8,
      'default': 9,
      'background': 10
    };
    const aSourcePriority = sourcePriority[a.source] || 999;
    const bSourcePriority = sourcePriority[b.source] || 999;
    if (aSourcePriority !== bSourcePriority) {
      return aSourcePriority - bSourcePriority;
    }
    
    // 增强：如果是SVG，优先展示从SVG元素直接提取的（非CSS背景）
    if (a.type === 'svg' && b.type === 'svg') {
      const aIsDirectSvg = a.source === 'svg-selector' || a.source === 'svg-header';
      const bIsDirectSvg = b.source === 'svg-selector' || b.source === 'svg-header';
      if (aIsDirectSvg !== bIsDirectSvg) {
        return aIsDirectSvg ? -1 : 1;
      }
    }
    
    // 最后按URL长度排序，通常logo的URL相对较短
    return a.url.length - b.url.length;
  });
  
  // 限制返回的结果数量，避免显示过多不相关内容
  // 返回更多高质量结果
  return logoCandidates.slice(0, 12);
}

// 当收到来自popup的消息时执行提取操作
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message);
  if (message.action === 'extractLogos') {
    console.log('开始提取logo...');
    try {
      const logos = extractLogos();
      console.log('提取到logo数量:', logos.length);
      console.log('logo数据:', logos);
      sendResponse({ logos: logos });
    } catch (error) {
      console.error('提取logo时出错:', error);
      sendResponse({ logos: [], error: error.message });
    }
    return true; // 保持消息通道开放，用于异步响应
  }
});

// 暴露提取函数供其他脚本调用（如果需要）
window.extractLogos = extractLogos;