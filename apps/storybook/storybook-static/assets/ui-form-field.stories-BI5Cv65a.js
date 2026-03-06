import{c as l,a as d}from"./componentApi-NjOjpNF5.js";const m={title:"Essentials/ui-form-field",tags:["autodocs"],argTypes:d("ui-form-field"),parameters:l("ui-form-field"),render:({required:i,disabled:o,invalid:t})=>`
    <ui-form-field ${i?"required":""} ${o?"disabled":""} ${t?"invalid":""}>
      <label for="storybook-email">Email</label>
      <ui-input>
        <input id="storybook-email" name="email" type="email" />
      </ui-input>
      <small data-slot="help">Used only for account notifications.</small>
    </ui-form-field>
  `},e={args:{required:!0,disabled:!1,invalid:!1}};var a,r,s;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    required: true,
    disabled: false,
    invalid: false
  }
}`,...(s=(r=e.parameters)==null?void 0:r.docs)==null?void 0:s.source}}};const u=["Default"];export{e as Default,u as __namedExportsOrder,m as default};
