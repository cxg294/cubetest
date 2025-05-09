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
        
        // 视频实际显示区域计算
        this.videoDisplayRect = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        
        // 初始化
        this.setupMediaPipe();
        
        // 添加窗口调整大小监听器，确保Canvas尺寸与视频一致
        window.addEventListener('resize', this.updateCanvasSize.bind(this));
        
        // 初始更新一次Canvas尺寸
        setTimeout(() => this.updateCanvasSize(), 500);
    }
    
    // 更新Canvas尺寸以匹配视频
    updateCanvasSize() {
        if (this.video && this.outputCanvas) {
            // 获取视频容器的实际显示尺寸
            const videoContainer = document.getElementById('video-container');
            const containerWidth = videoContainer.clientWidth;
            const containerHeight = videoContainer.clientHeight;
            
            // 设置Canvas与容器相同尺寸
            this.outputCanvas.width = containerWidth;
            this.outputCanvas.height = containerHeight;
            
            // 获取视频元素的实际边界
            const videoBoundingRect = this.video.getBoundingClientRect();
            const containerRect = videoContainer.getBoundingClientRect();
            
            // 计算视频在容器中的相对位置（考虑object-fit: cover）
            const videoAspect = this.video.videoWidth / this.video.videoHeight;
            const containerAspect = containerWidth / containerHeight;
            
            // 计算视频实际显示区域（考虑object-fit: cover裁剪）
            if (containerAspect > videoAspect) {
                // 容器比视频更宽，视频按宽度填充，高度可能溢出
                const displayHeight = containerWidth / videoAspect;
                const yOffset = (displayHeight - containerHeight) / 2;
                
                this.videoDisplayRect = {
                    x: 0,
                    y: -yOffset,
                    width: containerWidth,
                    height: displayHeight
                };
            } else {
                // 容器比视频更高，视频按高度填充，宽度可能溢出
                const displayWidth = containerHeight * videoAspect;
                const xOffset = (displayWidth - containerWidth) / 2;
                
                this.videoDisplayRect = {
                    x: -xOffset,
                    y: 0,
                    width: displayWidth,
                    height: containerHeight
                };
            }
            
            // 额外调试 - 将视频区域标记出来
            if (this.isSkeletonVisible) {
                console.log("视频显示区域:", this.videoDisplayRect);
                console.log("容器尺寸:", {width: containerWidth, height: containerHeight});
                console.log("视频原始比例:", videoAspect);
                console.log("容器比例:", containerAspect);
            }
        }
    }
    
    // 设置骨骼线是否显示
    setSkeletonVisible(isVisible) {
        this.isSkeletonVisible = isVisible;
    }
    
    // 设置MediaPipe
    setupMediaPipe() {
        this.hands = new Hands({
            locateFile: (file) => {
                return `libs/hands_models/${file}`;
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
    
    // 将规范化坐标映射到实际显示区域
    mapCoordinateToDisplay(x, y) {
        // 从标准化坐标 [0,1] 转换到显示区域坐标
        const displayX = this.videoDisplayRect.x + x * this.videoDisplayRect.width;
        const displayY = this.videoDisplayRect.y + y * this.videoDisplayRect.height;
        
        return { x: displayX, y: displayY };
    }
    
    // 处理识别结果
    onResults(results) {
        // 更新Canvas尺寸，确保与视频容器一致
        this.updateCanvasSize();
        
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
        
        // 在视频区域上绘制边界指示（仅在调试模式开启时）
        if (this.isSkeletonVisible) {
            this.drawVideoAreaDebug();
        }
    }
    
    // 绘制视频区域调试边框
    drawVideoAreaDebug() {
        // 绘制视频实际显示区域的边界
        this.canvasCtx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        this.canvasCtx.lineWidth = 1;
        this.canvasCtx.strokeRect(
            this.videoDisplayRect.x,
            this.videoDisplayRect.y,
            this.videoDisplayRect.width,
            this.videoDisplayRect.height
        );
    }
    
    // 绘制手部标记
    drawLandmarks(landmarks) {
        this.canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.canvasCtx.lineWidth = 2;
        
        // 绘制关键点
        for (const landmark of landmarks) {
            // 使用新的坐标映射函数
            const mappedPos = this.mapCoordinateToDisplay(landmark.x, landmark.y);
            
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(mappedPos.x, mappedPos.y, 4, 0, 2 * Math.PI);
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
            // 使用新的坐标映射函数
            const startPos = this.mapCoordinateToDisplay(landmarks[start].x, landmarks[start].y);
            const endPos = this.mapCoordinateToDisplay(landmarks[end].x, landmarks[end].y);
            
            this.canvasCtx.moveTo(startPos.x, startPos.y);
            this.canvasCtx.lineTo(endPos.x, endPos.y);
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
            // 使用新的坐标映射函数
            const mappedMidPoint = this.mapCoordinateToDisplay(midPoint.x, midPoint.y);
            
            this.canvasCtx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(mappedMidPoint.x, mappedMidPoint.y, 12, 0, 2 * Math.PI);
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
            // 使用新的坐标映射函数
            const midX = (thumbTip.x + indexTip.x) / 2;
            const midY = (thumbTip.y + indexTip.y) / 2;
            const mappedPos = this.mapCoordinateToDisplay(midX, midY);
            
            this.canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(mappedPos.x, mappedPos.y, 15, 0, 2 * Math.PI);
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