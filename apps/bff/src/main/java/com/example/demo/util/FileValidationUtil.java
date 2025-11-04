package com.example.demo.util;

import java.util.HashMap;
import java.util.Map;

/**
 * Utility for validating file types using magic numbers (file signatures)
 * Prevents malicious files disguised with fake MIME types
 */
public class FileValidationUtil {

    // Magic number signatures for allowed file types
    private static final Map<String, byte[][]> FILE_SIGNATURES = new HashMap<>();

    static {
        // PDF files start with "%PDF"
        FILE_SIGNATURES.put("application/pdf", new byte[][]{
            {0x25, 0x50, 0x44, 0x46} // %PDF
        });

        // JPEG files
        FILE_SIGNATURES.put("image/jpeg", new byte[][]{
            {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0}, // JFIF
            {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE1}  // EXIF
        });

        // PNG files
        FILE_SIGNATURES.put("image/png", new byte[][]{
            {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
        });

        // GIF files
        FILE_SIGNATURES.put("image/gif", new byte[][]{
            {0x47, 0x49, 0x46, 0x38, 0x37, 0x61}, // GIF87a
            {0x47, 0x49, 0x46, 0x38, 0x39, 0x61}  // GIF89a
        });

        // WebP files
        FILE_SIGNATURES.put("image/webp", new byte[][]{
            {0x52, 0x49, 0x46, 0x46} // RIFF (check bytes 8-11 for "WEBP")
        });

        // MS Word (legacy .doc)
        FILE_SIGNATURES.put("application/msword", new byte[][]{
            {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1}
        });

        // MS Word (.docx) - ZIP archive
        FILE_SIGNATURES.put("application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            new byte[][]{
                {0x50, 0x4B, 0x03, 0x04} // ZIP signature
            }
        );
    }

    /**
     * Validate file signature matches declared MIME type
     *
     * @param fileBytes First bytes of the file (at least 12 bytes)
     * @param declaredMimeType MIME type declared by client
     * @return true if signature matches, false otherwise
     */
    public static boolean validateFileSignature(byte[] fileBytes, String declaredMimeType) {
        if (fileBytes == null || fileBytes.length < 4) {
            return false;
        }

        byte[][] signatures = FILE_SIGNATURES.get(declaredMimeType.toLowerCase());
        if (signatures == null) {
            // Unknown type - reject for safety
            return false;
        }

        // Check if file starts with any of the valid signatures
        for (byte[] signature : signatures) {
            if (matchesSignature(fileBytes, signature)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if file bytes start with the expected signature
     */
    private static boolean matchesSignature(byte[] fileBytes, byte[] signature) {
        if (fileBytes.length < signature.length) {
            return false;
        }

        for (int i = 0; i < signature.length; i++) {
            if (fileBytes[i] != signature[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check for dangerous file extensions
     * Additional safety layer - block executables even if signature passes
     */
    public static boolean hasDangerousExtension(String filename) {
        if (filename == null) {
            return false;
        }

        String lower = filename.toLowerCase();
        String[] dangerous = {
            ".exe", ".bat", ".cmd", ".com", ".scr", ".vbs", ".js",
            ".jar", ".app", ".dmg", ".deb", ".rpm", ".sh", ".ps1",
            ".msi", ".dll", ".so", ".dylib"
        };

        for (String ext : dangerous) {
            if (lower.endsWith(ext)) {
                return true;
            }
        }

        return false;
    }
}
