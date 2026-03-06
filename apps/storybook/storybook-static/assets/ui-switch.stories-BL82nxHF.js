import{c as n,a as d}from"./componentApi-NjOjpNF5.js";const u={title:"Essentials/ui-switch",tags:["autodocs"],argTypes:d("ui-switch"),parameters:n("ui-switch"),render:({checked:r,disabled:i,required:c,value:o})=>`
    <ui-switch
      ${r?"checked":""}
      ${i?"disabled":""}
      ${c?"required":""}
      value="${o}"
    >
      <input type="checkbox" />
      Enable notifications
    </ui-switch>
  `},e={args:{checked:!1,disabled:!1,required:!1,value:"notifications"}};var a,s,t;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    checked: false,
    disabled: false,
    required: false,
    value: "notifications"
  }
}`,...(t=(s=e.parameters)==null?void 0:s.docs)==null?void 0:t.source}}};const p=["Default"];export{e as Default,p as __namedExportsOrder,u as default};
