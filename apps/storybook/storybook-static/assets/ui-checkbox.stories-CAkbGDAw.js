import{c as i,a as l}from"./componentApi-NjOjpNF5.js";const m={title:"Essentials/ui-checkbox",tags:["autodocs"],argTypes:l("ui-checkbox"),parameters:i("ui-checkbox"),render:({checked:t,disabled:c,required:n,indeterminate:o,value:d})=>`
    <ui-checkbox
      ${t?"checked":""}
      ${c?"disabled":""}
      ${n?"required":""}
      ${o?"indeterminate":""}
      value="${d}"
    >
      <input type="checkbox" />
      Receive updates
    </ui-checkbox>
  `},e={args:{checked:!1,disabled:!1,required:!1,indeterminate:!1,value:"newsletter"}};var a,s,r;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    checked: false,
    disabled: false,
    required: false,
    indeterminate: false,
    value: "newsletter"
  }
}`,...(r=(s=e.parameters)==null?void 0:s.docs)==null?void 0:r.source}}};const p=["Default"];export{e as Default,p as __namedExportsOrder,m as default};
