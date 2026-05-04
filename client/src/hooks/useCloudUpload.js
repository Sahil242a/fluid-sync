import { useState, useCallback, useRef } from "react";

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_SIZE      = 500 * 1024 * 1024;

const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'msi', 'sh', 'bash',
  'ps1', 'vbs', 'jar', 'com', 'scr', 'dll',
  'reg', 'pif', 'cpl', 'inf'
];

const isBlockedFile = (file) => {
  const ext = file.name?.split('.').pop()?.toLowerCase() ?? '';
  return BLOCKED_EXTENSIONS.includes(ext);
};

export const useCloudUpload = () => {
  const [uploadProgress,  setUploadProgress]  = useState(0);
  const [uploadStatus,    setUploadStatus]    = useState("idle");
  const [uploadError,     setUploadError]     = useState("");
  const [shareLink,       setShareLink]       = useState("");
  const [fileInfo,        setFileInfo]        = useState(null);
  const [currentFileName, setCurrentFileName] = useState("");
  const [currentFileIdx,  setCurrentFileIdx]  = useState(0);
  const [totalFiles,      setTotalFiles]      = useState(0);
  const [downloadData,    setDownloadData]    = useState(null);
  const [downloadStatus,  setDownloadStatus]  = useState("idle");
  const [downloadError,   setDownloadError]   = useState("");

  const xhrRef       = useRef(null);
  const cancelledRef = useRef(false);

  // ── Upload a single file via XHR ──────────────────────
  const uploadSingleFile = (file) =>
    new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file",          file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder",        "fluidsync");

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Failed: ${xhr.status} - ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.onabort = () => reject(new Error("Cancelled"));

      xhr.open(
        "POST",
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`
      );
      xhr.send(formData);
    });

  // ── Upload multiple files ──────────────────────────────
  const uploadFiles = useCallback(async (files, user) => {
    if (!files?.length) { setUploadError("No files selected"); return; }
    if (!user)          { setUploadError("Sign in first");     return; }

    // ✅ Block dangerous file types before anything starts
    const blockedFiles = files.filter(isBlockedFile);
    if (blockedFiles.length > 0) {
      const names = blockedFiles.map((f) => f.name).join(', ');
      setUploadError(`File type not allowed: ${names}`);
      setUploadStatus("error");
      return;
    }

    cancelledRef.current = false;
    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadError("");
    setTotalFiles(files.length);

    const uploadedFiles = [];

    try {
      for (let i = 0; i < files.length; i++) {
        if (cancelledRef.current) break;

        const file = files[i];
        setCurrentFileName(file.name);
        setCurrentFileIdx(i + 1);
        setUploadProgress(0);

        const result = await uploadSingleFile(file);

        uploadedFiles.push({
          name: file.name,
          size: file.size,
          url:  result.secure_url,
        });
      }

      // User cancelled mid-way
      if (cancelledRef.current) {
        setUploadStatus("idle");
        setUploadProgress(0);
        return;
      }

      // ── Build share link ─────────────────────────────
      setUploadStatus("processing");

      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      const payload = {
        files: uploadedFiles,
        exp:   expires.toISOString(),
        by:    user.name || "Anonymous",
      };

      const encoded = btoa(JSON.stringify(payload));
      const link    = `${window.location.origin}/download/${encoded}`;

      setShareLink(link);
      setFileInfo({
        count:     uploadedFiles.length,
        totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
        files:     uploadedFiles,
        expires:   expires.toLocaleDateString(),
      });
      setUploadStatus("complete");

    } catch (err) {
      console.error("Upload error:", err);
      if (err.message === "Cancelled") {
        setUploadStatus("idle");
        setUploadProgress(0);
      } else {
        setUploadError(err.message || "Upload failed");
        setUploadStatus("error");
      }
    }
  }, []);

  // ── Cancel ────────────────────────────────────────────
  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    xhrRef.current?.abort();
    xhrRef.current = null;
    setUploadStatus("idle");
    setUploadProgress(0);
  }, []);

  // ── Fetch file info for download page ─────────────────
  const fetchFileInfo = useCallback(async (encoded) => {
    if (!encoded) {
      setDownloadError("Invalid link");
      setDownloadStatus("error");
      return;
    }
    try {
      setDownloadStatus("loading");
      const decoded = JSON.parse(atob(encoded));

      if (new Date(decoded.exp) < new Date()) {
        setDownloadStatus("expired");
        return;
      }

      setDownloadData({
        files:        decoded.files,
        uploaderName: decoded.by,
        expiresAt:    decoded.exp,
      });
      setDownloadStatus("ready");
    } catch (e) {
      setDownloadError("Invalid or corrupted link");
      setDownloadStatus("error");
    }
  }, []);

  // ── Reset ─────────────────────────────────────────────
  const reset = useCallback(() => {
    setUploadProgress(0);
    setUploadStatus("idle");
    setUploadError("");
    setShareLink("");
    setFileInfo(null);
    setCurrentFileName("");
    setCurrentFileIdx(0);
    setTotalFiles(0);
    setDownloadData(null);
    setDownloadStatus("idle");
    setDownloadError("");
  }, []);

  return {
    uploadProgress,
    uploadStatus,
    uploadError,
    shareLink,
    fileInfo,
    currentFileName,
    currentFileIdx,
    totalFiles,
    uploadFiles,
    cancelUpload,
    downloadData,
    downloadStatus,
    downloadError,
    fetchFileInfo,
    reset,
    MAX_CLOUD_FILE_SIZE: MAX_SIZE,
  };
};