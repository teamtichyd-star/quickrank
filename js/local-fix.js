// Paste this to replace fetchLocalRank function in js/local.js

async function fetchLocalRank(keyword, lat, lng, siteUrl, apiKey) {
  // Convert lat/lng to nearest area name for Serper
  const areaName = getAreaName(lat, lng);
  const query = keyword + ' in ' + areaName;
  
  try {
    const resp = await fetch('https://google.serper.dev/maps', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'in', hl: 'en' })
    });
    const data = await resp.json();
    const places = data.places || [];
    
    // Find our business
    const domain = siteUrl.replace(/https?:\/\//, '').replace(/www\./, '').split('/')[0].toLowerCase();
    let rank = null;
    
    places.forEach((p, i) => {
      const title = (p.title || '').toLowerCase();
      const website = (p.website || '').toLowerCase();
      if (website.includes(domain) || title.includes('turnkey interior') || title.includes('tic ')) {
        if (!rank) rank = i + 1;
      }
    });
    
    return { rank: rank || 20, total: places.length, area: areaName, places: places.slice(0,3) };
  } catch(e) {
    return { rank: 20, total: 0, area: areaName, places: [] };
  }
}

function getAreaName(lat, lng) {
  // TIC center: 17.4401, 78.3489 (Gachibowli)
  const areas = [
    { lat: 17.4401, lng: 78.3489, name: 'Gachibowli' },
    { lat: 17.4504, lng: 78.3812, name: 'HITEC City' },
    { lat: 17.4487, lng: 78.3694, name: 'Madhapur' },
    { lat: 17.4616, lng: 78.3674, name: 'Kondapur' },
    { lat: 17.4250, lng: 78.4096, name: 'Jubilee Hills' },
    { lat: 17.4156, lng: 78.4347, name: 'Banjara Hills' },
    { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
    { lat: 17.4399, lng: 78.3520, name: 'Nanakramguda' },
    { lat: 17.4720, lng: 78.3800, name: 'Raidurgam' },
    { lat: 17.4350, lng: 78.3600, name: 'Puppalguda' },
    { lat: 17.4600, lng: 78.3500, name: 'Gopanpalle' },
    { lat: 17.4100, lng: 78.3700, name: 'Narsingi' },
    { lat: 17.4300, lng: 78.4200, name: 'Panjagutta' },
    { lat: 17.4650, lng: 78.4100, name: 'Ameerpet' },
    { lat: 17.4000, lng: 78.4600, name: 'Masab Tank' },
    { lat: 17.4900, lng: 78.3900, name: 'Kukatpally' },
    { lat: 17.4550, lng: 78.4300, name: 'SR Nagar' },
    { lat: 17.4200, lng: 78.3400, name: 'Financial District' },
    { lat: 17.4750, lng: 78.3600, name: 'Tellapur' },
    { lat: 17.4100, lng: 78.4000, name: 'Manikonda' },
    { lat: 17.4450, lng: 78.3350, name: 'Kokapet' },
    { lat: 17.4650, lng: 78.3300, name: 'Nallagandla' },
    { lat: 17.4300, lng: 78.3800, name: 'Serilingampally' },
    { lat: 17.4800, lng: 78.4000, name: 'JNTU' },
    { lat: 17.4050, lng: 78.3900, name: 'Attapur' }
  ];
  
  // Find closest area to given lat/lng
  let closest = areas[0];
  let minDist = 999;
  areas.forEach(a => {
    const d = Math.sqrt(Math.pow(a.lat - lat, 2) + Math.pow(a.lng - lng, 2));
    if (d < minDist) { minDist = d; closest = a; }
  });
  return closest.name;
}
