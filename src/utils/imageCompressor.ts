/**
 * Utilidad para comprimir y optimizar imágenes en el cliente antes de guardarlas.
 * Convierte fotos pesadas (3MB - 20MB) en imágenes de alta resolución pero ligeras (~60KB - 120KB),
 * evitando exceder la cuota de localStorage y garantizando que se sincronicen rápidamente en Supabase.
 */

export const compressImage = (
  file: File, 
  maxWidth = 1000, 
  maxHeight = 1000, 
  quality = 0.82
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Si no es un archivo de imagen válido, rechazar amigablemente
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen válida.'));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo de la imagen.'));
    };

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Error al decodificar la imagen.'));
      };

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calcular proporciones manteniendo el aspect ratio original
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Si el navegador no soporta canvas 2D, devolver la imagen original
          resolve(reader.result as string);
          return;
        }

        // Suavizado de imagen de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Dibujar en el lienzo
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar como JPEG optimizado (o PNG si tiene transparencia)
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        
        try {
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);
          resolve(compressedDataUrl);
        } catch {
          // Si toDataURL falla por alguna razón de formato, fallback seguro
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
};

