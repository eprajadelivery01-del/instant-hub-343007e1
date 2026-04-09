
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO';

const supabase = createClient(supabaseUrl, supabaseKey);

const isPointInRegion = (lat: number, lng: number, geometry: any): boolean => {
  try {
    const coords = geometry?.coordinates?.[0] || geometry?.geometry?.coordinates?.[0];
    if (!coords) return false;
    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const xi = coords[i][1], yi = coords[i][0]; // xi=lat, yi=lng
        const xj = coords[j][1], yj = coords[j][0];
        const intersect = ((yi > lng) !== (yj > lng)) &&
          (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
  } catch (e) {
    console.error('Error in isPointInRegion:', e);
    return false;
  }
};

async function check() {
  const { data: regions } = await supabase.from('regions').select('*');
  const lat = -14.3771854281284;
  const lng = -56.3956895113208;

  console.log(`Checking point: Lat ${lat}, Lng ${lng}`);

  regions?.forEach(r => {
    const inside = isPointInRegion(lat, lng, r.geometry);
    console.log(`Region ${r.name}: ${inside ? 'INSIDE' : 'OUTSIDE'}`);
    if (inside) {
        console.log('Geometry:', JSON.stringify(r.geometry).substring(0, 200) + '...');
    }
  });
  
  // Also check if geometry points look reversed
  if (regions && regions.length > 0) {
      const firstCoord = regions[0].geometry?.coordinates?.[0]?.[0];
      console.log('\nSample Coordinate from first region:', firstCoord);
      console.log('Is first element Lng (~ -56)?', firstCoord[0] < -50);
      console.log('Is second element Lat (~ -14)?', firstCoord[1] < 0 && firstCoord[1] > -30);
  }
}

check();
