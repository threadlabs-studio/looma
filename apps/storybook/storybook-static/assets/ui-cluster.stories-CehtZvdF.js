const u={title:"Layout/ui-cluster",tags:["autodocs"],argTypes:{gap:{control:"text"},align:{control:"text"},justify:{control:"text"}},render:({gap:s,align:r,justify:o})=>`
    <ui-cluster gap="${s}" align="${r}" justify="${o}">
      <span>Status: Active</span>
      <button type="button">Save</button>
      <button type="button">Cancel</button>
    </ui-cluster>
  `},t={args:{gap:"s",align:"center",justify:"between"}};var e,a,n;t.parameters={...t.parameters,docs:{...(e=t.parameters)==null?void 0:e.docs,source:{originalSource:`{
  args: {
    gap: "s",
    align: "center",
    justify: "between"
  }
}`,...(n=(a=t.parameters)==null?void 0:a.docs)==null?void 0:n.source}}};const c=["Default"];export{t as Default,c as __namedExportsOrder,u as default};
