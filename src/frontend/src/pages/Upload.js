import React, { useState } from 'react';
import { Upload as UploadIcon, FileText } from 'lucide-react';
import { uploadAPI } from '../services/api';
import toast from 'react-hot-toast';

const Upload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [uploadMode, setUploadMode] = useState('file');

  const sampleData = {
    "drone_id": "DRONE_ZONE_1",
    "date": "2025-07-10",
    "location": "Zone A",
    "violations": [
      {
        "id": "v1",
        "type": "Fire Detected",
        "timestamp": "10:32:14",
        "latitude": 23.74891,
        "longitude": 85.98523,
        "image_url": "https://picsum.photos/150"
      }
    ]
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('report', file);

    try {
      const response = await uploadAPI.uploadFile(formData);
      toast.success('File uploaded successfully!');
      console.log('Upload response:', response.data);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Upload failed';
      toast.error(errorMessage);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleJSONUpload = async () => {
    if (!jsonData.trim()) {
      toast.error('Please enter JSON data');
      return;
    }

    try {
      const data = JSON.parse(jsonData);
      setUploading(true);
      
      const response = await uploadAPI.uploadJSON(data);
      toast.success('JSON data uploaded successfully!');
      setJsonData('');
      console.log('Upload response:', response.data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format');
      } else {
        const errorMessage = error.response?.data?.message || 'Upload failed';
        toast.error(errorMessage);
      }
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const loadSampleData = () => {
    setJsonData(JSON.stringify(sampleData, null, 2));
  };

  // Sample data clearing functionality removed - using real data only

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Drone Reports</h1>
        <p className="text-gray-600 mt-2">Upload AI-generated drone violation reports in JSON format</p>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setUploadMode('file')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                uploadMode === 'file'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              File Upload
            </button>
            <button
              onClick={() => setUploadMode('json')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                uploadMode === 'json'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              JSON Input
            </button>
          </nav>
        </div>

        <div className="p-6">
          {uploadMode === 'file' ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <p className="text-lg font-medium text-gray-900">
                  Drop your JSON file here, or{' '}
                  <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                    browse
                    <input
                      type="file"
                      className="hidden"
                      accept=".json"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                  </label>
                </p>
                <p className="text-sm text-gray-500 mt-2">Supports JSON files up to 10MB</p>
              </div>
              
              {uploading && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-sm text-gray-600">Uploading...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  JSON Data
                </label>
                <button
                  onClick={loadSampleData}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Load Sample Data
                </button>
              </div>
              <textarea
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                placeholder="Paste your JSON data here..."
                className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleJSONUpload}
                  disabled={uploading || !jsonData.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-4 w-4" />
                      <span>Upload JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sample data clearing section removed - using real data only */}

      <div className="bg-blue-50 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <FileText className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-blue-900">Expected JSON Format</h3>
            <div className="mt-3 bg-white rounded-lg p-4">
              <pre className="text-sm text-gray-600 overflow-x-auto">
{`{
  "drone_id": "DRONE_ZONE_1",
  "date": "2025-07-10",
  "location": "Zone A",
  "violations": [
    {
      "id": "v1",
      "type": "PPE kit detection",
      "timestamp": "10:32:14",
      "latitude": 23.74891,
      "longitude": 85.98523,
      "image_url": "https://picsum.photos/150"
    }
  ]
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload; 