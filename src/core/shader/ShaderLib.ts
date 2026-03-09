export enum FilterType {
    HKNeon = 'HK-Neon',
    Cyberpunk = 'Cyber-Punk',
    InstaPolar = 'Insta-Polar',
    ClassicCine = 'Classic-Cine',
    CCD2000 = 'CCD-2000',
    VHS1990 = 'VHS-1990',
    MonoGrain = 'Mono-Grain',
    AquaBlue = 'Aqua-Blue',
    LoFiTV = 'Lo-Fi TV'
}

export const ShaderLibrary = {
    // Shared Vertex Shader
    VertexShader: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        uniform float u_zoom;
        uniform vec2 u_resolution;
        uniform vec2 u_texResolution;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            
            vec2 scale = vec2(1.0, 1.0);
            if (u_resolution.x > 0.0 && u_texResolution.x > 0.0) {
                float canvasAspect = u_resolution.x / u_resolution.y;
                float texAspect = u_texResolution.x / u_texResolution.y;
                
                if (canvasAspect > texAspect) {
                    scale.y = texAspect / canvasAspect;
                } else {
                    scale.x = canvasAspect / texAspect;
                }
            }
            
            float z = u_zoom > 0.0 ? u_zoom : 1.0;
            vec2 scaledUv = (a_texCoord - 0.5) * scale / z + 0.5;
            v_texCoord = vec2(scaledUv.x, 1.0 - scaledUv.y); // Flip Y to match WebGL vs Canvas
        }
    `,

    // Premium Retro Filters
    FragmentShaders: {
        [FilterType.Cyberpunk]: `
            // 赛博朋克 Cyber-Punk: High-tech low-life, Neon Pink & Cyan, Scanlines, Glow
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D u_mainTex;
            uniform float u_time;
            
            float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453); }

            void main() {
                // Chromatic Aberration
                float shift = 0.008;
                float r = texture2D(u_mainTex, v_texCoord + vec2(shift, 0.0)).r;
                float g = texture2D(u_mainTex, v_texCoord).g;
                float b = texture2D(u_mainTex, v_texCoord - vec2(shift, 0.0)).b;
                vec3 color = vec3(r, g, b);
                
                // Color Grading: Push midtones to Pink/Purple and shadows to Cyan
                float luma = dot(color, vec3(0.299, 0.587, 0.114));
                vec3 cyanShadow = vec3(0.0, 0.8, 1.0);
                vec3 pinkHighlight = vec3(1.0, 0.0, 0.8);
                
                color = mix(color * cyanShadow, color + pinkHighlight * color, luma * 1.5);
                
                // Tech Scanlines
                float scanline = sin(v_texCoord.y * 800.0) * 0.04;
                color -= scanline;
                
                // Electric Noise
                color += (rand(v_texCoord * u_time) - 0.5) * 0.05;
                
                gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
            }
        `,

        [FilterType.HKNeon]: `
            // 港风 HK-Neon: Heavy Teal & Orange, Chromatic Aberration, Glow, Grain
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D u_mainTex;
            uniform float u_time;
            
            float rand(vec2 co){
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
            }

            void main() {
                // Chromatic Aberration
                float shift = 0.006;
                float r = texture2D(u_mainTex, v_texCoord + vec2(shift, 0.0)).r;
                float g = texture2D(u_mainTex, v_texCoord).g;
                float b = texture2D(u_mainTex, v_texCoord - vec2(shift, 0.0)).b;
                vec3 color = vec3(r, g, b);
                
                // Teal & Orange grading
                float luma = dot(color, vec3(0.299, 0.587, 0.114));
                vec3 shadow = vec3(0.0, 0.4, 0.5);   // Deep cyan
                vec3 midtone = vec3(1.0, 0.6, 0.2);  // Rich orange
                vec3 grad = mix(shadow, midtone, luma);
                
                color = mix(color, color * grad * 2.0, 0.8);
                
                // Heavy Vignette
                float dist = distance(v_texCoord, vec2(0.5));
                color *= smoothstep(0.8, 0.3, dist);
                
                // Add Film Grain
                color += (rand(v_texCoord * u_time) - 0.5) * 0.1;
                
                gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
            }
        `,

        [FilterType.CCD2000]: `
            // 千禧电子 CCD-2000: Low-res feel, Color Bleed, Over-saturation, Grid Lines
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D u_mainTex;
            uniform float u_time;

            void main() {
                // Downsample resolution effect
                vec2 pixelSize = vec2(320.0, 240.0);
                vec2 uv = floor(v_texCoord * pixelSize) / pixelSize;
                
                // Read color
                vec3 color = texture2D(u_mainTex, uv).rgb;
                
                // Color Bleed (Horizontal smear)
                vec3 bleed = texture2D(u_mainTex, uv + vec2(0.015, 0.0)).rgb;
                color = max(color, bleed * 0.5);
                
                // Boost Saturation & Contrast
                const vec3 LUMA = vec3(0.2125, 0.7154, 0.0721);
                float luma = dot(color, LUMA);
                color = mix(vec3(luma), color, 1.6); // saturation
                color = (color - 0.5) * 1.3 + 0.5;   // contrast
                
                // Scanline grid
                float grid = sin(v_texCoord.y * 480.0) * sin(v_texCoord.x * 640.0);
                color += grid * 0.02;
                
                // Highlight blow-out (Digital clipping)
                color = pow(color, vec3(0.8));
                
                gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
            }
        `,

        [FilterType.InstaPolar]: `
            // 拍立得 Insta-Polar: Soft Focus, Yellow/Magenta Cast, Dynamic Light Leaks
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D u_mainTex;
            uniform float u_time;
            
            // Noise for light leaks
            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }

            void main() {
                // Slight edge blur approximation via multisample
                vec3 color = texture2D(u_mainTex, v_texCoord).rgb * 0.6;
                color += texture2D(u_mainTex, v_texCoord + vec2(0.002, 0.002)).rgb * 0.1;
                color += texture2D(u_mainTex, v_texCoord - vec2(0.002, 0.002)).rgb * 0.1;
                color += texture2D(u_mainTex, v_texCoord + vec2(-0.002, 0.002)).rgb * 0.1;
                color += texture2D(u_mainTex, v_texCoord + vec2(0.002, -0.002)).rgb * 0.1;
                
                // Polar vintage color grading (Lifted shadows, reduced whites, warm cast)
                color = color * 0.85 + 0.15; // Lift shadows
                color.r += 0.1; // Warmth
                color.b -= 0.05;
                color.g += 0.02;
                
                // Dynamic Procedural Light Leak on Left/Right edges
                float timeSlow = u_time * 0.5;
                float leakWave = sin(v_texCoord.y * 3.0 + timeSlow) * 0.5 + 0.5;
                float leakMask = smoothstep(0.4, 0.0, v_texCoord.x + leakWave * 0.1); 
                leakMask += smoothstep(0.6, 1.0, v_texCoord.x - leakWave * 0.1) * 0.5;
                
                vec3 orangeLeak = vec3(1.0, 0.4, 0.0) * leakMask * 1.5;
                color = color + orangeLeak;
                
                // Dust specs
                if (noise(v_texCoord * 100.0 + u_time) > 0.999) {
                    color = vec3(0.1); // Black dust
                }
                
                gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
            }
        `,

        [FilterType.VHS1990]: `
            // 录像带 VHS-1990: Wavy Tape Tracking, Chroma Shift, Color Loss, Static
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_mainTex;
            uniform float u_time;
            
            float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453); }

            void main() {
                vec2 uv = v_texCoord;
                
                // Tape Tracking Error (bottom of screen wobble)
                float tracking = smoothstep(0.8, 1.0, uv.y);
                float wobble = sin(u_time * 15.0 + uv.y * 100.0) * 0.02 * tracking;
                uv.x += wobble;
                
                // VHS bad color alignment (Chroma Shift)
                float shift = 0.015 * sin(u_time);
                float r = texture2D(u_mainTex, uv + vec2(shift, 0.0)).r;
                float g = texture2D(u_mainTex, uv).g;
                float b = texture2D(u_mainTex, uv - vec2(shift, 0.0)).b;
                
                vec3 color = vec3(r, g, b);
                
                // Desaturate slightly, tint green
                float luma = dot(color, vec3(0.299, 0.587, 0.114));
                color = mix(vec3(luma), color, 0.6);
                color.g *= 1.1; 
                
                // Horizontal tracking static bar
                float bar = smoothstep(0.98, 1.0, sin(uv.y * 5.0 - u_time * 3.0));
                float noise = rand(uv * u_time);
                color += vec3(bar * noise * 0.5);
                
                // VCR scanlines
                color -= sin(uv.y * 600.0) * 0.04;
                
                gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
            }
        `,

        [FilterType.MonoGrain]: `
            // 粗颗粒黑白 Mono-Grain: Ilford HP5 style, High Contrast, Dynamic Scratch, Dust
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D u_mainTex;
            uniform float u_time;
            
            float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453); }

            void main() {
                vec3 color = texture2D(u_mainTex, v_texCoord).rgb;
                
                // True B&W Conversion prioritizing Green channel (like classic film)
                float gray = dot(color.rgb, vec3(0.2, 0.7, 0.1));
                
                // Intense S-Curve Contrast
                gray = (gray - 0.5) * 1.5 + 0.5;
                gray = clamp(gray, 0.0, 1.0);
                
                // Dynamic Heavy Grain
                float grain = (rand(v_texCoord * u_time) - 0.5) * 0.3;
                gray += grain;
                
                // Vertical Scratches
                float scratch = sin(v_texCoord.x * 200.0 + u_time) * sin(v_texCoord.x * 33.0);
                if (scratch > 0.99 && rand(vec2(u_time)) > 0.5) {
                    gray = 1.0; // White scratch
                } else if (scratch < -0.99 && rand(vec2(u_time+1.0)) > 0.7) {
                    gray = 0.0; // Black scratch
                }
                
                // Heavy Vignette
                float dist = distance(v_texCoord, vec2(0.5));
                gray *= smoothstep(0.85, 0.4, dist);
                
                gl_FragColor = vec4(vec3(gray), 1.0);
            }
        `,

        [FilterType.AquaBlue]: `
            // 反转片 Aqua-Blue: Halation glow, Intense cold shadows, Blown out highlights
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D u_mainTex;

            void main() {
                vec3 color = texture2D(u_mainTex, v_texCoord).rgb;
                
                // Halation (red glow around brights)
                vec3 blur = texture2D(u_mainTex, v_texCoord + vec2(0.005)).rgb;
                float brights = max(0.0, dot(blur, vec3(0.333)) - 0.8);
                color += vec3(brights * 1.0, 0.0, 0.0); // Red bloom
                
                // Aqua/Cyan pushing
                float luma = dot(color, vec3(0.299, 0.587, 0.114));
                
                // Cross process mapping: shadows cool cyan, highlights warm orange
                vec3 shadow = vec3(0.0, 0.3, 0.6);
                vec3 mid = vec3(0.6, 0.8, 0.9);
                vec3 high = vec3(1.0, 0.9, 0.8);
                
                if(luma < 0.5) {
                    color = mix(color * shadow, color * mid, luma * 2.0);
                } else {
                    color = mix(color * mid, color * high, (luma - 0.5) * 2.0);
                }
                
                // Boost Saturation heavily
                color = mix(vec3(luma), color, 1.5);
                
                gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
            }
        `,

        [FilterType.LoFiTV]: `
            // 故障电视 Lo-Fi TV: CRT Curve, RGB Box split, Rolling Flicker
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_mainTex;
            uniform float u_time;
            
            float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453); }

            void main() {
                // CRT Curve Screen
                vec2 uv = v_texCoord - 0.5;
                float crt = dot(uv, uv);
                uv = uv * (1.0 + crt * 0.2) + 0.5;
                
                // Black borders for curve
                if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }
                
                // RGB Separation split (Glitch blocks)
                float block = floor(uv.y * 20.0) / 20.0;
                float shift = 0.0;
                if(rand(vec2(block, floor(u_time * 8.0))) > 0.9) {
                    shift = 0.05 * sin(u_time * 50.0);
                }
                
                float r = texture2D(u_mainTex, uv + vec2(shift, 0.0)).r;
                float g = texture2D(u_mainTex, uv).g;
                float b = texture2D(u_mainTex, uv - vec2(shift, 0.0)).b;
                vec3 color = vec3(r, g, b);
                
                // Rolling Flicker Bar
                float flicker = sin(uv.y * 3.0 + u_time * 10.0) * 0.5 + 0.5;
                color += flicker * 0.05;
                
                // Color Invert random
                if(rand(vec2(u_time, 0.0)) > 0.98) {
                    color = 1.0 - color;
                }
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,

        [FilterType.ClassicCine]: `
            // 电影感 Classic-Cine: Heavy Anamorphic Grain, Cinematic Teal/Orange Color Match
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D u_mainTex;
            uniform float u_time;
            
            float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453); }

            void main() {
                vec3 color = texture2D(u_mainTex, v_texCoord).rgb;
                
                // Kodak print film curve (Crushed deep blacks, creamy highlights)
                color = color * color * (3.0 - 2.0 * color); // Subtle S-Curve
                
                // Color Palette: Olive greens, Teal skies, Orange skin tones
                float luma = dot(color, vec3(0.299, 0.587, 0.114));
                vec3 shadowColor = vec3(0.1, 0.25, 0.3); // deep teal
                vec3 highlightColor = vec3(1.0, 0.9, 0.8); // warm skin
                
                color = mix(color * shadowColor * 2.0, color * highlightColor, luma * 1.5);
                
                // Heavy Film Grain (simulating high ISO pushed film)
                float grain = (rand(v_texCoord * u_time) - 0.5) * 0.15;
                color += grain;
                
                // Subtle Chromatic Ab at edges
                float dist = distance(v_texCoord, vec2(0.5));
                float ca = dist * 0.01;
                color.r = texture2D(u_mainTex, v_texCoord + vec2(ca, 0.0)).r;
                
                gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
            }
        `
    }
};
