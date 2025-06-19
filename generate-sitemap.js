const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// ✅ Use environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials in ENV");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function generateSitemap() {
  const { data: blogs, error } = await supabase
    .from("blogs")
    .select("slug");

  if (error) {
    console.error("❌ Error fetching blogs:", error);
    process.exit(1);
  }

  const baseUrl = "https://www.cloudforex.club";
  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Homepage
  xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <priority>1.0</priority>\n  </url>\n`;

  // Blog URLs
  blogs.forEach((blog) => {
    if (blog.slug) {
      xml += `  <url>\n    <loc>${baseUrl}/blog/${blog.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>0.8</priority>\n  </url>\n`;
    }
  });

  xml += `</urlset>\n`;

  const filePath = path.resolve(__dirname, "../public/sitemap.xml");
  fs.writeFileSync(filePath, xml, "utf8");
  console.log("✅ Sitemap generated at:", filePath);
}

generateSitemap();
