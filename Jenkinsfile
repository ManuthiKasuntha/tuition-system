pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    environment {
        ENV_CREDENTIAL_ID = 'tuition-system-env'
        PROD_PROJECT      = 'tuition-system'
        TEST_PROJECT      = 'tuition-ci'
        TEST_PORT         = '3001'
        COMPOSE_ANSI      = 'never'
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
                withCredentials([file(credentialsId: env.ENV_CREDENTIAL_ID, variable: 'ENV_FILE')]) {
                    sh 'install -m 600 "$ENV_FILE" .env'
                }
                sh '''
                    docker compose config --quiet
                    bash -n scripts/smoke-test.sh
                    test -f database/schema.sql
                '''
            }
        }

        stage('Build') {
            steps {
                sh 'docker compose build --pull'
            }
        }

        stage('Test') {
            steps {
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
                    // Test stack only - never use down -v on production
                    sh 'APP_PORT=$TEST_PORT docker compose -p "$TEST_PROJECT" down -v --remove-orphans || true'
                }
            }
        }

        stage('Deploy') {
            steps {
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
            echo 'Pipeline failed.'
            sh 'docker ps -a --filter "label=com.docker.compose.project=$PROD_PROJECT" || true'
        }
        cleanup {
            sh 'rm -f .env; docker image prune -f > /dev/null || true'
        }
    }
}
