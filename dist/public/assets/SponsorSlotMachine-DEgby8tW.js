import{a as o,j as r}from"./vendor-query-Jt2UkaO3.js";import{bw as x}from"./index-CzuDnJJD.js";const g=({words:n=["Platinum","Ambassador","Supporter","Friend","Community"],duration:t=2,cycleDelay:s=8})=>{const a=o.useRef(null),e=o.useRef(null),i=o.useRef(null);return o.useEffect(()=>{if(!a.current||!e.current)return;e.current.innerHTML="";const p=[...n,...n];e.current.innerHTML=p.map(d=>`<div class="slot-item">${d}</div>`).join("");const l=64*n.length,c=x.timeline({repeat:-1});return c.to(e.current,{y:-l,duration:t,ease:"power2.inOut"},0).to(e.current,{y:-l+5,duration:.1,ease:"back.out"},t-.1).to({},{duration:s-t},t),i.current=c,()=>{i.current&&i.current.kill()}},[n,t,s]),r.jsxs("div",{className:"d-flex align-items-center justify-content-center my-4",children:[r.jsx("style",{children:`
        .sponsor-slot-machine {
          perspective: 1000px;
        }
        .slot-container {
          width: 280px;
          height: 64px;
          overflow: hidden;
          border-radius: 12px;
          background: linear-gradient(135deg, #bf831c 0%, #d4941f 100%);
          box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3), 0 8px 32px rgba(191, 131, 28, 0.3);
          border: 2px solid rgba(212, 148, 31, 0.6);
          position: relative;
        }
        .slot-container::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent 30%, transparent 70%, rgba(0, 0, 0, 0.2)), linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%);
          border-radius: 10px;
          pointer-events: none;
          z-index: 2;
        }
        .slot-scroller {
          transform: translateY(0);
          will-change: transform;
        }
        .slot-item {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 28px;
          color: #ffffff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(255, 255, 255, 0.2);
          letter-spacing: 0.5px;
        }
        .slot-container .slot-item:nth-child(1) {
          filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.6));
        }
        @media (prefers-reduced-motion: no-preference) {
          .slot-container {
            transform: rotateX(5deg);
            transform-style: preserve-3d;
          }
        }
        @media (max-width: 768px) {
          .slot-container { width: 220px; height: 56px; }
          .slot-item { font-size: 22px; height: 56px; }
        }
        @media (max-width: 576px) {
          .slot-container { width: 180px; height: 48px; }
          .slot-item { font-size: 18px; height: 48px; }
        }
      `}),r.jsx("div",{className:"sponsor-slot-machine",children:r.jsx("div",{className:"slot-container",ref:a,children:r.jsx("div",{className:"slot-scroller",ref:e})})})]})};export{g as S};
