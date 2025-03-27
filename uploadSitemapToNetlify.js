import fetch from 'node-fetch';
const fs = require('fs');
const path = require('path');

async function uploadSitemapToNetlify() {
  try {
    // Putanja do generisanog sitemap-a
    const sitemapPath = path.join(__dirname, 'sitemap.xml');
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');

    // URL Netlify Deploy Hook-a
    const deployHookUrl = 'https://api.netlify.com/build_hooks/67e578353bff780087604e16';

    // Slanje POST zahteva na Netlify Deploy Hook
    const response = await fetch(deployHookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sitemap: sitemapContent }),
    });

    if (response.ok) {
      console.log('Sitemap uspešno uploadovan na Netlify!');
    } else {
      console.error('Greška prilikom slanja sitemap-a na Netlify');
    }
  } catch (error) {
    console.error('Greška pri upload-u sitemap-a na Netlify:', error);
  }
}

module.exports = uploadSitemapToNetlify;