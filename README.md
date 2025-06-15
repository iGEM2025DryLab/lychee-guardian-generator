# 🍃 荔枝守卫虚拟形象生成器

**2025 HKUST(GZ) iGEM Team - Lychee Guardians**

一个基于AI技术的桌面应用程序，能够将用户的自拍照片转换为具有荔枝主题的幻想守卫角色。

![iGEM Logo](assets/logo.png)

## ✨ 功能特点

- 🎨 **AI驱动的图像生成**：使用多种先进的AI模型生成高质量的虚拟形象
- 📷 **多种输入方式**：支持图片上传和实时摄像头拍摄
- 🔄 **重新上传功能**：生成后可快速更换照片重新生成
- ⚡ **多API支持**：集成4种不同的AI服务提供商
- 🎭 **性别选择**：支持男性和女性荔枝守卫角色生成
- 💾 **高质量下载**：支持多种格式的图片保存
- 🔒 **隐私保护**：本地处理，不存储用户照片

## 🤖 支持的AI模型

1. **Google Gemini 2.0 Flash** - 先进的多模态AI模型
2. **Together.ai FLUX 1.1 Pro** - 专业级图像生成
3. **Segmind PixelFlow** - 高效的图像处理
4. **FLUX Kontext Pro** - 基于Replicate的文本驱动图像编辑

## 🚀 快速开始

### 系统要求

- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器
- macOS, Windows 或 Linux 操作系统

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/lychee-avatar.git
   cd lychee-avatar
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **设置 API-KEY**
    修改 `config/api-keys.template.js`，重命名为 `config/api-keys.js`

4. **启动应用**
   ```bash
   npm start
   ```

### 开发模式

```bash
# 开发模式（热重载）
npm run dev

# 构建应用
npm run build

# 打包分发版本
npm run dist
```

## 📱 使用指南

### 基本使用流程

1. **上传照片**
   - 点击"选择图片"从设备选择自拍照
   - 或点击"拍摄照片"使用摄像头实时拍摄

2. **选择性别**
   - 选择"男性荔枝守卫"或"女性荔枝守卫"

3. **生成头像**
   - 点击"生成荔枝守卫"按钮
   - 等待AI处理（通常需要10-30秒）

4. **保存结果**
   - 点击"下载头像"保存生成的图片
   - 或点击"重新上传"更换照片重新生成

### 高级设置

- **API设置**：在设置中切换不同的AI模型
- **提示词设置**：自定义角色生成的描述
- **隐私说明**：了解数据处理和隐私保护

## 🛠️ 技术架构

### 前端技术栈

- **Electron** - 跨平台桌面应用框架
- **HTML5/CSS3** - 现代化用户界面
- **JavaScript (ES6+)** - 应用逻辑实现
- **Canvas API** - 图像处理和摄像头功能

### AI集成

- **Google Gemini API** - 多模态AI图像生成
- **Together.ai API** - 由 Together.ai 提供的 FLUX Kontext 模型
- **Segmind API** - 由 Segmind 提供的 FLUX Kontext 模型
- **Replicate API** - 由 Replicate 提供的 FLUX Kontext 模型

### 核心功能模块

```
src/
├── main.js          # Electron主进程
├── renderer.js      # 渲染进程逻辑
├── index.html       # 主界面布局
└── test.md         # 测试文档

css/
└── style.css       # 样式表

assets/
└── logo.png        # 应用图标

config/
└── api-keys.js     # API-KEY 设置
```

## 🎨 荔枝守卫角色设计

### 男性荔枝守卫
- 18岁的男性幻想骑士，荔枝精灵
- 高大健壮的体型
- 酒红色到粉色渐变的凌乱发型
- 深红色眼睛
- 荔枝壳主题的优雅幻想盔甲
- 东方长袍风格，层叠斗篷如干果皮
- 手持发光水雾的弯曲叶刃

### 女性荔枝守卫
- 18岁的女性幻想骑士，荔枝精灵
- 高挑优雅的体型
- 相同的发色和眼色特征
- 符合女性特点的荔枝主题装备
- 优雅的自然主题幻想艺术风格

## 🔧 配置说明

### API密钥配置

自定义API密钥，请参考：

```javascript
// renderer.js 中的API密钥常量
const GEMINI_API_KEY = 'your-gemini-key';
const TOGETHER_API_KEY = 'your-together-key';
const SEGMIND_API_KEY = 'your-segmind-key';
const FLUX_KONTEXT_API_KEY = 'your-replicate-key';
```

## 🔒 隐私与安全

### 数据处理原则

- ✅ **本地优先**：图像压缩和预处理在本地完成
- ✅ **临时传输**：图片仅在生成过程中发送到AI服务
- ✅ **不存储**：应用不保存用户上传的照片
- ✅ **自动清理**：处理完成后自动清除临时数据

### 第三方服务

使用以下AI服务进行图像生成：
- Google Gemini API
- Together.ai API
- Segmind API
- Replicate API

请查看各服务的隐私政策了解数据处理详情。

## 🤝 贡献指南

### 开发环境设置

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add some amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交Pull Request

### 代码规范

- 使用ES6+语法
- 遵循JavaScript Standard Style
- 添加适当的注释和文档
- 确保跨平台兼容性

### 问题报告

如果遇到问题，请提供：
- 操作系统版本
- Node.js版本
- 详细的错误信息
- 重现步骤

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 团队

**2025 HKUST(GZ) iGEM Team - Lychee Guardians**

- 项目维护者：[团队成员姓名]
- 技术支持：[联系邮箱]
- 官方网站：[团队网站]

## 🙏 致谢

- 感谢所有AI服务提供商的技术支持
- 感谢开源社区的贡献
- 特别感谢iGEM组织的支持

## 📊 版本历史

### v1.0.0 (2025-01-XX)
- ✨ 初始版本发布
- 🤖 集成4种AI模型
- 📷 支持摄像头拍摄
- 🔄 重新上传功能
- 🎨 现代化UI设计

---

**如有任何问题或建议，欢迎提交Issue或联系团队！** 🚀