pipeline {
    agent { label 'docker-agent' } 

    parameters {
        string(name: 'IMAGE_TAG', defaultValue: 'v1.0.0', description: 'Nhập Tag (ví dụ: v1.0.1)')
        choice(name: 'TEST_MODE', choices: ['pass', 'fail'], description: 'Giả lập kết quả Unit Test')
    }

    environment {
        IMAGE_NAME = 'dule1103/demo-app'
    }

    stages {
        stage('Verify Workspace') {
            steps {
                script {
                    echo "--- 1. PRE-FLIGHT CHECK ---"
                    sh "ls -la demo-app/"
                    sh "chmod -R 755 demo-app/"
                    sh "cat demo-app/package.json"
                }
            }
        }

        stage('Code Analysis & Unit Test') {
            steps {
                script {
                    echo "--- 2. RUNNING LINT & TESTS (Mode: ${params.TEST_MODE}) ---"
                    sh """
                    docker run --rm -e TEST_MODE=${params.TEST_MODE} -v \$(pwd)/demo-app:/app -w /app node:18-alpine sh -c "
                        npm install
                        npm run lint
                        npm test
                    "
                    """
                }
            }
        }

        stage('Security Scan') {
            steps {
                script {
                    echo "--- 3. SECURITY & VULNERABILITY SCAN ---"
                    sh "docker run --rm -v \$(pwd)/demo-app:/app -w /app node:18-alpine sh -c 'npm audit --audit-level=high || true'"
                    sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --exit-code 0 --severity HIGH,CRITICAL ${IMAGE_NAME}:${params.IMAGE_TAG}"
                }
            }
        }

        stage('Build & Push Artifact') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'DOCKER_REGISTRY_CREDS', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    script {
                        echo "--- 4. PACKAGING ARTIFACT: ${params.IMAGE_TAG} ---"
                        sh "docker build -t ${IMAGE_NAME}:${params.IMAGE_TAG} ./demo-app"
                        sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                        sh "docker push ${IMAGE_NAME}:${params.IMAGE_TAG}"
                    }
                }
            }
        }

        stage('Deploy to DEV') {
            steps {
                withCredentials([string(credentialsId: 'DEV_API_URL_SECRET', variable: 'DEV_SECRET')]) {
                    script {
                        deployAndVerify('dev', params.IMAGE_TAG, env.DEV_SECRET)
                    }
                }
            }
        }

        stage('Approval for PROD') {
            steps {
                input message: "Artifact ${params.IMAGE_TAG} đã ổn trên DEV. Đẩy lên PRODUCTION?", ok: "Đồng ý"
            }
        }

        stage('Deploy to PROD') {
            steps {
                withCredentials([string(credentialsId: 'PROD_API_URL_SECRET', variable: 'PROD_SECRET')]) {
                    script {
                        deployAndVerify('production', params.IMAGE_TAG, env.PROD_SECRET)
                    }
                }
            }
        }

        stage('Manual Rollback (PROD)') {
            steps {
                script {
                    timeout(time: 5, unit: 'MINUTES') {
                        def decision = input(
                            message: "App đã lên PROD. QA có 5 phút kiểm tra. Bạn quyết định thế nào?",
                            parameters: [choice(name: 'ACTION', choices: ['Giữ nguyên', 'Rollback khẩn cấp'], description: 'Chọn hành động')]
                        )
                        if (decision == 'Rollback khẩn cấp') {
                            sh "helm rollback demo-app-production 0"
                            error("Manual Rollback Triggered!")
                        }
                    }
                }
            }
        }
    }

    post {
        always { sh "docker logout || true" }
        success { echo "✅ PIPELINE SUCCESS!" }
        failure { echo "❌ PIPELINE FAILED!" }
    }
}

def deployAndVerify(envName, tag, secretUrl) {
    try {
        sh """
        helm upgrade --install demo-app-${envName} ./helm \
            --set image.repository=${env.IMAGE_NAME} \
            --set image.tag=${tag} \
            --set appConfig.appVersion=${tag} \
            --set appConfig.environment=${envName} \
            --set appConfig.secretApiUrl=${secretUrl} \
            --wait --timeout 2m
        """
    } catch (Exception e) {
        echo "⚠️ LỖI KỸ THUẬT: Đang AUTO-ROLLBACK..."
        sh "helm rollback demo-app-${envName} 0"
        error("Auto-Rollback triggered!")
    }
}
