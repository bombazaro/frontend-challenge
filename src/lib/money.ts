import Big from 'big.js'

/**
 * Valores em ETH chegam da API como string decimal e são formatados sem passar por `number`,
 * evitando erros de ponto flutuante (ex.: 0.1 + 0.2).
 */
Big.DP = 18
Big.RM = Big.roundHalfUp

export function formatEth(value: string, opts: { minDecimals?: number; suffix?: boolean } = {}) {
  const { minDecimals = 2, suffix = true } = opts
  const fixed = new Big(value).toFixed(6)
  const [int, rawDec = ''] = fixed.split('.')
  let dec = rawDec.replace(/0+$/, '')
  if (dec.length < minDecimals) dec = dec.padEnd(minDecimals, '0')
  const out = dec ? `${int}.${dec}` : int
  return suffix ? `${out} ETH` : out
}

export function isSameAmount(a: string, b: string) {
  return new Big(a).eq(new Big(b))
}

export function compareAmount(a: string, b: string) {
  return new Big(a).cmp(new Big(b))
}
