/**
 * Helper function to convert hex color to RGB
 * @param hex Hex color code like #f8f9fa or #333
 * @returns RGB values as string like "248, 249, 250"
 */
export function hexToRgb(hex: string): string {
  // Remove the # if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  let r, g, b;
  if (hex.length === 3) {
    // For 3-digit hex codes like #fff
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    // For 6-digit hex codes like #ffffff
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  
  return `${r}, ${g}, ${b}`;
}
