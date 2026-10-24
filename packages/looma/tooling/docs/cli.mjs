#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { initializeDocumentation, buildProjectDocumentation, devProjectDocumentation, previewProjectDocumentation } from './commands.mjs';

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { root: { type: 'string' }, port: { type: 'string' }, title: { type: 'string' }, help: { type: 'boolean', short: 'h' } } });
  const [command = 'help'] = positionals;
  if (values.help || command === 'help') {
    console.log('looma-docs init | dev | build | preview\n\n  --root <project>  Project directory\n  --port <number>   Local server port (default 3000)\n  --title <name>    Documentation title for init\n\nInstall the optional documentation peers: markupress, @nextwebwg/htmlkit and vite.');
  } else {
    const options = { ...(values.root ? { root: values.root } : {}), ...(values.title ? { title: values.title } : {}) };
    if (values.port) { const port = Number(values.port); if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 to 65535.'); options.port = port; }
    if (command === 'init') {
      const result = await initializeDocumentation(options);
      console.log(`Created ${result.files.join(', ')}.\nImport ${result.applicationImport} after Looma styles in your application.\nRun looma-docs dev to weave your design system.`);
    } else if (command === 'build') {
      const built = await buildProjectDocumentation(options); console.log(`Built ${built.routes.length} documentation routes in ${built.outDir}.`);
    } else if (command === 'dev' || command === 'preview') {
      const server = await (command === 'dev' ? devProjectDocumentation : previewProjectDocumentation)(options);
      console.log(server.url);
      let closing = false;
      const close = async () => { if (closing) return; closing = true; await server.close(); process.exitCode = 0; };
      process.once('SIGINT', close); process.once('SIGTERM', close);
    } else throw new Error(`Unknown documentation command ${command}. Use looma-docs --help.`);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
