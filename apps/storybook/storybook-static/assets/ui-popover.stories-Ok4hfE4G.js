const a={title:"Primitives/ui-popover",tags:["autodocs"],argTypes:{open:{control:"boolean"}},render:({open:s})=>`
    <ui-popover ${s?"open":""}>
      This is popover content.
    </ui-popover>
  `},e={args:{open:!0}};var o,r,t;e.parameters={...e.parameters,docs:{...(o=e.parameters)==null?void 0:o.docs,source:{originalSource:`{
  args: {
    open: true
  }
}`,...(t=(r=e.parameters)==null?void 0:r.docs)==null?void 0:t.source}}};const p=["Default"];export{e as Default,p as __namedExportsOrder,a as default};
