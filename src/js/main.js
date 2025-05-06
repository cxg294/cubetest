import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

// 场景配置
let scene, camera, renderer, controls;
let sun, planets = {}, isPaused = false;
let speedFactor = 1;
let selectedPlanet = null;
let textureLoader = new THREE.TextureLoader();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let hoveredObject = null;
let labelRenderer;

// 添加相机动画相关变量
let isAnimatingCamera = false;
let cameraAnimationStartTime = 0;
let cameraAnimationDuration = 2000; // 动画持续时间（毫秒）
let cameraStartPosition = new THREE.Vector3();
let cameraTargetPosition = new THREE.Vector3();
let controlsStartTarget = new THREE.Vector3();
let controlsTargetPosition = new THREE.Vector3();

// 纹理基础路径（改为本地路径）
const TEXTURE_BASE_URL = './src/assets/textures/';

// 行星信息（相对比例参考，非真实比例）
const PLANET_DATA = {
    sun: { 
        radius: 5, 
        texture: TEXTURE_BASE_URL + 'sun.jpg', 
        emissive: 0xffff00,
        emissiveIntensity: 1,
        rotationSpeed: 0.0005, // 太阳自转周期约25-35天
        info: {
            name: "太阳",
            diameter: "1,392,700 公里",
            distance: "0 天文单位",
            orbitPeriod: "—",
            rotationPeriod: "25-35 天（根据纬度）",
            moonsCount: "0",
            temperature: "5,500°C（表面）",
            description: "太阳系的中心恒星，一个由热气体组成的巨大球体，通过核聚变产生能量。它占了太阳系总质量的99.86%。"
        }
    },
    mercury: { 
        radius: 0.4, 
        semimajorAxis: 10,  // 半长轴
        eccentricity: 0.205, // 偏心率
        inclination: 7.0,   // 轨道倾角（度）
        speed: 0.04, 
        rotationSpeed: 0.0002, // 自转周期约59天
        texture: TEXTURE_BASE_URL + 'mercury.jpg',
        info: {
            name: "水星",
            diameter: "4,880 公里",
            distance: "0.39 天文单位",
            orbitPeriod: "88 天",
            rotationPeriod: "59 天",
            moonsCount: "0",
            temperature: "-173°C 至 427°C",
            description: "太阳系最小的行星，也是最靠近太阳的行星。它的表面覆盖着陨石坑，没有大气层，温度变化极大。"
        }
    },
    venus: { 
        radius: 0.9, 
        semimajorAxis: 15,
        eccentricity: 0.007,
        inclination: 3.4,
        speed: 0.015, 
        rotationSpeed: -0.00005, // 逆向自转，周期约243天
        texture: TEXTURE_BASE_URL + 'venus.jpg',
        info: {
            name: "金星",
            diameter: "12,104 公里",
            distance: "0.72 天文单位",
            orbitPeriod: "225 天",
            rotationPeriod: "243 天（逆行）",
            moonsCount: "0",
            temperature: "462°C",
            description: "有时被称为地球的姐妹星，因其大小和质量与地球相似。它具有非常厚的大气层，主要由二氧化碳组成，导致强烈的温室效应和极高的表面温度。"
        }
    },
    earth: { 
        radius: 1, 
        semimajorAxis: 20,
        eccentricity: 0.017,
        inclination: 0.0,
        speed: 0.01, 
        rotationSpeed: 0.01, // 自转周期约24小时
        texture: TEXTURE_BASE_URL + 'earth.jpg',
        cloudTexture: TEXTURE_BASE_URL + 'earth_clouds.jpg',  // 添加云层贴图
        bumpTexture: TEXTURE_BASE_URL + 'earth_bump.jpg',    // 添加凹凸贴图
        specularTexture: TEXTURE_BASE_URL + 'earth_specular.jpg', // 添加高光贴图
        moons: [
            { 
                radius: 0.3, 
                semimajorAxis: 2,
                eccentricity: 0.0549,
                inclination: 5.145,
                speed: 0.03, 
                rotationSpeed: 0.0043, // 自转周期约27.3天（同步自转）
                texture: TEXTURE_BASE_URL + 'moon.jpg',
                bumpTexture: TEXTURE_BASE_URL + 'moon_bump.jpg', // 月球凹凸贴图
                info: {
                    name: "月球",
                    diameter: "3,474 公里",
                    distance: "384,400 公里（地球）",
                    orbitPeriod: "27.3 天",
                    rotationPeriod: "27.3 天（同步自转）",
                    temperature: "-233°C 至 123°C",
                    description: "地球唯一的自然卫星，是太阳系中第五大卫星。月球对地球潮汐有显著影响，并稳定地球的自转轴。"
                }
            }
        ],
        info: {
            name: "地球",
            diameter: "12,756 公里",
            distance: "1 天文单位",
            orbitPeriod: "365.25 天",
            rotationPeriod: "24 小时",
            moonsCount: "1",
            temperature: "-88°C 至 58°C",
            description: "我们的家园，是目前已知唯一存在生命的行星。它的表面有71%被水覆盖，拥有维持生命的大气层和磁场。"
        }
    },
    mars: { 
        radius: 0.5, 
        semimajorAxis: 25,
        eccentricity: 0.093,
        inclination: 1.9,
        speed: 0.008, 
        rotationSpeed: 0.0098, // 自转周期约24.6小时
        texture: TEXTURE_BASE_URL + 'mars.jpg',
        info: {
            name: "火星",
            diameter: "6,792 公里",
            distance: "1.52 天文单位",
            orbitPeriod: "687 天",
            rotationPeriod: "24.6 小时",
            moonsCount: "2",
            temperature: "-153°C 至 20°C",
            description: "被称为红色星球，因其表面富含氧化铁（铁锈）而呈现红色。火星有薄薄的大气层，季节变化，极冠，山谷和沙漠。"
        }
    },
    jupiter: { 
        radius: 2.5, 
        semimajorAxis: 40,
        eccentricity: 0.048,
        inclination: 1.3,
        speed: 0.002, 
        rotationSpeed: 0.024, // 自转周期约9.9小时（最快）
        texture: TEXTURE_BASE_URL + 'jupiter.jpg',
        cloudTexture: TEXTURE_BASE_URL + 'jupiter_clouds.jpg', // 添加云层
        info: {
            name: "木星",
            diameter: "142,984 公里",
            distance: "5.2 天文单位",
            orbitPeriod: "11.86 年",
            rotationPeriod: "9.9 小时",
            moonsCount: "79+",
            temperature: "-145°C",
            description: "太阳系最大的行星，是一个气态巨行星。它主要由氢和氦组成，有明显的条纹状云层和壮观的大红斑（一个持续数百年的巨大风暴）。"
        }
    },
    saturn: { 
        radius: 2.2, 
        semimajorAxis: 55,
        eccentricity: 0.056,
        inclination: 2.5,
        speed: 0.0009, 
        rotationSpeed: 0.022, // 自转周期约10.7小时
        texture: TEXTURE_BASE_URL + 'saturn.jpg',
        cloudTexture: TEXTURE_BASE_URL + 'saturn_clouds.jpg', // 添加云层
        rings: { 
            innerRadius: 2.5, 
            outerRadius: 4, 
            texture: TEXTURE_BASE_URL + 'saturn-rings.png'
        },
        info: {
            name: "土星",
            diameter: "120,536 公里",
            distance: "9.54 天文单位",
            orbitPeriod: "29.46 年",
            rotationPeriod: "10.7 小时",
            moonsCount: "82+",
            temperature: "-178°C",
            description: "以其壮观的环系统而闻名，这些环由冰粒子和小岩石碎片组成。土星是太阳系中第二大的行星，也是一个气态巨行星。"
        }
    },
    uranus: { 
        radius: 1.8, 
        semimajorAxis: 70,
        eccentricity: 0.046,
        inclination: 0.8,
        speed: 0.0004, 
        rotationSpeed: -0.014, // 逆向自转，周期约17.2小时
        texture: TEXTURE_BASE_URL + 'uranus.jpg',
        info: {
            name: "天王星",
            diameter: "51,118 公里",
            distance: "19.18 天文单位",
            orbitPeriod: "84.01 年",
            rotationPeriod: "17.2 小时（逆行）",
            moonsCount: "27",
            temperature: "-224°C",
            description: "一颗冰巨行星，由于其含有甲烷的大气层而呈现蓝绿色。它的旋转轴几乎与其公转平面平行，就像是'侧躺'着绕太阳公转。"
        }
    },
    neptune: { 
        radius: 1.7, 
        semimajorAxis: 85,
        eccentricity: 0.010,
        inclination: 1.8,
        speed: 0.0001, 
        rotationSpeed: 0.015, // 自转周期约16.1小时
        texture: TEXTURE_BASE_URL + 'neptune.jpg',
        info: {
            name: "海王星",
            diameter: "49,528 公里",
            distance: "30.07 天文单位",
            orbitPeriod: "164.8 年",
            rotationPeriod: "16.1 小时",
            moonsCount: "14",
            temperature: "-218°C",
            description: "太阳系中最远的行星（自从冥王星被重新分类为矮行星以来），也是一颗冰巨行星。它有风速可达2,100公里/小时的剧烈风暴。"
        }
    }
};

// 初始化场景
function init() {
    // 创建场景
    scene = new THREE.Scene();
    
    // 创建相机
    camera = new THREE.PerspectiveCamera(
        60, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    camera.position.set(0, 50, 100);
    
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').appendChild(renderer.domElement);
    
    // 添加轨道控制
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // 添加环境光 - 大幅降低强度，突出太阳光效果
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // 从 1.5 降低到 0.2
    scene.add(ambientLight);
    
    // 创建行星
    createSolarSystem();
    
    // 添加星空背景
    createStarfield();
    
    // 添加事件监听
    window.addEventListener('resize', onWindowResize);
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    document.getElementById('speed-slider').addEventListener('input', updateSpeed);
    document.getElementById('close-info').addEventListener('click', closePlanetInfo);
    
    // 添加行星选择事件处理
    setupPlanetSelection();
    
    // 添加鼠标交互事件
    addMouseInteraction();
    
    // 开始动画循环
    animate();
}

// 添加行星选择事件处理
function setupPlanetSelection() {
    const planetItems = document.querySelectorAll('#planet-selection li');
    planetItems.forEach(item => {
        item.addEventListener('click', function() {
            const planetName = this.getAttribute('data-planet');
            selectPlanet(planetName);
            
            // 更新选中状态样式
            planetItems.forEach(el => el.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// 选择行星
function selectPlanet(planetName) {
    selectedPlanet = planetName;
    
    // 显示行星信息面板
    const planetInfo = document.getElementById('planet-info');
    planetInfo.classList.remove('hidden');
    
    // 更新行星信息
    const info = PLANET_DATA[planetName].info;
    document.getElementById('planet-name').textContent = info.name;
    document.getElementById('planet-diameter').textContent = info.diameter;
    document.getElementById('planet-distance').textContent = info.distance;
    document.getElementById('planet-orbit-period').textContent = info.orbitPeriod;
    document.getElementById('planet-rotation-period').textContent = info.rotationPeriod;
    document.getElementById('planet-moons-count').textContent = info.moonsCount;
    document.getElementById('planet-temperature').textContent = info.temperature;
    document.getElementById('planet-description').textContent = info.description;
    
    // 将相机移动到选中的行星
    if (planetName === 'sun') {
        focusOnPlanet(sun);
    } else if (planets[planetName]) {
        focusOnPlanet(planets[planetName]);
    }
}

// 移动相机到选中的行星
function focusOnPlanet(planet) {
    if (!planet) return;
    
    // 设置相机动画起始值
    cameraStartPosition.copy(camera.position);
    controlsStartTarget.copy(controls.target);
    
    // 计算目标位置
    const planetPos = planet.position.clone();
    
    // 计算基于行星大小的适当距离
    let planetRadius = 1;
    if (planet.geometry && planet.geometry.parameters) {
        planetRadius = planet.geometry.parameters.radius || 1;
    }
    const distanceFactor = planetRadius * 10;
    
    // 计算目标相机位置（在行星前方一定距离处）
    cameraTargetPosition.copy(planetPos).add(new THREE.Vector3(distanceFactor, distanceFactor/2, distanceFactor));
    
    // 目标控制中心为行星位置
    controlsTargetPosition.copy(planetPos);
    
    // 启动动画
    isAnimatingCamera = true;
    cameraAnimationStartTime = Date.now();
    
    // 更新行星信息面板
    const planetName = planet.userData.name;
    
    // 显示行星信息
    if (PLANET_DATA[planetName]) {
        const info = PLANET_DATA[planetName].info;
        document.getElementById('planet-name').textContent = info.name;
        document.getElementById('planet-diameter').textContent = info.diameter;
        document.getElementById('planet-distance').textContent = info.distance;
        document.getElementById('planet-orbit-period').textContent = info.orbitPeriod;
        document.getElementById('planet-rotation-period').textContent = info.rotationPeriod;
        document.getElementById('planet-moons-count').textContent = info.moonsCount;
        document.getElementById('planet-temperature').textContent = info.temperature;
        document.getElementById('planet-description').textContent = info.description;
        document.getElementById('planet-info').classList.remove('hidden');
    }
}

// 关闭行星信息面板
function closePlanetInfo() {
    document.getElementById('planet-info').classList.add('hidden');
    selectedPlanet = null;
    
    // 移除行星选择的活动状态
    const planetItems = document.querySelectorAll('#planet-selection li');
    planetItems.forEach(el => el.classList.remove('active'));
}

// 创建星空背景
function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
    });
    
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }
    
    starGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(starVertices, 3)
    );
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

// 创建太阳系
function createSolarSystem() {
    // 添加备用纹理材质处理，以防纹理加载失败
    const fallbackMaterials = {
        sun: new THREE.MeshStandardMaterial({ 
            color: 0xffff00, 
            emissive: PLANET_DATA.sun.emissive,
            emissiveIntensity: PLANET_DATA.sun.emissiveIntensity 
        }),
        mercury: new THREE.MeshStandardMaterial({ color: 0xaaaaaa }),
        venus: new THREE.MeshStandardMaterial({ color: 0xf9d5a7 }),
        earth: new THREE.MeshStandardMaterial({ color: 0x2233ff }),
        mars: new THREE.MeshStandardMaterial({ color: 0xff4400 }),
        jupiter: new THREE.MeshStandardMaterial({ color: 0xdda52d }),
        saturn: new THREE.MeshStandardMaterial({ color: 0xdfd3a9 }),
        uranus: new THREE.MeshStandardMaterial({ color: 0x99ccff }),
        neptune: new THREE.MeshStandardMaterial({ color: 0x3366ff }),
        moon: new THREE.MeshStandardMaterial({ color: 0xffffff })
    };

    // 创建太阳
    const sunGeometry = new THREE.SphereGeometry(PLANET_DATA.sun.radius, 32, 32);
    // 添加错误处理
    let sunMaterial = fallbackMaterials.sun;
    try {
        const sunTexture = textureLoader.load(PLANET_DATA.sun.texture, 
            // 成功回调
            undefined, 
            // 进度回调
            undefined,
            // 错误回调
            (err) => {
                console.warn('无法加载太阳纹理：', err);
                console.log('使用备用材质');
            }
        );
        sunMaterial = new THREE.MeshStandardMaterial({
            map: sunTexture,
            emissive: PLANET_DATA.sun.emissive,
            emissiveIntensity: PLANET_DATA.sun.emissiveIntensity
        });
    } catch (error) {
        console.warn('创建太阳材质时出错：', error);
    }
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    
    // 添加太阳标签
    const sunLabel = createPlanetLabel(PLANET_DATA.sun.info.name);
    sun.add(sunLabel);
    sun.userData.label = sunLabel;
    
    scene.add(sun);
    
    // 添加太阳光源 - 增强点光源强度和范围 (从 5 增加到 10)
    const sunLight = new THREE.PointLight(0xffffff, 500, 500); // 强度从 5 改为 10
    sun.add(sunLight);
    
    // 创建行星
    for (const [planetName, planetInfo] of Object.entries(PLANET_DATA)) {
        if (planetName === 'sun') continue; // 太阳已创建
        
        // 使用纹理创建行星（带错误处理）
        let planetMaterial = fallbackMaterials[planetName];
        try {
            const planetTexture = textureLoader.load(planetInfo.texture,
                undefined,
                undefined,
                (err) => {
                    console.warn(`无法加载${planetName}纹理：`, err);
                }
            );
            
            // 基础材质设置
            const materialOptions = {
                map: planetTexture,
                color: 0xffffff,
                roughness: 0.5,
                metalness: 0.2
            };
            
            // 添加地球特殊效果（多层贴图）
            if (planetName === 'earth' && planetInfo.bumpTexture) {
                try {
                    // 加载凹凸贴图
                    const bumpTexture = textureLoader.load(planetInfo.bumpTexture);
                    materialOptions.bumpMap = bumpTexture;
                    materialOptions.bumpScale = 0.05;
                    
                    // 加载高光贴图
                    if (planetInfo.specularTexture) {
                        const specularTexture = textureLoader.load(planetInfo.specularTexture);
                        materialOptions.specularMap = specularTexture;
                    }
                } catch (err) {
                    console.warn(`加载地球附加纹理时出错:`, err);
                }
            }
            
            // 创建材质
            planetMaterial = new THREE.MeshStandardMaterial(materialOptions);
            
            // 添加云层（如果有）
            if (planetInfo.cloudTexture) {
                try {
                    createClouds(planetName, planetInfo);
                } catch(err) {
                    console.warn(`创建${planetName}云层时出错:`, err);
                }
            }
            
        } catch (error) {
            console.warn(`创建${planetName}材质时出错：`, error);
        }
        
        const geometry = new THREE.SphereGeometry(planetInfo.radius, 32, 32);
        const planet = new THREE.Mesh(geometry, planetMaterial);
        
        // 存储行星数据
        planet.userData = { 
            // 如果没有椭圆轨道参数，使用旧的distance参数
            distance: planetInfo.distance,
            semimajorAxis: planetInfo.semimajorAxis,
            eccentricity: planetInfo.eccentricity,
            inclination: planetInfo.inclination,
            speed: planetInfo.speed,
            angle: Math.random() * Math.PI * 2, // 随机初始位置
            rotationSpeed: planetInfo.rotationSpeed
        };
        
        // 添加行星标签
        const planetLabel = createPlanetLabel(planetInfo.info.name);
        planet.add(planetLabel);
        planet.userData.label = planetLabel;
        
        // 将行星放置在其轨道上的初始位置
        updatePlanetPosition(planet, planet.userData.angle);
        
        // 创建轨道线 - 使用新的椭圆轨道
        if (planetInfo.semimajorAxis) {
            const orbit = createOrbit(planetInfo);
            scene.add(orbit);
        } else {
            // 旧的圆形轨道创建方式（兼容）
            const orbitGeometry = new THREE.RingGeometry(
                planetInfo.distance - 0.1, 
                planetInfo.distance + 0.1, 
                128
            );
            const orbitMaterial = new THREE.MeshBasicMaterial({
                color: 0x444444,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.2
            });
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2;
            scene.add(orbit);
        }
        
        // 添加月球（如果有）
        if (planetInfo.moons) {
            planetInfo.moons.forEach(moonInfo => {
                // 带错误处理的月球纹理
                let moonMaterial = fallbackMaterials.moon;
                try {
                    const moonTexture = textureLoader.load(moonInfo.texture,
                        undefined,
                        undefined,
                        (err) => {
                            console.warn('无法加载月球纹理：', err);
                        }
                    );
                    
                    const moonMaterialOptions = {
                        map: moonTexture,
                        roughness: 0.5,
                        metalness: 0.0
                    };
                    
                    // 添加月球凹凸贴图（如果有）
                    if (moonInfo.bumpTexture) {
                        const moonBumpTexture = textureLoader.load(moonInfo.bumpTexture);
                        moonMaterialOptions.bumpMap = moonBumpTexture;
                        moonMaterialOptions.bumpScale = 0.02;
                    }
                    
                    moonMaterial = new THREE.MeshStandardMaterial(moonMaterialOptions);
                } catch (error) {
                    console.warn('创建月球材质时出错：', error);
                }
                
                const moonGeometry = new THREE.SphereGeometry(moonInfo.radius, 32, 32);
                const moon = new THREE.Mesh(moonGeometry, moonMaterial);
                
                // 存储月球数据
                moon.userData = {
                    distance: moonInfo.distance,
                    semimajorAxis: moonInfo.semimajorAxis,
                    eccentricity: moonInfo.eccentricity,
                    inclination: moonInfo.inclination,
                    speed: moonInfo.speed,
                    angle: Math.random() * Math.PI * 2,
                    isMoon: true,
                    info: moonInfo.info
                };
                
                // 添加月球标签
                if (moonInfo.info) {
                    const moonLabel = createPlanetLabel(moonInfo.info.name);
                    moon.add(moonLabel);
                    moon.userData.label = moonLabel;
                }
                
                // 如果月球有椭圆轨道参数，则创建椭圆轨道
                if (moonInfo.semimajorAxis) {
                    const moonOrbit = createOrbit(moonInfo);
                    planet.add(moonOrbit);
                }
                
                planet.add(moon);
            });
        }
        
        // 添加行星环（如果有）
        if (planetInfo.rings) {
            const innerRadius = planetInfo.rings.innerRadius;
            const outerRadius = planetInfo.rings.outerRadius;
            const ringsGeometry = new THREE.RingGeometry(
                innerRadius, 
                outerRadius, 
                128 // 增加段数以获得更平滑的 UV 映射
            );

            // --- 手动修改 UV 坐标以实现径向平铺 ---
            const uvAttribute = ringsGeometry.attributes.uv;
            const positionAttribute = ringsGeometry.attributes.position;
            const vertexCount = positionAttribute.count;

            for (let i = 0; i < vertexCount; i++) {
                const x = positionAttribute.getX(i);
                const y = positionAttribute.getY(i); // RingGeometry 初始在 XY 平面
                const radius = Math.sqrt(x * x + y * y); // 计算顶点到中心的距离（半径）

                // 将半径归一化到 [0, 1] 范围
                const radialPos = (radius - innerRadius) / (outerRadius - innerRadius);
                
                // U 坐标：内径 (radialPos=0) 对应 U=1 (右边)，外径 (radialPos=1) 对应 U=0 (左边)
                const u = 1.0 - radialPos;
                // V 坐标：设为常量 0.5
                const v = 0.5; 

                uvAttribute.setXY(i, u, v);
            }
            uvAttribute.needsUpdate = true; // 通知 Three.js UV 已更新
            // --- UV 修改结束 ---
            
            // 带错误处理的环纹理
            let ringsMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffffff, // 基础颜色设为白色，主要靠纹理和光照
                side: THREE.DoubleSide,
                transparent: true,
                depthWrite: false, // 禁用深度写入，改善透明渲染
            });
            
            try {
                const ringsTexture = textureLoader.load(planetInfo.rings.texture,
                    undefined,
                    undefined,
                    (err) => {
                        console.warn('无法加载环纹理：', err);
                    }
                );
                // 将纹理应用到 Standard Material，调整透明度处理
                ringsMaterial = new THREE.MeshStandardMaterial({
                    map: ringsTexture,
                    side: THREE.DoubleSide,
                    transparent: true, // 使用纹理的 Alpha 通道
                    depthWrite: false, // 禁用深度写入，改善透明渲染
                });
            } catch (error) {
                console.warn('创建环材质时出错：', error);
            }
            
            const rings = new THREE.Mesh(ringsGeometry, ringsMaterial);
            
            // 恢复土星环的旋转到水平位置
            rings.rotation.x = Math.PI / 2;
            
            planet.add(rings);
        }
        
        planets[planetName] = planet;
        scene.add(planet);
    }

    // 添加额外的全局光照 - 大幅降低强度
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.6); // 从 1 降低到 0.8
    scene.add(hemisphereLight);
}

// 创建云层
function createClouds(planetName, planetInfo) {
    const cloudTexture = textureLoader.load(planetInfo.cloudTexture);
    
    const cloudMaterial = new THREE.MeshStandardMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.4
    });
    
    const radius = planetInfo.radius;
    const cloudGeometry = new THREE.SphereGeometry(radius * 1.01, 32, 32);
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    
    // 添加云层到行星
    planets[planetName].add(clouds);
    
    // 保存云层引用以便动画
    planets[planetName].userData.clouds = clouds;
}

// 更新行星位置 - 使用开普勒轨道方程
function updatePlanetPosition(planet, angle) {
    if (!planet.userData.semimajorAxis) {
        // 旧方法，圆形轨道
        const distance = planet.userData.distance;
        planet.position.x = Math.cos(angle) * distance;
        planet.position.z = Math.sin(angle) * distance;
        return;
    }
    
    // 使用开普勒轨道方程计算椭圆轨道位置
    const a = planet.userData.semimajorAxis;  // 半长轴
    const e = planet.userData.eccentricity;   // 偏心率
    const inclination = planet.userData.inclination * Math.PI / 180; // 轨道倾角(转换为弧度)
    
    // 计算焦距到行星的距离
    const r = a * (1 - e * e) / (1 + e * Math.cos(angle));
    
    // 计算行星在轨道平面上的位置
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    
    // 考虑轨道倾角
    const xInclined = x;
    const yInclined = Math.sin(inclination) * z;
    const zInclined = Math.cos(inclination) * z;
    
    // 设置行星位置
    planet.position.set(xInclined, yInclined, zInclined);
}

// 创建椭圆轨道线
function createOrbit(planetInfo) {
    const a = planetInfo.semimajorAxis; // 半长轴
    const e = planetInfo.eccentricity;  // 偏心率
    const b = a * Math.sqrt(1 - e * e); // 半短轴
    const c = a * e;                   // 焦距
    
    // 创建更精细的椭圆路径点
    const points = [];
    const segments = 128;
    
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        
        // 考虑轨道倾角
        const inclination = planetInfo.inclination * Math.PI / 180;
        const xInclined = x;
        const yInclined = Math.sin(inclination) * z;
        const zInclined = Math.cos(inclination) * z;
        
        points.push(new THREE.Vector3(xInclined, yInclined, zInclined));
    }
    
    // 创建轨道曲线
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMaterial = new THREE.LineBasicMaterial({ 
        color: 0x444444,
        transparent: true,
        opacity: 0.5
    });
    
    return new THREE.Line(orbitGeometry, orbitMaterial);
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 处理相机动画
    if (isAnimatingCamera) {
        const elapsed = Date.now() - cameraAnimationStartTime;
        const progress = Math.min(elapsed / cameraAnimationDuration, 1.0);
        
        // 使用平滑的缓动函数
        const smoothProgress = easeInOutCubic(progress);
        
        // 插值计算相机位置和控制目标
        camera.position.lerpVectors(cameraStartPosition, cameraTargetPosition, smoothProgress);
        controls.target.lerpVectors(controlsStartTarget, controlsTargetPosition, smoothProgress);
        controls.update();
        
        // 动画完成
        if (progress >= 1.0) {
            isAnimatingCamera = false;
        }
    } else {
        // 在非动画状态下也更新轨道控制器
        controls.update();
    }
    
    // 更新行星位置
    if (!isPaused) {
        // 旋转太阳
        sun.rotation.y += PLANET_DATA.sun.rotationSpeed * speedFactor;
        
        // 更新行星位置
        for (const [planetName, planet] of Object.entries(planets)) {
            // 更新行星角度
            planet.userData.angle += planet.userData.speed * speedFactor;
            
            // 更新行星位置
            updatePlanetPosition(planet, planet.userData.angle);
            
            // 行星自转 - 使用每个行星的特定自转速度
            planet.rotation.y += planet.userData.rotationSpeed * speedFactor;
            
            // 更新云层（如果有）
            if (planet.userData.clouds) {
                planet.userData.clouds.rotation.y += planet.userData.rotationSpeed * 0.7 * speedFactor; // 云层旋转速度略慢于行星
            }
            
            // 更新月球位置
            planet.children.forEach(child => {
                if (child.userData && child.userData.isMoon) {
                    child.userData.angle += child.userData.speed * speedFactor;
                    
                    // 使用椭圆轨道或圆形轨道更新位置
                    if (child.userData.semimajorAxis) {
                        // 椭圆轨道更新
                        updatePlanetPosition(child, child.userData.angle);
                    } else {
                        // 旧的圆形轨道更新方式
                        const distance = child.userData.distance;
                        child.position.x = Math.cos(child.userData.angle) * distance;
                        child.position.z = Math.sin(child.userData.angle) * distance;
                    }
                    
                    // 使用自定义自转速度
                    if (child.userData.rotationSpeed) {
                        child.rotation.y += child.userData.rotationSpeed * speedFactor;
                    } else {
                        child.rotation.y += 0.01 * speedFactor; // 兼容旧数据
                    }
                }
            });
        }
    }
    
    renderer.render(scene, camera);
    
    // 渲染标签
    if (labelRenderer) {
        labelRenderer.render(scene, camera);
    }
}

// 窗口大小调整响应
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // 更新标签渲染器大小
    if (labelRenderer) {
        labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// 暂停/继续模拟
function togglePause() {
    isPaused = !isPaused;
}

// 更新模拟速度
function updateSpeed(event) {
    speedFactor = parseFloat(event.target.value);
    document.getElementById('speed-value').textContent = speedFactor.toFixed(1) + 'x';
}

// 创建CSS样式的行星标签
function createPlanetLabel(name) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'planet-label';
    labelDiv.textContent = name;
    labelDiv.style.display = 'none'; // 初始隐藏
    
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 1.5, 0); // 位置在行星上方
    return label;
}

// 添加鼠标交互事件
function addMouseInteraction() {
    // 创建鼠标移动事件监听
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);
    
    // 初始化标签渲染器
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.getElementById('container').appendChild(labelRenderer.domElement);
}

// 鼠标移动事件处理
function onMouseMove(event) {
    // 将鼠标位置转换为标准化设备坐标
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // 更新光线投射器
    raycaster.setFromCamera(mouse, camera);
    
    // 获取所有可交互对象（行星和月球）
    const interactableObjects = getInteractableObjects();
    
    // 检测与物体的交叉
    const intersects = raycaster.intersectObjects(interactableObjects);
    
    if (intersects.length > 0) {
        const object = intersects[0].object;
        if (hoveredObject !== object) {
            // 如果悬停对象改变
            if (hoveredObject) {
                // 隐藏先前对象的标签
                hideLabel(hoveredObject);
            }
            
            // 显示当前对象的标签
            showLabel(object);
            hoveredObject = object;
            document.body.style.cursor = 'pointer';
        }
    } else {
        // 如果没有交叉，隐藏所有标签
        if (hoveredObject) {
            hideLabel(hoveredObject);
            hoveredObject = null;
            document.body.style.cursor = 'auto';
        }
    }
}

// 显示标签
function showLabel(object) {
    const label = object.userData.label;
    if (label) {
        label.element.style.display = 'block';
    }
}

// 隐藏标签
function hideLabel(object) {
    const label = object.userData.label;
    if (label) {
        label.element.style.display = 'none';
    }
}

// 获取所有可交互对象
function getInteractableObjects() {
    const objects = [sun];
    
    // 添加所有行星
    for (const planetName in planets) {
        const planet = planets[planetName];
        objects.push(planet);
        
        // 添加行星的月球
        planet.children.forEach(child => {
            if (child.userData && child.userData.isMoon) {
                objects.push(child);
            }
        });
    }
    
    return objects;
}

// 鼠标点击事件处理
function onMouseClick(event) {
    // 将鼠标位置转换为标准化设备坐标
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // 更新光线投射器
    raycaster.setFromCamera(mouse, camera);
    
    // 获取所有可交互对象
    const interactableObjects = getInteractableObjects();
    
    // 检测与物体的交叉
    const intersects = raycaster.intersectObjects(interactableObjects);
    
    if (intersects.length > 0) {
        const object = intersects[0].object;
        
        // 根据对象显示相应的信息面板
        if (object === sun) {
            // 显示太阳信息面板
            selectPlanet('sun');
        } else if (object.userData.isMoon) {
            // 显示月球信息面板
            showMoonInfo(object);
        } else {
            // 查找点击的是哪个行星
            for (const planetName in planets) {
                if (planets[planetName] === object) {
                    selectPlanet(planetName);
                    break;
                }
            }
        }
    }
}

// 显示月球信息
function showMoonInfo(moon) {
    // 根据月球的信息显示面板
    if (moon.userData && moon.userData.info) {
        const info = moon.userData.info;
        
        // 显示行星信息面板
        const planetInfo = document.getElementById('planet-info');
        planetInfo.classList.remove('hidden');
        
        // 更新行星信息
        document.getElementById('planet-name').textContent = info.name;
        document.getElementById('planet-diameter').textContent = info.diameter;
        document.getElementById('planet-distance').textContent = info.distance;
        document.getElementById('planet-orbit-period').textContent = info.orbitPeriod;
        document.getElementById('planet-rotation-period').textContent = info.rotationPeriod;
        document.getElementById('planet-moons-count').textContent = '0'; // 月球没有卫星
        document.getElementById('planet-temperature').textContent = info.temperature;
        document.getElementById('planet-description').textContent = info.description;
        
        // 聚焦相机到月球
        focusOnPlanet(moon);
    }
}

// 添加缓动函数
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 启动应用
init(); 