// src/lib/blob.js
import { put, del } from '@vercel/blob';

/**
 * Upload buffer ke Vercel Blob Storage
 * @param {Buffer} fileBuffer - Buffer dari file yang diupload
 * @param {string} filename - Nama file dengan extension (e.g., 'avatar-123.jpg')
 * @param {Object} options - Options tambahan
 * @returns {Promise<Object>} - Result dengan { url, pathname, downloadUrl }
 */
export async function uploadToBlob(fileBuffer, filename, options = {}) {
  try {
    const blob = await put(filename, fileBuffer, {
      access: 'public',
      addRandomSuffix: false, // Tidak tambah suffix random agar bisa overwrite
      ...options,
    });

    console.log('[Vercel Blob] Upload success:', blob.url);
    return blob;
  } catch (error) {
    console.error('[Vercel Blob] Upload error:', error);
    throw new Error('Gagal mengupload foto ke cloud storage');
  }
}

/**
 * Hapus file dari Vercel Blob Storage
 * @param {string} url - Full URL dari blob yang akan dihapus
 * @returns {Promise<void>}
 */
export async function deleteFromBlob(url) {
  try {
    if (!url || typeof url !== 'string') return;
    
    // Hanya hapus jika URL dari Vercel Blob (dimulai dengan https://...)
    if (!url.startsWith('https://') || !url.includes('vercel-storage')) {
      console.log('[Vercel Blob] Skip delete, not a blob URL:', url);
      return;
    }

    await del(url);
    console.log('[Vercel Blob] Delete success:', url);
  } catch (error) {
    console.error('[Vercel Blob] Delete error:', error);
    // Tidak throw error, biarkan proses lanjut meski delete gagal
  }
}
