# Generate build/icon.png and build/icon.ico from build/icon.svg
# Run once: powershell -ExecutionPolicy Bypass -File scripts/generate-icon.ps1

Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $PSCommandPath
$root = Split-Path -Parent $scriptDir
$svgPath = Join-Path $root "build\icon.svg"
$pngPath = Join-Path $root "build\icon.png"
$icoPath = Join-Path $root "build\icon.ico"

# Use System.Drawing to draw the logo at 256x256
$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background: #111d35
$bg = [System.Drawing.Color]::FromArgb(255, 17, 29, 53)
$g.Clear($bg)

# Scale factor: 256/40 = 6.4
$s = $size / 40.0

# Helper: draw rounded rect
function RoundRect($g, $color, $x, $y, $w, $h, $r) {
    $brush = New-Object System.Drawing.SolidBrush($color)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($x*$s, $y*$s, $r*$s*2, $r*$s*2, 180, 90)
    $path.AddArc(($x+$w-$r*2)*$s, $y*$s, $r*$s*2, $r*$s*2, 270, 90)
    $path.AddArc(($x+$w-$r*2)*$s, ($y+$h-$r*2)*$s, $r*$s*2, $r*$s*2, 0, 90)
    $path.AddArc($x*$s, ($y+$h-$r*2)*$s, $r*$s*2, $r*$s*2, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
    $brush.Dispose(); $path.Dispose()
}

$violet = [System.Drawing.Color]::FromArgb(255, 139, 92, 246)
$orange = [System.Drawing.Color]::FromArgb(255, 249, 115, 22)

# Background rounded rect
RoundRect $g $bg 0 0 40 40 10

# Four squares
RoundRect $g $violet  4  4 14 14 3.5
RoundRect $g $orange 22  4 14 14 3.5
RoundRect $g $orange  4 22 14 14 3.5
RoundRect $g $violet 22 22 14 14 3.5

# White X lines
$penW = [float]($s * 2.5 / 6.4)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penW)
$pen.SetLineCap([System.Drawing.Drawing2D.LineCap]::Round, [System.Drawing.Drawing2D.LineCap]::Round, [System.Drawing.Drawing2D.DashCap]::Flat)
$g.DrawLine($pen, [float](14*$s), [float](14*$s), [float](26*$s), [float](26*$s))
$g.DrawLine($pen, [float](26*$s), [float](14*$s), [float](14*$s), [float](26*$s))
$pen.Dispose()

$g.Dispose()

# Save PNG
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved $pngPath"

# Save ICO (multiple sizes: 256, 64, 48, 32, 16)
$sizes = @(256, 64, 48, 32, 16)
$icoStream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($icoStream)

# ICO header
$writer.Write([UInt16]0)   # reserved
$writer.Write([UInt16]1)   # type: ICO
$writer.Write([UInt16]$sizes.Count)

# Collect PNG bytes for each size
$pngBytesList = @()
foreach ($sz in $sizes) {
    $b = New-Object System.Drawing.Bitmap($sz, $sz)
    $gb = [System.Drawing.Graphics]::FromImage($b)
    $gb.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gb.DrawImage($bmp, 0, 0, $sz, $sz)
    $gb.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $b.Dispose()
    $pngBytesList += ,($ms.ToArray())
    $ms.Dispose()
}

# Directory entries (offset starts after header + entries)
$offset = 6 + $sizes.Count * 16
foreach ($i in 0..($sizes.Count-1)) {
    $sz = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }
    $writer.Write([Byte]$sz)     # width
    $writer.Write([Byte]$sz)     # height
    $writer.Write([Byte]0)       # color count
    $writer.Write([Byte]0)       # reserved
    $writer.Write([UInt16]1)     # planes
    $writer.Write([UInt16]32)    # bit count
    $writer.Write([UInt32]$pngBytesList[$i].Length)  # size
    $writer.Write([UInt32]$offset)                   # offset
    $offset += $pngBytesList[$i].Length
}

foreach ($bytes in $pngBytesList) {
    $writer.Write($bytes)
}
$writer.Flush()

[System.IO.File]::WriteAllBytes($icoPath, $icoStream.ToArray())
$icoStream.Dispose()
$bmp.Dispose()

Write-Host "Saved $icoPath"
Write-Host "Done! You can now run: npm run build"
