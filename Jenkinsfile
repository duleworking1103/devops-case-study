pipeline {
    agent { label 'docker-agent' } 

    parameters {
        string(name: 'IMAGE_TAG', defaultValue: "v1.0.0", description: 'Nhập Tag cho Docker Image')
        choice(name: 'DEPLOY_ENV', choices: ['dev', 'staging', 'production'], description: 'Chọn môi trường triển khai')
    }

    environment {
        // Thay bằng username Docker Hub của bạn
        IMAGE_NAME = 'dule1103/demo-app'
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                script {
                    echo "--- 1. PULLING SOURCE CODE FROM GITHUB ---"
                    checkout scm
                }
            }
        }

        stage('Test & Validation') {
            steps {
                script {
                    echo "--- 2. RUNNING TESTS ---"
                    sh "node --check ./demo-app/server.js"
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'DOCKER_REGISTRY_CREDS', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    script {
                        echo "--- 3. BUILD & PUSH IMAGE ---"
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
                        echo "--- 4. DEPLOYING TO ${params.DEPLOY_ENV} ---"
                        
                        // SỬ DỤNG TRY-CATCH ĐỂ XỬ LÝ LỖI TRIỂN KHAI VÀ ROLLBACK
                        try {
                            // Cờ --wait và --timeout rất quan trọng: 
                            // Nếu Pod bị CrashLoopBackOff, lệnh helm này sẽ fail sau 2 phút và nhảy xuống khối catch
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
                            echo "⚠️ LỖI: Triển khai thất bại (Timeout hoặc Crash). Đang tiến hành ROLLBACK..."
                            
                            // Lệnh Rollback về revision trước đó (0 có nghĩa là bản ổn định gần nhất)
                            sh "helm rollback demo-app-${params.DEPLOY_ENV} 0"
                            
                            // Báo lỗi để Pipeline dừng lại và chuyển sang trạng thái FAILED
                            error("Deployment failed! Đã Rollback an toàn về phiên bản trước đó. Chi tiết lỗi: ${e.getMessage()}")
                        }
                    }
                }
            }
        }
    }

    // XỬ LÝ FAILURE BÀI BẢN
    post {
        always {
            echo "--- DỌN DẸP AGENT ---"
            sh "docker logout || true"
        }
        success {
            echo "✅ PIPELINE SUCCESS!"
            echo "Phiên bản ${params.IMAGE_TAG} đang chạy ổn định trên môi trường ${params.DEPLOY_ENV}."
            
            // Mock: Gửi thông báo thành công
            sh """
            echo "MOCK ALERT: Gửi tin nhắn Slack -> 🟢 [Thành công] Version #${params.IMAGE_TAG} đã deploy lên ${params.DEPLOY_ENV}."
            """
        }
        failure {
            echo "❌ PIPELINE FAILED!"
            
            // Mock: Gửi cảnh báo lỗi và tag team Dev
            sh """
            echo "MOCK ALERT: Gửi tin nhắn Slack -> 🔴 [Thất bại] Version #${params.IMAGE_TAG} lỗi! Vui lòng kiểm tra log Jenkins."
            echo "MOCK TICKET: Tự động tạo Jira Ticket assign cho team Developer."
            """
        }
        aborted {
            echo "⚠️ Pipeline bị người dùng hủy giữa chừng."
        }
    }
}
