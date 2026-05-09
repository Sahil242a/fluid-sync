import { useState, useCallback, useRef } from "react";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_SIZE = 500 * 1024 * 1024; // 500MB

const BLOCKED_EXTENSIONS = [
  "exe", "bat", "cmd", "msi", "sh", "bash",
  "ps1", "vbs", "jar", "com", "scr", "dll",
  "reg", "pif", "cpl", "inf"
];

const isBlockedFile = (file) => {
  const ext = file?.name?.split(".").pop()?.toLowerCase() ?? "";
  return BLOCKED_EXTENSIONS.includes(ext);
};

export const useCloudUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadError, setUploadError] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [fileInfo, setFileInfo] = useState(null);

  const [currentFileName, setCurrentFileName] = useState("");
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  const [downloadData, setDownloadData] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState("idle");
  const [downloadError, setDownloadError] = useState("");

  const xhrRef = useRef(null);
  const cancelledRef = useRef(false);

  const uploadSingleFile = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", "fluidsync");

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error("Invalid server response"));
          }
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
  }, []);

  const uploadFiles = useCallback(async (files, user) => {
    const fileArray = Array.from(files || []);

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setUploadError("Cloudinary environment variables are missing");
      setUploadStatus("error");
      return;
    }

    if (!fileArray.length) {
      setUploadError("No files selected");
      setUploadStatus("error");
      return;
    }

    if (!user) {
      setUploadError("Sign in first");
      setUploadStatus("error");
      return;
    }

    const blockedFiles = fileArray.filter(isBlockedFile);
    if (blockedFiles.length > 0) {
      const names = blockedFiles.map((f) => f.name).join(", ");
      setUploadError(`File type not allowed: ${names}`);
      setUploadStatus("error");
      return;
    }

    const tooLargeFiles = fileArray.filter((file) => file.size > MAX_SIZE);
    if (tooLargeFiles.length > 0) {
      const names = tooLargeFiles.map((f) => f.name).join(", ");
      setUploadError(`File too large (max 500MB): ${names}`);
      setUploadStatus("error");
      return;
    }

    cancelledRef.current = false;
    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadError("");
    setTotalFiles(fileArray.length);
    setFileInfo(null);
    setShareLink("");

    const uploadedFiles = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        if (cancelledRef.current) break;

        const file = fileArray[i];
        setCurrentFileName(file.name);
        setCurrentFileIdx(i + 1);
        setUploadProgress(0);

        const result = await uploadSingleFile(file);

        uploadedFiles.push({
          name: file.name,
          size: file.size,
          url: result.secure_url,
        });
      }

      if (cancelledRef.current) {
        setUploadStatus("idle");
        setUploadProgress(0);
        return;
      }

      setUploadStatus("processing");

      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      const payload = {
        files: uploadedFiles,
        exp: expires.toISOString(),
        by: user.name || "Anonymous",
      };

      const encoded = btoa(JSON.stringify(payload));
      const link = `${window.location.origin}/download/${encoded}`;

      setShareLink(link);
      setFileInfo({
        count: uploadedFiles.length,
        totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
        files: uploadedFiles,
        expires: expires.toLocaleDateString(),
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
  }, [uploadSingleFile]);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    xhrRef.current?.abort();
    xhrRef.current = null;

    setUploadStatus("idle");
    setUploadProgress(0);
    setCurrentFileName("");
    setCurrentFileIdx(0);
    setTotalFiles(0);
  }, []);

  const fetchFileInfo = useCallback(async (encoded) => {
    if (!encoded) {
      setDownloadError("Invalid link");
      setDownloadStatus("error");
      return;
    }

    try {
      setDownloadStatus("loading");

      const decoded = JSON.parse(atob(encoded));

      if (decoded.exp && new Date(decoded.exp) < new Date()) {
        setDownloadStatus("expired");
        return;
      }

      // Backward compatible:
      // supports both new multi-file format and old single-file format
      const files = Array.isArray(decoded.files) && decoded.files.length > 0
        ? decoded.files
        : decoded.url
          ? [{
              name: decoded.name || "file",
              size: decoded.size || 0,
              url: decoded.url,
            }]
          : [];

      setDownloadData({
        files,
        uploaderName: decoded.by || "Anonymous",
        expiresAt: decoded.exp || null,
        uploadedAt: decoded.at || null,
      });

      setDownloadStatus("ready");
    } catch (e) {
      console.error("Decode error:", e);
      setDownloadError("Invalid or corrupted link");
      setDownloadStatus("error");
    }
  }, []);

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

    cancelledRef.current = false;
    xhrRef.current = null;
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