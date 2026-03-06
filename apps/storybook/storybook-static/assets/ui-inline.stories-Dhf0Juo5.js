const i={title:"Layout/ui-inline",tags:["autodocs"],argTypes:{gap:{control:"text"},align:{control:"text"},justify:{control:"text"},wrap:{control:"text"}},render:({gap:r,align:o,justify:s,wrap:u})=>`
    <ui-inline gap="${r}" align="${o}" justify="${s}" wrap="${u}">
      <button type="button">Edit</button>
      <button type="button">Share</button>
      <button type="button">Archive</button>
    </ui-inline>
  `},t={args:{gap:"s",align:"center",justify:"start",wrap:"wrap"}};var a,e,n;t.parameters={...t.parameters,docs:{...(a=t.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    gap: "s",
    align: "center",
    justify: "start",
    wrap: "wrap"
  }
}`,...(n=(e=t.parameters)==null?void 0:e.docs)==null?void 0:n.source}}};const p=["Default"];export{t as Default,p as __namedExportsOrder,i as default};
