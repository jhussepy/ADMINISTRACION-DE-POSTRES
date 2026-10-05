// A small, dependency-free renderer. Photos remain textures on curved cards.

const vertexSource = `
precision mediump float;
attribute vec2 a_uv;
varying vec2 v_uv;
uniform float u_offset;
uniform float u_aspect;
uniform float u_time;
void main() {
  v_uv = a_uv;
  float angle = clamp(u_offset * 0.30, -0.74, 0.74);
  float localX = (a_uv.x - 0.5) * 2.15;
  float localY = (a_uv.y - 0.5) * 2.25;
  float curve = sin(a_uv.x * 3.14159) * (0.13 + sin(u_time + u_offset) * 0.025);
  float x = localX * cos(angle) + u_offset * 2.35;
  float y = localY + sin(u_offset * 0.86) * 0.24;
  float z = -localX * sin(angle) + curve - abs(u_offset) * 0.24;
  float perspective = 3.8 / (3.8 - z);
  gl_Position = vec4(x * perspective / (1.55 * u_aspect), y * perspective / 1.55, 0.0, 1.0);
}`;

const fragmentSource = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_texture;
uniform float u_imageAspect;
uniform float u_offset;
void main() {
  vec2 q = abs(v_uv - 0.5) - vec2(0.445);
  float distance = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.055;
  float alpha = 1.0 - smoothstep(-0.003, 0.003, distance);
  vec2 uv = v_uv;
  float cardAspect = 2.15 / 2.25;
  if (u_imageAspect < cardAspect) uv.x = (uv.x - 0.5) * cardAspect / u_imageAspect + 0.5;
  else uv.y = (uv.y - 0.5) * u_imageAspect / cardAspect + 0.5;
  vec3 color = vec3(1.0, 0.988, 0.965);
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0)
    color = texture2D(u_texture, uv).rgb;
  float shade = min(abs(u_offset) * 0.055, 0.18);
  color *= 1.0 - shade;
  float gloss = pow(max(0.0, 1.0 - abs(v_uv.x + v_uv.y - 1.22) * 1.8), 6.0) * 0.065;
  color = mix(color, vec3(1.0), gloss);
  float border = smoothstep(-0.008, -0.002, distance);
  color = mix(color, vec3(0.89, 0.81, 0.79), border * 0.65);
  gl_FragColor = vec4(color, alpha);
}`;

export function createWaveRenderer(
  canvas: HTMLCanvasElement,
  photos: HTMLImageElement[],
) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
  if (!gl) throw new Error("WebGL unavailable");
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = debug
    ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
    : "";
  const software =
    /SwiftShader|llvmpipe|softpipe|Software|Microsoft Basic Render/i.test(gpu);
  const shaders: WebGLShader[] = [];
  const textures: WebGLTexture[] = [];
  let disposed = false;
  let lastPosition = 0;
  let lastWidth = 1;
  let lastHeight = 1;
  const loop = photos.length >= 5;
  const offsetFor = (index: number, position: number) => {
    const offset = index - position;
    return loop
      ? ((((offset + photos.length / 2) % photos.length) + photos.length) %
          photos.length) -
          photos.length / 2
      : offset;
  };
  function shader(type: number, source: string) {
    const result = gl!.createShader(type);
    if (!result) throw new Error("Shader unavailable");
    shaders.push(result);
    gl!.shaderSource(result, source);
    gl!.compileShader(result);
    if (!gl!.getShaderParameter(result, gl!.COMPILE_STATUS))
      throw new Error(
        "Shader compilation failed: " + gl!.getShaderInfoLog(result),
      );
    return result;
  }
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  if (!program || !buffer) throw new Error("Renderer unavailable");
  try {
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("Shader link failed: " + gl.getProgramInfoLog(program));
  } catch (error) {
    shaders.forEach((item) => gl.deleteShader(item));
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    throw error;
  }
  const vertices: number[] = [];
  const columns = 32;
  const rows = 12;
  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      const left = x / columns,
        right = (x + 1) / columns;
      const bottom = y / rows,
        top = (y + 1) / rows;
      vertices.push(
        left,
        bottom,
        right,
        bottom,
        left,
        top,
        left,
        top,
        right,
        bottom,
        right,
        top,
      );
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.useProgram(program);
  const uv = gl.getAttribLocation(program, "a_uv");
  gl.enableVertexAttribArray(uv);
  gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = {
    offset: uniform("u_offset"),
    aspect: uniform("u_aspect"),
    time: uniform("u_time"),
    imageAspect: uniform("u_imageAspect"),
    texture: uniform("u_texture"),
  };
  const aspects: number[] = [];
  const ready = Promise.all(
    photos.map(async (img, index) => {
      // Reuse the responsive DOM image and its decoded pixels. Only promote
      // lazy images once the gallery is near the viewport; never create a
      // second image or request a different optimizer size for the texture.
      img.loading = "eager";
      await img.decode();
      if (disposed) return;
      const texture = gl.createTexture();
      if (!texture) throw new Error("Texture unavailable");
      textures[index] = texture;
      aspects[index] = img.naturalWidth / img.naturalHeight;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }),
  );

  return {
    frameInterval: 1000 / (software ? 15 : 30),
    ready,
    draw(position: number, time: number) {
      if (disposed || gl.isContextLost()) return;
      lastPosition = position;
      lastWidth = canvas.clientWidth;
      lastHeight = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, software ? 1 : 1.75);
      const width = Math.max(1, Math.round(lastWidth * ratio));
      const height = Math.max(1, Math.round(lastHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.aspect, lastWidth / lastHeight);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1i(uniforms.texture, 0);
      const cards = photos
        .map((_, index) => ({ index, offset: offsetFor(index, position) }))
        .sort((a, b) => Math.abs(b.offset) - Math.abs(a.offset));
      for (const { index, offset } of cards) {
        if (!textures[index] || Math.abs(offset) > 3.5) continue;
        gl.uniform1f(uniforms.offset, offset);
        gl.uniform1f(uniforms.imageAspect, aspects[index]);
        gl.bindTexture(gl.TEXTURE_2D, textures[index]);
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
      }
    },
    pick(x: number, y: number) {
      return (
        photos
          .map((_, index) => ({
            index,
            offset: offsetFor(index, lastPosition),
          }))
          .sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset))
          .find(({ offset }) => {
            const scale = 3.8 / (3.8 + Math.abs(offset) * 0.24);
            const centerX =
              lastWidth / 2 + (offset * 2.35 * scale * lastHeight) / 3.1;
            const centerY =
              lastHeight / 2 -
              (Math.sin(offset * 0.86) * 0.24 * scale * lastHeight) / 3.1;
            const halfWidth =
              (2.15 *
                Math.cos(Math.min(Math.abs(offset) * 0.3, 0.74)) *
                scale *
                lastHeight) /
              6.2;
            return (
              Math.abs(x - centerX) < halfWidth &&
              Math.abs(y - centerY) < (2.25 * scale * lastHeight) / 6.2
            );
          })?.index ?? null
      );
    },
    dispose() {
      disposed = true;
      textures.forEach((texture) => gl.deleteTexture(texture));
      shaders.forEach((item) => gl.deleteShader(item));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

export type WaveRenderer = ReturnType<typeof createWaveRenderer>;
