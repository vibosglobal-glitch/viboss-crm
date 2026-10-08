# Full Coolify Installation & Deployment Guide

## Part 1: Installing Coolify on Ubuntu

### Server Prerequisites
- A fresh Ubuntu 22.04 or 24.04 Server.
- Root access (or a user with `sudo` privileges).
- Minimum resources: 2 CPUs, 2GB RAM, 30GB+ Storage.
- Open ports on your firewall (if applicable): `22` (SSH), `80` (HTTP), `443` (HTTPS), and `8000` (Coolify Dashboard).

### Installation Steps
1. SSH into your Ubuntu system:
   ```bash
   ssh root@<your-server-ip>
   ```
2. Run the official automated installation script. This script installs Docker and all necessary Coolify services:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
3. Let the script run to completion. It may take a few minutes to download and start the Docker containers.
4. Once completed, access the Coolify dashboard using your server's IP address on port 8000:
   `http://<your-server-ip>:8000`
5. Open the dashboard in your browser, create your initial root admin account, and complete the onboarding step.

---

## Part 2: Deploying Your Application

### App Prerequisites
- Your Coolify instance running on your VPS.
- Your source code pushed to a GitHub/GitLab repository.
## Step 1: Set up PostgreSQL Database 
1. In your Coolify dashboard, navigate to **Resources** > **Add New** > **Database**.
2. Select **PostgreSQL**.
3. Fill in the required details (username, password, database name) and deploy it.
4. Once deployed, find the **Connection String (Internal or External)** depending on whether your app is on the same Coolify server. Copy this URI.

## Step 2: Set up the Application
1. Go to **Resources** > **Add New** > **Application**.
2. Connect your GitHub/GitLab repository and select the branch you want to deploy.
3. For the **Build Pack**, select **Docker** (Coolify should automatically detect your `Dockerfile`).

## Step 3: Configure Environment Variables
Inside the Application configuration, go to the **Environment Variables** tab. Add the following keys:

```
NODE_ENV=production
DATABASE_URL=<Paste your PostgreSQL connection string here>
JWT_SECRET=<Generate a secure random string>
JWT_REFRESH_SECRET=<Generate another secure random string>
ALLOWED_ORIGINS=https://your-crm-domain.com
```

> **Note:** If NextJS fails to build, make sure `DATABASE_URL` is available during the Build Phase in Coolify (there is usually a checkbox to make env vars available to the builder).

## Step 4: Deploy
1. Click the **Deploy** button.
2. Coolify will pull the code, run standard Next.js building logic, and bundle the backend. 
3. **Database Migration:** Due to the custom `CMD` in our `Dockerfile`, it will automatically run `npx prisma migrate deploy` before spinning up the container instances, ensuring the database schema matches the code.

## Step 5: Verification & Seeding
1. Visit `https://your-crm-domain.com/api/health` to confirm the server booted cleanly.
2. **Post-Deployment Tasks (Optional):** If you need an initial admin account, open the terminal for your running application container in Coolify and type:
   ```bash
   npm run seed:admin
   ```
   This will initialize the necessary admin roles internally.
