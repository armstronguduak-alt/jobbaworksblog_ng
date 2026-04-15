const fs = require('fs');
const https = require('https');

https.get('https://restcountries.com/v3.1/all?fields=name,idd,cca2,flag', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const countries = JSON.parse(data);
    const formatted = countries
      .map(c => {
        const root = c.idd.root || '';
        const suffix = (c.idd.suffixes && c.idd.suffixes.length > 0) ? c.idd.suffixes[0] : '';
        const dial_code = `${root}${suffix}`;
        return {
          name: c.name.common,
          dial_code: dial_code,
          code: c.cca2,
          flag: c.flag
        };
      })
      .filter(c => c.dial_code) // Only keep those with dial codes
      .sort((a, b) => a.name.localeCompare(b.name));
      
    // Always put Nigeria, US, UK at the top per requirements? User asked for all countries. Let's just output the sorted list.
    
    const tsContent = `export interface Country {
  name: string;
  dial_code: string;
  code: string;
  flag: string;
}

export const COUNTRIES: Country[] = ${JSON.stringify(formatted, null, 2)};
`;
    
    fs.writeFileSync('src/lib/countries.ts', tsContent);
    console.log('Successfully wrote src/lib/countries.ts');
  });
}).on('error', err => console.log('Error: ', err.message));
