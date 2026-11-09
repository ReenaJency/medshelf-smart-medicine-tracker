@echo off
setlocal
title MedShelf - Smart Medicine Expiry Tracker

echo ============================================================
echo   MEDSHELF: SMART MEDICINE EXPIRY TRACKER
echo   Mini Project - CS25S01 Skill Development Course I
echo   J. J. College of Engineering and Technology, Tiruchirappalli
echo ============================================================
echo.
echo Opening MedShelf in your default web browser...
echo.

REM Open index.html directly in the default web browser (Edge, Chrome, Firefox)
start "" "%~dp0index.html"

echo MedShelf application has been launched in your browser!
echo.
echo Direct Browser Link:
echo file:///%~dp0index.html
echo.
echo You can keep this window open or close it at any time.
pause
