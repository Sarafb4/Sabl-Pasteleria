import { create } from 'zustand';
import { MenuItem, TORTAS, POSTRES, GALLETAS } from '../data/menuData';

interface MenuStore {
  items: MenuItem[];
  getItemsByCategory: (category: 'tortas' | 'postres' | 'galletas') => MenuItem[];
  addItem: (item: Omit<MenuItem, 'id'>) => void;
  updateItem: (id: string, updates: Partial<MenuItem>) => void;
  deleteItem: (id: string) => void;
  uploadItemImage: (id: string, base64: string) => void;
  addItemImage: (id: string, base64: string) => void;
  removeItemImage: (id: string, imageIndex: number) => void;
  toggleAvailability: (id: string) => void;
  resetToDefault: () => void;
}

const STORAGE_KEY = 'sablee_menu_catalog_v1';

const ALL_DEFAULT_ITEMS: MenuItem[] = [
  ...TORTAS,
  ...GALLETAS,
  ...POSTRES
];

const loadInitialItems = (): MenuItem[] => {
  if (typeof window === 'undefined') return ALL_DEFAULT_ITEMS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return ALL_DEFAULT_ITEMS;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Garantizar que todos tengan las propiedades básicas e imágenes
      return parsed.map(item => {
        const imagesList = Array.isArray(item.images) && item.images.length > 0 
          ? item.images 
          : (item.image ? [item.image] : []);
        return {
          ...item,
          available: item.available !== false,
          image: imagesList[0] || item.image || undefined,
          images: imagesList,
          presentations: Array.isArray(item.presentations) && item.presentations.length > 0 
            ? item.presentations 
            : [{ label: 'Porción', portions: '1 porción', price: 10000 }]
        };
      });
    }
  } catch (e) {
    console.error('Error cargando menú desde localStorage:', e);
  }
  return ALL_DEFAULT_ITEMS;
};

export const useMenuStore = create<MenuStore>((set, get) => {
  const initialItems = loadInitialItems();

  const save = (items: MenuItem[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  };

  return {
    items: initialItems,

    getItemsByCategory: (category) => {
      return get().items.filter(item => item.category === category);
    },

    addItem: (data) => {
      const newId = `${data.category}-${Date.now()}`;
      const imagesList = Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : (data.image ? [data.image] : []);

      const newItem: MenuItem = {
        ...data,
        id: newId,
        available: data.available !== false,
        image: imagesList[0] || data.image || undefined,
        images: imagesList
      };
      const updated = [newItem, ...get().items];
      save(updated);
      set({ items: updated });
    },

    updateItem: (id, updates) => {
      const updated = get().items.map(item => {
        if (item.id === id) {
          const merged = { ...item, ...updates };
          const imagesList = Array.isArray(merged.images) && merged.images.length > 0
            ? merged.images
            : (merged.image ? [merged.image] : []);
          return {
            ...merged,
            image: imagesList[0] || merged.image || undefined,
            images: imagesList
          };
        }
        return item;
      });
      save(updated);
      set({ items: updated });
    },

    deleteItem: (id) => {
      const updated = get().items.filter(item => item.id !== id);
      save(updated);
      set({ items: updated });
    },

    uploadItemImage: (id, base64) => {
      const updated = get().items.map(item => {
        if (item.id === id) {
          const currentImages = Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []);
          const newImages = [base64, ...currentImages.filter(img => img !== base64)];
          return {
            ...item,
            image: base64,
            images: newImages
          };
        }
        return item;
      });
      save(updated);
      set({ items: updated });
    },

    addItemImage: (id, base64) => {
      const updated = get().items.map(item => {
        if (item.id === id) {
          const currentImages = Array.isArray(item.images) ? [...item.images] : (item.image ? [item.image] : []);
          currentImages.push(base64);
          return {
            ...item,
            image: currentImages[0],
            images: currentImages
          };
        }
        return item;
      });
      save(updated);
      set({ items: updated });
    },

    removeItemImage: (id, imageIndex) => {
      const updated = get().items.map(item => {
        if (item.id === id) {
          const currentImages = Array.isArray(item.images) ? [...item.images] : (item.image ? [item.image] : []);
          currentImages.splice(imageIndex, 1);
          return {
            ...item,
            image: currentImages[0] || undefined,
            images: currentImages
          };
        }
        return item;
      });
      save(updated);
      set({ items: updated });
    },

    toggleAvailability: (id) => {
      const updated = get().items.map(item => 
        item.id === id ? { ...item, available: item.available === false ? true : false } : item
      );
      save(updated);
      set({ items: updated });
    },

    resetToDefault: () => {
      save(ALL_DEFAULT_ITEMS);
      set({ items: ALL_DEFAULT_ITEMS });
    }
  };
});

