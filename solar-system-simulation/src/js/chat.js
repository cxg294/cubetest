// 聊天功能模块

// 行星信息数据
const planetInfoData = {
    "sun": {
        "name": "太阳",
        "description": "太阳是我们太阳系的中心天体，一个巨大的热气球，由氢和氦气体组成。它非常非常热——中心温度可以达到1500万度！太阳的引力把所有行星都拉在它周围转，同时它释放的光和热让地球上的生命可以生存。太阳表面有时会爆发出巨大的火焰，这叫做太阳耀斑，可以产生壮观的北极光。太阳每天都在为我们提供能量，没有它，我们就不能生存！"
    },
    "mercury": {
        "name": "水星",
        "description": "水星是离太阳最近的行星，也是太阳系中最小的行星！因为离太阳太近，水星表面温度可以高达427°C，比你家烤箱还热！但有趣的是，晚上温度又能降到-173°C，温差真的超级大！水星表面布满了陨石坑，看起来很像我们的月球。由于没有大气层保护，宇宙中的石头可以直接撞到它的表面。水星公转一圈只需88天，但是自转却很慢，所以在水星上，一个水星日比一个水星年还要长！想象一下，如果你在水星上，过生日比过一天还要快！"
    },
    "venus": {
        "name": "金星",
        "description": "金星是太阳系中最亮的行星，常被称为'晨星'或'昏星'，因为它在日出前或日落后特别明亮。虽然它看起来很美，但实际上金星是个非常不友好的地方！它被厚厚的二氧化碳云层包裹着，形成了强大的温室效应，使表面温度高达465°C，比烤箱还热！在金星上，铅会融化成水一样的液体！金星上还经常下硫酸雨，但雨滴在接触地面之前就会蒸发掉。有趣的是，金星自转方向与其他行星相反，而且它自转一圈的时间比公转一圈还长！如果你能在金星上看日出，太阳会从西边升起，从东边落下！"
    },
    "earth": {
        "name": "地球",
        "description": "地球是太阳系中唯一已知有生命存在的行星，被称为'蓝色星球'，因为从太空看，大部分表面被蓝色的海洋覆盖。地球有许多独特的特点：它有丰富的液态水，适宜的温度，以及保护生命免受有害辐射的大气层和磁场。地球的大气层由氮气、氧气和少量其他气体组成，它能过滤有害的太阳辐射，同时保持温度稳定。地球上有超过800万种已知生物，从微小的细菌到巨大的蓝鲸！我们的星球不断变化，有山脉、海洋、沙漠和冰川。地球的月球比其他行星的卫星相对较大，它影响着地球的海洋潮汐。保护地球是我们每个人的责任，因为它是我们唯一的家园！"
    },
    "mars": {
        "name": "火星",
        "description": "火星是一个充满冒险的红色星球！它的表面有巨大的火山和峡谷，还有两个小卫星像两颗土豆一样围着它转。火星上有一座太阳系最高的山——奥林匹斯山，比珠穆朗玛峰还要高3倍！火星为什么是红色的呢？因为它的土壤中含有铁锈。科学家们认为火星上曾经有大量的水，可能形成过河流和海洋，现在我们还能看到干涸的河床。火星上有极高极低的温度变化，白天可能有20度，但晚上会冷到零下70度！许多国家都派过探测器去火星，有的还在那里工作，寻找火星上是否曾经有过生命，或者将来人类是否可以移居到那里。"
    },
    "jupiter": {
        "name": "木星",
        "description": "木星是太阳系中最大的行星，体积是地球的1300多倍！它主要由氢和氦气体组成，没有固体表面，所以你不能站在上面。木星表面有许多色彩斑斓的条纹和旋涡，最著名的是大红斑——一个持续了几百年的巨大风暴，它的直径比地球还大！想象一下，一个比我们整个星球还大的风暴！木星非常快速地自转，一天只有不到10小时，这么大的星球转得这么快，使得它的赤道部分鼓了出来。木星有79颗已知的卫星，其中最大的四颗被称为'伽利略卫星'，因为它们是伽利略在1610年发现的。木星强大的引力像宇宙清道夫一样，吸引并捕获了许多小行星，保护内行星(包括地球)免受撞击。"
    },
    "saturn": {
        "name": "土星",
        "description": "土星是太阳系中最美丽的行星，因为它有壮观的光环！这些环不是实心的，而是由数以万亿计的冰块、岩石和尘埃组成，从远处看就像美丽的环。土星的环非常薄，厚度最多只有几百米，但直径却达到约27万公里，比地球到月球的距离还远！土星的密度比水还小，如果有一个足够大的水池，土星会漂在水面上！和木星一样，土星也是气态巨行星，没有真正的表面。它有82颗已知卫星，其中最大的土卫六(泰坦)有浓密的大气层和液态甲烷湖泊。有趣的是，每年有一到两次，地球会从土星环的平面穿过，这时从地球上看，土星的环会变得非常细或几乎看不见！"
    },
    "uranus": {
        "name": "天王星",
        "description": "天王星是太阳系中最独特的行星之一，因为它'躺着'公转！想象一个球在地上滚动，通常它的北极和南极在两侧，但天王星却像是被推倒了，它的轴倾斜了98度，几乎与公转轨道平行。这意味着它像个滚动的球那样绕太阳公转，而不是像地球那样直立旋转。天王星呈现美丽的淡蓝色，这是因为它大气中的甲烷气体吸收了红色光线，只反射蓝绿色光。它也是太阳系中最冷的行星之一，温度可低至-224°C！天王星有27颗已知卫星，它们都以莎士比亚和亚历山大·蒲柏作品中的角色命名。与其他气态巨行星不同，天王星主要由'冰'组成——不仅是水冰，还有氨、甲烷等物质的冰。天王星也有光环，但它们并不像土星的环那么明显和美丽。"
    },
    "neptune": {
        "name": "海王星",
        "description": "海王星是太阳系中最远的行星（自从冥王星在2006年被降级为矮行星后），距离太阳约45亿公里！光从太阳到达海王星需要超过4小时，而到地球只需8分钟。海王星呈现深蓝色，比天王星的颜色更深，也是因为大气中的甲烷。海王星的大气非常动态，有强大的风暴和风速高达每小时2100公里的超级风——这是太阳系中最强的风，比地球上最强的飓风还要快得多！海王星有14颗已知卫星，最大的是海卫一(特里同)，它以相反方向绕海王星运行，科学家认为它可能是被海王星的引力捕获的。有趣的是，海王星是第一个通过数学计算而非直接观测发现的行星，科学家通过天王星轨道上的不规则运动预测了它的存在！"
    }
};

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    
    // 绑定发送消息事件
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // 发送消息函数
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message === '') return;
        
        // 添加用户消息到聊天窗口
        addUserMessage(message);
        
        // 清空输入框
        messageInput.value = '';
        
        // 处理用户消息
        processUserMessage(message);
    }
    
    // 添加用户消息到聊天窗口
    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'user-message';
        
        // 创建用户头像
        const avatarElement = document.createElement('div');
        avatarElement.className = 'message-avatar user-avatar';
        avatarElement.textContent = '我';
        
        // 创建消息气泡容器
        const bubbleElement = document.createElement('div');
        bubbleElement.className = 'message-bubble';
        
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        contentElement.textContent = message;
        
        const timeElement = document.createElement('div');
        timeElement.className = 'message-time';
        timeElement.textContent = '刚刚';
        
        // 组装消息结构
        bubbleElement.appendChild(contentElement);
        bubbleElement.appendChild(timeElement);
        
        messageElement.appendChild(bubbleElement);
        messageElement.appendChild(avatarElement);
        
        chatMessages.appendChild(messageElement);
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // 添加系统消息到聊天窗口
    function addSystemMessage(message, isThinking = false) {
        const messageElement = document.createElement('div');
        messageElement.className = 'system-message';
        
        // 创建AI头像
        const avatarElement = document.createElement('div');
        avatarElement.className = 'message-avatar system-avatar';
        avatarElement.textContent = 'AI';
        
        // 创建消息气泡容器
        const bubbleElement = document.createElement('div');
        bubbleElement.className = 'message-bubble';
        
        const contentElement = document.createElement('div');
        contentElement.className = isThinking ? 'message-content thinking' : 'message-content';
        contentElement.textContent = message;
        
        const timeElement = document.createElement('div');
        timeElement.className = 'message-time';
        timeElement.textContent = '刚刚';
        
        // 组装消息结构
        bubbleElement.appendChild(contentElement);
        bubbleElement.appendChild(timeElement);
        
        messageElement.appendChild(avatarElement);
        messageElement.appendChild(bubbleElement);
        
        // 为思考消息添加唯一ID
        if (isThinking) {
            const messageId = 'thinking-' + Date.now();
            messageElement.id = messageId;
            return { element: messageElement, id: messageId };
        }
        
        chatMessages.appendChild(messageElement);
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageElement;
    }
    
    // 替换系统消息
    function replaceSystemMessage(messageId, newContent) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            const contentElement = messageElement.querySelector('.message-content');
            contentElement.textContent = newContent;
            contentElement.classList.remove('thinking');
        }
    }
    
    // 处理用户消息
    function processUserMessage(message) {
        // 创建"正在思考"的消息
        const thinkingMessage = addSystemMessage('AI正在为你整理资料...', true);
        chatMessages.appendChild(thinkingMessage.element);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 检查是否是关于轨道形状的问题
        if (message.includes('轨道') && (message.includes('圆形') || message.includes('形状') || message.includes('椭圆'))) {
            setTimeout(() => {
                const orbitExplanation = "太阳系中行星的轨道不是完美的圆形，而是椭圆形的。这是由开普勒第一定律确定的：行星沿椭圆轨道运行，太阳位于椭圆的一个焦点上。每个行星的轨道都有不同的偏心率，决定了椭圆的扁平程度。例如，水星的轨道偏心率最大，约为0.206，使其轨道明显呈椭圆形；而金星的轨道偏心率最小，约为0.007，其轨道接近圆形。地球轨道的偏心率为0.017，也相对接近圆形。";
                
                // 替换思考消息为轨道解释
                replaceSystemMessage(thinkingMessage.id, orbitExplanation);
                
                // 调整视角为俯视图
                if (window.setTopView) {
                    window.setTopView();
                }
                
                // 滚动到底部
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1800); // 1.8秒延迟
            return;
        }
        
        // 获取行星信息
        const planetInfo = identifyPlanetKeyword(message);
        
        // 延迟响应以模拟思考过程
        setTimeout(() => {
            if (planetInfo) {
                // 先暂停太阳系
                pauseSimulation();
                
                // 然后聚焦到对应行星
                focusOnPlanet(planetInfo.id);
                
                // 替换思考消息为行星介绍
                replaceSystemMessage(thinkingMessage.id, planetInfo.description);
            } else {
                // 无法识别的消息
                replaceSystemMessage(thinkingMessage.id, "抱歉，我不太理解。你可以尝试输入行星名称，比如火星、木星或太阳。");
            }
            
            // 滚动到底部
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1800); // 1.8秒延迟
    }
    
    // 识别行星关键词
    function identifyPlanetKeyword(message) {
        message = message.toLowerCase();
        
        // 匹配行星名称
        for (const planetId in planetInfoData) {
            const planetName = planetInfoData[planetId].name;
            if (message.includes(planetName.toLowerCase())) {
                return {
                    id: planetId,
                    name: planetName,
                    description: planetInfoData[planetId].description
                };
            }
        }
        
        // 特殊关键词匹配
        if (message.includes('所有') || message.includes('全部') || message.includes('太阳系') || message.includes('概览')) {
            return {
                id: 'overview',
                name: '太阳系概览',
                description: "太阳系是由太阳和围绕它运行的所有天体组成的行星系统。它包括八大行星：水星、金星、地球、火星、木星、土星、天王星和海王星，以及矮行星、小行星、彗星和无数的尘埃颗粒。太阳系位于银河系的猎户臂上，是一个充满奇迹和探索机会的地方！你可以输入任何行星的名字了解更多信息。"
            };
        }
        
        return null;
    }
    
    // 暂停太阳系模拟
    function pauseSimulation() {
        // 这里需要与main.js中的功能对接
        // 临时方案：直接触发暂停按钮点击事件
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn && window.simulationRunning) {
            pauseBtn.click();
        }
    }
    
    // 聚焦到行星
    function focusOnPlanet(planetId) {
        // 这里需要与main.js中的功能对接
        if (planetId === 'overview') {
            // 重置视图
            window.resetCameraPosition && window.resetCameraPosition();
            return;
        }
        
        // 使用全局接口直接聚焦行星
        if (window.focusOnPlanetById) {
            window.focusOnPlanetById(planetId);
        } else {
            // 备用方案：触发行星选择点击事件
            const planetElement = document.querySelector(`#planet-selection li[data-planet="${planetId}"]`);
            if (planetElement) {
                planetElement.click();
            }
        }
    }
});

// 导出模块供main.js使用
export const chatModule = {
    // 外部可能需要调用的方法
}; 