import React, { useState, useEffect } from 'react';
import { AlertTriangle, Users, MapPin, Activity } from 'lucide-react';
import KPICard from '../components/KPICard';
import { PieChart, LineChart, BarChart } from '../components/Charts';
import { analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [kpis, setKpis] = useState({});
  const [pieData, setPieData] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [droneData, setDroneData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [kpiResponse, pieResponse, timeSeriesResponse, droneResponse] = await Promise.all([
        analyticsAPI.getKPIs(),
        analyticsAPI.getPieChart(),
        analyticsAPI.getTimeSeries(),
        analyticsAPI.getDroneChart(),
      ]);

      setKpis(kpiResponse.data.kpis);
      setPieData(pieResponse.data.chart_data);
      setTimeSeriesData(timeSeriesResponse.data.chart_data);
      setDroneData(droneResponse.data.chart_data.map(item => ({
        label: item.drone_id,
        value: item.total_violations
      })));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container space-y-6">
      <div className="dashboard-header flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Analytics and monitoring overview</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="dashboard-refresh-btn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="dashboard-kpi-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Violations"
          value={kpis.total_violations || 0}
          icon={AlertTriangle}
          color="red"
        />
        <KPICard
          title="Drone IDs"
          value={kpis.unique_drones || 0}
          icon={Activity}
          color="blue"
        />
        <KPICard
          title="Locations"
          value={kpis.unique_locations || 0}
          icon={MapPin}
          color="green"
        />
        <KPICard
          title="Violation Types"
          value={kpis.violation_types || 0}
          icon={Users}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dashboard-chart-left">
          <PieChart
            data={pieData}
            title="Violation Type Distribution"
          />
        </div>
        <div className="dashboard-chart-right">
          <BarChart
            data={droneData}
            title="Violations by Drone"
          />
        </div>
      </div>

      <div className="grid grid-cols-1">
        <div className="dashboard-chart-full">
          <LineChart
            data={timeSeriesData}
            title="Violations Over Time"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 