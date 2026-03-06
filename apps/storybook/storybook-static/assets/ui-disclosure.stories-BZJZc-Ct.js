const n={title:"Primitives/ui-disclosure",tags:["autodocs"],argTypes:{open:{control:"boolean"},disabled:{control:"boolean"}},render:({open:r,disabled:t})=>`
    <ui-disclosure ${r?"open":""} ${t?"disabled":""}>
      <button type="button" aria-controls="disclosure-panel">Toggle details</button>
      <div id="disclosure-panel" hidden>Progressive enhancement disclosure content.</div>
    </ui-disclosure>
  `},e={args:{open:!1,disabled:!1}};var s,o,a;e.parameters={...e.parameters,docs:{...(s=e.parameters)==null?void 0:s.docs,source:{originalSource:`{
  args: {
    open: false,
    disabled: false
  }
}`,...(a=(o=e.parameters)==null?void 0:o.docs)==null?void 0:a.source}}};const d=["Default"];export{e as Default,d as __namedExportsOrder,n as default};
