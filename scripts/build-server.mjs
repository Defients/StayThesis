import { build } from 'esbuild';

// Bundle aliases and extensionless reducer/domain imports for Deno. The SDK is
// pinned in the Edge entry point and remains a native npm: import.
await build({
  entryPoints: ['supabase/functions/workspace/entry.ts'],
  outfile: 'supabase/functions/workspace/index.js',
  bundle: true, format: 'esm', platform: 'neutral', target: 'es2022',
  tsconfig: 'tsconfig.app.json', external: ['npm:*'],
});
console.log('Built shared workspace Edge function');
