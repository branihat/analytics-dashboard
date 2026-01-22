/**
 * Utility functions for handling image URLs, especially Google Drive links
 */

/**
 * Convert Google Drive sharing URL to direct image URL
 * @param {string} url - The original URL
 * @returns {string} - The converted URL for direct image access
 */
const convertGoogleDriveUrl = (url) => {
  if (!url) return url;
  
  // Extract file ID from various Google Drive URL formats
  let fileId = null;
  
  const patterns = [
    /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/, // Standard sharing URL
    /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/, // Open URL format
    /https:\/\/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/, // UC format
    /https:\/\/drive\.google\.com\/thumbnail\?.*id=([a-zA-Z0-9_-]+)/, // Existing thumbnail
    /id=([a-zA-Z0-9_-]+)/, // Generic id parameter
    /\/d\/([a-zA-Z0-9_-]+)/ // Direct format
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      fileId = match[1];
      break;
    }
  }
  
  if (fileId) {
    // If it's already a thumbnail URL, preserve the existing size parameter
    if (url.includes('drive.google.com/thumbnail')) {
      console.log(`Google Drive thumbnail URL already in correct format: ${url}`);
      return url;
    }
    
    // Use thumbnail API which works better for web embedding
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800-h600`;
    console.log(`Converted Google Drive URL: ${url} -> ${thumbnailUrl}`);
    return thumbnailUrl;
  }
  
  // If it's already a properly formatted thumbnail URL, return as is
  if (url.includes('drive.google.com/thumbnail')) {
    console.log(`Preserving existing Google Drive thumbnail URL: ${url}`);
    return url;
  }
  
  // For other URLs, return as is
  return url;
};

/**
 * Validate and process image URL
 * @param {string} url - The image URL to process
 * @returns {string} - The processed URL
 */
const processImageUrl = (url) => {
  if (!url) return null;
  
  try {
    // Convert Google Drive URLs
    const processedUrl = convertGoogleDriveUrl(url);
    
    // Basic URL validation
    new URL(processedUrl);
    
    return processedUrl;
  } catch (error) {
    console.warn(`Invalid image URL: ${url}`, error.message);
    return url; // Return original URL even if invalid, let frontend handle gracefully
  }
};

/**
 * Check if URL is a valid image URL
 * @param {string} url - The URL to check
 * @returns {boolean} - Whether the URL appears to be an image
 */
const isValidImageUrl = (url) => {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    // Check for Google Drive URLs
    if (urlObj.hostname === 'drive.google.com') {
      return true;
    }
    
    // Check for common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const pathname = urlObj.pathname.toLowerCase();
    
    return imageExtensions.some(ext => pathname.endsWith(ext)) || 
           pathname.includes('image') || 
           urlObj.searchParams.has('export'); // Google Drive export parameter
  } catch (error) {
    return false;
  }
};

module.exports = {
  convertGoogleDriveUrl,
  processImageUrl,
  isValidImageUrl
};