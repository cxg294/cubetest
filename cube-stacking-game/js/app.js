// 全局变量
let GRID_SIZE = 5; // 默认网格大小为5x5
const CUBE_SIZE = 1; // 立方体大小
const GRID_GAP = 0.1; // 网格间隙
let VIEW_SCALE = 1; // 视图缩放比例，减小到原来的一半，视觉效果就会放大两倍

// 游戏相关变量
let gameState = {
    isPlaying: false,
    targetGridData: null, // 目标网格数据（系统生成的）
    difficultyLevel: 'easy', // 难度级别：easy, medium, hard
    hintsUsed: 0 // 使用的提示次数
};

// 场景相关变量
// 学生答题场景
let mainScene, mainCamera, mainRenderer, controls;
// 目标题目场景（三视图）
let targetFrontScene, targetFrontCamera, targetFrontRenderer;
let targetTopScene, targetTopCamera, targetTopRenderer;
let targetLeftScene, targetLeftCamera, targetLeftRenderer;

let cubes = []; // 存储所有创建的立方体
let gridData = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)); // 网格数据，0表示无方块，正数表示方块高度

// 场景元素引用
let gridHelper, axesHelper;
let showGrid = true; // 是否显示网格和坐标轴

// 光照相关
let ambientLight, directionalLight;
let showLighting = true; // 是否启用光照效果

// 颜色和样式配置
let cubeColor = 0x1a73e8;
let edgeColor = 0x000000;
let opacity = 1.0; // 默认不透明
let useColorFaces = false;
let showEdges = true;
let faceColors = {
    top: 0x2196F3,
    bottom: 0x4CAF50,
    front: 0xFF5252,
    back: 0x9C27B0,
    left: 0xFFC107,
    right: 0x795548
};

// 预设样式方案
const stylePresets = {
    standardBlue: {
        cubeColor: '#1a73e8',
        opacity: 1.0,
        edgeColor: '#000000',
        useColorFaces: false,
        showEdges: true,
        showLighting: true,
        faceColors: {
            front: '#FF5252',
            back: '#9C27B0',
            top: '#2196F3',
            bottom: '#4CAF50',
            left: '#FFC107',
            right: '#795548'
        }
    },
    transparentBlue: {
        cubeColor: '#1a73e8',
        opacity: 0.6,
        edgeColor: '#000000',
        useColorFaces: false,
        showEdges: true,
        showLighting: true,
        faceColors: {
            front: '#FF5252',
            back: '#9C27B0',
            top: '#2196F3',
            bottom: '#4CAF50',
            left: '#FFC107',
            right: '#795548'
        }
    },
    gray: {
        cubeColor: '#9E9E9E',
        opacity: 1.0,
        edgeColor: '#000000',
        useColorFaces: false,
        showEdges: true,
        showLighting: true,
        faceColors: {
            front: '#FF5252',
            back: '#9C27B0',
            top: '#2196F3',
            bottom: '#4CAF50',
            left: '#FFC107',
            right: '#795548'
        }
    },
    wireframe: {
        cubeColor: '#1a73e8',
        opacity: 0.1,
        edgeColor: '#000000',
        useColorFaces: false,
        showEdges: true,
        showLighting: false,
        faceColors: {
            front: '#FF5252',
            back: '#9C27B0',
            top: '#2196F3',
            bottom: '#4CAF50',
            left: '#FFC107',
            right: '#795548'
        }
    },
    tricolor: {
        cubeColor: '#FFFFFF',
        opacity: 1.0,
        edgeColor: '#000000',
        useColorFaces: true,
        showEdges: true,
        showLighting: true,
        faceColors: {
            front: '#FF5252',
            back: '#FF5252',
            top: '#2196F3',
            bottom: '#2196F3',
            left: '#4CAF50',
            right: '#4CAF50'
        }
    },
    sixColor: {
        cubeColor: '#FFFFFF',
        opacity: 1.0,
        edgeColor: '#000000',
        useColorFaces: true,
        showEdges: true,
        showLighting: true,
        faceColors: {
            front: '#FF5252',
            back: '#9C27B0',
            top: '#2196F3',
            bottom: '#4CAF50',
            left: '#FFC107',
            right: '#795548'
        }
    }
};

// DOM元素
const canvasContainer = document.getElementById('canvas-container');
const gridView = document.getElementById('grid-view');
const targetFrontViewCanvas = document.getElementById('target-front-view-canvas');
const targetTopViewCanvas = document.getElementById('target-top-view-canvas');
const targetLeftViewCanvas = document.getElementById('target-left-view-canvas');
const statusMessage = document.getElementById('status-message');
const resultContainer = document.getElementById('result-container');
const gameStartModal = document.getElementById('game-start-modal');
const modalDifficultyLevel = document.getElementById('modal-difficulty-level');
const difficultyLevel = document.getElementById('difficulty-level');
const startGameButton = document.getElementById('start-game-button'); // 新增的右侧开始游戏按钮
const nextChallengeButton = document.getElementById('next-challenge-button'); // 新增的右侧下一题按钮

// 初始化函数
function init() {
    try {
        // 确保DOM元素已加载
        if (!canvasContainer || !gridView || 
            !targetFrontViewCanvas || !targetTopViewCanvas || !targetLeftViewCanvas) {
            console.error("DOM元素尚未加载完成");
            return false;
        }
        
        initMainScene();
        initTargetViews();
        initGridView();
        initControls();
        animate();
        
        // 初始设置
        applyStylePreset('standardBlue');
        
        // 设置按钮状态
        document.getElementById('verify-answer').disabled = true;
        document.getElementById('get-hint').disabled = true;
        if (nextChallengeButton) nextChallengeButton.disabled = true;
        
        // 显示开始游戏浮窗
        gameStartModal.classList.remove('hidden');
        
        // 更新状态消息
        updateStatusMessage('准备开始游戏...');
        
        return true;
    } catch (e) {
        console.error("初始化时出错:", e);
        return false;
    }
}

// 初始化主场景（学生作答区）
function initMainScene() {
    // 创建场景
    mainScene = new THREE.Scene();
    mainScene.background = new THREE.Color(0xf0f2f5);
    
    // 创建透视相机
    const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    mainCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    mainCamera.position.set(10, 10, 10);
    mainCamera.lookAt(0, 0, 0);
    
    // 创建渲染器
    mainRenderer = new THREE.WebGLRenderer({ antialias: true });
    mainRenderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    mainRenderer.setPixelRatio(window.devicePixelRatio);
    canvasContainer.appendChild(mainRenderer.domElement);
    
    // 添加轨道控制器
    controls = new THREE.OrbitControls(mainCamera, mainRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // 添加坐标轴辅助
    axesHelper = new THREE.AxesHelper(5);
    mainScene.add(axesHelper);
    
    // 添加网格地面
    gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE);
    gridHelper.position.y = 0;
    mainScene.add(gridHelper);
    
    // 设置初始网格和坐标轴的可见性
    gridHelper.visible = showGrid;
    axesHelper.visible = showGrid;
    
    // 添加环境光和定向光
    ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    mainScene.add(ambientLight);
    
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 7);
    mainScene.add(directionalLight);
}

// 初始化目标场景（题目三视图）
function initTargetViews() {
    // 前视图
    targetFrontScene = new THREE.Scene();
    targetFrontScene.background = new THREE.Color(0xf0f7ff); // 淡蓝色背景
    
    targetFrontCamera = new THREE.OrthographicCamera(
        -GRID_SIZE / VIEW_SCALE, GRID_SIZE / VIEW_SCALE, 
        GRID_SIZE / VIEW_SCALE, -GRID_SIZE / VIEW_SCALE, 
        0.1, 1000
    );
    targetFrontCamera.position.set(0, 0, 20);
    targetFrontCamera.lookAt(0, 0, 0);
    
    targetFrontRenderer = new THREE.WebGLRenderer({ antialias: true });
    targetFrontRenderer.setSize(targetFrontViewCanvas.clientWidth, targetFrontViewCanvas.clientHeight);
    targetFrontRenderer.setPixelRatio(window.devicePixelRatio);
    targetFrontViewCanvas.appendChild(targetFrontRenderer.domElement);
    
    // 俯视图
    targetTopScene = new THREE.Scene();
    targetTopScene.background = new THREE.Color(0xf0f7ff); // 淡蓝色背景
    
    targetTopCamera = new THREE.OrthographicCamera(
        -GRID_SIZE / VIEW_SCALE, GRID_SIZE / VIEW_SCALE, 
        GRID_SIZE / VIEW_SCALE, -GRID_SIZE / VIEW_SCALE, 
        0.1, 1000
    );
    targetTopCamera.position.set(0, 20, 0);
    targetTopCamera.lookAt(0, 0, 0);
    
    targetTopRenderer = new THREE.WebGLRenderer({ antialias: true });
    targetTopRenderer.setSize(targetTopViewCanvas.clientWidth, targetTopViewCanvas.clientHeight);
    targetTopRenderer.setPixelRatio(window.devicePixelRatio);
    targetTopViewCanvas.appendChild(targetTopRenderer.domElement);
    
    // 左视图
    targetLeftScene = new THREE.Scene();
    targetLeftScene.background = new THREE.Color(0xf0f7ff); // 淡蓝色背景
    
    targetLeftCamera = new THREE.OrthographicCamera(
        -GRID_SIZE / VIEW_SCALE, GRID_SIZE / VIEW_SCALE, 
        GRID_SIZE / VIEW_SCALE, -GRID_SIZE / VIEW_SCALE, 
        0.1, 1000
    );
    targetLeftCamera.position.set(-20, 0, 0);
    targetLeftCamera.lookAt(0, 0, 0);
    
    targetLeftRenderer = new THREE.WebGLRenderer({ antialias: true });
    targetLeftRenderer.setSize(targetLeftViewCanvas.clientWidth, targetLeftViewCanvas.clientHeight);
    targetLeftRenderer.setPixelRatio(window.devicePixelRatio);
    targetLeftViewCanvas.appendChild(targetLeftRenderer.domElement);
    
    // 初始化时调用一次更新视图大小函数，确保三视图为正方形
    setTimeout(updateViewsSize, 0);
}

// 初始化网格视图
function initGridView() {
    createGridTable();
}

// 创建网格表格
function createGridTable() {
    const gridTableContainer = gridView.querySelector('.grid-table-container');
    gridTableContainer.innerHTML = '';
    
    const table = document.createElement('table');
    table.className = 'grid-table';
    
    for (let row = 0; row < GRID_SIZE; row++) {
        const tr = document.createElement('tr');
        for (let col = 0; col < GRID_SIZE; col++) {
            const td = document.createElement('td');
            td.dataset.row = row;
            td.dataset.col = col;
            td.dataset.value = gridData[row][col];
            
            // 创建内部span来容纳文本
            const span = document.createElement('span');
            span.textContent = gridData[row][col];
            if (gridData[row][col] === 0) {
                span.classList.add('zero-value');
            }
            td.appendChild(span);
            
            // 添加点击事件
            td.addEventListener('click', (e) => {
                if (!gameState.isPlaying) return; // 游戏未开始不允许操作
                
                const cell = e.target.closest('td');
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                let height = gridData[r][c];
                
                height++; // 左键点击添加高度
                gridData[r][c] = height;
                cell.dataset.value = height;
                cell.querySelector('span').textContent = height;
                cell.querySelector('span').classList.remove('zero-value');
                
                // 添加立方体
                addCube(r, c, height - 1);
                
                // 更新状态
                updateStatusMessage('已放置方块，请继续...');
                document.getElementById('verify-answer').disabled = false;
            });
            
            // 添加右键事件
            td.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (!gameState.isPlaying) return; // 游戏未开始不允许操作
                
                const cell = e.target.closest('td');
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                let height = gridData[r][c];
                
                if (height > 0) {
                    height--; // 右键点击减少高度
                    gridData[r][c] = height;
                    cell.dataset.value = height;
                    cell.querySelector('span').textContent = height;
                    
                    if (height === 0) {
                        cell.querySelector('span').classList.add('zero-value');
                    }
                    
                    // 移除立方体
                    removeCube(r, c, height);
                    
                    // 更新状态
                    updateStatusMessage('已移除方块，请继续...');
                }
            });
            
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    
    gridTableContainer.appendChild(table);
}

// 清空网格
function clearGrid() {
    // 重置网格数据
    gridData = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    
    // 更新网格表格
    const cells = document.querySelectorAll('.grid-table td');
    cells.forEach(cell => {
        cell.dataset.value = 0;
        const span = cell.querySelector('span');
        span.textContent = 0;
        span.classList.add('zero-value');
    });
    
    // 清除场景中的立方体
    clearAllCubes();
    
    // 更新状态
    updateStatusMessage('已清空网格，请重新作答...');
    document.getElementById('verify-answer').disabled = false;
}

// 清除所有立方体
function clearAllCubes() {
    // 清除所有立方体
    while (cubes.length > 0) {
        const cube = cubes.pop();
        mainScene.remove(cube.mesh);
        mainScene.remove(cube.edges);
    }
}

// 初始化控制事件
function initControls() {
    // 视角控制按钮
    document.getElementById('reset-view').addEventListener('click', () => {
        controls.reset();
    });
    
    document.getElementById('focus-object').addEventListener('click', () => {
        // 找到场景中心
        const box = new THREE.Box3().setFromObject(mainScene);
        const center = box.getCenter(new THREE.Vector3());
        controls.target.copy(center);
        controls.update();
    });
    
    // 新增 - 切换网格显示
    document.getElementById('toggle-grid').addEventListener('click', () => {
        showGrid = !showGrid;
        if (gridHelper) gridHelper.visible = showGrid;
        if (axesHelper) axesHelper.visible = showGrid;
    });
    
    // 新增 - 视角控制
    document.getElementById('default-view').addEventListener('click', () => {
        transitionCameraPosition(new THREE.Vector3(10, 10, 10));
    });
    
    document.getElementById('front-view').addEventListener('click', () => {
        transitionCameraPosition(new THREE.Vector3(0, 0, 15));
    });
    
    document.getElementById('top-view').addEventListener('click', () => {
        transitionCameraPosition(new THREE.Vector3(0, 15, 0));
    });
    
    document.getElementById('left-view').addEventListener('click', () => {
        transitionCameraPosition(new THREE.Vector3(-15, 0, 0));
    });
    
    // 投影模式切换
    const projectionRadios = document.querySelectorAll('input[name="projection"]');
    projectionRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'perspective') {
                // 切换到透视投影
                const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
                mainCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
                mainCamera.position.set(10, 10, 10);
                mainCamera.lookAt(0, 0, 0);
                
                // 更新控制器
                controls.object = mainCamera;
                controls.update();
            } else {
                // 切换到正交投影
                const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
                const frustumSize = 10;
                mainCamera = new THREE.OrthographicCamera(
                    frustumSize * aspect / -2, frustumSize * aspect / 2,
                    frustumSize / 2, frustumSize / -2,
                    0.1, 1000
                );
                mainCamera.position.set(10, 10, 10);
                mainCamera.lookAt(0, 0, 0);
                
                // 更新控制器
                controls.object = mainCamera;
                controls.update();
            }
        });
    });
    
    // 样式预设选择
    document.getElementById('style-preset').addEventListener('change', (e) => {
        applyStylePreset(e.target.value);
    });
    
    // 光照效果开关
    document.getElementById('lighting-toggle').addEventListener('change', (e) => {
        toggleLighting(e.target.checked);
    });
    
    // 清空网格按钮
    document.getElementById('clear-grid').addEventListener('click', () => {
        if (gameState.isPlaying) {
            clearGrid();
        }
    });
    
    // 游戏控制按钮
    document.getElementById('start-game').addEventListener('click', () => {
        // 从模态框同步难度设置
        gameState.difficultyLevel = modalDifficultyLevel.value;
        difficultyLevel.value = modalDifficultyLevel.value;
        
        // 隐藏开始游戏浮窗
        gameStartModal.classList.add('hidden');
        
        // 开始游戏
        startGame();
    });
    
    // 右侧边栏的开始游戏按钮
    startGameButton.addEventListener('click', () => {
        // 显示开始游戏浮窗
        gameStartModal.classList.remove('hidden');
    });
    
    // 右侧边栏的下一题按钮
    nextChallengeButton.addEventListener('click', nextChallenge);
    
    // 同步两个难度选择器
    modalDifficultyLevel.addEventListener('change', (e) => {
        difficultyLevel.value = e.target.value;
        gameState.difficultyLevel = e.target.value;
    });
    
    difficultyLevel.addEventListener('change', (e) => {
        modalDifficultyLevel.value = e.target.value;
        gameState.difficultyLevel = e.target.value;
    });
    
    document.getElementById('verify-answer').addEventListener('click', verifyAnswer);
    document.getElementById('get-hint').addEventListener('click', provideHint);
    document.getElementById('next-challenge').addEventListener('click', nextChallenge);
    
    // 窗口大小变化事件
    window.addEventListener('resize', onWindowResize);
}

// 新增 - 相机平滑过渡函数
function transitionCameraPosition(targetPosition, duration = 800) {
    const startPosition = mainCamera.position.clone();
    const startTime = Date.now();
    
    function updatePosition() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数使动画更自然
        const easeProgress = 1 - Math.pow(1 - progress, 3); // 缓出效果
        
        mainCamera.position.lerpVectors(startPosition, targetPosition, easeProgress);
        
        if (progress < 1) {
            requestAnimationFrame(updatePosition);
        } else {
            // 动画结束，确保准确位置
            mainCamera.position.copy(targetPosition);
        }
        
        controls.update();
    }
    
    updatePosition();
}

// 添加立方体到场景
function addCube(row, col, height) {
    // 检查是否已存在该位置的立方体
    const existingCubeIndex = cubes.findIndex(cube => 
        cube.position.x === col - Math.floor(GRID_SIZE/2) && 
        cube.position.z === row - Math.floor(GRID_SIZE/2) && 
        cube.position.y === height);
    
    if (existingCubeIndex !== -1) return; // 已存在，不再添加
    
    // 创建立方体几何体
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    
    // 根据设置创建材质
    let materials = [];
    
    if (useColorFaces) {
        // 使用彩色面
        materials = [
            new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.right), transparent: true, opacity: opacity }),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.left), transparent: true, opacity: opacity }),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.top), transparent: true, opacity: opacity }),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.bottom), transparent: true, opacity: opacity }),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.front), transparent: true, opacity: opacity }),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.back), transparent: true, opacity: opacity })
        ];
    } else {
        // 使用单色
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(cubeColor),
            transparent: true,
            opacity: opacity
        });
        materials = Array(6).fill(material);
    }
    
    // 设置材质参数
    materials.forEach(material => {
        material.metalness = 0.1;
        material.roughness = 0.8;
        if (!showLighting) {
            material.emissive = material.color;
            material.emissiveIntensity = 0.7;
        } else {
            material.emissive = new THREE.Color(0x000000);
            material.emissiveIntensity = 0;
        }
        
        // 解决Z-fighting问题
        material.polygonOffset = true;
        material.polygonOffsetFactor = 1;
        material.polygonOffsetUnits = 1;
    });
    
    // 创建立方体网格
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.set(
        col - Math.floor(GRID_SIZE/2),
        height,
        row - Math.floor(GRID_SIZE/2)
    );
    
    // 创建边框
    let edges = null;
    if (showEdges) {
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(edgeColor), linewidth: 1 });
        edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edges.position.copy(mesh.position);
        edges.renderOrder = 1; // 确保边框在面之上渲染
        mainScene.add(edges);
    }
    
    // 添加到场景
    mainScene.add(mesh);
    
    // 存储立方体信息
    cubes.push({
        mesh: mesh,
        edges: edges,
        position: { x: col - Math.floor(GRID_SIZE/2), y: height, z: row - Math.floor(GRID_SIZE/2) }
    });
}

// 从场景中移除立方体
function removeCube(row, col, height) {
    // 找到要移除的立方体索引
    const cubeIndex = cubes.findIndex(cube => 
        cube.position.x === col - Math.floor(GRID_SIZE/2) && 
        cube.position.z === row - Math.floor(GRID_SIZE/2) && 
        cube.position.y > height);
    
    if (cubeIndex !== -1) {
        // 从场景中移除立方体
        const cube = cubes[cubeIndex];
        mainScene.remove(cube.mesh);
        if (cube.edges) {
            mainScene.remove(cube.edges);
        }
        
        // 从数组中移除
        cubes.splice(cubeIndex, 1);
    }
}

// 更新立方体样式
function updateCubeStyles() {
    cubes.forEach(cube => {
        if (useColorFaces) {
            // 更新彩色面
            const materials = [
                new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.right), transparent: true, opacity: opacity }),
                new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.left), transparent: true, opacity: opacity }),
                new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.top), transparent: true, opacity: opacity }),
                new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.bottom), transparent: true, opacity: opacity }),
                new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.front), transparent: true, opacity: opacity }),
                new THREE.MeshStandardMaterial({ color: new THREE.Color(faceColors.back), transparent: true, opacity: opacity })
            ];
            
            // 设置材质参数
            materials.forEach(material => {
                material.metalness = 0.1;
                material.roughness = 0.8;
                if (!showLighting) {
                    material.emissive = material.color;
                    material.emissiveIntensity = 0.7;
                } else {
                    material.emissive = new THREE.Color(0x000000);
                    material.emissiveIntensity = 0;
                }
                
                // 解决Z-fighting问题
                material.polygonOffset = true;
                material.polygonOffsetFactor = 1;
                material.polygonOffsetUnits = 1;
            });
            
            cube.mesh.material = materials;
        } else {
            // 更新单色
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(cubeColor),
                transparent: true,
                opacity: opacity
            });
            
            // 设置材质参数
            material.metalness = 0.1;
            material.roughness = 0.8;
            if (!showLighting) {
                material.emissive = material.color;
                material.emissiveIntensity = 0.7;
            } else {
                material.emissive = new THREE.Color(0x000000);
                material.emissiveIntensity = 0;
            }
            
            // 解决Z-fighting问题
            material.polygonOffset = true;
            material.polygonOffsetFactor = 1;
            material.polygonOffsetUnits = 1;
            
            cube.mesh.material = Array(6).fill(material);
        }
        
        // 更新边框
        if (cube.edges) {
            mainScene.remove(cube.edges);
        }
        
        if (showEdges) {
            const edgeGeometry = new THREE.EdgesGeometry(cube.mesh.geometry);
            const edgeMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(edgeColor), linewidth: 1 });
            cube.edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
            cube.edges.position.copy(cube.mesh.position);
            cube.edges.renderOrder = 1; // 确保边框在面之上渲染
            mainScene.add(cube.edges);
        }
    });
}

// 窗口大小变化处理
function onWindowResize() {
    // 更新主场景相机和渲染器
    if (mainCamera.isPerspectiveCamera) {
        mainCamera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        mainCamera.updateProjectionMatrix();
    } else {
        const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        const frustumSize = 10;
        mainCamera.left = frustumSize * aspect / -2;
        mainCamera.right = frustumSize * aspect / 2;
        mainCamera.top = frustumSize / 2;
        mainCamera.bottom = frustumSize / -2;
        mainCamera.updateProjectionMatrix();
    }
    
    mainRenderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    
    // 更新目标场景渲染器 - 确保视图保持正方形
    updateViewsSize();
}

// 更新三视图大小，确保保持正方形
function updateViewsSize() {
    if (!targetFrontViewCanvas || !targetFrontRenderer || 
        !targetTopViewCanvas || !targetTopRenderer || 
        !targetLeftViewCanvas || !targetLeftRenderer) {
        // 如果元素未初始化，则跳过
        console.log("视图元素尚未初始化，跳过大小更新");
        return;
    }
    
    try {
        if (targetFrontViewCanvas && targetFrontRenderer) {
            const containerWidth = targetFrontViewCanvas.parentElement.clientWidth;
            const containerHeight = targetFrontViewCanvas.parentElement.clientHeight;
            const size = Math.min(containerWidth, containerHeight) * 0.95; // 使用95%的容器尺寸
            
            targetFrontRenderer.setSize(size, size);
        }
        
        if (targetTopViewCanvas && targetTopRenderer) {
            const containerWidth = targetTopViewCanvas.parentElement.clientWidth;
            const containerHeight = targetTopViewCanvas.parentElement.clientHeight;
            const size = Math.min(containerWidth, containerHeight) * 0.95; // 使用95%的容器尺寸
            
            targetTopRenderer.setSize(size, size);
        }
        
        if (targetLeftViewCanvas && targetLeftRenderer) {
            const containerWidth = targetLeftViewCanvas.parentElement.clientWidth;
            const containerHeight = targetLeftViewCanvas.parentElement.clientHeight;
            const size = Math.min(containerWidth, containerHeight) * 0.95; // 使用95%的容器尺寸
            
            targetLeftRenderer.setSize(size, size);
        }
    } catch (e) {
        console.error("更新视图大小时出错:", e);
    }
}

// 渲染循环
function animate() {
    requestAnimationFrame(animate);
    
    controls.update();
    
    mainRenderer.render(mainScene, mainCamera);
    
    // 渲染目标场景（如果游戏正在进行）
    if (gameState.isPlaying && gameState.targetGridData) {
        targetFrontRenderer.render(targetFrontScene, targetFrontCamera);
        targetTopRenderer.render(targetTopScene, targetTopCamera);
        targetLeftRenderer.render(targetLeftScene, targetLeftCamera);
    }
}

// 光照效果切换
function toggleLighting(isOn) {
    showLighting = isOn;
    
    // 更新立方体材质
    updateCubeStyles();
    
    // 更新目标场景中的立方体
    if (gameState.targetGridData) {
        updateTargetScenesCubesStyle();
    }
}

// 应用样式预设
function applyStylePreset(presetName) {
    const preset = stylePresets[presetName];
    
    if (preset) {
        // 更新全局样式变量
        cubeColor = preset.cubeColor;
        
        opacity = preset.opacity;
        
        edgeColor = preset.edgeColor;
        
        useColorFaces = preset.useColorFaces;
        
        showEdges = preset.showEdges;
        
        showLighting = preset.showLighting;
        document.getElementById('lighting-toggle').checked = preset.showLighting;
        
        // 更新面颜色
        faceColors = { ...preset.faceColors };
        
        // 更新立方体样式
        updateCubeStyles();
        
        // 更新目标场景中的立方体
        if (gameState.targetGridData) {
            updateTargetScenesCubesStyle();
        }
    }
}

// 开始游戏
function startGame() {
    // 更新游戏状态
    gameState.isPlaying = true;
    gameState.hintsUsed = 0;
    
    // 清空已有的内容
    clearGrid();
    clearAllCubes();
    clearTargetScenes();
    
    // 生成随机结构
    gameState.targetGridData = generateRandomStructure();
    
    // 创建目标视图
    createTargetViews();
    
    // 启用验证和提示按钮
    document.getElementById('verify-answer').disabled = false;
    document.getElementById('get-hint').disabled = false;
    nextChallengeButton.disabled = true;
    
    // 更新状态消息
    updateStatusMessage('游戏开始！请根据三视图重建结构...');
}

// 生成随机立方体结构
function generateRandomStructure() {
    // 根据难度级别设置参数
    let maxHeight, gridRange, requireContiguous;

    if (gameState.difficultyLevel === 'easy') {
        maxHeight = 3;     // 最大高度3层
        gridRange = 3;     // 3×3网格范围
        requireContiguous = true;  // 要求俯视图连续无空隙
    } else if (gameState.difficultyLevel === 'medium') {
        maxHeight = 5;     // 最大高度5层
        gridRange = 5;     // 5×5网格范围
        requireContiguous = true;  // 要求俯视图连续无空隙
    } else { // hard
        maxHeight = 5;     // 最大高度5层
        gridRange = 5;     // 5×5网格范围
        requireContiguous = false; // 不要求俯视图连续
    }
    
    // 创建目标网格数据
    gameState.targetGridData = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    
    // 确定有效范围的边界
    const startIdx = Math.floor((GRID_SIZE - gridRange) / 2);
    const endIdx = startIdx + gridRange;
    
    if (requireContiguous) {
        // 生成连续无空隙的结构
        generateContiguousStructure(startIdx, endIdx, maxHeight);
    } else {
        // 生成任意结构
        generateRandomNonContiguousStructure(startIdx, endIdx, maxHeight);
    }
    
    console.log('已生成随机结构:', gameState.targetGridData);
    return gameState.targetGridData; // 确保返回生成的数据
}

// 生成连续无空隙的结构
function generateContiguousStructure(startIdx, endIdx, maxHeight) {
    // 随机选择一个起始点
    const startRow = Math.floor(Math.random() * (endIdx - startIdx)) + startIdx;
    const startCol = Math.floor(Math.random() * (endIdx - startIdx)) + startIdx;
    
    // 将起始点标记为已访问并赋予随机高度
    gameState.targetGridData[startRow][startCol] = Math.floor(Math.random() * maxHeight) + 1;
    
    // 已放置的单元格
    const placedCells = [{row: startRow, col: startCol}];
    
    // 确定要放置的方块数量（范围是总网格的30%到60%）
    const gridSize = (endIdx - startIdx) * (endIdx - startIdx);
    const minCubes = Math.max(3, Math.floor(gridSize * 0.3));
    const maxCubes = Math.floor(gridSize * 0.6);
    const targetCubeCount = Math.floor(Math.random() * (maxCubes - minCubes + 1)) + minCubes;
    
    // 方向数组：上、右、下、左
    const directions = [
        {dr: -1, dc: 0},
        {dr: 0, dc: 1},
        {dr: 1, dc: 0},
        {dr: 0, dc: -1}
    ];
    
    // 持续添加方块直到达到目标数量
    while (placedCells.length < targetCubeCount) {
        // 从已放置的单元格中随机选择一个
        const randomPlacedIndex = Math.floor(Math.random() * placedCells.length);
        const currentCell = placedCells[randomPlacedIndex];
        
        // 随机选择一个方向
        const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);
        
        let added = false;
        for (const direction of shuffledDirections) {
            const newRow = currentCell.row + direction.dr;
            const newCol = currentCell.col + direction.dc;
            
            // 检查新位置是否在有效范围内且未被占用
            if (newRow >= startIdx && newRow < endIdx && 
                newCol >= startIdx && newCol < endIdx && 
                gameState.targetGridData[newRow][newCol] === 0) {
                
                // 放置一个随机高度的方块
                gameState.targetGridData[newRow][newCol] = Math.floor(Math.random() * maxHeight) + 1;
                placedCells.push({row: newRow, col: newCol});
                added = true;
                break;
            }
        }
        
        // 如果无法添加新的相邻方块，可能是因为周围都满了
        if (!added) {
            // 从已放置列表中移除当前单元格，以便不再尝试从该单元格扩展
            placedCells.splice(randomPlacedIndex, 1);
            
            // 如果没有可以扩展的单元格了，就退出循环
            if (placedCells.length === 0) {
                break;
            }
        }
    }
}

// 生成随机非连续结构
function generateRandomNonContiguousStructure(startIdx, endIdx, maxHeight) {
    // 随机填充立方体（保证至少有3个立方体）
    let cubeCount = 0;
    const gridSize = (endIdx - startIdx) * (endIdx - startIdx);
    const minCubes = Math.max(3, Math.floor(gridSize * 0.2));
    const maxCubes = Math.floor(gridSize * 0.6);
    
    const targetCubeCount = Math.floor(Math.random() * (maxCubes - minCubes + 1)) + minCubes;
    
    while (cubeCount < targetCubeCount) {
        const row = Math.floor(Math.random() * (endIdx - startIdx)) + startIdx;
        const col = Math.floor(Math.random() * (endIdx - startIdx)) + startIdx;
        const height = Math.floor(Math.random() * maxHeight) + 1; // 高度至少为1
        
        // 检查是否已经有立方体
        if (gameState.targetGridData[row][col] === 0) {
            gameState.targetGridData[row][col] = height;
            cubeCount++;
        }
    }
}

// 创建目标三视图场景
function createTargetViews() {
    try {
        // 确保场景和目标数据已初始化
        if (!targetFrontScene || !targetTopScene || !targetLeftScene || !gameState.targetGridData) {
            console.error("三视图场景或目标数据未初始化");
            return;
        }
        
        // 清除之前的立方体
        clearTargetScenes();
        
        // 根据目标网格数据创建立方体
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const height = gameState.targetGridData[row][col];
                
                if (height > 0) { // 只有高度大于0才创建立方体
                    // 创建立方体
                    for (let h = 0; h < height; h++) {
                        addCubeToTargetScenes(row, col, h);
                    }
                }
            }
        }
    } catch (e) {
        console.error("创建三视图时出错:", e);
    }
}

// 清除目标场景中的立方体
function clearTargetScenes() {
    clearSceneCubes(targetFrontScene);
    clearSceneCubes(targetTopScene);
    clearSceneCubes(targetLeftScene);
}

// 清除场景中的立方体
function clearSceneCubes(scene) {
    const objectsToRemove = [];
    
    scene.traverse(object => {
        if (object.isMesh || object.isLineSegments) {
            objectsToRemove.push(object);
        }
    });
    
    objectsToRemove.forEach(object => {
        scene.remove(object);
    });
}

// 添加立方体到目标场景
function addCubeToTargetScenes(row, col, height) {
    // 几何体和材质设置与主场景相同
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    
    // 为三视图使用蓝色
    const viewCubeColor = 0x2196F3; // 使用蓝色
    const viewEdgeColor = 0x000000; // 黑色描边
    
    // 创建材质 - 对三视图使用专门的蓝色
    let materials = [];
    
    // 使用单色蓝色材质
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(viewCubeColor),
        transparent: true,
        opacity: 1.0, // 完全不透明
        metalness: 0.1,
        roughness: 0.8
    });
    
    // 设置材质参数
    if (!showLighting) {
        material.emissive = material.color;
        material.emissiveIntensity = 0.7;
    } else {
        material.emissive = new THREE.Color(0x000000);
        material.emissiveIntensity = 0;
    }
    
    // 解决Z-fighting问题
    material.polygonOffset = true;
    material.polygonOffsetFactor = 1;
    material.polygonOffsetUnits = 1;
    
    materials = Array(6).fill(material);
    
    // 添加到前视图
    const frontMesh = new THREE.Mesh(geometry, materials);
    frontMesh.position.set(
        col - Math.floor(GRID_SIZE/2),
        height,
        row - Math.floor(GRID_SIZE/2)
    );
    targetFrontScene.add(frontMesh);
    
    // 添加前视图边框 - 始终显示边框
    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: new THREE.Color(viewEdgeColor), 
        linewidth: 2 // 增加线宽使边框更明显
    });
    const frontEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    frontEdges.position.copy(frontMesh.position);
    frontEdges.renderOrder = 1;
    targetFrontScene.add(frontEdges);
    
    // 添加到俯视图
    const topMesh = new THREE.Mesh(geometry, materials);
    topMesh.position.set(
        col - Math.floor(GRID_SIZE/2),
        height,
        row - Math.floor(GRID_SIZE/2)
    );
    targetTopScene.add(topMesh);
    
    // 添加俯视图边框 - 始终显示边框
    const topEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    topEdges.position.copy(topMesh.position);
    topEdges.renderOrder = 1;
    targetTopScene.add(topEdges);
    
    // 添加到左视图
    const leftMesh = new THREE.Mesh(geometry, materials);
    leftMesh.position.set(
        col - Math.floor(GRID_SIZE/2),
        height,
        row - Math.floor(GRID_SIZE/2)
    );
    targetLeftScene.add(leftMesh);
    
    // 添加左视图边框 - 始终显示边框
    const leftEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    leftEdges.position.copy(leftMesh.position);
    leftEdges.renderOrder = 1;
    targetLeftScene.add(leftEdges);
}

// 更新目标场景中立方体的样式
function updateTargetScenesCubesStyle() {
    // 需要重新创建立方体以应用新样式
    createTargetViews();
}

// 验证答案
function verifyAnswer() {
    if (!gameState.isPlaying) return;
    
    // 使用新的验证逻辑：检查学生答案的三视图是否与目标三视图匹配
    let isCorrect = checkViewsMatch();
    
    // 显示结果
    resultContainer.classList.remove('hidden');
    const resultMessage = resultContainer.querySelector('.result-message');
    
    if (isCorrect) {
        // 显示成功消息
        resultMessage.classList.add('success');
        resultMessage.classList.remove('error');
        resultMessage.querySelector('h3').textContent = '答案正确！';
        resultMessage.querySelector('p').textContent = `恭喜你成功重建了立体结构！${gameState.hintsUsed > 0 ? `（使用了${gameState.hintsUsed}次提示）` : ''}`;
        
        // 启用下一题按钮
        nextChallengeButton.disabled = false;
    } else {
        // 答案错误
        resultMessage.className = 'result-message error';
        resultMessage.querySelector('h3').textContent = '答案不正确';
        resultMessage.querySelector('p').textContent = '你的结构与三视图不匹配，请再次尝试或使用提示辅助解答。';
        
        // 更新状态
        updateStatusMessage('答案不正确，请继续尝试...');
        
        // 3秒后自动隐藏错误提示
        setTimeout(() => {
            resultContainer.classList.add('hidden');
        }, 3000);
    }
}

// 检查学生答案的三视图是否与目标三视图匹配
function checkViewsMatch() {
    // 从学生的gridData生成三视图投影
    const studentProjections = generateProjections(gridData);
    
    // 从目标gridData生成三视图投影
    const targetProjections = generateProjections(gameState.targetGridData);
    
    // 比较前视图投影
    if (!compareProjections(studentProjections.frontView, targetProjections.frontView)) {
        return false;
    }
    
    // 比较俯视图投影
    if (!compareProjections(studentProjections.topView, targetProjections.topView)) {
        return false;
    }
    
    // 比较左视图投影
    if (!compareProjections(studentProjections.leftView, targetProjections.leftView)) {
        return false;
    }
    
    // 所有视图都匹配，答案正确
    return true;
}

// 从网格数据生成三视图投影
function generateProjections(grid) {
    const size = grid.length;
    
    // 初始化投影数组
    const frontView = Array(size).fill().map(() => Array(size).fill(0));
    const topView = Array(size).fill().map(() => Array(size).fill(0));
    const leftView = Array(size).fill().map(() => Array(size).fill(0));
    
    // 计算每个视图的投影
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const height = grid[row][col];
            
            // 前视图（从z轴负方向看，即从前面看）
            // 对每列取最高值
            for (let h = 0; h < height; h++) {
                frontView[size - 1 - h][col] = 1; // 将前视图对应位置标记为有方块
            }
            
            // 俯视图（从y轴正方向看，即从上面看）
            if (height > 0) {
                topView[row][col] = 1; // 俯视图只关心有没有方块，不关心高度
            }
            
            // 左视图（从x轴负方向看，即从左边看）
            // 对每行取最高值
            for (let h = 0; h < height; h++) {
                leftView[size - 1 - h][row] = 1; // 将左视图对应位置标记为有方块
            }
        }
    }
    
    return { frontView, topView, leftView };
}

// 比较两个投影是否相同
function compareProjections(proj1, proj2) {
    const size = proj1.length;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (proj1[row][col] !== proj2[row][col]) {
                return false;
            }
        }
    }
    
    return true;
}

// 提供提示
function provideHint() {
    if (!gameState.isPlaying) return;
    
    // 增加提示使用计数
    gameState.hintsUsed++;
    
    // 生成学生当前三视图投影
    const studentProjections = generateProjections(gridData);
    
    // 生成目标三视图投影
    const targetProjections = generateProjections(gameState.targetGridData);
    
    // 寻找一个视图不匹配的位置
    let hintProvided = false;
    
    // 检查前视图
    if (!hintProvided) {
        for (let row = 0; row < GRID_SIZE && !hintProvided; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (studentProjections.frontView[row][col] !== targetProjections.frontView[row][col]) {
                    // 前视图不匹配，提供提示
                    updateStatusMessage(`提示：前视图第${GRID_SIZE - row}行第${col + 1}列的投影不正确。`);
                    hintProvided = true;
                    break;
                }
            }
        }
    }
    
    // 检查俯视图
    if (!hintProvided) {
        for (let row = 0; row < GRID_SIZE && !hintProvided; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (studentProjections.topView[row][col] !== targetProjections.topView[row][col]) {
                    // 俯视图不匹配，提供提示
                    updateStatusMessage(`提示：俯视图第${row + 1}行第${col + 1}列的投影不正确。`);
                    hintProvided = true;
                    break;
                }
            }
        }
    }
    
    // 检查左视图
    if (!hintProvided) {
        for (let row = 0; row < GRID_SIZE && !hintProvided; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (studentProjections.leftView[row][col] !== targetProjections.leftView[row][col]) {
                    // 左视图不匹配，提供提示
                    updateStatusMessage(`提示：左视图第${GRID_SIZE - row}行第${col + 1}列的投影不正确。`);
                    hintProvided = true;
                    break;
                }
            }
        }
    }
    
    // 如果没找到不匹配的地方，则随机提供一个可能的解法提示
    if (!hintProvided) {
        // 生成一个随机的有效位置
        const validRow = Math.floor(Math.random() * GRID_SIZE);
        const validCol = Math.floor(Math.random() * GRID_SIZE);
        
        if (gameState.targetGridData[validRow][validCol] > 0 && gridData[validRow][validCol] === 0) {
            // 添加一个方块
            gridData[validRow][validCol] = 1;
            
            // 更新网格视图
            const cell = document.querySelector(`.grid-table td[data-row="${validRow}"][data-col="${validCol}"]`);
            cell.dataset.value = 1;
            const span = cell.querySelector('span');
            span.textContent = 1;
            span.classList.remove('zero-value');
            
            // 添加立方体
            addCube(validRow, validCol, 0);
            
            updateStatusMessage(`提示：在第${validRow+1}行第${validCol+1}列添加了一个方块。`);
            hintProvided = true;
        }
    }
    
    // 如果以上方法都没有提供提示，提示用户答案已经正确
    if (!hintProvided) {
        updateStatusMessage('你的答案与三视图匹配，可能已经正确了！');
    }
}

// 下一题
function nextChallenge() {
    // 隐藏结果浮窗
    resultContainer.classList.add('hidden');
    
    // 更新游戏状态
    gameState.hintsUsed = 0;
    
    // 清空已有的内容
    clearGrid();
    clearAllCubes();
    clearTargetScenes();
    
    // 生成新的随机结构
    gameState.targetGridData = generateRandomStructure();
    
    // 创建目标视图
    createTargetViews();
    
    // 重置按钮状态
    document.getElementById('verify-answer').disabled = false;
    document.getElementById('get-hint').disabled = false;
    nextChallengeButton.disabled = true;
    
    // 更新状态消息
    updateStatusMessage('新的挑战开始！请根据三视图重建结构...');
}

// 更新状态消息
function updateStatusMessage(message) {
    statusMessage.textContent = message;
}

// 在窗口加载完成后初始化应用
window.onload = function() {
    setTimeout(() => {
        const initialized = init();
        
        if (initialized) {
            // 在页面渲染完成后，再次更新三视图大小
            setTimeout(updateViewsSize, 100);
        } else {
            console.error("应用初始化失败，将重试");
            // 如果初始化失败，尝试再次初始化
            setTimeout(() => {
                init();
                setTimeout(updateViewsSize, 100);
            }, 500);
        }
    }, 100); // 给浏览器一点时间加载DOM
}; 