pipeline {
    agent { label 'docker-agent' } 

    parameters {
        string(name: 'IMAGE_TAG', defaultValue: 'v1.0.0', description: 'Nhập Tag cố định cho lần Build này')
        choice(name: 'TEST_MODE', choices: ['pass', 'fail'], description: 'Giả lập kết quả Unit Test')
    }

    environment {
        IMAGE_NAME = 'dule1103/demo-app'
    }

    stages {
        stage('Code Analysis & Unit Test') {
            steps {
                script {
                    echo "--- 1. RUNNING TESTS VIA ISOLATED CONTAINER ---"
                    try {
                        // 1. Tạo một container chạy ngầm (sleep)
                        sh "docker run -d --name test-container node:18-alpine sleep 3600"
                        
                        // 2. Copy toàn bộ mã nguồn vào thẳng container
                        sh "docker cp ./demo-app/. test-container:/app"
                        
                        // 3. Thực thi các lệnh Test ngay bên trong container
                        sh """
                        docker exec -e TEST_MODE=${params.TEST_MODE} -w /app test-container sh -c "
                            echo '--- Cài đặt thư viện ---'
                            npm install
                            echo '--- Chạy Linting ---'
                            npm run lint
                            echo '--- Chạy Unit Test ---'
                            npm test
                        "
                        """
                    } finally {
                        // 4. Luôn dọn dẹp container test dù thành công hay thất bại
                        sh "docker rm -f test-container || true"
                    }
                }
            }
        }

        stage('Build & Push Artifact') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'DOCKER_REGISTRY_CREDS', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    script {
                        echo "--- 2. PACKAGING ARTIFACT: ${params.IMAGE_TAG} ---"
                        // Test pass thì mới bắt đầu Build ra Image thực tế
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
                        echo "--- 3. DEPLOYING TO DEV ---"
                        deployAndVerify('dev', params.IMAGE_TAG, env.DEV_SECRET)
                    }
                }
            }
        }

        stage('Approval for PROD') {
            steps {
                input message: "Artifact ${params.IMAGE_TAG} đã ổn định trên DEV. Promote lên PRODUCTION?", ok: "Đồng ý"
            }
        }

        stage('Deploy to PROD') {
            steps {
                withCredentials([string(credentialsId: 'PROD_API_URL_SECRET', variable: 'PROD_SECRET')]) {
                    script {
                        echo "--- 4. DEPLOYING TO PROD ---"
                        deployAndVerify('production', params.IMAGE_TAG, env.PROD_SECRET)
                    }
                }
            }
        }

        stage('Manual Rollback (PROD)') {
            steps {
                script {
                    try {
                        timeout(time: 5, unit: 'MINUTES') {
                            def decision = input(
                                message: "App đã lên PROD. Đội QA có 5 phút để test Sanity. Quyết định của bạn?",
                                parameters: [
                                    choice(name: 'ACTION', 
                                           choices: ['Giữ nguyên', 'Rollback khẩn cấp'], 
                                           description: 'Chọn hành động sau khi kiểm tra')
                                ]
                            )
                            if (decision == 'Rollback khẩn cấp') {
                                sh "helm rollback demo-app-production 0"
                                error("Manual Rollback Triggered by Admin!") 
                            }
                        }
                    } catch (org.jenkinsci.plugins.workflow.steps.FlowInterruptedException e) {
                        echo "⏳ Bỏ qua thao tác Manual Rollback."
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
        echo "⚠️ LỖI KỸ THUẬT TẠI ${envName.toUpperCase()}: AUTO-ROLLBACK..."
        sh "helm rollback demo-app-${envName} 0"
        error("Auto-Rollback triggered at ${envName}!")
    }
}
