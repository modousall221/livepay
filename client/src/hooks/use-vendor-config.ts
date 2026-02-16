import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import {
  getVendorConfig,
  createVendorConfig,
  updateVendorConfig,
  type VendorConfig,
} from "@/lib/firebase";

export function useVendorConfig() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ["vendorConfig", user?.id],
    queryFn: () => (user ? getVendorConfig(user.id) : Promise.resolve(null)),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<VendorConfig, "id" | "createdAt" | "updatedAt" | "vendorId">) =>
      createVendorConfig({ ...data, vendorId: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendorConfig"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<VendorConfig>) => {
      if (!config) throw new Error("Config not found");
      return updateVendorConfig(config.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendorConfig"] });
    },
  });

  // Initialize config if it doesn't exist
  const ensureConfig = async () => {
    if (!config && user) {
      await createMutation.mutateAsync({
        businessName: user.businessName || user.email.split("@")[0],
        preferredPaymentMethod: "wave",
        status: "active",
        liveMode: false,
        reservationDurationMinutes: 10,
        autoReplyEnabled: true,
        segment: "live_seller",
        allowQuantitySelection: false,
        requireDeliveryAddress: false,
        autoReminderEnabled: true,
        upsellEnabled: false,
        minTrustScoreRequired: 0,
      });
    }
  };

  return {
    config,
    isLoading,
    error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    ensureConfig,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
