import { e as createComponent, k as renderComponent, r as renderTemplate } from '../chunks/astro/server_Bw4UisD-.mjs';
import 'piccolore';
export { renderers } from '../renderers.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "CogCageLanding", null, { "client:only": "react", "client:component-hydration": "only", "client:component-path": "/Users/thealeks/clawd-engineer/projects/cogcage/repo/web/src/components/CogCageLanding.jsx", "client:component-export": "default" })}`;
}, "/Users/thealeks/clawd-engineer/projects/cogcage/repo/web/src/pages/index.astro", void 0);

const $$file = "/Users/thealeks/clawd-engineer/projects/cogcage/repo/web/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Index,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
