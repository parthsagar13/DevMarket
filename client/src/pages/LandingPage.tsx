import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Download, ExternalLink, RefreshCw, Layers, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { apiService } from '../services/api.ts';
import { Template } from '../types/index.ts';
import toast from 'react-hot-toast';

export default function LandingPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFramework, setSelectedFramework] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique frameworks and categories for filtering
  const frameworks = ['All', ...Array.from(new Set(templates.map((t) => t.framework)))];
  const categories = ['All', ...Array.from(new Set(templates.map((t) => t.category)))];

  // Filtering & Sorting logic
  const filteredTemplates = templates
    .filter((template) => {
      const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFramework = selectedFramework === 'All' || template.framework === selectedFramework;
      const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
      return matchesSearch && matchesFramework && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'popular') {
        return (b.downloadCount || 0) - (a.downloadCount || 0);
      }
      if (sortBy === 'price-low') {
        return a.price - b.price;
      }
      if (sortBy === 'price-high') {
        return b.price - a.price;
      }
      return 0;
    });

  const handleDownload = (template: Template) => {
    try {
      // Trigger native download
      const link = document.createElement('a');
      link.href = apiService.getDownloadUrl(template.slug);
      link.setAttribute('download', `${template.slug}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Optimistically increment download count in UI
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id || t._id === template._id
            ? { ...t, downloadCount: (t.downloadCount || 0) + 1 }
            : t
        )
      );

      toast.success(`Downloading ${template.title}!`);
    } catch (error) {
      toast.error('Download failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rotate-45"></div>
            </div>
            <span className="font-sans text-xl font-bold tracking-tight text-slate-950">
              CodeMarket<span className="text-slate-500">.ai</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-950 hover:bg-slate-50 focus:outline-none"
            >
              Admin Portal
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-16 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200/60 uppercase tracking-wide">
              Developer Template Marketplace
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
              Production-Ready
              <span className="block text-slate-500 mt-2 font-normal">Developer Templates</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 leading-relaxed">
              Deploy enterprise-grade codebases in seconds. High-quality ZIP packages with automatic live previews and clean code structures.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Marketplace Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        {/* Controls Bar */}
        <div className="mb-10 flex flex-col gap-4 rounded-xl border border-slate-150 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search framework, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-xs"
            />
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-150 bg-slate-50/50 p-1">
              <span className="hidden px-2 text-xs font-medium text-slate-500 sm:inline">Framework:</span>
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="rounded-md bg-white border border-slate-200/60 px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {frameworks.map((fw) => (
                  <option key={fw} value={fw}>
                    {fw}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-150 bg-slate-50/50 p-1">
              <span className="hidden px-2 text-xs font-medium text-slate-500 sm:inline">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md bg-white border border-slate-200/60 px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-150 bg-slate-50/50 p-1">
              <SlidersHorizontal className="ml-1 h-3.5 w-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-md bg-white border border-slate-200/60 px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Templates Loading / Grid */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-950" />
            <p className="text-sm font-medium text-slate-500">Loading catalog...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <Layers className="h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-sm font-bold text-slate-900">No templates found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Try adjusting your search filters or browse other options.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template, idx) => (
              <motion.div
                key={template.id || template._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.3) }}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-video w-full overflow-hidden border-b border-slate-150 bg-slate-50">
                  {template.thumbnail.endsWith('.svg') ? (
                    // Direct HTML injection for SVG thumbnails generated server-side
                    <div
                      className="h-full w-full object-cover select-none"
                      dangerouslySetInnerHTML={{
                        __html: `
                          <iframe 
                            src="${template.thumbnail}" 
                            style="width: 100%; height: 100%; border: none; overflow: hidden; pointer-events: none;" 
                            scrolling="no">
                          </iframe>`
                      }}
                    />
                  ) : (
                    <img
                      src={template.thumbnail}
                      alt={template.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  )}

                  {/* Badge Row Overlay */}
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        template.isFree
                          ? 'bg-white/95 text-slate-900 border-slate-200'
                          : 'bg-amber-400 text-slate-950 border-amber-500/30'
                      }`}
                    >
                      {template.isFree ? 'Free' : 'Premium'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider border border-slate-200/40">
                      {template.framework}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider border border-slate-200/40">
                      {template.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-slate-600 transition-colors">
                    {template.title}
                  </h3>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Price</span>
                      <span className="text-lg font-extrabold text-slate-950">
                        {template.isFree ? '$0.00' : `$${template.price.toFixed(2)}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md flex items-center gap-1 border border-slate-150">
                        <Download className="h-3 w-3" />
                        {template.downloadCount || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Actions Overlay Footer */}
                <div className="grid grid-cols-2 border-t border-slate-200 bg-slate-50/50">
                  <a
                    href={template.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-1.5 border-r border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview
                  </a>
                  <button
                    onClick={() => handleDownload(template)}
                    className="inline-flex h-11 items-center justify-center gap-1.5 text-xs font-bold bg-slate-950 text-white hover:bg-slate-800 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-slate-100 flex items-center justify-between px-10 text-[10px] text-slate-400 font-medium tracking-wide uppercase bg-slate-50">
        <div className="flex gap-6">
          <span>&copy; 2026 CodeMarket.ai MVP</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            System Operational
          </span>
        </div>
        <div className="flex gap-4">
          <span className="hover:text-slate-950 cursor-pointer">Privacy</span>
          <span className="hover:text-slate-950 cursor-pointer">Terms</span>
          <span className="hover:text-slate-950 cursor-pointer">API Support</span>
        </div>
      </footer>
    </div>
  );
}
