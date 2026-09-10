$nodePath = 'C:\Program Files\nodejs\node.exe'
$tsxCliPath = Join-Path $PSScriptRoot 'node_modules\tsx\dist\cli.mjs'

if (-not (Test-Path $nodePath) -or -not (Test-Path $tsxCliPath)) {
  throw 'Node.js or API dependencies are missing. Run npm install first.'
}

& $nodePath $tsxCliPath watch server/main.ts
