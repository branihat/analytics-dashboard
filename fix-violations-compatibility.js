// Quick fix for violations API - makes organization filtering optional
// This should be applied to the VPS immediately to fix the 500 error

// Updated getMapData method for src/backend/models/Violation.js
const getMapDataFixed = `
  async getMapData(organizationFilter = null) {
    try {
      // Check if organization_id column exists first
      let hasOrgColumn = false;
      try {
        const columns = await database.all("PRAGMA table_info(violations)");
        hasOrgColumn = columns.some(col => col.name === 'organization_id');
      } catch (err) {
        console.log('Could not check table structure, assuming no org column');
      }

      let query, params = [];
      
      if (hasOrgColumn && organizationFilter !== null) {
        // Use organization filtering if column exists and filter is provided
        query = \`
          SELECT id, type, latitude, longitude, timestamp, date, drone_id, location, image_url, organization_id
          FROM violations
          WHERE (organization_id = ? OR organization_id IS NULL)
          ORDER BY date DESC, timestamp DESC
        \`;
        params = [organizationFilter];
      } else {
        // Fallback to original query without organization filtering
        query = \`
          SELECT id, type, latitude, longitude, timestamp, date, drone_id, location, image_url
          FROM violations
          ORDER BY date DESC, timestamp DESC
        \`;
      }

      const violations = await database.all(query, params);
      
      return violations;
    } catch (err) {
      throw new Error(\`Database error: \${err.message}\`);
    }
  }
`;

// Updated getViolations method for src/backend/models/Violation.js
const getViolationsFixed = `
  async getViolations(queryParams = {}, organizationFilter = null) {
    const { error, value } = violationQuerySchema.validate(queryParams);
    if (error) {
      const errorMessage = error.details && error.details.length > 0 
        ? error.details[0].message 
        : 'Unknown validation error';
      throw new Error(\`Query validation error: \${errorMessage}\`);
    }

    // Check if organization_id column exists first
    let hasOrgColumn = false;
    try {
      const columns = await database.all("PRAGMA table_info(violations)");
      hasOrgColumn = columns.some(col => col.name === 'organization_id');
    } catch (err) {
      console.log('Could not check table structure, assuming no org column');
    }

    let query = 'SELECT * FROM violations WHERE 1=1';
    const params = [];

    // Add organization filter only if column exists and filter is provided
    if (hasOrgColumn && organizationFilter !== null) {
      query += ' AND (organization_id = ? OR organization_id IS NULL)';
      params.push(organizationFilter);
    }

    if (value.drone_id && value.drone_id.trim() !== '') {
      query += ' AND drone_id = ?';
      params.push(value.drone_id);
    }
    
    if (value.date_from && value.date_from.trim() !== '') {
      query += ' AND date >= ?';
      params.push(value.date_from);
    }
    
    if (value.date_to && value.date_to.trim() !== '') {
      query += ' AND date <= ?';
      params.push(value.date_to);
    }
    
    if (value.violation_type && value.violation_type.trim() !== '') {
      query += ' AND type = ?';
      params.push(value.violation_type);
    }
    
    if (value.location && value.location.trim() !== '') {
      query += ' AND location LIKE ?';
      params.push(\`%\${value.location}%\`);
    }

    let orderBy = 'date';
    switch (value.sort_by) {
      case 'timestamp':
        orderBy = 'timestamp';
        break;
      case 'type':
        orderBy = 'type';
        break;
      case 'drone_id':
        orderBy = 'drone_id';
        break;
      default:
        orderBy = 'date, timestamp';
    }
    
    query += \` ORDER BY \${orderBy} \${value.sort_order.toUpperCase()}\`;

    try {
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total').split(' ORDER BY')[0];
      const countResult = await database.get(countQuery, params);
      const totalItems = countResult.total;

      const offset = (value.page - 1) * value.limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(value.limit, offset);

      const violations = await database.all(query, params);

      return {
        violations,
        pagination: {
          current_page: value.page,
          total_pages: Math.ceil(totalItems / value.limit),
          total_items: totalItems,
          per_page: value.limit
        }
      };
    } catch (err) {
      throw new Error(\`Database error: \${err.message}\`);
    }
  }
`;

console.log('🔧 QUICK FIX FOR VIOLATIONS 500 ERROR');
console.log('');
console.log('📋 Apply these changes to /var/www/analytics-dashboard/src/backend/models/Violation.js:');
console.log('');
console.log('1. Replace the getMapData method with:');
console.log(getMapDataFixed);
console.log('');
console.log('2. Replace the getViolations method with:');
console.log(getViolationsFixed);
console.log('');
console.log('3. Restart the server: pm2 restart analytics-dashboard');
console.log('');
console.log('This will fix the 500 error by making organization filtering optional');
console.log('until the database migration is completed.');