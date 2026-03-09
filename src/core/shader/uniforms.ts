import { FilterType } from './ShaderLib';

export class UniformCache {
    private locations: Map<string, WebGLUniformLocation> = new Map();

    public cacheProgramUniforms(gl: WebGLRenderingContext | WebGL2RenderingContext, program: WebGLProgram, filterType: FilterType) {
        // Common uniforms for all filters
        const uniformNames = ['u_mainTex', 'u_time', 'u_resolution', 'u_intensity', 'u_zoom', 'u_texResolution'];

        for (const name of uniformNames) {
            const location = gl.getUniformLocation(program, name);
            if (location) {
                // Key format: FilterType_UniformName to avoid collision between programs
                this.locations.set(`${filterType}_${name}`, location);
            }
        }
    }

    public getLocation(filterType: FilterType, name: string): WebGLUniformLocation | null {
        return this.locations.get(`${filterType}_${name}`) || null;
    }

    public clear() {
        this.locations.clear();
    }
}
