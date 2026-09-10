$nodePath = 'C:\Program Files\nodejs\node.exe'
$npmCliPath = 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'

if (-not (Test-Path $nodePath) -or -not (Test-Path $npmCliPath)) {
  throw '找不到 Node.js 或 npm。請先重新安裝 Node.js LTS。'
}

& $nodePath $npmCliPath run dev -- --host 127.0.0.1 --port 4173
