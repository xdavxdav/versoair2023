import{j as r}from"./music-BTWdv2pC.js";function p({percent:s,className:o="",height:a="8px",ariaLabel:i="progress",vertical:n=!1}){const e=Math.max(0,Math.min(100,Math.round(s))),t={role:"progressbar","aria-label":i,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":e};return r.jsxDEV("div",{className:`w-full rounded-full overflow-hidden ${o}`,children:[r.jsxDEV("progress",{className:`w-full ${n?"progress--vertical":"progress"}`,value:e,max:100,...t},void 0,!1,{fileName:"/Users/joe/Downloads/FSA/client/src/components/ui/progress-bar.tsx",lineNumber:38,columnNumber:7},this),r.jsxDEV("style",{children:`
        .progress {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: ${a};
          border-radius: 9999px;
          background-color: transparent;
        }
        .progress::-webkit-progress-bar {
          background-color: #f3f4f6;
          border-radius: 9999px;
        }
        .progress::-webkit-progress-value {
          border-radius: 9999px;
          background-image: linear-gradient(to right, #34d399, #059669);
        }
        .progress::-moz-progress-bar {
          border-radius: 9999px;
          background-image: linear-gradient(to right, #34d399, #059669);
        }
        .progress--vertical {
          transform: rotate(-90deg);
          transform-origin: center;
          height: 100%;
        }
      `},void 0,!1,{fileName:"/Users/joe/Downloads/FSA/client/src/components/ui/progress-bar.tsx",lineNumber:45,columnNumber:7},this)]},void 0,!0,{fileName:"/Users/joe/Downloads/FSA/client/src/components/ui/progress-bar.tsx",lineNumber:37,columnNumber:5},this)}export{p as P};
