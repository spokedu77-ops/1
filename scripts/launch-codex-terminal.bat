@echo off
title Codex CLI — coach-app
cd /d "C:\Users\user\Desktop\coach-app"
rem Agent/Cursor shells set TERM=dumb — breaks Codex TUI unless cleared.
set TERM=
set NO_COLOR=
set FORCE_COLOR=
chcp 65001 >nul
"C:\Users\user\.cursor\extensions\openai.chatgpt-26.51021.22027\bin\windows-x86_64\codex.exe" --no-daemon
if errorlevel 1 pause
