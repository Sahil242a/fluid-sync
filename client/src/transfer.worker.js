// client/src/transfer.worker.js

// ─── State ────────────────────────────────────────────────
let isCancelled = false;
let isRunning   = false;

// ─── Main Message Handler ──────────────────────────────────
self.onmessage = async (e) => {
  const { type } = e.data;

  switch (type) {
    case 'START':
      await handleStart(e.data);
      break;

    case 'CANCEL':
      handleCancel();
      break;

    default:
      sendError(`Unknown message type: ${type}`);
  }
};

// ─── Start Handler ─────────────────────────────────────────
async function handleStart({ file, chunkSize = 256 * 1024 }) {
  // Validate inputs
  if (!file) {
    sendError('No file provided');
    return;
  }

  if (isRunning) {
    sendError('Worker is already processing a file');
    return;
  }

  // Reset state
  isCancelled = false;
  isRunning   = true;

  const totalSize  = file.size;
  const fileName   = file.name;
  const totalChunks = Math.ceil(totalSize / chunkSize);
  let offset       = 0;
  let chunkIndex   = 0;

  // Notify start
  self.postMessage({
    type: 'STARTED',
    fileName,
    fileSize: totalSize,
    totalChunks,
  });

  try {
    while (offset < totalSize) {
      // Check cancellation before each chunk
      if (isCancelled) {
        self.postMessage({ 
          type: 'CANCELLED',
          fileName,
          bytesRead: offset,
        });
        break;
      }

      // Calculate slice boundaries
      const end   = Math.min(offset + chunkSize, totalSize);
      const slice = file.slice(offset, end);

      // Use arrayBuffer() - much faster than FileReader in workers
      const buffer = await slice.arrayBuffer();

      // Final cancel check after async operation
      if (isCancelled) {
        self.postMessage({ 
          type: 'CANCELLED',
          fileName,
          bytesRead: offset,
        });
        break;
      }

      const isLast = offset + buffer.byteLength >= totalSize;

      // Send chunk to main thread
      // Transfer ownership with Transferable for zero-copy
      self.postMessage(
        {
          type:       'CHUNK',
          buffer,
          offset,
          chunkIndex,
          totalChunks,
          isLast,
          fileName,
          progress: Math.round((end / totalSize) * 100),
        },
        [buffer] // ← Transferable: avoids memory copy
      );

      offset     += buffer.byteLength;
      chunkIndex += 1;
    }

    // Send completion if not cancelled
    if (!isCancelled) {
      self.postMessage({
        type:        'DONE',
        fileName,
        fileSize:    totalSize,
        totalChunks: chunkIndex,
      });
    }

  } catch (err) {
    sendError(`Failed to read file: ${err.message}`, fileName);
  } finally {
    isRunning = false;
  }
}

// ─── Cancel Handler ────────────────────────────────────────
function handleCancel() {
  if (!isRunning) return;
  console.log('[Worker] Cancellation requested');
  isCancelled = true;
}

// ─── Error Helper ──────────────────────────────────────────
function sendError(message, fileName = null) {
  self.postMessage({
    type: 'ERROR',
    message,
    fileName,
  });
  isRunning = false;
}