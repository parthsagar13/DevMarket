import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Layers, LayoutDashboard, Database, UploadCloud, LogOut, 
  Tag, Download, Edit2, Trash2, Globe, Sparkles, X, CheckSquare, Loader2
} from 'lucide-react';
import { apiService } from '../services/api.ts';
import { Template } from '../types/index.ts';
import toast from 'react-hot-toast';

interface AdminDashboardProps {
  activeTab: 'dashboard' | 'templates' | 'upload';
}

export default function AdminDashboard({ activeTab }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Upload states
  const [title, setTitle] = useState<string>('');
  const [framework, setFramework] = useState<string>('React');
  const [category, setCategory] = useState<string>('Landing Page');
  const [price, setPrice] = useState<number>(19);
  const [isFree, setIsFree] = useState<boolean>(true);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // Edit modal states
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editFramework, setEditFramework] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editIsFree, setEditIsFree] = useState<boolean>(true);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const storedAdmin = localStorage.getItem('admin');
    if (storedAdmin) {
      try {
        const decoded = JSON.parse(storedAdmin);
        setAdminEmail(decoded.email);
      } catch (err) {
        setAdminEmail('admin@codemarket.ai');
      }
    }
    fetchTemplates();
  }, [navigate]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTemplates();
      setTemplates(data);
    } catch (err) {
      toast.error('Failed to sync templates catalog.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    toast.success('Admin logged out successfully.');
    navigate('/login');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        setZipFile(file);
      } else {
        toast.error('Please upload a valid .zip file.');
        e.target.value = '';
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !framework || !category || (!isFree && price <= 0)) {
      toast.error('Please complete all fields with valid entries.');
      return;
    }
    if (!zipFile) {
      toast.error('Please choose a ZIP file template to upload.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('framework', framework);
      formData.append('category', category);
      formData.append('price', isFree ? '0' : price.toString());
      formData.append('isFree', isFree.toString());
      formData.append('zipFile', zipFile);
      if (thumbnailFile) {
        formData.append('thumbnailFile', thumbnailFile);
      }

      await apiService.uploadTemplate(formData);
      toast.success('Template uploaded & processed successfully!');
      
      // Clear form
      setTitle('');
      setFramework('React');
      setCategory('Landing Page');
      setPrice(19);
      setIsFree(true);
      setZipFile(null);
      setThumbnailFile(null);
      
      // Refresh templates and redirect
      await fetchTemplates();
      navigate('/admin/templates');
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to process template ZIP.';
      toast.error(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this template and all extracted previews?')) {
      return;
    }

    try {
      await apiService.deleteTemplate(id);
      toast.success('Template deleted successfully.');
      setTemplates((prev) => prev.filter((t) => t.id !== id && t._id !== id));
    } catch (err) {
      toast.error('Failed to delete template.');
    }
  };

  const openEditModal = (template: Template) => {
    setEditingTemplate(template);
    setEditTitle(template.title);
    setEditFramework(template.framework);
    setEditCategory(template.category);
    setEditPrice(template.price);
    setEditIsFree(template.isFree);
    setEditThumbnailFile(null);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    try {
      setUpdating(true);
      const id = editingTemplate.id || editingTemplate._id;
      
      let payload: any;
      if (editThumbnailFile) {
        const formData = new FormData();
        formData.append('title', editTitle);
        formData.append('framework', editFramework);
        formData.append('category', editCategory);
        formData.append('price', (editIsFree ? 0 : editPrice).toString());
        formData.append('isFree', editIsFree.toString());
        formData.append('thumbnailFile', editThumbnailFile);
        payload = formData;
      } else {
        payload = {
          title: editTitle,
          framework: editFramework,
          category: editCategory,
          price: editIsFree ? 0 : editPrice,
          isFree: editIsFree,
        };
      }

      const updated = await apiService.updateTemplate(id, payload);

      toast.success('Template updated successfully!');
      setTemplates((prev) =>
        prev.map((t) => (t.id === id || t._id === id ? { ...t, ...updated } : t))
      );
      setEditingTemplate(null);
      setEditThumbnailFile(null);
      fetchTemplates(); // refresh full list to stay perfectly in sync
    } catch (err) {
      toast.error('Failed to update template.');
    } finally {
      setUpdating(false);
    }
  };

  // Stats calculation
  const totalTemplates = templates.length;
  const freeTemplates = templates.filter((t) => t.isFree).length;
  const premiumTemplates = templates.filter((t) => !t.isFree).length;
  const latestUpload = templates.length > 0 ? templates[0] : null;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col fixed h-full z-10">
        {/* Sidebar Header Brand */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-150">
          <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center">
            <div className="w-3 h-3 bg-white rotate-45"></div>
          </div>
          <span className="font-sans text-lg font-bold tracking-tight text-slate-950">
            CodeMarket<span className="text-slate-500">.ai</span>
          </span>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-1.5">
          <button
            onClick={() => navigate('/admin')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'dashboard'
                ? 'bg-slate-950 text-white'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </button>

          <button
            onClick={() => navigate('/admin/templates')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'templates'
                ? 'bg-slate-950 text-white'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            <Database className="h-4 w-4" />
            Templates
          </button>

          <button
            onClick={() => navigate('/admin/templates/upload')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'upload'
                ? 'bg-slate-950 text-white'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            <UploadCloud className="h-4 w-4" />
            Upload Template
          </button>
        </nav>

        {/* Sidebar Footer Logged Admin */}
        <div className="p-4 border-t border-slate-150 bg-slate-50/50">
          <div className="px-3 py-2 rounded-lg border border-slate-150 bg-white shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">ADMIN ACCOUNT</span>
            <span className="text-xs font-semibold text-slate-700 block truncate">{adminEmail}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 mt-3 px-4 py-2 rounded-lg border border-rose-100 bg-rose-50/50 text-rose-600 text-xs font-bold transition-all hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 pl-64 flex flex-col">
        {/* Header bar */}
        <header className="h-16 border-b border-slate-150 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'templates' && 'Templates Catalog'}
              {activeTab === 'upload' && 'Upload Template'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/"
              target="_blank"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950 transition-colors shadow-xs"
            >
              <Globe className="h-3.5 w-3.5" />
              View Live Site
            </a>
          </div>
        </header>

        {/* Route Container View */}
        <main className="flex-1 p-8">
          {/* loading tab placeholder */}
          {loading && activeTab === 'templates' ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-slate-950" />
              <p className="text-sm font-semibold text-slate-500">Syncing files...</p>
            </div>
          ) : (
            <>
              {/* Dashboard Tab Content */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Stats Grid */}
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                      <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">TOTAL TEMPLATES</div>
                      <div className="text-3xl font-extrabold text-slate-950">{totalTemplates}</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                      <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">FREE TEMPLATES</div>
                      <div className="text-3xl font-extrabold text-slate-950">{freeTemplates}</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                      <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">PREMIUM TEMPLATES</div>
                      <div className="text-3xl font-extrabold text-slate-950">{premiumTemplates}</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                      <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">TOTAL DOWNLOADS</div>
                      <div className="text-3xl font-extrabold text-slate-950">
                        {templates.reduce((acc, t) => acc + (t.downloadCount || 0), 0)}
                      </div>
                    </div>
                  </div>

                  {/* Latest upload card layout */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                    <h3 className="text-base font-bold text-slate-950 mb-4">Latest Upload Activity</h3>
                    {latestUpload ? (
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={latestUpload.thumbnail}
                            alt={latestUpload.title}
                            referrerPolicy="no-referrer"
                            className="h-12 w-20 object-cover rounded border border-slate-200 bg-slate-100"
                          />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{latestUpload.framework}</span>
                            <h4 className="font-bold text-slate-800 text-sm leading-tight">{latestUpload.title}</h4>
                            <span className="text-[11px] text-slate-400 mt-1 block">
                              Uploaded on {new Date(latestUpload.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-750 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                            {latestUpload.isFree ? 'Free' : `$${latestUpload.price}`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">No template uploads logged yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Templates List Tab Content */}
              {activeTab === 'templates' && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  {templates.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      <Database className="h-10 w-10 text-slate-300 mx-auto" />
                      <h3 className="mt-4 text-sm font-bold text-slate-950">No templates cataloged</h3>
                      <p className="text-xs text-slate-400 mt-1">Upload files to get started.</p>
                      <button
                        onClick={() => navigate('/admin/templates/upload')}
                        className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-4 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        Upload Template
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs text-slate-600">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="py-3.5 px-6">Thumbnail</th>
                            <th className="py-3.5 px-6">Template Name</th>
                            <th className="py-3.5 px-6">Framework</th>
                            <th className="py-3.5 px-6">Category</th>
                            <th className="py-3.5 px-6">Price</th>
                            <th className="py-3.5 px-6">Downloads</th>
                            <th className="py-3.5 px-6">Date Added</th>
                            <th className="py-3.5 px-6 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {templates.map((template) => (
                            <tr key={template.id || template._id} className="hover:bg-slate-50/30">
                              <td className="py-4 px-6">
                                <img
                                  src={template.thumbnail}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="h-10 w-16 object-cover rounded border border-slate-150 bg-slate-50"
                                />
                              </td>
                              <td className="py-4 px-6 font-bold text-slate-900">{template.title}</td>
                              <td className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">{template.framework}</td>
                              <td className="py-4 px-6 text-slate-500">{template.category}</td>
                              <td className="py-4 px-6 font-semibold">
                                {template.isFree ? <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50 text-[10px] font-bold uppercase tracking-wider">Free</span> : `$${template.price}`}
                              </td>
                              <td className="py-4 px-6 font-bold text-slate-400">
                                {template.downloadCount || 0}
                              </td>
                              <td className="py-4 px-6 text-slate-400 whitespace-nowrap">
                                {template.createdAt ? new Date(template.createdAt).toLocaleString() : 'N/A'}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center justify-center gap-1.5">
                                  <a
                                    href={template.previewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                                    title="Live preview"
                                  >
                                    <Globe className="h-4 w-4" />
                                  </a>
                                  <button
                                    onClick={() => openEditModal(template)}
                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                                    title="Edit details"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(template.id || template._id)}
                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Delete template"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Template Tab Content */}
              {activeTab === 'upload' && (
                <div className="max-w-2xl mx-auto rounded-xl border border-slate-200 bg-white p-8 shadow-xs">
                  <form onSubmit={handleUploadSubmit} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Template Name
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Acme Portfolio Theme"
                        className="block w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Framework
                        </label>
                        <select
                          value={framework}
                          onChange={(e) => setFramework(e.target.value)}
                          className="block w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        >
                          <option value="React">React</option>
                          <option value="Next.js">Next.js</option>
                          <option value="HTML">HTML / Vanilla CSS</option>
                          <option value="Vue">Vue</option>
                          <option value="Tailwind">Tailwind Static</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Category
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="block w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        >
                          <option value="Landing Page">Landing Page</option>
                          <option value="SaaS Dashboard">SaaS Dashboard</option>
                          <option value="Portfolio">Portfolio</option>
                          <option value="E-Commerce">E-Commerce</option>
                        </select>
                      </div>
                    </div>

                    {/* Free vs Premium Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div>
                        <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">License Model</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Determine if template is free or paid.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsFree(true);
                            setPrice(0);
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all border ${
                            isFree 
                              ? 'bg-slate-950 text-white border-slate-950' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Free
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsFree(false);
                            setPrice(19);
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all border ${
                            !isFree 
                              ? 'bg-slate-950 text-white border-slate-950' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Premium
                        </button>
                      </div>
                    </div>

                    {/* Price Input (Condition-based) */}
                    {!isFree && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-1.5"
                      >
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Price (USD)
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-slate-400">$</span>
                          <input
                            type="number"
                            min="1"
                            required
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                            className="block w-full rounded-lg border border-slate-200 pl-8 pr-4 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* File Dropzone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Template ZIP Archive
                        </label>
                        <div className="mt-1 flex justify-center rounded-lg border border-dashed border-slate-250 px-4 py-8 bg-slate-50/20 hover:bg-slate-50/50 transition-colors h-[180px] flex-col items-center">
                          <div className="text-center space-y-1">
                            <UploadCloud className="mx-auto h-7 w-7 text-slate-400" />
                            <div className="flex text-xs text-slate-600 justify-center">
                              <label className="relative cursor-pointer rounded font-bold text-slate-950 hover:text-slate-800">
                                <span>Choose ZIP file</span>
                                <input
                                  type="file"
                                  accept=".zip"
                                  required
                                  onChange={handleFileChange}
                                  className="sr-only"
                                />
                              </label>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              ZIP up to 100MB with index.html
                            </p>
                            {zipFile && (
                              <div className="mt-1.5 text-[10px] font-bold text-slate-900 bg-slate-100 inline-block px-2.5 py-0.5 rounded border border-slate-250 max-w-[180px] truncate">
                                {zipFile.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Card Preview Image (Optional)
                        </label>
                        <div className="mt-1 flex justify-center rounded-lg border border-dashed border-slate-250 px-4 py-8 bg-slate-50/20 hover:bg-slate-50/50 transition-colors h-[180px] flex-col items-center">
                          <div className="text-center space-y-1">
                            <Layers className="mx-auto h-7 w-7 text-slate-400" />
                            <div className="flex text-xs text-slate-600 justify-center">
                              <label className="relative cursor-pointer rounded font-bold text-slate-950 hover:text-slate-800">
                                <span>Choose Preview Image</span>
                                <input
                                  type="file"
                                  accept=".png,.jpg,.jpeg,.webp,.svg"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      setThumbnailFile(e.target.files[0]);
                                    }
                                  }}
                                  className="sr-only"
                                />
                              </label>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              PNG, JPG, WEBP, or SVG
                            </p>
                            {thumbnailFile && (
                              <div className="mt-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 inline-block px-2.5 py-0.5 rounded border border-emerald-250 max-w-[180px] truncate">
                                {thumbnailFile.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={uploading}
                      className="w-full h-11 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:bg-slate-700"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
                      {uploading ? 'Extracting & Processing website root...' : 'Publish Template'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Edit Modal Popup */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white rounded-xl border border-slate-200 p-6 shadow-xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold tracking-tight text-slate-900">Edit Template Metadata</h3>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-1 rounded text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Template Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Framework
                  </label>
                  <select
                    value={editFramework}
                    onChange={(e) => setEditFramework(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    <option value="React">React</option>
                    <option value="Next.js">Next.js</option>
                    <option value="HTML">HTML / Vanilla CSS</option>
                    <option value="Vue">Vue</option>
                    <option value="Tailwind">Tailwind Static</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  >
                    <option value="Landing Page">Landing Page</option>
                    <option value="SaaS Dashboard">SaaS Dashboard</option>
                    <option value="Portfolio">Portfolio</option>
                    <option value="E-Commerce">E-Commerce</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">License type:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditIsFree(true);
                      setEditPrice(0);
                    }}
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      editIsFree ? 'bg-slate-950 text-white border-slate-950' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditIsFree(false);
                      setEditPrice(19);
                    }}
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      !editIsFree ? 'bg-slate-950 text-white border-slate-950' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Premium
                  </button>
                </div>
              </div>

              {!editIsFree && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="block w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Update Card Preview Image (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {editingTemplate?.thumbnail && (
                    <img 
                      src={editingTemplate.thumbnail} 
                      alt="Current preview" 
                      className="h-10 w-14 object-cover rounded border border-slate-200"
                    />
                  )}
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditThumbnailFile(e.target.files[0]);
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-950 file:text-white hover:file:bg-slate-800 cursor-pointer"
                  />
                </div>
                {editThumbnailFile && (
                  <p className="text-[10px] text-emerald-600 font-medium mt-1">
                    New preview image selected: {editThumbnailFile.name}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full h-10 bg-slate-950 text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center justify-center"
              >
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
