param(
  [string]$VideoSourcePath = ''
)

$ErrorActionPreference = 'Stop'
$storageRoot = Join-Path $PSScriptRoot '..\storage\private'
$videoDirectory = Join-Path $storageRoot 'demo\videos'
$resourceDirectory = Join-Path $storageRoot 'demo\resources'
$videoTarget = Join-Path $videoDirectory 'flower.mp4'
$resourceTarget = Join-Path $resourceDirectory 'useFetch.ts'
$resourceSource = Join-Path $PSScriptRoot '..\storage\fixtures\useFetch.ts'

New-Item -ItemType Directory -Force -Path $videoDirectory, $resourceDirectory | Out-Null

if ($VideoSourcePath) {
  $resolvedVideoSource = (Resolve-Path -LiteralPath $VideoSourcePath).Path
  Copy-Item -LiteralPath $resolvedVideoSource -Destination $videoTarget -Force
} elseif (-not (Test-Path -LiteralPath $videoTarget)) {
  $temporaryVideo = "$videoTarget.part"
  try {
    Invoke-WebRequest -Uri 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' -OutFile $temporaryVideo
    Move-Item -LiteralPath $temporaryVideo -Destination $videoTarget -Force
  } finally {
    if (Test-Path -LiteralPath $temporaryVideo) {
      Remove-Item -LiteralPath $temporaryVideo -Force
    }
  }
}

Copy-Item -LiteralPath $resourceSource -Destination $resourceTarget -Force

$videoSize = (Get-Item -LiteralPath $videoTarget).Length
$resourceSize = (Get-Item -LiteralPath $resourceTarget).Length
Write-Host "Private demo content is ready. Video: $videoSize bytes; resource: $resourceSize bytes."
