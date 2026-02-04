const express = require('express');
const ViolationModel = require('../models/Violation');
const { authenticateToken, enforceOrganizationAccess } = require('../middleware/auth');

const router = express.Router();

// Temporary middleware to make authentication optional during migration
const optionalAuth = (req, res, next) => {
  // Try to authenticate, but don't fail if no token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    // If token exists, try to authenticate
    authenticateToken(req, res, (err) => {
      if (err) {
        // If auth fails, continue without user context
        req.user = null;
        req.organizationFilter = null;
      } else {
        // If auth succeeds, set organization filter
        if (req.user && req.user.isSuperAdmin) {
          req.organizationFilter = null; // Super admin sees all
        } else if (req.user && req.user.organizationId) {
          req.organizationFilter = req.user.organizationId;
        } else {
          req.organizationFilter = null; // No filter if no org context
        }
      }
      next();
    });
  } else {
    // No token, continue without authentication
    req.user = null;
    req.organizationFilter = null;
    next();
  }
};

router.get('/', optionalAuth, async (req, res) => {
  try {
    console.log('🔍 Fetching analytics for organization:', req.organizationFilter || 'ALL (No Auth/Super Admin)');
    const analytics = await ViolationModel.getAnalytics(req.organizationFilter);
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Failed to get analytics data',
      message: 'Internal server error'
    });
  }
});

router.get('/kpis', optionalAuth, async (req, res) => {
  try {
    console.log('🔍 Fetching KPIs for organization:', req.organizationFilter || 'ALL (No Auth/Super Admin)');
    const analytics = await ViolationModel.getAnalytics(req.organizationFilter);
    res.json({ success: true, kpis: analytics.kpis });
  } catch (error) {
    console.error('Get KPIs error:', error);
    res.status(500).json({
      error: 'Failed to get KPI data',
      message: 'Internal server error'
    });
  }
});

router.get('/charts/pie', optionalAuth, async (req, res) => {
  try {
    console.log('🔍 Fetching pie chart for organization:', req.organizationFilter || 'ALL (No Auth/Super Admin)');
    const analytics = await ViolationModel.getAnalytics(req.organizationFilter);
    res.json({
      success: true,
      chart_data: analytics.charts.type_distribution,
      chart_type: 'pie',
      title: 'Violation Type Distribution'
    });
  } catch (error) {
    console.error('Get pie chart data error:', error);
    res.status(500).json({
      error: 'Failed to get pie chart data',
      message: 'Internal server error'
    });
  }
});

router.get('/charts/timeseries', optionalAuth, async (req, res) => {
  try {
    console.log('🔍 Fetching time series for organization:', req.organizationFilter || 'ALL (No Auth/Super Admin)');
    const analytics = await ViolationModel.getAnalytics(req.organizationFilter);
    let timeSeriesData = analytics.charts.time_series;
    
    if (req.query.date_from || req.query.date_to) {
      timeSeriesData = timeSeriesData.filter(item => {
        const itemDate = item.date;
        return (!req.query.date_from || itemDate >= req.query.date_from) &&
               (!req.query.date_to || itemDate <= req.query.date_to);
      });
    }
    
    res.json({
      success: true,
      chart_data: timeSeriesData,
      chart_type: 'line',
      title: 'Violations Over Time'
    });
  } catch (error) {
    console.error('Get time series data error:', error);
    res.status(500).json({
      error: 'Failed to get time series data',
      message: 'Internal server error'
    });
  }
});

router.get('/charts/drones', optionalAuth, async (req, res) => {
  try {
    console.log('🔍 Fetching drone chart for organization:', req.organizationFilter || 'ALL (No Auth/Super Admin)');
    const analytics = await ViolationModel.getAnalytics(req.organizationFilter);
    res.json({
      success: true,
      chart_data: analytics.charts.drone_performance,
      chart_type: 'bar',
      title: 'Violations by Drone'
    });
  } catch (error) {
    console.error('Get drone performance data error:', error);
    res.status(500).json({
      error: 'Failed to get drone performance data',
      message: 'Internal server error'
    });
  }
});

router.get('/charts/locations', optionalAuth, async (req, res) => {
  try {
    console.log('🔍 Fetching location chart for organization:', req.organizationFilter || 'ALL (No Auth/Super Admin)');
    const analytics = await ViolationModel.getAnalytics(req.organizationFilter);
    res.json({
      success: true,
      chart_data: analytics.charts.location_breakdown,
      chart_type: 'horizontal_bar',
      title: 'Violations by Location'
    });
  } catch (error) {
    console.error('Get location breakdown data error:', error);
    res.status(500).json({
      error: 'Failed to get location breakdown data',
      message: 'Internal server error'
    });
  }
});

router.get('/summary', optionalAuth, async (req, res) => {
  try {
    console.log('🔍 Fetching summary for organization:', req.organizationFilter || 'ALL (No Auth/Super Admin)');
    const analytics = await ViolationModel.getAnalytics(req.organizationFilter);
    const allViolations = await ViolationModel.getMapData(req.organizationFilter);
    const recentViolations = allViolations
      .sort((a, b) => (b.date + ' ' + b.timestamp).localeCompare(a.date + ' ' + a.timestamp))
      .slice(0, 5);
    
    const summary = {
      kpis: analytics.kpis,
      recent_violations: recentViolations,
      top_violation_types: analytics.charts.type_distribution
        .sort((a, b) => b.value - a.value)
        .slice(0, 3),
      active_drones: analytics.charts.drone_performance
        .sort((a, b) => b.total_violations - a.total_violations)
        .slice(0, 5)
    };
    
    res.json({ success: true, summary: summary });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      error: 'Failed to get summary data',
      message: 'Internal server error'
    });
  }
});

module.exports = router; 