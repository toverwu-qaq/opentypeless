#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, readFile } from 'node:fs/promises'
import path from 'node:path'

const [platform, manifestPath, assetDirectory, ...expectedNames] = process.argv.slice(2)
const {
  TAG_NAME: tagName,
  OFFICIAL_SHA: officialSha,
  EXPECTED_CICD_SHA: expectedCicdSha,
} = process.env

function fail(message) {
  console.error(`::error::${message}`)
  process.exit(1)
}

if (!platform || !manifestPath || !assetDirectory || expectedNames.length === 0) {
  fail('Platform, manifest, asset directory, and expected asset names are required.')
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
if (new Set(expectedNames).size !== expectedNames.length) {
  fail('The hard-coded expected provenance asset list contains duplicates.')
}

let manifestMetadata
try {
  manifestMetadata = await lstat(manifestPath)
} catch {
  fail(`Provenance manifest does not exist: ${manifestPath}`)
}
if (
  !manifestMetadata.isFile() ||
  manifestMetadata.isSymbolicLink() ||
  manifestMetadata.size > 65536
) {
  fail('Provenance manifest must be a regular file no larger than 64 KiB.')
}

let manifest
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
} catch (error) {
  fail(`Could not parse provenance manifest: ${error.message}`)
}
if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object') {
  fail('Provenance manifest must be a JSON object.')
}

const expectedTopLevelKeys = [
  'assets',
  'expected_cicd_sha',
  'official_sha',
  'platform',
  'schema',
  'tag_name',
]
const actualTopLevelKeys = Object.keys(manifest).sort()
if (JSON.stringify(actualTopLevelKeys) !== JSON.stringify(expectedTopLevelKeys)) {
  fail('Provenance manifest contains missing or unexpected top-level fields.')
}
if (
  manifest.schema !== 'opentypeless.release-provenance.v1' ||
  manifest.tag_name !== tagName ||
  manifest.official_sha !== officialSha ||
  manifest.expected_cicd_sha !== expectedCicdSha ||
  manifest.platform !== platform
) {
  fail('Provenance identity does not match the pinned release inputs.')
}
if (!Array.isArray(manifest.assets) || manifest.assets.length !== expectedNames.length) {
  fail(`Provenance must contain exactly ${expectedNames.length} ${platform} assets.`)
}

const sortedExpectedNames = [...expectedNames].sort((left, right) =>
  left < right ? -1 : left > right ? 1 : 0,
)
const actualNames = []
for (const asset of manifest.assets) {
  if (!asset || Array.isArray(asset) || typeof asset !== 'object') {
    fail('Every provenance asset must be an object.')
  }
  if (JSON.stringify(Object.keys(asset).sort()) !== JSON.stringify(['name', 'sha256', 'size'])) {
    fail('A provenance asset contains missing or unexpected fields.')
  }
  if (
    typeof asset.name !== 'string' ||
    path.basename(asset.name) !== asset.name ||
    !Number.isSafeInteger(asset.size) ||
    asset.size <= 0 ||
    typeof asset.sha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(asset.sha256)
  ) {
    fail('A provenance asset has an invalid name, size, or SHA-256 digest.')
  }
  actualNames.push(asset.name)
}
if (JSON.stringify(actualNames) !== JSON.stringify(sortedExpectedNames)) {
  fail('Provenance assets do not exactly match the hard-coded platform asset list.')
}

for (const asset of manifest.assets) {
  const assetPath = path.join(assetDirectory, asset.name)
  let metadata
  try {
    metadata = await lstat(assetPath)
  } catch {
    fail(`Downloaded release asset is missing: ${asset.name}`)
  }
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size !== asset.size) {
    fail(`Downloaded release asset has the wrong type or size: ${asset.name}`)
  }

  const digest = createHash('sha256')
  for await (const chunk of createReadStream(assetPath)) {
    digest.update(chunk)
  }
  if (digest.digest('hex') !== asset.sha256) {
    fail(`Downloaded release asset has the wrong SHA-256 digest: ${asset.name}`)
  }
}

console.log(`Verified signed ${platform} provenance for ${manifest.assets.length} release assets.`)
