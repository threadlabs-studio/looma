import{c as i,a as n}from"./componentApi-NjOjpNF5.js";const c={title:"Primitives/ui-disclosure",tags:["autodocs"],argTypes:n("ui-disclosure"),parameters:i("ui-disclosure"),render:({open:o,disabled:t})=>`
    <ui-disclosure ${o?"open":""} ${t?"disabled":""}>
      <button type="button" aria-controls="disclosure-panel">Toggle details</button>
      <div id="disclosure-panel" hidden>Progressive enhancement disclosure content.</div>
    </ui-disclosure>
  `},e={args:{open:!1,disabled:!1}};var s,r,a;e.parameters={...e.parameters,docs:{...(s=e.parameters)==null?void 0:s.docs,source:{originalSource:`{
  args: {
    open: false,
    disabled: false
  }
}`,...(a=(r=e.parameters)==null?void 0:r.docs)==null?void 0:a.source}}};const l=["Default"];export{e as Default,l as __namedExportsOrder,c as default};
