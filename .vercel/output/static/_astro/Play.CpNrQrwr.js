import{j as e}from"./jsx-runtime.D_zvdyIk.js";import{r as o}from"./index.DiEladB3.js";const Ve={},Ue=`
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:ital,wght@0,400;0,800;1,900&display=swap');

  :root {
    --c-yellow: #FFD600;
    --c-orange: #FF9F1C;
    --c-red: #EB4D4B;
    --c-cyan: #00E5FF;
    --c-dark: #1A1A1A;
    --c-white: #FFFFFF;
    --c-green: #2ecc71;
    --c-purple: #5f27cd;
    --f-display: 'Bangers', display;
    --f-body: 'Kanit', sans-serif;
    --radius: 14px;
    --shadow-hard: 6px 6px 0px rgba(0,0,0,0.2);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: radial-gradient(circle at 20% 20%, rgba(255,214,0,0.15), transparent 35%),
      radial-gradient(circle at 80% 0%, rgba(0,229,255,0.12), transparent 40%),
      linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    font-family: var(--f-body);
    color: var(--c-dark);
    min-height: 100vh;
  }

  .play-root { min-height: 100vh; position: relative; overflow-x: hidden; }

  .bg-scanlines {
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.12;
    background: repeating-linear-gradient(
      0deg,
      rgba(0,0,0,0.15),
      rgba(0,0,0,0.15) 1px,
      transparent 1px,
      transparent 4px
    );
    z-index: 0;
  }

  .play-header {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem 2.5rem;
    background: rgba(255,255,255,0.9);
    border-bottom: 4px solid var(--c-dark);
    backdrop-filter: blur(8px);
  }

  .logo {
    font-family: var(--f-display);
    font-size: 2.2rem;
    text-decoration: none;
    color: var(--c-red);
    text-shadow: 2px 2px 0px var(--c-dark);
  }

  .header-links {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .header-link {
    font-weight: 800;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--c-dark);
    padding: 0.5rem 1rem;
    border: 3px solid var(--c-dark);
    border-radius: 999px;
    background: var(--c-white);
    box-shadow: var(--shadow-hard);
    font-size: 0.95rem;
  }

  .header-link.active {
    background: var(--c-yellow);
  }

  .play-shell {
    position: relative;
    z-index: 1;
    padding: 2.5rem 3rem 3.5rem;
  }

  .play-grid {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.2fr);
    gap: 2rem;
  }

  .panel {
    background: var(--c-white);
    border: 3px solid var(--c-dark);
    border-radius: var(--radius);
    box-shadow: var(--shadow-hard);
    padding: 2rem;
  }

  .panel h2 {
    font-family: var(--f-display);
    font-size: 2rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1rem;
  }

  .section-label {
    font-weight: 900;
    text-transform: uppercase;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    letter-spacing: 1px;
  }

  .prompt-box {
    width: 100%;
    min-height: 72px;
    resize: vertical;
    border: 3px solid var(--c-dark);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    font-family: var(--f-body);
    font-size: 1rem;
  }

  .cta-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--f-display);
    font-size: 1.3rem;
    text-transform: uppercase;
    padding: 0.9rem 2.5rem;
    background: var(--c-red);
    color: var(--c-white);
    border: 4px solid var(--c-dark);
    border-radius: 999px;
    box-shadow: 0 6px 0 var(--c-dark);
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .cta-btn:active { transform: translateY(4px); box-shadow: none; }
  .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: 0 6px 0 var(--c-dark); }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(64px, 1fr));
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .action-btn {
    border: 3px solid var(--c-dark);
    border-radius: 12px;
    background: var(--c-yellow);
    font-weight: 900;
    padding: 0.65rem 0.5rem;
    cursor: pointer;
    font-size: 0.95rem;
    text-transform: uppercase;
  }

  .action-btn.secondary {
    background: var(--c-white);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 900;
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    border: 2px solid var(--c-dark);
    background: var(--c-white);
    font-size: 0.85rem;
  }

  .arena-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .arena-badge {
    font-family: var(--f-display);
    font-size: 1.1rem;
    text-transform: uppercase;
    background: var(--c-cyan);
    padding: 0.35rem 0.9rem;
    border: 3px solid var(--c-dark);
    border-radius: 999px;
  }

  .stat-block { margin-bottom: 1.2rem; }

  .stat-title {
    display: flex;
    justify-content: space-between;
    font-weight: 800;
    margin-bottom: 0.35rem;
  }

  .bar-shell {
    height: 16px;
    background: #101010;
    border-radius: 999px;
    overflow: hidden;
    border: 2px solid var(--c-dark);
  }

  .bar-fill {
    height: 100%;
    transition: width 0.35s ease;
    background: linear-gradient(90deg, #2ecc71 0%, #27ae60 100%);
  }

  .bar-fill.opponent {
    background: linear-gradient(90deg, #ff6b6b 0%, #d63031 100%);
  }

  .arena-map {
    margin: 1rem 0 1.2rem;
    display: grid;
    grid-template-columns: repeat(var(--grid-size), minmax(28px, 1fr));
    gap: 6px;
    padding: 0.75rem;
    background: #101010;
    border-radius: 16px;
    border: 3px solid var(--c-dark);
  }

  .arena-cell {
    position: relative;
    aspect-ratio: 1 / 1;
    border-radius: 10px;
    background: #f6f7f8;
    border: 2px solid rgba(0,0,0,0.2);
    display: grid;
    place-items: center;
    font-weight: 900;
    color: #111;
  }

  .arena-cell.obstacle {
    background: #2f2f2f;
    border-color: #000;
    box-shadow: inset 0 0 0 2px rgba(255,255,255,0.05);
  }

  .arena-cell.in-range {
    box-shadow: inset 0 0 0 3px rgba(255, 214, 0, 0.85);
  }

  .arena-cell.player {
    background: #2ecc71;
    color: #0f2b18;
  }

  .arena-cell.enemy {
    background: #eb4d4b;
    color: #fff;
  }

  .arena-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1rem;
    font-size: 0.85rem;
  }

  .feed {
    background: #0f0f0f;
    color: #f5f5f5;
    border-radius: 12px;
    border: 3px solid var(--c-dark);
    padding: 1rem;
    max-height: 320px;
    overflow-y: auto;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .feed-item { padding: 0.6rem 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .feed-item:last-child { border-bottom: none; }

  .winner-banner {
    margin-top: 1.2rem;
    padding: 1rem 1.4rem;
    border-radius: 12px;
    border: 3px solid var(--c-dark);
    background: var(--c-yellow);
    font-family: var(--f-display);
    text-transform: uppercase;
    font-size: 1.4rem;
  }

  .leaderboard {
    margin-top: 1.5rem;
    border-top: 3px solid var(--c-dark);
    padding-top: 1.2rem;
  }

  .hint {
    font-size: 0.9rem;
    opacity: 0.7;
  }

  .seed-pill {
    font-size: 0.85rem;
    font-weight: 800;
    border: 2px dashed var(--c-dark);
    border-radius: 999px;
    padding: 0.3rem 0.8rem;
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
  }

  @media (max-width: 960px) {
    .play-header { flex-direction: column; align-items: flex-start; }
    .play-shell { padding: 2rem 1.5rem 3rem; }
    .play-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .play-header { padding: 1.2rem; }
    .logo { font-size: 1.8rem; }
    .panel { padding: 1.5rem; }
    .cta-btn { width: 100%; }
    .arena-map { gap: 4px; padding: 0.6rem; }
  }
`,Se="cogcage_email",Ce="cogcage_play_viewed",Ee="cogcage_play_founder_copy_variant",ie="cogcage_founder_intent_replay_queue",h=8,O=3,oe=2,_e=()=>{if(typeof window>"u")return"momentum";const a=window.localStorage.getItem(Ee);if(a==="momentum"||a==="utility")return a;const r=Math.random()<.5?"momentum":"utility";return window.localStorage.setItem(Ee,r),r},Ae=(Ve?.PUBLIC_STRIPE_FOUNDER_URL??"").trim(),Ie=async(a,r,s=1,v=6e3)=>{let x=null;for(let y=0;y<=s;y+=1){const u=new AbortController,k=window.setTimeout(()=>u.abort(),v);try{const i=await fetch(a,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r),signal:u.signal});window.clearTimeout(k);const g=await i.json().catch(()=>({}));if(i.ok&&g.ok===!0)return g;const b=new Error(g?.error||`Request failed (${i.status})`);if(b.status=i.status,b.requestId=g?.requestId,i.status>=500&&y<s){x=b,await new Promise(Y=>setTimeout(Y,250*(y+1)));continue}throw b}catch(i){if(window.clearTimeout(k),x=i,y>=s)throw i;const g=Number(i?.status);if(Number.isFinite(g)&&g<500)throw i;await new Promise(b=>setTimeout(b,250*(y+1)))}}throw x||new Error("Request failed")},Pe=a=>{if(!a||typeof a!="object")return!0;const r=Number(a.status);return Number.isFinite(r)?r>=500:!0},Fe=()=>{try{const a=window.localStorage.getItem(ie),r=a?JSON.parse(a):[];return Array.isArray(r)?r:[]}catch{return[]}},Te=a=>{try{if(!a.length){window.localStorage.removeItem(ie);return}window.localStorage.setItem(ie,JSON.stringify(a.slice(-20)))}catch{}},We=a=>{const r=Fe(),s=String(a.email||"").trim().toLowerCase(),v=String(a.intentId||""),x=r.filter(y=>String(y.intentId||"")!==v);x.push({...a,email:s,queuedAt:new Date().toISOString()}),Te(x)},qe=(a,r)=>{const s=new Date().toISOString().slice(0,10);return`intent:${s}:${Me(`${a}|${r}|${s}`)}`},Q=[{id:"forge-titan",name:"Forge Titan",tagline:"Slow grind, heavy guard, brutal counters.",aggression:45,defense:85,risk:20},{id:"neon-wraith",name:"Neon Wraith",tagline:"Unpredictable, loves risky overclocks.",aggression:65,defense:35,risk:80},{id:"cinder-hawk",name:"Cinder Hawk",tagline:"Fast strikes, pressure every turn.",aggression:85,defense:25,risk:45}],$e=(a,r,s)=>Math.max(r,Math.min(s,a)),Me=a=>{let r=2166136261;for(let s=0;s<a.length;s+=1)r^=a.charCodeAt(s),r=Math.imul(r,16777619);return r>>>0},He=a=>{let r=a;return()=>{r+=1831565813;let s=Math.imul(r^r>>>15,r|1);return s^=s+Math.imul(s^s>>>7,s|61),((s^s>>>14)>>>0)/4294967296}},D=(a,r,s)=>Math.floor(a()*(s-r+1))+r,M=(a,r)=>Math.abs(a.x-r.x)+Math.abs(a.y-r.y),z=(a,r)=>a.x===r.x&&a.y===r.y,Re=(a,r)=>[{x:a.x,y:a.y-1},{x:a.x+1,y:a.y},{x:a.x,y:a.y+1},{x:a.x-1,y:a.y}].filter(s=>s.x>=0&&s.y>=0&&s.x<r&&s.y<r),Ke=(a,r,s)=>{const v=new Set,x=[r],y=u=>`${u.x}:${u.y}`;for(v.add(y(r));x.length>0;){const u=x.shift();if(z(u,s))return!0;for(const k of Re(u,h)){if(a[k.y]?.[k.x]==="obstacle")continue;const i=y(k);v.has(i)||(v.add(i),x.push(k))}}return!1},Ge=a=>{const r={x:0,y:h-1},s={x:h-1,y:0},v=Math.floor(h*h*.18);for(let y=0;y<20;y+=1){const u=Array.from({length:h},()=>Array.from({length:h},()=>"empty"));let k=0;for(let i=0;i<h;i+=1)for(let g=0;g<h;g+=1)k>=v||g===r.x&&i===r.y||g===s.x&&i===s.y||Math.abs(g-r.x)+Math.abs(i-r.y)<=1||Math.abs(g-s.x)+Math.abs(i-s.y)<=1||a()<.12&&(u[i][g]="obstacle",k+=1);if(Ke(u,r,s))return{grid:u,playerPos:r,enemyPos:s}}return{grid:Array.from({length:h},()=>Array.from({length:h},()=>"empty")),playerPos:r,enemyPos:s}},Xe=()=>{const[a,r]=o.useState(""),[s,v]=o.useState(null),[x,y]=o.useState([]),[u,k]=o.useState({x:0,y:0}),[i,g]=o.useState({x:0,y:0}),[b,Y]=o.useState(100),[_,le]=o.useState(100),[A,R]=o.useState(O),[V,ce]=o.useState(1),[X,Z]=o.useState([]),[m,L]=o.useState(!1),[c,U]=o.useState(null),[Le,ee]=o.useState(0),[de,te]=o.useState(0),[W,q]=o.useState(0),[ue,me]=o.useState(0),[H,Be]=o.useState(Q[0].id),[ne,pe]=o.useState(""),[fe,he]=o.useState(!1),[ge,K]=o.useState(null),[j,Oe]=o.useState("momentum"),G=o.useRef(()=>Math.random),I=async(t,n={})=>{try{await fetch("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:t,source:"play-page",email:ne.trim()||void 0,meta:n})})}catch{}},w=o.useMemo(()=>Q.find(t=>t.id===H)||Q[0],[H]),F=o.useMemo(()=>c?c==="You"?j==="utility"?{key:"winner",title:"Convert This Win Into Repeatable Edge",message:"Founder mode unlocks analytics and priority ladder access so this result becomes your baseline before pricing moves to $49/mo.",button:"Enable Founder Analytics"}:{key:"winner",title:"You Won. Lock In Founder Advantage",message:"Your build already performs. Keep momentum with founder access at $29/mo before it moves to $49/mo.",button:"Claim Winner Founder Price"}:j==="utility"?{key:"loser",title:"Debug Faster With Founder Mode",message:"Get extra reps, richer match analytics, and priority ladder slots so you can close the gap before launch pricing moves to $49/mo.",button:"Unlock Founder Rebuild Kit"}:{key:"loser",title:"Run It Back With Founder Access",message:"Get more reps, analytics, and priority ladder access at $29/mo before launch pricing moves to $49/mo.",button:"Unlock Founder Rematch Pass"}:j==="utility"?{key:"neutral",title:"Get Founder Tools Before Launch",message:"Founder access adds deeper analytics, faster iteration loops, and priority ladder placement at $29/mo before launch pricing moves to $49/mo.",button:"Get Founder Tools"}:{key:"neutral",title:"Unlock Founder Pricing",message:"Keep your edge: lock $29/mo before launch pricing moves to $49/mo.",button:"Reserve Founder Spot"},[j,c]);o.useEffect(()=>{const t=document.createElement("style");return t.textContent=Ue,document.head.appendChild(t),()=>document.head.removeChild(t)},[]),o.useEffect(()=>{if(typeof window>"u")return;const t=window.localStorage.getItem(Se)||"";t&&pe(t),Oe(_e()),window.localStorage.getItem(Ce)||(I("play_page_viewed",{founderCopyVariant:_e()}),window.localStorage.setItem(Ce,"1"))},[]),o.useEffect(()=>{if(typeof window>"u")return;const t=async()=>{if(!navigator.onLine)return;const l=Fe();if(!l.length)return;const p=[];for(const d of l)try{await Ie("/api/founder-intent",d,0,7e3),await I("founder_intent_replay_sent",{source:d.source,intentId:d.intentId,queuedAt:d.queuedAt,founderCopyVariant:d.founderCopyVariant})}catch(f){Pe(f)&&p.push(d),await I("founder_intent_replay_failed",{source:d.source,intentId:d.intentId,queuedAt:d.queuedAt,founderCopyVariant:d.founderCopyVariant,error:f instanceof Error?f.message:"unknown"})}Te(p)};t();const n=()=>{t()};return window.addEventListener("online",n),()=>window.removeEventListener("online",n)},[]),o.useEffect(()=>{c&&I("play_match_completed",{winner:c,turn:V,seed:s,opponent:w.name,playerHp:b,enemyHp:_,ctaVariant:F.key,founderCopyVariant:j})},[s,_,F.key,w.name,j,b,V,c]);const ye=()=>{L(!1),U(null),Z([]),Y(100),le(100),R(O),ce(1),ee(0),te(0),q(0),me(0)},De=()=>{if(m)return;ye();const t=a.trim()||`${Date.now()}`,n=Me(`${t}|${H}`)||1,l=He(n);G.current=l;const p=Ge(l);y(p.grid),k(p.playerPos),g(p.enemyPos),v(n),Z([`Match initialized. Seed ${n}.`,`Arena size ${h}x${h}. Opponent: ${w.name}.`]),L(!0),I("play_match_started",{seed:n,opponent:w.id,gridSize:h})},xe=(t,n)=>t<=0&&n<=0?(U("Draw"),L(!1),!0):n<=0?(U("You"),L(!1),!0):t<=0?(U(w.name),L(!1),!0):!1,ze=t=>!(t.x<0||t.y<0||t.x>=h||t.y>=h||x[t.y]?.[t.x]==="obstacle"||z(t,i)),N=t=>{Z(n=>[...t,...n].slice(0,50))},P=(t,n)=>{if(!m||c)return;if(A<=0){N(["No action points left. End turn."]);return}const l={x:u.x+t,y:u.y+n};if(!ze(l)){N(["Move blocked by terrain or boundary."]);return}k(l),R(p=>p-1),N([`You move to (${l.x+1}, ${h-l.y}).`])},be=()=>{if(!m||c)return;if(A<2){N(["Attack needs 2 AP."]);return}const t=G.current,n=oe+(W>0?1:0),l=M(u,i);if(l>n){N([`Target out of range (${l}).`]);return}const p=8+D(t,0,4)+(W>0?2:0),d=Math.max(0,p-de),f=$e(_-d,0,100);le(f),te(0),R($=>$-2),q(0),N([`You strike for ${d}. Enemy HP ${f}.`]),xe(b,f)},we=()=>{if(!m||c)return;if(A<1){N(["Block needs 1 AP."]);return}const t=G.current,n=5+D(t,0,2);ee(n),R(l=>l-1),N([`You brace. Block ${n} on next hit.`])},ke=()=>{if(!(!m||c)){if(A<1){N(["Scan needs 1 AP."]);return}q(2),R(t=>t-1),N(["You scan the grid. Next strike gains +1 range."])}},ve=()=>{if(!m||c)return;const t=G.current;let n=O,l={...i},p=de,d=Math.max(0,ue-1),f=b,$=Le;const C=[],ae=()=>oe+(d>0?1:0),B=()=>{const E=Re(l,h).filter(S=>x[S.y]?.[S.x]!=="obstacle").filter(S=>!z(S,u));if(E.length===0)return!1;const re=M(l,u),se=Math.min(...E.map(S=>M(S,u))),J=E.filter(S=>M(S,u)===se),T=J[D(t,0,J.length-1)]||E[0];return M(T,u)>=re&&t()<.4?!1:(l=T,C.push(`${w.name} moves to (${T.x+1}, ${h-T.y}).`),!0)};for(;n>0&&f>0&&_>0;){const E=M(l,u),re=.35+w.aggression/150,se=.2+w.defense/200,J=.15+w.risk/200;if(E<=ae()&&n>=2&&t()<re){const T=7+D(t,0,4)+(d>0?2:0),S=Math.max(0,T-$);f=$e(f-S,0,100),$=0,d=0,C.push(`${w.name} strikes for ${S}. Your HP ${f}.`),n-=2;break}if(n>=1&&t()<se){p=5+D(t,0,2),C.push(`${w.name} raises guard (${p}).`),n-=1;continue}if(n>=1&&t()<J){d=2,C.push(`${w.name} scans the arena.`),n-=1;continue}if(n>=1&&B()){n-=1;continue}n=0}g(l),te(p),me(d),ee($),q(E=>Math.max(0,E-1)),Y(f),R(O),ce(E=>E+1),C.length===0&&C.push(`${w.name} holds position.`),N(C),xe(f,_)},je=()=>{!m||c||ve()};o.useEffect(()=>{if(!m||c||A>0)return;const t=window.setTimeout(()=>{ve()},250);return()=>window.clearTimeout(t)},[A,m,c]),o.useEffect(()=>{if(!m||c)return;const t=n=>{n.key==="ArrowUp"||n.key.toLowerCase()==="w"?(n.preventDefault(),P(0,-1)):n.key==="ArrowRight"||n.key.toLowerCase()==="d"?(n.preventDefault(),P(1,0)):n.key==="ArrowLeft"||n.key.toLowerCase()==="a"?(n.preventDefault(),P(-1,0)):n.key==="ArrowDown"||n.key.toLowerCase()==="s"?(n.preventDefault(),P(0,1)):n.key.toLowerCase()==="j"?(n.preventDefault(),be()):n.key.toLowerCase()==="k"?(n.preventDefault(),we()):n.key.toLowerCase()==="l"?(n.preventDefault(),ke()):(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),je())};return window.addEventListener("keydown",t),()=>window.removeEventListener("keydown",t)},[m,c,u,A,i,W,ue,_,b]);const Ye=async()=>{const t=ne.trim().toLowerCase(),n=`play-page-founder-cta-${F.key}-${j}`;if(!t||!/^\S+@\S+\.\S+$/.test(t)){K("Enter a valid email to reserve founder pricing.");return}if(!Ae){K("Checkout is temporarily unavailable. Please join the waitlist from home."),I("founder_checkout_unavailable",{source:n,founderCopyVariant:j});return}typeof window<"u"&&window.localStorage.setItem(Se,t),he(!0),K(null);try{const l=qe(t,n),p={email:t,source:n,intentId:l,founderCopyVariant:j};await I("founder_checkout_clicked",{source:n,ctaVariant:F.key,founderCopyVariant:j,intentId:l});try{await Ie("/api/founder-intent",p,1,6e3)}catch(f){Pe(f)&&(We(p),await I("founder_intent_buffered",{source:n,intentId:l,founderCopyVariant:j,error:f instanceof Error?f.message:"unknown"}))}typeof window<"u"&&(window.localStorage.setItem("cogcage_last_founder_checkout_source",n),window.localStorage.setItem("cogcage_last_founder_intent_source",n.replace("founder-cta","founder-checkout")));const d=new URL(Ae);d.searchParams.set("prefilled_email",t),window.location.href=d.toString()}catch{he(!1),K("Could not start checkout. Try again in a moment.")}},Ne=oe+(W>0?1:0);return e.jsxs("div",{className:"play-root",children:[e.jsx("div",{className:"bg-scanlines"}),e.jsxs("header",{className:"play-header",children:[e.jsx("a",{className:"logo",href:"/",children:"COG CAGE"}),e.jsxs("div",{className:"header-links",children:[e.jsx("a",{className:"header-link",href:"/",children:"Home"}),e.jsx("a",{className:"header-link active",href:"/play",children:"Play"})]})]}),e.jsx("main",{className:"play-shell",children:e.jsxs("div",{className:"play-grid",children:[e.jsxs("section",{className:"panel",children:[e.jsx("h2",{children:"Command Console"}),e.jsx("div",{className:"section-label",children:"Seeded Match"}),e.jsx("input",{className:"prompt-box",style:{minHeight:"unset",height:"48px",marginBottom:"0.6rem"},placeholder:"Seed (optional, deterministic)",value:a,onChange:t=>r(t.target.value)}),e.jsxs("div",{style:{display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center"},children:[e.jsx("button",{className:"cta-btn",onClick:De,disabled:m,children:m?"Match Live":"Start Match"}),e.jsx("button",{className:"action-btn secondary",onClick:ye,disabled:!m&&X.length===0,children:"Reset"})]}),e.jsxs("div",{style:{marginTop:"0.8rem",display:"flex",gap:"0.6rem",flexWrap:"wrap"},children:[e.jsxs("span",{className:"status-pill",children:["Turn ",V]}),e.jsxs("span",{className:"status-pill",children:["AP ",A,"/",O]}),e.jsxs("span",{className:"seed-pill",children:["Seed ",s??"—"]})]}),e.jsx("div",{className:"section-label",style:{marginTop:"1.4rem"},children:"Opponent Presets"}),e.jsx("div",{style:{display:"grid",gap:"0.6rem"},children:Q.map(t=>e.jsxs("label",{style:{display:"flex",gap:"0.6rem",alignItems:"flex-start"},children:[e.jsx("input",{type:"radio",name:"opponent",checked:t.id===H,onChange:()=>Be(t.id)}),e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:900},children:t.name}),e.jsx("div",{className:"hint",children:t.tagline})]})]},t.id))}),e.jsx("div",{className:"section-label",style:{marginTop:"1.4rem"},children:"Actions"}),e.jsxs("div",{className:"action-grid",children:[e.jsx("button",{className:"action-btn secondary",onClick:()=>P(0,-1),disabled:!m||!!c,children:"Up"}),e.jsx("button",{className:"action-btn secondary",onClick:()=>P(1,0),disabled:!m||!!c,children:"Right"}),e.jsx("button",{className:"action-btn secondary",onClick:()=>P(-1,0),disabled:!m||!!c,children:"Left"}),e.jsx("button",{className:"action-btn secondary",onClick:()=>P(0,1),disabled:!m||!!c,children:"Down"}),e.jsx("button",{className:"action-btn",onClick:be,disabled:!m||!!c,children:"Attack"}),e.jsx("button",{className:"action-btn",onClick:we,disabled:!m||!!c,children:"Block"}),e.jsx("button",{className:"action-btn",onClick:ke,disabled:!m||!!c,children:"Scan"}),e.jsx("button",{className:"action-btn secondary",onClick:je,disabled:!m||!!c,children:"End Turn"})]}),e.jsxs("div",{className:"hint",style:{marginBottom:"0.8rem"},children:["Attack range ",Ne," · Block absorbs next hit · Scan adds +1 range to your next strike · Move with WASD/Arrows, J attack, K block, L scan, Enter end turn."]}),e.jsxs("div",{className:"leaderboard",style:{marginTop:"1.2rem"},children:[e.jsx("div",{className:"section-label",children:F.title}),e.jsx("div",{className:"hint",style:{marginBottom:"0.7rem"},children:F.message}),e.jsx("input",{className:"prompt-box",type:"email",placeholder:"you@team.com",value:ne,onChange:t=>pe(t.target.value),style:{minHeight:"unset",height:"48px",marginBottom:"0.8rem"}}),e.jsx("button",{className:"cta-btn",onClick:Ye,disabled:fe,children:fe?"Opening Checkout…":F.button}),ge&&e.jsx("div",{className:"hint",style:{marginTop:"0.7rem"},children:ge})]})]}),e.jsxs("section",{className:"panel",children:[e.jsxs("div",{className:"arena-header",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"Arena Ops"}),e.jsxs("div",{className:"hint",children:["Opponent: ",e.jsx("strong",{children:w.name})]})]}),e.jsxs("span",{className:"arena-badge",children:["Round ",V]})]}),e.jsxs("div",{className:"stat-block",children:[e.jsxs("div",{className:"stat-title",children:[e.jsx("span",{children:"You"}),e.jsxs("span",{className:"status-pill",children:["HP ",b]})]}),e.jsx("div",{className:"bar-shell",children:e.jsx("div",{className:"bar-fill",style:{width:`${b}%`}})})]}),e.jsxs("div",{className:"stat-block",children:[e.jsxs("div",{className:"stat-title",children:[e.jsx("span",{children:w.name}),e.jsxs("span",{className:"status-pill",children:["HP ",_]})]}),e.jsx("div",{className:"bar-shell",children:e.jsx("div",{className:"bar-fill opponent",style:{width:`${_}%`}})})]}),e.jsx("div",{className:"arena-map",style:{"--grid-size":h},children:x.map((t,n)=>t.map((l,p)=>{const d={x:p,y:n},f=M(u,d)<=Ne,$=z(d,u),C=z(d,i),ae=["arena-cell",l==="obstacle"?"obstacle":"",f?"in-range":"",$?"player":"",C?"enemy":""].filter(Boolean).join(" ");let B="";return $&&(B="YOU"),C&&(B="BOT"),e.jsx("div",{className:ae,children:B},`${p}-${n}`)}))}),e.jsxs("div",{className:"arena-legend",children:[e.jsx("span",{className:"status-pill",children:"YOU"}),e.jsx("span",{className:"status-pill",style:{background:"var(--c-red)",color:"#fff"},children:"BOT"}),e.jsx("span",{className:"status-pill",style:{background:"#2f2f2f",color:"#fff"},children:"OBSTACLE"}),e.jsx("span",{className:"status-pill",style:{background:"var(--c-yellow)"},children:"IN RANGE"})]}),c&&e.jsxs("div",{className:"winner-banner",style:{marginTop:"1.2rem"},children:["Winner: ",c,e.jsxs("div",{className:"hint",children:["Final HP ",b," vs ",_]})]}),e.jsxs("div",{style:{marginTop:"1rem"},className:"feed",children:[X.length===0&&e.jsx("div",{className:"feed-item",children:"No turns yet. Start a match to generate the arena log."}),X.map((t,n)=>e.jsx("div",{className:"feed-item",children:t},`${t}-${n}`))]})]})]})})]})};export{Xe as default};
