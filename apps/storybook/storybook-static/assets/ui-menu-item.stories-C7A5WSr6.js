const n={title:"Primitives/ui-menu-item",tags:["autodocs"],argTypes:{value:{control:"text"},disabled:{control:"boolean"}},render:({value:a,disabled:i})=>`
    <ui-menu role="menu" aria-label="Single item menu">
      <ui-menu-item value="${a}" ${i?"disabled":""}>${a}</ui-menu-item>
    </ui-menu>
  `},e={args:{value:"edit",disabled:!1}};var t,r,s;e.parameters={...e.parameters,docs:{...(t=e.parameters)==null?void 0:t.docs,source:{originalSource:`{
  args: {
    value: "edit",
    disabled: false
  }
}`,...(s=(r=e.parameters)==null?void 0:r.docs)==null?void 0:s.source}}};const u=["Default"];export{e as Default,u as __namedExportsOrder,n as default};
