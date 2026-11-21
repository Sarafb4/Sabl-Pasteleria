import { create } from 'zustand';
import { MenuItem, TORTAS, POSTRES, GALLETAS } from '../data/menuData';
import {
  fetchMenuItemsFromSupabase,
  upsertMenuItemToSupabase,
  deleteMenuItemInSupabase,
  isSupabaseConfigured
} from '../services/supabaseClient';

interface MenuStore {
  items: MenuItem[];
  isSyncing: boolean;
  syncWithSupabase: () => Promise<void>;
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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.warn('Advertencia: localStorage lleno al guardar menú:', err);
      }
    }
  };

  return {
    items: initialItems,
    isSyncing: false,

    syncWithSupabase: async () => {
      if (!isSupabaseConfigured()) return;
      set({ isSyncing: true });
      try {
        const { data: remoteItems, error } = await fetchMenuItemsFromSupabase();
        if (!error && Array.isArray(remoteItems) && remoteItems.length > 0) {
          save(remoteItems);
          set({ items: remoteItems });
        } else if (!error && Array.isArray(remoteItems) && remoteItems.length === 0) {
          // Si Supabase aún no tiene productos, sembrar el catálogo inicial
          const currentItems = get().items;
          for (const item of currentItems) {
            await upsertMenuItemToSupabase(item);
          }
        }
      } catch (e) {
        console.warn('Error sincronizando menú con Supabase:', e);
      } finally {
        set({ isSyncing: false });
      }
    },

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

      // Guardar en Supabase
      upsertMenuItemToSupabase(newItem).catch(err => {
        console.warn('Error guardando producto en Supabase:', err);
      });
    },

    updateItem: (id, updates) => {
      let targetItem: MenuItem | null = null;
      const updated = get().items.map(item => {
        if (item.id === id) {
          const merged = { ...item, ...updates };
          const imagesList = Array.isArray(merged.images) && merged.images.length > 0
            ? merged.images
            : (merged.image ? [merged.image] : []);
          const finalItem = {
            ...merged,
            image: imagesList[0] || merged.image || undefined,
            images: imagesList
          };
          targetItem = finalItem;
          return finalItem;
        }
        return item;
      });
      save(updated);
      set({ items: updated });

      // Actualizar en Supabase
      if (targetItem) {
        upsertMenuItemToSupabase(targetItem).catch(err => {
          console.warn('Error actualizando producto en Supabase:', err);
        });
      }
    },

    deleteItem: (id) => {
      const updated = get().items.filter(item => item.id !== id);
      save(updated);
      set({ items: updated });

      // Eliminar en Supabase
      deleteMenuItemInSupabase(id).catch(err => {
        console.warn('Error eliminando producto en Supabase:', err);
      });
    },

    uploadItemImage: (id, base64) => {
      let targetItem: MenuItem | null = null;
      const updated = get().items.map(item => {
        if (item.id === id) {
          const currentImages = Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []);
          const newImages = [base64, ...currentImages.filter(img => img !== base64)];
          const itemUpdated: MenuItem = {
            ...item,
            image: base64,
            images: newImages
          };
          targetItem = itemUpdated;
          return itemUpdated;
        }
        return item;
      });
      save(updated);
      set({ items: updated });

      if (targetItem) {
        upsertMenuItemToSupabase(targetItem).catch(err => {
          console.warn('Error sincronizando foto con Supabase:', err);
        });
      }
    },

    addItemImage: (id, base64) => {
      let targetItem: MenuItem | null = null;
      const updated = get().items.map(item => {
        if (item.id === id) {
          const currentImages = Array.isArray(item.images) ? [...item.images] : (item.image ? [item.image] : []);
          currentImages.push(base64);
          const itemUpdated: MenuItem = {
            ...item,
            image: currentImages[0],
            images: currentImages
          };
          targetItem = itemUpdated;
          return itemUpdated;
        }
        return item;
      });
      save(updated);
      set({ items: updated });

      if (targetItem) {
        upsertMenuItemToSupabase(targetItem).catch(err => {
          console.warn('Error sincronizando fotos con Supabase:', err);
        });
      }
    },

    removeItemImage: (id, imageIndex) => {
      let targetItem: MenuItem | null = null;
      const updated = get().items.map(item => {
        if (item.id === id) {
          const currentImages = Array.isArray(item.images) ? [...item.images] : (item.image ? [item.image] : []);
          currentImages.splice(imageIndex, 1);
          const itemUpdated: MenuItem = {
            ...item,
            image: currentImages[0] || undefined,
            images: currentImages
          };
          targetItem = itemUpdated;
          return itemUpdated;
        }
        return item;
      });
      save(updated);
      set({ items: updated });

      if (targetItem) {
        upsertMenuItemToSupabase(targetItem).catch(err => {
          console.warn('Error sincronizando cambios de foto con Supabase:', err);
        });
      }
    },

    toggleAvailability: (id) => {
      let targetItem: MenuItem | null = null;
      const updated = get().items.map(item => {
        if (item.id === id) {
          const toggled = { ...item, available: item.available === false ? true : false };
          targetItem = toggled;
          return toggled;
        }
        return item;
      });
      save(updated);
      set({ items: updated });

      if (targetItem) {
        upsertMenuItemToSupabase(targetItem).catch(err => {
          console.warn('Error actualizando disponibilidad en Supabase:', err);
        });
      }
    },

    resetToDefault: () => {
      save(ALL_DEFAULT_ITEMS);
      set({ items: ALL_DEFAULT_ITEMS });
    }
  };
});

// Sincronización automática de catálogo con Supabase en segundo plano
if (typeof window !== 'undefined' && isSupabaseConfigured()) {
  setTimeout(() => {
    useMenuStore.getState().syncWithSupabase();
  }, 1200);
}

