/** Lighthouse CI — perfil desktop (preset oficial "desktop"). */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local',
      url: ['http://localhost:4173/', 'http://localhost:4173/nft/emerald-ape-042'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--headless=new --no-sandbox',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    upload: { target: 'filesystem', outputDir: './lighthouse/reports/desktop' },
  },
}
