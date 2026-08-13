import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { auditManifest, formatManifestAudit } from './manifestAudit'

describe('Divergent Fist manifest audit', () => {
  it('reports a synchronized, resolvable runtime asset contract', async () => {
    const root = join(process.cwd(), 'public', 'assets', 'combat', 'divergent-fist')
    const report = await auditManifest({
      pathExists: (path) => existsSync(join(root, path)),
      readText: (path) => readFileSync(join(root, path), 'utf8'),
    })
    console.info(formatManifestAudit(report))
    expect(report).toMatchObject({ ok: true })
  })
})
