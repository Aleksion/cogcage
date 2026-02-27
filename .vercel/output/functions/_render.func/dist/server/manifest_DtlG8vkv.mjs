import 'piccolore';
import { o as decodeKey } from './chunks/astro/server_Bw4UisD-.mjs';
import 'clsx';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/astro-designed-error-pages_BS19qysg.mjs';
import 'es-module-lexer';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///Users/thealeks/clawd-engineer/projects/cogcage/repo/web/","cacheDir":"file:///Users/thealeks/clawd-engineer/projects/cogcage/repo/web/node_modules/.astro/","outDir":"file:///Users/thealeks/clawd-engineer/projects/cogcage/repo/web/dist/","srcDir":"file:///Users/thealeks/clawd-engineer/projects/cogcage/repo/web/src/","publicDir":"file:///Users/thealeks/clawd-engineer/projects/cogcage/repo/web/public/","buildClientDir":"file:///Users/thealeks/clawd-engineer/projects/cogcage/repo/web/dist/client/","buildServerDir":"file:///Users/thealeks/clawd-engineer/projects/cogcage/repo/web/dist/server/","adapterName":"@astrojs/vercel","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/checkout-success","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/checkout-success\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"checkout-success","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/checkout-success.ts","pathname":"/api/checkout-success","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/events","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/events\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"events","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/events.ts","pathname":"/api/events","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/founder-intent","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/founder-intent\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"founder-intent","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/founder-intent.ts","pathname":"/api/founder-intent","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/ops","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/ops\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"ops","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/ops.ts","pathname":"/api/ops","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/postback","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/postback\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"postback","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/postback.ts","pathname":"/api/postback","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/replay-fallback","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/replay-fallback\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"replay-fallback","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/replay-fallback.ts","pathname":"/api/replay-fallback","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/waitlist","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/waitlist\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"waitlist","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/waitlist.ts","pathname":"/api/waitlist","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/play","isIndex":false,"type":"page","pattern":"^\\/play\\/?$","segments":[[{"content":"play","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/play.astro","pathname":"/play","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":":root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#05050a}[data-astro-cid-sckkx6r4]{box-sizing:border-box}html,body{margin:0;width:100%;min-height:100%;background:radial-gradient(circle at 20% 10%,#15152d,#05050a 55%,#030306);color:#f6f7ff}a[data-astro-cid-sckkx6r4]{color:inherit}.shell[data-astro-cid-5y44lzmc]{max-width:920px;margin:0 auto;padding:1.75rem 1.25rem 4rem}.panel[data-astro-cid-5y44lzmc]{margin-top:2rem;border:1px solid rgba(255,255,255,.12);border-radius:1rem;padding:1.5rem;background:#ffffff08}.success[data-astro-cid-5y44lzmc]{max-width:760px}.eyebrow[data-astro-cid-5y44lzmc]{color:#9ca5ff;font-size:.78rem;letter-spacing:.12em;font-weight:700}h1[data-astro-cid-5y44lzmc]{margin:.4rem 0 1rem;line-height:1.12;font-size:clamp(1.9rem,4.2vw,3rem)}p[data-astro-cid-5y44lzmc]{color:#d0d5ef;line-height:1.55}.next-steps[data-astro-cid-5y44lzmc]{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.85rem;margin:1.4rem 0}.next-steps[data-astro-cid-5y44lzmc] article[data-astro-cid-5y44lzmc]{border:1px solid rgba(255,255,255,.13);border-radius:.8rem;padding:.85rem;background:#00000040}.next-steps[data-astro-cid-5y44lzmc] strong[data-astro-cid-5y44lzmc]{display:block;margin-bottom:.3rem}.next-steps[data-astro-cid-5y44lzmc] span[data-astro-cid-5y44lzmc]{color:#c8cdea;font-size:.92rem;line-height:1.45}.actions[data-astro-cid-5y44lzmc]{display:flex;gap:.7rem;flex-wrap:wrap;margin-top:1rem}.button[data-astro-cid-5y44lzmc]{border:0;text-decoration:none;border-radius:999px;padding:.72rem 1.2rem;font-weight:700;cursor:pointer;display:inline-flex;justify-content:center;align-items:center}.button-primary[data-astro-cid-5y44lzmc]{background:linear-gradient(135deg,#8a8fff,#5d6bff);color:#fff}.button-secondary[data-astro-cid-5y44lzmc]{background:#ffffff14;color:#f4f5ff;border:1px solid rgba(255,255,255,.16)}.fine-print[data-astro-cid-5y44lzmc]{margin-top:.9rem;color:#acb2d9;font-size:.84rem}\n"}],"routeData":{"route":"/success","isIndex":false,"type":"page","pattern":"^\\/success\\/?$","segments":[[{"content":"success","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/success.astro","pathname":"/success","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/Users/thealeks/clawd-engineer/projects/cogcage/repo/web/src/pages/success.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:src/pages/api/checkout-success@_@ts":"pages/api/checkout-success.astro.mjs","\u0000@astro-page:src/pages/api/events@_@ts":"pages/api/events.astro.mjs","\u0000@astro-page:src/pages/api/founder-intent@_@ts":"pages/api/founder-intent.astro.mjs","\u0000@astro-page:src/pages/api/ops@_@ts":"pages/api/ops.astro.mjs","\u0000@astro-page:src/pages/api/postback@_@ts":"pages/api/postback.astro.mjs","\u0000@astro-page:src/pages/api/replay-fallback@_@ts":"pages/api/replay-fallback.astro.mjs","\u0000@astro-page:src/pages/api/waitlist@_@ts":"pages/api/waitlist.astro.mjs","\u0000@astro-page:src/pages/play@_@astro":"pages/play.astro.mjs","\u0000@astro-page:src/pages/success@_@astro":"pages/success.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_DtlG8vkv.mjs","/Users/thealeks/clawd-engineer/projects/cogcage/repo/web/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_BEFx0Vjv.mjs","/Users/thealeks/clawd-engineer/projects/cogcage/repo/web/src/components/Play.tsx":"_astro/Play.CpNrQrwr.js","/Users/thealeks/clawd-engineer/projects/cogcage/repo/web/src/components/CogCageLanding.jsx":"_astro/CogCageLanding.RHin8-Wz.js","@astrojs/react/client.js":"_astro/client.CA4dleZN.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/favicon.ico","/favicon.svg","/_astro/CogCageLanding.RHin8-Wz.js","/_astro/Play.CpNrQrwr.js","/_astro/client.CA4dleZN.js","/_astro/index.DiEladB3.js","/_astro/jsx-runtime.D_zvdyIk.js"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"actionBodySizeLimit":1048576,"serverIslandNameMap":[],"key":"FbIyB+Wfd6c9dqIaoO+MMyCPfKEyCfkHLxQa5boKl0o="});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = null;

export { manifest };
