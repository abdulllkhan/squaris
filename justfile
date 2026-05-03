# Squaris recipes. Run `just` to list them, `just <recipe>` to invoke one.

# Default: list every recipe.
default:
    @just --list

# Install dependencies.
install:
    npm install

# Run the dev server (http://localhost:3000).
dev:
    npm run dev

# Run the test suite.
test:
    npm test

# Type-check without emitting.
typecheck:
    npx tsc --noEmit

# Production build into ./dist.
build:
    npm run build

# Preview the production build locally on http://localhost:4173.
preview: build
    npx vite preview

# One-time: install Vercel CLI globally.
vercel-install:
    npm i -g vercel

# One-time: log in to Vercel (browser flow).
vercel-login:
    vercel login

# Deploy a preview build (random *.vercel.app URL).
deploy-preview:
    vercel

# Deploy to production.
deploy:
    vercel --prod

# Re-link this directory to a different Vercel project.
relink:
    rm -rf .vercel
    vercel

# List recent deployments.
deployments:
    vercel ls

# Tail logs of the latest production deploy.
logs:
    vercel logs --follow

# Roll back production to a specific deployment URL.
rollback url:
    vercel rollback {{url}}

# Full pre-deploy check: typecheck + tests + build.
check: typecheck test build

# Run check then deploy to production.
ship: check deploy
