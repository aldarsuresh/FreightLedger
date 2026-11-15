import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export interface PDFResult {
  uri: string;
  tempUri: string;
  fileName: string;
}

/**
 * Normalizes directory and file name into a clean file:// URI with no double slashes.
 */
function normalizeFileUri(baseDir: string | null, fileName: string): string | null {
  if (!baseDir) return null;
  let cleanDir = baseDir.trim();
  if (!cleanDir.startsWith('file://')) {
    cleanDir = cleanDir.startsWith('/') ? `file://${cleanDir}` : `file:///${cleanDir}`;
  }
  // Remove trailing slashes
  cleanDir = cleanDir.replace(/\/+$/, '');
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const sanitized = cleanFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${cleanDir}/${sanitized}`;
}

export async function generatePDF(html: string, fileName: string): Promise<PDFResult> {
  // 1. Generate PDF with Print.printToFileAsync
  const { uri: rawTempUri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Ensure tempUri is properly formatted
  let tempUri = rawTempUri.trim();
  if (!tempUri.startsWith('file://')) {
    tempUri = tempUri.startsWith('/') ? `file://${tempUri}` : `file:///${tempUri}`;
  }

  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const sanitizedFileName = cleanFileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Strategy A: Try creating the renamed file in the exact same directory as tempUri
  // (which is already inside Android's allowed internal cacheDir/Print path)
  const lastSlashIndex = tempUri.lastIndexOf('/');
  const tempDir = lastSlashIndex !== -1 ? tempUri.substring(0, lastSlashIndex) : null;
  const sameDirTarget = normalizeFileUri(tempDir, sanitizedFileName);

  if (sameDirTarget && sameDirTarget !== tempUri) {
    try {
      const existingInfo = await FileSystem.getInfoAsync(sameDirTarget);
      if (existingInfo.exists) {
        await FileSystem.deleteAsync(sameDirTarget, { idempotent: true });
      }
      await FileSystem.copyAsync({
        from: tempUri,
        to: sameDirTarget,
      });
      const verified = await FileSystem.getInfoAsync(sameDirTarget);
      if (verified.exists && verified.uri) {
        return { uri: verified.uri, tempUri, fileName: sanitizedFileName };
      }
    } catch (err) {
      console.warn('[PDF] Failed copying to sameDirTarget, trying cacheDirectory:', err);
    }
  }

  // Strategy B: Try normalized FileSystem.cacheDirectory / documentDirectory
  const baseCacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const targetCacheUri = normalizeFileUri(baseCacheDir, sanitizedFileName);

  if (targetCacheUri && targetCacheUri !== tempUri) {
    try {
      const existingInfo = await FileSystem.getInfoAsync(targetCacheUri);
      if (existingInfo.exists) {
        await FileSystem.deleteAsync(targetCacheUri, { idempotent: true });
      }
      await FileSystem.copyAsync({
        from: tempUri,
        to: targetCacheUri,
      });
      const verified = await FileSystem.getInfoAsync(targetCacheUri);
      if (verified.exists && verified.uri) {
        return { uri: verified.uri, tempUri, fileName: sanitizedFileName };
      }
    } catch (err) {
      console.warn('[PDF] Failed copying to cacheDirectory:', err);
    }
  }

  // Strategy C: Return direct tempUri (which resides in cacheDir with valid file:// URI)
  return { uri: tempUri, tempUri, fileName: sanitizedFileName };
}

export async function sharePDF(
  uri: string,
  fileName: string,
  dialogTitle?: string,
  fallbackUri?: string
): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not supported or not available on this device.');
  }

  const formatUri = (u: string) => {
    let clean = u.trim();
    if (!clean.startsWith('file://')) {
      clean = clean.startsWith('/') ? `file://${clean}` : `file:///${clean}`;
    }
    return clean;
  };

  const primaryUri = formatUri(uri);

  try {
    const fileInfo = await FileSystem.getInfoAsync(primaryUri);
    const uriToShare = fileInfo.exists && fileInfo.uri ? fileInfo.uri : primaryUri;

    await Sharing.shareAsync(uriToShare, {
      mimeType: 'application/pdf',
      dialogTitle: dialogTitle ?? `Share ${fileName}`,
      UTI: 'com.adobe.pdf',
    });
  } catch (err: any) {
    console.warn('[PDF] Primary shareAsync failed:', err?.message);
    // If primary failed (e.g. Android ExpoSharing rejected path permissions), retry with direct Print tempUri
    if (fallbackUri && fallbackUri !== primaryUri) {
      console.log('[PDF] Retrying shareAsync with direct fallbackUri:', fallbackUri);
      const cleanFallback = formatUri(fallbackUri);
      const fallbackInfo = await FileSystem.getInfoAsync(cleanFallback);
      const fallbackToShare = fallbackInfo.exists && fallbackInfo.uri ? fallbackInfo.uri : cleanFallback;

      await Sharing.shareAsync(fallbackToShare, {
        mimeType: 'application/pdf',
        dialogTitle: dialogTitle ?? `Share ${fileName}`,
        UTI: 'com.adobe.pdf',
      });
      return;
    }
    throw err;
  }
}

export async function previewPDF(html: string): Promise<void> {
  await Print.printAsync({ html });
}

export async function shareOnWhatsApp(uri: string, fileName: string, fallbackUri?: string): Promise<void> {
  await sharePDF(uri, fileName, 'Share Digital LR PDF', fallbackUri);
}
