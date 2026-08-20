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
  registerFileViewer(def: { id: string; exts?: string[]; default?: boolean }): () => void
}

/** Client plugin body. */
export function apply(ctx: WorkbenchContext): void {
  const workbench = ctx.get<WorkbenchService>('workbench')
  const files = ctx.get<FilesService>('files')
  // inject guarantees both services are present when this applies; guard
  // anyway so a broken runtime degrades instead of throwing.
  if (workbench === undefined || files === undefined) return

  // Register the file domain's image viewer for raster/image extensions.
  ctx.effect(() => files.registerFileViewer({
    id: 'image',
    exts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif'],
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
