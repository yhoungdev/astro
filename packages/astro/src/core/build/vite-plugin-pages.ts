import type { Plugin as VitePlugin } from 'vite';
import type { BuildInternals } from './internal.js';
import type { StaticBuildOptions } from './types';
import { addRollupInput } from './add-rollup-input.js';
import { eachPageData } from './internal.js';
import { isBuildingToSSR } from '../util.js';

export const virtualModuleId = '@astrojs-pages-virtual-entry';
export const resolvedVirtualModuleId = '\0' + virtualModuleId;

export function vitePluginPages(opts: StaticBuildOptions, internals: BuildInternals): VitePlugin {
	return {
		name: '@astro/plugin-build-pages',

		options(options) {
			if (!isBuildingToSSR(opts.astroConfig)) {
				return addRollupInput(options, [virtualModuleId]);
			}
		},

		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId;
			}
		},

		load(id) {
			if (id === resolvedVirtualModuleId) {
				let importMap = '';
				let imports = [];
				let i = 0;
				for (const pageData of eachPageData(internals)) {
					const variable = `_page${i}`;
					imports.push(`import * as ${variable} from '${pageData.moduleSpecifier}';`);
					importMap += `['${pageData.component}', ${variable}],`;
					i++;
				}

				i = 0;
				let rendererItems = '';
				for (const renderer of opts.astroConfig._ctx.renderers) {
					const variable = `_renderer${i}`;
					imports.push(`import ${variable} from '${renderer.serverEntrypoint}';`);
					rendererItems += `Object.assign(${JSON.stringify(renderer)}, { ssr: ${variable} }),`;
					i++;
				}

				const def = `${imports.join('\n')}

export const pageMap = new Map([${importMap}]);
export const renderers = [${rendererItems}];`;

				return def;
			}
		},
	};
}
