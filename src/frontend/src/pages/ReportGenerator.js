import React, { useState } from 'react';
import { Upload, FileJson, Link as LinkIcon, Trash2, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import '../styles/ReportGenerator.css';

const ReportGenerator = () => {
  const [jsonFiles, setJsonFiles] = useState([]);
  const [videoLink, setVideoLink] = useState('');
  const [siteName, setSiteName] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sites, setSites] = useState([]);

  // Fetch sites on component mount
  React.useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await api.get('/sites');
      if (response.data.success) {
        setSites(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      toast.error('Failed to load sites');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (file.type === 'application/json') {
        return true;
      }
      toast.error(`${file.name} is not a JSON file`);
      return false;
    });

    setJsonFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setJsonFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadJsonFiles = async () => {
    if (jsonFiles.length === 0) {
      toast.error('Please select at least one JSON file');
      return;
    }

    setUploading(true);
    try {
      for (const file of jsonFiles) {
        const reader = new FileReader();
        
        await new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const jsonData = JSON.parse(e.target.result);
              await api.post('/report-generator/upload-json', jsonData);
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      toast.success(`${jsonFiles.length} JSON file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload JSON files');
    } finally {
      setUploading(false);
    }
  };

  const generateReport = async () => {
    if (jsonFiles.length === 0) {
      toast.error('Please upload JSON files first');
      return;
    }

    if (!videoLink.trim()) {
      toast.error('Please provide a video link');
      return;
    }

    if (!siteName) {
      toast.error('Please select a site');
      return;
    }

    if (!reportDate) {
      toast.error('Please select a report date');
      return;
    }

    setGenerating(true);
    try {
      // First upload all JSON files
      await uploadJsonFiles();

      // Then generate the report and upload to Inferred Reports
      const response = await api.post('/report-generator/generate', {
        video_link: videoLink,
        site_name: siteName,
        report_date: reportDate
      });

      if (response.data.success) {
        toast.success('Report generated and uploaded to Inferred Reports successfully!');
        
        // Clear form
        setJsonFiles([]);
        setVideoLink('');
        setSiteName('');
        setReportDate('');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="report-generator-container">
      <div className="report-generator-header">
        <h1>AI Report Generator</h1>
        <p>Upload violation JSONs and generate comprehensive drone surveillance reports</p>
      </div>

      <div className="generator-content">
        {/* JSON Upload Section */}
        <div className="upload-section">
          <div className="section-header">
            <FileJson size={24} />
            <h2>Upload Violation Data (JSON)</h2>
          </div>

          <div className="file-upload-area">
            <input
              type="file"
              accept=".json"
              multiple
              onChange={handleFileSelect}
              id="json-file-input"
              className="file-input-hidden"
            />
            <label htmlFor="json-file-input" className="upload-box">
              <Upload size={48} />
              <h3>Drop JSON files here or click to browse</h3>
              <p>You can select multiple JSON files at once</p>
            </label>
          </div>

          {/* File List */}
          {jsonFiles.length > 0 && (
            <div className="file-list">
              <h3>Selected Files ({jsonFiles.length})</h3>
              {jsonFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-info">
                    <FileJson size={20} />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="remove-button"
                    title="Remove file"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video Link Section */}
        <div className="video-link-section">
          <div className="section-header">
            <LinkIcon size={24} />
            <h2>Report Details</h2>
          </div>

          <div className="input-group">
            <label htmlFor="site-name">Site Name *</label>
            <select
              id="site-name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="site-select"
            >
              <option value="">Select a site (required)...</option>
              {sites.map(site => (
                <option key={site.id || site} value={site.name || site}>
                  {site.name || site}
                </option>
              ))}
            </select>
            <span className="input-hint">
              Select the site where the violations were detected
            </span>
          </div>

          <div className="input-group">
            <label htmlFor="report-date">Report Date *</label>
            <input
              type="date"
              id="report-date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="date-input"
            />
            <span className="input-hint">
              Date of the surveillance report
            </span>
          </div>

          <div className="input-group">
            <label htmlFor="video-link">Video Evidence Link *</label>
            <input
              type="url"
              id="video-link"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="video-link-input"
            />
            <span className="input-hint">
              Provide the Google Drive or video link for the surveillance footage
            </span>
          </div>
        </div>

        {/* Generate Button */}
        <div className="action-section">
          <button
            onClick={generateReport}
            disabled={generating || uploading || jsonFiles.length === 0 || !videoLink.trim() || !siteName || !reportDate}
            className="generate-button"
          >
            {generating ? (
              <>
                <div className="spinner"></div>
                Generating & Uploading...
              </>
            ) : (
              <>
                <FileText size={20} />
                Generate & Upload to Inferred Reports
              </>
            )}
          </button>
        </div>

        {/* Info Box */}
        <div className="info-box">
          <h3>📋 How it works:</h3>
          <ol>
            <li>Upload one or more JSON files containing violation data</li>
            <li>Select the site name from the dropdown</li>
            <li>Choose the report date</li>
            <li>Provide a video link (Google Drive or direct URL)</li>
            <li>Click "Generate & Upload to Inferred Reports"</li>
            <li>The report will be generated with analytics, charts, and evidence images</li>
            <li>After generation, it will be automatically uploaded to Inferred Reports</li>
            <li>JSON files are automatically cleaned up after generation</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
