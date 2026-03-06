import{c as n,a as i}from"./componentApi-NjOjpNF5.js";const p={title:"Primitives/ui-dialog",tags:["autodocs"],argTypes:i("ui-dialog"),parameters:n("ui-dialog"),render:({open:r,modal:s})=>`
    <ui-dialog ${r?"open":""} ${s?"":'modal="false"'}>
      <dialog>
        <h3>Dialog title</h3>
        <p>Overlay contract example.</p>
        <button type="button">Close</button>
      </dialog>
    </ui-dialog>
  `},e={args:{open:!0,modal:!0}};var a,o,t;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    open: true,
    modal: true
  }
}`,...(t=(o=e.parameters)==null?void 0:o.docs)==null?void 0:t.source}}};const u=["Default"];export{e as Default,u as __namedExportsOrder,p as default};
