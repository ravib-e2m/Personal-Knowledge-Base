# Netlify Environment Variables Configuration Guide

To deploy the **Second Brain (Personal Knowledge Base)** application successfully on Netlify, you must configure the following environment variables in your Netlify Site Settings.

## How to Add Environment Variables in Netlify
1. Go to your Netlify Dashboard.
2. Select your deployed project (or the project you are deploying).
3. Navigate to **Site configuration** > **Environment variables**.
4. Click **Add a variable** > **Add single variable**.
5. Input the keys and values as specified below.
6. Trigger a new deployment so the serverless functions use the updated variables.

---

## Required Environment Variables

| Variable Key | Description | How to Retrieve |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | The API URL of your Supabase project. | **Supabase Dashboard** > **Project Settings** > **API** > **Project URL**. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anonymous API key for public Supabase access. | **Supabase Dashboard** > **Project Settings** > **API** > **anon public** key. |
| `SUPABASE_SERVICE_ROLE_KEY` | The secret service-role key for backend operations. | **Supabase Dashboard** > **Project Settings** > **API** > **service_role** key. *Keep this secure!* |
| `GEMINI_API_KEY` | Google Gemini API key used for generating text embeddings. | Retrieve from [Google AI Studio](https://aistudio.google.com/app/apikeys). |
| `GROQ_API_KEY` | Groq API key used for chat inference and document summarization. | Retrieve from [Groq Console](https://console.groq.com/keys). |

---

## Optional Environment Variables

| Variable Key | Description | How to Retrieve |
| :--- | :--- | :--- |
| `BROWSER_USE_API_KEY` | Optional. Used for advanced scraping and browser automation. | Retrieve from [Browser Use Cloud Settings](https://cloud.browser-use.com/settings). |
| `HUGGINGFACE_API_KEY` | Optional. Used for any supplementary Hugging Face features. | Retrieve from your Hugging Face Account Settings. |
| `OPENAI_API_KEY` | Optional. Can be specified if you plan to use OpenAI fallback services. | Retrieve from [OpenAI Developer Platform](https://platform.openai.com/api-keys). |

---

> [!IMPORTANT]
> Since this application is built using Next.js with serverless functions on Netlify, ensure that you trigger a **Clear cache and deploy site** from the Netlify dashboard after adding these variables so that they are fully injected into the serverless environment.
