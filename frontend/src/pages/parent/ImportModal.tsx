import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Brain, FileSpreadsheet } from 'lucide-react';
import { api } from '../../lib/api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  topicName: string;
  onSuccess: (count: number) => void;
}

export default function ImportModal({ isOpen, onClose, topicId, topicName, onSuccess }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'csv' | 'ai'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTabChange = (tab: 'csv' | 'ai') => {
    setActiveTab(tab);
    setFile(null);
    setError(null);
    setSuccessCount(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setSuccessCount(null);
    }
  };

  const processCSV = () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          if (rows.length === 0) throw new Error('File CSV trống!');
          
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

          const res = await api.post('/import', { topicId, questions });
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

  const processAI = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('topicId', topicId);

    try {
      const res = await api.post('/import-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessCount(res.data.count);
      onSuccess(res.data.count);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Có lỗi xảy ra khi AI xử lý file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!file) {
      setError('Vui lòng chọn file');
      return;
    }
    if (activeTab === 'csv') {
      processCSV();
    } else {
      processAI();
    }
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
            <h3 className="text-xl font-bold text-slate-800">Nhập bài tập</h3>
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
              <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                Đóng
              </button>
            </div>
          ) : (
            <>
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button 
                  onClick={() => handleTabChange('csv')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'csv' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <FileSpreadsheet size={18} /> File CSV
                </button>
                <button 
                  onClick={() => handleTabChange('ai')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'ai' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Brain size={18} /> Nhận diện AI
                </button>
              </div>

              {activeTab === 'csv' ? (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-sm text-slate-600 mb-3">Tải lên file CSV đúng định dạng để thêm nhiều câu hỏi cùng lúc.</p>
                  <button onClick={handleDownloadTemplate} className="text-primary hover:text-primary-dark text-sm font-semibold flex items-center gap-2">
                    <FileText size={16} /> Tải file CSV mẫu (Template)
                  </button>
                </div>
              ) : (
                <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                  <p className="text-sm text-slate-600">Hệ thống AI sẽ tự động đọc bài tập từ file PDF hoặc Hình ảnh (JPG, PNG) và chuyển thành câu hỏi trắc nghiệm.</p>
                </div>
              )}

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-primary bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <input 
                  type="file" 
                  accept={activeTab === 'csv' ? '.csv' : 'image/*,.pdf'}
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
                    <p className="font-semibold text-slate-700 mb-1">Bấm để chọn file {activeTab === 'csv' ? 'CSV' : 'PDF / Ảnh'}</p>
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
                <button type="button" onClick={onClose} className="flex-1 py-3 px-4 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors">
                  Hủy
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className={`flex-1 py-3 px-4 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2 ${activeTab === 'ai' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-primary hover:bg-primary-dark'}`}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {activeTab === 'ai' ? 'AI đang đọc...' : 'Đang xử lý...'}
                    </div>
                  ) : (
                    <>
                      <Upload size={18} /> Bắt đầu tải lên
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
