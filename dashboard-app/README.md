# PNNCLE Test Dashboard

A Next.js dashboard application for viewing and analyzing PNNCLE automation test results from GitHub Actions.

## Features

- 📊 Real-time test results from GitHub Actions
- 📈 Statistics dashboard with success rates
- 📋 Historical view of all test runs
- 📥 Download test report artifacts
- 🎨 Modern, responsive UI
- ⚡ Fast and efficient

## Setup

### 1. Install Dependencies

```bash
cd dashboard-app
npm install
```

### 2. Configure GitHub Token

You need a GitHub Personal Access Token with the following permissions:
- `repo` (Full control of private repositories)
- `actions:read` (Read access to Actions)

**To create a token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name it (e.g., "PNNCLE Dashboard")
4. Select scopes: `repo` and `actions:read`
5. Generate and copy the token

### 3. Set Environment Variables

Create a `.env.local` file in the `dashboard-app` directory:

```env
GITHUB_TOKEN=your_github_personal_access_token_here
GITHUB_OWNER=eliaguilar
GITHUB_REPO=PNNCLE-Automation-Testing
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### Option 1: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project"
3. Import your repository: `eliaguilar/PNNCLE-Automation-Testing`
4. Set the root directory to `dashboard-app`
5. Add environment variables:
   - `GITHUB_TOKEN` - Your GitHub Personal Access Token
   - `GITHUB_OWNER` - `eliaguilar` (or your GitHub username)
   - `GITHUB_REPO` - `PNNCLE-Automation-Testing`
6. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to dashboard-app
cd dashboard-app

# Deploy
vercel

# Follow the prompts and add environment variables when asked
```

### Environment Variables in Vercel

After deployment, add environment variables in Vercel Dashboard:
1. Go to your project settings
2. Click "Environment Variables"
3. Add:
   - `GITHUB_TOKEN` (Production, Preview, Development)
   - `GITHUB_OWNER` (optional, defaults to eliaguilar)
   - `GITHUB_REPO` (optional, defaults to PNNCLE-Automation-Testing)

## Project Structure

```
dashboard-app/
├── app/
│   ├── api/
│   │   ├── workflows/      # API route for fetching workflow runs
│   │   ├── artifacts/     # API route for fetching artifacts
│   │   └── download-artifact/  # API route for downloading artifacts
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main dashboard page
│   └── globals.css        # Global styles
├── lib/
│   └── github.ts          # GitHub API client
├── package.json
├── next.config.js
├── tsconfig.json
└── vercel.json
```

## How It Works

1. **Dashboard loads** → Fetches recent workflow runs from GitHub Actions
2. **User clicks "View Artifacts"** → Fetches artifacts for that workflow run
3. **User clicks "Download"** → Downloads the test report artifact (ZIP file)
4. **Statistics** → Calculated from workflow run statuses

## Troubleshooting

### "GITHUB_TOKEN environment variable is not set"
- Make sure you've created `.env.local` with your token
- For Vercel, check that environment variables are set in the dashboard

### "Failed to fetch workflows"
- Verify your GitHub token has the correct permissions
- Check that `GITHUB_OWNER` and `GITHUB_REPO` are correct
- Ensure the repository exists and has workflow runs

### "No workflow runs found"
- Make sure GitHub Actions are enabled in your repository
- Check that workflows have run at least once
- Verify the repository name is correct

## Security Notes

- **Never commit your `.env.local` file** - it's in `.gitignore`
- **Keep your GitHub token secure** - rotate it if compromised
- **Use environment variables in Vercel** - don't hardcode tokens

## License

This project is for PNNCLE Global Ministries testing purposes.

