@echo off
setlocal enabledelayedexpansion

title DharaScan - Launcher

:: Default host and port configuration
if "%HOST%"=="" set HOST=127.0.0.1
if "%PORT%"=="" set PORT=8001

:: Detect Virtual Environment if present
if exist ".venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment from .venv...
    call .venv\Scripts\activate.bat
) else if exist "venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment from venv...
    call venv\Scripts\activate.bat
)

set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=dev

if /i "%COMMAND%"=="help" goto :help
if /i "%COMMAND%"=="dev" goto :dev
if /i "%COMMAND%"=="start" goto :dev
if /i "%COMMAND%"=="backend" goto :backend
if /i "%COMMAND%"=="frontend" goto :frontend
if /i "%COMMAND%"=="data" goto :data
if /i "%COMMAND%"=="install" goto :install
if /i "%COMMAND%"=="verify" goto :verify
if /i "%COMMAND%"=="test" goto :test
if /i "%COMMAND%"=="build" goto :build

echo [ERROR] Unknown option: %COMMAND%
echo.
goto :help

:install
echo [INFO] Installing Python dependencies...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    exit /b %errorlevel%
)
echo [INFO] Installing Frontend dependencies...
cd frontend
call npm install
cd ..
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install npm dependencies.
    exit /b %errorlevel%
)
echo [SUCCESS] Dependencies installed successfully.
goto :end

:data
echo [INFO] Generating sample watershed dataset...
python scripts/generate_sample_data.py
if %errorlevel% neq 0 (
    echo [ERROR] Data generation failed.
    exit /b %errorlevel%
)
echo [SUCCESS] Sample data generated.
goto :end

:backend
echo [INFO] Starting FastAPI Backend on http://%HOST%:%PORT% ...
python -m uvicorn backend.app.main:app --host %HOST% --port %PORT% --reload
goto :end

:frontend
echo [INFO] Starting React Frontend on http://localhost:3000 ...
cd frontend
call npm run dev
cd ..
goto :end

:dev
echo ========================================================
echo   DharaScan - Development Mode
echo ========================================================
echo.
echo [1/3] Ensuring sample data is available...
if not exist "data\sample" (
    echo [INFO] Sample data directory not found. Generating...
    python scripts/generate_sample_data.py
) else (
    echo [INFO] Sample data already exists.
)

echo.
echo [2/3] Launching FastAPI backend server (http://%HOST%:%PORT%)...
start "DharaScan Backend (FastAPI)" cmd /k "title DharaScan Backend && python -m uvicorn backend.app.main:app --host %HOST% --port %PORT% --reload"

echo.
echo [3/3] Launching React frontend server (Port 3000)...
start "DharaScan Frontend (Vite)" cmd /k "title DharaScan Frontend && cd frontend && npm run dev"

echo.
echo ========================================================
echo   Services started in separate windows!
echo   - Backend:  http://%HOST%:%PORT% / http://%HOST%:%PORT%/docs
echo   - Frontend: http://localhost:3000
echo ========================================================
echo.
goto :end

:verify
echo [INFO] Running pipeline verification...
python scripts/verify_pipeline.py %2 %3 %4 %5
goto :end

:test
echo [INFO] Running test suite...
python -m pytest tests/ -v
goto :end

:build
echo [INFO] Building production frontend bundle...
cd frontend
call npm run build
cd ..
goto :end

:help
echo Watershed Insight Windows Batch Launcher
echo.
echo Configurable Environment Variables:
echo   HOST (default: 127.0.0.1)
echo   PORT (default: 8001)
echo.
echo Commands:
echo   dev (or start)  - Check data, then launch both Backend and Frontend in separate windows (default)
echo   backend        - Launch only the FastAPI backend on %HOST%:%PORT%
echo   frontend       - Launch only the React frontend on port 3000
echo   install        - Install Python requirements and npm dependencies
echo   data           - Regenerate the sample watershed dataset
echo   verify         - Run end-to-end pipeline verification check
echo   test           - Run pytest unit/integration test suite
echo   build          - Build production frontend bundle
echo   help           - Show this help message
echo.

:end
