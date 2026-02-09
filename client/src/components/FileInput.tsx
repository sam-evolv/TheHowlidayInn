import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadToCloudinary, uploadManyToCloudinary } from '@/lib/uploadToCloudinary';
import { Upload, FileText, CheckCircle, AlertCircle, File as FileIcon, ImageIcon } from 'lucide-react';

interface FileInputProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  value?: string | string[] | File | File[];
  onChange: (urls: string | string[]) => void;
}

export function FileInput({ 
  label = "Upload files (JPG/PNG/PDF)",
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  multiple = false,
  value,
  onChange
}: FileInputProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert value to array of strings, handling both File and string types
  const urls = (() => {
    if (!value) return [];
    
    if (multiple) {
      const valueArray = Array.isArray(value) ? value : [value];
      return valueArray.filter(v => typeof v === 'string') as string[];
    } else {
      return typeof value === 'string' ? [value] : [];
    }
  })();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setError(null);

    try {
      if (multiple) {
        const uploadedUrls = await uploadManyToCloudinary(files);
        onChange(uploadedUrls);
      } else {
        const result = await uploadToCloudinary(files[0]);
        onChange(result.secure_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileOrUrl: string | File | null | undefined) => {
    if (!fileOrUrl) return null;

    let nameOrUrl: string;

    if (typeof fileOrUrl === "string") {
      nameOrUrl = fileOrUrl;
    } else if (fileOrUrl instanceof File) {
      nameOrUrl = fileOrUrl.name; // use actual filename for extension checks
    } else {
      return null;
    }

    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(nameOrUrl)) {
      return <ImageIcon className="w-4 h-4" />;
    }

    return <FileIcon className="w-4 h-4" />;
  };

  const getFileName = (fileOrUrl: string | File) => {
    if (typeof fileOrUrl === "string") {
      const parts = fileOrUrl.split('/');
      return parts[parts.length - 1] || 'file';
    } else if (fileOrUrl instanceof File) {
      return fileOrUrl.name;
    }
    return 'file';
  };

  const getPreviewUrl = (fileOrUrl: string | File | null | undefined): string | null => {
    if (!fileOrUrl) return null;
    if (typeof fileOrUrl === "string") return fileOrUrl;
    if (fileOrUrl instanceof File) return URL.createObjectURL(fileOrUrl);
    return null;
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="text-xs text-muted-foreground">
        Allowed formats: JPG, PNG, PDF. Up to ~10 MB per file.
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative">
          <Input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            ref={fileInputRef}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Choose {multiple ? 'Files' : 'File'}
              </>
            )}
          </Button>
        </div>
      </div>

      {urls.length > 0 && (
        <div className="space-y-1">
          {urls.map((url, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-3 h-3" />
              {getFileIcon(url)}
              <span className="truncate">{getFileName(url)}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}