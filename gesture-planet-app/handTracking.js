// 手势识别控制器类
class HandGestureController {
    constructor() {
        this.video = document.getElementById('video');
        this.outputCanvas = document.getElementById('output-canvas');
        this.canvasCtx = this.outputCanvas.getContext('2d');
        
        this.hands = null;
        this.camera = null;
        
        // 手势状态
        this.leftHandVisible = false;
        this.rightHandVisible = false;
        this.leftHandLandmarks = null;
        this.rightHandLandmarks = null;
        
        // 手指位置
        this.leftIndexTip = null;
        this.leftMiddleTip = null;
        
        // 右手控制相关
        this.rightHandPrevPosition = null;
        this.rightHandPinchState = false; // 捏合状态
        this.rightHandPinchStarted = false; // 是否开始捏合
        this.isPinchGestureSwitchAllowed = true; // 防止频繁切换
        this.pinchThreshold = 0.1; // 捏合阈值
        
        // 骨骼线显示控制
        this.isSkeletonVisible = false;
        
        // 回调函数
        this.onLeftHandUpdate = null;
        this.onRightHandMove = null;
        this.onPlanetSwitch = null;
        
        // 初始化
        this.setupMediaPipe();
    }
    
    // 设置骨骼线是否显示
    setSkeletonVisible(isVisible) {
        this.isSkeletonVisible = isVisible;
    }
    
    // 设置MediaPipe
    setupMediaPipe() {
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        
        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.hands.onResults((results) => this.onResults(results));
        
        this.camera = new Camera(this.video, {
            onFrame: async () => {
                await this.hands.send({ image: this.video });
            },
            width: 1280,
            height: 720
        });
        
        this.camera.start();
    }
    
    // 处理识别结果
    onResults(results) {
        // 调整Canvas尺寸
        if (this.outputCanvas.width !== this.video.videoWidth || 
            this.outputCanvas.height !== this.video.videoHeight) {
            this.outputCanvas.width = this.video.videoWidth;
            this.outputCanvas.height = this.video.videoHeight;
        }
        
        // 清除Canvas
        this.canvasCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        
        // 重置手部状态
        const wasLeftHandVisible = this.leftHandVisible;
        this.leftHandVisible = false;
        this.rightHandVisible = false;
        this.leftHandLandmarks = null;
        this.rightHandLandmarks = null;
        
        // 绘制手部标记
        if (results.multiHandLandmarks) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i].label;
                
                // 只在开启状态下绘制手部关键点和连接线
                if (this.isSkeletonVisible) {
                    this.drawLandmarks(landmarks);
                }
                
                // 区分左右手
                if (handedness === 'Left') { // 镜像模式下，屏幕中的"左手"实际是右手
                    this.rightHandVisible = true;
                    this.rightHandLandmarks = landmarks;
                    this.processRightHand(landmarks);
                } else if (handedness === 'Right') { // 镜像模式下，屏幕中的"右手"实际是左手
                    this.leftHandVisible = true;
                    this.leftHandLandmarks = landmarks;
                    this.processLeftHand(landmarks);
                }
            }
        }
        
        // 如果左手从可见变为不可见，调用回调通知
        if (wasLeftHandVisible && !this.leftHandVisible && this.onLeftHandUpdate) {
            this.onLeftHandUpdate(null); // 传递null表示左手不可见
        }
        
        // 没有检测到手时，重置状态
        if (!this.leftHandVisible) {
            this.leftIndexTip = null;
            this.leftMiddleTip = null;
        }
        
        if (!this.rightHandVisible) {
            this.rightHandPrevPosition = null;
            this.rightHandPinchState = false;
            this.rightHandPinchStarted = false;
        }
    }
    
    // 绘制手部标记
    drawLandmarks(landmarks) {
        this.canvasCtx.fillStyle = 'white';
        this.canvasCtx.strokeStyle = 'white';
        this.canvasCtx.lineWidth = 2;
        
        // 绘制关键点
        for (const landmark of landmarks) {
            const x = landmark.x * this.outputCanvas.width;
            const y = landmark.y * this.outputCanvas.height;
            
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
            this.canvasCtx.fill();
        }
        
        // 绘制连接线
        this.canvasCtx.beginPath();
        this.drawConnections(landmarks);
        this.canvasCtx.stroke();
    }
    
    // 绘制手指连接线
    drawConnections(landmarks) {
        // 定义手指关节的连接关系
        const connections = [
            // 拇指
            [0, 1], [1, 2], [2, 3], [3, 4],
            // 食指
            [0, 5], [5, 6], [6, 7], [7, 8],
            // 中指
            [0, 9], [9, 10], [10, 11], [11, 12],
            // 无名指
            [0, 13], [13, 14], [14, 15], [15, 16],
            // 小指
            [0, 17], [17, 18], [18, 19], [19, 20],
            // 手掌连接
            [0, 5], [5, 9], [9, 13], [13, 17]
        ];
        
        for (const [start, end] of connections) {
            const startX = landmarks[start].x * this.outputCanvas.width;
            const startY = landmarks[start].y * this.outputCanvas.height;
            const endX = landmarks[end].x * this.outputCanvas.width;
            const endY = landmarks[end].y * this.outputCanvas.height;
            
            this.canvasCtx.moveTo(startX, startY);
            this.canvasCtx.lineTo(endX, endY);
        }
    }
    
    // 处理左手（实际是屏幕中的右手）
    processLeftHand(landmarks) {
        // 获取食指和中指指尖位置
        this.leftIndexTip = {
            x: landmarks[8].x,
            y: landmarks[8].y,
            z: landmarks[8].z
        };
        
        this.leftMiddleTip = {
            x: landmarks[12].x,
            y: landmarks[12].y,
            z: landmarks[12].z
        };
        
        // 计算食指和中指中间点
        const midPoint = {
            x: (this.leftIndexTip.x + this.leftMiddleTip.x) / 2,
            y: (this.leftIndexTip.y + this.leftMiddleTip.y) / 2,
            z: (this.leftIndexTip.z + this.leftMiddleTip.z) / 2
        };
        
        // 计算手掌中心点的Z值（用于确定手与摄像头的距离）
        // 使用手掌关键点的平均Z值作为手的距离
        // landmarks[0]是手腕点，我们将它和几个指根关键点一起计算
        const handDepth = (landmarks[0].z + landmarks[5].z + landmarks[9].z + landmarks[13].z + landmarks[17].z) / 5;
        midPoint.handDepth = handDepth; // 将手部深度信息添加到中点数据中
        
        // 标记中间点（只在开启骨骼线时显示）
        if (this.isSkeletonVisible) {
            const x = midPoint.x * this.outputCanvas.width;
            const y = midPoint.y * this.outputCanvas.height;
            
            this.canvasCtx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(x, y, 15, 0, 2 * Math.PI);
            this.canvasCtx.fill();
        }
        
        // 调用左手更新回调
        if (this.onLeftHandUpdate) {
            this.onLeftHandUpdate(midPoint);
        }
    }
    
    // 处理右手（实际是屏幕中的左手）
    processRightHand(landmarks) {
        // 获取拇指和食指指尖位置
        const thumbTip = {
            x: landmarks[4].x,
            y: landmarks[4].y,
            z: landmarks[4].z
        };
        
        const indexTip = {
            x: landmarks[8].x,
            y: landmarks[8].y,
            z: landmarks[8].z
        };
        
        // 计算手部中心位置（使用手掌中心点而不是手腕点）
        // 这样能更好地表示手的实际位置
        const handCenter = {
            x: (landmarks[0].x + landmarks[9].x) / 2, // 使用手腕和中指根部的中点
            y: (landmarks[0].y + landmarks[9].y) / 2,
            z: (landmarks[0].z + landmarks[9].z) / 2
        };
        
        // 计算拇指和食指距离（捏合检测）
        const pinchDistance = this.distance3D(thumbTip, indexTip);
        const currentPinchState = pinchDistance < this.pinchThreshold;
        
        // 检测捏合手势变化
        if (currentPinchState && !this.rightHandPinchState) {
            this.rightHandPinchStarted = true;
        } else if (!currentPinchState && this.rightHandPinchState && this.rightHandPinchStarted) {
            // 捏合结束，执行切换星球的操作
            if (this.isPinchGestureSwitchAllowed && this.onPlanetSwitch) {
                this.onPlanetSwitch();
                
                // 防止频繁切换
                this.isPinchGestureSwitchAllowed = false;
                setTimeout(() => {
                    this.isPinchGestureSwitchAllowed = true;
                }, 1000);
            }
            
            this.rightHandPinchStarted = false;
        }
        
        // 更新捏合状态
        this.rightHandPinchState = currentPinchState;
        
        // 绘制捏合状态指示器（只在开启骨骼线时显示）
        if (currentPinchState && this.isSkeletonVisible) {
            const midX = (thumbTip.x + indexTip.x) / 2 * this.outputCanvas.width;
            const midY = (thumbTip.y + indexTip.y) / 2 * this.outputCanvas.height;
            
            this.canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(midX, midY, 20, 0, 2 * Math.PI);
            this.canvasCtx.fill();
        }
        
        // 处理手部移动控制星球旋转
        if (this.rightHandPrevPosition) {
            // 计算手部移动的差值，并翻转方向以匹配预期的旋转方向
            const deltaX = -(handCenter.x - this.rightHandPrevPosition.x);
            const deltaY = -(handCenter.y - this.rightHandPrevPosition.y);
            
            // 降低最小移动阈值，使旋转更加灵敏
            const minMovement = 0.0025; // 降低最小移动阈值
            if (this.onRightHandMove && !currentPinchState && 
                (Math.abs(deltaX) > minMovement || Math.abs(deltaY) > minMovement)) {
                this.onRightHandMove(deltaX, deltaY);
            }
        }
        
        // 更新前一帧手部位置
        this.rightHandPrevPosition = handCenter;
    }
    
    // 3D空间中两点距离
    distance3D(point1, point2) {
        return Math.sqrt(
            Math.pow(point1.x - point2.x, 2) +
            Math.pow(point1.y - point2.y, 2) +
            Math.pow(point1.z - point2.z, 2)
        );
    }
    
    // 设置左手更新回调
    setLeftHandUpdateCallback(callback) {
        this.onLeftHandUpdate = callback;
    }
    
    // 设置右手移动回调
    setRightHandMoveCallback(callback) {
        this.onRightHandMove = callback;
    }
    
    // 设置星球切换回调
    setPlanetSwitchCallback(callback) {
        this.onPlanetSwitch = callback;
    }

    // 获取右手是否可见
    isRightHandVisible() {
        return this.rightHandVisible;
    }
} 