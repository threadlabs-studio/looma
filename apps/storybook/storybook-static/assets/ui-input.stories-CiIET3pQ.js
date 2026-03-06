import{c as o,a as d}from"./componentApi-NjOjpNF5.js";const p={title:"Essentials/ui-input",tags:["autodocs"],argTypes:d("ui-input"),parameters:o("ui-input"),render:({value:r,disabled:n,readonly:l,invalid:i})=>`
    <ui-input value="${r}" ${n?"disabled":""} ${l?"readonly":""} ${i?"invalid":""}>
      <input type="text" name="field" />
    </ui-input>
  `},e={args:{value:"hello",disabled:!1,readonly:!1,invalid:!1}};var a,s,t;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    value: "hello",
    disabled: false,
    readonly: false,
    invalid: false
  }
}`,...(t=(s=e.parameters)==null?void 0:s.docs)==null?void 0:t.source}}};const c=["Default"];export{e as Default,c as __namedExportsOrder,p as default};
