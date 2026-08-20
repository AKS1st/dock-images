# dock-images

[English](README.en.md)

dock 系列的图片查看插件：为 dock-files 文件域注册 `image` 文件查看器（栅格/图片扩展名）与对应的编辑器区视图，通过自己的 `/dock-images` 主机路由读取图片内容（整文件 base64，20 MiB 上限）。

## 效果预览

![dock-images 图片查看视图](assets/image.png)

## 功能

- **支持格式**：PNG、JPEG、GIF、WebP、BMP、SVG、ICO、AVIF。
- **整文件读取**：一次性读取并转为 base64 数据 URL 渲染；超过 20 MiB 的文件在读取前即拒绝（413）。
- **SVG 安全**：SVG 仅以 `<img src="data:...">` 渲染，绝不做 innerHTML 注入。
- **尺寸上限提示**：超大图片可能消耗较多内存（无像素级上限），属已知取舍。

## 安装

需要 `dock` 与 `dock-files`：

```sh
dsh plugin add github:AKS1st/dock
dsh plugin add github:AKS1st/dock-files
dsh plugin add github:AKS1st/dock-images
```

## 安全

`/dock-images` 路由只接受受信任来源（回环地址 / trustedHosts + 同源检查）的 POST；读取路径先 realpath 规范化并限定在会话工作区内（越界 403）。

## License

MIT
