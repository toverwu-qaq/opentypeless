#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [platform, outputPath, ...assetPaths] = process.argv.slice(2)
const {
  TAG_NAME: tagName,
  OFFICIAL_SHA: officialSha,
  EXPECTED_CICD_SHA: expectedCicdSha,
} = process.env

const supportedPlatforms = new Set([
  'macos-universal',
  'linux-x86_64',
  'linux-aarch64',
  'windows-x86_64',
])

function fail(message) {
  console.error(`::error::${message}`)
  process.exit(1)
}

if (!supportedPlatforms.has(platform)) {
  fail(`Unsupported provenance platform: ${platform ?? '<missing>'}.`)
}
if (!outputPath) {
  fail('A provenance output path is required.')
}
if (!/^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(tagName ?? '')) {
  fail('TAG_NAME must be a stable semantic-version tag.')
}
for (const [name, value] of [
  ['OFFICIAL_SHA', officialSha],
  ['EXPECTED_CICD_SHA', expectedCicdSha],
]) {
  if (!/^[0-9a-f]{40}$/.test(value ?? '')) {
    fail(`${name} must be a full lowercase 40-character commit SHA.`)
  }
}
if (assetPaths.length === 0) {
  fail('At least one release asset is required.')
}

const outputAbsolutePath = path.resolve(outputPath)
const seenNames = new Set()
const assets = []

for (const assetPath of assetPaths) {
  const absolutePath = path.resolve(assetPath)
  if (absolutePath === outputAbsolutePath) {
    fail('The provenance manifest cannot include itself.')
  }

  let metadata
  try {
    metadata = await lstat(absolutePath)
  } catch {
    fail(`Release asset does not exist: ${assetPath}`)
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    fail(`Release asset must be a regular file: ${assetPath}`)
  }

  const name = path.basename(absolutePath)
  if (seenNames.has(name)) {
    fail(`Duplicate release asset name: ${name}`)
  }
  seenNames.add(name)

  const digest = createHash('sha256')
  for await (const chunk of createReadStream(absolutePath)) {
    digest.update(chunk)
  }
  assets.push({
    name,
    size: metadata.size,
    sha256: digest.digest('hex'),
  })
}

assets.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))

const provenance = {
  schema: 'opentypeless.release-provenance.v1',
  tag_name: tagName,
  official_sha: officialSha,
  expected_cicd_sha: expectedCicdSha,
  platform,
  assets,
}

try {
  await writeFile(outputAbsolutePath, `${JSON.stringify(provenance, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  })
} catch (error) {
  fail(`Could not create provenance manifest ${outputPath}: ${error.message}`)
}

console.log(`Created ${outputPath} for ${assets.length} ${platform} release assets.`)
