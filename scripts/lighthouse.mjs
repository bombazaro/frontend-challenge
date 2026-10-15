/**
 * Auditoria Lighthouse: build otimizado + 3 execuções por página e perfil (mobile/desktop).
 * Gera relatórios HTML/JSON em lighthouse/reports/<perfil> e a mediana em lighthouse/RESULTS.md.
 * Uso: npm run lighthouse   (o Chromium do Playwright é usado se CHROME_PATH não estiver definido)
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { chromium } from '@playwright/test'

process.env.CHROME_PATH ??= chromium.executablePath()
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env: process.env })

if (!process.argv.includes('--skip-build')) run('npm run build')

const profiles = ['mobile', 'desktop']
const median = (values) => {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

let md = '# Resultados Lighthouse\n\n'
for (const profile of profiles) {
  const out = `lighthouse/reports/${profile}`
  if (existsSync(out)) rmSync(out, { recursive: true })
  rmSync('.lighthouseci', { recursive: true, force: true })
  run(`npx lhci collect --config=lighthouse/lighthouserc.${profile}.cjs`)
  run(`npx lhci upload --config=lighthouse/lighthouserc.${profile}.cjs`)

  const manifest = JSON.parse(readFileSync(`${out}/manifest.json`, 'utf8'))
  const byUrl = new Map()
  for (const entry of manifest) {
    const report = JSON.parse(readFileSync(entry.jsonPath, 'utf8'))
    const list = byUrl.get(entry.url) ?? []
    list.push({
      performance: report.categories.performance.score * 100,
      accessibility: report.categories.accessibility.score * 100,
      bestPractices: report.categories['best-practices'].score * 100,
      seo: report.categories.seo.score * 100,
      lcp: report.audits['largest-contentful-paint'].numericValue,
      cls: report.audits['cumulative-layout-shift'].numericValue,
      tbt: report.audits['total-blocking-time'].numericValue,
      lighthouseVersion: report.lighthouseVersion,
      userAgent: report.environment.hostUserAgent,
    })
    byUrl.set(entry.url, list)
  }

  md += `## Perfil ${profile}\n\n| Página | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |\n|---|---:|---:|---:|---:|---:|---:|---:|\n`
  for (const [url, runs] of byUrl) {
    const m = (k) => median(runs.map((r) => r[k]))
    md += `| ${new URL(url).pathname} | ${m('performance').toFixed(0)} | ${m('accessibility').toFixed(0)} | ${m('bestPractices').toFixed(0)} | ${m('seo').toFixed(0)} | ${(m('lcp') / 1000).toFixed(2)} s | ${m('cls').toFixed(3)} | ${m('tbt').toFixed(0)} ms |\n`
  }
  const sample = [...byUrl.values()][0][0]
  md += `\nMedianas de ${[...byUrl.values()][0].length} execuções por página. Lighthouse ${sample.lighthouseVersion}.\n\n`
  if (profile === 'desktop') {
    md += `## Ambiente\n\n- Navegador: ${sample.userAgent}\n- Node ${process.version} · ${os.type()} ${os.release()} · ${os.cpus()[0]?.model} (${os.cpus().length} CPUs)\n- Build: \`vite build\` + \`vite preview\` (porta 4173), cenário padrão dos mocks\n- Data: ${new Date().toISOString()}\n`
  }
}
writeFileSync('lighthouse/RESULTS.md', md)
console.log(md)
