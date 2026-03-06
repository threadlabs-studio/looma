const d={title:"Essentials/ui-input",tags:["autodocs"],argTypes:{value:{control:"text"},disabled:{control:"boolean"},readonly:{control:"boolean"},invalid:{control:"boolean"}},render:({value:o,disabled:s,readonly:t,invalid:r})=>`
    <ui-input value="${o}" ${s?"disabled":""} ${t?"readonly":""} ${r?"invalid":""}>
      <input type="text" name="field" />
    </ui-input>
  `},e={args:{value:"hello",disabled:!1,readonly:!1,invalid:!1}};var a,l,n;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    value: "hello",
    disabled: false,
    readonly: false,
    invalid: false
  }
}`,...(n=(l=e.parameters)==null?void 0:l.docs)==null?void 0:n.source}}};const i=["Default"];export{e as Default,i as __namedExportsOrder,d as default};
