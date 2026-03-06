const t={title:"Essentials/ui-form-field",tags:["autodocs"],argTypes:{required:{control:"boolean"},disabled:{control:"boolean"},invalid:{control:"boolean"}},render:({required:r,disabled:i,invalid:s})=>`
    <ui-form-field ${r?"required":""} ${i?"disabled":""} ${s?"invalid":""}>
      <label for="storybook-email">Email</label>
      <ui-input>
        <input id="storybook-email" name="email" type="email" />
      </ui-input>
      <small data-slot="help">Used only for account notifications.</small>
    </ui-form-field>
  `},e={args:{required:!0,disabled:!1,invalid:!1}};var a,l,o;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    required: true,
    disabled: false,
    invalid: false
  }
}`,...(o=(l=e.parameters)==null?void 0:l.docs)==null?void 0:o.source}}};const n=["Default"];export{e as Default,n as __namedExportsOrder,t as default};
