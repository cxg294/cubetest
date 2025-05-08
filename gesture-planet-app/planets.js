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
                isEmissive: true
            },
            {
                name: '水星',
                texturePath: 'image/mercury.jpg',
                size: 0.8,
                rotationSpeed: 0.004
            },
            {
                name: '金星',
                texturePath: 'image/venus.jpg',
                size: 1.2,
                rotationSpeed: 0.002
            },
            {
                name: '地球',
                texturePath: 'image/earth.jpg',
                size: 1.5,
                rotationSpeed: 0.003,
                hasAtmosphere: true,
                atmosphereColor: 0x00a1ff,
                atmosphereSize: 1.05
            },
            {
                name: '月球',
                texturePath: 'image/moon.jpg',
                size: 0.5,
                rotationSpeed: 0.001
            },
            {
                name: '火星',
                texturePath: 'image/mars.jpg',
                size: 1.1,
                rotationSpeed: 0.003
            },
            {
                name: '木星',
                texturePath: 'image/jupiter.jpg',
                size: 2.2,
                rotationSpeed: 0.006
            },
            {
                name: '土星',
                texturePath: 'image/saturn.jpg',
                size: 2.0,
                rotationSpeed: 0.005,
                hasRings: true,
                ringsTexturePath: 'image/saturn-rings.png',
                ringsSize: 2.0
            },
            {
                name: '天王星',
                texturePath: 'image/uranus.jpg',
                size: 1.7,
                rotationSpeed: 0.004
            },
            {
                name: '海王星',
                texturePath: 'image/neptune.jpg',
                size: 1.7,
                rotationSpeed: 0.004
            }
        ];

        this.currentPlanetIndex = 3; // 默认地球
        this.textureLoader = new THREE.TextureLoader();
        this.planetMeshes = [];
        this.scene = null;
        this.initialRotationSpeed = 0.003;
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

    // 显示指定行星
    showPlanet(index) {
        // 隐藏所有行星
        this.planetMeshes.forEach(planet => {
            planet.visible = false;
        });
        
        // 显示选中的行星
        this.planetMeshes[index].visible = true;
        this.currentPlanetIndex = index;
        
        // 重置星球位置到屏幕中央
        const planet = this.planetMeshes[index];
        planet.position.set(0, 0, 0); // 居中放置
        planet.rotation.x = Math.PI * 0.1; // 保持一定角度的倾斜
        planet.scale.set(1, 1, 1); // 重置为默认大小
        
        // 更新UI显示
        document.getElementById('current-planet').textContent = `当前星球：${this.planets[index].name}`;
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
} 