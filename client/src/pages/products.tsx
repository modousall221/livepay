import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type Product, type InsertProduct } from "@shared/schema";
import { Plus, Package, Trash2, Pencil, Share2, QrCode, Star, ImageIcon, Video, Tag, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useState, useEffect } from "react";
import { ProductShareDialog } from "@/components/product-share-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function Products() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<InsertProduct>({
    resolver: zodResolver(
      insertProductSchema.extend({
        keyword: insertProductSchema.shape.keyword.min(1, "Mot-clé requis"),
        name: insertProductSchema.shape.name.min(1, "Nom requis"),
        price: insertProductSchema.shape.price.min(1, "Prix requis"),
      })
    ),
    defaultValues: {
      keyword: "",
      name: "",
      price: 0,
      stock: 0,
      description: "",
      imageUrl: "",
      videoUrl: "",
      category: "",
      originalPrice: 0,
      featured: false,
      active: true,
    },
  });

  // Reset form when dialog closes or when editing a product
  useEffect(() => {
    if (editingProduct) {
      form.reset({
        keyword: editingProduct.keyword || "",
        name: editingProduct.name,
        price: editingProduct.price,
        stock: editingProduct.stock || 0,
        description: editingProduct.description || "",
        imageUrl: editingProduct.imageUrl || "",
        videoUrl: (editingProduct as any).videoUrl || "",
        category: (editingProduct as any).category || "",
        originalPrice: (editingProduct as any).originalPrice || 0,
        featured: (editingProduct as any).featured || false,
        active: editingProduct.active,
      });
    } else if (!open) {
      form.reset({
        keyword: "",
        name: "",
        price: 0,
        stock: 0,
        description: "",
        imageUrl: "",
        videoUrl: "",
        category: "",
        originalPrice: 0,
        featured: false,
        active: true,
      });
    }
  }, [editingProduct, open, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertProduct) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      form.reset();
      setOpen(false);
      toast({ title: "Produit créé" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorisé", description: "Reconnexion...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertProduct> }) => 
      apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingProduct(null);
      setOpen(false);
      toast({ title: "Produit mis à jour" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorisé", description: "Reconnexion...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Produit supprimé" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorisé", description: "Reconnexion...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest("PATCH", `/api/products/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertProduct) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    form.reset({
      keyword: "",
      name: "",
      price: 0,
      stock: 0,
      description: "",
      imageUrl: "",
      videoUrl: "",
      category: "",
      originalPrice: 0,
      featured: false,
      active: true,
    });
    setOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setOpen(true);
  };

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingProduct(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-products-title">Produits</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos produits avec mots-clés pour le chatbot WhatsApp</p>
        </div>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} data-testid="button-add-product">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyword">Mot-clé WhatsApp</Label>
                <Input
                  id="keyword"
                  {...form.register("keyword")}
                  placeholder="Ex: ROBE1, CHAUSSURE2"
                  className="font-mono uppercase"
                  data-testid="input-product-keyword"
                />
                <p className="text-xs text-muted-foreground">
                  Le client enverra ce mot-clé sur WhatsApp pour commander
                </p>
                {form.formState.errors.keyword && (
                  <p className="text-xs text-destructive">{form.formState.errors.keyword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Ex: Robe Wax"
                  data-testid="input-product-name"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Prix (FCFA)</Label>
                  <Input
                    id="price"
                    type="number"
                    {...form.register("price", { valueAsNumber: true })}
                    placeholder="15000"
                    data-testid="input-product-price"
                  />
                  {form.formState.errors.price && (
                    <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    {...form.register("stock", { valueAsNumber: true })}
                    placeholder="10"
                    data-testid="input-product-stock"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Description du produit"
                  className="resize-none"
                  data-testid="input-product-description"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Catégorie
                </Label>
                <Select
                  value={form.watch("category") || ""}
                  onValueChange={(value) => form.setValue("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image URL with preview */}
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Image du produit
                </Label>
                <Input
                  id="imageUrl"
                  {...form.register("imageUrl")}
                  placeholder="https://exemple.com/image.jpg"
                />
                {form.watch("imageUrl") && (
                  <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={form.watch("imageUrl")}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Collez l'URL d'une image hébergée (Google Drive, Imgur, etc.)
                </p>
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <Label htmlFor="videoUrl" className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Vidéo du produit (optionnel)
                </Label>
                <Input
                  id="videoUrl"
                  {...form.register("videoUrl")}
                  placeholder="https://tiktok.com/@... ou youtube.com/..."
                />
                <p className="text-xs text-muted-foreground">
                  Lien TikTok, YouTube ou Reels Instagram
                </p>
              </div>

              {/* Original Price (for promotions) */}
              <div className="space-y-2">
                <Label htmlFor="originalPrice" className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Prix barré (optionnel)
                </Label>
                <Input
                  id="originalPrice"
                  type="number"
                  {...form.register("originalPrice", { valueAsNumber: true })}
                  placeholder="20000"
                />
                <p className="text-xs text-muted-foreground">
                  Ancien prix affiché barré pour montrer la promotion
                </p>
              </div>

              {/* Featured toggle */}
              <div className="flex items-center justify-between py-2 border rounded-lg px-3 bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <Label htmlFor="featured">Produit vedette</Label>
                </div>
                <Switch
                  id="featured"
                  checked={form.watch("featured")}
                  onCheckedChange={(checked) => form.setValue("featured", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active">Actif</Label>
                <Switch
                  id="active"
                  checked={form.watch("active")}
                  onCheckedChange={(checked) => form.setValue("active", checked)}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-product"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Enregistrement..."
                  : editingProduct
                  ? "Mettre à jour"
                  : "Créer le produit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-20 mb-4" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}
        </div>
      ) : products?.length === 0 ? (
        <Card className="p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Aucun produit</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez vos premiers produits pour commencer à vendre en live.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products?.map((product) => {
            const availableStock = product.stock - (product.reservedStock || 0);
            const isLowStock = availableStock <= 3 && product.active;
            const extProduct = product as any;
            const categoryLabel = PRODUCT_CATEGORIES.find(c => c.value === extProduct.category)?.label;
            return (
            <Card key={product.id} className={`overflow-hidden hover-elevate ${isLowStock ? "border-amber-300" : ""} ${extProduct.featured ? "ring-2 ring-amber-400" : ""}`} data-testid={`card-product-${product.id}`}>
              {/* Image thumbnail */}
              {product.imageUrl ? (
                <div className="relative h-32 bg-gray-100">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {extProduct.featured && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-amber-500 text-white">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Vedette
                      </Badge>
                    </div>
                  )}
                  {extProduct.videoUrl && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary">
                        <Video className="w-3 h-3 mr-1" />
                        Vidéo
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-300" />
                  {extProduct.featured && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-amber-500 text-white">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Vedette
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-1 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {product.keyword}
                      </Badge>
                      {product.shareCode && (
                        <Badge variant="secondary" className="font-mono text-xs">
                          #{product.shareCode}
                        </Badge>
                      )}
                      {categoryLabel && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {categoryLabel}
                        </Badge>
                      )}
                      {!product.active && <Badge variant="secondary">Inactif</Badge>}
                    </div>
                    <h3 className="font-semibold truncate" data-testid={`text-product-name-${product.id}`}>
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-lg font-bold text-primary">
                        {product.price.toLocaleString("fr-FR")} F
                      </p>
                      {extProduct.originalPrice > 0 && extProduct.originalPrice > product.price && (
                        <p className="text-sm text-muted-foreground line-through">
                          {extProduct.originalPrice.toLocaleString("fr-FR")} F
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <ProductShareDialog
                      productId={product.id}
                      productName={product.name}
                      trigger={
                      <Button size="icon" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                        <QrCode className="w-4 h-4" />
                      </Button>
                    }
                  />
                  <Switch
                    checked={product.active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: product.id, active: checked })
                    }
                    disabled={toggleActiveMutation.isPending}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenEdit(product)}
                    data-testid={`button-edit-product-${product.id}`}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(product.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-product-${product.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">Stock</span>
                  <span className={`font-bold ${isLowStock ? "text-amber-600" : availableStock > 0 ? "text-green-600" : "text-red-600"}`}>
                    {availableStock} {product.reservedStock > 0 && <span className="text-xs font-normal text-muted-foreground">({product.reservedStock} réservé)</span>}
                  </span>
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{product.description}</p>
                )}
              </div>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
}
