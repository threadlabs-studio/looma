import{c as o,a as n}from"./componentApi-NjOjpNF5.js";const i={title:"Layout/ui-separator",tags:["autodocs"],argTypes:n("ui-separator"),parameters:o("ui-separator"),render:({orientation:e})=>`
    <div style="display: flex; align-items: center; gap: 1rem; ${e==="vertical"?"height: 3rem;":""}">
      <span>Before</span>
      <ui-separator orientation="${e}"></ui-separator>
      <span>After</span>
    </div>
  `},a={args:{orientation:"horizontal"}};var r,t,s;a.parameters={...a.parameters,docs:{...(r=a.parameters)==null?void 0:r.docs,source:{originalSource:`{
  args: {
    orientation: "horizontal"
  }
}`,...(s=(t=a.parameters)==null?void 0:t.docs)==null?void 0:s.source}}};const c=["Default"];export{a as Default,c as __namedExportsOrder,i as default};
