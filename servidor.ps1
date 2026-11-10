# Servidor local minimo para Madrevieja (no necesita instalar nada).
# Las camaras del navegador solo funcionan en https o en localhost,
# por eso la pagina no se puede abrir con doble clic sobre index.html.

param([int]$Puerto = 8765)

$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$tipos = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json'
  '.bin'  = 'application/octet-stream'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.md'   = 'text/plain; charset=utf-8'
}

$oyente = New-Object System.Net.HttpListener
$oyente.Prefixes.Add("http://localhost:$Puerto/")
try {
  $oyente.Start()
} catch {
  Write-Host "No se pudo abrir el puerto $Puerto. Ya hay otra ventana de Madrevieja abierta?" -ForegroundColor Yellow
  exit 1
}
Write-Host "Madrevieja en http://localhost:$Puerto  (cierra esta ventana para apagar)" -ForegroundColor Green

while ($oyente.IsListening) {
  $c = $oyente.GetContext()
  $res = $c.Response
  try {
    $ruta = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath).TrimStart('/')
    if ($ruta -eq '') { $ruta = 'index.html' }
    $archivo = [IO.Path]::GetFullPath((Join-Path $raiz $ruta))
    if (-not $archivo.StartsWith($raiz) -or -not (Test-Path $archivo -PathType Leaf)) {
      $res.StatusCode = 404
    } else {
      $ext = [IO.Path]::GetExtension($archivo).ToLower()
      $res.ContentType = if ($tipos.ContainsKey($ext)) { $tipos[$ext] } else { 'application/octet-stream' }
      $res.Headers.Add('Cache-Control', 'no-cache')
      $bytes = [IO.File]::ReadAllBytes($archivo)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch {
    $res.StatusCode = 500
  } finally {
    $res.Close()
  }
}
