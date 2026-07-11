import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  topicName: string;
  onSuccess: (count: number) => void;
}

export default function ImportModal({ isOpen, onClose, topicId, topicName, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setSuccessCount(null);
    }
  };

  const handleImport = () => {
    if (!file) {
      setError('Vui lòng chọn file CSV');
      return;
    }

    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          
          if (rows.length === 0) {
            throw new Error('File CSV trống!');
          }

          // Kiểm tra cấu trúc cột cơ bản
          const firstRow = rows[0];
          if (!firstRow.CauHoi || !firstRow.DapAn) {
            throw new Error('File CSV không đúng định dạng. Cần có cột "CauHoi" và "DapAn".');
          }

          const questions = rows.map((row) => {
            const options = [];
            if (row.A) options.push(row.A.toString());
            if (row.B) options.push(row.B.toString());
            if (row.C) options.push(row.C.toString());
            if (row.D) options.push(row.D.toString());

            let correct = row.DapAn.toString();
            // Nếu người dùng nhập A, B, C, D thay vì giá trị thực tế
            if (correct.toUpperCase() === 'A') correct = row.A?.toString() || '';
            else if (correct.toUpperCase() === 'B') correct = row.B?.toString() || '';
            else if (correct.toUpperCase() === 'C') correct = row.C?.toString() || '';
            else if (correct.toUpperCase() === 'D') correct = row.D?.toString() || '';

            return {
              type: 'MULTIPLE_CHOICE',
              level: parseInt(row.DoKho || '1'),
              points: parseInt(row.Diem || '10'),
              content: {
                text: row.CauHoi.toString(),
                options: options,
                correct: correct
              }
            };
          });

          // Gọi API import
          const { api } = await import('../../lib/api');
          const res = await api.post('/import', {
            topicId,
            questions
          });

          setSuccessCount(res.data.count);
          onSuccess(res.data.count);
        } catch (err: any) {
          setError(err.message || 'Có lỗi xảy ra khi xử lý file');
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        setError('Lỗi đọc file: ' + error.message);
        setLoading(false);
      }
    });
  };

  const handleDownloadTemplate = () => {
    const csvContent = "CauHoi,A,B,C,D,DapAn,DoKho,Diem\n8 + 7 = ?,13,14,15,16,15,1,10\n10 - 2 = ?,6,7,8,9,8,1,10";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Template_CauHoi.csv";
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Nhập bài tập từ file CSV</h3>
            <p className="text-sm text-slate-500 mt-1">Chủ đề: <span className="font-semibold text-primary">{topicName}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-2">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {successCount !== null ? (
            <div className="text-center py-8">
              <CheckCircle className="text-green-500 w-16 h-16 mx-auto mb-4" />
              <h4 className="text-2xl font-bold text-slate-800 mb-2">Thành công!</h4>
              <p className="text-slate-600">Đã thêm {successCount} câu hỏi vào hệ thống.</p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          ) : (
            <>
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <p className="text-sm text-slate-600 mb-3">
                  Để đảm bảo câu hỏi được nhận diện chính xác, vui lòng sử dụng file CSV đúng định dạng.
                </p>
                <button 
                  onClick={handleDownloadTemplate}
                  className="text-primary hover:text-primary-dark text-sm font-semibold flex items-center gap-2"
                >
                  <FileText size={16} /> Tải file CSV mẫu (Template)
                </button>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-primary bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <input 
                  type="file" 
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-100 text-primary rounded-full flex items-center justify-center mb-3">
                      <FileText size={32} />
                    </div>
                    <p className="font-semibold text-slate-800">{file.name}</p>
                    <p className="text-sm text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
                      <Upload size={32} />
                    </div>
                    <p className="font-semibold text-slate-700 mb-1">Bấm để chọn file CSV</p>
                    <p className="text-sm text-slate-400">hoặc kéo thả file vào đây</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
                  <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="flex-1 py-3 px-4 bg-primary text-white rounded-xl hover:bg-primary-dark font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload size={18} />
                      Bắt đầu tải lên
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
