const n={title:"Layout/ui-stack",tags:["autodocs"],argTypes:{gap:{control:"text"},align:{control:"text"},justify:{control:"text"}},render:({gap:s,align:o,justify:i})=>`
    <ui-stack gap="${s}" align="${o}" justify="${i}">
      <div>Header</div>
      <div>Body</div>
      <div>Footer</div>
    </ui-stack>
  `},t={args:{gap:"m",align:"stretch",justify:"start"}};var a,e,r;t.parameters={...t.parameters,docs:{...(a=t.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    gap: "m",
    align: "stretch",
    justify: "start"
  }
}`,...(r=(e=t.parameters)==null?void 0:e.docs)==null?void 0:r.source}}};const c=["Default"];export{t as Default,c as __namedExportsOrder,n as default};
