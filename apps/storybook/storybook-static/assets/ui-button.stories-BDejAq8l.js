const i={title:"Essentials/ui-button",tags:["autodocs"],argTypes:{variant:{control:"text"},size:{control:"text"},disabled:{control:"boolean"}},render:({variant:o,size:n,disabled:r})=>`
    <ui-button variant="${o}" size="${n}" ${r?"disabled":""}>
      <button type="button">Action</button>
    </ui-button>
  `},t={args:{variant:"solid",size:"sm",disabled:!1}};var e,a,s;t.parameters={...t.parameters,docs:{...(e=t.parameters)==null?void 0:e.docs,source:{originalSource:`{
  args: {
    variant: "solid",
    size: "sm",
    disabled: false
  }
}`,...(s=(a=t.parameters)==null?void 0:a.docs)==null?void 0:s.source}}};const d=["Default"];export{t as Default,d as __namedExportsOrder,i as default};
