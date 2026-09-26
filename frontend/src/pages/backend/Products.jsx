import { useEffect, useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  UtensilsCrossed,
  Edit3,
  Trash2,
  X,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';

const UNITS = [
  'piece',
  'cup',
  'glass',
  'plate',
  'bowl',
  'bottle',
  'kg',
  'g',
  'ml',
  'l',
];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-800 rounded-2xl w-full max-w-lg shadow-pop-lg animate-popIn max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b-2 border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 font-outfit">
            {title}
          </h2>

          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const [newCat, setNewCat] = useState(false);

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    price: '',
    unitOfMeasure: 'piece',
    tax: '5',
    description: '',
    kdsStation: '',
  });

  const [catForm, setCatForm] = useState({
    name: '',
    color: '#6B7280',
  });

  // Image state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // --------------------------------------------------
  // Backend URL
  // --------------------------------------------------
  // Change this if your backend runs on another port/domain.
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');
  // --------------------------------------------------
  // Build full image URL
  // --------------------------------------------------
  // const getImageUrl = (imageUrl) => {
  //   if (!imageUrl) return null;

  //   // Already a full URL
  //   if (
  //     imageUrl.startsWith('http://') ||
  //     imageUrl.startsWith('https://') ||
  //     imageUrl.startsWith('blob:')
  //   ) {
  //     return imageUrl;
  //   }

  //   // Backend returns something like:
  //   // /uploads/products/example.jpg
  //   return `${API_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  // };

  const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;

  // Already a complete URL
  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('blob:')
  ) {
    return imageUrl;
  }

  // Example:
  // imageUrl = /uploads/products/coffee.jpg
  //
  // Result:
  // http://localhost:5000/uploads/products/coffee.jpg
  return `${SERVER_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};

  // --------------------------------------------------
  // Load products and categories
  // --------------------------------------------------
  const load = async () => {
    try {
      setLoading(true);

      const [p, c] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
      ]);

      setProducts(p);
      setCategories(c);
    } catch (err) {
      console.error(err);
      toast.error(err?.error || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // --------------------------------------------------
  // Open Add Product
  // --------------------------------------------------
  const openAdd = () => {
    setForm({
      name: '',
      categoryId: categories[0]?.id || '',
      price: '',
      unitOfMeasure: 'piece',
      tax: '5',
      description: '',
      kdsStation: 'KITCHEN',
    });

    setNewCat(false);

    setCatForm({
      name: '',
      color: '#6B7280',
    });

    setSelected(null);

    setImageFile(null);
    setImagePreview(null);

    setModal('add');
  };

  // --------------------------------------------------
  // Open Edit Product
  // --------------------------------------------------
  const openEdit = (p) => {
    setForm({
      name: p.name || '',
      categoryId: p.categoryId || '',
      price: p.price ?? '',
      unitOfMeasure: p.unitOfMeasure || 'piece',
      tax: p.tax ?? '0',
      description: p.description || '',
      kdsStation: p.kdsStation || '',
    });

    setNewCat(false);

    setCatForm({
      name: '',
      color: '#6B7280',
    });

    setSelected(p);

    // Reset selected new file
    setImageFile(null);

    // Show existing product image
    setImagePreview(getImageUrl(p.imageUrl));

    setModal('edit');
  };

  // --------------------------------------------------
  // Handle image selection
  // --------------------------------------------------
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // Frontend validation
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WEBP images are allowed.');
      e.target.value = '';
      return;
    }

    // Backend limit is 5 MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }

    setImageFile(file);

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  // --------------------------------------------------
  // Remove selected image
  // --------------------------------------------------
  const handleRemoveImage = () => {
    setImageFile(null);

    if (selected?.imageUrl) {
      // Restore existing image when editing
      setImagePreview(getImageUrl(selected.imageUrl));
    } else {
      setImagePreview(null);
    }
  };

  // --------------------------------------------------
  // Submit Product
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Basic validation
      if (!form.name.trim()) {
        toast.error('Product name is required.');
        return;
      }

      if (!form.price || parseFloat(form.price) <= 0) {
        toast.error('Please enter a valid price.');
        return;
      }

      if (!newCat && !form.categoryId) {
        toast.error('Please select a category.');
        return;
      }

      if (newCat && !catForm.name.trim()) {
        toast.error('Please enter the new category name.');
        return;
      }

      // ------------------------------------------------
      // FormData
      // ------------------------------------------------
      const formData = new FormData();

      formData.append('name', form.name.trim());

      formData.append('price', parseFloat(form.price));

      formData.append(
        'tax',
        form.tax === '' ? '0' : parseFloat(form.tax)
      );

      formData.append(
        'unitOfMeasure',
        form.unitOfMeasure || 'piece'
      );

      formData.append(
        'description',
        form.description?.trim() || ''
      );

      formData.append(
        'kdsStation',
        form.kdsStation || ''
      );

      // Category
      if (newCat) {
        formData.append(
          'categoryId',
          JSON.stringify({
            name: catForm.name.trim(),
            color: catForm.color || '#6B7280',
          })
        );
      } else {
        formData.append('categoryId', form.categoryId);
      }

      // Image
      if (imageFile) {
        formData.append('image', imageFile);
      }

      // ------------------------------------------------
      // Create
      // ------------------------------------------------
      if (modal === 'add') {
        await api.post('/products', formData);
      }

      // ------------------------------------------------
      // Update
      // ------------------------------------------------
      else {
        await api.put(
          `/products/${selected.id}`,
          formData
        );
      }

      toast.success(
        modal === 'add'
          ? 'Product added successfully'
          : 'Product updated successfully'
      );

      // Reset
      setModal(null);
      setSelected(null);
      setImageFile(null);
      setImagePreview(null);

      await load();
    } catch (err) {
      console.error('Product save error:', err);

      toast.error(
        err?.error ||
          err?.message ||
          'Failed to save product'
      );
    }
  };

  // --------------------------------------------------
  // Delete Product
  // --------------------------------------------------
  const handleDelete = async () => {
    try {
      await api.delete(`/products/${selected.id}`);

      toast.success('Product removed');

      setModal(null);
      setSelected(null);

      await load();
    } catch (err) {
      console.error(err);

      toast.error(
        err?.error ||
          err?.message ||
          'Failed to delete product'
      );
    }
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 font-semibold">
        Loading...
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UtensilsCrossed
            size={24}
            className="text-[#F472B6]"
          />

          <h1 className="text-2xl font-black text-slate-800 font-outfit">
            Products
          </h1>
        </div>

        <button
          onClick={openAdd}
          className="bg-[#F472B6] hover:bg-[#e45ea0] text-white border-2 border-slate-800 rounded-xl font-bold px-4 py-2.5 text-sm shadow-pop-sm hover:translate-y-[-2px] active:translate-y-[2px] transition-all flex items-center gap-1.5"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Products table */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl overflow-hidden shadow-pop">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase font-bold border-b-2 border-slate-800">
                {[
                  'Image',
                  'Name',
                  'Category',
                  'Price',
                  'Tax',
                  'Unit',
                  'KDS',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left font-bold text-slate-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50/50 transition"
                >
                  {/* Image */}
                  <td className="px-5 py-4">
                    {p.imageUrl ? (
                      <img
                        src={getImageUrl(p.imageUrl)}
                        alt={p.name}
                        className="w-14 h-14 object-cover rounded-xl border-2 border-slate-200 shadow-sm"
                        onError={(e) => {
                          e.currentTarget.style.display =
                            'none';
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400">
                        <ImageIcon size={22} />
                      </div>
                    )}
                  </td>

                  {/* Name */}
                  <td className="px-5 py-4">
                    <div className="text-slate-800 font-bold">
                      {p.name}
                    </div>

                    {p.description && (
                      <div
                        className="text-xs text-slate-400 font-medium mt-0.5 line-clamp-1 max-w-[250px]"
                        title={p.description}
                      >
                        {p.description}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-5 py-4">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor:
                          (p.category?.color ||
                            '#6B7280') + '15',

                        color:
                          p.category?.color ||
                          '#6B7280',

                        border: `1px solid ${
                          p.category?.color ||
                          '#6B7280'
                        }33`,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            p.category?.color ||
                            '#6B7280',
                        }}
                      />

                      {p.category?.name}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-5 py-4 text-slate-800 font-bold">
                    ETB{' '}
                    {parseFloat(p.price).toFixed(2)}
                  </td>

                  {/* Tax */}
                  <td className="px-5 py-4 text-slate-600 font-semibold">
                    {p.tax}%
                  </td>

                  {/* Unit */}
                  <td className="px-5 py-4 text-slate-600 font-semibold">
                    {p.unitOfMeasure}
                  </td>

                  {/* KDS */}
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        p.kdsStation
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {p.kdsStation || 'None'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2.5 py-1 rounded-lg transition"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>

                      <button
                        onClick={() => {
                          setSelected(p);
                          setModal('delete');
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-semibold">
              No products yet. Add one!
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit modal */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal
          title={
            modal === 'add'
              ? 'Add Product'
              : 'Edit Product'
          }
          onClose={() => {
            setModal(null);
            setImageFile(null);
            setImagePreview(null);
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Product name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Name *
              </label>

              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#F472B6] transition font-semibold"
              />
            </div>

            {/* Product image */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Product Image
              </label>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                  {/* Preview */}
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-36 h-36 object-cover rounded-2xl border-2 border-slate-800 shadow-pop-sm"
                      />

                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center border-2 border-slate-800"
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-36 h-36 rounded-2xl bg-white border-2 border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon size={32} />
                      <span className="text-xs mt-2 font-semibold">
                        No image
                      </span>
                    </div>
                  )}

                  {/* File input */}
                  <label className="cursor-pointer bg-white hover:bg-slate-100 border-2 border-slate-800 text-slate-700 rounded-xl px-4 py-2 text-sm font-bold transition">
                    {imageFile
                      ? 'Choose Different Image'
                      : imagePreview
                      ? 'Replace Image'
                      : 'Choose Image'}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  <p className="text-xs text-slate-400 text-center">
                    JPG, PNG or WEBP
                    <br />
                    Maximum size: 5 MB
                  </p>

                  {imageFile && (
                    <p className="text-xs text-emerald-600 font-bold text-center">
                      Selected: {imageFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Category *
              </label>

              <select
                value={
                  newCat
                    ? '__new__'
                    : form.categoryId
                }
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setNewCat(true);
                  } else {
                    setNewCat(false);

                    setForm({
                      ...form,
                      categoryId:
                        e.target.value,
                    });
                  }
                }}
                className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#F472B6] transition font-semibold"
              >
                {categories.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.name}
                  </option>
                ))}

                <option value="__new__">
                  + Create new category
                </option>
              </select>
            </div>

            {/* New category */}
            {newCat && (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    New Category Name
                  </label>

                  <input
                    value={catForm.name}
                    onChange={(e) =>
                      setCatForm({
                        ...catForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F472B6] font-semibold"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-600">
                    Color
                  </label>

                  <input
                    type="color"
                    value={catForm.color}
                    onChange={(e) =>
                      setCatForm({
                        ...catForm,
                        color: e.target.value,
                      })
                    }
                    className="w-10 h-10 rounded cursor-pointer border-2 border-slate-800 bg-transparent p-0 overflow-hidden"
                  />

                  <div
                    className="w-6 h-6 rounded-full border border-slate-200 shadow-pop-sm"
                    style={{
                      backgroundColor:
                        catForm.color,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Price and Tax */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Price (ETB) *
                </label>

                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: e.target.value,
                    })
                  }
                  className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#F472B6] transition font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Tax %
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.tax}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tax: e.target.value,
                    })
                  }
                  className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#F472B6] transition font-semibold"
                />
              </div>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Unit of Measure
              </label>

              <select
                value={form.unitOfMeasure}
                onChange={(e) =>
                  setForm({
                    ...form,
                    unitOfMeasure: e.target.value,
                  })
                }
                className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#F472B6] transition font-semibold"
              >
                {UNITS.map((u) => (
                  <option
                    key={u}
                    value={u}
                  >
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Description
              </label>

              <textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                className="w-full bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#F472B6] transition font-semibold resize-none"
              />
            </div>

            {/* KDS station */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <label className="text-sm font-bold text-slate-700">
                Preparation station
              </label>

              <select
                value={form.kdsStation}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kdsStation: e.target.value,
                  })
                }
                className="bg-white border-2 border-slate-200 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-[#F472B6] transition font-semibold"
              >
                <option value="">
                  None
                </option>

                <option value="KITCHEN">
                  Kitchen
                </option>

                <option value="BAR">
                  Bar
                </option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-slate-700 py-2.5 rounded-xl transition font-bold text-sm"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex-1 bg-[#F472B6] hover:bg-[#e45ea0] text-white border-2 border-slate-800 py-2.5 rounded-xl transition font-bold text-sm shadow-pop-sm hover:translate-y-[-1px] active:translate-y-[1px]"
              >
                {modal === 'add'
                  ? 'Add Product'
                  : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete modal */}
      {modal === 'delete' && (
        <Modal
          title="Delete Product"
          onClose={() => setModal(null)}
        >
          <p className="text-slate-600 mb-6 font-semibold">
            Are you sure you want to deactivate{' '}
            <span className="text-slate-800 font-extrabold">
              "{selected?.name}"
            </span>
            ? It will be hidden from the POS.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setModal(null)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-slate-700 py-2.5 rounded-xl transition font-bold text-sm"
            >
              Cancel
            </button>

            <button
              onClick={handleDelete}
              className="flex-1 bg-red-500 hover:bg-red-700 text-white border-2 border-slate-800 py-2.5 rounded-xl transition font-bold text-sm shadow-pop-sm hover:translate-y-[-1px] active:translate-y-[1px]"
            >
              Deactivate
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}