import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ALL_LAB_ASSETS, ASSET_MANIFEST } from '../src/prototypes/divergent-fist-lab/assetManifest.ts'
import productionAssetIds from '../src/prototypes/divergent-fist-lab/productionAssetIds.json' with { type: 'json' }

const root = resolve('public/assets/combat/divergent-fist')
const missing = []
const warnings = []
const placeholders = ALL_LAB_ASSETS.filter(({ status }) => status === 'placeholder').map(({ id }) => id)

function expectedSize(asset) {
  const match = asset.productionPath.match(/-(\d+)x(\d+)\.[^.]+$/)
  return match ? [Number(match[1]), Number(match[2])] : null
}

function inspectSvg(buffer) {
  const source = buffer.toString('utf8')
  const viewBox = source.match(/viewBox=["']0 0 ([\d.]+) ([\d.]+)["']/)
  const dimensions = source.match(/<svg[^>]*\bwidth=["']([\d.]+)["'][^>]*\bheight=["']([\d.]+)["']/)
  return {
    format: 'svg',
    width: Number(viewBox?.[1] ?? dimensions?.[1]),
    height: Number(viewBox?.[2] ?? dimensions?.[2]),
    hasAlpha: !/<rect[^>]*(?:width=["']100%["']|width=["'][\d.]+["'])[^>]*(?!fill=["']none["'])[^>]*>/i.test(source),
  }
}

function inspectWebp(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') throw new Error('invalid WebP header')
  let width = 0
  let height = 0
  let hasAlpha = false
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const type = buffer.toString('ascii', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    const data = offset + 8
    if (type === 'VP8X' && data + 10 <= buffer.length) {
      hasAlpha ||= Boolean(buffer[data] & 0x10)
      width = buffer.readUIntLE(data + 4, 3) + 1
      height = buffer.readUIntLE(data + 7, 3) + 1
    } else if (type === 'VP8 ' && data + 10 <= buffer.length) {
      width ||= buffer.readUInt16LE(data + 6) & 0x3fff
      height ||= buffer.readUInt16LE(data + 8) & 0x3fff
    } else if (type === 'VP8L' && data + 5 <= buffer.length && buffer[data] === 0x2f) {
      const bits = buffer.readUInt32LE(data + 1)
      width ||= (bits & 0x3fff) + 1
      height ||= ((bits >>> 14) & 0x3fff) + 1
      hasAlpha ||= Boolean((bits >>> 28) & 1)
    } else if (type === 'ALPH') hasAlpha = true
    offset = data + size + (size % 2)
  }
  if (!width || !height) throw new Error('WebP dimensions not found')
  return { format: 'webp', width, height, hasAlpha }
}

const productionIds = new Set(productionAssetIds)
if (productionIds.size !== productionAssetIds.length) warnings.push('productionAssetIds.json contains duplicate IDs.')
for (const id of productionIds) if (!ALL_LAB_ASSETS.some((asset) => asset.id === id)) warnings.push(`Unknown production asset ID: ${id}`)

for (const asset of ALL_LAB_ASSETS) {
  const path = resolve(root, asset.productionPath)
  if (!existsSync(path)) {
    missing.push(`${asset.id}: ${asset.productionPath}`)
    continue
  }
  try {
    const buffer = await readFile(path)
    const inspected = asset.productionPath.endsWith('.svg') ? inspectSvg(buffer) : inspectWebp(buffer)
    const expected = expectedSize(asset)
    if (expected && (inspected.width !== expected[0] || inspected.height !== expected[1])) warnings.push(`${asset.id}: expected ${expected.join('x')}, received ${inspected.width}x${inspected.height}.`)
    if (asset.transparent && !asset.allowOpaqueBackground && !inspected.hasAlpha) warnings.push(`${asset.id}: required transparency is missing.`)
    if (asset.status !== 'production') warnings.push(`${asset.id}: file exists but productionAssetIds.json still marks it placeholder.`)
    const runtimePath = asset.src.split('?')[0]
    if (asset.status === 'production' && runtimePath !== `/assets/combat/divergent-fist/${asset.productionPath}`) warnings.push(`${asset.id}: runtime path and production path disagree.`)
  } catch (error) {
    warnings.push(`${asset.id}: ${error instanceof Error ? error.message : String(error)}.`)
  }
  if (asset.origin.some((value) => value < 0 || value > 1)) warnings.push(`${asset.id}: origin must remain within 0..1.`)
  if (asset.groundAnchor?.some((value) => value < 0 || value > 1)) warnings.push(`${asset.id}: ground anchor must remain within 0..1.`)
}

const yuji = Object.values(ASSET_MANIFEST.yuji).filter(({ id }) => !id.endsWith('.shadow')).map(({ productionPath }) => productionPath)
const maki = Object.values(ASSET_MANIFEST.maki).filter(({ id }) => !id.endsWith('.shadow')).map(({ productionPath }) => productionPath)
if (new Set(yuji).size !== yuji.length) warnings.push('Yuji production poses are not distinct.')
if (new Set(maki).size !== maki.length) warnings.push('Maki production poses are not distinct.')
if (Object.keys(ASSET_MANIFEST.environment).length !== 9) warnings.push('Environment layer inventory must remain nine files.')
if (Object.keys(ASSET_MANIFEST.effects).length !== 12) warnings.push('Effect inventory must remain twelve files.')

const ready = missing.length === 0 && warnings.length === 0 && placeholders.length === 0
console.log(`Divergent Fist art-drop audit: ${ready ? 'PASS' : 'FAIL'}`)
console.log(`Required production files: ${ALL_LAB_ASSETS.length}`)
console.log(`Missing files: ${missing.length}`)
missing.forEach((item) => console.log(`- ${item}`))
console.log(`Warnings: ${warnings.length}`)
warnings.forEach((item) => console.log(`- ${item}`))
console.log(`Placeholder inventory: ${placeholders.length}`)
placeholders.forEach((id) => console.log(`- ${id}`))
console.log(`Production readiness: ${ready ? 'READY FOR VISUAL QA' : 'NOT READY — production art is still missing or unregistered'}`)
if (!ready) process.exitCode = 1
