import{j as s}from"./jsx-runtime.D_zvdyIk.js";import{r as l}from"./index.DiEladB3.js";/**
 * react-router v7.13.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var ke="popstate";function Re(e){return typeof e=="object"&&e!=null&&"pathname"in e&&"search"in e&&"hash"in e&&"state"in e&&"key"in e}function lt(e={}){function t(a,n){let o=n.state?.masked,{pathname:i,search:u,hash:c}=o||a.location;return se("",{pathname:i,search:u,hash:c},n.state&&n.state.usr||null,n.state&&n.state.key||"default",o?{pathname:a.location.pathname,search:a.location.search,hash:a.location.hash}:void 0)}function r(a,n){return typeof n=="string"?n:q(n)}return dt(t,r,null,e)}function C(e,t){if(e===!1||e===null||typeof e>"u")throw new Error(t)}function L(e,t){if(!e){typeof console<"u"&&console.warn(t);try{throw new Error(t)}catch{}}}function ct(){return Math.random().toString(36).substring(2,10)}function Ee(e,t){return{usr:e.state,key:e.key,idx:t,masked:e.unstable_mask?{pathname:e.pathname,search:e.search,hash:e.hash}:void 0}}function se(e,t,r=null,a,n){return{pathname:typeof e=="string"?e:e.pathname,search:"",hash:"",...typeof t=="string"?U(t):t,state:r,key:t&&t.key||a||ct(),unstable_mask:n}}function q({pathname:e="/",search:t="",hash:r=""}){return t&&t!=="?"&&(e+=t.charAt(0)==="?"?t:"?"+t),r&&r!=="#"&&(e+=r.charAt(0)==="#"?r:"#"+r),e}function U(e){let t={};if(e){let r=e.indexOf("#");r>=0&&(t.hash=e.substring(r),e=e.substring(0,r));let a=e.indexOf("?");a>=0&&(t.search=e.substring(a),e=e.substring(0,a)),e&&(t.pathname=e)}return t}function dt(e,t,r,a={}){let{window:n=document.defaultView,v5Compat:o=!1}=a,i=n.history,u="POP",c=null,m=p();m==null&&(m=0,i.replaceState({...i.state,idx:m},""));function p(){return(i.state||{idx:null}).idx}function d(){u="POP";let f=p(),R=f==null?null:f-m;m=f,c&&c({action:u,location:y.location,delta:R})}function h(f,R){u="PUSH";let b=Re(f)?f:se(y.location,f,R);m=p()+1;let x=Ee(b,m),g=y.createHref(b.unstable_mask||b);try{i.pushState(x,"",g)}catch(k){if(k instanceof DOMException&&k.name==="DataCloneError")throw k;n.location.assign(g)}o&&c&&c({action:u,location:y.location,delta:1})}function w(f,R){u="REPLACE";let b=Re(f)?f:se(y.location,f,R);m=p();let x=Ee(b,m),g=y.createHref(b.unstable_mask||b);i.replaceState(x,"",g),o&&c&&c({action:u,location:y.location,delta:0})}function v(f){return ut(f)}let y={get action(){return u},get location(){return e(n,i)},listen(f){if(c)throw new Error("A history only accepts one active listener");return n.addEventListener(ke,d),c=f,()=>{n.removeEventListener(ke,d),c=null}},createHref(f){return t(n,f)},createURL:v,encodeLocation(f){let R=v(f);return{pathname:R.pathname,search:R.search,hash:R.hash}},push:h,replace:w,go(f){return i.go(f)}};return y}function ut(e,t=!1){let r="http://localhost";typeof window<"u"&&(r=window.location.origin!=="null"?window.location.origin:window.location.href),C(r,"No window.location.(origin|href) available to create URL");let a=typeof e=="string"?e:q(e);return a=a.replace(/ $/,"%20"),!t&&a.startsWith("//")&&(a=r+a),new URL(a,r)}function Te(e,t,r="/"){return mt(e,t,r,!1)}function mt(e,t,r,a){let n=typeof t=="string"?U(t):t,o=P(n.pathname||"/",r);if(o==null)return null;let i=Ae(e);pt(i);let u=null;for(let c=0;u==null&&c<i.length;++c){let m=Et(o);u=kt(i[c],m,a)}return u}function Ae(e,t=[],r=[],a="",n=!1){let o=(i,u,c=n,m)=>{let p={relativePath:m===void 0?i.path||"":m,caseSensitive:i.caseSensitive===!0,childrenIndex:u,route:i};if(p.relativePath.startsWith("/")){if(!p.relativePath.startsWith(a)&&c)return;C(p.relativePath.startsWith(a),`Absolute route path "${p.relativePath}" nested under path "${a}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),p.relativePath=p.relativePath.slice(a.length)}let d=F([a,p.relativePath]),h=r.concat(p);i.children&&i.children.length>0&&(C(i.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${d}".`),Ae(i.children,t,h,d,c)),!(i.path==null&&!i.index)&&t.push({path:d,score:wt(d,i.index),routesMeta:h})};return e.forEach((i,u)=>{if(i.path===""||!i.path?.includes("?"))o(i,u);else for(let c of Oe(i.path))o(i,u,!0,c)}),t}function Oe(e){let t=e.split("/");if(t.length===0)return[];let[r,...a]=t,n=r.endsWith("?"),o=r.replace(/\?$/,"");if(a.length===0)return n?[o,""]:[o];let i=Oe(a.join("/")),u=[];return u.push(...i.map(c=>c===""?o:[o,c].join("/"))),n&&u.push(...i),u.map(c=>e.startsWith("/")&&c===""?"/":c)}function pt(e){e.sort((t,r)=>t.score!==r.score?r.score-t.score:bt(t.routesMeta.map(a=>a.childrenIndex),r.routesMeta.map(a=>a.childrenIndex)))}var ft=/^:[\w-]+$/,ht=3,gt=2,vt=1,yt=10,xt=-2,Ce=e=>e==="*";function wt(e,t){let r=e.split("/"),a=r.length;return r.some(Ce)&&(a+=xt),t&&(a+=gt),r.filter(n=>!Ce(n)).reduce((n,o)=>n+(ft.test(o)?ht:o===""?vt:yt),a)}function bt(e,t){return e.length===t.length&&e.slice(0,-1).every((a,n)=>a===t[n])?e[e.length-1]-t[t.length-1]:0}function kt(e,t,r=!1){let{routesMeta:a}=e,n={},o="/",i=[];for(let u=0;u<a.length;++u){let c=a[u],m=u===a.length-1,p=o==="/"?t:t.slice(o.length)||"/",d=Z({path:c.relativePath,caseSensitive:c.caseSensitive,end:m},p),h=c.route;if(!d&&m&&r&&!a[a.length-1].route.index&&(d=Z({path:c.relativePath,caseSensitive:c.caseSensitive,end:!1},p)),!d)return null;Object.assign(n,d.params),i.push({params:n,pathname:F([o,d.pathname]),pathnameBase:Nt(F([o,d.pathnameBase])),route:h}),d.pathnameBase!=="/"&&(o=F([o,d.pathnameBase]))}return i}function Z(e,t){typeof e=="string"&&(e={path:e,caseSensitive:!1,end:!0});let[r,a]=Rt(e.path,e.caseSensitive,e.end),n=t.match(r);if(!n)return null;let o=n[0],i=o.replace(/(.)\/+$/,"$1"),u=n.slice(1);return{params:a.reduce((m,{paramName:p,isOptional:d},h)=>{if(p==="*"){let v=u[h]||"";i=o.slice(0,o.length-v.length).replace(/(.)\/+$/,"$1")}const w=u[h];return d&&!w?m[p]=void 0:m[p]=(w||"").replace(/%2F/g,"/"),m},{}),pathname:o,pathnameBase:i,pattern:e}}function Rt(e,t=!1,r=!0){L(e==="*"||!e.endsWith("*")||e.endsWith("/*"),`Route path "${e}" will be treated as if it were "${e.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${e.replace(/\*$/,"/*")}".`);let a=[],n="^"+e.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(i,u,c,m,p)=>{if(a.push({paramName:u,isOptional:c!=null}),c){let d=p.charAt(m+i.length);return d&&d!=="/"?"/([^\\/]*)":"(?:/([^\\/]*))?"}return"/([^\\/]+)"}).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return e.endsWith("*")?(a.push({paramName:"*"}),n+=e==="*"||e==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):r?n+="\\/*$":e!==""&&e!=="/"&&(n+="(?:(?=\\/|$))"),[new RegExp(n,t?void 0:"i"),a]}function Et(e){try{return e.split("/").map(t=>decodeURIComponent(t).replace(/\//g,"%2F")).join("/")}catch(t){return L(!1,`The URL path "${e}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${t}).`),e}}function P(e,t){if(t==="/")return e;if(!e.toLowerCase().startsWith(t.toLowerCase()))return null;let r=t.endsWith("/")?t.length-1:t.length,a=e.charAt(r);return a&&a!=="/"?null:e.slice(r)||"/"}var Ct=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;function St(e,t="/"){let{pathname:r,search:a="",hash:n=""}=typeof e=="string"?U(e):e,o;return r?(r=r.replace(/\/\/+/g,"/"),r.startsWith("/")?o=Se(r.substring(1),"/"):o=Se(r,t)):o=t,{pathname:o,search:It(a),hash:Ft(n)}}function Se(e,t){let r=t.replace(/\/+$/,"").split("/");return e.split("/").forEach(n=>{n===".."?r.length>1&&r.pop():n!=="."&&r.push(n)}),r.length>1?r.join("/"):"/"}function ae(e,t,r,a){return`Cannot include a '${e}' character in a manually specified \`to.${t}\` field [${JSON.stringify(a)}].  Please separate it out to the \`to.${r}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function jt(e){return e.filter((t,r)=>r===0||t.route.path&&t.route.path.length>0)}function De(e){let t=jt(e);return t.map((r,a)=>a===t.length-1?r.pathname:r.pathnameBase)}function fe(e,t,r,a=!1){let n;typeof e=="string"?n=U(e):(n={...e},C(!n.pathname||!n.pathname.includes("?"),ae("?","pathname","search",n)),C(!n.pathname||!n.pathname.includes("#"),ae("#","pathname","hash",n)),C(!n.search||!n.search.includes("#"),ae("#","search","hash",n)));let o=e===""||n.pathname==="",i=o?"/":n.pathname,u;if(i==null)u=r;else{let d=t.length-1;if(!a&&i.startsWith("..")){let h=i.split("/");for(;h[0]==="..";)h.shift(),d-=1;n.pathname=h.join("/")}u=d>=0?t[d]:"/"}let c=St(n,u),m=i&&i!=="/"&&i.endsWith("/"),p=(o||i===".")&&r.endsWith("/");return!c.pathname.endsWith("/")&&(m||p)&&(c.pathname+="/"),c}var F=e=>e.join("/").replace(/\/\/+/g,"/"),Nt=e=>e.replace(/\/+$/,"").replace(/^\/*/,"/"),It=e=>!e||e==="?"?"":e.startsWith("?")?e:"?"+e,Ft=e=>!e||e==="#"?"":e.startsWith("#")?e:"#"+e,Lt=class{constructor(e,t,r,a=!1){this.status=e,this.statusText=t||"",this.internal=a,r instanceof Error?(this.data=r.toString(),this.error=r):this.data=r}};function Pt(e){return e!=null&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.internal=="boolean"&&"data"in e}function $t(e){return e.map(t=>t.route.path).filter(Boolean).join("/").replace(/\/\/*/g,"/")||"/"}var Be=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";function Me(e,t){let r=e;if(typeof r!="string"||!Ct.test(r))return{absoluteURL:void 0,isExternal:!1,to:r};let a=r,n=!1;if(Be)try{let o=new URL(window.location.href),i=r.startsWith("//")?new URL(o.protocol+r):new URL(r),u=P(i.pathname,t);i.origin===o.origin&&u!=null?r=u+i.search+i.hash:n=!0}catch{L(!1,`<Link to="${r}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:a,isExternal:n,to:r}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var Ue=["POST","PUT","PATCH","DELETE"];new Set(Ue);var _t=["GET",...Ue];new Set(_t);var z=l.createContext(null);z.displayName="DataRouter";var te=l.createContext(null);te.displayName="DataRouterState";var Tt=l.createContext(!1),ze=l.createContext({isTransitioning:!1});ze.displayName="ViewTransition";var At=l.createContext(new Map);At.displayName="Fetchers";var Ot=l.createContext(null);Ot.displayName="Await";var N=l.createContext(null);N.displayName="Navigation";var V=l.createContext(null);V.displayName="Location";var $=l.createContext({outlet:null,matches:[],isDataRoute:!1});$.displayName="Route";var he=l.createContext(null);he.displayName="RouteError";var We="REACT_ROUTER_ERROR",Dt="REDIRECT",Bt="ROUTE_ERROR_RESPONSE";function Mt(e){if(e.startsWith(`${We}:${Dt}:{`))try{let t=JSON.parse(e.slice(28));if(typeof t=="object"&&t&&typeof t.status=="number"&&typeof t.statusText=="string"&&typeof t.location=="string"&&typeof t.reloadDocument=="boolean"&&typeof t.replace=="boolean")return t}catch{}}function Ut(e){if(e.startsWith(`${We}:${Bt}:{`))try{let t=JSON.parse(e.slice(40));if(typeof t=="object"&&t&&typeof t.status=="number"&&typeof t.statusText=="string")return new Lt(t.status,t.statusText,t.data)}catch{}}function zt(e,{relative:t}={}){C(G(),"useHref() may be used only in the context of a <Router> component.");let{basename:r,navigator:a}=l.useContext(N),{hash:n,pathname:o,search:i}=J(e,{relative:t}),u=o;return r!=="/"&&(u=o==="/"?r:F([r,o])),a.createHref({pathname:u,search:i,hash:n})}function G(){return l.useContext(V)!=null}function O(){return C(G(),"useLocation() may be used only in the context of a <Router> component."),l.useContext(V).location}var He="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function qe(e){l.useContext(N).static||l.useLayoutEffect(e)}function Wt(){let{isDataRoute:e}=l.useContext($);return e?rr():Ht()}function Ht(){C(G(),"useNavigate() may be used only in the context of a <Router> component.");let e=l.useContext(z),{basename:t,navigator:r}=l.useContext(N),{matches:a}=l.useContext($),{pathname:n}=O(),o=JSON.stringify(De(a)),i=l.useRef(!1);return qe(()=>{i.current=!0}),l.useCallback((c,m={})=>{if(L(i.current,He),!i.current)return;if(typeof c=="number"){r.go(c);return}let p=fe(c,JSON.parse(o),n,m.relative==="path");e==null&&t!=="/"&&(p.pathname=p.pathname==="/"?t:F([t,p.pathname])),(m.replace?r.replace:r.push)(p,m.state,m)},[t,r,o,n,e])}l.createContext(null);function J(e,{relative:t}={}){let{matches:r}=l.useContext($),{pathname:a}=O(),n=JSON.stringify(De(r));return l.useMemo(()=>fe(e,JSON.parse(n),a,t==="path"),[e,n,a,t])}function qt(e,t){return Ve(e,t)}function Ve(e,t,r){C(G(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:a}=l.useContext(N),{matches:n}=l.useContext($),o=n[n.length-1],i=o?o.params:{},u=o?o.pathname:"/",c=o?o.pathnameBase:"/",m=o&&o.route;{let f=m&&m.path||"";Je(u,!m||f.endsWith("*")||f.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${u}" (under <Route path="${f}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${f}"> to <Route path="${f==="/"?"*":`${f}/*`}">.`)}let p=O(),d;if(t){let f=typeof t=="string"?U(t):t;C(c==="/"||f.pathname?.startsWith(c),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${c}" but pathname "${f.pathname}" was given in the \`location\` prop.`),d=f}else d=p;let h=d.pathname||"/",w=h;if(c!=="/"){let f=c.replace(/^\//,"").split("/");w="/"+h.replace(/^\//,"").split("/").slice(f.length).join("/")}let v=Te(e,{pathname:w});L(m||v!=null,`No routes matched location "${d.pathname}${d.search}${d.hash}" `),L(v==null||v[v.length-1].route.element!==void 0||v[v.length-1].route.Component!==void 0||v[v.length-1].route.lazy!==void 0,`Matched leaf route at location "${d.pathname}${d.search}${d.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let y=Yt(v&&v.map(f=>Object.assign({},f,{params:Object.assign({},i,f.params),pathname:F([c,a.encodeLocation?a.encodeLocation(f.pathname.replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:f.pathname]),pathnameBase:f.pathnameBase==="/"?c:F([c,a.encodeLocation?a.encodeLocation(f.pathnameBase.replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:f.pathnameBase])})),n,r);return t&&y?l.createElement(V.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",unstable_mask:void 0,...d},navigationType:"POP"}},y):y}function Vt(){let e=tr(),t=Pt(e)?`${e.status} ${e.statusText}`:e instanceof Error?e.message:JSON.stringify(e),r=e instanceof Error?e.stack:null,a="rgba(200,200,200, 0.5)",n={padding:"0.5rem",backgroundColor:a},o={padding:"2px 4px",backgroundColor:a},i=null;return console.error("Error handled by React Router default ErrorBoundary:",e),i=l.createElement(l.Fragment,null,l.createElement("p",null,"💿 Hey developer 👋"),l.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",l.createElement("code",{style:o},"ErrorBoundary")," or"," ",l.createElement("code",{style:o},"errorElement")," prop on your route.")),l.createElement(l.Fragment,null,l.createElement("h2",null,"Unexpected Application Error!"),l.createElement("h3",{style:{fontStyle:"italic"}},t),r?l.createElement("pre",{style:n},r):null,i)}var Gt=l.createElement(Vt,null),Ge=class extends l.Component{constructor(e){super(e),this.state={location:e.location,revalidation:e.revalidation,error:e.error}}static getDerivedStateFromError(e){return{error:e}}static getDerivedStateFromProps(e,t){return t.location!==e.location||t.revalidation!=="idle"&&e.revalidation==="idle"?{error:e.error,location:e.location,revalidation:e.revalidation}:{error:e.error!==void 0?e.error:t.error,location:t.location,revalidation:e.revalidation||t.revalidation}}componentDidCatch(e,t){this.props.onError?this.props.onError(e,t):console.error("React Router caught the following error during render",e)}render(){let e=this.state.error;if(this.context&&typeof e=="object"&&e&&"digest"in e&&typeof e.digest=="string"){const r=Ut(e.digest);r&&(e=r)}let t=e!==void 0?l.createElement($.Provider,{value:this.props.routeContext},l.createElement(he.Provider,{value:e,children:this.props.component})):this.props.children;return this.context?l.createElement(Jt,{error:e},t):t}};Ge.contextType=Tt;var ne=new WeakMap;function Jt({children:e,error:t}){let{basename:r}=l.useContext(N);if(typeof t=="object"&&t&&"digest"in t&&typeof t.digest=="string"){let a=Mt(t.digest);if(a){let n=ne.get(t);if(n)throw n;let o=Me(a.location,r);if(Be&&!ne.get(t))if(o.isExternal||a.reloadDocument)window.location.href=o.absoluteURL||o.to;else{const i=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(o.to,{replace:a.replace}));throw ne.set(t,i),i}return l.createElement("meta",{httpEquiv:"refresh",content:`0;url=${o.absoluteURL||o.to}`})}}return e}function Kt({routeContext:e,match:t,children:r}){let a=l.useContext(z);return a&&a.static&&a.staticContext&&(t.route.errorElement||t.route.ErrorBoundary)&&(a.staticContext._deepestRenderedBoundaryId=t.route.id),l.createElement($.Provider,{value:e},r)}function Yt(e,t=[],r){let a=r?.state;if(e==null){if(!a)return null;if(a.errors)e=a.matches;else if(t.length===0&&!a.initialized&&a.matches.length>0)e=a.matches;else return null}let n=e,o=a?.errors;if(o!=null){let p=n.findIndex(d=>d.route.id&&o?.[d.route.id]!==void 0);C(p>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(o).join(",")}`),n=n.slice(0,Math.min(n.length,p+1))}let i=!1,u=-1;if(r&&a){i=a.renderFallback;for(let p=0;p<n.length;p++){let d=n[p];if((d.route.HydrateFallback||d.route.hydrateFallbackElement)&&(u=p),d.route.id){let{loaderData:h,errors:w}=a,v=d.route.loader&&!h.hasOwnProperty(d.route.id)&&(!w||w[d.route.id]===void 0);if(d.route.lazy||v){r.isStatic&&(i=!0),u>=0?n=n.slice(0,u+1):n=[n[0]];break}}}}let c=r?.onError,m=a&&c?(p,d)=>{c(p,{location:a.location,params:a.matches?.[0]?.params??{},unstable_pattern:$t(a.matches),errorInfo:d})}:void 0;return n.reduceRight((p,d,h)=>{let w,v=!1,y=null,f=null;a&&(w=o&&d.route.id?o[d.route.id]:void 0,y=d.route.errorElement||Gt,i&&(u<0&&h===0?(Je("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),v=!0,f=null):u===h&&(v=!0,f=d.route.hydrateFallbackElement||null)));let R=t.concat(n.slice(0,h+1)),b=()=>{let x;return w?x=y:v?x=f:d.route.Component?x=l.createElement(d.route.Component,null):d.route.element?x=d.route.element:x=p,l.createElement(Kt,{match:d,routeContext:{outlet:p,matches:R,isDataRoute:a!=null},children:x})};return a&&(d.route.ErrorBoundary||d.route.errorElement||h===0)?l.createElement(Ge,{location:a.location,revalidation:a.revalidation,component:y,error:w,children:b(),routeContext:{outlet:null,matches:R,isDataRoute:!0},onError:m}):b()},null)}function ge(e){return`${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function Xt(e){let t=l.useContext(z);return C(t,ge(e)),t}function Qt(e){let t=l.useContext(te);return C(t,ge(e)),t}function Zt(e){let t=l.useContext($);return C(t,ge(e)),t}function ve(e){let t=Zt(e),r=t.matches[t.matches.length-1];return C(r.route.id,`${e} can only be used on routes that contain a unique "id"`),r.route.id}function er(){return ve("useRouteId")}function tr(){let e=l.useContext(he),t=Qt("useRouteError"),r=ve("useRouteError");return e!==void 0?e:t.errors?.[r]}function rr(){let{router:e}=Xt("useNavigate"),t=ve("useNavigate"),r=l.useRef(!1);return qe(()=>{r.current=!0}),l.useCallback(async(n,o={})=>{L(r.current,He),r.current&&(typeof n=="number"?await e.navigate(n):await e.navigate(n,{fromRouteId:t,...o}))},[e,t])}var je={};function Je(e,t,r){!t&&!je[e]&&(je[e]=!0,L(!1,r))}l.memo(ar);function ar({routes:e,future:t,state:r,isStatic:a,onError:n}){return Ve(e,void 0,{state:r,isStatic:a,onError:n})}function le(e){C(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function nr({basename:e="/",children:t=null,location:r,navigationType:a="POP",navigator:n,static:o=!1,unstable_useTransitions:i}){C(!G(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let u=e.replace(/^\/*/,"/"),c=l.useMemo(()=>({basename:u,navigator:n,static:o,unstable_useTransitions:i,future:{}}),[u,n,o,i]);typeof r=="string"&&(r=U(r));let{pathname:m="/",search:p="",hash:d="",state:h=null,key:w="default",unstable_mask:v}=r,y=l.useMemo(()=>{let f=P(m,u);return f==null?null:{location:{pathname:f,search:p,hash:d,state:h,key:w,unstable_mask:v},navigationType:a}},[u,m,p,d,h,w,a,v]);return L(y!=null,`<Router basename="${u}"> is not able to match the URL "${m}${p}${d}" because it does not start with the basename, so the <Router> won't render anything.`),y==null?null:l.createElement(N.Provider,{value:c},l.createElement(V.Provider,{children:t,value:y}))}function or({children:e,location:t}){return qt(ce(e),t)}function ce(e,t=[]){let r=[];return l.Children.forEach(e,(a,n)=>{if(!l.isValidElement(a))return;let o=[...t,n];if(a.type===l.Fragment){r.push.apply(r,ce(a.props.children,o));return}C(a.type===le,`[${typeof a.type=="string"?a.type:a.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),C(!a.props.index||!a.props.children,"An index route cannot have child routes.");let i={id:a.props.id||o.join("-"),caseSensitive:a.props.caseSensitive,element:a.props.element,Component:a.props.Component,index:a.props.index,path:a.props.path,middleware:a.props.middleware,loader:a.props.loader,action:a.props.action,hydrateFallbackElement:a.props.hydrateFallbackElement,HydrateFallback:a.props.HydrateFallback,errorElement:a.props.errorElement,ErrorBoundary:a.props.ErrorBoundary,hasErrorBoundary:a.props.hasErrorBoundary===!0||a.props.ErrorBoundary!=null||a.props.errorElement!=null,shouldRevalidate:a.props.shouldRevalidate,handle:a.props.handle,lazy:a.props.lazy};a.props.children&&(i.children=ce(a.props.children,o)),r.push(i)}),r}var X="get",Q="application/x-www-form-urlencoded";function re(e){return typeof HTMLElement<"u"&&e instanceof HTMLElement}function ir(e){return re(e)&&e.tagName.toLowerCase()==="button"}function sr(e){return re(e)&&e.tagName.toLowerCase()==="form"}function lr(e){return re(e)&&e.tagName.toLowerCase()==="input"}function cr(e){return!!(e.metaKey||e.altKey||e.ctrlKey||e.shiftKey)}function dr(e,t){return e.button===0&&(!t||t==="_self")&&!cr(e)}var Y=null;function ur(){if(Y===null)try{new FormData(document.createElement("form"),0),Y=!1}catch{Y=!0}return Y}var mr=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function oe(e){return e!=null&&!mr.has(e)?(L(!1,`"${e}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Q}"`),null):e}function pr(e,t){let r,a,n,o,i;if(sr(e)){let u=e.getAttribute("action");a=u?P(u,t):null,r=e.getAttribute("method")||X,n=oe(e.getAttribute("enctype"))||Q,o=new FormData(e)}else if(ir(e)||lr(e)&&(e.type==="submit"||e.type==="image")){let u=e.form;if(u==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let c=e.getAttribute("formaction")||u.getAttribute("action");if(a=c?P(c,t):null,r=e.getAttribute("formmethod")||u.getAttribute("method")||X,n=oe(e.getAttribute("formenctype"))||oe(u.getAttribute("enctype"))||Q,o=new FormData(u,e),!ur()){let{name:m,type:p,value:d}=e;if(p==="image"){let h=m?`${m}.`:"";o.append(`${h}x`,"0"),o.append(`${h}y`,"0")}else m&&o.append(m,d)}}else{if(re(e))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');r=X,a=null,n=Q,i=e}return o&&n==="text/plain"&&(i=o,o=void 0),{action:a,method:r.toLowerCase(),encType:n,formData:o,body:i}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function ye(e,t){if(e===!1||e===null||typeof e>"u")throw new Error(t)}function fr(e,t,r,a){let n=typeof e=="string"?new URL(e,typeof window>"u"?"server://singlefetch/":window.location.origin):e;return r?n.pathname.endsWith("/")?n.pathname=`${n.pathname}_.${a}`:n.pathname=`${n.pathname}.${a}`:n.pathname==="/"?n.pathname=`_root.${a}`:t&&P(n.pathname,t)==="/"?n.pathname=`${t.replace(/\/$/,"")}/_root.${a}`:n.pathname=`${n.pathname.replace(/\/$/,"")}.${a}`,n}async function hr(e,t){if(e.id in t)return t[e.id];try{let r=await import(e.module);return t[e.id]=r,r}catch(r){return console.error(`Error loading route module \`${e.module}\`, reloading page...`),console.error(r),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function gr(e){return e==null?!1:e.href==null?e.rel==="preload"&&typeof e.imageSrcSet=="string"&&typeof e.imageSizes=="string":typeof e.rel=="string"&&typeof e.href=="string"}async function vr(e,t,r){let a=await Promise.all(e.map(async n=>{let o=t.routes[n.route.id];if(o){let i=await hr(o,r);return i.links?i.links():[]}return[]}));return br(a.flat(1).filter(gr).filter(n=>n.rel==="stylesheet"||n.rel==="preload").map(n=>n.rel==="stylesheet"?{...n,rel:"prefetch",as:"style"}:{...n,rel:"prefetch"}))}function Ne(e,t,r,a,n,o){let i=(c,m)=>r[m]?c.route.id!==r[m].route.id:!0,u=(c,m)=>r[m].pathname!==c.pathname||r[m].route.path?.endsWith("*")&&r[m].params["*"]!==c.params["*"];return o==="assets"?t.filter((c,m)=>i(c,m)||u(c,m)):o==="data"?t.filter((c,m)=>{let p=a.routes[c.route.id];if(!p||!p.hasLoader)return!1;if(i(c,m)||u(c,m))return!0;if(c.route.shouldRevalidate){let d=c.route.shouldRevalidate({currentUrl:new URL(n.pathname+n.search+n.hash,window.origin),currentParams:r[0]?.params||{},nextUrl:new URL(e,window.origin),nextParams:c.params,defaultShouldRevalidate:!0});if(typeof d=="boolean")return d}return!0}):[]}function yr(e,t,{includeHydrateFallback:r}={}){return xr(e.map(a=>{let n=t.routes[a.route.id];if(!n)return[];let o=[n.module];return n.clientActionModule&&(o=o.concat(n.clientActionModule)),n.clientLoaderModule&&(o=o.concat(n.clientLoaderModule)),r&&n.hydrateFallbackModule&&(o=o.concat(n.hydrateFallbackModule)),n.imports&&(o=o.concat(n.imports)),o}).flat(1))}function xr(e){return[...new Set(e)]}function wr(e){let t={},r=Object.keys(e).sort();for(let a of r)t[a]=e[a];return t}function br(e,t){let r=new Set;return new Set(t),e.reduce((a,n)=>{let o=JSON.stringify(wr(n));return r.has(o)||(r.add(o),a.push({key:o,link:n})),a},[])}function Ke(){let e=l.useContext(z);return ye(e,"You must render this element inside a <DataRouterContext.Provider> element"),e}function kr(){let e=l.useContext(te);return ye(e,"You must render this element inside a <DataRouterStateContext.Provider> element"),e}var xe=l.createContext(void 0);xe.displayName="FrameworkContext";function Ye(){let e=l.useContext(xe);return ye(e,"You must render this element inside a <HydratedRouter> element"),e}function Rr(e,t){let r=l.useContext(xe),[a,n]=l.useState(!1),[o,i]=l.useState(!1),{onFocus:u,onBlur:c,onMouseEnter:m,onMouseLeave:p,onTouchStart:d}=t,h=l.useRef(null);l.useEffect(()=>{if(e==="render"&&i(!0),e==="viewport"){let y=R=>{R.forEach(b=>{i(b.isIntersecting)})},f=new IntersectionObserver(y,{threshold:.5});return h.current&&f.observe(h.current),()=>{f.disconnect()}}},[e]),l.useEffect(()=>{if(a){let y=setTimeout(()=>{i(!0)},100);return()=>{clearTimeout(y)}}},[a]);let w=()=>{n(!0)},v=()=>{n(!1),i(!1)};return r?e!=="intent"?[o,h,{}]:[o,h,{onFocus:W(u,w),onBlur:W(c,v),onMouseEnter:W(m,w),onMouseLeave:W(p,v),onTouchStart:W(d,w)}]:[!1,h,{}]}function W(e,t){return r=>{e&&e(r),r.defaultPrevented||t(r)}}function Er({page:e,...t}){let{router:r}=Ke(),a=l.useMemo(()=>Te(r.routes,e,r.basename),[r.routes,e,r.basename]);return a?l.createElement(Sr,{page:e,matches:a,...t}):null}function Cr(e){let{manifest:t,routeModules:r}=Ye(),[a,n]=l.useState([]);return l.useEffect(()=>{let o=!1;return vr(e,t,r).then(i=>{o||n(i)}),()=>{o=!0}},[e,t,r]),a}function Sr({page:e,matches:t,...r}){let a=O(),{future:n,manifest:o,routeModules:i}=Ye(),{basename:u}=Ke(),{loaderData:c,matches:m}=kr(),p=l.useMemo(()=>Ne(e,t,m,o,a,"data"),[e,t,m,o,a]),d=l.useMemo(()=>Ne(e,t,m,o,a,"assets"),[e,t,m,o,a]),h=l.useMemo(()=>{if(e===a.pathname+a.search+a.hash)return[];let y=new Set,f=!1;if(t.forEach(b=>{let x=o.routes[b.route.id];!x||!x.hasLoader||(!p.some(g=>g.route.id===b.route.id)&&b.route.id in c&&i[b.route.id]?.shouldRevalidate||x.hasClientLoader?f=!0:y.add(b.route.id))}),y.size===0)return[];let R=fr(e,u,n.unstable_trailingSlashAwareDataRequests,"data");return f&&y.size>0&&R.searchParams.set("_routes",t.filter(b=>y.has(b.route.id)).map(b=>b.route.id).join(",")),[R.pathname+R.search]},[u,n.unstable_trailingSlashAwareDataRequests,c,a,o,p,t,e,i]),w=l.useMemo(()=>yr(d,o),[d,o]),v=Cr(d);return l.createElement(l.Fragment,null,h.map(y=>l.createElement("link",{key:y,rel:"prefetch",as:"fetch",href:y,...r})),w.map(y=>l.createElement("link",{key:y,rel:"modulepreload",href:y,...r})),v.map(({key:y,link:f})=>l.createElement("link",{key:y,nonce:r.nonce,...f,crossOrigin:f.crossOrigin??r.crossOrigin})))}function jr(...e){return t=>{e.forEach(r=>{typeof r=="function"?r(t):r!=null&&(r.current=t)})}}var Nr=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{Nr&&(window.__reactRouterVersion="7.13.1")}catch{}function Ir({basename:e,children:t,unstable_useTransitions:r,window:a}){let n=l.useRef();n.current==null&&(n.current=lt({window:a,v5Compat:!0}));let o=n.current,[i,u]=l.useState({action:o.action,location:o.location}),c=l.useCallback(m=>{r===!1?u(m):l.startTransition(()=>u(m))},[r]);return l.useLayoutEffect(()=>o.listen(c),[o,c]),l.createElement(nr,{basename:e,children:t,location:i.location,navigationType:i.action,navigator:o,unstable_useTransitions:r})}var Xe=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,Qe=l.forwardRef(function({onClick:t,discover:r="render",prefetch:a="none",relative:n,reloadDocument:o,replace:i,unstable_mask:u,state:c,target:m,to:p,preventScrollReset:d,viewTransition:h,unstable_defaultShouldRevalidate:w,...v},y){let{basename:f,navigator:R,unstable_useTransitions:b}=l.useContext(N),x=typeof p=="string"&&Xe.test(p),g=Me(p,f);p=g.to;let k=zt(p,{relative:n}),E=O(),j=null;if(u){let A=fe(u,[],E.unstable_mask?E.unstable_mask.pathname:"/",!0);f!=="/"&&(A.pathname=A.pathname==="/"?f:F([f,A.pathname])),j=R.createHref(A)}let[_,T,I]=Rr(a,v),D=$r(p,{replace:i,unstable_mask:u,state:c,target:m,preventScrollReset:d,relative:n,viewTransition:h,unstable_defaultShouldRevalidate:w,unstable_useTransitions:b});function K(A){t&&t(A),A.defaultPrevented||D(A)}let we=!(g.isExternal||o),be=l.createElement("a",{...v,...I,href:(we?j:void 0)||g.absoluteURL||k,onClick:we?K:t,ref:jr(y,T),target:m,"data-discover":!x&&r==="render"?"true":void 0});return _&&!x?l.createElement(l.Fragment,null,be,l.createElement(Er,{page:k})):be});Qe.displayName="Link";var Fr=l.forwardRef(function({"aria-current":t="page",caseSensitive:r=!1,className:a="",end:n=!1,style:o,to:i,viewTransition:u,children:c,...m},p){let d=J(i,{relative:m.relative}),h=O(),w=l.useContext(te),{navigator:v,basename:y}=l.useContext(N),f=w!=null&&Dr(d)&&u===!0,R=v.encodeLocation?v.encodeLocation(d).pathname:d.pathname,b=h.pathname,x=w&&w.navigation&&w.navigation.location?w.navigation.location.pathname:null;r||(b=b.toLowerCase(),x=x?x.toLowerCase():null,R=R.toLowerCase()),x&&y&&(x=P(x,y)||x);const g=R!=="/"&&R.endsWith("/")?R.length-1:R.length;let k=b===R||!n&&b.startsWith(R)&&b.charAt(g)==="/",E=x!=null&&(x===R||!n&&x.startsWith(R)&&x.charAt(R.length)==="/"),j={isActive:k,isPending:E,isTransitioning:f},_=k?t:void 0,T;typeof a=="function"?T=a(j):T=[a,k?"active":null,E?"pending":null,f?"transitioning":null].filter(Boolean).join(" ");let I=typeof o=="function"?o(j):o;return l.createElement(Qe,{...m,"aria-current":_,className:T,ref:p,style:I,to:i,viewTransition:u},typeof c=="function"?c(j):c)});Fr.displayName="NavLink";var Lr=l.forwardRef(({discover:e="render",fetcherKey:t,navigate:r,reloadDocument:a,replace:n,state:o,method:i=X,action:u,onSubmit:c,relative:m,preventScrollReset:p,viewTransition:d,unstable_defaultShouldRevalidate:h,...w},v)=>{let{unstable_useTransitions:y}=l.useContext(N),f=Ar(),R=Or(u,{relative:m}),b=i.toLowerCase()==="get"?"get":"post",x=typeof u=="string"&&Xe.test(u),g=k=>{if(c&&c(k),k.defaultPrevented)return;k.preventDefault();let E=k.nativeEvent.submitter,j=E?.getAttribute("formmethod")||i,_=()=>f(E||k.currentTarget,{fetcherKey:t,method:j,navigate:r,replace:n,state:o,relative:m,preventScrollReset:p,viewTransition:d,unstable_defaultShouldRevalidate:h});y&&r!==!1?l.startTransition(()=>_()):_()};return l.createElement("form",{ref:v,method:b,action:R,onSubmit:a?c:g,...w,"data-discover":!x&&e==="render"?"true":void 0})});Lr.displayName="Form";function Pr(e){return`${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function Ze(e){let t=l.useContext(z);return C(t,Pr(e)),t}function $r(e,{target:t,replace:r,unstable_mask:a,state:n,preventScrollReset:o,relative:i,viewTransition:u,unstable_defaultShouldRevalidate:c,unstable_useTransitions:m}={}){let p=Wt(),d=O(),h=J(e,{relative:i});return l.useCallback(w=>{if(dr(w,t)){w.preventDefault();let v=r!==void 0?r:q(d)===q(h),y=()=>p(e,{replace:v,unstable_mask:a,state:n,preventScrollReset:o,relative:i,viewTransition:u,unstable_defaultShouldRevalidate:c});m?l.startTransition(()=>y()):y()}},[d,p,h,r,a,n,t,e,o,i,u,c,m])}var _r=0,Tr=()=>`__${String(++_r)}__`;function Ar(){let{router:e}=Ze("useSubmit"),{basename:t}=l.useContext(N),r=er(),a=e.fetch,n=e.navigate;return l.useCallback(async(o,i={})=>{let{action:u,method:c,encType:m,formData:p,body:d}=pr(o,t);if(i.navigate===!1){let h=i.fetcherKey||Tr();await a(h,r,i.action||u,{unstable_defaultShouldRevalidate:i.unstable_defaultShouldRevalidate,preventScrollReset:i.preventScrollReset,formData:p,body:d,formMethod:i.method||c,formEncType:i.encType||m,flushSync:i.flushSync})}else await n(i.action||u,{unstable_defaultShouldRevalidate:i.unstable_defaultShouldRevalidate,preventScrollReset:i.preventScrollReset,formData:p,body:d,formMethod:i.method||c,formEncType:i.encType||m,replace:i.replace,state:i.state,fromRouteId:r,flushSync:i.flushSync,viewTransition:i.viewTransition})},[a,n,t,r])}function Or(e,{relative:t}={}){let{basename:r}=l.useContext(N),a=l.useContext($);C(a,"useFormAction must be used inside a RouteContext");let[n]=a.matches.slice(-1),o={...J(e||".",{relative:t})},i=O();if(e==null){o.search=i.search;let u=new URLSearchParams(o.search),c=u.getAll("index");if(c.some(p=>p==="")){u.delete("index"),c.filter(d=>d).forEach(d=>u.append("index",d));let p=u.toString();o.search=p?`?${p}`:""}}return(!e||e===".")&&n.route.index&&(o.search=o.search?o.search.replace(/^\?/,"?index&"):"?index"),r!=="/"&&(o.pathname=o.pathname==="/"?r:F([r,o.pathname])),q(o)}function Dr(e,{relative:t}={}){let r=l.useContext(ze);C(r!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:a}=Ze("useViewTransitionState"),n=J(e,{relative:t});if(!r.isTransitioning)return!1;let o=P(r.currentLocation.pathname,a)||r.currentLocation.pathname,i=P(r.nextLocation.pathname,a)||r.nextLocation.pathname;return Z(n.pathname,i)!=null||Z(n.pathname,o)!=null}const Br=`
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:ital,wght@0,400;0,800;1,900&display=swap');

  :root {
    --c-yellow: #FFD600;
    --c-orange: #FF9F1C;
    --c-red: #EB4D4B;
    --c-cyan: #00E5FF;
    --c-dark: #1A1A1A;
    --c-white: #FFFFFF;
    --f-display: 'Bangers', display;
    --f-body: 'Kanit', sans-serif;
    --skew: -6deg;
    --radius: 12px;
    --shadow-hard: 6px 6px 0px rgba(0,0,0,0.2);
    --shadow-pop: 0px 10px 20px rgba(255, 214, 0, 0.4);
    --page-padding: clamp(2rem, 4vw, 6rem);
    --content-max: 1400px;
    --copy-max: 680px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    background-color: #F8F9FA;
    font-family: var(--f-body);
    color: var(--c-dark);
    overflow-x: hidden;
  }

  .bg-mesh {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: -1;
    background:
      radial-gradient(circle at 10% 20%, rgba(255,214,0,0.15) 0%, transparent 40%),
      radial-gradient(circle at 90% 80%, rgba(235,77,75,0.1) 0%, transparent 40%),
      repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px);
  }

  h1, h2, h3 {
    font-family: var(--f-display);
    text-transform: uppercase;
    letter-spacing: 2px;
    line-height: 0.9;
  }

  .text-stroke {
    -webkit-text-stroke: 2px var(--c-dark);
    color: var(--c-white);
    text-shadow: 4px 4px 0px var(--c-orange);
  }

  .btn-arcade {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-family: var(--f-display);
    font-size: 1.5rem;
    text-transform: uppercase;
    padding: 1rem 3rem;
    background: var(--c-yellow);
    color: var(--c-dark);
    border: 4px solid var(--c-dark);
    border-radius: 50px;
    box-shadow: 0 6px 0 var(--c-dark);
    cursor: pointer;
    transition: all 0.1s ease;
    text-decoration: none;
    position: relative;
    overflow: hidden;
    min-height: 52px;
  }

  .btn-arcade:active {
    transform: translateY(6px);
    box-shadow: 0 0 0 var(--c-dark);
  }

  .btn-arcade:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .btn-arcade.red {
    background: var(--c-red);
    color: var(--c-white);
  }

  .btn-arcade::after {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 50%;
    background: linear-gradient(to bottom, rgba(255,255,255,0.6), transparent);
    border-radius: 40px 40px 0 0;
    pointer-events: none;
  }

  .panel-skew {
    background: var(--c-white);
    border: 3px solid var(--c-dark);
    border-radius: var(--radius);
    transform: skewX(var(--skew));
    box-shadow: var(--shadow-hard);
    padding: 2rem;
    position: relative;
  }

  .panel-content-unskew {
    transform: skewX(calc(var(--skew) * -1));
  }

  nav.cog-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem var(--page-padding);
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(10px);
    border-bottom: 4px solid var(--c-dark);
    gap: 1.5rem;
  }

  .logo {
    font-family: var(--f-display);
    font-size: 2.5rem;
    color: var(--c-red);
    transform: skewX(var(--skew));
    text-shadow: 2px 2px 0px var(--c-dark);
    text-decoration: none;
  }

  .nav-links { display: flex; gap: 2rem; }

  .nav-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .nav-toggle {
    display: none;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--c-white);
    border: 3px solid var(--c-dark);
    box-shadow: var(--shadow-hard);
    font-family: var(--f-display);
    font-size: 1.4rem;
    cursor: pointer;
  }

  .nav-toggle span {
    display: block;
    line-height: 1;
  }

  .nav-mobile {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--c-white);
    border-bottom: 4px solid var(--c-dark);
    padding: 1rem 1.5rem 1.5rem;
    box-shadow: 0 12px 0 rgba(0,0,0,0.15);
    z-index: 99;
  }

  .nav-mobile .nav-link {
    font-size: 1.1rem;
    padding: 0.75rem 0.25rem;
    text-align: left;
  }

  .nav-mobile.open {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .nav-link {
    font-weight: 800;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--c-dark);
    font-size: 1.1rem;
    position: relative;
    cursor: pointer;
    background: none;
    border: none;
    font-family: var(--f-body);
  }

  .nav-link::after {
    content: '';
    display: block;
    width: 0;
    height: 4px;
    background: var(--c-cyan);
    transition: width 0.3s;
  }

  .nav-link:hover::after { width: 100%; }

  .nav-cta {
    font-size: 1rem;
    padding: 0.8rem 2rem;
  }

  .nav-mobile .btn-arcade {
    font-size: 1rem;
    padding: 0.8rem 2rem;
    width: 100%;
  }

  .hero-section {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
    min-height: auto;
    padding: 2.5rem var(--page-padding) 3rem;
    position: relative;
    overflow: hidden;
    max-width: var(--content-max);
    width: 100%;
    margin: 0 auto;
    align-items: center;
    gap: 2.5rem;
  }

  .hero-content {
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 720px;
  }

  .hero-h1 {
    font-size: clamp(2.6rem, 7vw, 6rem);
    line-height: 0.9;
    margin-bottom: 0;
    transform: rotate(-1.2deg);
  }

  .hero-tagline {
    font-size: clamp(1.05rem, 2.5vw, 1.5rem);
    font-weight: 800;
    color: var(--c-dark);
    margin-bottom: 2.5rem;
    background: var(--c-cyan);
    display: inline-block;
    padding: 0.5rem 1rem;
    transform: skewX(var(--skew));
    border: 2px solid var(--c-dark);
  }

  .hero-visual {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 0;
  }

  .hero-body {
    font-size: 1.35rem;
    max-width: var(--copy-max);
    margin-bottom: 0;
    font-weight: 500;
    line-height: 1.5;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .hero-waitlist {
    margin-bottom: 0;
    max-width: var(--copy-max);
    width: 100%;
  }

  .waitlist-label {
    font-weight: 900;
    text-transform: uppercase;
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }

  .waitlist-form {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.75rem;
  }

  .waitlist-input {
    padding: 0.9rem 1.2rem;
    border: 3px solid var(--c-dark);
    border-radius: 16px;
    font-size: 1rem;
    font-family: var(--f-body);
    font-weight: 700;
    background: #fff;
    color: var(--c-dark);
    min-height: 52px;
    outline: none;
  }

  .waitlist-input:focus {
    box-shadow: 0 0 0 4px rgba(0, 229, 255, 0.35);
  }

  .waitlist-message {
    margin-top: 0.75rem;
    font-weight: 800;
  }

  .waitlist-honeypot {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .waitlist-submit {
    font-size: 1rem;
    padding: 0.85rem 1.6rem;
  }

  .waitlist-hint {
    margin-top: 0.5rem;
    font-size: 0.95rem;
    opacity: 0.8;
  }

  .bot-card {
    width: min(520px, 92vw);
    height: 500px;
    background: var(--c-white);
    border: 5px solid var(--c-dark);
    border-radius: 30px;
    position: relative;
    transform: rotate(4deg);
    box-shadow: 20px 20px 0px rgba(0,0,0,0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .bot-header {
    background: var(--c-red);
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 5px solid var(--c-dark);
  }

  .bot-face {
    width: 80px;
    height: 60px;
    background: var(--c-dark);
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  .eye {
    width: 20px;
    height: 20px;
    background: var(--c-cyan);
    border-radius: 50%;
    animation: blink 3s infinite;
    box-shadow: 0 0 10px var(--c-cyan);
  }

  .bot-body {
    padding: 2rem;
    flex-grow: 1;
    background: repeating-linear-gradient(45deg, #fff, #fff 10px, #f4f4f4 10px, #f4f4f4 20px);
  }

  .stat-bar { margin-bottom: 1rem; }

  .stat-label {
    font-weight: 900;
    text-transform: uppercase;
    font-size: 0.9rem;
    margin-bottom: 0.2rem;
    display: flex;
    justify-content: space-between;
  }

  .bar-container {
    height: 20px;
    background: #ddd;
    border: 2px solid var(--c-dark);
    border-radius: 10px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: var(--c-yellow);
    position: relative;
    transition: width 1s ease-out;
  }

  .bar-fill::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(to bottom, rgba(255,255,255,0.4), transparent);
  }

  .ticker-wrap {
    width: 100%;
    background: var(--c-dark);
    color: var(--c-yellow);
    padding: 1rem 0;
    overflow: hidden;
    white-space: nowrap;
    border-top: 4px solid var(--c-yellow);
    border-bottom: 4px solid var(--c-yellow);
    transform: rotate(-1deg) scale(1.01);
  }

  .ticker {
    display: inline-block;
    animation: ticker 20s linear infinite;
  }

  .ticker-item {
    display: inline-block;
    padding: 0 2rem;
    font-size: clamp(0.95rem, 2.2vw, 1.2rem);
    font-weight: 800;
    font-family: var(--f-display);
    letter-spacing: 1px;
  }

  .accent-text { color: var(--c-cyan); }

  .section-config {
    padding: 6rem var(--page-padding);
    position: relative;
  }

  .section-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .section-header h2 {
    font-size: clamp(2.6rem, 7vw, 5rem);
    color: var(--c-yellow);
    -webkit-text-stroke: 3px var(--c-dark);
    text-shadow: 5px 5px 0px var(--c-dark);
  }

  .parts-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    max-width: 1320px;
    margin: 0 auto;
  }

  .part-card {
    background: var(--c-white);
    border: 4px solid var(--c-dark);
    border-radius: 20px;
    padding: 0;
    overflow: hidden;
    transition: transform 0.2s;
    cursor: pointer;
  }

  .part-card:hover {
    transform: translateY(-10px) rotate(1deg);
    box-shadow: 10px 10px 0px var(--c-cyan);
  }

  .part-img {
    height: 180px;
    background: #eee;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 4px solid var(--c-dark);
    font-size: 4rem;
  }

  .part-info { padding: 1.5rem; }

  .part-title {
    font-weight: 900;
    font-size: 1.5rem;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }

  .tag {
    display: inline-block;
    background: var(--c-dark);
    color: var(--c-white);
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
    margin-right: 0.5rem;
  }

  .section-arena {
    background: var(--c-yellow);
    padding: 6rem var(--page-padding);
    border-top: 5px solid var(--c-dark);
    border-bottom: 5px solid var(--c-dark);
    background-image:
      linear-gradient(135deg, #FFC107 25%, transparent 25%),
      linear-gradient(225deg, #FFC107 25%, transparent 25%),
      linear-gradient(45deg, #FFC107 25%, transparent 25%),
      linear-gradient(315deg, #FFC107 25%, transparent 25%);
    background-position: 20px 0, 20px 0, 0 0, 0 0;
    background-size: 40px 40px;
    background-repeat: repeat;
  }

  .leaderboard-container {
    max-width: 1200px;
    margin: 0 auto;
    background: var(--c-white);
    border: 5px solid var(--c-dark);
    border-radius: 10px;
    box-shadow: 15px 15px 0px rgba(0,0,0,0.8);
    padding: 2rem;
  }

  .rank-row {
    display: grid;
    grid-template-columns: 0.5fr 2fr 1fr 1fr;
    padding: 1rem;
    border-bottom: 2px solid #eee;
    align-items: center;
    font-weight: 800;
    font-size: 1.2rem;
  }

  .rank-row:last-child { border-bottom: none; }

  .rank-head {
    color: #888;
    text-transform: uppercase;
    font-size: 0.9rem;
  }

  .rank-num {
    width: 40px;
    height: 40px;
    background: var(--c-dark);
    color: var(--c-white);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--f-display);
  }

  .status-dot {
    height: 12px;
    width: 12px;
    background: #00E676;
    border-radius: 50%;
    display: inline-block;
    margin-right: 5px;
    box-shadow: 0 0 5px #00E676;
  }

  .decor {
    position: absolute;
    pointer-events: none;
    z-index: 1;
  }

  .circle-decor {
    width: 100px;
    height: 100px;
    border: 8px solid var(--c-cyan);
    border-radius: 50%;
    top: 20%;
    right: 10%;
    opacity: 0.6;
  }

  .plus-decor {
    font-family: var(--f-display);
    font-size: 8rem;
    color: var(--c-red);
    top: 60%;
    left: 5%;
    transform: rotate(15deg);
    opacity: 0.2;
  }

  @keyframes ticker {
    0% { transform: translateX(0%); }
    100% { transform: translateX(-50%); }
  }

  @keyframes blink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }

  @media (max-width: 1200px) {
    :root {
      --page-padding: clamp(1.75rem, 5vw, 4.5rem);
      --copy-max: 620px;
    }

    .hero-h1 {
      font-size: clamp(2.9rem, 7vw, 6rem);
    }

    .parts-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 900px) {
    nav.cog-nav {
      padding: 1rem var(--page-padding);
      flex-wrap: wrap;
      justify-content: space-between;
    }

    .logo { font-size: 2rem; }

    .nav-links { display: none; }

    .nav-toggle { display: inline-flex; }

    .nav-cta { display: none; }

    .hero-section {
      grid-template-columns: 1fr;
      padding: 2rem var(--page-padding) 2.5rem;
      gap: 1.5rem;
    }

    .hero-visual {
      order: 2;
      margin-top: 0.5rem;
    }

    .hero-content {
      max-width: none;
    }

    .hero-body {
      font-size: 1.2rem;
      max-width: none;
    }

    .hero-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-actions .btn-arcade {
      width: 100%;
    }

    .hero-waitlist {
      max-width: none;
      width: 100%;
    }

    .waitlist-form {
      grid-template-columns: 1fr;
    }

    .waitlist-form .btn-arcade {
      width: 100%;
      min-height: 52px;
      font-size: 1.05rem;
    }

    .waitlist-input {
      min-height: 52px;
      font-size: 1.05rem;
    }

    .bot-card {
      height: auto;
      min-height: 440px;
      transform: rotate(2deg);
      width: min(520px, 100%);
    }

    .decor { opacity: 0.3; }

    .section-config,
    .section-arena {
      padding: 4rem var(--page-padding);
    }

    .leaderboard-container {
      padding: 1.5rem;
    }
  }

  @media (max-width: 700px) {
    .parts-grid { grid-template-columns: 1fr; }

    .rank-row {
      grid-template-columns: 0.6fr 1.6fr 1fr 1fr;
      font-size: 1rem;
      gap: 0.5rem;
    }

    .ticker-wrap { padding: 0.8rem 0; }

    footer {
      padding: 3rem 1.5rem;
    }
  }

  @media (max-width: 520px) {
    .hero-section { padding: 2.25rem var(--page-padding) 2.75rem; }
    .hero-h1 { letter-spacing: 1px; }
    .panel-skew { padding: 1.5rem; }
    .waitlist-label { font-size: 1rem; }
  }

  @media (max-width: 640px) {
    nav.cog-nav {
      padding: 0.9rem var(--page-padding);
    }

    .nav-links { display: none; }

    .nav-cta {
      display: inline-flex;
      font-size: 1.05rem;
      padding: 0.85rem 1.6rem;
      min-height: 52px;
    }

    .nav-toggle {
      display: none;
    }

    .nav-mobile {
      display: none;
    }

    .hero-h1 {
      font-size: clamp(2.6rem, 11vw, 4rem);
    }

    .hero-body {
      font-size: 1.2rem;
    }

    .waitlist-input {
      font-size: 1.1rem;
    }

    .waitlist-form .btn-arcade,
    .hero-actions .btn-arcade {
      font-size: 1.1rem;
      min-height: 52px;
    }
  }
`,ee=/^[^\s@]+@[^\s@]+\.[^\s@]+$/,Ie="cogcage_copy_variant",Fe="cogcage_founder_cta_variant",de="Founder Pack $29 one-time",ue="$49 once beta opens",Le={value:{headline:["EARN.","CLIMB.","OWN."],body:"Turn every match into upside: lock founder pricing, build your LLM fighter, and stack wins into real rewards before public pricing jumps."},competition:{headline:["RULE.","THE.","ARENA."],body:"Outbuild rivals, outsmart their prompts, and take the top slot in a live ladder where every match is a public proving ground."}},et=()=>{const e=localStorage.getItem(Ie);if(e==="value"||e==="competition")return e;const t=Math.random()<.5?"value":"competition";return localStorage.setItem(Ie,t),t},tt=()=>{const e=localStorage.getItem(Fe);if(e==="reserve"||e==="claim")return e;const t=Math.random()<.5?"reserve":"claim";return localStorage.setItem(Fe,t),t},S=async(e,t)=>{try{await fetch(e,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(t)})}catch{}},B=async(e,t,{retries:r=1,timeoutMs:a=6e3}={})=>{let n=null;for(let o=0;o<=r;o+=1){const i=new AbortController,u=setTimeout(()=>i.abort(),a);try{const c=await fetch(e,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(t),signal:i.signal});clearTimeout(u);let m={};const p=await c.text();if(p)try{m=JSON.parse(p)}catch{m={raw:p.slice(0,400)}}if(c.ok&&m.ok===!0)return{...m,status:c.status,requestId:m.requestId||c.headers.get("x-request-id")||void 0};const d=new Error(m?.error||`Request failed (${c.status})`);if(d.status=c.status,d.requestId=m?.requestId||c.headers.get("x-request-id")||void 0,d.retryAfter=c.headers.get("retry-after")||void 0,d.responsePreview=m?.raw||void 0,c.status>=500&&o<r){n=d,await new Promise(h=>setTimeout(h,250*(o+1)));continue}throw d}catch(c){if(clearTimeout(u),n=c,o>=r)throw c;const m=Number(c?.status);if(Number.isFinite(m)&&m<500)throw c;await new Promise(p=>setTimeout(p,250*(o+1)))}}throw n||new Error("Request failed")},M=e=>{if(!e||typeof e!="object")return!0;const t=Number(e.status);return Number.isFinite(t)?t>=500:!0},me="cogcage_waitlist_replay_queue",pe="cogcage_founder_intent_replay_queue",rt=()=>{try{const e=localStorage.getItem(me),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}},at=e=>{try{if(!e.length){localStorage.removeItem(me);return}localStorage.setItem(me,JSON.stringify(e.slice(-10)))}catch{}},nt=e=>{const t=rt(),r={...e,email:String(e.email||"").trim().toLowerCase(),source:e.source||"cogcage-replay",queuedAt:new Date().toISOString()},a=t.filter(n=>!(n.email===r.email&&n.source===r.source));a.push(r),at(a)},Pe=async()=>{if(typeof navigator<"u"&&!navigator.onLine)return;const e=rt();if(!e.length)return;const t=[];for(const r of e)try{await B("/api/waitlist",{email:r.email,game:r.game||"Unspecified",source:r.source||"cogcage-replay"},{retries:0,timeoutMs:7e3}),await S("/api/events",{event:"waitlist_replay_sent",source:r.source||"cogcage-replay",email:r.email,page:"/",meta:{queuedAt:r.queuedAt||null}})}catch(a){M(a)&&t.push(r),await S("/api/events",{event:"waitlist_replay_failed",source:r.source||"cogcage-replay",email:r.email,page:"/",meta:{queuedAt:r.queuedAt||null,error:a instanceof Error?a.message:"unknown"}})}at(t)},ot=()=>{try{const e=localStorage.getItem(pe),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}},it=e=>{try{if(!e.length){localStorage.removeItem(pe);return}localStorage.setItem(pe,JSON.stringify(e.slice(-20)))}catch{}},st=e=>{const t=ot(),r=String(e.intentId||""),a={...e,email:String(e.email||"").trim().toLowerCase(),queuedAt:new Date().toISOString()},n=t.filter(o=>String(o.intentId||"")!==r);n.push(a),it(n)},$e=async()=>{if(typeof navigator<"u"&&!navigator.onLine)return;const e=ot();if(!e.length)return;const t=[];for(const r of e)try{await B("/api/founder-intent",r,{retries:0,timeoutMs:7e3}),await S("/api/events",{event:"founder_intent_replay_sent",source:r.source||"cogcage-founder-replay",email:r.email,page:"/",meta:{queuedAt:r.queuedAt||null,intentId:r.intentId||null}})}catch(a){M(a)&&t.push(r),await S("/api/events",{event:"founder_intent_replay_failed",source:r.source||"cogcage-founder-replay",email:r.email,page:"/",meta:{queuedAt:r.queuedAt||null,intentId:r.intentId||null,error:a instanceof Error?a.message:"unknown"}})}it(t)},ie=({label:e,value:t,pct:r,color:a})=>{const[n,o]=l.useState("0%");return l.useEffect(()=>{const i=setTimeout(()=>o(r),100);return()=>clearTimeout(i)},[r]),s.jsxs("div",{className:"stat-bar",children:[s.jsxs("div",{className:"stat-label",children:[s.jsx("span",{children:e}),s.jsx("span",{children:t})]}),s.jsx("div",{className:"bar-container",children:s.jsx("div",{className:"bar-fill",style:{width:n,background:a||"var(--c-yellow)"}})})]})},Mr=()=>s.jsxs("div",{className:"bot-card",children:[s.jsx("div",{className:"bot-header",children:s.jsxs("div",{className:"bot-face",children:[s.jsx("div",{className:"eye"}),s.jsx("div",{className:"eye"})]})}),s.jsxs("div",{className:"bot-body",children:[s.jsx("h2",{style:{fontSize:"2.5rem",marginBottom:"1.5rem",transform:"skewX(-5deg)"},children:"RUMBLE-V4"}),s.jsx(ie,{label:"Aggression",value:"92%",pct:"92%",color:"var(--c-red)"}),s.jsx(ie,{label:"Armor",value:"65%",pct:"65%",color:"var(--c-yellow)"}),s.jsx(ie,{label:"Compute Speed",value:"88%",pct:"88%",color:"var(--c-cyan)"}),s.jsxs("div",{style:{marginTop:"2rem",padding:"1rem",background:"#eee",borderRadius:"8px",fontWeight:"bold",fontFamily:"monospace"},children:["> SYSTEM: TARGET ACQUIRED",s.jsx("br",{}),"> LOGIC: FLANK_LEFT",s.jsx("br",{}),"> STATUS: CHARGING CANNON..."]})]})]}),Ur=({emoji:e,bgColor:t,emojiColor:r,tag:a,title:n,desc:o,stat:i,price:u,onAdd:c})=>{const[m,p]=l.useState(!1),d=()=>{p(!0),c&&c(n),setTimeout(()=>p(!1),1500)};return s.jsxs("div",{className:"part-card",onClick:d,children:[s.jsx("div",{className:"part-img",style:{background:t,color:r},children:e}),s.jsxs("div",{className:"part-info",children:[s.jsx("span",{className:"tag",children:a}),s.jsx("h3",{className:"part-title",children:n}),s.jsx("p",{children:o}),s.jsxs("div",{style:{marginTop:"1rem",display:"flex",justifyContent:"space-between",fontWeight:"800"},children:[s.jsx("span",{children:i}),s.jsx("span",{style:{color:"var(--c-red)"},children:u})]}),m&&s.jsx("div",{style:{marginTop:"0.5rem",color:"#00E676",fontWeight:900,fontSize:"0.9rem"},children:"✓ Added to loadout!"})]})]})},H=({rank:e,rankBg:t,rankColor:r,name:a,winRate:n,status:o,isOnline:i})=>s.jsxs("div",{className:"rank-row",children:[s.jsx("div",{className:"rank-num",style:{background:t||"var(--c-dark)",color:r||"var(--c-white)"},children:e}),s.jsx("div",{children:a}),s.jsx("div",{style:{color:"var(--c-red)"},children:n}),s.jsxs("div",{children:[i&&s.jsx("span",{className:"status-dot"}),o]})]}),zr=({onNavClick:e})=>{const[t,r]=l.useState(!1),[a,n]=l.useState(!1),o=()=>{r(!0),setTimeout(()=>r(!1),300),n(!1),window.location.href="/play"},i=u=>{e(u),n(!1)};return s.jsxs("nav",{className:"cog-nav",children:[s.jsx("div",{className:"logo",onClick:()=>i("hero"),style:{cursor:"pointer"},children:"COG CAGE"}),s.jsx("div",{className:"nav-links",children:[["Builder","build"],["Arena","arena"],["Marketplace","build"],["Guide","hero"]].map(([u,c])=>s.jsx("button",{className:"nav-link",onClick:()=>i(c),children:u},u))}),s.jsxs("div",{className:"nav-controls",children:[s.jsx("button",{className:`btn-arcade nav-cta${t?" pressed":""}`,onClick:o,children:"Play Now"}),s.jsx("button",{className:"nav-toggle",type:"button","aria-expanded":a,"aria-label":a?"Close navigation menu":"Open navigation menu",onClick:()=>n(u=>!u),children:s.jsx("span",{children:a?"✕":"☰"})})]}),s.jsxs("div",{className:`nav-mobile ${a?"open":""}`,children:[[["Builder","build"],["Arena","arena"],["Marketplace","build"],["Guide","hero"]].map(([u,c])=>s.jsx("button",{className:"nav-link",onClick:()=>i(c),children:u},u)),s.jsx("button",{className:"btn-arcade",onClick:o,children:"Play Now"})]})]})},Wr=({sectionRef:e})=>{const[t,r]=l.useState(""),[a,n]=l.useState(""),[o,i]=l.useState("idle"),[u,c]=l.useState(""),[m,p]=l.useState(""),[d,h]=l.useState("value"),[w,v]=l.useState("reserve");l.useEffect(()=>{const b=localStorage.getItem("cogcage_email");b&&r(b);const x=et(),g=tt();h(x),v(g),S("/api/events",{event:"landing_view",source:`hero-${x}`,page:"/",variant:x,meta:{variant:x,founderCtaVariant:g}})},[]);const y=async b=>{if(b?.preventDefault(),o==="loading")return;const x=t.trim();if(!x){i("error"),c("Enter your email to join the beta."),S("/api/events",{event:"waitlist_validation_failed",source:`hero-waitlist-${d}`,page:"/",meta:{reason:"empty_email"}});return}if(!ee.test(x)){i("error"),c("Please use a valid email address."),S("/api/events",{event:"waitlist_validation_failed",source:`hero-waitlist-${d}`,page:"/",meta:{reason:"invalid_email"}});return}i("loading"),c("");try{const g=await B("/api/waitlist",{email:x,game:"Unspecified",source:`cogcage-hero-${d}`,company:m});localStorage.setItem("cogcage_email",x.toLowerCase()),await S("/api/events",{event:"waitlist_joined",source:`hero-waitlist-${d}`,email:x.toLowerCase(),page:"/",variant:d,meta:{variant:d,requestId:g.requestId,queued:g.queued===!0,status:g.status}}),n(x.toLowerCase()),i("success"),c(g.queued===!0?`You are on the list (queued). Ref ${g.requestId}.`:`You are on the list. Ref ${g.requestId}.`),r("")}catch(g){M(g)&&nt({email:x.toLowerCase(),game:"Unspecified",source:`cogcage-hero-${d}`}),S("/api/events",{event:"waitlist_submit_buffered",source:`hero-waitlist-${d}`,page:"/",email:x.toLowerCase(),meta:{error:g instanceof Error?g.message:"unknown"}}),i("error");const k=g?.requestId?` Ref ${g.requestId}.`:"",E=g?.retryAfter?` Retry in ~${g.retryAfter}s.`:"";c(M(g)?`Temporary network/storage issue. Saved locally and will auto-retry when online.${k}`:`${g?.message||"Could not submit. Please check your input and retry."}${E}${k}`)}},f=async({emailOverride:b="",ctaSourcePrefix:x="hero-founder-cta",checkoutSourcePrefix:g="hero-founder-checkout"}={})=>{const k=b||t.trim()||localStorage.getItem("cogcage_email")||"";if(!ee.test(k)){i("error"),c("Add your email first so we can reserve your founder slot.");return}localStorage.setItem("cogcage_email",k.toLowerCase()),await S("/api/events",{event:"founder_checkout_clicked",source:`${x}-${d}-${w}`,email:k.toLowerCase(),tier:"founder",page:"/",variant:d,meta:{variant:d,founderCtaVariant:w}});const E={email:k.toLowerCase(),source:`${g}-${d}-${w}`,intentId:`intent:${new Date().toISOString().slice(0,10)}:${k.toLowerCase()}:${d}:${w}`,variant:d,founderCtaVariant:w};try{await B("/api/founder-intent",E,{retries:1,timeoutMs:6e3})}catch(j){st(E),await S("/api/events",{event:"founder_intent_buffered",source:E.source,email:E.email,page:"/",meta:{intentId:E.intentId,error:j instanceof Error?j.message:"unknown"}})}await S("/api/events",{event:"founder_checkout_unavailable",source:`${x}-${d}-${w}`,email:k.toLowerCase(),tier:"founder",page:"/",variant:d,meta:{variant:d,founderCtaVariant:w}}),i("error"),c("Founder checkout link not configured yet.")},R=Le[d]||Le.value;return s.jsxs("section",{className:"hero-section",ref:e,id:"hero",children:[s.jsxs("div",{className:"hero-content",children:[s.jsxs("h1",{className:"hero-h1 text-stroke",children:[R.headline[0],s.jsx("br",{}),s.jsx("span",{style:{color:"var(--c-red)",WebkitTextStroke:"0"},children:R.headline[1]}),s.jsx("br",{}),R.headline[2]]}),s.jsx("p",{className:"hero-body",children:R.body}),s.jsx("div",{className:"panel-skew hero-waitlist",style:{background:"var(--c-white)"},children:s.jsxs("div",{className:"panel-content-unskew",children:[s.jsx("div",{className:"waitlist-label",children:"Join the beta waitlist"}),s.jsxs("form",{className:"waitlist-form",onSubmit:y,action:"/api/waitlist",method:"POST",children:[s.jsx("input",{className:"waitlist-honeypot",type:"text",name:"company",value:m,onChange:b=>p(b.target.value),tabIndex:-1,autoComplete:"off"}),s.jsx("input",{className:"waitlist-input",type:"email",name:"email",value:t,onChange:b=>r(b.target.value),placeholder:"you@domain.com",autoComplete:"email","aria-label":"Email address"}),s.jsx("input",{type:"hidden",name:"game",value:"Unspecified"}),s.jsx("input",{type:"hidden",name:"source",value:`cogcage-hero-${d}`}),s.jsx("button",{className:"btn-arcade red waitlist-submit",type:"submit",disabled:o==="loading",children:o==="loading"?"Joining...":"Join Waitlist"})]}),s.jsx("div",{className:"waitlist-message",role:"status","aria-live":"polite",style:{color:o==="error"?"var(--c-red)":"#00C853"},children:u}),s.jsx("div",{className:"waitlist-hint",children:"Early access invites, creator perks, and arena updates."})]})}),s.jsxs("div",{className:"hero-actions",children:[s.jsx("button",{className:"btn-arcade red",type:"button",onClick:()=>f(),children:w==="claim"?"Claim Founder Pricing":"Reserve Founder Spot"}),s.jsx("button",{className:"btn-arcade",style:{background:"var(--c-white)"},type:"button",onClick:()=>{window.location.href="/play"},children:"Play Demo"})]}),o==="success"&&a&&s.jsxs("div",{style:{marginTop:"0.5rem",fontWeight:800},children:["Want founder perks now?"," ",s.jsx("button",{type:"button",onClick:()=>f({emailOverride:a,ctaSourcePrefix:"hero-post-waitlist-founder-cta",checkoutSourcePrefix:"hero-post-waitlist-founder-checkout"}),style:{background:"transparent",border:"none",color:"var(--c-red)",fontWeight:900,textDecoration:"underline",cursor:"pointer",fontFamily:"var(--f-body)"},children:w==="claim"?"Claim founder pricing":"Reserve your founder spot"})]}),s.jsxs("div",{style:{marginTop:"0",fontWeight:900,fontSize:"0.98rem"},children:["🔒 ",s.jsx("span",{style:{color:"var(--c-red)"},children:de})," for early builders · switches to ",ue]})]}),s.jsx("div",{className:"hero-visual",children:s.jsx(Mr,{})})]})},Hr=()=>{const e=[{id:1,content:s.jsxs(s.Fragment,{children:[s.jsx("span",{children:"USER "}),s.jsx("span",{className:"accent-text",children:"SKULLCRUSHER"})," WON 500 CREDITS ON MATCH #8842"]})},{id:2,content:s.jsxs(s.Fragment,{children:[s.jsx("span",{children:"// NEW CHAMPION CROWNED: "}),s.jsx("span",{className:"accent-text",children:"NEURAL_KNIGHT"})]})},{id:3,content:s.jsx("span",{children:"ODDS SHIFTING FOR NEXT BOUT: RED CORNER +250"})},{id:4,content:s.jsxs(s.Fragment,{children:[s.jsx("span",{children:"MARKET ALERT: "}),s.jsx("span",{className:"accent-text",children:"PLASMA CANNON"})," PRICES UP 15%"]})},{id:5,content:s.jsxs(s.Fragment,{children:[s.jsx("span",{children:"USER "}),s.jsx("span",{className:"accent-text",children:"SKULLCRUSHER"})," WON 500 CREDITS ON MATCH #8842"]})},{id:6,content:s.jsxs(s.Fragment,{children:[s.jsx("span",{children:"// NEW CHAMPION CROWNED: "}),s.jsx("span",{className:"accent-text",children:"NEURAL_KNIGHT"})]})},{id:7,content:s.jsx("span",{children:"ODDS SHIFTING FOR NEXT BOUT: RED CORNER +250"})},{id:8,content:s.jsxs(s.Fragment,{children:[s.jsx("span",{children:"MARKET ALERT: "}),s.jsx("span",{className:"accent-text",children:"PLASMA CANNON"})," PRICES UP 15%"]})}];return s.jsx("div",{className:"ticker-wrap",children:s.jsx("div",{className:"ticker",children:e.map(t=>s.jsx("div",{className:"ticker-item",children:t.content},t.id))})})},qr=({sectionRef:e})=>{const[t,r]=l.useState(null),a=o=>{r(`${o} added to your loadout!`),setTimeout(()=>r(null),2e3)},n=[{emoji:"⚡",bgColor:"#FFF3CD",emojiColor:"#FFD600",tag:"WEAPON",title:"Volt Smasher",desc:"High voltage melee attachment. Stuns enemy logic gates for 0.5s on impact.",stat:"DMG: 85",price:"350 CR"},{emoji:"🛡️",bgColor:"#D1F2EB",emojiColor:"#00E5FF",tag:"ARMOR",title:"Titan Plating",desc:"Reinforced tungsten alloy. Reduces incoming kinetic damage by 40%.",stat:"DEF: 120",price:"500 CR"},{emoji:"🧠",bgColor:"#FADBD8",emojiColor:"#EB4D4B",tag:"MODEL",title:"GPT-Tactician",desc:"Fine-tuned for strategic dominance. Predicts enemy movement with 88% accuracy.",stat:"IQ: 200",price:"1200 CR"}];return s.jsxs("section",{className:"section-config",ref:e,id:"build",children:[t&&s.jsxs("div",{style:{position:"fixed",bottom:"2rem",left:"50%",transform:"translateX(-50%)",background:"var(--c-dark)",color:"#00E676",padding:"1rem 2rem",borderRadius:"50px",fontWeight:900,zIndex:9999,border:"3px solid #00E676",fontSize:"1rem",animation:"none"},children:["✓ ",t]}),s.jsxs("div",{className:"section-header",children:[s.jsx("h2",{children:"BUILD YOUR CHAMPION"}),s.jsx("p",{style:{fontSize:"1.5rem",fontWeight:"bold"},children:"Equip lethal hardware & train your neural net."})]}),s.jsx("div",{className:"parts-grid",children:n.map(o=>s.jsx(Ur,{...o,onAdd:a},o.title))})]})},Vr=({sectionRef:e})=>{const[t,r]=l.useState(!1),a=[{rank:5,name:"IronFist_7",winRate:"85.3%",status:"In Combat",isOnline:!0},{rank:6,name:"OMEGA_PRIME",winRate:"82.1%",status:"Waiting...",isOnline:!1},{rank:7,name:"RustBucket3000",winRate:"79.9%",status:"Repairing",isOnline:!1},{rank:8,name:"SteelPhantom",winRate:"77.4%",status:"In Combat",isOnline:!0}];return s.jsxs("section",{className:"section-arena",ref:e,id:"arena",children:[s.jsx("div",{className:"section-header",style:{marginBottom:"2rem"},children:s.jsx("h2",{className:"text-stroke",style:{color:"var(--c-white)",textShadow:"4px 4px 0 var(--c-dark)"},children:"LIVE RANKINGS"})}),s.jsxs("div",{className:"leaderboard-container",children:[s.jsxs("div",{className:"rank-row",children:[s.jsx("div",{className:"rank-head",children:"Rank"}),s.jsx("div",{className:"rank-head",children:"Bot Name"}),s.jsx("div",{className:"rank-head",children:"Win Rate"}),s.jsx("div",{className:"rank-head",children:"Status"})]}),s.jsx(H,{rank:"1",rankBg:"var(--c-yellow)",rankColor:"var(--c-dark)",name:"MECHA_GODZILLA_V9",winRate:"98.4%",status:"In Combat",isOnline:!0}),s.jsx(H,{rank:"2",rankBg:"#C0C0C0",rankColor:"var(--c-dark)",name:"DeepBlue_Revenge",winRate:"94.1%",status:"Waiting...",isOnline:!1}),s.jsx(H,{rank:"3",rankBg:"#CD7F32",rankColor:"var(--c-white)",name:"NullPointerEx",winRate:"91.8%",status:"In Combat",isOnline:!0}),s.jsx(H,{rank:"4",rankBg:"var(--c-dark)",rankColor:"var(--c-white)",name:"Chaos_Engine",winRate:"88.2%",status:"Repairing",isOnline:!1}),t&&a.map(n=>s.jsx(H,{rank:String(n.rank),name:n.name,winRate:n.winRate,status:n.status,isOnline:n.isOnline},n.rank)),s.jsx("div",{style:{textAlign:"center",marginTop:"2rem"},children:s.jsx("button",{className:"btn-arcade",onClick:()=>r(n=>!n),children:t?"Collapse Ladder":"View Full Ladder"})})]})]})},Gr=()=>{const[e,t]=l.useState(""),[r,a]=l.useState(""),[n,o]=l.useState(!1),[i,u]=l.useState(""),[c,m]=l.useState(!1),[p,d]=l.useState(""),[h,w]=l.useState("value"),[v,y]=l.useState("reserve");l.useEffect(()=>{const g=et(),k=tt(),E=localStorage.getItem("cogcage_email");w(g),y(k),E&&t(E)},[]);const f=()=>e.trim().toLowerCase(),R=()=>{const g=f();return g?ee.test(g)?(u(""),g):(u("Invalid email address."),S("/api/events",{event:"waitlist_validation_failed",source:`footer-waitlist-${h}`,page:"/",meta:{reason:"invalid_email"}}),null):(u("Please enter your email!"),S("/api/events",{event:"waitlist_validation_failed",source:`footer-waitlist-${h}`,page:"/",meta:{reason:"empty_email"}}),null)},b=async()=>{if(c)return;const g=R();if(g){m(!0);try{const k=await B("/api/waitlist",{email:g,game:"Unspecified",source:`cogcage-footer-${h}`,company:p});localStorage.setItem("cogcage_email",g),a(g),await S("/api/events",{event:"waitlist_joined",source:`footer-waitlist-${h}`,page:"/",email:g,variant:h,meta:{variant:h,requestId:k.requestId,queued:k.queued===!0,status:k.status}}),o(!0)}catch(k){M(k)&&nt({email:g,game:"Unspecified",source:`cogcage-footer-${h}`}),S("/api/events",{event:"waitlist_submit_buffered",source:`footer-waitlist-${h}`,page:"/",email:g,meta:{error:k instanceof Error?k.message:"unknown"}});const E=k?.requestId?` Ref ${k.requestId}.`:"",j=k?.retryAfter?` Retry in ~${k.retryAfter}s.`:"";u(M(k)?`Could not reach storage. Saved locally and will auto-retry when online.${E}`:`${k?.message||"Could not submit. Please check your input and retry."}${j}${E}`)}finally{m(!1)}}},x=async({emailOverride:g="",ctaSourcePrefix:k="footer-founder-cta",checkoutSourcePrefix:E="footer-founder-checkout"}={})=>{const j=localStorage.getItem("cogcage_email")?.trim().toLowerCase()||"",_=f(),T=g||_||j,I=ee.test(T)?T:R();if(!I)return;localStorage.setItem("cogcage_email",I),await S("/api/events",{event:"founder_checkout_clicked",source:`${k}-${h}-${v}`,email:I,tier:"founder",page:"/",variant:h,meta:{variant:h,founderCtaVariant:v}});const D={email:I,source:`${E}-${h}-${v}`,intentId:`intent:${new Date().toISOString().slice(0,10)}:${I}:${h}:${v}`,variant:h,founderCtaVariant:v};try{await B("/api/founder-intent",D,{retries:1,timeoutMs:6e3})}catch(K){st(D),await S("/api/events",{event:"founder_intent_buffered",source:D.source,email:D.email,page:"/",meta:{intentId:D.intentId,error:K instanceof Error?K.message:"unknown"}})}await S("/api/events",{event:"founder_checkout_unavailable",source:`${k}-${h}-${v}`,email:I,tier:"founder",page:"/",variant:h,meta:{variant:h,founderCtaVariant:v}}),u("Founder checkout link not configured yet.")};return s.jsxs("footer",{style:{background:"var(--c-dark)",color:"var(--c-white)",padding:"4rem",textAlign:"center"},children:[s.jsx("h2",{style:{fontFamily:"var(--f-display)",marginBottom:"1rem"},children:"READY TO RUMBLE?"}),s.jsx("p",{style:{marginBottom:"2rem",opacity:.7},children:"Join 15,000+ engineers in the arena."}),n?s.jsxs("div",{children:[s.jsx("div",{style:{color:"#00E676",fontWeight:900,fontSize:"1.5rem",fontFamily:"var(--f-display)"},children:"✓ WELCOME TO THE ARENA, ENGINEER!"}),s.jsx("button",{className:"btn-arcade",style:{marginTop:"1rem",fontSize:"1rem",padding:"0.8rem 2rem"},onClick:()=>x({emailOverride:r,ctaSourcePrefix:"footer-post-waitlist-founder-cta",checkoutSourcePrefix:"footer-post-waitlist-founder-checkout"}),children:v==="claim"?"Claim Founder Pricing":"Reserve Founder Spot"}),s.jsxs("p",{style:{marginTop:"0.75rem",color:"#f5d66b",fontWeight:800,fontSize:"0.9rem"},children:["Optional upgrade: lock ",de," before it moves to ",ue,"."]})]}):s.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:"1rem"},children:[s.jsx("input",{className:"waitlist-honeypot",type:"text",name:"company",value:p,onChange:g=>d(g.target.value),tabIndex:-1,autoComplete:"off"}),s.jsx("input",{type:"email",value:e,onChange:g=>t(g.target.value),placeholder:"Enter your email...",style:{padding:"0.8rem 1.5rem",border:"3px solid var(--c-yellow)",borderRadius:"50px",fontSize:"1rem",fontFamily:"var(--f-body)",fontWeight:700,background:"rgba(255,255,255,0.1)",color:"#fff",outline:"none",width:"300px",textAlign:"center"},onKeyDown:g=>{g.key==="Enter"&&(g.preventDefault(),b())}}),i&&s.jsx("p",{style:{color:"var(--c-red)",fontWeight:800},children:i}),s.jsxs("div",{style:{display:"flex",gap:"0.75rem",flexWrap:"wrap",justifyContent:"center"},children:[s.jsx("button",{className:"btn-arcade red",style:{fontSize:"1rem",padding:"0.8rem 2rem"},onClick:()=>{b()},disabled:c,children:c?"Joining...":"Join Waitlist"}),s.jsx("button",{className:"btn-arcade",style:{fontSize:"1rem",padding:"0.8rem 2rem"},onClick:()=>{x()},disabled:c,children:v==="claim"?"Claim Founder Pricing":"Reserve Founder Spot"})]}),s.jsxs("p",{style:{color:"#f5d66b",fontWeight:800,fontSize:"0.9rem"},children:["Founder offer: ",de," today · ",ue]})]}),s.jsx("div",{style:{marginTop:"4rem",fontSize:"0.8rem",opacity:.5},children:"© 2023 Cog Cage eSports League. All bots are simulated."})]})},_e=()=>{const e=l.useRef(null),t=l.useRef(null),r=l.useRef(null),a=n=>{({hero:e,build:t,arena:r})[n]?.current?.scrollIntoView({behavior:"smooth"})};return s.jsxs(s.Fragment,{children:[s.jsx(zr,{onNavClick:a}),s.jsx(Wr,{sectionRef:e}),s.jsx(Hr,{}),s.jsx(qr,{sectionRef:t}),s.jsx(Vr,{sectionRef:r}),s.jsx(Gr,{})]})},Yr=()=>(l.useEffect(()=>{const e=document.createElement("style");return e.textContent=Br,document.head.appendChild(e),()=>document.head.removeChild(e)},[]),l.useEffect(()=>{Pe(),$e();const e=()=>{Pe(),$e()};return window.addEventListener("online",e),()=>window.removeEventListener("online",e)},[]),s.jsxs(Ir,{basename:"/",children:[s.jsx("div",{className:"bg-mesh"}),s.jsxs(or,{children:[s.jsx(le,{path:"/",element:s.jsx(_e,{})}),s.jsx(le,{path:"*",element:s.jsx(_e,{})})]})]}));export{Yr as default};
