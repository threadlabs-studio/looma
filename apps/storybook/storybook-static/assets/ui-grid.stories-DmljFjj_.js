const o={title:"Layout/ui-grid",tags:["autodocs"],argTypes:{gap:{control:"text"},min:{control:"text"}},render:({gap:d,min:i})=>`
    <ui-grid gap="${d}" min="${i}">
      <article style="padding: 1rem; border: 1px solid var(--ui-border-default);">Card A</article>
      <article style="padding: 1rem; border: 1px solid var(--ui-border-default);">Card B</article>
      <article style="padding: 1rem; border: 1px solid var(--ui-border-default);">Card C</article>
    </ui-grid>
  `},r={args:{gap:"m",min:"md"}};var e,a,t;r.parameters={...r.parameters,docs:{...(e=r.parameters)==null?void 0:e.docs,source:{originalSource:`{
  args: {
    gap: "m",
    min: "md"
  }
}`,...(t=(a=r.parameters)==null?void 0:a.docs)==null?void 0:t.source}}};const s=["Default"];export{r as Default,s as __namedExportsOrder,o as default};
