import { WebGLRenderer } from './WebGLRenderer';
import { FilterType } from '../shader/ShaderLib';

/**
 * ReviewerEngine
 * Handles processing high-resolution static images applying our WebGL fragment shaders.
 * Designed to process one frame and extract base64.
 */
export class ReviewerEngine {
    private renderer: WebGLRenderer | null = null;
    private canvas: HTMLCanvasElement;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.renderer = new WebGLRenderer(this.canvas);
    }

    public async processImage(imgSrc: string, filter: FilterType): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.renderer || !('WebGLRenderingContext' in window)) {
                return reject(new Error('WebGL not available'));
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const gl = this.renderer!['gl']; // dirty access
                if (!gl) return reject(new Error('GL context lost'));

                // Match sizes to original image for best quality
                this.canvas.width = img.width;
                this.canvas.height = img.height;

                // Load Texture
                const texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

                // Render one frame
                this.renderer!.render(texture as WebGLTexture, filter, 0, img.width, img.height);

                // Extract to base64
                const dataUrl = this.canvas.toDataURL('image/jpeg', 0.95);

                gl.deleteTexture(texture);
                resolve(dataUrl);
            };
            img.onerror = () => {
                reject(new Error('Failed to load image into texture'));
            };
            img.src = imgSrc;
        });
    }

    public destroy() {
        if (this.renderer) {
            this.renderer.destroy();
            this.renderer = null;
        }
    }
}
