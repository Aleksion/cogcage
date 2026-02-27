import { e as createComponent, k as renderComponent, r as renderTemplate } from '../chunks/astro/server_Bw4UisD-.mjs';
import 'piccolore';
export { renderers } from '../renderers.mjs';

const $$Play = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Play", null, { "client:only": "react", "client:component-hydration": "only", "client:component-path": "/Users/thealeks/clawd-engineer/projects/cogcage/repo/web/src/components/Play.tsx", "client:component-export": "default" })}`;
}, "/Users/thealeks/clawd-engineer/projects/cogcage/repo/web/src/pages/play.astro", void 0);

const $$file = "/Users/thealeks/clawd-engineer/projects/cogcage/repo/web/src/pages/play.astro";
const $$url = "/play";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Play,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
