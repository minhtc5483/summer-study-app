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
  const [skippedRows, setSkippedRows] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTabChange = (tab: 'csv' | 'ai') => {
    setActiveTab(tab);
    setFile(null);
    setError(null);
    setSuccessCount(null);
    setSkippedRows([]);
    setDuplicateCount(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setSuccessCount(null);
    }
  };

  // Excel in Vietnamese locale saves with ";", people rename columns with dấu, and one blank
  // cell used to crash the whole import with "Cannot read properties of undefined". Normalise
  // the header (strip accents/spaces/case) and report bad rows by line number instead.
  const stripAccents = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd');

  const normaliseKey = (key: string) => stripAccents(key).replace(/[^a-z0-9]/gi, '').toLowerCase();

  const COLUMN_ALIASES: Record<string, string> = {
    cauhoi: 'CauHoi',
    noidung: 'CauHoi',
    a: 'A',
    b: 'B',
    c: 'C',
    d: 'D',
    dapan: 'DapAn',
    ketqua: 'DapAn',
    dokho: 'DoKho',
    mucdo: 'DoKho',
    diem: 'Diem',
  };

  const normaliseRow = (row: Record<string, any>) => {
    const out: Record<string, string> = {};
    Object.keys(row).forEach((key) => {
      const canonical = COLUMN_ALIASES[normaliseKey(key)];
      if (canonical && row[key] !== null && row[key] !== undefined) {
        out[canonical] = String(row[key]).trim();
      }
    });
    return out;
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
          const rows = (results.data as Record<string, any>[]).map(normaliseRow);
          if (rows.length === 0) throw new Error('File CSV trống!');

          if (!rows.some((row) => row.CauHoi)) {
            throw new Error(
              'File CSV không đúng định dạng. Cần có cột "CauHoi" và "DapAn" (tải file mẫu bên dưới để đối chiếu).'
            );
          }

          const questions: any[] = [];
          const badRows: string[] = [];

          rows.forEach((row, index) => {
            // +2: dòng 1 là tiêu đề, và người dùng đếm từ 1 chứ không từ 0.
            const lineNumber = index + 2;
            if (!row.CauHoi) {
              badRows.push(`dòng ${lineNumber}: thiếu câu hỏi`);
              return;
            }
            if (!row.DapAn) {
              badRows.push(`dòng ${lineNumber}: thiếu đáp án`);
              return;
            }

            const options = ['A', 'B', 'C', 'D'].map((key) => row[key]).filter((value) => !!value);

            let correct = row.DapAn;
            const asLetter = stripAccents(correct).toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(asLetter) && row[asLetter]) {
              correct = row[asLetter];
            }

            if (options.length > 0 && !options.includes(correct)) {
              badRows.push(`dòng ${lineNumber}: đáp án "${row.DapAn}" không khớp lựa chọn nào`);
              return;
            }

            const level = parseInt(row.DoKho, 10);
            const points = parseInt(row.Diem, 10);

            questions.push({
              type: options.length > 0 ? 'MULTIPLE_CHOICE' : 'FILL_BLANK',
              level: level >= 1 && level <= 3 ? level : 1,
              points: points > 0 ? points : 10,
              content: options.length > 0 ? { text: row.CauHoi, options, correct } : { text: row.CauHoi, correct },
            });
          });

          if (questions.length === 0) {
            throw new Error(`Không có dòng nào dùng được. ${badRows.slice(0, 3).join('; ')}`);
          }

          const res = await api.post('/import', { topicId, questions });
          setSuccessCount(res.data.count);
          setSkippedRows(badRows);
          setDuplicateCount(res.data.duplicates || 0);
          onSuccess(res.data.count);
        } catch (err: any) {
          setError(err.response?.data?.error || err.message || 'Có lỗi xảy ra khi xử lý file');
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
    const csvContent = "\uFEFFCauHoi,A,B,C,D,DapAn,DoKho,Diem\n8 + 7 = ?,13,14,15,16,15,1,10\n10 - 2 = ?,6,7,8,9,8,1,10";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Template_CauHoi.csv";
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-cream-border flex justify-between items-center bg-terracotta-100">
          <div>
            <h3 className="text-xl font-bold text-ink">Nhập bài tập</h3>
            <p className="text-sm text-ink-muted mt-1">Chủ đề: <span className="font-semibold text-primary">{topicName}</span></p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink bg-white rounded-full p-2">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {successCount !== null ? (
            <div className="text-center py-8">
              <CheckCircle className="text-green-500 w-16 h-16 mx-auto mb-4" />
              <h4 className="text-2xl font-bold text-ink mb-2">Thành công!</h4>
              <p className="text-ink-muted">Đã thêm {successCount} câu hỏi vào hệ thống.</p>
              {duplicateCount > 0 && (
                <p className="text-sm text-ink-muted mt-2">Bỏ qua {duplicateCount} câu đã có sẵn trong chủ đề này.</p>
              )}
              {skippedRows.length > 0 && (
                <div className="mt-4 text-left text-sm bg-gold-100/50 border border-gold-100 rounded-2xl p-4 max-h-40 overflow-y-auto">
                  <p className="font-semibold text-ink mb-1">Bỏ qua {skippedRows.length} dòng lỗi:</p>
                  <ul className="list-disc pl-5 text-ink-muted space-y-0.5">
                    {skippedRows.slice(0, 10).map((row) => <li key={row}>{row}</li>)}
                  </ul>
                  {skippedRows.length > 10 && <p className="text-ink-muted mt-1">...và {skippedRows.length - 10} dòng khác.</p>}
                </div>
              )}
              <button onClick={onClose} className="mt-6 px-6 py-2 bg-cream text-ink font-semibold rounded-xl hover:bg-cream-border transition-colors">
                Đóng
              </button>
            </div>
          ) : (
            <>
              <div className="flex bg-cream p-1 rounded-2xl">
                <button 
                  onClick={() => handleTabChange('csv')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'csv' ? 'bg-white shadow-sm text-primary' : 'text-ink-muted hover:text-ink'}`}
                >
                  <FileSpreadsheet size={18} /> File CSV
                </button>
                <button 
                  onClick={() => handleTabChange('ai')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'ai' ? 'bg-white shadow-sm text-gold-600' : 'text-ink-muted hover:text-ink'}`}
                >
                  <Brain size={18} /> Nhận diện AI
                </button>
              </div>

              {activeTab === 'csv' ? (
                <div className="bg-terracotta-100/50 p-4 rounded-2xl border border-terracotta-100">
                  <p className="text-sm text-ink-muted mb-3">Tải lên file CSV đúng định dạng để thêm nhiều câu hỏi cùng lúc.</p>
                  <button onClick={handleDownloadTemplate} className="text-primary hover:text-primary-dark text-sm font-semibold flex items-center gap-2">
                    <FileText size={16} /> Tải file CSV mẫu (Template)
                  </button>
                </div>
              ) : (
                <div className="bg-gold-100/50 p-4 rounded-2xl border border-gold-100">
                  <p className="text-sm text-ink-muted">Hệ thống AI sẽ tự động đọc bài tập từ file PDF hoặc Hình ảnh (JPG, PNG) và chuyển thành câu hỏi trắc nghiệm.</p>
                </div>
              )}

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-primary bg-terracotta-100' : 'border-cream-border hover:bg-cream'}`}
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
                    <div className="w-16 h-16 bg-terracotta-100 text-primary-dark rounded-full flex items-center justify-center mb-3">
                      <FileText size={32} />
                    </div>
                    <p className="font-semibold text-ink">{file.name}</p>
                    <p className="text-sm text-ink-muted mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-cream text-ink-muted rounded-full flex items-center justify-center mb-3">
                      <Upload size={32} />
                    </div>
                    <p className="font-semibold text-ink mb-1">Bấm để chọn file {activeTab === 'csv' ? 'CSV' : 'PDF / Ảnh'}</p>
                    <p className="text-sm text-ink-muted">hoặc kéo thả file vào đây</p>
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
                <button type="button" onClick={onClose} className="flex-1 py-3 px-4 border border-cream-border text-ink rounded-xl hover:bg-cream font-medium transition-colors">
                  Hủy
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className={`flex-1 py-3 px-4 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2 ${activeTab === 'ai' ? 'bg-gold-600 hover:opacity-90' : 'bg-primary hover:bg-primary-dark'}`}
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
