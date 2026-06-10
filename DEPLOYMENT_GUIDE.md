# 🚀 Netlify Deployment Guide - Personal Knowledge Base

Complete guide to deploy your Personal Knowledge Base application to Netlify.

---

## 📋 Prerequisites

Before deploying, ensure you have:
- A GitHub account
- A Netlify account (sign up at [netlify.com](https://netlify.com))
- Completed setup for all required third-party services (see below)

---

## 🔑 Required Environment Variables

Your application requires the following environment variables to function properly:

### 1. **Clerk Authentication** (User Management)
Get these from [Clerk Dashboard](https://dashboard.clerk.com):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

**Setup Steps:**
1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Create a new application or select existing one
3. Go to **API Keys** section
4. Copy the **Publishable Key** and **Secret Key**

---

### 2. **Supabase Database** (Data Storage & Vector Search)
Get these from [Supabase Dashboard](https://database.supabase.com):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Setup Steps:**
1. Go to [database.supabase.com](https://database.supabase.com)
2. Create a new project or select existing one
3. Go to **Settings** > **API**
4. Copy the **Project URL**, **anon public key**, and **service_role key**
5. **IMPORTANT:** Run the database migration SQL scripts to create tables:
   - Create `documents`, `chunks`, `notes`, and `collections` tables
   - Enable pgvector extension for embeddings
   - Set up RLS policies

---

### 3. **Google Gemini API** (Text Embeddings)
Get this from [Google AI Studio](https://aistudio.google.com/app/apikeys):

```env
GEMINI_API_KEY=AIza...
```

**Setup Steps:**
1. Go to [aistudio.google.com/app/apikeys](https://aistudio.google.com/app/apikeys)
2. Click **Create API Key**
3. Copy the generated API key
4. **Model used:** `text-embedding-004` (768 dimensions)

---

### 4. **Groq API** (Chat & Summaries)
Get this from [Groq Console](https://console.groq.com):

```env
GROQ_API_KEY=gsk_...
```

**Setup Steps:**
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Go to **API Keys** section
4. Click **Create API Key**
5. Copy the generated key
6. **Model used:** `llama-3.3-70b-versatile`

---

### 5. **Browser Use API** (Advanced Web Scraping - Optional)
Get this from [Browser Use Cloud](https://cloud.browser-use.com/settings?tab=api-keys):

```env
BROWSER_USE_API_KEY=bu_...
```

**Setup Steps:**
1. Go to [cloud.browser-use.com](https://cloud.browser-use.com/settings?tab=api-keys)
2. Sign up or log in
3. Navigate to **Settings** > **API Keys**
4. Click **Create API Key**
5. Copy the generated key

**Note:** This is optional. If not provided, the app will use Playwright for web scraping. Browser Use provides better handling of complex websites, JavaScript-heavy pages, and CAPTCHA.

---

## 🌐 Netlify Deployment Steps

### Step 1: Push Code to GitHub

```bash
# Navigate to your project directory
cd personal-knowledge-base

# Initialize git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit - Personal Knowledge Base"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

---

### Step 2: Connect Repository to Netlify

1. **Log in to Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click **Add new site** > **Import an existing project**

2. **Connect to GitHub**
   - Click **GitHub**
   - Authorize Netlify to access your repositories
   - Select your repository

3. **Configure Build Settings**
   - **Base directory:** `personal-knowledge-base`
   - **Build command:** `npm run build`
   - **Publish directory:** `personal-knowledge-base/.next`
   - **Functions directory:** Leave empty (Next.js handles this)

4. **Add Environment Variables**
   - Click **Show advanced**
   - Click **New variable** for each environment variable
   - Copy all variables from your `.env.local` file
   - **CRITICAL:** Make sure to add all required variables listed above

---

### Step 3: Configure Netlify Settings

#### Build Settings (netlify.toml)
The project includes a `netlify.toml` file with optimized settings:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "10"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Enable Next.js Runtime
- Go to **Site settings** > **Build & deploy** > **Environment**
- Ensure **Node version** is set to `20.x` or higher
- Install the **Next.js Netlify plugin** (usually auto-detected)

---

### Step 4: Deploy

1. Click **Deploy site**
2. Wait for build to complete (usually 3-5 minutes)
3. Once deployed, you'll get a URL like: `https://your-site-name.netlify.app`

---

## 🔧 Post-Deployment Configuration

### Update Clerk URLs
After deployment, update your Clerk settings:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Settings** > **Domains**
3. Add your Netlify URL: `https://your-site-name.netlify.app`
4. Update allowed redirect URLs to include your Netlify domain

### Test Your Deployment
Visit your Netlify URL and test:
- ✅ User sign up/sign in
- ✅ PDF upload and ingestion
- ✅ URL scraping
- ✅ Search functionality
- ✅ Chat with AI
- ✅ Study mode generation

---

## 🐛 Troubleshooting

### Build Fails
- **Check build logs** in Netlify dashboard
- Ensure all environment variables are set correctly
- Verify Node version is 20.x or higher

### PDF Upload Fails (422 Error)
- Check that `GEMINI_API_KEY` and `GROQ_API_KEY` are set
- Verify Supabase connection and storage bucket exists
- Review server logs for specific error messages

### Authentication Issues
- Verify Clerk keys are correct
- Ensure Netlify domain is added to Clerk allowed domains
- Check that redirect URLs match

### Database Errors
- Verify Supabase connection strings
- Ensure database tables are created (run migration scripts)
- Check that pgvector extension is enabled
- Verify RLS policies are set up correctly

### Embedding Generation Fails
- Check that `GEMINI_API_KEY` is valid and has quota
- Verify the API key has access to `text-embedding-004` model
- Monitor Gemini API usage in Google AI Studio

---

## 🔄 Continuous Deployment

Netlify automatically redeploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Your commit message"
git push origin main

# Netlify will automatically rebuild and deploy
```

---

## 💰 Cost Estimates

### Free Tier Limits:
- **Netlify:** 100GB bandwidth/month, 300 build minutes/month
- **Supabase:** 500MB database, 1GB file storage, 2GB bandwidth
- **Clerk:** 10,000 monthly active users
- **Groq:** 14,400 requests/day (free tier)
- **Gemini:** 1,500 requests/day (free tier)
- **Browser Use:** Check their pricing page

**Note:** All services have generous free tiers suitable for personal projects.

---

## 📚 Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Netlify Next.js Guide](https://docs.netlify.com/frameworks/next-js/)
- [Supabase Docs](https://supabase.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Groq API Docs](https://console.groq.com/docs)

---

## ✅ Deployment Checklist

Before deploying, ensure you have:

- [ ] GitHub repository created and code pushed
- [ ] Clerk application created with API keys
- [ ] Supabase project created with database tables
- [ ] Gemini API key obtained
- [ ] Groq API key obtained
- [ ] Browser Use API key (optional)
- [ ] All environment variables documented
- [ ] netlify.toml file in place
- [ ] Build tested locally (`npm run build`)
- [ ] All dependencies installed

---

## 🎉 You're Ready to Deploy!

Follow the steps above, and your Personal Knowledge Base will be live on Netlify in minutes!

For issues or questions, check the troubleshooting section or review the application logs in the Netlify dashboard.

**Happy Deploying! 🚀**
