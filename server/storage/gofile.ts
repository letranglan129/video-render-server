// gofile.ts
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyAgent = new HttpsProxyAgent(process.env.PROXY_URL!);

interface GofileUploadResponse {
    status: string;
    data: {
        guestToken?: string;
        downloadPage: string;
        fileId: string;
        fileName: string;
        md5: string;
        parentFolder: string;
    };
}

interface UploadResult {
    success: boolean;
    guestToken?: string;
    downloadPage?: string;
    directLink?: string;
    fileId?: string;
    fileName?: string;
    parentFolder?: string;
    error?: string;
}

interface UploadOptions {
    folderId?: string;
    token?: string;
    server?: string;
}

class GofileUploader {
    private static readonly UPLOAD_ENDPOINT = 'https://upload-ap-sgp.gofile.io/uploadfile';
    private static readonly isNode = typeof process !== 'undefined' &&
        process.versions != null &&
        process.versions.node != null;

    /**
     * Regional upload endpoints
     */
    static readonly SERVERS = {
        AUTO: 'https://upload-ap-sgp.gofile.io/uploadfile',
        EU_PARIS: 'https://upload-eu-par.gofile.io/uploadfile',
        NA_PHOENIX: 'https://upload-na-phx.gofile.io/uploadfile',
        AP_SINGAPORE: 'https://upload-ap-sgp.gofile.io/uploadfile',
        AP_HONGKONG: 'https://upload-ap-hkg.gofile.io/uploadfile',
        AP_TOKYO: 'https://upload-ap-tyo.gofile.io/uploadfile',
        SA_SAOPAULO: 'https://upload-sa-sao.gofile.io/uploadfile'
    };

    /**
     * Upload file từ browser File object
     * @param file - File object
     * @param options - Upload options (folderId, token, server)
     */
    static async upload(file: File, options: UploadOptions = {}): Promise<UploadResult> {
        try {
            const uploadUrl = options.server || this.UPLOAD_ENDPOINT;
            console.log(`Đang upload file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

            const uploadData = await this.uploadFileBrowser(file, uploadUrl, options);

            const { guestToken, downloadPage, fileId, fileName, parentFolder } = uploadData.data;

            // Tạo direct link từ downloadPage
            const directLink = this.extractDirectLink(downloadPage, fileId, fileName);

            console.log('✅ Upload thành công!');
            console.log(`Download page: ${downloadPage}`);
            if (directLink) {
                console.log(`Direct link: ${directLink}`);
            }

            return {
                success: true,
                guestToken,
                downloadPage,
                directLink,
                fileId,
                fileName,
                parentFolder
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Lỗi:', errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Upload file từ path hệ thống (Node.js only)
     * @param filePath - Đường dẫn file
     * @param options - Upload options
     */
    static async uploadFromPath(filePath: string, options: UploadOptions = {}): Promise<UploadResult> {
        if (!this.isNode) {
            return {
                success: false,
                error: 'uploadFromPath chỉ hoạt động trong môi trường Node.js'
            };
        }

        try {
            // Kiểm tra file tồn tại
            if (!fs.existsSync(filePath)) {
                throw new Error(`File không tồn tại: ${filePath}`);
            }

            const stats = fs.statSync(filePath);
            if (!stats.isFile()) {
                throw new Error(`Đường dẫn không phải là file: ${filePath}`);
            }

            const uploadUrl = options.server || this.UPLOAD_ENDPOINT;
            const fileName = path.basename(filePath);

            console.log(`Đang upload file: ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

            const uploadData = await this.uploadFileFromPath(filePath, uploadUrl, options);

            const { guestToken, downloadPage, fileId, parentFolder } = uploadData.data;
            const directLink = this.extractDirectLink(downloadPage, fileId, fileName);

            console.log('✅ Upload thành công!');
            console.log(`Download page: ${downloadPage}`);
            if (directLink) {
                console.log(`Direct link: ${directLink}`);
            }

            return {
                success: true,
                guestToken,
                downloadPage,
                directLink,
                fileId,
                fileName,
                parentFolder
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Lỗi:', errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Upload nhiều file từ path
     * @param filePaths - Mảng đường dẫn file
     * @param options - Upload options
     */
    static async uploadMultipleFromPath(
        filePaths: string[],
        options: UploadOptions = {}
    ): Promise<UploadResult[]> {
        const results: UploadResult[] = [];
        let currentOptions = { ...options };

        for (let i = 0; i < filePaths.length; i++) {
            console.log(`\n[${i + 1}/${filePaths.length}] Uploading: ${filePaths[i]}`);

            const result = await this.uploadFromPath(filePaths[i], currentOptions);
            results.push(result);

            // Nếu upload thành công và không có folderId ban đầu,
            // sử dụng parentFolder từ lần upload đầu tiên cho các file tiếp theo
            if (result.success && !options.folderId && result.parentFolder) {
                currentOptions.folderId = result.parentFolder;
                if (result.guestToken) {
                    currentOptions.token = result.guestToken;
                }
                console.log(`📁 Sử dụng folder: ${result.parentFolder} cho các file tiếp theo`);
            }
        }

        return results;
    }

    /**
     * Upload tất cả file trong folder
     * @param folderPath - Đường dẫn folder
     * @param recursive - Upload cả subfolder
     * @param options - Upload options
     */
    static async uploadFolder(
        folderPath: string,
        recursive: boolean = false,
        options: UploadOptions = {}
    ): Promise<UploadResult[]> {
        if (!this.isNode) {
            return [{
                success: false,
                error: 'uploadFolder chỉ hoạt động trong môi trường Node.js'
            }];
        }

        try {
            if (!fs.existsSync(folderPath)) {
                throw new Error(`Folder không tồn tại: ${folderPath}`);
            }

            const stats = fs.statSync(folderPath);
            if (!stats.isDirectory()) {
                throw new Error(`Đường dẫn không phải là folder: ${folderPath}`);
            }

            const files = this.getAllFiles(folderPath, recursive);
            console.log(`📦 Tìm thấy ${files.length} file(s) để upload\n`);

            return await this.uploadMultipleFromPath(files, options);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return [{
                success: false,
                error: errorMessage
            }];
        }
    }

    /**
     * Lấy tất cả file trong folder
     */
    private static getAllFiles(dirPath: string, recursive: boolean): string[] {
        const files: string[] = [];
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);

            if (stat.isFile()) {
                files.push(fullPath);
            } else if (stat.isDirectory() && recursive) {
                files.push(...this.getAllFiles(fullPath, recursive));
            }
        }

        return files;
    }

    /**
     * Upload file từ browser
     */
    private static async uploadFileBrowser(
        file: File,
        uploadUrl: string,
        options: UploadOptions
    ): Promise<GofileUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        if (options.folderId) {
            formData.append('folderId', options.folderId);
        }

        const headers: HeadersInit = {};
        if (options.token) {
            headers['Authorization'] = `Bearer ${options.token}`;
        }

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            headers,
            agent: proxyAgent
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as GofileUploadResponse;

        if (data.status !== 'ok') {
            throw new Error('Upload thất bại');
        }

        return data;
    }

    /**
     * Upload file từ path (Node.js)
     */
    private static async uploadFileFromPath(
        filePath: string,
        uploadUrl: string,
        options: UploadOptions
    ): Promise<GofileUploadResponse> {
        const FormDataNode = require('form-data');
        const formData = new FormDataNode();

        const fileName = path.basename(filePath);
        const fileStream = fs.createReadStream(filePath);

        formData.append('file', fileStream, fileName);

        if (options.folderId) {
            formData.append('folderId', options.folderId);
        }

        const headers = formData.getHeaders();
        if (options.token) {
            headers['Authorization'] = `Bearer ${options.token}`;
        }

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            headers,
            agent: proxyAgent
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as GofileUploadResponse;
        
        if (data.status !== 'ok') {
            throw new Error('Upload thất bại');
        }

        return data;
    }

    /**
     * Trích xuất direct link từ download page
     */
    private static extractDirectLink(
        downloadPage: string,
        fileId: string,
        fileName: string
    ): string | undefined {
        // Gofile không cung cấp direct link trực tiếp
        // Return download page thay vì tạo link giả
        return downloadPage;
    }

    /**
     * Upload từ URL
     */
    static async uploadFromUrl(
        url: string,
        fileName?: string,
        options: UploadOptions = {}
    ): Promise<UploadResult> {
        try {
            console.log('📥 Đang tải file từ URL...');
            const response = await fetch(url, { agent: proxyAgent });

            if (!response.ok) {
                throw new Error(`Không thể tải file: ${response.status}`);
            }

            const buffer = await response.buffer();
            const name = fileName || url.split('/').pop() || 'file';

            if (this.isNode) {
                const tempPath = path.join('/tmp', name);
                fs.writeFileSync(tempPath, buffer);
                const result = await this.uploadFromPath(tempPath, options);
                fs.unlinkSync(tempPath);
                return result;
            } else {
                const blob = new Blob([buffer]);
                const file = new File([blob], name);
                return await this.upload(file, options);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Upload text content
     */
    static async uploadText(
        content: string,
        fileName: string = 'file.txt',
        options: UploadOptions = {}
    ): Promise<UploadResult> {
        if (this.isNode) {
            const tempPath = path.join('/tmp', fileName);
            fs.writeFileSync(tempPath, content);
            const result = await this.uploadFromPath(tempPath, options);
            fs.unlinkSync(tempPath);
            return result;
        } else {
            const blob = new Blob([content], { type: 'text/plain' });
            const file = new File([blob], fileName);
            return await this.upload(file, options);
        }
    }

    /**
     * Upload từ base64
     */
    static async uploadBase64(
        base64: string,
        fileName: string,
        mimeType: string = 'application/octet-stream',
        options: UploadOptions = {}
    ): Promise<UploadResult> {
        try {
            const base64Data = base64.replace(/^data:.+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            if (this.isNode) {
                const tempPath = path.join('/tmp', fileName);
                fs.writeFileSync(tempPath, buffer);
                const result = await this.uploadFromPath(tempPath, options);
                fs.unlinkSync(tempPath);
                return result;
            } else {
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);

                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }

                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mimeType });
                const file = new File([blob], fileName);

                return await this.upload(file, options);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Lỗi xử lý base64: ${errorMessage}`
            };
        }
    }
}

export default GofileUploader;
export type { UploadResult, UploadOptions, GofileUploadResponse };