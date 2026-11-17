@echo off
setlocal EnableExtensions
cd /d "%~dp0.." || exit /b 1

rem Local development build: Node 22, VS 2019 x64, project-scoped Rust and pnpm.
set "TOOLS_DIR=%CD%\target\local-tools"
set "RUSTUP_HOME=%TOOLS_DIR%\rustup"
set "RUSTUP_TOOLCHAIN=1.99.1-x86_64-pc-windows-msvc"
set "CARGO_HOME=%TOOLS_DIR%\cargo"
set "CARGO_TARGET_DIR=%CD%\target"
set "CARGO_PROFILE_DEV_DEBUG=0"
set "COREPACK_HOME=%TOOLS_DIR%\corepack"
set "COREPACK_DEFAULT_TO_LATEST=0"
set "COREPACK_ENABLE_DOWNLOAD_PROMPT=0"
set "PNPM_HOME=%TOOLS_DIR%\pnpm-home"
set "npm_config_store_dir=%TOOLS_DIR%\pnpm-store"
set "npm_config_cache_dir=%TOOLS_DIR%\pnpm-cache"
set "npm_config_state_dir=%TOOLS_DIR%\pnpm-state"
set "MPIDER_DATA_DIR=%CD%\data\dev"
set "WEBVIEW2_USER_DATA_FOLDER=%MPIDER_DATA_DIR%\webview2"
set "MPIDER_EXE=%CARGO_TARGET_DIR%\debug\mpider-tauri.exe"

node -e "console.log('Node',process.version); if (process.versions.node.split('.')[0] !== '22') { console.error('Select the local Node 22 installation and retry.'); process.exit(1) }" || exit /b 1
set "VSCMD_START_DIR=%CD%"
call "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64 || exit /b 1

set "RUST_BIN=%RUSTUP_HOME%\toolchains\%RUSTUP_TOOLCHAIN%\bin"
if not exist "%RUST_BIN%\rustc.exe" (
  rustup toolchain install %RUSTUP_TOOLCHAIN% --profile minimal --no-self-update || exit /b 1
)
if not exist "%TOOLS_DIR%\bin" mkdir "%TOOLS_DIR%\bin" || exit /b 1
call corepack enable --install-directory "%TOOLS_DIR%\bin" pnpm || exit /b 1
set "PATH=%RUST_BIN%;%TOOLS_DIR%\bin;%PATH%"
rustc --version || exit /b 1
call pnpm install --frozen-lockfile || exit /b 1

rem Windows locks a running EXE. Let the user exit this checkout's app cleanly.
powershell.exe -NoProfile -Command "$p = Get-Process -Name mpider-tauri -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $env:MPIDER_EXE }; if ($p) { Write-Host 'Select Exit in the development app tray menu. The build will continue automatically.'; $p | Wait-Process -ErrorAction Stop }; exit 0" || exit /b 1
call pnpm exec tauri build --debug --no-bundle -- --locked || exit /b 1
rem Install and verify the pinned, isolated Python before launching the app.
set "PACKAGER_PYTHON=python"
if exist "%CD%\dist-windows\runtime\python.exe" set "PACKAGER_PYTHON=%CD%\dist-windows\runtime\python.exe"
"%PACKAGER_PYTHON%" -B tools\package-windows-release.py --runtime-only "%CARGO_TARGET_DIR%\debug\runtime" --runtime-source "%CD%\dist-windows" || exit /b 1
start "" "%MPIDER_EXE%"
exit /b %errorlevel%
