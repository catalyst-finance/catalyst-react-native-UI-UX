/**
 * Bezier Path Utilities for Robinhood-style Smooth Charts
 * 
 * Implements cubic Bezier smoothing using Catmull-Rom spline conversion
 * for visually smooth chart lines while preserving data integrity.
 * 
 * EXACT PORT from web app - no simplifications
 */

export interface Point {
  x: number;
  y: number;
}

export interface BezierControlPoints {
  cp1: Point;
  cp2: Point;
}

/**
 * Converts Catmull-Rom spline to cubic Bezier control points
 * 
 * @param p0 - Previous point
 * @param p1 - Start point of segment
 * @param p2 - End point of segment  
 * @param p3 - Next point
 * @param tension - Curve tension (0 = straight, 1 = very curved). Default 0.4 for Robinhood-style
 * @returns Control points for cubic Bezier curve
 */
export function catmullRomToBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  tension: number = 0.4
): BezierControlPoints {
  const t = tension;
  
  // Calculate control point 1 (influences curve leaving p1)
  const cp1: Point = {
    x: p1.x + (p2.x - p0.x) / 6 * t,
    y: p1.y + (p2.y - p0.y) / 6 * t,
  };
  
  // Calculate control point 2 (influences curve arriving at p2)
  const cp2: Point = {
    x: p2.x - (p3.x - p1.x) / 6 * t,
    y: p2.y - (p3.y - p1.y) / 6 * t,
  };
  
  return { cp1, cp2 };
}

/**
 * Generates a smooth SVG path string from an array of points
 * 
 * @param points - Array of points to connect
 * @param tension - Curve tension (0-1). Default 0.4
 * @returns SVG path string with cubic Bezier curves
 */
export function generateSmoothPath(
  points: Point[],
  tension: number = 0.4
): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }
  
  let path = `M ${points[0].x},${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i === points.length - 2 ? points[i + 1] : points[i + 2];
    
    const { cp1, cp2 } = catmullRomToBezier(p0, p1, p2, p3, tension);
    
    path += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
  }
  
  return path;
}

/**
 * Generates segmented smooth paths for different market sessions
 * (pre-market, regular hours, after-hours) with seamless transitions
 * 
 * @param segments - Array of point arrays, one per market session
 * @param tension - Curve tension (0-1). Default 0.4
 * @returns Array of SVG path strings, one per segment
 */
export function generateSegmentedSmoothPaths(
  segments: Point[][],
  tension: number = 0.4
): string[] {
  if (segments.length === 0) return [];
  
  return segments.map((points, segmentIndex) => {
    if (points.length === 0) return '';
    
    // Check if we should continue from previous segment
    const hasPreviousSegment = segmentIndex > 0 && segments[segmentIndex - 1].length > 0;
    const prevSegmentLastPoint = hasPreviousSegment ? segments[segmentIndex - 1][segments[segmentIndex - 1].length - 1] : null;
    
    // Only start with M if this is the first segment or if there's a gap from previous segment
    const shouldContinue = hasPreviousSegment && prevSegmentLastPoint &&
      Math.abs(prevSegmentLastPoint.x - points[0].x) < 1 && 
      Math.abs(prevSegmentLastPoint.y - points[0].y) < 1;
    
    if (points.length === 1) {
      return shouldContinue ? `L ${points[0].x},${points[0].y}` : `M ${points[0].x},${points[0].y}`;
    }
    
    if (points.length === 2) {
      const start = shouldContinue ? '' : `M ${points[0].x},${points[0].y}`;
      return `${start} L ${points[1].x},${points[1].y}`;
    }
    
    let path = shouldContinue ? '' : `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      // For smooth transitions between segments, consider adjacent segment points
      let p0: Point, p1: Point, p2: Point, p3: Point;
      
      p1 = points[i];
      p2 = points[i + 1];
      
      // Handle p0 (previous point)
      if (i === 0) {
        // First point in segment - check previous segment
        if (segmentIndex > 0) {
          const prevSegment = segments[segmentIndex - 1];
          p0 = prevSegment.length > 0 ? prevSegment[prevSegment.length - 1] : p1;
        } else {
          p0 = p1; // First segment, first point - use itself
        }
      } else {
        p0 = points[i - 1];
      }
      
      // Handle p3 (next point)
      if (i === points.length - 2) {
        // Last point in segment - check next segment
        if (segmentIndex < segments.length - 1) {
          const nextSegment = segments[segmentIndex + 1];
          p3 = nextSegment.length > 0 ? nextSegment[0] : p2;
        } else {
          p3 = p2; // Last segment, last point - use itself
        }
      } else {
        p3 = points[i + 2];
      }
      
      const { cp1, cp2 } = catmullRomToBezier(p0, p1, p2, p3, tension);
      
      path += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
    }
    
    return path;
  });
}

/**
 * Finds the Y coordinate on a cubic Bezier curve for a given X coordinate
 * Uses binary search for accurate positioning (critical for crosshair alignment)
 * 
 * @param x - Target X coordinate
 * @param p1 - Start point
 * @param cp1 - Control point 1
 * @param cp2 - Control point 2
 * @param p2 - End point
 * @param tolerance - Search tolerance. Default 0.1
 * @returns Y coordinate at the given X, or null if X is outside curve bounds
 */
export function getYOnCubicBezier(
  x: number,
  p1: Point,
  cp1: Point,
  cp2: Point,
  p2: Point,
  tolerance: number = 0.1
): number | null {
  // Check if x is within curve bounds
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  
  if (x < minX || x > maxX) {
    return null;
  }
  
  // Binary search for t value that gives us x
  let tMin = 0;
  let tMax = 1;
  let iterations = 0;
  const maxIterations = 50;
  
  while (iterations < maxIterations) {
    const t = (tMin + tMax) / 2;
    
    // Cubic Bezier formula for X
    const curveX = 
      Math.pow(1 - t, 3) * p1.x +
      3 * Math.pow(1 - t, 2) * t * cp1.x +
      3 * (1 - t) * Math.pow(t, 2) * cp2.x +
      Math.pow(t, 3) * p2.x;
    
    if (Math.abs(curveX - x) < tolerance) {
      // Found t, now calculate Y
      const curveY = 
        Math.pow(1 - t, 3) * p1.y +
        3 * Math.pow(1 - t, 2) * t * cp1.y +
        3 * (1 - t) * Math.pow(t, 2) * cp2.y +
        Math.pow(t, 3) * p2.y;
      
      return curveY;
    }
    
    if (curveX < x) {
      tMin = t;
    } else {
      tMax = t;
    }
    
    iterations++;
  }
  
  // Fallback: linear interpolation
  const ratio = (x - p1.x) / (p2.x - p1.x);
  return p1.y + ratio * (p2.y - p1.y);
}

/**
 * Finds Y coordinate on a smooth curve (multiple Bezier segments) for a given X
 * This is the main function used for crosshair and event dot positioning
 * 
 * @param x - Target X coordinate
 * @param points - All points in the curve
 * @param tension - Curve tension used in generateSmoothPath. Default 0.4
 * @returns Y coordinate at the given X, or null if not found
 */
export function getYOnSmoothCurve(
  x: number,
  points: Point[],
  tension: number = 0.4
): number | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0].y;
  
  // Find the segment containing x
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    const segmentMinX = Math.min(p1.x, p2.x);
    const segmentMaxX = Math.max(p1.x, p2.x);
    
    if (x >= segmentMinX && x <= segmentMaxX) {
      // Found the segment - calculate control points
      const p0 = i === 0 ? points[0] : points[i - 1];
      const p3 = i === points.length - 2 ? points[i + 1] : points[i + 2];
      
      const { cp1, cp2 } = catmullRomToBezier(p0, p1, p2, p3, tension);
      
      return getYOnCubicBezier(x, p1, cp1, cp2, p2);
    }
  }
  
  return null;
}

/**
 * Finds Y coordinate on segmented smooth curves for a given X
 * Handles multiple market session segments
 * 
 * @param x - Target X coordinate
 * @param segments - Array of point arrays, one per market session
 * @param tension - Curve tension. Default 0.4
 * @returns Y coordinate at the given X, or null if not found
 */
export function getYOnSegmentedSmoothCurve(
  x: number,
  segments: Point[][],
  tension: number = 0.4
): number | null {
  // Try each segment
  for (const points of segments) {
    const y = getYOnSmoothCurve(x, points, tension);
    if (y !== null) {
      return y;
    }
  }
  
  return null;
}

/**
 * Generates a single continuous smooth path across multiple segments
 * Useful for seamless rendering without gaps between market periods
 * 
 * @param segments - Array of point arrays, one per market session
 * @param tension - Curve tension (0-1). Default 0.4
 * @returns Single continuous SVG path string
 */
export function generateContinuousSmoothPath(
  segments: Point[][],
  tension: number = 0.4
): string {
  if (segments.length === 0) return '';
  
  // Flatten all segments into a single array of points
  const allPoints: Point[] = [];
  for (const segment of segments) {
    if (segment.length > 0) {
      // Skip duplicate points at segment junctions
      // This prevents duplicate consecutive points from creating artifacts
      for (const point of segment) {
        const lastPoint = allPoints[allPoints.length - 1];
        // Only add if it's not a duplicate of the previous point
        if (!lastPoint || Math.abs(lastPoint.x - point.x) > 0.01 || Math.abs(lastPoint.y - point.y) > 0.01) {
          allPoints.push(point);
        }
      }
    }
  }
  
  if (allPoints.length === 0) return '';
  if (allPoints.length === 1) return `M ${allPoints[0].x},${allPoints[0].y}`;
  if (allPoints.length === 2) {
    return `M ${allPoints[0].x},${allPoints[0].y} L ${allPoints[1].x},${allPoints[1].y}`;
  }
  
  let path = `M ${allPoints[0].x},${allPoints[0].y}`;
  
  for (let i = 0; i < allPoints.length - 1; i++) {
    const p0 = i === 0 ? allPoints[0] : allPoints[i - 1];
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];
    const p3 = i === allPoints.length - 2 ? allPoints[i + 1] : allPoints[i + 2];
    
    const { cp1, cp2 } = catmullRomToBezier(p0, p1, p2, p3, tension);
    
    path += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
  }
  
  return path;
}

/**
 * Helper function to convert chart data to Point array
 * 
 * @param data - Array of data objects with x and y properties
 * @returns Array of Point objects
 */
export function dataToPoints<T extends { x: number; y: number }>(data: T[]): Point[] {
  return data.map(d => ({ x: d.x, y: d.y }));
}

/**
 * Generates a simple linear SVG path string from an array of points
 * No smoothing - just straight lines between points
 * 
 * @param points - Array of points to connect
 * @returns SVG path string with linear segments
 */
export function generateLinearPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  
  let path = `M ${points[0].x},${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x},${points[i].y}`;
  }
  
  return path;
}
