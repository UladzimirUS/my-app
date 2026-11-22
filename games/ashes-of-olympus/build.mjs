// Builds index.html (single self-contained page) from src/. Run: node build.mjs
import {readFileSync,writeFileSync} from 'node:fs';
const r=f=>readFileSync(new URL('./src/'+f,import.meta.url),'utf8');
const js=['core.js','data.js','world.js','art.js','game.js','render.js','ui.js'].map(f=>`/* ---- ${f} ---- */\n`+r(f)).join('\n');
const html=`<title>Пепел Олимпа</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Philosopher:wght@400;700&family=Fira+Sans:wght@400;500;700&display=swap">
<style>
${r('style.css')}</style>
${r('body.html')}
<script>
'use strict';
${js}
</script>
`;
writeFileSync(new URL('./index.html',import.meta.url),html);
console.log('index.html',html.length,'bytes');
