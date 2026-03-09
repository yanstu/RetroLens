const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../../src/static/textures');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function saveCanvas(canvas, filename) {
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), buffer);
    console.log(`✅ Generated: ${filename}`);
}

function generateFilmGrain(width = 512, height = 512) {
    // 胶片颗粒: Box-Muller 变换生成高斯噪点
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);

    for (let i = 0; i < imgData.data.length; i += 4) {
        let rand1 = Math.random();
        let rand2 = Math.random();
        let noise = Math.sqrt(-2.0 * Math.log(rand1)) * Math.cos(2.0 * Math.PI * rand2);
        // 使噪点偏向中部灰度
        let value = Math.max(0, Math.min(255, 128 + noise * 40));

        imgData.data[i] = value;     // R
        imgData.data[i + 1] = value;   // G
        imgData.data[i + 2] = value;   // B
        imgData.data[i + 3] = 255;     // Alpha
    }
    ctx.putImageData(imgData, 0, 0);
    saveCanvas(canvas, 'grain.png');
}

function generateVignette(width = 512, height = 512) {
    // 镜头暗角: 径向纯黑渐变
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width * 0.7
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,1)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    saveCanvas(canvas, 'vignette.png');
}

function generateLightLeak(width = 512, height = 512) {
    // 漏光光斑: 暖色调不规则线性渐变
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, width, height * 0.6);
    gradient.addColorStop(0, 'rgba(255, 60, 0, 0.85)'); // 红橙
    gradient.addColorStop(0.3, 'rgba(255, 120, 0, 0.35)'); // 暖黄
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 添加一点高亮耀斑
    const flare = ctx.createRadialGradient(width * 0.2, height * 0.1, 0, width * 0.2, height * 0.1, width * 0.4);
    flare.addColorStop(0, 'rgba(255,255,255,0.4)');
    flare.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = flare;
    ctx.fillRect(0, 0, width, height);

    saveCanvas(canvas, 'light_leak.png');
}

function generateScratches(width = 512, height = 512) {
    // 底片划痕: 半透明白色垂直线条与尘埃
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 纯透明底
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 25; i++) {
        ctx.lineWidth = Math.random() * 1.5 + 0.5;
        ctx.beginPath();
        const startX = Math.random() * width;
        ctx.moveTo(startX, -10);
        // 略微倾斜的划痕
        ctx.lineTo(startX + (Math.random() - 0.5) * 60, height + 10);
        ctx.stroke();
    }
    saveCanvas(canvas, 'scratches.png');
}

console.log('[RetroLens Texture Factory] Generating textures...');
generateFilmGrain();
generateVignette();
generateLightLeak();
generateScratches();
