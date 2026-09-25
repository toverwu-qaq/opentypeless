$ErrorActionPreference = 'Stop'

$tagName = $env:TAG_NAME
$releaseRepo = $env:RELEASE_REPO
$officialSha = $env:OFFICIAL_SHA
$expectedCicdSha = $env:EXPECTED_CICD_SHA
$expectedSignerThumbprint = $env:WINDOWS_EXPECTED_SIGNER_THUMBPRINT
$releaseMode = $env:WINDOWS_RELEASE_MODE
$artifactDir = Join-Path (Get-Location) $env:WINDOWS_ARTIFACT_DIR

if ([string]::IsNullOrWhiteSpace($tagName)) {
  throw 'TAG_NAME is required.'
}
if ([string]::IsNullOrWhiteSpace($releaseRepo)) {
  throw 'RELEASE_REPO is required.'
}
if ($releaseMode -notin 'signpath', 'unsigned') {
  throw 'WINDOWS_RELEASE_MODE must be signpath or unsigned.'
}
if ($releaseMode -eq 'signpath' -and [string]::IsNullOrWhiteSpace($expectedSignerThumbprint)) {
  throw 'WINDOWS_EXPECTED_SIGNER_THUMBPRINT is required for SignPath releases.'
}
if ($officialSha -cnotmatch '^[0-9a-f]{40}$') {
  throw 'OFFICIAL_SHA must be a full lowercase 40-character commit SHA.'
}
if ($expectedCicdSha -cnotmatch '^[0-9a-f]{40}$') {
  throw 'EXPECTED_CICD_SHA must be a full lowercase 40-character commit SHA.'
}
if (-not (Test-Path -LiteralPath $artifactDir)) {
  throw "Windows artifact directory was not found: $artifactDir"
}

$version = $tagName.TrimStart('v')
$windowsFiles = Get-ChildItem -Path $artifactDir -Recurse -File | Where-Object { $_.Extension -in '.exe', '.msi' }
$msi = $windowsFiles | Where-Object { $_.Name -like '*_x64_en-US.msi' } | Select-Object -First 1
$nsis = $windowsFiles | Where-Object { $_.Name -like '*_x64-setup.exe' } | Select-Object -First 1

if (-not $msi) {
  $msi = $windowsFiles | Where-Object { $_.Extension -eq '.msi' } | Select-Object -First 1
}
if (-not $nsis) {
  $nsis = $windowsFiles | Where-Object { $_.Extension -eq '.exe' } | Select-Object -First 1
}
if (-not $msi -or -not $nsis) {
  throw 'Both signed MSI and NSIS installers are required.'
}
$expectedMsiName = "OpenTypeless_${version}_x64_en-US.msi"
$expectedNsisName = "OpenTypeless_${version}_x64-setup.exe"
if ($windowsFiles.Count -ne 2 -or $msi.Name -cne $expectedMsiName -or $nsis.Name -cne $expectedNsisName) {
  throw "Expected exactly $expectedMsiName and $expectedNsisName."
}

$normalizedExpectedThumbprint = $expectedSignerThumbprint -replace '\s', ''
foreach ($file in @($msi, $nsis)) {
  $authenticode = Get-AuthenticodeSignature -LiteralPath $file.FullName
  if ($releaseMode -eq 'signpath') {
    if ($authenticode.Status -ne 'Valid') {
      throw "Invalid Authenticode signature for $($file.Name): $($authenticode.Status)"
    }
    $actualThumbprint = $authenticode.SignerCertificate.Thumbprint -replace '\s', ''
    if ($actualThumbprint -ine $normalizedExpectedThumbprint) {
      throw "Unexpected Authenticode signer for $($file.Name)."
    }
  } elseif ($authenticode.Status -ne 'NotSigned' -or $authenticode.SignerCertificate) {
    throw "Unsigned mode refuses an installer with any Authenticode certificate: $($file.Name) ($($authenticode.Status))."
  }
}

function New-UpdaterSignature {
  param([Parameter(Mandatory = $true)][System.IO.FileInfo]$File)

  & npx tauri signer sign "$($File.FullName)" | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to generate updater signature for $($File.Name)."
  }
  $signaturePath = "$($File.FullName).sig"
  if (-not (Test-Path -LiteralPath $signaturePath -PathType Leaf)) {
    throw "Tauri did not create an updater signature for $($File.Name)."
  }
  $signature = (Get-Content -LiteralPath $signaturePath -Raw).Trim()
  try {
    [void][Convert]::FromBase64String($signature)
  } catch {
    throw "Updater signature for $($File.Name) is not valid base64."
  }

  return [System.IO.FileInfo]$signaturePath
}

$msiSig = New-UpdaterSignature -File $msi
$nsisSig = New-UpdaterSignature -File $nsis

$windowsChecksumPath = Join-Path (Get-Location) 'SHA256SUMS-windows-x86_64.txt'
Remove-Item -LiteralPath $windowsChecksumPath -ErrorAction SilentlyContinue
foreach ($file in @($msi, $nsis)) {
  $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  Add-Content -LiteralPath $windowsChecksumPath -Value "$hash  $($file.Name)" -Encoding ascii
}

$releaseJson = gh api "repos/$releaseRepo/releases/tags/$tagName" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $releaseJson) {
  throw "Release $tagName does not exist in $releaseRepo."
}
if ($releaseJson.tag_name -ne $tagName -or $releaseJson.draft -or -not $releaseJson.prerelease) {
  throw "Release $tagName must exist as a non-draft prerelease before Windows assets are published."
}

$manifestAsset = $releaseJson.assets | Where-Object { $_.name -eq 'latest.json' } | Select-Object -First 1
if (-not $manifestAsset) {
  throw "Release $tagName does not contain latest.json. Publish macOS and Linux first."
}

$latestJsonPath = Join-Path (Get-Location) 'latest.json'
$headers = @{
  Authorization = "Bearer $env:GH_TOKEN"
  Accept = 'application/octet-stream'
  'X-GitHub-Api-Version' = '2022-11-28'
}
Invoke-WebRequest `
  -Uri "https://api.github.com/repos/$releaseRepo/releases/assets/$($manifestAsset.id)" `
  -Headers $headers `
  -OutFile $latestJsonPath
$existingManifest = Get-Content -LiteralPath $latestJsonPath -Raw | ConvertFrom-Json
if ($existingManifest.version -ne $version) {
  throw "latest.json version $($existingManifest.version) does not match $version."
}

$platforms = [ordered]@{}
if ($existingManifest -and $existingManifest.platforms) {
  foreach ($property in $existingManifest.platforms.PSObject.Properties) {
    if (-not $property.Name.StartsWith('windows-x86_64')) {
      $platforms[$property.Name] = $property.Value
    }
  }
}

$baseUrl = "https://github.com/$releaseRepo/releases/download/$tagName"
$msiEntry = [ordered]@{
  signature = (Get-Content -LiteralPath $msiSig.FullName -Raw).Trim()
  url = "$baseUrl/$($msi.Name)"
}
$nsisEntry = [ordered]@{
  signature = (Get-Content -LiteralPath $nsisSig.FullName -Raw).Trim()
  url = "$baseUrl/$($nsis.Name)"
}

$platforms['windows-x86_64'] = $msiEntry
$platforms['windows-x86_64-msi'] = $msiEntry
$platforms['windows-x86_64-nsis'] = $nsisEntry

$manifest = [ordered]@{
  version = $version
  notes = if ($existingManifest -and $existingManifest.notes) { $existingManifest.notes } else { 'See the assets below to download and install.' }
  pub_date = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
  platforms = $platforms
}

$manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $latestJsonPath -Encoding utf8

$provenancePath = Join-Path (Get-Location) 'OpenTypeless-provenance-windows-x86_64.json'
& node .github/scripts/create-release-provenance.mjs `
  windows-x86_64 `
  $provenancePath `
  $msi.FullName `
  $msiSig.FullName `
  $nsis.FullName `
  $nsisSig.FullName `
  $windowsChecksumPath
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to create Windows release provenance.'
}
& npx tauri signer sign $provenancePath | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to sign Windows release provenance.'
}
$provenanceSignaturePath = "${provenancePath}.sig"
if (-not (Test-Path -LiteralPath $provenanceSignaturePath -PathType Leaf)) {
  throw 'Tauri did not create the Windows provenance signature.'
}
try {
  [void][Convert]::FromBase64String((Get-Content -LiteralPath $provenanceSignaturePath -Raw).Trim())
} catch {
  throw 'The Windows provenance signature is not valid base64.'
}

gh release upload $tagName --repo $releaseRepo --clobber `
  $msi.FullName `
  $msiSig.FullName `
  $nsis.FullName `
  $nsisSig.FullName `
  $windowsChecksumPath `
  $latestJsonPath `
  $provenancePath `
  $provenanceSignaturePath

if ($LASTEXITCODE -ne 0) {
  throw "Failed to upload verified Windows assets for $tagName."
}
