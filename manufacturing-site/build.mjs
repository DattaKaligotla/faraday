import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webapp = join(root, "webapp");
const output = join(root, ".vercel", "output");
const staticDir = join(output, "static");
const sourceFile = join(webapp, "src", "routes", "+page.svelte");
const compiledFile = join(webapp, ".manufacturing-page.server.mjs");
const requireFromWebapp = createRequire(join(webapp, "package.json"));
const compiler = await import(pathToFileURL(requireFromWebapp.resolve("svelte/compiler")).href);
const server = await import(pathToFileURL(requireFromWebapp.resolve("svelte/server")).href);
const { compile } = compiler.default ?? compiler;
const { render } = server.default ?? server;

const source = (await readFile(sourceFile, "utf8"))
  .replace(/\s*import \{ ArrowRight, ArrowUpRight, Check, List, X \} from "phosphor-svelte";/, "")
  .replace(/<ArrowRight\b[^>]*\/>/g, '<span aria-hidden="true">→</span>')
  .replace(/<ArrowUpRight\b[^>]*\/>/g, '<span aria-hidden="true">↗</span>')
  .replace(/<Check\b[^>]*\/>/g, '<span aria-hidden="true">✓</span>')
  .replace(/\{#if menuOpen\}<X\b[^>]*\/>\{:else\}<List\b[^>]*\/>\{\/if\}/, '<span aria-hidden="true">☰</span>');
const compiled = compile(source, { filename: sourceFile, generate: "server", css: "external" });

try {
  await writeFile(compiledFile, compiled.js.code);
  const { default: Page } = await import(pathToFileURL(compiledFile).href);
  const { body, head } = render(Page);

  await rm(output, { recursive: true, force: true });
  await mkdir(join(staticDir, "images"), { recursive: true });
  await writeFile(join(output, "config.json"), JSON.stringify({ version: 3 }));
  const baseCss = `
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    button { font-family: inherit; cursor: pointer; }
    .statement-details li > span { color: #d9ff43; }
  `;
  await writeFile(join(staticDir, "site.css"), `${baseCss}\n${compiled.css.code}`);
  await copyFile(
    join(webapp, "static", "images", "faraday-shop-hero.png"),
    join(staticDir, "images", "faraday-shop-hero.png"),
  );
  await copyFile(join(webapp, "static", "logo-mark.svg"), join(staticDir, "logo-mark.svg"));
  await copyFile(join(webapp, "static", "robots.txt"), join(staticDir, "robots.txt"));

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/logo-mark.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/site.css" />
    ${head}
  </head>
  <body>
    ${body}
    <script>
      const menuButton = document.querySelector('.menu-button');
      const nav = document.querySelector('.site-header nav');
      menuButton?.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
        menuButton.querySelector('span').textContent = open ? '×' : '☰';
      });
      nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuButton?.setAttribute('aria-expanded', 'false');
        menuButton?.setAttribute('aria-label', 'Open navigation');
        menuButton?.querySelector('span').textContent = '☰';
      }));
    </script>
  </body>
</html>`;
  await writeFile(join(staticDir, "index.html"), html);
  console.log(`Built manufacturing site in ${staticDir}`);
} finally {
  await rm(compiledFile, { force: true });
}
