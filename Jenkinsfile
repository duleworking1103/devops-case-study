pipeline {
    // Chạy trên Agent mà chúng ta đã setup
    agent { label 'docker-agent' } 

    // 1. KHAI BÁO THAM SỐ (Parameters)
    // Cho phép người dùng chọn tag và môi trường khi nhấn "Build with Parameters"
    parameters {
        string(name: 'IMAGE_TAG', defaultValue: "v1.0.0", description: 'Nhập Tag cho Docker Image (VD: v1.0.2)')
        choice(name: 'DEPLOY_ENV', choices: ['dev', 'staging', 'production'], description: 'Chọn môi trường triển khai')
    }

    environment {
        // LƯU Ý: Đổi 'your_dockerhub_username' thành username Docker Hub thực tế của bạn
        IMAGE_NAME = 'your_dockerhub_username/my-demo-app'
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                script {
                    echo "--- 1. PULLING SOURCE CODE FROM GITHUB ---"
                    // Tự động kéo code từ repo GitHub dựa trên cấu hình Job trong Jenkins
                    checkout scm
                }
            }
        }

        stage('Test & Validation') {
            steps {
                script {
                    echo "--- 2. RUNNING TESTS FOR ENV: ${params.DEPLOY_ENV} ---"
                    // Test cơ bản kiểm tra cú pháp file Node.js
                    sh "node --check ./demo-app/server.js"
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                // Tích hợp Secret Manager cho Docker Registry
                withCredentials([usernamePassword(credentialsId: 'DOCKER_REGISTRY_CREDS', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    script {
                        echo "--- 3. BUILD DOCKER IMAGE ---"
                        sh "docker build -t ${IMAGE_NAME}:${params.IMAGE_TAG} ./demo-app"
                        
                        echo "--- 4. LOGIN & PUSH TO REGISTRY ---"
                        // Dùng --password-stdin để bảo mật mật khẩu, không lưu vào lịch sử bash
                        sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                        sh "docker push ${IMAGE_NAME}:${params.IMAGE_TAG}"
                    }
                }
            }
        }

        stage('Deploy to Kubernetes (Helm)') {
            steps {
                // Tích hợp Secret Manager cho API Secret của ứng dụng
                withCredentials([string(credentialsId: 'API_URL_SECRET', variable: 'SECRET_URL')]) {
                    script {
                        echo "--- 5. DEPLOYING VERSION ${params.IMAGE_TAG} TO ${params.DEPLOY_ENV} ---"
                        
                        // Sử dụng Helm để Deploy/Rolling Update với các thông số truyền vào động
                        sh """
                        helm upgrade --install demo-app-${params.DEPLOY_ENV} ./helm \
                            --set image.repository=${IMAGE_NAME} \
                            --set image.tag=${params.IMAGE_TAG} \
                            --set appConfig.appVersion=${params.IMAGE_TAG} \
                            --set appConfig.environment=${params.DEPLOY_ENV} \
                            --set appConfig.secretApiUrl=\$SECRET_URL \
                            --wait --timeout 2m
                        """
                    }
                }
            }
        }
    }

    // Xử lý sau khi chạy Pipeline (Error Handling & Cleanup)
    post {
        always {
            echo "--- CLEANING UP WORKSPACE ---"
            // Xóa credentials phiên đăng nhập Docker để đảm bảo an toàn cho Agent
            sh "docker logout || true"
        }
        success {
            echo "✅ PIPELINE SUCCESS!"
            echo "Successfully deployed ${IMAGE_NAME}:${params.IMAGE_TAG} to ${params.DEPLOY_ENV} environment."
        }
        failure {
            echo "❌ PIPELINE FAILED!"
            echo "Triggering alert notifications to the engineering team..."
        }
    }
}
