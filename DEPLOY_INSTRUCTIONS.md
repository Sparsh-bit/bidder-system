# EC2 Deployment Instructions (Apache + Flask)

You have configured the frontend to connect to your EC2 public IP: `13.60.208.6`.

## 🚀 Quickest Way to Update
Since you changed the IP in `.env.production`, you **MUST** rebuild the frontend. You have two options:

### Option A: Build Locally & Upload (Fastest if you have slow internet on EC2)
1.  **On your PC:**
    ```bash
    cd frontend
    npm run build
    ```
2.  **Upload:** Copy the `dist` folder to your EC2 server.
    *   **SCP:** `scp -r dist/* user@13.60.208.6:/var/www/html/`
    *   **FileZilla:** Drag contents of `dist` to `/var/www/html/`

### Option B: Git Push & Build on Server (Best for long term)
1.  **On your PC:**
    ```bash
    git add .
    git commit -m "Update API IP"
    git push
    ```
2.  **On EC2:**
    ```bash
    cd /path/to/Bidder_System
    git pull
    cd frontend
    npm install
    npm run build
    sudo cp -r dist/* /var/www/html/
    ```

---

## 1. Server Setup (One Time)
**On your EC2 server:**

### A. Configure Apache
1.  Edit `/etc/apache2/sites-available/000-default.conf`:
    ```apache
    <VirtualHost *:80>
        ServerAdmin webmaster@localhost
        DocumentRoot /var/www/html

        <Directory /var/www/html>
            Options Indexes FollowSymLinks
            AllowOverride All
            Require all granted
            
            # SPA Routing
            RewriteEngine On
            RewriteBase /
            RewriteRule ^index\.html$ - [L]
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule . /index.html [L]
        </Directory>

        ErrorLog ${APACHE_LOG_DIR}/error.log
        CustomLog ${APACHE_LOG_DIR}/access.log combined
    </VirtualHost>
    ```
2.  Enable rewrite & restart:
    ```bash
    sudo a2enmod rewrite
    sudo systemctl restart apache2
    ```

### B. Run Backend
1.  Install dependencies:
    ```bash
    cd /path/to/Bidder_System
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r backend/requirements.txt
    pip install gunicorn eventlet
    ```
2.  Run with Gunicorn:
    ```bash
    gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:8000 backend.app:app
    ```
    *(Use systemd to keep it running in background - see previous instructions)*

## 2. Security Group (Firewall)
**Critical:** Open port **8000** in AWS Security Groups for Source `0.0.0.0/0`.
