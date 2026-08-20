/**
 * Client half of dock-images: registers the 'image' file viewer against the
 * dock-files file domain (raster / image extensions) and the matching
 * editor-area view against dock. The view renders a file's image content
 * (fetched whole as base64 through its own /dock-images/read host route)
 * as a data URL, contain-fit inside the floating window.
 *
 * inject declares BOTH 'workbench' and 'files': Cordis activates this plugin
 * only after dock (carrier) and dock-files (file domain) have provided their
 * services, so the viewer registration is never skipped by activation order.
 */
import type {} from './contract.ts'
import type { WorkbenchContext, WorkbenchService } from './contract.ts'
import { ImageView } from './ImageView'

/** Requires the workbench base (carrier) and the dock-files file domain. */
export const inject = ['workbench', 'files']

/** Local structural face of ctx.files (avoid type dependency on dock-files). */
interface FilesService {
  registerFileViewer(def: {
    id: string
    exts?: string[]
    default?: boolean
    icon?: { color?: string; path?: string; viewBox?: string }
  }): () => void
}

/** Client plugin body. */
export function apply(ctx: WorkbenchContext): void {
  const workbench = ctx.get<WorkbenchService>('workbench')
  const files = ctx.get<FilesService>('files')
  // inject guarantees both services are present when this applies; guard
  // anyway so a broken runtime degrades instead of throwing.
  if (workbench === undefined || files === undefined) return

  // Register the file domain's image viewer for raster/image extensions,
  // with the explorer icon for those types: a picture glyph (rounded frame +
  // sun + mountain, single evenodd path in a 16×16 viewBox) tinted purple.
  ctx.effect(() => files.registerFileViewer({
    id: 'image',
    exts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif'],
    icon: {
      color: '#a074c4',
      viewBox: '0 0 16 16',
      path: 'M5.20 2.40h5.60a2.8 2.8 0 0 1 2.8 2.8v5.60a2.8 2.8 0 0 1 -2.8 2.8h-5.60a2.8 2.8 0 0 1 -2.8 -2.8v-5.60a2.8 2.8 0 0 1 2.8 -2.8zM5.80 4.00h4.40a1.8 1.8 0 0 1 1.8 1.8v4.40a1.8 1.8 0 0 1 -1.8 1.8h-4.40a1.8 1.8 0 0 1 -1.8 -1.8v-4.40a1.8 1.8 0 0 1 1.8 -1.8zM10.3 4.4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM4.3 11.9L6.7 8l1.5 1.8 1-1.2 2.8 3.3z',
    },
  }), 'dock-images: file viewer')

  // The view that receives open seeds ({ path, title }). It stays registered
  // as an editor-area view because floating windows resolve their view
  // through this registry; opening itself is always floating (dock-files
  // dispatches { mode: 'floating' }).
  ctx.effect(() => workbench.registerEditorView({
    id: 'image',
    title: 'Image',
    order: 120,
    component: ImageView,
  }), 'dock-images: view')
}
