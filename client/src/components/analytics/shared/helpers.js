/**
 * Shared helper functions for Analytics Studio
 */

/**
 * Extract fields from a SurveyJS form definition
 * @param {Object} definition - SurveyJS form definition
 * @returns {Array} Array of field objects with name, type, and label
 */
export function extractFieldsFromDefinition(definition) {
  const fields = [
    { name: 'submission_date', type: 'date', label: 'Response Date' }
  ];

  if (!definition || !definition.pages) return fields;

  const processElements = (elements) => {
    elements.forEach(el => {
      if (el.elements) {
        // Recursive for Panel/nested elements
        processElements(el.elements);
      } else if (el.type === 'matrix') {
        // Matrix questions: create field for each row
        if (el.rows) {
          el.rows.forEach(row => {
            const rowName = typeof row === 'object' ? row.value : row;
            const rowLabel = typeof row === 'object' ? row.text : row;
            fields.push({
              name: `${el.name}.${rowName}`,
              type: 'category',
              label: `${el.title || el.name} - ${rowLabel}`
            });
          });
        }
      } else if (el.name) {
        // Regular question
        let type = 'category';
        if (el.type === 'rating' || (el.type === 'text' && el.inputType === 'number')) {
          type = 'number';
        }
        fields.push({
          name: el.name,
          type,
          label: el.title || el.name
        });
      }
    });
  };

  definition.pages.forEach(page => {
    if (page.elements) processElements(page.elements);
  });

  return fields;
}

/**
 * Generate a unique widget ID
 * @returns {string} Unique widget ID
 */
export function generateWidgetId() {
  return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique report ID
 * @returns {string} Unique report ID
 */
export function generateReportId() {
  return `r-${Date.now()}`;
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Aggregate data for charts
 * @param {Array} data - Raw data array
 * @param {string} xKey - X-axis field
 * @param {string} yKey - Y-axis field
 * @param {string} aggregation - Aggregation method (count, sum, avg)
 * @returns {Array} Aggregated data
 */
export function aggregateData(data, xKey, yKey, aggregation = 'count') {
  if (!data || !xKey) return [];

  const grouped = {};

  data.forEach(row => {
    const key = row[xKey] || 'Unknown';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    if (yKey) {
      grouped[key].push(Number(row[yKey]) || 0);
    } else {
      grouped[key].push(1);
    }
  });

  return Object.entries(grouped).map(([name, values]) => {
    let value;
    switch (aggregation) {
      case 'sum':
        value = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        value = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'count':
      default:
        value = values.length;
        break;
    }

    return { name, value };
  });
}
