# StroomSlim — Deploy to Vercel + Railway
# Run: powershell -ExecutionPolicy Bypass -File deploy.ps1

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  StroomSlim — Preparing for Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

function WriteFile($path, $content) {
  $dir = Split-Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [System.IO.File]::WriteAllText((Join-Path (Get-Location).Path $path), $content, [System.Text.Encoding]::UTF8)
  Write-Host "  created: $path" -ForegroundColor Green
}

WriteFile "backend\railway.toml" '[build]
builder = "NIXPACKS"
[deploy]
startCommand = "node server.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
'

WriteFile ".gitignore" 'node_modules/
dist/
.env
*.log
.DS_Store
'

WriteFile "backend\.gitignore" 'node_modules/
.env
*.log
'

WriteFile "frontend\.gitignore" 'node_modules/
dist/
.env
*.log
'

WriteFile "frontend\vite.config.js" 'import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api":  { target: "http://localhost:3001", changeOrigin: true },
      "/auth": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
  build: { outDir: "dist" },
});
'

Write-Host ""
Write-Host "Installing pg (PostgreSQL driver)..." -ForegroundColor Yellow
Push-Location backend
npm install pg --save
Pop-Location

Write-Host ""
Write-Host "Setting up Git..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) { git init; git branch -M main }
git add -A
git commit -m "feat: production ready - Supabase + auth"

$remote = git remote 2>$null
if (-not ($remote -contains "origin")) {
  Write-Host ""
  Write-Host "  No GitHub remote yet. Do this:" -ForegroundColor Yellow
  Write-Host "  1. Go to https://github.com/new" -ForegroundColor White
  Write-Host "  2. Create repo named: stroomslim (private)" -ForegroundColor White
  Write-Host "  3. Run these commands:" -ForegroundColor White
  Write-Host '     git remote add origin https://github.com/YOUR-USERNAME/stroomslim.git' -ForegroundColor Cyan
  Write-Host "     git push -u origin main" -ForegroundColor Cyan
} else {
  git push origin main
  Write-Host "  Pushed to GitHub" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  NEXT STEPS — DO IN THIS ORDER:" -ForegroundColor Green
Write-Host "============================================"
Write-Host ""
Write-Host "  1. SUPABASE (database — free)" -ForegroundColor Cyan
Write-Host "     → https://supabase.com → New Project"
Write-Host "     → Region: West EU (Ireland)"
Write-Host "     → SQL Editor → paste supabase-schema.sql → Run"
Write-Host "     → Settings > Database > copy Connection string (URI)"
Write-Host ""
Write-Host "  2. RAILWAY (backend — ~5 EUR/month)" -ForegroundColor Cyan
Write-Host "     → https://railway.app → New Project"
Write-Host "     → Deploy from GitHub → stroomslim"
Write-Host "     → Root directory: backend"
Write-Host "     → Variables tab, add:" -ForegroundColor White
Write-Host "        NODE_ENV           = production"
Write-Host "        DATABASE_URL       = (Supabase URI)"
Write-Host "        JWT_SECRET         = (random 64 chars)"
Write-Host "        JWT_REFRESH_SECRET = (random 64 chars)"
Write-Host "        FRONTEND_URL       = https://stroomslim.vercel.app"
Write-Host "        ENTSOE_API_KEY     = (your token)"
Write-Host "     → Deploy → copy URL: xxx.up.railway.app"
Write-Host ""
Write-Host "  3. VERCEL (frontend — free)" -ForegroundColor Cyan
Write-Host "     → Edit frontend\vercel.json"
Write-Host "        Replace YOUR-APP.up.railway.app with Railway URL"
Write-Host "     → git add -A && git commit -m 'railway url' && git push"
Write-Host "     → https://vercel.com → New Project"
Write-Host "     → Import stroomslim → Root: frontend → Deploy"
Write-Host ""
Write-Host "  4. FINAL STEP" -ForegroundColor Cyan
Write-Host "     → Back in Railway: update FRONTEND_URL to Vercel URL"
Write-Host "     → Railway auto-redeploys"
Write-Host ""
Write-Host "  Your app will be live at https://stroomslim.vercel.app" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Green
