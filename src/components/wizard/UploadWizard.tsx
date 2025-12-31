import { useDropzone } from 'react-dropzone';
import { GlassCard } from '../primitives/GlassCard';

export const UploadWizard = ({ onUpload }: { onUpload: (f: File[]) => void }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (files) => onUpload(files),
        accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls', '.xlsx'] }
    });

    return (
        <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-8 text-center">
                <h1 className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent">
                    IntegralQ Analytics
                </h1>
                <p className="mt-2 text-gray-400">Autonomous Data Science Pipeline</p>
            </div>

            <div {...getRootProps()} className="w-full max-w-xl cursor-pointer">
                <GlassCard className={isDragActive ? 'border-indigo-500 bg-indigo-900/20' : ''}>
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center py-12 text-center">
                        <div className="mb-4 text-4xl">📂</div>
                        <p className="text-lg font-medium text-white">Drag & Drop Dataset</p>
                        <p className="text-sm text-gray-500">Supports CSV, Excel, JSON</p>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};
