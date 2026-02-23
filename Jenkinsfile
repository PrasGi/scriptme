// script-minder CI/CD – aligns with VPS docs (docker/docs/04-JENKINS-DOCKER-DEPLOYMENT.md)
// Jenkins runs on host (jenkins.prasme.id:8081). Pipeline copies to /projects/script-minder (see docker docs: deploy dir = /projects/<project>).
pipeline {
    agent any

    environment {
        APP_NAME = 'script-minder'
        PORT = '3200'                    // Host port for health check; app listens 3000 inside container
        DEPLOY_DIR = '/projects/script-minder'
        NEXTAUTH_URL = 'https://scriptme.cloud'   // Production URL for NextAuth
    }

    stages {
        stage('Checkout') {
            steps {
                echo '📦 Checking out code...'
                checkout scm
            }
        }

        stage('Copy Source') {
            steps {
                echo '📂 Copying source to deployment directory...'
                sh '''
                    mkdir -p ${DEPLOY_DIR}
                    rsync -av --delete \
                        --exclude='.git' \
                        --exclude='node_modules' \
                        --exclude='.next' \
                        ./ ${DEPLOY_DIR}/
                '''
            }
        }

        stage('Setup Environment') {
            steps {
                echo '⚙️  Creating .env from credentials...'
                withCredentials([
                    string(credentialsId: 'script-minder-mongo-root-user', variable: 'MONGO_ROOT_USER'),
                    string(credentialsId: 'script-minder-mongo-root-password', variable: 'MONGO_ROOT_PASSWORD'),
                    string(credentialsId: 'script-minder-auth-secret', variable: 'AUTH_SECRET'),
                    string(credentialsId: 'script-minder-google-genai-api-key', variable: 'GOOGLE_GENAI_API_KEY'),
                    string(credentialsId: 'script-minder-google-oauth-id', variable: 'AUTH_GOOGLE_ID'),
                    string(credentialsId: 'script-minder-google-oauth-secret', variable: 'AUTH_GOOGLE_SECRET'),
                    string(credentialsId: 'script-minder-github-oauth-id', variable: 'AUTH_GITHUB_ID'),
                    string(credentialsId: 'script-minder-github-oauth-secret', variable: 'AUTH_GITHUB_SECRET'),
                    string(credentialsId: 'script-minder-cloudflare-proxy-url', variable: 'CLOUDFLARE_PROXY_URL'),
                    string(credentialsId: 'script-minder-cloudflare-tiktok-url', variable: 'CLOUDFLARE_TIKTOK_URL')
                ]) {
                    sh '''
                        cat > ${DEPLOY_DIR}/.env << EOF
MONGODB_URI=mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@mongodb:27017/scriptminder?authSource=admin
REDIS_URL=redis://redis:6379
APP_PORT=3200
NODE_ENV=production
AUTH_SECRET=${AUTH_SECRET}
NEXTAUTH_SECRET=${AUTH_SECRET}
NEXTAUTH_URL=${NEXTAUTH_URL}
AUTH_TRUST_HOST=true
GOOGLE_GENAI_API_KEY=${GOOGLE_GENAI_API_KEY}
AUTH_GOOGLE_ID=${AUTH_GOOGLE_ID}
AUTH_GOOGLE_SECRET=${AUTH_GOOGLE_SECRET}
AUTH_GITHUB_ID=${AUTH_GITHUB_ID}
AUTH_GITHUB_SECRET=${AUTH_GITHUB_SECRET}
CLOUDFLARE_PROXY_URL=${CLOUDFLARE_PROXY_URL}
CLOUDFLARE_TIKTOK_URL=${CLOUDFLARE_TIKTOK_URL}
EOF
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '🐳 Building Docker images...'
                sh '''
                    cd ${DEPLOY_DIR}
                    docker compose build --no-cache
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo '🚀 Deploying app and worker (Mongo/Redis run separately from /docker)...'
                sh '''
                    cd ${DEPLOY_DIR}
                    docker compose up -d --force-recreate
                '''
            }
        }

        stage('Seed Database') {
            steps {
                echo '🌱 Running database seeders...'
                sh '''
                    cd ${DEPLOY_DIR}
                    docker compose run --rm worker npm run seed
                    docker compose run --rm worker npm run seed:plans
                '''
            }
        }

        stage('Health Check') {
            steps {
                echo '🏥 Health check...'
                sh '''
                    sleep 15
                    if ! docker ps | grep -q script-minder; then
                        echo "❌ App container not running"
                        docker logs script-minder --tail 50
                        exit 1
                    fi
                    for i in 1 2 3 4 5; do
                        if curl -sf http://localhost:${PORT}/api/health; then
                            echo "✅ App healthy"
                            break
                        fi
                        if [ "$i" = "5" ]; then
                            echo "❌ Health check failed"
                            docker logs script-minder --tail 100
                            exit 1
                        fi
                        sleep 5
                    done
                '''
            }
        }

        stage('Cleanup') {
            steps {
                echo '🧹 Cleaning up...'
                sh 'docker image prune -f'
            }
        }

        stage('Reload Nginx') {
            steps {
                echo '🔄 Reloading Nginx...'
                sh 'docker exec nginx nginx -t && docker exec nginx nginx -s reload'
            }
        }
    }

    post {
        success {
            echo '✅ script-minder deployment successful!'
            sh 'docker ps --filter "name=script-minder"'
        }
        failure {
            echo '❌ Deployment failed!'
            sh 'docker logs script-minder --tail 100 2>/dev/null || true'
            sh 'docker logs script-minder-worker --tail 50 2>/dev/null || true'
        }
    }
}
