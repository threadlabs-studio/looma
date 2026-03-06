const i={title:"Primitives/ui-tabs",tags:["autodocs"],argTypes:{orientation:{control:"radio",options:["horizontal","vertical"]}},render:({orientation:r})=>`
    <ui-tabs orientation="${r}">
      <div role="tablist" aria-label="Sections">
        <button role="tab" id="tab-a" aria-controls="panel-a">Overview</button>
        <button role="tab" id="tab-b" aria-controls="panel-b">Details</button>
      </div>
      <section role="tabpanel" id="panel-a" aria-labelledby="tab-a">Overview content</section>
      <section role="tabpanel" id="panel-b" aria-labelledby="tab-b" hidden>Details content</section>
    </ui-tabs>
  `},a={args:{orientation:"horizontal"}};var t,e,o;a.parameters={...a.parameters,docs:{...(t=a.parameters)==null?void 0:t.docs,source:{originalSource:`{
  args: {
    orientation: "horizontal"
  }
}`,...(o=(e=a.parameters)==null?void 0:e.docs)==null?void 0:o.source}}};const n=["Default"];export{a as Default,n as __namedExportsOrder,i as default};
