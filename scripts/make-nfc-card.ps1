#requires -Version 5.1
<#
  Builds printable artwork for a personal NFC card tag (CR80, 3.37 x 2.13 in).

    nfc-card-front.png  - snowflake emblem + name
    nfc-card-back.png   - wordmark + snowman in the corner
    nfc-card-sheet.png  - both sides stacked, for a quick preview or one print

  Rendered at 600 DPI (2022 x 1278 px) with a 600-DPI tag, so "print at 100%"
  gives the exact card size. Palette: #ECE6DC cream, #050505 ink, #E65BC4 pink.

  Run from the repo root:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/make-nfc-card.ps1
#>

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$dpi = 600
$W = [int][math]::Round(3.37 * $dpi)   # 2022
$H = [int][math]::Round(2.13 * $dpi)   # 1278

$outDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\nfc-card'))
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# ---- palette --------------------------------------------------------------
function C([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
$cream = C '#ECE6DC'
$ink = C '#050505'
$pink = C '#E65BC4'
$inkMuted = [System.Drawing.Color]::FromArgb(155, $ink)
$creamMuted = [System.Drawing.Color]::FromArgb(150, $cream)

# ---- fonts (first installed wins) -----------------------------------------
$installed = [System.Drawing.FontFamily]::Families | ForEach-Object { $_.Name }
function PickFont([string[]]$candidates) {
  foreach ($name in $candidates) { if ($installed -contains $name) { return $name } }
  return 'Arial'
}
$serif = PickFont @('Fraunces', 'Georgia', 'Cambria', 'Times New Roman')
$sans = PickFont @('DM Sans', 'Segoe UI', 'Trebuchet MS', 'Calibri', 'Arial')

function F([string]$family, [double]$size, [string]$style = 'Regular') {
  $fs = [System.Drawing.FontStyle]::$style
  [System.Drawing.Font]::new($family, [single]$size, $fs, [System.Drawing.GraphicsUnit]::Pixel)
}

# ---- drawing helpers ------------------------------------------------------
function New-RoundPath([double]$x, [double]$y, [double]$w, [double]$h, [double]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc([single]$x, [single]$y, [single]$d, [single]$d, 180, 90)
  $p.AddArc([single]($x + $w - $d), [single]$y, [single]$d, [single]$d, 270, 90)
  $p.AddArc([single]($x + $w - $d), [single]($y + $h - $d), [single]$d, [single]$d, 0, 90)
  $p.AddArc([single]$x, [single]($y + $h - $d), [single]$d, [single]$d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Draw-Border($g, [double]$inset, [double]$radius, $color, [double]$width) {
  $pen = New-Object System.Drawing.Pen($color, [single]$width)
  $pen.Alignment = [System.Drawing.Drawing2D.PenAlignment]::Inset
  $path = New-RoundPath $inset $inset ($W - 2 * $inset) ($H - 2 * $inset) $radius
  $g.DrawPath($pen, $path)
  $path.Dispose(); $pen.Dispose()
}

# Centered text with extra space between characters.
function Draw-SpacedText($g, [string]$text, [double]$cx, [double]$top, $font, $brush, [double]$spacing) {
  $sf = [System.Drawing.StringFormat]::GenericTypographic
  $chars = $text.ToCharArray()
  $widths = @()
  foreach ($ch in $chars) {
    $wd = $g.MeasureString([string]$ch, $font, [System.Drawing.PointF]::new(0, 0), $sf).Width
    if ($wd -le 0.01) { $wd = $font.Size * 0.30 }   # a lone space measures ~0
    $widths += $wd
  }
  $total = $spacing * ($chars.Count - 1)
  foreach ($wd in $widths) { $total += $wd }
  $x = $cx - $total / 2
  for ($i = 0; $i -lt $chars.Count; $i++) {
    $g.DrawString([string]$chars[$i], $font, $brush, [single]$x, [single]$top, $sf)
    $x += $widths[$i] + $spacing
  }
}

function Draw-Snowflake($g, [double]$cx, [double]$cy, [double]$radius, $color, [double]$lw, $coreColor) {
  $pen = New-Object System.Drawing.Pen($color, [single]$lw)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  for ($i = 0; $i -lt 3; $i++) {
    $state = $g.Save()
    $g.TranslateTransform([single]$cx, [single]$cy)
    $g.RotateTransform([single]($i * 60))
    $g.DrawLine($pen, 0, [single](-$radius), 0, [single]$radius)
    foreach ($s in @(-1.0, 1.0)) {
      $tip = $s * $radius
      $g.DrawLine($pen, 0, [single]$tip, [single](-0.30 * $radius), [single]($tip - $s * 0.32 * $radius))
      $g.DrawLine($pen, 0, [single]$tip, [single](0.30 * $radius), [single]($tip - $s * 0.32 * $radius))
      $mid = $s * 0.55 * $radius
      $g.DrawLine($pen, 0, [single]$mid, [single](-0.22 * $radius), [single]($mid - $s * 0.24 * $radius))
      $g.DrawLine($pen, 0, [single]$mid, [single](0.22 * $radius), [single]($mid - $s * 0.24 * $radius))
    }
    $g.Restore($state)
  }
  $pts = @()
  for ($k = 0; $k -lt 6; $k++) {
    $a = [math]::PI / 180 * (60 * $k - 90)
    $pts += [System.Drawing.PointF]::new(
      [single]($cx + $radius * 0.16 * [math]::Cos($a)),
      [single]($cy + $radius * 0.16 * [math]::Sin($a)))
  }
  $brush = New-Object System.Drawing.SolidBrush($coreColor)
  $g.FillPolygon($brush, [System.Drawing.PointF[]]$pts)
  $brush.Dispose(); $pen.Dispose()
}

function Draw-Snowman($g, [double]$cx, [double]$baseY, [double]$height, $color, $accent, [double]$lw) {
  $r1 = 0.30 * $height; $r2 = 0.20 * $height; $r3 = 0.135 * $height
  $cy1 = $baseY - $r1
  $cy2 = $cy1 - ($r1 + $r2) * 0.82
  $cy3 = $cy2 - ($r2 + $r3) * 0.82

  $pen = New-Object System.Drawing.Pen($color, [single]$lw)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  # Ground shadow.
  $shadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(55, $color))
  $g.FillEllipse($shadow, [single]($cx - $r1 * 1.05), [single]($baseY - $r1 * 0.16), [single]($r1 * 2.1), [single]($r1 * 0.32))
  $shadow.Dispose()

  # Three body balls.
  foreach ($b in @(@($cy1, $r1), @($cy2, $r2), @($cy3, $r3))) {
    $g.DrawEllipse($pen, [single]($cx - $b[1]), [single]($b[0] - $b[1]), [single](2 * $b[1]), [single](2 * $b[1]))
  }

  # Twig arms with a little finger each.
  $g.DrawLine($pen, [single]($cx - $r2 * 0.85), [single]$cy2, [single]($cx - $r2 * 1.95), [single]($cy2 - $r2 * 0.75))
  $g.DrawLine($pen, [single]($cx + $r2 * 0.85), [single]$cy2, [single]($cx + $r2 * 1.95), [single]($cy2 - $r2 * 0.75))
  $g.DrawLine($pen, [single]($cx - $r2 * 1.95), [single]($cy2 - $r2 * 0.75), [single]($cx - $r2 * 2.35), [single]($cy2 - $r2 * 0.55))
  $g.DrawLine($pen, [single]($cx + $r2 * 1.95), [single]($cy2 - $r2 * 0.75), [single]($cx + $r2 * 2.35), [single]($cy2 - $r2 * 0.55))

  # Eyes.
  $eye = New-Object System.Drawing.SolidBrush($color)
  $er = $r3 * 0.14
  $g.FillEllipse($eye, [single]($cx - $r3 * 0.42 - $er), [single]($cy3 - $r3 * 0.18 - $er), [single](2 * $er), [single](2 * $er))
  $g.FillEllipse($eye, [single]($cx + $r3 * 0.42 - $er), [single]($cy3 - $r3 * 0.18 - $er), [single](2 * $er), [single](2 * $er))
  $eye.Dispose()

  # Carrot nose.
  $nose = New-Object System.Drawing.SolidBrush($accent)
  $np = @(
    [System.Drawing.PointF]::new([single]$cx, [single]($cy3 - $r3 * 0.02)),
    [System.Drawing.PointF]::new([single]($cx + $r3 * 1.05), [single]($cy3 + $r3 * 0.16)),
    [System.Drawing.PointF]::new([single]$cx, [single]($cy3 + $r3 * 0.34))
  )
  $g.FillPolygon($nose, [System.Drawing.PointF[]]$np)
  $nose.Dispose()

  # Buttons.
  $btn = New-Object System.Drawing.SolidBrush($accent)
  $br = $r2 * 0.10
  foreach ($by in @(($cy2 - $r2 * 0.45), $cy2, ($cy2 + $r2 * 0.45))) {
    $g.FillEllipse($btn, [single]($cx - $br), [single]($by - $br), [single](2 * $br), [single](2 * $br))
  }
  $btn.Dispose()

  # Scarf.
  $scarf = New-Object System.Drawing.Pen($accent, [single]($lw * 2.4))
  $scarf.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $scarf.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $neckY = $cy2 - $r2 * 0.86
  $g.DrawLine($scarf, [single]($cx - $r3 * 1.05), [single]$neckY, [single]($cx + $r3 * 1.05), [single]$neckY)
  $g.DrawLine($scarf, [single]($cx + $r3 * 0.55), [single]$neckY, [single]($cx + $r3 * 0.85), [single]($neckY + $r3 * 0.95))
  $scarf.Dispose()

  $pen.Dispose()
}

function New-Surface($bg) {
  $bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bmp.SetResolution([single]$dpi, [single]$dpi)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear($bg)
  return @($bmp, $g)
}

# ============ FRONT: snowflake emblem + name ===============================
$front = New-Surface $cream
$fb = $front[0]; $fg = $front[1]

Draw-Border $fg 52 70 $ink 6
Draw-Snowflake $fg ($W / 2) 490 240 $ink 17 $pink

$nameFont = F $serif 190
$nameBrush = New-Object System.Drawing.SolidBrush($ink)
Draw-SpacedText $fg 'shiro' ($W / 2) 775 $nameFont $nameBrush 26
$nameBrush.Dispose(); $nameFont.Dispose()

$ruleBrush = New-Object System.Drawing.SolidBrush($pink)
$fg.FillRectangle($ruleBrush, [single](($W - 220) / 2), 1025, 220, 9)
$ruleBrush.Dispose()

$frontPath = Join-Path $outDir 'nfc-card-front.png'
$fb.Save($frontPath, [System.Drawing.Imaging.ImageFormat]::Png)
$fg.Dispose(); $fb.Dispose()

# ============ BACK: wordmark + snowman in the corner =======================
$back = New-Surface $ink
$bb = $back[0]; $bg2 = $back[1]

Draw-Border $bg2 52 70 $cream 6
Draw-Snowflake $bg2 185 185 76 $pink 9 $cream
Draw-Snowflake $bg2 185 ($H - 185) 66 $cream 8 $pink

$wordFont = F $serif 92
$wordBrush = New-Object System.Drawing.SolidBrush($cream)
Draw-SpacedText $bg2 'WINTER CONFESSIONS' ($W / 2) 245 $wordFont $wordBrush 20
$wordBrush.Dispose(); $wordFont.Dispose()

$ruleBrush = New-Object System.Drawing.SolidBrush($pink)
$bg2.FillRectangle($ruleBrush, [single](($W - 280) / 2), 425, 280, 8)
$ruleBrush.Dispose()

$tagFont = F $sans 44
$tagBrush = New-Object System.Drawing.SolidBrush($creamMuted)
Draw-SpacedText $bg2 'send me anonymous confessions' ($W / 2) 487 $tagFont $tagBrush 6
$tagBrush.Dispose(); $tagFont.Dispose()

Draw-Snowman $bg2 1700 1185 410 $cream $pink 7

$backPath = Join-Path $outDir 'nfc-card-back.png'
$bb.Save($backPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bg2.Dispose(); $bb.Dispose()

# ============ SHEET: both sides stacked ====================================
$pad = 70; $gap = 70
$sw = $W + $pad * 2
$sh = $H * 2 + $gap + $pad * 2
$sheet = New-Object System.Drawing.Bitmap($sw, $sh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$sheet.SetResolution([single]$dpi, [single]$dpi)
$sg = [System.Drawing.Graphics]::FromImage($sheet)
$sg.Clear([System.Drawing.Color]::FromArgb(255, 245, 243, 238))
$frontImg = [System.Drawing.Image]::FromFile($frontPath)
$backImg = [System.Drawing.Image]::FromFile($backPath)
$sg.DrawImage($frontImg, $pad, $pad, $W, $H)
$sg.DrawImage($backImg, $pad, $pad + $H + $gap, $W, $H)
$sheetPath = Join-Path $outDir 'nfc-card-sheet.png'
$sheet.Save($sheetPath, [System.Drawing.Imaging.ImageFormat]::Png)
$frontImg.Dispose(); $backImg.Dispose(); $sg.Dispose(); $sheet.Dispose()

"fonts : serif=$serif sans=$sans"
"size  : $W x $H px @ $dpi DPI  ($([math]::Round($W / $dpi, 2)) x $([math]::Round($H / $dpi, 2)) in)"
"front : $frontPath"
"back  : $backPath"
"sheet : $sheetPath"
