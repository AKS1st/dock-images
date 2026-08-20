/**
 * Image view: renders the image file carried by the open seed as a data URL.
 * The whole file is fetched as base64 through the /dock-images/read host
 * route (size-capped at 20 MiB on the host), then shown centered with
 * contain-fit sizing inside the floating window. Errors surface with the
 * same inline styling as the editor view.
 */
import { type ReactNode } from 'react';
import type { ViewProps } from './contract.ts';
export declare function ImageView(props: ViewProps): ReactNode;
