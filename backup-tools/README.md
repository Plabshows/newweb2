# Supabase Backup Tools

This tool allows you to create a complete local backup of your Supabase project's data and storage files.

## 🛠 Prerequisites

1. **Node.js** installed on your machine.
2. **Supabase Service Role Key**: This is required to bypass Row Level Security (RLS) and download all data.

## 🚀 Setup Instructions

1. **Get your Supabase Credentials**:
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard).
   - Navigate to **Project Settings** > **API**.
   - Copy the **Project URL**.
   - Copy the **service_role** secret key (⚠️ Never share this key publicly).

2. **Configure Environment Variables**:
   - Copy `.env.example` to a new file named `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and paste your URL and Service Role Key.

3. **Install Dependencies**:
   From this folder (`backup-tools`), run:
   ```bash
   npm install @supabase/supabase-js dotenv sharp
   ```

## 🖼 Image Optimization Tools

### 1. Convert Local Images to WebP
This script converts all your `.png`, `.jpg`, and `.jpeg` files in the `images/` folder to `.webp`.
```bash
node convert-images.js
```

### 2. Update HTML for Optimization
This script performs three critical tasks across all your HTML files:
- Adds `loading="lazy"` to all images (except those at the top/logos).
- Replaces local image references (`.jpg`, `.png`) with `.webp`.
- Automatically updates Supabase image URLs to use the **WebP Transformation API** for faster loading.
```bash
node optimize-html.js
```

## 🏃‍♂️ How to Run the Backup

Run the following command:
```bash
node backup-supabase.js
```

## 📂 Where is the backup saved?

The script will create a folder named `supabase-backup` in the project root:
- `/supabase-backup/data`: Contains JSON and CSV exports of your tables.
- `/supabase-backup/storage`: Contains all files downloaded from your storage buckets, organized by bucket name and folder structure.

## 🛡 Security Note

- The `service_role` key is extremely powerful. Keep it safe.
- The `.env` file and the `supabase-backup` folder are already added to `.gitignore` to prevent them from being uploaded to GitHub.
