# TuitionHub – DevOps Setup Guide (EC5207)

This guide explains how to run TuitionHub with **Docker Compose** and deploy it automatically with **Jenkins**.
It is written for beginners: every command is ready to copy and paste.

> **Which terminal?** Every command block is labelled.
> **🪟 PowerShell** = Windows PowerShell on your laptop. **🐧 Ubuntu** = the Ubuntu (WSL) terminal or the lab Linux machine.

---

## Contents

1. [Architecture – how everything fits together](#1-architecture)
2. [The DevOps files in this repository](#2-the-devops-files-in-this-repository)
3. [A. Windows laptop + WSL2 setup](#a-windows-laptop--wsl2-setup)
4. [B. Native Ubuntu (university lab) setup](#b-native-ubuntu-university-lab-setup)
5. [Everyday Docker commands](#everyday-docker-commands)
6. [C. Jenkins CI/CD setup](#c-jenkins-cicd-setup)
7. [Troubleshooting](#troubleshooting)
8. [D. Future phases: Terraform, AWS, Ansible, Kubernetes, Monitoring](#d-future-phases)

---

## 1. Architecture

### The CI/CD flow

```
 Developer ──git push──▶ GitHub ──(poll / Build Now)──▶ Jenkins (on the Linux machine)
                                                           │
                         ┌─────────────────────────────────┘
                         ▼
   Checkout → Validate → Build Docker images → Test (temporary stack + smoke test)
                         │
                         ▼   only if every step above passed
                  Deploy with Docker Compose → Verify health → Running Tuition System
```

### What runs on the Linux machine

```
   Browser  http://localhost:3000
      │
      ▼
 ┌───────────────────────── Docker network "tuition-system_default" ─────────────────────────┐
 │                                                                                           │
 │  frontend (Nginx :80)  ──/api/...──▶  backend (Node/Express :5000)  ──SQL──▶  mysql (:3306)│
 │  serves React files                   JWT auth, business logic             MySQL 8.4     │
 │                                       │                                     │             │
 └───────────────────────────────────────┼─────────────────────────────────────┼─────────────┘
                                         ▼                                     ▼
                              volume "uploads"                      volume "mysql-data"
                              (learning materials)                  (database files)
```

Key ideas:

- **Only the frontend is published to the host** (port 3000). The backend and MySQL are reachable *only inside* the Docker network. This is safer.
- **Nginx is a reverse proxy.** The browser sends everything to one address. Nginx serves the React files itself and forwards anything starting with `/api/` to the backend. Because there is only one origin, CORS problems disappear.
- **Containers find each other by service name.** Docker has a built-in DNS: inside the network, the name `mysql` resolves to the MySQL container and `backend` to the backend container. That is why `DB_HOST=mysql`, *not* `localhost` (inside a container, `localhost` means "this same container").
- **Volumes keep data.** Containers are disposable – they are deleted and re-created on every deployment. Named volumes live outside the containers, so the database and uploaded files survive.

---

## 2. The DevOps files in this repository

| File | What it is for |
|---|---|
| [`compose.yaml`](compose.yaml) | Describes the 3 containers, their network, environment variables, health checks and volumes. One command starts everything. |
| [`.env.example`](.env.example) | Template for your secrets/settings. You copy it to `.env` (which Git ignores). |
| [`server/Dockerfile`](server/Dockerfile) | Recipe for the **backend image**: Node 22 Alpine, installs production dependencies with `npm ci`, copies `src/` and `database/schema.sql`, runs as the non-root `node` user, has a health check. |
| [`client/Dockerfile`](client/Dockerfile) | **Multi-stage** recipe for the **frontend image**: stage 1 uses Node to run `vite build`; stage 2 copies only the built files into a small Nginx image. |
| [`client/nginx.conf`](client/nginx.conf) | Nginx settings: serve the React app, send unknown paths to `index.html` (React Router), proxy `/api/` to `backend:5000`, allow 50 MB uploads. |
| [`.dockerignore`](.dockerignore), [`client/.dockerignore`](client/.dockerignore) | Files that must *not* be sent into a Docker build (e.g. `node_modules`, `.env`). |
| [`Jenkinsfile`](Jenkinsfile) | The CI/CD pipeline (Declarative Pipeline, Groovy). |
| [`scripts/smoke-test.sh`](scripts/smoke-test.sh) | Automated checks against the running site (health, proxy, auth, registration, login, roles, class creation, enrolment). |
| [`.gitattributes`](.gitattributes) | Forces Linux line endings on scripts/configs so they work even if committed from Windows. |

### How the backend waits for the database

MySQL takes 10–30 seconds to start the first time. Two things make sure the backend doesn't fail:

1. In `compose.yaml`, the backend has `depends_on: mysql: condition: service_healthy`. Docker waits until the MySQL **healthcheck** (`mysqladmin ping`) succeeds.
2. The backend code itself retries the connection up to 15 times (`initDatabaseWithRetry` in `server/src/config/db.js`).

On start-up the backend runs `database/schema.sql` (all `CREATE TABLE IF NOT EXISTS`), so the tables are created automatically and existing data is never overwritten.

### Application changes made for DevOps

Only small changes were needed. The application itself already worked.

- `server/src/config/db.js`: the schema file path can be set with `SCHEMA_PATH` (the Docker image uses `/app/database/schema.sql`), plus the retry logic described above.
- `server/src/routes/index.js`: `GET /api/health` now also runs `SELECT 1`. It returns `{"status":"ok","database":"up"}`, or HTTP 503 if MySQL is down. Docker healthchecks and Jenkins use it.

---

## A. Windows laptop + WSL2 setup

### A0. One-time: make sure WSL2 can run (needed for Docker Desktop)

Docker Desktop needs the Windows **Virtual Machine Platform** feature and CPU virtualization.
If Docker Desktop shows *"WSL2 is not supported with your current machine configuration"* or *"Virtual Machine Platform"* errors, do this:

🪟 **PowerShell – run as Administrator** (right-click Start → *Terminal (Admin)*):

```powershell
wsl --install --no-distribution
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

Then **restart Windows**.

If it still fails: open **Task Manager → Performance → CPU** and check that **Virtualization: Enabled** is shown. If it says *Disabled*, enable *Intel VT-x / AMD SVM* in your laptop's BIOS/UEFI settings.

Then check WSL:

🪟 PowerShell:

```powershell
wsl --status
wsl -l -v          # Ubuntu should show VERSION 2
```

### A1. Connect Docker Desktop to Ubuntu

1. Start **Docker Desktop** and wait until it says *Engine running*.
2. **Settings → Resources → WSL integration** → turn on **Ubuntu** → *Apply & restart*.

### A2. Open Ubuntu and check Docker

Open the **Ubuntu** app from the Start menu (or run `wsl` in PowerShell).

🐧 Ubuntu:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

`hello-world` printing *"Hello from Docker!"* means Docker works.

### A3. Clone the repository (inside Linux, not under /mnt/c)

Clone into your Linux home folder. It is much faster than `/mnt/c/...`, and it avoids Windows line-ending problems.

🐧 Ubuntu:

```bash
cd ~
git clone https://github.com/ManuthiKasuntha/tuition-system.git
cd tuition-system
```

### A4. Configure `.env`

🐧 Ubuntu:

```bash
cp .env.example .env
# Replace the placeholder secrets with random values:
sed -i "s/^MYSQL_ROOT_PASSWORD=.*/MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)/" .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 16)/" .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env
cat .env
```

> ⚠️ Set the passwords **before the first start**. MySQL only reads `MYSQL_ROOT_PASSWORD`/`DB_PASSWORD` when it creates the empty volume. Changing them later does **not** change the existing database users.

### A5. Build and start

🐧 Ubuntu:

```bash
docker compose up -d --build
docker compose ps
```

The first build downloads images and takes a few minutes. Wait until all three services show `(healthy)` in `docker compose ps`.

### A6. Open the website

Open **http://localhost:3000** in your Windows browser. WSL2 forwards the port to Windows automatically.

Optional demo accounts:

🐧 Ubuntu:

```bash
docker compose exec backend npm run db:seed
```

This creates `demo_teacher` / `Password123` and `demo_student` / `Password123`.

Run the automated checks:

🐧 Ubuntu:

```bash
bash scripts/smoke-test.sh http://localhost:3000          # read-only checks
bash scripts/smoke-test.sh http://localhost:3000 --full   # also creates smoke_* test users
```

---

## B. Native Ubuntu (university lab) setup

The lab computer is a **separate machine**. It has its own Docker, its own database volume, and its own `.env`. Nothing is shared with your laptop. Data you create on the laptop will not appear in the lab.

### B1. Prerequisites

- Ubuntu 22.04 or 24.04, 64-bit, with internet access
- A user with `sudo` rights
- `git` and `curl`

🐧 Ubuntu:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates openssl
```

### B2. Install Docker Engine + Compose plugin (skip if `docker compose version` already works)

Official Docker apt repository:

🐧 Ubuntu:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

Let your user run Docker without `sudo`:

🐧 Ubuntu:

```bash
sudo usermod -aG docker $USER
newgrp docker          # or log out and back in
docker run --rm hello-world
```

### B3. Clone, configure, start

🐧 Ubuntu:

```bash
cd ~
git clone https://github.com/ManuthiKasuntha/tuition-system.git
cd tuition-system
cp .env.example .env
sed -i "s/^MYSQL_ROOT_PASSWORD=.*/MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)/" .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 16)/" .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env
docker compose up -d --build
```

### B4. Check container health

🐧 Ubuntu:

```bash
docker compose ps                      # all three should be "healthy"
curl http://localhost:3000/api/health  # {"status":"ok","database":"up"}
bash scripts/smoke-test.sh
```

Open **http://localhost:3000** in the lab machine's browser. Other computers on the same network can use `http://<lab-machine-IP>:3000`. Find the IP with `hostname -I`.

### B5. Get the latest code later

🐧 Ubuntu:

```bash
cd ~/tuition-system
git pull
docker compose up -d --build
```

---

## Everyday Docker commands

Run these in the folder that contains `compose.yaml`.

| Command | What it does |
|---|---|
| `docker compose up -d --build` | Build images and start or update the stack in the background |
| `docker compose ps` | List containers and their health |
| `docker compose logs` | Show logs of all services (`-f` to follow, `backend` for one service) |
| `docker compose logs -f backend` | Follow only the backend logs |
| `docker compose restart backend` | Restart one service |
| `docker compose down` | Stop and remove the containers. **Data is kept** (volumes stay). |
| `docker compose exec mysql mysql -u tuition_app -p tuition_system` | Open a MySQL prompt (enter `DB_PASSWORD`) |
| `docker volume ls` | Show volumes (`tuition-system_mysql-data`, `tuition-system_uploads`) |

> 🛑 **Never use `docker compose down -v` to restart.** `-v` permanently deletes the volumes, which removes **all users, classes and uploaded files**. Use it only if you really want to reset everything.

**Demonstrating persistence:** create a class in the website → `docker compose down` → `docker compose up -d` → log in again. The class is still there.

---

## C. Jenkins CI/CD setup

Jenkins runs **on the same Linux machine** as the application. It deploys to that machine's Docker. It does **not** deploy to any other computer.

### C1. What the pipeline does

| Stage | Commands | Why |
|---|---|---|
| **Checkout** | `checkout scm` | Downloads the commit from GitHub into the Jenkins workspace |
| **Validate** | copies the secret `.env`, `docker compose config --quiet`, `bash -n` | Stops early if the configuration is broken or a secret is missing |
| **Build** | `docker compose build --pull` | Builds both images. `npm ci` runs *inside* the Docker build, so Jenkins itself needs no Node.js. |
| **Test** | starts a **temporary** stack `tuition-ci` on port 3001 with empty volumes, runs `smoke-test.sh --full`, then deletes it | Tests the new images end-to-end without touching real data |
| **Deploy** | `docker compose -p tuition-system up -d --no-build --wait` | Replaces the running containers with the tested images. Volumes are kept. |
| **Verify** | `docker compose ps` + read-only `smoke-test.sh` | Proves the deployed site is healthy |

If any stage fails, the later stages are skipped, so **a failed build or test never reaches Deploy**.

**Working directory:** Jenkins builds in its workspace, e.g. `/var/lib/jenkins/workspace/tuition-system-pipeline`. `compose.yaml` sets `name: tuition-system`, so the stack has the same name whether it was started from `~/tuition-system` or from the Jenkins workspace. Jenkins therefore **updates the same containers and keeps the same volumes**. Don't run two copies with different folders at the same time and expect separate stacks: they are the same stack.

**Persistent configuration:** the `.env` file isn't stored in Git. You upload it once to Jenkins as a **Secret file** credential. Each build copies it into the workspace with permission 600, and the `cleanup` step deletes it at the end. Jenkins hides credential values in the console log.

> **Use the same `.env` values that the existing `tuition-system_mysql-data` volume was created with.** If you started the stack by hand first, upload *that* `.env` to Jenkins (`~/tuition-system/.env`). A different `DB_PASSWORD` would not match the user already stored in MySQL.

### C2. Install Jenkins (Ubuntu)

Jenkins needs Java 21.

🐧 Ubuntu:

```bash
sudo apt update
sudo apt install -y fontconfig openjdk-21-jre
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update
sudo apt install -y jenkins
sudo systemctl enable --now jenkins
sudo systemctl status jenkins --no-pager
```

> If `apt update` complains about the Jenkins key, check https://www.jenkins.io/doc/book/installing/linux/ for the current key file name.

Open **http://localhost:8080**, then print the unlock password:

🐧 Ubuntu:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Choose **Install suggested plugins** and create your admin user.

> **WSL note:** WSL Ubuntu may not run `systemd`. If `systemctl` fails, add `[boot]` / `systemd=true` to `/etc/wsl.conf`, run `wsl --shutdown` in PowerShell, then reopen Ubuntu.

### C3. Give Jenkins permission to use Docker

The Docker daemon is controlled through the socket `/var/run/docker.sock`. Only `root` and members of the `docker` group can use it.

🐧 Ubuntu:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
sudo -u jenkins docker ps        # must work without "permission denied"
```

**Security warning:** anyone in the `docker` group effectively has **root access** to the machine. They can start a container that mounts `/` and change any file. So:

- Only trusted people should be able to edit Jenkins jobs or the `Jenkinsfile` on the branch Jenkins builds.
- Protect Jenkins with a login (never allow anonymous access) and don't expose port 8080 to the internet.
- This is acceptable for a university lab. In industry you would use separate build agents, rootless Docker, or a dedicated deployment user.

### C4. Required plugins

These come with **Install suggested plugins**. Check them under *Manage Jenkins → Plugins → Installed*:

- **Pipeline** (workflow-aggregator)
- **Git** and **GitHub** (optional, for webhooks)
- **Credentials** and **Credentials Binding** – used for `withCredentials`
- **Timestamper** – used for `timestamps()`
- **Pipeline: Stage View** – the coloured stage boxes, which are nice for demos

### C5. Store the `.env` as a Jenkins credential

1. Prepare a `.env` file on the machine, as in step A4/B3. If the stack already runs, use its existing `.env`.
2. Jenkins → **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**
   - Kind: **Secret file**
   - File: upload your `.env`
   - ID: **`tuition-system-env`** (it must match `ENV_CREDENTIAL_ID` in the Jenkinsfile)
   - Description: TuitionHub environment

The browser's file picker may not show the hidden `.env` file. If so, copy it first: `cp ~/tuition-system/.env ~/tuition-env.txt`. Upload `tuition-env.txt`, then delete that copy.

### C6. Create the Pipeline job

1. Jenkins → **New Item** → name `tuition-system-pipeline` → **Pipeline** → OK
2. **Pipeline** section:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/ManuthiKasuntha/tuition-system.git`
   - Credentials: *none* if the repository is public. For a private repo, add a *Username with password* credential: your GitHub username plus a **Personal Access Token** as the password.
   - Branch Specifier: `*/main`
   - Script Path: `Jenkinsfile`
3. *Build Triggers* (optional): **Poll SCM** with schedule `H/5 * * * *`. Jenkins checks GitHub every 5 minutes and builds when there is a new commit.
   GitHub *webhooks* need GitHub to reach your Jenkins over the internet. A lab or WSL machine usually can't be reached, so polling is the simple option.
4. **Save**

### C7. Run the pipeline

Click **Build Now**. Open the build → **Console Output** to watch it. A successful run ends with:

```
All 5 smoke tests passed.
Pipeline succeeded: TuitionHub is deployed and healthy.
```

Demo idea: change some text in the frontend → `git push` → **Build Now** (or wait for polling) → refresh http://localhost:3000 to see the change deployed.

### C8. Pipeline troubleshooting

| Symptom in console output | Fix |
|---|---|
| `permission denied while trying to connect to the Docker daemon socket` | Do step C3 (`usermod -aG docker jenkins` **and** restart Jenkins) |
| `docker: command not found` / `'compose' is not a docker command` | Install Docker Engine + `docker-compose-plugin` (B2) on the Jenkins machine |
| `Could not find credentials entry with ID 'tuition-system-env'` | Create the Secret file credential with exactly that ID (C5) |
| `required variable ... is missing a value` | The uploaded `.env` is missing that variable. Compare it with `.env.example`. |
| `No such DSL method 'timestamps'` | Install the **Timestamper** plugin |
| `Bind for 0.0.0.0:3001 failed: port is already allocated` | A previous test stack is still running: `docker compose -p tuition-ci down -v` (this is safe, it is only the test stack) |
| `Bind for 0.0.0.0:3000 failed` | Another program uses port 3000. Change `APP_PORT` in the credential's `.env`. |
| Test stage fails with `[FAIL] ...` | Read the `[FAIL]` line and the container logs printed after it. The new code has a bug, and production was **not** changed. |
| `Access denied for user 'tuition_app'` in backend logs | The `.env` passwords differ from those the MySQL volume was created with. Use the original `.env` (see C1). |
| `dependency failed to start: container ... is unhealthy` | Run `docker compose logs mysql backend` to see why |

---

## Troubleshooting

| Problem | Check / fix |
|---|---|
| `docker compose ps` shows backend `restarting` | `docker compose logs backend`. Usually a wrong DB password or `JWT_SECRET` missing in `.env`. |
| `Access denied for user` after changing `.env` | Passwords are fixed when the volume is created. Change them back, or reset everything (deletes all data!): `docker compose down -v && docker compose up -d --build` |
| Website shows *"Cannot reach the server"* | The backend is not healthy. Run `docker compose ps` and `docker compose logs backend`. |
| `port is already allocated` for 3000 | Set `APP_PORT=3005` (any free port) in `.env`, then `docker compose up -d` |
| `permission denied ... docker.sock` | Run `sudo usermod -aG docker $USER`, then log out/in (or `newgrp docker`) |
| `scripts/smoke-test.sh: Permission denied` | Run it with bash: `bash scripts/smoke-test.sh` |
| `/usr/bin/env: 'bash\r': No such file or directory` | The file has Windows line endings. Clone inside Linux, or run `sed -i 's/\r$//' scripts/smoke-test.sh`. |
| Docker Desktop: *"WSL2 is not supported…"*, *"Virtual Machine Platform"* | See step A0 |
| WSL: `docker: command not found` | Docker Desktop → Settings → Resources → WSL integration → enable Ubuntu |
| Upload fails with *413 Request Entity Too Large* | Files must be ≤ 50 MB (the limit is in `client/nginx.conf` and `server/src/middleware/upload.js`) |
| Out of disk space | `docker system df`, then `docker image prune` (does not delete volumes) |

---

## D. Future phases

These phases are **not implemented yet**. This section shows how each one would build on what already exists.

### Terraform + AWS (infrastructure as code)

- Add a `terraform/` folder that describes an **EC2 instance** (Ubuntu), a **security group** that allows ports 22 and 80/3000, and an SSH key pair.
- `terraform init` → `terraform plan` → `terraform apply` creates the server. `terraform destroy` removes it, so it costs nothing when you are not using it.
- Output the public IP for use by Ansible.
- Cost tip: use a free-tier instance type and always `terraform destroy` after the demo.

### Ansible (configuration management)

- Add an `ansible/` folder with an inventory (the EC2 or lab IP) and a playbook that:
  1. installs Docker Engine + the Compose plugin (the same steps as B2, but automated),
  2. clones the repository and places the `.env` file. The `.env` would come from **Ansible Vault**, never plain text.
  3. runs `docker compose up -d --build`.
- Jenkins could then add a stage `ansible-playbook -i inventory deploy.yml` to deploy to the remote server instead of the local machine.

### Kubernetes

- Push the two images to a registry (Docker Hub or AWS ECR). Jenkins would add a `docker push` stage.
- Convert `compose.yaml` into Kubernetes manifests:
  - `Deployment` + `Service` for frontend and backend
  - `StatefulSet` + `PersistentVolumeClaim` for MySQL, which replaces the `mysql-data` volume
  - `Secret` for the `.env` values and `ConfigMap` for non-secret settings
  - `Ingress` that replaces the host port mapping
- The existing `/api/health` endpoint becomes the **readiness/liveness probe**.
- Start with **minikube** or **k3s** locally before using a cloud cluster.

### Monitoring (Prometheus + Grafana)

- Add `prometheus` and `grafana` services to `compose.yaml`. Optionally add **cAdvisor** for container CPU/memory metrics and **node-exporter** for host metrics.
- Expose application metrics from the backend with the `prom-client` npm package at `/api/metrics`. Prometheus scrapes it.
- Build a Grafana dashboard showing request rate, errors, container CPU and memory, and MySQL status (with `mysqld-exporter`).
- Simple alerting idea: alert when `/api/health` fails.

How the pieces fit:

```
Terraform ──creates──▶ AWS EC2 ──configured by──▶ Ansible ──runs──▶ Docker Compose / Kubernetes
     ▲                                                                      │
     └────────────── Jenkins pipeline triggers each step ◀── GitHub          ▼
                                                              Prometheus ──▶ Grafana
```
