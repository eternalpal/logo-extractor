# Logo Extractor 浏览器扩展

一个用于从网页中提取Logo图片并下载的Chrome扩展。

## 功能特点

- 自动扫描网页中的Logo图片
- 支持多种格式（PNG, JPG, SVG, WebP等）
- 智能识别算法，准确提取网站Logo
- 支持下载为不同格式和尺寸
- 简洁直观的用户界面

## 安装方法

1. 打开Chrome浏览器
2. 进入 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本项目文件夹

## 使用说明

1. 访问任意网站
2. 点击浏览器工具栏中的Logo Extractor图标
3. 插件会自动扫描页面中的Logo
4. 选择需要的Logo并点击下载按钮
5. 可选择下载格式（PNG/JPG/SVG/WebP）和尺寸

## 技术实现

### content.js
- 负责从当前页面提取潜在的Logo图片
- 实现多种Logo识别算法
- 只在页面起始位置查找Logo以提高准确性

### popup.js
- 处理用户界面交互
- 向content script发送消息获取Logo数据
- 展示Logo列表并处理下载请求

### background.js
- 提供下载功能的备用实现
- 处理扩展的安装和更新事件

### 文件结构
```
logo-extractor/
├── manifest.json      # 扩展配置文件
├── content.js         # 内容脚本
├── popup.js           # 弹出窗口脚本
├── popup.html         # 弹出窗口界面
├── popup.css          # 弹出窗口样式
├── background.js      # 后台脚本
├── icons/             # 扩展图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── bg.jpg             # 棋盘背景图
└── README.md          # 说明文档
```

## Logo识别算法

1. 常见Logo选择器匹配（.logo, #logo等）
2. Favicon和网站图标提取
3. Meta标签中的Logo信息
4. 基于URL关键词的识别（logo, brand等）
5. 图片尺寸和比例过滤
6. SVG元素专门处理
7. CSS变量和自定义属性中的Logo

## 注意事项

- 本扩展只在页面头部区域查找Logo以提高准确性
- 支持透明背景的PNG格式Logo
- 对SVG格式Logo进行了特殊优化处理
- 下载功能需要用户授权访问下载权限

## 版本更新

### v1.0
- 基础Logo提取和下载功能
- 支持多种图片格式
- 简洁的用户界面