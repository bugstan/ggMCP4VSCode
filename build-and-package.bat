@echo off
echo ========================================================
echo Building and packaging ggMCP4VSCode extension v1.0.5
echo ========================================================

echo.
echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Compiling TypeScript...
call npm run compile

echo.
echo Step 3: Updating README version...
call npm run version

echo.
echo Step 4: Packaging extension...
call npm run package

echo.
echo ========================================================
echo Build process complete! 
echo Check the root directory for the .vsix file.
echo ========================================================
