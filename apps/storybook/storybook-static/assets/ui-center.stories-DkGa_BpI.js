const o={title:"Layout/ui-center",tags:["autodocs"],argTypes:{measure:{control:"text"},gutters:{control:"text"}},render:({measure:a,gutters:n})=>`
    <ui-center measure="${a}" gutters="${n}">
      <h2 style="margin: 0;">Centered Content</h2>
      <p style="margin: 0.5rem 0 0;">Readable measure and consistent gutters.</p>
    </ui-center>
  `},e={args:{measure:"wide",gutters:"m"}};var t,r,s;e.parameters={...e.parameters,docs:{...(t=e.parameters)==null?void 0:t.docs,source:{originalSource:`{
  args: {
    measure: "wide",
    gutters: "m"
  }
}`,...(s=(r=e.parameters)==null?void 0:r.docs)==null?void 0:s.source}}};const u=["Default"];export{e as Default,u as __namedExportsOrder,o as default};
