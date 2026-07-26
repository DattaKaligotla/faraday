/**
 * Component-composition analyzer for a customer repo.
 *
 * Consumes the raw gzipped tarball stream from GitHub's `/repos/.../tarball`
 * endpoint, parses every `.ts/.tsx/.js/.jsx` file with `@babel/parser`, and
 * emits a graph where nodes are React components (function/arrow/class) and
 * edges are render-children relationships (`<Foo />` inside Bar's JSX).
 *
 * Components that themselves register Faraday `<Modifiable>` elements (or call
 * `useModifiable("id", ...)`) get their `modifiableIds` populated; the
 * dashboard renders those nodes with a distinct accent + badge.
 *
 * This file has no Firestore or HTTP coupling — it's a pure stream
 * transformer. `webapp/src/lib/server/repo-graphs.ts` wires it up: that
 * helper is called from the dashboard's `refresh` form action and the page
 * loader (read paths).
 */
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { ReadableStream as NodeReadableStream } from "node:stream/web";
import { extract as tarExtract } from "tar-stream";
import { parse as babelParse } from "@babel/parser";
import _traverse from "@babel/traverse";
import type { NodePath } from "@babel/traverse";
import type {
  ArrowFunctionExpression,
  CallExpression,
  ClassDeclaration,
  Function as BabelFunction,
  FunctionDeclaration,
  FunctionExpression,
  ImportDeclaration,
  JSXIdentifier,
  JSXOpeningElement,
  Node,
  VariableDeclarator,
} from "@babel/types";
import type { ComponentEdge, ComponentGraph, ComponentNode } from "./schemas";

// `@babel/traverse` ships as a CJS default export; ESM consumers see it under
// `.default`. Both shapes appear in the wild depending on bundler — handle
// either.
const traverse = (_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse;

const SOURCE_EXT = /\.(tsx?|jsx?)$/;
const SKIP_DIR =
  /(^|\/)(node_modules|dist|build|\.next|\.svelte-kit|coverage|\.git|\.turbo|\.cache|out|__tests__|__mocks__|__fixtures__|__snapshots__)(\/|$)/;
// Test/story/spec/mock files don't represent the runtime app the agent touches —
// dropping them keeps the graph proportional to the actual codebase a customer
// ships, instead of inflated by every unit test fixture and Storybook story.
const SKIP_FILE = /\.(test|spec|stories|story|mock|mocks|fixture|fixtures|e2e|cy)\.(tsx?|jsx?)$/;
const FORGE_PACKAGES = new Set(["@faraday-stack/forge", "faraday-stack", "@faraday/forge"]);

export type GraphProgressEvent =
  | { type: "tarball:start" }
  | { type: "file_parsed"; path: string; components: number; modifiables: number }
  | { type: "file_skipped"; path: string; reason: string }
  | { type: "graph:built"; components: number; edges: number };

export interface GraphResult {
  graph: ComponentGraph;
}

interface FileScan {
  path: string;
  /** Local component name -> source-file id (`path#Name`) for top-level decls in this file. */
  localDecls: Map<string, string>;
  /** Imported binding name -> resolved source-file id (or `external:Name` if outside the repo). */
  imports: Map<string, string>;
  /** Local alias for the `Modifiable` JSX tag, if any. Defaults to "Modifiable" if imported under that name. */
  modifiableAlias: string | null;
  /** Local alias for the `useModifiable` hook. */
  useModifiableAlias: string | null;
  /** Components declared in this file with their JSX/Modifiable findings. */
  components: Array<{
    id: string;
    name: string;
    line: number;
    /** Names of JSX tags rendered inside this component (PascalCase only). */
    rendered: Set<string>;
    /** Modifiable ids registered inside this component. `"<dynamic>"` if a non-string-literal id. */
    modifiableIds: string[];
  }>;
}

/** Concatenate a Buffer iterable into a single Buffer. */
async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

/** Strip GitHub's leading repo-prefix segment from a tar entry path. */
function stripTopDir(p: string): string {
  const idx = p.indexOf("/");
  return idx === -1 ? p : p.slice(idx + 1);
}

function isPascal(name: string): boolean {
  return /^[A-Z][A-Za-z0-9_]*$/.test(name);
}

/** True if a NodePath sits at the top level — directly under Program, or under
 *  a top-level export declaration. */
function isTopLevel(p: NodePath): boolean {
  const parent = p.parentPath;
  if (!parent) return false;
  if (parent.isProgram()) return true;
  return (
    (parent.isExportDefaultDeclaration() || parent.isExportNamedDeclaration()) &&
    (parent.parentPath?.isProgram() ?? false)
  );
}

/** True if a VariableDeclarator's enclosing VariableDeclaration is at the top level. */
function isTopLevelDeclarator(p: NodePath<VariableDeclarator>): boolean {
  const decl = p.parentPath; // VariableDeclaration
  if (!decl) return false;
  return isTopLevel(decl);
}

function jsxTagName(opening: JSXOpeningElement): string | null {
  const n = opening.name;
  if (n.type === "JSXIdentifier") return n.name;
  return null;
}

/** Resolve a relative import path to a path within the repo (best-effort, no extension probing). */
function resolveImportPath(fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".") && !spec.startsWith("/")) return null;
  const base = fromFile.split("/").slice(0, -1);
  const parts = spec.split("/");
  for (const p of parts) {
    if (p === "." || p === "") continue;
    if (p === "..") base.pop();
    else base.push(p);
  }
  return base.join("/");
}

/**
 * Scan a single file's AST: collect imports, top-level component declarations,
 * and inside each component's body, collect rendered tag names + Modifiable ids.
 *
 * The scanner walks each component body via a single traverse pass, using
 * function-node identity to attribute findings to the enclosing component.
 */
function scanFile(path: string, source: string): FileScan {
  const out: FileScan = {
    path,
    localDecls: new Map(),
    imports: new Map(),
    modifiableAlias: null,
    useModifiableAlias: null,
    components: [],
  };

  let ast: Node;
  try {
    ast = babelParse(source, {
      sourceType: "module",
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      plugins: [
        path.endsWith(".tsx") || path.endsWith(".ts") ? "typescript" : "flow",
        "jsx",
        "decorators-legacy",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "topLevelAwait",
        "importMeta",
        "dynamicImport",
        "explicitResourceManagement",
        "throwExpressions",
      ],
    }) as unknown as Node;
  } catch {
    return out; // unparseable — caller will record a skip
  }

  // Track function-node → component index so JSX inside them can be attributed.
  const fnToComponent = new Map<Node, number>();

  const fileId = (name: string) => `${path}#${name}`;

  // First pass: collect imports and top-level component declarations.
  traverse(ast, {
    ImportDeclaration(p: NodePath<ImportDeclaration>) {
      const src = p.node.source.value;
      const isForge = FORGE_PACKAGES.has(src);
      const resolved = resolveImportPath(path, src);
      for (const spec of p.node.specifiers) {
        if (spec.type === "ImportSpecifier") {
          const imported = spec.imported.type === "Identifier" ? spec.imported.name : spec.imported.value;
          const local = spec.local.name;
          if (isForge && imported === "Modifiable") out.modifiableAlias = local;
          if (isForge && imported === "useModifiable") out.useModifiableAlias = local;
          if (resolved) out.imports.set(local, `${resolved}#${imported}`);
          else out.imports.set(local, `external:${imported}`);
        } else if (spec.type === "ImportDefaultSpecifier") {
          const local = spec.local.name;
          if (resolved) out.imports.set(local, `${resolved}#default`);
          else out.imports.set(local, `external:${local}`);
        }
      }
    },
    FunctionDeclaration(p: NodePath<FunctionDeclaration>) {
      const id = p.node.id?.name;
      if (!id || !isPascal(id) || !isTopLevel(p)) return;
      if (!hasJSXReturn(p)) return;
      const compId = fileId(id);
      out.localDecls.set(id, compId);
      out.components.push({
        id: compId,
        name: id,
        line: p.node.loc?.start.line ?? 1,
        rendered: new Set(),
        modifiableIds: [],
      });
      fnToComponent.set(p.node, out.components.length - 1);
    },
    VariableDeclarator(p: NodePath<VariableDeclarator>) {
      if (!isTopLevelDeclarator(p)) return;
      const idNode = p.node.id;
      if (idNode.type !== "Identifier" || !isPascal(idNode.name)) return;
      const init = p.node.init;
      if (!init) return;
      if (init.type !== "ArrowFunctionExpression" && init.type !== "FunctionExpression") return;
      if (!hasJSXReturn(p.get("init") as NodePath<ArrowFunctionExpression | FunctionExpression>)) return;
      const compId = fileId(idNode.name);
      out.localDecls.set(idNode.name, compId);
      out.components.push({
        id: compId,
        name: idNode.name,
        line: p.node.loc?.start.line ?? 1,
        rendered: new Set(),
        modifiableIds: [],
      });
      fnToComponent.set(init, out.components.length - 1);
    },
    ClassDeclaration(p: NodePath<ClassDeclaration>) {
      const id = p.node.id?.name;
      if (!id || !isPascal(id) || !isTopLevel(p)) return;
      const sup = p.node.superClass;
      const isReactClass =
        (sup?.type === "Identifier" && sup.name === "Component") ||
        (sup?.type === "MemberExpression" &&
          sup.property.type === "Identifier" &&
          (sup.property.name === "Component" || sup.property.name === "PureComponent"));
      if (!isReactClass) return;
      const compId = fileId(id);
      out.localDecls.set(id, compId);
      out.components.push({
        id: compId,
        name: id,
        line: p.node.loc?.start.line ?? 1,
        rendered: new Set(),
        modifiableIds: [],
      });
      // Class render: attribute JSX to the class node itself.
      fnToComponent.set(p.node, out.components.length - 1);
    },
  });

  if (out.components.length === 0) return out;

  // Second pass: inside each component, capture JSX usage + Modifiable ids.
  // For function/arrow components, the component node is the function itself;
  // for class components it's the ClassDeclaration. JSX is found by walking
  // descendants of that node.
  const modifiableTag = out.modifiableAlias; // null if not imported
  const useModifiableHook = out.useModifiableAlias;

  traverse(ast, {
    JSXOpeningElement(p: NodePath<JSXOpeningElement>) {
      const enclosing = findEnclosingComponentIndex(p, fnToComponent);
      if (enclosing == null) return;
      const tag = jsxTagName(p.node);
      if (!tag) return;

      // Modifiable site? Pull `id` prop value if it's a string literal.
      if (modifiableTag && tag === modifiableTag) {
        const idVal = readModifiableIdProp(p.node);
        out.components[enclosing].modifiableIds.push(idVal ?? "<dynamic>");
        return; // don't also count `<Modifiable>` as a render edge
      }

      // Render edge — only PascalCase tags (lowercase = HTML).
      if (isPascal(tag)) out.components[enclosing].rendered.add(tag);
    },
    CallExpression(p: NodePath<CallExpression>) {
      if (!useModifiableHook) return;
      const callee = p.node.callee;
      if (callee.type !== "Identifier" || callee.name !== useModifiableHook) return;
      const enclosing = findEnclosingComponentIndex(p, fnToComponent);
      if (enclosing == null) return;
      const idArg = p.node.arguments[0];
      if (idArg && idArg.type === "StringLiteral") out.components[enclosing].modifiableIds.push(idArg.value);
      else out.components[enclosing].modifiableIds.push("<dynamic>");
    },
  });

  return out;
}

/**
 * Walk up a node path looking for the first function/class node we registered
 * as a component. Returns the index into `scan.components`.
 */
function findEnclosingComponentIndex(p: NodePath, fnToComponent: Map<Node, number>): number | null {
  let cur: NodePath | null = p;
  while (cur) {
    if (fnToComponent.has(cur.node)) return fnToComponent.get(cur.node)!;
    cur = cur.parentPath;
  }
  return null;
}

/** Detect whether a function body returns JSX (cheap structural check). */
function hasJSXReturn(p: NodePath<BabelFunction | ArrowFunctionExpression | FunctionExpression>): boolean {
  let found = false;
  p.traverse({
    JSXElement() {
      found = true;
      p.stop();
    },
    JSXFragment() {
      found = true;
      p.stop();
    },
  });
  return found;
}

/** Read the `id` prop off a `<Modifiable id="...">` opening element. */
function readModifiableIdProp(opening: JSXOpeningElement): string | null {
  for (const attr of opening.attributes) {
    if (attr.type !== "JSXAttribute") continue;
    const name = attr.name;
    const nm = name.type === "JSXIdentifier" ? (name as JSXIdentifier).name : null;
    if (nm !== "id") continue;
    const v = attr.value;
    if (!v) return null;
    if (v.type === "StringLiteral") return v.value;
    if (v.type === "JSXExpressionContainer" && v.expression.type === "StringLiteral") return v.expression.value;
    return null; // template literal, identifier, etc.
  }
  return null;
}

/**
 * Public entry point. Yields per-file progress; final `return` value carries
 * the assembled graph.
 */
export async function* buildComponentGraph(
  tarball: ReadableStream<Uint8Array>,
): AsyncGenerator<GraphProgressEvent, GraphResult, void> {
  yield { type: "tarball:start" };

  // Pipe gzipped tarball into tar-stream extract via gunzip.
  const gunzip = createGunzip();
  const extract = tarExtract();
  const nodeStream = Readable.fromWeb(tarball as unknown as NodeReadableStream);
  nodeStream.pipe(gunzip).pipe(extract);

  const scans: FileScan[] = [];
  let files = 0;
  let parsedFiles = 0;
  let skippedFiles = 0;

  for await (const entry of extract as AsyncIterable<{
    header: { name: string; type?: string };
    pipe: (dest: NodeJS.WritableStream) => void;
    on(ev: "end", cb: () => void): void;
    on(ev: "error", cb: (e: Error) => void): void;
    resume: () => void;
  }>) {
    const rawPath = entry.header.name;
    const type = entry.header.type;
    const inner = stripTopDir(rawPath);

    // Skip directories, symlinks, anything not a regular file.
    if (type && type !== "file") {
      // Need to drain the stream so the iterator advances.
      (entry as unknown as { resume: () => void }).resume();
      continue;
    }

    // Skip non-source dirs and non-source extensions cheaply.
    if (SKIP_DIR.test(inner) || !SOURCE_EXT.test(inner) || SKIP_FILE.test(inner)) {
      (entry as unknown as { resume: () => void }).resume();
      continue;
    }

    files += 1;
    const buf = await readAll(entry as unknown as NodeJS.ReadableStream);
    if (buf.byteLength > 1024 * 1024) {
      // 1 MB sanity cap on a single file — vendored bundles aren't real source.
      yield { type: "file_skipped", path: inner, reason: "too large (>1MB)" };
      skippedFiles += 1;
      continue;
    }

    const source = buf.toString("utf-8");
    const scan = scanFile(inner, source);
    if (scan.components.length === 0) {
      yield { type: "file_skipped", path: inner, reason: "no components" };
      skippedFiles += 1;
      continue;
    }
    scans.push(scan);
    parsedFiles += 1;
    yield {
      type: "file_parsed",
      path: inner,
      components: scan.components.length,
      modifiables: scan.components.reduce((n, c) => n + c.modifiableIds.length, 0),
    };
  }

  // Cross-file resolution: build a map of every defined component, then
  // resolve each component's rendered tags against the file's import map.
  const allComponents = new Map<string, ComponentNode>();
  for (const scan of scans) {
    for (const c of scan.components) {
      allComponents.set(c.id, {
        id: c.id,
        name: c.name,
        file: scan.path,
        line: c.line,
        modifiableIds: c.modifiableIds,
      });
    }
  }

  const edges: ComponentEdge[] = [];
  const seenEdges = new Set<string>();
  for (const scan of scans) {
    for (const c of scan.components) {
      for (const tag of c.rendered) {
        // Local declaration in the same file wins over imports.
        let toId: string | null = scan.localDecls.get(tag) ?? scan.imports.get(tag) ?? null;
        if (!toId) continue;
        // Resolve same-file `path#default` against the local path's default-exported component, if any.
        // For v1, only emit edges that point at known components.
        if (toId.startsWith("external:")) continue;
        // Probe: tag with extension variants until we hit a known component id.
        const resolvedId = resolveTargetId(toId, allComponents);
        if (!resolvedId) continue;
        const key = `${c.id}->${resolvedId}`;
        if (seenEdges.has(key)) continue;
        seenEdges.add(key);
        edges.push({ from: c.id, to: resolvedId });
      }
    }
  }

  const graph: ComponentGraph = {
    components: Array.from(allComponents.values()),
    edges,
    files,
    parsedFiles,
    skippedFiles,
  };
  yield { type: "graph:built", components: graph.components.length, edges: graph.edges.length };
  return { graph };
}

/**
 * Imports never carry a file extension, so an import like
 * `import { Foo } from "./Foo"` resolves to the literal id `src/Foo#Foo`,
 * but the actual component lives at `src/Foo.tsx#Foo`. Probe known suffixes.
 */
function resolveTargetId(rawId: string, all: Map<string, ComponentNode>): string | null {
  if (all.has(rawId)) return rawId;
  const hashIdx = rawId.lastIndexOf("#");
  if (hashIdx === -1) return null;
  const base = rawId.slice(0, hashIdx);
  const name = rawId.slice(hashIdx + 1);
  const suffixes = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"];
  for (const s of suffixes) {
    const candidate = `${base}${s}#${name}`;
    if (all.has(candidate)) return candidate;
  }
  // Default-export fallback: `path#default` may correspond to the file's only component.
  if (name === "default") {
    for (const s of suffixes) {
      const filePath = `${base}${s}`;
      // Find a single component whose file matches.
      const candidates = Array.from(all.values()).filter((c) => c.file === filePath);
      if (candidates.length === 1) return candidates[0].id;
    }
  }
  return null;
}
