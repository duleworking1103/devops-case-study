pipeline {
    agent { label 'docker-agent' } 

    parameters {
        string(name: 'IMAGE_TAG', defaultValue: "v1.0.0", description: 'Nhập Tag cho Docker Image')
        choice(name: 'DEPLOY_ENV', choices: ['dev', 'staging', 'production'], description: 'Chọn môi trường triển khai')
    }

    environment {
        IMAGE_NAME = 'dule1103/demo-app'
    }

    stages {
        stage('Test & Validation') {
            steps {
                script {
                    echo "--- 1. RUNNING TESTS VIA DOCKER ---"
                    sh "cat ./demo-app/server.js | docker run --rm -i node:18-alpine node --check"
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'DOCKER_REGISTRY_CREDS', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    script {
                        echo "--- 2. BUILD & PUSH IMAGE ---"
                        sh "docker build -t ${IMAGE_NAME}:${params.IMAGE_TAG} ./demo-app"
                        sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                        sh "docker push ${IMAGE_NAME}:${params.IMAGE_TAG}"
                    }
                }
            }
        }

        stage('Deploy & Auto-Rollback (Helm)') {
            steps {
                withCredentials([string(credentialsId: 'API_URL_SECRET', variable: 'SECRET_URL')]) {
                    script {
                        echo "--- 3. DEPLOYING TO ${params.DEPLOY_ENV} ---"
                        try {
                            sh """
                            helm upgrade --install demo-app-${params.DEPLOY_ENV} ./helm \
                                --set image.repository=${IMAGE_NAME} \
                                --set image.tag=${params.IMAGE_TAG} \
                                --set appConfig.appVersion=${params.IMAGE_TAG} \
                                --set appConfig.environment=${params.DEPLOY_ENV} \
                                --set appConfig.secretApiUrl=\$SECRET_URL \
                                --wait --timeout 2m
                            """
                        } catch (Exception e) {
                            echo "⚠️ LỖI: Triển khai thất bại. Đang tiến hành ROLLBACK..."
                            sh "helm rollback demo-app-${params.DEPLOY_ENV} 0"
                            error("Deployment failed! Đã Rollback. Lỗi: ${e.getMessage()}")
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            echo "--- CLEANING UP ---"
            sh "docker logout || true"
        }
        success {
            echo "✅ PIPELINE SUCCESS!"
        }
        failure {
            echo "❌ PIPELINE FAILED!"
        }
    }
}
