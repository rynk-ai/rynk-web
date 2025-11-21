# Cloudflare Pages Deployment Guide

## Prerequisites

Before deploying, you need to set up your Cloudflare resources:

### 1. Create D1 Database

```bash
# Create the database
npx wrangler d1 create simplechat-db

# Note the database_id from the output and update wrangler.toml
```

### 2. Apply Database Schema

```bash
# Apply schema to the database
npx wrangler d1 execute simplechat-db --file=./schema.sql
```

### 3. Create R2 Bucket

```bash
# Create R2 bucket for file storage
npx wrangler r2 bucket create simplechat-files
```

### 4. Update wrangler.toml

Update the `database_id` in `wrangler.toml` with the value from step 1:

```toml
[[d1_databases]]
binding = "DB"
database_name = "simplechat-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace with actual ID
```

## Deployment Steps

### Option 1: Deploy via CLI

```bash
# Build and deploy
npm run pages:deploy
```

### Option 2: Set up via Cloudflare Dashboard

1. Go to Cloudflare Dashboard → Pages
2. Create a new project
3. Connect your Git repository
4. Configure build settings:
   - **Build command**: `npm run pages:build`
   - **Build output directory**: `.vercel/output/static`
   - **Root directory**: `/`

5. Add environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your Cloudflare Pages URL)
   - `OPENROUTER_API_KEY`

6. Add bindings in Pages settings:
   - D1 Database: `DB` → `simplechat-db`
   - R2 Bucket: `BUCKET` → `simplechat-files`

## Post-Deployment

### Configure Google OAuth

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Add your Cloudflare Pages URL to authorized redirect URIs:
   - `https://your-project.pages.dev/api/auth/callback/google`

### Test the Deployment

1. Visit your Cloudflare Pages URL
2. Sign in with Google
3. Test creating conversations and uploading files

## Troubleshooting

### Sessions not persisting

- Ensure D1 database is properly bound
- Check that `database_id` in `wrangler.toml` is correct
- Verify Auth.js schema was applied to D1

### File uploads failing

- Ensure R2 bucket is properly bound
- Check bucket permissions in Cloudflare Dashboard

### Authentication errors

- Verify all environment variables are set
- Check Google OAuth redirect URIs match your deployment URL
- Ensure `NEXTAUTH_URL` matches your actual deployment URL
