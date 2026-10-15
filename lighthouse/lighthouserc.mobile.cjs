/** Lighthouse CI — perfil mobile (padrão do Lighthouse: Moto G Power, 4G lento, CPU 4x). */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local',
      url: ['http://localhost:4173/', 'http://localhost:4173/nft/emerald-ape-042'],
      numberOfRuns: 3,
      settings: {
        formFactor: 'mobile',
        chromeFlags: '--headless=new --no-sandbox',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    upload: { target: 'filesystem', outputDir: './lighthouse/reports/mobile' },
  },
}
