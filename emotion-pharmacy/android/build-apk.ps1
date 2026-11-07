# 构建《情绪药店》Android APK（无需 Gradle）
# 用法：pwsh -File android/build-apk.ps1
$ErrorActionPreference = 'Stop'

$android = $PSScriptRoot
$game = Split-Path -Parent $android
$main = Join-Path $android 'app\src\main'
$build = Join-Path $android 'build'
$www = Join-Path $main 'assets\www'
$ksDir = Join-Path $android 'keystore'
$ks = Join-Path $ksDir 'emotion-pharmacy.jks'
$ksPass = 'emotionpharmacy'
$keyAlias = 'emotionpharmacy'

function Find-Sdk {
    $candidates = @(
        $env:ANDROID_HOME,
        $env:ANDROID_SDK_ROOT,
        'D:\Android\Sdk',
        (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
    ) | Where-Object { $_ -and (Test-Path $_) }
    foreach ($candidate in $candidates) {
        if (Test-Path (Join-Path $candidate 'platforms')) { return (Resolve-Path $candidate).Path }
    }
    throw '找不到 Android SDK。请设置 ANDROID_HOME，或把 SDK 放在 D:\Android\Sdk。'
}

function Find-Python {
    $command = Get-Command python -ErrorAction SilentlyContinue
    if ($command) { return @{ Exe = $command.Source; Args = @() } }
    $command = Get-Command py -ErrorAction SilentlyContinue
    if ($command) { return @{ Exe = $command.Source; Args = @('-3') } }
    $fallback = Join-Path $env:USERPROFILE '.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
    if (Test-Path $fallback) { return @{ Exe = $fallback; Args = @() } }
    throw '找不到 Python。构建需要 Python 3 + Pillow（只用于生成图标和重打包）。'
}

$sdk = Find-Sdk
$buildTools = Get-ChildItem (Join-Path $sdk 'build-tools') -Directory |
    Where-Object { Test-Path (Join-Path $_.FullName 'aapt2.exe') } |
    Sort-Object { [int]($_.Name -replace '\D', '') } -Descending |
    Select-Object -First 1
if (-not $buildTools) { throw '找不到 Android build-tools。' }

$platform = Get-ChildItem (Join-Path $sdk 'platforms') -Directory |
    Where-Object { Test-Path (Join-Path $_.FullName 'android.jar') } |
    Sort-Object { [int]($_.Name -replace '\D', '') } -Descending |
    Select-Object -First 1
if (-not $platform) { throw '找不到 Android platform（android.jar）。' }

$androidJar = Join-Path $platform.FullName 'android.jar'
$aapt2 = Join-Path $buildTools.FullName 'aapt2.exe'
$d8 = Join-Path $buildTools.FullName 'd8.bat'
$zipalign = Join-Path $buildTools.FullName 'zipalign.exe'
$apksigner = Join-Path $buildTools.FullName 'apksigner.bat'

$javacCommand = Get-Command javac -ErrorAction SilentlyContinue
if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\javac.exe'))) {
    $javaHome = $env:JAVA_HOME.TrimEnd('\')
} elseif ($javacCommand) {
    $javaHome = Split-Path (Split-Path $javacCommand.Source)
} else {
    throw '找不到 JDK。请设置 JAVA_HOME（需要 JDK 17 或 21）。'
}
$javac = Join-Path $javaHome 'bin\javac.exe'
$keytool = Join-Path $javaHome 'bin\keytool.exe'
$env:JAVA_HOME = $javaHome

$python = Find-Python
$pythonArgs = $python.Args

Write-Host '== 清理 =='
if (Test-Path $build) { Remove-Item -LiteralPath $build -Recurse -Force }
New-Item -ItemType Directory -Force -Path $build | Out-Null
if (Test-Path $www) { Remove-Item -LiteralPath $www -Recurse -Force }

Write-Host '== 复制游戏 =='
New-Item -ItemType Directory -Force -Path $www | Out-Null
Copy-Item -LiteralPath (Join-Path $game 'index.html') -Destination (Join-Path $www 'index.html') -Force
foreach ($dir in @('css', 'js', 'data')) {
    Copy-Item -LiteralPath (Join-Path $game $dir) -Destination (Join-Path $www $dir) -Recurse -Force
}
$characters = Join-Path $www 'assets\characters'
New-Item -ItemType Directory -Force -Path $characters | Out-Null
Copy-Item -Path (Join-Path $game 'assets\characters\*.svg') -Destination $characters -Force
$webFiles = (Get-ChildItem -Recurse -File $www).Count
Write-Host "  $webFiles 个网页文件"

Write-Host '== 图标 =='
& $python.Exe @pythonArgs (Join-Path $android 'make-icons.py') (Join-Path $main 'res')
if ($LASTEXITCODE -ne 0) { throw '图标生成失败。' }

Write-Host '== 资源 =='
$resZip = Join-Path $build 'res.zip'
$resApk = Join-Path $build 'app-res.apk'
& $aapt2 compile --dir (Join-Path $main 'res') -o $resZip
if ($LASTEXITCODE -ne 0) { throw 'aapt2 compile 失败。' }
& $aapt2 link -o $resApk -I $androidJar --manifest (Join-Path $main 'AndroidManifest.xml') -R $resZip --auto-add-overlay --min-sdk-version 24 --target-sdk-version 34
if ($LASTEXITCODE -ne 0) { throw 'aapt2 link 失败。' }

Write-Host '== Java =='
$classes = Join-Path $build 'classes'
New-Item -ItemType Directory -Force -Path $classes | Out-Null
$activity = Join-Path $main 'java\com\emotionpharmacy\game\MainActivity.java'
& $javac -encoding UTF-8 --release 17 -classpath $androidJar -d $classes $activity
if ($LASTEXITCODE -ne 0) { throw 'javac 失败。' }

Write-Host '== dex =='
$dexDir = Join-Path $build 'dex'
New-Item -ItemType Directory -Force -Path $dexDir | Out-Null
$classFiles = @(Get-ChildItem -Recurse $classes -Filter *.class | ForEach-Object { $_.FullName })
& $d8 --lib $androidJar --min-api 24 --output $dexDir @classFiles
if ($LASTEXITCODE -ne 0) { throw 'd8 失败。' }

Write-Host '== 重打包 =='
$cleanApk = Join-Path $build 'app-clean.apk'
& $python.Exe @pythonArgs (Join-Path $android 'repack.py') $resApk (Join-Path $main 'assets') (Join-Path $dexDir 'classes.dex') $cleanApk
if ($LASTEXITCODE -ne 0) { throw '重打包失败。' }

Write-Host '== 对齐 =='
$aligned = Join-Path $build 'app-aligned.apk'
& $zipalign -p -f 4 $cleanApk $aligned
if ($LASTEXITCODE -ne 0) { throw 'zipalign 失败。' }

Write-Host '== 签名 =='
New-Item -ItemType Directory -Force -Path $ksDir | Out-Null
if (-not (Test-Path $ks)) {
    & $keytool -genkeypair -v -keystore $ks -storetype JKS -alias $keyAlias -keyalg RSA -keysize 2048 -validity 10000 `
        -storepass $ksPass -keypass $ksPass `
        -dname 'CN=Emotion Pharmacy, OU=Game, O=Emotion Pharmacy, L=Beijing, ST=Beijing, C=CN'
    if ($LASTEXITCODE -ne 0) { throw 'keytool 失败。' }
}
$outApk = Join-Path $build 'EmotionPharmacy-v2.apk'
if (Test-Path $outApk) { Remove-Item -LiteralPath $outApk -Force }
& $apksigner sign --ks $ks --ks-pass "pass:$ksPass" --key-pass "pass:$ksPass" --ks-key-alias $keyAlias --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out $outApk $aligned
if ($LASTEXITCODE -ne 0) { throw 'apksigner 签名失败。' }

Write-Host '== 校验 =='
& $apksigner verify --verbose $outApk
if ($LASTEXITCODE -ne 0) { throw 'APK 签名校验失败。' }
& $zipalign -c 4 $outApk
if ($LASTEXITCODE -ne 0) { throw 'APK 对齐校验失败。' }

$gameApk = Join-Path $game 'EmotionPharmacy-v2.apk'
Copy-Item -LiteralPath $outApk -Destination $gameApk -Force
$workspaceApk = Join-Path (Split-Path $game) 'EmotionPharmacy-v2.apk'
Copy-Item -LiteralPath $outApk -Destination $workspaceApk -Force

Write-Host ''
Write-Host "APK: $gameApk"
Write-Host "APK: $workspaceApk"
Write-Host '完成。'
