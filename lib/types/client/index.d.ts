import type { WorkbenchContext } from './contract.ts';
/** Requires the workbench base (carrier) and the dock-files file domain. */
export declare const inject: string[];
/** Client plugin body. */
export declare function apply(ctx: WorkbenchContext): void;
