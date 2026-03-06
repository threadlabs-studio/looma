import{c as n,a as i}from"./componentApi-NjOjpNF5.js";const l={title:"Primitives/ui-tabs",tags:["autodocs"],argTypes:i("ui-tabs"),parameters:n("ui-tabs"),render:({orientation:r})=>`
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
}`,...(o=(e=a.parameters)==null?void 0:e.docs)==null?void 0:o.source}}};const b=["Default"];export{a as Default,b as __namedExportsOrder,l as default};
