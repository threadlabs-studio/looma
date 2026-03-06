import{c as i,a as n}from"./componentApi-NjOjpNF5.js";const o={title:"Primitives/ui-menu-item",tags:["autodocs"],argTypes:n("ui-menu-item"),parameters:i("ui-menu-item"),render:({value:a,disabled:m})=>`
    <ui-menu role="menu" aria-label="Single item menu">
      <ui-menu-item value="${a}" ${m?"disabled":""}>${a}</ui-menu-item>
    </ui-menu>
  `},e={args:{value:"edit",disabled:!1}};var r,t,s;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`{
  args: {
    value: "edit",
    disabled: false
  }
}`,...(s=(t=e.parameters)==null?void 0:t.docs)==null?void 0:s.source}}};const d=["Default"];export{e as Default,d as __namedExportsOrder,o as default};
