import React from 'react';

/**
 * AlignmentGrid - The signature motif grid of the Align HRMS theme.
 * Displays a 10 x N grid of days styled by status.
 * @param {Array} statusList - Array of status strings ('present', 'absent', 'half-day', 'leave', 'upcoming').
 * @param {number} size - Custom size/number of days to show (default: 30)
 */
export default function AlignmentGrid({ statusList, size = 30 }) {
  // If statusList is not provided, generate a nice representative mock pattern
  const items = statusList || Array.from({ length: size }, (_, i) => {
    // Generate static representative mockup pattern
    const day = i + 1;
    // Weekends (assuming standard 30-day month, e.g. index 5,6, 12,13, 19,20, 26,27)
    const isWeekend = [5, 6, 12, 13, 19, 20, 26, 27].includes(i);
    if (day > 25) {
      return 'upcoming';
    }
    if (isWeekend) {
      return 'upcoming'; // rest day
    }
    if (day === 8) return 'leave';
    if (day === 15) return 'absent';
    if (day === 22) return 'half-day';
    return 'present';
  });

  return (
    <div>
      <div className="heat-grid">
        {items.map((status, index) => (
          <div
            key={index}
            className={`cell ${status}`}
            title={`Day ${index + 1}: ${status.toUpperCase()}`}
          />
        ))}
      </div>
      <div className="legend">
        <div className="legend-item">
          <div className="legend-color present"></div>
          <span>Present</span>
        </div>
        <div className="legend-item">
          <div className="legend-color half-day"></div>
          <span>Half-Day</span>
        </div>
        <div className="legend-item">
          <div className="legend-color absent"></div>
          <span>Absent</span>
        </div>
        <div className="legend-item">
          <div className="legend-color leave"></div>
          <span>Leave</span>
        </div>
        <div className="legend-item">
          <div className="legend-color upcoming"></div>
          <span>Upcoming / Rest</span>
        </div>
      </div>
    </div>
  );
}
