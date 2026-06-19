/* eslint-disable */
// One-shot tool: strip JS/TS comments (// and block comments) from the project.
// Uses the TypeScript scanner so strings, template literals and regex literals
// are never mis-stripped. Preserves triple-slash directives and known pragmas.
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const ROOT = process.cwd()
const SKIP_FILES = new Set([
  path.join(ROOT, 'src', 'auto-imports.d.ts'),
  path.join(ROOT, 'src', 'components.d.ts'),
  path.join(ROOT, 'strip-comments.cjs'),
])
// Comments that carry meaning to tooling/compiler — never remove these.
const PRESERVE = /^\/\/\/|@ts-|eslint|prettier|@vite-ignore|@preserve|@license|webpackChunkName|@unocss|@__PURE__/

function isBlank(s) {
  return s.trim() === ''
}

function lineStart(text, pos) {
  let i = pos
  while (i > 0 && text[i - 1] !== '\n') i--
  return i
}

function computeRemovals(code) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, code)
  const intervals = []
  let token = scanner.scan()
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      const end = scanner.getTextPos()
      const txt = scanner.getTokenText()
      const start = end - txt.length
      if (!PRESERVE.test(txt)) {
        const ls = lineStart(code, start)
        const before = code.slice(ls, start)
        let le = end
        while (le < code.length && code[le] !== '\n') le++
        const after = code.slice(end, le)
        if (isBlank(before) && isBlank(after)) {
          // Standalone comment occupying whole line(s): drop the line(s) entirely.
          const dropEnd = le < code.length ? le + 1 : le
          intervals.push([ls, dropEnd])
        } else {
          // Trailing/inline comment: drop it plus any whitespace right before it.
          let s2 = start
          while (s2 > ls && (code[s2 - 1] === ' ' || code[s2 - 1] === '\t')) s2--
          intervals.push([s2, end])
        }
      }
    }
    token = scanner.scan()
  }
  return intervals
}

function applyRemovals(code, intervals) {
  if (!intervals.length) return code
  intervals.sort((a, b) => a[0] - b[0])
  const merged = [intervals[0].slice()]
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1]
    if (intervals[i][0] <= last[1]) last[1] = Math.max(last[1], intervals[i][1])
    else merged.push(intervals[i].slice())
  }
  let out = ''
  let prev = 0
  for (const [s, e] of merged) {
    out += code.slice(prev, s)
    prev = e
  }
  return out + code.slice(prev)
}

function tidy(code) {
  let lines = code.split('\n').map((l) => l.replace(/[ \t]+$/, ''))
  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

function stripTs(code) {
  let s = tidy(applyRemovals(code, computeRemovals(code)))
  return s.replace(/^\n+/, '').replace(/\n+$/, '') + '\n'
}

function stripVueInner(inner) {
  let s = tidy(applyRemovals(inner, computeRemovals(inner)))
  return '\n' + s.replace(/^\n+/, '').replace(/\n+$/, '') + '\n'
}

function stripVue(content) {
  return content.replace(
    /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g,
    (_m, open, inner, close) => open + stripVueInner(inner) + close,
  )
}

function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'dist') continue
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) walk(full, acc)
    else if (/\.(ts|vue)$/.test(name)) acc.push(full)
  }
}

const files = []
walk(ROOT, files)

let changed = 0
for (const file of files) {
  if (SKIP_FILES.has(file)) continue
  const before = fs.readFileSync(file, 'utf8')
  const after = file.endsWith('.vue') ? stripVue(before) : stripTs(before)
  if (after !== before) {
    fs.writeFileSync(file, after)
    changed++
    console.log('stripped:', path.relative(ROOT, file))
  }
}
console.log(`\nDone. ${changed} file(s) updated.`)
