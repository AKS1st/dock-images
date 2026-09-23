window.__ModuleLoader__.load({
	id: "dock-images",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client/ImageView.tsx
		const INITIAL_TRANSFORM = {
			scale: 1,
			rotation: 0,
			x: 0,
			y: 0
		};
		const MIN_SCALE = .1;
		const MAX_SCALE = 8;
		const INLINE = {
			wrap: {
				padding: "12px 16px",
				height: "100%",
				boxSizing: "border-box",
				display: "flex",
				flexDirection: "column"
			},
			head: {
				display: "flex",
				alignItems: "center",
				gap: 4,
				paddingBottom: 8,
				borderBottom: "1px solid var(--dsw-alias-border-l2, #d8dbe0)",
				marginBottom: 10,
				fontSize: 12,
				color: "var(--dsw-alias-label-secondary, #656d76)"
			},
			title: {
				fontWeight: 600,
				color: "var(--dsw-alias-label-primary, #1f2328)",
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
				marginLeft: 8,
				flex: 1
			},
			meta: {
				fontSize: 11,
				marginRight: 6
			},
			toolbar: {
				display: "flex",
				alignItems: "center",
				gap: 4
			},
			button: {
				border: "1px solid var(--dsw-alias-border-l2, #d8dbe0)",
				borderRadius: 4,
				background: "var(--dsw-alias-fill-control, transparent)",
				color: "var(--dsw-alias-label-primary, #1f2328)",
				cursor: "pointer",
				fontSize: 14,
				lineHeight: "20px",
				minWidth: 26,
				height: 24,
				padding: "0 5px"
			},
			stage: {
				flex: 1,
				minHeight: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				overflow: "hidden",
				touchAction: "none",
				userSelect: "none"
			},
			img: {
				maxWidth: "100%",
				maxHeight: "100%",
				objectFit: "contain",
				willChange: "transform",
				pointerEvents: "none"
			},
			err: {
				color: "#d1242f",
				fontSize: 13
			},
			empty: {
				color: "var(--dsw-alias-label-secondary, #656d76)",
				fontSize: 13
			}
		};
		function clampScale(scale) {
			return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
		}
		function ImageView(props) {
			const { sessionId, seed } = props;
			const openSeed = seed ?? {};
			const path = openSeed.path;
			const [dataUrl, setDataUrl] = (0, react.useState)(null);
			const [size, setSize] = (0, react.useState)(0);
			const [error, setError] = (0, react.useState)(null);
			const [transform, setTransform] = (0, react.useState)(INITIAL_TRANSFORM);
			const [dragging, setDragging] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				setTransform(INITIAL_TRANSFORM);
				setDragging(false);
				if (path === void 0) return;
				let cancelled = false;
				setDataUrl(null);
				setSize(0);
				setError(null);
				(async () => {
					try {
						const json = await (await fetch("/dock-images/read", {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({
								sessionId,
								path
							})
						})).json();
						if (json.ok !== true || json.value === void 0) throw new Error(json.error?.message ?? "read failed");
						if (cancelled) return;
						const image = json.value.image;
						setDataUrl(`data:${image.mime};base64,${image.content}`);
						setSize(image.size);
					} catch (cause) {
						if (cancelled) return;
						setError(cause instanceof Error ? cause.message : String(cause));
					}
				})();
				return () => {
					cancelled = true;
				};
			}, [path, sessionId]);
			const zoom = (factor) => setTransform((current) => ({
				...current,
				scale: clampScale(current.scale * factor)
			}));
			const rotate = (degrees) => setTransform((current) => ({
				...current,
				rotation: current.rotation + degrees
			}));
			const reset = () => setTransform(INITIAL_TRANSFORM);
			const onWheel = (event) => {
				event.preventDefault();
				zoom(event.deltaY < 0 ? 1.1 : 1 / 1.1);
			};
			const onPointerDown = (event) => {
				if (event.button !== 0) return;
				event.currentTarget.setPointerCapture(event.pointerId);
				setDragging(true);
			};
			const onPointerMove = (event) => {
				if (!dragging) return;
				setTransform((current) => ({
					...current,
					x: current.x + event.movementX,
					y: current.y + event.movementY
				}));
			};
			const stopDragging = (event) => {
				if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
				setDragging(false);
			};
			const title = openSeed.title ?? path?.split("/").pop() ?? "No image";
			const sizeText = size > 0 ? `${(size / 1024).toFixed(1)} KiB` : "";
			const imageStyle = {
				...INLINE.img,
				cursor: dragging ? "grabbing" : "grab",
				transform: `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`
			};
			return (0, react.createElement)("div", { style: INLINE.wrap }, (0, react.createElement)("div", { style: INLINE.head }, (0, react.createElement)("span", {
				style: INLINE.title,
				title: path
			}, title), sizeText !== "" ? (0, react.createElement)("span", { style: INLINE.meta }, sizeText) : null, (0, react.createElement)("div", {
				style: INLINE.toolbar,
				"aria-label": "Image controls"
			}, (0, react.createElement)("button", {
				type: "button",
				style: INLINE.button,
				onClick: () => rotate(-90),
				title: "Rotate counterclockwise",
				"aria-label": "Rotate counterclockwise"
			}, "↶"), (0, react.createElement)("button", {
				type: "button",
				style: INLINE.button,
				onClick: () => rotate(90),
				title: "Rotate clockwise",
				"aria-label": "Rotate clockwise"
			}, "↷"), (0, react.createElement)("button", {
				type: "button",
				style: INLINE.button,
				onClick: reset,
				title: "Reset image",
				"aria-label": "Reset image"
			}, "↺"))), error !== null ? (0, react.createElement)("div", { style: INLINE.err }, error) : dataUrl === null ? (0, react.createElement)("div", { style: INLINE.empty }, "Reading…") : (0, react.createElement)("div", {
				style: INLINE.stage,
				onWheel,
				onPointerDown,
				onPointerMove,
				onPointerUp: stopDragging,
				onPointerCancel: stopDragging
			}, (0, react.createElement)("img", {
				style: imageStyle,
				src: dataUrl,
				alt: title,
				draggable: false
			})));
		}
		//#endregion
		//#region src/client/index.ts
		/** Requires the workbench base (carrier) and the dock-files file domain. */
		const inject = ["workbench", "files"];
		/** Client plugin body. */
		function apply(ctx) {
			const workbench = ctx.get("workbench");
			const files = ctx.get("files");
			if (workbench === void 0 || files === void 0) return;
			ctx.effect(() => workbench.registerPlugin({
				id: "dock-images",
				title: "Images",
				description: "Image viewer for the dock file explorer: renders PNG, JPEG, GIF, WebP, BMP, SVG, ICO and AVIF files.",
				hasEntry: false
			}), "dock-images: plugin metadata");
			ctx.effect(() => files.registerFileViewer({
				id: "image",
				exts: [
					"png",
					"jpg",
					"jpeg",
					"gif",
					"webp",
					"bmp",
					"svg",
					"ico",
					"avif"
				],
				icon: {
					color: "#a074c4",
					viewBox: "0 0 16 16",
					path: "M5.20 2.40h5.60a2.8 2.8 0 0 1 2.8 2.8v5.60a2.8 2.8 0 0 1 -2.8 2.8h-5.60a2.8 2.8 0 0 1 -2.8 -2.8v-5.60a2.8 2.8 0 0 1 2.8 -2.8zM5.80 4.00h4.40a1.8 1.8 0 0 1 1.8 1.8v4.40a1.8 1.8 0 0 1 -1.8 1.8h-4.40a1.8 1.8 0 0 1 -1.8 -1.8v-4.40a1.8 1.8 0 0 1 1.8 -1.8zM10.3 4.4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM4.3 11.9L6.7 8l1.5 1.8 1-1.2 2.8 3.3z"
				}
			}), "dock-images: file viewer");
			ctx.effect(() => workbench.registerEditorView({
				id: "image",
				title: "Image",
				order: 120,
				component: ImageView
			}), "dock-images: view");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map