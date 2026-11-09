// TuitionHub - Jenkins Declarative Pipeline
//
// What it does (each stage must pass before the next one runs):
//   1. Checkout        - get the code from GitHub
//   2. Validate        - check compose.yaml, Dockerfiles and scripts are valid
//   3. Build           - build the backend + frontend Docker images
//                        (npm dependencies are installed INSIDE the images)
//   4. Test            - start a TEMPORARY copy of the stack on port 3001,
//                        run the full smoke test, then delete that copy
//   5. Deploy          - update the real stack ("tuition-system") with Docker Compose
//   6. Verify          - check containers are healthy + run read-only smoke test
//
// Requirements on the Jenkins machine: Docker Engine + Compose plugin, curl,
// and the "jenkins" user in the "docker" group (see DEVOPS_SETUP.md).
//
// Secrets: the .env file is NOT in Git. Upload it once to Jenkins as a
// "Secret file" credential with the ID below.

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()          // never run two deployments at the same time
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    environment {
        ENV_CREDENTIAL_ID = 'tuition-system-env'  // Jenkins "Secret file" credential
        PROD_PROJECT      = 'tuition-system'      // same name as in compose.yaml
        TEST_PROJECT      = 'tuition-ci'          // throw-away stack used by the Test stage
        TEST_PORT         = '3001'
        COMPOSE_ANSI      = 'never'               // cleaner Jenkins console output
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --pretty="Building commit %h: %s (%an)"'
            }
        }

        stage('Validate') {
            steps {
                sh '''
                    docker --version
                    docker compose version
                    curl --version | head -1
                '''
                // Put the secret .env file into the workspace (its contents are never printed)
                withCredentials([file(credentialsId: env.ENV_CREDENTIAL_ID, variable: 'ENV_FILE')]) {
                    sh 'install -m 600 "$ENV_FILE" .env'
                }
                sh '''
                    # Fails if compose.yaml is invalid or a required variable is missing.
                    # --quiet: validate only, do not print the resolved config (it contains secrets)
                    docker compose config --quiet
                    bash -n scripts/smoke-test.sh
                    test -f database/schema.sql
                    echo "Configuration is valid"
                '''
            }
        }

        stage('Build') {
            steps {
                sh 'docker compose build --pull'
                sh 'docker image ls "tuition-system-*"'
            }
        }

        stage('Test') {
            steps {
                // Same images, separate project name, own empty volumes, port 3001.
                // The production stack and its data are not touched.
                sh '''
                    APP_PORT=$TEST_PORT docker compose -p "$TEST_PROJECT" up -d --no-build --wait --wait-timeout 180
                    bash scripts/smoke-test.sh "http://localhost:$TEST_PORT" --full
                '''
            }
            post {
                failure {
                    sh 'docker compose -p "$TEST_PROJECT" logs --tail=100 || true'
                }
                always {
                    // Removing the TEST stack and its volumes is safe: it only held test data.
                    // (Never run "down -v" against the production project.)
                    sh 'APP_PORT=$TEST_PORT docker compose -p "$TEST_PROJECT" down -v --remove-orphans || true'
                }
            }
        }

        stage('Deploy') {
            steps {
                // Re-creates only the containers whose image/config changed.
                // Named volumes (MySQL data, uploads) are kept.
                sh 'docker compose -p "$PROD_PROJECT" up -d --no-build --remove-orphans --wait --wait-timeout 180'
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    docker compose -p "$PROD_PROJECT" ps
                    APP_PORT=$(grep -E '^APP_PORT=' .env | cut -d= -f2)
                    bash scripts/smoke-test.sh "http://localhost:${APP_PORT:-3000}"
                '''
            }
        }
    }

    post {
        success {
            echo 'Pipeline succeeded: TuitionHub is deployed and healthy.'
        }
        failure {
            echo 'Pipeline FAILED. Check the stage that is red above. Production was only changed if the Deploy stage ran.'
            sh 'docker ps -a --filter "label=com.docker.compose.project=$PROD_PROJECT" || true'
        }
        cleanup {
            // Runs last, always: remove the secret file from the workspace and clean dangling images
            sh 'rm -f .env; docker image prune -f > /dev/null || true'
        }
    }
}
