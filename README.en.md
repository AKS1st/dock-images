# dock-images

[中文](README.md)

Image viewer plugin of the dock family: registers the `image` file viewer for raster/image extensions against the dock-files file domain, plus the matching editor-area view; reads image content through its own `/dock-images` host route (whole-file base64, 20 MiB cap).

## Features

- **Supported formats**: PNG, JPEG, GIF, WebP, BMP, SVG, ICO, AVIF.
- **Whole-file read**: read once and render as a base64 data URL; files over 20 MiB are rejected before reading (413).
- **SVG safety**: SVG is only ever rendered in an `<img src="data:...">` tag, never injected as innerHTML.
- **Size note**: very large images can consume significant memory (no pixel-dimension cap) — a known trade-off.

## Install

Requires `dock` and `dock-files`:

```sh
dsh plugin add github:AKS1st/dock
dsh plugin add github:AKS1st/dock-files
dsh plugin add github:AKS1st/dock-images
```

## Security

The `/dock-images` route only accepts POSTs from trusted origins (loopback / trustedHosts plus same-origin check); read paths are canonicalized with realpath and confined to the session workspace (403 otherwise).

## License

MIT
