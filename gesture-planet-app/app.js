// 应用主类
class GesturePlanetApp {
    constructor() {
        // 初始化Three.js
        this.initThreeJS();
        
        // 初始化行星系统
        this.planetSystem = new PlanetSystem();
        this.planetSystem.initScene(this.scene, document.getElementById('planet-container'));
        
        // 初始化手势控制
        this.handGestureController = new HandGestureController();
        this.setupHandGestureCallbacks();
        
        // 初始化骨骼线显示状态
        const skeletonToggle = document.getElementById('skeleton-toggle');
        this.handGestureController.setSkeletonVisible(skeletonToggle.checked);
        
        // 开始动画循环
        this.animate();
        
        // 添加窗口调整事件监听
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    // 初始化Three.js环境
    initThreeJS() {
        // 创建场景
        this.scene = new THREE.Scene();
        
        // 创建正交相机，消除透视畸变
        const aspectRatio = window.innerWidth / window.innerHeight;
        const viewSize = 20; // 设置视图大小
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspectRatio / 2, // left
            viewSize * aspectRatio / 2,  // right
            viewSize / 2,               // top
            -viewSize / 2,              // bottom
            0.1,                        // near
            1000                        // far
        );
        this.camera.position.z = 10;
        
        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0);
        
        // 添加渲染器到DOM
        const container = document.getElementById('planet-container');
        container.appendChild(this.renderer.domElement);
        
        // 添加光源
        this.addLights();
    }
    
    // 添加场景光源
    addLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambientLight);
        
        // 平行光（模拟太阳光）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(5, 3, 5);
        this.scene.add(directionalLight);
        
        // 辅助光源
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-5, -3, 5);
        this.scene.add(pointLight);
    }
    
    // 设置手势控制回调
    setupHandGestureCallbacks() {
        // 初始化深度指示器
        const depthIndicator = document.getElementById('depth-indicator');
        const depthBar = document.getElementById('depth-bar');
        
        // 如果找到深度指示器元素，显示它
        if (depthIndicator && depthBar) {
            depthIndicator.style.display = 'flex';
        }
        
        // 处理左手位置更新（更新星球位置和大小）
        this.handGestureController.setLeftHandUpdateCallback((midPoint) => {
            // 检查midPoint是否为null，表示没有检测到左手
            if (!midPoint) {
                // 当左手不可见时，将星球移回屏幕中央
                const planet = this.planetSystem.getCurrentPlanet();
                if (planet) {
                    // 平滑移动回中央位置
                    planet.position.lerp(new THREE.Vector3(0, 0, 0), 0.1);
                    // 平滑恢复正常大小
                    planet.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
                }
                return;
            }
            
            // 以下是有左手输入时的处理
            // 将视频空间中的手指位置映射到正交相机空间
            // 计算屏幕空间的坐标
            // 对于正交相机，我们需要映射到相机的视图空间
            const viewSize = 20; // 与相机设置相同
            const aspectRatio = window.innerWidth / window.innerHeight;
            
            // 计算映射到整个视图的坐标
            const planetPosX = (midPoint.x - 0.5) * viewSize * aspectRatio * -1; // 维持左右方向一致
            
            // 添加向上的偏移量，使星球显示在手指上方
            const verticalOffset = -5; // 向上偏移量，可根据需要调整
            const planetPosY = (midPoint.y - 0.5) * viewSize * -1 - verticalOffset; // 维持上下方向一致，并向上偏移
            
            const planetPosZ = 0; // 在正交相机中，Z位置不会影响大小，保持在相机前方即可
            
            // 根据手的深度信息计算星球缩放因子
            
            // 深度范围设置 - 缩小为原来的三分之一左右，集中在更常用的区域
            // 原始范围为 -0.1 到 0.1，现在缩小到约三分之一的范围
            const minHandDepth = -0.06;  // 当手靠近摄像头时（更近的负值）
            const maxHandDepth = 0.01;   // 当手远离摄像头时（更远的正值）
            const minScale = 0.5;       // 当手远离摄像头时的最小缩放
            const maxScale = 2.4;       // 当手靠近摄像头时的最大缩放
            const defaultScale = 1.0;   // 默认缩放值
            
            // 获取手部深度值
            const handDepth = midPoint.handDepth || 0;
            
            // 将手部深度映射到缩放范围
            // 手部深度越小（越靠近摄像头），星球缩放越大
            let scale = defaultScale;
            let depthPercentage = 50; // 默认百分比
            
            if (handDepth <= minHandDepth) {
                scale = maxScale; // 手非常靠近时，使用最大缩放
                depthPercentage = 0; // 最近
            } else if (handDepth >= maxHandDepth) {
                scale = minScale; // 手非常远时，使用最小缩放
                depthPercentage = 100; // 最远
            } else {
                // 在最小和最大深度之间，使用非线性插值计算缩放值
                const depthRange = maxHandDepth - minHandDepth;
                const depthFactor = (handDepth - minHandDepth) / depthRange;
                
                // 使用平方关系使变化更加明显
                const enhancedFactor = Math.pow(depthFactor, 1.2);
                scale = maxScale - enhancedFactor * (maxScale - minScale);
                depthPercentage = depthFactor * 100;
            }
            
            // 更新深度指示器
            if (depthBar) {
                depthBar.style.width = `${depthPercentage}%`;
            }
            
            const planet = this.planetSystem.getCurrentPlanet();
            if (planet) {
                // 保存星球当前位置用于计算移动距离
                const currentPos = planet.position.clone();
                const newPos = new THREE.Vector3(planetPosX, planetPosY, planetPosZ);
                
                // 计算新位置与当前位置之间的距离
                const distanceSquared = currentPos.distanceToSquared(newPos);
                
                // 定义微小移动的阈值（平方距离，避免开平方根运算）
                const movementThreshold = 0.1; // 增加阈值使抖动过滤更明显
                
                // 仅当移动超过阈值时才更新位置，忽略微小抖动
                if (distanceSquared > movementThreshold) {
                    // 平滑移动星球到新位置，但减少插值系数使移动更平滑
                    planet.position.lerp(newPos, 0.4);
                }
                
                // 平滑调整星球大小（这个可以保持敏感，不需要抖动过滤）
                planet.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.3);
            }
        });
        
        // 处理右手移动（控制星球旋转）
        this.handGestureController.setRightHandMoveCallback((deltaX, deltaY) => {
            this.planetSystem.rotatePlanet(deltaX * 25, deltaY * 25);
        });
        
        // 处理星球切换
        this.handGestureController.setPlanetSwitchCallback(() => {
            this.planetSystem.nextPlanet();
        });
        
        // 设置骨骼线显示开关监听
        const skeletonToggle = document.getElementById('skeleton-toggle');
        skeletonToggle.addEventListener('change', (event) => {
            this.handGestureController.setSkeletonVisible(event.target.checked);
        });
    }
    
    // 窗口大小调整处理
    onWindowResize() {
        // 更新正交相机的宽高比
        const aspectRatio = window.innerWidth / window.innerHeight;
        const viewSize = 20;
        
        this.camera.left = -viewSize * aspectRatio / 2;
        this.camera.right = viewSize * aspectRatio / 2;
        this.camera.top = viewSize / 2;
        this.camera.bottom = -viewSize / 2;
        this.camera.updateProjectionMatrix();
        
        // 更新渲染器尺寸
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // 动画循环
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // 检查右手是否可见，如果可见则停止自转，完全由右手控制旋转
        const rightHandVisible = this.handGestureController.isRightHandVisible();
        const enableAutoRotation = !rightHandVisible;
        
        // 更新行星旋转 - 根据右手是否可见决定是否启用自动旋转
        this.planetSystem.update(3.0, enableAutoRotation);
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }
}

// 等待DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 检查浏览器是否支持所需API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('您的浏览器不支持摄像头访问，请使用Chrome、Firefox或Edge最新版本。');
        return;
    }
    
    // 初始化操作说明切换功能
    const toggleInstructionsBtn = document.getElementById('toggle-instructions');
    const instructionsPanel = document.getElementById('instructions-panel');
    
    if (toggleInstructionsBtn && instructionsPanel) {
        toggleInstructionsBtn.addEventListener('click', () => {
            instructionsPanel.classList.toggle('hidden');
            toggleInstructionsBtn.textContent = 
                instructionsPanel.classList.contains('hidden') 
                    ? '显示操作说明' 
                    : '隐藏操作说明';
        });
    }
    
    // 请求摄像头权限
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
            // 权限获取成功，初始化应用
            const app = new GesturePlanetApp();
        })
        .catch((error) => {
            console.error('无法访问摄像头:', error);
            alert('无法访问摄像头，请确保已授予权限并且摄像头未被其他应用占用。');
        });
}); 