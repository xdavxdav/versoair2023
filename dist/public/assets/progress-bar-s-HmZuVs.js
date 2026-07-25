import{j as r}from"./vendor-query-DCSPIk1-.js";function l({percent:a,className:s="",height:o="8px",ariaLabel:i="progress",vertical:n=!1}){const e=Math.max(0,Math.min(100,Math.round(a))),t={role:"progressbar","aria-label":i,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":e};return r.jsxs("div",{className:`w-full rounded-full overflow-hidden ${s}`,children:[r.jsx("progress",{className:`w-full ${n?"progress--vertical":"progress"}`,value:e,max:100,...t}),r.jsx("style",{children:`
        .progress {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: ${o};
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
      `})]})}export{l as P};
