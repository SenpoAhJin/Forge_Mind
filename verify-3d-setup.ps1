# 3D Garment Setup Verification Script
# Run this to check if all files are in place

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "3D Garment Rendering - Setup Check" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: GLB Files
Write-Host "CHECK 1: GLB Model Files" -ForegroundColor Yellow
$glbPath = "assets\models\garments\procedural"
if (Test-Path $glbPath) {
    $glbFiles = Get-ChildItem "$glbPath\*.glb"
    Write-Host "  Found: $($glbFiles.Count) GLB files" -ForegroundColor $(if ($glbFiles.Count -eq 20) { "Green" } else { "Red" })
    
    if ($glbFiles.Count -eq 20) {
        Write-Host "  ✅ All 20 models present!" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Expected 20 GLB files, found $($glbFiles.Count)" -ForegroundColor Red
        Write-Host "  Missing models! Check assets/models/garments/procedural/" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "  ❌ Procedural folder not found!" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 2: Mapper File
Write-Host "CHECK 2: Item-to-Model Mapper" -ForegroundColor Yellow
$mapperPath = "src\utils\itemToModelMapper.ts"
if (Test-Path $mapperPath) {
    $mapperSize = (Get-Item $mapperPath).Length
    Write-Host "  ✅ Found: $mapperPath ($mapperSize bytes)" -ForegroundColor Green
} else {
    Write-Host "  ❌ Missing: $mapperPath" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 3: SelectedGarment Component
Write-Host "CHECK 3: SelectedGarment Component" -ForegroundColor Yellow
$componentPath = "src\components\SelectedGarment.tsx"
if (Test-Path $componentPath) {
    $componentSize = (Get-Item $componentPath).Length
    Write-Host "  ✅ Found: $componentPath ($componentSize bytes)" -ForegroundColor Green
} else {
    Write-Host "  ❌ Missing: $componentPath" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 4: Integration in ProjectPlanningScreen
Write-Host "CHECK 4: ProjectPlanningScreen Integration" -ForegroundColor Yellow
$screenPath = "src\screens\cosplayer\ProjectPlanningScreen.tsx"
if (Test-Path $screenPath) {
    $screenContent = Get-Content $screenPath -Raw
    $hasImport = $screenContent -match "import SelectedGarment"
    $hasRender = $screenContent -match "<SelectedGarment"
    
    if ($hasImport -and $hasRender) {
        Write-Host "  ✅ SelectedGarment imported and used" -ForegroundColor Green
    } else {
        if (-not $hasImport) {
            Write-Host "  ❌ Missing import statement" -ForegroundColor Red
            $allGood = $false
        }
        if (-not $hasRender) {
            Write-Host "  ❌ Missing render code" -ForegroundColor Red
            $allGood = $false
        }
    }
} else {
    Write-Host "  ❌ Screen file not found" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 5: Dependencies
Write-Host "CHECK 5: Required Dependencies" -ForegroundColor Yellow
$packagePath = "package.json"
if (Test-Path $packagePath) {
    $package = Get-Content $packagePath -Raw | ConvertFrom-Json
    $deps = $package.dependencies
    
    $requiredDeps = @{
        "three" = $deps.three
        "@react-three/fiber" = $deps.'@react-three/fiber'
        "@react-three/drei" = $deps.'@react-three/drei'
    }
    
    $depsOk = $true
    foreach ($dep in $requiredDeps.Keys) {
        if ($requiredDeps[$dep]) {
            Write-Host "  ✅ $dep : $($requiredDeps[$dep])" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $dep : NOT INSTALLED" -ForegroundColor Red
            $depsOk = $false
            $allGood = $false
        }
    }
} else {
    Write-Host "  ❌ package.json not found" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Summary
Write-Host "=====================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Setup is complete. Ready to test!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. npm start --reset-cache" -ForegroundColor White
    Write-Host "  2. Navigate to Outfit Planning" -ForegroundColor White
    Write-Host "  3. Tap an item" -ForegroundColor White
    Write-Host "  4. Watch console logs" -ForegroundColor White
} else {
    Write-Host "❌ SETUP INCOMPLETE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the issues above, then run this script again." -ForegroundColor Yellow
}
Write-Host "=====================================" -ForegroundColor Cyan
