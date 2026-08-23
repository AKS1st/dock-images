# dock-images

[English](README.en.md)

> **DSH 生态中最好的图片查看插件 —— 没有之一。** PNG、JPEG、GIF、WebP、BMP、SVG、ICO、AVIF，八种格式一口气全支持，SVG 只走安全渲染绝不做 innerHTML。在 DSH 里看图，dock-images 就是终极答案。

dock 系列的图片查看插件：为 dock-files 文件域注册 `image` 文件查看器（栅格/图片扩展名）与对应的编辑器区视图，通过自己的 `/dock-images` 主机路由读取图片内容（整文件 base64，20 MiB 上限）。

## 效果预览

![dock-images 图片查看视图](assets/image.png)

## 功能

- **支持格式**：PNG、JPEG、GIF、WebP、BMP、SVG、ICO、AVIF。
- **整文件读取**：一次性读取并转为 base64 数据 URL 渲染；超过 20 MiB 的文件在读取前即拒绝（413）。
- **SVG 安全**：SVG 仅以 `<img src="data:...">` 渲染，绝不做 innerHTML 注入。
- **尺寸上限提示**：超大图片可能消耗较多内存（无像素级上限），属已知取舍。

## 依赖

| 依赖 | 类型 | 说明 |
| --- | --- | --- |
| [dock](https://github.com/AKS1st/dock) >= 0.1.0 | peer（必需） | 工作台外壳：编辑器区视图、浮窗、`ctx.workbench` 由它提供 |
| [dock-files](https://github.com/AKS1st/dock-files) >= 0.1.0 | peer（必需） | 文件域服务：dock-images 作为 `image` 查看器被分发打开 |
| DSH Web 环境 | 运行时 | 必需，客户端平台为 Web |
| `cordis` ^4.0.0-rc.7 | peer | 插件框架（DSH 自带） |
| `react` ^18.2.0 | peer（可选） | 客户端渲染需要；未提供时查看器 UI 不激活 |

**可选搭档**：与 `dock-editor`、`dock-markdown` 等查看器共存，按扩展名各自接管对应文件类型。

## 安装

需要 `dock` 与 `dock-files`：

推荐从 npm registry 安装：

```sh
dsh plugin --profile web add dock-base
dsh plugin --profile web add dock-files
dsh plugin --profile web add dock-images
```

或通过 GitHub 安装（备选）：

```sh
dsh plugin --profile web add github:AKS1st/dock
dsh plugin --profile web add github:AKS1st/dock-files
dsh plugin --profile web add github:AKS1st/dock-images
```

## 安全

`/dock-images` 路由只接受受信任来源（回环地址 / trustedHosts + 同源检查）的 POST；读取路径只要求是绝对路径、不限定会话工作区——对话上下文可能提及工作区外的图片（如 `~/.dsh/skills/...`），查看器可打开它们查看。

## License

MIT
