import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_DNaMXIOj.mjs';
import { manifest } from './manifest_DtlG8vkv.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/checkout-success.astro.mjs');
const _page2 = () => import('./pages/api/events.astro.mjs');
const _page3 = () => import('./pages/api/founder-intent.astro.mjs');
const _page4 = () => import('./pages/api/ops.astro.mjs');
const _page5 = () => import('./pages/api/postback.astro.mjs');
const _page6 = () => import('./pages/api/replay-fallback.astro.mjs');
const _page7 = () => import('./pages/api/waitlist.astro.mjs');
const _page8 = () => import('./pages/play.astro.mjs');
const _page9 = () => import('./pages/success.astro.mjs');
const _page10 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/checkout-success.ts", _page1],
    ["src/pages/api/events.ts", _page2],
    ["src/pages/api/founder-intent.ts", _page3],
    ["src/pages/api/ops.ts", _page4],
    ["src/pages/api/postback.ts", _page5],
    ["src/pages/api/replay-fallback.ts", _page6],
    ["src/pages/api/waitlist.ts", _page7],
    ["src/pages/play.astro", _page8],
    ["src/pages/success.astro", _page9],
    ["src/pages/index.astro", _page10]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "7bcd5901-3b6e-4416-814d-81227b321025",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
