import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user' // Default to user
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageTransform, setImageTransform] = useState({ scale: 1, x: 0, y: 0 });

  const { login } = useAuth();
  const navigate = useNavigate();

  // Enhanced zoom animation effect - ensures image always covers container
  useEffect(() => {
    const animateImage = () => {
      // Scale between 1.1 and 1.6 to ensure image always covers container
      const scale = 1.1 + Math.random() * 0.5; // Random scale between 1.1 and 1.6
      // Reduced movement range to prevent gaps
      const x = (Math.random() - 0.5) * 10; // Random x position between -5% and 5%
      const y = (Math.random() - 0.5) * 10; // Random y position between -5% and 5%

      setImageTransform({ scale, x, y });
    };

    // Initial animation
    animateImage();

    // Set up interval for continuous animation
    const interval = setInterval(animateImage, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    const result = await login(formData.email, formData.password, formData.role);

    if (result.success) {
      navigate('/');
    }

    setIsLoading(false);
  };

  return (
    <>
      {/* Cloudinary Video Background - CSP Compliant */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="fixed top-0 left-0 w-full h-full object-cover z-0 opacity-80"
        style={{
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
        onLoadStart={() => console.log('✅ Cloudinary video loading started')}
        onLoadedMetadata={() => console.log('✅ Cloudinary video metadata loaded')}
        onCanPlay={() => console.log('✅ Cloudinary video can play')}
        onPlay={() => console.log('✅ Cloudinary video started playing')}
        onError={(e) => {
          console.error('❌ Cloudinary video error:', e.target.error);
          console.log('Video error code:', e.target.error?.code);
          console.log('Video error message:', e.target.error?.message);
          console.log('Video src:', e.target.currentSrc || e.target.src);
          // Fallback to iframe player if direct video fails
          e.target.style.display = 'none';
          const iframe = document.getElementById('cloudinary-iframe');
          if (iframe) {
            iframe.style.display = 'block';
            console.log('🔄 Switched to Cloudinary iframe player');
          }
        }}
        onStalled={() => console.log('⚠️ Cloudinary video stalled')}
        onWaiting={() => console.log('⏳ Cloudinary video waiting for data')}
      >
        <source src="https://res.cloudinary.com/dskglf2tn/video/upload/v1763585255/dash_qusuhb.mp4" type="video/mp4" />
        <source src="https://res.cloudinary.com/dskglf2tn/video/upload/dash_qusuhb.mp4" type="video/mp4" />
      </video>

      {/* Fallback Cloudinary Iframe Player */}
      <iframe
        id="cloudinary-iframe"
        src="https://player.cloudinary.com/embed/?cloud_name=dskglf2tn&public_id=dash_qusuhb&profile=cld-looping"
        className="fixed top-0 left-0 w-full h-full z-0 opacity-80"
        style={{
          minWidth: '100%',
          minHeight: '100%',
          border: 'none',
          display: 'none'
        }}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        frameBorder="0"
        onLoad={() => console.log('✅ Cloudinary iframe loaded')}
        onError={() => {
          console.log('❌ Cloudinary iframe failed, switching to animated background');
          document.getElementById('cloudinary-iframe').style.display = 'none';
          document.getElementById('animated-fallback').style.display = 'block';
        }}
      ></iframe>

      {/* Final Fallback - Animated Background */}
      <div id="animated-fallback" className="fixed inset-0 z-0" style={{ display: 'none' }}>
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-[4000ms] ease-in-out"
          style={{
            backgroundImage: 'url(/background.jpg)',
            transform: `scale(${imageTransform.scale}) translate(${imageTransform.x}%, ${imageTransform.y}%)`
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-gray-900/70 to-black/80"></div>
      </div>

      {/* Content Overlay */}
      <div className="fixed inset-0 bg-black/60 z-10"></div>

      {/* Powered By Card - Bottom Right */}
      <div className="fixed bottom-0 right-1 z-30">
        <div className="bg-transparent p-4 rounded-xl">
          <div className="text-white/80 text-base text-left">
            Powered By<br />
            <span className="font-black tracking-tight text-lg" style={{ fontFamily: '"Inter", "Montserrat", "Poppins", sans-serif' }}>AEROVANIA PVT. LTD.</span>
          </div>
        </div>
      </div>

      {/* CCL Logo - Top Left */}
      <div className="fixed top-8 left-8 z-40">
        <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg shadow-2xl border border-white/20 transform hover:scale-105 transition-transform duration-300">
          <img
            src="/ccl-logo.png"
            alt="CCL Logo"
            className="h-20 w-auto drop-shadow-lg"
          />
        </div>
      </div>

      {/* Centered Two Card Layout */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 flex gap-8">

        {/* Analytics Preview Card - Left */}
        <div className="w-[560px]">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20">
            <div className="relative overflow-hidden rounded-xl mb-6">
              <img
                src="/background.jpg"
                alt="Analytics Background"
                className="w-full h-64 object-cover transition-transform duration-[3000ms] ease-in-out"
                style={{
                  transform: `scale(${imageTransform.scale}) translate(${imageTransform.x}%, ${imageTransform.y}%)`
                }}
              />
              {/* Chart Icon */}
              <div className="absolute top-4 right-4 bg-white rounded-lg p-2 shadow-md">
                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                  <div className="text-white text-xs font-bold">📊</div>
                </div>
              </div>
              {/* Status Dots */}
              <div className="absolute bottom-4 left-4 flex space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-md"></div>
                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md"></div>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-3">
                AI Driven Aerial Monitoring & Analytics System For Mine Operations
              </h3>
              <p className="text-white/80 text-sm mb-6">
                Real-time monitoring and comprehensive data analysis for enhanced operational insights
              </p>

              {/* Feature Pills */}
              <div className="flex justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2 text-green-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Live Data</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Real-time Analytics</span>
                </div>
                <div className="flex items-center space-x-2 text-purple-600">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Secure Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form Card - Right */}
        <div className="w-[400px]">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Sign In</h1>
              <p className="text-white/80">Access your analytics dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-white mb-2">
                  Login As
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm bg-white/20 backdrop-blur-sm text-white"
                >
                  <option value="user" className="text-black bg-white">User</option>
                  <option value="admin" className="text-black bg-white">Admin</option>
                </select>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`w-full px-3 py-3 border ${errors.email ? 'border-red-400' : 'border-white/30'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm bg-white/20 backdrop-blur-sm text-white placeholder-white/60`}
                  placeholder="admin@ccl.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className={`w-full px-3 py-3 pr-10 border ${errors.password ? 'border-red-400' : 'border-white/30'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm bg-white/20 backdrop-blur-sm text-white placeholder-white/60`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-white/60 hover:text-white/80" />
                    ) : (
                      <Eye className="h-4 w-4 text-white/60 hover:text-white/80" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-white/60">
                © 2025 CCL Analytics Dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;