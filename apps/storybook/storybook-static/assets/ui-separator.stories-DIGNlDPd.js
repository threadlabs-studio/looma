const s={title:"Layout/ui-separator",tags:["autodocs"],argTypes:{orientation:{control:"radio",options:["horizontal","vertical"]}},render:({orientation:r})=>`
    <div style="display: flex; align-items: center; gap: 1rem; ${r==="vertical"?"height: 3rem;":""}">
      <span>Before</span>
      <ui-separator orientation="${r}"></ui-separator>
      <span>After</span>
    </div>
  `},a={args:{orientation:"horizontal"}};var e,t,o;a.parameters={...a.parameters,docs:{...(e=a.parameters)==null?void 0:e.docs,source:{originalSource:`{
  args: {
    orientation: "horizontal"
  }
}`,...(o=(t=a.parameters)==null?void 0:t.docs)==null?void 0:o.source}}};const n=["Default"];export{a as Default,n as __namedExportsOrder,s as default};
