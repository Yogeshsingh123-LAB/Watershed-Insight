import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import WatershedMap from './components/WatershedMap';
import AnalyticsPanel from './components/AnalyticsPanel';
import InterventionModal from './components/InterventionModal';

export default function App() {
  const [watershedData, setWatershedData] = useState(null);
  const [interventionsData, setInterventionsData] = useState(null);
  const [photosData, setPhotosData] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('t1');

  // Layer Toggles
  const [layers, setLayers] = useState({
    boundary: true,
    interventions: true,
    photos: true,
    ndvi: false,
    ndwi: false,
    delta: true
  });

  // Selected Intervention state for Buffer Analysis & Modal
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [interventionAnalysis, setInterventionAnalysis] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Initial Data Loading from Backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wsRes, intRes, photoRes] = await Promise.all([
          axios.get('/api/v1/watersheds'),
          axios.get('/api/v1/interventions'),
          axios.get('/api/v1/photos')
        ]);

        if (wsRes.data && wsRes.data.watersheds?.length > 0) {
          setWatershedData(wsRes.data.watersheds[0]);
        }
        if (intRes.data) {
          setInterventionsData(intRes.data);
          // Set first intervention as default selected
          if (intRes.data.features?.length > 0) {
            handleSelectIntervention(intRes.data.features[0].properties, false);
          }
        }
        if (photoRes.data && photoRes.data.photos) {
          setPhotosData(photoRes.data.photos);
        }
      } catch (err) {
        console.error("Failed to load initial GIS data:", err);
      }
    };

    fetchData();
  }, []);

  const handleSelectIntervention = async (props, openModal = true) => {
    setSelectedIntervention(props);
    if (openModal) {
      setIsModalOpen(true);
    }
    try {
      const res = await axios.get(`/api/v1/interventions/${props.id}/analysis?radius_m=250`);
      setInterventionAnalysis(res.data);
    } catch (err) {
      console.error(`Failed to fetch buffer analysis for ${props.id}:`, err);
    }
  };

  const handleGenerateReport = async (interventionId = null) => {
    const targetId = interventionId || selectedIntervention?.id || 'INT-CD-001';
    setIsGeneratingPdf(true);
    try {
      const res = await axios.post(
        '/api/v1/reports/pdf',
        { intervention_id: targetId },
        { responseType: 'blob' }
      );

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Evidence_Report_${targetId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF report. Check backend server.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Navbar selectedWatershed={watershedData} />
      <div className="dashboard-grid">
        <Sidebar
          layers={layers}
          setLayers={setLayers}
          selectedTimeframe={selectedTimeframe}
          setSelectedTimeframe={setSelectedTimeframe}
        />
        <WatershedMap
          watershedData={watershedData}
          interventionsData={interventionsData}
          photosData={photosData}
          layers={layers}
          selectedTimeframe={selectedTimeframe}
          selectedIntervention={selectedIntervention}
          onSelectIntervention={(props) => handleSelectIntervention(props, true)}
        />
        <AnalyticsPanel
          watershedStats={watershedData?.stats}
          selectedIntervention={selectedIntervention}
          interventionAnalysis={interventionAnalysis}
          onGenerateReport={() => handleGenerateReport()}
          isGeneratingPdf={isGeneratingPdf}
        />
      </div>

      {isModalOpen && interventionAnalysis && (
        <InterventionModal
          interventionData={interventionAnalysis}
          onClose={() => setIsModalOpen(false)}
          onGenerateReport={(id) => handleGenerateReport(id)}
          isGeneratingPdf={isGeneratingPdf}
        />
      )}
    </div>
  );
}
