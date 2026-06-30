pipeline {
    agent { label 'docker-agent' } 

    parameters {
        // Bạn sẽ tự nhập Tag (ví dụ: v1.0.0, v1.0.1) vào đây mỗi khi chạy Build
        string(name: 'IMAGE_TAG', defaultValue: 'v1.0.0', description: 'Nhập Tag cố định cho lần Build & Deploy này')
        choice(name: 'TEST_MODE', choices: ['pass', 'fail'], description: 'Giả lập kết quả Unit Test')
    }

    environment {
        IMAGE_NAME = 'dule1103/demo-app'
    }

    stages {
        stage('Code Analysis & Unit Test') {
            steps {
                script {
                    echo "--- 1. RUNNING LINT & TESTS (Mode: ${params.TEST_MODE}) ---"
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

        stage('Security Scan (SAST)') {
            steps {
                script {
                    echo "--- 2. NPM AUDIT (Code Security Check) ---"
                    // Quét thư viện npm, nếu có lỗi High sẽ in ra cảnh báo (dùng || true để không block pipeline trong lúc demo)
                    sh "docker run --rm -v \$(pwd)/demo-app:/app -w /app node:18-alpine sh -c 'npm audit --audit-level=high || true'"
                }
            }
        }

        stage('Build & Push Artifact') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'DOCKER_REGISTRY_CREDS', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    script {
                        echo "--- 3. PACKAGING ARTIFACT: ${params.IMAGE_TAG} ---"
                        sh "docker build -t ${IMAGE_NAME}:${params.IMAGE_TAG} ./demo-app"
                        sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                        sh "docker push ${IMAGE_NAME}:${params.IMAGE_TAG}"
                    }
                }
            }
        }

        stage('Vulnerability Scan (Trivy)') {
            steps {
                script {
                    echo "--- 4. DOCKER IMAGE VULNERABILITY SCAN ---"
                    // Quét image bằng Trivy. (Set exit-code 0 để pipeline chạy tiếp phục vụ demo, thực tế nên là exit-code 1)
                    sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --exit-code 0 --severity HIGH,CRITICAL ${IMAGE_NAME}:${params.IMAGE_TAG}"
                }
            }
        }

        stage('Deploy to DEV') {
            steps {
                // Sử dụng Secret dành riêng cho môi trường DEV
                withCredentials([string(credentialsId: 'DEV_API_URL_SECRET', variable: 'DEV_SECRET')]) {
                    script {
                        echo "--- 5. DEPLOYING ARTIFACT ${params.IMAGE_TAG} TO DEV ---"
                        deployAndVerify('dev', params.IMAGE_TAG, env.DEV_SECRET)
                    }
                }
            }
        }

        stage('Approval for PROD') {
            steps {
                script {
                    // Dừng luồng Pipeline chờ phê duyệt
                    input message: "Artifact ${params.IMAGE_TAG} đã Deploy lên DEV. Bạn có chắc chắn muốn Promote lên PRODUCTION không?", 
                          ok: "Đồng ý Promote"
                }
            }
        }

        stage('Deploy to PROD') {
            steps {
                // Sử dụng Secret dành riêng cho môi trường PROD
                withCredentials([string(credentialsId: 'PROD_API_URL_SECRET', variable: 'PROD_SECRET')]) {
                    script {
                        echo "--- 6. DEPLOYING ARTIFACT ${params.IMAGE_TAG} TO PROD ---"
                        deployAndVerify('production', params.IMAGE_TAG, env.PROD_SECRET)
                    }
                }
            }
        }

        stage('Manual Rollback (PROD)') {
            steps {
                script {
                    echo "--- 7. POST-DEPLOYMENT VERIFICATION ---"
                    try {
                        // Đợi tối đa 5 phút để QA test ứng dụng
                        timeout(time: 5, unit: 'MINUTES') {
                            def decision = input(
                                message: "App đã lên PROD. Đội QA có 5 phút để test Sanity. Bạn quyết định thế nào?",
                                parameters: [
                                    choice(name: 'ACTION', 
                                           choices: ['Giữ nguyên (Phiên bản tốt)', 'Rollback khẩn cấp (Lỗi logic)'], 
                                           description: 'Chọn hành động sau khi kiểm tra thực tế')
                                ]
                            )
                            
                            // Thực thi lệnh dựa trên lựa chọn
                            if (decision == 'Rollback khẩn cấp (Lỗi logic)') {
                                echo "⚠️ NHẬN LỆNH ROLLBACK THỦ CÔNG TỪ ADMIN! Đang khôi phục..."
                                sh "helm rollback demo-app-production 0"
                                error("Manual Rollback Triggered by Admin due to Business Logic Error") 
                            } else {
                                echo "✅ XÁC NHẬN PHIÊN BẢN ỔN ĐỊNH. KẾT THÚC PIPELINE!"
                            }
                        }
                    } catch (org.jenkinsci.plugins.workflow.steps.FlowInterruptedException e) {
                        // Hết timeout 5 phút hoặc ai đó ấn Abort
                        echo "⏳ Hết 5 phút kiểm tra hoặc bỏ qua thao tác. Mặc định hệ thống giữ nguyên bản mới nhất."
                    }
                }
            }
        }
    }

    post {
        always {
            sh "docker logout || true"
            echo "--- CLEANING UP WORKSPACE ---"
        }
        success {
            echo "✅ PIPELINE SUCCESS!"
        }
        failure {
            echo "❌ PIPELINE FAILED!"
        }
    }
}

// Hàm thực thi Deploy & Auto-Rollback (Lỗi kỹ thuật)
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
        echo "⚠️ LỖI KỸ THUẬT TẠI ${envName.toUpperCase()}: Đang AUTO-ROLLBACK..."
        sh "helm rollback demo-app-${envName} 0"
        error("Auto-Rollback triggered at ${envName}! Lỗi: ${e.getMessage()}")
    }
}
