import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, XLogo, FacebookLogo, LinkedinLogo, TwitchLogo, DiscordLogo } from "@phosphor-icons/react";
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Helmet } from "react-helmet-async";

interface Blog {
  id: string;
  featured: boolean;
  title: string;
  description?: string;
  slug: string;
  category: string;
  author: string;
  date: string;
  image_url: string;
  content: string;
}

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [morePosts, setMorePosts] = useState<Blog[]>([]);
  const navigate = useNavigate();
  const { profile } = useUserProfile() || {};
  let referralLink = '';
  if (blog) {
    if (profile && profile.referral_code) {
      referralLink = `${window.location.origin}/blogs/${blog.slug}?ref=${profile.referral_code}`;
    } else {
      referralLink = `${window.location.origin}/blogs/${blog.slug}`;
    }
  }
  // Possible share messages
  const shareMessages = [
    "🔥 Check out this insane trading platform for 2025",
    "🚀 Discover why CloudForex is the #1 platform for traders in 2025.",
    "📈 Master your trades in volatile markets, use CloudForex, etc."
  ];
  // Pick one message at random for each share
  const shareMessage = shareMessages[Math.floor(Math.random() * shareMessages.length)];
  const shareTags = "#Forex #TradingPlatform #CloudForex #AlphaQuant";
  const shareText = `${shareMessage}\n\n${referralLink}\n\n${shareTags}`;

  useEffect(() => {
    async function fetchBlog() {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('slug', slug)
        .single();
      if (!error && data) setBlog(data);
      setLoading(false);
    }
    if (slug) fetchBlog();
  }, [slug]);

  useEffect(() => {
    async function fetchMorePosts() {
      if (!blog) return;
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .neq('id', blog.id)
        .order('date', { ascending: false })
        .limit(3);
      if (!error && data) setMorePosts(data);
    }
    fetchMorePosts();
  }, [blog]);

  // Format date as 'Month Day, Year'
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate read time (words/200 rounded up)
  const getReadTime = (text: string) => {
    const words = text ? text.split(/\s+/).length : 0;
    return Math.max(1, Math.ceil(words / 200));
  };

  // Extract headings for overview
  const getHeadings = (markdown: string) => {
    const lines = markdown.split('\n');
    return lines
      .map((line, idx) => {
        const match = line.match(/^(#{1,3})\s+(.*)/);
        if (match) {
          return {
            level: match[1].length,
            text: match[2],
            id: `heading-${idx}-${match[2].toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          };
        }
        return null;
      })
      .filter(Boolean) as { level: number; text: string; id: string }[];
  };
  const headings = blog ? getHeadings(blog.content) : [];

  if (loading) return <div>Loading blog post...</div>;
  if (!blog) return <div>Blog post not found.</div>;

  return (
    <>
      <Helmet>
        <title>{blog.title} | CloudForex Blog</title>
        <meta name="description" content={blog.description || blog.content.slice(0, 150)} />
        <meta property="og:title" content={`${blog.title} | CloudForex Blog`} />
        <meta property="og:description" content={blog.description || blog.content.slice(0, 150)} />
        <meta property="og:image" content={blog.image_url || '/og-image/default.jpg'} />
        <meta property="og:url" content={`https://www.cloudforex.club/blog/${blog.slug}`} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${blog.title} | CloudForex Blog`} />
        <meta name="twitter:description" content={blog.description || blog.content.slice(0, 150)} />
        <meta name="twitter:image" content={blog.image_url || '/og-image/default.jpg'} />
        <link rel="canonical" href={`https://www.cloudforex.club/blog/${blog.slug}`} />
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": blog.title,
            "author": {
              "@type": "Person",
              "name": blog.author
            },
            "datePublished": blog.date,
            "image": blog.image_url || "https://www.cloudforex.club/og-image/default.jpg",
            "publisher": {
              "@type": "Organization",
              "name": "CloudForex",
              "logo": {
                "@type": "ImageObject",
                "url": "https://www.cloudforex.club/og-image/home.jpg"
              }
            },
            "description": blog.description || blog.content.slice(0, 150)
          })}
        </script>
      </Helmet>
      <Navbar variant="blogs" />
      {/* Full-width image, title, and subtitle */}
      <div className="max-w-[1200px] mx-auto px-4 mt-24">
        {/* Breadcrumb */}
        <nav className="text-sm mb-4" aria-label="Breadcrumb">
          <ol className="list-none p-0 inline-flex text-gray-500">
            <li className="flex items-center">
              <Link to="/blogs" className="hover:underline text-blue-600">Blogs</Link>
              <span className="mx-2">/</span>
            </li>
            <li className="flex items-center text-gray-700">
              {blog.title}
            </li>
          </ol>
        </nav>
        {blog.image_url && (
          <img
            src={blog.image_url}
            alt={blog.title}
            className="w-full max-h-[630px] object-cover rounded-lg shadow mb-8"
          />
        )}
        <div className="w-full mb-6">
          <h1 className="text-4xl font-bold mb-2 text-left w-full">{blog.title}</h1>
          {blog.description && (
            <h2 className="text-xl font-medium mb-4 text-left text-gray-500 w-full">{blog.description}</h2>
          )}
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto py-12 px-4 flex flex-col md:flex-row gap-8">
        {/* Overview sidebar */}
        {headings.length > 0 && (
          <aside className="hidden md:block w-1/4 sticky top-32 self-start">
            <div className="border border-gray-200 rounded-xl p-6 bg-gradient-to-b from-white/90 to-gray-50 shadow-lg mb-6">
              <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                <span className="inline-block w-1.5 h-5 bg-blue-500 rounded-full mr-2"></span>
                Overview
              </h3>
              <ul className="space-y-2">
                {headings.map(h => (
                  <li key={h.id} className={h.level === 1 ? "ml-0" : h.level === 2 ? "ml-4" : "ml-8"}>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(h.id);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className={
                        `text-left w-full bg-transparent border-0 p-0 truncate transition-colors duration-150 ` +
                        `text-sm font-medium ` +
                        `hover:text-blue-700 focus:text-blue-700 ` +
                        (h.level === 1 ? 'text-blue-700' : h.level === 2 ? 'text-gray-700' : 'text-gray-500')
                      }
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
        {/* Main content */}
        <div className="flex-1">
          {/* Share/content and meta info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{blog.category}</span>
              {blog.featured && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Featured</span>}
              <span className="text-sm text-gray-500 ml-2">By {blog.author} • {formatDate(blog.date)} • {getReadTime(blog.content)} min read</span>
            </div>
            {/* Share buttons */}
            <div className="flex items-center gap-3 mt-2 sm:mt-0">
              <a href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on X"><XLogo size={22} weight="regular" /></a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook"><FacebookLogo size={22} weight="regular" /></a>
              <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(referralLink)}&title=${encodeURIComponent(blog.title)}&summary=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn"><LinkedinLogo size={22} weight="regular" /></a>
              <a href={`https://www.twitch.tv/`} target="_blank" rel="noopener noreferrer" aria-label="Share on Twitch"><TwitchLogo size={22} weight="regular" /></a>
              <a href={`https://discord.com/channels/@me`} target="_blank" rel="noopener noreferrer" aria-label="Share on Discord"><DiscordLogo size={22} weight="regular" /></a>
            </div>
          </div>
          <div className="prose max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => {
                  const text = String(props.children);
                  const id = headings.find(h => h.text === text && h.level === 1)?.id || undefined;
                  return <h1 id={id} className="text-3xl font-bold mt-8 mb-4" {...props} />;
                },
                h2: ({node, ...props}) => {
                  const text = String(props.children);
                  const id = headings.find(h => h.text === text && h.level === 2)?.id || undefined;
                  return <h2 id={id} className="text-2xl font-semibold mt-6 mb-3" {...props} />;
                },
                h3: ({node, ...props}) => {
                  const text = String(props.children);
                  const id = headings.find(h => h.text === text && h.level === 3)?.id || undefined;
                  return <h3 id={id} className="text-xl font-semibold mt-4 mb-2" {...props} />;
                },
                p: ({node, ...props}) => <p className="mb-4" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc ml-6 mb-4" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal ml-6 mb-4" {...props} />,
                code: ({node, ...props}) => <code className="bg-gray-100 px-1 rounded" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-gray-100 p-2 rounded mb-4 overflow-x-auto" {...props} />,
                a: ({node, ...props}) => <a className="text-blue-600 underline" {...props} />,
                table: ({node, ...props}) => <table className="min-w-full border mt-4 mb-6" {...props} />,
                th: ({node, ...props}) => <th className="border px-4 py-2 bg-gray-100" {...props} />,
                td: ({node, ...props}) => <td className="border px-4 py-2" {...props} />,
                tr: ({node, ...props}) => <tr className="even:bg-gray-50" {...props} />,
              }}
            >
              {blog.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
      {/* More Posts Section */}
      {morePosts.length > 0 && (
        <div className="max-w-[1200px] mx-auto mt-16 px-4 mb-16">
          <h3 className="text-2xl font-bold mb-6">More Blogs</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {morePosts.map(post => (
              post.slug ? (
                <a
                  key={post.id}
                  href={`/blogs/${post.slug}`}
                  className="block rounded-lg shadow hover:shadow-lg transition-shadow bg-white border border-gray-100 overflow-hidden"
                >
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{post.category}</span>
                    </div>
                    <h4 className="text-lg font-semibold mb-1 line-clamp-2">{post.title}</h4>
                    {post.description && <p className="text-sm text-gray-500 mb-1 line-clamp-2">{post.description}</p>}
                    <p className="text-xs text-gray-400">{formatDate(post.date)}</p>
                  </div>
                </a>
              ) : null
            ))}
          </div>
        </div>
      )}
      <Footer />
    </>
  );
};

export default BlogPost;
