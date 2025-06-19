import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/shared/Navbar';

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

const BlogList: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBlogs() {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('date', { ascending: false });
      if (!error && data) setBlogs(data);
      setLoading(false);
    }
    fetchBlogs();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64">Loading blogs...</div>;

  return (
    <>
      <Navbar variant="blogs" />
      <div className="max-w-[1200px] mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-8 mt-24 text-center">Latest Blogs</h1>
        <div className="grid md:grid-cols-2 gap-8">
          {blogs.map(blog => (
            blog.slug ? (
              <Link
                to={`/blogs/${blog.slug}`}
                key={blog.id}
                className="block rounded-lg shadow-lg hover:shadow-2xl transition-shadow bg-white overflow-hidden border border-gray-100"
              >
                {blog.image_url && (
                  <img
                    src={blog.image_url}
                    alt={blog.title}
                    className="w-full h-56 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{blog.category}</span>
                    {blog.featured && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Featured</span>}
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">{blog.title}</h2>
                  {blog.author && (
                    <p className="text-sm text-gray-500 mb-1">By {blog.author} • {new Date(blog.date).toLocaleDateString()}</p>
                  )}
                  {/* Description: Show description if present, otherwise fallback to content preview. */}
                  {blog.description ? (
                    <p className="text-gray-700 mb-4 line-clamp-3">{blog.description}</p>
                  ) : blog.content ? (
                    <p className="text-gray-700 mb-4 line-clamp-3">
                      {blog.content.replace(/<[^>]+>/g, '').slice(0, 120)}...
                    </p>
                  ) : (
                    <p className="text-gray-700 mb-4 italic">No preview available.</p>
                  )}
                  <span className="text-blue-600 font-medium">Read more →</span>
                </div>
              </Link>
            ) : null
          ))}
        </div>
      </div>
    </>
  );
};

export default BlogList;
