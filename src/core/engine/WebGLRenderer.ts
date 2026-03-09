import { FilterType, ShaderLibrary } from '../shader/ShaderLib';
import { UniformCache } from '../shader/uniforms';

export class WebGLRenderer {
    private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    private programCache: Map<FilterType, WebGLProgram> = new Map();
    private currentProgram: WebGLProgram | null = null;
    private uniformCache: UniformCache = new UniformCache();

    // Pre-allocated buffers to prevent GC during render loop
    private positionBuffer: WebGLBuffer | null = null;
    private texCoordBuffer: WebGLBuffer | null = null;

    // Basic quad vertices (x, y) - Full screen quad
    private readonly positions = new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0, 1.0,
        -1.0, 1.0,
        1.0, -1.0,
        1.0, 1.0,
    ]);

    // Texture coordinates (u, v)
    private readonly texCoords = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
    ]);

    constructor(canvas: HTMLCanvasElement | any) {
        // Use standard WebGL 1.0 context for maximum cross-platform compatibility
        // especially strict environments like WeChat Mini-Program
        const opts = { preserveDrawingBuffer: true, antialias: false, depth: false };

        try {
            // First try standard webgl
            this.gl = (canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts)) as WebGLRenderingContext;
        } catch (e) {
            console.warn('[RetroLens] Failed standard getContext', e);
        }

        if (!this.gl) {
            console.error('[RetroLens] WebGL not supported on this device or invalid canvas wrapper.');
            return;
        }

        this.initBuffers();
        this.precompileShaders();
    }

    private initBuffers() {
        if (!this.gl) return;
        const gl = this.gl;

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoords, gl.STATIC_DRAW);
    }

    private compileShader(type: number, source: string): WebGLShader | null {
        if (!this.gl) return null;
        const gl = this.gl;
        const shader = gl.createShader(type);
        if (!shader) return null;

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('[RetroLens] Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    private precompileShaders() {
        if (!this.gl) return;
        const gl = this.gl;

        const vertexShader = this.compileShader(gl.VERTEX_SHADER, ShaderLibrary.VertexShader);
        if (!vertexShader) return;

        // Compile all filter fragments upfront to avoid stuttering later
        for (const [filterKey, fragSource] of Object.entries(ShaderLibrary.FragmentShaders)) {
            const filterType = filterKey as FilterType;
            const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragSource);
            if (!fragmentShader) continue;

            const program = gl.createProgram();
            if (!program) continue;

            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error(`[RetroLens] Program link error for ${filterType}:`, gl.getProgramInfoLog(program));
                continue;
            }

            this.programCache.set(filterType, program);

            // Warmup Uniforms Cache
            this.uniformCache.cacheProgramUniforms(gl, program, filterType);
        }
    }

    // High performance render loop logic (Zero GC jitter)
    public render(mainTexture: WebGLTexture, filter: FilterType, timeMs: number, width: number, height: number, zoom: number = 1.0, texWidth: number = 1.0, texHeight: number = 1.0) {
        if (!this.gl) return;
        const gl = this.gl;
        const program = this.programCache.get(filter);
        if (!program) return;

        if (this.currentProgram !== program) {
            gl.useProgram(program);
            this.currentProgram = program;
        }

        gl.viewport(0, 0, width, height);

        // Bind attributes (we assume they are always location 0 and 1 here to save queries)
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');

        if (positionLoc !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        }

        if (texCoordLoc !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
            gl.enableVertexAttribArray(texCoordLoc);
            gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
        }

        // Set Uniforms
        const uMainTex = this.uniformCache.getLocation(filter, 'u_mainTex');
        const uTime = this.uniformCache.getLocation(filter, 'u_time');
        const uRes = this.uniformCache.getLocation(filter, 'u_resolution');
        const uZoom = this.uniformCache.getLocation(filter, 'u_zoom');
        const uTexRes = this.uniformCache.getLocation(filter, 'u_texResolution');

        if (uMainTex) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, mainTexture);
            gl.uniform1i(uMainTex, 0);
        }

        if (uTime) gl.uniform1f(uTime, timeMs / 1000.0);
        if (uRes) gl.uniform2f(uRes, width, height);
        if (uZoom) gl.uniform1f(uZoom, zoom);
        if (uTexRes) gl.uniform2f(uTexRes, texWidth, texHeight);

        // Draw quad
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    public destroy() {
        if (!this.gl) return;
        const gl = this.gl;

        // Clean up memory
        if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
        if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);

        for (const program of this.programCache.values()) {
            gl.deleteProgram(program);
        }
        this.programCache.clear();
        this.uniformCache.clear();
        this.gl = null;
    }
}
