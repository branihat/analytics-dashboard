const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const boundaryPath = path.join(__dirname, '../data/sampleBoundary.geojson');
    
    if (!fs.existsSync(boundaryPath)) {
      return res.status(404).json({
        error: 'Boundary data not found',
        message: 'The boundary GeoJSON file could not be located'
      });
    }

    const boundaryData = fs.readFileSync(boundaryPath, 'utf8');
    const geoJsonData = JSON.parse(boundaryData);

    res.json({
      success: true,
      data: geoJsonData,
      type: 'geojson'
    });

  } catch (error) {
    console.error('Get boundaries error:', error);
    res.status(500).json({
      error: 'Failed to load boundary data',
      message: 'Internal server error'
    });
  }
});

router.get('/kml', (req, res) => {
  try {
    const boundaryPath = path.join(__dirname, '../data/sampleBoundary.geojson');
    
    if (!fs.existsSync(boundaryPath)) {
      return res.status(404).json({
        error: 'Boundary data not found'
      });
    }

    const boundaryData = fs.readFileSync(boundaryPath, 'utf8');
    const geoJsonData = JSON.parse(boundaryData);

    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Drone Safety Boundaries</name>
    <description>Safety zones for drone monitoring</description>`;

    geoJsonData.features.forEach(feature => {
      const coords = feature.geometry.coordinates[0];
      const coordString = coords.map(coord => `${coord[0]},${coord[1]},0`).join(' ');
      
      kml += `
    <Placemark>
      <name>${feature.properties.name}</name>
      <description>Type: ${feature.properties.type}, Security Level: ${feature.properties.security_level}</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    });

    kml += `
  </Document>
</kml>`;

    res.set('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.send(kml);

  } catch (error) {
    console.error('Get KML boundaries error:', error);
    res.status(500).json({
      error: 'Failed to generate KML data',
      message: 'Internal server error'
    });
  }
});

module.exports = router; 