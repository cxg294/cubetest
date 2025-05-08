// 全局变量
let videoElement, canvasElement, canvasCtx;
let hands, faceMesh;
let camera;
let loadingElement;
let pixiApp, fireContainer, iceContainer, laserContainer, dogEmojisContainer;

// 特效相关资源
const DOG_EMOJI = '🐶';
const dogEmojis = [];
const leftHandLandmarks = [];
const rightHandLandmarks = [];
let faceLandmarks = null;

// 手势状态
let leftHandFist = false;
let rightHandFist = false;
let leftHandFingerExtended = false;
let rightHandFingerExtended = false;
let bothHandsFingerExtended = false;
let mouthOpen = false;

// 添加历史轨迹记录
const fireTrailPositions = [];
const iceTrailPositions = [];
const maxTrailLength = 10; // 拖尾长度

// 初始化函数
async function init() {
    // 获取DOM元素
    videoElement = document.getElementById('video');
    canvasElement = document.getElementById('canvas');
    loadingElement = document.getElementById('loading');
    canvasCtx = canvasElement.getContext('2d');

    // 初始化MediaPipe手势识别
    hands = new Hands({
        locateFile: (file) => {
            // 直接使用CDN加载模型文件
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });
    
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    hands.onResults(onHandsResults);

    // 初始化MediaPipe人脸识别
    faceMesh = new FaceMesh({
        locateFile: (file) => {
            // 直接使用CDN加载模型文件
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });
    
    faceMesh.setOptions({
        maxNumFaces: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    faceMesh.onResults(onFaceMeshResults);

    // 初始化相机
    camera = new Camera(videoElement, {
        onFrame: async () => {
            try {
                await hands.send({ image: videoElement });
                await faceMesh.send({ image: videoElement });
            } catch (error) {
                console.error('处理视频帧时出错', error);
            }
        },
        width: 1280,
        height: 720
    });

    // 初始化PixiJS特效
    initPixiEffects();

    // 启动相机
    try {
        await camera.start();
        console.log('相机和模型已初始化完成');
        loadingElement.style.display = 'none';
    } catch (error) {
        console.error('启动相机失败', error);
        alert('无法访问相机，请检查相机权限设置');
    }
}

// 初始化PixiJS特效
function initPixiEffects() {
    // 创建PIXI应用
    pixiApp = new PIXI.Application({
        width: canvasElement.width,
        height: canvasElement.height,
        transparent: true,
        view: document.createElement('canvas')
    });
    document.querySelector('.video-container').appendChild(pixiApp.view);
    pixiApp.view.style.position = 'absolute';
    pixiApp.view.style.top = '0';
    pixiApp.view.style.left = '0';
    pixiApp.view.style.width = '100%';
    pixiApp.view.style.height = '100%';
    pixiApp.view.style.transform = 'scaleX(-1)'; // 镜像显示
    pixiApp.view.style.pointerEvents = 'none';
    pixiApp.view.style.zIndex = '5';

    // 创建容器
    fireContainer = new PIXI.Container();
    iceContainer = new PIXI.Container();
    laserContainer = new PIXI.Container();
    dogEmojisContainer = new PIXI.Container();

    pixiApp.stage.addChild(fireContainer);
    pixiApp.stage.addChild(iceContainer);
    pixiApp.stage.addChild(laserContainer);
    pixiApp.stage.addChild(dogEmojisContainer);

    // 启动动画循环
    pixiApp.ticker.add(updateEffects);
}

// 手势识别结果处理
function onHandsResults(results) {
    // 清除上一帧的数据
    leftHandLandmarks.length = 0;
    rightHandLandmarks.length = 0;
    leftHandFist = false;
    rightHandFist = false;
    leftHandFingerExtended = false;
    rightHandFingerExtended = false;
    bothHandsFingerExtended = false;

    // 检测到手时
    if (results.multiHandLandmarks) {
        // 存储所有手的坐标
        let leftHand = null;
        let rightHand = null;
        
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].label;

            if (handedness === 'Left') { // 注意：镜像显示，屏幕上的左手其实是右手
                // 存储右手坐标
                rightHandLandmarks.push(...landmarks);
                rightHand = landmarks;
                // 检测右手是否握拳
                rightHandFist = isHandFist(landmarks);
                // 检测右手食指和中指是否伸出
                rightHandFingerExtended = isIndexAndMiddleFingerExtended(landmarks);
            } else {
                // 存储左手坐标
                leftHandLandmarks.push(...landmarks);
                leftHand = landmarks;
                // 检测左手是否握拳
                leftHandFist = isHandFist(landmarks);
                // 检测左手食指和中指是否伸出
                leftHandFingerExtended = isIndexAndMiddleFingerExtended(landmarks);
            }
        }

        // 检测两只手是否同时伸出食指和中指
        if (leftHand && rightHand) {
            bothHandsFingerExtended = leftHandFingerExtended && rightHandFingerExtended;
        }
    }
}

// 人脸识别结果处理
function onFaceMeshResults(results) {
    faceLandmarks = null;
    mouthOpen = false;

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        faceLandmarks = results.multiFaceLandmarks[0];
        // 检测嘴巴是否张开
        mouthOpen = isMouthOpen(faceLandmarks);
    }
}

// 检测食指和中指是否同时伸出
function isIndexAndMiddleFingerExtended(landmarks) {
    // 指尖、指关节和掌心坐标
    const fingertips = [landmarks[8], landmarks[12]]; // 食指和中指指尖
    const fingerMCP = [landmarks[5], landmarks[9]]; // 食指和中指掌指关节
    const fingerPIP = [landmarks[6], landmarks[10]]; // 食指和中指第一关节
    
    // 计算指尖与掌心的高度差
    const height1 = fingertips[0].y - fingerMCP[0].y;
    const height2 = fingertips[1].y - fingerMCP[1].y;
    
    // 计算指尖与第一关节的高度差
    const pip1 = fingertips[0].y - fingerPIP[0].y;
    const pip2 = fingertips[1].y - fingerPIP[1].y;
    
    // 如果高度差为负值（指尖在掌心上方）且足够大，则认为手指伸出
    return height1 < -0.05 && height2 < -0.05 && pip1 < -0.02 && pip2 < -0.02;
}

// 检测手是否握拳
function isHandFist(landmarks) {
    // 指尖索引
    const fingertips = [4, 8, 12, 16, 20]; // 拇指、食指、中指、无名指、小指指尖
    // 手指第二关节索引
    const secondJoints = [3, 6, 10, 14, 18]; // 对应各手指的第二关节
    // 手掌基部坐标（掌心中心点附近）
    const palmBase = landmarks[0]; // 手腕点
    
    // 计算掌心到指尖的平均距离
    let totalDistance = 0;
    for (let i = 0; i < fingertips.length; i++) {
        const tipPos = landmarks[fingertips[i]];
        const dist = Math.sqrt(
            Math.pow(tipPos.x - palmBase.x, 2) + 
            Math.pow(tipPos.y - palmBase.y, 2) +
            Math.pow(tipPos.z - palmBase.z, 2)
        );
        totalDistance += dist;
    }
    const avgPalmToTipDistance = totalDistance / fingertips.length;
    
    // 检查每个手指的指尖是否接近第二关节（弯曲状态）
    let bentFingerCount = 0;
    for (let i = 0; i < fingertips.length; i++) {
        const tipPos = landmarks[fingertips[i]];
        const jointPos = landmarks[secondJoints[i]];
        
        // 计算指尖到关节的距离
        const fingerBendDistance = Math.sqrt(
            Math.pow(tipPos.x - jointPos.x, 2) + 
            Math.pow(tipPos.y - jointPos.y, 2) +
            Math.pow(tipPos.z - jointPos.z, 2)
        );
        
        // 如果指尖靠近关节或者指尖在掌心附近，则认为手指弯曲
        if (fingerBendDistance < 0.05 || 
            Math.sqrt(Math.pow(tipPos.x - palmBase.x, 2) + 
                     Math.pow(tipPos.y - palmBase.y, 2)) < avgPalmToTipDistance * 0.6) {
            bentFingerCount++;
        }
    }
    
    // 大部分手指弯曲时，认为是握拳状态
    return bentFingerCount >= 4;
}

// 检测嘴巴是否张开
function isMouthOpen(landmarks) {
    const upperLip = landmarks[13]; // 上嘴唇中点
    const lowerLip = landmarks[14]; // 下嘴唇中点
    
    // 计算嘴唇间距
    const distance = Math.sqrt(
        Math.pow(upperLip.x - lowerLip.x, 2) + 
        Math.pow(upperLip.y - lowerLip.y, 2)
    );
    
    // 如果距离大于阈值，认为嘴巴张开
    return distance > 0.03;
}

// 更新特效
function updateEffects() {
    // 清除上一帧的特效
    fireContainer.removeChildren();
    iceContainer.removeChildren();
    laserContainer.removeChildren();
    
    let laserIsActive = bothHandsFingerExtended && leftHandLandmarks.length > 0 && rightHandLandmarks.length > 0;

    // 检查并更新左手火焰特效
    // 只有在激光特效未激活，并且检测到左手时才显示
    if (leftHandLandmarks.length > 0 && !laserIsActive) { 
        const wristPos = {
            x: leftHandLandmarks[0].x * pixiApp.renderer.width,
            y: leftHandLandmarks[0].y * pixiApp.renderer.height,
            time: Date.now()
        };
        
        fireTrailPositions.push(wristPos);
        while (fireTrailPositions.length > maxTrailLength) {
            fireTrailPositions.shift();
        }

        for (let i = 0; i < fireTrailPositions.length; i++) {
            const pos = fireTrailPositions[i];
            const age = (Date.now() - pos.time) / 1000; 
            const alpha = Math.max(0, 1 - age * 2); 
            if (alpha > 0) {
                createFireEffect(pos, fireContainer, alpha, 0.7 + i * 0.05);
            }
        }
        createFireEffect(leftHandLandmarks[0], fireContainer, 1, 1.2);
    } else {
        fireTrailPositions.length = 0;
    }
    
    // 检查并更新右手冰特效
    // 只有在激光特效未激活，并且检测到右手时才显示
    if (rightHandLandmarks.length > 0 && !laserIsActive) { 
        const wristPos = {
            x: rightHandLandmarks[0].x * pixiApp.renderer.width,
            y: rightHandLandmarks[0].y * pixiApp.renderer.height,
            time: Date.now()
        };
        
        iceTrailPositions.push(wristPos);
        while (iceTrailPositions.length > maxTrailLength) {
            iceTrailPositions.shift();
        }

        for (let i = 0; i < iceTrailPositions.length; i++) {
            const pos = iceTrailPositions[i];
            const age = (Date.now() - pos.time) / 1000; 
            const alpha = Math.max(0, 1 - age * 2); 
            if (alpha > 0) {
                createIceEffect(pos, iceContainer, alpha, 0.7 + i * 0.05);
            }
        }
        createIceEffect(rightHandLandmarks[0], iceContainer, 1, 1.2);
    } else {
        iceTrailPositions.length = 0;
    }
    
    // 检查并创建双手指尖激光特效
    if (laserIsActive) {
        createLaserEffect(leftHandLandmarks[8], rightHandLandmarks[8], laserContainer);
    }
    
    // 检查并更新嘴部狗头emoji特效
    if (mouthOpen && faceLandmarks) {
        if (Math.random() < 0.8) { 
            createDogEmojiEffect(faceLandmarks[13], faceLandmarks[14]);
        }
    }
    
    // 更新现有的狗头emoji
    updateDogEmojis();
    
    // 更新粒子动画
    updateParticles(fireContainer);
    updateParticles(iceContainer);
    updateParticles(laserContainer);
}

// 更新粒子
function updateParticles(container) {
    for (let i = container.children.length - 1; i >= 0; i--) {
        const particle = container.children[i];
        if (particle.update && particle.update()) {
            container.removeChild(particle);
        }
    }
}

// 创建火焰特效
function createFireEffect(landmark, container, alpha = 1, scale = 1) {
    const x = typeof landmark.x === 'number' ? landmark.x * pixiApp.renderer.width : landmark.x;
    const y = typeof landmark.y === 'number' ? landmark.y * pixiApp.renderer.height : landmark.y;
    
    // 增加粒子数量
    for (let i = 0; i < 30; i++) {  // 从 20 增加到 30
        const particle = new PIXI.Graphics();
        const baseSize = (Math.random() * 10 + 5) * scale * 0.8; // 基础尺寸略微减小，以平衡数量增加
        
        // 调整颜色，中心更白亮
        const colors = [
            0xFFFFFF, // 纯白 (最热中心)
            0xFFFFE0, // 淡黄
            0xFFFF77, // 亮黄色
            0xFFDD00, // 金黄色
            0xFF9500, // 橙色
            0xFF5000, // 亮橙色
            0xFF3000, // 橙红色
            0xFF0000, // 红色
            0xCC0000  // 暗红色 (边缘/衰减)
        ];
        
        const distFromCenterRatio = Math.random();
        // 让颜色分布更倾向于热色，但仍有概率出现较冷色
        let colorIndex = Math.floor(Math.pow(distFromCenterRatio, 0.5) * (colors.length -2)); // -2确保不会直接选到最暗的红色
        if (Math.random() < 0.1) { // 小概率出现更边缘的颜色
            colorIndex = colors.length - 1 - Math.floor(Math.random()*2);
        }
        colorIndex = Math.min(colors.length - 1, Math.max(0, colorIndex));


        particle.beginFill(colors[colorIndex]);
        
        // 保持现有形状逻辑，但调整尺寸应用
        const shapeType = Math.floor(Math.random() * 4);
        let size = baseSize * (0.8 + Math.random() * 0.4); // 形状可以有不同的大小变化

        if (shapeType === 0) {
            // 泪滴形火焰
            particle.moveTo(0, -size * 1.5);
            for (let j = 0; j <= 12; j++) {
                const angle = (j / 12) * Math.PI * 2;
                const radius = size * (1 - Math.sin(angle) * 0.5);
                particle.lineTo(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius * 0.8 - size * 0.6
                );
            }
            particle.closePath();
        } else if (shapeType === 1) {
            // 火苗形状
            particle.moveTo(0, -size * 1.8);
            const points = [0, -size * 1.8];
            for (let j = 1; j <= 5; j++) {
                const waveHeight = size * 0.2 * Math.sin(j * Math.PI * 0.5);
                points.push(-size + j * (size * 0.4), size * 0.5 + waveHeight);
            }
            points.push(0, size);
            for (let j = 5; j >= 1; j--) {
                const waveHeight = size * 0.2 * Math.sin(j * Math.PI * 0.4);
                points.push(size - j * (size * 0.4), size * 0.5 + waveHeight);
            }
            particle.drawPolygon(points);
        } else if (shapeType === 2) {
            // 圆形粒子带发光纹理
            particle.drawCircle(0, 0, size);
            particle.beginFill(colors[Math.max(0, colorIndex-1)], 0.7); // 内部用更亮的颜色
            particle.drawCircle(0, 0, size * 0.7);
            particle.beginFill(colors[Math.max(0, colorIndex-2)], 0.5); // 最内部更亮
            particle.drawCircle(0, 0, size * 0.4);
        } else {
            // 不规则多边火苗
            const numPoints = 7 + Math.floor(Math.random() * 5);
            const points = [0, -size * 1.6];
            for (let j = 1; j < numPoints; j++) {
                const angle = (j / numPoints) * Math.PI * 2;
                const radiusX = size * (0.8 + Math.random() * 0.4);
                const radiusY = size * (0.5 + Math.sin(angle) * 0.5);
                points.push(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY);
            }
            particle.drawPolygon(points);
        }
        
        particle.endFill();
        
        const glowFilter = new PIXI.filters.BlurFilter();
        glowFilter.blur = Math.max(2, baseSize * 0.3 + Math.random() * 4); // 模糊与大小关联
        glowFilter.quality = 1; //降低质量以提高性能
        
        const colorMatrix = new PIXI.filters.ColorMatrixFilter();
        colorMatrix.brightness(1.1, false); // 亮度略微降低，因为颜色更白了
        colorMatrix.saturate(1.3, false);
        
        particle.filters = [glowFilter, colorMatrix];
        
        const distance = Math.random() * 25 * scale; // 减小扩散范围，更集中
        const angle = Math.random() * Math.PI * 2;
        particle.x = x + Math.cos(angle) * distance;
        particle.y = y + Math.sin(angle) * distance - size * 0.5; 
        
        const centerBrightness = Math.max(0, 1 - distance / (30 * scale));
        particle.alpha = (0.3 + centerBrightness * 0.7) * alpha; // 基础alpha略微降低
        
        particle.rotation = Math.random() * Math.PI * 2;
        
        // 调整粒子运动：更强的初始向上速度，轻微水平摇摆
        particle.vx = (Math.random() - 0.5) * 1.5; // 水平速度范围增大
        particle.vy = -Math.random() * 1.5 - 1.0; // 初始向上速度增大
        particle.vr = (Math.random() - 0.5) * 0.07; 
        particle.life = Math.random() * 25 + 25; // 生命周期略微延长
        particle.maxLife = particle.life;
        particle.g = 0.03 + Math.random() * 0.02; // 添加一点重力，使火焰有下落趋势
        
        particle.update = () => {
            particle.vx *= 0.98; // 空气阻力
            particle.vy += particle.g; // 应用重力
            particle.vy *= 0.98; // 空气阻力
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.rotation += particle.vr;
            particle.life -= 0.6; // 衰减速度加快
            
            const lifeRatio = Math.max(0, particle.life / particle.maxLife);
            
            // 生命末期颜色变暗红
            if (lifeRatio < 0.3) {
                const currentColor = particle.fill.color; // This might not be directly accessible or might be complex
                // For simplicity and performance, we'll rely on alpha and scale for fade out
                // and the overall color choice will ensure darker particles are less prominent.
                 const newColorIndex = colors.length - 1 - Math.floor((1-lifeRatio)*2); 
                 // particle.tint = colors[Math.max(colors.length-3,newColorIndex)]; // Tint doesn't work well with complex graphics fills.
                 // Instead of recoloring, rely on alpha and scale to fade, and initial color choice.
            }


            particle.scale.set(lifeRatio * scale * (0.5 + lifeRatio * 0.5)); // 消失时缩小更快
            particle.alpha = lifeRatio * alpha * (0.2 + lifeRatio * 0.8); // 消失时透明度变化更明显
            
            if (particle.life <= 0) {
                return true;
            }
            return false;
        };
        
        container.addChild(particle);
    }
}

// 创建冰特效
function createIceEffect(landmark, container, alpha = 1, scale = 1) {
    const x = typeof landmark.x === 'number' ? landmark.x * pixiApp.renderer.width : landmark.x;
    const y = typeof landmark.y === 'number' ? landmark.y * pixiApp.renderer.height : landmark.y;
    
    // 增加粒子数量
    for (let i = 0; i < 30; i++) { // 从 20 增加到 30
        const particle = new PIXI.Graphics();
        const baseSize = (Math.random() * 10 + 5) * scale * 0.8; // 与火焰协调

        const colors = [
            0xFFFFFF, // 纯白色
            0xFAFFFF, // 极淡的青色
            0xEEFFFF, // 微蓝白色
            0xDDFAFF, // 更淡的青蓝
            0xCCEEFF, // 淡蓝色
            0xAADDFF, // 浅蓝色
            0x88CCFF, // 中蓝色
            0x77AADD  // 稍暗的蓝色
        ];
        
        const distFromCenterRatio = Math.random();
        let colorIndex = Math.floor(Math.pow(distFromCenterRatio, 0.6) * colors.length);
        colorIndex = Math.min(colors.length - 1, Math.max(0, colorIndex));
        
        particle.beginFill(colors[colorIndex], 0.7 + Math.random() * 0.3); // 增加随机透明度，营造冰的通透感
        
        // 冰晶形状 - 多边形或星形
        const shapeType = Math.floor(Math.random() * 3);
        let size = baseSize * (0.7 + Math.random() * 0.6);

        if (shapeType === 0) { // 尖锐的多边形
            const numPoints = Math.floor(Math.random() * 3) + 5; // 5到7个顶点
            const points = [];
            for (let j = 0; j < numPoints; j++) {
                const angle = (j / numPoints) * Math.PI * 2;
                const radius = size * (0.6 + Math.random() * 0.4); // 半径随机变化
                points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
            }
            particle.drawPolygon(points);
        } else if (shapeType === 1) { // 简单的六边形 (模拟雪花基础)
            const points = [];
            for (let j = 0; j < 6; j++) {
                const angle = Math.PI / 3 * j;
                points.push(Math.cos(angle) * size, Math.sin(angle) * size);
            }
            particle.drawPolygon(points);
            // 添加中心点，使其更像晶体
            particle.beginFill(colors[Math.max(0, colorIndex -1)], 0.5 + Math.random()*0.3);
            particle.drawCircle(0,0, size*0.3);

        } else { // 细长碎片
            const w = size * (0.3 + Math.random() * 0.4);
            const h = size * (1.5 + Math.random() * 0.8);
            particle.drawRect(-w / 2, -h / 2, w, h);
        }
        
        particle.endFill();
        
        // 冰晶可以不需要太强的模糊，或者用不同的滤镜
        const glowFilter = new PIXI.filters.BlurFilter();
        glowFilter.blur = Math.max(1, baseSize * 0.1 + Math.random() * 2);
        glowFilter.quality = 1; 

        // 尝试使用 Alpha滤镜给边缘一些剔透感
        // const alphaFilter = new PIXI.filters.AlphaFilter(0.8); 
        // particle.filters = [glowFilter, alphaFilter];
        particle.filters = [glowFilter]; // 暂时只用模糊

        const distance = Math.random() * 30 * scale; // 扩散范围
        const angle = Math.random() * Math.PI * 2;
        particle.x = x + Math.cos(angle) * distance;
        particle.y = y + Math.sin(angle) * distance;
        
        particle.alpha = (0.4 + Math.random() * 0.5) * alpha; // 基础alpha
        particle.rotation = Math.random() * Math.PI * 2;
        
        // 粒子运动：缓慢漂浮、旋转，轻微受重力影响下落
        particle.vx = (Math.random() - 0.5) * 0.8;
        particle.vy = (Math.random() - 0.5) * 0.8 - 0.2; // 轻微向上或向下，整体略微漂浮
        particle.vr = (Math.random() - 0.5) * 0.04; // 旋转速度
        particle.life = Math.random() * 30 + 30; // 生命周期
        particle.maxLife = particle.life;
        particle.g = 0.01 + Math.random() * 0.01; // 更轻的重力

        // 闪烁效果控制
        particle.blinkSpeed = Math.random() * 0.1 + 0.05;
        particle.blinkPhase = Math.random() * Math.PI;
        
        particle.update = () => {
            particle.vy += particle.g; // 应用重力
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.rotation += particle.vr;
            particle.life -= 0.5;
            
            const lifeRatio = Math.max(0, particle.life / particle.maxLife);
            
            // 闪烁效果
            const blink = (Math.sin(particle.life * particle.blinkSpeed + particle.blinkPhase) + 1) / 2; // 0 to 1
            particle.alpha = lifeRatio * alpha * (0.3 + blink * 0.7);

            particle.scale.set(lifeRatio * scale);
            
            return particle.life <= 0;
        };
        
        container.addChild(particle);
    }
}

// 创建激光特效
function createLaserEffect(leftFinger, rightFinger, container) {
    // 计算两个指尖的位置
    const leftX = leftFinger.x * pixiApp.renderer.width;
    const leftY = leftFinger.y * pixiApp.renderer.height;
    const rightX = rightFinger.x * pixiApp.renderer.width;
    const rightY = rightFinger.y * pixiApp.renderer.height;
    
    // 创建主光束
    const beam = new PIXI.Graphics();
    
    // 计算激光颜色（随时间变化）
    const hue = (Date.now() / 50) % 360;
    const color = hslToHex(hue, 100, 50);
    
    // 绘制激光主光束
    beam.lineStyle({
        width: 4,
        color: color,
        alpha: 0.8,
        join: PIXI.LINE_JOIN.ROUND,
        cap: PIXI.LINE_CAP.ROUND
    });
    
    beam.moveTo(leftX, leftY);
    beam.lineTo(rightX, rightY);
    
    // 添加外层光束（更宽但透明度更低）
    beam.lineStyle({
        width: 8,
        color: color,
        alpha: 0.4,
        join: PIXI.LINE_JOIN.ROUND,
        cap: PIXI.LINE_CAP.ROUND
    });
    
    beam.moveTo(leftX, leftY);
    beam.lineTo(rightX, rightY);
    
    // 光束发光效果
    const glowFilter = new PIXI.filters.BlurFilter();
    glowFilter.blur = 6;
    glowFilter.quality = 2;
    beam.filters = [glowFilter];
    
    container.addChild(beam);
    
    // 添加指尖发光点
    createLaserEndpoint(leftX, leftY, color, container);
    createLaserEndpoint(rightX, rightY, color, container);
    
    // 添加激光粒子效果
    createLaserParticles(leftX, leftY, rightX, rightY, color, container);
}

// 创建激光端点发光效果
function createLaserEndpoint(x, y, color, container) {
    // 创建发光圆
    const glow = new PIXI.Graphics();
    glow.beginFill(color, 0.7);
    glow.drawCircle(0, 0, 10);
    glow.endFill();
    
    // 创建内圈
    glow.beginFill(0xFFFFFF, 0.9);
    glow.drawCircle(0, 0, 5);
    glow.endFill();
    
    glow.x = x;
    glow.y = y;
    
    // 发光效果
    const glowFilter = new PIXI.filters.BlurFilter();
    glowFilter.blur = 8;
    glowFilter.quality = 2;
    glow.filters = [glowFilter];
    
    // 添加脉动动画
    glow.pulseTime = Math.random() * Math.PI * 2;
    glow.pulseSpeed = 0.1;
    glow.baseScale = 1;
    
    glow.update = () => {
        glow.pulseTime += glow.pulseSpeed;
        
        // 脉动效果
        const pulse = 0.2 * Math.sin(glow.pulseTime);
        glow.scale.set(glow.baseScale + pulse);
        
        return false; // 不移除
    };
    
    container.addChild(glow);
}

// 创建激光粒子
function createLaserParticles(startX, startY, endX, endY, color, container) {
    // 计算激光线长度
    const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    
    // 创建沿线的粒子
    for (let i = 0; i < length / 15; i++) {
        const particle = new PIXI.Graphics();
        const size = 2 + Math.random() * 3;
        
        // 随机偏移
        const offset = Math.random() * 4 - 2;
        const progress = Math.random();
        
        // 计算粒子初始位置
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;
        
        // 计算垂直于激光的方向
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / length; // 法线向量x
        const ny = dx / length;  // 法线向量y
        
        // 应用垂直偏移
        particle.x = x + nx * offset;
        particle.y = y + ny * offset;
        
        // 绘制粒子
        particle.beginFill(0xFFFFFF, 0.8);
        particle.drawCircle(0, 0, size);
        particle.endFill();
        
        // 发光效果
        const glowFilter = new PIXI.filters.BlurFilter();
        glowFilter.blur = 2;
        particle.filters = [glowFilter];
        
        // 动画属性
        particle.vx = (Math.random() - 0.5) * 2;
        particle.vy = (Math.random() - 0.5) * 2;
        particle.life = 10 + Math.random() * 10;
        particle.maxLife = particle.life;
        
        // 更新函数
        particle.update = () => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.5;
            
            // 粒子逐渐变小和变透明
            const lifeRatio = particle.life / particle.maxLife;
            particle.scale.set(lifeRatio);
            particle.alpha = lifeRatio;
            
            return particle.life <= 0;
        };
        
        container.addChild(particle);
    }
}

// HSL颜色转换为十六进制
function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (x) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    const hex = (r * 255) << 16 | (g * 255) << 8 | (b * 255);
    return hex;
}

// 创建狗头emoji特效
function createDogEmojiEffect(upperLip, lowerLip) {
    if (!pixiApp || !dogEmojisContainer) return;

    // 计算嘴巴中心点
    const mouthCenterX = (upperLip.x + lowerLip.x) / 2 * pixiApp.renderer.width;
    const mouthCenterY = (upperLip.y + lowerLip.y) / 2 * pixiApp.renderer.height;

    // 简单计算头部朝向：比较鼻子和耳朵的x坐标（假设landmarks[1]是鼻子）
    // 注意：这里的landmark索引可能需要根据faceLandmarks的实际输出来调整
    // 我们需要一个在脸部中心线上且相对稳定的点作为参考，例如鼻子尖 landmarks[1]
    // 和脸颊边缘的点，例如 landmarks[234] (左) 和 landmarks[454] (右) 来判断朝向
    // 或者更简单地，如果知道眼睛的坐标，可以用双眼中心和鼻子的关系
    // 为简化，我们先假设一个粗略的头部方向判断
    let headDirection = 0; // 0: 中间, -1: 向左, 1: 向右

    if (faceLandmarks && faceLandmarks.length > 0) {
        const noseTip = faceLandmarks[1]; // 通常是鼻子尖端
        const leftEyeInner = faceLandmarks[130]; // 左眼内角 // Index for left eye inner corner
        const rightEyeInner = faceLandmarks[359]; // 右眼内角 // Index for right eye inner corner
        
        if (noseTip && leftEyeInner && rightEyeInner) {
            // 视频是镜像的，所以 Canvas 上的坐标也是镜像的
            // 如果鼻子在屏幕上的 x 比双眼中心点更靠右 (实际是人脸朝向左)
            // Canvas X 轴：左小右大
            // 镜像后：视频中人物朝左 -> Canvas上鼻子 X 更大 (更靠右)
            //          视频中人物朝右 -> Canvas上鼻子 X 更小 (更靠左)
            const eyeCenterX = (leftEyeInner.x + rightEyeInner.x) / 2;
            const directionThreshold = 0.01; // 头部偏转的阈值 (归一化坐标)

            if (noseTip.x > eyeCenterX + directionThreshold) {
                headDirection = -1; // 人物实际朝左 (在镜像的Canvas上，鼻子更靠右)
            } else if (noseTip.x < eyeCenterX - directionThreshold) {
                headDirection = 1; // 人物实际朝右 (在镜像的Canvas上，鼻子更靠左)
            }
        }
    }


    const emojiText = new PIXI.Text(DOG_EMOJI, {
        fontSize: 30 + Math.random() * 20, // 随机大小
        fill: 0xffffff
    });
    emojiText.anchor.set(0.5);
    emojiText.x = mouthCenterX;
    emojiText.y = mouthCenterY;

    // 根据头部朝向调整初始速度
    // 由于整体 Canvas 是 scaleX(-1) 镜像的，所以这里的速度方向也要反过来
    // 如果 headDirection = -1 (人物朝左), emoji 在 canvas 上应该向 x 负方向 (左) 飞出
    // 如果 headDirection = 1 (人物朝右), emoji 在 canvas 上应该向 x 正方向 (右) 飞出
    if (headDirection === -1) { // 人物朝左 -> emoji向 Canvas 左方飞
        emojiText.vx = -(Math.random() * 3 + 3); // 速度加强一点
    } else if (headDirection === 1) { // 人物朝右 -> emoji向 Canvas 右方飞
        emojiText.vx = Math.random() * 3 + 3; // 速度加强一点
    } else { // 正对或无法判断
        emojiText.vx = (Math.random() - 0.5) * 2; // 正对时水平速度减小
    }

    emojiText.vy = -(Math.random() * 2 + 2); // 向上飞出速度也加强一点
    emojiText.vr = (Math.random() - 0.5) * 0.15; // 随机旋转略微加快
    emojiText.life = 70 + Math.random() * 40; // 生命周期延长

    dogEmojisContainer.addChild(emojiText);
    dogEmojis.push(emojiText); // 确保在updateDogEmojis中正确处理
}

// 更新狗头emoji
function updateDogEmojis() {
    for (let i = dogEmojis.length - 1; i >= 0; i--) {
        const emoji = dogEmojis[i];
        emoji.x += emoji.vx;
        emoji.y += emoji.vy;
        emoji.rotation += emoji.vr;
        emoji.vy += 0.07; // 重力效果略微增强
        emoji.life--;

        if (emoji.life <= 0 || emoji.y > pixiApp.renderer.height + 50 || emoji.y < -50 || emoji.x < -50 || emoji.x > pixiApp.renderer.width + 50) {
            dogEmojisContainer.removeChild(emoji);
            dogEmojis.splice(i, 1);
        }
    }
}

// 调整画布大小
function onResize() {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    if (pixiApp) {
        pixiApp.renderer.resize(canvasElement.width, canvasElement.height);
    }
}

// 监听窗口大小变化
window.addEventListener('resize', onResize);

// 在页面加载完成后初始化
window.addEventListener('load', init); 