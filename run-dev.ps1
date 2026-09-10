$nodePath = 'C:\Program Files\nodejs\node.exe'
$viteCliPath = Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'

if (-not (Test-Path $nodePath) -or -not (Test-Path $viteCliPath)) {
  throw 'Node.js or project dependencies are missing. Run npm install first.'
}

& $nodePath $viteCliPath --host 127.0.0.1 --port 4173
