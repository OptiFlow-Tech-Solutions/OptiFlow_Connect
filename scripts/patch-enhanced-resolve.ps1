$targetFile = "node_modules\enhanced-resolve\lib\Resolver.js"
if (-not (Test-Path -LiteralPath $targetFile)) {
  Write-Host "enhanced-resolve not found, skipping patch"
  exit 0
}

$content = Get-Content -Raw -LiteralPath $targetFile
$oldPattern = 'const escapedPath = resultPath.includes("#") ? resultPath.replace(HASH_ESCAPE_RE, "\0#") : resultPath;'
$newPattern = 'const escapedPath = resultPath;'

if ($content -match [regex]::Escape($oldPattern)) {
  $content = $content -replace [regex]::Escape($oldPattern), $newPattern
  Set-Content -NoNewline -LiteralPath $targetFile -Value $content
  Write-Host "Patched enhanced-resolve to fix null-byte path issue on Windows"
} else {
  # Check if already patched
  if ($content -match "const escapedPath = resultPath;") {
    Write-Host "enhanced-resolve already patched, skipping"
  } else {
    Write-Host "Warning: Could not find expected pattern in enhanced-resolve. The version may have changed."
    Write-Host "You may need to manually apply the patch for Windows paths containing '#'."
  }
}

# Also handle the query escaping
$oldQueryPattern = 'escapedQuery = resultQuery.includes("#") ? resultQuery.replace(HASH_ESCAPE_RE, "\0#") : resultQuery;'
$newQueryPattern = 'escapedQuery = resultQuery;'

if ($content -match [regex]::Escape($oldQueryPattern)) {
  $content = $content -replace [regex]::Escape($oldQueryPattern), $newQueryPattern
  Set-Content -NoNewline -LiteralPath $targetFile -Value $content
  Write-Host "Patched enhanced-resolve query escaping"
}
