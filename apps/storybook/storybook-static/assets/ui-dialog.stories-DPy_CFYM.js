const n={title:"Primitives/ui-dialog",tags:["autodocs"],argTypes:{open:{control:"boolean"},modal:{control:"boolean"}},render:({open:r,modal:l})=>`
    <ui-dialog ${r?"open":""} ${l?"":'modal="false"'}>
      <dialog>
        <h3>Dialog title</h3>
        <p>Overlay contract example.</p>
        <button type="button">Close</button>
      </dialog>
    </ui-dialog>
  `},o={args:{open:!0,modal:!0}};var e,a,t;o.parameters={...o.parameters,docs:{...(e=o.parameters)==null?void 0:e.docs,source:{originalSource:`{
  args: {
    open: true,
    modal: true
  }
}`,...(t=(a=o.parameters)==null?void 0:a.docs)==null?void 0:t.source}}};const s=["Default"];export{o as Default,s as __namedExportsOrder,n as default};
