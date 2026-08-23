import{j as a}from"./vendor-query-Jt2UkaO3.js";import{M as i,a as n}from"./MusicMobileDock-mns8I24L.js";function l({children:e,className:s="",hideAmbient:t=!1}){return a.jsxs("div",{className:`min-h-screen bg-[#06020f] text-white relative overflow-x-hidden ${s}`,children:[!t&&a.jsxs("div",{className:"fixed inset-0 overflow-hidden pointer-events-none z-0",children:[a.jsx("div",{className:"absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]"}),a.jsx("div",{className:"absolute -left-40 top-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px]",style:{willChange:"transform, opacity",animation:"ambientFloat1 8s ease-in-out infinite"}}),a.jsx("div",{className:"absolute -right-40 top-2/3 w-80 h-80 rounded-full bg-fuchsia-600/10 blur-[100px]",style:{willChange:"transform, opacity",animation:"ambientFloat2 10s ease-in-out 2s infinite"}}),a.jsx("div",{className:"absolute left-1/3 -bottom-20 w-72 h-72 rounded-full bg-pink-600/[0.08] blur-[80px]",style:{willChange:"transform, opacity",animation:"ambientFloat3 12s ease-in-out 4s infinite"}})]}),a.jsx("style",{children:`
        @keyframes ambientFloat1 {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(30px); opacity: 0.5; }
        }
        @keyframes ambientFloat2 {
          0%, 100% { transform: translateY(0); opacity: 0.2; }
          50% { transform: translateY(-20px); opacity: 0.4; }
        }
        @keyframes ambientFloat3 {
          0%, 100% { transform: translateX(0); opacity: 0.15; }
          50% { transform: translateX(20px); opacity: 0.25; }
        }
      `}),a.jsx("div",{className:"relative z-10",children:e})]})}function m({children:e}){return a.jsx(l,{children:a.jsxs("div",{className:"flex min-h-screen",children:[a.jsx(i,{}),a.jsx("div",{className:"md:hidden",children:a.jsx(n,{})}),a.jsx("main",{className:"flex-1 min-w-0 pt-14 pb-20 md:pb-0 md:ml-16",children:e})]})})}export{m as M};
