// 定义行星类
class PlanetSystem {
    constructor() {
        // 行星数据
        this.planets = [
            {
                name: '太阳',
                texturePath: 'image/sun.jpg',
                size: 3.0,
                rotationSpeed: 0.001,
                glowColor: 0xffff00,
                glowIntensity: 0.7,
                isEmissive: true,
                // 详细信息
                diameter: '1,392,700 km',
                distance: '0 km（中心）',
                orbit: '约2.5亿年（绕银河系中心）',
                description: '太阳是太阳系的中心天体，占据太阳系总质量的99.86%。它是一颗黄矮星，通过核聚变反应产生巨大的能量。'
            },
            {
                name: '水星',
                texturePath: 'image/mercury.jpg',
                size: 0.8,
                rotationSpeed: 0.004,
                // 详细信息
                diameter: '4,879 km',
                distance: '5,790万 km',
                orbit: '88天',
                description: '水星是太阳系中最小且最接近太阳的行星，表面覆盖着陨石坑。由于没有大气层，温差极大，白天可达430°C，夜间低至-180°C。'
            },
            {
                name: '金星',
                texturePath: 'image/venus.jpg',
                size: 1.2,
                rotationSpeed: 0.002,
                // 详细信息
                diameter: '12,104 km',
                distance: '1.08亿 km',
                orbit: '225天',
                description: '金星是太阳系中最热的行星，表面温度可达465°C。它被厚厚的二氧化碳大气层包裹，造成强烈的温室效应。金星的自转方向与其他行星相反。'
            },
            {
                name: '地球',
                texturePath: 'image/earth.jpg',
                size: 1.5,
                rotationSpeed: 0.003,
                hasAtmosphere: true,
                atmosphereColor: 0x00a1ff,
                atmosphereSize: 1.05,
                // 详细信息
                diameter: '12,742 km',
                distance: '1.5亿 km',
                orbit: '365.25天',
                description: '地球是太阳系中第三颗行星，是目前已知唯一孕育和支持生命的天体。地球表面71%被水覆盖，拥有保护生命的臭氧层和磁场。'
            },
            {
                name: '月球',
                texturePath: 'image/moon.jpg',
                size: 0.5,
                rotationSpeed: 0.001,
                // 详细信息
                diameter: '3,474 km',
                distance: '384,400 km（距地球）',
                orbit: '27.3天（绕地球）',
                description: '月球是地球的唯一天然卫星，是太阳系中第五大卫星。它的引力影响着地球的潮汐。月球表面有大量陨石坑，几乎没有大气层。'
            },
            {
                name: '火星',
                texturePath: 'image/mars.jpg',
                size: 1.1,
                rotationSpeed: 0.003,
                // 详细信息
                diameter: '6,779 km',
                distance: '2.28亿 km',
                orbit: '687天',
                description: '火星被称为"红色星球"，因其表面富含氧化铁而呈现红色。它有两个小卫星：火卫一和火卫二。火星表面有最高的奥林匹斯山，高度为太阳系最高。'
            },
            {
                name: '木星',
                texturePath: 'image/jupiter.jpg',
                size: 2.2,
                rotationSpeed: 0.006,
                // 详细信息
                diameter: '139,820 km',
                distance: '7.78亿 km',
                orbit: '11.86年',
                description: '木星是太阳系中最大的行星，质量是太阳系中其他行星总和的2.5倍。它主要由氢和氦组成，表面有著名的大红斑，这是一个持续了至少300年的巨大风暴。'
            },
            {
                name: '土星',
                texturePath: 'image/saturn.jpg',
                size: 2.0,
                rotationSpeed: 0.005,
                hasRings: true,
                ringsTexturePath: 'image/saturn-rings.png',
                ringsSize: 2.0,
                // 详细信息
                diameter: '116,460 km',
                distance: '14.3亿 km',
                orbit: '29.5年',
                description: '土星以其壮观的环系统而闻名，这些环主要由冰粒子和岩石碎片组成。土星有82个已知卫星，其中最大的土卫六（泰坦）是太阳系中唯一有浓厚大气层的卫星。'
            },
            {
                name: '天王星',
                texturePath: 'image/uranus.jpg',
                size: 1.7,
                rotationSpeed: 0.004,
                // 详细信息
                diameter: '50,724 km',
                distance: '28.7亿 km',
                orbit: '84年',
                description: '天王星的独特之处在于它的自转轴几乎与公转轨道平行，像是"侧卧"着公转。它呈青蓝色是因为大气中含有甲烷气体吸收了红光。天王星有27个已知卫星。'
            },
            {
                name: '海王星',
                texturePath: 'image/neptune.jpg',
                size: 1.7,
                rotationSpeed: 0.004,
                // 详细信息
                diameter: '49,244 km',
                distance: '45亿 km',
                orbit: '165年',
                description: '海王星是太阳系中最远的行星，表面有强烈的风暴系统，包括"大黑斑"。它的风速可达每小时2,100公里，是太阳系中最快的。海王星有14个已知卫星。'
            }
        ];

        this.currentPlanetIndex = 3; // 默认地球
        this.textureLoader = new THREE.TextureLoader();
        this.planetMeshes = [];
        this.scene = null;
        this.initialRotationSpeed = 0.003;
        
        // 获取行星信息面板元素
        this.planetInfoName = document.getElementById('planet-info-name');
        this.planetDiameter = document.getElementById('planet-diameter');
        this.planetDistance = document.getElementById('planet-distance');
        this.planetOrbit = document.getElementById('planet-orbit');
        this.planetDescription = document.getElementById('planet-description');
    }

    // 初始化场景
    initScene(scene, container) {
        this.scene = scene;
        this.container = container;

        // 添加背景星空
        this.addStarBackground();

        // 创建行星
        this.createAllPlanets();

        // 默认显示地球
        this.showPlanet(this.currentPlanetIndex);
    }

    // 添加星空背景
    addStarBackground() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 10000;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 2000;
            positions[i + 1] = (Math.random() - 0.5) * 2000;
            positions[i + 2] = (Math.random() - 0.5) * 2000;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    // 创建所有行星模型
    createAllPlanets() {
        this.planets.forEach((planetData, index) => {
            const planetMesh = this.createPlanetMesh(planetData);
            planetMesh.visible = false; // 默认隐藏
            this.planetMeshes.push(planetMesh);
            this.scene.add(planetMesh);
        });
    }

    // 创建单个行星模型
    createPlanetMesh(planetData) {
        // 创建行星几何体
        const geometry = new THREE.SphereGeometry(planetData.size, 64, 64);
        
        // 基本材质
        const material = new THREE.MeshPhongMaterial();
        
        // 添加纹理
        if (planetData.texturePath) {
            material.map = this.textureLoader.load(planetData.texturePath);
        }
        
        // 添加凹凸贴图（如果有）
        if (planetData.bumpMapPath) {
            material.bumpMap = this.textureLoader.load(planetData.bumpMapPath);
            material.bumpScale = 0.05;
        }
        
        // 添加高光贴图（如果有）
        if (planetData.specularMapPath) {
            material.specularMap = this.textureLoader.load(planetData.specularMapPath);
            material.specular = new THREE.Color(0x333333);
        }
        
        // 自发光（如太阳）
        if (planetData.isEmissive) {
            material.emissive = new THREE.Color(0xffff00);
            material.emissiveIntensity = 1;
            material.shininess = 0;
            
            // 解决太阳黑边问题
            material.transparent = true;
            material.depthWrite = false;
            material.blending = THREE.AdditiveBlending;
        }

        // 创建行星网格
        const planet = new THREE.Mesh(geometry, material);
        planet.rotation.x = Math.PI * 0.1;
        planet.userData = {
            rotationSpeed: planetData.rotationSpeed || this.initialRotationSpeed,
            name: planetData.name
        };

        // 创建行星组，包含行星及其附加物（如大气层、光环等）
        const planetGroup = new THREE.Group();
        planetGroup.add(planet);
        planetGroup.userData = {
            mainPlanet: planet,
            name: planetData.name
        };

        // 添加大气层（如果需要）
        if (planetData.hasAtmosphere) {
            const atmosphereGeometry = new THREE.SphereGeometry(
                planetData.size * (planetData.atmosphereSize || 1.05), 
                64, 
                64
            );
            const atmosphereMaterial = new THREE.MeshLambertMaterial({
                color: planetData.atmosphereColor || 0x00a1ff,
                transparent: true,
                opacity: 0.2,
                side: THREE.BackSide
            });
            const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            planetGroup.add(atmosphere);
        }

        // 添加光环（如土星）
        if (planetData.hasRings) {
            // 创建土星环几何体
            const innerRadius = planetData.size * 1.3;
            const outerRadius = planetData.size * (planetData.ringsSize || 2.0);
            const ringGeometry = new THREE.RingGeometry(
                innerRadius,
                outerRadius,
                128, // 增加周向分段数以获得更平滑的效果
                1    // 径向分段数
            );
            
            // --- 手动修改 UV 坐标以实现径向平铺（同心圆效果）---
            const uvAttribute = ringGeometry.attributes.uv;
            const positionAttribute = ringGeometry.attributes.position;
            const vertexCount = positionAttribute.count;

            for (let i = 0; i < vertexCount; i++) {
                const x = positionAttribute.getX(i);
                const y = positionAttribute.getY(i); // RingGeometry 初始在 XY 平面
                const radius = Math.sqrt(x * x + y * y); // 计算顶点到中心的距离（半径）

                // 将半径归一化到 [0, 1] 范围
                const radialPos = (radius - innerRadius) / (outerRadius - innerRadius);
                
                // U坐标：内径对应U=1，外径对应U=0
                const u = 1.0 - radialPos;
                // V坐标：设为常量0.5
                const v = 0.5; 

                uvAttribute.setXY(i, u, v);
            }
            uvAttribute.needsUpdate = true; // 通知Three.js UV已更新
            // --- UV修改结束 ---
            
            // 加载纹理（不再需要旋转纹理）
            const texture = this.textureLoader.load(planetData.ringsTexturePath);
            
            const ringMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false // 改善透明渲染
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            planetGroup.add(ring);
        }

        // 添加发光效果（如太阳）
        if (planetData.glowIntensity) {
            // 使用渐变材质创建更自然的光晕效果
            
            // 光晕渐变颜色定义
            const glowPairs = [
                { inner: 0xffff44, outer: 0xffcc00, size: 1.1 }, // 内层：明亮黄色到橙黄色
                { inner: 0xffcc00, outer: 0xff7700, size: 1.2 }, // 中层：橙黄色到橙色
                { inner: 0xff7700, outer: 0xff3300, size: 1.35 } // 外层：橙色到红橙色
            ];
            
            // 为每层光晕创建渐变效果
            for (const glow of glowPairs) {
                // 创建基于着色器的渐变材质
                const glowMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        innerColor: { value: new THREE.Color(glow.inner) },
                        outerColor: { value: new THREE.Color(glow.outer) }
                    },
                    vertexShader: `
                        varying vec3 vNormal;
                        
                        void main() {
                            vNormal = normalize(normalMatrix * normal);
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform vec3 innerColor;
                        uniform vec3 outerColor;
                        varying vec3 vNormal;
                        
                        void main() {
                            // 计算从中心到边缘的渐变因子
                            float intensity = 1.0 - pow(abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.5);
                            
                            // 在innerColor和outerColor之间进行插值
                            vec3 glowColor = mix(innerColor, outerColor, intensity);
                            
                            // 应用渐变透明度，边缘更透明
                            gl_FragColor = vec4(glowColor, 0.6 * (1.0 - intensity * 0.5));
                        }
                    `,
                    side: THREE.BackSide,
                    blending: THREE.AdditiveBlending,
                    transparent: true,
                    depthWrite: false
                });
                
                // 创建光晕几何体
                const glowGeometry = new THREE.SphereGeometry(
                    planetData.size * glow.size, 
                    32, 
                    32
                );
                
                const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                planetGroup.add(glowMesh);
            }
            
            // 添加额外的外发光层
            const outerGlowGeometry = new THREE.SphereGeometry(
                planetData.size * 1.5, 
                32, 
                32
            );
            
            const outerGlowMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    color: { value: new THREE.Color(0xff2200) },
                },
                vertexShader: `
                    varying vec3 vNormal;
                    
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 color;
                    varying vec3 vNormal;
                    
                    void main() {
                        float intensity = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
                        gl_FragColor = vec4(color, intensity * 0.3);
                    }
                `,
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthWrite: false
            });
            
            const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
            planetGroup.add(outerGlow);
        }

        return planetGroup;
    }

    // 显示行星
    showPlanet(index) {
        // 隐藏当前行星
        if (this.planetMeshes[this.currentPlanetIndex]) {
            this.planetMeshes[this.currentPlanetIndex].visible = false;
        }
        
        // 更新当前行星索引
        this.currentPlanetIndex = index;
        
        // 获取新的行星对象
        const planetToShow = this.planetMeshes[this.currentPlanetIndex];
        
        if (planetToShow) {
            // 重置行星位置和状态
            planetToShow.position.set(0, 0, 0); // 居中放置
            planetToShow.rotation.x = Math.PI * 0.1; // 保持一定角度的倾斜
            planetToShow.scale.set(1, 1, 1); // 重置为默认大小
            
            // 显示行星
            planetToShow.visible = true;
            
            // 更新行星信息面板
            this.updatePlanetInfo(this.currentPlanetIndex);
        }
    }

    // 切换到下一个行星
    nextPlanet() {
        const nextIndex = (this.currentPlanetIndex + 1) % this.planets.length;
        this.showPlanet(nextIndex); // 显示并居中下一个行星
    }

    // 获取当前行星
    getCurrentPlanet() {
        return this.planetMeshes[this.currentPlanetIndex];
    }

    // 旋转行星
    rotatePlanet(x, y) {
        const planetGroup = this.getCurrentPlanet();
        if (planetGroup) {
            // 旋转整个行星组，而不仅仅是行星本身
            // 调整旋转方向以匹配手部移动，增加旋转速度
            planetGroup.rotation.y += x * 0.25;
            planetGroup.rotation.x += y * 0.25;
            
            // 确保x轴旋转范围不超过一定角度，防止过度旋转
            planetGroup.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, planetGroup.rotation.x));
        }
    }

    // 更新旋转（用于动画循环）
    update(speedMultiplier = 1.0, enableRotation = true) {
        const planet = this.getCurrentPlanet();
        if (planet && planet.userData.mainPlanet && enableRotation) {
            // 自动旋转 - 应用速度倍率
            planet.userData.mainPlanet.rotation.y += planet.userData.mainPlanet.userData.rotationSpeed * speedMultiplier;
        }
    }

    // 更新行星信息面板
    updatePlanetInfo(index) {
        const planetData = this.planets[index];
        
        if (this.planetInfoName) {
            this.planetInfoName.textContent = planetData.name;
        }
        
        if (this.planetDiameter) {
            this.planetDiameter.textContent = planetData.diameter;
        }
        
        if (this.planetDistance) {
            this.planetDistance.textContent = planetData.distance;
        }
        
        if (this.planetOrbit) {
            this.planetOrbit.textContent = planetData.orbit;
        }
        
        if (this.planetDescription) {
            this.planetDescription.textContent = planetData.description;
        }
    }
} 