// 游戏常量
const GAME_WIDTH = 600;
const GAME_HEIGHT = 800;
const PLAYER_SPEED = 5;
const ENEMY_SPEED_MIN = 2;
const ENEMY_SPEED_MAX = 5;
const ENEMY_SPAWN_INTERVAL = 667; // 敌机生成间隔（毫秒） (原 1000ms, 约1.5倍密度)
const SHOOTER_ENEMY_SPAWN_CHANCE = 0.15; // 射击敌机生成概率 (原 0.3)
const POWERUP_SPAWN_CHANCE = 0.12; // 道具生成概率 (原 0.15)
const POWERUP_DURATION = 5000; // 道具持续时间（毫秒）

// 游戏变量
let game = {
    isRunning: false,
    isPaused: false,
    score: 0,
    lives: 3,
    player: null,
    enemies: [],
    bullets: [],
    powerups: [],
    playerBullets: [],
    enemyBullets: [],
    playerTrailParticles: [], // 新增：玩家飞机拖尾粒子
    explosionParticles: [],   // 新增：爆炸粒子
    lastEnemySpawn: 0,
    activePowerups: {
        split: false,
        giant: false
    },
    powerupEndTime: {
        split: 0,
        giant: 0
    },
    // 新增：屏幕效果控制变量
    screenShakeDuration: 0,
    screenShakeMagnitude: 0,
    screenFlashBaseColor: '255,0,0',        // 基础颜色 (R,G,B string)
    screenFlashMaxAlpha: 0.4,             // 此效果希望达到的最大Alpha
    screenFlashCurrentAlpha: 0,           // 当前帧应用的Alpha
    screenFlashInitialDuration: 20,       // 效果的初始设定时长
    screenFlashDuration: 0,                // 效果的剩余时长
    pickupEffectParticles: [], 
    scorePopups: [], // 新增：得分冒泡数组

    // 新增：炸弹激光扫描效果变量
    bombLaserActive: false,
    bombLaserY: 0,
    bombLaserHeight: 30, // 激光束的高度/厚度
    bombLaserSpeed: 40,  // 激光束向上扫描的速度
    bombLaserColor1: 'rgba(100, 220, 255, 0.8)', // 亮青色
    bombLaserColor2: 'rgba(200, 255, 255, 0.5)'  // 更亮的中心/边缘
};

// 全局变量用于手势识别
let hands = null;
let camera = null;

// 碰撞检测函数
function checkCollision(obj1, obj2) {
    // 确保两个对象都存在且有必要的属性
    if (!obj1 || !obj2 || 
        typeof obj1.x === 'undefined' || typeof obj1.y === 'undefined' || typeof obj1.width === 'undefined' || typeof obj1.height === 'undefined' ||
        typeof obj2.x === 'undefined' || typeof obj2.y === 'undefined' || typeof obj2.width === 'undefined' || typeof obj2.height === 'undefined') {
        // console.warn("Collision check skipped: Invalid object provided.", obj1, obj2);
        return false; // 如果对象无效，则认为没有碰撞
    }

    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// 玩家飞机类
class Player {
    constructor() {
        this.width = 70;
        this.height = 70;
        this.x = GAME_WIDTH / 2 - this.width / 2;
        this.y = GAME_HEIGHT - this.height - 40;
        this.emoji = '🚀';
        this.fireRate = 260; // Slightly faster (original 300, then 260)
        this.giantBulletFireRate = 450; // Faster giant bullet firing (原 700ms)
        this.lastFire = 0;
        this.isControlled = false;
        this.trailSpawnCounter = 0;
    }

    draw(ctx) {
        ctx.font = `${this.width}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.isControlled) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2.5;
            ctx.strokeText(this.emoji, this.x + this.width / 2, this.y + this.height / 2);
        }
        
        ctx.fillText(this.emoji, this.x + this.width / 2, this.y + this.height / 2);
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'transparent';
        ctx.lineWidth = 1;

        if (game.isRunning && !game.isPaused) {
            this.trailSpawnCounter++;
            if (this.trailSpawnCounter % 4 === 0) {
                game.playerTrailParticles.push(new PlayerTrailParticle(
                    this.x + this.width / 2 + (Math.random() - 0.5) * 10,
                    this.y + this.height * 0.9
                ));
            }
        }
    }

    fire() {
        const now = Date.now();
        let currentFireRate = this.fireRate;

        if (game.activePowerups.giant) {
            currentFireRate = this.giantBulletFireRate;
        }

        if (now - this.lastFire > currentFireRate) {
            this.lastFire = now;
            
            if (game.activePowerups.split) {
                // 分裂子弹（三发）
                for (let i = -1; i <= 1; i++) {
                    game.playerBullets.push(new PlayerBullet(
                        this.x + this.width / 2 - 15, 
                        this.y,
                        i * 2
                    ));
                }
            } else if (game.activePowerups.giant) {
                // 巨大子弹
                game.playerBullets.push(new GiantBullet(
                    this.x + this.width / 2 - 50, 
                    this.y
                ));
            } else {
                // 普通子弹
                game.playerBullets.push(new PlayerBullet(
                    this.x + this.width / 2 - 15,
                    this.y
                ));
            }
        }
    }

    move(newX) {
        // 限制在画布范围内
        if (newX < 0) {
            this.x = 0;
        } else if (newX > GAME_WIDTH - this.width) {
            this.x = GAME_WIDTH - this.width;
        } else {
            this.x = newX;
        }
    }
}

// 基础子弹类
class Bullet {
    constructor(x, y, speedX = 0, speedY = -10, emoji = '💥') {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speedX = speedX;
        this.speedY = speedY;
        this.emoji = emoji;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
    }

    draw(ctx) {
        ctx.font = `${this.width}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x + this.width / 2, this.y + this.height / 2);
    }

    isOutOfBounds() {
        return this.y < -this.height || this.y > GAME_HEIGHT || 
               this.x < -this.width || this.x > GAME_WIDTH;
    }
}

// 玩家子弹类
class PlayerBullet extends Bullet {
    constructor(x, y, speedX = 0) {
        super(x, y, speedX, -10, ' '); // Emoji no longer used for drawing, space for placeholder
        this.width = 30; // Collision width
        this.height = 40; // Collision height
        this.visualWidth = 6; // Thinner core laser beam
        this.visualHeight = 30; // Longer beam
    }

    draw(ctx) {
        ctx.save();
        
        const coreColor = 'rgba(255, 255, 255, 1)';       // Bright White core
        const glowColor = 'rgba(255, 100, 80, 0.7)';    // Vibrant Orange-Red glow
        const strokeColor = 'rgba(255, 150, 120, 0.9)';  // Lighter Orange-Red stroke

        const pulse = Math.sin(Date.now() * 0.025) * 0.4 + 0.6; // Pulse for glow and stroke (0.6 to 1.0)

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = (15 + 6 * pulse) * (this.visualWidth / 6) ; // Larger, pulsating glow

        const drawX = this.x + (this.width - this.visualWidth) / 2;
        const drawY = this.y + (this.height - this.visualHeight) / 2;

        // 1. Draw the outer glow/stroke first for better layering
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = (2.5 + 1.5 * pulse) * (this.visualWidth / 6); // Thicker, pulsating stroke
        ctx.beginPath();
        ctx.roundRect(drawX - ctx.lineWidth/4, drawY - ctx.lineWidth/4, 
                      this.visualWidth + ctx.lineWidth/2, this.visualHeight + ctx.lineWidth/2, 
                      (this.visualWidth + ctx.lineWidth/2) / 2);
        ctx.stroke();

        // 2. Draw the white core laser beam on top
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.roundRect(drawX, drawY, this.visualWidth, this.visualHeight, this.visualWidth / 2);
        ctx.fill();
        
        ctx.restore(); 
    }
}

// 巨大子弹类
class GiantBullet extends Bullet {
    constructor(x, y) {
        super(x, y, 0, -12, '🐶'); // Reverted to emoji
        this.width = 100; // Collision width
        this.height = 100; // Collision height
        this.rotation = 0;
        // visualWidth and visualHeight are no longer needed as we use emoji size
    }

    update() {
        super.update();
        this.rotation += 0.05; 
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        
        // Dog head glow effect (reinstated original or similar)
        ctx.shadowColor = '#FF4500'; // Orange-red glow
        ctx.shadowBlur = 30; // Slightly increased blur for prominence

        // Draw the emoji, its size is determined by ctx.font
        ctx.font = `${this.width * 0.9}px Arial`; // Emoji size slightly smaller than collision box
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, 0); // Draw at the translated and rotated origin
        
        ctx.restore();
    }
}

// 敌机子弹类
class EnemyBullet extends Bullet {
    constructor(x, y) {
        super(x, y, 0, 5, '⚡');
        this.width = 18; // 略微增加 (原 15)
        this.height = 30; // 略微增加 (原 25)
    }

    draw(ctx) {
        ctx.save();
        
        const coreColor = '#FFFF00'; // 闪电核心黄色 (假设)
        const glowColor = 'rgba(255, 255, 255, 0.7)'; // 保留一些白色辉光
        const strokeColor = 'rgba(255, 0, 0, 0.9)';   // 红色描边

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;

        // 绘制描边
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        // 为了让描边在emoji外部，我们可能需要先画一个稍大的同色emoji作为描边层，或者调整emoji大小
        // 简单起见，我们直接在fillText周围尝试strokeStyle，但效果可能不完美
        // 如果用emoji，可以先画大一点的红色emoji，再画小一点的黄色emoji
        // 这里我们先尝试直接描边emoji，如果效果不好再调整
        
        // 先绘制描边版本的emoji (如果支持直接描边文本)
        // ctx.font = `${this.height}px Arial`; // 使用高度作为基准可能更合适
        // ctx.textAlign = 'center';
        // ctx.textBaseline = 'middle';
        // ctx.strokeText(this.emoji, this.x + this.width / 2, this.y + this.height / 2);

        // 绘制核心emoji
        ctx.font = `${this.height}px Arial`; // 用高度作为基准尺寸
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 模拟描边：绘制一个稍大的红色emoji，然后再绘制正常的黄色emoji
        // 这种方法对emoji可能效果不佳，因为emoji不是矢量图
        // 更好的方法是绘制自定义图形，但这里优先保留emoji
        // 先尝试只用 shadow 和 strokeStyle，如果不行，再考虑其他

        // 尝试结合glow和stroke
        ctx.shadowColor = glowColor; // 白色辉光
        ctx.shadowBlur = 8;
        
        ctx.strokeStyle = strokeColor; // 红色描边
        ctx.lineWidth = 2.5;      // 描边宽度
        // 注意：直接描边emoji (fillText/strokeText) 的效果依赖浏览器实现
        // 很多时候描边文本效果不佳，尤其是对于复杂的emoji
        // 但我们尝试一下

        // 先画描边 (可能需要调整位置以使其看起来像外部描边)
        // 这是一个简化尝试，效果可能不完美
        // ctx.strokeText(this.emoji, this.x + this.width / 2, this.y + this.height / 2); 
        
        // 更好的方式可能是使用两层绘制，但会使代码复杂
        // 为了保持emoji，我们主要依赖辉光和调整emoji颜色本身（如果可能）
        // 鉴于emoji的复杂性，最可靠的方法可能是用一个简单的形状代替它，然后描边。
        // 但我们被要求保留emoji。

        // 尝试：用红色作为主色，白色辉光作为高亮，而不是真正的描边
        ctx.fillStyle = '#FF4500'; // 将emoji本身变为橙红色
        ctx.shadowColor = 'white'; // 白色辉光
        ctx.shadowBlur = 6;
        ctx.fillText(this.emoji, this.x + this.width / 2, this.y + this.height / 2);

        // 如果一定要红色描边，并且保留黄色核心，对于emoji是困难的。
        // 退而求其次：给emoji一个红色辉光，而不是描边。
        // ctx.fillStyle = coreColor; // 黄色核心
        // ctx.shadowColor = strokeColor; // 红色辉光
        // ctx.shadowBlur = 5;
        // ctx.fillText(this.emoji, this.x + this.width / 2, this.y + this.height / 2);

        ctx.restore();
    }
}

// 基础敌机类
class Enemy {
    constructor() {
        this.width = 60;
        this.height = 60;
        // 调整X坐标生成，增加左边距
        const leftMargin = this.width * 1.2; // 留出左侧空间，略大于敌机宽度
        const spawnWidth = GAME_WIDTH - leftMargin - this.width; 
        this.x = leftMargin + Math.random() * spawnWidth;
        this.y = -this.height;
        this.speed = ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN);
        this.emoji = '👾';
        this.points = 10;
    }

    update() {
        this.y += this.speed;
    }

    draw(ctx) {
        ctx.font = `${this.width}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 添加白色描边
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 5; // 轻微模糊以柔化边缘
        // ctx.strokeStyle = 'white'; // 也可以直接用 strokeStyle，但shadow效果更好
        // ctx.lineWidth = 1;
        // ctx.strokeText(this.emoji, this.x + this.width / 2, this.y + this.height / 2);
        
        ctx.fillText(this.emoji, this.x + this.width / 2, this.y + this.height / 2);
        
        // 重置阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    isOutOfBounds() {
        return this.y > GAME_HEIGHT;
    }
}

// 射击敌机类
class ShooterEnemy extends Enemy {
    constructor() {
        super();
        this.emoji = '👹';
        this.speed = ENEMY_SPEED_MIN * 0.8; 
        this.fireRate = 6000; // 射击间隔翻倍 (原 3000ms)
        this.lastFire = Date.now() + Math.random() * 3000; // 调整随机延迟范围以匹配新射速
        this.points = 20;
    }

    update() {
        super.update();
        
        const now = Date.now();
        if (now - this.lastFire > this.fireRate) {
            this.lastFire = now;
            // 调整子弹发射位置以匹配新的敌机尺寸 (宽度60，子弹宽度15)
            game.enemyBullets.push(new EnemyBullet(
                this.x + this.width / 2 - 7.5, // 60/2 - 15/2 = 30 - 7.5 = 22.5, 但通常我们从飞机中心点偏移子弹宽度的一半
                this.y + this.height
            ));
        }
    }
}

// 道具类
class Powerup {
    constructor() {
        this.baseWidth = 50; 
        this.baseHeight = 50; 
        this.width = this.baseWidth; 
        this.height = this.baseHeight; 
        this.x = Math.random() * (GAME_WIDTH - this.baseWidth); 
        this.y = -this.baseHeight;
        this.speed = 4;
        
        const typeRoll = Math.random();
        if (typeRoll < 0.5) { // 50% chance for split
            this.type = 'split';
            this.emoji = '🔄';
        } else if (typeRoll < 0.75) { // 25% chance for giant (0.5 to 0.749...)
            this.type = 'giant';
            this.emoji = '⭐';
        } else { // 25% chance for bomb (now lightning)
            this.type = 'bomb';
            this.emoji = '⚡'; // Changed bomb icon to lightning
        }

        this.breathPhase = Math.random() * Math.PI * 2; 
        this.breathSpeed = 0.06; 
        this.breathAmplitude = 0.15; 
    }

    update() {
        this.y += this.speed;
        this.breathPhase += this.breathSpeed;
        if (this.breathPhase > Math.PI * 2) {
            this.breathPhase -= Math.PI * 2;
        }
        // Update collision box size if you want it to pulse too, or keep it fixed.
        // For simplicity, let's make collision box also pulse slightly.
        const scaleFactor = 1 + Math.sin(this.breathPhase) * this.breathAmplitude;
        this.width = this.baseWidth * scaleFactor;
        this.height = this.baseHeight * scaleFactor;
    }

    draw(ctx) {
        // Use the animated width/height for drawing the emoji font size
        const currentDisplaySize = Math.min(this.width, this.height); 
        ctx.font = `${currentDisplaySize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Draw slightly offset if size changes, to keep center stable
        ctx.fillText(this.emoji, this.x + this.baseWidth / 2, this.y + this.baseHeight / 2);
    }

    isOutOfBounds() {
        return this.y > GAME_HEIGHT;
    }

    activate() { // Only for timed powerups
        if (this.type === 'split' || this.type === 'giant') {
            game.activePowerups[this.type] = true;
            game.powerupEndTime[this.type] = Date.now() + POWERUP_DURATION;
        }
        // Bomb is instant, handled directly in collision logic
    }
}

// 玩家飞机拖尾粒子类
class PlayerTrailParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 3; // 尺寸 3-7px
        this.opacity = 0.6;
        this.decayRate = 0.03 + Math.random() * 0.03; // 衰减速率
        this.color = '#00ffff'; // 青色，匹配玩家高亮
    }

    update() {
        this.opacity -= this.decayRate;
        this.size -= 0.15; // 略微缩小
        if (this.size < 0) this.size = 0;
    }

    draw(ctx) {
        if (this.opacity <= 0 || this.size <= 0) return;
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0; // 重置
    }
}

// 爆炸粒子类
class ExplosionParticle {
    constructor(x, y, color = '#FFA500') { // 默认橙色
        this.x = x;
        this.y = y;
        this.size = Math.random() * 8 + 4; // 尺寸 4-12px
        this.speedX = (Math.random() - 0.5) * 5; // 水平速度
        this.speedY = (Math.random() - 0.5) * 5; // 垂直速度
        this.opacity = 1;
        this.decayRate = 0.02 + Math.random() * 0.015;
        this.color = color;
        this.gravity = 0.08; // 轻微重力
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += this.gravity; // 应用重力
        this.opacity -= this.decayRate;
        this.size -= 0.1; // 缩小
        if (this.size < 0) this.size = 0;
    }

    draw(ctx) {
        if (this.opacity <= 0 || this.size <= 0) return;
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0; // 重置
    }
}

// 道具拾取粒子类
class PowerupPickupParticle {
    constructor(x, y, color = '#FFFF00') { // 默认黄色
        this.x = x;
        this.y = y;
        this.size = Math.random() * 7 + 5; // 尺寸 5-12px
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 2 + 1; // 扩散速度
        this.speedX = Math.cos(this.angle) * this.speed;
        this.speedY = Math.sin(this.angle) * this.speed;
        this.opacity = 0.8;
        this.decayRate = 0.03 + Math.random() * 0.01;
        this.color = color;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.opacity -= this.decayRate;
        this.size -= 0.15; // 缩小
        if (this.size < 0) this.size = 0;
    }

    draw(ctx) {
        if (this.opacity <= 0 || this.size <= 0) return;
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // 可以画小星星或其他形状，这里用圆形简化
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0; // 重置
    }
}

// 得分冒泡类
class ScorePopup {
    constructor(x, y, text, color = '#FFFFFF') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.opacity = 1.0;
        this.verticalSpeed = -1.5; // 向上漂浮速度
        this.life = 60; // 持续帧数 (约1秒)
        this.fontSize = 22;
    }

    update() {
        this.y += this.verticalSpeed;
        this.opacity -= (1.0 / this.life);
        this.life--;
    }

    draw(ctx) {
        if (this.opacity <= 0 || this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.fontSize}px 'Arial', sans-serif`; // 加粗并指定字体
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// 游戏初始化
async function initGame() {
    const videoElement = document.getElementById('video');
    const gameCanvas = document.getElementById('gameCanvas');
    // const handDebugCanvas = document.getElementById('handDebugCanvas'); // 获取调试画布
    const loadingMessage = document.getElementById('loading');
    const gameOverMessage = document.getElementById('gameOver');
    const startButton = document.getElementById('startButton');
    const pauseButton = document.getElementById('pauseButton');
    const scoreDisplay = document.getElementById('score');
    const livesDisplay = document.getElementById('lives');
    
    // 设置游戏画布尺寸
    gameCanvas.width = GAME_WIDTH;
    gameCanvas.height = GAME_HEIGHT;
    // handDebugCanvas.width = GAME_WIDTH; // 设置调试画布尺寸
    // handDebugCanvas.height = GAME_HEIGHT;
    
    const gameCtx = gameCanvas.getContext('2d');
    // const handDebugCtx = handDebugCanvas.getContext('2d');
    
    // 初始化手势识别
    try {
        await initHandTracking(videoElement, onResults);
        loadingMessage.textContent = '模型加载完成!'; // 更新成功消息
        setTimeout(() => { loadingMessage.classList.add('hidden'); }, 1000); // 短暂显示后隐藏
    } catch (error) {
        loadingMessage.textContent = `模型加载失败: ${error.message}`;
        console.error('手势识别初始化失败:', error);
        return; // 初始化失败则不继续
    }
    
    // 创建玩家飞机
    game.player = new Player();
    
    // 按钮事件监听
    startButton.addEventListener('click', startGame);
    pauseButton.addEventListener('click', togglePause);
    
    // 自动发射子弹
    setInterval(() => {
        if (game.isRunning && !game.isPaused && game.player) {
            game.player.fire();
        }
    }, 300);
    
    // 游戏主循环
    gameLoop(gameCtx);
}

// 初始化 MediaPipe Hands
async function initHandTracking(videoElement, resultsCallback) {
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1, // 只检测一只手
        modelComplexity: 1, // 0 或 1, 1更精确但可能更慢
        minDetectionConfidence: 0.6, // 提高检测置信度阈值
        minTrackingConfidence: 0.6  // 提高跟踪置信度阈值
    });

    hands.onResults(resultsCallback);

    // 设置摄像头
    camera = new Camera(videoElement, {
        onFrame: async () => {
            // 防止在视频未完全加载时发送数据
             if (videoElement.readyState >= 3) { 
                await hands.send({ image: videoElement });
             }
        },
        width: GAME_WIDTH,
        height: GAME_HEIGHT
    });
    await camera.start();
}

// MediaPipe Hands 结果回调
function onResults(results) {
    // 可选：绘制调试信息
    // const handDebugCtx = document.getElementById('handDebugCanvas').getContext('2d');
    // handDebugCtx.save();
    // handDebugCtx.clearRect(0, 0, handDebugCanvas.width, handDebugCanvas.height);
    // // 水平翻转画布以匹配视频镜像
    // handDebugCtx.scale(-1, 1);
    // handDebugCtx.translate(-handDebugCanvas.width, 0);
    // handDebugCtx.drawImage(results.image, 0, 0, handDebugCanvas.width, handDebugCanvas.height);
    
    let handDetected = false;
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handDetected = true;
        // 遍历检测到的手
        for (const landmarks of results.multiHandLandmarks) {
            // 可选：绘制手部关键点和连接线
            // drawConnectors(handDebugCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 5});
            // drawLandmarks(handDebugCtx, landmarks, {color: '#FF0000', lineWidth: 2});
            
            // 获取食指指尖 (Landmark 8)
            const indexFingerTip = landmarks[8]; 
            
            if (indexFingerTip && game.player && game.isRunning && !game.isPaused) {
                // 将归一化坐标转换为画布坐标
                // 注意：MediaPipe X 坐标原点在左侧，但我们的视频是镜像的，
                // 所以 (1 - landmark.x) 得到镜像后的 X 坐标
                const playerNewX = (1 - indexFingerTip.x) * GAME_WIDTH - game.player.width / 2;
                game.player.move(playerNewX);
            }
        }
    }
    
    // 更新玩家控制状态以显示描边
    if (game.player) {
       game.player.isControlled = handDetected && game.isRunning && !game.isPaused;
    }
    
    // handDebugCtx.restore();
}

// 游戏主循环
function gameLoop(ctx) {
    if (game.isRunning && !game.isPaused) {
        update();
    }
    
    draw(ctx);
    requestAnimationFrame(() => gameLoop(ctx));
}

// 更新游戏状态
function update() {
    const now = Date.now();
    
    // 生成敌机
    if (now - game.lastEnemySpawn > ENEMY_SPAWN_INTERVAL) {
        game.lastEnemySpawn = now;
        
        // 随机决定是否生成射击敌机
        if (Math.random() < SHOOTER_ENEMY_SPAWN_CHANCE) {
            game.enemies.push(new ShooterEnemy());
        } else {
            game.enemies.push(new Enemy());
        }
        
        // 随机决定是否生成道具
        if (Math.random() < POWERUP_SPAWN_CHANCE) {
            game.powerups.push(new Powerup());
        }
    }
    
    // 更新道具状态
    for (const powerupType in game.activePowerups) {
        if (game.activePowerups[powerupType] && now > game.powerupEndTime[powerupType]) {
            game.activePowerups[powerupType] = false;
        }
    }
    
    // 更新敌机
    game.enemies.forEach(enemy => enemy.update());
    
    // 更新道具
    game.powerups.forEach(powerup => powerup.update());
    
    // 更新玩家子弹
    game.playerBullets.forEach(bullet => bullet.update());
    
    // 更新敌机子弹
    game.enemyBullets.forEach(bullet => bullet.update());
    
    // 更新粒子效果
    game.playerTrailParticles.forEach(p => p.update());
    game.playerTrailParticles = game.playerTrailParticles.filter(p => p.opacity > 0 && p.size > 0);
    game.explosionParticles.forEach(p => p.update());
    game.explosionParticles = game.explosionParticles.filter(p => p.opacity > 0 && p.size > 0);
    
    // 更新屏幕效果
    if (game.screenShakeDuration > 0) {
        game.screenShakeDuration--;
    }
    if (game.screenFlashDuration > 0) {
        game.screenFlashDuration--;
        game.screenFlashCurrentAlpha = (game.screenFlashDuration / game.screenFlashInitialDuration) * game.screenFlashMaxAlpha;
    } else {
        game.screenFlashCurrentAlpha = 0; 
    }

    // 更新道具拾取粒子
    game.pickupEffectParticles.forEach(p => p.update());
    game.pickupEffectParticles = game.pickupEffectParticles.filter(p => p.opacity > 0 && p.size > 0);

    // 更新得分冒泡
    game.scorePopups.forEach(p => p.update());
    game.scorePopups = game.scorePopups.filter(p => p.opacity > 0 && p.life > 0);

    // 碰撞检测: 玩家子弹与敌机
    game.playerBullets = game.playerBullets.filter(bullet => {
        let bulletHit = false;
        for (let i = 0; i < game.enemies.length; i++) {
            const enemy = game.enemies[i];
            if (checkCollision(bullet, enemy)) {
                game.score += enemy.points;
                document.getElementById('score').textContent = game.score;
                
                // 创建得分冒泡
                game.scorePopups.push(new ScorePopup(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2,
                    `+${enemy.points}`,
                    enemy.points > 10 ? '#FFD700' : '#FFFFFF' // 高分用金色
                ));

                // 创建爆炸粒子效果 (减少粒子数量)
                const numParticles = 8 + Math.floor(Math.random() * 6); // 原 12 + Math.random() * 8
                const enemyColor = enemy.emoji === '👹' ? '#FF6347' : '#FFA500'; 
                for (let k = 0; k < numParticles; k++) {
                    game.explosionParticles.push(new ExplosionParticle(
                        enemy.x + enemy.width / 2, 
                        enemy.y + enemy.height / 2,
                        enemyColor
                    ));
                }

                game.enemies.splice(i, 1);
                i--;
                
                if (!(bullet instanceof GiantBullet)) {
                    bulletHit = true;
                }
                if (bulletHit) {
                    break; 
                }
            }
        }
        return !bulletHit && !bullet.isOutOfBounds();
    });
    
    // 碰撞检测: 敌机与玩家
    game.enemies = game.enemies.filter(enemy => {
        if (game.player && checkCollision(enemy, game.player)) { // 确保玩家存在
            game.lives--;
            document.getElementById('lives').textContent = game.lives;
            
            // 触发屏幕震动和闪红
            game.screenShakeDuration = 15; // 持续15帧
            game.screenShakeMagnitude = 8;  // 震动幅度8像素
            game.screenFlashDuration = 20; // 闪红持续20帧
            game.screenFlashCurrentAlpha = 0.4; // 初始红色和透明度

            // 创建玩家爆炸效果 (如果需要)
            // for (let k=0; k < 20; k++) { game.explosionParticles.push(new ExplosionParticle(game.player.x + game.player.width/2, game.player.y + game.player.height/2, '#FF0000')); }

            if (game.lives <= 0) {
                gameOver();
            } else {
                 // 移除导致碰撞的敌机，避免一次碰撞多次扣血
                 const numParticles = 12 + Math.floor(Math.random() * 8); 
                 const enemyColor = enemy.emoji === '👹' ? '#FF6347' : '#FFA500'; 
                 for (let k = 0; k < numParticles; k++) {
                     game.explosionParticles.push(new ExplosionParticle( enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemyColor));
                 }
                return false; 
            }
            return false; // 移除敌机
        }
        return !enemy.isOutOfBounds();
    });
    
    // 碰撞检测: 敌机子弹与玩家
    game.enemyBullets = game.enemyBullets.filter(bullet => {
        if (game.player && checkCollision(bullet, game.player)) { // 确保玩家存在
            game.lives--;
            document.getElementById('lives').textContent = game.lives;

            // 触发屏幕震动和闪红
            game.screenShakeDuration = 15;
            game.screenShakeMagnitude = 8;
            game.screenFlashDuration = 20;
            game.screenFlashCurrentAlpha = 0.4;

            // 创建玩家爆炸效果 (如果需要)
            // for (let k=0; k < 20; k++) { game.explosionParticles.push(new ExplosionParticle(game.player.x + game.player.width/2, game.player.y + game.player.height/2, '#FF0000')); }
            
            if (game.lives <= 0) {
                gameOver();
            }
            return false; // 移除子弹
        }
        return !bullet.isOutOfBounds();
    });
    
    // 碰撞检测: 道具与玩家
    game.powerups = game.powerups.filter(powerup => {
        if (game.player && checkCollision(powerup, game.player)) { 
            if (powerup.type === 'bomb') {
                // BOMB Powerup: Destroy all enemies
                game.enemies.forEach(enemy => {
                    game.score += enemy.points;
                    game.scorePopups.push(new ScorePopup(
                        enemy.x + enemy.width / 2,
                        enemy.y + enemy.height / 2,
                        `+${enemy.points}`,
                        enemy.points > 10 ? '#FFD700' : '#FFFFFF'
                    ));
                    const numParticles = 10 + Math.floor(Math.random() * 7);
                    const enemyColor = enemy.emoji === '👹' ? '#FF6347' : '#FFA500';
                    for (let k = 0; k < numParticles; k++) {
                        game.explosionParticles.push(new ExplosionParticle(
                            enemy.x + enemy.width / 2, 
                            enemy.y + enemy.height / 2,
                            enemyColor
                        ));
                    }
                });
                game.enemies = []; 

                // 触发新的炸弹激光扫描效果，并保留震动
                game.bombLaserActive = true;
                game.bombLaserY = GAME_HEIGHT; // 从底部开始
                
                // 保留屏幕震动，但移除之前的屏幕闪烁
                game.screenShakeDuration = 20; 
                game.screenShakeMagnitude = 10; 
                // game.screenFlashBaseColor = '200,240,255'; // 不再使用屏闪
                // game.screenFlashMaxAlpha = 0.6;
                // game.screenFlashInitialDuration = 25;
                // game.screenFlashDuration = game.screenFlashInitialDuration;

            } else {
                // Handle other powerups (split, giant)
                powerup.activate();
                const numParticles = 15 + Math.floor(Math.random() * 10);
                let particleColor = powerup.type === 'giant' ? '#FFFF00' : '#00BCD4';
                for (let k = 0; k < numParticles; k++) {
                    game.pickupEffectParticles.push(new PowerupPickupParticle(
                        game.player.x + game.player.width / 2, 
                        game.player.y + game.player.height / 2,
                        particleColor
                    ));
                }
            }
            return false; 
        }
        return !powerup.isOutOfBounds();
    });
    
    // 碰撞检测: 炸弹激光扫描效果
    if (game.bombLaserActive) {
        game.bombLaserY -= game.bombLaserSpeed;
        if (game.bombLaserY + game.bombLaserHeight < 0) { // 激光完全移出屏幕
            game.bombLaserActive = false;
        }
    }
    
    // 清除超出边界的对象
    game.enemies = game.enemies.filter(enemy => !enemy.isOutOfBounds());
    game.playerBullets = game.playerBullets.filter(bullet => !bullet.isOutOfBounds());
    game.enemyBullets = game.enemyBullets.filter(bullet => !bullet.isOutOfBounds());
    game.powerups = game.powerups.filter(powerup => !powerup.isOutOfBounds());
}

// 绘制游戏
function draw(ctx) {
    ctx.save(); // 保存原始状态 (用于屏幕震动)

    // 应用屏幕震动
    if (game.screenShakeDuration > 0 && game.screenShakeMagnitude > 0) {
        const dx = (Math.random() - 0.5) * 2 * game.screenShakeMagnitude;
        const dy = (Math.random() - 0.5) * 2 * game.screenShakeMagnitude;
        ctx.translate(dx, dy);
    }

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // --- 强化游戏区域动态边框 --- 
    const currentTime = Date.now();
    // 外层静态边框 (深色，作为底)
    ctx.strokeStyle = 'rgba(0, 50, 100, 0.3)'; // 深蓝青色
    ctx.lineWidth = 5; // 稍宽一点
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, 
                   GAME_WIDTH - ctx.lineWidth, GAME_HEIGHT - ctx.lineWidth);

    // 内层动态脉冲边框 (亮色)
    const pulseFactor = Math.sin(currentTime / 350) * 0.4 + 0.6; // 脉冲因子 0.6 - 1.0, 速度略快
    ctx.strokeStyle = `rgba(0, 220, 255, ${0.4 * pulseFactor})`; // 更亮的青色
    ctx.lineWidth = 3 * pulseFactor; // 线宽也脉冲
    const offset = 5; // 内外边框的间距
    ctx.strokeRect(offset + ctx.lineWidth / 2, offset + ctx.lineWidth / 2, 
                   GAME_WIDTH - (offset * 2) - ctx.lineWidth, GAME_HEIGHT - (offset * 2) - ctx.lineWidth);
    
    // 重置线宽和样式
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'transparent'; 
    // --- 边框结束 ---

    // 绘制玩家飞机拖尾 (在飞机之前绘制，使其看起来在飞机下方)
    game.playerTrailParticles.forEach(p => p.draw(ctx));

    if (game.player) {
        game.player.draw(ctx);
    }
    game.enemies.forEach(enemy => enemy.draw(ctx));
    game.powerups.forEach(powerup => powerup.draw(ctx));
    game.playerBullets.forEach(bullet => bullet.draw(ctx));
    game.enemyBullets.forEach(bullet => bullet.draw(ctx));

    // 绘制爆炸粒子 (在所有主要物体之后绘制，使其覆盖在上方)
    game.explosionParticles.forEach(p => p.draw(ctx));

    // 绘制道具拾取粒子效果 (在主要元素之上，爆炸粒子之后，屏幕闪烁之前)
    game.pickupEffectParticles.forEach(p => p.draw(ctx));

    // 绘制得分冒泡
    game.scorePopups.forEach(p => p.draw(ctx));

    // --- 绘制炸弹激光扫描效果 --- (在主要游戏内容之上，但在玩家受伤的屏闪和暂停蒙层之下)
    if (game.bombLaserActive) {
        ctx.save();
        // 主激光束
        ctx.fillStyle = game.bombLaserColor1;
        ctx.shadowColor = game.bombLaserColor2; 
        ctx.shadowBlur = 25; 
        ctx.fillRect(0, game.bombLaserY, GAME_WIDTH, game.bombLaserHeight);
        
        // 可选：更亮的中心线，增加视觉层次
        const centerLineHeight = game.bombLaserHeight * 0.3;
        ctx.fillStyle = game.bombLaserColor2;
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 15;
        ctx.fillRect(0, game.bombLaserY + (game.bombLaserHeight - centerLineHeight) / 2, GAME_WIDTH, centerLineHeight);
        
        ctx.restore();
    }
    // --- 激光扫描结束 ---

    // 绘制屏幕闪烁 (针对玩家受伤，使用 baseColor 和 currentAlpha)
    if (game.screenFlashCurrentAlpha > 0) {
        ctx.fillStyle = `rgba(${game.screenFlashBaseColor}, ${game.screenFlashCurrentAlpha})`;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // --- 绘制暂停状态蒙层和文字 --- 
    if (game.isPaused && game.isRunning) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // 半透明黑色蒙层
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.font = "bold 60px 'Arial', sans-serif";
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText('已暂停', GAME_WIDTH / 2, GAME_HEIGHT / 2);
        ctx.shadowColor = 'transparent'; // 清除阴影，避免影响后续UI
    }
    // --- 暂停状态结束 ---

    // 绘制当前激活的道具状态
    if (game.activePowerups.split || game.activePowerups.giant) {
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        
        let y = 30;
        
        if (game.activePowerups.split) {
            const timeLeft = Math.ceil((game.powerupEndTime.split - Date.now()) / 1000);
            ctx.fillText(`分裂子弹: ${timeLeft}秒`, 10, y);
            y += 25;
        }
        
        if (game.activePowerups.giant) {
            const timeLeft = Math.ceil((game.powerupEndTime.giant - Date.now()) / 1000);
            ctx.fillText(`巨型子弹: ${timeLeft}秒`, 10, y);
        }
    }

    ctx.restore(); // 恢复原始状态 (撤销震动平移)
}

// 开始游戏
function startGame() {
    // 重置游戏状态
    game = {
        isRunning: true,
        isPaused: false,
        score: 0,
        lives: 3,
        player: new Player(),
        enemies: [],
        bullets: [],
        powerups: [],
        playerBullets: [],
        enemyBullets: [],
        playerTrailParticles: [], 
        explosionParticles: [],   
        lastEnemySpawn: Date.now(),
        activePowerups: {
            split: false,
            giant: false
        },
        powerupEndTime: {
            split: 0,
            giant: 0
        },
        // 新增：重置屏幕效果控制变量
        screenShakeDuration: 0,
        screenShakeMagnitude: 0,
        screenFlashBaseColor: '255,0,0',        // 基础颜色 (R,G,B string)
        screenFlashMaxAlpha: 0.4,             // 此效果希望达到的最大Alpha
        screenFlashCurrentAlpha: 0,           // 当前帧应用的Alpha
        screenFlashInitialDuration: 20,       // 效果的初始设定时长
        screenFlashDuration: 0,                // 效果的剩余时长
        pickupEffectParticles: [],
        scorePopups: [], // 新增：重置得分冒泡数组

        // 新增：重置炸弹激光扫描变量
        bombLaserActive: false,
        bombLaserY: 0
    };
    
    // 更新UI
    document.getElementById('score').textContent = game.score;
    document.getElementById('lives').textContent = game.lives;
    document.getElementById('gameOver').classList.add('hidden');
}

// 暂停/继续游戏
function togglePause() {
    game.isPaused = !game.isPaused;
    document.getElementById('pauseButton').textContent = game.isPaused ? '继续' : '暂停';
}

// 游戏结束
function gameOver() {
    game.isRunning = false;
    document.getElementById('gameOver').classList.remove('hidden');

    // 停止屏幕震动和闪烁效果
    game.screenShakeDuration = 0;
    game.screenShakeMagnitude = 0;
    game.screenFlashDuration = 0;
    game.screenFlashCurrentAlpha = 0;
}

// 页面加载完成后初始化游戏
window.addEventListener('DOMContentLoaded', initGame); 
window.addEventListener('DOMContentLoaded', initGame); 