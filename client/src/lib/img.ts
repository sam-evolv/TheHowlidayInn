// Cloudinary image optimization utility
export function cloudinaryUrl(path: string, width: number): string {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    // Fallback to original path if Cloudinary not configured
    return path;
  }
  // Remove leading slash for Cloudinary path
  const cleanPath = path.replace(/^\//, '');
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${width}/${cleanPath}`;
}
