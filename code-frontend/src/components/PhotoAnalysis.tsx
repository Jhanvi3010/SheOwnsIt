import { useState, useRef } from 'react';
import { ShieldCheck, Upload, X, Eye, Trash2, AlertTriangle, CheckCircle, Camera, Video, ImagePlus } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

type AnalysisResult = {
  analyzed: boolean;
  image_stored: boolean;
  media_type: string;
  text_results: {
    estimated_body_shape: string;
    estimated_skin_tone: string;
    color_season: string;
    color_recommendations: string[];
    outfit_suggestions: { tops: string[]; bottoms: string[]; avoid: string[] };
    occasion_tip: string;
    style_notes: string;
    inventory_matches: { item_id: number; category: string; size: string; color: string; stock_level: number }[];
    confidence: string;
  };
  privacy_note: string;
};

type PhotoAnalysisProps = {
  clientId?: number;
  onClose: () => void;
};

const PhotoAnalysis = ({ clientId, onClose }: PhotoAnalysisProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'consent' | 'upload' | 'analyzing' | 'result'>('consent');
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Please upload an image or video file');
      return;
    }
    setIsVideo(file.type.startsWith('video/'));
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStep('upload');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!consent) { toast.error('Please tick the consent box first'); return; }
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (consent) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleAnalyze = async () => {
    if (!consent) { toast.error('Please confirm your consent first'); return; }
    setStep('analyzing');
    try {
      const res = await axios.post('/api/ai/analyze-photo', { consent: true, client_id: clientId || 0, media_type: isVideo ? 'video' : 'photo' });
      // Immediately revoke the preview URL — image is gone from browser memory
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setResult(res.data);
      setStep('result');
    } catch {
      toast.error('Analysis failed. Please try again.');
      setStep('upload');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '20px', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'white', borderRadius: '24px', width: '100%', maxWidth: '540px',
        boxShadow: '0 40px 80px rgba(0,0,0,0.25)', overflow: 'hidden',
        animation: 'fadeIn 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Camera size={24} color="white" />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>AI Styling Analysis</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem' }}>Privacy-safe photo analysis</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '28px' }}>
          {/* CONSENT STEP */}
          {step === 'consent' && (
            <div>
              <div style={{
                background: '#fefce8', border: '1px solid #fde68a', borderRadius: '14px',
                padding: '20px', marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <ShieldCheck size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>Privacy & Safety Notice</div>
                    <div style={{ fontSize: '0.88rem', color: '#78350f', lineHeight: 1.6 }}>
                      Before uploading, please read how we handle your photo:
                    </div>
                  </div>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#78350f', fontSize: '0.88rem', lineHeight: 2 }}>
                  <li><strong>Photos are analysed then immediately deleted</strong> — never stored long-term</li>
                  <li>Only <strong>text-based results</strong> are saved, not the image itself</li>
                  <li>Your volunteer can only see your profile <strong>if assigned to your session</strong></li>
                  <li>You can <strong>delete your profile and all data</strong> at any time</li>
                  <li>Analysis results include body shape, colour recommendations, and style notes</li>
                </ul>
              </div>

              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                cursor: 'pointer', marginBottom: '24px',
              }}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#4f46e5' }}
                />
                <span style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.6 }}>
                  I have read the privacy notice above and I consent to my photo being analysed and immediately deleted.
                  I understand only text results will be stored.
                </span>
              </label>

              {/* Drag & drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => { if (!consent) { toast.error('Please tick the consent box first'); return; } fileRef.current?.click(); }}
                style={{
                  border: `2px dashed ${isDragging ? '#4f46e5' : consent ? '#c4b5fd' : '#e2e8f0'}`,
                  borderRadius: '16px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: consent ? 'pointer' : 'not-allowed',
                  background: isDragging ? '#eef2ff' : consent ? '#faf5ff' : '#f8fafc',
                  transition: 'all 0.2s ease',
                  marginBottom: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Subtle blob behind */}
                <div style={{
                  position: 'absolute', width: 120, height: 120, borderRadius: '50%',
                  background: isDragging ? 'rgba(79,70,229,0.08)' : 'rgba(139,92,246,0.06)',
                  top: -30, right: -30, pointerEvents: 'none', transition: 'all 0.2s',
                }} />

                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 14px',
                  background: isDragging
                    ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
                    : consent ? 'linear-gradient(135deg,#ede9fe,#e0e7ff)' : '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  {isDragging
                    ? <Upload size={24} color="white" />
                    : <ImagePlus size={24} color={consent ? '#7c3aed' : '#94a3b8'} />
                  }
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isDragging ? '#4f46e5' : consent ? '#4c1d95' : '#94a3b8', marginBottom: '6px' }}>
                  {isDragging ? 'Drop it here!' : 'Drag & drop your photo or video'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '14px' }}>
                  or click to browse from your device
                </div>

                <div style={{ display: 'inline-flex', gap: '8px' }}>
                  {['JPG', 'PNG', 'WEBP', 'MP4', 'MOV'].map(ext => (
                    <span key={ext} style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                      background: consent ? '#ede9fe' : '#f1f5f9',
                      color: consent ? '#7c3aed' : '#94a3b8',
                    }}>{ext}</span>
                  ))}
                </div>

                {!consent && (
                  <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>
                    ↑ Tick the consent box above to enable upload
                  </div>
                )}
              </div>

              <button onClick={onClose} style={{
                width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '12px',
                background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
              }}>
                Cancel
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: 'none' }} />
            </div>
          )}

          {/* UPLOAD PREVIEW STEP */}
          {step === 'upload' && preview && (
            <div>
              <div style={{ marginBottom: '20px', borderRadius: '14px', overflow: 'hidden', border: '2px solid #e0e7ff' }}>
                {isVideo ? (
                  <video src={preview} controls style={{ width: '100%', maxHeight: '260px', display: 'block', background: '#000' }} />
                ) : (
                  <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', display: 'block', background: '#f8fafc' }} />
                )}
              </div>
              {isVideo && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.84rem', color: '#1e40af', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Video size={15} /> Our AI will analyse key frames from your video for fashion suggestions — the video is deleted immediately after.
                </div>
              )}
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
                padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center',
                fontSize: '0.85rem', color: '#166534',
              }}>
                <ShieldCheck size={16} color="#16a34a" />
                This photo will be <strong>analysed then immediately deleted</strong> from our servers. Nothing is stored.
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setStep('consent'); }} style={{
                  flex: 1, padding: '13px', border: '2px solid #e2e8f0', borderRadius: '12px',
                  background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  <Trash2 size={15} /> Remove
                </button>
                <button onClick={handleAnalyze} style={{
                  flex: 2, padding: '13px', border: 'none', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: 'white', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  <Eye size={16} /> Analyse & Delete Photo
                </button>
              </div>
            </div>
          )}

          {/* ANALYSING STEP */}
          {step === 'analyzing' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '64px', height: '64px', border: '5px solid #e0e7ff',
                borderTopColor: '#4f46e5', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 20px',
              }} />
              <h3 style={{ color: '#4f46e5', marginBottom: '8px' }}>Analysing your photo…</h3>
              <p style={{ color: '#64748b', margin: '0 0 12px' }}>This takes just a moment. Your photo will be deleted as soon as the analysis is complete.</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem', color: '#f59e0b' }}>
                <AlertTriangle size={14} /> Photo is being permanently deleted after analysis
              </div>
            </div>
          )}

          {/* RESULT STEP */}
          {step === 'result' && result && (
            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px',
                padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center',
              }}>
                <CheckCircle size={18} color="#16a34a" />
                <div>
                  <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>
                    {result.media_type === 'video' ? 'Video' : 'Photo'} Analysis Complete
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#166534' }}>{result.privacy_note}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <ResultRow label="Body Shape" value={result.text_results.estimated_body_shape} />
                  <ResultRow label="Skin Tone" value={result.text_results.estimated_skin_tone} />
                  <ResultRow label="Confidence" value={result.text_results.confidence} />
                </div>

                {/* Occasion tip */}
                <div style={{ padding: '16px', background: '#fefce8', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#92400e', marginBottom: '6px' }}>Occasion Tip</div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350f', lineHeight: 1.6 }}>
                    {result.text_results.occasion_tip}
                  </p>
                </div>

                {/* Style summary */}
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: '6px' }}>Personalised Style Notes</div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                    {result.text_results.style_notes}
                  </p>
                </div>

                {/* Outfit suggestions */}
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: '12px' }}>Outfit Suggestions</div>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4f46e5', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tops</div>
                    {result.text_results.outfit_suggestions.tops.map((t, i) => (
                      <div key={i} style={{ fontSize: '0.84rem', color: '#374151', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>• {t}</div>
                    ))}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bottoms</div>
                    {result.text_results.outfit_suggestions.bottoms.map((t, i) => (
                      <div key={i} style={{ fontSize: '0.84rem', color: '#374151', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>• {t}</div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avoid</div>
                    {result.text_results.outfit_suggestions.avoid.map((t, i) => (
                      <div key={i} style={{ fontSize: '0.84rem', color: '#374151', padding: '4px 0' }}>✕ {t}</div>
                    ))}
                  </div>
                </div>

                {/* Colour palette */}
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: '10px' }}>
                    Your Colour Palette ({result.text_results.color_season} Season)
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {result.text_results.color_recommendations.map(c => (
                      <span key={c} style={{
                        padding: '5px 12px', borderRadius: '20px',
                        background: '#e0e7ff', color: '#4338ca', fontSize: '0.82rem', fontWeight: 600,
                      }}>{c}</span>
                    ))}
                  </div>
                </div>

                {/* Inventory matches */}
                {result.text_results.inventory_matches.length > 0 && (
                  <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#166534', marginBottom: '10px' }}>
                      Available in Your Size at DFS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {result.text_results.inventory_matches.map(item => (
                        <div key={item.item_id} style={{ fontSize: '0.84rem', color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{item.category} — {item.color}</span>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{item.stock_level} in stock</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => { onClose(); navigate('/client'); }} style={{
                marginTop: '20px', width: '100%', padding: '13px', border: 'none', borderRadius: '12px',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem',
              }}>
                Done — Book a Styling Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ResultRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px' }}>
    <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 500 }}>{label}</span>
    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{value}</span>
  </div>
);

export default PhotoAnalysis;
