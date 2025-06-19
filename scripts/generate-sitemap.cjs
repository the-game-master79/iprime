require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function generateSitemap() {
  const { data: blogs, error } = await supabase.from('blogs').select('slug');
  if (error) {
    console.error('Error fetching blogs:', error);
    process.exit(1);
  }
  const baseUrl = 'https://www.cloudforex.club';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += `  <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>\n`;
  xml += `  <url><loc>${baseUrl}/alphaquant</loc><priority>0.8</priority></url>\n`;
  xml += `  <url><loc>${baseUrl}/partners</loc><priority>0.8</priority></url>\n`;
  xml += `  <url><loc>${baseUrl}/company</loc><priority>0.8</priority></url>\n`;

  blogs.forEach(blog => {
    if (blog.slug) {
      xml += `  <url><loc>${baseUrl}/blogs/${blog.slug}</loc><priority>0.8</priority></url>\n`;
    }
  });

  xml += `</urlset>\n`;

  fs.writeFileSync('./public/sitemap.xml', xml, 'utf8');
  console.log('Sitemap generated!');
}

generateSitemap();
