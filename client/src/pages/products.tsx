import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Package, Trash2, Pencil, Share2, Star, ImageIcon, Tag, Percent, Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ProductShareDialog } from "@/components/product-share-dialog";
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  uploadImage,
  type Product 
} from "@/lib/firebase";

// Catégories prédéfinies
const PRODUCT_CATEGORIES = [
  { value: "mode", label: "Mode & Vêtements" },
  { value: "accessoires", label: "Accessoires" },
  { value: "beaute", label: "Beauté & Cosmétiques" },
  { value: "electronique", label: "Électronique" },
  { value: "maison", label: "Maison & Déco" },
  { value: "alimentation", label: "Alimentation" },
  { value: "sante", label: "Santé & Bien-être" },
  { value: "sport", label: "Sport & Loisirs" },
  { value: "autre", label: "Autre" },
];

interface ProductFormData {
  keyword: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  imageUrl: string;
  category: string;
  originalPrice: number;
  featured: boolean;
  active: boolean;
}

const defaultFormData: ProductFormData = {
  keyword: "",
  name: "",
  price: 0,
  stock: 0,
  description: "",
  imageUrl: "",
  category: "",
  originalPrice: 0,
  featured: false,
  active: true,
};

export default function Products() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);

  // Load products from Firebase
  useEffect(() => {
    if (!user) return;
    
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const data = await getProducts(user.id);
        setProducts(data);
      } catch (error) {
        console.error("Error loading products:", error);
        toast({ title: "Erreur", description: "Impossible de charger les produits", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProducts();
  }, [user, toast]);

  // Image upload handler - Firebase Storage
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "Image trop volumineuse (max 5MB)", variant: "destructive" });
      return;
    }
    
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Erreur", description: "Format non supporté. Utilisez JPG, PNG, GIF ou WebP", variant: "destructive" });
      return;
    }
    
    setIsUploading(true);
    try {
      const uniqueName = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const extension = file.name.split('.').pop() || 'jpg';
      const path = `products/${uniqueName}.${extension}`;
      
      const downloadUrl = await uploadImage(file, path);
      setFormData(prev => ({ ...prev, imageUrl: downloadUrl }));
      toast({ title: "Image uploadée !" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Erreur", description: error.message || "Impossible d'uploader l'image", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (editingProduct) {
      setFormData({
        keyword: editingProduct.keyword || "",
        name: editingProduct.name,
        price: editingProduct.price,
        stock: editingProduct.stock || 0,
        description: editingProduct.description || "",
        imageUrl: editingProduct.imageUrl || "",
        category: editingProduct.category || "",
        originalPrice: editingProduct.originalPrice || 0,
        featured: editingProduct.featured || false,
        active: editingProduct.active,
      });
    } else if (!open) {
      setFormData(defaultFormData);
    }
  }, [editingProduct, open]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData(defaultFormData);
    setOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validation
    if (!formData.keyword.trim()) {
      toast({ title: "Erreur", description: "Mot-clé requis", variant: "destructive" });
      return;
    }
    if (!formData.name.trim()) {
      toast({ title: "Erreur", description: "Nom requis", variant: "destructive" });
      return;
    }
    if (formData.price <= 0) {
      toast({ title: "Erreur", description: "Prix doit être supérieur à 0", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
        toast({ title: "Produit mis à jour" });
      } else {
        await createProduct({
          ...formData,
          vendorId: user.id,
        });
        toast({ title: "Produit créé" });
      }
      
      // Reload products
      const data = await getProducts(user.id);
      setProducts(data);
      setOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!user) return;
    if (!confirm("Supprimer ce produit ?")) return;
    
    setIsDeleting(productId);
    try {
      await deleteProduct(productId);
      toast({ title: "Produit supprimé" });
      const data = await getProducts(user.id);
      setProducts(data);
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  const getCategoryLabel = (value: string) => {
    return PRODUCT_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-24 w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mes Produits</h1>
          <p className="text-muted-foreground">{products.length} produit(s)</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Modifier le produit" : "Nouveau produit"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Keyword */}
              <div className="space-y-2">
                <Label htmlFor="keyword" className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Mot-clé (pour WhatsApp) *
                </Label>
                <Input
                  id="keyword"
                  value={formData.keyword}
                  onChange={e => setFormData(prev => ({ ...prev, keyword: e.target.value.toUpperCase() }))}
                  placeholder="ROBE1"
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Le client envoie ce mot pour commander
                </p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nom du produit *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Robe été fleurie"
                />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Prix (FCFA) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price || ""}
                    onChange={e => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    placeholder="15000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock || ""}
                    onChange={e => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                    placeholder="10"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description du produit..."
                  rows={3}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Image du produit
                </Label>
                <div className="space-y-2">
                  {formData.imageUrl ? (
                    <div className="relative inline-block">
                      <img 
                        src={formData.imageUrl} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Upload en cours...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Cliquez pour uploader</p>
                          <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP - Max 5MB</p>
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Ou collez une URL:</p>
                  <Input
                    value={formData.imageUrl}
                    onChange={e => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://..."
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Original Price */}
              <div className="space-y-2">
                <Label htmlFor="originalPrice" className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Prix barré (promo)
                </Label>
                <Input
                  id="originalPrice"
                  type="number"
                  value={formData.originalPrice || ""}
                  onChange={e => setFormData(prev => ({ ...prev, originalPrice: parseInt(e.target.value) || 0 }))}
                  placeholder="20000"
                />
              </div>

              {/* Featured & Active */}
              <div className="flex items-center justify-between py-2 border rounded-lg px-3 bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <Label htmlFor="featured">Produit vedette</Label>
                </div>
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, featured: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-2 border rounded-lg px-3">
                <Label htmlFor="active">Actif (visible)</Label>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, active: checked }))}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingProduct ? "Mise à jour..." : "Création..."}
                  </>
                ) : (
                  editingProduct ? "Mettre à jour" : "Créer"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun produit</h3>
          <p className="text-muted-foreground mb-4">
            Créez votre premier produit pour commencer à vendre
          </p>
          <Button onClick={handleOpenCreate} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Créer un produit
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <Card key={product.id} className="overflow-hidden group">
              {product.imageUrl && product.imageUrl.trim() ? (
                <div className="relative h-32 bg-gray-100 dark:bg-gray-800">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                  {product.featured && (
                    <Badge className="absolute top-2 left-2 bg-amber-500 text-white">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Vedette
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                  <Package className="w-10 h-10 text-gray-300" />
                  {product.featured && (
                    <Badge className="absolute top-2 left-2 bg-amber-500 text-white">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Vedette
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <Badge variant="outline" className="text-xs mb-1">
                      {product.keyword}
                    </Badge>
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    {product.category && (
                      <p className="text-xs text-muted-foreground">
                        {getCategoryLabel(product.category)}
                      </p>
                    )}
                  </div>
                  <Badge variant={product.active ? "default" : "secondary"}>
                    {product.active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
                
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-lg font-bold text-green-600">
                    {product.price.toLocaleString("fr-FR")} F
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-muted-foreground line-through">
                      {product.originalPrice.toLocaleString("fr-FR")} F
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  Stock: {product.stock - (product.reservedStock || 0)} disponible(s)
                </p>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenEdit(product)}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                  <ProductShareDialog product={product} />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                    disabled={isDeleting === product.id}
                  >
                    {isDeleting === product.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
