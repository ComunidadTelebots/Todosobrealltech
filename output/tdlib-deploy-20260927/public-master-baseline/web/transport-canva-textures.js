/**
 * Generador de Texturas Autoritativas Fieles a las Referencias de Canva (Canal Alfa).
 * Renderiza texturas de alta resolución para la Caja 07-A, la Tablet de Diagnóstico,
 * las Señales de Protección de Fauna y los Paneles de Carga Especial.
 */

export const CANVA_TEXTURE_PRESETS = Object.freeze({
  box07a_manifest: {
    name: "canva_box07a_manifest",
    category: "storyboard",
    sourcePage: "page-077-caja-07a.png",
    render: (ctx, w, h) => {
      ctx.fillStyle = "#e2d8c3";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#827867";
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      ctx.fillStyle = "#2c261e";
      ctx.font = "bold 20px monospace";
      ctx.fillText("MANIFIESTO DE TRANSPORTE", 24, 40);

      ctx.font = "14px monospace";
      ctx.fillText("Remitente: Rutas del Continente", 24, 75);
      ctx.fillText("Destino:   Puerto Alba / Inirida", 24, 100);
      ctx.fillText("Guia:      RC-8841", 24, 125);
      ctx.fillText("Contenido: Equipos y documentos", 24, 150);
      ctx.fillText("Peso dec.: 32.4 kg (1/1 bultos)", 24, 175);

      // Sello rojo INCOMPLETO
      ctx.save();
      ctx.translate(w * 0.65, h * 0.68);
      ctx.rotate(-0.25);
      ctx.strokeStyle = "#c82b1d";
      ctx.lineWidth = 5;
      ctx.strokeRect(-110, -28, 220, 56);
      ctx.fillStyle = "#c82b1d";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("INCOMPLETO", 0, 10);
      ctx.restore();

      // Cinta de precinto alterado
      ctx.fillStyle = "#ff6a38";
      ctx.fillRect(w - 70, 0, 50, h);
      ctx.fillStyle = "#250c05";
      ctx.font = "bold 13px sans-serif";
      ctx.save();
      ctx.translate(w - 40, h / 2);
      ctx.rotate(Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText("PRECINTO ALTERADO", 0, 5);
      ctx.restore();
    }
  },

  diagnostic_tablet: {
    name: "canva_diagnostic_tablet",
    category: "workshop",
    sourcePage: "page-080-primer-diagnostico.png",
    render: (ctx, w, h) => {
      ctx.fillStyle = "#040e16";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#1d4d5e";
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, w - 24, h - 24);

      ctx.fillStyle = "#55ead9";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DIAGNÓSTICO INICIAL · TALLER", w / 2, 48);

      // Fila 1: Temperatura
      ctx.fillStyle = "#081e2b";
      ctx.fillRect(24, 72, w - 48, 64);
      ctx.fillStyle = "#ff4f38";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🌡 TEMPERATURA MOTOR", 40, 100);
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("112 °C (ALTA)", w - 40, 112);

      // Fila 2: Presión de Aceite
      ctx.fillStyle = "#081e2b";
      ctx.fillRect(24, 148, w - 48, 64);
      ctx.fillStyle = "#ffaa38";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🛢 PRESIÓN DE ACEITE", 40, 176);
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("1.2 bar (BAJA)", w - 40, 188);

      // Fila 3: Falla Eléctrica
      ctx.fillStyle = "#081e2b";
      ctx.fillRect(24, 224, w - 48, 64);
      ctx.fillStyle = "#ff4f38";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("⚡ FALLA ELÉCTRICA", 40, 252);
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "right";
      ctx.fillText("CÓDIGO P0562", w - 40, 264);

      // Pie: Recomendación
      ctx.fillStyle = "#789cad";
      ctx.font = "14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Recomendación: Inspección manual de mangueras y correas.", w / 2, h - 32);
    }
  },

  wildlife_protection_sign: {
    name: "canva_wildlife_protection_sign",
    category: "safety",
    sourcePage: "page-093-fauna-forestal-montana.png",
    render: (ctx, w, h) => {
      ctx.fillStyle = "#1e4832";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ZONA DE", w / 2, 48);
      ctx.fillText("PROTECCIÓN", w / 2, 78);

      // Silueta ciervo
      ctx.font = "72px sans-serif";
      ctx.fillText("🦌", w / 2, 170);

      ctx.fillStyle = "#a8e0be";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText("FAUNA SILVESTRE", w / 2, 220);
    }
  },

  special_v21_banner: {
    name: "canva_special_v21_banner",
    category: "special",
    sourcePage: "page-023.png",
    render: (ctx, w, h) => {
      ctx.fillStyle = "#ffcc00";
      ctx.fillRect(0, 0, w, h);

      // Franjas de advertencia en los extremos
      ctx.fillStyle = "#111111";
      for (let x = 0; x < 60; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 10, 0);
        ctx.lineTo(x - 6, h);
        ctx.lineTo(x - 16, h);
        ctx.fill();
      }
      for (let x = w - 60; x < w; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 10, 0);
        ctx.lineTo(x - 6, h);
        ctx.lineTo(x - 16, h);
        ctx.fill();
      }

      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      ctx.fillStyle = "#111111";
      ctx.font = "900 32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TRANSPORTE ESPECIAL", w / 2, h / 2);
    }
  },

  dash_check_engine: {
    name: "canva_dash_check_engine",
    category: "cockpit",
    sourcePage: "page-079-puente-prologo-taller.png",
    render: (ctx, w, h) => {
      ctx.fillStyle = "#0c0d10";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#ff7f18";
      ctx.lineWidth = 8;
      ctx.strokeRect(16, 16, w - 32, h - 32);

      ctx.fillStyle = "#ff9524";
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚠️", w / 2, h / 2 - 20);

      ctx.font = "bold 20px monospace";
      ctx.fillText("CHECK ENGINE", w / 2, h / 2 + 45);
    }
  }
});

export function createCanvaTextureAtlas({ width = 512, height = 512, THREE = globalThis.THREE } = {}) {
  const textures = {};

  const getTexture = presetId => {
    if (textures[presetId]) return textures[presetId];
    const preset = CANVA_TEXTURE_PRESETS[presetId];
    if (!preset) return null;

    let canvas = null;
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      preset.render(ctx, width, height);
    }

    const texObj = {
      name: preset.name,
      category: preset.category,
      sourcePage: preset.sourcePage,
      canvas,
      dispose() {
        if (this.threeTexture) this.threeTexture.dispose();
      }
    };

    if (THREE && canvas) {
      const tex = new THREE.CanvasTexture(canvas);
      tex.name = preset.name;
      tex.colorSpace = THREE.SRGBColorSpace;
      texObj.threeTexture = tex;
    }

    textures[presetId] = texObj;
    return texObj;
  };

  return {
    getTexture,
    presets: CANVA_TEXTURE_PRESETS,
    dispose() {
      Object.values(textures).forEach(t => t.dispose());
    }
  };
}

export default { CANVA_TEXTURE_PRESETS, createCanvaTextureAtlas };
